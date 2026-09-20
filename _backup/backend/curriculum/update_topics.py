"""Update DB question topics to match NaCCA strand › sub-strand from manifest.

For the 580 vetted questions: look up cs_id in manifest, set topic = "strand › sub-strand"
For pre-existing STEM questions: assign topics based on heuristics from existing topic names.
"""
import requests, json, re
from collections import defaultdict

# Load manifest
with open("output/nacca_manifest.json") as f:
    manifest = json.load(f)

# Build lookup: cs_id -> (strand, sub_strand)
cs_topic_map = {}  # {cs_id: "strand › sub-strand"}

for subj in manifest["subjects"]:
    for lvl in subj.get("levels", []):
        for strand in lvl.get("strands", []):
            s_name = strand.get("name", "").strip()
            for ss in strand.get("sub_strands", []):
                ss_name = ss.get("name", "").strip()
                for cs in ss.get("content_standards", []):
                    cs_id = cs.get("id", "")
                    if cs_id:
                        label = f"{s_name} › {ss_name}" if ss_name else s_name
                        cs_topic_map[cs_id] = label

print(f"CS -> topic map: {len(cs_topic_map)} entries")

# Also build indicator_id -> topic map (for questions that only have indicator_id)
ind_topic_map = {}
for subj in manifest["subjects"]:
    for lvl in subj.get("levels", []):
        for strand in lvl.get("strands", []):
            s_name = strand.get("name", "").strip()
            for ss in strand.get("sub_strands", []):
                ss_name = ss.get("name", "").strip()
                for cs in ss.get("content_standards", []):
                    cs_id = cs.get("id", "")
                    for ind in cs.get("indicators", []):
                        iid = ind.get("indicator_id", "")
                        if iid:
                            label = f"{s_name} › {ss_name}" if ss_name else s_name
                            ind_topic_map[iid] = label

print(f"Indicator -> topic map: {len(ind_topic_map)} entries")

# Login to DB
r = requests.post("http://localhost:8001/admin/token", json={"username":"admin","password":"Admin@1234"}, timeout=5)
token = r.json()["access_token"]

# Fetch ALL questions from DB
all_questions = []
for offset in [0, 1000, 2000]:
    r2 = requests.get(f"http://localhost:8001/admin/questions?limit=1000&offset={offset}",
                      headers={"Authorization": f"Bearer {token}"}, timeout=15)
    qs = r2.json()
    all_questions.extend(qs)
    if len(qs) < 1000:
        break

print(f"\nTotal DB questions: {len(all_questions)}")

# Track changes
updated = 0
unchanged = 0
assigned_new = 0

# Questions by subject for reporting
changed_by_subject = defaultdict(int)
unchanged_by_subject = defaultdict(int)

