import { motion } from 'framer-motion'

/**
 * Mascot: a friendly Ghana basic-school student in uniform.
 * States: 'thinking' | 'celebrate' | 'encourage'
 * Pure inline SVG + Framer Motion — no image assets, no extra deps.
 */
export default function Mascot({ state = 'thinking', size = 120 }) {
  // arm / body motion per state
  const celebrate = state === 'celebrate'
  const encourage = state === 'encourage'

  const bodyVariants = {
    thinking: { y: [0, -3, 0], rotate: [-1, 1, -1], transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' } },
    celebrate: { y: [0, -14, 0], transition: { duration: 0.5, repeat: 3, ease: 'easeOut' } },
    encourage: { rotate: [0, -4, 4, 0], transition: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' } },
  }
  const armVariants = {
    thinking: { rotate: 8 },
    celebrate: { rotate: -150, transition: { duration: 0.25 } },
    encourage: { rotate: -20 },
  }
  const faceVariants = {
    thinking: { scale: 1 },
    celebrate: { scale: [1, 1.06, 1], transition: { duration: 0.4 } },
    encourage: { scale: 1 },
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 14 }}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <motion.svg
        viewBox="0 0 120 140"
        width={size}
        height={size}
        variants={bodyVariants}
        animate={state}
        style={{ overflow: 'visible' }}
      >
        {/* shadow */}
        <ellipse cx="60" cy="132" rx="34" ry="6" fill="rgba(0,0,0,0.08)" />

        {/* legs */}
        <rect x="46" y="104" width="11" height="26" rx="5" fill="#3a3a3a" />
        <rect x="63" y="104" width="11" height="26" rx="5" fill="#3a3a3a" />

        {/* uniform shirt (check shirt - Ghana basic school style: white + coloured) */}
        <path d="M38 70 Q60 60 82 70 L86 108 Q60 116 34 108 Z" fill="#ffffff" stroke="#d8e3dc" strokeWidth="1.5" />
        {/* coloured yoke / collar in flag colours */}
        <path d="M38 70 Q60 60 82 70 L80 80 Q60 73 40 80 Z" fill="var(--green)" />
        <path d="M44 70 L60 73 L60 64 L48 67 Z" fill="var(--gold)" />
        <path d="M76 70 L60 73 L60 64 L72 67 Z" fill="var(--red)" opacity="0.85" />
        {/* shirt buttons */}
        <circle cx="60" cy="84" r="1.8" fill="#cdd8d2" />
        <circle cx="60" cy="94" r="1.8" fill="#cdd8d2" />

        {/* arms */}
        <motion.rect
          x="30" y="74" width="10" height="26" rx="5" fill="#ffffff" stroke="#d8e3dc" strokeWidth="1.2"
          style={{ transformOrigin: '35px 76px' }}
          variants={armVariants}
          animate={state}
        />
        <rect x="80" y="74" width="10" height="26" rx="5" fill="#ffffff" stroke="#d8e3dc" strokeWidth="1.2" />

        {/* head */}
        <motion.circle cx="60" cy="46" r="22" fill="#f1c9a5" variants={faceVariants} animate={state} />
        {/* hair */}
        <path d="M39 42 Q42 22 60 22 Q78 22 81 42 Q72 34 60 34 Q48 34 39 42 Z" fill="#2a1c12" />
        {/* eyes */}
        <circle cx="52" cy="46" r="2.6" fill="#2a1c12" />
        <circle cx="68" cy="46" r="2.6" fill="#2a1c12" />
        {/* mouth */}
        {state === 'celebrate'
          ? <path d="M52 54 Q60 62 68 54" stroke="#2a1c12" strokeWidth="2" fill="none" strokeLinecap="round" />
          : <path d="M54 55 Q60 57 66 55" stroke="#2a1c12" strokeWidth="2" fill="none" strokeLinecap="round" />}
        {/* cheek */}
        {celebrate && <circle cx="46" cy="52" r="3" fill="#f7a8a0" opacity="0.7" />}
        {celebrate && <circle cx="74" cy="52" r="3" fill="#f7a8a0" opacity="0.7" />}
      </motion.svg>

      {/* speech bubble for encourage */}
      {encourage && (
        <motion.div
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          style={{
            position: 'absolute', top: -8, right: -10, background: 'var(--gold)',
            color: 'var(--black)', fontSize: 13, fontWeight: 800, padding: '4px 8px',
            borderRadius: 12, whiteSpace: 'nowrap',
          }}
        >You can do it! 💪</motion.div>
      )}
    </motion.div>
  )
}
