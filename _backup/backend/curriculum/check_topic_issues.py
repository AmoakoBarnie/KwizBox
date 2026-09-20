"""Show all unique topic/sub_topic combos in DB and flag issues."""
import requests, json
from collections import defaultdict

r = requests.post("http://localhost:8001/admin/token", json={"username":"admin","password":"Admin@1234"}, timeout=5)
token = r.json()["access_token"]

# Fetch all questions
all_qs = []
for offset in [0, 1000, 2000]:
    r2 = requests.get(f"http://localhost:8001/admin/questions?limit=1000&offset={offset}",
                      headers={"Authorization": f"Bearer {token}"}, timeout=15)
    qs = r2.json()
    all_qs.extend(qs)
    if len(qs) < 1000:
        break

# Collect unique topic/sub_topic combos per subject/class
combos = defaultdict(set)  # {(subject, class): set((topic, sub_topic))}
for q in all_qs:
    key = (q["subject"], q["class_level"])
    combos[key].add((q["topic"], q.get("sub_topic", "")))

print(f"Total questions: {len(all_qs)}")
print(f"Unique subject/class combos with topics: {len(combos)}")
print()

# Show per subject
for subj in sorted(set(q["subject"] for q in all_qs)):
    classes = defaultdict(set)
    for q in all_qs:
        if q["subject"] == subj:
            classes[q["class_level"]].add((q["topic"], q.get("sub_topic", "")))
    
    total = sum(len(v) for v in classes.values())
    print(f"{subj}:")
    for cl in sorted(classes.keys()):
        pairs = sorted(classes[cl])
        print(f"  {cl}: {len(pairs)} topic/sub_topic combos, {sum(1 for q in all_qs if q['subject']==subj and q['class_level']==cl)} questions")
        for topic, sub in pairs:
            issue = ""
            if topic in ("General", "GENERAL"):
                issue = " ⚠️ generic topic"
            if not sub:
                issue += " ⚠️ no sub_topic"
            print(f"    {topic:<55} › {sub or '(none)':<40} {issue}")
    print()
