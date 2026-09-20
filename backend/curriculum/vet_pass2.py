#!/usr/bin/env python3
"""Comprehensive vet + fix pass on quiz_bank_vetted.json.
Runs in stages so we can review between batches."""

import json, re, random, sys

random.seed(42)

BANK_PATH = 'output/quiz_bank_vetted.json'

with open(BANK_PATH) as f:
    bank = json.load(f)

print(f"Loaded {len(bank)} questions from {BANK_PATH}")
print(f"Subjects: {sorted(set(q['subject'] for q in bank))}")
print()

# ── STAGE 1: Identify ALL problems ──────────────────────────────────────────
problems = {'truncated': [], 'competency_noise': [], 'fragment': [],
            'duplicate_correct': [], 'bad_question': []}

for q in bank:
    qtext = q['question']
    correct = q['options'][q['answer_index']]
    
    # Truncated: ends mid-sentence (lowercase letter, no punctuation before ?)
    if re.search(r'[a-z]\s*\?$', qtext):
        problems['truncated'].append(q)
    
    # Competency noise still present
    if re.search(r'(?:Communication and Collaboration|Critical Thinking and Problem Solving|Cultural Identity and Global Citizenship|Personal Development and Leadership|Digital Literacy|Creativity and Innovation|Skill Development)\s*[\(?]', qtext):
        problems['competency_noise'].append(q)
    
    # Fragment: very short (< 10 chars before ?)
    if len(qtext.rstrip('?').strip()) < 15:
        problems['fragment'].append(q)
    
    # Correct option differs from question text (truncation in options)
    if correct != qtext and correct.rstrip('?') != qtext.rstrip('?'):
        problems['duplicate_correct'].append(q)
    
    # Bad question: still has "Leadership?" or "in?" dangling
    if re.search(r'\s+[a-z]\s*\?$', qtext) or re.search(r'[A-Z][a-z]\s*\?$', qtext):
        problems['bad_question'].append(q)

for k, v in problems.items():
    print(f"Problem category '{k}': {len(v)} questions")
print()

# ── STAGE 2: Fix Strategy ──────────────────────────────────────────────────
# For each problematic question, we need the ORIGINAL indicator text.
# Load the clean indicators and match by indicator_id.

with open('output/indicators_clean.json') as f:
    subjects = json.load(f)

ind_lookup = {}  # indicator_id -> full text
for subj in subjects:
    for ind in subj['indicators']:
        iid = ind['indicator_id']
        if iid and iid not in ind_lookup:
            ind_lookup[iid] = ind['text']

print(f"Indicator lookup: {len(ind_lookup)} entries")

# ── STAGE 3: Fix specific categories ───────────────────────────────────────

# Fix 1: Truncated questions — try to restore from indicator text
fixed_trunc = 0
for q in problems['truncated']:
    iid = q['indicator_id']
    if iid in ind_lookup:
        orig = ind_lookup[iid]
        # Clean the original
        from vet_questions import clean_text
        cleaned = clean_text(orig)
        if cleaned != q['question']:
            q['question'] = cleaned
            q['options'][q['answer_index']] = cleaned
            # Rebuild distractors
            fixed_trunc += 1

print(f"Fixed truncated (from indicator lookup): {fixed_trunc}")

# Fix 2: Competency noise — strip again more aggressively
fixed_cc2 = 0
strong_cc = re.compile(
    r'\s*[-–—]\s*(?:'
    r'(?:Communication|Critical|Cultural|Personal|Digital|Creativity|Skill)\s+'
    r'(?:and\s+)?(?:Collaboration|Thinking|Identity|Citizenship|Development|Leadership|Literacy|Innovation|Development)'
    r'(?:\s*\([^)]*\))?'
    r')\s*$'
)
for q in problems['competency_noise']:
    old = q['question']
    q['question'] = strong_cc.sub('', old).strip()
    if q['question'] and not q['question'].endswith('?'):
        q['question'] += '?'
    q['options'][q['answer_index']] = q['question']
    fixed_cc2 += 1
