import json, urllib.request
from collections import Counter
B = "http://localhost:8001"

def call(m, p, d=None):
    req = urllib.request.Request(B + p, data=json.dumps(d).encode(), headers={"Content-Type": "application/json"}, method=m)
    try:
        return json.load(urllib.request.urlopen(req))
    except Exception:
        return None

def ids(combo):
    p = call("POST", "/quiz/pack", {"class_level": combo[0], "subject": combo[1], "difficulty": combo[2], "count": 12})
    return [q["id"] for q in p] if p else []

a = ids(("B4", "Mathematics", "Easy"))
b = ids(("B4", "Mathematics", "Easy"))
sa, sb = set(a), set(b)
overlap = sa & sb
union = sa | sb
print(f"B4 Maths Easy: session1={len(a)} session2={len(b)} overlap={len(overlap)} ({round(100*len(overlap)/len(union))}% of union)")
print("  -> with only 19 questions in this pool, repeats across sessions are EXPECTED")

m = call("POST", "/quiz/pack", {"class_level": "B7", "subject": "Mixed", "difficulty": "Easy", "count": 12})
print("B7 Mixed Easy subjects in pack:", dict(Counter(q["subject"] for q in m)))
