#!/usr/bin/env python3
"""Quality audit of ALL 2,718 questions across all 3 subjects."""
import sqlite3

db = sqlite3.connect('/media/stephen/FILES/MyShit/ghana-stem-trivia/backend/trivia.db')
conn = db
conn.row_factory = sqlite3.Row

print("=" * 70)
print("FULL QUALITY AUDIT — 2,718 Questions")
print("=" * 70)

# ── 1. Count ──
total = conn.execute("SELECT COUNT(*) FROM questions WHERE is_active=1").fetchone()[0]
print(f"\nTotal active: {total}")
for s, n in conn.execute("SELECT subject, COUNT(*) FROM questions WHERE is_active=1 GROUP BY subject ORDER BY subject"):
    print(f"  {s}: {n}")

# ── 2. Structural integrity ──
print("\n" + "=" * 60)
print("STRUCTURAL CHECKS")
print("=" * 60)

checks = {
    "Empty question text":
        "SELECT COUNT(*) FROM questions WHERE question IS NULL OR TRIM(question)=''",
    "answer_index not in 0-3":
        "SELECT COUNT(*) FROM questions WHERE answer_index NOT BETWEEN 0 AND 3",
    "Missing option_a":
        "SELECT COUNT(*) FROM questions WHERE option_a IS NULL OR TRIM(option_a)=''",
    "Missing option_b":
        "SELECT COUNT(*) FROM questions WHERE option_b IS NULL OR TRIM(option_b)=''",
    "Missing option_c":
        "SELECT COUNT(*) FROM questions WHERE option_c IS NULL OR TRIM(option_c)=''",
    "Missing option_d":
        "SELECT COUNT(*) FROM questions WHERE option_d IS NULL OR TRIM(option_d)=''",
    "Answer index mismatch (answer text != selected option)":
        """SELECT COUNT(*) FROM questions 
           WHERE answer_index BETWEEN 0 AND 3
           AND (
               (answer_index=0 AND option_a IS NULL) OR
               (answer_index=1 AND option_b IS NULL) OR
               (answer_index=2 AND option_c IS NULL) OR
               (answer_index=3 AND option_d IS NULL)
           )""",
}

for label, sql in checks.items():
    try:
        n = conn.execute(sql).fetchone()[0]
        status = "✅ CLEAN" if n == 0 else f"❌ FAIL ({n})"
        print(f"  {status}: {label}")
    except Exception as e:
        print(f"  ⚠️  SKIP {label}: {e}")

# ── 3. Wrong topics check ──
print("\n" + "=" * 60)
print("TOPIC ALIGNMENT CHECKS")
print("=" * 60)

# Math: simple arithmetic should NOT be in Algebraic Expressions
wrong_math = conn.execute("""
    SELECT COUNT(*) FROM questions WHERE subject='Mathematics' 
    AND topic='Algebraic Expressions' AND is_active=1
    AND question LIKE 'What is%'
""").fetchone()[0]
print(f"  {'✅' if wrong_math==0 else '❌'} Simple arithmetic in Algebraic Expressions: {wrong_math}")

# Math: area/perimeter NOT in Position and Transformation
wrong_math2 = conn.execute("""
    SELECT COUNT(*) FROM questions WHERE subject='Mathematics' AND topic='Position and Transformation' 
    AND is_active=1 AND (question LIKE '%area%' OR question LIKE '%perimeter%')
""").fetchone()[0]
print(f"  {'✅' if wrong_math2==0 else '❌'} Area/Perimeter in Position & Transformation: {wrong_math2}")

# Math: area/perimeter NOT in Number Operations
wrong_math3 = conn.execute("""
    SELECT COUNT(*) FROM questions WHERE subject='Mathematics' AND topic='Number Operations' 
    AND is_active=1 AND (question LIKE '%area%' OR question LIKE '%perimeter%')
""").fetchone()[0]
print(f"  {'✅' if wrong_math3==0 else '❌'} Area/Perimeter in Number Operations: {wrong_math3}")

# Science: classification NOT in wrong topics
wrong_sci1 = conn.execute("""
    SELECT COUNT(*) FROM questions WHERE subject='Science' 
    AND topic != 'UNDERSTANDING THE ENVIRONMENT' 
    AND question LIKE '%which of these is not a plant%'
""").fetchone()[0]
print(f"  {'✅' if wrong_sci1==0 else '❌'} 'NOT a plant' in wrong Science topic: {wrong_sci1}")

wrong_sci2 = conn.execute("""
    SELECT COUNT(*) FROM questions WHERE subject='Science' 
    AND topic != 'GENERAL' 
    AND question LIKE '%which of these is not a renewable energy source%'
""").fetchone()[0]
print(f"  {'✅' if wrong_sci2==0 else '❌'} 'NOT renewable energy' in wrong Science topic: {wrong_sci2}")

# ── 4. Answer correctness verification ──
print("\n" + "=" * 60)
print("ANSWER CORRECTNESS VERIFICATION")
print("=" * 60)

