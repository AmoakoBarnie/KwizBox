import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../auth.jsx'

function Pct({ value }) {
  return <>{Math.round((value || 0) * 100)}%</>
}

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: 0.05 * i, duration: 0.35, ease: 'easeOut' } }),
}
const pop = {
  hidden: { opacity: 0, scale: 0.7 },
  show: (i = 0) => ({ opacity: 1, scale: 1, transition: { delay: 0.04 * i, type: 'spring', stiffness: 280, damping: 16 } }),
}

export default function Profile() {
  const nav = useNavigate()
  const { user, isAuthed, isGuest, logout } = useAuth()

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
    { v: <Pct value={overall?.accuracy} />, l: 'Overall accuracy' },
    { v: `${overall?.current_streak ?? user.current_streak}🔥`, l: 'Current streak' },
    { v: `${overall?.longest_streak ?? user.longest_streak}🔥`, l: 'Best streak' },
    { v: overall?.correct ?? user.total_correct, l: 'Correct answers' },
    { v: masteredCount, l: 'Topics mastered 🏅' },
  ]

  return (
    <motion.div className="screen profile"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <button className="back" onClick={() => nav('/')}>‹ Back</button>
      <h2>My Progress</h2>
      <motion.div className="card center" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="hi"><b>{user.nickname}</b> {isGuest ? <span className="pill">Guest</span> : null}</p>
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

      {subjects.length > 0 && (
        <motion.div className="subjects" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h3>Accuracy by subject</h3>
          {subjects.map((s) => (
            <div key={s.class_level + s.subject} className="subject-block">
              <div className="subject-head">
                <b>{s.subject}</b>
                <span className="muted">{s.class_level} · <Pct value={s.accuracy} /> · {s.questions_answered} Qs</span>
              </div>
              <div className="topics">
                {s.topics.map((t) => (
                  <motion.span key={t.topic} className={t.mastered ? 'topic-chip mastered' : 'topic-chip'}
                    initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
                    {t.topic} {t.mastered ? '🏅' : `· ${Math.round(t.accuracy * 100)}%`}
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
    </motion.div>
  )
}
