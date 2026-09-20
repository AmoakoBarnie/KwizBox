import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../auth.jsx'
import Mascot from '../components/Mascot.jsx'
import SHSMascot from '../components/SHSMascot.jsx'
import Confetti from '../components/Confetti.jsx'
import { evaluateBadges } from '../badges.js'
import { levelUp } from '../sound.js'
import { useState, useEffect } from 'react'

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
          : '— (no answer)'}
        </b>
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


/** Build a rich shareable text string for the result card. */
function buildShareText(result, cfg, user) {
  const { total, correct, accuracy, score, streak } = result
  const pct = Math.round(accuracy * 100)
  const grade = pct >= 90 ? "🌟 A" : pct >= 75 ? "👍 B" : pct >= 60 ? "📚 C" : pct >= 45 ? "📖 D" : "💪 F"
  const now = new Date().toLocaleString("en-GB", {
    weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
  })
  const name = user && user.nickname ? user.nickname : "A player"
  const cls = cfg && cfg.class_level ? cfg.class_level : ""
  const subj = cfg && cfg.subject ? cfg.subject : ""
  const meta = [cls, subj].filter(Boolean).join(" · ")
  const header = meta ? meta + "  " : ""
  return (
    "━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
    "🏆 " + header + "KwizBox\n" +
    "━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
    "👤 " + name + "\n" +
    "📅 " + now + "\n" +
    "━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
    "SCORE: " + score + " pts\n" +
    "ACCURACY: " + pct + "%  " + grade + "\n" +
    "CORRECT: " + correct + "/" + total + "\n" +
    "STREAK: " + streak + "🔥\n" +
    "━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
    "🎓 KwizBox\n" +
    "Play now: ghana-stem-trivia.app\n" +
    "━━━━━━━━━━━━━━━━━━━━━━━━━━"
  )
}

/**
 * Shareable result card shown in a modal before sharing.
 */
function ShareCard({ result, cfg, user, onClose, onCopy, onShare }) {
  const { total, correct, accuracy, score, streak } = result
  const pct = Math.round(accuracy * 100)
  const grade = pct >= 90 ? "A" : pct >= 75 ? "B" : pct >= 60 ? "C" : pct >= 45 ? "D" : "F"
  const gradeColor = pct >= 90 ? "var(--gold)" : pct >= 75 ? "#4ade80" : pct >= 60 ? "#a78bfa" : pct >= 45 ? "#fbbf24" : "var(--muted)"
  const now = new Date()
  const dateStr = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  const initials = user && user.nickname ? user.nickname.charAt(0).toUpperCase() : "A"

  return (
    <motion.div
      className="share-overlay"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="share-modal"
        initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <div className="share-card">
          {/* Header */}
          <div className="share-card-header">
            <div className="share-card-globe">🌍</div>
            <div className="share-card-title">
              <div className="share-card-brand">KwizBox</div>
              <div className="share-card-sub">Quiz Result</div>
            </div>
            <button className="share-card-close" onClick={onClose}>✕</button>
          </div>

          {/* Player */}
          <div className="share-player">
            <div className="share-player-avatar">{initials}</div>
            <div className="share-player-info">
              <div className="share-player-name">{user && user.nickname ? user.nickname : "Anonymous"}</div>
              <div className="share-player-meta">{cfg && cfg.class_level ? cfg.class_level : ""} {cfg && cfg.subject ? cfg.subject : ""} · {dateStr}</div>
            </div>
          </div>

          {/* Score + Grade */}
          <div className="share-score-row">
            <div className="share-score-big">
              <span className="share-score-num">{score}</span>
              <span className="share-score-unit">pts</span>
            </div>
            <div className="share-grade" style={{ color: gradeColor }}>
              <span className="share-grade-letter">{grade}</span>
              <span className="share-grade-label">{pct}%</span>
            </div>
          </div>

          {/* Stats */}
          <div className="share-stats">
            <div className="share-stat">
              <div className="share-stat-num">{correct}/{total}</div>
              <div className="share-stat-label">Correct</div>
            </div>
            <div className="share-stat">
              <div className="share-stat-num">{pct}%</div>
              <div className="share-stat-label">Accuracy</div>
            </div>
            <div className="share-stat">
              <div className="share-stat-num">{streak}🔥</div>
              <div className="share-stat-label">Best Streak</div>
            </div>
          </div>

          {/* Accuracy bar */}
          <div className="share-bar-wrap">
            <div className="share-bar-track">
              <motion.div
                className="share-bar-fill"
                initial={{ scaleX: 0 }} animate={{ scaleX: pct / 100 }}
                transition={{ duration: 1.0, ease: "easeOut" }}
              />
            </div>
            <div className="share-bar-labels">
              <span>0%</span>
              <span className="share-bar-pct">{pct}%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Actions */}
          <div className="share-actions">
            <motion.button
              className="share-action primary"
              onClick={onShare}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
            >
              <span className="share-action-icon">📤</span>
              Share Result
            </motion.button>
            <motion.button
              className="share-action"
              onClick={onCopy}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
            >
              <span className="share-action-icon">📋</span>
              Copy Text
            </motion.button>
            <motion.button
              className="share-action ghost"
              onClick={onClose}
              whileHover={{ scale: 1.03 }}
            >
              Close
            </motion.button>
          </div>

          {/* Footer */}
          <div className="share-card-footer">
            <span>🇬🇭 KwizBox</span>
            <span>Built with ❤️ for Ghana schools</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}


