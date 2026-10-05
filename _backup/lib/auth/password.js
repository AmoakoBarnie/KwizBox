// api/auth/password.js — PUT /api/auth/me/password
const { json, ok, error } = require('../shared/response');
const { execute, fetchOne } = require('../shared/db');
const { requireAuth, verifyPassword, hashPassword } = require('../shared/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'PUT') return error(res, 'Method not allowed', 405);

  const user = requireAuth(req);
  const userId = parseInt(user.sub);
  const body = req.body || {};

  const currentPassword = (body.current_password || '').trim();
  const newPassword = (body.new_password || '').trim();

  if (!currentPassword || !newPassword) return error(res, 'Current password and new password are required', 422);
  if (newPassword.length < 6) return error(res, 'New password must be at least 6 characters', 422);

  const row = await fetchOne('SELECT * FROM users WHERE id = ?', [userId]);
  if (!row) return error(res, 'User not found', 404);
  if (row.is_guest) return error(res, 'Guest accounts cannot change password', 400);
  if (!row.password_hash) return error(res, 'No password set for this account', 400);
  if (!verifyPassword(currentPassword, row.password_hash)) return error(res, 'Current password is incorrect', 401);

  const newHash = hashPassword(newPassword);
  await execute('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId]);

  return ok(res, { detail: 'Password updated successfully' });
};