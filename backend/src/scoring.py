"""Scoring rules for the MVP.

Base points per correct answer, scaled by difficulty, plus a small speed bonus.
- Easy:   10 base
- Medium: 15 base
- Hard:   25 base
Speed bonus: up to +5 if answered within a generous threshold (per-question avg < 12s).
Wrong answers award 0 but always carry an explanation (handled in route).
"""
from typing import Literal

DIFFICULTY_BASE = {"Easy": 10, "Medium": 15, "Hard": 25}
SPEED_BONUS_MAX = 5
SPEED_THRESHOLD_SECONDS = 12  # avg seconds per question to earn full speed bonus


def question_points(difficulty: Literal["Easy", "Medium", "Hard"], seconds_taken: float | None) -> int:
    base = DIFFICULTY_BASE[difficulty]
    bonus = 0
    if seconds_taken is not None and seconds_taken > 0:
        # linear falloff: full bonus under threshold, zero at 3x threshold
        ratio = max(0.0, min(1.0, (SPEED_THRESHOLD_SECONDS * 3 - seconds_taken) / (SPEED_THRESHOLD_SECONDS * 2)))
        bonus = round(SPEED_BONUS_MAX * ratio)
    return base + bonus