function renderSummary({ result, cfg, nav, user, isGuest, fromStorage = false, showShareCard, setShowShareCard, shareToast, setShareToast }) {
  // Evaluate & award badges
  if (user && !isGuest) {
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
  const isSHS = typeof cfg?.class_level === 'string' && ['S1', 'S2', 'S3'].includes(cfg?.class_level)

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

        {pct >= 50 && (
          <motion.div className="summary-sub"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 240, damping: 14 }}
          >
            {perfectScore ? 'Every answer correct — you are on fire!'
              : highScore ? `So close to perfect! ${gotRight}/${total} right.`
              : `You got ${gotRight} right out of ${total}. Keep going!`
            }
          </motion.div>
        )}
      </div>

      {/* MAIN GRID: mascot + stats on left, review on right (stacked on mobile) */}
      <div className="summary-grid">
        {/* LEFT COLUMN */}
        <div className="summary-left">
          {/* Mascot — walking when celebrate, standing otherwise */}
          <motion.div className="mascot-frame"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.18, type: 'spring', stiffness: 200, damping: 14 }}
          >
            {isSHS
              ? <SHSMascot
                state={celebrate ? 'celebrate' : 'encourage'}
                size={130}
                gender="female"
                classLevel={cfg?.class_level}
                walking={celebrate}
                avatar={user?.avatar}
              />
              : <Mascot
                state={celebrate ? 'celebrate' : 'encourage'}
                size={130}
                gender="female"
                classLevel={cfg?.class_level}
                walking={celebrate}
                avatar={user?.avatar}
              />
            }
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
                ☀️ Daily Challenge
              </motion.span>
            )}
          </motion.p>

          {/* Stats — uniform cards (matches Profile) */}
          <div className="summary-stat-cards">
            <motion.div className="stat-card"
              variants={statFade} custom={0} initial="hidden" animate="show" transition={{ delay: 0.38 }}>
              <div className="stat-card-icon">🎯</div>
              <div className="stat-card-body">
                <b className="stat-card-value">{correct}/{total}</b>
                <span className="stat-card-label">Correct</span>
              </div>
            </motion.div>
            <motion.div className="stat-card"
              variants={statFade} custom={1} initial="hidden" animate="show" transition={{ delay: 0.44 }}>
              <div className="stat-card-icon">🔥</div>
              <div className="stat-card-body">
                <b className="stat-card-value">{streak}</b>
                <span className="stat-card-label">Best streak</span>
              </div>
            </motion.div>
            <motion.div className="stat-card"
              variants={statFade} custom={2} initial="hidden" animate="show" transition={{ delay: 0.50 }}>
              <div className="stat-card-icon">📊</div>
              <div className="stat-card-body">
                <b className="stat-card-value" style={{ color: 'var(--gold)', fontWeight: 800 }}>{pct}%</b>
                <span className="stat-card-label">Accuracy</span>
              </div>
            </motion.div>
          </div>

          {/* PERSISTENT PLAY AGAIN + LEADERBOARD BUTTONS — visible to everyone */}
          <div className="summary-actions">
            <motion.button
              className="action-btn primary action-btn-wide"
              onClick={() => nav('/play')}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, type: 'spring', stiffness: 250, damping: 14 }}
            >
              <span className="action-icon">🔁</span>
              Play Again
            </motion.button>

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

            <AnimatePresence>
              {showShareCard && (
                <ShareCard
                  result={result}
                  cfg={cfg}
                  user={user}
                  onClose={() => setShowShareCard(false)}
                  onCopy={() => {
                    const text = buildShareText(result, cfg, user)
                    navigator.clipboard.writeText(text).then(() => {
                      setShareToast("Copied to clipboard! 📋")
                      setTimeout(() => setShareToast(null), 2000)
                    }).catch(() => setShareToast("Copy failed"))
                  }}
                  onShare={() => {
                    const text = buildShareText(result, cfg, user)
                    if (navigator.share) {
                      navigator.share({ title: "KwizBox Result", text }).catch(() => {
                        navigator.clipboard.writeText(text).then(() => {
                          setShareToast("Shared! 📤")
                          setTimeout(() => setShareToast(null), 2000)
                        })
                      })
                    } else {
                      navigator.clipboard.writeText(text).then(() => {
                        setShareToast("Copied to clipboard! 📋")
                        setTimeout(() => setShareToast(null), 2000)
                      })
                    }
                  }}
                />
              )}
            </AnimatePresence>
            <motion.button
              className="action-btn share-btn"
              onClick={() => setShowShareCard(true)}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.62, type: "spring", stiffness: 250, damping: 14 }}
            >
              <span className="action-icon">📤</span>
              Share Result
            </motion.button>
            <AnimatePresence>
              {shareToast && (
                <motion.div
                  className="share-toast"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  {shareToast}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Guest nudge — only when signed-in guest */}
          {user && isGuest && (
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

export default function Summary() {
  const { state } = useLocation()
  const nav = useNavigate()
  const { user, isGuest } = useAuth()
  const result = state?.result
  const cfg = state?.cfg

  // SHS students get the older mascot; JHS gets the regular one
  const isSHS = typeof cfg?.class_level === 'string' && ['S1', 'S2', 'S3'].includes(cfg.class_level)

  // Try localStorage fallback on direct navigation/refresh
  const [triedStorage, setTriedStorage] = useState(false)
  const [showShareCard, setShowShareCard] = useState(false)
  const [shareToast, setShareToast] = useState(null)

  if (!result) {
    if (!triedStorage) {
      // Try to read from localStorage as last resort
      try {
        const savedResult = JSON.parse(localStorage.getItem('stem_last_result') || 'null')
        const savedCfg = JSON.parse(localStorage.getItem('stem_last_cfg') || 'null')
        if (savedResult) {
          setTriedStorage(true)
          return renderSummary({ result: savedResult, cfg: savedCfg, nav, user, isGuest, fromStorage: true, showShareCard, setShowShareCard, shareToast, setShareToast })
        }
      } catch {}
      setTriedStorage(true)
    }
    return (
      <div className="screen center">
        <p>No results to show.</p>
        <button className="btn primary" onClick={() => nav('/play')}>Play again</button>
      </div>
    )
  }

  // Save to localStorage for future refreshes
  useEffect(() => {
    localStorage.setItem('stem_last_result', JSON.stringify(result))
    localStorage.setItem('stem_last_cfg', JSON.stringify(cfg))
  }, [result, cfg])

  // System preference auto-detect (if mode selector exists elsewhere, skip)
  useEffect(() => {
    // Check for existing html data-mode first, otherwise respect system preference
    const html = document.documentElement
    const savedMode = localStorage.getItem('app_mode')
    if (!savedMode) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      html.setAttribute('data-mode', prefersDark ? 'dark' : 'light')
      localStorage.setItem('app_mode', prefersDark ? 'dark' : 'light')
    }
  }, [])

  return renderSummary({ result, cfg, nav, user, isGuest, showShareCard, setShowShareCard, shareToast, setShareToast })
}
