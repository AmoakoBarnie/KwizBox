#!/bin/sh
# Container entrypoint: seed the persistent volume once, then run uvicorn.
set -eu

DB_PATH="${DB_PATH:-/data/trivia.db}"

if [ ! -f "$DB_PATH" ]; then
    echo "[entrypoint] ${DB_PATH} missing - installing sanitized question seed"
    mkdir -p "$(dirname "$DB_PATH")"
    cp /app/seed/trivia-seed.db "$DB_PATH"
fi

exec uvicorn src.main:app --host 0.0.0.0 --port "${PORT:-8080}"
