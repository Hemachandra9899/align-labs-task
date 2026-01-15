import React from "react";
import { useNavigate } from "react-router-dom";
import { apiPost } from "../api";

type Tab = "preview" | "seo" | "article";

export default function AppPage() {
  const nav = useNavigate();

  const [query, setQuery] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [html, setHtml] = React.useState<string>("");
  const [seo, setSeo] = React.useState<any>(null);
  const [article, setArticle] = React.useState<any>(null);

  const [extraPrompt, setExtraPrompt] = React.useState("");
  const [tab, setTab] = React.useState<Tab>("preview");

  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [regenLoading, setRegenLoading] = React.useState(false);
  const [logoutLoading, setLogoutLoading] = React.useState(false);

  const canGenerate = query.trim().length > 0 && !loading;
  const canRegen = !!article && extraPrompt.trim().length > 0 && !regenLoading;

  async function generate() {
    setErr(null);
    setLoading(true);
    try {
      const out = await apiPost("/generate", {
        query: query.trim(),
        url: url.trim() ? url.trim() : null,
      });
      setHtml(out.html || "");
      setSeo(out.seo_json || null);
      setArticle(out.article_json || null);
      setTab("preview");
    } catch (e: any) {
      setErr(typeof e?.message === "string" ? e.message : "Generate failed");
    } finally {
      setLoading(false);
    }
  }

  async function regenerate() {
    setErr(null);
    setRegenLoading(true);
    try {
      const out = await apiPost("/regenerate", {
        article_json: article,
        extra_prompt: extraPrompt.trim(),
      });
      setHtml(out.html || "");
      setSeo(out.seo_json || null);
      setArticle(out.article_json || null);
      setTab("preview");
    } catch (e: any) {
      setErr(typeof e?.message === "string" ? e.message : "Regenerate failed");
    } finally {
      setRegenLoading(false);
    }
  }

  async function logout() {
    setErr(null);
    setLogoutLoading(true);
    try {
      // backend should clear cookie/token
      await apiPost("/auth/logout", {});
    } catch {
      // even if backend fails, still redirect client-side
    } finally {
      setLogoutLoading(false);
      nav("/", { replace: true });
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

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  }

  const hasResult = !!html || !!seo || !!article;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.brandRow}>
          <div style={styles.logo}>A</div>
          <div>
            <div style={styles.h1}>Content Generator</div>
            <div style={styles.sub}>
              Tool-grounded articles • SEO • HTML export
            </div>
          </div>
        </div>

        <div style={styles.headerActions}>
          <button
            onClick={() => {
              setQuery("");
              setUrl("");
              setHtml("");
              setSeo(null);
              setArticle(null);
              setExtraPrompt("");
              setErr(null);
              setTab("preview");
            }}
            style={styles.ghostBtn}
            title="Clear all"
          >
            Clear
          </button>

          <button
            onClick={downloadHtml}
            style={{ ...styles.ghostBtn, ...(html ? {} : styles.ghostDisabled) }}
            disabled={!html}
          >
            Download HTML
          </button>

          <button
            onClick={generate}
            disabled={!canGenerate}
            style={{
              ...styles.primaryBtn,
              ...(canGenerate ? {} : styles.primaryDisabled),
            }}
          >
            {loading ? "Generating…" : "Generate"}
          </button>

          {/* ✅ LOGOUT */}
          <button
            onClick={logout}
            disabled={logoutLoading}
            style={{
              ...styles.dangerBtn,
              ...(logoutLoading ? styles.dangerDisabled : {}),
            }}
            title="Logout"
          >
            {logoutLoading ? "Logging out…" : "Logout"}
          </button>
        </div>
      </div>

      {err && (
        <div style={styles.errorBox} role="alert" aria-live="polite">
          <div style={styles.errorTitle}>Something went wrong</div>
          <div style={styles.errorMsg}>{err}</div>
        </div>
      )}

      <div style={styles.grid}>
        {/* LEFT: Controls */}
        <div style={styles.leftCol}>
          <div style={styles.card}>
            <div style={styles.cardTitleRow}>
              <div style={styles.cardTitle}>Inputs</div>
              <div style={styles.badge}>{loading ? "Working" : "Ready"}</div>
            </div>

            <label style={styles.label}>
              <span style={styles.labelText}>Article query</span>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder='e.g., "Top 10 things to do in Tokyo for first-time visitors"'
                rows={3}
                style={styles.textarea}
              />
            </label>

            <label style={styles.label}>
              <span style={styles.labelText}>Optional reference URL</span>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/blog-post"
                style={styles.input}
              />
            </label>

            <div style={styles.row}>
              <button
                onClick={generate}
                disabled={!canGenerate}
                style={{
                  ...styles.primaryBtnWide,
                  ...(canGenerate ? {} : styles.primaryDisabled),
                }}
              >
                {loading ? "Generating…" : "Generate article"}
              </button>

              <button
                onClick={() => {
                  setQuery("Best places to visit in Tokyo");
                  setUrl("");
                }}
                style={styles.ghostBtn}
                type="button"
              >
                Use example
              </button>
            </div>

            <div style={styles.smallHint}>
              Uses <span style={styles.pill}>Google Search grounding</span> and
              optional <span style={styles.pill}>URL context</span>.
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.cardTitleRow}>
              <div style={styles.cardTitle}>Regenerate</div>
              <div style={styles.badgeMuted}>Optional</div>
            </div>

            <label style={styles.label}>
              <span style={styles.labelText}>Instruction</span>
              <input
                value={extraPrompt}
                onChange={(e) => setExtraPrompt(e.target.value)}
                placeholder='e.g., "Make it Gen Z", "Shorter", "Add FAQs"'
                style={styles.input}
              />
            </label>

            <button
              onClick={regenerate}
              disabled={!canRegen}
              style={{
                ...styles.secondaryBtn,
                ...(canRegen ? {} : styles.secondaryDisabled),
              }}
            >
              {regenLoading ? "Regenerating…" : "Regenerate"}
            </button>

            {!article && (
              <div style={styles.smallHint}>
                Generate once first to enable regeneration.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Output */}
        <div style={styles.rightCol}>
          <div style={styles.card}>
            <div style={styles.tabs}>
              <TabBtn
                active={tab === "preview"}
                onClick={() => setTab("preview")}
                label="Preview"
              />
              <TabBtn
                active={tab === "seo"}
                onClick={() => setTab("seo")}
                label="SEO JSON"
              />
              <TabBtn
                active={tab === "article"}
                onClick={() => setTab("article")}
                label="Article JSON"
              />

              <div style={{ flex: 1 }} />

              {tab === "seo" && seo && (
                <button
                  onClick={() => copy(JSON.stringify(seo, null, 2))}
                  style={styles.ghostBtnSmall}
                >
                  Copy
                </button>
              )}
              {tab === "article" && article && (
                <button
                  onClick={() => copy(JSON.stringify(article, null, 2))}
                  style={styles.ghostBtnSmall}
                >
                  Copy
                </button>
              )}
            </div>

            {!hasResult && (
              <div style={styles.empty}>
                <div style={styles.emptyTitle}>No output yet</div>
                <div style={styles.emptySub}>
                  Enter a query and click <b>Generate</b>.
                </div>
              </div>
            )}

            {hasResult && tab === "preview" && (
              <div style={styles.previewWrap}>
                <div style={styles.previewTopBar}>
                  <div style={styles.previewMeta}>
                    <span style={styles.dot} />
                    <span>{html ? "Rendered HTML" : "No HTML"}</span>
                  </div>
                  <button
                    onClick={() => copy(html)}
                    disabled={!html}
                    style={{
                      ...styles.ghostBtnSmall,
                      ...(html ? {} : styles.ghostDisabled),
                    }}
                  >
                    Copy HTML
                  </button>
                </div>

                <div style={styles.previewFrame}>
                  <div
                    style={styles.previewInner}
                    dangerouslySetInnerHTML={{ __html: html }}
                  />
                </div>
              </div>
            )}

            {hasResult && tab === "seo" && (
              <JsonPanel
                title="SEO JSON"
                data={seo}
                onCopy={() => copy(JSON.stringify(seo, null, 2))}
              />
            )}

            {hasResult && tab === "article" && (
              <JsonPanel
                title="Article JSON"
                data={article}
                onCopy={() => copy(JSON.stringify(article, null, 2))}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{ ...styles.tabBtn, ...(active ? styles.tabActive : {}) }}
    >
      {label}
    </button>
  );
}

