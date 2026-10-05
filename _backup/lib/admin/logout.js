// api/admin/logout.js — POST /admin/logout
const { json, ok, error } = require('../shared/response');
const { query } = require('../shared/db');
const { currentAdmin, auditLog } = require('../shared/auth-admin');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return error(res, 'Method not allowed', 405);
  const admin = currentAdmin(req);
  await auditLog(admin.id, admin.username, 'admin.logout');
  return ok(res, { detail: 'logged out' });
};