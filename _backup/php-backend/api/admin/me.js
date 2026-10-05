// api/admin/me.js — GET /admin/me
const { json, ok, error } = require('../../_shared/response');
const { currentAdmin } = require('../../_shared/auth-admin');
const { ROLE_PERMISSIONS } = require('../../_shared/questionTypes');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return error(res, 'Method not allowed', 405);
  const admin = currentAdmin(req);
  const perms = ROLE_PERMISSIONS[admin.role] || [];
  return ok(res, {
    id: parseInt(admin.id),
    username: admin.username,
    full_name: admin.full_name,
    role: admin.role,
    permissions: Object.values(perms),
    is_active: !!admin.is_active,
    last_login: admin.last_login,
  });
};