print(f"Fixed competency noise (aggressive): {fixed_cc2}")

# Fix 3: Fragments — try to prepend topic context from CS text
fixed_frag = 0
for q in problems['fragment']:
    cs_text = q.get('cs_text', '') or ''
    if cs_text and len(cs_text) > 10:
        # Use CS text as context
        q['question'] = cs_text.rstrip('.') + ' — ' + q['question']
        fixed_frag += 1
    else:
        # Flag for manual review
        q['question'] = q['question'].replace('?', ' [NEEDS REVIEW]?')
        fixed_frag += 1
print(f"Fixed fragments (used CS context): {fixed_frag}")

# Fix 4: Mismatched correct option
fixed_mismatch = 0
for q in problems['duplicate_correct']:
    q['options'][q['answer_index']] = q['question']
    fixed_mismatch += 1
print(f"Fixed mismatched correct options: {fixed_mismatch}")

# ── STAGE 4: Rebuild ALL distractors properly ──────────────────────────────

POOLS = {
    'Science': [
        "This describes a property of solids, not the material in question.",
        "This refers to a Physics concept, not the relevant Science strand.",
        "This describes a process in plants, not animals.",
        "This is a characteristic of non-living things.",
        "This refers to a different topic in the Science curriculum.",
        "This describes an energy form, not a material property.",
        "This relates to the water cycle, not this topic.",
        "This describes forces, not materials or their properties.",
    ],
    'Mathematics': [
        "This describes a skill from a different Mathematics strand.",
        "This refers to a concept not covered in this topic.",
        "This describes a fractions process, not the current topic.",
        "This is a step in a different calculation method.",
        "This relates to a different class level in Mathematics.",
        "This describes a geometry skill, not a number operation.",
        "This is the inverse of the correct procedure.",
        "This uses the wrong operation for the problem.",
    ],
    'French': [
        "Ceci décrit une compétence d'une autre branche du programme.",
        "Cela ne correspond pas à l'indicateur évalué ici.",
        "Cette réponse concerne une activité différente en français.",
        "Cette option ne correspond pas au texte de l'indicateur.",
        "Cette affirmation porte sur une autre compétence langagière.",
        "Cette réponse n'est pas celle du document NaCCA.",
        "Ceci concerne une autre année d'études.",
        "Cette option ne reflète pas l'apprentissage visé.",
    ],
    'Physical Education': [
        "This describes a different motor skill, not the one assessed.",
        "This is a skill performed with a different body part.",
        "This refers to a game played with hands, not feet.",
        "This describes a static balance, not a dynamic movement.",
        "This is a fitness component, not a motor skill.",
        "This relates to a different equipment type.",
        "This describes a movement at a different speed or level.",
        "This is a skill from a different PE strand.",
    ],
    'Computing': [
        "This describes a feature in a different Office application.",
        "This refers to a database concept, not the current spreadsheet task.",
        "This describes a step in a different software workflow.",
        "This relates to internet safety, not the current computing skill.",
        "This is a function from a different menu or tab.",
        "This describes hardware, not the software skill assessed.",
        "This relates to a different version of the application.",
        "This is a concept from ICT, not the specific tool used.",
    ],
    'Ghanaian Language': [
        "This describes a punctuation mark used in a different context.",
        "This refers to a writing form not covered by this indicator.",
        "This describes a reading skill from a different class level.",
        "This relates to a different language skill (speaking vs. writing).",
        "This is a grammar rule from a different language topic.",
        "This describes an essay type, not the one assessed.",
        "This refers to a comprehension skill from another text type.",
        "This is about a different aspect of the language.",
    ],
    'History': [
        "This describes an event from a different period in Ghanaian history.",
        "This refers to a person not connected to this topic.",
        "This describes a conflict between different groups.",
        "This relates to a different region of Ghana.",
        "This is a factor in a different historical process.",
        "This describes an item traded in a different period.",
        "It relates to a different source type.",
        "This describes a consequence of a different event.",
    ],
    'Arabic': [
        "هذا يصف مهارة مختلفة في منهج اللغة العربية.",
        "هذا لا يتوافق مع المؤشر المقيم في هذا السؤال.",
        "هذا الخيار لا يتوافق مع نص المؤشر.",
        "هذا يصف نشاطًا مختلفًا في درس اللغة العربية.",
        "هذه الإجابة لا تتوافق مع منهج ناكا للغة العربية.",
        "هذا يتعلق بمستوى دراسي مختلف عن المستوى المستهدف.",
        "هذا يصف قواعد مختلفة غير القواعد المقيمة.",
        "هذا ليس الوصف الصحيح للمؤشر التعليمي المطلوب.",
    ],
    'Our World and Our People': [
        "This describes a different civic responsibility.",
        "This refers to a different level of citizenship education.",
        "This is a concept from a different subject.",
        "This relates to environmental management, not this topic.",
        "This describes a safety rule from a different context.",
        "This is a principle of governance, not civic participation.",
        "This relates to a different community obligation.",
        "This describes an individual action, not a collective one.",
    ],
    'Religious and Moral Education': [
        "This describes a teaching from a different religious tradition.",
        "This refers to a moral lesson from a different story.",
        "This is a concept from a different RME topic.",
        "This describes a practice, not the belief assessed.",
        "This relates to a different aspect of character formation.",
        "This is a lesson from a non-religious context.",
        "This describes a different quality of God.",
        "This relates to a different stage in a leader's life.",
    ],
    'English': [
        "This describes a different grammar rule.",
        "This refers to a punctuation mark used in a different context.",
        "This is a writing form from a different class level.",
        "This relates to a different strand of the English curriculum.",
        "This describes a reading skill, not the writing skill assessed.",
        "This is a literary device from a different genre.",
        "This describes a different type of sentence or clause.",
        "This refers to a comprehension skill from another text type.",
    ],
}

