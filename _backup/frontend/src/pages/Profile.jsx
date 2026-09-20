import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../auth.jsx'
import { BADGES, loadBadges, saveBadges, evaluateBadges } from '../badges.js'
import { levelUp } from '../sound.js'
import Mascot from '../components/Mascot.jsx'
import SHSMascot from '../components/SHSMascot.jsx'

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: 0.05 * i, duration: 0.35, ease: 'easeOut' } }),
}

const pop = {
  hidden: { opacity: 0, scale: 0.7 },
  show: (i = 0) => ({ opacity: 1, scale: 1, transition: { delay: 0.04 * i, type: 'spring', stiffness: 280, damping: 16 } }),
}

function BadgeToast({ badge, onDone }) {
  return (
    <motion.div
      className="badge-toast"
      initial={{ opacity: 0, y: 30, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 280, damping: 20 }}
      style={{
        position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        zIndex: 60, background: 'var(--glass-strong)', backdropFilter: 'blur(18px)',
        border: '1px solid var(--gold)', borderRadius: 18, padding: '14px 22px',
        display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
      }}
    >
      <span style={{ fontSize: 32 }}>{badge.icon}</span>
      <div>
        <div style={{ fontWeight: 800, color: 'var(--gold)', fontSize: 15 }}>{badge.name}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{badge.desc}</div>
      </div>
      <button className="btn small" onClick={onDone} style={{ width: 'auto', marginLeft: 8 }}>Nice!</button>
    </motion.div>
  )
}

