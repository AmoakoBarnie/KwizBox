"""Check all indicators in the DB against the manifest — find gaps."""
import requests, json
from collections import defaultdict

# Load manifest
with open("output/nacca_manifest.json") as f:
    manifest = json.load(f)

# Collect all indicators from manifest
manifest_indicators = {}  # {subject_code: {indicator_id: text}}
manifest_cs = {}

for subj in manifest["subjects"]:
    code = subj["code"]
    manifest_indicators[code] = {}
    manifest_cs[code] = set()
    
    for lvl in subj.get("levels", []):
        for strand in lvl.get("strands", []):
            for ss in strand.get("sub_strands", []):
                for cs in ss.get("content_standards", []):
                    cs_id = cs.get("id", "")
                    if cs_id:
                        manifest_cs[code].add(cs_id)
                    for ind in cs.get("indicators", []):
                        iid = ind.get("indicator_id", "")
                        text = ind.get("text", "").strip()
                        if iid and text:
                            manifest_indicators[code][iid] = {"text": text, "cs_id": cs_id}

# Fetch questions from DB
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

print(f"Total questions in DB: {len(all_questions)}")
print(f"Subjects in DB: {sorted(set(q['subject'] for q in all_questions))}")
print(f"Subjects in manifest: {sorted(manifest_indicators.keys())}")
print()

# Map DB subject names to manifest codes
subject_map = {
    "Mathematics": "mathematics",
    "Science": "science",
    "Computing": "computing",
    "English": "english",
    "Social Studies": "social_studies",
    "French": "french",
    "Ghanaian Language": "ghanaian_language",
    "History": "history",
    "Our World and Our People": "owop",
    "Creative Arts": "creative_arts",
    "Physical Education": "physical_education",
    "Religious and Moral Education": "rme",
    "Career Technology": "career_technology",
    "Arabic": "arabic",
    "Mixed": None,
}

# Collect indicator coverage from DB
db_indicators = defaultdict(set)  # {subject: set(indicator_ids)}

for q in all_questions:
    subj = q["subject"]
    sc = subject_map.get(subj)
    if not sc:
        continue
    # The question text itself is the indicator text; we need to match it back
    # to an indicator. We'll use the question text as a lookup.
    qtext = q["question"]
    # Check if this question text matches any indicator
    if sc in manifest_indicators:
        for iid, info in manifest_indicators[sc].items():
            # Check if the question contains enough of the indicator text
            if len(qtext) > 20 and info["text"][:50] in qtext:
                db_indicators[subj].add(iid)
                break

print("=== INDICATOR COVERAGE BY SUBJECT ===")
total_manifest = 0
total_covered = 0
total_qs = 0

for code in sorted(manifest_indicators.keys()):
    manifest_count = len(manifest_indicators[code])
    db_count = len(db_indicators.get(code, set()))
    covered = manifest_indicators[code].keys() & db_indicators.get(code, set())
    covered_count = len(covered)
    
    # Also count DB questions for this subject
    q_count = sum(1 for q in all_questions if q["subject"] in [s for s, c in subject_map.items() if c == code])
    
    total_manifest += manifest_count
    total_covered += covered_count
    total_qs += q_count
    
    pct = 100*covered_count/max(manifest_count,1)
    bar = "✅" if covered_count == manifest_count else ("⚠️" if covered_count > manifest_count * 0.5 else "❌")
    
    print(f"  {bar} {code:25s}: {manifest_count:3d} indicators, {covered_count:3d} covered ({pct:.0f}%) | {q_count:3d} DB questions")

print()
print(f"OVERALL: {total_covered}/{total_manifest} indicators covered ({100*total_covered/max(total_manifest,1):.0f}%)")
print(f"DB questions across subjects: {total_qs}")

# Show uncovered indicators for low-coverage subjects
print()
print("=== UNCOVERED INDICATORS (subjects with < 100% coverage) ===")
for code in sorted(manifest_indicators.keys()):
    covered = manifest_indicators[code].keys() & db_indicators.get(code, set())
    uncovered = set(manifest_indicators[code].keys()) - covered
    if uncovered:
        print(f"\n  {code} ({len(uncovered)} uncovered):")
        for iid in sorted(uncovered)[:10]:
            info = manifest_indicators[code][iid]
            text_preview = info["text"][:100].replace("\n", " ")
            print(f"    {iid}: {text_preview}...")
        if len(uncovered) > 10:
            print(f"    ... and {len(uncovered) - 10} more")
