// api/admin/admins-id-status.js — POST /admin/admins/:id/status
const { query, fetchOne } = require('../../_shared/db');
const { currentAdmin, requirePermission, auditLog } = require('../../_shared/auth-admin');

module.exports = async function handler(req, res, params) {
  if (req.method !== 'POST') return res.status(405).json({ detail: 'Method not allowed' });
  const admin = currentAdmin(req);
  requirePermission(admin, 'settings');
  const id = parseInt(params.id);
  const body = req.body || {};

  const target = await fetchOne('SELECT * FROM admin_users WHERE id = ?', [id]);
  if (!target) return res.status(404).json({ detail: 'admin not found' });

  const isActive = !!(body.is_active);
  await query('UPDATE admin_users SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, id]);
  await auditLog(admin.id, admin.username, 'admin.status', `admin:${target.username}`, `active=${isActive}`, req);

  return res.status(200).json({ detail: 'ok' });
};