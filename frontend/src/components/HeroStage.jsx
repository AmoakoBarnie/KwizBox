import { motion, useAnimationFrame, useMotionValue, useTransform } from 'framer-motion'
import { useState, useRef, useMemo, useEffect } from 'react'
import Mascot from './Mascot.jsx'

const TITLE = 'Ghana STEM Trivia'
const TRACK = 100

function DustParticle({ x, strength }) {
  return (
    <motion.div
      initial={{ opacity: 0.7, scale: 0.3, x: `${x}%`, y: 0 }}
      animate={{
        opacity: 0,
        scale: 1.8 + strength,
        x: `${x + (Math.random() - 0.5) * 8}%`,
        y: -12 - strength * 10,
      }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
      style={{
        position: 'absolute',
        bottom: 4,
        width: 14,
        height: 8,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(180,140,80,0.45) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 4,
      }}
    />
  )
}

function WalkingMascot({ gender, y, speed, delay = 0, onPass }) {
  const x = useMotionValue(0)
  const bobY = useMotionValue(0)
  const lean = useMotionValue(0)
  const squashX = useMotionValue(1)
  const squashY = useMotionValue(1)

  const spring = useRef({ pos: 0, vel: 0 })
  const phase = useRef(delay)
  const lastBucket = useRef(-1)
  const direction = useRef(1)
  const jumpCount = useRef(0)
  const lastJumpTime = useRef(0)
  const [dust, setDust] = useState([])

  const STIFFNESS = 170
  const DAMPING = 11
  const MASS = 1
  const BASE_FORCE = -38
  const STRONG_FORCE = -58
  const JUMP_INTERVAL = 0.62

  useAnimationFrame((t, delta) => {
    const dt = Math.min(delta / 1000, 0.032)
    const time = (t / 1000 + phase.current) * speed

    const cycle = (time / TRACK) % 2
    const tri = Math.abs(cycle - 1)
    const px = tri * TRACK
    direction.current = cycle < 1 ? 1 : -1
    x.set(px)

    if (time - lastJumpTime.current > JUMP_INTERVAL) {
      jumpCount.current += 1
      const isStrong = jumpCount.current % 3 === 0
      spring.current.vel += isStrong ? STRONG_FORCE : BASE_FORCE
      lastJumpTime.current = time
    }

    const { pos, vel } = spring.current
    const force = -STIFFNESS * pos - DAMPING * vel
    const acc = force / MASS
    spring.current.vel = vel + acc * dt
    spring.current.pos = pos + spring.current.vel * dt

    if (spring.current.pos > 0) {
      spring.current.pos = 0
      if (Math.abs(spring.current.vel) > 8) {
        const id = Date.now()
        setDust((d) => [...d.slice(-6), { id, x: px, strength: Math.min(Math.abs(spring.current.vel) / 40, 1) }])
        setTimeout(() => setDust((d) => d.filter((p) => p.id !== id)), 600)
      }
      spring.current.vel *= -0.32
    }

    bobY.set(spring.current.pos)
    lean.set(spring.current.vel * -0.16 * direction.current)

    const speedY = Math.abs(spring.current.vel)
    const stretch = 1 + speedY * 0.009
    const squash = spring.current.pos > -2 ? 1 + Math.min(speedY * 0.012, 0.25) : 1
    if (spring.current.pos > -4 && spring.current.vel > 0) {
      squashX.set(squash)
      squashY.set(2 - squash)
    } else {
      squashX.set(2 - stretch)
      squashY.set(stretch)
    }

    const bucket = Math.floor((px / TRACK) * TITLE.length)
    if (bucket !== lastBucket.current) {
      lastBucket.current = bucket
      onPass?.(bucket)
    }
  })

  const left = useTransform(x, (v) => `${v}%`)
  const scaleXDir = useTransform(x, () => direction.current)

  return (
    <>
      <motion.div
        style={{
          position: 'absolute',
          left,
          bottom: y,
          width: 64,
          height: 64,
          y: bobY,
          scaleX: useTransform([scaleXDir, squashX], ([dir, sx]) => dir * sx),
          scaleY: squashY,
          rotate: lean,
          zIndex: 5,
          transformOrigin: '50% 100%',
        }}
      >
        <Mascot state="celebrate" size={64} gender={gender} classLevel="B4" walking={true} />
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
      animate={hop > 0 ? { opacity: 1, y: [0, -14, 0], scale: [1, 1.18, 1], rotate: [0, 8, 0] } : { opacity: 1, y: 0, scale: 1, rotate: 0 }}
      transition={{ opacity: { delay: index * 0.05, duration: 0.3 }, y: { delay: index * 0.05, type: 'spring', stiffness: 300, damping: 12 }, default: { duration: 0.4 } }}
      style={{ display: 'inline-block', whiteSpace: 'pre' }}
    >
      {ch === ' ' ? ' ' : ch}
    </motion.span>
  )
}

export default function HeroStage() {
  const [hop, setHop] = useState(-1)
  const letters = useMemo(() => TITLE.split(''), [])
  return (
    <div className="hero-stage">
      <h1 className="title kente-title hero-title-anim">
        {letters.map((ch, i) => <TitleLetter key={i} ch={ch} index={i} hopSignal={hop} />)}
      </h1>
      <div className="mascot-track">
        <WalkingMascot gender="male" y={4} speed={1.15} delay={0} onPass={setHop} />
        <WalkingMascot gender="female" y={2} speed={0.85} delay={3.4} onPass={setHop} />
      </div>
    </div>
  )
}
