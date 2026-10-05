// api/admin/export-users.js — GET /admin/export/users
const { query } = require('../../_shared/db');
const { currentAdmin, requirePermission, auditLog } = require('../../_shared/auth-admin');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ detail: 'Method not allowed' });
  const admin = currentAdmin(req);
  requirePermission(admin, 'export');

  const rows = await query('SELECT * FROM users WHERE is_guest = 0 ORDER BY created_at DESC');
  const csvRows = rows.map(u => [
    u.id, u.nickname, u.class_level, u.school_code,
    u.created_at, u.last_played || '',
    u.lifetime_score, u.total_questions, u.total_correct,
  ]);

  await auditLog(admin.id, admin.username, 'export.users', null, null, req);

  const csv = [
    'id,nickname,class,school_code,registered,last_active,score,questions,correct',
    ...csvRows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')),
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
  return res.status(200).send(csv);
};