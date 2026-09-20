#!/usr/bin/env python3
"""Fix wrong answer_index values in all questions."""
import sqlite3, re

db = sqlite3.connect('/media/stephen/FILES/MyShit/ghana-stem-trivia/backend/trivia.db')
conn = db

# Determine correct answer_index from question text and options
def find_correct_idx(q, opts):
    m = re.search(r'(\d+)\s*(?:cm)?\s*(?:by|x)\s*(\d+)\s*(?:cm)?', q)
    if m:
        val = str(int(m.group(1)) * int(m.group(2)))
        if val in opts: return opts.index(val)
    
    m = re.search(r'perimeter.*?(\d+)\s*(?:cm)?\s*(?:by|x)\s*(\d+)\s*(?:cm)?', q, re.IGNORECASE)
    if m:
        val = str(2 * (int(m.group(1)) + int(m.group(2))))
        if val in opts: return opts.index(val)
    
    m = re.search(r'What\s+is\s+(\d+)\s*[×x]\s*(\d+)', q)
    if m:
        val = str(int(m.group(1)) * int(m.group(2)))
        if val in opts: return opts.index(val)
    
    m = re.search(r'What\s+is\s+(\d+)\s*\+\s*(\d+)\s*[×x]\s*(\d+)', q)
    if m:
        val = str(int(m.group(1)) + int(m.group(2)) * int(m.group(3)))
        if val in opts: return opts.index(val)
    
    m = re.search(r'What\s+is\s+(\d+)\s*\+\s*(\d+)\s*\?', q)
    if m:
        val = str(int(m.group(1)) + int(m.group(2)))
        if val in opts: return opts.index(val)
    
    # Multiple additions: "What is 126 + 172 + 103?"
    m = re.search(r'What\s+is\s+(.+)\?', q)
    if m:
        expr = m.group(1).strip()
        parts = re.findall(r'\d+', expr)
        if len(parts) >= 2 and '+' in expr:
            total = sum(int(p) for p in parts)
            val = str(total)
            if val in opts: return opts.index(val)
    
    m = re.search(r'Round\s+([\d.]+)\s+to\s+the\s+nearest\s+whole\s+number', q)
    if m:
        val = str(round(float(m.group(1))))
        if val in opts: return opts.index(val)
    
    m = re.search(r'digit in the (tens|ones|hundreds|thousands) place in (\d+)', q, re.IGNORECASE)
    if m:
        place = m.group(1).lower()
        num = str(m.group(2))
        pos_map = {'ones': -1, 'tens': -2, 'hundreds': -3, 'thousands': -4}
        if place in pos_map:
            val = num[pos_map[place]]
            if val in opts: return opts.index(val)
    
    m = re.search(r'ratio.*?(\d+):(\d+).*?(\d+)\s+boys', q, re.IGNORECASE)
    if m:
        a, b, boys = int(m.group(1)), int(m.group(2)), int(m.group(3))
        val = str(int(boys * b / a))
        if val in opts: return opts.index(val)
    
    return None

# Fix all questions
fixed = 0
still_wrong = []

for row in conn.execute("""
    SELECT id, question, option_a, option_b, option_c, option_d, answer_index
    FROM questions WHERE is_active=1
"""):
    q = row[1]
    opts = [row[2], row[3], row[4], row[5]]
    ans_idx = row[6]
    
    correct_idx = find_correct_idx(q, opts)
    
    if correct_idx is not None:
        if correct_idx != ans_idx:
            conn.execute("UPDATE questions SET answer_index = ? WHERE id = ?", (correct_idx, row[0]))
            fixed += 1
        # After fix, verify it's now correct
        # Re-check: if we just fixed it, it should be right
    elif correct_idx is None:
        # Can't auto-fix, but check if current answer_idx looks plausible
        pass

conn.commit()
print(f"Fixed {fixed} wrong answer_index values")

# Now verify: re-check ALL questions
remaining = 0
for row in conn.execute("""
    SELECT id, question, option_a, option_b, option_c, option_d, answer_index
    FROM questions WHERE is_active=1
"""):
    q = row[1]
    opts = [row[2], row[3], row[4], row[5]]
    ans_idx = row[6]
    
    correct_idx = find_correct_idx(q, opts)
    if correct_idx is not None and correct_idx != ans_idx:
        remaining += 1
        if remaining <= 5:
            print(f"  STILL WRONG: id={row[0]}: {q[:60]}, answer_index={ans_idx}, correct={correct_idx}")

print(f"\nRemaining wrong answer_index: {remaining}")

total = conn.execute("SELECT COUNT(*) FROM questions WHERE is_active=1").fetchone()[0]
print(f"Total questions: {total}")
conn.close()
print("\nDone.")