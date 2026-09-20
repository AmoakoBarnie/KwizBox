"""Check all NaCCA topics covered + question counts per topic/class/subject."""
import requests, json
from collections import defaultdict

# Load manifest
with open("output/nacca_manifest.json") as f:
    manifest = json.load(f)

# Collect all topics from manifest: {subject_code: {class_level: [topics]}}
manifest_topics = defaultdict(lambda: defaultdict(set))
manifest_class_levels = defaultdict(set)

for subj in manifest["subjects"]:
    code = subj["code"]
    for lvl in subj.get("levels", []):
        class_label = lvl.get("level", "")
        # Map B4-B9
        if class_label:
            manifest_class_levels[code].add(class_label)
        for strand in lvl.get("strands", []):
            strand_name = strand.get("name", "").strip()
            if strand_name:
                for ss in strand.get("sub_strands", []):
                    ss_name = ss.get("name", "").strip()
                    if ss_name:
                        topic = f"{strand_name} — {ss_name}"
                        manifest_topics[code][class_label].add(topic)

# Also collect standalone strand topics
manifest_strands = defaultdict(lambda: defaultdict(set))
for subj in manifest["subjects"]:
    code = subj["code"]
    for lvl in subj.get("levels", []):
        class_label = lvl.get("level", "")
        for strand in lvl.get("strands", []):
            strand_name = strand.get("name", "").strip()
            if strand_name:
                manifest_strands[code][class_label].add(strand_name)

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
print(f"Subjects in DB: {sorted(set(q['subject'] for q in all_questions))}")
print()

# Subject mapping
subject_map = {
    "Mathematics": "mathematics", "Science": "science", "Computing": "computing",
    "English": "english", "Social Studies": "social_studies", "French": "french",
    "Ghanaian Language": "ghanaian_language", "History": "history",
    "Our World and Our People": "owop", "Creative Arts": "creative_arts",
    "Physical Education": "physical_education", "Religious and Moral Education": "rme",
    "Career Technology": "career_technology", "Arabic": "arabic", "Mixed": None,
}
reverse_map = {v: k for k, v in subject_map.items() if v}

# Count DB questions by subject/class/topic
db_counts = defaultdict(lambda: defaultdict(lambda: defaultdict(int)))
db_topic_set = defaultdict(lambda: defaultdict(set))

for q in all_questions:
    subj = q["subject"]
    sc = subject_map.get(subj)
    if not sc:
        continue
    cl = q["class_level"]
    topic = q.get("topic", "").strip() or "(no topic)"
    db_counts[sc][cl][topic] += 1
    db_topic_set[sc][cl].add(topic)

# Report
print("=" * 80)
print("TOPIC COVERAGE + QUESTION COUNTS: PER SUBJECT / CLASS / TOPIC")
print("=" * 80)

total_topics_manifest = 0
total_topics_covered = 0

for db_subj in sorted(set(q["subject"] for q in all_questions)):
    sc = subject_map.get(db_subj)
    if not sc:
        continue
    
    print(f"\n{'='*60}")
    print(f"📚 {db_subj.upper()} ({sc})")
    print(f"{'='*60}")
    
    # Show all manifest classes for this subject
    manifest_classes = sorted(manifest_class_levels.get(sc, set()))
    db_classes = sorted(db_counts[sc].keys())
    
    all_classes = sorted(set(manifest_classes) | set(db_classes),
                         key=lambda x: (int(x[1:]) if len(x) > 1 else 99))
    
    print(f"  Manifest classes: {manifest_classes if manifest_classes else 'NONE (no parsed data)'}")
    print(f"  DB classes:       {db_classes if db_classes else 'NONE (no questions)'}")
    print()
    
    for cl in all_classes:
        m_topics = manifest_topics[sc].get(cl, set())
        d_topics = db_topic_set[sc].get(cl, set())
        m_count = len(m_topics)
        d_count = len(d_topics)
        
        covered = m_topics & d_topics
        uncovered = m_topics - d_topics
        
        total_topics_manifest += m_count
        total_topics_covered += len(covered)
        
        if m_count == 0 and d_count == 0:
            continue
        
        print(f"  {'─'*50}")
        print(f"  Class {cl}:")
        print(f"    Manifest topics: {m_count}  |  DB topics: {d_count}  |  Covered: {len(covered)}  |  Uncovered: {len(uncovered)}")
        
        if d_count > 0:
            # Show topic with counts
            print(f"    Topics with question counts:")
            for topic in sorted(d_topics):
                cnt = db_counts[sc][cl][topic]
                marker = "✅" if topic in covered else ("⚠️" if topic not in m_topics else "")
                topic_display = topic if len(topic) <= 60 else topic[:57] + "..."
                print(f"      {marker} {topic_display:<60s} → {cnt} qs")
        
        if uncovered:
            print(f"    ❌ Uncovered manifest topics:")
            for t in sorted(uncovered):
                t_display = t if len(t) <= 60 else t[:57] + "..."
                print(f"      ❌ {t_display}")
    
    # Total for this subject
    total_qs = sum(db_counts[sc][cl][t] for cl in db_counts[sc] for t in db_counts[sc][cl])
    print(f"\n  📊 {db_subj} TOTAL: {total_qs} questions across {len(db_classes)} classes")

print()
print("=" * 80)
print(f"OVERALL: {total_topics_covered}/{total_topics_manifest} manifest topics covered ({100*total_topics_covered/max(total_topics_manifest,1):.0f}%)")
print(f"Total DB questions: {len(all_questions)}")
print("=" * 80)

# Quick summary table
print("\n\nQUICK SUMMARY — questions per subject/class:")
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
