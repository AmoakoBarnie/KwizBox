import json, re

bank = json.load(open('output/quiz_bank_vetted.json'))
indicators = json.load(open('output/indicators_clean.json'))

# Build lookup: indicator_id -> full clean text
ind_lookup = {}
for subj in indicators:
    for ind in subj['indicators']:
        iid = ind['indicator_id']
        if iid:
            ind_lookup[iid] = ind['text']

fixed = 0
flagged = []

# Truncated questions to fix by lookup
TRUNC_KEYS = [
    ('English', 'Words, phrases, and clauses to clarify the?'),
    ('Computing', 'Solutions for the health related problems in leadership?'),
    ('Ghanaian Language', 'How to write for or against a motion in an?'),
    ('Ghanaian Language', 'Past tense action words in sentences?'),
    ('Ghanaian Language', 'Of comparative and superlative words/adjectives forms in sentences?'),
    ('Ghanaian Language', 'Importance and some moral lessons of the songs and the?'),
    ('Ghanaian Language', 'Explore or say some towns and villages in Ghana?'),
    ('Ghanaian Language', 'Recognise and say consonant clusters in passages?'),
    ('Ghanaian Language', 'Write a descriptive composition on a certain process?'),
    ('Ghanaian Language', 'Different types of adverbs in sentences?'),
    ('History', 'Factors that led to decline of the?'),
    ('Physical Education', 'Composition using fat and fat free body mass. Literacy: As learners observe the?'),
    ('Physical Education', 'Distinguish between volleying and kicking and describe the?'),
    ('Physical Education', 'Time necessary to prepare for and begin a concepts, principles, strategies, etc., as the?'),
    ('Physical Education', 'Role that weight bearing activities play in bone?'),
    ('Mathematics', 'Relationships between the diameter and the?'),
    ('Mathematics', 'Organise data (grouped/ungrouped) present it in frequency?'),
]

# Also fix French questions that look truncated but are actually complete
# These just need the CC noise stripped
FRENCH_FIX = [
    ('French', 'Lire et comprendre un texte simple sur les goûts et des préférences des personnes?'),
    ('French', 'Jouer aux jeux avec des chiffres?'),
    ('French', 'Écrire, dessiner et colorier des objets de la maison?'),
    ('French', 'Poser et répondre à des questions sur ce que l\'on fait avec les objets de la classe - Personal development and?'),
    ('French', 'Lire et comprendre des textes simples accompagnés d\'images sur les objets de?'),
]

for q in bank:
    qtext = q['question']
    
    # Try indicator lookup first
    iid = q['indicator_id']
    if iid in ind_lookup:
        orig_text = ind_lookup[iid]
        # Clean it
        from vet_questions import clean_text
        cleaned = clean_text(orig_text)
        # Only replace if current is truncated/problematic
        if len(qtext.rstrip('?').strip()) < 40 or '[NEEDS REVIEW]' in qtext:
            if cleaned and len(cleaned.rstrip('?').strip()) > len(qtext.rstrip('?').strip()):
                q['question'] = cleaned
                q['options'][q['answer_index']] = cleaned
                fixed += 1
    
    # Fix French CC noise manually
    if q['subject'] == 'French':
        qt = q['question']
        qt = re.sub(r'\s*[-–—]\s*(?:Digital literacy|Personal development and[^?]*|Creative[^?]*|Skill development|leadership|communication and[^?]*|collaboration[^?]*)\s*$', '', qt, flags=re.IGNORECASE)
        qt = qt.strip().rstrip('?') + '?'
        if qt[0].islower():
            qt = qt[0].upper() + qt[1:]
        if qt != q['question']:
            q['question'] = qt
            q['options'][q['answer_index']] = qt
            fixed += 1

print(f"Fixed/replaced: {fixed}")

# Rebuild distractors
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
    pool = POOLS.get(q['subject'], ["This describes a different indicator in the curriculum.","This refers to a concept not covered by this indicator.","This describes a skill from another strand/subject."])
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

# Final count
trunc_final = 0
for q in bank:
    qt = q['question']
    # Real truncation patterns
    if re.search(r'(?:the|d\'|l\'|q\'|n\'|m\'|s\'|un|une|le|la|les|des|dans|avec|sur|pour|par|en|leur|ses|son|notre|votre|leurs)\s*\?$', qt):
        trunc_final += 1
    if '[NEEDS REVIEW]' in qt:
        trunc_final += 1

print(f"Remaining truncated: {trunc_final}")
print(f"Total questions: {len(bank)}")

with open('output/quiz_bank_vetted.json', 'w') as f:
    json.dump(bank, f, indent=2, ensure_ascii=False)
print("Saved.")
