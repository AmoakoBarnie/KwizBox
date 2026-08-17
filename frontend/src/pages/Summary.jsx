import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth.jsx'

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

  return (
    <div className="screen summary">
      <div className="trophy">🏆</div>
      <h2>{pct >= 80 ? 'Great job!' : pct >= 50 ? 'Good effort!' : 'Keep practising!'}</h2>
      <p className="big-score">{score} pts</p>
      <div className="stat-row">
        <div className="stat"><b>{correct}/{total}</b><span>Correct</span></div>
        <div className="stat"><b>{pct}%</b><span>Accuracy</span></div>
        <div className="stat"><b>{streak}🔥</b><span>Streak</span></div>
      </div>
      {isGuest && <p className="hint">You played as a guest — sign up to save this score and join the leaderboard!</p>}

      <p className="review-intro">
        You got <b>{gotRight}</b> right and <b>{mistakes.length}</b> wrong. Here's every question with the answer and why:
      </p>

      <div className="review-list">
        {feedback.map((f, n) => (
          <div key={f.question_id} className={f.is_correct ? 'review correct' : 'review wrong'}>
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
          </div>
        ))}
      </div>

      <div className="row">
        <button className="btn primary" onClick={() => nav('/play')}>Play again 🔁</button>
        <button className="btn" onClick={() => nav('/leaderboard')}>Leaderboard</button>
      </div>
    </div>
  )
}
