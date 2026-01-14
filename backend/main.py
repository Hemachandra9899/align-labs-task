from pathlib import Path
from dotenv import load_dotenv

# Load .env BEFORE any other imports that rely on env
load_dotenv(Path(__file__).with_name(".env"))

import os
import time
import jwt
import pathlib
import logging
from typing import Optional, Dict, Any

from fastapi import FastAPI, Depends, HTTPException, Response, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from jinja2 import Environment, FileSystemLoader, select_autoescape

from schemas import Article
from services.gemini_service import generate_article, generate_seo, regenerate_article

logger = logging.getLogger("uvicorn.error")

APP_USER = os.getenv("APP_USER", "admin")
APP_PASS = os.getenv("APP_PASS", "admin123")
JWT_SECRET = os.getenv("JWT_SECRET", "change_me")
JWT_EXPIRES_MIN = int(os.getenv("JWT_EXPIRES_MIN", "720"))
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

COOKIE_NAME = "auth_token"

# Jinja setup
env = Environment(
    loader=FileSystemLoader(str(pathlib.Path(__file__).parent / "templates")),
    autoescape=select_autoescape(["html"]),
)
tpl = env.get_template("article.html.j2")

app = FastAPI(title="Tool-Grounded Article Generator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Schemas ----------
class LoginIn(BaseModel):
    username: str
    password: str


class GenerateIn(BaseModel):
    query: str
    url: Optional[str] = None


class RegenerateIn(BaseModel):
    article_json: Dict[str, Any]
    extra_prompt: str


# ---------- Auth helpers ----------
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


# ---------- Routes ----------
@app.get("/health")
def health():
    return {"ok": True}


@app.post("/auth/login")
def login(body: LoginIn, resp: Response):
    if body.username != APP_USER or body.password != APP_PASS:
        raise HTTPException(status_code=401, detail="Bad credentials")

    token = create_jwt(body.username)
    resp.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=False,
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
    if not body.query or not body.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    try:
        article = generate_article(body.query.strip(), body.url)
        seo = generate_seo(article)
        html = tpl.render(article=article.model_dump(), seo=seo.model_dump())
        return {"html": html, "article_json": article.model_dump(), "seo_json": seo.model_dump()}
    except Exception as e:
        logger.exception("Generate failed")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/regenerate")
def regen(body: RegenerateIn, user: str = Depends(require_auth)):
    if not body.extra_prompt or not body.extra_prompt.strip():
        raise HTTPException(status_code=400, detail="extra_prompt cannot be empty")

    try:
        existing = Article.model_validate(body.article_json)
        new_article = regenerate_article(existing, body.extra_prompt.strip())
        seo = generate_seo(new_article)
        html = tpl.render(article=new_article.model_dump(), seo=seo.model_dump())
        return {"html": html, "article_json": new_article.model_dump(), "seo_json": seo.model_dump()}
    except Exception as e:
        logger.exception("Regenerate failed")
        raise HTTPException(status_code=500, detail=str(e))
