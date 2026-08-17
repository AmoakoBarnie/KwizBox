import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth.jsx'

function Pct({ value }) {
  return <>{Math.round((value || 0) * 100)}%</>
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

  return (
    <div className="screen profile">
      <button className="back" onClick={() => nav('/')}>‹ Back</button>
      <h2>My Progress</h2>
      <div className="card center">
        <p className="hi"><b>{user.nickname}</b> {isGuest ? <span className="pill">Guest</span> : null}</p>
        {user.class_level && <p className="hint">Class {user.class_level}</p>}
        {user.school_code && <p className="hint">School code: {user.school_code}</p>}
      </div>

      <div className="stat-grid">
        <div className="stat"><b>{overall?.lifetime_score ?? user.lifetime_score}</b><span>Total points</span></div>
        <div className="stat"><b>{overall?.questions_answered ?? user.total_questions}</b><span>Questions done</span></div>
        <div className="stat"><b><Pct value={overall?.accuracy} /></b><span>Overall accuracy</span></div>
        <div className="stat"><b>{overall?.current_streak ?? user.current_streak}🔥</b><span>Current streak</span></div>
        <div className="stat"><b>{overall?.longest_streak ?? user.longest_streak}🔥</b><span>Best streak</span></div>
        <div className="stat"><b>{overall?.correct ?? user.total_correct}</b><span>Correct answers</span></div>
        <div className="stat"><b>{masteredCount}</b><span>Topics mastered 🏅</span></div>
      </div>

      {subjects.length > 0 && (
        <div className="subjects">
          <h3>Accuracy by subject</h3>
          {subjects.map((s) => (
            <div key={s.class_level + s.subject} className="subject-block">
              <div className="subject-head">
                <b>{s.subject}</b>
                <span className="muted">{s.class_level} · <Pct value={s.accuracy} /> · {s.questions_answered} Qs</span>
              </div>
              <div className="topics">
                {s.topics.map((t) => (
                  <span key={t.topic} className={t.mastered ? 'topic-chip mastered' : 'topic-chip'}>
                    {t.topic} {t.mastered ? '🏅' : `· ${Math.round(t.accuracy * 100)}%`}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!isAuthed && (
        <p className="hint">This is a guest session — progress is stored only on this device. Sign up to keep it forever.</p>
      )}

      <div className="row">
        <button className="btn primary" onClick={() => nav('/play')}>Play ▶</button>
        <button className="btn" onClick={() => nav('/leaderboard')}>Leaderboard</button>
        {isAuthed && <button className="link" onClick={logout}>Log out</button>}
      </div>
    </div>
  )
}
