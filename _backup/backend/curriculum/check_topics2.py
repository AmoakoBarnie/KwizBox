"""Check all NaCCA topics from manifest indicator IDs vs DB, with counts per topic/class/subject."""
import requests, json, re
from collections import defaultdict

# Load manifest
with open("output/nacca_manifest.json") as f:
    manifest = json.load(f)

# Extract topics from indicator IDs: B4.1.1.1.1 -> class=B4, strand=1, sub-strand=1
# Also build topic label from (strand, sub-strand) names
db_topics = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(int))))
# structure: {subject: {class: {topic: {sub_topic: count}}}}

# Collect all manifest-defined topics/strands
manifest_structure = defaultdict(lambda: defaultdict(set))  # {subject: {class: {(strand, sub_strand)}}}

for subj in manifest["subjects"]:
    code = subj["code"]
    for lvl in subj.get("levels", []):
        class_label = lvl.get("level") or lvl.get("code") or ""
        if not class_label:
            # Try to infer from indicator IDs
            continue
        for strand in lvl.get("strands", []):
            strand_name = strand.get("name", "").strip()
            for ss in strand.get("sub_strands", []):
                ss_name = ss.get("name", "").strip()
                for cs in ss.get("content_standards", []):
                    for ind in cs.get("indicators", []):
                        iid = ind.get("indicator_id", "")
                        if iid:
                            m = re.match(r'(B\d)\.(\d+)\.(\d+)', iid)
                            if m:
                                mc = m.group(1)
                                manifest_structure[code][mc].add((strand_name, ss_name))

# Also extract class from indicator IDs where level is missing
for subj in manifest["subjects"]:
    code = subj["code"]
    for lvl in subj.get("levels", []):
        for strand in lvl.get("strands", []):
            for ss in strand.get("sub_strands", []):
                for cs in ss.get("content_standards", []):
                    for ind in cs.get("indicators", []):
                        iid = ind.get("indicator_id", "")
                        m = re.match(r'(B\d)\.(\d+)\.(\d+)', iid)
                        if m and not lvl.get("level"):
                            mc = m.group(1)
                            strand_name = strand.get("name", "").strip()
                            ss_name = ss.get("name", "").strip()
                            manifest_structure[code][mc].add((strand_name, ss_name))

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
print()

# Map subject names
subject_map = {
    "Mathematics": "mathematics", "Science": "science", "Computing": "computing",
    "English": "english", "French": "french", "Ghanaian Language": "ghanaian_language",
    "History": "history", "Our World and Our People": "owop",
    "Creative Arts": "creative_arts", "Physical Education": "physical_education",
    "Religious and Moral Education": "rme", "Arabic": "arabic",
    "Social Studies": "social_studies", "Career Technology": "career_technology",
    "Mixed": None,
}

reverse_map = {v: k for k, v in subject_map.items() if v}

# Count DB questions by subject/class/topic
# topic = strand or sub-strand from the question's topic field
db_counts = defaultdict(lambda: defaultdict(lambda: defaultdict(int)))
db_topic_questions = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))

for q in all_questions:
    db_subj = q["subject"]
    sc = subject_map.get(db_subj)
    if not sc:
        continue
    cl = q["class_level"]
    topic_raw = q.get("topic", "").strip()
    
    # Clean up topic
    if not topic_raw or topic_raw == "(no topic)":
        topic_label = "(no topic / unspecified)"
    else:
        topic_label = topic_raw
    
    db_counts[sc][cl][topic_label] += 1
    db_topic_questions[sc][cl][topic_label].append(q["question"][:80])

# Now compare
print("=" * 80)
print("NACCA TOPIC COVERAGE CHECK")
print("=" * 80)
print()

total_manifest_topics = 0
total_covered = 0

