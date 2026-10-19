import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useAnimations, useGLTF } from '@react-three/drei'
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
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

// Manus-style framing: normalise every model to a fixed display height so
// characters look the same size regardless of how they were exported, centre
// on the bounding box, then place the camera so the WHOLE body is in frame.
//
// This replaces the older FOV-derived distance, which sized the model from its
// raw height and left the upper body outside the frustum.
const DISPLAY_HEIGHT = 2.9
const CAMERA_FOV = 35
const FILL_RATIO = 0.82 // fraction of the vertical FOV the model should occupy

function FramedModel({ path, state, walking, onReady }) {
  const root = useRef()
  const model = useGLTF(path, undefined, (loader) => {
    // Attach the meshopt decoder to drei's loader instance.
    loader.setMeshoptDecoder?.(MeshoptDecoder)
  })
  const clone = useMemo(() => cloneSkeleton(model.scene), [model.scene])
  const { actions } = useAnimations(model.animations, root)
  const { camera } = useThree()
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

    // Measure the model at its native scale, then normalise to DISPLAY_HEIGHT
    // so a 4.9-unit model and a 0.98-unit model render at the same size.
    const native = new THREE.Box3().setFromObject(root.current)
    const nativeSize = native.getSize(new THREE.Vector3())
    if (nativeSize.y <= 0) return
    const scale = DISPLAY_HEIGHT / nativeSize.y
    root.current.scale.setScalar(scale)

    // Re-centre after scaling: feet on y=0, centred on the origin.
    root.current.updateWorldMatrix(true, true)
    const bounds = new THREE.Box3().setFromObject(root.current)
    const center = bounds.getCenter(new THREE.Vector3())
    root.current.position.x -= center.x
    root.current.position.y -= bounds.min.y
    root.current.position.z -= center.z
    root.current.updateWorldMatrix(true, true)

    // Camera back far enough that the full height fits inside the vertical FOV.
    const fov = THREE.MathUtils.degToRad(CAMERA_FOV)
    const distance = (DISPLAY_HEIGHT / FILL_RATIO) / 2 / Math.tan(fov / 2)
    camera.fov = CAMERA_FOV
    camera.position.set(0, DISPLAY_HEIGHT * 0.5, distance)
    camera.near = Math.max(0.001, DISPLAY_HEIGHT / 100)
    camera.far = DISPLAY_HEIGHT * 100
    camera.lookAt(0, DISPLAY_HEIGHT * 0.5, 0)
    camera.updateProjectionMatrix()
    onReady?.()
  }, [camera, onReady])

  useFrame((_, delta) => {
    // Keep the character UPRIGHT. rotation.z must stay 0 — a non-zero value (the
    // previous -PI/2) lays the model on its side and it renders as a flat sliver.
    if (root.current) root.current.rotation.z = 0
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
