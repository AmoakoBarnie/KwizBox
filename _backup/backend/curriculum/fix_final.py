import json, re

with open('output/quiz_bank_vetted.json') as f:
    bank = json.load(f)

# Load manifest for text lookup
with open('output/nacca_manifest.json') as f:
    manifest = json.load(f)

# Build text lookup: cs_id -> full CS text, indicator_id -> indicator text
cs_texts = {}
ind_texts = {}
for subj in manifest['subjects']:
    for lvl in subj.get('levels', []):
        for strand in lvl.get('strands', []):
            for ss in strand.get('sub_strands', []):
                for cs in ss.get('content_standards', []):
                    cs_id = cs.get('id', '')
                    cs_text = cs.get('text', '')
                    if cs_id:
                        cs_texts[cs_id] = cs_text
                    for ind in cs.get('indicators', []):
                        iid = ind.get('indicator_id', '')
                        text = ind.get('text', '')
                        if iid:
                            ind_texts[iid] = text

def clean_question(qt):
    """Aggressively clean a question string."""
    if not qt:
        return ''
    # Remove leading dot/bullet
    qt = re.sub(r'^[\s\.•\-–—]+', '', qt)
    # Remove ID prefix at start (B7.1.3.1.1, B6.4.1.2.1, etc.)
    qt = re.sub(r'^[A-Z]\d+\.\d+\.\d+\.\d+\.\d+\s+', '', qt)
    qt = re.sub(r'^[A-Z]\d+\.\d+\.\d+\.\d+\s+', '', qt)
    qt = re.sub(r'^[A-Z]\d+\.\d+\.\d+\s+', '', qt)
    qt = re.sub(r'^\d+\.\s+', '', qt)
    # Remove any remaining leading non-alphabetic chars
    qt = re.sub(r'^[^A-Za-z\u0600-\u06FF\u00C0-\u00FF\u00E0-\u00FF\s]+', '', qt)
    # Strip trailing CC noise
    cc_patterns = [
        (r',\s*Communication\s+and\s+Collaboration\s*\([A-Z]{2}\)\s*$', ''),
        (r',\s*Critical\s+Thinking\s+and\s+Problem\s+Solving\s*\([A-Z]{2}\)\s*$', ''),
        (r',\s*Creativity\s+and\s+Innovation\s*\([A-Z]{2}\)\s*$', ''),
        (r',\s*Digital\s+Literacy\s*\([A-Z]{2}\)\s*$', ''),
        (r',\s*Personal\s+Development\s+and\s+Leadership\s*\([A-Z]{2}\)\s*$', ''),
        (r',\s*Cultural\s+Identity\s+and\s+Global\s+Citizenship\s*\([A-Z]{2}\)\s*$', ''),
        (r'\s*[-–—]\s*(?:Communication\s+and\s+Collaboration|Critical\s+Thinking\s+and\s+Problem\s+Solving|Creativity\s+and\s+Innovation|Digital\s+Literacy|Personal\s+Development\s+and\s+Leadership|Cultural\s+Identity\s+and\s+Global\s+Citizenship|Skill\s+Development|leadership|Communication\s+and|Cultural\s+identity\s+and\s+global\s+citizenship|Personal\s+development\s+and|Digital\s+literacy|Creativity\s+and\s+innovation|Skill\s+development)\s*[,\s.\-]*\s*$', ''),
        (r'\s+Communication\s+and\s+Collaboration\s*\([A-Z]{2}\)\s*$', ''),
        (r'\s*Critical\s+Thinking\s+and\s+Problem\s+Solving\s*\([A-Z]{2}\)\s*$', ''),
        (r'\s*Creativity\s+and\s+Innovation\s*\([A-Z]{2}\)\s*$', ''),
        (r'\s*Digital\s+Literacy\s*\([A-Z]{2}\)\s*$', ''),
        (r'\s*Personal\s+Development\s+and\s+Leadership\s*\([A-Z]{2}\)\s*$', ''),
        (r'\s*Cultural\s+Identity\s+and\s+Global\s+Citizenship\s*\([A-Z]{2}\)\s*$', ''),
        (r'\s+Communication\s+and\s+Collaboration\s*$', ''),
        (r'\s*Critical\s+Thinking\s+and\s+Problem\s+Solving\s*$', ''),
        (r'\s*Creativity\s+and\s+Innovation\s*$', ''),
        (r'\s*Digital\s+Literacy\s*$', ''),
        (r'\s*Personal\s+Development\s+and\s+Leadership\s*$', ''),
        (r'\s*Cultural\s+Identity\s+and\s+Global\s+Citizenship\s*$', ''),
        (r'\s+Communication\s+and\s*$', ''),
        (r'\s*Critical\s+Thinking\s+and\s*$', ''),
        (r'\s*Creativity\s+and\s*$', ''),
        (r'\s*Digital\s+Literacy\s*$', ''),
        (r'\s*Personal\s+Development\s+and\s*$', ''),
        (r'\s*Cultural\s+Identity\s+and\s*$', ''),
    ]
    for pat, repl in cc_patterns:
        qt = re.sub(pat, repl, qt, flags=re.IGNORECASE)
    
    # Remove CC codes mid-sentence (CC8.2:, CP5.6:, CG5.3:, etc.) and everything after
    qt = re.sub(r',\s*CC\d+\.\d+:\s*.*$', '', qt)
    qt = re.sub(r',\s*CP\d+\.\d+:\s*.*$', '', qt)
    qt = re.sub(r',\s*CG\d+\.\d+:\s*.*$', '', qt)
    qt = re.sub(r',\s*DL\d+\.\d+:\s*.*$', '', qt)
    qt = re.sub(r',\s*CI\d+\.\d+:\s*.*$', '', qt)
    qt = re.sub(r'\s+CC\d+\.\d+\s*$', '', qt)
    qt = re.sub(r'\s+CP\d+\.\d+\s*$', '', qt)
    qt = re.sub(r'\s+CG\d+\.\d+\s*$', '', qt)
    qt = re.sub(r'\s+DL\d+\.\d+\s*$', '', qt)
    qt = re.sub(r'\s+CI\d+\.\d+\s*$', '', qt)
    
    # Remove "CC8.2: Explain" pattern anywhere
    qt = re.sub(r'\s+CC\d+\.\d+:\s*\w+.*$', '', qt)
    qt = re.sub(r'\s+CP\d+\.\d+:\s*\w+.*$', '', qt)
    qt = re.sub(r'\s+CG\d+\.\d+:\s*\w+.*$', '', qt)
    qt = re.sub(r'\s+DL\d+\.\d+:\s*\w+.*$', '', qt)
    qt = re.sub(r'\s+CI\d+\.\d+:\s*\w+.*$', '', qt)
    
    # Collapse whitespace
    qt = re.sub(r'\s{2,}', ' ', qt)
    qt = qt.strip()
    
    if not qt:
        return ''
    
    # Ensure ends with ?
    if not qt.endswith('?'):
        qt += '?'
    
    # Capitalize first letter
    if qt:
        qt = qt[0].upper() + qt[1:]
    
    return qt

