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


def main():
    json_path = find_json()
    if not json_path:
        print("questions.json not found. Looked in:", candidates if False else [
            os.path.join(HERE, "questions.json"),
            os.path.join(BACKEND, "scripts", "questions.json"),
        ])
        sys.exit(1)
    with open(json_path, encoding="utf-8") as f:
        data = json.load(f)
    print(f"Loaded {len(data)} questions from {json_path}")

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing = db.query(Question).count()
        if existing:
            print(f"Questions table already has {existing} rows; clearing for clean reseed.")
            db.query(Question).delete()
        for d in data:
            db.add(Question(
                id=d["id"],
                class_level=d["class_level"],
                subject=d["subject"],
                topic=d["topic"],
                strand=d["strand"],
                difficulty=d["difficulty"],
                question=d["question"],
                option_a=d["options"][0],
                option_b=d["options"][1],
                option_c=d["options"][2],
                option_d=d["options"][3],
                answer_index=d["answer_index"],
                explanation=d["explanation"],
            ))
        db.commit()
        print(f"Seeded {len(data)} questions into {DB_PATH}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
