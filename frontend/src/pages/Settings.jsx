import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../auth.jsx'
import { api } from '../api.js'
import Mascot from '../components/Mascot.jsx'
import SHSMascot from '../components/SHSMascot.jsx'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: 0.05 * i, duration: 0.4, ease: 'easeOut' } }),
}

function Toast({ msg, type = 'info', onDone }) {
  useEffect(() => {
    if (!msg) return
    const t = setTimeout(onDone, 3500)
    return () => clearTimeout(t)
  }, [msg, onDone])

  if (!msg) return null
  const colors = type === 'error'
    ? { bg: 'rgba(200,50,50,0.95)', border: '#ff4d5e' }
    : { bg: 'rgba(0,179,107,0.95)', border: '#00d27e' }
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      style={{
        position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        zIndex: 70, padding: '14px 22px', borderRadius: 14,
        fontSize: 15, fontWeight: 600, color: '#fff',
        maxWidth: 360, textAlign: 'center',
        boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
        background: colors.bg, border: `1px solid ${colors.border}`,
      }}>
      {msg}
    </motion.div>
  )
}

export default function Settings() {
  const { user, token, logout } = useAuth()
  const nav = useNavigate()

  const [tab, setTab] = useState('account')
  const [toast, setToast] = useState(null)

  const [pwCurrent, setPwCurrent] = useState('')
  const [pwNew, setPwNew] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')

  const [delPassword, setDelPassword] = useState('')
  const [delConfirm, setDelConfirm] = useState(false)

  const [exportData, setExportData] = useState(null)

  if (!user) {
    return (
      <div className="screen center">
        <p>You are not signed in.</p>
        <button className="btn primary" onClick={() => nav('/')}>Get started</button>
      </div>
    )
  }

  const isSHS = user.class_level && ['S1', 'S2', 'S3'].includes(user.class_level)
  const MascotComp = isSHS ? SHSMascot : Mascot

  async function handleChangePassword(e) {
    e.preventDefault()
    if (!pwCurrent) { setToast({ msg: 'Enter current password', type: 'error' }); return }
    if (pwNew.length < 6) { setToast({ msg: 'Password must be at least 6 characters', type: 'error' }); return }
    if (pwNew !== pwConfirm) { setToast({ msg: 'New passwords do not match', type: 'error' }); return }
    try {
      await api.changePassword({ current_password: pwCurrent, new_password: pwNew }, token)
      setPwCurrent(''); setPwNew(''); setPwConfirm('')
      setToast({ msg: 'Password updated successfully', type: 'success' })
    } catch (err) {
      setToast({ msg: err.message || 'Failed to change password', type: 'error' })
    }
  }

  async function handleDeleteAccount() {
    if (!delConfirm) return
    if (!user.is_guest && !delPassword) { setToast({ msg: 'Enter your password', type: 'error' }); return }
    try {
      await api.deleteAccount({ password: delPassword }, token)
      logout(); nav('/')
    } catch (err) {
      setToast({ msg: err.message || 'Failed to delete account', type: 'error' })
    }
  }

  async function handleExport() {
    try {
      const me = await api.me(token)
      setExportData(me)
      setToast({ msg: 'Data ready — scroll down to view or download', type: 'success' })
    } catch (err) {
      setToast({ msg: 'Failed to export data', type: 'error' })
    }
  }

  function downloadExport() {
    if (!exportData) return
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `stem-trivia-${user.nickname}-data.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const tabs = [
    { id: 'account', label: 'Account' },
    { id: 'security', label: 'Security' },
    { id: 'data', label: 'Data' },
    { id: 'about', label: 'Policies' },
  ]

  return (
    <motion.div className="screen settings"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>

      <button className="back" onClick={() => nav('/profile')}>‹ Back</button>

      {/* Header — shows user's actual avatar */}
      <motion.div className="profile-header" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="profile-avatar-ring">
          <MascotComp avatar={user.avatar} size={72} state="thinking" classLevel={user.class_level || (isSHS ? 'S2' : 'B7')} />
        </div>
        <div className="profile-identity">
          <h2 className="profile-name">{user.nickname}</h2>
          <div className="profile-meta-row">
            {user.class_level && <span className="profile-chip">{isSHS ? 'SHS' : 'JHS'} {user.class_level}</span>}
            <span className="profile-chip profile-chip-gold">Settings</span>
          </div>
        </div>
      </motion.div>

      {/* Tab nav */}
      <div className="settings-tabs">
        {tabs.map(t => (
          <button key={t.id}
            className={`settings-tab-btn${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {tab === 'account' && (
          <motion.div key="account" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div className="subjects">
              <div className="section-header">
                <h3 className="section-title">Account Details</h3>
                <span className="section-hint">Your profile information</span>
              </div>
              <div className="settings-info-list">
                <div className="settings-info-row">
                  <span className="settings-info-label">Nickname</span>
                  <span className="settings-info-value">{user.nickname}</span>
                </div>
                <div className="settings-info-row">
                  <span className="settings-info-label">Class</span>
                  <span className="settings-info-value">{user.class_level || 'Not set'}</span>
                </div>
                <div className="settings-info-row">
                  <span className="settings-info-label">School code</span>
                  <span className="settings-info-value">{user.school_code || 'None'}</span>
                </div>
                <div className="settings-info-row">
                  <span className="settings-info-label">Type</span>
                  <span className="settings-info-value">{user.is_guest ? 'Guest (device-only)' : 'Registered account'}</span>
                </div>
                {user.is_guest && (
                  <motion.div className="guest-nudge" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                    <p className="gn-title">Guest progress is stored on this device only.</p>
                    <p className="gn-sub">Sign up to keep progress forever and join leaderboards.</p>
                  </motion.div>
                )}
              </div>
            </div>
            <motion.div className="subjects" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className="section-header">
                <h3 className="section-title">Customization</h3>
              </div>
              <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>
                <button className="link" onClick={() => nav('/profile')}>Go to Profile →</button> to change avatar, skin, hats, and accessories.
              </p>
            </motion.div>
          </motion.div>
        )}

        {tab === 'security' && (
          <motion.div key="security" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div className="subjects">
              <div className="section-header">
                <h3 className="section-title">Change Password</h3>
                <span className="section-hint">{user.is_guest ? 'Guests cannot set a password' : 'Enter current + new password'}</span>
              </div>
              {user.is_guest ? (
                <p style={{ fontSize: 14, color: 'var(--muted)' }}>Guest accounts don't have passwords. Sign up for full account security.</p>
              ) : (
                <form onSubmit={handleChangePassword} className="settings-form">
                  <label>Current password
                    <input type="password" value={pwCurrent} onChange={e => setPwCurrent(e.target.value)} required />
                  </label>
                  <label>New password (min 6 chars)
                    <input type="password" value={pwNew} onChange={e => setPwNew(e.target.value)} required minLength={6} />
                  </label>
                  <label>Confirm new password
                    <input type="password" value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} required minLength={6} />
                  </label>
                  <button type="submit" className="btn primary">Update Password</button>
                </form>
              )}
            </div>

            <motion.div className="subjects danger-zone" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className="section-header">
                <h3 className="section-title">Delete Account</h3>
                <span className="section-hint">This action is permanent and cannot be undone</span>
              </div>
              <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 14 }}>
                Deleting your account removes all progress, scores, badges, and personal data. This cannot be reversed.
              </p>
              {!user.is_guest && (
                <label style={{ marginBottom: 12 }}>Enter password to confirm
                  <input type="password" value={delPassword} onChange={e => setDelPassword(e.target.value)} placeholder="Your password" />
                </label>
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: 14 }}>
                <input type="checkbox" checked={delConfirm} onChange={e => setDelConfirm(e.target.checked)} style={{ width: 'auto', margin: 0 }} />
                I understand this will permanently delete my account and data.
              </label>
              <button className="btn danger" disabled={!delConfirm} onClick={handleDeleteAccount}>Delete My Account</button>
            </motion.div>
          </motion.div>
        )}

        {tab === 'data' && (
          <motion.div key="data" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div className="subjects">
              <div className="section-header">
                <h3 className="section-title">Export My Data</h3>
                <span className="section-hint">Download all your progress as JSON</span>
              </div>
              <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 14 }}>
                Export your profile, progress, scores, and badges. Download a copy of your data.
              </p>
              <div className="settings-btn-row">
                <button className="btn primary" onClick={handleExport}>Export Data</button>
                {exportData && <button className="btn" onClick={downloadExport}>Download JSON</button>}
              </div>
              {exportData && (
                <div className="settings-export-preview">
                  <pre>{JSON.stringify(exportData, null, 2)}</pre>
                </div>
              )}
            </div>
            <motion.div className="subjects" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className="section-header">
                <h3 className="section-title">Clear Local Data</h3>
              </div>
              <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 14 }}>
                Remove cached data from this browser. Your account progress is safe on the server.
              </p>
              <button className="btn" onClick={() => {
                localStorage.removeItem('stem_badges')
                localStorage.removeItem('stem_last_result')
                localStorage.removeItem('stem_last_cfg')
                localStorage.removeItem('stem_theme')
                localStorage.removeItem('stem_sound')
                setToast({ msg: 'Local data cleared', type: 'success' })
              }}>Clear Cache</button>
            </motion.div>
          </motion.div>
        )}

        {tab === 'about' && (
          <motion.div key="about" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div className="subjects">
              <div className="section-header">
                <h3 className="section-title">Policies</h3>
              </div>
              <div className="settings-policy-list">
                <button className="settings-policy-btn" onClick={() => nav('/privacy-policy')}>
                  <span>🔐</span> Privacy Policy <span className="settings-policy-arrow">→</span>
                </button>
                <button className="settings-policy-btn" onClick={() => nav('/terms-and-conditions')}>
                  <span>📋</span> Terms &amp; Conditions <span className="settings-policy-arrow">→</span>
                </button>
                <button className="settings-policy-btn" onClick={() => nav('/cookie-policy')}>
                  <span>🍪</span> Cookie Policy <span className="settings-policy-arrow">→</span>
                </button>
              </div>
            </div>
            <motion.div className="subjects" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <div className="section-header">
                <h3 className="section-title">About</h3>
              </div>
              <div className="settings-info-list">
                <div className="settings-info-row">
                  <span className="settings-info-label">App</span>
                  <span className="settings-info-value">KwizBox</span>
                </div>
                <div className="settings-info-row">
                  <span className="settings-info-label">Version</span>
                  <span className="settings-info-value">1.0.0</span>
                </div>
                <div className="settings-info-row">
                  <span className="settings-info-label">Curriculum</span>
                  <span className="settings-info-value">NaCCA-aligned · WASSCE-track</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {!user.is_guest && (
        <div className="row" style={{ marginTop: 8 }}>
          <button className="link" onClick={() => { logout(); nav('/') }}>Log out</button>
        </div>
      )}

      <AnimatePresence>
        {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      </AnimatePresence>
    </motion.div>
  )
}
