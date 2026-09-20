#!/bin/bash
# keepalive.sh — keeps Ghana STEM Trivia backend + Cloudflare tunnel alive.
# KEY FIX: kills the old process BEFORE starting a new one, so no port/duplicate fights.
set -u

ROOT="C:/Users/Amoako/ghana-stem-trivia"
VENV="$ROOT/backend/venv/Scripts/python.exe"
CLOUDFLARED="$ROOT/../TQ/webapp_dev/cloudflared.exe"
PORT=8001

kill_backend() {
  # kill anything bound to PORT 8001, then any uvicorn
  for PID in $(netstat -ano 2>/dev/null | grep ":$PORT" | grep LISTEN | awk '{print $5}'); do
    taskkill /F /PID "$PID" 2>/dev/null
  done
  pkill -f "uvicorn src.main:app" 2>/dev/null
}

kill_tunnel() {
  taskkill /F /IM cloudflared.exe 2>/dev/null
  pkill -f "cloudflared tunnel" 2>/dev/null
}

start_backend() {
  kill_backend
  sleep 2
  cd "$ROOT/backend" || return 1
  nohup "$VENV" -m uvicorn src.main:app --host 0.0.0.0 --port "$PORT" > "$ROOT/backend_run.log" 2>&1 &
  echo "$(date) backend started"
}

start_tunnel() {
  kill_tunnel
  sleep 2
  nohup "$CLOUDFLARED" tunnel --url "http://localhost:$PORT" --no-autoupdate > "$ROOT/cloudflared_run.log" 2>&1 &
  echo "$(date) tunnel started"
}

backend_up() {
  curl -s -o /dev/null -m 5 "http://127.0.0.1:$PORT/health"
  [ "$?" -eq 0 ]
}

tunnel_up() {
  URL=$(grep -o "https://[a-z0-9-]*\.trycloudflare\.com" "$ROOT/cloudflared_run.log" | grep -v "^$" | tail -1)
  [ -n "$URL" ] && curl -s -o /dev/null -m 8 "$URL/"
  [ "$?" -eq 0 ]
}

# initial start
start_backend
sleep 5
start_tunnel

echo "$(date) watchdog running — checks every 30s"

while true; do
  if ! backend_up; then
    echo "$(date) BACKEND DOWN — restarting"
    start_backend
  fi
  if ! tunnel_up; then
    echo "$(date) TUNNEL DOWN — restarting"
    start_tunnel
  fi
  sleep 30
done
