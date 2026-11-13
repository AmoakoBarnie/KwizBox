import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../auth.jsx'
import { api } from '../api.js'
import { SUBJECTS } from '../subjects.js'
import Mascot from '../components/Mascot.jsx'
import { cacheOfflineMedia, clearOfflinePack, getOfflinePack, saveOfflinePack } from '../offlinePractice.js'
import '../offlinePractice.css'

const CLASSES = ['B4', 'B5', 'B6', 'B7', 'B8', 'B9', 'S1', 'S2', 'S3']

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 240, damping: 16 } },
}

export default function ChooseQuiz() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [cls, setCls] = useState(params.get('class_level') || user?.class_level || '')
  const [subject, setSubject] = useState(params.get('subject') || '')
  const [topic, setTopic] = useState(params.get('topic') || '')
  const [subTopic, setSubTopic] = useState(params.get('sub_topic') || '')
  const [daily, setDaily] = useState(params.get('daily') === 'true')
  const [topics, setTopics] = useState([])
  const [subTopics, setSubTopics] = useState([])
  const [loadingTopics, setLoadingTopics] = useState(false)
  const [loadingSubTopics, setLoadingSubTopics] = useState(false)
  const [open, setOpen] = useState(null) // 'class' | 'subject' | 'topic' | 'subtopic'
  const [offlinePack, setOfflinePack] = useState(null)
  const [offlineBusy, setOfflineBusy] = useState(false)
  const [offlineMessage, setOfflineMessage] = useState('')
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))

  // Load topics when class+subject change
  useEffect(() => {
    let cancelled = false
    setLoadingTopics(true); setTopics([]); setTopic(''); setSubTopic(''); setSubTopics([])
    if (!cls || !subject) { setLoadingTopics(false); return }
    api.curriculum.topics()
      .then(data => {
        if (cancelled) return
        const sd = data?.[subject]
        if (!sd) return
        const cd = sd?.[cls]
        if (!cd) return
        const list = Object.keys(cd).sort()
        setTopics(list)
        if (list.length) {
          setTopic(list[0])
          const subs = (cd[list[0]] || []).slice().sort()
          setSubTopics(subs)
          if (subs.length) setSubTopic(subs[0])
        }
      })
      .catch(() => { setTopics([]); setSubTopics([]) })
      .finally(() => { if (!cancelled) setLoadingTopics(false) })
    return () => { cancelled = true }
  }, [cls, subject])

  // Load sub-topics when topic changes
  useEffect(() => {
    if (!topic) { setSubTopics([]); setSubTopic(''); return }
    let cancelled = false
    setLoadingSubTopics(true)
    api.curriculum.topics()
      .then(data => {
        if (cancelled) return
        const sd = data?.[subject]
        if (!sd) return
        const cd = sd?.[cls]
        if (!cd || !cd[topic]) { setSubTopics([]); return }
        const subs = cd[topic].slice().sort()
        setSubTopics(subs)
        if (subTopic && !subs.includes(subTopic)) setSubTopic(subs[0] || '')
      })
      .catch(() => setSubTopics([]))
      .finally(() => { if (!cancelled) setLoadingSubTopics(false) })
    return () => { cancelled = true }
  }, [topic, subject, cls])

  // Load any pack saved on this device and track connection changes.
  useEffect(() => {
    let cancelled = false
    getOfflinePack()
      .then((saved) => { if (!cancelled) setOfflinePack(saved) })
      .catch(() => {})
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      cancelled = true
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  function toggle(s) {
    if (s === 'topic' && (!cls || !subject)) return
    setOpen(open === s ? null : s)
  }

  function start() {
    if (!cls || !subject) return
    const p = new URLSearchParams({ class_level: cls, subject })
    if (topic) p.set('topic', topic)
    if (subTopic) p.set('sub_topic', subTopic)
    if (daily) p.set('daily', 'true')
    nav(`/quiz?${p.toString()}`)
  }

  const ready = cls && subject

  function offlineConfig() {
    const config = { class_level: cls, subject }
    if (topic) config.topic = topic
    if (subTopic) config.sub_topic = subTopic
    return config
  }

  async function downloadOfflinePack() {
    if (!ready) { setOfflineMessage('Pick a class and subject first.'); return }
    if (!online) { setOfflineMessage('Connect to the internet once to save a pack.'); return }
    setOfflineBusy(true)
    setOfflineMessage('Saving questions…')
    try {
      const config = offlineConfig()
      const questions = await api.offlinePack({ ...config, count: 12 })
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('No questions are available for this selection.')
      }
      const saved = { config, questions, created_at: new Date().toISOString() }
      await saveOfflinePack(saved)
      try { await cacheOfflineMedia(questions) } catch {}
      setOfflinePack(saved)
      setOfflineMessage(`${questions.length} questions saved on this device. You can practise without data.`)
    } catch (e) {
      setOfflineMessage(`Could not save an offline pack: ${e.message}`)
    } finally {
      setOfflineBusy(false)
    }
  }

  function startOfflinePractice() {
    if (!offlinePack?.questions?.length) {
      setOfflineMessage('Save a pack while online first.')
      return
    }
    nav('/quiz?offline=true')
  }

  async function removeOfflinePack() {
    setOfflineBusy(true)
    try {
      await clearOfflinePack()
      setOfflinePack(null)
      setOfflineMessage('Saved pack removed from this device.')
    } finally {
      setOfflineBusy(false)
    }
  }

  function formatSavedAt(value) {
    if (!value) return ''
    try {
      return new Date(value).toLocaleString('en-GB', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      })
    } catch {
      return ''
    }
  }

  /* ===== Inline expandable panel for each section ===== */
  function ClassPanel() {
    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut', type: 'spring', stiffness: 220, damping: 14 }}
        style={{ overflow: 'hidden' }}
      >
        <div className="inline-panel">
          <div className="inline-panel-head">
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>Class {cls}</span>
          </div>
          <div className="inline-panel-body">
            {CLASSES.map(c => (
              <button
                key={c}
                className={`inline-chip${cls === c ? ' selected' : ''}`}
                onClick={() => { setCls(c); setOpen(null) }}
                style={{ width: '100%', textAlign: 'left' }}
              >
                {c}
                {cls === c && <span className="popup-check">✓</span>}
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    )
  }

  function SubjectPanel() {
    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut', type: 'spring', stiffness: 220, damping: 14 }}
        style={{ overflow: 'hidden' }}
      >
        <div className="inline-panel">
          <div className="inline-panel-head">
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{subject}</span>
          </div>
          <div className="inline-panel-body inline-panel-body-scroll">
            {SUBJECTS.map(s => (
              <button
                key={s}
                className={`inline-chip${subject === s ? ' selected' : ''}`}
                onClick={() => { setSubject(s); setOpen(null) }}
                style={{ width: '100%', textAlign: 'left' }}
              >
                {s}
                {subject === s && <span className="popup-check">✓</span>}
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    )
  }

  function TopicPanel() {
    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut', type: 'spring', stiffness: 220, damping: 14 }}
        style={{ overflow: 'hidden' }}
      >
        <div className="inline-panel">
          <div className="inline-panel-body">
            <button
              className={`inline-chip${topic === '' ? ' selected' : ''}`}
              onClick={() => { setTopic(''); setSubTopic(''); setOpen(null) }}
              style={{ width: '100%', textAlign: 'left' }}
            >
              All topics
              {topic === '' && <span className="popup-check">✓</span>}
            </button>
            {topics.map(t => (
              <button
                key={t}
                className={`inline-chip${topic === t ? ' selected' : ''}`}
                onClick={() => { setTopic(t); setOpen(null) }}
                style={{ width: '100%', textAlign: 'left' }}
              >
                {t}
                {topic === t && <span className="popup-check">✓</span>}
              </button>
            ))}
            {loadingTopics && <div className="hint" style={{ textAlign: 'center', padding: '8px' }}>Loading…</div>}
          </div>
        </div>
      </motion.div>
    )
  }

  function SubTopicPanel() {
    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut', type: 'spring', stiffness: 220, damping: 14 }}
        style={{ overflow: 'hidden' }}
      >
        <div className="inline-panel">
          <div className="inline-panel-body">
            <button
              className={`inline-chip${subTopic === '' ? ' selected' : ''}`}
              onClick={() => { setSubTopic(''); setOpen(null) }}
              style={{ width: '100%', textAlign: 'left' }}
            >
              All sub-topics
              {subTopic === '' && <span className="popup-check">✓</span>}
            </button>
            {subTopics.map(st => (
              <button
                key={st}
                className={`inline-chip${subTopic === st ? ' selected' : ''}`}
                onClick={() => { setSubTopic(st); setOpen(null) }}
                style={{ width: '100%', textAlign: 'left' }}
              >
                {st}
                {subTopic === st && <span className="popup-check">✓</span>}
              </button>
            ))}
            {loadingSubTopics && <div className="hint" style={{ textAlign: 'center', padding: '8px' }}>Loading…</div>}
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="screen play">
      <button className="back" onClick={() => nav('/')}>‹ Back</button>

      <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="kente-title" style={{ textAlign: 'center', marginTop: 6 }}>
        Choose your quiz
      </motion.h2>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
        {['S1', 'S2', 'S3'].includes(cls)
          ? <Mascot type="shs" state="thinking" size={80} gender={user?.avatar?.gender} avatar={user?.avatar} classLevel={cls} />
          : <Mascot type="youth" state="thinking" size={80} gender={user?.avatar?.gender} avatar={user?.avatar} classLevel={cls || 'B4'} />
        }
      </motion.div>

      {/* Selection rows — click to expand inline */}
      <div className="card" style={{ padding: '14px 14px' }}>

        {/* Your class */}
        <div className="section-row">
          <button className="section-row-btn" onClick={() => toggle('class')}>
            <div className="section-row-label">
              <span className="label-dot" />
              <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--muted)' }}>Your class</span>
            </div>
            <div className="section-row-value">
              <span className={cls ? '' : 'placeholder'}>{cls || '— pick —'}</span>
              <span className="section-arrow">{open === 'class' ? '▴' : '▾'}</span>
            </div>
          </button>
          <AnimatePresence>
            {open === 'class' && <ClassPanel />}
          </AnimatePresence>
        </div>

        {/* Subject */}
        <div className="section-row">
          <button className="section-row-btn" onClick={() => toggle('subject')}>
            <div className="section-row-label">
              <span className="label-dot" />
              <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--muted)' }}>Subject</span>
            </div>
            <div className="section-row-value">
              <span className={subject ? '' : 'placeholder'}>{subject || '— pick —'}</span>
              <span className="section-arrow">{open === 'subject' ? '▴' : '▾'}</span>
            </div>
          </button>
          <AnimatePresence>
            {open === 'subject' && <SubjectPanel />}
          </AnimatePresence>
        </div>

        {/* Topic */}
        <div className="section-row">
          <button className="section-row-btn" onClick={() => toggle('topic')} disabled={!ready} style={{ opacity: ready ? 1 : 0.5 }}>
            <div className="section-row-label">
              <span className="label-dot" />
              <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--muted)' }}>Topic</span>
            </div>
            <div className="section-row-value">
              <span className={topic ? '' : 'placeholder'}>{topic || (!ready ? '— pick class & subject —' : '— pick —')}</span>
              <span className="section-arrow">{open === 'topic' ? '▴' : '▾'}</span>
            </div>
          </button>
          <AnimatePresence>
            {open === 'topic' && <TopicPanel />}
          </AnimatePresence>
        </div>

        {/* Sub-topic */}
        {topic && (
          <div className="section-row">
            <button className="section-row-btn" onClick={() => toggle('subtopic')}>
              <div className="section-row-label">
                <span className="label-dot" />
                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--muted)' }}>Sub-topic</span>
              </div>
              <div className="section-row-value">
                <span className={subTopic ? '' : 'placeholder'}>{subTopic || '— pick —'}</span>
                <span className="section-arrow">{open === 'subtopic' ? '▴' : '▾'}</span>
              </div>
            </button>
            <AnimatePresence>
              {open === 'subtopic' && <SubTopicPanel />}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Offline practice — save a pack while connected, then play with no data */}
      <motion.div
        className="offline-practice-card"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
      >
        <div className="offline-practice-copy">
          <div className="offline-practice-icon" aria-hidden="true">📥</div>
          <div>
            <h3>Offline practice</h3>
            <p>Save up to 12 questions for this class, subject and topic. Practise with no data — results stay on this device.</p>
          </div>
        </div>

        {offlinePack?.questions?.length ? (
          <p className="offline-pack-summary">
            💾 {offlinePack.questions.length} questions · {offlinePack.config?.class_level || ''} {offlinePack.config?.subject || ''}
            {offlinePack.config?.topic ? ` · ${offlinePack.config.topic}` : ''}
            {offlinePack.created_at ? ` · saved ${formatSavedAt(offlinePack.created_at)}` : ''}
          </p>
        ) : null}

        <div className="offline-practice-actions">
          {offlinePack?.questions?.length ? (
            <button className="btn primary" onClick={startOfflinePractice} disabled={offlineBusy}>
              ▶ Practise offline
            </button>
          ) : null}
          <button className="btn" onClick={downloadOfflinePack} disabled={!ready || !online || offlineBusy}>
            {offlineBusy ? 'Saving…' : offlinePack?.questions?.length ? 'Save current selection' : 'Save for offline'}
          </button>
          {offlinePack?.questions?.length ? (
            <button className="btn offline-remove-btn" onClick={removeOfflinePack} disabled={offlineBusy}>
              Remove
            </button>
          ) : null}
        </div>

        <p className={`offline-practice-status${!online ? ' offline' : ''}`} role="status">
          {!online
            ? 'You are offline — saved packs work while the app stays open. Reconnect to download a new one.'
            : offlineMessage || (offlinePack?.questions?.length
                ? 'Ready for offline practice.'
                : 'Download a pack before you lose signal.')}
        </p>
      </motion.div>

      {/* Challenge mode */}
      <motion.div variants={container} initial="hidden" animate="show" style={{ transitionDelay: '0.12s' }}>
        <motion.h3 variants={item} style={{ margin: '4px 0 8px', fontSize: 15, color: 'var(--muted)', fontWeight: 700 }}>Challenge mode</motion.h3>
        <div className="daily-toggle-row">
          <motion.button className={`daily-chip${!daily ? ' active' : ''}`} onClick={() => setDaily(false)} whileTap={{ scale: 0.97 }} variants={item}>🎯 Free play</motion.button>
          <motion.button className={`daily-chip${daily ? ' active' : ''}`} onClick={() => setDaily(true)} whileTap={{ scale: 0.97 }} variants={item}>☀️ Daily challenge</motion.button>
        </div>
        {daily && <motion.p className="daily-hint" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>Same 12 questions for everyone today. Pick your best streak!</motion.p>}
      </motion.div>

      {/* Start button */}
      <motion.button
        className="btn primary big start-btn"
        onClick={start}
        disabled={!ready || !online}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
      >
        Start quiz 🚀
      </motion.button>

      <p className="hint" style={{ textAlign: 'center', marginTop: 4 }}>
        {!online
          ? 'You are offline — use a saved pack above.'
          : !ready
            ? 'Pick a class and subject to begin'
            : `${cls} · ${subject}${topic ? ` · ${topic}` : ''} — 12 questions`}
      </p>
    </div>
  )
}
