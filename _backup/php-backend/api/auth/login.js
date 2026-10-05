// api/auth/login.js
const { json, ok, error } = require('../../_shared/response');
const { execute, fetchOne } = require('../../_shared/db');
const { createUserToken, createAdminToken, verifyPassword } = require('../../_shared/auth');
const { buildPublicUser } = require('../../_shared/user');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return error(res, 'Method not allowed', 405);

  const body = req.body || {};
  const nickname = (body.nickname || '').trim();
  const password = body.password || '';

  if (!nickname || !password) return error(res, 'Nickname and password are required', 422);

  // Try regular user
  const user = await fetchOne('SELECT * FROM users WHERE nickname = ? AND is_guest = 0', [nickname]);
  if (user && user.password_hash && verifyPassword(password, user.password_hash)) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || '0.0.0.0';
    await execute('UPDATE users SET last_ip = ?, last_login = NOW() WHERE id = ?', [ip, user.id]);
    const fresh = await fetchOne('SELECT * FROM users WHERE id = ?', [user.id]);
    const token = createUserToken(fresh.id);
    return ok(res, { access_token: token, user: buildPublicUser(fresh) });
  }

  // Try admin
  const admin = await fetchOne('SELECT * FROM admin_users WHERE username = ?', [nickname]);
  if (admin && admin.password_hash && verifyPassword(password, admin.password_hash)) {
    await execute('UPDATE admin_users SET last_login = NOW() WHERE id = ?', [admin.id]);
    const token = createAdminToken(admin.id);
    return ok(res, {
      access_token: token,
      user: {
        id: admin.id,
        nickname: admin.username,
        class_level: null,
        school_code: null,
        is_guest: false,
        lifetime_score: 0,
        total_questions: 0,
        total_correct: 0,
        current_streak: 0,
        longest_streak: 0,
        progress: null,
        avatar: { skin: 'warm', hat: 'none', accessory: 'none', gender: 'male' },
      },
    });
  }

  return error(res, 'Invalid nickname or password', 401);
};