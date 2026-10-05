// api/admin/users-id-status.js — POST /admin/users/:id/status
const { query, fetchOne } = require('../shared/db');
const { currentAdmin, requirePermission, auditLog } = require('../shared/auth-admin');

module.exports = async function handler(req, res, params) {
  if (req.method !== 'POST') return res.status(405).json({ detail: 'Method not allowed' });
  const admin = currentAdmin(req);
  requirePermission(admin, 'users');
  const userId = parseInt(params.id);
  const body = req.body || {};

  const u = await fetchOne('SELECT * FROM users WHERE id = ? AND is_guest = 0', [userId]);
  if (!u) return res.status(404).json({ detail: 'user not found' });

  const isActive = !!(body.is_active);
  await query('UPDATE users SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, userId]);
  await auditLog(admin.id, admin.username, 'user.status', `user:${userId}`, `active=${isActive}`, req);

  return res.status(200).json({ detail: 'ok', account_status: isActive ? 'active' : 'disabled' });
};