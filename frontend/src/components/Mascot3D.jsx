import { Canvas, useFrame } from '@react-three/fiber'
import { useAnimations, useGLTF } from '@react-three/drei'
import { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import './Mascot.css'

const PHRASES = {
  thinking: 'Think it through, then tap.',
  celebrate: 'Correct! Well done.',
  encourage: 'Almost — keep learning!'
}

function assetFor(classLevel) {
  return /^S[1-3]$/.test(classLevel || '')
    ? '/mascots/kwizbox-senior.glb'
    : '/mascots/kwizbox-junior.glb'
}

function useAssetAvailable(path) {
  const [available, setAvailable] = useState(null)
  useEffect(() => {
    let active = true
    fetch(path, { method: 'HEAD', cache: 'no-store' })
      .then((response) => active && setAvailable(response.ok))
      .catch(() => active && setAvailable(false))
    return () => { active = false }
  }, [path])
  return available
}

function animationKey(state, walking) {
  if (walking) return 'walking'
  return state || 'thinking'
}

function RiggedMascot({ path, state, walking }) {
  const root = useRef()
  const { scene, animations } = useGLTF(path)
  const { actions } = useAnimations(animations, root)
  const model = useMemo(() => scene.clone(true), [scene])
  const clip = animationKey(state, walking)

  useEffect(() => {
    const names = Object.keys(actions || {})
    const wanted = [clip, clip[0].toUpperCase() + clip.slice(1), 'default', 'idle']
    const name = wanted.find((candidate) => actions?.[candidate]) || names[0]
    const action = name ? actions[name] : null
    if (!action) return undefined
    action.reset().fadeIn(0.18).play()
    return () => action.fadeOut(0.18)
  }, [actions, clip])

  useFrame(({ clock }, delta) => {
    if (!root.current) return
    const wave = Math.sin(clock.elapsedTime * (walking ? 8 : 2.4))
    root.current.position.y = -1.18 + (walking ? 0 : wave * (state === 'celebrate' ? 0.045 : 0.018))
    root.current.rotation.y += delta * (walking ? 0.35 : 0.06)
    if (state === 'celebrate') root.current.rotation.z = wave * 0.045
    else if (state === 'encourage') root.current.rotation.z = wave * 0.02
    else root.current.rotation.z = 0
  })

  return (
    <group ref={root} scale={1.65}>
      <primitive object={model} />
    </group>
  )
}

class ModelBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) return this.props.fallback
    return this.props.children
  }
}

export default function Mascot3D({
  state = 'thinking',
  size = 120,
  classLevel = 'B7',
  walking = false,
  fallback,
}) {
  const path = assetFor(classLevel)
  const available = useAssetAvailable(path)

  if (available !== true) return fallback

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.82 }}
      animate={{ opacity: 1, scale: state === 'celebrate' ? [1, 1.08, 1] : 1 }}
      transition={{ type: 'spring', stiffness: 220, damping: 16 }}
      style={{ width: size, height: size, position: 'relative', cursor: 'pointer' }}
      title={PHRASES[state] || PHRASES.thinking}
      aria-label={PHRASES[state] || PHRASES.thinking}
    >
      <div className={`ms-bubble ${state}`} style={{ display: walking ? 'none' : undefined }}>
        {PHRASES[state] || PHRASES.thinking}
      </div>
      <ModelBoundary fallback={fallback}>
        <Canvas
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
          camera={{ position: [0, 0, 4], fov: 34 }}
          frameloop="always"
          style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
        >
          <ambientLight intensity={1.5} />
          <directionalLight position={[2, 3, 4]} intensity={2.2} color="#fff7dd" />
          <directionalLight position={[-3, 1, 1]} intensity={0.8} color="#00b36b" />
          <Suspense fallback={null}>
            <RiggedMascot path={path} state={state} walking={walking} />
          </Suspense>
        </Canvas>
      </ModelBoundary>
    </motion.div>
  )
}
