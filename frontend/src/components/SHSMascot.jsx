import { lazy, Suspense } from 'react'
import SHSMascot2D from './SHSMascot2D.jsx'

const Mascot3D = lazy(() => import('./Mascot3D.jsx'))

export default function SHSMascot(props) {
  const fallback = <SHSMascot2D {...props} />
  return (
    <Suspense fallback={fallback}>
      <Mascot3D {...props} classLevel={props.classLevel || 'S1'} fallback={fallback} />
    </Suspense>
  )
}
