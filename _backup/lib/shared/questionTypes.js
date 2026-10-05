// api/_shared/questionTypes.js — option packing, validation, constants

const MCQ = 'mcq';
const TRUE_FALSE = 'true_false';
const IMAGE_MCQ = 'image_mcq';
const QUESTION_TYPES = [MCQ, TRUE_FALSE, IMAGE_MCQ];
const DEFAULT_SETTINGS = {
  game_duration_seconds: '600',
  questions_per_game: '12',
  scoring_base_easy: '5',
  scoring_base_medium: '10',
  scoring_base_hard: '15',
  maintenance_mode: 'false',
  registration_open: 'true',
  max_class_level: 'B9',
};
const ROLE_PERMISSIONS = {
  super_admin: ['users', 'questions', 'schools', 'leaderboard', 'monitor', 'settings', 'export', 'audit'],
  question_manager: ['questions', 'leaderboard', 'monitor'],
  school_manager: ['schools', 'users', 'leaderboard', 'monitor'],
  moderator: ['users', 'leaderboard', 'monitor'],
};
const ADMIN_ROLES = ['super_admin', 'question_manager', 'school_manager', 'moderator'];

function publicOptions(questionType, a, b, c, d) {
  const type = questionType || MCQ;
  if (type === TRUE_FALSE) {
    return [(a || 'True'), (b || 'False')];
  }
  return [a, b, c, d];
}

function padOptions(questionType, options) {
  const opts = (options || []).map(o => (o === null ? '' : String(o).trim()));
  const type = questionType || MCQ;
  if (type === TRUE_FALSE) {
    const filled = opts.filter(o => o !== '');
    if (filled.length >= 2) {
      return [filled[0], filled[1], '', ''];
    }
    if (opts.length >= 2) {
      return [(opts[0] || 'True'), (opts[1] || 'False'), '', ''];
    }
    return ['True', 'False', '', ''];
  }
  while (opts.length < 4) opts.push('');
  return opts.slice(0, 4);
}

function validateQuestionFields(questionType, options, answerIndex, imageUrl, requireImage = false) {
  const qtype = (questionType || MCQ).toLowerCase().trim();
  if (!QUESTION_TYPES.includes(qtype)) {
    throw { status: 400, detail: `question_type must be one of: ${QUESTION_TYPES.join(', ')}` };
  }
  const opts = (options || []).map(o => (o === null ? '' : String(o).trim()));
  if (qtype === TRUE_FALSE) {
    const filled = opts.filter(o => o !== '');
    if (opts.length === 2 && (!opts[0] || !opts[1])) {
      throw { status: 400, detail: 'true_false requires two non-empty options' };
    }
    if (filled.length !== 2) {
      throw { status: 400, detail: 'true_false requires exactly 2 options (True/False)' };
    }
    if (![0, 1].includes(answerIndex)) {
      throw { status: 400, detail: 'true_false answer_index must be 0 (True) or 1 (False)' };
    }
  } else {
    if (opts.length !== 4 || opts.filter(o => o).length !== 4) {
      throw { status: 400, detail: `${qtype} requires exactly 4 non-empty options` };
    }
    if (answerIndex < 0 || answerIndex > 3) {
      throw { status: 400, detail: 'answer_index must be 0-3' };
    }
    if (qtype === IMAGE_MCQ && requireImage && !imageUrl?.trim()) {
      throw { status: 400, detail: 'image_mcq requires image_url' };
    }
  }
  return qtype;
}

module.exports = {
  MCQ,
  TRUE_FALSE,
  IMAGE_MCQ,
  QUESTION_TYPES,
  DEFAULT_SETTINGS,
  ROLE_PERMISSIONS,
  ADMIN_ROLES,
  publicOptions,
  padOptions,
  validateQuestionFields,
};