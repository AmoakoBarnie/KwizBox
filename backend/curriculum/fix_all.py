import json, re

with open('output/quiz_bank_vetted.json') as f:
    bank = json.load(f)

def clean_q(t):
    if not t:
        return ''
    # Remove leading dots/bullets
    t = re.sub(r'^[\s\.•\-–—]+', '', t)
    # Remove ID prefixes (B7.1.3.1.1, B6.4.1.2.1, etc.) at start
    t = re.sub(r'^[A-Z]\d+\.\d+\.\d+\.\d+\.\d+\s+', '', t)
    t = re.sub(r'^[A-Z]\d+\.\d+\.\d+\.\d+\s+', '', t)
    # Remove "X. " pattern (numbered prefix)
    t = re.sub(r'^\d+\.\s+', '', t)
    # Strip trailing CC noise
    t = re.sub(r',\s*Communication\s+and\s+Collaboration\s*\([A-Z]{2}\)\s*$', '', t, flags=re.IGNORECASE)
    t = re.sub(r',\s*Critical\s+Thinking\s+and\s+Problem\s+Solving\s*\([A-Z]{2}\)\s*$', '', t, flags=re.IGNORECASE)
    t = re.sub(r',\s*Creativity\s+and\s+Innovation\s*\([A-Z]{2}\)\s*$', '', t, flags=re.IGNORECASE)
    t = re.sub(r',\s*Digital\s+Literacy\s*\([A-Z]{2}\)\s*$', '', t, flags=re.IGNORECASE)
    t = re.sub(r',\s*Personal\s+Development\s+and\s+Leadership\s*\([A-Z]{2}\)\s*$', '', t, flags=re.IGNORECASE)
    t = re.sub(r',\s*Cultural\s+Identity\s+and\s+Global\s+Citizenship\s*\([A-Z]{2}\)\s*$', '', t, flags=re.IGNORECASE)
    t = re.sub(r'\s*[-–—]\s*(?:Communication\s+and\s+Collaboration|Critical\s+Thinking\s+and\s+Problem\s+Solving|Creativity\s+and\s+Innovation|Digital\s+Literacy|Personal\s+Development\s+and\s+Leadership|Cultural\s+Identity\s+and\s+Global\s+Citizenship|Skill\s+Development|leadership|Communication\s+and|Cultural\s+identity\s+and\s+global\s+citizenship|Personal\s+development\s+and|Digital\s+literacy|Creativity\s+and\s+innovation|Skill\s+development)\s*[,\s.\-]*\s*$', '', t, flags=re.IGNORECASE)
    t = re.sub(r'\s+Communication\s+and\s+Collaboration\s*\([A-Z]{2}\)\s*$', '', t, flags=re.IGNORECASE)
    t = re.sub(r'\s*Critical\s+Thinking\s+and\s+Problem\s+Solving\s*\([A-Z]{2}\)\s*$', '', t, flags=re.IGNORECASE)
    t = re.sub(r'\s*Creativity\s+and\s+Innovation\s*\([A-Z]{2}\)\s*$', '', t, flags=re.IGNORECASE)
    t = re.sub(r'\s*Digital\s+Literacy\s*\([A-Z]{2}\)\s*$', '', t, flags=re.IGNORECASE)
    t = re.sub(r'\s*Personal\s+Development\s+and\s+Leadership\s*\([A-Z]{2}\)\s*$', '', t, flags=re.IGNORECASE)
    t = re.sub(r'\s*Cultural\s+Identity\s+and\s+Global\s+Citizenship\s*\([A-Z]{2}\)\s*$', '', t, flags=re.IGNORECASE)
    t = re.sub(r'\s+Communication\s+and\s+Collaboration\s*$', '', t, flags=re.IGNORECASE)
    t = re.sub(r'\s*Critical\s+Thinking\s+and\s+Problem\s+Solving\s*$', '', t, flags=re.IGNORECASE)
    t = re.sub(r'\s*Creativity\s+and\s+Innovation\s*$', '', t, flags=re.IGNORECASE)
    t = re.sub(r'\s*Digital\s+Literacy\s*$', '', t, flags=re.IGNORECASE)
    t = re.sub(r'\s*Personal\s+Development\s+and\s+Leadership\s*$', '', t, flags=re.IGNORECASE)
    t = re.sub(r'\s*Cultural\s+Identity\s+and\s+Global\s+Citizenship\s*$', '', t, flags=re.IGNORECASE)
    t = re.sub(r'\s+Communication\s+and\s*$', '', t, flags=re.IGNORECASE)
    t = re.sub(r'\s*Critical\s+Thinking\s+and\s*$', '', t, flags=re.IGNORECASE)
    t = re.sub(r'\s*Creativity\s+and\s*$', '', t, flags=re.IGNORECASE)
    t = re.sub(r'\s*Digital\s+Literacy\s*$', '', t, flags=re.IGNORECASE)
    t = re.sub(r'\s*Personal\s+Development\s+and\s*$', '', t, flags=re.IGNORECASE)
    t = re.sub(r'\s*Cultural\s+Identity\s+and\s*$', '', t, flags=re.IGNORECASE)
    # Remove CC codes mid-sentence
    t = re.sub(r',?\s+CC\d+\.\d+:\s*.*$', '', t)
    t = re.sub(r',?\s+CP\d+\.\d+:\s*.*$', '', t)
    t = re.sub(r',?\s+CG\d+\.\d+:\s*.*$', '', t)
    t = re.sub(r',?\s*\(CC\d+\.\d+\)\s*.*$', '', t, flags=re.IGNORECASE)
    t = re.sub(r',?\s*\(CP\d+\.\d+\)\s*.*$', '', t, flags=re.IGNORECASE)
    t = re.sub(r',?\s*\(CG\d+\.\d+\)\s*.*$', '', t, flags=re.IGNORECASE)
    # Remove any remaining competency code fragments
    t = re.sub(r'\s+CC\d+\.\d+\s*$', '', t)
    t = re.sub(r'\s+CP\d+\.\d+\s*$', '', t)
    t = re.sub(r'\s+CG\d+\.\d+\s*$', '', t)
    t = re.sub(r'\s+DL\d+\.\d+\s*$', '', t)
    # Collapse whitespace
    t = re.sub(r'\s{2,}', ' ', t)
    t = t.strip()
    if not t:
        return ''
    if not t.endswith('?'):
        t += '?'
    if t:
        t = t[0].upper() + t[1:]
    return t

