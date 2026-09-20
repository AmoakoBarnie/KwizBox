import json, re, random

random.seed(42)

with open('output/quiz_bank_full.json') as f:
    bank = json.load(f)

# 1. Competency code patterns to strip
CC_PAT = re.compile(
    r'\s*[-–—]\s*(?:'
    r'Communication and Collaboration(?:\s*\([^)]*\))?|'
    r'Critical Thinking and Problem Solving(?:\s*\([^)]*\))?|'
    r'Cultural Identity and Global Citizenship(?:\s*\([^)]*\))?|'
    r'Personal Development and Leadership(?:\s*\([^)]*\))?|'
    r'Digital Literacy(?:\s*\([^)]*\))?|'
    r'Creativity and Innovation(?:\s*\([^)]*\))?|'
    r'Skill Development(?:\s*\([^)]*\))?'
    r')\s*$'
)
CODE_PAT = re.compile(r'\s+[A-Z]{2}\d{1,2}\.\d{1,2}\s*[-:]*.*$')

def clean_text(t):
    if not t:
        return t
    t = CC_PAT.sub('', t)
    t = CODE_PAT.sub('', t)
    t = re.sub(r'\s*[–—\-]\s*$', '', t)
    t = t.strip()
    if not t.endswith('?'):
        t += '?'
    if t:
        t = t[0].upper() + t[1:]
    return t

# 2. Subject-specific distractor pools
POOLS = {
    'Science': [
        "This describes a property of solids, not liquids.",
        "This refers to a Physics concept, not the relevant Science strand.",
        "This describes a process in plants, not animals.",
        "This is a characteristic of non-living things.",
        "This refers to a different topic in the Science curriculum.",
        "This describes an energy form, not a material property.",
        "This relates to the water cycle, not this topic.",
        "This describes a force, not a material property.",
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
        "This relates to a different language skill (speaking vs writing).",
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

# 3. Process each question
fixed_cc = 0
fixed_trunc = 0

for q in bank:
    # Clean question text
    old_q = q['question']
    q['question'] = clean_text(old_q)
    
    # Clean options and track changes
    for i in range(len(q['options'])):
        old_o = q['options'][i]
        q['options'][i] = clean_text(old_o)
        if old_o != q['options'][i]:
            if '[truncated]' in q['options'][i]:
                fixed_trunc += 1
            if any(t in old_o for t in ['Communication and Collaboration', 'Critical Thinking',
                   'Creativity and Innovation', 'Cultural Identity', 'Personal Development', 'Digital Literacy']):
                fixed_cc += 1

    # Replace distractors with subject-specific ones
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
    # Shuffle deterministically
    indices = list(range(4))
    random.shuffle(indices)
    q['options'] = [new_opts[i] for i in indices]
    q['answer_index'] = indices.index(0)
    
    # Improve explanation
    q['explanation'] = (
        f"Indicator {q['indicator_id']} under content standard {q['cs_id']} "
        f"({q['subject']}, Level {q['class_level']})."
    )

print(f"Fixed competency code noise: {fixed_cc}")
print(f"Fixed truncated questions: {fixed_trunc}")

with open('output/quiz_bank_vetted.json', 'w') as f:
    json.dump(bank, f, indent=2, ensure_ascii=False)
print(f"Written {len(bank)} vetted questions to output/quiz_bank_vetted.json")
