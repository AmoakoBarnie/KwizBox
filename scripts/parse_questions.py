#!/usr/bin/env python3
"""Parse the extracted PDF text into structured questions.json.

Input: ../../documents/extracted_py.txt (produced by pdftotext/fitz)
Output: questions.json  (list of question dicts)

Each question dict:
  id, class_level (B4..B9), subject (Mathematics|Science|Computing),
  topic (Strand/Sub-strand, up to first bullet), strand (first segment),
  difficulty (Easy|Medium|Hard),
  question (text), options [A,B,C,D], answer (letter), answer_index (0..3),
  explanation (text)
"""
import json
import re
import sys

SRC = "extracted_py.txt"
OUT = "questions.json"

CLASS_MAP = {"B4": "B4", "B5": "B5", "B6": "B6", "B7": "B7", "B8": "B8", "B9": "B9"}
SUBJECT_MAP = {"Mathematics": "Mathematics", "Science": "Science", "Computing": "Computing"}

current_class = None
current_subject = None
questions = []


def parse_qblock(raw: str, class_level: str, subject: str):
    """raw = a single Q-line possibly spanning multiple physical lines."""
    m = re.match(r"Q(\d+)\s*\((.*?)\s*•\s*(.*?)\)\s*(.*)", raw, re.DOTALL)
    if not m:
        return None
    qnum = int(m.group(1))
    topic = m.group(2).strip()
    difficulty = m.group(3).strip()
    body = m.group(4).strip()
    # options: A) ... B) ... C) ... D) ... then Answer: X Explanation: ...
    opt_re = re.search(
        r"A\)\s*(.*?)\s*B\)\s*(.*?)\s*C\)\s*(.*?)\s*D\)\s*(.*?)\s*Answer:\s*([A-Da-d])",
        body, re.DOTALL)
    if not opt_re:
        return None
    opts = [opt_re.group(i).strip() for i in range(1, 5)]
    answer_letter = opt_re.group(5).upper()
    ans_idx = ord(answer_letter) - ord("A")
    # explanation after Answer: X
    expl_split = re.split(r"Answer:\s*[A-Da-d]\s*", body, maxsplit=1)
    explanation = expl_split[1].strip() if len(expl_split) > 1 else ""
    explanation = re.sub(r"^Explanation:\s*", "", explanation, flags=re.IGNORECASE).strip()
    strand = topic.split("/")[0].strip()
    return {
        "id": qnum,
        "class_level": class_level,
        "subject": subject,
        "topic": topic,
        "strand": strand,
        "difficulty": difficulty,
        "question": None,  # filled below (question text = body before A))
        "question": body[:body.find("A)")].strip(),
        "options": opts,
        "answer": answer_letter,
        "answer_index": ans_idx,
        "explanation": explanation,
    }


def parse_answerkey(text):
    """Parse the trailing Answer Key table: Q# letter pairs across lines."""
    m = re.search(r"Answer Key \(Quick Reference\)(.*)", text, re.DOTALL)
    key = {}
    if not m:
        return key
    block = m.group(1)
    # pairs like "1 C", "101 B", possibly split across lines: "102\nD"
    # join all whitespace then regex Qnum letter
    flat = re.sub(r"\s+", " ", block)
    for qnum_s, letter in re.findall(r"(\d+)\s+([A-Da-d])", flat):
        key[int(qnum_s)] = letter.upper()
    return key


def main():
    with open(SRC, encoding="utf-8") as f:
        text = f.read()

    # Normalise: join lines that are continuations. A new record starts with
    # "Q<num>" (a question) or a class/subject header. We split on these markers
    # but keep the surrounding text. Simpler: split into lines, then accumulate.
    lines = text.split("\n")
    buf = ""
    current_class = None
    current_subject = None
    for line in lines:
        s = line.strip()
        if s.startswith("Q") and re.match(r"^Q\d+", s):
            # flush previous buffer
            if buf.strip():
                q = parse_qblock(buf, current_class, current_subject)
                if q:
                    questions.append(q)
            buf = s
        elif re.match(r"^B[4-9]\s*\(", s):
            # class header line, e.g. "B4 (Primary 4)" on its own line
            if buf.strip():
                q = parse_qblock(buf, current_class, current_subject)
                if q:
                    questions.append(q)
            buf = ""
            m = re.match(r"^B(\d)", s)
            current_class = "B" + m.group(1) if m else current_class
        elif s in ("Mathematics", "Science", "Computing"):
            if buf.strip():
                q = parse_qblock(buf, current_class, current_subject)
                if q:
                    questions.append(q)
            buf = ""
            current_subject = s
        else:
            buf += " " + s
    if buf.strip():
        q = parse_qblock(buf, current_class, current_subject)
        if q:
            questions.append(q)

    # Drop any malformed (missing class/subject) before sorting
    malformed = [q for q in questions if not q["class_level"] or not q["subject"]]
    for q in malformed:
        print(f"WARNING malformed Q{q['id']}: class={q['class_level']} subject={q['subject']}")
    questions[:] = [q for q in questions if q["class_level"] and q["subject"]]
    questions.sort(key=lambda q: q["id"])

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)
    print(f"Wrote {OUT} ({len(questions)} questions)")

    key = parse_answerkey(text)
    mismatches = []
    for q in questions:
        k = key.get(q["id"])
        if k and k != q["answer"]:
            mismatches.append((q["id"], q["answer"], k))

    print(f"Parsed {len(questions)} questions")
    if mismatches:
        print("ANSWER-KEY MISMATCHES:", mismatches)
    else:
        print("Answer key cross-check: OK (all parsed answers match PDF answer key)")

    # Per-class/subject counts
    from collections import Counter
    cc = Counter((q["class_level"], q["subject"]) for q in questions)
    for k in sorted(cc):
        print(f"  {k[0]} {k[1]:12} {cc[k]}")

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
