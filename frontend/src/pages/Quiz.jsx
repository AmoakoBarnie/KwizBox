import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import { api } from '../api.js'

export default function Quiz() {
  const { token } = useAuth()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [pack, setPack] = useState(null)
  const [idx, setIdx] = useState(0)
  const [selected, setSelected] = useState(null)     // current pick (shown quietly)
  const [locked, setLocked] = useState(false)        // brief lock so a tap registers before advancing
  const [answers, setAnswers] = useState([])          // {question_id, selected_index}
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [startedAt, setStartedAt] = useState(null)

  const cfg = {
    class_level: params.get('class_level') || 'B4',
    subject: params.get('subject') || 'Mathematics',
    // difficulty is intentionally not chosen by the player; omit => mixed pack
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
  const answered = answers.length > idx  // already answered this one?

  // Silent answer: record choice, flash, then advance. No right/wrong shown here.
  function choose(i) {
    if (locked || answered) return
    setSelected(i)
    setLocked(true)
    const next = [...answers, { question_id: q.id, selected_index: i }]
    setAnswers(next)
    // small delay so the child sees their pick, then move on
    setTimeout(() => {
      setLocked(false)
      setSelected(null)
      if (isLast) submit(next)
      else setIdx((cur) => cur + 1)
    }, 260)
  }

  async function submit(finalAnswers) {
    setSubmitting(true); setErr('')
    const duration_seconds = startedAt ? Math.round((Date.now() - startedAt) / 1000) : undefined
    try {
      const res = await api.submit({ ...cfg, answers: finalAnswers, duration_seconds }, token)
      // result + review shown on the Summary screen
      nav('/summary', { state: { result: res, cfg }, replace: true })
    } catch (e) { setErr(e.message); setSubmitting(false) }
  }

  const progress = Math.round(((idx + 1) / pack.length) * 100)

  return (
    <div className="screen quiz">
      <div className="quiz-top">
        <button className="back" onClick={() => nav('/play')}>‹</button>
        <div className="progress"><div className="progress-bar" style={{ width: `${progress}%` }} /></div>
        <span className="qcount">{idx + 1}/{pack.length}</span>
      </div>

      <div className="question">
        <span className="badge">{q.subject} · {q.difficulty}{q.topic ? ` · ${q.topic}` : ''}</span>
        <h2>{q.question}</h2>
        <div className="options">
          {q.options.map((opt, i) => {
            let cls = 'option'
            if (answered && i === answers[idx].selected_index) cls += ' picked'
            else if (selected === i) cls += ' picked'
            return (
              <button key={i} className={cls} onClick={() => choose(i)} disabled={locked || answered}>
                <span className="opt-key">{String.fromCharCode(65 + i)}</span>
                <span className="opt-text">{opt}</span>
              </button>
            )
          })}
        </div>
        <p className="hint">Pick your answer — you'll see the results at the end.</p>
      </div>

      {submitting && <div className="spinner" />}
    </div>
  )
}