# Fix all questions
changed = 0
for i, q in enumerate(bank):
    old = q['question']
    cleaned = clean_question(old)
    
    if cleaned and cleaned != old and len(cleaned.strip()) > 5:
        q['question'] = cleaned
        q['options'][q['answer_index']] = cleaned
        changed += 1

print(f"Changed: {changed} questions")

# Rebuild distractors for all
import random
random.seed(42)

POOLS = {
    'Science': ["This describes a property of solids, not the material in question.","This refers to a Physics concept, not the relevant Science strand.","This describes a process in plants, not animals.","This is a characteristic of non-living things.","This refers to a different topic in the Science curriculum.","This describes an energy form, not a material property.","This relates to the water cycle, not this topic.","This describes forces, not materials or their properties."],
    'Mathematics': ["This describes a skill from a different Mathematics strand.","This refers to a concept not covered in this topic.","This describes a fractions process, not the current topic.","This is a step in a different calculation method.","This relates to a different class level in Mathematics.","This describes a geometry skill, not a number operation.","This is the inverse of the correct procedure.","This uses the wrong operation for the problem."],
    'French': ["Ceci décrit une compétence d'une autre branche du programme.","Cela ne correspond pas à l'indicateur évalué ici.","Cette réponse concerne une activité différente en français.","Cette option ne correspond pas au texte de l'indicateur.","Cette affirmation porte sur une autre compétence langagière.","Cette réponse n'est pas celle du document NaCCA.","Ceci concerne une autre année d'études.","Cette option ne reflète pas l'apprentissage visé."],
    'Physical Education': ["This describes a different motor skill, not the one assessed.","This is a skill performed with a different body part.","This refers to a game played with hands, not feet.","This describes a static balance, not a dynamic movement.","This is a fitness component, not a motor skill.","This relates to a different equipment type.","This describes a movement at a different speed or level.","This is a skill from a different PE strand."],
    'Computing': ["This describes a feature in a different Office application.","This refers to a database concept, not the current spreadsheet task.","This describes a step in a different software workflow.","This relates to internet safety, not the current computing skill.","This is a function from a different menu or tab.","This describes hardware, not the software skill assessed.","This relates to a different version of the application.","This is a concept from ICT, not the specific tool used."],
    'Ghanaian Language': ["This describes a punctuation mark used in a different context.","This refers to a writing form not covered by this indicator.","This describes a reading skill from a different class level.","This relates to a different language skill (speaking vs. writing).","This is a grammar rule from a different language topic.","This describes an essay type, not the one assessed.","This refers to a comprehension skill from another text type.","This is about a different aspect of the language."],
    'History': ["This describes an event from a different period in Ghanaian history.","This refers to a person not connected to this topic.","This describes a conflict between different groups.","This relates to a different region of Ghana.","This is a factor in a different historical process.","This describes an item traded in a different period.","It relates to a different source type.","This describes a consequence of a different event."],
    'Arabic': ["هذا يصف مهارة مختلفة في منهج اللغة العربية.","هذا لا يتوافق مع المؤشر المقيم في هذا السؤال.","هذا الخيار لا يتوافق مع نص المؤشر.","هذا يصف نشاطًا مختلفًا في درس اللغة العربية.","هذه الإجابة لا تتوافق مع منهج ناكا للغة العربية.","هذا يتعلق بمستوى دراسي مختلف عن المستوى المستهدف.","هذا يصف قواعد مختلفة غير القواعد المقيمة.","هذا ليس الوصف الصحيح للمؤشر التعليمي المطلوب."],
    'Our World and Our People': ["This describes a different civic responsibility.","This refers to a different level of citizenship education.","This is a concept from a different subject.","This relates to environmental management, not this topic.","This describes a safety rule from a different context.","This is a principle of governance, not civic participation.","This relates to a different community obligation.","This describes an individual action, not a collective one."],
    'Religious and Moral Education': ["This describes a teaching from a different religious tradition.","This refers to a moral lesson from a different story.","This is a concept from a different RME topic.","This describes a practice, not the belief assessed.","This relates to a different aspect of character formation.","This is a lesson from a non-religious context.","This describes a different quality of God.","This relates to a different stage in a leader's life."],
    'English': ["This describes a different grammar rule.","This refers to a punctuation mark used in a different context.","This is a writing form from a different class level.","This relates to a different strand of the English curriculum.","This describes a reading skill, not the writing skill assessed.","This is a literary device from a different genre.","This describes a different type of sentence or clause.","This refers to a comprehension skill from another text type."],
}

