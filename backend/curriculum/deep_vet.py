import json, re

with open('output/quiz_bank_vetted.json') as f:
    bank = json.load(f)

with open('output/nacca_manifest.json') as f:
    manifest = json.load(f)

# Build comprehensive text lookup by indicator_id AND cs_id
all_texts = {}  # indicator_id -> full text
cs_texts = {}   # cs_id -> full text  

for subj in manifest['subjects']:
    for level in subj.get('levels', []):
        for strand in level.get('strands', []):
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
                            all_texts[iid] = text

print(f"CS texts: {len(cs_texts)}, Indicator texts: {len(all_texts)}")

def clean_cc(text):
    """Remove competency code noise aggressively"""
    text = re.sub(r',\s*Communication\s+and\s+Collaboration\s*\([A-Z]{2}\)\s*$', '', text, flags=re.IGNORECASE)
    text = re.sub(r',\s*Critical\s+Thinking\s+and\s+Problem\s+Solving\s*\([A-Z]{2}\)\s*$', '', text, flags=re.IGNORECASE)
    text = re.sub(r',\s*Creativity\s+and\s+Innovation\s*\([A-Z]{2}\)\s*$', '', text, flags=re.IGNORECASE)
    text = re.sub(r',\s*Digital\s+Literacy\s*\([A-Z]{2}\)\s*$', '', text, flags=re.IGNORECASE)
    text = re.sub(r',\s*Cultural\s+Identity\s+and\s+Global\s+Citizenship\s*\([A-Z]{2}\)\s*$', '', text, flags=re.IGNORECASE)
    text = re.sub(r',\s*Personal\s+Development\s+and\s+Leadership\s*\([A-Z]{2}\)\s*$', '', text, flags=re.IGNORECASE)
    text = re.sub(r',\s*Communication\s+and\s+Collaboration\s*$', '', text, flags=re.IGNORECASE)
    text = re.sub(r',\s*Critical\s+Thinking\s+and\s+Problem\s+Solving\s*$', '', text, flags=re.IGNORECASE)
    text = re.sub(r',\s*Creativity\s+and\s+Innovation\s*$', '', text, flags=re.IGNORECASE)
    text = re.sub(r',\s*Digital\s+Literacy\s*$', '', text, flags=re.IGNORECASE)
    text = re.sub(r',\s*Cultural\s+Identity\s+and\s+Global\s+Citizenship\s*$', '', text, flags=re.IGNORECASE)
    text = re.sub(r',\s*Personal\s+Development\s+and\s+Leadership\s*$', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\s*[-–—]\s*(?:Communication\s+and\s+Collaboration|Critical\s+Thinking\s+and\s+Problem\s+Solving|Creativity\s+and\s+Innovation|Digital\s+Literacy|Personal\s+Development\s+and\s+Leadership|Cultural\s+Identity\s+and\s+Global\s+Citizenship|Skill\s+Development|leadership|Communication\s+and\s+Collaboration\s*\([A-Z]{2}\)|Critical\s+Thinking\s+and\s+Problem\s+Solving\s*\([A-Z]{2}\)|Creativity\s+and\s+Innovation\s*\([A-Z]{2}\)|Digital\s+Literacy\s*\([A-Z]{2}\)|Personal\s+Development\s+and\s+Leadership\s*\([A-Z]{2}\)|Cultural\s+Identity\s+and\s+Global\s+Citizenship\s*\([A-Z]{2}\))[,\s.-]*\s*$', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\s+Communication\s+and\s+Collaboration\s*\([A-Z]{2}\)\s*$', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\s*Critical\s+Thinking\s+and\s+Problem\s+Solving\s*\([A-Z]{2}\)\s*$', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\s*Creativity\s+and\s+Innovation\s*\([A-Z]{2}\)\s*$', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\s*Digital\s+Literacy\s*\([A-Z]{2}\)\s*$', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\s*Personal\s+Development\s+and\s+Leadership\s*\([A-Z]{2}\)\s*$', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\s*Cultural\s+Identity\s+and\s+Global\s+Citizenship\s*\([A-Z]{2}\)\s*$', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\s+Communication\s+and\s+Collaboration\s*$', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\s*Critical\s+Thinking\s+and\s+Problem\s+Solving\s*$', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\s*Creativity\s+and\s+Innovation\s*$', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\s*Digital\s+Literacy\s*$', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\s*Personal\s+Development\s+and\s+Leadership\s*$', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\s*Cultural\s+Identity\s+and\s+Global\s+Citizenship\s*$', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\s+Communication\s+and\s*$', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\s*Critical\s+Thinking\s+and\s*$', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\s*Creativity\s+and\s*$', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\s*Digital\s+Literacy\s*$', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\s*Personal\s+Development\s+and\s*$', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\s*Cultural\s+Identity\s+and\s*$', '', text, flags=re.IGNORECASE)
    return text.strip()

def full_clean(text):
    """Full cleaning pipeline"""
    text = clean_cc(text)
    text = re.sub(r'\s+[A-Z]{2,3}\d{1,2}\.\d{1,2}\.\d{1,2}\.\d{1,2}\s*[-:]*\s*.*$', '', text)
    text = re.sub(r'\s{2,}', ' ', text)
    text = re.sub(r'^[\-•–—\s]+', '', text)
    text = text.strip()
    if text and not text.endswith('?'):
        text += '?'
    if text:
        text = text[0].upper() + text[1:]
    return text

# ── VET ALL QUESTIONS ──
print("\n=== VETTING ALL 548 QUESTIONS ===\n")
results = {'clean': 0, 'fixed_cc': 0, 'fixed_trunc': 0, 'fixed_short': 0, 'fixed_mismatch': 0, 'no_fix': 0}

for i, q in enumerate(bank):
    old_qt = q['question']
    old_correct = q['options'][q['answer_index']]
    iid = q['indicator_id']
    cs_id = q['cs_id']
    
    # Get best available full text
    best_text = None
    
    # Try indicator text first
    if iid in all_texts:
        best_text = all_texts[iid]
    
    # Try CS text as fallback
    if not best_text and cs_id in cs_texts:
        best_text = cs_texts[cs_id]
    
    cleaned_old = full_clean(old_qt)
    
    # Check if current question has CC noise
    has_cc = bool(re.search(r'(?:Communication\s+and\s+Collaboration|Critical\s+Thinking\s+and\s+Problem\s+Solving|Creativity\s+and\s+Innovation|Digital\s+Literacy|Personal\s+Development\s+and\s+Leadership|Cultural\s+Identity\s+and\s+Global\s+Citizenship|leadership|Communication\s+and|Cultural\s+identity\s+and\s+global\s+citizenship|Personal\s+development\s+and|Digital\s+literacy|Creativity\s+and\s+innovation|Skill\s+development|Skill\s+development)\s*[,.\-\\–—]*\s*$', old_qt, re.IGNORECASE))
    
    # Check if truncated (ends with preposition/article/determiner)
    trunc_pats = [
        r'\s+(?:the|and|or|of|in|on|at|to|for|with|by|from|as|d|x27|une|un|des|le|la|les|leur|son|ses|notre|votre|leurs|cette|du|aux|avec|sans|pour|sur|dans|en|par|chez|quand|comment|pourquoi|quel|quelle|quels|quelles|qui|quoi|etc|,|\))\s*\?$'
    ]
    is_truncated = False
    for pat in trunc_pats:
        if re.search(pat, cleaned_old):
            if not re.search(r'(?:quelqu|x27une|x27un|l|x27une|l|x27un|x27|c|x27|j|x27|t|x27|s|x27|n|x27|m|x27|qu|x27|d|x27accord)\w+\s*\?$', cleaned_old):
                is_truncated = True
                break
    
    # Check if too short
    is_short = len(cleaned_old.rstrip('?').strip()) < 25
    
    # Check mismatch between question and correct option
    is_mismatch = (cleaned_old != full_clean(old_correct))
    
    if has_cc or is_truncated or is_short or is_mismatch:
        # Try to fix using best available text
        new_qt = cleaned_old
        
        if best_text:
            cleaned_best = full_clean(best_text)
            # Only use if significantly better (longer or cleaner)
            if len(cleaned_best) > len(new_qt) + 5 or (not has_cc and len(cleaned_best) > len(new_qt)):
                new_qt = cleaned_best
        
        # Apply fixes
        new_qt = re.sub(r'\s*[,;:.]\s*\?', '?', new_qt)
        new_qt = re.sub(r'\s*\)\s*\?', '?', new_qt)
        new_qt = re.sub(r'\s+\?', '?', new_qt)
        new_qt = new_qt.strip()
        if new_qt and not new_qt.endswith('?'):
            new_qt += '?'
        if new_qt:
            new_qt = new_qt[0].upper() + new_qt[1:]
        
        if new_qt != old_qt:
            q['question'] = new_qt
            q['options'][q['answer_index']] = new_qt
            
            if has_cc:
                results['fixed_cc'] += 1
            if is_truncated:
                results['fixed_trunc'] += 1
            if is_short:
                results['fixed_short'] += 1
            if is_mismatch:
                results['fixed_mismatch'] += 1
            results['fixed_cc'] += 1 if has_cc else 0
        else:
            results['no_fix'] += 1
    else:
        results['clean'] += 1

print(f"VET SUMMARY:")
print(f"  Already clean:        {results['clean']}")
print(f"  Fixed CC noise:       {results['fixed_cc']}")
print(f"  Fixed truncation:     {results['fixed_trunc']}")
print(f"  Fixed too short:      {results['fixed_short']}")
print(f"  Fixed option mismatch:{results['fixed_mismatch']}")
print(f"  Could not fix:        {results['no_fix']}")
print(f"  TOTAL questions:      {len(bank)}")
print(f"  CLEAN after vet:      {results['clean'] + results['fixed_cc'] + results['fixed_trunc'] + results['fixed_short'] + results['fixed_mismatch']}")

# Show what couldn't be fixed
if results['no_fix'] > 0:
    print(f"\n=== QUESTIONS THAT STILL NEED WORK ({results['no_fix']}) ===\n")
    count = 0
    for q in bank:
        old_qt = q['question']
        has_cc = bool(re.search(r'(?:Communication\s+and\s+Collaboration|Critical\s+Thinking\s+and\s+Problem\s+Solving|Creativity\s+and\s+Innovation|Digital\s+Literacy|Personal\s+Development\s+and\s+Leadership|Cultural\s+Identity\s+and\s+Global\s+Citizenship|leadership|Communication\s+and|Cultural\s+identity\s+and\s+global\s+citizenship|Personal\s+development\s+and|Digital\s+literacy|Creativity\s+and\s+innovation|Skill\s+development|Skill\s+development)\s*[,.\-\\–—]*\s*$', old_qt, re.IGNORECASE))
        trunc_pats = [r'\s+(?:the|and|or|of|in|on|at|to|for|with|by|from|as|d|x27|une|un|des|le|la|les|leur|son|ses|notre|votre|leurs|cette|du|aux|avec|sans|pour|sur|dans|en|par|chez|quand|comment|pourquoi|quel|quelle|quels|quelles|qui|quoi|etc|,|\))\s*\?$']
        is_truncated = any(re.search(pat, old_qt) and not re.search(r'(?:quelqu|x27une|x27un|l|x27une|l|x27un|x27|c|x27|j|x27|t|x27|s|x27|n|x27|m|x27|qu|x27|d|x27accord)\w+\s*\?$', old_qt) for pat in trunc_pats)
        is_short = len(old_qt.rstrip('?').strip()) < 25
        
        if has_cc or is_truncated or is_short:
            flags = []
            if has_cc: flags.append('CC')
            if is_truncated: flags.append('TRUNC')
            if is_short: flags.append('SHORT')
            print(f"  #{bank.index(q)+1:3d} [{q['subject']:25s}] {','.join(flags):10s} | {old_qt[:120]}")
            count += 1
            if count >= 15:
                break

with open('output/quiz_bank_vetted.json', 'w') as f:
    json.dump(bank, f, indent=2, ensure_ascii=False)

print(f"\nSaved {len(bank)} questions.")
