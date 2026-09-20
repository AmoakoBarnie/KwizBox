#!/bin/bash
# keepalive_linux.sh — keeps Ghana STEM Trivia backend + Cloudflare tunnel alive on Linux
# Rewritten from Windows keepalive.sh for Linux (no taskkill, use pkill/fuser)
set -u

APP="/home/stephen/Desktop/MY APP"
BACKEND_DIR="$APP/backend"
VENV_PY="$BACKEND_DIR/venv/bin/python"
CLOUDFLARED="/home/stephen/.local/bin/cloudflared"
PORT=8001
LOG="$APP/keepalive.log"
TUNNEL_URL_FILE="$APP/current_tunnel_url.txt"

log() { echo "$(date '+%a, %b %d, %Y %H:%M:%S') $*" | tee -a "$LOG"; }

kill_backend() {
  fuser -k ${PORT}/tcp 2>/dev/null || true
  pkill -f "uvicorn src.main:app" 2>/dev/null || true
  sleep 1
}

kill_tunnel() {
  pkill -f cloudflared 2>/dev/null || true
  sleep 1
}

start_backend() {
  log "BACKEND DOWN — restarting"
  cd "$BACKEND_DIR"
  nohup "$VENV_PY" -m uvicorn src.main:app --host 0.0.0.0 --port $PORT > "$APP/backend_run.log" 2>&1 &
  sleep 4
  if curl -s --max-time 5 "http://localhost:$PORT/health" | grep -q "ok"; then
    log "backend started pid $!"
  else
    log "backend FAILED to start"
  fi
}

start_tunnel() {
  log "TUNNEL DOWN — restarting"
  cd "$APP"
  nohup "$CLOUDFLARED" tunnel --url "http://localhost:5173" > "$APP/tunnel_run.log" 2>&1 &
  
  # Wait for URL to appear (up to 30s)
  local url=""
  for i in $(seq 1 30); do
    sleep 1
    url=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$APP/tunnel_run.log" 2>/dev/null | tail -1)
    if [ -n "$url" ]; then
      echo "$url" > "$TUNNEL_URL_FILE"
      log "tunnel started — $url"
      return 0
    fi
  done
  
  # If we got here, tunnel didn't get a URL — check if process is alive
  if pgrep -af cloudflared | grep -v bash > /dev/null; then
    log "tunnel process alive but no URL yet (may be slow)"
  else
    log "tunnel FAILED to start"
  fi
  return 1
}

# Main loop: monitor and restart
log "=== keepalive_linux.sh started ==="
while true; do
  # Check backend
  if ! curl -s --max-time 3 "http://localhost:$PORT/health" | grep -q "ok"; then
    kill_backend
    start_backend
  fi
  
  # Check tunnel — test the URL from file
  local_url=$(cat "$TUNNEL_URL_FILE" 2>/dev/null || echo "")
  if [ -n "$local_url" ]; then
    if ! curl -s --max-time 5 "$local_url/" -o /dev/null -w "%{http_code}" 2>/dev/null | grep -q "200"; then
      log "TUNNEL DOWN (HTTP check failed for $local_url)"
      kill_tunnel
      start_tunnel
    fi
  else
    # No URL file — tunnel needs to be started
    log "No tunnel URL file — starting tunnel"
    start_tunnel
  fi
  
  sleep 15
done
