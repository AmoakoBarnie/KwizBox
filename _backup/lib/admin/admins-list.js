// api/admin/admins-list.js — GET /admin/admins
const { query, fetchAll } = require('../shared/db');
const { currentAdmin, requirePermission } = require('../shared/auth-admin');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ detail: 'Method not allowed' });
  const admin = currentAdmin(req);
  requirePermission(admin, 'users');
  const rows = await fetchAll('SELECT id, username, full_name, role, is_active, last_login FROM admin_users ORDER BY id');
  return res.status(200).json(rows.map(r => ({
    id: parseInt(r.id),
    username: r.username,
    full_name: r.full_name,
    role: r.role,
    is_active: !!r.is_active,
    last_login: r.last_login,
  })));
};