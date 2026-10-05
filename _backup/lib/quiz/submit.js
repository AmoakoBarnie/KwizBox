// api/quiz/submit.js — POST /api/quiz/submit
const { json, ok, error } = require('../shared/response');
const { query, fetchAll, fetchOne, lastInsertId } = require('../shared/db');
const { currentUser } = require('../shared/auth');
const { questionPoints } = require('../shared/scoring');

function round2(n) {
  return Math.round((n + Number.EPSILON) * 10000) / 10000;
}

function isoDate(date) {
  return date.getFullYear() + '-' +
    String(date.getMonth() + 1).padStart(2, '0') + '-' +
    String(date.getDate()).padStart(2, '0');
}

function daysBetween(dateStr1, dateStr2) {
  const d1 = new Date(dateStr1 + 'T00:00:00Z');
  const d2 = new Date(dateStr2 + 'T00:00:00Z');
  return Math.round((d2 - d1) / 86400000);
}
const { publicOptions } = require('../shared/questionTypes');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return error(res, 'Method not allowed', 405);

  const body = req.body || {};
  const questionIds = (body.question_ids || []).map(Number);
  const answers = body.answers || [];
  const classLevel = (body.class_level || '').trim();
  const subject = (body.subject || 'Mixed').trim();
  const difficulty = (body.difficulty || '').trim();
  const topic = (body.topic || '').trim();
  const durationSeconds = body.duration_seconds != null ? parseInt(body.duration_seconds) : null;
  const daily = !!(body.daily || false);

  // Validate: question_ids must match answer question_ids
  const ansQids = answers.map(a => parseInt(a.question_id || 0)).sort((a, b) => a - b);
  const sortedQids = [...questionIds].sort((a, b) => a - b);
  if (JSON.stringify(ansQids) !== JSON.stringify(sortedQids)) {
    return error(res, 'question_ids must match answer question_ids', 400);
  }

  // Fetch questions
  const questions = {};
  if (questionIds.length > 0) {
    const placeholders = questionIds.map(() => '?').join(',');
    const rows = await fetchAll(
      `SELECT * FROM questions WHERE id IN (${placeholders})`,
      questionIds
    );
    for (const q of rows) questions[q.id] = q;
  }

  const total = answers.length;
  let correct = 0;
  let score = 0;
  const feedback = [];
  const perDiff = {};
  const perQuestionPoints = [];
  let runningStreak = 0;

  for (const ans of answers) {
    const qid = parseInt(ans.question_id || 0);
    const selectedIndex = parseInt(ans.selected_index || -1);
    const secondsTaken = ans.seconds_taken != null ? parseFloat(ans.seconds_taken) : null;

    if (!questions[qid]) continue;

    const q = questions[qid];
    const isCorrect = selectedIndex === parseInt(q.answer_index);
    let pts = 0;

    if (isCorrect) {
      correct++;
      runningStreak++;
      pts = questionPoints(q.difficulty, secondsTaken, runningStreak);
      score += pts;
      perDiff[q.difficulty] = (perDiff[q.difficulty] || 0) + pts;
    } else {
      runningStreak = 0;
    }

    perQuestionPoints.push({ question_id: qid, points: pts });

    // Update question usage stats
    await query(
      `UPDATE questions SET times_answered = times_answered + 1` +
      (isCorrect ? ', times_correct = times_correct + 1' : '') +
      ` WHERE id = ?`,
      [qid]
    );

    feedback.push({
      question_id: qid,
      selected_index: selectedIndex,
      correct_index: parseInt(q.answer_index),
      is_correct: isCorrect,
      explanation: q.explanation || null,
      question: q.question,
      options: publicOptions(q.question_type, q.option_a, q.option_b, q.option_c, q.option_d),
      points: pts,
    });
  }

  const accuracy = total > 0 ? round2(correct / total) : 0.0;

  const user = currentUser(req);
  const userId = user ? parseInt(user.sub) : null;
  let sessionId = null;
  let newStreak = 0;

  if (userId !== null) {
    // Find most recent active session
    const sessRows = await fetchAll(
      `SELECT id FROM quiz_sessions WHERE user_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1`,
      [userId]
    );

    if (sessRows.length > 0) {
      sessionId = sessRows[0].id;
      await query(
        `UPDATE quiz_sessions SET class_level = ?, subject = ?, difficulty = ?, topic = ?,
         total = ?, correct = ?, score = ?, accuracy = ?, duration_seconds = ?, status = 'completed',
         ended_at = NOW(), is_daily = ? WHERE id = ?`,
        [classLevel, subject || null, difficulty || null, topic || null,
         total, correct, score, accuracy, durationSeconds, daily ? 1 : 0, sessionId]
      );
    } else {
      const [result] = await query(
        `INSERT INTO quiz_sessions (user_id, class_level, subject, difficulty, topic, total, correct, score,
         accuracy, duration_seconds, status, started_at, ended_at, is_daily)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', NOW(), NOW(), ?)`,
        [userId, classLevel, subject || null, difficulty || null, topic || null,
         total, correct, score, accuracy, durationSeconds, daily ? 1 : 0]
      );
      sessionId = result.insertId;
    }

    // Get full user row
    const userRow = await fetchOne('SELECT * FROM users WHERE id = ?', [userId]);

    // Update progress
    newStreak = await updateProgress(userRow, body, questions, answers, score, userId);

    // Mark seen
    await markSeen(userId, questionIds);
  }

  return ok(res, {
    session_id: sessionId || 0,
    total,
    correct,
    accuracy,
    score,
    streak: newStreak,
    points_breakdown: perDiff,
    feedback,
    points_breakdown_list: perQuestionPoints,
  });
};

