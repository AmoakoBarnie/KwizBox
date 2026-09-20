import json, re, os
from collections import Counter

with open('output/nacca_manifest.json') as f:
    manifest = json.load(f)
with open('output/quiz_bank_vetted.json') as f:
    bank = json.load(f)

# ── COUNTS ──
print(f"Total questions: {len(bank)}")
print(f"Manifest subjects: {len(manifest['subjects'])}")
print()

# ── SUBJECT COVERAGE ──
print("=== SUBJECT COVERAGE ===")
manifest_codes = set()
for s in manifest['subjects']:
    manifest_codes.add(s['code'])

bank_codes = set()
for q in bank:
    bank_codes.add(q.get('subject_code', q['subject'].lower().replace(' ', '_')))

print(f"Manifest subjects: {sorted(manifest_codes)}")
print(f"Bank subjects: {sorted(bank_codes)}")
print(f"Missing from bank: {sorted(manifest_codes - bank_codes)}")
print()

# ── CS ID COVERAGE ──
manifest_cs = {}
for s in manifest['subjects']:
    code = s['code']
    manifest_cs[code] = set()
    for lvl in s.get('levels', []):
        for strand in lvl.get('strands', []):
            for ss in strand.get('sub_strands', []):
                for cs in ss.get('content_standards', []):
                    if cs.get('id'):
                        manifest_cs[code].add(cs['id'])

bank_cs = {}
for q in bank:
    sc = q.get('subject_code', q['subject'].lower().replace(' ', '_'))
    if sc not in bank_cs:
        bank_cs[sc] = set()
    if q.get('cs_id'):
        bank_cs[sc].add(q['cs_id'])

print("=== CS ID COVERAGE BY SUBJECT ===")
for code in sorted(manifest_codes):
    mc = len(manifest_cs.get(code, set()))
    bc = len(bank_cs.get(code, set()))
    covered = manifest_cs.get(code, set()) & bank_cs.get(code, set())
    pct = 100*len(covered)/max(mc,1)
    bar = 'OK ' if pct == 100 else ('LOW' if pct < 80 else 'MED')
    print(f"  {bar} {code:30s}: {mc:3d} CS, {bc:3d} Q, {len(covered):3d} CS covered ({pct:.0f}%)")

print()
print(f"Overall: {sum(len(bank_cs.get(c,set()) & manifest_cs.get(c,set())) for c in manifest_codes)}/{sum(len(manifest_cs.get(c,set())) for c in manifest_codes)} CS IDs covered ({100*sum(len(bank_cs.get(c,set()) & manifest_cs.get(c,set())) for c in manifest_codes)/max(sum(len(manifest_cs.get(c,set())) for c in manifest_codes),1):.0f}%)")
print()

# ── QUESTION COUNTS ──
by_subject = Counter(q['subject'] for q in bank)
print("=== QUESTIONS BY SUBJECT ===")
for subj, cnt in by_subject.most_common():
    print(f"  {subj:30s}: {cnt}")
print(f"  Total: {len(bank)}")
print()

# ── QUALITY CHECK ──
print("=== QUALITY CHECK ===")
issues = 0
for i, q in enumerate(bank):
    qt = q.get('question', '')
    # Check for CC noise
    if re.search(r'(?:Communication\s+and\s+Collaboration|Critical\s+Thinking\s+and\s+Problem\s+Solving|Creativity\s+and\s+Innovation|Digital\s+Literacy|Personal\s+Development\s+and\s+Leadership|Cultural\s+Identity\s+and\s+Global\s+Citizenship|leadership|Communication\s+and|Cultural\s+identity\s+and\s+global\s+citizenship|Personal\s+development\s+and|Digital\s+literacy|Creativity\s+and\s+innovation|Skill\s+development)\s*[,\-.\s]*\s*$', qt, re.IGNORECASE):
        issues += 1
        continue
    # Check for leading dot
    if re.match(r'^\.\s', qt):
        issues += 1
        continue
    # Check for ID prefix at start
    if re.match(r'^[A-Z]\d+\.\d+', qt):
        issues += 1
        continue
    # Check for CC code mid-sentence
    if re.search(r'CC\d+\.\d+|CP\d+\.\d+|CG\d+\.\d+', qt):
        issues += 1
        continue
    # Check too short
    if len(qt.rstrip('?').strip()) < 15:
        issues += 1
        continue

print(f"  Quality issues: {issues} / {len(bank)}")
print(f"  Clean: {len(bank) - issues} ({100*(len(bank)-issues)/len(bank):.1f}%)")
print()

# ── FILE INFO ──
print(f"File: quiz_bank_vetted.json ({os.path.getsize('output/quiz_bank_vetted.json'):,} bytes)")