export default function Profile() {
  const nav = useNavigate()
  const { user, isAuthed, logout } = useAuth()
  const [earned, setEarned] = useState(() => loadBadges())
  const [toast, setToast] = useState(null)

  useEffect(() => { saveBadges(earned) }, [earned])

  useEffect(() => {
    const result = window.__lastQuizResult
    if (!result) return
    const cfg = window.__lastQuizCfg
    if (!cfg) return
    const { newEarned, newlyAwarded } = evaluateBadges(result, cfg, earned)
    if (newEarned.length > earned.length) {
      setEarned(newEarned)
      levelUp()
      const latest = newlyAwarded[newlyAwarded.length - 1]
      const badge = BADGES.find((b) => b.id === latest)
      if (badge) setToast(badge)
    }
    delete window.__lastQuizResult
    delete window.__lastQuizCfg
  }, [])

  if (!user) {
    return (
      <div className="screen center">
        <p>You are not signed in.</p>
        <button className="btn primary" onClick={() => nav('/')}>Get started</button>
      </div>
    )
  }

  const isSHS = ['S1', 'S2', 'S3'].includes(user.class_level)
  const MascotComp = isSHS ? SHSMascot : Mascot

  const p = user.progress
  const overall = p?.overall
  const subjects = p?.subjects || []
  const masteredCount = p?.topics_mastered || 0

  const statCards = [
    {v: overall?.lifetime_score ?? user.lifetime_score,          l: 'Total points',        icon: '⭐'},
    {v: overall?.questions_answered ?? user.total_questions,    l: 'Questions done',      icon: '📝'},
    {v: <span style={{ color: 'var(--gold)', fontWeight: 800 }}>{Math.round((overall?.accuracy ?? 0) * 100)}%</span>, l: 'Overall accuracy', icon: '🎯'},
    {v: `${overall?.current_streak ?? user.current_streak}🔥`,   l: 'Current streak',      icon: '🔥'},
    {v: `${overall?.longest_streak ?? user.longest_streak}🔥`,   l: 'Best streak',         icon: '🏆'},
    {v: overall?.correct ?? user.total_correct,                  l: 'Correct answers',     icon: '✅'},
    {v: masteredCount,                                            l: 'Topics mastered',      icon: '🏅'},
  ]

  const earnedCount = earned.length
  const totalCount = BADGES.length

  const AVATAR_SKINS = [
    { value: 'warm',  label: 'Warm',  color: '#a86b3c' },
    { value: 'deep',  label: 'Deep',  color: '#6b3a1f' },
    { value: 'light', label: 'Light', color: '#e8c9a0' },
    { value: 'cool',  label: 'Cool',  color: '#c9a88c' },
  ]
  const AVATAR_HATS = [
    { value: 'none',        label: 'None' },
    { value: 'kente_cap',   label: 'Kente cap' },
    { value: 'school_cap',  label: 'School cap' },
    { value: 'beanie',      label: 'Beanie' },
    { value: 'sun_hat',     label: 'Sun hat' },
  ]
  const AVATAR_ACCESSORIES = [
    { value: 'none',        label: 'None' },
    { value: 'glasses',     label: 'Glasses' },
    { value: 'watch',       label: 'Watch' },
    { value: 'necklace',    label: 'Necklace' },
    { value: 'school_bag',  label: 'School bag' },
    { value: 'bow_tie',     label: 'Bow tie' },
  ]
  const [avatar, setAvatar] = useState(user.avatar || { skin: 'warm', hat: 'none', accessory: 'none', gender: 'male' })
  const [saving, setSaving] = useState(false)

  async function saveAvatar() {
    setSaving(true)
    try {
      await useAuth().updateAvatar(avatar)
    } catch (e) { /* optimistic — keep local choice */ }
    finally { setSaving(false) }
  }

  const pickSkin = (s) => { setAvatar(a => ({ ...a, skin: s })); saveAvatar() }
  const pickHat  = (h) => { setAvatar(a => ({ ...a, hat: h }));      saveAvatar() }
  const pickAcc  = (ac)=> { setAvatar(a => ({ ...a, accessory: ac })); saveAvatar() }

  return (
    <motion.div className="screen profile"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>

      <button className="back" onClick={() => nav('/')}>‹ Back</button>

      {/* ---- Header card ---- */}
      <motion.div className="profile-header" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="profile-avatar-ring">
          <MascotComp avatar={avatar} size={130} state="thinking" classLevel={user.class_level || (isSHS ? 'S2' : 'B7')} />
        </div>
        <div className="profile-identity">
          <h2 className="profile-name">{user.nickname}</h2>
          <div className="profile-meta-row">
            {user.class_level && <span className="profile-chip">Class {user.class_level}</span>}
            {user.school_code && <span className="profile-chip">School: {user.school_code}</span>}
            {isAuthed ? <span className="profile-chip profile-chip-gold">Signed in</span> : <span className="profile-chip profile-chip-outline">Guest</span>}
          </div>
        </div>
        {/* Settings gear icon — top right */}
        <motion.button
          className="settings-gear"
          onClick={() => nav('/settings')}
          whileHover={{ scale: 1.1, rotate: 30 }}
          whileTap={{ scale: 0.9 }}
          title="Settings"
        >⚙️</motion.button>
      </motion.div>

      {/* ---- Avatar customization (Upgrade 8) ---- */}
      <motion.div className="subjects" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <div className="section-header">
          <h3 className="section-title">🎨 My Avatar</h3>
          <span className="section-hint">Pick your look — saved to your account</span>
        </div>

        <div className="avatar-preview-card">
          <div className="avatar-preview-inner">
            <MascotComp avatar={avatar} size={130} state="thinking" classLevel={user.class_level || (isSHS ? 'S2' : 'B7')} />
            <AnimatePresence>
              {saving && (
                <motion.span className="saving-dot"
                  initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 14 }}
                >
                  💾 Saving
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <p className="hint" style={{ textAlign: 'center', margin: '6px 0 0' }}>
            Tap the mascot to react
          </p>
        </div>

        <div className="avatar-group">
          <span className="avatar-group-label">Skin tone</span>
          <div className="avatar-group-options">
            {AVATAR_SKINS.map(s => (
              <button key={s.value}
                className={`avatar-swatch-btn${avatar.skin === s.value ? ' selected' : ''}`}
                onClick={() => pickSkin(s.value)}
                title={s.label}
                style={{ '--swatch': s.color }}
              >
                <span className="avatar-swatch-dot" />
                <span className="avatar-swatch-label">{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="avatar-group">
          <span className="avatar-group-label">Hat</span>
          <div className="avatar-group-options">
            {AVATAR_HATS.map(h => (
              <button key={h.value}
                className={`avatar-text-btn${avatar.hat === h.value ? ' selected' : ''}`}
                onClick={() => pickHat(h.value)}
              >
                {h.label}
              </button>
            ))}
          </div>
        </div>

        <div className="avatar-group">
          <span className="avatar-group-label">Accessory</span>
          <div className="avatar-group-options">
            {AVATAR_ACCESSORIES.map(a => (
              <button key={a.value}
                className={`avatar-text-btn${avatar.accessory === a.value ? ' selected' : ''}`}
                onClick={() => pickAcc(a.value)}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ---- Stats ---- */}
      <motion.div className="subjects" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <div className="section-header">
          <h3 className="section-title">Your stats</h3>
          <span className="section-hint">All-time progress</span>
        </div>
        <div className="stat-cards">
          {statCards.map((s, i) => (
            <motion.div key={s.l + i} className="stat-card"
              variants={pop} custom={i} initial="hidden" animate="show">
              <div className="stat-card-icon">{s.icon}</div>
              <div className="stat-card-body">
                <b className="stat-card-value">{s.v}</b>
                <span className="stat-card-label">{s.l}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ---- Badges section ---- */}
      <motion.div className="subjects" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <div className="section-header">
          <h3 className="section-title">🏅 Badges</h3>
          <span className="section-hint">{earnedCount} / {totalCount} earned</span>
        </div>
        <div className="badge-grid">
          {BADGES.map((b, i) => {
            const isEarned = earned.includes(b.id)
            return (
              <motion.div key={b.id} className={`badge-item ${isEarned ? 'earned' : 'locked'}`}
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.05 * (i + 1) }}>
                <span className="badge-icon">{isEarned ? b.icon : '❓'}</span>
                <span className="badge-name">{b.name}</span>
                <span className="badge-desc">{b.desc}</span>
              </motion.div>
            )
          })}
        </div>
      </motion.div>

      {/* ---- Accuracy by subject ---- */}
      {subjects.length > 0 && (
        <motion.div className="subjects" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div className="section-header">
            <h3 className="section-title">Accuracy by subject</h3>
            <span className="section-hint">{subjects.length} subjects</span>
          </div>
          {subjects.map((s) => (
            <div key={s.class_level + s.subject} className="subject-block">
              <div className="subject-head">
                <b>{s.subject}</b>
                <span className="muted">{s.class_level} · <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{Math.round((s.accuracy ?? 0) * 100)}%</span> · {s.questions_answered} Qs</span>
              </div>
              <div className="topics">
                {s.topics.map((t) => (
                  <motion.span key={t.topic} className={t.mastered ? 'topic-chip mastered' : 'topic-chip'}
                    initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
                    {t.topic} {t.mastered ? '🏅' : `· ${Math.round((t.accuracy ?? 0) * 100)}%`}
                  </motion.span>
                ))}
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* ---- Guest nudge ---- */}
      {!isAuthed && (
        <motion.div className="guest-nudge"
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <p className="gn-title">This is a guest session — progress is stored only on this device.</p>
          <p className="gn-sub">Sign up to keep your progress forever and join leaderboards.</p>
        </motion.div>
      )}

      {/* ---- Action buttons ---- */}
      <div className="row">
        <motion.button className="btn primary" onClick={() => nav('/play')} whileTap={{ scale: 0.96 }}>Play ▶</motion.button>
        <motion.button className="btn" onClick={() => nav('/leaderboard')} whileTap={{ scale: 0.96 }}>Leaderboard</motion.button>
        {isAuthed && <button className="link" onClick={logout}>Log out</button>}
      </div>

      <AnimatePresence>
        {toast && <BadgeToast badge={toast} onDone={() => setToast(null)} />}
      </AnimatePresence>
    </motion.div>
  )
}
