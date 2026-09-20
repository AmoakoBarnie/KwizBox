import json
from collections import Counter

with open('output/nacca_manifest.json') as f:
    manifest = json.load(f)
with open('output/quiz_bank_vetted.json') as f:
    bank = json.load(f)

manifest_cs_ids = set()
manifest_topics = {}
for subj in manifest['subjects']:
    code = subj['code']
    for level in subj.get('levels', []):
        for strand in level.get('strands', []):
            for ss in strand.get('sub_strands', []):
                for cs in ss.get('content_standards', []):
                    cs_id = cs.get('id', '')
                    if cs_id:
                        manifest_cs_ids.add(cs_id)
                        manifest_topics[cs_id] = {
                            'subject': code,
                            'level': level.get('code', ''),
                            'strand': strand.get('name', ''),
                            'sub_strand': ss.get('name', ''),
                            'cs_text': cs.get('text', '')[:100]
                        }

print(f"Manifest CS IDs: {len(manifest_cs_ids)}")
print(f"Questions in bank: {len(bank)}")
question_cs_ids = set(q['cs_id'] for q in bank)
print(f"Unique CS IDs in questions: {len(question_cs_ids)}")
covered = manifest_cs_ids & question_cs_ids
uncovered = manifest_cs_ids - question_cs_ids
print(f"Covered: {len(covered)}, Uncovered: {len(uncovered)}")
print()

print("=== COVERAGE BY SUBJECT ===")
for subj in manifest['subjects']:
    code = subj['code']
    name = subj['name']
    sub_cs = set()
    for level in subj.get('levels', []):
        for strand in level.get('strands', []):
            for ss in strand.get('sub_strands', []):
                for cs in ss.get('content_standards', []):
                    if cs.get('id'):
                        sub_cs.add(cs['id'])
    sub_qs = [q for q in bank if q['subject'] == name]
    sub_covered = sub_cs & set(q['cs_id'] for q in sub_qs)
    pct = 100*len(sub_covered)/max(len(sub_cs),1)
    print(f"{name:30s} ({code}): {len(sub_qs):3d} Q, {len(sub_cs):3d} CS, {len(sub_covered):3d} covered ({pct:.0f}%)")

print()
print("=== UNCOVERED TOPICS (first 20) ===")
for cs_id in sorted(list(uncovered))[:20]:
    info = manifest_topics.get(cs_id, {})
    print(f"  [{info.get('subject','?')}] L{info.get('level','?')} | {info.get('strand','?')} > {info.get('sub_strand','?')} | {cs_id}")
    print(f"    {info.get('cs_text','')[:100]}")
