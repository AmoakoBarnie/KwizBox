// api/_shared/auth-admin.js — admin auth helpers for Vercel serverless
const { query, fetchOne } = require('./db');
const { currentUser, createAdminToken, verifyPassword, hashPassword } = require('./auth');
const { ROLE_PERMISSIONS, ADMIN_ROLES, publicOptions } = require('./questionTypes');

// Get current admin from bearer token
async function currentAdmin(req) {
  const user = currentUser(req);
  if (!user || !user.admin) throw { status: 401, detail: 'Admin authentication required' };
  const admin = await fetchOne('SELECT * FROM admin_users WHERE id = ?', [parseInt(user.sub)]);
  if (!admin) throw { status: 401, detail: 'Admin account not found' };
  return admin;
}

// Require a specific permission scope
function requirePermission(admin, perm) {
  const role = admin.role || 'moderator';
  const perms = ROLE_PERMISSIONS[role] || [];
  if (!perms.includes(perm)) throw { status: 403, detail: 'Insufficient permissions' };
  return admin;
}

// Audit log helper
async function auditLog(adminId, adminUsername, action, target, detail, req) {
  const ip = req?.headers['x-forwarded-for']?.split(',')[0].trim() || req?.socket?.remoteAddress || null;
  await query(
    `INSERT INTO audit_logs (admin_id, admin_username, action, target, detail, ip)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [adminId, adminUsername, action, target || null, detail || null, ip]
  );
}

// Question output shape
function questionOut(q) {
  const opts = publicOptions(
    q.question_type || 'mcq',
    q.option_a || '',
    q.option_b || '',
    q.option_c || '',
    q.option_d || ''
  );
  const answered = parseInt(q.times_answered || 0);
  const correct = parseInt(q.times_correct || 0);
  return {
    id: parseInt(q.id),
    class_level: q.class_level,
    subject: q.subject,
    topic: q.topic,
    sub_topic: q.sub_topic || null,
    strand: q.strand,
    difficulty: q.difficulty,
    question: q.question,
    options: opts,
    answer_index: parseInt(q.answer_index),
    explanation: q.explanation,
    is_active: !!q.is_active,
    times_answered: answered,
    times_correct: correct,
    correct_rate: answered > 0 ? round2(correct / answered) : null,
    question_type: q.question_type || 'mcq',
    image_url: q.image_url || null,
  };
}

// School code output
function schoolCodeOut(sc) {
  return {
    id: parseInt(sc.id),
    code: sc.code,
    name: sc.name,
    school: sc.school,
    created_at: sc.created_at,
    expires_at: sc.expires_at,
    is_active: !!sc.is_active,
    max_uses: sc.max_uses != null ? parseInt(sc.max_uses) : null,
    used_count: parseInt(sc.used_count || 0),
    users_using: 0, // computed at query time in the route
  };
}

function generateCode() {
  const chars = '0123456789ABCDEF';
  let code;
  do {
    code = 'GH-' + Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * 16)]).join('');
  } while (false); // checked in route
  return code;
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 10000) / 10000;
}

module.exports = { currentAdmin, requirePermission, auditLog, questionOut, schoolCodeOut, generateCode, round2 };