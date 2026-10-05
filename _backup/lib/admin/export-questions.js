// api/admin/export-questions.js — GET /admin/export/questions
const { query } = require('../shared/db');
const { currentAdmin, requirePermission, auditLog } = require('../shared/auth-admin');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ detail: 'Method not allowed' });
  const admin = currentAdmin(req);
  requirePermission(admin, 'export');

  const rows = await query('SELECT * FROM questions ORDER BY id');
  const csvRows = rows.map(q => {
    const answered = parseInt(q.times_answered || 0);
    const correct = parseInt(q.times_correct || 0);
    const rate = answered > 0 ? round2(correct / answered) : '';
    return [
      q.id, q.class_level, q.subject, q.topic,
      q.difficulty || q.qdifficulty || '',
      answered, correct, rate,
    ];
  });

  await auditLog(admin.id, admin.username, 'export.questions', null, null, req);

  const csv = [
    ['id', 'class', 'subject', 'topic', 'difficulty', 'answered', 'correct', 'correct_rate'].join(','),
    ...csvRows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')),
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=questions.csv');
  return res.status(200).send(csv);
};

function round2(n) { return Math.round((n + Number.EPSILON) * 10000) / 10000; }