for code in sorted(manifest_structure.keys()):
    db_subj = reverse_map.get(code, code)
    
    print(f"\n{'='*60}")
    print(f"📚 {db_subj.upper()} ({code})")
    print(f"{'='*60}")
    
    manifest_classes = sorted(manifest_structure[code].keys(), key=lambda x: int(x[1:]))
    db_classes = sorted(db_counts[code].keys(), key=lambda x: int(x[1:]) if x[1:].isdigit() else 99)
    all_classes = sorted(set(manifest_classes) | set(db_classes),
                         key=lambda x: int(x[1:]) if x[1:].isdigit() else 99)
    
    print(f"  Manifest classes: {manifest_classes}")
    print(f"  DB classes:       {db_classes}")
    print()
    
    for cl in all_classes:
        m_topics = manifest_structure[code].get(cl, set())
        d_topics = db_counts[code].get(cl, {})
        
        m_topic_set = {t[0] for t in m_topics}  # strand names
        m_subtopic_set = {t[1] for t in m_topics}  # sub-strand names
        
        # DB topics as set
        d_topic_set = set(d_topics.keys())
        
        m_count = len(m_topics)
        d_count = len(d_topic_set)
        
        # What's covered? DB topic matches manifest strand or sub-strand
        covered_strands = m_topic_set & d_topic_set
        covered_substrands = m_subtopic_set & d_topic_set
        
        total_manifest_topics += m_count
        
        print(f"  {'─'*50}")
        print(f"  Class {cl}:")
        print(f"    Manifest strands+sub-strands: {m_count}")
        print(f"    DB topics: {d_count}")
        print(f"    Strands covered: {len(covered_strands)}/{len(m_topic_set)}")
        print(f"    Sub-strands covered: {len(covered_substrands)}/{len(m_subtopic_set)}")
        
        # Show manifest vs DB
        if m_count > 0:
            print(f"    Manifest strands:")
            for s, ss in sorted(m_topics):
                marker = "✅" if s in d_topic_set or ss in d_topic_set else "❌"
                print(f"      {marker} [{s}] → {ss}")
        
        if d_count > 0:
            print(f"    DB topics ({d_count}) with counts:")
            # Group by topic
            topic_totals = defaultdict(int)
            for t, c in d_topics.items():
                topic_totals[t] += c
            
            for t in sorted(topic_totals.keys()):
                cnt = topic_totals[t]
                sample = db_topic_questions[code][cl][t][0] if db_topic_questions[code][cl][t] else ""
                marker = "✅" if t in m_topic_set or t in m_subtopic_set else ("⚠️" if t == "(no topic / unspecified)" else "🔸")
                t_display = t if len(t) <= 50 else t[:47] + "..."
                print(f"      {marker} {t_display:<50s} → {cnt:3d} qs | e.g. {sample[:60]}")
        
        # Uncovered
        uncovered = m_topics - {(s, ss) for s in covered_strands for ss in m_subtopic_set if s == s}
        if m_count > 0 and d_count == 0:
            print(f"    ❌ No DB topics for this class at all")
    
    # Subject total
    total_qs = sum(db_counts[code][cl][t] for cl in db_counts[code] for t in db_counts[code][cl])
    print(f"\n  📊 {db_subj} TOTAL: {total_qs} qs")

# Overall
print()
print("=" * 80)
print("SUBJECT/CLASS SUMMARY TABLE")
print("=" * 80)
print(f"{'Subject':<28} {'B4':>5} {'B5':>5} {'B6':>5} {'B7':>5} {'B8':>5} {'B9':>5} {'TOTAL':>6}")
print("-" * 70)

for db_subj in sorted(set(q["subject"] for q in all_questions)):
    sc = subject_map.get(db_subj)
    if not sc:
        continue
    counts = []
    total = 0
    for cl in ["B4", "B5", "B6", "B7", "B8", "B9"]:
        c = sum(db_counts[sc].get(cl, {}).values())
        counts.append(str(c))
        total += c
    print(f"{db_subj:<28} {counts[0]:>5} {counts[1]:>5} {counts[2]:>5} {counts[3]:>5} {counts[4]:>5} {counts[5]:>5} {total:>6}")

print()
print(f"Grand total: {len(all_questions)} questions in DB")
