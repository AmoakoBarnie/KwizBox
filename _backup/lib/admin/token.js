// api/admin/token.js — POST /admin/token (admin login)
const { json, ok, error, noContent } = require('../shared/response');
const { query, fetchOne } = require('../shared/db');
const { createAdminToken, verifyPassword } = require('../shared/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return error(res, 'Method not allowed', 405);

  const body = req.body || {};
  const username = (body.username || '').trim();
  const password = body.password || '';

  if (!username || !password) return error(res, 'username and password are required', 400);

  const admin = await fetchOne(
    'SELECT * FROM admin_users WHERE username = ?',
    [username]
  );
  if (!admin || !admin.is_active || !admin.password_hash || !verifyPassword(password, admin.password_hash)) {
    return error(res, 'Invalid admin credentials', 401);
  }

  await query('UPDATE admin_users SET last_login = NOW() WHERE id = ?', [admin.id]);

  const token = createAdminToken(admin.id);
  return ok(res, {
    access_token: token,
    role: admin.role,
    username: admin.username,
    full_name: admin.full_name,
  });
};