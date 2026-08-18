import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../auth.jsx'
import Mascot from '../components/Mascot.jsx'

const CLASSES = ['B4', 'B5', 'B6', 'B7', 'B8', 'B9']

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: 0.05 * i, duration: 0.4, ease: 'easeOut' } }),
}

export default function Landing() {
  const { guestLogin, login, register, user, logout, isAuthed, isGuest } = useAuth()
  const nav = useNavigate()
  const [tab, setTab] = useState('guest')
  const [form, setForm] = useState({ nickname: '', password: '', class_level: 'B4', school_code: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })) }

  async function doGuest(e) {
    e.preventDefault(); setErr(''); setBusy(true)
    try { await guestLogin({ nickname: form.nickname || 'Guest', class_level: form.class_level, school_code: form.school_code || undefined }); nav('/play') }
    catch (e) { setErr(e.message) } finally { setBusy(false) }
  }
  async function doLogin(e) {
    e.preventDefault(); setErr(''); setBusy(true)
    try { await login({ nickname: form.nickname, password: form.password }); nav('/play') }
    catch (e) { setErr(e.message) } finally { setBusy(false) }
  }
  async function doSignup(e) {
    e.preventDefault(); setErr(''); setBusy(true)
    try { await register({ nickname: form.nickname, password: form.password, class_level: form.class_level, school_code: form.school_code || undefined }); nav('/play') }
    catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  return (
    <div className="screen landing">
      {/* shield admin button — landing page only */}
      <motion.a
        href="/admin"
        className="admin-shield"
        title="Admin login"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.12 }}
        whileTap={{ scale: 0.92 }}
        transition={{ type: 'spring', stiffness: 300, damping: 16 }}
      >
        🛡️
      </motion.a>

      <motion.div className="hero" initial="hidden" animate="show">
        <motion.div className="flag-stripe" variants={fadeUp} custom={0} />
        <motion.div className="hero-row" variants={fadeUp} custom={1}>
          <motion.h1
            className="title"
            variants={fadeUp}
            custom={2}
            initial={{ opacity: 0, scale: 0.8, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 14, delay: 0.15 }}
          >Ghana STEM Trivia</motion.h1>
          <motion.div
            initial={{ opacity: 0, rotate: -12, scale: 0.5 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            transition={{ delay: 0.35, type: 'spring', stiffness: 180, damping: 10 }}
            style={{ flexShrink: 0 }}
          >
            <Mascot state="celebrate" size={92} />
          </motion.div>
        </motion.div>
        <motion.p className="subtitle" variants={fadeUp} custom={3}>
          Practice Science, Maths &amp; Computing — Primary 4 to JHS 3 (B4–B9)
        </motion.p>
      </motion.div>

      {user ? (
        <motion.div className="card center" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <p className="hi">Hi, <b>{user.nickname}</b> {isGuest ? <span className="pill">Guest</span> : null}</p>
          <div className="row">
            <button className="btn primary" onClick={() => nav('/play')}>Play ▶</button>
            <button className="btn" onClick={() => nav('/leaderboard')}>Leaderboard</button>
            {isAuthed && <button className="btn" onClick={() => nav('/profile')}>My Progress</button>}
          </div>
          <button className="link" onClick={logout}>Log out</button>
        </motion.div>
      ) : (
        <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <div className="tabs">
            <button className={tab === 'guest' ? 'tab active' : 'tab'} onClick={() => setTab('guest')}>Play as Guest</button>
            <button className={tab === 'login' ? 'tab active' : 'tab'} onClick={() => setTab('login')}>Login</button>
            <button className={tab === 'signup' ? 'tab active' : 'tab'} onClick={() => setTab('signup')}>Sign up</button>
          </div>

          {tab === 'guest' && (
            <form onSubmit={doGuest} className="form">
              <label>Nickname (optional)
                <input value={form.nickname} onChange={(e) => set('nickname', e.target.value)} placeholder="Guest" />
              </label>
              <label>Your class
                <select value={form.class_level} onChange={(e) => set('class_level', e.target.value)}>
                  {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label>School code (optional)
                <input value={form.school_code} onChange={(e) => set('school_code', e.target.value)} placeholder="e.g. ADIS-7" />
              </label>
              <button className="btn primary" disabled={busy}>Start playing ▶</button>
              <p className="hint">Guest progress is saved on this device only. Sign up to keep it forever and join leaderboards.</p>
            </form>
          )}

          {tab === 'login' && (
            <form onSubmit={doLogin} className="form">
              <label>Nickname
                <input value={form.nickname} onChange={(e) => set('nickname', e.target.value)} required />
              </label>
              <label>Password
                <input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} required />
              </label>
              <button className="btn primary" disabled={busy}>Login</button>
            </form>
          )}

          {tab === 'signup' && (
            <form onSubmit={doSignup} className="form">
              <label>Nickname
                <input value={form.nickname} onChange={(e) => set('nickname', e.target.value)} required minLength={2} />
              </label>
              <label>Password
                <input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} required minLength={4} />
              </label>
              <label>Your class
                <select value={form.class_level} onChange={(e) => set('class_level', e.target.value)}>
                  {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label>School code (optional)
                <input value={form.school_code} onChange={(e) => set('school_code', e.target.value)} placeholder="e.g. ADIS-7" />
              </label>
              <button className="btn primary" disabled={busy}>Create account</button>
            </form>
          )}
          {err && <p className="err">{err}</p>}
        </motion.div>
      )}
    </div>
  )
}
