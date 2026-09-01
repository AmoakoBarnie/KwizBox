import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../auth.jsx'
import { api, mediaUrl } from '../api.js'
import Mascot from '../components/Mascot.jsx'
import { correct, wrong, streak as streakSfx, combo as comboSfx, click } from '../sound.js'

// Module-level seen-set: keeps track of question IDs seen this browser session
// so guests (who have no server-side history) also get fresh questions each quiz.
const sessionSeen = new Set()

export default function Quiz() {
  const { token } = useAuth()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [pack, setPack] = useState(null)
  const [idx, setIdx] = useState(0)
  const [selected, setSelected] = useState(null)
  const [reveal, setReveal] = useState(null) // 'correct' | 'wrong' | null
  const [locked, setLocked] = useState(false)
  const [answers, setAnswers] = useState([])
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [startedAt, setStartedAt] = useState(null)
  const [questionStartedAt, setQuestionStartedAt] = useState(null) // per-question timer
  const [elapsed, setElapsed] = useState(0) // visible seconds for current question
  const [mascot, setMascot] = useState('thinking')
  // B: live streak + combo
  const [streak, setStreak] = useState(0)
  const [combo, setCombo] = useState(1)
  const [popScore, setPopScore] = useState(null) // C: floating +pts overlay

  const cfg = {
    class_level: params.get('class_level') || 'B4',
    subject: params.get('subject') || 'Mathematics',
    topic: params.get('topic') || undefined,
    count: 12,
  }

  async function load() {
    setLoading(true); setErr('')
    try {
      let p
      try {
        p = await api.pack({ ...cfg, exclude_ids: [...sessionSeen] }, token)
      } catch (e) {
        // If every question in this selection was already seen this session,
        // reset the seen-set and fetch a fresh mix so the user is never blocked.
        if (/No questions found|404/.test(e.message) && sessionSeen.size) {
          sessionSeen.clear()
          p = await api.pack(cfg, token)
        } else {
          throw e
        }
      }
      // remember these so the next quiz in this session skips them
      p.forEach((q) => sessionSeen.add(q.id))
      setPack(p); setStartedAt(Date.now())
    } catch (e) { setErr(e.message) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, []) // eslint-disable-line

  // Per-question timer: records when the current question appeared and ticks a
  // visible (non-punishing) clock. Nothing auto-advances — the player answers
  // whenever they're ready; only the SPEED BONUS is affected by how fast they are.
  useEffect(() => {
    if (!pack) return
    setQuestionStartedAt(Date.now())
    setElapsed(0)
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [idx, pack])

  if (loading) return <div className="screen center"><div className="spinner" /> <p>Loading questions…</p></div>
  if (err) return <div className="screen center"><p className="err">{err}</p><button className="btn" onClick={() => nav('/play')}>Back to selection</button></div>
  if (!pack) return null

  const q = pack[idx]
  const isLast = idx === pack.length - 1
  const answered = answers.length > idx

  // A + B + C: on tap, check correctness, reveal, animate, advance
  async function choose(i) {
    if (locked || answered || reveal) return
    setSelected(i)
    click() // UI tick
    setLocked(true)
    try {
      const { is_correct } = await api.check({ question_id: q.id, selected_index: i }, token)
      const pts = is_correct ? (q.difficulty === 'Hard' ? 25 : q.difficulty === 'Medium' ? 15 : 10) * combo : 0
      if (is_correct) {
        const newStreak = streak + 1
        const newCombo = newStreak >= 3 ? Math.min(2, 1 + Math.floor(newStreak / 3)) : 1
        setStreak(newStreak); setCombo(newCombo)
        setMascot('celebrate')
        setReveal('correct')
        correct()
        if (newStreak >= 3) streakSfx(newStreak)
        if (newCombo > 1) comboSfx(newCombo)
        if (pts > 0) {
          setPopScore({ pts, combo: newCombo })
          setTimeout(() => setPopScore(null), 900)
        }
      } else {
        setStreak(0); setCombo(1)
        setMascot('encourage')
        setReveal('wrong')
        wrong()
      }
      const seconds_taken = questionStartedAt ? (Date.now() - questionStartedAt) / 1000 : null
      const next = [...answers, { question_id: q.id, selected_index: i, seconds_taken }]
      setAnswers(next)
      setTimeout(() => {
        setLocked(false); setSelected(null); setReveal(null); setMascot('thinking')
        if (isLast) submit(next)
        else setIdx((cur) => cur + 1)
      }, 950)
    } catch (e) {
      // If check fails, fall back to silent advance (no leak, no crash)
      const seconds_taken = questionStartedAt ? (Date.now() - questionStartedAt) / 1000 : null
      const next = [...answers, { question_id: q.id, selected_index: i, seconds_taken }]
      setAnswers(next)
      setLocked(false); setSelected(null)
      if (isLast) submit(next)
      else setIdx((cur) => cur + 1)
    }
  }

  async function submit(finalAnswers) {
    setSubmitting(true); setErr('')
    const duration_seconds = startedAt ? Math.round((Date.now() - startedAt) / 1000) : undefined
    try {
      const res = await api.submit({ ...cfg, answers: finalAnswers, duration_seconds }, token)
      nav('/summary', { state: { result: res, cfg, liveStreak: streak }, replace: true })
    } catch (e) { setErr(e.message); setSubmitting(false) }
  }

  const progress = ((idx + 1) / pack.length) * 100
  const isTF = q.question_type === 'true_false' || q.options.length === 2

  return (
    <div className="screen quiz">
      {/* B: live streak + combo bar */}
      <div className="quiz-top">
        <button className="back" onClick={() => nav('/play')}>‹</button>
        <div className="progress"><motion.div className="progress-bar kente-progress" animate={{ width: `${progress}%` }} transition={{ ease: 'easeOut', duration: 0.35 }} /></div>
        <span className="qcount">{idx + 1}/{pack.length}</span>
        <span className={`q-timer${elapsed <= 6 ? ' fast' : ''}`} title="Answer fast for a speed bonus!">⏱ {elapsed}s{elapsed <= 6 ? ' ⚡' : ''}</span>
      </div>
      <div className="streak-bar">
        <motion.span
          key={streak}
          className="streak-flame"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: streak > 0 ? [1, 1.25, 1] : 1, opacity: streak > 0 ? 1 : 0.3 }}
          transition={{ type: 'spring', stiffness: 300, damping: 12 }}
        >🔥 {streak}</motion.span>
        {combo > 1 && (
          <motion.span
            className="combo-badge"
            initial={{ scale: 0, rotate: -8 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 14 }}
          >COMBO x{combo}!</motion.span>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={q.id}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.25 }}
          className="question"
        >
          <span className="badge">{q.subject} · {q.difficulty}{q.topic ? ` · ${q.topic}` : ''}</span>
          {q.image_url && (
            <div className="q-image-wrap">
              <img className="q-image" src={mediaUrl(q.image_url)} alt="Question diagram" />
            </div>
          )}
          <h2>{q.question}</h2>
          <div className={`options${isTF ? ' tf' : ''}`}>
            {q.options.map((opt, i) => {
              const isPicked = selected === i
              const showCorrect = reveal === 'correct' && isPicked
              const showWrong = reveal === 'wrong' && isPicked
              const tfClass = isTF ? (i === 0 ? ' tf-true' : ' tf-false') : ''
              return (
                <motion.button
                  key={i}
                  className={`option${tfClass}${isPicked ? ' picked' : ''}${showCorrect ? ' correct' : ''}${showWrong ? ' wrong' : ''}`}
                  onClick={() => choose(i)} disabled={locked || answered || !!reveal}
                  initial={{ opacity: 0, x: -18, scale: 0.96 }}
                  animate={showCorrect ? { opacity: 1, x: 0, scale: [1, 1.05, 1] }
                            : showWrong ? { opacity: 1, x: [0, -8, 8, -5, 0], scale: 1 }
                            : { opacity: 1, x: 0, scale: 1 }}
                  transition={{ duration: showCorrect || showWrong ? 0.3 : 0.3, delay: (showCorrect || showWrong) ? 0 : 0.04 * i, type: 'spring', stiffness: 260, damping: 20 }}
                  whileTap={{ scale: 0.96 }}
                >
                  {!isTF && <span className="opt-key">{String.fromCharCode(65 + i)}</span>}
                  <span className="opt-text">
                    {opt}
                    {showCorrect && <span className="opt-mark"> ✓</span>}
                    {showWrong && <span className="opt-mark"> ✗</span>}
                  </span>
                </motion.button>
              )
            })}
          </div>
          <AnimatePresence>
            {reveal && (
              <motion.p
                className={`feedback-line ${reveal}`}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              >
                {reveal === 'correct' ? '✅ Nice! Correct!' : '❌ Not quite — see the answer at the end.'}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>

      {/* C: floating +pts overlay */}
      <AnimatePresence>
        {popScore && (
          <motion.div
            className="score-pop"
            initial={{ opacity: 0, y: 20, scale: 0.6 }}
            animate={{ opacity: 1, y: -40, scale: 1.1 }}
            exit={{ opacity: 0, y: -70, scale: 0.8 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          >
            +{popScore.pts} pts{popScore.combo > 1 ? `  🔥x${popScore.combo}` : ''}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ alignSelf: 'center', marginTop: 4 }}>
        <Mascot state={mascot} size={84} gender="female" classLevel={cfg.class_level} />
      </motion.div>

      {submitting && <div className="spinner" />}
    </div>
  )
}
