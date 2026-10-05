// api/admin/school-codes-id.js — PATCH /admin/school-codes/:id
const { query, fetchOne } = require('../../_shared/db');
const { currentAdmin, requirePermission, auditLog, schoolCodeOut, generateCode } = require('../../_shared/auth-admin');

module.exports = async function handler(req, res, params) {
  if (req.method !== 'PATCH') return res.status(405).json({ detail: 'Method not allowed' });
  const admin = currentAdmin(req);
  requirePermission(admin, 'schools');
  const codeId = parseInt(params.id);
  const body = req.body || {};

  const sc = await fetchOne('SELECT * FROM school_codes WHERE id = ?', [codeId]);
  if (!sc) return res.status(404).json({ detail: 'code not found' });

  const fields = [];
  const fieldParams = [];
  for (const col of ['name', 'school', 'code', 'expires_at', 'is_active', 'max_uses']) {
    if (col in body) {
      if (col === 'is_active') { fields.push(`${col} = ?`); fieldParams.push(body.is_active ? 1 : 0); }
      else if (col === 'max_uses') { fields.push(`${col} = ?`); fieldParams.push(body.max_uses != null ? parseInt(body.max_uses) : null); }
      else { fields.push(`${col} = ?`); fieldParams.push(body[col]); }
    }
  }
  if (!fields.length) return res.status(400).json({ detail: 'no fields to update' });
  fieldParams.push(codeId);

  await query(`UPDATE school_codes SET ${fields.join(', ')} WHERE id = ?`, fieldParams);
  await auditLog(admin.id, admin.username, 'schoolcode.update', `code:${sc.code}`, null, req);

  const upd = await fetchOne('SELECT * FROM school_codes WHERE id = ?', [codeId]);
  const u = (await query('SELECT COUNT(*) as cnt FROM users WHERE school_code = ?', [upd.code]))[0].cnt;
  return res.status(200).json({ ...schoolCodeOut(upd), users_using: parseInt(u) });
};