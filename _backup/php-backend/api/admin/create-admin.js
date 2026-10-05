// api/admin/create-admin.js — POST /admin/admins
const { query, fetchOne } = require('../../_shared/db');
const { currentAdmin, requirePermission, auditLog } = require('../../_shared/auth-admin');
const { hashPassword } = require('../../_shared/auth');
const { ADMIN_ROLES } = require('../../_shared/questionTypes');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ detail: 'Method not allowed' });
  const admin = currentAdmin(req);
  requirePermission(admin, 'settings');
  const body = req.body || {};

  const username = (body.username || '').trim();
  const password = body.password || '';
  const fullName = body.full_name || null;
  const role = (body.role || 'moderator').trim();

  if (!username || password.length < 6) return res.status(400).json({ detail: 'username required and password must be >= 6 characters' });
  if (!ADMIN_ROLES.includes(role)) return res.status(400).json({ detail: `role must be one of: ${ADMIN_ROLES.join(', ')}` });

  const exists = await fetchOne('SELECT id FROM admin_users WHERE username = ?', [username]);
  if (exists) return res.status(400).json({ detail: 'username already exists' });

  await query(
    'INSERT INTO admin_users (username, full_name, password_hash, role, is_active, created_by) VALUES (?, ?, ?, ?, 1, ?)',
    [username, fullName, hashPassword(password), role, admin.id]
  );
  const idRows = await query('SELECT LAST_INSERT_ID() as id');
  const id = idRows[0].id;
  await auditLog(admin.id, admin.username, 'admin.create', `admin:${username}`, `role=${role}`, req);

  return res.status(201).json({ detail: 'ok', id, username, role });
};