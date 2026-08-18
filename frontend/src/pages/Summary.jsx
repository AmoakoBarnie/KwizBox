import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../auth.jsx'
import Mascot from '../components/Mascot.jsx'
import Confetti from '../components/Confetti.jsx'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: 0.06 * i, duration: 0.35, ease: 'easeOut' } }),
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
        transition={{ duration: 0.8, ease: 'easeOut' }}
        onUpdate={(l) => {}}
      >
        {to}
      </motion.span>{suffix}
    </motion.span>
  )
}

export default function Summary() {
  const { state } = useLocation()
  const nav = useNavigate()
  const { user, isGuest } = useAuth()
  const result = state?.result
  const cfg = state?.cfg

  if (!result) {
    return (
      <div className="screen center">
        <p>No results to show.</p>
        <button className="btn primary" onClick={() => nav('/play')}>Play again</button>
      </div>
    )
  }

  const { total, correct, accuracy, score, streak, feedback } = result
  const pct = Math.round(accuracy * 100)
  const mistakes = feedback.filter((f) => !f.is_correct)
  const gotRight = total - mistakes.length
  const celebrate = pct >= 50

  return (
    <motion.div className="screen summary"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <AnimatePresence>{celebrate && <Confetti />}</AnimatePresence>

      <motion.div className="trophy" initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 12 }}>
        {pct >= 80 ? '🏆' : pct >= 50 ? '🎉' : '💪'}
      </motion.div>
      <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        {pct >= 80 ? 'Great job!' : pct >= 50 ? 'Good effort!' : 'Keep practising!'}
      </motion.h2>

      <motion.div className="mascot-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
        <Mascot state={celebrate ? 'celebrate' : 'encourage'} size={110} />
      </motion.div>

      <motion.p className="big-score" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.2 }}>
        {score} pts
      </motion.p>

      <motion.div className="stat-row" variants={fadeUp} custom={0} initial="hidden" animate="show">
        <motion.div className="stat" variants={fadeUp}><b>{correct}/{total}</b><span>Correct</span></motion.div>
        <motion.div className="stat" variants={fadeUp} custom={1}><b>{pct}%</b><span>Accuracy</span></motion.div>
        <motion.div className="stat" variants={fadeUp} custom={2}><b>{streak}🔥</b><span>Streak</span></motion.div>
      </motion.div>

      {isGuest && <p className="hint">You played as a guest — sign up to save this score and join the leaderboard!</p>}

      <p className="review-intro">
        You got <b>{gotRight}</b> right and <b>{mistakes.length}</b> wrong. Here's every question with the answer and why:
      </p>

      <div className="review-list">
        {feedback.map((f, n) => (
          <motion.div key={f.question_id} className={f.is_correct ? 'review correct' : 'review wrong'}
            variants={fadeUp} custom={n} initial="hidden" animate="show">
            <p className="rq">
              <span className="rq-num">{n + 1}.</span>
              <span className={f.is_correct ? 'rq-tag ok' : 'rq-tag no'}>{f.is_correct ? '✅ Right' : '❌ Wrong'}</span>
            </p>
            <p className="rq-q">{f.question}</p>
            <p className="rq-a">
              Your answer: <b>{f.selected_index >= 0 ? `${String.fromCharCode(65 + f.selected_index)}. ${f.options[f.selected_index]}` : '— (no answer)'}</b>
            </p>
            {!f.is_correct && (
              <p className="rq-correct">
                Correct answer: <b>{String.fromCharCode(65 + f.correct_index)}. {f.options[f.correct_index]}</b>
              </p>
            )}
            {f.explanation && <p className="rq-explain">💡 {f.explanation}</p>}
          </motion.div>
        ))}
      </div>

      <div className="row">
        <motion.button className="btn primary" onClick={() => nav('/play')}
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
          animate={{ scale: [1, 1.03, 1] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}>
          Play again 🔁
        </motion.button>
        <motion.button className="btn" onClick={() => nav('/leaderboard')} whileTap={{ scale: 0.96 }}>Leaderboard</motion.button>
      </div>
    </motion.div>
  )
}
