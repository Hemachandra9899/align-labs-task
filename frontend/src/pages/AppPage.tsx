import React from "react";
import { apiPost } from "../api";

export default function AppPage() {
  const [query, setQuery] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [html, setHtml] = React.useState<string>("");
  const [seo, setSeo] = React.useState<any>(null);
  const [article, setArticle] = React.useState<any>(null);
  const [extraPrompt, setExtraPrompt] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);

  async function generate() {
    setErr(null);
    try {
      const out = await apiPost("/generate", { query, url: url || null });
      setHtml(out.html);
      setSeo(out.seo_json);
      setArticle(out.article_json);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  async function regenerate() {
    setErr(null);
    try {
      const out = await apiPost("/regenerate", { article_json: article, extra_prompt: extraPrompt });
      setHtml(out.html);
      setSeo(out.seo_json);
      setArticle(out.article_json);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  function downloadHtml() {
    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "article.html";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div style={{ padding: 16, display: "grid", gap: 12 }}>
      <h2>Generate Article</h2>

      <div style={{ display: "grid", gap: 8, maxWidth: 720 }}>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Article query" />
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Optional reference URL" />
        <button onClick={generate} disabled={!query}>Generate</button>
        {err && <div style={{ color: "crimson" }}>{err}</div>}
      </div>

      {seo && (
        <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
          <h3>SEO JSON</h3>
          <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(seo, null, 2)}</pre>
        </div>
      )}

      {html && (
        <>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={downloadHtml}>Download HTML</button>
          </div>

          <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
            <h3>Rendered HTML</h3>
            <div dangerouslySetInnerHTML={{ __html: html }} />
          </div>

          <div style={{ display: "grid", gap: 8, maxWidth: 720 }}>
            <h3>Regenerate</h3>
            <input value={extraPrompt} onChange={(e) => setExtraPrompt(e.target.value)} placeholder='Extra prompt (e.g., "Make this Gen Z")' />
            <button onClick={regenerate} disabled={!article || !extraPrompt}>Regenerate</button>
          </div>
        </>
      )}
    </div>
  );
}
