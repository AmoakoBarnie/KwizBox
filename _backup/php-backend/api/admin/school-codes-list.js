// api/admin/school-codes-list.js — GET /admin/school-codes
const { query, fetchAll } = require('../../_shared/db');
const { currentAdmin, requirePermission, schoolCodeOut } = require('../../_shared/auth-admin');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ detail: 'Method not allowed' });
  const admin = currentAdmin(req);
  requirePermission(admin, 'schools');
  const rows = await fetchAll('SELECT * FROM school_codes ORDER BY created_at DESC');
  const out = await Promise.all(rows.map(async sc => {
    const u = (await query('SELECT COUNT(*) as cnt FROM users WHERE school_code = ?', [sc.code]))[0].cnt;
    return { ...schoolCodeOut(sc), users_using: parseInt(u) };
  }));
  return res.status(200).json(out);
};