async function updateProgress(userRow, body, questions, answers, score, userId) {
  const classLevel = (body.class_level || '').trim();
  const existingScore = parseInt(userRow.lifetime_score || 0);
  const existingTotal = parseInt(userRow.total_questions || 0);
  const existingCorrect = parseInt(userRow.total_correct || 0);

  let totalCorrect = existingCorrect;
  for (const ans of answers) {
    const qid = parseInt(ans.question_id || 0);
    if (questions[qid] && parseInt(ans.selected_index || -1) === parseInt(questions[qid].answer_index)) {
      totalCorrect++;
    }
  }

  const lifetimeScore = existingScore + score;
  const totalQuestions = existingTotal + answers.length;

  // Streak logic
  const now = new Date();
  const todayStr = isoDate(now);
  const lastPlayedStr = userRow.last_played ? userRow.last_played.slice(0, 10) : null;
  let currentStreak = parseInt(userRow.current_streak || 0);
  let longestStreak = parseInt(userRow.longest_streak || 0);

  if (lastPlayedStr === null || lastPlayedStr < todayStr) {
    if (lastPlayedStr !== null) {
      const diffDays = daysBetween(lastPlayedStr, todayStr);
      if (diffDays === 1) {
        currentStreak++;
      } else {
        currentStreak = 1;
      }
    } else {
      currentStreak = 1;
    }
    longestStreak = Math.max(longestStreak, currentStreak);
  }

  await query(
    `UPDATE users SET lifetime_score = ?, total_questions = ?, total_correct = ?,
     current_streak = ?, longest_streak = ?, last_played = NOW() WHERE id = ?`,
    [lifetimeScore, totalQuestions, totalCorrect, currentStreak, longestStreak, userId]
  );

  // Subject + topic counts
  const subjCounts = {};
  const topicCounts = {};

  for (const ans of answers) {
    const qid = parseInt(ans.question_id || 0);
    if (!questions[qid]) continue;
    const q = questions[qid];
    const isCorrect = parseInt(ans.selected_index || -1) === parseInt(q.answer_index);
    const subj = q.subject;
    const tp = q.topic;

    if (!subjCounts[subj]) subjCounts[subj] = [0, 0];
    subjCounts[subj][0]++;
    if (isCorrect) subjCounts[subj][1]++;

    const key = subj + '|' + tp;
    if (!topicCounts[key]) topicCounts[key] = [0, 0, subj, tp];
    topicCounts[key][0]++;
    if (isCorrect) topicCounts[key][1]++;
  }

  // Upsert subject progress
  for (const [subj, [answered, correct]] of Object.entries(subjCounts)) {
    const existing = await fetchOne(
      `SELECT id, questions_answered, correct FROM subject_progress WHERE user_id = ? AND class_level = ? AND subject = ?`,
      [userId, classLevel, subj]
    );
    if (existing) {
      await query(
        `UPDATE subject_progress SET questions_answered = ?, correct = ? WHERE id = ?`,
        [parseInt(existing.questions_answered) + answered, parseInt(existing.correct) + correct, existing.id]
      );
    } else {
      await query(
        `INSERT INTO subject_progress (user_id, class_level, subject, questions_answered, correct) VALUES (?, ?, ?, ?, ?)`,
        [userId, classLevel, subj, answered, correct]
      );
    }
  }

  // Upsert topic progress
  for (const [key, [answered, correct, subj, tp]] of Object.entries(topicCounts)) {
    const existing = await fetchOne(
      `SELECT id FROM topic_progress WHERE user_id = ? AND class_level = ? AND subject = ? AND topic = ?`,
      [userId, classLevel, subj, tp]
    );
    const acc = answered > 0 ? correct / answered : 0.0;
    const mastery = calculateMastery(acc, answered);
    const mastered = isMastered(acc, answered);

    if (existing) {
      await query(
        `UPDATE topic_progress SET questions_answered = ?, correct = ?, mastery_score = ?, mastered = ? WHERE id = ?`,
        [answered, correct, mastery, mastered ? 1 : 0, existing.id]
      );
    } else {
      await query(
        `INSERT INTO topic_progress (user_id, class_level, subject, topic, questions_answered, correct, mastery_score, mastered)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, classLevel, subj, tp, answered, correct, mastery, mastered ? 1 : 0]
      );
    }
  }

  // Period points
  await addPeriodPoints(userId, 'weekly', weekPeriod(), score);
  await addPeriodPoints(userId, 'monthly', monthPeriod(), score);

  return currentStreak;
}

function daysBetween(dateStr1, dateStr2) {
  const d1 = new Date(dateStr1 + 'T00:00:00Z');
  const d2 = new Date(dateStr2 + 'T00:00:00Z');
  return Math.round((d2 - d1) / 86400000);
}

function isoDate(date) {
  return date.getFullYear() + '-' +
    String(date.getMonth() + 1).padStart(2, '0') + '-' +
    String(date.getDate()).padStart(2, '0');
}

async function addPeriodPoints(userId, kind, period, delta) {
  const existing = await fetchOne(
    `SELECT id, points FROM leaderboard_periods WHERE user_id = ? AND kind = ? AND period = ?`,
    [userId, kind, period]
  );
  if (existing) {
    await query(
      `UPDATE leaderboard_periods SET points = ? WHERE id = ?`,
      [parseInt(existing.points) + delta, existing.id]
    );
  } else {
    await query(
      `INSERT INTO leaderboard_periods (user_id, kind, period, points) VALUES (?, ?, ?, ?)`,
      [userId, kind, period, delta]
    );
  }
}

const { weekPeriod, monthPeriod, calculateMastery, isMastered } = require('../shared/scoring');