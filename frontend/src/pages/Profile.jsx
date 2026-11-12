import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../auth.jsx'
import { BADGES, loadBadges, saveBadges, evaluateBadges } from '../badges.js'
import { levelUp } from '../sound.js'
import Mascot from '../components/Mascot.jsx'

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
  const { user, isAuthed, logout, updateAvatar } = useAuth()
  const [earned, setEarned] = useState(() => loadBadges())
  const [toast, setToast] = useState(null)
  // Avatar state must be declared here — BEFORE the `!user` early return below.
  // Declaring it after the return meant the first render (user still loading)
  // called 3 hooks and the next render called 6: "Rendered more hooks than
  // during the previous render", which crashed the whole profile page.
  const [avatar, setAvatar] = useState(() => user?.avatar || { skin: 'warm', hat: 'none', accessory: 'none', gender: 'male' })
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState('')

  // Pull the server's saved avatar in once the session loads (or after a save).
  useEffect(() => {
    if (user?.avatar) setAvatar(user.avatar)
  }, [user?.avatar?.skin, user?.avatar?.hat, user?.avatar?.accessory, user?.avatar?.gender])

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
  const MascotComp = Mascot

  const p = user.progress
  const overall = p?.overall
  const subjects = p?.subjects || []
  const masteredCount = p?.topics_mastered || 0
  // Engagement payload (backend/src/progress.py): XP level from lifetime
  // points, weekly league, and daily activity for the streak calendar.
  const xp = p?.xp || null
  const league = p?.league || null
  const activity = p?.activity || []

  // Streak-calendar cells: the last 56 days (8 weeks), keyed by UTC date to
  // match the backend's func.date(created_at) aggregation. Each cell is one
  // day; intensity buckets by points scored that day.
  const actMap = {}
  activity.forEach((a) => { if (a && a.day) actMap[a.day] = a })
  const heatCells = []
  for (let i = 55; i >= 0; i--) {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - i)
    const day = d.toISOString().slice(0, 10)
    const a = actMap[day]
    const score = a ? a.score || 0 : 0
    const level = score === 0 ? 0 : score < 40 ? 1 : score < 100 ? 2 : 3
    heatCells.push({ day, score, level })
  }

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

  // PATCH the avatar and refresh the auth context. The NEXT avatar object is
  // passed in explicitly: reading `avatar` here would save the previous
  // choice (setAvatar doesn't land until the next render), and calling the
  // useAuth() hook inside this handler — as the old code did — is an invalid
  // hook call that throws before the request is ever sent.
  async function saveAvatar(next) {
    setSaving(true); setSaveErr('')
    try {
      await updateAvatar(next)
    } catch (e) {
      setSaveErr(e.message || 'Could not save your look — check your connection')
    } finally { setSaving(false) }
  }

  const pickSkin = (s) => { const next = { ...avatar, skin: s }; setAvatar(next); saveAvatar(next) }
  const pickHat  = (h) => { const next = { ...avatar, hat: h }; setAvatar(next); saveAvatar(next) }
  const pickAcc  = (ac)=> { const next = { ...avatar, accessory: ac }; setAvatar(next); saveAvatar(next) }

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

      {/* ---- Level & league (engagement) ---- */}
      {xp && (
        <motion.div className="subjects" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
          <div className="section-header">
            <h3 className="section-title">{xp.icon} Level {xp.level} — {xp.name}</h3>
            <span className="section-hint">
              {league ? `${league.icon} ${league.name} league` : ''}
            </span>
          </div>
          <div className="xp-bar-wrap">
            <div className="xp-bar" role="progressbar"
              aria-valuenow={Math.round((xp.progress || 0) * 100)} aria-valuemin={0} aria-valuemax={100}
              aria-label={`Level ${xp.level} progress`}>
              <div className="xp-bar-fill" style={{ width: `${Math.round((xp.progress || 0) * 100)}%` }} />
            </div>
            <span className="xp-bar-label">
              {xp.next_threshold != null
                ? `${xp.points} / ${xp.next_threshold} pts → Level ${xp.level + 1}`
                : `${xp.points} pts — max level! 👑`}
            </span>
          </div>
          {league && (
            <div className="league-row">
              <span className="league-chip">{league.icon} {league.name}</span>
              <span className="league-sub">
                {league.next_name
                  ? `${league.weekly_points} pts this week · ${league.points_to_next} more to ${league.next_name} ${league.next_name ? '' : ''}`
                  : `${league.weekly_points} pts this week — top league! 💎`}
              </span>
            </div>
          )}
        </motion.div>
      )}

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
          {saveErr && (
            <p className="avatar-save-err" role="alert">⚠️ {saveErr}</p>
          )}
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

      {/* ---- Streak calendar (engagement): last 8 weeks ---- */}
      {activity.length > 0 && (
        <motion.div className="subjects" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.33 }}>
          <div className="section-header">
            <h3 className="section-title">📅 Daily streak</h3>
            <span className="section-hint">
              {overall?.current_streak ?? user.current_streak ?? 0}🔥 day streak · last 8 weeks
            </span>
          </div>
          <div className="heat-grid" aria-label="Days played in the last 8 weeks">
            {heatCells.map((c) => (
              <span key={c.day} className={`heat-cell h${c.level}`}
                title={c.score ? `${c.day}: ${c.score} pts` : c.day} />
            ))}
          </div>
          <p className="hint">Every square is a day — the brighter it glows, the more points you scored 🎮</p>
        </motion.div>
      )}

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
