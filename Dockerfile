# KwizBox backend — deployment image
#
# Serves the FastAPI API *and* the built React SPA from one container, which is
# how main.py expects the layout: backend/src/main.py resolves DIST_DIR as
# ../frontend/dist relative to the backend directory.
#
# This Dockerfile lives at the REPO ROOT so Render/Railway auto-detect it
# without needing a Root Directory setting.

# Two-stage build: frontend (node) + python backend, one container.
# Build:  docker build -t kwizbox .
# Fly.io: flyctl deploy --remote-only  (autodetects the Dockerfile at the repo root)

FROM node:18-slim AS frontend
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:/usr/local/bin:$PATH
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/vite.config.js /app/frontend/
COPY frontend/src /app/frontend/src
RUN npm run build

FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY backend/ ./backend/
COPY --from=frontend /app/frontend/dist ./frontend/dist
RUN mkdir -p /app/backend/static/questions
WORKDIR /app/backend
EXPOSE 8000
CMD ["sh", "-c", "uvicorn src.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
