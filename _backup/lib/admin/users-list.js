// api/admin/users-list.js — GET /admin/users
const { query, fetchAll } = require('../shared/db');
const { currentAdmin, requirePermission } = require('../shared/auth-admin');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ detail: 'Method not allowed' });
  const admin = currentAdmin(req);
  requirePermission(admin, 'users');
  const q = req.query || {};

  const conditions = ['is_guest = 0'];
  const params = [];

  const search = (q.search || '').trim();
  if (search) { conditions.push('nickname LIKE ?'); params.push(`%${search}%`); }
  if (q.school_code) { conditions.push('school_code = ?'); params.push(q.school_code); }

  const limit = Math.min(500, Math.max(1, parseInt(q.limit || 100)));
  const offset = Math.max(0, parseInt(q.offset || 0));

  const rows = await fetchAll(
    `SELECT * FROM users WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
    params
  );

  const activeSessionIds = (await fetchAll(
    'SELECT DISTINCT user_id FROM quiz_sessions WHERE status = \'active\'',
    []
  )).map(r => r.user_id);

  const out = rows.map(u => ({
    id: parseInt(u.id),
    nickname: u.nickname,
    class_level: u.class_level,
    school_code: u.school_code,
    is_guest: !!u.is_guest,
    created_at: u.created_at,
    last_played: u.last_played,
    lifetime_score: parseInt(u.lifetime_score || 0),
    total_questions: parseInt(u.total_questions || 0),
    total_correct: parseInt(u.total_correct || 0),
    accuracy: (parseInt(u.total_questions || 0) > 0)
      ? Math.round((parseInt(u.total_correct || 0) / parseInt(u.total_questions || 1)) * 10000) / 10000
      : 0.0,
    account_status: u.is_active ? 'active' : 'disabled',
    is_online: activeSessionIds.includes(parseInt(u.id)),
  }));

  return res.status(200).json(out);
};