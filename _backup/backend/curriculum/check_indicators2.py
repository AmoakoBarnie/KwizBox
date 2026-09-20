"""Check indicator coverage by matching DB question texts to vetted JSON indicator_ids.

The DB doesn't store indicator_id, so we match by question text similarity.
For each DB question, find the corresponding vetted JSON entry by text match,
then check which indicator_ids are covered.
"""
import requests, json
from collections import defaultdict

# Load vetted JSON (has indicator_id per question)
with open("output/quiz_bank_vetted.json") as f:
    vetted = json.load(f)

# Build text->indicator_id map from vetted
vetted_by_text = {}
for q in vetted:
    text = q["question"].strip()
    vetted_by_text[text] = q

# Fetch DB questions
r = requests.post("http://localhost:8001/admin/token", json={"username":"admin","password":"Admin@1234"}, timeout=5)
token = r.json()["access_token"]

all_questions = []
for offset in [0, 1000, 2000]:
    r2 = requests.get(f"http://localhost:8001/admin/questions?limit=1000&offset={offset}",
                      headers={"Authorization": f"Bearer {token}"}, timeout=15)
    qs = r2.json()
    all_questions.extend(qs)
    if len(qs) < 1000:
        break

print(f"Total DB questions: {len(all_questions)}")
print(f"Vetted JSON questions: {len(vetted)}")
print()

# Match DB questions to vetted by text
db_matched = 0
db_unmatched = 0
db_indicator_ids = defaultdict(set)  # {subject: set(indicator_ids)}

for dq in all_questions:
    dq_text = dq["question"].strip()
    # Try exact match first
    if dq_text in vetted_by_text:
        vq = vetted_by_text[dq_text]
        iid = vq.get("indicator_id", "")
        cs_id = vq.get("cs_id", "")
        if iid:
            db_indicator_ids[dq["subject"]].add(iid)
        db_matched += 1
        continue
    
    # Try fuzzy: does vetted text start the DB text or vice versa?
    for vt, vq in vetted_by_text.items():
        if dq_text.startswith(vt[:80]) or vt.startswith(dq_text[:80]):
            iid = vq.get("indicator_id", "")
            if iid:
                db_indicator_ids[dq["subject"]].add(iid)
            db_matched += 1
            break
    else:
        db_unmatched += 1

print(f"DB questions matched to vetted: {db_matched}")
print(f"DB questions unmatched: {db_unmatched}")
print()

# Now load manifest and check coverage
with open("output/nacca_manifest.json") as f:
    manifest = json.load(f)

manifest_indicators = {}  # {subject_code: {indicator_id: text}}
for subj in manifest["subjects"]:
    code = subj["code"]
    manifest_indicators[code] = {}
    for lvl in subj.get("levels", []):
        for strand in lvl.get("strands", []):
            for ss in strand.get("sub_strands", []):
                for cs in ss.get("content_standards", []):
                    for ind in cs.get("indicators", []):
                        iid = ind.get("indicator_id", "")
                        text = ind.get("text", "").strip()
                        if iid and text:
                            manifest_indicators[code][iid] = text

# Subject mapping
subject_map = {
    "Mathematics": "mathematics", "Science": "science", "Computing": "computing",
    "English": "english", "Social Studies": "social_studies", "French": "french",
    "Ghanaian Language": "ghanaian_language", "History": "history",
    "Our World and Our People": "owop", "Creative Arts": "creative_arts",
    "Physical Education": "physical_education", "Religious and Moral Education": "rme",
    "Career Technology": "career_technology", "Arabic": "arabic", "Mixed": None,
}

print("=== INDICATOR COVERAGE (via DB text -> vetted indicator_id) ===")
total_manifest = 0
total_covered = 0

for db_subj, code in sorted(subject_map.items()):
    if not code:
        continue
    manifest_set = set(manifest_indicators.get(code, {}).keys())
    db_set = db_indicator_ids.get(db_subj, set())
    covered = manifest_set & db_set
    uncovered = manifest_set - db_set
    
    total_manifest += len(manifest_set)
    total_covered += len(covered)
    
    q_count = sum(1 for q in all_questions if q["subject"] == db_subj)
    pct = 100*len(covered)/max(len(manifest_set),1)
    bar = "✅" if len(covered) == len(manifest_set) and len(manifest_set) > 0 else ("⚠️" if len(covered) > len(manifest_set)*0.5 else ("❌" if len(manifest_set) > 0 else "—"))
    
    print(f"  {bar} {code:25s}: {len(manifest_set):3d} indicators, {len(covered):3d} covered ({pct:.0f}%) | {q_count:3d} DB Qs | {len(uncovered):3d} uncovered")

print()
print(f"OVERALL: {total_covered}/{total_manifest} indicators covered ({100*total_covered/max(total_manifest,1):.0f}%)")

# Show worst subjects
print()
print("=== WORST COVERAGE (subjects with most uncovered indicators) ===")
worst = []
for db_subj, code in sorted(subject_map.items()):
    if not code:
        continue
    manifest_set = set(manifest_indicators.get(code, {}).keys())
    db_set = db_indicator_ids.get(db_subj, set())
    uncovered = manifest_set - db_set
    if uncovered:
        worst.append((len(uncovered), code, db_subj, uncovered, manifest_set))

worst.sort(reverse=True)
for count, code, db_subj, uncovered, manifest_set in worst[:5]:
    print(f"\n  {code} ({count} uncovered of {len(manifest_set)}):")
    for iid in sorted(uncovered)[:5]:
        text = manifest_indicators[code][iid][:120].replace("\n", " ")
        print(f"    {iid}: {text}...")
    if len(uncovered) > 5:
        print(f"    ... and {len(uncovered)-5} more")

# Also check: which DB questions are NOT in the vetted set at all?
print()
print("=== DB QUESTIONS NOT IN VETTED JSON ===")
if db_unmatched > 0:
    print(f"  {db_unmatched} DB questions have no matching vetted entry")
    for dq in all_questions:
        dq_text = dq["question"].strip()
        if dq_text not in vetted_by_text:
            # Check fuzzy
            found = False
            for vt in vetted_by_text:
                if dq_text.startswith(vt[:80]) or vt.startswith(dq_text[:80]):
                    found = True
                    break
            if not found:
                print(f"  [{dq['subject']}] {dq_text[:120]}")
                db_unmatched -= 1
                if db_unmatched <= 0:
                    break
