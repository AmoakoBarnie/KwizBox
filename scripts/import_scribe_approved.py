"""One-off importer: audited scribe questions into live trivia.db without wiping.

Does NOT run backend/scripts/seed.py (that script deletes all questions).
Skip insert if an exact same question stem already exists.
Do not assign explicit ids (SQLite autoincrement).
"""
from __future__ import annotations

import json
import sys
from collections import Counter
from copy import deepcopy
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent
BACKEND = REPO / "backend"
DRAFTS = HERE / "drafts"
DB_PATH = BACKEND / "trivia.db"
APPROVED_JSON = DRAFTS / "scribe_approved_import.json"

sys.path.insert(0, str(BACKEND))

from sqlalchemy import create_engine, func, inspect, text as sa_text  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

from src.models import Question  # noqa: E402
from src.question_types import pad_options  # noqa: E402

engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False, "timeout": 30})
SessionLocal = sessionmaker(bind=engine)

# --- Peswa audit: two MCQ releve from batch 001 ---
RELEVEL_001 = {
    "A metal cooking pot on a coal pot becomes too hot to hold. Why does a thick cloth help Ama lift it more safely?": {
        "class_level": "B5",
        "difficulty": "Medium",
    },
    "On a maize farm, a lizard eats grasshoppers that have been eating maize leaves. What is the lizard in this food chain?": {
        "class_level": "B7",
        "difficulty": "Easy",
    },
}

# Extra true/false items (not in batch 001 JSON). Skip if stem exists.
TRUE_FALSE_EXTRA = [
    {
        "class_level": "B4",
        "subject": "Science",
        "strand": "Cycles",
        "topic": "Weather",
        "difficulty": "Easy",
        "question_type": "true_false",
        "question": "During harmattan in Ghana, the air is usually dry and dusty.",
        "options": ["True", "False"],
        "answer_index": 0,
        "explanation": "Harmattan is a dry, dusty wind from the Sahara, usually December to February.",
        "image_url": None,
    },
    {
        "class_level": "B4",
        "subject": "Computing",
        "strand": "Introduction to Computing",
        "topic": "Output devices",
        "difficulty": "Easy",
        "question_type": "true_false",
        "question": "A printer is an input device.",
        "options": ["True", "False"],
        "answer_index": 1,
        "explanation": "A printer sends information out onto paper, so it is an output device.",
        "image_url": None,
    },
    {
        "class_level": "B5",
        "subject": "Science",
        "strand": "Cycles",
        "topic": "Water cycle",
        "difficulty": "Easy",
        "question_type": "true_false",
        "question": "Water droplets on the outside of a cold bottle form by condensation.",
        "options": ["True", "False"],
        "answer_index": 0,
        "explanation": "Water vapour in warm air cools on the bottle and changes from gas to liquid.",
        "image_url": None,
    },
    {
        "class_level": "B5",
        "subject": "Computing",
        "strand": "Introduction to Computing",
        "topic": "Input devices",
        "difficulty": "Easy",
        "question_type": "true_false",
        "question": "A computer monitor is an input device.",
        "options": ["True", "False"],
        "answer_index": 1,
        "explanation": "A monitor displays information from the computer, so it is an output device.",
        "image_url": None,
    },
    {
        "class_level": "B6",
        "subject": "Computing",
        "strand": "Files",
        "topic": "Folders",
        "difficulty": "Easy",
        "question_type": "true_false",
        "question": "A folder on a computer is used to group related files in one place.",
        "options": ["True", "False"],
        "answer_index": 0,
        "explanation": "A folder is a container for organising files; it does not print or delete files by itself.",
        "image_url": None,
    },
    {
        "class_level": "B6",
        "subject": "Mathematics",
        "strand": "Number",
        "topic": "Percentages",
        "difficulty": "Medium",
        "question_type": "true_false",
        "question": "25% of 80 bags of maize is 20 bags.",
        "options": ["True", "False"],
        "answer_index": 0,
        "explanation": "25% is one-quarter. 80 ÷ 4 = 20.",
        "image_url": None,
    },
    {
        "class_level": "B7",
        "subject": "Science",
        "strand": "Systems",
        "topic": "Cells",
        "difficulty": "Easy",
        "question_type": "true_false",
        "question": "Plant cells have a cell wall.",
        "options": ["True", "False"],
        "answer_index": 0,
        "explanation": "The cell wall supports the plant cell. Animal cells do not have a cell wall.",
        "image_url": None,
    },
    {
        "class_level": "B7",
        "subject": "Science",
        "strand": "Forces and Energy",
        "topic": "Light and sound",
        "difficulty": "Medium",
        "question_type": "true_false",
        "question": "Sound travels faster than light.",
        "options": ["True", "False"],
        "answer_index": 1,
        "explanation": "Light is much faster than sound, which is why you see lightning before you hear thunder.",
        "image_url": None,
    },
    {
        "class_level": "B8",
        "subject": "Science",
        "strand": "Forces and Energy",
        "topic": "Electric circuits",
        "difficulty": "Medium",
        "question_type": "true_false",
        "question": "If one bulb in a series circuit burns out, the other bulbs in that loop go out too.",
        "options": ["True", "False"],
        "answer_index": 0,
        "explanation": "A series circuit has one path. A broken filament opens the path so current cannot flow.",
        "image_url": None,
    },
    {
        "class_level": "B8",
        "subject": "Computing",
        "strand": "Information Security",
        "topic": "Secure websites",
        "difficulty": "Easy",
        "question_type": "true_false",
        "question": "It is safer to type a password on a site that uses http (no s) than on https.",
        "options": ["True", "False"],
        "answer_index": 1,
        "explanation": "https with a padlock means the connection is encrypted. http is not encrypted.",
        "image_url": None,
    },
    {
        "class_level": "B9",
        "subject": "Science",
        "strand": "Forces and Energy",
        "topic": "Pressure",
        "difficulty": "Medium",
        "question_type": "true_false",
        "question": "A sharp knife cuts more easily because the same force acts on a smaller area, so pressure is greater.",
        "options": ["True", "False"],
        "answer_index": 0,
        "explanation": "Pressure = force ÷ area. A smaller area gives greater pressure.",
        "image_url": None,
    },
    {
        "class_level": "B9",
        "subject": "Computing",
        "strand": "Software",
        "topic": "Application software",
        "difficulty": "Easy",
        "question_type": "true_false",
        "question": "Microsoft Word is an example of application software.",
        "options": ["True", "False"],
        "answer_index": 0,
        "explanation": "Application software helps you do a task such as writing. A mouse or monitor is hardware.",
        "image_url": None,
    },
]

