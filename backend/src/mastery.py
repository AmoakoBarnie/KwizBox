"""Mastery scoring.

A topic is 'mastered' only with both high accuracy AND enough attempts that the
result is trustworthy. Someone with 4/5 correct (80%) on 5 attempts is NOT
mastered — confidence is still low. We follow the user's skeleton:

    confidence = min(attempts / REQUIRED_ATTEMPTS, 1.0)
    mastery    = accuracy * confidence
    mastered   = mastery >= MASTERY_THRESHOLD and attempts >= MIN_ATTEMPTS
"""
from typing import Literal

MIN_ATTEMPTS = 5            # need at least this many attempts before mastery counts
REQUIRED_ATTEMPTS = 10      # attempts at which confidence saturates to 1.0
MASTERY_THRESHOLD = 0.80    # mastery score (0..1) needed to be "mastered"


def calculate_mastery(accuracy: float, attempts: int) -> float:
    """Return mastery in [0, 1]."""
    if attempts < MIN_ATTEMPTS or accuracy is None:
        return 0.0
    confidence = min(attempts / REQUIRED_ATTEMPTS, 1.0)
    return accuracy * confidence


def is_mastered(accuracy: float, attempts: int) -> bool:
    if attempts < MIN_ATTEMPTS:
        return False
    return calculate_mastery(accuracy, attempts) >= MASTERY_THRESHOLD
