// api/auth/me.js — GET /api/auth/me
const { json, ok, error } = require('../../_shared/response');
const { fetchOne } = require('../../_shared/db');
const { requireAuth } = require('../../_shared/auth');
const { buildPublicUser } = require('../../_shared/user');
const { buildProgress } = require('../../_shared/progress');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return error(res, 'Method not allowed', 405);

  const user = requireAuth(req);
  const userId = parseInt(user.sub);

  const row = await fetchOne('SELECT * FROM users WHERE id = ?', [userId]);
  if (!row) return error(res, 'User not found', 404);

  return ok(res, buildPublicUser(row));
};