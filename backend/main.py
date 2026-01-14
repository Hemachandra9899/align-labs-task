import os
import time
import jwt
from typing import Optional, Dict, Any

from fastapi import FastAPI, Depends, HTTPException, Response, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

APP_USER = os.getenv("APP_USER", "admin")
APP_PASS = os.getenv("APP_PASS", "admin123")
JWT_SECRET = os.getenv("JWT_SECRET", "change_me")
JWT_EXPIRES_MIN = int(os.getenv("JWT_EXPIRES_MIN", "720"))
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

COOKIE_NAME = "auth_token"

app = FastAPI(title="Tool-Grounded Article Generator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class LoginIn(BaseModel):
    username: str
    password: str

class GenerateIn(BaseModel):
    query: str
    url: Optional[str] = None

class RegenerateIn(BaseModel):
    article_json: Dict[str, Any]
    extra_prompt: str

def create_jwt(sub: str) -> str:
    now = int(time.time())
    exp = now + JWT_EXPIRES_MIN * 60
    payload = {"sub": sub, "iat": now, "exp": exp}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def read_jwt(token: str) -> Dict[str, Any]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_auth(req: Request) -> str:
    token = req.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = read_jwt(token)
    return payload["sub"]

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/auth/login")
def login(body: LoginIn, resp: Response):
    if body.username != APP_USER or body.password != APP_PASS:
        raise HTTPException(status_code=401, detail="Bad credentials")

    token = create_jwt(body.username)
    # localhost frontend/backend are same-site; cookie will work with CORS credentials
    resp.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=False,      # set True if HTTPS
        samesite="lax",
        max_age=JWT_EXPIRES_MIN * 60,
        path="/",
    )
    return {"ok": True}

@app.post("/auth/logout")
def logout(resp: Response):
    resp.delete_cookie(COOKIE_NAME, path="/")
    return {"ok": True}

@app.get("/auth/me")
def me(user: str = Depends(require_auth)):
    return {"user": user}

@app.post("/generate")
def generate(body: GenerateIn, user: str = Depends(require_auth)):
    # DAY-1 STUB: return deterministic content to unblock frontend.
    article_json = {
        "title": f"Article about: {body.query}",
        "sections": [
            {"heading": "Overview", "paragraphs": ["This is a stub article for Day 1."]},
            {"heading": "Context", "paragraphs": [f"Optional URL: {body.url or 'None'}"]},
        ],
        "relevant_links": [
            {"title": "Example link", "url": "https://example.com"}
        ],
    }
    seo_json = {
        "meta_title": f"{body.query} | Example Site",
        "meta_description": "Stub SEO description for Day 1.",
        "keywords": ["stub", "seo", "day1"],
    }
    html = f"""<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>{seo_json["meta_title"]}</title>
  <meta name="description" content="{seo_json["meta_description"]}">
</head>
<body>
  <h1>{article_json["title"]}</h1>
  <h2>{article_json["sections"][0]["heading"]}</h2>
  <p>{article_json["sections"][0]["paragraphs"][0]}</p>

  <h2>Relevant Links</h2>
  <ul>
    <li><a href="{article_json["relevant_links"][0]["url"]}">{article_json["relevant_links"][0]["title"]}</a></li>
  </ul>
</body>
</html>"""

    return {"article_json": article_json, "seo_json": seo_json, "html": html}

@app.post("/regenerate")
def regenerate(body: RegenerateIn, user: str = Depends(require_auth)):
    # DAY-1 STUB: just annotate existing article with extra prompt.
    new_article = dict(body.article_json)
    new_article["regenerated_with"] = body.extra_prompt
    seo_json = {
        "meta_title": f'{new_article.get("title", "Article")} (regen)',
        "meta_description": f"Regenerated with: {body.extra_prompt}",
        "keywords": ["regen"],
    }
    html = f"<html><body><h1>{new_article.get('title','Article')}</h1><p>Regenerated with: {body.extra_prompt}</p></body></html>"
    return {"article_json": new_article, "seo_json": seo_json, "html": html}
