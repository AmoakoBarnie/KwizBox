import test from 'node:test'
import assert from 'node:assert/strict'
import { buildOfflineResult, offlineQuestionPoints } from '../src/offlinePractice.js'

const questions = [
  {
    id: 1,
    question: 'What is 2 + 2?',
    options: ['3', '4', '5', '6'],
    answer_index: 1,
    difficulty: 'Easy',
    topic: 'Addition',
    explanation: 'Add the two numbers.',
  },
  {
    id: 2,
    question: 'Which planet is known as the Red Planet?',
    options: ['Earth', 'Mars', 'Venus', 'Jupiter'],
    answer_index: 1,
    difficulty: 'Hard',
    topic: 'Space',
    explanation: 'Mars appears red because of iron-rich dust.',
  },
  {
    id: 3,
    question: 'The sun is a star.',
    options: ['True', 'False'],
    answer_index: 0,
    difficulty: 'Medium',
    topic: 'Space',
    explanation: 'The sun is the star at the centre of our solar system.',
  },
]

test('offline scoring applies the same base, speed, and streak rules', () => {
  assert.equal(offlineQuestionPoints('Easy', 12, 1), 15)
  assert.equal(offlineQuestionPoints('Hard', 36, 2), 28)
  assert.equal(offlineQuestionPoints('Medium', 60, 5), 30)
})

test('offline results include answer review and do not look like a server session', () => {
  const result = buildOfflineResult(questions, [
    { question_id: 1, selected_index: 1, seconds_taken: 12 },
    { question_id: 2, selected_index: 1, seconds_taken: 36 },
    { question_id: 3, selected_index: 1, seconds_taken: 8 },
  ])

  assert.equal(result.offline, true)
  assert.equal(result.session_id, 0)
  assert.equal(result.total, 3)
  assert.equal(result.correct, 2)
  assert.equal(result.accuracy, 2 / 3)
  assert.equal(result.score, 43)
  assert.equal(result.streak, 2)
  assert.deepEqual(result.points_breakdown, { Easy: 15, Hard: 28 })
  assert.equal(result.feedback[2].is_correct, false)
  assert.equal(result.feedback[2].correct_index, 0)
  assert.equal(result.feedback[2].explanation, questions[2].explanation)
  assert.deepEqual(result.points_breakdown_list, [
    { question_id: 1, points: 15 },
    { question_id: 2, points: 28 },
    { question_id: 3, points: 0 },
  ])
})

test('offline results reject answers for questions that are not in the saved pack', () => {
  assert.throws(
    () => buildOfflineResult(questions, [{ question_id: 99, selected_index: 0 }]),
    /missing from the offline pack/,
  )
})

test('a saved offline pack can be loaded and removed using the storage fallback', async () => {
  const originalStorage = globalThis.localStorage
  const values = new Map()
  const storage = {
    getItem(key) { return values.has(key) ? values.get(key) : null },
    setItem(key, value) { values.set(key, String(value)) },
    removeItem(key) { values.delete(key) },
  }
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage })

  try {
    const { clearOfflinePack, getOfflinePack, saveOfflinePack } = await import('../src/offlinePractice.js')
    const saved = { config: { class_level: 'B9', subject: 'Mathematics' }, questions }
    await saveOfflinePack(saved)
    assert.deepEqual(await getOfflinePack(), saved)
    await clearOfflinePack()
    assert.equal(await getOfflinePack(), null)
  } finally {
    if (originalStorage === undefined) delete globalThis.localStorage
    else Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: originalStorage })
  }
})