updated = 0
for i, q in enumerate(bank):
    old = q['question']
    cleaned = clean_q(old)
    if cleaned and cleaned != old and len(cleaned) > 5:
        q['question'] = cleaned
        q['options'][q['answer_index']] = cleaned
        updated += 1

print(f"Updated: {updated} questions")

# Show before/after for sample
print("\n=== SAMPLE FIXES ===")
count = 0
for i, q in enumerate(bank):
    if q['question'] != clean_q(q['question']) or count < 5:
        print(f"#{i+1} [{q['subject']}] {q['cs_id']}")
        print(f"  Q: {q['question'][:120]}")
        count += 1
        if count > 10:
            break

# Final scan for remaining issues
issues = []
for i, q in enumerate(bank):
    qt = q['question']
    # Still has leading dot
    if re.match(r'^\.\s', qt):
        issues.append(('DOT', i+1, q))
    # Still has ID prefix
    if re.match(r'^[A-Z]\d+\.\d+', qt):
        issues.append(('ID', i+1, q))
    # Still has CC noise at end
    if re.search(r'(?:Communication\s+and\s+Collaboration|Critical\s+Thinking\s+and\s+Problem\s+Solving|Creativity\s+and\s+Innovation|Digital\s+Literacy|Personal\s+Development\s+and\s+Leadership|Cultural\s+Identity\s+and\s+Global\s+Citizenship|leadership|Communication\s+and|Cultural\s+identity\s+and\s+global\s+citizenship|Personal\s+development\s+and|Digital\s+literacy|Creativity\s+and\s+innovation|Skill\s+development)\s*[,\-.\s]*\s*$', qt, re.IGNORECASE):
        issues.append(('CC', i+1, q))
    # Still has CC code mid-sentence
    if re.search(r'CC\d+\.\d+|CP\d+\.\d+|CG\d+\.\d+', qt):
        issues.append(('CODE', i+1, q))
    # Too short (< 15 chars)
    if len(qt.rstrip('?').strip()) < 15:
        issues.append(('SHORT', i+1, q))

print(f"\n=== REMAINING ISSUES: {len(issues)} ===")
for typ, idx, q in issues[:20]:
    print(f"  [{typ}] #{idx} [{q['subject']}] {q['cs_id']}: {q['question'][:120]}")

if not issues:
    print("✅ ALL CLEAN!")

# Save
with open('output/quiz_bank_vetted.json', 'w') as f:
    json.dump(bank, f, indent=2, ensure_ascii=False)

import os
print(f"\nFile: quiz_bank_vetted.json ({os.path.getsize('output/quiz_bank_vetted.json'):,} bytes)")
