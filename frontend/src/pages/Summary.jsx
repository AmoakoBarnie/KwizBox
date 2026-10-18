import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../auth.jsx'
import Mascot from '../components/Mascot.jsx'
import Confetti from '../components/Confetti.jsx'
import { evaluateBadges } from '../badges.js'
import { levelUp } from '../sound.js'
import { useState, useEffect, useMemo } from 'react'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: 0.06 * i, duration: 0.4, ease: 'easeOut' } }),
}

const statFade = {
  hidden: { opacity: 0, y: 20, scale: 0.85 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 220, damping: 14 } },
}

function CountUp({ to, suffix = '' }) {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.span
        initial={{ count: 0 }}
        animate={{ count: to }}
        transition={{ duration: 1.0, ease: 'easeOut' }}
        onUpdate={(l) => {}}
      >
        {to}
      </motion.span>{suffix}
    </motion.span>
  )
}

/** Step-by-step explanation with collapsible steps */
function ExplanationSteps({ explanation }) {
  const [expanded, setExpanded] = useState(false)
  const steps = explanation
    .split(/(?<=\.)\s+|(?=→)|\n+/)
    .map(s => s.trim())
    .filter(Boolean)

  if (steps.length === 0) return null
  if (steps.length === 1) {
    return <p className="rq-explain">💡 {steps[0]}</p>
  }

  return (
    <div className="rq-steps">
      <button className="rq-steps-toggle" onClick={() => setExpanded(e => !e)}>
        {expanded ? '▾ Hide steps' : '▸ Show all steps'}
      </button>
      <ol className={`rq-steps-list ${expanded ? 'open' : ''}`}>
        {steps.map((s, i) => (
          <li key={i} className={i === 0 ? 'first' : ''}>
            {s}
          </li>
        ))}
      </ol>
      {!expanded && <p className="rq-explain rq-first">💡 {steps[0]}</p>}
    </div>
  )
}

function renderReviewItem({ f, n }) {
  return (
    <motion.div
      key={f.question_id}
      className={`review ${f.is_correct ? 'correct' : 'wrong'}`}
      variants={fadeUp}
      custom={n}
      initial="hidden"
      animate="show"
      transition={{ delay: 0.35 + 0.04 * n }}
    >
      <p className="rq">
        <span className="rq-num">{n + 1}</span>
        <span className={`rq-tag ${f.is_correct ? 'ok' : 'no'}`}>
          {f.is_correct ? '✅ Right' : '❌ Wrong'}
        </span>
        {f.points != null && <span className="rq-points">+{f.points} pts</span>}
      </p>
      <p className="rq-q">{f.question}</p>
      <p className="rq-a">
        Your answer:{' '}
        <b>{f.selected_index >= 0
          ? `${String.fromCharCode(65 + f.selected_index)}. ${f.options[f.selected_index]}`
          : '— (no answer)'}</b>
      </p>
      {!f.is_correct && (
        <p className="rq-correct">
          Correct answer:{' '}
          <b>{String.fromCharCode(65 + f.correct_index)}. {f.options[f.correct_index]}</b>
        </p>
      )}
      {f.explanation && <ExplanationSteps explanation={f.explanation} />}
    </motion.div>
  )
}

/** Compute topic-level diagnostics from feedback */
function useTopicDiagnostics(feedback) {
  return useMemo(() => {
    const topicStats = {}
    feedback.forEach(f => {
      if (!f.topic) return
      if (!topicStats[f.topic]) {
        topicStats[f.topic] = { correct: 0, total: 0 }
      }
      topicStats[f.topic].total += 1
      if (f.is_correct) {
        topicStats[f.topic].correct += 1
      }
    })
    
    const topics = Object.entries(topicStats).map(([topic, stats]) => ({
      topic,
      accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
      correct: stats.correct,
      total: stats.total
    }))
    
    // Sort by accuracy ascending (weakest first)
    topics.sort((a, b) => a.accuracy - b.accuracy)
    
    return {
      all: topics,
      needsPractice: topics.filter(t => t.accuracy < 60 && t.total >= 1),
      strong: topics.filter(t => t.accuracy >= 80 && t.total >= 1),
    }
  }, [feedback])
}

