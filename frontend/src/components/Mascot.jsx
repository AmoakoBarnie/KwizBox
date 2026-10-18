import { motion, useReducedMotion } from 'framer-motion'

/**
 * Mascot: a friendly Ghana basic-school student in uniform.
 * States: 'thinking' | 'celebrate' | 'encourage'
 * Pure inline SVG + Framer Motion — no image assets, no extra deps.
 */
export default function Mascot({ state = 'thinking', size = 120, walking = false, jumping = false }) {
  const reduceMotion = useReducedMotion()
  const isJumping = jumping && !reduceMotion
  const isWalking = walking && !isJumping && !reduceMotion
  const celebrate = state === 'celebrate'
  const encourage = state === 'encourage'
  const gait = { duration: 0.78, repeat: Infinity, ease: 'linear' }
  const jump = { duration: 0.82, repeat: 2, ease: 'easeInOut' }

  const bodyVariants = {
    thinking: {
      y: [0, -3, 0],
      rotate: [-1, 1, -1],
      transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
    },
    celebrate: {
      y: [0, -14, 0],
      transition: { duration: 0.5, repeat: 3, ease: 'easeOut' },
    },
    encourage: {
      rotate: [0, -4, 4, 0],
      transition: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' },
    },
    walking: {
      y: [0, -2.5, 0, -1.5, 0],
      rotate: [0, 0.8, 0, -0.8, 0],
      transition: gait,
    },
    jumping: {
      y: [0, -18, 0, -12, 0],
      rotate: [0, -2, 0, 2, 0],
      transition: jump,
    },
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

  const gaitState = isJumping ? 'jumping' : isWalking ? 'walking' : state
  const leftLeg = isJumping
    ? { rotate: [0, 16, 0, 9, 0] }
    : isWalking ? { rotate: [-25, 0, 25, 0, -25] } : { rotate: 0 }
  const rightLeg = isJumping
    ? { rotate: [0, -16, 0, -9, 0] }
    : isWalking ? { rotate: [25, 0, -25, 0, 25] } : { rotate: 0 }
  const leftKnee = isJumping
    ? { rotate: [0, 20, 0, 10, 0] }
    : isWalking ? { rotate: [2, 17, 3, 0, 2] } : { rotate: 0 }
  const rightKnee = isJumping
    ? { rotate: [0, 20, 0, 10, 0] }
    : isWalking ? { rotate: [0, 3, 17, 2, 0] } : { rotate: 0 }
  const leftArm = isWalking ? { rotate: [27, 0, -27, 0, 27] } : { rotate: 0 }
  const rightArm = isWalking ? { rotate: [-27, 0, 27, 0, -27] } : undefined
  const leftCelebrationArm = { rotate: [0, -155, -135, -155, 0] }
  const rightCelebrationArm = { rotate: [0, 155, 135, 155, 0] }

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, scale: 0.6 }}
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
        animate={gaitState}
        style={{ overflow: 'visible' }}
      >
        {/* Soft contact shadow compresses slightly as the feet alternate. */}
        <motion.ellipse
          cx="60"
          cy="132"
          rx="34"
          ry="5"
          fill="rgba(0,0,0,0.10)"
          animate={isJumping
            ? { scaleX: [1, 0.72, 1, 0.82, 1], opacity: [0.12, 0.04, 0.12, 0.07, 0.12] }
            : isWalking
            ? { scaleX: [1, 0.82, 0.96, 0.82, 1], opacity: [0.12, 0.08, 0.12, 0.08, 0.12] }
            : { scaleX: 1, opacity: 0.1 }}
          transition={isJumping ? jump : isWalking ? gait : { duration: 0.2 }}
          style={{ transformOrigin: '60px 132px' }}
        />

        {/* Legs swing from the hips; a small delayed knee bend gives each step lift. */}
        <motion.g
          style={{ transformOrigin: '51.5px 105px' }}
          animate={leftLeg}
          transition={isJumping ? jump : isWalking ? gait : { duration: 0.18 }}
        >
          <path d="M46 101 Q51 99 57 102 L57 116 Q52 119 47 116 Z" fill="#3a3a3a" />
          <motion.g
            style={{ transformOrigin: '52px 116px' }}
            animate={leftKnee}
            transition={isJumping ? jump : isWalking ? gait : { duration: 0.18 }}
          >
            <rect x="47.5" y="114" width="9" height="15" rx="4.5" fill="#3a3a3a" />
            <path d="M47 126 Q51 128 57 127 Q61 128 60 131.5 Q59 133 46 132.5 Q43 132 44 129.5 Z" fill="#252525" />
            <path d="M46 130.5 Q51 131.5 58 130.5" fill="none" stroke="#555" strokeWidth="1" strokeLinecap="round" />
          </motion.g>
        </motion.g>
        <motion.g
          style={{ transformOrigin: '68.5px 105px' }}
          animate={rightLeg}
          transition={isJumping ? jump : isWalking ? gait : { duration: 0.18 }}
        >
          <path d="M63 102 Q69 99 74 101 L73 116 Q68 119 63 116 Z" fill="#3a3a3a" />
          <motion.g
            style={{ transformOrigin: '68px 116px' }}
            animate={rightKnee}
            transition={isJumping ? jump : isWalking ? gait : { duration: 0.18 }}
          >
            <rect x="63.5" y="114" width="9" height="15" rx="4.5" fill="#3a3a3a" />
            <path d="M63 126 Q67 128 73 127 Q77 128 76 131.5 Q75 133 62 132.5 Q59 132 60 129.5 Z" fill="#252525" />
            <path d="M62 130.5 Q67 131.5 74 130.5" fill="none" stroke="#555" strokeWidth="1" strokeLinecap="round" />
          </motion.g>
        </motion.g>

        {/* Arms counter-swing against the legs, with a relaxed bend at the elbow. */}
        <motion.g
          style={{ transformOrigin: '35px 76px' }}
          animate={isJumping ? leftCelebrationArm : isWalking ? leftArm : armVariants[state]}
          transition={isJumping ? jump : isWalking ? gait : { duration: 0.25 }}
        >
          <rect x="30" y="74" width="10" height="18" rx="5" fill="#fff" stroke="#d8e3dc" strokeWidth="1.2" />
          <motion.g
            style={{ transformOrigin: '35px 91px' }}
            animate={isJumping
              ? { rotate: [0, -12, -7, -12, 0] }
              : isWalking ? { rotate: [0, 9, 0, -5, 0] } : { rotate: 0 }}
            transition={isJumping ? jump : isWalking ? gait : { duration: 0.2 }}
          >
            <rect x="30.5" y="89" width="9" height="12" rx="4.5" fill="#fff" stroke="#d8e3dc" strokeWidth="1" />
            <circle cx="35" cy="101" r="4.5" fill="#f1c9a5" />
          </motion.g>
        </motion.g>
        <motion.g
          style={{ transformOrigin: '85px 76px' }}
          animate={isJumping ? rightCelebrationArm : isWalking ? rightArm : { rotate: 0 }}
          transition={isJumping ? jump : isWalking ? gait : { duration: 0.25 }}
        >
          <rect x="80" y="74" width="10" height="18" rx="5" fill="#fff" stroke="#d8e3dc" strokeWidth="1.2" />
          <motion.g
            style={{ transformOrigin: '85px 91px' }}
            animate={isJumping
              ? { rotate: [0, 12, 7, 12, 0] }
              : isWalking ? { rotate: [0, -5, 0, 9, 0] } : { rotate: 0 }}
            transition={isJumping ? jump : isWalking ? gait : { duration: 0.2 }}
          >
            <rect x="80.5" y="89" width="9" height="12" rx="4.5" fill="#fff" stroke="#d8e3dc" strokeWidth="1" />
            <circle cx="85" cy="101" r="4.5" fill="#f1c9a5" />
          </motion.g>
        </motion.g>

        {/* Shirt follows the pelvis by a fraction of the leg swing. */}
        <motion.g
          style={{ transformOrigin: '60px 88px' }}
          animate={isJumping
            ? { rotate: [0, -1.5, 0, 1, 0], scaleY: [1, 1.04, 0.96, 1.02, 1] }
            : isWalking ? { rotate: [-1.5, 0, 1.5, 0, -1.5] } : { rotate: 0 }}
          transition={isJumping ? jump : isWalking ? gait : { duration: 0.2 }}
        >
          <path d="M38 70 Q60 60 82 70 L86 108 Q60 116 34 108 Z" fill="#fff" stroke="#d8e3dc" strokeWidth="1.5" />
          <path d="M38 70 Q60 60 82 70 L80 80 Q60 73 40 80 Z" fill="var(--green)" />
          <path d="M44 70 L60 73 L60 64 L48 67 Z" fill="var(--gold)" />
          <path d="M76 70 L60 73 L60 64 L72 67 Z" fill="var(--red)" opacity="0.85" />
          <circle cx="60" cy="84" r="1.8" fill="#cdd8d2" />
          <circle cx="60" cy="94" r="1.8" fill="#cdd8d2" />
        </motion.g>

        {/* Head stays comparatively level while the body moves underneath. */}
        <motion.g
          style={{ transformOrigin: '60px 68px' }}
          animate={isJumping
            ? { y: [0, -1, 1, -0.5, 0], rotate: [0, 1, -1, 0, 0] }
            : isWalking ? { y: [0, 0.5, 0, 0.3, 0], rotate: [1, 0, -1, 0, 1] } : undefined}
          transition={isJumping ? jump : isWalking ? gait : { duration: 0.2 }}
        >
          <motion.circle cx="60" cy="46" r="22" fill="#f1c9a5" variants={faceVariants} animate={state} />
          <path d="M39 42 Q42 22 60 22 Q78 22 81 42 Q72 34 60 34 Q48 34 39 42 Z" fill="#2a1c12" />
          <circle cx="52" cy="46" r="2.6" fill="#2a1c12" />
          <circle cx="68" cy="46" r="2.6" fill="#2a1c12" />
          {celebrate
            ? <path d="M52 54 Q60 62 68 54" stroke="#2a1c12" strokeWidth="2" fill="none" strokeLinecap="round" />
            : <path d="M54 55 Q60 57 66 55" stroke="#2a1c12" strokeWidth="2" fill="none" strokeLinecap="round" />}
          {celebrate && <circle cx="46" cy="52" r="3" fill="#f7a8a0" opacity="0.7" />}
          {celebrate && <circle cx="74" cy="52" r="3" fill="#f7a8a0" opacity="0.7" />}
        </motion.g>
      </motion.svg>

      {/* speech bubble for encourage */}
      {encourage && (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
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
