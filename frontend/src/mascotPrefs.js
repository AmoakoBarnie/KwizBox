/**
 * Mascot display preferences (device-local).
 *
 * The 3D/2D choice is a rendering preference, not account data, so it lives in
 * localStorage under `kwiz_mascot_style` ('3d' | '2d'). A tiny event bus lets
 * every mounted Mascot react immediately when the picker changes — storage
 * events alone do not fire in the same tab that wrote the value.
 */
import { useEffect, useState } from 'react'

export const MASCOT_STYLE_KEY = 'kwiz_mascot_style'
const STYLE_EVENT = 'kwizbox:mascot-style'

export function getMascotStyle() {
  try {
    return localStorage.getItem(MASCOT_STYLE_KEY) === '2d' ? '2d' : '3d'
  } catch (_) {
    return '3d'
  }
}

export function setMascotStyle(style) {
  const next = style === '2d' ? '2d' : '3d'
  try { localStorage.setItem(MASCOT_STYLE_KEY, next) } catch (_) { /* private mode */ }
  try { window.dispatchEvent(new CustomEvent(STYLE_EVENT, { detail: next })) } catch (_) {}
  return next
}

/** Reactive style hook: returns [style, setStyle] and re-renders on change. */
export function useMascotStyle() {
  const [style, setStyle] = useState(getMascotStyle)

  useEffect(() => {
    const sync = () => setStyle(getMascotStyle())
    window.addEventListener(STYLE_EVENT, sync)
    window.addEventListener('storage', sync) // cross-tab updates
    return () => {
      window.removeEventListener(STYLE_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  return [style, (next) => setStyle(setMascotStyle(next))]
}
