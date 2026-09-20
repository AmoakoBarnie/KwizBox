import { useState } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../auth.jsx'
import { api } from '../api.js'
import Mascot from '../components/Mascot.jsx'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: 0.06 * i, duration: 0.4, ease: 'easeOut' } }),
}

const pop = {
  hidden: { opacity: 0, scale: 0.85 },
  show: (i = 0) => ({ opacity: 1, scale: 1, transition: { delay: 0.04 * i, type: 'spring', stiffness: 280, damping: 16 } }),
}

function CopyButton({ text, label = 'Copy code' }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      className="btn primary copy-btn"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        } catch {}
      }}
    >
      {copied ? '✓ Copied!' : `📋 ${label}`}
    </button>
  )
}

/** Leaderboard row for challenge compare */
function LBRow({ entry, i, isYou }) {
  const medal = i === 1 ? '🥇' : i === 2 ? '🥈' : i === 3 ? '🥉' : `#${i}`
  const grade = entry.accuracy >= 90 ? '🌟' : entry.accuracy >= 75 ? '👍' : entry.accuracy >= 60 ? '📚' : entry.accuracy >= 45 ? '📖' : '💪'
  return (
    <motion.div
      key={entry.session_id || i}
      className={`lb-row ${isYou ? 'you' : ''}`}
      variants={pop} custom={i} initial="hidden" animate="show"
    >
      <span className="lb-rank">{isYou ? '🫵' : medal}</span>
      <span className="lb-name">{entry.nickname}</span>
      <span className="lb-score">{entry.score} pts</span>
      <span className="lb-correct">{entry.correct}/{entry.total}</span>
      <span className="lb-acc">{entry.accuracy}% {grade}</span>
      {entry.class_level && <span className="lb-class">{entry.class_level}</span>}
    </motion.div>
  )
}

const CLASSES = ['B4', 'B5', 'B6', 'B7', 'B8', 'B9']
const SUBJECTS = ['Mathematics', 'Science', 'Computing', 'English', 'Social Studies',
  'French', 'Ghanaian Language', 'History', 'Our World and Our People',
  'Creative Arts', 'Physical Education', 'Religious and Moral Education',
  'Career Technology', 'Arabic', 'Mixed']

function CodeDisplay({ code }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="code-display">
      <span className="code-big">{code}</span>
      <button
        className="btn primary copy-btn"
        onClick={async () => {
          try { await navigator.clipboard.writeText(code); setCopied(true) }
          catch {}
          setTimeout(() => setCopied(false), 2000)
        }}
      >
        {copied ? '✓ Copied!' : '📋 Copy code'}
      </button>
    </div>
  )
}

