// api/admin/monitor.js — GET /admin/monitor
const { query } = require('../shared/db');
const { currentAdmin, requirePermission } = require('../shared/auth-admin');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ detail: 'Method not allowed' });
  const admin = currentAdmin(req);
  requirePermission(admin, 'monitor');

  const [
    active,
    completed,
    abandoned,
    sessions,
  ] = await Promise.all([
    query('SELECT COUNT(*) as cnt FROM quiz_sessions WHERE status = ?', ['active']),
    query('SELECT COUNT(*) as cnt FROM quiz_sessions WHERE status = ?', ['completed']),
    query('SELECT COUNT(*) as cnt FROM quiz_sessions WHERE status = ?', ['abandoned']),
    query('SELECT * FROM quiz_sessions WHERE status = ? ORDER BY started_at DESC LIMIT 20', ['active']),
  ]);

  const live = [];
  for (const s of sessions) {
    const u = await query('SELECT * FROM users WHERE id = ?', [s.user_id]);
    const school = s.school_code
      ? await query('SELECT * FROM school_codes WHERE code = ?', [s.school_code])
      : [];
    live.push({
      nickname: u[0] ? u[0].nickname : '?',
      school: school[0] ? school[0].school : (s.school_code || '-'),
      score: parseInt(s.score || 0),
      status: s.status,
      started_at: s.started_at,
    });
  }

  return res.status(200).json({
    active_games: parseInt(active[0].cnt),
    completed_games: parseInt(completed[0].cnt),
    abandoned_games: parseInt(abandoned[0].cnt),
    players_currently_playing: parseInt(active[0].cnt),
    live_players: live,
  });
};