function JsonPanel({
  title,
  data,
  onCopy,
}: {
  title: string;
  data: any;
  onCopy: () => void;
}) {
  return (
    <div style={styles.jsonWrap}>
      <div style={styles.jsonTop}>
        <div style={styles.jsonTitle}>{title}</div>
        <button onClick={onCopy} style={styles.ghostBtnSmall} disabled={!data}>
          Copy
        </button>
      </div>
      <pre style={styles.pre}>
        {data ? JSON.stringify(data, null, 2) : "No data"}
      </pre>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: 18,
    background:
      "radial-gradient(1200px 800px at 20% 10%, rgba(29,78,216,0.25) 0%, transparent 55%), radial-gradient(1000px 700px at 90% 30%, rgba(124,58,237,0.22) 0%, transparent 55%), #0b1020",
    color: "#e5e7eb",
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    maxWidth: 1200,
    margin: "0 auto 14px auto",
  },
  brandRow: { display: "flex", alignItems: "center", gap: 12 },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 14,
    display: "grid",
    placeItems: "center",
    fontWeight: 900,
    fontSize: 18,
    color: "#0b1020",
    background: "linear-gradient(135deg, #93c5fd, #c4b5fd)",
    boxShadow: "0 12px 34px rgba(0,0,0,0.35)",
  },
  h1: { fontSize: 18, fontWeight: 800, letterSpacing: -0.2 },
  sub: { fontSize: 13, opacity: 0.8, marginTop: 2 },
  headerActions: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
  },

  grid: {
    maxWidth: 1200,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "420px 1fr",
    gap: 14,
  },
  leftCol: { display: "grid", gap: 14 },
  rightCol: { minWidth: 0 },

  card: {
    borderRadius: 18,
    padding: 14,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    boxShadow: "0 18px 60px rgba(0,0,0,0.45)",
    backdropFilter: "blur(10px)",
    minWidth: 0,
    boxSizing: "border-box",
  },
  cardTitleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  cardTitle: { fontSize: 14, fontWeight: 800, letterSpacing: 0.2 },
  badge: {
    fontSize: 12,
    fontWeight: 700,
    padding: "4px 10px",
    borderRadius: 999,
    background: "rgba(34,197,94,0.14)",
    border: "1px solid rgba(34,197,94,0.28)",
  },
  badgeMuted: {
    fontSize: 12,
    fontWeight: 700,
    padding: "4px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    opacity: 0.85,
  },

  label: { display: "grid", gap: 6, marginBottom: 10, width: "100%" },
  labelText: { fontSize: 12, fontWeight: 700, opacity: 0.9 },

  // ✅ FIX: boxSizing so inputs never overflow
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.25)",
    color: "#e5e7eb",
    outline: "none",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
    display: "block",
  },
  textarea: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.25)",
    color: "#e5e7eb",
    outline: "none",
    resize: "vertical",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
    display: "block",
  },

  row: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    marginTop: 4,
    flexWrap: "wrap",
  },

  primaryBtn: {
    borderRadius: 12,
    padding: "10px 14px",
    border: "none",
    cursor: "pointer",
    fontWeight: 900,
    color: "#0b1020",
    background: "linear-gradient(135deg, #93c5fd, #c4b5fd)",
    boxShadow: "0 14px 34px rgba(0,0,0,0.35)",
    boxSizing: "border-box",
  },
  primaryBtnWide: {
    borderRadius: 12,
    padding: "12px 14px",
    border: "none",
    cursor: "pointer",
    fontWeight: 900,
    color: "#0b1020",
    background: "linear-gradient(135deg, #93c5fd, #c4b5fd)",
    boxShadow: "0 14px 34px rgba(0,0,0,0.35)",
    flex: "1 1 auto",
    minWidth: 180,
    boxSizing: "border-box",
  },
  primaryDisabled: { opacity: 0.6, cursor: "not-allowed" },

  secondaryBtn: {
    borderRadius: 12,
    padding: "12px 14px",
    border: "1px solid rgba(255,255,255,0.14)",
    cursor: "pointer",
    fontWeight: 900,
    color: "#e5e7eb",
    background: "rgba(255,255,255,0.06)",
    boxSizing: "border-box",
  },
  secondaryDisabled: { opacity: 0.6, cursor: "not-allowed" },

  ghostBtn: {
    borderRadius: 12,
    padding: "10px 12px",
    border: "1px solid rgba(255,255,255,0.14)",
    cursor: "pointer",
    fontWeight: 800,
    color: "#e5e7eb",
    background: "rgba(255,255,255,0.06)",
    boxSizing: "border-box",
  },
  ghostBtnSmall: {
    borderRadius: 10,
    padding: "8px 10px",
    border: "1px solid rgba(255,255,255,0.14)",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 12,
    color: "#e5e7eb",
    background: "rgba(255,255,255,0.06)",
    boxSizing: "border-box",
  },
  ghostDisabled: { opacity: 0.6, cursor: "not-allowed" },

  // ✅ Logout button styles
  dangerBtn: {
    borderRadius: 12,
    padding: "10px 12px",
    border: "1px solid rgba(248,113,113,0.35)",
    cursor: "pointer",
    fontWeight: 900,
    color: "#fee2e2",
    background: "rgba(248,113,113,0.14)",
    boxSizing: "border-box",
  },
  dangerDisabled: { opacity: 0.6, cursor: "not-allowed" },

  smallHint: {
    marginTop: 10,
    fontSize: 12,
    opacity: 0.75,
    lineHeight: 1.4,
  },
  pill: {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.12)",
    margin: "0 4px",
    fontWeight: 700,
  },

  errorBox: {
    maxWidth: 1200,
    margin: "0 auto 14px auto",
    borderRadius: 14,
    padding: 12,
    background: "rgba(220, 38, 38, 0.15)",
    border: "1px solid rgba(220, 38, 38, 0.35)",
    boxSizing: "border-box",
  },
  errorTitle: { fontWeight: 900, fontSize: 13, marginBottom: 4 },
  errorMsg: { fontSize: 12, opacity: 0.9, whiteSpace: "pre-wrap" },

  tabs: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    borderBottom: "1px solid rgba(255,255,255,0.12)",
    paddingBottom: 10,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  tabBtn: {
    borderRadius: 999,
    padding: "8px 12px",
    border: "1px solid rgba(255,255,255,0.14)",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 12,
    color: "#e5e7eb",
    background: "rgba(255,255,255,0.06)",
    boxSizing: "border-box",
  },
  tabActive: {
    color: "#0b1020",
    background: "linear-gradient(135deg, #93c5fd, #c4b5fd)",
    border: "1px solid rgba(255,255,255,0.12)",
  },

  empty: {
    height: 420,
    display: "grid",
    placeItems: "center",
    borderRadius: 14,
    background: "rgba(0,0,0,0.18)",
    border: "1px dashed rgba(255,255,255,0.16)",
  },
  emptyTitle: { fontWeight: 900, fontSize: 16, marginBottom: 6 },
  emptySub: { opacity: 0.8, fontSize: 13 },

  previewWrap: { display: "grid", gap: 10 },
  previewTopBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  previewMeta: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    opacity: 0.85,
    fontSize: 12,
    fontWeight: 800,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    background: "rgba(34,197,94,0.9)",
    boxShadow: "0 0 0 3px rgba(34, 197, 94, 0.15)",
  },

  previewFrame: {
    borderRadius: 14,
    background: "rgba(0,0,0,0.22)",
    border: "1px solid rgba(255,255,255,0.12)",
    overflow: "hidden",
  },
  previewInner: {
    padding: 16,
    color: "#e5e7eb",
  },

  jsonWrap: {
    borderRadius: 14,
    background: "rgba(0,0,0,0.22)",
    border: "1px solid rgba(255,255,255,0.12)",
    overflow: "hidden",
  },
  jsonTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 12px",
    borderBottom: "1px solid rgba(255,255,255,0.12)",
  },
  jsonTitle: { fontWeight: 900, fontSize: 12, opacity: 0.9 },
  pre: {
    margin: 0,
    padding: 12,
    fontSize: 12,
    lineHeight: 1.4,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    color: "#e5e7eb",
  },
};
