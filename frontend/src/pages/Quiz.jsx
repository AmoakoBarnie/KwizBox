import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../auth.jsx'
import { api } from '../api.js'
import Mascot from '../components/Mascot.jsx'

export default function Quiz() {
  const { token } = useAuth()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [pack, setPack] = useState(null)
  const [idx, setIdx] = useState(0)
  const [selected, setSelected] = useState(null)
  const [locked, setLocked] = useState(false)
  const [answers, setAnswers] = useState([])
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [startedAt, setStartedAt] = useState(null)
  const [mascot, setMascot] = useState('thinking')

  const cfg = {
    class_level: params.get('class_level') || 'B4',
    subject: params.get('subject') || 'Mathematics',
    topic: params.get('topic') || undefined,
    count: 12,
  }

  async function load() {
    setLoading(true); setErr('')
    try {
      const p = await api.pack(cfg)
      setPack(p); setStartedAt(Date.now())
    } catch (e) { setErr(e.message) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, []) // eslint-disable-line

  if (loading) return <div className="screen center"><div className="spinner" /> <p>Loading questions…</p></div>
  if (err) return <div className="screen center"><p className="err">{err}</p><button className="btn" onClick={() => nav('/play')}>Back to selection</button></div>
  if (!pack) return null

  const q = pack[idx]
  const isLast = idx === pack.length - 1
  const answered = answers.length > idx

  // No answer is revealed during play (delayed feedback). Tap gives a pulse + encourage nod.
  function choose(i) {
    if (locked || answered) return
    setSelected(i)
    setMascot('encourage')
    setLocked(true)
    const next = [...answers, { question_id: q.id, selected_index: i }]
    setAnswers(next)
    setTimeout(() => {
      setLocked(false); setSelected(null); setMascot('thinking')
      if (isLast) submit(next)
      else setIdx((cur) => cur + 1)
    }, 280)
  }

  async function submit(finalAnswers) {
    setSubmitting(true); setErr('')
    const duration_seconds = startedAt ? Math.round((Date.now() - startedAt) / 1000) : undefined
    try {
      const res = await api.submit({ ...cfg, answers: finalAnswers, duration_seconds }, token)
      nav('/summary', { state: { result: res, cfg }, replace: true })
    } catch (e) { setErr(e.message); setSubmitting(false) }
  }

  const progress = ((idx + 1) / pack.length) * 100

  return (
    <div className="screen quiz">
      <div className="quiz-top">
        <button className="back" onClick={() => nav('/play')}>‹</button>
        <div className="progress"><motion.div className="progress-bar" animate={{ width: `${progress}%` }} transition={{ ease: 'easeOut', duration: 0.35 }} /></div>
        <span className="qcount">{idx + 1}/{pack.length}</span>
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
          <h2>{q.question}</h2>
          <div className="options">
            {q.options.map((opt, i) => {
              const isPicked = (selected === i) || (answered && answers[idx]?.selected_index === i)
              return (
                <motion.button
                  key={i}
                  className={`option${isPicked ? ' picked' : ''}`}
                  onClick={() => choose(i)} disabled={locked || answered}
                  whileTap={{ scale: 0.96 }}
                  animate={isPicked ? { scale: [1, 1.04, 1] } : {}}
                  transition={{ duration: 0.28 }}
                >
                  <span className="opt-key">{String.fromCharCode(65 + i)}</span>
                  <span className="opt-text">{opt}</span>
                </motion.button>
              )
            })}
          </div>
          <p className="hint">Pick your answer — you'll see the results at the end.</p>
        </motion.div>
      </AnimatePresence>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ alignSelf: 'center', marginTop: 4 }}>
        <Mascot state={mascot} size={84} />
      </motion.div>

      {submitting && <div className="spinner" />}
    </div>
  )
}
