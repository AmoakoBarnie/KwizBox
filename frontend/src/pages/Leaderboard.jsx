import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'

const SCOPES = [
  { key: 'global', label: '🌍 Global' },
  { key: 'class', label: '🏫 By class' },
  { key: 'weekly', label: '📅 This week' },
  { key: 'monthly', label: '🗓️ This month' },
]

export default function Leaderboard() {
  const nav = useNavigate()
  const [scope, setScope] = useState('global')
  const [classLevel, setClassLevel] = useState('B4')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const params = { scope, limit: 50 }
      if (scope === 'class') params.class_level = classLevel
      const r = await api.leaderboard(params)
      setRows(r)
    } catch (e) { setRows([]) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [scope, classLevel]) // eslint-disable-line

  return (
    <div className="screen leaderboard">
      <button className="back" onClick={() => nav('/')}>‹ Back</button>
      <h2>Leaderboard</h2>
      <div className="tabs tabs-4">
        {SCOPES.map((s) => (
          <button key={s.key} className={scope === s.key ? 'tab active' : 'tab'} onClick={() => setScope(s.key)}>{s.label}</button>
        ))}
      </div>
      {scope === 'class' && (
        <div className="grid grid-3 class-pick">
          {['B4', 'B5', 'B6', 'B7', 'B8', 'B9'].map((c) => (
            <button key={c} className={classLevel === c ? 'chip selected' : 'chip'} onClick={() => setClassLevel(c)}>{c}</button>
          ))}
        </div>
      )}

      {loading ? <div className="spinner" /> : (
        <ol className="board">
          {rows.length === 0 && <p className="hint">No scores yet — be the first!</p>}
          {rows.map((r) => (
            <li key={r.rank} className="board-row">
              <span className="rank">{r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : r.rank}</span>
              <span className="name">{r.nickname}{r.class_level ? ` · ${r.class_level}` : ''}</span>
              <span className="pts">{r.lifetime_score} pts</span>
              <span className="acc">{Math.round(r.accuracy * 100)}%</span>
            </li>
          ))}
        </ol>
      )}
      <p className="hint">
        {scope === 'weekly' && 'Resets every Monday automatically — your history is kept.'}
        {scope === 'monthly' && 'Resets on the 1st of each month automatically — your history is kept.'}
        {scope === 'global' && 'All-time points.'}
        {scope === 'class' && 'All-time points within the selected class.'}
      </p>
      <button className="btn primary" onClick={() => nav('/play')}>Play to climb! 🚀</button>
    </div>
  )
}
