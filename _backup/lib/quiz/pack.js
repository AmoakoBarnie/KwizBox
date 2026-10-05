// api/quiz/pack.js — POST /api/quiz/pack
const { json, ok, error } = require('../shared/response');
const { query, fetchAll, fetchOne, lastInsertId } = require('../shared/db');
const { currentUser } = require('../shared/auth');
const { publicOptions } = require('../shared/questionTypes');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return error(res, 'Method not allowed', 405);

  const body = req.body || {};
  const classLevel = (body.class_level || '').trim();
  const subject = (body.subject || 'Mixed').trim();
  const difficulty = (body.difficulty || '').trim();
  const topic = (body.topic || '').trim();
  const subTopic = (body.sub_topic || '').trim();
  const count = Math.max(1, Math.min(50, parseInt(body.count || 10)));
  const daily = !!(body.daily || false);
  const excludeIds = (body.exclude_ids || []).map(Number);

  if (!classLevel) return error(res, 'class_level is required', 400);

  // Build pool query
  const conditions = ['class_level = ?', 'is_active = 1'];
  const params = [classLevel];

  if (subject && subject !== 'Mixed') { conditions.push('subject = ?'); params.push(subject); }
  if (difficulty) { conditions.push('difficulty = ?'); params.push(difficulty); }
  if (topic) { conditions.push('topic = ?'); params.push(topic); }
  if (subTopic) { conditions.push('sub_topic = ?'); params.push(subTopic); }

  const poolRows = await fetchAll(
    `SELECT id FROM questions WHERE ${conditions.join(' AND ')}`,
    params
  );
  let poolIds = poolRows.map(r => r.id).filter(n => !isNaN(n));

  // Exclude already-answered
  if (excludeIds.length > 0) {
    poolIds = poolIds.filter(id => !excludeIds.includes(id));
  }

  // Filter legacy duplicates
  poolIds = poolIds.filter(id => id >= 100000 || id < 130570);

  if (poolIds.length === 0) return error(res, 'No questions found for this selection', 404);

  const user = currentUser(req);
  const userId = user ? parseInt(user.sub) : null;

  // Select pack IDs
  const chosenIds = selectPackIds(poolIds, count, daily, userId);

  // Fetch questions in chosen order
  const placeholders = chosenIds.map(() => '?').join(',');
  const questions = await fetchAll(
    `SELECT * FROM questions WHERE id IN (${placeholders})`,
    chosenIds
  );

  const byId = {};
  for (const q of questions) byId[q.id] = q;

  const out = [];
  for (const id of chosenIds) {
    if (!byId[id]) continue;
    const q = byId[id];
    out.push(toQuestionOut(q));
  }

  // Open session for authenticated users
  let sessionId = null;
  if (userId !== null) {
    const [result] = await query(
      `INSERT INTO quiz_sessions (user_id, class_level, subject, difficulty, topic, status, started_at)
       VALUES (?, ?, ?, ?, ?, 'active', NOW())`,
      [userId, classLevel, subject || null, difficulty || null, topic || null]
    );
    sessionId = result.insertId;

    // Set custom headers (Vercel: use res.set)
    res.setHeader('X-Session-Id', String(sessionId));
    res.setHeader('X-Question-Ids', chosenIds.join(', '));
  }

  return ok(res, out);
};

function toQuestionOut(q) {
  return {
    id: parseInt(q.id),
    class_level: q.class_level,
    subject: q.subject,
    topic: q.topic,
    sub_topic: q.sub_topic || null,
    strand: q.strand,
    difficulty: q.difficulty,
    question: q.question,
    options: publicOptions(q.question_type, q.option_a, q.option_b, q.option_c, q.option_d),
    question_type: q.question_type || 'mcq',
    image_url: q.image_url || null,
  };
}

async function selectPackIds(poolIds, count, daily, userId) {
  if (daily) {
    const seed = parseInt(new Date().toISOString().slice(0, 10).replace(/-/g, ''));
    const pool = [...poolIds];
    // Deterministic shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const seedStr = String(seed + i);
      let h = 0;
      for (let j = 0; j < seedStr.length; j++) h = ((h << 5) - h) + seedStr.charCodeAt(j);
      const rand = Math.abs(h) % (i + 1);
      [pool[i], pool[rand]] = [pool[rand], pool[i]];
    }
    return pool.slice(0, count);
  }

  if (userId === null) {
    // Guest: random sample
    const pool = [...poolIds];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, count);
  }

  // Authenticated: prefer unseen
  const seenRows = userId !== null
    ? await fetchAll(
        `SELECT question_id, seen_at FROM user_question_seen WHERE user_id = ? AND question_id IN (${poolIds.map(() => '?').join(',')})`,
        [userId, ...poolIds]
      )
    : [];

  const seenIds = {};
  const seenWithTime = [];
  for (const r of seenRows) {
    seenIds[r.question_id] = true;
    seenWithTime.push({ id: r.question_id, seen_at: r.seen_at });
  }

  // Sort seen oldest-first
  seenWithTime.sort((a, b) => {
    if (!a.seen_at) return 1;
    if (!b.seen_at) return -1;
    return a.seen_at < b.seen_at ? -1 : a.seen_at > b.seen_at ? 1 : 0;
  });

  const unseen = poolIds.filter(id => !seenIds[id]);
  for (let i = unseen.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [unseen[i], unseen[j]] = [unseen[j], unseen[i]];
  }

  const chosen = unseen.slice(0, count);
  const chosenSet = new Set(chosen);

  if (chosen.length < count) {
    const need = count - chosen.length;
    const recycle = seenWithTime
      .filter(r => !chosenSet.has(r.id))
      .map(r => r.id);
    for (let i = recycle.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [recycle[i], recycle[j]] = [recycle[j], recycle[i]];
    }
    const shuffled = recycle.slice(0, need);
    for (const id of shuffled) chosen.push(id);
  }

  for (let i = chosen.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chosen[i], chosen[j]] = [chosen[j], chosen[i]];
  }

  return chosen;
}