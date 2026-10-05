// api/quiz/leaderboard.js — GET /api/quiz/leaderboard
const { json, ok, error } = require('../shared/response');
const { query, fetchAll, fetchOne } = require('../shared/db');
const { weekPeriod, monthPeriod } = require('../shared/scoring');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return error(res, 'Method not allowed', 405);

  const scope = (req.query.scope || 'global').trim();
  const classLevel = req.query.class_level ? req.query.class_level.trim() : null;
  const schoolCode = req.query.school_code ? req.query.school_code.trim() : null;
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || 50)));

  // Weekly / monthly from leaderboard_periods
  if (scope === 'weekly' || scope === 'monthly') {
    const kind = scope;
    const period = scope === 'weekly' ? weekPeriod() : monthPeriod();
    const rows = await fetchAll(
      `SELECT u.id, u.nickname, u.class_level, u.total_questions, u.total_correct, lp.points
       FROM users u
       JOIN leaderboard_periods lp ON lp.user_id = u.id
       WHERE lp.kind = ? AND lp.period = ? AND u.is_guest = 0
       ORDER BY lp.points DESC LIMIT ?`,
      [kind, period, limit]
    );

    const out = [];
    let rank = 1;
    for (const u of rows) {
      const acc = round2(parseInt(u.total_correct || 0) / Math.max(1, parseInt(u.total_questions || 1)));
      out.push({
        rank: rank++,
        nickname: u.nickname,
        class_level: u.class_level,
        lifetime_score: parseInt(u.points || 0),
        total_questions: parseInt(u.total_questions || 0),
        accuracy: acc,
        is_guest: !!u.is_guest,
      });
    }
    return ok(res, out);
  }

  // Global / class / school
  let sql = `SELECT id, nickname, class_level, total_questions, total_correct, lifetime_score, is_guest
             FROM users WHERE is_guest = 0`;
  const params = [];

  if (scope === 'class' && classLevel) {
    sql += ' AND class_level = ?';
    params.push(classLevel);
  } else if (scope === 'school' && schoolCode) {
    sql += ' AND school_code = ?';
    params.push(schoolCode);
  }

  sql += ' AND lifetime_score > 0 ORDER BY lifetime_score DESC LIMIT ?';
  params.push(limit);

  const rows = await fetchAll(sql, params);
  const out = [];
  let rank = 1;
  for (const u of rows) {
    const acc = round2(parseInt(u.total_correct || 0) / Math.max(1, parseInt(u.total_questions || 1)));
    out.push({
      rank: rank++,
      nickname: u.nickname,
      class_level: u.class_level,
      lifetime_score: parseInt(u.lifetime_score || 0),
      total_questions: parseInt(u.total_questions || 0),
      accuracy: acc,
      is_guest: !!u.is_guest,
    });
  }
  return ok(res, out);
};

function round2(n) {
  return Math.round((n + Number.EPSILON) * 10000) / 10000;
}