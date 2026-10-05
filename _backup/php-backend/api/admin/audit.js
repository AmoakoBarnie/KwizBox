// api/admin/audit.js — GET /admin/audit
const { query } = require('../../_shared/db');
const { currentAdmin, requirePermission } = require('../../_shared/auth-admin');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ detail: 'Method not allowed' });
  const admin = currentAdmin(req);
  requirePermission(admin, 'audit');
  const limit = Math.min(500, Math.max(1, parseInt(req.query.limit || 100)));
  const rows = await query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?', [limit]);
  return res.status(200).json(rows.map(a => ({
    id: parseInt(a.id),
    admin_id: a.admin_id ? parseInt(a.admin_id) : null,
    admin_username: a.admin_username,
    action: a.action,
    target: a.target,
    detail: a.detail,
    ip: a.ip,
    created_at: a.created_at,
  })));
};