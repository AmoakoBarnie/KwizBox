"""Scoring rules — base points, speed bonus, streak multiplier.

Base points per correct answer, scaled by difficulty, plus:
- Speed bonus: up to +5 if answered quickly (per-question time).
- Streak multiplier: consecutive correct answers multiply base points.
  Streak of 1 = 1.0x, 2 = 1.1x, 3 = 1.25x, 4 = 1.5x, 5+ = 2.0x.
Wrong answers award 0 but always carry an explanation.
"""
from typing import Literal

DIFFICULTY_BASE = {"Easy": 10, "Medium": 15, "Hard": 25}
SPEED_BONUS_MAX = 5
SPEED_THRESHOLD_SECONDS = 12  # avg seconds per question to earn full speed bonus
STREAK_MULTIPLIER = {
    1: 1.0,
    2: 1.1,
    3: 1.25,
    4: 1.5,
    5: 2.0,
}  # streak >= 5 => 2.0x


def _streak_multiplier(streak: int) -> float:
    if streak <= 0:
        return 1.0
    if streak >= 5:
        return 2.0
    return STREAK_MULTIPLIER[streak]


def question_points(
    difficulty: Literal["Easy", "Medium", "Hard"],
    seconds_taken: float | None,
    streak: int = 0,
) -> int:
    """Points for a single correct answer.

    streak: consecutive correct answers so far (0 = first question or broken).
    """
    base = DIFFICULTY_BASE[difficulty]
    # Speed bonus
    bonus = 0
    if seconds_taken is not None and seconds_taken > 0:
        ratio = max(0.0, min(1.0, (SPEED_THRESHOLD_SECONDS * 3 - seconds_taken) / (SPEED_THRESHOLD_SECONDS * 2)))
        bonus = round(SPEED_BONUS_MAX * ratio)
    # Streak multiplier applies to (base + speed_bonus)
    mult = _streak_multiplier(streak)
    return round((base + bonus) * mult)
