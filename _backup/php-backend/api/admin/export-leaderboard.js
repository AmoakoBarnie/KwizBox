// api/admin/export-leaderboard.js — GET /admin/export/leaderboard
const { query } = require('../../_shared/db');
const { currentAdmin, requirePermission, auditLog } = require('../../_shared/auth-admin');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ detail: 'Method not allowed' });
  const admin = currentAdmin(req);
  requirePermission(admin, 'export');
  const scope = (req.query.scope || 'global').toLowerCase();

  // Reuse leaderboard logic
  const limit = 500;

  if (scope === 'daily') {
    const today = new Date().toISOString().slice(0, 10);
    const rows = await query(
      `SELECT user_id, SUM(score) as pts FROM quiz_sessions WHERE DATE(created_at) = ? GROUP BY user_id ORDER BY pts DESC LIMIT ?`,
      [today, limit]
    );
    const out = [];
    let rank = 1;
    for (const s of rows) {
      const u = await query('SELECT * FROM users WHERE id = ?', [s.user_id]);
      if (!u[0]) continue;
      const tot = parseInt(u[0].total_questions || 0);
      const cor = parseInt(u[0].total_correct || 0);
      out.push([rank++, u[0].nickname, u[0].class_level, parseInt(s.pts), tot > 0 ? round2(cor / tot) : 0.0]);
    }
    await auditLog(admin.id, admin.username, 'export.leaderboard', scope, null, req);
    return sendCsv(res, ['rank', 'nickname', 'class', 'score', 'accuracy'], out);
  }

  if (scope === 'weekly' || scope === 'monthly') {
    const kind = scope;
    const period = new Date().getFullYear() + '-' + (scope === 'weekly' ? 'W' + getWeek() : 'm' + String(new Date().getMonth() + 1).padStart(2, '0'));
    const rows = await query(
      `SELECT lp.user_id, lp.points, u.nickname, u.class_level, u.total_questions, u.total_correct
       FROM leaderboard_periods lp JOIN users u ON u.id = lp.user_id
       WHERE lp.kind = ? AND lp.period = ? ORDER BY lp.points DESC LIMIT ?`,
      [kind, period, limit]
    );
    const out = [];
    let rank = 1;
    for (const r of rows) {
      const tot = parseInt(r.total_questions || 0);
      const cor = parseInt(r.total_correct || 0);
      out.push([rank++, r.nickname, r.class_level, parseInt(r.points), tot > 0 ? round2(cor / tot) : 0.0]);
    }
    await auditLog(admin.id, admin.username, 'export.leaderboard', scope, null, req);
    return sendCsv(res, ['rank', 'nickname', 'class', 'score', 'accuracy'], out);
  }

  const rows = await query(
    'SELECT * FROM users WHERE is_guest = 0 AND lifetime_score > 0 ORDER BY lifetime_score DESC LIMIT ?',
    [limit]
  );
  const out = [];
  let rank = 1;
  for (const u of rows) {
    const tot = parseInt(u.total_questions || 0);
    const cor = parseInt(u.total_correct || 0);
    out.push([rank++, u.nickname, u.class_level, parseInt(u.lifetime_score || 0), tot > 0 ? round2(cor / tot) : 0.0]);
  }
  await auditLog(admin.id, admin.username, 'export.leaderboard', scope, null, req);
  return sendCsv(res, ['rank', 'nickname', 'class', 'score', 'accuracy'], out);
};

function round2(n) { return Math.round((n + Number.EPSILON) * 10000) / 10000; }
function getWeek() {
  const d = new Date();
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const days = Math.floor((d - jan1) / 86400000);
  return Math.ceil((days + jan1.getDay() + 1) / 7);
}
function sendCsv(res, headers, rows) {
  const csv = [
    headers.join(','),
    ...rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')),
  ].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=leaderboard.csv');
  return res.status(200).send(csv);
}