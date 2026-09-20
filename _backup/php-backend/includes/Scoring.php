<?php
/**
 * Scoring rules — base points, speed bonus, streak multiplier.
 */

const DIFFICULTY_BASE = ['Easy' => 10, 'Medium' => 15, 'Hard' => 25];
const SPEED_BONUS_MAX = 5;
const SPEED_THRESHOLD_SECONDS = 12;
const STREAK_MULTIPLIER = [1 => 1.0, 2 => 1.1, 3 => 1.25, 4 => 1.5, 5 => 2.0];

function streakMultiplier(int $streak): float {
    if ($streak <= 0) return 1.0;
    if ($streak >= 5) return 2.0;
    return STREAK_MULTIPLIER[$streak] ?? 1.0;
}

/**
 * Calculate points for a single correct answer.
 */
function questionPoints(string $difficulty, ?float $secondsTaken, int $streak = 0): int {
    $base = DIFFICULTY_BASE[$difficulty] ?? 10;
    $bonus = 0;
    if ($secondsTaken !== null && $secondsTaken > 0) {
        $ratio = max(0.0, min(1.0, (SPEED_THRESHOLD_SECONDS * 3 - $secondsTaken) / (SPEED_THRESHOLD_SECONDS * 2)));
        $bonus = (int) round(SPEED_BONUS_MAX * $ratio);
    }
    $mult = streakMultiplier($streak);
    return (int) round(($base + $bonus) * $mult);
}

/**
 * Mastery calculation.
 */
const MIN_ATTEMPTS = 5;
const REQUIRED_ATTEMPTS = 10;
const MASTERY_THRESHOLD = 0.80;

function calculateMastery(float $accuracy, int $attempts): float {
    if ($attempts < MIN_ATTEMPTS || $accuracy === null) return 0.0;
    $confidence = min($attempts / REQUIRED_ATTEMPTS, 1.0);
    return $accuracy * $confidence;
}

function isMastered(float $accuracy, int $attempts): bool {
    if ($attempts < MIN_ATTEMPTS) return false;
    return calculateMastery($accuracy, $attempts) >= MASTERY_THRESHOLD;
}

/**
 * Period helpers for leaderboard.
 */
function weekPeriod(?DateTime $d = null): string {
    $d = $d ?? new DateTime();
    return $d->format('o') . '-W' . $d->format('W');
}

function monthPeriod(?DateTime $d = null): string {
    $d = $d ?? new DateTime();
    return $d->format('Y-m');
}
