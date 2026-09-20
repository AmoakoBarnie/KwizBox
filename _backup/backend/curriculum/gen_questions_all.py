import json, re, os, random

random.seed(42)

with open('output/nacca_manifest.json') as f:
    manifest = json.load(f)

def clean(s):
    s = s.strip()
    s = re.sub(r'\s+[A-Z]{2,3}\.\d{1,2}\.\d{1,2}\.\d{1,2}\s*[-:]*\s*.*$', '', s)
    s = re.sub(r'\s{2,}', ' ', s)
    return s.strip('. \x92\x93\x94\x95"')

subjects = []
for subj in manifest['subjects']:
    code = subj['code']
    name = subj['name']
    seen = set()
    unique_inds = []
    for lvl in subj.get('levels', []):
        for strand in lvl.get('strands', []):
            for ss in strand.get('sub_strands', []):
                for cs in ss.get('content_standards', []):
                    cs_id = cs.get('id', '')
                    cs_text = cs.get('text', '')
                    for ind in cs.get('indicators', []):
                        iid = ind.get('indicator_id', '')
                        itext = clean(ind.get('text', ''))
                        if itext and itext not in seen:
                            seen.add(itext)
                            unique_inds.append({
                                'indicator_id': iid,
                                'text': itext,
                                'cs_id': cs_id,
                                'cs_text': cs_text
                            })
    if unique_inds:
        subjects.append({'code': code, 'name': name, 'indicators': unique_inds})
        print(f"{code}: {len(unique_inds)} unique indicators")
    else:
        print(f"{code}: 0 unique (skipping)")

total = sum(len(s['indicators']) for s in subjects)
print(f"\nTotal unique indicators: {total}")

with open('output/indicators_deduped.json', 'w') as f:
    json.dump(subjects, f, indent=2, ensure_ascii=False)
print("Saved to output/indicators_deduped.json")
