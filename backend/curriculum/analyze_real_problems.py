import json, re

bank = json.load(open('output/quiz_bank_vetted.json'))

# Real truncation patterns - questions that genuinely cut off mid-thought
TRUNC_PATTERNS = [
    r'\s+the\s*\?$',           # "the?"
    r'\s+d\'\s*\?$',            # "d'?"
    r'\s+l\'\s*\?$',            # "l'?"
    r'\s+q\'\s*\?$',            # "q'?"
    r'\s+n\'\s*\?$',            # "n'?"
    r'\s+m\'\s*\?$',            # "m'?"
    r'\s+s\'\s*\?$',            # "s'?"
    r'\s+un\s*\?$',             # "un?"
    r'\s+une\s*\?$',            # "une?"
    r'\s+le\s*\?$',             # "le?"
    r'\s+la\s*\?$',             # "la?"
    r'\s+les\s*\?$',            # "les?"
    r'\s+des\s*\?$',            # "des?"
    r'\s+dans\s*\?$',           # "dans?"
    r'\s+avec\s*\?$',           # "avec?"
    r'\s+sur\s*\?$',            # "sur?"
    r'\s+pour\s*\?$',           # "pour?"
    r'\s+par\s*\?$',            # "par?"
    r'\s+en\s*\?$',             # "en?"
    r'\s+de\s+\w+\s*\?$',      # "de XXX?"
    r'\s+du\s*\?$',             # "du?"
    r'\s+des\s+\w+\s*\?$',     # "des XXX?"
    r'\s+leur\s*\?$',           # "leur?"
    r'\s+ses\s*\?$',            # "ses?"
    r'\s+son\s*\?$',            # "son?"
    r'\s+notre\s*\?$',          # "notre?"
    r'\s+votre\s*\?$',          # "votre?"
    r'\s+leurs\s*\?$',          # "leurs?"
    r'\.\.\.\s*\?$',            # "..."
    r'in\s+\w+\s*\?$',         # "in XXX?" (mid-thought)
]

# More specific competency noise
CC_NOISE = re.compile(
    r'\s*[-–—]\s*(?:'
    r'Digital literacy|'
    r'Personal development and[^?]*|'
    r'Creative[^?]*|'
    r'Skill development|'
    r'leadership|'
    r'communication and[^?]*|'
    r'collaboration[^?]*'
    r')\s*$', re.IGNORECASE
)

REAL_TRUNC = 0
CC_REMAINING = 0

for q in bank:
    qt = q['question']
    
    # Check for real truncation
    is_truncated = False
    for pat in TRUNC_PATTERNS:
        if re.search(pat, qt):
            is_truncated = True
            break
    
    if is_truncated:
        REAL_TRUNC += 1
    
    # Check for remaining CC noise
    if CC_NOISE.search(qt):
        CC_REMAINING += 1

print(f"Real truncated questions: {REAL_TRUNC}")
print(f"Questions with remaining CC noise: {CC_REMAINING}")
print()

# Show real truncated ones
print("=== Real truncated questions (first 20) ===")
count = 0
for q in bank:
    qt = q['question']
    for pat in TRUNC_PATTERNS:
        if re.search(pat, qt):
            print(f"  [{q['subject']}] L{q['class_level']} Ind:{q['indicator_id']}")
            print(f"  Q: {qt[:130]}")
            print()
            count += 1
            break
    if count >= 20:
        break

print(f"=== CC noise still present (first 15) ===")
count = 0
for q in bank:
    if CC_NOISE.search(q['question']):
        print(f"  [{q['subject']}] {q['question'][:130]}")
        count += 1
        if count >= 15:
            break
