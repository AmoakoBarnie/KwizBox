#!/usr/bin/env python3
"""Fix option prefixes and truncated question."""
import sqlite3, re, random

db = sqlite3.connect('/media/stephen/FILES/MyShit/ghana-stem-trivia/backend/trivia.db')
conn = db

# Check what's there
print("=== Checking option formats ===")
count_double = 0
count_single = 0
count_clean = 0
count_none = 0
for row in conn.execute("""
    SELECT id, option_a, option_b, option_c, option_d
    FROM questions WHERE is_active=1
"""):
    for col in ['option_a','option_b','option_c','option_d']:
        val = row[col]
        if val is None or val.strip() == '':
            count_none += 1
        elif re.match(r'^[A-D]\.\s[A-D]\.\s', val):
            count_double += 1
        elif re.match(r'^[A-D]\.\s', val):
            count_single += 1
        else:
            count_clean += 1

print(f"  Double-letter prefix (A. A. ): {count_double}")
print(f"  Single-letter prefix (A. 56) : {count_single}")
print(f"  Clean (no prefix)             : {count_clean}")
print(f"  Empty/None                    : {count_none}")

# Check sample values
print("\n=== Sample raw values ===")
for row in conn.execute("SELECT id, option_a, option_b FROM questions WHERE is_active=1 AND (option_a LIKE 'A. A.%' OR option_a LIKE 'A. %') LIMIT 5"):
    print(f"  id={row[0]}: a={repr(row[1])} b={repr(row[2])}")

conn.close()
print("\nDone checking.")