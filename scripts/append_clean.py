import json

SRC = r"C:\Users\Amoako\ghana-stem-trivia\scripts\incoming_100.json"
QPATH = r"C:\Users\Amoako\ghana-stem-trivia\scripts\questions.json"

incoming = json.load(open(SRC, encoding="utf-8"))
existing = json.load(open(QPATH, encoding="utf-8"))

existing_ids = [q.get("id") for q in existing]
max_id = max(existing_ids) if existing_ids else 0
print("Current max id in bank:", max_id, "| existing count:", len(existing))

# quarantine set (broken)
QUARANTINE = {1, 3}

# clean incoming
clean = [q for q in incoming if q["id"] not in QUARANTINE]
# re-id sequentially continuing from max_id
next_id = max_id
added = []
for q in clean:
    next_id += 1
    q2 = dict(q)
    q2["id"] = next_id
    added.append(q2)

existing.extend(added)
json.dump(existing, open(QPATH, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
print("Added:", len(added), "new ids:", added[0]["id"], "->", added[-1]["id"])
print("New total in questions.json:", len(existing))

# Save quarantine file for review
json.dump([q for q in incoming if q["id"] in QUARANTINE],
          open(r"C:\Users\Amoako\ghana-stem-trivia\scripts\quarantine_2.json", "w", encoding="utf-8"),
          indent=2, ensure_ascii=False)
print("Quarantined (kept out):", sorted(QUARANTINE))
