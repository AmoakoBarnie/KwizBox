// api/auth/avatar.js — PATCH /api/auth/me/avatar
const { json, ok, error } = require('../../_shared/response');
const { execute, fetchOne } = require('../../_shared/db');
const { requireAuth } = require('../../_shared/auth');
const { buildPublicUser } = require('../../_shared/user');

const VALID_SKINS = ['warm', 'deep', 'light', 'cool'];
const VALID_HATS = ['none', 'kente_cap', 'school_cap', 'beanie', 'sun_hat'];
const VALID_ACCESSORIES = ['none', 'glasses', 'watch', 'necklace', 'school_bag', 'bow_tie'];
const VALID_GENDERS = ['male', 'female'];

module.exports = async function handler(req, res) {
  if (req.method !== 'PATCH') return error(res, 'Method not allowed', 405);

  const user = requireAuth(req);
  const userId = parseInt(user.sub);
  const body = req.body || {};

  const row = await fetchOne('SELECT * FROM users WHERE id = ?', [userId]);
  if (!row) return error(res, 'User not found', 404);

  const updates = [];
  const params = [];

  if ('skin' in body) {
    if (!VALID_SKINS.includes(body.skin)) return error(res, `Invalid skin. Must be one of: ${VALID_SKINS.join(', ')}`, 400);
    updates.push('avatar_skin = ?');
    params.push(body.skin);
  }
  if ('hat' in body) {
    if (!VALID_HATS.includes(body.hat)) return error(res, `Invalid hat. Must be one of: ${VALID_HATS.join(', ')}`, 400);
    updates.push('avatar_hat = ?');
    params.push(body.hat);
  }
  if ('accessory' in body) {
    if (!VALID_ACCESSORIES.includes(body.accessory)) return error(res, `Invalid accessory. Must be one of: ${VALID_ACCESSORIES.join(', ')}`, 400);
    updates.push('avatar_accessory = ?');
    params.push(body.accessory);
  }
  if ('gender' in body) {
    if (!VALID_GENDERS.includes(body.gender)) return error(res, `Invalid gender. Must be one of: ${VALID_GENDERS.join(', ')}`, 400);
    updates.push('avatar_gender = ?');
    params.push(body.gender);
  }

  if (updates.length === 0) return error(res, 'No avatar fields to update', 400);

  params.push(userId);
  await execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

  const fresh = await fetchOne('SELECT * FROM users WHERE id = ?', [userId]);
  return ok(res, buildPublicUser(fresh));
};