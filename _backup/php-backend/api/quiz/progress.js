// api/quiz/progress.js — GET /api/quiz/progress
const { json, ok, error } = require('../../_shared/response');
const { fetchOne, fetchAll } = require('../../_shared/db');
const { requireAuth } = require('../../_shared/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return error(res, 'Method not allowed', 405);

  const user = requireAuth(req);
  const userId = parseInt(user.sub);

  const userRow = await fetchOne('SELECT * FROM users WHERE id = ?', [userId]);
  if (!userRow) return error(res, 'User not found', 404);

  // Overall
  const overall = {
    lifetime_score: parseInt(userRow.lifetime_score || 0),
    total_questions: parseInt(userRow.total_questions || 0),
    total_correct: parseInt(userRow.total_correct || 0),
    accuracy: (parseInt(userRow.total_questions || 0) > 0)
      ? round2(parseInt(userRow.total_correct || 0) / parseInt(userRow.total_questions || 1))
      : 0.0,
    current_streak: parseInt(userRow.current_streak || 0),
    longest_streak: parseInt(userRow.longest_streak || 0),
    last_played: userRow.last_played || null,
  };

  // Subject progress
  const subjects = await fetchAll(
    'SELECT class_level, subject, questions_answered, correct FROM subject_progress WHERE user_id = ? ORDER BY class_level, subject',
    [userId]
  );

  // Topic progress (flat, not nested — matches original PHP)
  const topics = await fetchAll(
    'SELECT class_level, subject, topic, questions_answered, correct, mastery_score, mastered FROM topic_progress WHERE user_id = ? ORDER BY class_level, subject, topic',
    [userId]
  );

  return ok(res, { overall, subjects, topics });
};

function round2(n) {
  return Math.round((n + Number.EPSILON) * 10000) / 10000;
}