for q in bank:
    correct = q['options'][q['answer_index']]
    pool = POOLS.get(q['subject'], [
        "This describes a different indicator in the curriculum.",
        "This refers to a concept not covered by this indicator.",
        "This describes a skill from another strand/subject."
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
    if not q.get('explanation'):
        q['explanation'] = f"Indicator {q['indicator_id']} under CS {q['cs_id']} ({q['subject']}, Level {q['class_level']})."

# Final scan for remaining issues
issues = 0
for i, q in enumerate(bank):
    qt = q['question']
    if re.match(r'^[\s\.•\-–—]+', qt):
        issues += 1
        print(f"STILL LEADING CHARS #{i+1}: {qt[:100]}")
    if re.search(r'^[A-Z]\d+\.\d+', qt):
        issues += 1
        print(f"STILL ID PREFIX #{i+1}: {qt[:100]}")
    if re.search(r'(?:Communication\s+and\s+Collaboration|Critical\s+Thinking\s+and\s+Problem\s+Solving|Creativity\s+and\s+Innovation|Digital\s+Literacy|Personal\s+Development\s+and\s+Leadership|Cultural\s+Identity\s+and\s+Global\s+Citizenship|leadership|Communication\s+and|Cultural\s+identity\s+and\s+global\s+citizenship|Personal\s+development\s+and|Digital\s+literacy|Creativity\s+and\s+innovation|Skill\s+development)\s*[,\-.\s]*\s*$', qt, re.IGNORECASE):
        issues += 1
        print(f"STILL CC TAIL #{i+1}: {qt[:100]}")
    if re.search(r'CC\d+\.\d+|CP\d+\.\d+|CG\d+\.\d+|DL\d+\.\d+|CI\d+\.\d+', qt):
        issues += 1
        print(f"STILL CC CODE #{i+1}: {qt[:100]}")
    if len(qt.rstrip('?').strip()) < 15:
        issues += 1
        print(f"STILL SHORT #{i+1}: {qt[:100]}")

print(f"\nRemaining issues: {issues}")

if issues == 0:
    print("✅ ALL 580 QUESTIONS CLEAN!")

with open('output/quiz_bank_vetted.json', 'w') as f:
    json.dump(bank, f, indent=2, ensure_ascii=False)

import os
print(f"\nFile: quiz_bank_vetted.json ({os.path.getsize('output/quiz_bank_vetted.json'):,} bytes)")
print(f"Total questions: {len(bank)}")

# Coverage summary
from collections import Counter
by_subj = Counter(q['subject'] for q in bank)
print("\nQuestions by subject:")
for subj, cnt in by_subj.most_common():
    print(f"  {subj:30s}: {cnt}")
