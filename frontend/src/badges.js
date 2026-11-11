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
  { id: 'subject_eng',   name: 'Wordsmith',      desc: 'Answer 20 English questions correctly', icon: '📖' },
  { id: 'subject_sst',   name: 'Citizen',        desc: 'Answer 20 Social Studies questions correctly', icon: '🌍' },
  { id: 'subject_fr',    name: 'Linguist',       desc: 'Answer 20 French questions correctly', icon: '🇫🇷' },
  { id: 'subject_gl',    name: 'Heritage Keeper',desc: 'Answer 20 Ghanaian Language questions correctly', icon: '🗣️' },
  { id: 'subject_hist',  name: 'Historian',      desc: 'Answer 20 History questions correctly', icon: '🏛️' },
  { id: 'subject_owwop', name: 'Community Helper',desc: 'Answer 20 Our World and Our People questions correctly', icon: '🤝' },
  { id: 'subject_ca',    name: 'Creator',        desc: 'Answer 20 Creative Arts questions correctly', icon: '🎨' },
  { id: 'subject_pe',    name: 'Athlete',        desc: 'Answer 20 Physical Education questions correctly', icon: '⚽' },
  { id: 'subject_rme',   name: 'Moral Compass',  desc: 'Answer 20 Religious and Moral Education questions correctly', icon: '🧭' },
  { id: 'subject_ct',    name: 'Technologist',   desc: 'Answer 20 Career Technology questions correctly', icon: '🛠️' },
  { id: 'subject_ar',    name: 'Arabic Explorer',desc: 'Answer 20 Arabic questions correctly', icon: '✍️' },
  { id: 'accuracy_90',   name: 'Sharp Mind',     desc: 'Reach 90% overall accuracy',         icon: '🧠' },
  { id: 'class_b4',      name: 'Rising Star',    desc: 'Complete a quiz at class B4',        icon: '🌱' },
  { id: 'class_b9',      name: 'JHS Veteran',    desc: 'Complete a quiz at class B9',        icon: '🎓' },
  // ---- Engagement badges (streaks / daily play / XP levels) ----
  { id: 'streak_8',      name: 'Unstoppable',    desc: 'Get an 8-question streak',           icon: '⚡' },
  { id: 'day_streak_3',  name: 'Consistent',     desc: 'Play 3 days in a row',               icon: '🌤️' },
  { id: 'day_streak_7',  name: 'Week Warrior',   desc: 'Play 7 days in a row',               icon: '📅' },
  { id: 'day_streak_14', name: 'Fortnight Fire', desc: 'Play 14 days in a row',              icon: '🗓️' },
  { id: 'day_streak_30', name: 'Month Master',   desc: 'Play 30 days in a row',               icon: '🏆' },
  { id: 'daily_player',  name: 'Daily Devotee',  desc: 'Complete a Daily Challenge',         icon: '☀️' },
  { id: 'level_5',       name: 'Whiz Kid',       desc: 'Reach level 5 (1000 lifetime pts)',  icon: '🧠' },
  { id: 'level_10',      name: 'Kwiz Master',    desc: 'Reach level 10 (4500 lifetime pts)', icon: '👑' },
]

const BADGE_KEY = 'kwizbox_badges'

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
  // Engagement fields (backend QuizResultResponse): best_streak = best
  // in-quiz answer streak, daily_streak = consecutive days played AFTER this
  // session, lifetime_score = total points after this session. `streak` is the
  // day streak, so the in-quiz streak badges must read best_streak (falling
  // back to `streak` for client-graded challenge results where it holds the
  // client-tracked best streak).
  const bestInQuiz = result.best_streak ?? streak
  const dayStreak = result.daily_streak ?? 0
  const lifetime = result.lifetime_score ?? score
  const newEarned = [...earned]

  function grant(id) {
    if (!newEarned.includes(id)) {
      newEarned.push(id)
    }
  }

  if (total >= 1) grant('first_quiz')
  if (bestInQuiz >= 3) grant('streak_3')
  if (bestInQuiz >= 5) grant('streak_5')
  if (bestInQuiz >= 8) grant('streak_8')
  if (pct === 100 && total >= 12) grant('perfect_12')
  if (score >= 500) grant('score_500')
  if (score >= 1000) grant('score_1000')
  if (pct >= 90) grant('accuracy_90')
  if (cfg?.class_level === 'B4') grant('class_b4')
  if (cfg?.class_level === 'B9') grant('class_b9')

  // Streak calendar: consecutive days played (server-computed on submit)
  if (dayStreak >= 3) grant('day_streak_3')
  if (dayStreak >= 7) grant('day_streak_7')
  if (dayStreak >= 14) grant('day_streak_14')
  if (dayStreak >= 30) grant('day_streak_30')
  // Daily challenge participation
  if (cfg?.daily) grant('daily_player')
  // XP levels (thresholds mirror backend/src/xp.py: lvl 5 = 1000, lvl 10 = 4500)
  if (lifetime >= 1000) grant('level_5')
  if (lifetime >= 4500) grant('level_10')

  // Subject badges: count correct answers per subject across all feedback
  const subjectBadgeMap = {
    mathematics: 'subject_math',
    science: 'subject_sci',
    computing: 'subject_comp',
    english: 'subject_eng',
    'social studies': 'subject_sst',
    french: 'subject_fr',
    'ghanaian language': 'subject_gl',
    history: 'subject_hist',
    'our world and our people': 'subject_owwop',
    'creative arts': 'subject_ca',
    'physical education': 'subject_pe',
    'religious and moral education': 'subject_rme',
    'career technology': 'subject_ct',
    arabic: 'subject_ar',
  }
  const subjectCounts = {}
  result.feedback?.forEach((f) => {
    if (f.is_correct) {
      const subj = (cfg?.subject || '').toLowerCase()
      if (subj) subjectCounts[subj] = (subjectCounts[subj] || 0) + 1
    }
  })
  Object.entries(subjectBadgeMap).forEach(([subj, badgeId]) => {
    if ((subjectCounts[subj] || 0) >= 20) grant(badgeId)
  })

  return { newBadges: newEarned, newlyAwarded: newEarned.filter((id) => !earned.includes(id)) }
}
