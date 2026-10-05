// api/auth/guest.js
const { json, ok, error } = require('../shared/response');
const { execute, fetchOne } = require('../shared/db');
const { createUserToken } = require('../shared/auth');
const { buildPublicUser } = require('../shared/user');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return error(res, 'Method not allowed', 405);

  const body = req.body || {};
  const nickname = (body.nickname || 'Guest').trim();
  const classLevel = body.class_level || null;
  const schoolCode = body.school_code || null;
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || '0.0.0.0';

  await execute(
    'INSERT INTO users (nickname, class_level, school_code, is_guest, is_active, last_ip, created_at) VALUES (?, ?, ?, 1, 1, ?, NOW())',
    [nickname, classLevel, schoolCode, ip]
  );

  const userId = (await execute('SELECT LAST_INSERT_ID()', [])).insertId || null;
  const token = createUserToken(userId, true);
  const user = await fetchOne('SELECT * FROM users WHERE id = ?', [userId]);

  return ok(res, { access_token: token, user: buildPublicUser(user) }, 201);
};