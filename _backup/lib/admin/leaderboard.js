// api/admin/leaderboard.js — GET /admin/leaderboard
const { query } = require('../shared/db');
const { currentAdmin, requirePermission } = require('../shared/auth-admin');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ detail: 'Method not allowed' });
  const admin = currentAdmin(req);
  requirePermission(admin, 'leaderboard');
  const scope = (req.query.scope || 'global').toLowerCase();
  const classLevel = req.query.class_level || null;
  const limit = Math.min(500, Math.max(1, parseInt(req.query.limit || 50)));

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
      out.push({
        rank: rank++,
        nickname: u[0].nickname,
        class_level: u[0].class_level,
        lifetime_score: parseInt(s.pts),
        accuracy: tot > 0 ? round2(cor / tot) : 0.0,
      });
    }
    return res.status(200).json(out);
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
      out.push({
        rank: rank++,
        nickname: r.nickname,
        class_level: r.class_level,
        lifetime_score: parseInt(r.points),
        accuracy: tot > 0 ? round2(cor / tot) : 0.0,
      });
    }
    return res.status(200).json(out);
  }

  const where = 'is_guest = 0 AND lifetime_score > 0';
  const params = [];
  if (classLevel) { where += ' AND class_level = ?'; params.push(classLevel); }
  const rows = await query(`SELECT * FROM users WHERE ${where} ORDER BY lifetime_score DESC LIMIT ?`, [...params, limit]);
  const out = [];
  let rank = 1;
  for (const u of rows) {
    const tot = parseInt(u.total_questions || 0);
    const cor = parseInt(u.total_correct || 0);
    out.push({
      rank: rank++,
      nickname: u.nickname,
      class_level: u.class_level,
      lifetime_score: parseInt(u.lifetime_score || 0),
      accuracy: tot > 0 ? round2(cor / tot) : 0.0,
    });
  }
  return res.status(200).json(out);
};

function round2(n) { return Math.round((n + Number.EPSILON) * 10000) / 10000; }
function getWeek() {
  const d = new Date();
  const y = d.getFullYear();
  const jan1 = new Date(y, 0, 1);
  const days = Math.floor((d - jan1) / 86400000);
  return Math.ceil((days + jan1.getDay() + 1) / 7);
}