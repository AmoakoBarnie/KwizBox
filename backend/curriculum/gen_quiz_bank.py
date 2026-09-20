import json, re, os, random

random.seed(42)

with open('output/indicators_deduped.json') as f:
    subjects = json.load(f)

def make_question(subj_code, subj_name, indicator):
    iid = indicator['indicator_id']
    text = indicator['text']
    cs_id = indicator['cs_id']
    cs_text = indicator['cs_text']
    
    # Clean indicator text
    qtext = text.rstrip('.')
    if not qtext.endswith('?'):
        if 'describe' in qtext.lower() or 'explain' in qtext.lower() or 'discuss' in qtext.lower():
            qtext = qtext.replace('Demonstrate ', '').replace('Show ', '').replace('Identify ', '').replace('Describe ', '').replace('Explain ', '').replace('Discuss ', '').replace('Recognise ', '').replace('State ', '').replace('List ', '').replace('Classify ', '').replace('Categorise ', '').replace('Observe ', '').replace('Examine ', '').replace('Demonstrate understanding of ', '').replace('Demonstrate ability to ', '').replace('Demonstrate skills in ', '').replace('Demonstrate competence in ', '').replace('Demonstrate knowledge ', '').strip()
            qtext = qtext[0].upper() + qtext[1:] + "?"
    
    # Options pool
    opts = [
        "This describes a different indicator in the curriculum.",
        "This refers to a concept not covered by this indicator.",
        "This describes a skill from another strand/subject.",
        "This relates to a different content standard.",
        "This option is not correct according to the NaCCA curriculum.",
        "This describes an unrelated learning outcome.",
        "This is not the correct answer for this indicator.",
        "This refers to a different topic in the standards.",
    ]
    
    correct = qtext[:80]
    wrongs = [o for o in opts if o not in correct][:3]
    
    # Ensure we have 4 options
    while len(wrongs) < 3:
        wrongs.append(f"This relates to a different topic in the NaCCA curriculum for {subj_name}.")
    
    random.shuffle(wrongs)
    options = [correct] + wrongs[:3]
    random.shuffle(options)
    correct_idx = options.index(correct)
    
    return {
        'id': f"{subj_code}-{iid}",
        'subject': subj_name,
        'subject_code': subj_code,
        'class_level': cs_id.split('.')[0] if '.' in cs_id else 'B4',
        'strand': '',
        'sub_strand': '',
        'cs_id': cs_id,
        'indicator_id': iid,
        'question': qtext,
        'options': options,
        'answer_index': correct_idx,
        'explanation': f"Based on NaCCA curriculum indicator {iid} under content standard {cs_id}."
    }

all_questions = []
for subj in subjects:
    code = subj['code']
    name = subj['name']
    for ind in subj['indicators']:
        q = make_question(code, name, ind)
        all_questions.append(q)

print(f"Generated {len(all_questions)} questions across {len(subjects)} subjects")

# Group by subject
by_subject = {}
for q in all_questions:
    s = q['subject']
    if s not in by_subject:
        by_subject[s] = []
    by_subject[s].append(q)

for subj, qs in sorted(by_subject.items()):
    print(f"  {subj}: {len(qs)} questions")

with open('output/quiz_bank_full.json', 'w') as f:
    json.dump(all_questions, f, indent=2, ensure_ascii=False)
print(f"\nSaved {len(all_questions)} questions to output/quiz_bank_full.json")
