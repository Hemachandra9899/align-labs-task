import os
import time
from pathlib import Path
from dotenv import load_dotenv

from google import genai
from google.genai import errors

from schemas import Article, SEO

# Load backend/.env reliably
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite")
API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    raise RuntimeError("Missing GEMINI_API_KEY in backend/.env")

client = genai.Client(api_key=API_KEY)


# -------------------- Helpers --------------------
def _tools(url: str | None):
    # Tool format (dict style)
    tools = [{"google_search": {}}]
    if url:
        tools.insert(0, {"url_context": {}})
    return tools


def _call_with_retry(prompt: str, config: dict) -> str:
    last = None
    for attempt in range(3):
        try:
            resp = client.models.generate_content(model=MODEL, contents=prompt, config=config)
            return (resp.text or "").strip()
        except errors.APIError as e:
            last = e
            status = getattr(e, "status_code", None) or getattr(e, "code", None)
            msg = getattr(e, "message", None) or str(e)

            # Retry transient errors
            if status in (500, 502, 503, 504) or "Internal Server Error" in msg:
                time.sleep(1 + attempt)
                continue

            # Non-transient: surface clearly
            raise RuntimeError(f"Gemini APIError ({status}): {msg}") from e
        except Exception as e:
            last = e
            raise RuntimeError(f"Unexpected Gemini error: {e}") from e

    raise RuntimeError(f"Gemini failed after retries. Last error: {last}") from last


def _strip_code_fences(text: str) -> str:
    t = text.strip()
    if t.startswith("```"):
        # remove the first ```... line and ending ```
        t = t.replace("```json", "").replace("```JSON", "").replace("```", "").strip()
    return t


def _extract_json_object(text: str) -> str:
    t = _strip_code_fences(text)
    s = t.find("{")
    e = t.rfind("}")
    if s == -1 or e == -1 or e <= s:
        raise ValueError(f"Could not find JSON object. First 300 chars:\n{t[:300]}")
    return t[s : e + 1]


def _parse_model_json(text: str, model_cls):
    """
    Parse JSON into a Pydantic model, handling:
    - markdown fences
    - leading/trailing text
    """
    t = _strip_code_fences(text)
    try:
        return model_cls.model_validate_json(t)
    except Exception:
        return model_cls.model_validate_json(_extract_json_object(t))


def _repair_to_schema(bad_text: str, schema_name: str) -> str:
    """
    Ask model to repair into valid JSON only.
    NOTE: No tools here.
    """
    prompt = f"""
You are a JSON repair tool.
Fix the input so it becomes VALID JSON for schema: {schema_name}.

Rules:
- Output ONLY JSON (no markdown).
- Close all quotes/braces/brackets properly.
- Do NOT add extra keys not needed.

BROKEN_INPUT:
{bad_text}
"""
    # JSON-mode is OK here because we are NOT using tools
    config = {
        "response_mime_type": "application/json",
        "max_output_tokens": 2048,
        "temperature": 0.0,
    }
    return _call_with_retry(prompt, config)


# -------------------- Core pipeline --------------------
def _draft_grounded_text(query: str, url: str | None) -> str:
    """
    Step 1: Use tools (google_search + optional url_context).
    IMPORTANT: tools + response_mime_type application/json is NOT supported, so we keep plain text.
    """
    prompt = f"""
Write a factual article grounded in web sources.

Topic: {query}
{("Reference URL: " + url) if url else ""}

Requirements:
- 4–6 sections with headings.
- 1–2 short paragraphs per section.
- End with a section titled "Sources" containing 5–12 bullet links as full URLs.
- Do not invent facts.
"""
    config = {
        "tools": _tools(url),
        "max_output_tokens": 2048,
        "temperature": 0.3,
    }
    return _call_with_retry(prompt, config)


def _structure_article_json(grounded_text: str) -> Article:
    """
    Step 2: Convert grounded text -> strict Article JSON (no tools).
    Uses JSON schema mode (supported because no tools).
    Includes repair fallback if model outputs invalid JSON.
    """
    gt = grounded_text.strip()
    if len(gt) > 12000:
        gt = gt[:12000] + "\n\n[TRUNCATED]"

    prompt = f"""
Convert the draft into VALID JSON that matches EXACTLY this schema:

- title: string
- sections: list of {{ heading: string, paragraphs: list[string] }}
- key_takeaways: list[string]
- relevant_links: list of {{ title: string, url: string }}

STRICT RULES:
- Output ONLY JSON (no markdown, no explanations).
- Escape quotes properly inside strings.
- Keep it concise: 4–6 sections, 1–2 paragraphs each.
- key_takeaways: 3–6 items.
- relevant_links: extract from the draft Sources/links ONLY (do NOT invent).

DRAFT:
{gt}
"""
    config = {
        "response_mime_type": "application/json",
        "response_json_schema": Article.model_json_schema(),
        "max_output_tokens": 4096,
        "temperature": 0.0,
    }

    text = _call_with_retry(prompt, config)

    try:
        return _parse_model_json(text, Article)
    except Exception:
        repaired = _repair_to_schema(text, "Article")
        return _parse_model_json(repaired, Article)


def _generate_seo_json(article: Article) -> SEO:
    """
    SEO is separate call (no tools). Force JSON schema and repair if needed.
    """
    prompt = f"""
Generate SEO metadata for this article.

Title: {article.title}
Takeaways: {article.key_takeaways}

Return ONLY JSON matching:
- meta_title (<=60 chars)
- meta_description (<=155 chars)
- keywords (8–15 items)

No markdown. No extra text.
"""
    config = {
        "response_mime_type": "application/json",
        "response_json_schema": SEO.model_json_schema(),
        "max_output_tokens": 1024,
        "temperature": 0.0,
    }

    text = _call_with_retry(prompt, config)

    try:
        return _parse_model_json(text, SEO)
    except Exception:
        repaired = _repair_to_schema(text, "SEO")
        return _parse_model_json(repaired, SEO)


# -------------------- Public functions used by main.py --------------------
def generate_article(query: str, url: str | None) -> Article:
    grounded = _draft_grounded_text(query, url)
    return _structure_article_json(grounded)


def generate_seo(article: Article) -> SEO:
    return _generate_seo_json(article)


def regenerate_article(existing: Article, extra_prompt: str) -> Article:
    """
    Regenerate from existing JSON. No tools needed. Use JSON schema mode + repair fallback.
    """
    prompt = f"""
Rewrite/improve the article with this instruction: {extra_prompt}

Return ONLY JSON matching the Article schema.
Do not invent new facts.

ARTICLE_JSON:
{existing.model_dump_json()}
"""
    config = {
        "response_mime_type": "application/json",
        "response_json_schema": Article.model_json_schema(),
        "max_output_tokens": 4096,
        "temperature": 0.4,
    }

    text = _call_with_retry(prompt, config)

    try:
        return _parse_model_json(text, Article)
    except Exception:
        repaired = _repair_to_schema(text, "Article")
        return _parse_model_json(repaired, Article)