function renderSummary({ result, cfg, nav, user, isGuest, fromStorage = false, offline = false }) {
  // Evaluate & award badges
  if (user && !isGuest && !offline) {
    const existingBadges = JSON.parse(localStorage.getItem('stem_badges') || '[]')
    const { newBadges, newlyAwarded } = evaluateBadges(result, cfg, existingBadges)
    if (newBadges.length > existingBadges.length) {
      localStorage.setItem('stem_badges', JSON.stringify(newBadges))
      window.__lastQuizResult = result
      window.__lastQuizCfg = cfg
      levelUp()
    }
  }

  const { total, correct, accuracy, score, streak, feedback } = result
  const pct = Math.round(accuracy * 100)
  const mistakes = feedback.filter((f) => !f.is_correct)
  const gotRight = total - mistakes.length
  const perfectScore = pct === 100 && total >= 5
  const celebrate = pct >= 50
  const highScore = pct >= 80
  
  // Topic diagnostics
  const topicDiag = useTopicDiagnostics(feedback)
  const hasMultipleTopics = topicDiag.all.length > 1

  return (
    <motion.div className="screen summary"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>

      {/* Ghana flag gradient wash behind everything */}
      <div className="summary-glow" aria-hidden="true" />

      <AnimatePresence>{perfectScore && <Confetti perfect={true} />}</AnimatePresence>

      {/* TOP ROW: trophy + heading */}
      <div className="summary-top">
        <motion.div className={`trophy trophy-${perfectScore ? 'gold' : highScore ? 'gold' : pct >= 50 ? 'green' : 'muted'}`}
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: perfectScore ? 300 : 220, damping: 12, delay: 0.05 }}
        >
          {perfectScore ? '🏆' : highScore ? '🏆' : pct >= 50 ? '🎉' : '💪'}
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className={`summary-heading ${perfectScore ? 'gold' : highScore ? 'gold' : pct >= 50 ? 'green' : ''}`}
        >
          {perfectScore ? 'PERFECT SCORE! 🎯' : highScore ? 'Brilliant!' : pct >= 50 ? 'Good effort!' : 'Keep practising!'}
        </motion.h2>
      </div>

      {offline && (
        <p className="offline-practice-banner summary-offline-banner" role="status">
          Offline practice result · saved on this device only; no account progress or leaderboard points were recorded.
        </p>
      )}

      {/* MAIN GRID: mascot + stats on left, review on right (stacked on mobile) */}
      <div className="summary-grid">
        {/* LEFT COLUMN */}
        <div className="summary-left">
          {/* Give every completed quiz a quick hop; the expression reflects the score. */}
          <motion.div className="mascot-frame"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.18, type: 'spring', stiffness: 200, damping: 14 }}
          >
            <Mascot
              state={celebrate ? 'celebrate' : 'encourage'}
              size={130}
              gender="female"
              classLevel={cfg?.class_level}
              jumping={true}
            />
          </motion.div>

          {/* Score — with optional daily badge */}
          <motion.p className="big-score"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.25 }}
          >
            {score} <span className="score-unit">pts</span>
            {cfg?.daily && (
              <motion.span
                className="daily-badge"
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.35, type: 'spring', stiffness: 300, damping: 14 }}
              >
                {offline ? '☀️ Saved daily pack' : '☀️ Daily Challenge'}
              </motion.span>
            )}
          </motion.p>

          {/* Topic diagnostics */}
          {hasMultipleTopics && (
            <motion.div className="topic-diagnostics"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h3>Topic performance</h3>
              {topicDiag.needsPractice.length > 0 && (
                <div className="topic-section needs-practice">
                  <p className="ts-title">Needs practice:</p>
                  {topicDiag.needsPractice.map(t => (
                    <span key={t.topic} className="ts-item">
                      {t.topic} ({t.accuracy}%)
                    </span>
                  ))}
                </div>
              )}
              {topicDiag.strong.length > 0 && (
                <div className="topic-section strong">
                  <p className="ts-title">Strong:</p>
                  {topicDiag.strong.map(t => (
                    <span key={t.topic} className="ts-item">
                      {t.topic} ({t.accuracy}%)
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Stats ring (visual donut showing pct) */}
          <div className="summary-stats">
            <div className="stat-ring">
              <svg viewBox="0 0 36 36" className="stat-ring-svg">
                <path
                  className="stat-ring-bg"
                  stroke="currentColor" strokeWidth="3" fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <motion.path
                  className={`stat-ring-fill stat-ring-fill-${perfectScore ? 'gold' : pct >= 80 ? 'gold' : pct >= 50 ? 'green' : 'muted'}`}
                  stroke="currentColor" strokeWidth="3" fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${(pct / 100) * 100}, 100`}
                  initial={{ strokeDasharray: '0, 100' }}
                  animate={{ strokeDasharray: `${(pct / 100) * 100}, 100` }}
                  transition={{ delay: 0.3, duration: 1.2, ease: 'easeOut' }}
                />
              </svg>
              <div className="stat-ring-label">
                <CountUp to={pct} suffix="%" />
              </div>
            </div>

            {/* Stat row */}
            <motion.div className="stat-row"
              variants={fadeUp}
              custom={0}
              initial="hidden"
              animate="show"
              transition={{ delay: 0.35 }}
            >
              <div className="stat" variants={fadeUp}>
                <b>{correct}/{total}</b>
                <span>Correct</span>
              </div>
              <div className="stat" variants={fadeUp} custom={1}>
                <b>{streak}🔥</b>
                <span>Streak</span>
              </div>
            </motion.div>
          </div>

          {/* Persistent actions — online results can also open the leaderboard. */}
          <div className="summary-actions">
            <motion.button
              className="action-btn primary"
              onClick={() => nav(offline ? '/quiz?offline=true' : '/play')}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, type: 'spring', stiffness: 250, damping: 14 }}
            >
              <span className="action-icon">🔁</span>
              {offline ? 'Practice Again' : 'Play Again'}
            </motion.button>

            {!offline && (
              <motion.button
                className="action-btn"
                onClick={() => nav('/leaderboard')}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55, type: 'spring', stiffness: 250, damping: 14 }}
              >
                <span className="action-icon">🏅</span>
                Leaderboard
              </motion.button>
            )}

            <motion.button
              className="action-btn share-btn"
              onClick={async () => {
                const text = offline
                  ? `I practised offline and got ${pct}% on Ghana STEM Trivia! 🎓`
                  : `I just scored ${score} pts and got ${pct}% on Ghana STEM Trivia! 🎓`
                if (navigator.share) {
                  try { await navigator.share({ title: 'Ghana STEM Trivia', text }) } catch {}
                } else {
                  await navigator.clipboard.writeText(text).catch(() => {})
                  alert('Score copied to clipboard!')
                }
              }}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.62, type: 'spring', stiffness: 250, damping: 14 }}
            >
              <span className="action-icon">📤</span>
              Share
            </motion.button>
          </div>

          {/* Guest nudge — only when signed-in guest */}
          {user && isGuest && !offline && (
            <motion.div className="guest-nudge"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <p className="gn-title">🎮 Nice game! Create a free account to keep your score & streak.</p>
              <p className="gn-sub">Guest scores aren't saved. Sign up to keep playing and join the leaderboard.</p>
              <div className="row">
                <button className="btn primary" onClick={() => nav('/', { state: { openTab: 'signup' } })}>
                  Create account & continue
                </button>
                <button className="btn" onClick={() => nav('/play')}>Play as guest again</button>
              </div>
            </motion.div>
          )}
        </div>

        {/* RIGHT COLUMN: review list */}
        <div className="summary-right">
          <p className="review-intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            You got <b>{gotRight}</b> right and <b>{mistakes.length}</b> wrong.
            Here's every question with the answer and why:
          </p>

          <div className="review-list">
            {feedback.map((f, n) => renderReviewItem({ f, n }))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/** Helper to read from localStorage synchronously */
function readLocalStorageItem(key) {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : null
  } catch {
    return null
  }
}

export default function Summary() {
  const { state } = useLocation()
  const nav = useNavigate()
  const { user, isGuest } = useAuth()
  const locResult = state?.result
  const locCfg = state?.cfg

  // Read from localStorage synchronously for initial render (handles direct navigation)
  const storedResult = readLocalStorageItem('stem_last_result')
  const storedCfg = readLocalStorageItem('stem_last_cfg')

  // Use location state if available, otherwise localStorage
  const displayResult = locResult || storedResult
  const displayCfg = locCfg || storedCfg

  useEffect(() => {
    // Save to localStorage when we have a new result from navigation state
    if (locResult) {
      try { localStorage.setItem('stem_last_result', JSON.stringify(locResult)) } catch {}
      try { localStorage.setItem('stem_last_cfg', JSON.stringify(locCfg)) } catch {}
    }
  }, [locResult, locCfg])

  // System preference auto-detect (if mode selector exists elsewhere, skip)
  useEffect(() => {
    const html = document.documentElement
    const savedMode = localStorage.getItem('app_mode')
    if (!savedMode) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      html.setAttribute('data-mode', prefersDark ? 'dark' : 'light')
      localStorage.setItem('app_mode', prefersDark ? 'dark' : 'light')
    }
  }, [])

  if (!displayResult) {
    return (
      <div className="screen center">
        <p>No results to show.</p>
        <button className="btn primary" onClick={() => nav('/play')}>Play again</button>
      </div>
    )
  }

  return renderSummary({ result: displayResult, cfg: displayCfg, nav, user, isGuest, offline: !!(state?.offline || displayResult?.offline) })
}
