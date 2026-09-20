import { useEffect, useRef, useState } from 'react'

const GHANA = ['#006B3F', '#FCD116', '#CE1126', '#04a05f', '#ffffff', '#ffd23f', '#00b36b']

/** Rich particle celebration — Ghana flag colors. Burst + continuous rain + ticker. */
export default function Confetti({ perfect = false }) {
  const containerRef = useRef(null)
  const [particles, setParticles] = useState([])
  const [emitted, setEmitted] = useState(false)

  const burst = () => {
    if (emitted) return
    setEmitted(true)
    const count = perfect ? 90 : 45
    const newParticles = Array.from({ length: count }, (_, i) => {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5
      const speed = perfect ? 180 + Math.random() * 160 : 120 + Math.random() * 100
      return {
        id: i,
        x: 0,
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 80,
        rot: Math.random() * 360,
        vr: (Math.random() - 0.5) * 1200,
        color: GHANA[i % GHANA.length],
        size: perfect ? (6 + Math.random() * 8) : (4 + Math.random() * 6),
        shape: Math.random() < 0.3 ? 'star' : Math.random() < 0.5 ? 'circle' : 'rect',
        life: 1,
        perfect,
      }
    })
    setParticles(newParticles)
  }

  useEffect(() => {
    burst()
    const interval = setInterval(() => {
      if (perfect) {
        // Continuous sparkles for perfect scores
        const sparkle = {
          id: 's-' + Math.random(),
          x: (Math.random() - 0.5) * 500,
          y: -20 - Math.random() * 40,
          vx: (Math.random() - 0.5) * 20,
          vy: 40 + Math.random() * 60,
          rot: 0,
          vr: 0,
          color: GHANA[Math.floor(Math.random() * 3)],
          size: 3 + Math.random() * 4,
          shape: 'circle',
          life: 1,
          perfect: false,
        }
        setParticles(prev => [...prev.slice(-60), sparkle])
      }
    }, perfect ? 200 : 0)
    return () => clearInterval(interval)
  }, [perfect])

  useEffect(() => {
    if (!containerRef.current || particles.length === 0) return
    let animationId
    const fps = 30
    const gravity = 580
    const decay = perfect ? 0.92 : 0.88
    const groundY = 500

    const animate = () => {
      setParticles(prev => {
        const updated = prev.map(p => {
          const nx = p.x + p.vx / fps
          const ny = p.y + p.vy / fps
          const nvy = p.vy + gravity / fps
          const life = Math.max(0, p.life - (1 / fps) * (perfect ? 0.4 : 0.6))
          return {
            ...p,
            x: nx,
            y: ny > groundY ? groundY : ny,
            vy: ny > groundY ? -Math.abs(p.vy) * 0.3 : nvy,
            rot: p.rot + p.vr / fps,
            life,
          }
        }).filter(p => p.life > 0.01)
        return updated
      })
      animationId = requestAnimationFrame(animate)
    }
    animationId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationId)
  }, [particles.length, perfect])

  if (!containerRef.current) return null

  return (
    <div ref={containerRef} style={{
      position: 'fixed', inset: 0, overflow: 'hidden',
      pointerEvents: 'none', zIndex: 50,
    }}>
      {particles.map(p => (
        <div key={p.id}
          style={{
            position: 'absolute',
            left: '50%',
            top: '44%',
            transform: `translate(${-50 + p.x}px, ${-50 + p.y}px) rotate(${p.rot}deg)`,
            width: p.size,
            height: p.size,
            opacity: p.life,
            backgroundColor: p.shape === 'circle' ? p.color : 'transparent',
            borderRadius: p.shape === 'circle' ? '50%' : p.shape === 'star' ? '2px' : '1px',
            border: p.shape === 'star' ? `1.5px solid ${p.color}` : 'none',
            boxShadow: p.shape === 'circle' ? `0 0 4px ${p.color}` : 'none',
          }}
        >
          {p.shape === 'star' && (
            <span style={{ color: p.color, fontSize: p.size * 1.4, lineHeight: 1, position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>★</span>
          )}
        </div>
      ))}
    </div>
  )
}