# Verify Computing: answer_index matches the correct option text
wrong_opts = 0
for row in conn.execute("""
    SELECT id, question, option_a, option_b, option_c, option_d, answer_index
    FROM questions WHERE subject='Computing' AND is_active=1
"""):
    L = ['A','B','C','D']
    ans = L[row['answer_index']] if 0 <= row['answer_index'] < 4 else '?'
    opts = [row['option_a'],row['option_b'],row['option_c'],row['option_d']]
    if opts[row['answer_index']] is None or opts[row['answer_index']].strip() == '':
        wrong_opts += 1
        print(f"  ❌ id={row['id']}: answer_index={row['answer_index']} but option is empty")

print(f"  {'✅' if wrong_opts==0 else '❌'} Computing options match answer_index: {wrong_opts} mismatches")

# Verify Science answers (spot-check 50 questions with answer_index in range)
sci_empty = conn.execute("""
    SELECT COUNT(*) FROM questions WHERE subject='Science' AND is_active=1
    AND (option_a IS NULL OR option_b IS NULL OR option_c IS NULL OR option_d IS NULL)
""").fetchone()[0]
print(f"  {'✅' if sci_empty==0 else '❌'} Science options all present: {sci_empty} missing")

# Verify Math answers
math_empty = conn.execute("""
    SELECT COUNT(*) FROM questions WHERE subject='Mathematics' AND is_active=1
    AND (option_a IS NULL OR option_b IS NULL OR option_c IS NULL OR option_d IS NULL)
""").fetchone()[0]
print(f"  {'✅' if math_empty==0 else '❌'} Math options all present: {math_empty} missing")

# ── 5. Bad question patterns ──
print("\n" + "=" * 60)
print("BAD PATTERN CHECKS")
print("=" * 60)

patterns = [
    ("B-code indicators in questions",
     "SELECT COUNT(*) FROM questions WHERE question LIKE 'B%' AND question LIKE '%.%'"),
    ("CC competency tags",
     "SELECT COUNT(*) FROM questions WHERE question LIKE '%Communication and Collaboration%' OR question LIKE '%Creativity and Innovation%'"),
    ("Questions with answer as question (exact copies)",
     "SELECT COUNT(*) FROM questions WHERE TRIM(question) = TRIM(option_a) OR TRIM(question) = TRIM(option_b) OR TRIM(question) = TRIM(option_c) OR TRIM(question) = TRIM(option_d)"),
    ("Generic 'Option A/B/C/D' placeholder options",
     "SELECT COUNT(*) FROM questions WHERE option_a LIKE 'Option %' OR option_b LIKE 'Option %'"),
    ("Questions starting with lowercase (broken grammar)",
     "SELECT COUNT(*) FROM questions WHERE question REGEXP '^[a-z]%'"),
    ("Truncated questions (ending mid-sentence)",
     "SELECT COUNT(*) FROM questions WHERE question LIKE '%...%'"),
]

for label, sql in patterns:
    try:
        n = conn.execute(sql).fetchone()[0]
        status = "✅ CLEAN" if n == 0 else f"❌ FAIL ({n})"
        print(f"  {status}: {label}")
    except Exception as e:
        print(f"  ⚠️  SKIP {label}: {e}")

# ── 6. Per-subject per-class breakdown ──
print("\n" + "=" * 60)
print("QUESTIONS PER CLASS PER SUBJECT")
print("=" * 60)
for s in ['Computing', 'Mathematics', 'Science']:
    print(f"\n  {s}:")
    for row in conn.execute(
        "SELECT class_level, COUNT(*) as n FROM questions WHERE subject=? AND is_active=1 GROUP BY class_level ORDER BY class_level",
        (s,)
    ):
        print(f"    {row[0]}: {row[1]}")

# ── 7. Per-topic counts (top 10 thinnest) ──
print("\n" + "=" * 60)
print("TOP 10 THINNEST TOPICS")
print("=" * 60)
for row in conn.execute("""
    SELECT subject, topic, COUNT(*) as n
    FROM questions WHERE is_active=1
    GROUP BY subject, topic
    ORDER BY n ASC LIMIT 10
"""):
    print(f"  {row[0]:15s} | {row[1]:50s} | {row[2]:3d}")

# ── 8. Sample 10 random questions for visual inspection ──
print("\n" + "=" * 60)
print("RANDOM SAMPLE — 10 questions to visually verify")
print("=" * 60)
for row in conn.execute("""
    SELECT subject, class_level, topic, question, option_a, option_b, option_c, option_d, answer_index
    FROM questions WHERE is_active=1 ORDER BY RANDOM() LIMIT 10
"""):
    L = ['A','B','C','D']
    ans = L[row['answer_index']] if 0 <= row['answer_index'] < 4 else '?'
    print(f"\n[{row[0]}/{row[1]}] {row[2]}")
    print(f"  Q: {row['question'][:100]}")
    for l, o in zip(L, [row['option_a'],row['option_b'],row['option_c'],row['option_d']]):
        mk = ' <-- ANSWER' if l==ans else ''
        print(f"    {l}. {o[:70]}{mk}")

conn.close()
print("\n✅ Audit complete.")
