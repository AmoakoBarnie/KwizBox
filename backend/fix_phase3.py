#!/usr/bin/env python3
"""Phase 3 fix: correctness + topic realignment + status"""
import sqlite3, ast

db = sqlite3.connect('/media/stephen/FILES/MyShit/ghana-stem-trivia/backend/trivia.db')
db.row_factory = sqlite3.Row
conn = db

print("=" * 60)
print("PHASE 3 — Correctness + Topic Realignment")
print("=" * 60)

# A. Move Area/Perimeter Math questions from Number Operations → Measurement
moved = []
for row in conn.execute(
    "SELECT id, question, topic FROM questions WHERE subject='Mathematics' "
    "AND class_level IN ('B4','B5','B6') AND topic='Number Operations' ORDER BY id"
):
    q = row['question']
    if any(k in q.lower() for k in ['area','perimeter','square unit','surface area','length and breadth']):
        moved.append(row['id'])
        conn.execute(
            "UPDATE questions SET topic='Measurement', sub_topic='Area and Perimeter' WHERE id=?",
            (row['id'],))

if moved:
    print(f"\n[A] Moved {len(moved)} Area/Perimeter questions from Number Operations → Measurement:")
    for i in moved:
        r = conn.execute("SELECT class_level, question FROM questions WHERE id=?", (i,)).fetchone()
        print(f"   id={i} [{r['class_level']}] {r['question'][:75]}...")
else:
    print("\n[A] No Area/Perimeter questions in Number Operations.")

# B. Move classification Qs to Understanding the Environment (Science)
moved2 = []
for row in conn.execute(
    "SELECT id, question, topic FROM questions WHERE subject='Science' AND topic != 'Understanding the Environment' "
    "AND topic != 'GENERAL' ORDER BY id"
):
    q = row['question'].lower()
    if any(p in q for p in [
        'which is not a plant', 'which is not an animal',
        'which of these is not a plant', 'which of these is not an animal',
        'which of these is not an insect', 'which of these is not a bird'
    ]):
        moved2.append(row['id'])
        conn.execute(
            "UPDATE questions SET topic='Understanding the Environment', sub_topic='Classification' WHERE id=?",
            (row['id'],))

if moved2:
    print(f"\n[B] Moved {len(moved2)} classification questions to Understanding the Environment:")
    for i in moved2:
        r = conn.execute("SELECT class_level, question FROM questions WHERE id=?", (i,)).fetchone()
        print(f"   id={i} [{r['class_level']}] {r['question'][:75]}...")
else:
    print("\n[B] No misclassification questions in wrong topics.")

# C. Fix id=571 truncated explanation
r = conn.execute("SELECT id, explanation FROM questions WHERE id=571").fetchone()
if r:
    print(f"\n[C] BEFORE id=571: {r['explanation']}")
    conn.execute(
        "UPDATE questions SET explanation=? WHERE id=571",
        ("Area is the measure of space inside a flat surface. For a square, area = side × side "
         "(length × breadth). Area is measured in square units like cm² or m².",))
    r2 = conn.execute("SELECT explanation FROM questions WHERE id=571").fetchone()
    print(f"   AFTER  id=571: {r2['explanation']}")
else:
    print("\n[C] id=571 not found — skipping.")

# D. Correctness spot-check: verify answer_index valid for all
print("\n[D] Checking answer_index validity across all active questions...")
bad = []
for row in conn.execute("SELECT id, options, answer_index FROM questions WHERE is_active=1"):
    try:
        opts = ast.literal_eval(row['options']) if isinstance(row['options'], str) else list(row['options'])
    except Exception:
        opts = []
    if not (0 <= row['answer_index'] < len(opts)):
        bad.append((row['id'], row['answer_index'], len(opts)))
        print(f"   ❌ id={row['id']}: answer_index={row['answer_index']}, options={len(opts)}")
    elif len(opts) != 4:
        bad.append((row['id'], 'LEN', len(opts)))
        print(f"   ⚠️  id={row['id']}: {len(opts)} options (not 4)")

if not bad:
    print("   ✅ All answer_index values valid (0-3, 4 options each)")
else:
    print(f"   ❌ Found {len(bad)} problems")

# E. Fix known wrong answer_index
r = conn.execute("SELECT id, options, answer_index FROM questions WHERE id=843").fetchone()
if r:
    try:
        opts = ast.literal_eval(r['options'])
    except Exception:
        opts = []
    print(f"\n[E] id=843 options={opts}, answer_index={r['answer_index']}")
    if r['answer_index'] != 1:
        conn.execute("UPDATE questions SET answer_index=1 WHERE id=843")
        print(f"   ✅ Fixed id=843: answer_index→1 (Printer is index 1)")

r = conn.execute("SELECT id, options, answer_index FROM questions WHERE id=1245").fetchone()
if r:
    try:
        opts = ast.literal_eval(r['options'])
    except Exception:
        opts = []
    print(f"\n[F] id=1245 options={opts}, answer_index={r['answer_index']}")
    if r['answer_index'] != 2:
        conn.execute("UPDATE questions SET answer_index=2 WHERE id=1245")
        print(f"   ✅ Fixed id=1245: answer_index→2 (18,943 is index 2)")

# F. Final status
print("\n" + "=" * 60)
print("FINAL STATUS")
print("=" * 60)

print(f"\nSubjects: {[r['subject'] for r in conn.execute('SELECT DISTINCT subject FROM questions')]}")
total = conn.execute("SELECT COUNT(*) FROM questions WHERE is_active=1").fetchone()[0]
print(f"Total active: {total}")

print("\n--- Per subject ---")
for s, n in conn.execute(
    "SELECT subject, COUNT(*) FROM questions WHERE is_active=1 GROUP BY subject ORDER BY subject"
):
    print(f"  {s}: {n}")

print("\n--- Topics per subject ---")
for s in ['Computing', 'Mathematics', 'Science']:
    rows = conn.execute(
        "SELECT topic, COUNT(*) FROM questions WHERE subject=? AND is_active=1 GROUP BY topic ORDER BY topic",
        (s,)
    ).fetchall()
    print(f"\n  {s}:")
    for t, n in rows:
        print(f"    [{t}] → {n}")

# G. Quality checks
print("\n--- Quality checks ---")
for label, sql in [
    ("Empty question text", "SELECT COUNT(*) FROM questions WHERE question IS NULL OR TRIM(question)=''"),
    ("Answer index out of range", "SELECT COUNT(*) FROM questions WHERE answer_index NOT BETWEEN 0 AND 3"),
    ("Missing options", "SELECT COUNT(*) FROM questions WHERE options IS NULL OR options=''"),
    ("B-code in questions", "SELECT COUNT(*) FROM questions WHERE question LIKE 'B%%.%'"),
    ("CC tags in questions", "SELECT COUNT(*) FROM questions WHERE question LIKE '%%Communication and Collaboration%%' OR question LIKE '%%Creativity and Innovation%%'"),
    ("General topic stray", "SELECT COUNT(*) FROM questions WHERE topic='GENERAL' AND subject!='Science'"),
]:
    try:
        n = conn.execute(sql).fetchone()[0]
        print(f"  {'✅ CLEAN' if n == 0 else '❌ NEED FIX'}: {label} = {n}")
    except Exception as e:
        print(f"  ⚠️  SKIP {label}: {e}")

conn.commit()
conn.close()
print("\n✅ Done.")
