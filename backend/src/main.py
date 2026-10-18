"""FastAPI entry point for the Ghana Stem Trivia backend."""
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

from .database import init_db
from .routes import auth, quiz, admin, curriculum as curriculum_routes
from .seed_admin import seed_super_admin

app = FastAPI(title="Ghana Stem Trivia", version="0.1.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(quiz.router)
app.include_router(admin.router)
app.include_router(curriculum_routes.router)

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
STATIC_DIR.mkdir(parents=True, exist_ok=True)
(STATIC_DIR / "questions").mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=str(STATIC_DIR)), name="media")

DIST_DIR = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"

def _no_cache(response: HTMLResponse) -> HTMLResponse:
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response


@app.get("/health")
def health():
    return {"status": "ok", "service": "ghana-stem-trivia"}


@app.get("/sw.js")
def block_sw(request: Request):
    """Serve Vite's generated offline service worker when the frontend is built."""
    worker_path = DIST_DIR / "sw.js"
    if worker_path.is_file():
        resp = FileResponse(worker_path, media_type="text/javascript")
    else:
        resp = HTMLResponse(
            "self.addEventListener('fetch', e => e.respondWith(fetch(e.request)))",
            media_type="text/javascript",
        )
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    return resp


@app.get("/workbox-{version:str}.js")
def block_workbox(request: Request, version: str):
    """Serve Vite's matching Workbox runtime instead of the old no-op response."""
    workbox_path = DIST_DIR / f"workbox-{version}.js"
    if workbox_path.is_file():
        resp = FileResponse(workbox_path, media_type="text/javascript")
    else:
        resp = HTMLResponse(
            "self.addEventListener('fetch', e => e.respondWith(fetch(e.request)))",
            media_type="text/javascript",
        )
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    return resp


@app.get("/manifest.webmanifest")
def block_manifest(request: Request):
    """Serve the generated install manifest, with a fallback for an unbuilt frontend."""
    manifest_path = DIST_DIR / "manifest.webmanifest"
    if manifest_path.is_file():
        return FileResponse(
            manifest_path,
            media_type="application/manifest+json",
            headers={"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"},
        )
    return JSONResponse(
        {
            "name": "Ghana Stem Trivia",
            "short_name": "STEM Trivia",
            "start_url": "/",
            "display": "standalone",
            "background_color": "#ffffff",
            "theme_color": "#0b7a4b",
            "description": "Fun NaCCA-aligned STEM quizzes for Ghanaian learners (B4-B9).",
        },
        headers={"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"},
    )


@app.get("/")
@app.get("/{full_path:path}")
async def serve_frontend(request: Request, full_path: str = ""):
    """Serve the SPA shell and built static assets."""
    # API paths
    if full_path.startswith("api/") or full_path.startswith("auth/") or \
       full_path.startswith("quiz/") or full_path.startswith("admin/") or \
       full_path.startswith("curriculum/") or full_path.startswith("media/") or \
       full_path.startswith("docs") or full_path.startswith("openapi"):
        return JSONResponse({"detail": "Not Found"}, status_code=404)

    # Static files (JS, CSS, images, icons) — serve with no-cache headers
    candidate = DIST_DIR / full_path
    if candidate.is_file():
        resp = FileResponse(candidate)
        resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        resp.headers["Pragma"] = "no-cache"
        return resp

    # index.html
    index_html = (DIST_DIR / "index.html").read_text(encoding="utf-8")

    resp = HTMLResponse(content=index_html, media_type="text/html")
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    resp.headers["Pragma"] = "no-cache"
    return resp


@app.on_event("startup")
def _startup():
    init_db()
    seed_super_admin()
