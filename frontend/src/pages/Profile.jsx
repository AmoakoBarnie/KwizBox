import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../auth.jsx'
import { BADGES, loadBadges, saveBadges, evaluateBadges } from '../badges.js'
import { levelUp } from '../sound.js'

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: 0.05 * i, duration: 0.35, ease: 'easeOut' } }),
}
const pop = {
  hidden: { opacity: 0, scale: 0.7 },
  show: (i = 0) => ({ opacity: 1, scale: 1, transition: { delay: 0.04 * i, type: 'spring', stiffness: 280, damping: 16 } }),
}

/** Toast that shows a newly-earned badge. */
function BadgeToast({ badge, onDone }) {
  return (
    <motion.div
      className="badge-toast"
      initial={{ opacity: 0, y: 30, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 280, damping: 20 }}
      style={{
        position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        zIndex: 60, background: 'var(--glass-strong)', backdropFilter: 'blur(18px)',
        border: '1px solid var(--gold)', borderRadius: 18, padding: '14px 22px',
        display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
      }}
    >
      <span style={{ fontSize: 32 }}>{badge.icon}</span>
      <div>
        <div style={{ fontWeight: 800, color: 'var(--gold)', fontSize: 15 }}>{badge.name}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{badge.desc}</div>
      </div>
      <button className="btn small" onClick={onDone} style={{ width: 'auto', marginLeft: 8 }}>Nice!</button>
    </motion.div>
  )
}

export default function Profile() {
  const nav = useNavigate()
  const { user, isAuthed, logout } = useAuth()
  const [earned, setEarned] = useState(() => loadBadges())
  const [toast, setToast] = useState(null)

  // Persist earned badges whenever they change
  useEffect(() => {
    saveBadges(earned)
  }, [earned])

  // If Quiz passed a result through location state, evaluate badges
  useEffect(() => {
    const result = window.__lastQuizResult
    if (!result) return
    const cfg = window.__lastQuizCfg
    if (!cfg) return
    const { newEarned, newlyAwarded } = evaluateBadges(result, cfg, earned)
    if (newEarned.length > earned.length) {
      setEarned(newEarned)
      // play level-up for the newest badge
      levelUp()
      // show toast for the newest badge
      const latest = newlyAwarded[newlyAwarded.length - 1]
      const badge = BADGES.find((b) => b.id === latest)
      if (badge) setToast(badge)
    }
    // clear the transient state
    delete window.__lastQuizResult
    delete window.__lastQuizCfg
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!user) {
    return (
      <div className="screen center">
        <p>You are not signed in.</p>
        <button className="btn primary" onClick={() => nav('/')}>Get started</button>
      </div>
    )
  }

  const p = user.progress
  const overall = p?.overall
  const subjects = p?.subjects || []
  const masteredCount = p?.topics_mastered || 0
  const stats = [
    { v: overall?.lifetime_score ?? user.lifetime_score, l: 'Total points' },
    { v: overall?.questions_answered ?? user.total_questions, l: 'Questions done' },
    { v: <span>{Math.round((overall?.accuracy ?? 0) * 100)}%</span>, l: 'Overall accuracy' },
    { v: `${overall?.current_streak ?? user.current_streak}🔥`, l: 'Current streak' },
    { v: `${overall?.longest_streak ?? user.longest_streak}🔥`, l: 'Best streak' },
    { v: overall?.correct ?? user.total_correct, l: 'Correct answers' },
    { v: masteredCount, l: 'Topics mastered 🏅' },
  ]

  const earnedCount = earned.length
  const totalCount = BADGES.length

  return (
    <motion.div className="screen profile"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <button className="back" onClick={() => nav('/')}>‹ Back</button>
      <h2>My Progress</h2>
      <motion.div className="card center" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <p className="hi"><b>{user.nickname}</b></p>
        {user.class_level && <p className="hint">Class {user.class_level}</p>}
        {user.school_code && <p className="hint">School code: {user.school_code}</p>}
      </motion.div>

      <motion.div className="stat-grid" variants={fadeUp} custom={0} initial="hidden" animate="show">
        {stats.map((s, i) => (
          <motion.div key={s.l} className="stat" custom={i} variants={pop}>
            <b>{s.v}</b><span>{s.l}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* ===== Badges section ===== */}
      <motion.div className="subjects" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h3 style={{ margin: 0 }}>🏅 Badges</h3>
          <span className="hint" style={{ fontSize: 13 }}>{earnedCount} / {totalCount}</span>
        </div>
        <div className="badge-grid">
          {BADGES.map((b, i) => {
            const isEarned = earned.includes(b.id)
            return (
              <motion.div key={b.id} className={`badge-item ${isEarned ? 'earned' : 'locked'}`}
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.05 * (i + 1) }}>
                <span className="badge-icon">{isEarned ? b.icon : '❓'}</span>
                <span className="badge-name">{b.name}</span>
                <span className="badge-desc">{b.desc}</span>
              </motion.div>
            )
          })}
        </div>
      </motion.div>

      {subjects.length > 0 && (
        <motion.div className="subjects" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h3>Accuracy by subject</h3>
          {subjects.map((s) => (
            <div key={s.class_level + s.subject} className="subject-block">
              <div className="subject-head">
                <b>{s.subject}</b>
                <span className="muted">{s.class_level} · <span>{Math.round((s.accuracy ?? 0) * 100)}%</span> · {s.questions_answered} Qs</span>
              </div>
              <div className="topics">
                {s.topics.map((t) => (
                  <motion.span key={t.topic} className={t.mastered ? 'topic-chip mastered' : 'topic-chip'}
                    initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
                    {t.topic} {t.mastered ? '🏅' : `· ${Math.round((t.accuracy ?? 0) * 100)}%`}
                  </motion.span>
                ))}
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {!isAuthed && (
        <p className="hint">This is a guest session — progress is stored only on this device. Sign up to keep it forever.</p>
      )}

      <div className="row">
        <motion.button className="btn primary" onClick={() => nav('/play')} whileTap={{ scale: 0.96 }}>Play ▶</motion.button>
        <motion.button className="btn" onClick={() => nav('/leaderboard')} whileTap={{ scale: 0.96 }}>Leaderboard</motion.button>
        {isAuthed && <button className="link" onClick={logout}>Log out</button>}
      </div>

      <AnimatePresence>
        {toast && <BadgeToast badge={toast} onDone={() => setToast(null)} />}
      </AnimatePresence>
    </motion.div>
  )
}