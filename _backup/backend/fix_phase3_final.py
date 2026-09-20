#!/usr/bin/env python3
"""Phase 3 fix: correctness + topic realignment + status"""
import sqlite3

db = sqlite3.connect('/media/stephen/FILES/MyShit/ghana-stem-trivia/backend/trivia.db')
db.row_factory = sqlite3.Row
conn = db

print("=" * 60)
print("PHASE 3 — Correctness + Topic Realignment")
print("=" * 60)

# A. Move Area/Perimeter Math questions from Number Operations -> Measurement
moved = []
for row in conn.execute(
    "SELECT id, question FROM questions WHERE subject='Mathematics' "
    "AND class_level IN ('B4','B5','B6') AND topic='Number Operations' ORDER BY id"
):
    q = row['question']
    if any(k in q.lower() for k in ['area','perimeter','square unit','surface area','length and breadth']):
        moved.append(row['id'])
        conn.execute(
            "UPDATE questions SET topic='Measurement', sub_topic='Area and Perimeter' WHERE id=?",
            (row['id'],))

if moved:
    print(f"\n[A] Moved {len(moved)} Area/Perimeter questions from Number Operations -> Measurement:")
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

# C. Move 8 area/perimeter questions from Position and Transformation -> Measurement
moved3 = []
for row in conn.execute(
    "SELECT id, question FROM questions WHERE subject='Mathematics' AND topic='Position and Transformation' AND is_active=1"
):
    q = row['question'].lower()
    if any(kw in q for kw in ['area of','perimeter of','what is its area','what is its perimeter','length by','triangle has base']):
        moved3.append(row['id'])
        conn.execute("UPDATE questions SET topic='Measurement', sub_topic='Area and Perimeter' WHERE id=?", (row['id'],))

if moved3:
    print(f"\n[C] Moved {len(moved3)} area/perimeter questions from Position and Transformation -> Measurement:")
    for i in moved3:
        r = conn.execute("SELECT question FROM questions WHERE id=?", (i,)).fetchone()
        print(f"   id={i}: {r['question'][:80]}")
else:
    print("\n[C] No area/perimeter questions in Position and Transformation.")

# D. Move 2 Science classification questions to correct topics
moved4 = []
for row in conn.execute(
    "SELECT id, topic, question FROM questions WHERE subject='Science' AND is_active=1"
):
    q = row['question'].lower()
    if 'which of these is not a plant' in q and row['topic'] != 'UNDERSTANDING THE ENVIRONMENT':
        moved4.append((row['id'], 'UNDERSTANDING THE ENVIRONMENT', 'Classification'))
        conn.execute("UPDATE questions SET topic='UNDERSTANDING THE ENVIRONMENT', sub_topic='Classification' WHERE id=?", (row['id'],))
    elif 'which of these is not a renewable energy source' in q and row['topic'] != 'GENERAL':
        moved4.append((row['id'], 'GENERAL', 'Energy Sources'))
        conn.execute("UPDATE questions SET topic='GENERAL', sub_topic='Energy Sources' WHERE id=?", (row['id'],))

if moved4:
    print(f"\n[D] Moved {len(moved4)} classification questions to correct topics:")
    for i,t,st in moved4:
        r = conn.execute("SELECT question FROM questions WHERE id=?", (i,)).fetchone()
        print(f"   id={i} -> {t}/{st}: {r['question'][:80]}")
else:
    print("\n[D] No Science classification questions to move.")

# E. Move 127 simple-arithmetic questions from Algebraic Expressions -> Number and Numeration Systems
moved5 = []
for row in conn.execute(
    "SELECT id, question FROM questions WHERE subject='Mathematics' AND topic='Algebraic Expressions' AND is_active=1"
):
    q = row['question']
    # These are simple arithmetic, not algebraic
    if any(kw in q for kw in ['What is','Round','value of the digit','+','x','Add these amounts','A car travels','hours','minutes']):
        # exclude actual algebra
        if not any(kw in q for kw in ['x +','x -','x =','solve','simplify','pattern','next number','If x','If y','expand','factor','matrix','inequality','derivative','sum of roots','x/','2x','3x','4x','5x','6x']):
            moved5.append(row['id'])
            conn.execute("UPDATE questions SET topic='Number and Numeration Systems', sub_topic='General' WHERE id=?", (row['id'],))

print(f"\n[E] Moved {len(moved5)} simple-arithmetic questions from Algebraic Expressions -> Number and Numeration Systems")
if moved5:
    print(f"   First 10 IDs: {moved5[:10]}...")

conn.commit()

# F. Final status
print("\n" + "=" * 60)
print("FINAL STATUS")
print("=" * 60)

print(f"\nSubjects: {[r[0] for r in conn.execute('SELECT DISTINCT subject FROM questions')]}")
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
        print(f"    [{t}] -> {n}")

conn.close()
print("\nDone.")
