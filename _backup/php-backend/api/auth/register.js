// api/auth/register.js
const { json, ok, error } = require('../../_shared/response');
const { execute, fetchOne } = require('../../_shared/db');
const { createUserToken, hashPassword, verifyPassword } = require('../../_shared/auth');
const { buildPublicUser } = require('../../_shared/user');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return error(res, 'Method not allowed', 405);

  const body = req.body || {};
  const nickname = (body.nickname || '').trim();
  const password = body.password || '';
  const classLevel = body.class_level || null;
  const schoolCode = body.school_code || null;

  if (!nickname) return error(res, 'Nickname is required', 422);
  if (password.length < 6) return error(res, 'Password must be at least 6 characters', 422);

  // Check existing
  const existing = await fetchOne('SELECT id FROM users WHERE nickname = ? AND is_guest = 0', [nickname]);
  if (existing) return error(res, 'Nickname already taken', 409);

  const hash = hashPassword(password);
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || '0.0.0.0';

  await execute(
    'INSERT INTO users (nickname, class_level, school_code, is_guest, password_hash, last_ip, created_at) VALUES (?, ?, ?, 0, ?, ?, NOW())',
    [nickname, classLevel, schoolCode, hash, ip]
  );

  const userId = (await execute('SELECT LAST_INSERT_ID()', [])).insertId || null;
  const token = createUserToken(userId);
  const user = await fetchOne('SELECT * FROM users WHERE id = ?', [userId]);

  return ok(res, { access_token: token, user: buildPublicUser(user) }, 201);
};