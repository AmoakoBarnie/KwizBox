import { motion } from 'framer-motion'

// Animated Kente "strips" that frame the top and bottom of every screen.
// The strips are thin woven bands of the Ghana flag colours (green/gold/red/black)
// with a slow travelling shimmer to suggest the loom.

const COLORS = ['#006B3F', '#FCD116', '#CE1126', '#0b0b0b']

function Strip({ top }) {
  return (
    <div
      style={{
        position: 'fixed',
        left: 0, right: 0,
        [top ? 'top' : 'bottom']: 0,
        height: 10,
        display: 'flex',
        zIndex: 4,
        pointerEvents: 'none',
      }}
    >
      {COLORS.map((c, i) => (
        <motion.div
          key={c}
          style={{ flex: 1, background: c }}
          animate={{ opacity: [0.65, 1, 0.65] }}
          transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.3, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

export default function KenteFrame() {
  return (
    <>
      <Strip top />
      <Strip top={false} />
    </>
  )
}
