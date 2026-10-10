import { lazy, Suspense } from 'react'
import Mascot2D from './Mascot2D.jsx'

const Mascot3D = lazy(() => import('./Mascot3D.jsx'))

export default function Mascot(props) {
  const fallback = <Mascot2D {...props} />
  return (
    <Suspense fallback={fallback}>
      <Mascot3D {...props} fallback={fallback} />
    </Suspense>
  )
}
