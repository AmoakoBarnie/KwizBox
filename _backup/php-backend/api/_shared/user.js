// api/_shared/user.js — public user shape + progress build (mirrors PHP)

const { fetchAll, fetchOne } = require('./db');

function publicAvatar(row) {
  return {
    skin: row.avatar_skin || 'warm',
    hat: row.avatar_hat || 'none',
    accessory: row.avatar_accessory || 'none',
    gender: row.avatar_gender || 'male',
  };
}

function publicUser(row) {
  const u = row || {};
  return {
    id: parseInt(u.id),
    nickname: u.nickname,
    class_level: u.class_level !== null ? parseInt(u.class_level) : null,
    school_code: u.school_code,
    is_guest: !!u.is_guest,
    lifetime_score: parseInt(u.lifetime_score || 0),
    total_questions: parseInt(u.total_questions || 0),
    total_correct: parseInt(u.total_correct || 0),
    current_streak: parseInt(u.current_streak || 0),
    longest_streak: parseInt(u.longest_streak || 0),
    progress: buildProgress(parseInt(u.id)),
    avatar: publicAvatar(u),
  };
}

async function buildProgress(userId) {
  // Overall stats
  const user = await fetchOne(
    'SELECT total_questions, total_correct, lifetime_score, current_streak, longest_streak FROM users WHERE id = ?',
    [userId]
  );
  const overallAcc = user && parseInt(user.total_questions) > 0
    ? Number((parseInt(user.total_correct) / parseInt(user.total_questions)).toFixed(4))
    : 0.0;

  // Subjects + topics
  const subjects = await fetchAll(
    'SELECT class_level, subject, questions_answered, correct FROM subject_progress WHERE user_id = ? ORDER BY class_level, subject',
    [userId]
  );

  const subjectsOut = [];
  for (const sp of subjects) {
    const sAcc = parseInt(sp.questions_answered) > 0
      ? Number((parseInt(sp.correct) / parseInt(sp.questions_answered)).toFixed(4))
      : 0.0;

    const topics = await fetchAll(
      'SELECT topic, questions_answered, correct, mastery_score, mastered FROM topic_progress WHERE user_id = ? AND class_level = ? AND subject = ? ORDER BY topic',
      [userId, sp.class_level, sp.subject]
    );

    const topicsOut = topics.map(tp => ({
      topic: tp.topic,
      questions_answered: parseInt(tp.questions_answered),
      correct: parseInt(tp.correct),
      accuracy: parseInt(tp.questions_answered) > 0
        ? Number((parseInt(tp.correct) / parseInt(tp.questions_answered)).toFixed(4))
        : 0.0,
      mastery_score: parseFloat(tp.mastery_score || 0),
      mastered: !!tp.mastered,
    }));

    subjectsOut.push({
      class_level: parseInt(sp.class_level),
      subject: sp.subject,
      questions_answered: parseInt(sp.questions_answered),
      correct: parseInt(sp.correct),
      accuracy: sAcc,
      topics: topicsOut,
    });
  }

  // Mastered count
  const { cnt } = await fetchOne(
    'SELECT COUNT(*) as cnt FROM topic_progress WHERE user_id = ? AND mastered = 1',
    [userId]
  ) || { cnt: 0 };

  return {
    overall: {
      questions_answered: parseInt(user?.total_questions || 0),
      correct: parseInt(user?.total_correct || 0),
      accuracy: overallAcc,
      lifetime_score: parseInt(user?.lifetime_score || 0),
      current_streak: parseInt(user?.current_streak || 0),
      longest_streak: parseInt(user?.longest_streak || 0),
    },
    subjects: subjectsOut,
    topics_mastered: parseInt(cnt),
  };
}

module.exports = { publicUser, buildProgress, publicAvatar };