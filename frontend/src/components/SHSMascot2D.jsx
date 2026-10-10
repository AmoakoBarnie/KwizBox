import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import './Mascot.css'

/**
 * SHSMascot: Ghanaian Senior High School student (SHS 1–3).
 * Same palette, same avatar system (Upgrade 8), but older / more mature styling.
 *
 * Differences from the JHS Mascot:
 *  - Older student proportions (slightly taller head, longer limbs feel)
 *  - Shorter / neater hairstyles (no cornrows; low fade or bun)
 *  - No cheek blush (teen/adult look)
 *  - Slightly calmer motion (less bounce) reflecting older age
 *  - School uniform is the same navy + white, keeping brand consistency
 *  - Speech phrases are written for SHS-level tone (less exuberant, more focused)
 *
 * Props mirror Mascot.jsx: state, size, gender, classLevel (S1/S2/S3 accepted),
 * walking, avatar.
 */

const WORDS = {
  thinking: {
    young: ['Tap your best answer! ✨', 'Think… then tap! 🤔', 'You can do it! 💪'],
    old: [
      'Pick your best answer.',
      'Take your time — you got this.',
      'Think it through, then tap.',
      'Method over speed — choose carefully.',
    ],
  },
  celebrate: {
    young: ['Yay! You got it! 🎉', 'Boom! Correct! 🌟', 'So smart! 💡', 'Nailed it! 🚀'],
    old: [
      'Correct! Well done.',
      'That’s right — nicely done.',
      'Smart thinking!',
      'Nailed it — keep the momentum.',
      'Exact. Great precision.',
    ],
  },
  encourage: {
    young: ['Almost! Next one 👍', 'Mistakes help us learn 🌱', 'So close! Try again 💡', "Don't quit — you're improving 🔥"],
    old: [
      'Almost — try the next one.',
      'No worries, mistakes help us learn.',
      'So close! On to the next.',
      "Don't give up — you're improving.",
      'One more — you are close.',
    ],
  },
}

const lastIdx = { thinking: -1, celebrate: -1, encourage: -1 }
function pickPhrase(state, young) {
  const list = (WORDS[state] || WORDS.thinking)[young ? 'young' : 'old']
  if (list.length === 1) return list[0]
  let i = Math.floor(Math.random() * list.length)
  if (i === lastIdx[state]) i = (i + 1) % list.length
  lastIdx[state] = i
  return list[i]
}

const CONFETTI_COLORS = ['#00d27e', '#ffd23f', '#ff4d5e', '#00b36b', '#f0b400', '#ffffff']
const EMOJI = { thinking: '💭', celebrate: '🎉', encourage: '🌟' }

