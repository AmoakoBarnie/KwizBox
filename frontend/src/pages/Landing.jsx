import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth.jsx'

const CLASSES = ['B4', 'B5', 'B6', 'B7', 'B8', 'B9']

export default function Landing() {
  const { guestLogin, login, register, user, logout, isAuthed, isGuest } = useAuth()
  const nav = useNavigate()
  const [tab, setTab] = useState('guest') // guest | login | signup
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
      <div className="hero">
        <div className="flag-stripe" />
        <h1 className="title">Ghana STEM Trivia</h1>
        <p className="subtitle">Practice Science, Maths &amp; Computing — Primary 4 to JHS 3 (B4–B9)</p>
      </div>

      {user ? (
        <div className="card center">
          <p className="hi">Hi, <b>{user.nickname}</b> {isGuest ? <span className="pill">Guest</span> : null}</p>
          <div className="row">
            <button className="btn primary" onClick={() => nav('/play')}>Play ▶</button>
            <button className="btn" onClick={() => nav('/leaderboard')}>Leaderboard</button>
            {isAuthed && <button className="btn" onClick={() => nav('/profile')}>My Progress</button>}
          </div>
          <button className="link" onClick={logout}>Log out</button>
        </div>
      ) : (
        <div className="card">
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
        </div>
      )}

      <a className="admin-entry" href="/admin">🔐 Admin login</a>
    </div>
  )
}
