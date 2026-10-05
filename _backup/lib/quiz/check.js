// api/quiz/check.js — POST /api/quiz/check
const { json, ok, error } = require('../shared/response');
const { fetchOne } = require('../shared/db');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return error(res, 'Method not allowed', 405);

  const body = req.body || {};
  const questionId = parseInt(body.question_id || 0);
  const selectedIndex = parseInt(body.selected_index || -1);

  const q = await fetchOne(
    'SELECT id, answer_index, explanation FROM questions WHERE id = ?',
    [questionId]
  );
  if (!q) return error(res, 'Question not found', 404);

  const isCorrect = selectedIndex === parseInt(q.answer_index);

  return ok(res, {
    question_id: parseInt(q.id),
    selected_index: selectedIndex,
    correct_index: parseInt(q.answer_index),
    is_correct: isCorrect,
    explanation: q.explanation || null,
  });
};