# Batch 002 releve (class_level only; keep difficulty).
RELEVEL_002 = {
    "The internet and the World Wide Web are exactly the same thing.": {"class_level": "B8"},
    "The diagram shows a crowbar used as a lever to lift a stone. What is the part labelled F?": {
        "class_level": "B6"
    },
    "Which labelled part is often called the brain of the computer?": {"class_level": "B8"},
}

# image_mcq must have a real SVG, never a null image_url.
IMAGE_FILES = {
    "The diagram shows a crowbar used as a lever to lift a stone. What is the part labelled F?": "crowbar-lever.svg",
    "Which labelled arrow shows water turning from liquid into vapour?": "water-cycle.svg",
    "Which of these is the producer in the food chain?": "food-chain.svg",
    "Which labelled part is used to point and click?": "desktop-computer.svg",
    "Which labelled organ is mainly used for breathing?": "body-organs.svg",
    "The switch in the diagram is open. What happens to the bulb?": "open-circuit.svg",
    "Which labelled part mainly makes food by photosynthesis?": "plant-parts.svg",
    "Which labelled part is often called the brain of the computer?": "motherboard-cpu.svg",
}


def ensure_schema():
    """Idempotent ALTER so a live DB without the new columns is not wiped."""
    insp = inspect(engine)
    if "questions" not in insp.get_table_names():
        raise SystemExit(f"questions table missing in {DB_PATH}")
    cols = {c["name"] for c in insp.get_columns("questions")}
    with engine.begin() as conn:
        if "question_type" not in cols:
            print("ALTER: adding questions.question_type")
            conn.execute(
                sa_text("ALTER TABLE questions ADD COLUMN question_type VARCHAR(20) DEFAULT 'mcq'")
            )
        if "image_url" not in cols:
            print("ALTER: adding questions.image_url")
            conn.execute(sa_text("ALTER TABLE questions ADD COLUMN image_url VARCHAR(500)"))
        conn.execute(
            sa_text(
                "UPDATE questions SET question_type = 'mcq' "
                "WHERE question_type IS NULL OR question_type = ''"
            )
        )
        conn.execute(
            sa_text(
                "CREATE INDEX IF NOT EXISTS ix_questions_question_type ON questions (question_type)"
            )
        )


