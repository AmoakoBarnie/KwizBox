import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../api.js'

const SCOPES = [
  { key: 'global', label: '🌍 Global' },
  { key: 'class', label: '🎓 By class' },
  { key: 'schools', label: '🏫 Schools' },
  { key: 'weekly', label: '📅 This week' },
  { key: 'monthly', label: '🗓️ This month' },
]

const rowVar = {
  hidden: { opacity: 0, x: -16 },
  show: (i) => ({ opacity: 1, x: 0, transition: { delay: 0.04 * i, duration: 0.3 } }),
}

export default function Leaderboard() {
  const nav = useNavigate()
  const [scope, setScope] = useState('global')
  const [classLevel, setClassLevel] = useState('B4')
  const [rows, setRows] = useState([])
  const [schoolRows, setSchoolRows] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      if (scope === 'schools') {
        // School-vs-school competition: monthly points aggregated per school
        const r = await api.leaderboardSchools(20)
        setSchoolRows(r)
        setRows([])
      } else {
        const params = { scope, limit: 50 }
        if (scope === 'class') params.class_level = classLevel
        const r = await api.leaderboard(params)
        setRows(r)
        setSchoolRows([])
      }
    } catch (e) { setRows([]); setSchoolRows([]) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [scope, classLevel]) // eslint-disable-line

  return (
    <div className="screen leaderboard">
      <button className="back" onClick={() => nav('/')}>‹ Back</button>
      <h2>Leaderboard</h2>
      <div className="tabs tabs-5">
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

      {loading ? <div className="spinner" /> : scope === 'schools' ? (
        <ol className="board">
          {schoolRows.length === 0 && <p className="hint">No school scores yet this month — add your school code when you sign up to join the race!</p>}
          <AnimatePresence>
            {schoolRows.map((r, i) => (
              <motion.li key={r.school_code} className="board-row"
                custom={i} variants={rowVar} initial="hidden" animate="show" exit={{ opacity: 0 }}>
                <motion.span className="rank"
                  initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.04 * i + 0.1, type: 'spring', stiffness: 300, damping: 14 }}>
                  {r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : r.rank}
                </motion.span>
                <span className="name">
                  {r.school_name}
                  <span className="muted"> · {r.players} player{r.players === 1 ? '' : 's'}{r.top_player ? ` · top: ${r.top_player.nickname}` : ''}</span>
                </span>
                <span className="pts">{r.points} pts</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      ) : (
        <ol className="board">
          {rows.length === 0 && <p className="hint">No scores yet — be the first!</p>}
          <AnimatePresence>
            {rows.map((r, i) => (
              <motion.li key={r.rank} className="board-row"
                custom={i} variants={rowVar} initial="hidden" animate="show" exit={{ opacity: 0 }}>
                <motion.span className="rank"
                  initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.04 * i + 0.1, type: 'spring', stiffness: 300, damping: 14 }}>
                  {r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : r.rank}
                </motion.span>
                <span className="name">{r.nickname}{r.class_level ? ` · ${r.class_level}` : ''}</span>
                <span className="pts">{r.lifetime_score} pts</span>
                <span className="acc">{Math.round(r.accuracy * 100)}%</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      )}
      <p className="hint">
        {scope === 'weekly' && 'Resets every Monday automatically — your history is kept.'}
        {scope === 'monthly' && 'Resets on the 1st of each month automatically — your history is kept.'}
        {scope === 'global' && 'All-time points.'}
        {scope === 'class' && 'All-time points within the selected class.'}
        {scope === 'schools' && 'School totals this month — every signed-in player adds their monthly points to their school code.'}
      </p>
      <motion.button className="btn primary" onClick={() => nav('/play')} whileTap={{ scale: 0.96 }}>Play to climb! 🚀</motion.button>
    </div>
  )
}
