"""Import PR #2's 180 reviewed questions (scripts/questions.json, ids 546-725) into the live DB.

PR schema -> DB column mapping:
    options[0..3]     -> option_a .. option_d
    answer (letter)   -> cross-checked against answer_index, not stored
    (no sub_topic)    -> NULL

Idempotent: a question whose normalized text already exists in the DB is
skipped, so re-running is safe.

Usage (from repo root):  python3 scripts/import_pr2_180.py
"""
import json
import os
import re
import sqlite3
import unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
JSON_PATH = os.path.join(HERE, "questions.json")
DB_PATH = os.path.join(HERE, "..", "backend", "trivia.db")
BATCH_IDS = range(546, 726)  # ids 546..725 inclusive
EXPECTED = 180


def norm(text):
    """Normalize question text for duplicate matching (case/punctuation-insensitive)."""
    text = unicodedata.normalize("NFKC", text or "").lower()
    return re.sub(r"[^a-z0-9]+", " ", text).strip()


def main():
    questions = json.load(open(JSON_PATH, encoding="utf-8"))
    batch = [q for q in questions if q.get("id") in BATCH_IDS]
    print(f"Batch found in questions.json: {len(batch)}")
    if len(batch) != EXPECTED:
        raise SystemExit(f"ERROR: expected {EXPECTED} questions, found {len(batch)} — aborting.")

    db = sqlite3.connect(DB_PATH)
    before = db.execute("SELECT COUNT(*) FROM questions").fetchone()[0]
    existing_texts = {norm(r[0]) for r in db.execute("SELECT question FROM questions")}
    print(f"DB before: {before} questions")

    added_rows = []
    skipped = 0
    for q in batch:
        if norm(q["question"]) in existing_texts:
            skipped += 1
            continue
        cur = db.execute(
            """INSERT INTO questions
               (class_level, subject, topic, sub_topic, strand, difficulty,
                question, option_a, option_b, option_c, option_d,
                answer_index, explanation, question_type, image_url,
                is_active, times_answered, times_correct)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,NULL,1,0,0)""",
            (q["class_level"], q["subject"], q["topic"], None, q["strand"],
             q["difficulty"], q["question"],
             q["options"][0], q["options"][1], q["options"][2], q["options"][3],
             q["answer_index"], q["explanation"], "mcq"),
        )
        added_rows.append((cur.lastrowid, q["id"], q["class_level"], q["subject"]))

    db.commit()
    after = db.execute("SELECT COUNT(*) FROM questions").fetchone()[0]
    print(f"Added: {len(added_rows)} | Skipped (already present): {skipped}")
    print(f"DB after: {after} (expected {before + len(added_rows)})")
    if after != before + len(added_rows):
        raise SystemExit("ERROR: count mismatch after insert — investigate before continuing.")

    # Verify every batch question is now present
    db_texts = {norm(r[0]) for r in db.execute("SELECT question FROM questions")}
    missing = [q["id"] for q in batch if norm(q["question"]) not in db_texts]
    if missing:
        raise SystemExit(f"ERROR: {len(missing)} batch questions missing after import: {missing[:5]}")
    print("Verification: all", len(batch), "batch questions present in DB.")

    from collections import Counter
    print("Inserted rows by class:", dict(Counter(r[2] for r in added_rows)))
    print("Inserted rows by subject:", dict(Counter(r[3] for r in added_rows)))
    print("New DB row id range:", min(r[0] for r in added_rows), "->", max(r[0] for r in added_rows))
    print("OK.")


if __name__ == "__main__":
    main()
