#!/usr/bin/env python3
import sqlite3

db = sqlite3.connect('/media/stephen/FILES/MyShit/ghana-stem-trivia/backend/trivia.db')
db.row_factory = sqlite3.Row
conn = db

print("=== TABLE SCHEMA ===")
for col in conn.execute("PRAGMA table_info(questions)").fetchall():
    print(f"  {col['name']:20s} ({col['type']})")

print("\n=== id=571 CURRENT STATE ===")
r = conn.execute(
    "SELECT question, option_a, option_b, option_c, option_d, answer_index, explanation, topic "
    "FROM questions WHERE id=571"
).fetchone()
print(f"  ID: 571")
print(f"  Q: {r['question']}")
print(f"  A: {r['option_a']}")
print(f"  B: {r['option_b']}")
print(f"  C: {r['option_c']}")
print(f"  D: {r['option_d']}")
print(f"  ans_idx: {r['answer_index']}")
print(f"  explanation: {r['explanation']}")
print(f"  topic: {r['topic']}")

print("\n=== id=843 CURRENT STATE ===")
r = conn.execute(
    "SELECT id, question, option_a, option_b, option_c, option_d, answer_index, topic "
    "FROM questions WHERE id=843"
).fetchone()
print(f"  ID: {r['id']}")
print(f"  Q: {r['question']}")
print(f"  A: {r['option_a']}")
print(f"  B: {r['option_b']}")
print(f"  C: {r['option_c']}")
print(f"  D: {r['option_d']}")
print(f"  ans_idx: {r['answer_index']}")
print(f"  topic: {r['topic']}")

print("\n=== id=1245 CURRENT STATE ===")
r = conn.execute(
    "SELECT id, question, option_a, option_b, option_c, option_d, answer_index "
    "FROM questions WHERE id=1245"
).fetchone()
print(f"  ID: {r['id']}")
print(f"  Q: {r['question']}")
print(f"  A: {r['option_a']}")
print(f"  B: {r['option_b']}")
print(f"  C: {r['option_c']}")
print(f"  D: {r['option_d']}")
print(f"  ans_idx: {r['answer_index']}")

print("\n=== Other questions in Number Operations with Area/Perimeter ===")
for row in conn.execute(
    "SELECT id, question, topic FROM questions WHERE subject='Mathematics' "
    "AND class_level IN ('B4','B5','B6') AND topic='Number Operations'"
):
    q = row['question'].lower()
    if any(k in q for k in ['area','perimeter','square unit','surface area','length and breadth']):
        print(f"  id={row['id']}: [{row['topic']}] {row['question']}")

print("\n=== id=215 (classification question) ===")
r = conn.execute(
    "SELECT id, question, topic, sub_topic, class_level FROM questions WHERE id=215"
).fetchone()
print(f"  id={r['id']}: [{r['topic']}/{r['sub_topic']}] {r['question']}")

print("\n=== Area/Perimeter questions still in Measurement after [A] pass ===")
for row in conn.execute(
    "SELECT id, question, topic FROM questions WHERE subject='Mathematics' AND topic='Measurement'"
):
    print(f"  id={row['id']}: {row['question'][:80]}")

conn.close()
