// api/auth/delete.js — DELETE /api/auth/me
const { json, ok, noContent, error } = require('../shared/response');
const { execute, fetchOne } = require('../shared/db');
const { requireAuth, verifyPassword } = require('../shared/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'DELETE') return error(res, 'Method not allowed', 405);

  const user = requireAuth(req);
  const userId = parseInt(user.sub);
  const body = req.body || {};

  const row = await fetchOne('SELECT * FROM users WHERE id = ?', [userId]);
  if (!row) return error(res, 'User not found', 404);

  if (!row.is_guest) {
    const password = (body.password || '').trim();
    if (!row.password_hash) return error(res, 'No password set for this account', 400);
    if (!verifyPassword(password, row.password_hash)) return error(res, 'Password is incorrect', 401);
  }

  await execute('DELETE FROM user_question_seen WHERE user_id = ?', [userId]);
  await execute('DELETE FROM topic_progress WHERE user_id = ?', [userId]);
  await execute('DELETE FROM subject_progress WHERE user_id = ?', [userId]);
  await execute('DELETE FROM quiz_sessions WHERE user_id = ?', [userId]);
  await execute('DELETE FROM users WHERE id = ?', [userId]);

  return noContent(res);
};