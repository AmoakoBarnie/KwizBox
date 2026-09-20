#!/usr/bin/env python3
"""
Ghana STEM Trivia — Phase 3 v2:
Read through questions by topic, vet correctness + topic alignment.
Uses real schema: option_a, option_b, option_c, option_d, answer_index (0-3).
"""
import sqlite3

db = sqlite3.connect('/media/stephen/FILES/MyShit/ghana-stem-trivia/backend/trivia.db')
db.row_factory = sqlite3.Row
conn = db

print("=" * 70)
print("PHASE 3 V2 — Reading + Vetting All Questions")
print("=" * 70)

# ── count stats ──
total = conn.execute("SELECT COUNT(*) FROM questions WHERE is_active=1").fetchone()[0]
print(f"\nTotal active: {total}")
for s, n in conn.execute(
    "SELECT subject, COUNT(*) FROM questions WHERE is_active=1 GROUP BY subject ORDER BY subject"
):
    print(f"  {s}: {n}")

# ── Show ALL Math topics ──
print("\n" + "=" * 70)
print("MATHEMATICS — All Topics (reading every question)")
print("=" * 70)

for topic, n in conn.execute(
    "SELECT topic, COUNT(*) FROM questions WHERE subject='Mathematics' AND is_active=1 GROUP BY topic ORDER BY topic"
):
    print(f"\n{'─'*60}")
    print(f"TOPIC: {topic} ({n} questions)")
    print(f"{'─'*60}")
    for i, row in enumerate(conn.execute(
        "SELECT id, class_level, topic, sub_topic, question, option_a, option_b, option_c, option_d, answer_index, explanation "
        "FROM questions WHERE subject='Mathematics' AND topic=? AND is_active=1 ORDER BY id",
        (topic,)
    ), 1):
        letters = ['A', 'B', 'C', 'D']
        ans_letter = letters[row['answer_index']] if 0 <= row['answer_index'] < 4 else '?'
        ans_text = [row['option_a'], row['option_b'], row['option_c'], row['option_d']][row['answer_index']] if 0 <= row['answer_index'] < 4 else 'N/A'
        # Truncate options for display
        opts = [row['option_a'], row['option_b'], row['option_c'], row['option_d']]
        short_opts = [o[:55] for o in opts]
        q = row['question']
        if len(q) > 120:
            q = q[:117] + '...'
        print(f"\n  [{i}] id={row['id']} [{row['class_level']}] {row['topic']} › {row['sub_topic']}")
        print(f"      Q: {q}")
        for l, o in zip(letters, short_opts):
            marker = ' ◀ ANSWER' if l == ans_letter else ''
            print(f"        {l}. {o}{marker}")
        if row['explanation'] and len(row['explanation']) > 3:
            e = row['explanation']
            if len(e) > 100:
                e = e[:97] + '...'
            print(f"      💡 {e}")

# ── Show ALL Science topics ──
print("\n\n" + "=" * 70)
print("SCIENCE — All Topics (reading every question)")
print("=" * 70)

for topic, n in conn.execute(
    "SELECT topic, COUNT(*) FROM questions WHERE subject='Science' AND is_active=1 GROUP BY topic ORDER BY topic"
):
    print(f"\n{'─'*60}")
    print(f"TOPIC: {topic} ({n} questions)")
    print(f"{'─'*60}")
    for i, row in enumerate(conn.execute(
        "SELECT id, class_level, topic, sub_topic, question, option_a, option_b, option_c, option_d, answer_index, explanation "
        "FROM questions WHERE subject='Science' AND topic=? AND is_active=1 ORDER BY id",
        (topic,)
    ), 1):
        letters = ['A', 'B', 'C', 'D']
        ans_letter = letters[row['answer_index']] if 0 <= row['answer_index'] < 4 else '?'
        opts = [row['option_a'], row['option_b'], row['option_c'], row['option_d']]
        short_opts = [o[:55] for o in opts]
        q = row['question']
        if len(q) > 120:
            q = q[:117] + '...'
        print(f"\n  [{i}] id={row['id']} [{row['class_level']}] {row['topic']} › {row['sub_topic']}")
        print(f"      Q: {q}")
        for l, o in zip(letters, short_opts):
            marker = ' ◀ ANSWER' if l == ans_letter else ''
            print(f"        {l}. {o}{marker}")
        if row['explanation'] and len(row['explanation']) > 3:
            e = row['explanation']
            if len(e) > 100:
                e = e[:97] + '...'
            print(f"      💡 {e}")

# ── Show ALL Computing topics ──
print("\n\n" + "=" * 70)
print("COMPUTING — All Topics (reading every question)")
print("=" * 70)

for topic, n in conn.execute(
    "SELECT topic, COUNT(*) FROM questions WHERE subject='Computing' AND is_active=1 GROUP BY topic ORDER BY topic"
):
    print(f"\n{'─'*60}")
    print(f"TOPIC: {topic} ({n} questions)")
    print(f"{'─'*60}")
    for i, row in enumerate(conn.execute(
        "SELECT id, class_level, topic, sub_topic, question, option_a, option_b, option_c, option_d, answer_index, explanation "
        "FROM questions WHERE subject='Computing' AND topic=? AND is_active=1 ORDER BY id",
        (topic,)
    ), 1):
        letters = ['A', 'B', 'C', 'D']
        ans_letter = letters[row['answer_index']] if 0 <= row['answer_index'] < 4 else '?'
        opts = [row['option_a'], row['option_b'], row['option_c'], row['option_d']]
        short_opts = [o[:55] for o in opts]
        q = row['question']
        if len(q) > 120:
            q = q[:117] + '...'
        print(f"\n  [{i}] id={row['id']} [{row['class_level']}] {row['topic']} › {row['sub_topic']}")
        print(f"      Q: {q}")
        for l, o in zip(letters, short_opts):
            marker = ' ◀ ANSWER' if l == ans_letter else ''
            print(f"        {l}. {o}{marker}")
        if row['explanation'] and len(row['explanation']) > 3:
            e = row['explanation']
            if len(e) > 100:
                e = e[:97] + '...'
            print(f"      💡 {e}")

conn.close()
print("\n✅ Done reading all questions.")
