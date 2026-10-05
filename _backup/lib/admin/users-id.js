// api/admin/users-id.js — GET /admin/users/:id
const { query, fetchAll, fetchOne } = require('../shared/db');
const { currentAdmin, requirePermission } = require('../shared/auth-admin');

module.exports = async function handler(req, res, params) {
  if (req.method !== 'GET') return res.status(405).json({ detail: 'Method not allowed' });
  const admin = currentAdmin(req);
  requirePermission(admin, 'users');
  const userId = parseInt(params.id);

  const u = await fetchOne('SELECT * FROM users WHERE id = ? AND is_guest = 0', [userId]);
  if (!u) return res.status(404).json({ detail: 'user not found' });

  const sessions = await fetchAll(
    'SELECT * FROM quiz_sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
    [userId]
  );
  const school = u.school_code
    ? await fetchOne('SELECT * FROM school_codes WHERE code = ?', [u.school_code])
    : null;

  const games = sessions.map(s => ({
    id: parseInt(s.id),
    date: s.ended_at || s.created_at,
    score: parseInt(s.score || 0),
    total: parseInt(s.total || 0),
    correct: parseInt(s.correct || 0),
    subject: s.subject,
    status: s.status,
    accuracy: parseFloat(s.accuracy || 0),
  }));

  const subjRows = await fetchAll(
    'SELECT * FROM subject_progress WHERE user_id = ?',
    [userId]
  );
  const subjectAccuracy = subjRows.map(s => ({
    subject: s.subject,
    accuracy: parseInt(s.questions_answered || 0) > 0
      ? round2(parseInt(s.correct || 0) / parseInt(s.questions_answered || 1))
      : 0.0,
    questions: parseInt(s.questions_answered || 0),
  }));

  const masteredCount = (await query(
    'SELECT COUNT(*) as cnt FROM topic_progress WHERE user_id = ? AND mastered = 1',
    [userId]
  ))[0].cnt;

  return res.status(200).json({
    id: parseInt(u.id),
    nickname: u.nickname,
    full_name: u.full_name,
    class_level: u.class_level,
    school_code: u.school_code,
    school: school ? school.school : null,
    is_guest: !!u.is_guest,
    created_at: u.created_at,
    last_played: u.last_played,
    lifetime_score: parseInt(u.lifetime_score || 0),
    total_questions: parseInt(u.total_questions || 0),
    total_correct: parseInt(u.total_correct || 0),
    accuracy: (parseInt(u.total_questions || 0) > 0)
      ? round2(parseInt(u.total_correct || 0) / parseInt(u.total_questions || 1))
      : 0.0,
    current_streak: parseInt(u.current_streak || 0),
    longest_streak: parseInt(u.longest_streak || 0),
    account_status: u.is_active ? 'active' : 'disabled',
    games_played: games.length,
    games,
    subject_accuracy: subjectAccuracy,
    mastered_count: parseInt(masteredCount),
  });
};

function round2(n) { return Math.round((n + Number.EPSILON) * 10000) / 10000; }