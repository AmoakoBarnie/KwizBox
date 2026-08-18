import { motion } from 'framer-motion'

export default function AnimatedBg() {
  return (
    <div className="bg-wrap" aria-hidden="true">
      <motion.div
        className="blob b1"
        animate={{ opacity: [0.4, 0.6, 0.4] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="blob b2" />
      <div className="blob b3" />
    </div>
  )
}
