import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../auth.jsx'
import { api, mediaUrl } from '../api.js'
import { useDuelRoom } from '../duel.js'
import Mascot from '../components/Mascot.jsx'
import WalkingMascot from '../components/WalkingMascot.jsx'
import { correct, wrong, streak as streakSfx, combo as comboSfx, click } from '../sound.js'

const sessionSeen = new Set()

export default function Quiz() {
  const { token, user } = useAuth()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const location = useLocation()
  // Challenge mode: the Challenge page hands us the exact questions for a
  // shared code through nav state, and mirrors the code into ?challenge=CODE
  // so a page refresh can re-fetch the same deterministic pack. Both players
  // get the same questions and the final score is submitted to the challenge
  // endpoint (server-authoritative).
  const [challenge, setChallenge] = useState(() => location.state?.challenge || null)
  const [pack, setPack] = useState(null)
  const [idx, setIdx] = useState(0)
  const [selected, setSelected] = useState(null)
  const [reveal, setReveal] = useState(null)
  const [locked, setLocked] = useState(false)
  const [answers, setAnswers] = useState([])
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [startedAt, setStartedAt] = useState(null)
  const [questionStartedAt, setQuestionStartedAt] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [mascot, setMascot] = useState('thinking')
  const [streak, setStreak] = useState(0)
  const [combo, setCombo] = useState(1)
  const [popScore, setPopScore] = useState(null)
  const [hasSeenReveal, setHasSeenReveal] = useState(false)
  // Challenge mode helpers: best in-quiz streak (the `streak` state resets on a
  // wrong answer, so the maximum must be tracked separately) and per-question
  // review data — the challenge submit endpoint grades server-side but returns
  // no feedback, so the client collects it from /quiz/check as it plays.
  const [bestStreak, setBestStreak] = useState(0)
  const [review, setReview] = useState([])

  // Duel mode: the same challenge code opens a display-only WebSocket room so
  // each player can see the other's progress. The official score still comes
  // from the challenge submit endpoint — never from this socket.
  const roomCode = (challenge?.code || params.get('challenge') || '').toUpperCase() || null
  const duel = useDuelRoom(roomCode, user?.nickname)
  const liveCorrect = review.reduce((n, f) => n + (f.is_correct ? 1 : 0), 0)
  const liveScore = review.reduce((n, f) => n + (f.points || 0), 0)

  const cfg = {
    class_level: challenge ? challenge.class_level : (params.get('class_level') || 'B4'),
    subject: challenge ? challenge.subject : (params.get('subject') || 'Mathematics'),
    topic: params.get('topic') || undefined,
    sub_topic: params.get('sub_topic') || undefined,
    count: challenge ? (challenge.questions?.length || 12) : 12,
    daily: params.get('daily') === 'true',
  }

  async function load() {
    setLoading(true); setErr('')
    try {
      // Challenge mode: use the questions that came with the navigation state
      // (same 12 questions for every player holding the code).
      if (challenge) {
        const qs = challenge.questions || []
        if (!qs.length) throw new Error('This challenge has no questions')
        setPack(qs); setStartedAt(Date.now())
        return
      }
      // Refreshed mid-challenge (nav state is gone): re-fetch the pack from
      // the ?challenge= code left in the URL — it is deterministic, so this
      // returns the exact same questions.
      const codeParam = params.get('challenge')
      if (codeParam) {
        const res = await api.challenge.questions(codeParam.toUpperCase(), token)
        const c = { code: res.code, class_level: res.class_level, subject: res.subject, questions: res.questions || [] }
        if (!c.questions.length) throw new Error('This challenge has no questions')
        setChallenge(c)
        setPack(c.questions); setStartedAt(Date.now())
        return
      }
      let p
      try {
        p = await api.pack({ ...cfg, exclude_ids: [...sessionSeen] }, token)
      } catch (e) {
        if (/No questions found|404/.test(e.message) && sessionSeen.size) {
          sessionSeen.clear()
          p = await api.pack(cfg, token)
        } else { throw e }
      }
      p.forEach((q) => sessionSeen.add(q.id))
      setPack(p); setStartedAt(Date.now())
    } catch (e) { setErr(e.message) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!pack) return
    setQuestionStartedAt(Date.now())
    setElapsed(0)
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [idx, pack])

  // Broadcast display progress after every answer / question change.
  useEffect(() => {
    if (!roomCode || !pack) return
    duel.sendProgress({
      index: idx,
      total: pack.length,
      correct: liveCorrect,
      score: liveScore,
    })
  }, [roomCode, pack, idx, liveCorrect, liveScore, duel.sendProgress])

  if (loading) return <div className="screen center"><div className="spinner" /> <p>Loading questions…</p></div>
  if (err) return <div className="screen center"><p className="err">{err}</p><button className="btn" onClick={() => nav('/play')}>Back to selection</button></div>
  if (!pack) return null

  const q = pack[idx]
  const isLast = idx === pack.length - 1
  const answered = answers.length > idx
  const isTF = q.question_type === 'true_false' || q.options.length === 2

  async function choose(i) {
    if (locked || answered || reveal) return
    setSelected(i)
    click()
    setLocked(true)
    try {
      const { is_correct, correct_index, explanation } = await api.check({ question_id: q.id, selected_index: i }, token)
      const pts = is_correct ? (q.difficulty === 'Hard' ? 25 : q.difficulty === 'Medium' ? 15 : 10) * combo : 0
      if (is_correct) {
        const newStreak = streak + 1
        const newCombo = newStreak >= 3 ? Math.min(2, 1 + Math.floor(newStreak / 3)) : 1
        setStreak(newStreak); setCombo(newCombo)
        setBestStreak((b) => Math.max(b, newStreak))
        setMascot('celebrate')
        setReveal({ is_correct: true, correct_index })
        correct()
        if (newStreak >= 3) streakSfx(newStreak)
        if (newCombo > 1) comboSfx(newCombo)
        if (pts > 0) { setPopScore({ pts, combo: newCombo }); setTimeout(() => setPopScore(null), 900) }
      } else {
        setStreak(0); setCombo(1)
        setMascot('encourage')
        setReveal({ is_correct: false, correct_index })
        wrong()
      }
      // Challenge mode: collect review data now. The challenge submit endpoint
      // re-grades server-side but returns no per-question feedback, so the
      // Summary review list is built from these check responses. Points use
      // the same base rule the server grades with (10/15/25, no combo) so the
      // review total matches the official score.
      if (challenge) {
        setReview((prev) => [...prev, {
          question_id: q.id,
          selected_index: i,
          correct_index,
          is_correct,
          explanation: explanation || null,
          question: q.question,
          options: q.options,
          points: is_correct ? (q.difficulty === 'Hard' ? 25 : q.difficulty === 'Medium' ? 15 : 10) : 0,
        }])
      }
      const seconds_taken = questionStartedAt ? (Date.now() - questionStartedAt) / 1000 : null
      setAnswers((prev) => [...prev, { question_id: q.id, selected_index: i, seconds_taken }])
      setHasSeenReveal(true)
    } catch (e) {
      const seconds_taken = questionStartedAt ? (Date.now() - questionStartedAt) / 1000 : null
      const nextAnswers = [...answers, { question_id: q.id, selected_index: i, seconds_taken }]
      setAnswers(nextAnswers)
      setLocked(false); setSelected(null); setHasSeenReveal(true)
      if (idx === pack.length - 1) submit(nextAnswers)
      else setIdx((cur) => cur + 1)
    }
  }

  async function submit(finalAnswers) {
    setSubmitting(true); setErr('')
    const duration_seconds = startedAt ? Math.round((Date.now() - startedAt) / 1000) : undefined
    // Best in-quiz streak: `streak` only holds the current run (0 after a wrong
    // answer), so use the tracked maximum — `answers` has no per-answer streak.
    const max_streak = Math.max(bestStreak, streak)
    if (challenge) {
      try {
        // Server-authoritative: the challenge endpoint re-grades every answer
        // against the stored answer keys; client points are never trusted.
        const res = await api.challenge.submit({
          code: challenge.code,
          answers: finalAnswers.map((a) => ({ question_id: a.question_id, selected_index: a.selected_index })),
        }, token)
        // Tell the rival we finished (display only; res is the official score).
        duel.sendFinished({
          index: finalAnswers.length,
          total: res.total,
          correct: res.correct,
          score: res.score,
        })
        const result = {
          session_id: res.session_id ?? 0,
          total: res.total,
          correct: res.correct,
          accuracy: res.accuracy,
          score: res.score,
          streak: max_streak,
          feedback: review,
          challenge: { code: challenge.code },
        }
        try { localStorage.setItem('kwizbox_last_result', JSON.stringify(result)) } catch {}
        try { localStorage.setItem('kwizbox_last_cfg', JSON.stringify(cfg)) } catch {}
        nav('/summary', { state: { result, cfg } })
      } catch (e) {
        // Could not submit (challenge expired, already submitted, signed out…).
        // Still show the player their answers as an unofficial client-graded
        // result so the review is not lost — it just won't enter the challenge
        // leaderboard.
        const graded = review.filter((f) => f.is_correct).length
        const total = finalAnswers.length
        const unofficialScore = review.reduce((s, f) => s + (f.points || 0), 0)
        duel.sendFinished({
          index: total, total, correct: graded, score: unofficialScore,
        })
        const result = {
          session_id: 0,
          total,
          correct: graded,
          accuracy: total ? graded / total : 0,
          score: unofficialScore,
          streak: max_streak,
          feedback: review,
          challenge: { code: challenge.code },
          unofficial: true,
          unofficial_reason: e.message || 'Challenge score could not be submitted',
        }
        try { localStorage.setItem('kwizbox_last_result', JSON.stringify(result)) } catch {}
        try { localStorage.setItem('kwizbox_last_cfg', JSON.stringify(cfg)) } catch {}
        nav('/summary', { state: { result, cfg } })
      }
      return
    }
    try {
      const res = await api.submit({ ...cfg, question_ids: finalAnswers.map(a => a.question_id), answers: finalAnswers.map(a => ({ ...a, max_streak })), duration_seconds, max_streak }, token)
      try { localStorage.setItem('kwizbox_last_result', JSON.stringify(res)) } catch (e) {}
      try { localStorage.setItem('kwizbox_last_cfg', JSON.stringify(cfg)) } catch (e) {}
      nav('/summary', { state: { result: res, cfg } })
    } catch (e) { setErr(e.message); setSubmitting(false) }
  }

  const progress = ((idx + 1) / pack.length) * 100
  const oppTotal = duel.opponent?.total || pack.length || 1
  const oppDone = duel.opponent?.finished
    ? oppTotal
    : Math.min(duel.opponent?.index ?? 0, oppTotal)
  const oppPct = Math.max(0, Math.min(100, Math.round((oppDone / oppTotal) * 100)))

  return (
    <div className="screen quiz">
      {/* Top: back, progress, counter, timer */}
      <div className="quiz-top">
        <button className="back" onClick={() => nav(challenge ? '/challenge' : '/play')}>‹</button>
        <div className="progress-wrap">
          <div className="progress-track">
            <motion.div className="progress-fill" animate={{ width: `${progress}%` }} transition={{ ease: 'easeOut', duration: 0.35 }} />
          </div>
          <motion.div className="progress-ticks">
            {Array.from({ length: pack.length }, (_, i) => (
              <span key={i} className={`tick${i <= idx ? ' done' : ''}`} />
            ))}
          </motion.div>
        </div>
        <span className="qcount">{idx + 1}/{pack.length}</span>
        <span className={`q-timer${elapsed <= 6 ? ' fast' : ''}`} title="Answer fast for a speed bonus!">
          ⏱ {elapsed}s{elapsed <= 6 ? ' ⚡' : ''}
        </span>
      </div>

      {/* Live duel strip — rival progress, display only */}
      {roomCode && (
        <div className={`duel-strip ${duel.status}`}>
          <span className={`duel-dot ${duel.status}`} aria-hidden="true" />
          {duel.opponent ? (
            <>
              <span className="duel-rival">
                {duel.opponent.finished ? '🏁' : '⚔️'} {duel.opponent.nickname}
              </span>
              <span className="duel-rival-progress">
                {duel.opponent.finished
                  ? `Finished · ${duel.opponent.correct ?? 0}/${oppTotal}`
                  : `${oppDone}/${oppTotal} · ${duel.opponent.correct ?? 0} ✓`}
              </span>
              <span className="duel-mini-track" aria-hidden="true">
                <span className="duel-mini-fill" style={{ width: `${oppPct}%` }} />
              </span>
            </>
          ) : (
            <span className="duel-waiting">
              🔗 Share code <b>{roomCode}</b> — waiting for your friend to join…
            </span>
          )}
          {duel.status !== 'open' && <span className="duel-offline">reconnecting…</span>}
        </div>
      )}

      {/* Streak + combo bar */}
      <div className="streak-bar">
        <div className={`streak-wrap${streak >= 5 ? ' intense' : streak > 0 ? ' active' : ''}`}>
          {streak > 0 && (
            <motion.span
              key={`flame-${streak}`}
              className="streak-flame"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{
                scale: streak >= 5 ? [1, 1.4, 0.95, 1.3, 1] : [1, 1.2, 1],
                opacity: streak >= 5 ? [0.7, 1, 0.85, 1, 0.9] : 1,
              }}
              transition={{
                type: 'spring',
                stiffness: streak >= 5 ? 400 : 300,
                damping: streak >= 5 ? 8 : 12,
                repeat: streak >= 5 ? Infinity : 0,
                repeatDelay: 0.15,
              }}
              style={streak >= 5 ? { textShadow: '0 0 20px rgba(255,210,63,0.8), 0 0 40px rgba(255,210,63,0.4)' } : {}}
            >🔥</motion.span>
          )}
          {streak > 0 && (
            <motion.span
              key={`flame2-${streak}`}
              className="streak-flame streak-flame-2"
              initial={{ scale: 0.3, opacity: 0, rotate: -20 }}
              animate={{
                scale: streak >= 5 ? [0.8, 1.1, 0.7, 1.05, 0.8] : [0.9, 1.05, 0.9],
                opacity: streak >= 5 ? [0.5, 0.9, 0.6, 0.85, 0.5] : 0.7,
                rotate: streak >= 5 ? [-15, 10, -20, 5, -15] : [-5, 5, -5],
              }}
              transition={{
                type: 'spring',
                stiffness: streak >= 5 ? 350 : 250,
                damping: streak >= 5 ? 10 : 14,
                repeat: streak >= 5 ? Infinity : 0,
                repeatDelay: 0.1,
                delay: 0.05,
              }}
              style={streak >= 5 ? { textShadow: '0 0 16px rgba(255,179,1,0.7)' } : {}}
            >🔥</motion.span>
          )}
          <motion.span
            key={streak}
            className="streak-count"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 12 }}
            style={{ color: streak >= 5 ? 'var(--gold)' : 'var(--ink)', fontWeight: streak >= 5 ? 800 : 700 }}
          >
            {streak}
          </motion.span>
          {streak >= 5 && (
            <motion.span
              className="streak-label"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 14 }}
            >
              {streak >= 8 ? 'ON FIRE! 🔥🔥' : 'HOT STREAK!'}
            </motion.span>
          )}
        </div>
        {combo > 1 && (
          <motion.span
            key={combo}
            className="combo-badge"
            initial={{ scale: 0, rotate: -8 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 14 }}
          >COMBO x{combo}!</motion.span>
        )}
      </div>

      {/* Question card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={q.id}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14 }}
          transition={{ duration: 0.28 }}
          className="question-card"
        >
          <span className="badge">{q.subject} · {q.difficulty}{q.topic ? ` · ${q.topic}` : ''}{q.sub_topic && q.sub_topic !== 'General' && q.sub_topic !== q.topic ? ` › ${q.sub_topic}` : ''}</span>
          {q.image_url && (
            <div className="q-image-wrap">
              <img className="q-image" src={mediaUrl(q.image_url)} alt="Question diagram" />
            </div>
          )}
          <h2>{q.question}</h2>

          <div className={`options${isTF ? ' tf' : ''}`}>
            {q.options.map((opt, i) => {
              const isPicked = selected === i
              const correctIdx = reveal?.correct_index
              const showCorrect = reveal && reveal.is_correct && isPicked
              const showWrong = reveal && !reveal.is_correct && isPicked
              const showCorrectAnswer = reveal && !reveal.is_correct && i === correctIdx && i !== selected
              const tfClass = isTF ? (i === 0 ? ' tf-true' : ' tf-false') : ''
              return (
                <motion.button
                  key={i}
                  className={`option${tfClass}${isPicked ? ' picked' : ''}${showCorrect ? ' correct' : ''}${showWrong ? ' wrong' : ''}${showCorrectAnswer ? ' correct' : ''}`}
                  onClick={() => choose(i)}
                  disabled={locked || answered || !!reveal}
                  initial={{ opacity: 0, x: -20, scale: 0.96 }}
                  animate={showCorrect
                    ? { opacity: 1, x: 0, scale: [1, 1.05, 1] }
                    : showWrong
                    ? { opacity: 1, x: [0, -8, 8, -5, 0], scale: 1 }
                    : showCorrectAnswer
                    ? { opacity: 1, x: 0, scale: [1, 1.02, 1] }
                    : { opacity: 1, x: 0, scale: 1 }}
                  transition={{
                    duration: showCorrect || showWrong ? 0.25 : 0.22,
                    delay: (showCorrect || showWrong) ? 0 : 0.035 * i,
                    type: 'spring', stiffness: 240, damping: 16
                  }}
                  whileTap={{ scale: 0.96 }}
                >
                  {!isTF && <span className="opt-key">{String.fromCharCode(65 + i)}</span>}
                  <span className="opt-text">
                    {opt}
                    {showCorrect && <span className="opt-mark good"> ✓</span>}
                    {showWrong && <span className="opt-mark bad"> ✗</span>}
                    {showCorrectAnswer && <span className="opt-mark good"> ✓</span>}
                  </span>
                </motion.button>
              )
            })}
          </div>

          <AnimatePresence>
            {reveal && (
              <motion.div
                className="feedback-line-wrap"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.22 }}
              >
                <motion.p
                  className={`feedback-line ${reveal.is_correct ? 'correct' : 'wrong'}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {reveal.is_correct
                    ? '✅ Nice! Correct!'
                    : '❌ Not quite — see the answer at the end.'}
                </motion.p>
                {!reveal.is_correct && (
                  <motion.p
                    className="feedback-hint"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    The correct answer will be highlighted. We'll show the full explanation on the results page.
                  </motion.p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>

      {/* Floating +pts overlay */}
      <AnimatePresence>
        {popScore && (
          <motion.div
            className="score-pop"
            initial={{ opacity: 0, y: 20, scale: 0.6 }}
            animate={{ opacity: 1, y: -40, scale: 1.1 }}
            exit={{ opacity: 0, y: -70, scale: 0.8 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          >
            +{popScore.pts} pts{popScore.combo > 1 ? `  🔥x${popScore.combo}` : ''}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Walking Mascot — walks across the bottom of the screen during quiz */}
      <div className="quiz-mascot-track">
        <WalkingMascot
          type={['S1', 'S2', 'S3'].includes(cfg.class_level) ? 'shs' : 'youth'}
          gender={user?.avatar?.gender || 'female'}
          size={56}
          speed={mascot === 'celebrate' ? 1.3 : mascot === 'encourage' ? 0.8 : 1}
          y={8}
          walking={true}
          avatar={user?.avatar}
          classLevel={cfg.class_level}
        />
      </div>

      {/* Mascot — static reaction mascot */}
      <div className="mascot-anchor">
        {typeof cfg.class_level === 'string' && ['S1', 'S2', 'S3'].includes(cfg.class_level)
          ? <Mascot type="shs" state={mascot} size={76} gender={user?.avatar?.gender} classLevel={cfg.class_level} avatar={user?.avatar} />
          : <Mascot type="youth" state={mascot} size={76} gender={user?.avatar?.gender} classLevel={cfg.class_level} avatar={user?.avatar} />
        }
      </div>

      {/* Next / See results button */}
      {hasSeenReveal && (
        <motion.div className="next-row" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, type: 'spring', stiffness: 300, damping: 16 }}>
          <motion.button
            className="btn primary big next-btn"
            onClick={() => {
              setLocked(false); setSelected(null); setReveal(null); setMascot('thinking'); setHasSeenReveal(false)
              if (isLast) submit(answers)
              else setIdx((cur) => cur + 1)
            }}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          >
            {isLast ? 'See results 🎯' : 'Next question →'}
          </motion.button>
        </motion.div>
      )}

      {submitting && <div className="spinner" />}
    </div>
  )
}
