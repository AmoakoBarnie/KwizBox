#!/usr/bin/env python3
"""Verification script - no row_factory needed, use index access"""
import sqlite3

db = sqlite3.connect('/media/stephen/FILES/MyShit/ghana-stem-trivia/backend/trivia.db')
conn = db

print("VERIFICATION OF FIXES\n")

# Check id=215 now in UNDERSTANDING THE ENVIRONMENT
r = conn.execute("SELECT topic, sub_topic FROM questions WHERE id=215").fetchone()
status = "OK" if r[0] == 'UNDERSTANDING THE ENVIRONMENT' else "FAIL"
print(f"id=215: topic={r[0]}, sub_topic={r[1]} [{status}]")

# Check id=542 now in GENERAL
r = conn.execute("SELECT topic, sub_topic FROM questions WHERE id=542").fetchone()
status = "OK" if r[0] == 'GENERAL' else "FAIL"
print(f"id=542: topic={r[0]}, sub_topic={r[1]} [{status}]")

# Check area/perimeter questions now in Measurement
print("\nArea/Perimeter questions in Measurement:")
for row in conn.execute(
    "SELECT id, question FROM questions WHERE subject='Mathematics' AND topic='Measurement' "
    "AND (question LIKE '%area%' OR question LIKE '%perimeter%')"
):
    print(f"  id={row[0]}: {row[1][:80]}")

# Check no area/perimeter in Position and Transformation
print("\nArea/Perimeter still in Position and Transformation:")
count = conn.execute(
    "SELECT COUNT(*) FROM questions WHERE subject='Mathematics' AND topic='Position and Transformation' "
    "AND (question LIKE '%area%' OR question LIKE '%perimeter%')"
).fetchone()[0]
print(f"  Count: {count} {'OK' if count == 0 else 'FAIL'}")

# Check simple arithmetic not in Algebraic Expressions
print("\nSimple 'What is' still in Algebraic Expressions:")
count = conn.execute(
    "SELECT COUNT(*) FROM questions WHERE subject='Mathematics' AND topic='Algebraic Expressions' "
    "AND is_active=1 AND question LIKE 'What is%'"
).fetchone()[0]
print(f"  Count: {count} {'OK' if count == 0 else 'FAIL'}")

# Check no area/perimeter in Number Operations
print("\nArea/Perimeter still in Number Operations:")
count = conn.execute(
    "SELECT COUNT(*) FROM questions WHERE subject='Mathematics' AND topic='Number Operations' "
    "AND (question LIKE '%area%' OR question LIKE '%perimeter%')"
).fetchone()[0]
print(f"  Count: {count} {'OK' if count == 0 else 'FAIL'}")

# Check total counts
print("\nFinal topic counts:")
for s in ['Computing', 'Mathematics', 'Science']:
    print(f"\n  {s}:")
    for row in conn.execute(
        "SELECT topic, COUNT(*) FROM questions WHERE subject=? AND is_active=1 GROUP BY topic ORDER BY topic",
        (s,)
    ):
        print(f"    [{row[0]}] -> {row[1]}")

conn.close()
print("\nDone.")
