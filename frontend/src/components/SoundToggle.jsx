import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { isMuted, toggleMute, setMuted, initSound } from '../sound.js'

const MUTE_KEY = 'stem_mute'

export default function SoundToggle() {
  const [muted, setMutedState] = useState(() => {
    try {
      return localStorage.getItem(MUTE_KEY) === '1' || isMuted()
    } catch {
      return false
    }
  })

  useEffect(() => {
    setMuted(muted)
    try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0') } catch {}
  }, [muted])

  const handleClick = useCallback(() => {
    initSound() // Initialize AudioContext on first user interaction
    toggleMute()
    setMutedState(isMuted())
  }, [])

  return (
    <button
      className="sound-toggle"
      onClick={handleClick}
      aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
      title={muted ? 'Unmute' : 'Mute'}
    >
      <motion.span
        key={muted ? 'mute' : 'unmute'}
        initial={{ scale: 0.6, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 12 }}
      >
        {muted ? '🔇' : '🔊'}
      </motion.span>
    </button>
  )
}
