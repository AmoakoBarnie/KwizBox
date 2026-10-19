import { motion, useAnimationFrame, useMotionValue, useTransform } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'
import Mascot from './Mascot.jsx'

/**
 * WalkingMascot — a 3D mascot that walks across the screen.
 *
 * Uses Framer Motion for smooth horizontal movement and the Mascot3D
 * walk animation clip for the leg/arm cycle. The mascot walks from
 * one side of the screen to the other, then wraps around.
 *
 * Props:
 *  - gender: 'male' | 'female'
 *  - type: 'youth' | 'shs'
 *  - size: pixel size of the mascot (default 64)
 *  - speed: walk speed multiplier (default 1)
 *  - y: vertical offset from bottom in px (default 0)
 *  - walking: whether the mascot is walking (default true)
 *  - onPass: callback when mascot passes a point (0-100 percentage)
 *  - avatar: avatar config object
 *  - classLevel: class level string
 */
export default function WalkingMascot({
  gender = 'male',
  type = 'youth',
  size = 64,
  speed = 1,
  y = 0,
  walking = true,
  onPass,
  avatar,
  classLevel = 'B4',
}) {
  const x = useMotionValue(0)
  const bobY = useMotionValue(0)
  const lean = useMotionValue(0)
  const squashX = useMotionValue(1)
  const squashY = useMotionValue(1)

  const spring = useRef({ pos: 0, vel: 0 })
  const phase = useRef(0)
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
  const TRACK = 100

  useAnimationFrame((t, delta) => {
    if (!walking) return

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

    const bucket = Math.floor((px / TRACK) * 7)
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
          width: size,
          height: size,
          y: bobY,
          scaleX: useTransform([scaleXDir, squashX], ([dir, sx]) => dir * sx),
          scaleY: squashY,
          rotate: lean,
          zIndex: 5,
          transformOrigin: '50% 100%',
        }}
      >
        <Mascot
          type={type}
          state="celebrate"
          size={size}
          gender={gender}
          classLevel={classLevel}
          walking={true}
          avatar={avatar}
        />
      </motion.div>
      {dust.map((p) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0.6, scale: 0.2, x: `${p.x}%`, y: 0 }}
          animate={{
            opacity: 0,
            scale: 2 + p.strength * 1.5,
            x: `${p.x + (Math.random() - 0.5) * 10}%`,
            y: -14 - p.strength * 12,
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
      ))}
    </>
  )
}
