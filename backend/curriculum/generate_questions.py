"""Question generation helper for curriculum topics/strands.

Usage examples:
  python backend/curriculum/generate_questions.py \
    --topic "Diversity of Matter > Living and Non-Living Things" \
    --class_level B4 \
    --subject Science \
    --count 12

  python backend/curriculum/generate_questions.py \
    --topic "Number and Numeration Systems" \
    --class_level B7 \
    --subject Mathematics \
    --count 20 \
    --output /tmp/math-b7-numbers.json

This is intentionally a local authoring helper, not an AI API wrapper.
"""
from __future__ import annotations

import argparse
import json
import random
import textwrap
from pathlib import Path
from typing import Optional

OUTPUT_DIR = Path("/media/stephen/FILES/MyShit/ghana-stem-trivia/backend/curriculum/output")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


STEM_ROWS = [
    ("The Earth orbits around the Sun.", "True", "False", "True"),
    ("Plants release oxygen during photosynthesis.", "True", "False", "True"),
    ("Matter can be recycled in an ecosystem.", "True", "False", "True"),
    ("Force is measured in joules.", "False", "True", "False"),
    ("Evaporation is a cooling process.", "True", "False", "True"),
]

GENERIC_TEMPLATES = [
    lambda topic, level, subject: {
        "question": f"Which of the following best describes a topic in {subject} at {level}: {topic}?",
        "options": [
            "A statement about living things only",
            "A statement about forces and energy",
            "A statement relevant to the selected topic",
            "A statement about historical events only",
        ],
        "answer_index": 2,
        "explanation": f"This is a generated scaffold for {topic}. Replace with curriculum-specific content.",
    },
    lambda topic, level, subject: {
        "question": f"Learners at {level} should be able to identify an example related to {topic} in {subject}.",
        "options": [
            "An unrelated concept from another subject",
            "An example tied to the selected topic",
            "A random guess",
            "An answer that cannot be justified",
        ],
        "answer_index": 1,
        "explanation": f"This generated question targets the topic: {topic}.",
    },
    lambda topic, level, subject: {
        "question": f"A valid learning outcome for {topic} at {level} is to:",
        "options": [
            "Ignore the content standard",
            "Memorize definitions only",
            "Apply the idea in a new context",
            "Avoid classroom activities",
        ],
        "answer_index": 2,
        "explanation": f"Curricula emphasize application for {topic} at {level}.",
    },
]


def build_questions(topic: str, class_level: str, subject: str, count: int, seed: Optional[int] = None) -> list[dict]:
    if seed is not None:
        random.seed(seed)
    out = []
    templates = list(GENERIC_TEMPLATES)
    for i in range(count):
        tmpl = templates[i % len(templates)]
        item = tmpl(topic, class_level, subject)
        item.update({
            "class_level": class_level,
            "subject": subject,
            "topic": topic,
            "strand": topic.split(" > ")[0] if " > " in topic else topic,
            "difficulty": random.choice(["Easy", "Medium", "Hard"]),
            "question_type": "mcq",
            "image_url": None,
            "is_active": True,
        })
        out.append(item)
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate scaffold questions from curriculum topics.")
    parser.add_argument("--topic", required=True, help="Topic/strand/sub-strand label")
    parser.add_argument("--class_level", default="B4")
    parser.add_argument("--subject", default="Science")
    parser.add_argument("--count", type=int, default=12)
    parser.add_argument("--seed", type=int, default=None)
    parser.add_argument("--output", default=str(OUTPUT_DIR / "generated-questions.json"))
    args = parser.parse_args()
    qs = build_questions(args.topic, args.class_level, args.subject, args.count, args.seed)
    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(qs, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Generated {len(qs)} questions: {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
