"""Question type coverage: default mcq, T/F pack shape, image_mcq URL, T/F grading.

Uses an isolated temp SQLite DB so the live backend/trivia.db is never touched.
Run from backend/:  venv/Scripts/python -m pytest tests/test_question_types.py -q
"""
import os
import sys
import tempfile
import unittest
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

_fd, _DB = tempfile.mkstemp(suffix=".db")
os.close(_fd)
os.environ["DATABASE_URL"] = "sqlite:///" + _DB.replace("\\", "/")

from fastapi.testclient import TestClient  # noqa: E402
from src.main import app  # noqa: E402
from src.database import SessionLocal  # noqa: E402
from src.models import Question  # noqa: E402


def _insert(**kwargs):
    defaults = dict(
        class_level="B9",
        subject="Mathematics",
        topic="Probe",
        strand="Number",
        difficulty="Easy",
        option_c="",
        option_d="",
        explanation="Because.",
        is_active=True,
    )
    defaults.update(kwargs)
    db = SessionLocal()
    try:
        q = Question(**defaults)
        db.add(q)
        db.commit()
        db.refresh(q)
        return q.id
    finally:
        db.close()


class QuestionTypeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls._cm = TestClient(app)
        cls.client = cls._cm.__enter__()

    @classmethod
    def tearDownClass(cls):
        cls._cm.__exit__(None, None, None)

    def test_default_type_is_mcq(self):
        qid = _insert(
            topic="DefaultTypeProbe",
            question="What is 2 + 2?",
            option_a="3", option_b="4", option_c="5", option_d="6",
            answer_index=1,
            # question_type omitted — SQLAlchemy default
        )
        db = SessionLocal()
        try:
            row = db.get(Question, qid)
            self.assertEqual(row.question_type, "mcq")
            self.assertIsNone(row.image_url)
        finally:
            db.close()

        pack = self.client.post("/quiz/pack", json={
            "class_level": "B9", "subject": "Mathematics",
            "difficulty": "Easy", "topic": "DefaultTypeProbe", "count": 5,
        }).json()
        self.assertTrue(pack)
        item = next(x for x in pack if x["id"] == qid)
        self.assertEqual(item["question_type"], "mcq")
        self.assertEqual(len(item["options"]), 4)
        self.assertIsNone(item.get("image_url"))
        self.assertNotIn("answer_index", item)
        self.assertNotIn("explanation", item)

    def test_true_false_pack_has_two_options_and_no_answer_leak(self):
        qid = _insert(
            subject="Science", topic="TFProbe",
            question="Water boils at 100 C at sea level.",
            option_a="True", option_b="False",
            answer_index=0, question_type="true_false",
        )
        res = self.client.post("/quiz/pack", json={
            "class_level": "B9", "subject": "Science",
            "difficulty": "Easy", "topic": "TFProbe", "count": 5,
        })
        self.assertEqual(res.status_code, 200)
        item = next(x for x in res.json() if x["id"] == qid)
        self.assertEqual(item["question_type"], "true_false")
        self.assertEqual(item["options"], ["True", "False"])
        self.assertNotIn("answer_index", item)
        self.assertNotIn("explanation", item)
        dumped = res.text
        self.assertNotIn('"answer_index"', dumped)
        self.assertNotIn("Because.", dumped)

    def test_image_mcq_includes_image_url(self):
        qid = _insert(
            subject="Computing", topic="ImgProbe",
            question="Which simple machine is shown?",
            option_a="Lever", option_b="Pulley",
            option_c="Wedge", option_d="Screw",
            answer_index=0, question_type="image_mcq",
            image_url="/media/questions/lever.svg",
        )
        pack = self.client.post("/quiz/pack", json={
            "class_level": "B9", "subject": "Computing",
            "difficulty": "Easy", "topic": "ImgProbe", "count": 5,
        }).json()
        item = next(x for x in pack if x["id"] == qid)
        self.assertEqual(item["question_type"], "image_mcq")
        self.assertEqual(item["image_url"], "/media/questions/lever.svg")
        self.assertEqual(len(item["options"]), 4)
        self.assertNotIn("answer_index", item)

    def test_submit_grades_true_false(self):
        qid = _insert(
            subject="Science", topic="TFGradeProbe",
            question="The Earth is a planet.",
            option_a="True", option_b="False",
            answer_index=0, question_type="true_false",
        )
        body = {
            "class_level": "B9", "subject": "Science", "difficulty": "Easy",
            "topic": "TFGradeProbe",
            "answers": [{"question_id": qid, "selected_index": 0}],
        }
        ok = self.client.post("/quiz/submit", json=body).json()
        self.assertEqual(ok["correct"], 1)
        self.assertTrue(ok["feedback"][0]["is_correct"])
        self.assertEqual(ok["feedback"][0]["correct_index"], 0)
        self.assertEqual(ok["feedback"][0]["options"], ["True", "False"])

        body["answers"][0]["selected_index"] = 1
        bad = self.client.post("/quiz/submit", json=body).json()
        self.assertEqual(bad["correct"], 0)
        self.assertFalse(bad["feedback"][0]["is_correct"])


if __name__ == "__main__":
    unittest.main()