def load_json(path: Path):
    with path.open(encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise SystemExit(f"Expected a JSON list in {path}")
    return data


def normalise_item(raw: dict, source: str) -> dict:
    item = deepcopy(raw)
    qtype = (
        item.get("question_type")
        or item.get("qtype")
        or item.get("type")
        or "mcq"
    )
    item["question_type"] = qtype
    item.pop("type", None)
    item.pop("qtype", None)
    item.pop("confidence", None)
    item.pop("needs_review", None)
    item.pop("review_notes", None)
    item.pop("image_brief", None)
    stem = item["question"]
    if source == "batch_001":
        item.update(RELEVEL_001.get(stem, {}))
        item["question_type"] = "mcq"
        item["image_url"] = None
    elif source == "batch_002":
        item.update(RELEVEL_002.get(stem, {}))
        if item["question_type"] == "image_mcq":
            fname = IMAGE_FILES.get(stem)
            if not fname:
                raise SystemExit(f"No SVG mapping for image_mcq stem: {stem!r}")
            svg_path = BACKEND / "static" / "questions" / fname
            if not svg_path.is_file():
                raise SystemExit(f"Missing SVG {svg_path}")
            item["image_url"] = f"/media/questions/{fname}"
        else:
            item["image_url"] = item.get("image_url") or None
    item.setdefault("image_url", None)
    if item["question_type"] == "true_false":
        item["options"] = ["True", "False"]
    return item


def to_question(item: dict) -> Question:
    qtype = item["question_type"]
    opts = pad_options(qtype, item.get("options") or [])
    return Question(
        class_level=item["class_level"],
        subject=item["subject"],
        topic=item["topic"],
        strand=item["strand"],
        difficulty=item["difficulty"],
        question=item["question"],
        option_a=opts[0],
        option_b=opts[1],
        option_c=opts[2],
        option_d=opts[3],
        answer_index=item["answer_index"],
        explanation=item["explanation"],
        question_type=qtype,
        image_url=item.get("image_url") or None,
        is_active=True,
    )


def main():
    if not DB_PATH.is_file():
        raise SystemExit(f"Live DB not found: {DB_PATH}")

    batch1_path = DRAFTS / "scribe_batch_001.json"
    batch2_path = DRAFTS / "scribe_batch_002.json"
    if not batch1_path.is_file() or not batch2_path.is_file():
        raise SystemExit(f"Missing draft JSON under {DRAFTS}")

    print(f"DB: {DB_PATH}")
    try:
        ensure_schema()
    except Exception as exc:
        print("ERROR: schema ALTER/write failed (uvicorn may hold a lock):", exc)
        raise

    planned = []
    for raw in load_json(batch1_path):
        planned.append(("batch_001", normalise_item(raw, "batch_001")))
    for item in TRUE_FALSE_EXTRA:
        planned.append(("tf_extra", deepcopy(item)))
    for raw in load_json(batch2_path):
        planned.append(("batch_002", normalise_item(raw, "batch_002")))

    # Snapshot of the approved payload (after releve, with image_url).
    snapshot = [item for _, item in planned]
    APPROVED_JSON.parent.mkdir(parents=True, exist_ok=True)
    APPROVED_JSON.write_text(
        json.dumps(snapshot, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(f"Wrote approved snapshot: {APPROVED_JSON} ({len(snapshot)} items)")

    db = SessionLocal()
    skipped = []
    inserted = Counter()
    inserted_by_source = Counter()
    try:
        existing_stems = {s for (s,) in db.query(Question.question).all() if s}
        seen_this_run = set(existing_stems)
        before = len(existing_stems)
        print(f"Existing questions: {before}")

        for source, item in planned:
            stem = item["question"]
            if stem in seen_this_run:
                skipped.append({"source": source, "question_type": item["question_type"], "question": stem})
                continue
            db.add(to_question(item))
            seen_this_run.add(stem)
            inserted[item["question_type"]] += 1
            inserted_by_source[f"{source}:{item['question_type']}"] += 1

        db.commit()

        total = db.query(Question).count()
        type_counts = {
            qtype: n
            for qtype, n in db.query(Question.question_type, func.count(Question.id))
            .group_by(Question.question_type)
            .all()
        }

        print("--- import summary ---")
        print(f"skipped duplicates: {len(skipped)}")
        for s in skipped:
            print(f"  skip [{s['source']}] {s['question_type']}: {s['question']}")
        print(f"inserted mcq: {inserted['mcq']}")
        print(f"inserted true_false: {inserted['true_false']}")
        print(f"inserted image_mcq: {inserted['image_mcq']}")
        print("batch_001 inserted:", {k.split(':',1)[1]: v for k, v in inserted_by_source.items() if k.startswith('batch_001:')})
        print("tf_extra inserted:", {k.split(':',1)[1]: v for k, v in inserted_by_source.items() if k.startswith('tf_extra:')})
        print("batch_002 inserted:", {k.split(':',1)[1]: v for k, v in inserted_by_source.items() if k.startswith('batch_002:')})
        print(f"new total questions: {total}")
        print(f"counts by question_type: {type_counts}")
        print(f"(before={before}, inserted={sum(inserted.values())}, skipped={len(skipped)})")
    except Exception as exc:
        db.rollback()
        print("ERROR: insert failed (uvicorn may hold a lock):", exc)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