for q in all_questions:
    old_topic = q.get("topic", "").strip()
    cs_id = q.get("cs_id", "")
    indicator_id = q.get("indicator_id", "")
    
    # Try to find topic from manifest
    new_topic = None
    
    # Method 1: direct cs_id lookup
    if cs_id and cs_id in cs_topic_map:
        new_topic = cs_topic_map[cs_id]
    
    # Method 2: indicator_id lookup
    if not new_topic and indicator_id and indicator_id in ind_topic_map:
        new_topic = ind_topic_map[indicator_id]
    
    # Method 3: extract class+strand from indicator_id pattern for subjects not in manifest
    if not new_topic and indicator_id:
        m = re.match(r'(B\d)\.(\d+)\.(\d+)', indicator_id)
        if m:
            # Try to find in manifest by scanning all CS IDs for this pattern
            prefix = f"{m.group(1)}.{m.group(2)}.{m.group(3)}"
            for cid, label in cs_topic_map.items():
                if cid.startswith(prefix):
                    new_topic = label
                    break
    
    # Method 4: for pre-existing questions without manifest data, clean up existing topic
    if not new_topic:
        if old_topic and old_topic != "(no topic)" and old_topic != "":
            # Clean up: capitalize, remove duplicates, normalize
            cleaned = old_topic.strip().title()
            # Fix common issues
            cleaned = re.sub(r'\s+', ' ', cleaned)
            new_topic = cleaned
        else:
            # Assign a subject-based default topic
            subj = q.get("subject", "")
            cl = q.get("class_level", "")
            if subj == "Mathematics":
                # Try to infer from question text
                qt = q.get("question", "").lower()
                if "fraction" in qt: new_topic = "Number › Fractions, Decimals and Percentages"
                elif "decimal" in qt: new_topic = "Number › Fractions, Decimals and Percentages"
                elif "percent" in qt or "%" in qt: new_topic = "Number › Fractions, Decimals and Percentages"
                elif "algebra" in qt or "x +" in qt or "solve for" in qt: new_topic = "Algebra › Variables and Equations"
                elif "geometry" in qt or "angle" in qt or "triangle" in qt or "circle" in qt: new_topic = "Shapes and Space › General"
                elif "area" in qt or "perimeter" in qt: new_topic = "Measurement › General"
                elif "volume" in qt: new_topic = "Measurement › General"
                elif "probability" in qt or "chance" in qt: new_topic = "Data › Chance or Probability"
                elif "ratio" in qt: new_topic = "Number › Number: Ratios and Proportion"
                elif "statistics" in qt or "mean" in qt or "median" in qt or "mode" in qt: new_topic = "Data › General"
                elif "pattern" in qt: new_topic = "Patterns and Relations › General"
                elif "money" in qt or "ghs" in qt or "cost" in qt: new_topic = "Number Operations › General"
                elif "add" in qt or "subtract" in qt or "multiply" in qt or "divide" in qt or "+" in qt or "-" in qt: new_topic = "Number Operations › General"
                elif "sequence" in qt or "series" in qt: new_topic = "Patterns and Relations › General"
                elif "exponent" in qt or "power" in qt or "square" in qt or "root" in qt: new_topic = "Number and Numeration Systems › General"
                elif "inequality" in qt: new_topic = "Variables and Equations › General"
                elif "logarithm" in qt: new_topic = "Number and Numeration Systems › General"
                elif "matrix" in qt: new_topic = "Algebraic Expressions › General"
                elif "bearing" in qt: new_topic = "Position and Transformation › General"
                elif "speed" in qt or "rate" in qt: new_topic = "Measurement › General"
                elif "standard form" in qt: new_topic = "Number and Numeration Systems › General"
                elif "trigonom" in qt: new_topic = "Shapes and Space › General"
                elif "calculus" in qt or "differentiat" in qt or "integrat" in qt: new_topic = "Variables and Equations › General"
                elif "complex number" in qt: new_topic = "Number and Numeration Systems › General"
                else: new_topic = "Number › General"
            elif subj == "Science":
                qt = q.get("question", "").lower()
                if "cell" in qt or "mitosis" in qt or "meiosis" in qt: new_topic = "LIVING CELLS › General"
                elif "ecosystem" in qt or "food chain" in qt or "food web" in qt or "biodiversity" in qt: new_topic = "ECOSYSTEM › General"
                elif "energy" in qt or "force" in qt or "motion" in qt or "momentum" in qt or "gravity" in qt: new_topic = "FORCE AND MOTION › General"
                elif "electricity" in qt or "circuit" in qt or "current" in qt or "voltage" in qt: new_topic = "ELECTRICITY AND ELECTRONICS › General"
                elif "light" in qt or "reflection" in qt or "refraction" in qt or "lens" in qt or "mirror" in qt: new_topic = "ELECTRICITY AND ELECTRONICS › General"
                elif "sound" in qt or "wave" in qt or "frequency" in qt: new_topic = "ELECTRICITY AND ELECTRONICS › General"
                elif "atom" in qt or "element" in qt or "periodic" in qt or "chemical" in qt or "acid" in qt or "base" in qt or "reaction" in qt: new_topic = "MATERIALS › General"
                elif "planet" in qt or "solar system" in qt or "moon" in qt or "star" in qt or "astronomy" in qt: new_topic = "THE SOLAR SYSTEM › General"
                elif "health" in qt or "disease" in qt or "virus" in qt or "vaccine" in qt or "nutrition" in qt or "diet" in qt or "digestion" in qt or "respiration" in qt or "circulation" in qt: new_topic = "HUMAN HEALTH › General"
                elif "climate" in qt or "weather" in qt or "environment" in qt or "pollution" in qt or "galamsey" in qt or "green" in qt or "sustainable" in qt: new_topic = "CLIMATE CHANGE AND GREEN ECONOMY › General"
                elif "crop" in qt or "farm" in qt or "agriculture" in qt or "soil" in qt or "plant" in qt or "animal" in qt or "poultry" in qt: new_topic = "CROP PRODUCTION › General"
                elif "water" in qt or "cycle" in qt or "evaporation" in qt or "condensation" in qt or "transpiration" in qt: new_topic = "ENERGY › General"
                elif "waste" in qt or "recycling" in qt or "3rs" in qt: new_topic = "WASTE MANAGEMENT › General"
                elif "reproduction" in qt or "heredity" in qt or "genetics" in qt or "inheritance" in qt or "gene" in qt or "dna" in qt or "protein" in qt or "evolution" in qt: new_topic = "LIFE CYCLE OF ORGANISMS › General"
                elif "rock" in qt or "soil" in qt or "mineral" in qt or "earth" in qt or "fossil" in qt or "geology" in qt: new_topic = "EARTH SCIENCE › General"
                elif "human body" in qt or "organ" in qt or "system" in qt or "skeleton" in qt: new_topic = "THE HUMAN BODY SYSTEM › General"
                elif "photosynthesis" in qt: new_topic = "ENERGY › General"
                elif "pressure" in qt: new_topic = "FORCE AND MOTION › General"
                else: new_topic = "GENERAL › General"
            elif subj == "Computing":
                qt = q.get("question", "").lower()
                if "algorithm" in qt or "programming" in qt or "code" in qt or "variable" in qt or "function" in qt or "loop" in qt: new_topic = "Programming › General"
                elif "hardware" in qt or "cpu" in qt or "ram" in qt or "storage" in qt or "mouse" in qt or "keyboard" in qt or "monitor" in qt: new_topic = "Hardware › General"
                elif "software" in qt or "application" in qt or "program" in qt or "word processor" in qt or "spreadsheet" in qt or "presentation" in qt or "powerpoint" in qt or "excel" in qt: new_topic = "Software Applications › General"
                elif "internet" in qt or "web" in qt or "browser" in qt or "url" in qt or "website" in qt or "search engine" in qt or "email" in qt: new_topic = "Digital Literacy › General"
                elif "network" in qt or "lan" in qt or "wan" in qt or "bandwidth" in qt or "dns" in qt: new_topic = "Networking › General"
                elif "security" in qt or "password" in qt or "virus" in qt or "cyber" in qt or "phishing" in qt or "privacy" in qt: new_topic = "Cybersecurity › General"
                elif "data" in qt or "database" in qt or "binary" in qt or "file" in qt or "storage" in qt: new_topic = "Data Representation › General"
                elif "artificial intelligence" in qt or "ai" in qt or "machine learning" in qt or "robot" in qt or "cloud" in qt: new_topic = "Emerging Technologies › General"
                elif "safety" in qt or "privacy" in qt or "stranger" in qt or "online" in qt: new_topic = "Digital Citizenship › General"
                else: new_topic = "Introduction to Computing › General"
            elif subj == "French":
                new_topic = "Écouter › General"
            elif subj == "Ghanaian Language":
                new_topic = "Integrating Grammar in Written Language(Conjunctions) › Reading Texts, Poems Narratives and Short Stories and Responding to them"
            elif subj == "Arabic":
                new_topic = "Writing › General"
            elif subj == "Physical Education":
                new_topic = "Dance › General"
            elif subj == "History":
                new_topic = "Ghana Gains Independence › MILITARY RULE"
            elif subj == "English":
                new_topic = "General › General"
            elif subj == "Our World and Our People":
                new_topic = "VALUES AND PSYCHO-SOCIAL CONCEPTS, PRINCIPLES AND STRATEGIES › General"
            elif subj == "Religious and Moral Education":
                new_topic = "Commitment to the God › Roles, Relationships in the Family and Character Formation"
            elif subj == "Social Studies":
                new_topic = "General › General"
            elif subj == "Career Technology":
                new_topic = "General › General"
            else:
                new_topic = "General › General"
        
        assigned_new += 1
    
    if new_topic and new_topic != old_topic:
        # Update via PUT /admin/questions/{id}
        r_upd = requests.put(
            f"http://localhost:8001/admin/questions/{q['id']}",
            json={"topic": new_topic},
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )
        if r_upd.status_code == 200:
            updated += 1
            changed_by_subject[q["subject"]] += 1
        else:
            unchanged += 1
            unchanged_by_subject[q["subject"]] += 1
            if unchanged <= 5:
                print(f"  Failed to update Q#{q['id']} [{q['subject']}]: {r_upd.status_code} {r_upd.text[:100]}")
    else:
        unchanged += 1
        unchanged_by_subject[q["subject"]] += 1

print(f"\n{'='*60}")
print(f"TOPIC UPDATE RESULTS")
print(f"{'='*60}")
print(f"Updated (topic changed): {updated}")
print(f"Unchanged (topic same):  {unchanged}")
print(f"  - of which newly assigned: {assigned_new}")
print(f"\nBy subject:")
for subj in sorted(set(q["subject"] for q in all_questions)):
    ch = changed_by_subject.get(subj, 0)
    un = unchanged_by_subject.get(subj, 0)
    print(f"  {subj:<28}: {ch:3d} updated, {un:3d} unchanged")

print(f"\nTotal: {updated + unchanged} questions processed")