export default function SHSMascot({
  state = 'thinking',
  size = 120,
  gender = 'male',
  classLevel = 'S2',
  walking = false,
  avatar,
}) {
  // Upgrade 8: avatar object takes precedence over legacy gender prop
  const av = avatar || {}
  const avatarSkin = av.skin || 'warm'
  const avatarHat = av.hat || 'none'
  const avatarAccessory = av.accessory || 'none'
  const avatarGender = av.gender || gender || 'male'

  // skin tone palette — used for head + hands + makeup
  const SKIN = {
    warm: { fill: '#a86b3c', stroke: '#6b3a1f' },
    deep: { fill: '#6b3a1f', stroke: '#3d1f0d' },
    light: { fill: '#e8c9a0', stroke: '#c4a47a' },
    cool: { fill: '#c9a88c', stroke: '#9e7d5c' },
  }
  const skinFill = SKIN[avatarSkin]?.fill ?? SKIN.warm.fill
  const skinStroke = SKIN[avatarSkin]?.stroke ?? SKIN.warm.stroke
  const isFemale = avatarGender === 'female'

  // SHS students: treat B9 as the bridge; S1/S2/S3 are all "old" tone.
  // S1 might still be a bit more energetic, but keep them all in the "old" phrase set
  // for consistency with the older look.
  const young = ['B4', 'B5', 'B6'].includes(classLevel)
  const celebrate = state === 'celebrate'
  const encourage = state === 'encourage'

  const [pop, setPop] = useState(false)
  const [visibleText, setVisibleText] = useState('')
  const [blink, setBlink] = useState(false)
  const [showBubble, setShowBubble] = useState(false)
  const phraseRef = useRef('')

  // arm-swing phase (for the walking "pump")
  const armPhase = useRef(0)

  function react() {
    setPop(true)
    setTimeout(() => setPop(false), 600)
  }

  // choose phrase whenever state/class changes; show bubble briefly, then auto-hide.
  // While walking, the bubble stays hidden (mascot is on the move).
  useEffect(() => {
    const p = pickPhrase(state, young)
    phraseRef.current = p
    if (young) {
      let i = 0
      setVisibleText('')
      const t = setInterval(() => {
        i++
        setVisibleText(p.slice(0, i))
        if (i >= p.length) clearInterval(t)
      }, 22)
      return () => clearInterval(t)
    } else {
      setVisibleText(p)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, young])

  // bubble visibility: appears on state change, auto-hides after a few seconds; never while walking
  useEffect(() => {
    if (walking) { setShowBubble(false); return }
    setShowBubble(true)
    const hide = setTimeout(() => setShowBubble(false), 4200)
    return () => clearTimeout(hide)
  }, [state, walking])

  // gentle blink loop
  useEffect(() => {
    const id = setInterval(() => {
      setBlink(true)
      setTimeout(() => setBlink(false), 130)
    }, 3200 + Math.random() * 1800)
    return () => clearInterval(id)
  }, [])

  // motion intensity — SHS is calmer (less bounce) but still alive
  const bounce = young ? 6 : 3
  const dur = young ? 1.4 : 2.2

  const bodyVariants = {
    thinking: { y: [0, -bounce, 0], rotate: [-1.5, 1.5, -1.5], transition: { duration: dur, repeat: Infinity, ease: 'easeInOut' } },
    celebrate: { y: [0, -16, 0], transition: { duration: 0.45, repeat: 3, ease: 'easeOut' } },
    encourage: { rotate: [0, -5, 5, 0], transition: { duration: 1.1, repeat: Infinity, ease: 'easeInOut' } },
    // neutral pose used while walking — the hop motion comes from HeroStage
    walking: { y: 0, rotate: 0, transition: { duration: 0.15 } },
  }
  const armVariants = {
    thinking: { rotate: 8 },
    celebrate: { rotate: -155, transition: { duration: 0.22 } },
    encourage: { rotate: -20 },
  }
  const faceVariants = {
    thinking: { scale: 1 },
    celebrate: { scale: [1, 1.07, 1], transition: { duration: 0.4 } },
    encourage: { scale: 1 },
  }

  // confetti pieces — slightly fewer for older look
  const confetti = Array.from({ length: young ? 14 : 9 }).map((_, i) => {
    const ang = (Math.PI * 2 * i) / (young ? 14 : 9) + Math.random()
    const dist = 30 + Math.random() * 40
    return {
      dx: `${Math.cos(ang) * dist}px`,
      dy: `${Math.sin(ang) * dist - 20}px`,
      rot: `${Math.random() * 540 - 270}deg`,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      delay: `${Math.random() * 0.12}s`,
      left: `${46 + Math.random() * 8}%`,
    }
  })

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, rotate: pop ? [0, -9, 9, -4, 0] : 0, scale: pop ? [1, 1.14, 1] : 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 14 }}
      onClick={react}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.92 }}
      style={{ width: size, height: size, position: 'relative', cursor: 'pointer' }}
      aria-hidden="true"
    >
      <motion.svg
        viewBox="0 0 120 140"
        width={size}
        height={size}
        variants={bodyVariants}
        animate={walking ? 'walking' : state}
        style={{ overflow: 'visible' }}
      >
        <defs>
          <pattern id="kente" width="12" height="12" patternUnits="userSpaceOnUse">
            <rect width="12" height="12" fill="#FCD116" />
            <rect width="6" height="6" fill="#006B3F" />
            <rect x="6" y="6" width="6" height="6" fill="#CE1126" />
            <rect x="6" y="0" width="6" height="6" fill="#0b0b0b" />
            <rect x="0" y="6" width="6" height="6" fill="#0b0b0b" />
          </pattern>
          <radialGradient id="cheek" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f7a8a0" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#f7a8a0" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* shadow */}
        <ellipse cx="60" cy="133" rx="34" ry="6" fill="rgba(0,0,0,0.10)" />

        {/* legs (dark school socks + shoes) — slightly longer proportion for older look */}
        <rect x="47" y="102" width="9" height="24" rx="4" fill="#1f2937" />
        <rect x="64" y="102" width="9" height="24" rx="4" fill="#1f2937" />
        <ellipse cx="51" cy="129" rx="8" ry="4" fill="#0b0b0b" />
        <ellipse cx="69" cy="129" rx="8" ry="4" fill="#0b0b0b" />

        {/* navy uniform shorts / skirt — SHS cut (same navy) */}
        {isFemale ? (
          <path d="M40 98 Q60 92 80 98 L82 112 Q60 120 38 112 Z" fill="#13294b" />
        ) : (
          <path d="M42 98 L52 98 L51 116 L45 116 Z M68 98 L78 98 L75 116 L69 116 Z" fill="#13294b" />
        )}

        {/* white school shirt */}
        <path d="M38 68 Q60 58 82 68 L84 102 Q60 110 36 102 Z" fill="#ffffff" stroke="#d8e3dc" strokeWidth="1.2" />
        {/* collar — slightly broader for older look */}
        <path d="M52 68 L60 77 L68 68 L64 64 L60 67 L56 64 Z" fill="#eef2f5" stroke="#cdd8d2" strokeWidth="0.8" />
        {/* Kente school badge on chest */}
        <path d="M56 82 L64 82 L62 90 L58 90 Z" fill="url(#kente)" stroke="#0b0b0b" strokeWidth="0.6" />
        {/* shirt buttons */}
        <circle cx="60" cy="92" r="1.3" fill="#cdd8d2" />

        {/* satchel strap (school bag) */}
        <path d="M34 74 L60 92 L82 78" fill="none" stroke="#7a4a1e" strokeWidth="4" strokeLinecap="round" opacity="0.9" />

        {/* LEFT arm — swings (pumps) while walking */}
        <motion.g
          style={{ transformOrigin: '38px 72px' }}
          animate={
            walking
              ? { rotate: [-18, 18, -18] }
              : armVariants[state]
          }
          transition={walking ? { duration: 0.45, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }}
        >
          <rect x="28" y="70" width="10" height="26" rx="5" fill="#ffffff" stroke="#d8e3dc" strokeWidth="1.2" />
          <circle cx="33" cy="98" r="6" fill={skinFill} />
        </motion.g>

        {/* RIGHT arm — swings opposite (pumps) while walking */}
        <motion.g
          style={{ transformOrigin: '82px 72px' }}
          animate={
            walking
              ? { rotate: [18, -18, 18] }
              : armVariants[state]
          }
          transition={walking ? { duration: 0.45, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }}
        >
          <rect x="82" y="70" width="10" height="26" rx="5" fill="#ffffff" stroke="#d8e3dc" strokeWidth="1.2" />
          <circle cx="87" cy="98" r="6" fill="#a86b3c" />
        </motion.g>

        {/* head — Ghanaian skin tone, variable by avatar skin pick */}
        <motion.circle cx="60" cy="44" r="22" fill={skinFill} stroke={skinStroke} strokeWidth="0.4" variants={faceVariants} animate={state} />

        {/* hair — older, neater styles */}
        {isFemale ? (
          <>
            {/* neat bun + short sides — no cornrows for SHS look */}
            <path d="M38 42 Q38 20 60 19 Q82 20 82 42 Q72 32 60 32 Q48 32 38 42 Z" fill="#1a0f08" />
            {/* bun on top */}
            <circle cx="60" cy="20" r="6" fill="#1a0f08" />
            <path d="M54 22 Q60 14 66 22" fill="none" stroke="#0b0b0b" strokeWidth="1" opacity="0.5" />
            {/* small Kente headband — subtle */}
            <path d="M37 40 Q60 33 83 40 L83 44 Q60 38 37 44 Z" fill="url(#kente)" stroke="#0b0b0b" strokeWidth="0.6" />
            {/* small ear studs */}
            <circle cx="39" cy="52" r="2.2" fill="#FCD116" stroke="#0b0b0b" strokeWidth="0.5" />
            <circle cx="81" cy="52" r="2.2" fill="#FCD116" stroke="#0b0b0b" strokeWidth="0.5" />
          </>
        ) : (
          // neat low fade — a bit shorter / sharper for older look
          <path d="M39 41 Q41 22 60 22 Q79 22 81 41 Q76 32 60 32 Q44 32 39 41 Z" fill="#1a0f08" />
        )}

        {/* eyes (with blink) */}
        {blink ? (
          <>
            <path d="M49 46 Q52 48 55 46" stroke="#1a0f08" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M65 46 Q68 48 71 46" stroke="#1a0f08" strokeWidth="2" fill="none" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="52" cy="46" r={young ? 3 : 2.6} fill="#1a0f08" />
            <circle cx="68" cy="46" r={young ? 3 : 2.6} fill="#1a0f08" />
            {celebrate && <circle cx="53" cy="45" r="0.9" fill="#fff" />}
            {celebrate && <circle cx="69" cy="45" r="0.9" fill="#fff" />}
          </>
        )}

        {/* mouth — subtle, more mature */}
        {celebrate
          ? <path d="M51 53 Q60 63 69 53" stroke="#1a0f08" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          : encourage
            ? <path d="M53 56 Q60 53 67 56" stroke="#1a0f08" strokeWidth="2" fill="none" strokeLinecap="round" />
            : <path d="M54 55 Q60 58 66 55" stroke="#1a0f08" strokeWidth="2" fill="none" strokeLinecap="round" />}

        {/* cheeks — only on celebrate + young (no permanent blush for older look) */}
        {(celebrate || young) && <circle cx="46" cy="52" r="4" fill="url(#cheek)" />}
        {(celebrate || young) && <circle cx="74" cy="52" r="4" fill="url(#cheek)" />}

        {/* ---- Avatar overlay: HAT (Upgrade 8) ---- */}
        {avatarHat === 'kente_cap' && (
          <path d="M37 28 Q60 22 83 28 L83 32 Q60 26 37 32 Z" fill="url(#kente)" stroke="#0b0b0b" strokeWidth="0.6" />
        )}
        {avatarHat === 'school_cap' && (
          <>
            <path d="M38 30 Q60 22 82 30 L82 34 Q60 28 38 34 Z" fill="#13294b" stroke="#0b0b0b" strokeWidth="0.6" />
            <path d="M38 32 Q60 24 82 32" fill="none" stroke="#FCD116" strokeWidth="1.4" />
          </>
        )}
        {avatarHat === 'beanie' && (
          <>
            <path d="M36 28 Q60 21 84 28 L84 32 Q60 25 36 32 Z" fill="#8B1A1A" stroke="#0b0b0b" strokeWidth="0.6" />
            <path d="M36 30 Q60 23 84 30" fill="none" stroke="#a02020" strokeWidth="1.2" />
            <circle cx="60" cy="22" r="3" fill="#f0f0f0" />
          </>
        )}
        {avatarHat === 'sun_hat' && (
          <>
            <ellipse cx="60" cy="25" rx="32" ry="6" fill="#FCD116" stroke="#0b0b0b" strokeWidth="0.6" />
            <path d="M34 25 L26 22 L26 56 L34 56 Z" fill="#FCD116" stroke="#0b0b0b" strokeWidth="0.6" />
            <path d="M86 25 L94 22 L94 56 L86 56 Z" fill="#FCD116" stroke="#0b0b0b" strokeWidth="0.6" />
          </>
        )}

        {/* ---- Avatar overlay: ACCESSORY (Upgrade 8) ---- */}
        {avatarAccessory === 'glasses' && (
          <>
            <circle cx="50" cy="46" r="5.4" fill="none" stroke="#0b0b0b" strokeWidth="1.2" />
            <circle cx="70" cy="46" r="5.4" fill="none" stroke="#0b0b0b" strokeWidth="1.2" />
            <path d="M55.4 46 L64.6 46" stroke="#0b0b0b" strokeWidth="1.4" />
            <path d="M44.6 46 L41 47" stroke="#0b0b0b" strokeWidth="1" />
            <path d="M75.4 46 L79 47" stroke="#0b0b0b" strokeWidth="1" />
          </>
        )}
        {avatarAccessory === 'watch' && (
          <>
            <circle cx="87" cy="92" r="4.2" fill="#f0f0f0" stroke="#0b0b0b" strokeWidth="0.8" />
            <circle cx="87" cy="92" r="2" fill="#006B3F" />
            <path d="M83 92 L79 90" stroke="#1f2937" strokeWidth="2.4" strokeLinecap="round" />
          </>
        )}
        {avatarAccessory === 'necklace' && (
          <>
            <path d="M52 70 Q60 74 68 70" fill="none" stroke="#FFD23F" strokeWidth="1.4" />
            <circle cx="60" cy="74" r="2.4" fill="#CE1126" stroke="#0b0b0b" strokeWidth="0.5" />
          </>
        )}
        {avatarAccessory === 'school_bag' && (
          <g>
            <path d="M78 91 L82 91 L85 112 L75 112 Z" fill="#006B3F" stroke="#0b0b0b" strokeWidth="0.8" />
            <path d="M75 91 L85 91" stroke="#0b0b0b" strokeWidth="0.8" />
            <path d="M78 112 L82 112" stroke="#0b0b0b" strokeWidth="0.8" />
            <path d="M80 91 L84 100" stroke="#FFD23F" strokeWidth="1" />
            <path d="M75 102 L85 102" stroke="#FCD116" strokeWidth="1.2" />
            <path d="M80 112 L80 91 L84 100 L84 112 Z" fill="#00b36b" opacity="0.5" />
          </g>
        )}
        {avatarAccessory === 'bow_tie' && (
          <>
            <path d="M52 68 L48 64 L48 72 Z" fill="#CE1126" stroke="#0b0b0b" strokeWidth="0.5" />
            <path d="M68 68 L72 64 L72 72 Z" fill="#CE1126" stroke="#0b0b0b" strokeWidth="0.5" />
            <circle cx="60" cy="68" r="2" fill="#FFD23F" stroke="#0b0b0b" strokeWidth="0.5" />
          </>
        )}
      </motion.svg>

      {/* confetti on celebrate */}
      <AnimatePresence>
        {celebrate && (
          <motion.div
            className="ms-confetti"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {confetti.map((c, i) => (
              <i key={i} style={{
                background: c.color, left: c.left,
                '--dx': c.dx, '--dy': c.dy, '--rot': c.rot,
                animationDelay: c.delay,
              }} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* modernized speech bubble — appears briefly on state change, hidden while walking */}
      <AnimatePresence>
        {showBubble && (
          <motion.div
            key={state + (young ? 'y' : 'o')}
            className={`ms-bubble ${state} bob`}
            initial={{ opacity: 0, y: 10, scale: 0.7 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
          >
            <span className="ms-emoji">{EMOJI[state]}</span>
            {visibleText}
            <span className="ms-dot" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
