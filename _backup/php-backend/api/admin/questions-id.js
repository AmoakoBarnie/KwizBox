// api/admin/questions-id.js — PUT /admin/questions/:id
const { query, fetchOne } = require('../../_shared/db');
const { currentAdmin, requirePermission, auditLog, questionOut } = require('../../_shared/auth-admin');
const { publicOptions, padOptions, validateQuestionFields, MCQ, IMAGE_MCQ } = require('../../_shared/questionTypes');

module.exports = async function handler(req, res, params) {
  if (req.method !== 'PUT') return res.status(405).json({ detail: 'Method not allowed' });
  const admin = currentAdmin(req);
  requirePermission(admin, 'questions');
  const qid = parseInt(params.id);
  const body = req.body || {};

  const q = await fetchOne('SELECT * FROM questions WHERE id = ?', [qid]);
  if (!q) return res.status(404).json({ detail: 'question not found' });

  const newType = (body.question_type || q.question_type || MCQ).toLowerCase().trim();
  const newOpts = body.options || [q.option_a, q.option_b, q.option_c, q.option_d];
  const newIdx = body.answer_index != null ? parseInt(body.answer_index) : parseInt(q.answer_index);
  const newImg = 'image_url' in body ? body.image_url : q.image_url;

  const validatedType = validateQuestionFields(newType, newOpts, newIdx, newImg, newType === IMAGE_MCQ);
  const [a, b, c, d] = padOptions(validatedType, newOpts);

  await query(
    `UPDATE questions SET class_level = ?, subject = ?, topic = ?, sub_topic = ?, strand = ?,
     difficulty = ?, question = ?, option_a = ?, option_b = ?, option_c = ?, option_d = ?,
     answer_index = ?, explanation = ?, question_type = ?, image_url = ? WHERE id = ?`,
    [
      body.class_level ?? q.class_level,
      body.subject ?? q.subject,
      body.topic ?? q.topic,
      body.sub_topic ?? q.sub_topic,
      body.strand ?? q.strand,
      body.difficulty ?? q.difficulty,
      body.question ?? q.question,
      a, b, c, d,
      newIdx,
      body.explanation ?? q.explanation,
      validatedType,
      newImg || null,
      qid,
    ]
  );
  await auditLog(admin.id, admin.username, 'question.update', `question:${qid}`, null, req);

  const upd = await fetchOne('SELECT * FROM questions WHERE id = ?', [qid]);
  return res.status(200).json(questionOut(upd));
};