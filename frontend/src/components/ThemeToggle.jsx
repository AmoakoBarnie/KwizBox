import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/** Theme toggle: dark ↔ light. Persists to localStorage. */
export default function ThemeToggle() {
  const [mode, setMode] = useState(() => {
    try { return localStorage.getItem('stem_mode') || 'dark' } catch { return 'dark' }
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-mode', mode)
    try { localStorage.setItem('stem_mode', mode) } catch {}
  }, [mode])

  const toggle = () => setMode((m) => (m === 'dark' ? 'light' : 'dark'))

  return (
    <button
      className="theme-toggle"
      onClick={toggle}
      aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={mode === 'dark' ? 'Light mode' : 'Dark mode'}
    >
      <motion.span
        key={mode}
        initial={{ rotate: -30, scale: 0.6 }}
        animate={{ rotate: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 12 }}
      >
        {mode === 'dark' ? '🌙' : '☀️'}
      </motion.span>
    </button>
  )
}
