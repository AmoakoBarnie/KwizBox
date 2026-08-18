"""Question-type constants, option packing, and create/update validation.

Stored columns (Question):
  question_type  str, default "mcq", indexed. Values: mcq | true_false | image_mcq
  image_url      optional public path/URL (e.g. /media/questions/lever.svg)

option_a..option_d and answer_index stay for compatibility:
  true_false  -> True/False in A/B; C/D stored as empty strings; answer_index 0 or 1
  mcq/image_mcq -> four options; answer_index 0-3
"""
from fastapi import HTTPException

MCQ = "mcq"
TRUE_FALSE = "true_false"
IMAGE_MCQ = "image_mcq"
QUESTION_TYPES = (MCQ, TRUE_FALSE, IMAGE_MCQ)

# Placeholder diagrams served from backend/static/questions via /media
DEMO_LEVER_URL = "/media/questions/lever.svg"
DEMO_COMPUTER_URL = "/media/questions/computer-parts.svg"


def public_options(question_type, option_a, option_b, option_c, option_d):
    """Options as sent to clients. true_false is length 2 (no empty C/D)."""
    if (question_type or MCQ) == TRUE_FALSE:
        return [option_a or "True", option_b or "False"]
    opts = [option_a, option_b, option_c, option_d]
    return [o if o is not None else "" for o in opts]


def options_from_question(q):
    return public_options(
        getattr(q, "question_type", None) or MCQ,
        q.option_a, q.option_b, q.option_c, q.option_d,
    )


def pad_options(question_type, options):
    """Normalise a client/JSON options list to four values for storage."""
    opts = [("" if o is None else str(o).strip()) for o in (options or [])]
    qtype = question_type or MCQ
    if qtype == TRUE_FALSE:
        filled = [o for o in opts if o]
        if len(filled) >= 2:
            a, b = filled[0], filled[1]
        elif len(opts) >= 2:
            a, b = opts[0] or "True", opts[1] or "False"
        else:
            a, b = "True", "False"
        return [a, b, "", ""]
    while len(opts) < 4:
        opts.append("")
    return opts[:4]


def validate_question_fields(question_type, options, answer_index, image_url=None, require_image=False):
    """Raise HTTPException(400) if type/options/answer/image do not match."""
    qtype = (question_type or MCQ).strip()
    if qtype not in QUESTION_TYPES:
        raise HTTPException(400, f"question_type must be one of {', '.join(QUESTION_TYPES)}")
    opts = [("" if o is None else str(o).strip()) for o in (options or [])]
    if qtype == TRUE_FALSE:
        filled = [o for o in opts if o]
        if len(opts) == 2:
            if not opts[0] or not opts[1]:
                raise HTTPException(400, "true_false requires two non-empty options")
        elif len(filled) != 2:
            raise HTTPException(400, "true_false requires exactly 2 options (True/False)")
        if answer_index not in (0, 1):
            raise HTTPException(400, "true_false answer_index must be 0 (True) or 1 (False)")
    else:
        if len(opts) != 4 or any(not o for o in opts):
            raise HTTPException(400, f"{qtype} requires exactly 4 non-empty options")
        if answer_index not in (0, 1, 2, 3):
            raise HTTPException(400, "answer_index must be 0-3")
        if qtype == IMAGE_MCQ and require_image and not (image_url or "").strip():
            raise HTTPException(400, "image_mcq requires image_url")
    return qtype


def demo_questions():
    """Placeholder rows so T/F and image_mcq can be tried without a full reseed."""
    return [
        dict(
            class_level="B4", subject="Science", topic="Forces and machines",
            strand="Diversity of matter", difficulty="Easy",
            question="A lever is a simple machine that can make it easier to lift a load.",
            option_a="True", option_b="False", option_c="", option_d="",
            answer_index=0,
            explanation="A lever is one of the simple machines. A see-saw and a crowbar are everyday levers.",
            question_type=TRUE_FALSE, image_url=None,
        ),
        dict(
            class_level="B4", subject="Science", topic="Forces and machines",
            strand="Forces and energy", difficulty="Easy",
            question="Look at the diagram. Which simple machine is shown?",
            option_a="Lever", option_b="Pulley", option_c="Inclined plane", option_d="Wheel and axle",
            answer_index=0,
            explanation="The diagram shows a lever: a rigid bar that turns on a fulcrum to lift a load.",
            question_type=IMAGE_MCQ, image_url=DEMO_LEVER_URL,
        ),
        dict(
            class_level="B4", subject="Computing", topic="Computer hardware",
            strand="Introduction to computing", difficulty="Easy",
            question="Look at the labelled diagram. Which part is used to type letters and numbers?",
            option_a="Monitor", option_b="Keyboard", option_c="Mouse", option_d="CPU (system unit)",
            answer_index=1,
            explanation="The keyboard is the input device used to type letters, numbers and symbols.",
            question_type=IMAGE_MCQ, image_url=DEMO_COMPUTER_URL,
        ),
    ]
