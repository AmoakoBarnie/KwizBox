// api/_shared/scoring.js — points, mastery, period helpers

const DIFFICULTY_BASE = { Easy: 10, Medium: 15, Hard: 25 };
const SPEED_BONUS_MAX = 5;
const SPEED_THRESHOLD_SECONDS = 12;
const STREAK_MULTIPLIER = { 1: 1.0, 2: 1.1, 3: 1.25, 4: 1.5, 5: 2.0 };

const MIN_ATTEMPTS = 5;
const REQUIRED_ATTEMPTS = 10;
const MASTERY_THRESHOLD = 0.80;

function streakMultiplier(streak) {
  if (streak <= 0) return 1.0;
  if (streak >= 5) return 2.0;
  return STREAK_MULTIPLIER[streak] ?? 1.0;
}

function questionPoints(difficulty, secondsTaken, streak = 0) {
  const base = DIFFICULTY_BASE[difficulty] ?? 10;
  let bonus = 0;
  if (secondsTaken !== null && secondsTaken > 0) {
    const ratio = Math.max(0, Math.min(1, (SPEED_THRESHOLD_SECONDS * 3 - secondsTaken) / (SPEED_THRESHOLD_SECONDS * 2)));
    bonus = Math.round(SPEED_BONUS_MAX * ratio);
  }
  const mult = streakMultiplier(streak);
  return Math.round((base + bonus) * mult);
}

function calculateMastery(accuracy, attempts) {
  if (attempts < MIN_ATTEMPTS || accuracy === null) return 0.0;
  const confidence = Math.min(attempts / REQUIRED_ATTEMPTS, 1.0);
  return accuracy * confidence;
}

function isMastered(accuracy, attempts) {
  if (attempts < MIN_ATTEMPTS) return false;
  return calculateMastery(accuracy, attempts) >= MASTERY_THRESHOLD;
}

function weekPeriod(date) {
  const d = date || new Date();
  const y = d.getUTCFullYear();
  const w = getWeek(d);
  return `${y}-W${w}`;
}

function monthPeriod(date) {
  const d = date || new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function getWeek(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

module.exports = { questionPoints, calculateMastery, isMastered, weekPeriod, monthPeriod };