for q in bank:
    correct = q['options'][q['answer_index']]
    pool = POOLS.get(q['subject'], [
        "This describes a different indicator in the curriculum.",
        "This refers to a concept not covered by this indicator.",
        "This describes a skill from another strand/subject.",
    ])
    distractors = []
    for d in pool:
        if d != correct and d not in distractors:
            distractors.append(d)
        if len(distractors) >= 3:
            break
    while len(distractors) < 3:
        distractors.append(f"This describes a different topic in the {q['subject']} curriculum.")
    new_opts = [correct] + distractors[:3]
    indices = list(range(4))
    random.shuffle(indices)
    q['options'] = [new_opts[i] for i in indices]
    q['answer_index'] = indices.index(0)
    q['explanation'] = f"Indicator {q['indicator_id']} under CS {q['cs_id']} ({q['subject']}, Level {q['class_level']})."

# ── STAGE 5: Re-scan to count remaining problems ───────────────────────────

remaining = {'truncated': 0, 'competency_noise': 0, 'fragment': 0,
             'bad_question': 0, 'flagged_review': 0}

for q in bank:
    qt = q['question']
    if re.search(r'[a-z]\s*\?$', qt):
        remaining['truncated'] += 1
    if re.search(r'(?:Communication|Critical|Cultural|Personal|Digital|Creativity|Skill)\s+(?:and\s+)?(?:Collaboration|Thinking|Identity|Citizenship|Development|Leadership|Literacy|Innovation|Development)', qt):
        remaining['competency_noise'] += 1
    if len(qt.rstrip('?').strip()) < 15:
        remaining['fragment'] += 1
    if '[NEEDS REVIEW]' in qt:
        remaining['flagged_review'] += 1

print()
print("=== AFTER FIX ===")
for k, v in remaining.items():
    print(f"  {k}: {v} remaining")
print(f"Total questions: {len(bank)}")

with open(BANK_PATH, 'w') as f:
    json.dump(bank, f, indent=2, ensure_ascii=False)
print(f"\nSaved back to {BANK_PATH}")
