# Tool-Grounded Article Generator (FastAPI + React)

A simple web app that generates **tool-grounded** articles using Gemini:

- **Article JSON** (structured)
- **SEO JSON**
- **Rendered HTML** preview + **HTML download**
- **Regenerate** feature with an extra instruction prompt

Tech stack:

- **Backend:** FastAPI (cookie-based auth + JWT)
- **Frontend:** React (Vite)
- **LLM:** Gemini with **Google Search grounding** + optional **URL context**

---

## Features

- ✅ Login-protected app (JWT stored in an HttpOnly cookie)
- ✅ Generate article from a query + optional URL
- ✅ Returns:
  - `article_json`
  - `seo_json`
  - `html`
- ✅ Preview HTML in UI
- ✅ Copy JSON / Copy HTML
- ✅ Download HTML file
- ✅ Regenerate using an extra instruction (e.g., “make it shorter”, “make it Gen Z”)

---

## Login Details (Demo)

Use these credentials to log in:

- **Username:** `admin`
- **Password:** `admin123`

> These are configured in `backend/.env` (`APP_USER` and `APP_PASS`).

---

## Project Structure
