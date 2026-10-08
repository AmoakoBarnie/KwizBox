import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../auth.jsx'
import { api } from '../api.js'
import HeroStage from '../components/HeroStage.jsx'
import Mascot from '../components/Mascot.jsx'

const CLASSES = ['B4', 'B5', 'B6', 'B7', 'B8', 'B9']

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: 0.05 * i, duration: 0.4, ease: 'easeOut' } }),
}

export default function Landing() {
  const { guestLogin, login, register, user, logout, isAuthed, isGuest } = useAuth()
  const nav = useNavigate()
  const location = useLocation()
  // If we arrived from a guest game ("log in to continue"), open the Login tab.
  const [tab, setTab] = useState(location?.state?.openTab || null)
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
    <motion.div className="screen landing">
    {/* shield admin button — landing page only */}
    <motion.a
      href="/admin"
      className="admin-shield"
      title="Admin login"
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.12 }}
      whileTap={{ scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18 }}
    >
      🛡️
    </motion.a>

    <motion.div className="hero" initial="hidden" animate="show">
      <motion.div className="flag-stripe" variants={fadeUp} custom={0} />
      <HeroStage user={user} />
        <motion.p className="subtitle" variants={fadeUp} custom={3}>
          Practice Science, Maths &amp; Computing — Primary 4 to JHS 3 (B4–B9)
        </motion.p>
        <motion.div className="hero-badge" variants={fadeUp} custom={4}>
          <span className="dot" /> NaCCA-aligned · Low-data · Works on any phone
        </motion.div>
        <motion.div className="feature-row" variants={fadeUp} custom={5}>
          <div className="feature"><span className="fi">🔬</span><b>Science</b></div>
          <div className="feature"><span className="fi">➗</span><b>Maths</b></div>
          <div className="feature"><span className="fi">💻</span><b>Computing</b></div>
        </motion.div>
      </motion.div>

      {user ? (
        <motion.div className="card center" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <p className="hi">Hi, <b>{user.nickname}</b> {isGuest ? <span className="pill">Guest</span> : null}</p>
          <div className="row">
            <button className="btn primary" onClick={() => nav('/choose-quiz')}>Play ▶</button>
            <button className="btn" onClick={() => nav('/profile')}>My Progress</button>
            {isAuthed && <button className="btn" onClick={() => nav('/settings')}>⚙️ Settings</button>}
          </div>
          <button className="link" onClick={logout}>Log out</button>
        </motion.div>
      ) : (
        <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          {/* Always-visible choices — the form pops up only after a click */}
          <div className="tabs">
            <button className={tab === 'guest' ? 'tab active' : 'tab'} onClick={() => setTab('guest')}>Play as Guest</button>
            <button className={tab === 'login' ? 'tab active' : 'tab'} onClick={() => setTab('login')}>Login</button>
            <button className={tab === 'signup' ? 'tab active' : 'tab'} onClick={() => setTab('signup')}>Sign up</button>
          </div>

          {/* Pop-up panel: only shown once a choice is clicked */}
          <AnimatePresence mode="wait">
          {tab && (
            <motion.div
              className="popup-panel"
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            >
              <button type="button" className="link back-link" onClick={() => setTab(null)}>← Back</button>

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
                  <button type="submit" className="btn primary" disabled={busy}>Start playing ▶</button>
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
                  <button type="submit" className="btn primary" disabled={busy}>Login</button>
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
                  <button type="submit" className="btn primary" disabled={busy}>Create account</button>
                </form>
              )}

              {err && <p className="err">{err}</p>}
            </motion.div>
          )}
          </AnimatePresence>
        </motion.div>
      )}

      <div className="policy-foot">
        <a href="/privacy-policy" className="policy-link">Privacy Policy</a>
        <a href="/terms-and-conditions" className="policy-link">Terms &amp; Conditions</a>
        <a href="/cookie-policy" className="policy-link">Cookies &amp; Tracking</a>
      </div>
    </motion.div>
  )
}
