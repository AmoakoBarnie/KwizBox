import { motion, useAnimationFrame, useMotionValue, useTransform } from 'framer-motion'
import { useState, useRef, useMemo, useEffect } from 'react'
import { useAuth } from '../auth.jsx'
import Mascot from './Mascot.jsx'

const TITLE = 'KwizBox'

// Locomotion constants. TRACK is the percentage distance of one crossing; the
// walk clip is 1.0 s per stride cycle, so a natural pace is a fixed seconds-per-
// crossing rather than a distance-derived one. The previous code divided elapsed
// seconds by TRACK, which made a crossing take 200 seconds.
const TRACK = 100
const SECONDS_PER_CROSSING = 9

// Walk-cycle bob: two steps per stride cycle, so the bounce frequency is twice
// the clip rate. Amplitude is a real walk bob (a few px), not a hop.
const STEP_RATE = 2          // bobs per stride cycle
const BOB_AMPLITUDE = 3      // px
const LEAN_MAX = 3           // deg, forward lean while walking
const TURN_SECONDS = 0.45    // how long a direction change takes

function DustParticle({ x, strength }) {
  return (
    <motion.div
      initial={{ opacity: 0.6, scale: 0.2, x: `${x}%`, y: 0 }}
      animate={{
        opacity: 0,
        scale: 2 + strength * 1.5,
        x: `${x + (Math.random() - 0.5) * 10}%`,
        y: -14 - strength * 12,
      }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      style={{
        position: 'absolute',
        bottom: 2,
        width: 12,
        height: 6,
        borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(180,140,80,0.5) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 4,
      }}
    />
  )
}

function WalkingMascot({ gender, y, speed, delay = 0, onPass, avatar, type = 'youth' }) {
  const x = useMotionValue(0)
  const bobY = useMotionValue(0)
  const lean = useMotionValue(0)
  const facing = useMotionValue(1) // 1 = right, -1 = left; smoothed through turns

  const phase = useRef(delay)
  const lastBucket = useRef(-1)
  const turnFrom = useRef(1)
  const turnStart = useRef(0)
  const facingTarget = useRef(1)
  const lastStep = useRef(0)
  const [dust, setDust] = useState([])

  // Honour the OS reduced-motion preference. The CSS `no-motion` rule only
  // neutralises CSS animations; this locomotion is JS-driven, so it needs its
  // own guard. With motion reduced the mascot stands still, facing forward.
  const reduceMotion = useRef(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => {
      reduceMotion.current = mq.matches
      if (mq.matches) {
        x.set(0)
        bobY.set(0)
        lean.set(0)
        facing.current = 1
      }
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [x, bobY, lean])

  useAnimationFrame((t, delta) => {
    if (reduceMotion.current) return
    const dt = Math.min(delta / 1000, 0.05)
    const time = (t / 1000 + phase.current) * speed

    // --- horizontal position: one crossing every SECONDS_PER_CROSSING ---
    const cycle = (time / SECONDS_PER_CROSSING) % 2
    const tri = Math.abs(cycle - 1)          // 0 -> 1 -> 0
    const px = tri * TRACK
    const dir = cycle < 1 ? 1 : -1           // direction of travel
    x.set(px)

    // --- facing: turn over TURN_SECONDS instead of snapping ---
    if (dir !== facingTarget.current) {
      facingTarget.current = dir
      turnFrom.current = facing.current ?? 1
      turnStart.current = time
    }
    const turnT = Math.min(1, (time - turnStart.current) / TURN_SECONDS)
    // ease in-out so the turn reads as the body swinging round, not a flip
    const eased = turnT < 0.5 ? 2 * turnT * turnT : 1 - Math.pow(-2 * turnT + 2, 2) / 2
    facing.current = turnFrom.current + (dir - turnFrom.current) * eased

    // --- walk bob: two bounces per stride cycle, no jumping ---
    const stepPhase = (time * STEP_RATE) % 1
    // a raised foot at the top of each step, feet together at the bottom
    const bob = -Math.abs(Math.sin(stepPhase * Math.PI)) * BOB_AMPLITUDE
    bobY.set(bob)

    // lean into the direction of travel; settles to 0 mid-turn
    const leanAmount = Math.abs(facing.current) >= 1
      ? LEAN_MAX * Math.sign(facing.current)
      : LEAN_MAX * facing.current
    lean.set(leanAmount)

    // --- footfall dust: once per step, on the down-stroke ---
    if (stepPhase < lastStep.current) {
      const id = Date.now() + Math.random()
      setDust((d) => [...d.slice(-6), { id, x: px, strength: 0.5 }])
      setTimeout(() => setDust((d) => d.filter((p) => p.id !== id)), 600)
    }
    lastStep.current = stepPhase

    // --- tell the title which letter we are over ---
    const bucket = Math.floor((px / TRACK) * TITLE.length)
    if (bucket !== lastBucket.current) {
      lastBucket.current = bucket
      onPass?.(bucket)
    }
  })

  const left = useTransform(x, (v) => `${v}%`)
  const scaleX = useTransform(facing, (f) => f)

  return (
    <>
      <motion.div
        style={{
          position: 'absolute',
          left,
          bottom: y,
          width: 150,
          height: 150,
          y: bobY,
          scaleX,
          rotate: lean,
          zIndex: 5,
          transformOrigin: '50% 100%',
        }}
      >
        <Mascot type={type} state="celebrate" size={150} gender={gender} classLevel={type === 'shs' ? 'S2' : 'B4'} walking={true} avatar={avatar} />
      </motion.div>
      {dust.map((p) => (
        <DustParticle key={p.id} x={p.x} strength={p.strength} />
      ))}
    </>
  )
}

function TitleLetter({ ch, index, hopSignal }) {
  const [hop, setHop] = useState(0)
  useEffect(() => { if (hopSignal === index) setHop((h) => h + 1) }, [hopSignal, index])
  return (
    <motion.span
      className="hero-letter"
      initial={{ opacity: 0, y: 24, rotate: -12, scale: 0.6 }}
      animate={hop > 0 ? { opacity: 1, y: [24, -12, 0], scale: [0.6, 1.12, 1], rotate: [-12, 6, 0] } : { opacity: 1, y: 0, scale: 1, rotate: 0 }}
      transition={{ opacity: { delay: index * 0.045, duration: 0.3 }, y: { delay: index * 0.045, type: 'spring', stiffness: 280, damping: 14 }, default: { duration: 0.35, ease: 'easeOut' } }}
      style={{ display: 'inline-block', whiteSpace: 'pre' }}
    >
      {ch === ' ' ? ' ' : ch}
    </motion.span>
  )
}

export default function HeroStage({ user }) {
  const [hop, setHop] = useState(-1)
  const letters = useMemo(() => TITLE.split(''), [])
  return (
    <div className="hero-stage">
      <h1 className="title kente-title hero-title-anim">
        {letters.map((ch, i) => <TitleLetter key={i} ch={ch} index={i} hopSignal={hop} />)}
      </h1>
      <div className="mascot-track">
        {user?.class_level && ['S1', 'S2', 'S3'].includes(user.class_level)
          ? <>
              <WalkingMascot gender="male" y={4} speed={1.15} delay={0} onPass={setHop} avatar={user?.avatar} type="shs" />
              <WalkingMascot gender="female" y={2} speed={0.85} delay={3.4} onPass={setHop} avatar={user?.avatar} type="shs" />
            </>
          : <>
              <WalkingMascot gender="male" y={4} speed={1.15} delay={0} onPass={setHop} avatar={user?.avatar} type="youth" />
              <WalkingMascot gender="female" y={2} speed={0.85} delay={3.4} onPass={setHop} avatar={user?.avatar} type="youth" />
            </>
        }
      </div>
    </div>
  )
}
