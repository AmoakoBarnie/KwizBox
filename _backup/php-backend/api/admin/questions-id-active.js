// api/admin/questions-id-active.js — POST /admin/questions/:id/active
const { query, fetchOne } = require('../../_shared/db');
const { currentAdmin, requirePermission, auditLog } = require('../../_shared/auth-admin');

module.exports = async function handler(req, res, params) {
  if (req.method !== 'POST') return res.status(405).json({ detail: 'Method not allowed' });
  const admin = currentAdmin(req);
  requirePermission(admin, 'questions');
  const qid = parseInt(params.id);
  const body = req.body || {};

  const q = await fetchOne('SELECT id FROM questions WHERE id = ?', [qid]);
  if (!q) return res.status(404).json({ detail: 'question not found' });

  const isActive = !!(body.is_active);
  await query('UPDATE questions SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, qid]);
  await auditLog(admin.id, admin.username, 'question.active', `question:${qid}`, `active=${isActive}`, req);

  return res.status(200).json({ detail: 'ok' });
};