// api/admin/settings-key.js — PUT /admin/settings/:key
const { query, fetchOne } = require('../../_shared/db');
const { currentAdmin, requirePermission, auditLog } = require('../../_shared/auth-admin');

module.exports = async function handler(req, res, params) {
  if (req.method !== 'PUT') return res.status(405).json({ detail: 'Method not allowed' });
  const admin = currentAdmin(req);
  requirePermission(admin, 'settings');
  const key = params.key;
  const body = req.body || {};
  const value = body.value;

  if (value === undefined || value === null) return res.status(400).json({ detail: 'value is required' });

  const existing = await fetchOne('SELECT key_name FROM system_settings WHERE key_name = ?', [key]);
  if (existing) {
    await query('UPDATE system_settings SET value = ?, updated_at = NOW(), updated_by = ? WHERE key_name = ?', [value, admin.id, key]);
  } else {
    await query('INSERT INTO system_settings (key_name, value, updated_by) VALUES (?, ?, ?)', [key, value, admin.id]);
  }
  await auditLog(admin.id, admin.username, 'settings.update', `setting:${key}`, String(value), req);

  return res.status(200).json({ detail: 'ok', key, value });
};