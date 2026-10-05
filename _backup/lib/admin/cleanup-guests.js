// api/admin/cleanup-guests.js — DELETE /admin/cleanup/guests
const { query, fetchAll, fetchOne } = require('../shared/db');
const { currentAdmin, requirePermission, auditLog } = require('../shared/auth-admin');

module.exports = async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).json({ detail: 'Method not allowed' });
  const admin = currentAdmin(req);
  requirePermission(admin, 'users');
  const q = req.query || {};
  const daysOld = Math.min(365, Math.max(1, parseInt(q.days_old || 7)));
  const dryRun = !('dry_run' in q) || q.dry_run !== 'false';

  const cutoff = new Date(Date.now() - daysOld * 86400000).toISOString().slice(0, 19).replace('T', ' ');
  const guests = await fetchAll(
    `SELECT * FROM users WHERE is_guest = 1 AND created_at <= '${cutoff.replace(/'/g, "\\'")}'`,
    []
  );

  const removable = [];
  for (const g of guests) {
    const sessCount = (await query('SELECT COUNT(*) as cnt FROM quiz_sessions WHERE user_id = ?', [g.id]))[0].cnt;
    if (sessCount === 0) removable.push(parseInt(g.id));
  }

  if (!dryRun && removable.length > 0) {
    for (const uid of removable) {
      await query('DELETE FROM user_question_seen WHERE user_id = ?', [uid]);
      await query('DELETE FROM topic_progress WHERE user_id = ?', [uid]);
      await query('DELETE FROM subject_progress WHERE user_id = ?', [uid]);
      await query('DELETE FROM users WHERE id = ?', [uid]);
    }
    await auditLog(admin.id, admin.username, 'cleanup.guests', null, `Removed ${removable.length} stale guests (>${daysOld}d old)`, req);
  } else if (!dryRun) {
    await auditLog(admin.id, admin.username, 'cleanup.guests', null, 'No stale guests to remove', req);
  }

  return res.status(200).json({
    guest_count: removable.length,
    threshold_days: daysOld,
    dry_run: dryRun,
    ids: dryRun ? removable : null,
  });
};