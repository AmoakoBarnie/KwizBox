// api/admin/export-game-history.js — GET /admin/export/game-history
const { query } = require('../../_shared/db');
const { currentAdmin, requirePermission, auditLog } = require('../../_shared/auth-admin');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ detail: 'Method not allowed' });
  const admin = currentAdmin(req);
  requirePermission(admin, 'export');

  const rows = await query('SELECT * FROM quiz_sessions ORDER BY created_at DESC');
  const csvRows = rows.map(s => [
    s.id, s.user_id, s.ended_at || s.created_at,
    s.subject, s.total, s.correct, s.score, s.status,
  ]);

  await auditLog(admin.id, admin.username, 'export.game_history', null, null, req);

  const csv = [
    ['session_id', 'user_id', 'date', 'subject', 'total', 'correct', 'score', 'status'].join(','),
    ...csvRows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')),
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=game_history.csv');
  return res.status(200).send(csv);
};