// api/admin/dashboard.js — GET /admin/dashboard
const { query } = require('../../_shared/db');
const { currentAdmin, requirePermission } = require('../../_shared/auth-admin');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ detail: 'Method not allowed' });
  const admin = currentAdmin(req);
  requirePermission(admin, 'users');

  const dayAgo = new Date(Date.now() - 86400000).toISOString().slice(0, 19).replace('T', ' ');

  const [
    registered,
    activePlayers,
    onlinePlayers,
    totalQ,
    activeQ,
    schools,
    gamesPlayed,
    totalQuestionsSum,
    totalCorrectSum,
  ] = await Promise.all([
    query('SELECT COUNT(*) as cnt FROM users WHERE is_guest = 0'),
    query(`SELECT COUNT(*) as cnt FROM users WHERE is_guest = 0 AND last_played >= '${dayAgo.replace(/'/g, "\\'")}'`),
    query('SELECT COUNT(DISTINCT user_id) as cnt FROM quiz_sessions WHERE status = \'active\''),
    query('SELECT COUNT(*) as cnt FROM questions'),
    query('SELECT COUNT(*) as cnt FROM questions WHERE is_active = 1'),
    query('SELECT COUNT(*) as cnt FROM school_codes WHERE is_active = 1'),
    query('SELECT COUNT(*) as cnt FROM quiz_sessions'),
    query('SELECT COALESCE(SUM(total_questions),0) as s FROM users'),
    query('SELECT COALESCE(SUM(total_correct),0) as s FROM users'),
  ]);

  const tot = parseFloat(totalQuestionsSum[0].s);
  const cor = parseFloat(totalCorrectSum[0].s);
  const avgAcc = tot > 0 ? round2(cor / tot) : 0.0;

  // Recent activity
  const auditRows = await query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 15');
  const recentAudit = auditRows.map(a => ({
    time: a.created_at,
    text: `${(a.admin_username || 'system')}: ${a.action}${a.target ? ` (${a.target})` : ''}`,
  }));

  const recentUsers = await query(
    'SELECT nickname, created_at FROM users WHERE is_guest = 0 ORDER BY created_at DESC LIMIT 5'
  );
  const recentUserEntries = recentUsers.map(u => ({
    time: u.created_at,
    text: `${u.nickname} registered`,
  }));

  const recent = [...recentAudit, ...recentUserEntries]
    .sort((a, b) => (b.time || '').localeCompare(a.time || ''))
    .slice(0, 15);

  return res.status(200).json({
    registered_users: parseInt(registered[0].cnt),
    active_players: parseInt(activePlayers[0].cnt),
    online_players: parseInt(onlinePlayers[0].cnt),
    total_questions: parseInt(totalQ[0].cnt),
    active_questions: parseInt(activeQ[0].cnt),
    schools: parseInt(schools[0].cnt),
    games_played: parseInt(gamesPlayed[0].cnt),
    avg_accuracy: avgAcc,
    total_school_codes: parseInt(schools[0].cnt),
    recent_activity: recent,
  });
};

function round2(n) { return Math.round((n + Number.EPSILON) * 10000) / 10000; }