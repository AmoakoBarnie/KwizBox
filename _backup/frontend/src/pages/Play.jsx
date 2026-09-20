import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../auth.jsx'
import Mascot from '../components/Mascot.jsx'
import SHSMascot from '../components/SHSMascot.jsx'

export default function Play() {
  const { user } = useAuth()
  const nav = useNavigate()
  const isSHS = user?.class_level && ['S1', 'S2', 'S3'].includes(user.class_level)

  return (
    <div className="screen play">
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="kente-title"
        style={{ textAlign: 'center', marginTop: 'calc(20px + env(safe-area-inset-top))', marginBottom: 18, letterSpacing: '-0.5px' }}
      >
        Choose your quiz
      </motion.h2>
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 18 }}
        style={{ display: 'flex', justifyContent: 'center', margin: '6px 0 18px' }}
      >
        {isSHS
          ? <SHSMascot state="thinking" size={100} classLevel={user?.class_level || 'S1'} avatar={user?.avatar} />
          : <Mascot state="thinking" size={100} classLevel={user?.class_level || 'B4'} avatar={user?.avatar} />
        }
      </motion.div>
      <motion.button
        className="btn primary big"
        onClick={() => nav('/choose-quiz')}
        initial={{ opacity: 0, y: 16, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.16, type: 'spring', stiffness: 280, damping: 16 }}
        whileHover={{ scale: 1.03, boxShadow: '0 8px 30px rgba(0,210,126,0.5)' }}
        whileTap={{ scale: 0.97 }}
        style={{ maxWidth: 280, margin: '0 auto', display: 'block' }}
      >
        Pick quiz details ✏️
      </motion.button>
      <p className="hint" style={{ textAlign: 'center', marginTop: 14, fontStyle: 'italic' }}>
        Class, subject, topic, sub-topic, and challenge mode — all in one place.
      </p>
    </div>
  )
}
