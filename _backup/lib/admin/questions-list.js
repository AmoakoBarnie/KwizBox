// api/admin/questions-list.js — GET /admin/questions
const { query, fetchAll } = require('../shared/db');
const { currentAdmin, requirePermission, questionOut } = require('../shared/auth-admin');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ detail: 'Method not allowed' });
  const admin = currentAdmin(req);
  requirePermission(admin, 'questions');
  const q = req.query || {};
  
  const conditions = [];
  const params = [];
  
  const search = (q.search || '').trim();
  if (search) { conditions.push('question LIKE ?'); params.push(`%${search}%`); }
  if (q.class_level) { conditions.push('class_level = ?'); params.push(q.class_level); }
  if (q.subject) { conditions.push('subject = ?'); params.push(q.subject); }
  if (q.difficulty) { conditions.push('difficulty = ?'); params.push(q.difficulty); }
  if (q.question_type) { conditions.push('question_type = ?'); params.push(q.question_type); }
  if (q.is_active !== undefined) { conditions.push('is_active = ?'); params.push(q.is_active ? 1 : 0); }
  
  const limit = Math.min(500, Math.max(1, parseInt(q.limit || 100)));
  const offset = Math.max(0, parseInt(q.offset || 0));
  
  let sql = 'SELECT * FROM questions';
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ` ORDER BY id LIMIT ${limit} OFFSET ${offset}`;
  
  const rows = await fetchAll(sql, params);
  return res.status(200).json(rows.map(questionOut));
};