export default function Challenge() {
  const nav = useNavigate()
  const { user, token, isGuest } = useAuth()
  const [mode, setMode] = useState('create') // 'create' | 'join' | 'play' | 'compare' | 'awaiting'
  const [classLevel, setClassLevel] = useState('B4')
  const [subject, setSubject] = useState('Science')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [myChallenge, setMyChallenge] = useState(null)
  const [questions, setQuestions] = useState([])
  const [compare, setCompare] = useState(null)

  async function createChallenge() {
    if (isGuest) { setError('Sign in to create a challenge'); return }
    if (!token) { setError('Not signed in'); return }
    setLoading(true); setError('')
    try {
      const res = await api.challenge.create({ class_level: classLevel, subject }, token)
      setMyChallenge(res)
      setMode('awaiting')
    } catch (e) {
      setError(e.message || 'Failed to create challenge')
    } finally {
      setLoading(false)
    }
  }

  async function joinChallenge() {
    if (!code.trim()) { setError('Enter a challenge code'); return }
    setLoading(true); setError('')
    try {
      const ccode = code.trim().toUpperCase()
      const res = await api.challenge.join(ccode, token)
      setCode(res.challenge_code || ccode)
      setMyChallenge({ code: res.challenge_code, class_level: res.class_level, subject: res.subject })
      setQuestions(res.questions || [])
      setMode('play')
    } catch (e) {
      setError(e.message || 'Invalid or expired challenge code')
    } finally {
      setLoading(false)
    }
  }

  async function loadQuestions() {
    if (!myChallenge) return
    setLoading(true)
    try {
      const res = await api.challenge.questions(myChallenge.code, token)
      setQuestions(res)
      setMode('play')
    } catch (e) {
      setError(e.message || 'Could not load questions')
    } finally {
      setLoading(false)
    }
  }

  async function compareScores() {
    if (!myChallenge) return
    setLoading(true)
    try {
      const res = await api.challenge.compare(myChallenge.code)
      setCompare(res)
      setMode('compare')
    } catch (e) {
      setError(e.message || 'Could not load leaderboard')
    } finally {
      setLoading(false)
    }
  }

  function startQuiz() {
    if (questions.length === 0) return
    nav('/quiz', { state: { challengeCode: myChallenge.code } })
  }

  return (
    <div className="screen challenge-screen">
      <motion.div className="card" variants={fadeUp} custom={0} initial="hidden" animate="show">
        <h2 style={{ margin: '0 0 4px', fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800 }}>
          🤝 Friend Challenge
        </h2>
        <p className="hint" style={{ margin: '0 0 16px' }}>
          Play the same 12 questions as your friend and compare scores!
        </p>

        <div className="tabs" style={{ marginBottom: 16 }}>
          <button className={`tab ${mode === 'create' ? 'active' : ''}`} onClick={() => setMode('create')}>
            Create challenge
          </button>
          <button className={`tab ${mode === 'join' ? 'active' : ''}`} onClick={() => setMode('join')}>
            Join challenge
          </button>
        </div>

        {/* CREATE MODE */}
        {mode === 'create' && (
          <motion.div variants={fadeUp} custom={1} initial="hidden" animate="show">
            <div className="form">
              <div className="form-row">
                <label>
                  Your class
                  <select value={classLevel} onChange={e => setClassLevel(e.target.value)}
                    disabled={loading || isGuest}>
                    {CLASSES.map(c => <option key={c} value={c}>Class {c}</option>)}
                  </select>
                </label>
                <label>
                  Subject
                  <select value={subject} onChange={e => setSubject(e.target.value)}
                    disabled={loading || isGuest}>
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
              </div>
            </div>
            <button className="btn primary" onClick={createChallenge} disabled={loading || isGuest}
              whileTap={{ scale: 0.97 }}>
              {loading ? 'Creating...' : '🎯 Create challenge'}
            </button>
            {isGuest && (
              <p className="hint" style={{ marginTop: 8, color: 'var(--red)' }}>
                Sign in to create challenges. Guest players can only join.
              </p>
            )}
          </motion.div>
        )}

        {/* JOIN MODE */}
        {mode === 'join' && (
          <motion.div variants={fadeUp} custom={1} initial="hidden" animate="show">
            <div className="form">
              <label>
                Challenge code
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. A1B2C3"
                  maxLength={6}
                  style={{ fontFamily: 'var(--font-display)', fontWeight: 800, letterSpacing: 4, fontSize: 22 }}
                  disabled={loading}
                  autoFocus
                />
              </label>
            </div>
            <button className="btn primary" onClick={joinChallenge} disabled={loading || !code.trim()}
              whileTap={{ scale: 0.97 }}>
              {loading ? 'Joining...' : '🎮 Join challenge'}
            </button>
          </motion.div>
        )}

        {/* ERROR */}
        {error && (
          <motion.p className="err" variants={fadeUp} custom={2} initial="hidden" animate="show">
            ❌ {error}
          </motion.p>
        )}

        {/* CREATED CHALLENGE — share code */}
        {myChallenge && mode === 'awaiting' && (
          <motion.div variants={fadeUp} custom={2} initial="hidden" animate="show">
            <p className="hint" style={{ margin: '0 0 8px' }}>Your challenge is ready! Share this code with your friend:</p>
            <CodeDisplay code={myChallenge.code} />
            <div className="challenge-meta">
              <span>🏫 Class {myChallenge.class_level}</span>
              <span>📚 {myChallenge.subject}</span>
              <span>📝 12 questions</span>
              <span>⏰ 24 hours</span>
            </div>
            <div className="row" style={{ marginTop: 16 }}>
              <button className="btn primary" onClick={loadQuestions} disabled={loading}
                whileTap={{ scale: 0.97 }}>
                {questions.length > 0 ? `📖 Load my ${questions.length} questions` : '📖 Load my questions'}
              </button>
              <button className="btn" onClick={() => setMode('create')} disabled={loading}
                whileTap={{ scale: 0.97 }}>
                Create another
              </button>
            </div>
          </motion.div>
        )}

        {/* HAVE QUESTIONS — start quiz */}
        {questions.length > 0 && mode === 'play' && (
          <motion.div variants={fadeUp} custom={2} initial="hidden" animate="show">
            <p className="hint" style={{ margin: '0 0 8px' }}>
              You have {questions.length} {myChallenge?.subject} questions for Class {myChallenge?.class_level}.
              Your friend uses the same code to get the exact same questions.
            </p>
            <div className="row">
              <button className="btn primary" onClick={startQuiz} whileTap={{ scale: 0.97 }}>
                ▶ Start my quiz
              </button>
              <button className="btn" onClick={compareScores} disabled={loading} whileTap={{ scale: 0.97 }}>
                {loading ? 'Loading...' : '🏅 Check leaderboard'}
              </button>
              <button className="btn" onClick={() => setMode('create')} whileTap={{ scale: 0.97 }}>
                New challenge
              </button>
            </div>
          </motion.div>
        )}

        {/* COMPARE LEADERBOARD + HEAD-TO-HEAD CARD (Upgrade 9) */}
        {compare && mode === 'compare' && (
          <motion.div variants={fadeUp} custom={2} initial="hidden" animate="show">
            {/* --- Head-to-head card --- */}
            {compare.leaderboard.length >= 2 && (
              <div className="hh-card">
                <h3 style={{ margin: "16px 0 8px", fontSize: 18, fontFamily: 'var(--font-display)', fontWeight: 800 }}>
                  🥊 You vs Friend
                </h3>
                {(() => {
                  const sorted = [...compare.leaderboard].sort((a, b) => b.score - a.score)
                  const me = sorted.find(e => e.is_creator)
                  const friend = sorted.find(e => !e.is_creator)
                  if (!me || !friend) return null
                  const meWon = me.score > friend.score
                  const friendWon = friend.score > me.score
                  const emoji = meWon ? '🏆' : friendWon ? '😅' : '🤝'
                  const title = meWon ? 'You won!' : friendWon ? `${friend.nickname} won!` : 'It\'s a tie!'
                  const streakBadge = e => e.max_streak ? `🔥 best streak ${e.max_streak}` : ''
                  return (
                    <div className="hh-cols">
                      <div className={`hh-col${meWon ? ' winner' : ''}`}>
                        <div className="hh-you-badge">
                          <span className="hh-you-label">You</span>
                          <span className="hh-you-nick">{me.nickname}</span>
                        </div>
                        <div className="hh-score-big">{me.score}<span className="hh-score-unit">pts</span></div>
                        <div className="hh-stats">
                          <span>{me.correct}/{me.total} correct</span>
                          <span>{me.accuracy}%</span>
                          {streakBadge(me) && <span>{streakBadge(me)}</span>}
                        </div>
                      </div>
                      <div className="hh-vs">
                        <span className="hh-vs-emoji">{emoji}</span>
                        <span className="hh-vs-title">{title}</span>
                      </div>
                      <div className={`hh-col${friendWon ? ' winner' : ''}`}>
                        <div className="hh-friend-badge">
                          <span className="hh-friend-label">Friend</span>
                          <span className="hh-friend-nick">{friend.nickname}</span>
                        </div>
                        <div className="hh-score-big">{friend.score}<span className="hh-score-unit">pts</span></div>
                        <div className="hh-stats">
                          <span>{friend.correct}/{friend.total} correct</span>
                          <span>{friend.accuracy}%</span>
                          {streakBadge(friend) && <span>{streakBadge(friend)}</span>}
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}

            <div className="compare-header">
              <span className="code-tag">{compare.code}</span>
              <h3>Class {compare.class_level} · {compare.subject}</h3>
              <p className="hint">{compare.leaderboard?.length || 0} player{(compare.leaderboard?.length || 0) !== 1 ? 's' : ''} played · {compare.status === 'completed' ? '✅ Finished' : '⏳ In progress'}</p>
            </div>

            {(!compare.leaderboard || compare.leaderboard.length === 0) ? (
              <p className="hint" style={{ textAlign: 'center', marginTop: 16 }}>
                No scores yet. Play a quiz and come back!
              </p>
            ) : (
              <div className="lb-list">
                {compare.leaderboard.map((entry, i) => (
                  <LBRow key={entry.session_id || i} entry={entry} i={i} isYou={entry.is_creator} />
                ))}

              </div>
            )}

            <div className="row" style={{ marginTop: 16 }}>
              <button className="btn primary" onClick={() => setMode('awaiting')} whileTap={{ scale: 0.97 }}>
                Back to code
              </button>
              <button className="btn" onClick={() => setMode('create')} whileTap={{ scale: 0.97 }}>
                New challenge
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* How it works */}
      <motion.div className="how-it-works" variants={fadeUp} custom={1} initial="hidden" animate="show">
        <h4 style={{ margin: '0 0 8px', fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700 }}>
          How it works
        </h4>
        <div className="steps">
          <div className="step">
            <span className="step-num">1</span>
            <div>
              <strong>Create</strong>
              <p className="hint" style={{ margin: 0 }}>Pick your class and subject. Get a 6-letter code.</p>
            </div>
          </div>
          <div className="step">
            <span className="step-num">2</span>
            <div>
              <strong>Share</strong>
              <p className="hint" style={{ margin: 0 }}>Send the code to your friend (text, call, etc.)</p>
            </div>
          </div>
          <div className="step">
            <span className="step-num">3</span>
            <div>
              <strong>Both play</strong>
              <p className="hint" style={{ margin: 0 }}>Enter the code, take the same 12 questions.</p>
            </div>
          </div>
          <div className="step">
            <span className="step-num">4</span>
            <div>
              <strong>Compare</strong>
              <p className="hint" style={{ margin: 0 }}>See who scored higher on the leaderboard.</p>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="row">
        <button className="btn" onClick={() => nav('/play')} whileTap={{ scale: 0.96 }}>
          ← Back to play
        </button>
      </div>
    </div>
  )
}
