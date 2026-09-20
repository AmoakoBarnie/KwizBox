"""Seed the questions table from ../scripts/questions.json (or scripts/questions.json)."""
import json
import os
import sys

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# allow running from backend/ or backend/scripts/
HERE = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.dirname(HERE)
sys.path.insert(0, BACKEND)

from src.models import Base, Question  # noqa: E402
from src.question_types import pad_options, demo_questions  # noqa: E402

DB_PATH = os.path.join(BACKEND, "trivia.db")
engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)


def find_json():
    candidates = [
        os.path.join(HERE, "questions.json"),
        os.path.join(BACKEND, "scripts", "questions.json"),
        os.path.join(os.path.dirname(BACKEND), "scripts", "questions.json"),
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return None


def _row_from_json(d):
    qtype = d.get("question_type") or d.get("qtype") or "mcq"
    opts = pad_options(qtype, d.get("options") or [])
    return Question(
        id=d["id"],
        class_level=d["class_level"],
        subject=d["subject"],
        topic=d["topic"],
        strand=d["strand"],
        difficulty=d["difficulty"],
        question=d["question"],
        option_a=opts[0],
        option_b=opts[1],
        option_c=opts[2],
        option_d=opts[3],
        answer_index=d["answer_index"],
        explanation=d["explanation"],
        question_type=qtype,
        image_url=d.get("image_url") or None,
    )


def main():
    json_path = find_json()
    if not json_path:
        print("questions.json not found. Looked in:", [
            os.path.join(HERE, "questions.json"),
            os.path.join(BACKEND, "scripts", "questions.json"),
        ])
        sys.exit(1)
    with open(json_path, encoding="utf-8") as f:
        data = json.load(f)
    print(f"Loaded {len(data)} questions from {json_path}")

    Base.metadata.create_all(bind=engine)
    # Idempotent ALTER so a live trivia.db without the new columns is not wiped.
    from sqlalchemy import inspect, text as sa_text
    insp = inspect(engine)
    if "questions" in insp.get_table_names():
        cols = {c["name"] for c in insp.get_columns("questions")}
        with engine.begin() as conn:
            if "question_type" not in cols:
                conn.execute(sa_text("ALTER TABLE questions ADD COLUMN question_type VARCHAR(20) DEFAULT 'mcq'"))
            if "image_url" not in cols:
                conn.execute(sa_text("ALTER TABLE questions ADD COLUMN image_url VARCHAR(500)"))
            conn.execute(sa_text("UPDATE questions SET question_type = 'mcq' WHERE question_type IS NULL OR question_type = ''"))
    db = SessionLocal()
    try:
        existing = db.query(Question).count()
        if existing:
            print(f"Questions table already has {existing} rows; clearing for clean reseed.")
            db.query(Question).delete()
        for d in data:
            db.add(_row_from_json(d))
        # Placeholder T/F + image items (skipped if the JSON already contains the same stem)
        stems = {d["question"] for d in data}
        extra = 0
        for d in demo_questions():
            if d["question"] in stems:
                continue
            db.add(Question(**d, is_active=True))
            extra += 1
        db.commit()
        print(f"Seeded {len(data)} questions (+ {extra} type-demo placeholders) into {DB_PATH}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
