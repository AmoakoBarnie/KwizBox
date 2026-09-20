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
  const [form, setForm] = useState({ nickname: '', password: '', class_level: 'B4', school_code: '', security_question: api.securityQuestions[0], security_answer: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [resetStep, setResetStep] = useState(0) // 0: hidden, 1: ask answer, 2: new password
  const [reset, setReset] = useState({ nickname: '', question: '', answer: '', new_password: '' })

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
    try { await register({ nickname: form.nickname, password: form.password, class_level: form.class_level, school_code: form.school_code || undefined, security_question: form.security_question, security_answer: form.security_answer }); nav('/play') }
    catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  async function startReset(e) {
    e.preventDefault(); setErr(''); setBusy(true)
    try {
      const r = await api.resetQuestion({ nickname: reset.nickname })
      if (!r.has_security_question) { setErr('No account found with that nickname, or no security question set.'); return }
      setReset((s) => ({ ...s, question: r.security_question }))
      setResetStep(2)
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }
  async function finishReset(e) {
    e.preventDefault(); setErr(''); setBusy(true)
    try {
      const r = await api.resetVerify({ nickname: reset.nickname, security_answer: reset.answer, new_password: reset.new_password })
      setResetStep(0); setErr('')
      // auto-login with the returned token
      login({ nickname: reset.nickname, password: reset.new_password })
      nav('/play')
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
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
                  <button type="button" className="link" onClick={() => { setReset((s) => ({ ...s, nickname: form.nickname })); setResetStep(1); setErr('') }}>Forgot password?</button>
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
                  <label>Security question (for password recovery)
                    <select value={form.security_question} onChange={(e) => set('security_question', e.target.value)}>
                      {api.securityQuestions.map((q) => <option key={q} value={q}>{q}</option>)}
                    </select>
                  </label>
                  <label>Your answer
                    <input value={form.security_answer} onChange={(e) => set('security_answer', e.target.value)} placeholder="Answer to your question" required />
                  </label>
                  <button type="submit" className="btn primary" disabled={busy}>Create account</button>
                </form>
              )}

              {resetStep > 0 && (
                <form onSubmit={resetStep === 1 ? startReset : finishReset} className="form card" style={{ marginTop: 12, borderColor: 'var(--gold)' }}>
                  <p style={{ fontWeight: 800, marginTop: 0 }}>Reset your password</p>
                  {resetStep === 1 && (
                    <>
                      <label>Nickname
                        <input value={reset.nickname} onChange={(e) => setReset((s) => ({ ...s, nickname: e.target.value }))} required />
                      </label>
                      <button className="btn primary" disabled={busy}>Continue</button>
                    </>
                  )}
                  {resetStep === 2 && reset.question && (
                    <>
                      <p style={{ margin: '4px 0' }}><b>{reset.question}</b></p>
                      <label>Your answer
                        <input value={reset.answer} onChange={(e) => setReset((s) => ({ ...s, answer: e.target.value }))} required />
                      </label>
                      <label>New password
                        <input type="password" value={reset.new_password} onChange={(e) => setReset((s) => ({ ...s, new_password: e.target.value }))} required minLength={4} />
                      </label>
                      <button className="btn primary" disabled={busy}>Reset password</button>
                    </>
                  )}
                  <button type="button" className="link" onClick={() => setResetStep(0)}>Cancel</button>
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
