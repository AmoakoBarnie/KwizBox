import { motion } from 'framer-motion'

// Richer animated background: slow orbiting gradient orbs + a faint sparkle layer.
// Pure CSS/Framer — cheap on low-end devices.

const SPARKLES = Array.from({ length: 14 }).map((_, i) => ({
  top: `${Math.random() * 100}%`,
  left: `${Math.random() * 100}%`,
  size: 2 + Math.random() * 3,
  delay: Math.random() * 4,
  dur: 3 + Math.random() * 3,
}))

export default function AnimatedBg() {
  return (
    <div className="bg-wrap" aria-hidden="true">
      <motion.div
        className="orb o1"
        animate={{ x: [0, 60, -20, 0], y: [0, -40, 30, 0], scale: [1, 1.12, 0.95, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="orb o2"
        animate={{ x: [0, -50, 30, 0], y: [0, 40, -20, 0], scale: [1, 0.9, 1.1, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="orb o3"
        animate={{ x: [0, 30, -40, 0], y: [0, -30, 20, 0], scale: [1, 1.08, 0.96, 1] }}
        transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="sparkles">
        {SPARKLES.map((s, i) => (
          <motion.span
            key={i}
            style={{ top: s.top, left: s.left, width: s.size, height: s.size }}
            animate={{ opacity: [0, 0.8, 0], scale: [0.6, 1, 0.6] }}
            transition={{ duration: s.dur, repeat: Infinity, delay: s.delay, ease: 'easeInOut' }}
          />
        ))}
      </div>
    </div>
  )
}
