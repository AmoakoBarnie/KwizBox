"""FastAPI entry point for the Ghana STEM Trivia backend."""
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import init_db
from .routes import auth, quiz, admin
from .seed_admin import seed_super_admin

app = FastAPI(title="Ghana STEM Trivia", version="0.1.0")

# CORS: allow the Vite dev server (5173) and the PWA origin.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in prod; fine for MVP/local
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(quiz.router)
app.include_router(admin.router)

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
STATIC_DIR.mkdir(parents=True, exist_ok=True)
(STATIC_DIR / "questions").mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=str(STATIC_DIR)), name="media")


@app.on_event("startup")
def _startup():
    init_db()
    seed_super_admin()


@app.get("/health")
def health():
    return {"status": "ok", "service": "ghana-stem-trivia"}


@app.get("/")
def root():
    return {"message": "Ghana STEM Trivia API. See /docs for endpoints."}
