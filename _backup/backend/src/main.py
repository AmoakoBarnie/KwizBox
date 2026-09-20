"""FastAPI entry point for the Ghana Stem Trivia backend."""
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from .database import init_db
from .rate_limit import limiter
from .routes import auth, quiz, admin, curriculum as curriculum_routes, challenge as challenge_routes
from .seed_admin import seed_super_admin

app = FastAPI(title="KwizBox", version="1.0.0")

# Rate limiter (shared instance from rate_limit.py — single object for all routes)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(quiz.router)
app.include_router(admin.router)
app.include_router(curriculum_routes.router)
app.include_router(challenge_routes.router)

# Static question diagrams served at /media/questions/<file>.svg
STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
STATIC_DIR.mkdir(parents=True, exist_ok=True)

app.mount(
    "/media/questions",
    StaticFiles(directory=str(STATIC_DIR / "questions")),
    name="media_questions",
)

DIST_DIR = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"

# Cache-busting version — changes every restart so browsers never cache
import time
_CACHE_BUST = str(int(time.time() * 1000))


def _no_cache(response: HTMLResponse) -> HTMLResponse:
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response


@app.get("/health")
@limiter.limit("60/minute")
def health(request: Request):
    return {"status": "ok", "service": "KwizBox"}


@app.get("/sw.js")
def block_sw(request: Request):
    """Any browser requesting sw.js gets a harmless no-op."""
    resp = HTMLResponse(
        "self.addEventListener('fetch', e => e.respondWith(fetch(e.request)))",
        media_type="text/javascript",
    )
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    return resp


@app.get("/workbox-{version:str}.js")
def block_workbox(request: Request, version: str):
    """Trap workbox requests — return no-op."""
    resp = HTMLResponse(
        "self.addEventListener('fetch', e => e.respondWith(fetch(e.request)))",
        media_type="text/javascript",
    )
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    return resp


@app.get("/manifest.webmanifest")
def block_manifest(request: Request):
    """Return minimal manifest — no SW registration hint."""
    import json
    return JSONResponse(
        {
            "name": "KwizBox",
            "short_name": "KwizBox",
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
    """Serve the SPA. All responses are cache-busted."""
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

    # index.html — inject SW-kill + cache-bust asset URLs
    index_html = (DIST_DIR / "index.html").read_text(encoding="utf-8")

    # Add cache-busting query param to JS and CSS URLs
    index_html = index_html.replace(
        'src="/assets/index-_Whnn0pU.js"',
        f'src="/assets/index-_Whnn0pU.js?v={_CACHE_BUST}"'
    )
    index_html = index_html.replace(
        'href="/assets/index-Ct1LAUFI.css"',
        f'href="/assets/index-Ct1LAUFI.css?v={_CACHE_BUST}"'
    )

    # Inject SW-kill + cache-clear script as the FIRST thing in <head>
    sw_kill = (
        '<script>'
        "(function(){"
        "if(typeof navigator==='undefined')return;"
        "if(navigator.serviceWorker&&navigator.serviceWorker.controller){"
        "  Promise.all(["
        "    navigator.serviceWorker.getRegistrations().then(r=>{r.forEach(s=>s.unregister());}),"
        "    (async()=>{"
        "      const keys=await caches.keys();"
        "      await Promise.all(keys.map(k=>caches.delete(k)));"
        "    })()"
        "  ]).then(()=>{"
        "    const bust=Date.now()+Math.random().toString(36).slice(2);"
        "    window.location.href=window.location.pathname+'?v='+bust+window.location.hash;"
        "  }).catch(()=>{"
        "    window.location.reload();"
        "  });"
        "}"
        "})();"
        "</script>"
    )
    index_html = index_html.replace("<head>", "<head>" + sw_kill, 1)

    resp = HTMLResponse(content=index_html, media_type="text/html")
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    resp.headers["Pragma"] = "no-cache"
    return resp


@app.on_event("startup")
def _startup():
    init_db()
    seed_super_admin()
