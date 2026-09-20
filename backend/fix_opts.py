#!/usr/bin/env python3
"""Fix option formats and truncated question in trivia.db."""
import sqlite3, re, random

db = sqlite3.connect('/media/stephen/FILES/MyShit/ghana-stem-trivia/backend/trivia.db')
conn = db

# ── FIX 1: Strip letter prefixes from options ──
# Options like "A. 56" → "56", "B. 203" → "203"
fixed = 0
for row in conn.execute("SELECT id, option_a, option_b, option_c, option_d FROM questions WHERE is_active=1"):
    updates = {}
    for col in ['option_a','option_b','option_c','option_d']:
        val = row[col]
        if val and re.match(r'^[A-D]\.\s', str(val)):
            new_val = re.sub(r'^[A-D]\.\s', '', str(val))
            updates[col] = new_val
    if updates:
        fixed += 1
        sets = ', '.join(f"{col} = ?" for col in updates)
        vals = list(updates.values()) + [row[0]]
        conn.execute(f"UPDATE questions SET {sets} WHERE id = ?", vals)

conn.commit()
print(f"Fixed letter prefixes in {fixed} questions")

# Verify
remaining = conn.execute(
    "SELECT COUNT(*) FROM questions WHERE option_a LIKE '[A-D]. %' AND is_active=1"
).fetchone()[0]
print(f"Remaining single-letter prefixes: {remaining}")

# ── FIX 2: Truncated question ──
row = conn.execute(
    "SELECT id, question FROM questions WHERE question LIKE '%...%' AND is_active=1"
).fetchone()
if row:
    qid = row[0]
    old_q = row[1]
    new_q = "Parallel lines are lines that never intersect, no matter how far they are extended."
    conn.execute("UPDATE questions SET question = ? WHERE id = ?", (new_q, qid))
    conn.commit()
    print(f"Fixed truncated Q id={qid}: '{old_q}' → '{new_q}'")
else:
    print("No truncated questions found")

# ── Final summary ──
total = conn.execute("SELECT COUNT(*) FROM questions WHERE is_active=1").fetchone()[0]
print(f"\nTotal active questions: {total}")
for s, n in conn.execute("SELECT subject, COUNT(*) FROM questions WHERE is_active=1 GROUP BY subject ORDER BY subject"):
    print(f"  {s}: {n}")

conn.close()
print("\nDone.")