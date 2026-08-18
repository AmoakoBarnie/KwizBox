import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../auth.jsx'
import Mascot from '../components/Mascot.jsx'

const CLASSES = ['B4', 'B5', 'B6', 'B7', 'B8', 'B9']
const SUBJECTS = ['Mathematics', 'Science', 'Computing', 'Mixed']

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 18 } },
}

export default function Play() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [cls, setCls] = useState(user?.class_level || 'B4')
  const [subject, setSubject] = useState('Mathematics')
  const [topic, setTopic] = useState('')

  function start() {
    const params = new URLSearchParams({ class_level: cls, subject })
    if (topic) params.set('topic', topic)
    nav(`/quiz?${params.toString()}`)
  }

  return (
    <div className="screen play">
      <button className="back" onClick={() => nav('/')}>‹ Back</button>
      <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>Choose your quiz</motion.h2>

      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}
      >
        <Mascot state="thinking" size={96} />
      </motion.div>

      <motion.div className="field" variants={container} initial="hidden" animate="show">
        <motion.h3 variants={item}>Your class</motion.h3>
        <div className="grid grid-3">
          {CLASSES.map((c) => (
            <motion.button key={c} variants={item} whileTap={{ scale: 0.92 }}
              className={cls === c ? 'chip selected' : 'chip'} onClick={() => setCls(c)}>{c}</motion.button>
          ))}
        </div>
      </motion.div>

      <motion.div className="field" variants={container} initial="hidden" animate="show">
        <motion.h3 variants={item}>Subject</motion.h3>
        <div className="grid grid-2">
          {SUBJECTS.map((s) => (
            <motion.button key={s} variants={item} whileTap={{ scale: 0.92 }}
              className={subject === s ? 'chip selected' : 'chip'} onClick={() => setSubject(s)}>{s}</motion.button>
          ))}
        </div>
      </motion.div>

      <motion.button className="btn primary big" onClick={start}
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>Start quiz 🚀</motion.button>
    </div>
  )
}
