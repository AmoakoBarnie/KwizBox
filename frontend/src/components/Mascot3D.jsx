import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useAnimations, useGLTF } from '@react-three/drei'
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import './Mascot3D.css'

const MODEL_PATHS = {
  youth: {
    male: '/assets/mascots-v2/animated/youth_mascot.glb',
    female: '/assets/mascots-v2/animated/youth_female_mascot.glb',
  },
  shs: {
    male: '/assets/mascots-v2/animated/shs_mascot.glb',
    female: '/assets/mascots-v2/animated/shs_female_mascot.glb',
  },
}

function FramedModel({ path, state, walking, onReady }) {
  const root = useRef()
  const model = useGLTF(path)
  const clone = useMemo(() => cloneSkeleton(model.scene), [model.scene])
  const { actions } = useAnimations(model.animations, root)
  const { camera, size: viewport } = useThree()
  const active = walking ? 'walk' : (state === 'thinking' ? 'idle' : state)

  useEffect(() => {
    const action = actions?.[active]
    if (!action) return
    Object.values(actions).forEach((candidate) => {
      if (candidate !== action) candidate.fadeOut(0.12)
    })
    action.reset().fadeIn(0.12).play()
    return () => action.fadeOut(0.08)
  }, [actions, active])

  useLayoutEffect(() => {
    if (!root.current) return
    // Center the model at the origin and fit the camera to its bounds.
    const bounds = new THREE.Box3().setFromObject(root.current)
    const center = bounds.getCenter(new THREE.Vector3())
    const height = bounds.max.y - bounds.min.y
    root.current.position.x -= center.x
    root.current.position.y -= bounds.min.y
    root.current.position.z -= center.z
    root.current.updateWorldMatrix(true, true)

    // Use dynamic camera framing for both walking and static
    // Walking movement is handled by Framer Motion moving the container div,
    // not by the 3D model moving in space
    const fov = THREE.MathUtils.degToRad(camera.fov || 28)
    const distance = (height / 2) / Math.tan(fov / 2) * 1.18
    camera.position.set(distance, height * 0.52, 0)
    camera.near = Math.max(0.01, height / 100)
    camera.far = height * 10
    camera.lookAt(0, height * 0.52, 0)
    camera.updateProjectionMatrix()
    onReady?.()
  }, [camera, onReady, viewport.width, viewport.height])

  useFrame((_, delta) => {
    if (root.current && state === 'encourage') root.current.rotation.z = Math.sin(performance.now() * 0.002) * 0.018 - Math.PI / 2
    if (root.current && state !== 'encourage') root.current.rotation.z = -Math.PI / 2
  })

  return <group ref={root}><primitive object={clone} /></group>
}

export default function Mascot3D({
  type = 'youth', gender = 'male', state = 'thinking', size = 96, walking = false,
}) {
  const modelGender = gender === 'female' ? 'female' : 'male'
  const path = MODEL_PATHS[type === 'shs' ? 'shs' : 'youth'][modelGender]
  const displaySize = Math.max(48, Math.min(96, Math.round(Number(size) * 0.78)))

  return (
    <div className="mascot-3d" style={{ width: displaySize, height: displaySize }} aria-hidden="true">
      <Canvas
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        camera={{ fov: 28, position: [7, 2, 0] }}
        onCreated={({ gl }) => { gl.setClearColor(0x000000, 0) }}
      >
        <ambientLight intensity={1.8} />
        <hemisphereLight intensity={1.5} color="#fff8ed" groundColor="#19324a" />
        <directionalLight position={[4, 7, 5]} intensity={2.4} color="#fff4df" />
        <directionalLight position={[-3, 3, -4]} intensity={1.0} color="#8ed8ff" />
        <Suspense fallback={null}>
          <FramedModel path={path} state={state} walking={walking} />
        </Suspense>
      </Canvas>
    </div>
  )
}

Object.values(MODEL_PATHS).flatMap(Object.values).forEach((path) => useGLTF.preload(path))
