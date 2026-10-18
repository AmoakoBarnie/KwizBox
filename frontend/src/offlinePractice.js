const DB_NAME = 'kwizbox-offline-practice'
const STORE_NAME = 'packs'
const ACTIVE_PACK_KEY = 'active'
const FALLBACK_KEY = 'kwizbox_offline_practice_pack'
const MEDIA_CACHE = 'kwizbox-offline-media'

function openDatabase() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Could not open offline storage'))
  })
}

function readFallback() {
  try {
    const saved = globalThis.localStorage?.getItem(FALLBACK_KEY)
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

export async function getOfflinePack() {
  try {
    const db = await openDatabase()
    if (db) {
      let pack
      try {
        pack = await new Promise((resolve, reject) => {
          const transaction = db.transaction(STORE_NAME, 'readonly')
          const request = transaction.objectStore(STORE_NAME).get(ACTIVE_PACK_KEY)
          let value = null
          request.onsuccess = () => { value = request.result || null }
          request.onerror = () => reject(request.error || new Error('Could not read offline pack'))
          transaction.oncomplete = () => resolve(value)
          transaction.onerror = () => reject(transaction.error || new Error('Could not read offline pack'))
          transaction.onabort = () => reject(transaction.error || new Error('Could not read offline pack'))
        })
      } finally {
        db.close()
      }
      return pack || readFallback()
    }
  } catch {
    // Fall back to localStorage for browsers where IndexedDB is unavailable or blocked.
  }
  return readFallback()
}

export async function saveOfflinePack(pack) {
  if (!pack || !Array.isArray(pack.questions) || pack.questions.length === 0) {
    throw new Error('There are no questions to save for offline practice.')
  }

  try {
    const db = await openDatabase()
    if (db) {
      try {
        await new Promise((resolve, reject) => {
          const transaction = db.transaction(STORE_NAME, 'readwrite')
          transaction.objectStore(STORE_NAME).put(pack, ACTIVE_PACK_KEY)
          transaction.oncomplete = resolve
          transaction.onerror = () => reject(transaction.error || new Error('Could not save offline pack'))
          transaction.onabort = () => reject(transaction.error || new Error('Could not save offline pack'))
        })
        return
      } finally {
        db.close()
      }
    }
  } catch {
    // Try the smaller localStorage fallback before reporting a storage failure.
  }

  try {
    globalThis.localStorage?.setItem(FALLBACK_KEY, JSON.stringify(pack))
    if (!globalThis.localStorage) throw new Error('Local storage is unavailable')
  } catch {
    throw new Error('This browser could not save the offline pack. Check device storage and try again.')
  }
}

export async function clearOfflinePack() {
  try {
    const db = await openDatabase()
    if (db) {
      try {
        await new Promise((resolve, reject) => {
          const transaction = db.transaction(STORE_NAME, 'readwrite')
          transaction.objectStore(STORE_NAME).delete(ACTIVE_PACK_KEY)
          transaction.oncomplete = resolve
          transaction.onerror = () => reject(transaction.error || new Error('Could not clear offline pack'))
          transaction.onabort = () => reject(transaction.error || new Error('Could not clear offline pack'))
        })
      } finally {
        db.close()
      }
    }
  } catch {
    // The fallback below is still useful if IndexedDB is unavailable.
  }
  try { globalThis.localStorage?.removeItem(FALLBACK_KEY) } catch {}
  try { await globalThis.caches?.delete(MEDIA_CACHE) } catch {}
}

export async function cacheOfflineMedia(questions) {
  if (typeof caches === 'undefined' || typeof fetch === 'undefined' || typeof location === 'undefined') return
  const urls = [...new Set((questions || []).map((question) => question.image_url).filter(Boolean))]
    .map((url) => {
      try { return new URL(url, location.origin) } catch { return null }
    })
    .filter((url) => url && url.origin === location.origin)

  if (!urls.length) return
  const cache = await caches.open(MEDIA_CACHE)
  await Promise.allSettled(urls.map(async (url) => {
    const response = await fetch(url.href)
    if (response.ok) await cache.put(url.href, response.clone())
  }))
}

const DIFFICULTY_BASE = { Easy: 10, Medium: 15, Hard: 25 }
const STREAK_MULTIPLIER = { 1: 1, 2: 1.1, 3: 1.25, 4: 1.5 }

export function offlineQuestionPoints(difficulty, secondsTaken, streak) {
  const base = DIFFICULTY_BASE[difficulty] || DIFFICULTY_BASE.Easy
  const bonus = secondsTaken > 0
    ? Math.round(5 * Math.max(0, Math.min(1, (36 - secondsTaken) / 24)))
    : 0
  const multiplier = streak >= 5 ? 2 : (STREAK_MULTIPLIER[streak] || 1)
  return Math.round((base + bonus) * multiplier)
}

export function buildOfflineResult(questions, answers) {
  const questionById = new Map((questions || []).map((question) => [question.id, question]))
  let correct = 0
  let currentStreak = 0
  let longestStreak = 0
  let score = 0
  const pointsBreakdown = {}
  const pointsBreakdownList = []

  const feedback = (answers || []).map((answer) => {
    const question = questionById.get(answer.question_id)
    if (!question) throw new Error(`Question ${answer.question_id} is missing from the offline pack.`)

    const isCorrect = answer.selected_index === question.answer_index
    let points = 0
    if (isCorrect) {
      correct += 1
      currentStreak += 1
      longestStreak = Math.max(longestStreak, currentStreak)
      points = offlineQuestionPoints(question.difficulty, answer.seconds_taken, currentStreak)
      score += points
      pointsBreakdown[question.difficulty] = (pointsBreakdown[question.difficulty] || 0) + points
    } else {
      currentStreak = 0
    }
    pointsBreakdownList.push({ question_id: question.id, points })

    return {
      question_id: question.id,
      selected_index: answer.selected_index,
      correct_index: question.answer_index,
      is_correct: isCorrect,
      explanation: question.explanation || '',
      question: question.question,
      options: question.options || [],
      points,
      topic: question.topic || null,
    }
  })

  const total = feedback.length
  return {
    offline: true,
    session_id: 0,
    total,
    correct,
    accuracy: total ? correct / total : 0,
    score,
    streak: longestStreak,
    points_breakdown: pointsBreakdown,
    feedback,
    points_breakdown_list: pointsBreakdownList,
  }
}
