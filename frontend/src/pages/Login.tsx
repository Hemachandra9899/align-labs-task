import React from "react";
import { useNavigate } from "react-router-dom";
import { apiPost } from "../api";

export default function Login() {
  const nav = useNavigate();

  const [username, setUsername] = React.useState("admin");
  const [password, setPassword] = React.useState("admin123");
  const [showPassword, setShowPassword] = React.useState(false);

  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await apiPost("/auth/login", { username, password });
      nav("/app");
    } catch (e: any) {
      setErr(
        typeof e?.message === "string" && e.message.length
          ? e.message
          : "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  const disabled = loading || !username.trim() || !password.trim();

  return (
    <div style={styles.page}>
      <div style={styles.bgGlow} />

      <div style={styles.shell}>
        <div style={styles.brand}>
          <div style={styles.logo}>A</div>
          <div>
            <div style={styles.title}>Align Labs</div>
            <div style={styles.subtitle}>Tool-Grounded Content Generator</div>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.h2}>Welcome back</h2>
            <p style={styles.p}>Sign in to generate grounded articles and SEO.</p>
          </div>

          {err && (
            <div style={styles.errorBox} role="alert" aria-live="polite">
              <div style={styles.errorTitle}>Couldn’t sign you in</div>
              <div style={styles.errorMsg}>{err}</div>
            </div>
          )}

          <form onSubmit={onSubmit} style={styles.form}>
            <label style={styles.label}>
              <span style={styles.labelText}>Username</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                autoComplete="username"
                style={styles.input}
              />
            </label>

            <label style={styles.label}>
              <span style={styles.labelText}>Password</span>
              <div style={styles.passwordRow}>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  style={{ ...styles.input, paddingRight: 110 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  style={styles.ghostBtn}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            <button type="submit" disabled={disabled} style={{ ...styles.btn, ...(disabled ? styles.btnDisabled : {}) }}>
              {loading ? "Signing in…" : "Sign in"}
            </button>

            <div style={styles.footerHint}>
              Tip: credentials are in <code style={styles.code}>backend/.env</code>
            </div>
          </form>
        </div>

        <div style={styles.bottomNote}>
          <span style={styles.dot} />
          <span>Secured route • Cookie-based token</span>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: 20,
    position: "relative",
    overflow: "hidden",
    background: "radial-gradient(1200px 800px at 20% 10%, #1d4ed8 0%, transparent 55%), radial-gradient(1000px 700px at 90% 30%, #7c3aed 0%, transparent 55%), #0b1020",
    color: "#e5e7eb",
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
  },
  bgGlow: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(500px 260px at 50% 15%, rgba(255,255,255,0.08), transparent 60%)",
    pointerEvents: "none",
  },
  shell: {
    width: "100%",
    maxWidth: 520,
    position: "relative",
    zIndex: 1,
  },
  brand: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    marginBottom: 14,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 14,
    display: "grid",
    placeItems: "center",
    fontWeight: 800,
    fontSize: 18,
    color: "#0b1020",
    background: "linear-gradient(135deg, #93c5fd, #c4b5fd)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
  },
  title: { fontSize: 18, fontWeight: 700, lineHeight: 1.2 },
  subtitle: { fontSize: 13, opacity: 0.8, marginTop: 2 },

  card: {
    borderRadius: 18,
    padding: 18,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    boxShadow: "0 18px 60px rgba(0,0,0,0.45)",
    backdropFilter: "blur(10px)",
  },
  cardHeader: { marginBottom: 14 },
  h2: { margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: -0.3 },
  p: { margin: "6px 0 0 0", fontSize: 13, opacity: 0.85 },

  errorBox: {
    borderRadius: 14,
    padding: 12,
    background: "rgba(220, 38, 38, 0.15)",
    border: "1px solid rgba(220, 38, 38, 0.35)",
    marginBottom: 12,
  },
  errorTitle: { fontWeight: 700, fontSize: 13, marginBottom: 4 },
  errorMsg: { fontSize: 12, opacity: 0.9, whiteSpace: "pre-wrap" },

  form: { display: "grid", gap: 12 },
  label: { display: "grid", gap: 6 },
  labelText: { fontSize: 12, fontWeight: 600, opacity: 0.9 },
  input: {
    width: "100%",
    padding: "12px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.25)",
    color: "#e5e7eb",
    outline: "none",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
  },
  passwordRow: { position: "relative" },
  ghostBtn: {
    position: "absolute",
    right: 8,
    top: "50%",
    transform: "translateY(-50%)",
    borderRadius: 10,
    padding: "8px 10px",
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "#e5e7eb",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
  },
  btn: {
    marginTop: 4,
    width: "100%",
    borderRadius: 12,
    padding: "12px 14px",
    border: "none",
    cursor: "pointer",
    fontWeight: 800,
    color: "#0b1020",
    background: "linear-gradient(135deg, #93c5fd, #c4b5fd)",
    boxShadow: "0 14px 34px rgba(0,0,0,0.35)",
  },
  btnDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  footerHint: { marginTop: 6, fontSize: 12, opacity: 0.75 },
  code: {
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: 12,
    padding: "2px 6px",
    borderRadius: 8,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.12)",
  },
  bottomNote: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
    marginTop: 12,
    opacity: 0.75,
    fontSize: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    background: "rgba(34, 197, 94, 0.9)",
    boxShadow: "0 0 0 3px rgba(34, 197, 94, 0.15)",
  },
};
