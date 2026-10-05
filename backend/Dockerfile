# KwizBox backend — deployment image
#
# Serves the FastAPI API *and* the built React SPA from one container, which is
# how main.py expects the layout: backend/src/main.py resolves DIST_DIR as
# ../frontend/dist relative to the backend directory.
#
# Build from the REPO ROOT:
#   docker build -f backend/Dockerfile -t kwizbox .

FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# System deps for psycopg2 (libpq) and building wheels
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*

# --- Python deps (cached layer) ---
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# --- Backend source ---
COPY backend/ ./backend/

# --- Built frontend (main.py serves it from ../frontend/dist) ---
COPY frontend/dist/ ./frontend/dist/

# Static question diagrams live at backend/static/questions
RUN mkdir -p /app/backend/static/questions

WORKDIR /app/backend

EXPOSE 8000

# Hosts inject $PORT; default to 8000 locally.
CMD ["sh", "-c", "uvicorn src.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
