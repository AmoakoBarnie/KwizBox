import { motion, useAnimationFrame, useMotionValue, useTransform } from 'framer-motion'
import { useState, useRef, useMemo, useEffect } from 'react'
import { useAuth } from '../auth.jsx'
import Mascot from './Mascot.jsx'

const TITLE = 'KwizBox'
const TRACK = 100

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

function WalkingMascot({ gender, y, speed, delay = 0, onPass, avatar }) {
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

  const STIFFNESS = 190
  const DAMPING = 12
  const MASS = 1
  const BASE_FORCE = -32
  const STRONG_FORCE = -52
  const JUMP_INTERVAL = 0.68

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
        <Mascot state="celebrate" size={64} gender={gender} classLevel="B4" walking={true} avatar={avatar} />
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
              <WalkingMascot gender="male" y={4} speed={1.15} delay={0} onPass={setHop} avatar={user?.avatar} SHS={true} />
              <WalkingMascot gender="female" y={2} speed={0.85} delay={3.4} onPass={setHop} avatar={user?.avatar} SHS={true} />
            </>
          : <>
              <WalkingMascot gender="male" y={4} speed={1.15} delay={0} onPass={setHop} avatar={user?.avatar} />
              <WalkingMascot gender="female" y={2} speed={0.85} delay={3.4} onPass={setHop} avatar={user?.avatar} />
            </>
        }
      </div>
    </div>
  )
}
