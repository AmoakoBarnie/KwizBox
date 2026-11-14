# syntax=docker/dockerfile:1

# ---------- frontend ----------
FROM node:20-alpine AS frontend

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY frontend/ ./
# Same-origin production build: the backend serves /app/frontend/dist, so the
# app must call its own origin (not the retired Fly URL in .env.production).
RUN rm -f .env.production .env.production.local \
    && VITE_API_URL= npm run build

# ---------- runtime ----------
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8080

WORKDIR /app/backend

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/src ./src
COPY backend/static ./static
COPY backend/curriculum/output/nacca_manifest.json ./curriculum/output/nacca_manifest.json

COPY --from=frontend /app/frontend/dist /app/frontend/dist

COPY deploy/trivia-seed.db /app/seed/trivia-seed.db
COPY deploy/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 8080

CMD ["/app/entrypoint.sh"]
