import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../auth.jsx'
import Mascot from '../components/Mascot.jsx'
import { SUBJECTS } from '../subjects.js'
import { api } from '../api.js'
import { cacheOfflineMedia, clearOfflinePack, getOfflinePack, saveOfflinePack } from '../offlinePractice.js'
import '../offlinePractice.css'

const CLASSES = ['B4', 'B5', 'B6', 'B7', 'B8', 'B9']

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 18 } },
}

export default function Play() {
  const { user, token } = useAuth()
  const nav = useNavigate()
  const [cls, setCls] = useState(user?.class_level || '')
  const [subject, setSubject] = useState('')
  const [topic, setTopic] = useState('')
  const [subTopic, setSubTopic] = useState('')
  const [daily, setDaily] = useState(false)
  const [topics, setTopics] = useState([])
  const [subTopics, setSubTopics] = useState([])
  const [loadingTopics, setLoadingTopics] = useState(false)
  const [loadingSubTopics, setLoadingSubTopics] = useState(false)
  const [offlinePack, setOfflinePack] = useState(null)
  const [loadingOfflinePack, setLoadingOfflinePack] = useState(true)
  const [savingOfflinePack, setSavingOfflinePack] = useState(false)
  const [offlineMessage, setOfflineMessage] = useState('')
  const [isOnline, setIsOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine)

  // Popup state — each section opens its own popup
  const [popup, setPopup] = useState(null) // 'class' | 'subject' | 'topic' | 'subtopic' | null

  useEffect(() => {
    let active = true
    getOfflinePack()
      .then((saved) => { if (active) setOfflinePack(saved) })
      .catch(() => {})
      .finally(() => { if (active) setLoadingOfflinePack(false) })

    const updateOnline = () => setIsOnline(navigator.onLine)
    window.addEventListener('online', updateOnline)
    window.addEventListener('offline', updateOnline)
    return () => {
      active = false
      window.removeEventListener('online', updateOnline)
      window.removeEventListener('offline', updateOnline)
    }
  }, [])

  // Fetch topics from DB
  useEffect(() => {
    let cancelled = false
    setLoadingTopics(true)
    setTopics([])
    setTopic('')
    setSubTopic('')
    setSubTopics([])
    if (!cls || !subject) { setLoadingTopics(false); return }
    api.curriculum.topics()
      .then((data) => {
        if (cancelled) return
        const subjectData = data?.[subject]
        if (!subjectData) { setTopics([]); return }
        const classData = subjectData?.[cls]
        if (!classData) { setTopics([]); return }
        const topicList = Object.keys(classData).sort()
        setTopics(topicList)
        if (topicList.length > 0) {
          const firstTopic = topicList[0]
          setTopic(firstTopic)
          const subs = classData[firstTopic] || []
          setSubTopics(subs.sort())
          if (subs.length > 0) setSubTopic(subs[0])
        }
      })
      .catch(() => { setTopics([]); setSubTopics([]) })
      .finally(() => { if (!cancelled) setLoadingTopics(false) })
    return () => { cancelled = true }
  }, [subject, cls])

  // When topic changes, re-read sub-topics
  useEffect(() => {
    if (!topic) { setSubTopics([]); setSubTopic(''); return }
    let cancelled = false
    api.curriculum.topics()
      .then((data) => {
        if (cancelled) return
        const subjectData = data?.[subject]
        if (!subjectData) { setSubTopics([]); return }
        const classData = subjectData?.[cls]
        if (!classData || !classData[topic]) { setSubTopics([]); return }
        const subs = classData[topic].slice().sort()
        setSubTopics(subs)
        if (subTopic && !subs.includes(subTopic)) setSubTopic(subs[0] || '')
      })
      .catch(() => setSubTopics([]))
      .finally(() => { if (!cancelled) setLoadingSubTopics(false) })
    return () => { cancelled = true }
  }, [topic, subject, cls])

  function openPopup(section) {
    if (section === 'topic' && (!cls || !subject)) return
    setPopup(section)
  }
  function closePopup() { setPopup(null) }

  function start() {
    if (!cls || !subject) return
    const params = new URLSearchParams({ class_level: cls, subject })
    if (topic) params.set('topic', topic)
    if (subTopic) params.set('sub_topic', subTopic)
    if (daily) params.set('daily', 'true')
    nav(`/quiz?${params.toString()}`)
  }

  async function downloadOfflinePack() {
    if (!cls || !subject) {
      setOfflineMessage('Choose your class and subject before downloading a pack.')
      return
    }
    if (!isOnline) {
      setOfflineMessage('You are offline. Reconnect to download a question pack.')
      return
    }

    setSavingOfflinePack(true)
    setOfflineMessage('')
    try {
      const config = { class_level: cls, subject, count: 12, daily }
      if (topic) config.topic = topic
      if (subTopic) config.sub_topic = subTopic
      const questions = await api.offlinePack(config, token)
      const saved = { config, questions, created_at: new Date().toISOString() }
      await saveOfflinePack(saved)
      try { await cacheOfflineMedia(questions) } catch {}
      setOfflinePack(saved)
      setOfflineMessage(`${questions.length} questions saved on this device and ready for offline practice.`)
    } catch (error) {
      setOfflineMessage(`Could not save an offline pack: ${error.message}`)
    } finally {
      setSavingOfflinePack(false)
    }
  }

  function startOfflinePractice() {
    if (!offlinePack?.questions?.length) {
      setOfflineMessage('Download a question pack while online before starting offline practice.')
      return
    }
    nav('/quiz?offline=true')
  }

  async function removeOfflinePack() {
    await clearOfflinePack()
    setOfflinePack(null)
    setOfflineMessage('Saved questions and their cached images were removed from this device.')
  }

  // Render the popup content for each section
  function ClassPopup() {
    return (
      <motion.div
        className="popup-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={closePopup}
      >
        <motion.div
          className="popup-card"
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', stiffness: 320, damping: 18, delayChildren: 0.05 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="popup-head">
            <h3>Choose your class</h3>
            <button className="popup-close" onClick={closePopup} aria-label="Close">×</button>
          </div>
          <div className="popup-body">
            {CLASSES.map((c) => (
              <motion.button
                key={c}
                className={`popup-option${cls === c ? ' selected' : ''}`}
                onClick={() => { setCls(c); closePopup() }}
                whileTap={{ scale: 0.97 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.03 * CLASSES.indexOf(c) }}
              >
                <span className="opt-label">Class {c}</span>
                {cls === c && <span className="popup-check">✓</span>}
              </motion.button>
            ))}
          </div>
          {cls && (
            <div className="popup-footer">
              <span className="popup-selected">Selected: Class {cls}</span>
              <button className="popup-done" onClick={closePopup}>Done ✓</button>
            </div>
          )}
        </motion.div>
      </motion.div>
    )
  }

  function SubjectPopup() {
    return (
      <motion.div
        className="popup-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={closePopup}
      >
        <motion.div
          className="popup-card popup-card-wide"
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', stiffness: 320, damping: 18, delayChildren: 0.05 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="popup-head">
            <h3>Choose your subject</h3>
            <button className="popup-close" onClick={closePopup} aria-label="Close">×</button>
          </div>
          <div className="popup-body popup-body-scroll">
            {SUBJECTS.map((s) => (
              <motion.button
                key={s}
                className={`popup-option${subject === s ? ' selected' : ''}`}
                onClick={() => { setSubject(s); closePopup() }}
                whileTap={{ scale: 0.97 }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.02 * SUBJECTS.indexOf(s) }}
              >
                <span className="opt-label">{s}</span>
                {subject === s && <span className="popup-check">✓</span>}
              </motion.button>
            ))}
          </div>
          {subject && (
            <div className="popup-footer">
              <span className="popup-selected">Selected: {subject}</span>
              <button className="popup-done" onClick={closePopup}>Done ✓</button>
            </div>
          )}
        </motion.div>
      </motion.div>
    )
  }

  function TopicPopup() {
    return (
      <motion.div
        className="popup-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={closePopup}
      >
        <motion.div
          className="popup-card"
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', stiffness: 320, damping: 18, delayChildren: 0.05 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="popup-head">
            <h3>Choose topic</h3>
            <button className="popup-close" onClick={closePopup} aria-label="Close">×</button>
          </div>
          <div className="popup-body">
            <motion.button
              key="__all__"
              className={`popup-option ghost${topic === '' ? ' selected' : ''}`}
              onClick={() => { setTopic(''); setSubTopic(''); closePopup() }}
              whileTap={{ scale: 0.97 }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <span className="opt-label">All topics</span>
              {topic === '' && <span className="popup-check">✓</span>}
            </motion.button>
            {topics.map((t) => (
              <motion.button
                key={t}
                className={`popup-option${topic === t ? ' selected' : ''}`}
                onClick={() => { setTopic(t); closePopup() }}
                whileTap={{ scale: 0.97 }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.03 * topics.indexOf(t) }}
              >
                <span className="opt-label">{t}</span>
                {topic === t && <span className="popup-check">✓</span>}
              </motion.button>
            ))}
            {loadingTopics && <div className="hint" style={{ textAlign: 'center', padding: '12px' }}>Loading topics…</div>}
          </div>
          {topic && (
            <div className="popup-footer">
              <span className="popup-selected">Selected: {topic}</span>
              <button className="popup-done" onClick={closePopup}>Done ✓</button>
            </div>
          )}
        </motion.div>
      </motion.div>
    )
  }

  function SubTopicPopup() {
    return (
      <motion.div
        className="popup-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={closePopup}
      >
        <motion.div
          className="popup-card"
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', stiffness: 320, damping: 18, delayChildren: 0.05 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="popup-head">
            <h3>Choose sub-topic</h3>
            <button className="popup-close" onClick={closePopup} aria-label="Close">×</button>
          </div>
          <div className="popup-body">
            <motion.button
              key="__all_sub__"
              className={`popup-option ghost${subTopic === '' ? ' selected' : ''}`}
              onClick={() => { setSubTopic(''); closePopup() }}
              whileTap={{ scale: 0.97 }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <span className="opt-label">All sub-topics</span>
              {subTopic === '' && <span className="popup-check">✓</span>}
            </motion.button>
            {subTopics.map((st) => (
              <motion.button
                key={st}
                className={`popup-option${subTopic === st ? ' selected' : ''}`}
                onClick={() => { setSubTopic(st); closePopup() }}
                whileTap={{ scale: 0.97 }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.03 * subTopics.indexOf(st) }}
              >
                <span className="opt-label">{st}</span>
                {subTopic === st && <span className="popup-check">✓</span>}
              </motion.button>
            ))}
            {loadingSubTopics && <div className="hint" style={{ textAlign: 'center', padding: '12px' }}>Loading sub-topics…</div>}
          </div>
          {subTopic && (
            <div className="popup-footer">
              <span className="popup-selected">Selected: {subTopic}</span>
              <button className="popup-done" onClick={closePopup}>Done ✓</button>
            </div>
          )}
        </motion.div>
      </motion.div>
    )
  }

  return (
    <div className="screen play">
      <AnimatePresence>
        {popup === 'class' && <ClassPopup />}
        {popup === 'subject' && <SubjectPopup />}
        {popup === 'topic' && <TopicPopup />}
        {popup === 'subtopic' && <SubTopicPopup />}
      </AnimatePresence>

      <button className="back" onClick={() => nav('/')}>‹ Back</button>
      <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>Choose your quiz</motion.h2>

      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}
      >
        <Mascot state="thinking" size={96} classLevel={cls || 'B4'} />
      </motion.div>

      {/* Section headers — click to open popup */}
      <div className="section-headers">
        {/* Your class */}
        <motion.button
          className={`section-btn${cls ? ' selected' : ''}`}
          onClick={() => openPopup('class')}
          whileTap={{ scale: 0.97 }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <span className="section-label"><span className="label-dot" />Your class</span>
          <span className={`section-value${cls ? '' : ' placeholder'}`}>{cls || '— pick a class —'}</span>
          <span className="section-arrow">▾</span>
        </motion.button>

        {/* Subject */}
        <motion.button
          className={`section-btn${subject ? ' selected' : ''}`}
          onClick={() => openPopup('subject')}
          whileTap={{ scale: 0.97 }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <span className="section-label"><span className="label-dot" />Subject</span>
          <span className={`section-value${subject ? '' : ' placeholder'}`}>{subject || '— pick a subject —'}</span>
          <span className="section-arrow">▾</span>
        </motion.button>

        {/* Topic — only enabled when class+subject selected */}
        <motion.button
          className={`section-btn${topic ? ' selected' : ''}`}
          onClick={() => openPopup('topic')}
          whileTap={{ scale: 0.97 }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          disabled={!cls || !subject}
        >
          <span className="section-label"><span className="label-dot" />Topic</span>
          <span className={`section-value${topic ? '' : ' placeholder'}`}>
            {topic || (!cls || !subject ? '— pick class & subject first —' : '— pick a topic —')}
          </span>
          <span className="section-arrow">▾</span>
        </motion.button>

        {/* Sub-topic — only shows when topic selected */}
        {topic && (
          <motion.button
            className={`section-btn${subTopic ? ' selected' : ''}`}
            onClick={() => openPopup('subtopic')}
            whileTap={{ scale: 0.97 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <span className="section-label"><span className="label-dot" />Sub-topic</span>
            <span className={`section-value${subTopic ? '' : ' placeholder'}`}>{subTopic || '— pick a sub-topic —'}</span>
            <span className="section-arrow">▾</span>
          </motion.button>
        )}
      </div>

      {/* Daily challenge toggle */}
      <motion.div className="daily-section" variants={container} initial="hidden" animate="show" style={{ transitionDelay: '0.15s' }}>
        <motion.h3 variants={item}>Challenge mode</motion.h3>
        <div className="daily-toggle-row">
          <motion.button
            className={`daily-chip${!daily ? ' active' : ''}`}
            onClick={() => setDaily(false)}
            whileTap={{ scale: 0.97 }}
          >
            🎯 Free play
          </motion.button>
          <motion.button
            className={`daily-chip${daily ? ' active' : ''}`}
            onClick={() => setDaily(true)}
            whileTap={{ scale: 0.97 }}
          >
            ☀️ Daily challenge
          </motion.button>
        </div>
        {daily && (
          <motion.p className="daily-hint" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            Same 12 questions for everyone today. Pick your best streak!
          </motion.p>
        )}
      </motion.div>

      <motion.button
        className="btn primary big start-btn"
        onClick={start}
        disabled={!cls || !subject}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
      >
        Start quiz 🚀
      </motion.button>

      <section className="offline-practice-card" aria-labelledby="offline-practice-title">
        <div className="offline-practice-copy">
          <span className="offline-practice-icon" aria-hidden="true">⇩</span>
          <div>
            <h3 id="offline-practice-title">Practice offline</h3>
            <p>Save 12 questions now so you can practise without a connection. Offline results stay on this device and are not added to your account or leaderboard.</p>
          </div>
        </div>
        <div className="offline-practice-actions">
          <button
            className="btn"
            onClick={downloadOfflinePack}
            disabled={!cls || !subject || !isOnline || savingOfflinePack}
          >
            {savingOfflinePack ? 'Saving questions…' : offlinePack ? 'Replace saved pack' : 'Download offline pack'}
          </button>
          {offlinePack?.questions?.length > 0 && (
            <button className="btn primary" onClick={startOfflinePractice}>
              Practice saved pack →
            </button>
          )}
          {offlinePack?.questions?.length > 0 && (
            <button className="btn offline-remove-btn" onClick={removeOfflinePack}>
              Remove saved pack
            </button>
          )}
        </div>
        {offlinePack?.questions?.length > 0 && (
          <p className="offline-pack-summary">
            Saved: Class {offlinePack.config?.class_level} · {offlinePack.config?.subject} · {offlinePack.questions.length} questions
          </p>
        )}
        <p className={`offline-practice-status${!isOnline ? ' offline' : ''}`} role="status" aria-live="polite">
          {offlineMessage || (loadingOfflinePack
            ? 'Checking this device for a saved pack…'
            : !isOnline && !offlinePack
              ? 'You are offline and no pack is saved yet. Reconnect once to download one.'
              : !isOnline
                ? 'You are offline. Your saved pack is ready to use.'
                : offlinePack
                  ? 'One saved pack is kept on this device; downloading another replaces it.'
                  : 'Choose a class and subject, then download while online.')}
        </p>
      </section>
    </div>
  )
}
