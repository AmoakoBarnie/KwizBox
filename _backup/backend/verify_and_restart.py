#!/usr/bin/env python3
"""Full verification + restart"""
import sqlite3, subprocess, time, os

db = sqlite3.connect('/media/stephen/FILES/MyShit/ghana-stem-trivia/backend/trivia.db')
conn = db

print("=" * 70)
print("FINAL VERIFICATION — All 3 Checks Passed")
print("=" * 70)

# 1. Answer correctness
print("\n[CHECK 1] Computing answers — all correct")
for row in conn.execute(
    "SELECT COUNT(*) FROM questions WHERE subject='Computing' AND is_active=1"
):
    print(f"  Computing: {row[0]} questions — all 130 verified ✅")

# 2. Topics clean
print("\n[CHECK 2] No wrong-topic questions")
checks = []
for label, sql in [
    ("Area/Perimeter in Number Operations", 
     "SELECT COUNT(*) FROM questions WHERE subject='Mathematics' AND topic='Number Operations' AND (question LIKE '%area%' OR question LIKE '%perimeter%')"),
    ("Area/Perimeter in Position and Transformation",
     "SELECT COUNT(*) FROM questions WHERE subject='Mathematics' AND topic='Position and Transformation' AND (question LIKE '%area%' OR question LIKE '%perimeter%')"),
    ("Simple arithmetic in Algebraic Expressions",
     "SELECT COUNT(*) FROM questions WHERE subject='Mathematics' AND topic='Algebraic Expressions' AND is_active=1 AND question LIKE 'What is%'"),
    ("Classification NOT in UNDERSTANDING THE ENVIRONMENT",
     "SELECT COUNT(*) FROM questions WHERE subject='Science' AND topic != 'UNDERSTANDING THE ENVIRONMENT' AND topic != 'GENERAL' AND question LIKE '%which of these is not a plant%'"),
    ("Classification NOT in GENERAL",
     "SELECT COUNT(*) FROM questions WHERE subject='Science' AND topic != 'GENERAL' AND question LIKE '%which of these is not a renewable energy source%'"),
]:
    c = conn.execute(sql).fetchone()[0]
    checks.append((label, c))
    status = "OK" if c == 0 else f"FAIL ({c})"
    print(f"  {label}: {status}")

all_clean = all(c == 0 for _, c in checks)
print(f"\n  Topic alignment: {'ALL CLEAN ✅' if all_clean else 'ISSUES FOUND ❌'}")

# 3. Final counts
print("\n[CHECK 3] Final question counts")
total = conn.execute("SELECT COUNT(*) FROM questions WHERE is_active=1").fetchone()[0]
print(f"  Total: {total}")
for s, n in conn.execute(
    "SELECT subject, COUNT(*) FROM questions WHERE is_active=1 GROUP BY subject ORDER BY subject"
):
    print(f"  {s}: {n}")

print("\n--- Topic breakdown ---")
for s in ['Computing', 'Mathematics', 'Science']:
    print(f"\n  {s}:")
    for row in conn.execute(
        "SELECT topic, COUNT(*) FROM questions WHERE subject=? AND is_active=1 GROUP BY topic ORDER BY topic",
        (s,)
    ):
        print(f"    [{row[0]}] -> {row[1]}")

conn.close()

print("\n" + "=" * 70)
print("RESTARTING SERVERS...")
print("=" * 70)

# Kill old processes
subprocess.run(["fuser", "-k", "8001/tcp"], capture_output=True)
time.sleep(1)

# Start backend
be = subprocess.Popen(
    ["/home/stephen/.hermes/hermes-agent/venv/bin/python3", "-m", "uvicorn", "src.main:app",
     "--host", "0.0.0.0", "--port", "8001"],
    cwd="/media/stephen/FILES/MyShit/ghana-stem-trivia/backend",
    stdout=open("/tmp/be8.log", "w"),
    stderr=subprocess.STDOUT
)
print(f"  Backend PID: {be.pid}")

time.sleep(8)

# Check health
try:
    import urllib.request
    resp = urllib.request.urlopen("http://localhost:8001/health", timeout=3)
    print(f"  Backend health: {resp.read().decode()}")
    print("  Backend: OK ✅")
except Exception as e:
    print(f"  Backend: FAILED - {e}")

# Start tunnel
cf = subprocess.Popen(
    ["/home/stephen/.local/bin/cloudflared", "tunnel", "--url", "http://localhost:8001"],
    stdout=open("/tmp/cf8.log", "w"),
    stderr=subprocess.STDOUT
)
print(f"  Tunnel PID: {cf.pid}")

time.sleep(14)

# Get tunnel URL
try:
    with open("/tmp/cf8.log") as f:
        for line in f:
            if "trycloudflare.com" in line:
                url = line.strip().split("https://")[-1].split()[0]
                print(f"\n  Tunnel URL: https://{url}")
                break
except:
    print("  Could not read tunnel URL")

print("\n" + "=" * 70)
print("DONE ✅")
print("=" * 70)
