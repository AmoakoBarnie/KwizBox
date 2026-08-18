import { motion } from 'framer-motion'
import { useMemo } from 'react'

const COLORS = ['#006B3F', '#FCD116', '#CE1126', '#04a05f', '#ffffff']

/** Lightweight star/confetti burst — no external lib. */
export default function Confetti({ count = 28 }) {
  const pieces = useMemo(() => Array.from({ length: count }, (_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 320,
    y: -(120 + Math.random() * 220),
    rot: Math.random() * 360,
    color: COLORS[i % COLORS.length],
    delay: Math.random() * 0.15,
    size: 8 + Math.random() * 8,
    star: i % 2 === 0,
  })), [count])

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 5 }}>
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }}
          animate={{ opacity: 0, x: p.x, y: p.y, rotate: p.rot + 200 }}
          transition={{ duration: 1.1, delay: p.delay, ease: 'easeOut' }}
          style={{
            position: 'absolute', left: '50%', top: '40%',
            width: p.size, height: p.size,
            background: p.star ? 'transparent' : p.color,
            color: p.star ? p.color : 'transparent',
            fontSize: p.size, lineHeight: 1,
            borderRadius: p.star ? 0 : 2,
          }}
        >
          {p.star ? '★' : ''}
        </motion.div>
      ))}
    </div>
  )
}
