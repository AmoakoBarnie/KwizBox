import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth.jsx'

const CLASSES = ['B4', 'B5', 'B6', 'B7', 'B8', 'B9']
const SUBJECTS = ['Mathematics', 'Science', 'Computing', 'Mixed']

export default function Play() {
  const { user } = useAuth()
  const nav = useNavigate()
  // Default class from account if available
  const [cls, setCls] = useState(user?.class_level || 'B4')
  const [subject, setSubject] = useState('Mathematics')
  const [topic, setTopic] = useState('') // '' = random/mixed

  function start() {
    // Difficulty is not a player-chosen level — the app serves a mixed-difficulty
    // pack automatically (difficulty still varies points internally).
    const params = new URLSearchParams({ class_level: cls, subject })
    if (topic) params.set('topic', topic)
    nav(`/quiz?${params.toString()}`)
  }

  return (
    <div className="screen play">
      <button className="back" onClick={() => nav('/')}>‹ Back</button>
      <h2>Choose your quiz</h2>

      <div className="field">
        <h3>Your class</h3>
        <div className="grid grid-3">
          {CLASSES.map((c) => (
            <button key={c} className={cls === c ? 'chip selected' : 'chip'} onClick={() => setCls(c)}>{c}</button>
          ))}
        </div>
      </div>

      <div className="field">
        <h3>Subject</h3>
        <div className="grid grid-2">
          {SUBJECTS.map((s) => (
            <button key={s} className={subject === s ? 'chip selected' : 'chip'} onClick={() => setSubject(s)}>{s}</button>
          ))}
        </div>
      </div>

      <button className="btn primary big" onClick={start}>Start quiz 🚀</button>
    </div>
  )
}
