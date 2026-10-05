// api/admin/settings.js — GET /admin/settings
const { query, fetchAll } = require('../shared/db');
const { currentAdmin, requirePermission } = require('../shared/auth-admin');
const { DEFAULT_SETTINGS } = require('../shared/questionTypes');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ detail: 'Method not allowed' });
  const admin = currentAdmin(req);
  requirePermission(admin, 'settings');
  const rows = await fetchAll('SELECT key_name, value FROM system_settings');
  const settings = {};
  for (const r of rows) settings[r.key_name] = r.value;
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) { if (!(k in settings)) settings[k] = v; }
  return res.status(200).json(settings);
};