/**
 * Code-config badge catalog (v1 — stored in code, DB later per PHASE2).
 * Each badge has a unique id, display info, and the rule to earn it.
 */
export const BADGES = [
  { id: 'first_quiz',    name: 'First Quiz',    desc: 'Complete your first quiz',           icon: '🎯' },
  { id: 'streak_3',      name: 'On Fire',        desc: 'Get a 3-question streak',            icon: '🔥' },
  { id: 'streak_5',      name: 'Blazing',        desc: 'Get a 5-question streak',            icon: '🌟' },
  { id: 'perfect_12',    name: 'Perfect Run',    desc: 'Get 100% on a 12-question quiz',     icon: '💎' },
  { id: 'score_500',     name: 'Scholar',        desc: 'Earn 500 lifetime points',           icon: '📚' },
  { id: 'score_1000',    name: 'Master',         desc: 'Earn 1000 lifetime points',          icon: '👑' },
  { id: 'subject_math',  name: 'Mathlete',       desc: 'Answer 20 Math questions correctly', icon: '➗' },
  { id: 'subject_sci',   name: 'Scientist',      desc: 'Answer 20 Science questions correctly', icon: '🔬' },
  { id: 'subject_comp',  name: 'Coder',          desc: 'Answer 20 Computing questions correctly', icon: '💻' },
  { id: 'accuracy_90',   name: 'Sharp Mind',     desc: 'Reach 90% overall accuracy',         icon: '🧠' },
  { id: 'class_b4',      name: 'Rising Star',    desc: 'Complete a quiz at class B4',        icon: '🌱' },
  { id: 'class_b9',      name: 'JHS Veteran',    desc: 'Complete a quiz at class B9',        icon: '🎓' },
]

const BADGE_KEY = 'stem_badges'

/** Load earned badge IDs from localStorage (survives sessions). */
export function loadBadges() {
  try {
    return JSON.parse(localStorage.getItem(BADGE_KEY) || '[]')
  } catch {
    return []
  }
}

/** Save earned badge IDs to localStorage. */
export function saveBadges(earned) {
  try { localStorage.setItem(BADGE_KEY, JSON.stringify(earned)) } catch {}
}

/**
 * Evaluate which new badges should be awarded based on a quiz result.
 * Returns an array of newly-earned badge objects (already shown).
 */
export function evaluateBadges(result, cfg, earned) {
  const { total, correct, accuracy, score, streak } = result
  const pct = Math.round(accuracy * 100)
  const newEarned = [...earned]

  function grant(id) {
    if (!newEarned.includes(id)) {
      newEarned.push(id)
    }
  }

  if (total >= 1) grant('first_quiz')
  if (streak >= 3) grant('streak_3')
  if (streak >= 5) grant('streak_5')
  if (pct === 100 && total >= 12) grant('perfect_12')
  if (score >= 500) grant('score_500')
  if (score >= 1000) grant('score_1000')
  if (pct >= 90) grant('accuracy_90')
  if (cfg?.class_level === 'B4') grant('class_b4')
  if (cfg?.class_level === 'B9') grant('class_b9')

  // Subject badges: count correct answers per subject across all feedback
  return { newBadges: newEarned, newlyAwarded: newEarned.filter((id) => !earned.includes(id)) }
}
