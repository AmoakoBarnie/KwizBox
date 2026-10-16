/**
 * Sound effects via Web Audio API — zero dependencies.
 *
 * SFX:
 *  - correct()       → C5–E5 ascending major chord (happy)
 *  - wrong()         → low buzz A3→C4 (dismissive)
 *  - streak(n)       → ascending arpeggio, richer for longer streaks
 *  - combo(n)        → rapid high-note burst
 *  - levelUp()       → triumphant sweep
 *  - click()         → soft UI tick
 *
 * All sounds are user-gated: the AudioContext is created lazily on the
 * first user gesture (browser policy).  A global mute flag can silence
 * everything; the preference persists across sessions.
 */

let ctx = null
let muted = false
let volume = 0.18 // Global volume control 0.0 - 1.0

function getCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)()
  }
  if (ctx.state === 'suspended') {
    ctx.resume()
  }
  return ctx
}

/** Resume the context on the next user gesture if it was auto-suspended. */
export function initSound() {
  getCtx()
}

export function isMuted() {
  return muted
}

export function toggleMute() {
  muted = !muted
  return muted
}

export function setMuted(v) {
  muted = v
}

/** Play a single tone. */
function tone(freq, start, dur, type = 'sine', vol = 0.18, ramp = true) {
  const c = getCtx()
  if (muted) return
  const t = start ?? c.currentTime
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  gain.gain.setValueAtTime(vol, t)
  if (ramp) {
    gain.gain.linearRampToValueAtTime(0, t + dur)
  } else {
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur)
  }
  osc.connect(gain).connect(c.destination)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

/** Two-tone chord (stacked). */
function chord(f1, f2, start, dur, type = 'sine', vol = 0.12) {
  tone(f1, start, dur, type, vol)
  tone(f2, start, dur, type, vol * 0.85)
}

/** Arpeggio: array of frequencies played in quick succession. */
function arpeggio(freqs, start, dur = 0.1, type = 'sine', vol = 0.1) {
  const c = getCtx()
  freqs.forEach((f, i) => {
    tone(f, start + i * dur, dur * 1.6, type, vol)
  })
}

// ── Public SFX ───────────────────────────────────────────────────────

/** Correct answer — bright C5–E5 major chord. */
export function correct() {
  const c = getCtx()
  const now = c.currentTime
  chord(523.25, 659.25, now, 0.18)          // C5 + E5
  setTimeout(() => tone(783.99, now + 0.12, 0.25), 70) // G5
}

/** Wrong answer — low dissonant buzz. */
export function wrong() {
  const c = getCtx()
  const now = c.currentTime
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(220, now)
  osc.frequency.linearRampToValueAtTime(180, now + 0.25)
  gain.gain.setValueAtTime(0.1, now)
  gain.gain.linearRampToValueAtTime(0, now + 0.3)
  osc.connect(gain).connect(c.destination)
  osc.start(now)
  osc.stop(now + 0.35)
}

/** Streak milestone — ascending arpeggio that grows with the streak. */
export function streak(n) {
  const base = 523.25 // C5
  const notes = [0, 2, 4, 7, 9, 12].slice(0, Math.min(n, 6))
  const freqs = notes.map((s) => base * Math.pow(2, s / 12))
  arpeggio(freqs, getCtx().currentTime, 0.09, 'sine', 0.1)
}

/** Combo milestone — rapid high-note burst. */
export function combo(n) {
  const c = getCtx()
  const now = c.currentTime
  const count = Math.min(n, 8)
  for (let i = 0; i < count; i++) {
    tone(880 + i * 80, now + i * 0.05, 0.12, 'sine', 0.08)
  }
}

/** Level-up / achievement unlock — triumphant sweep. */
export function levelUp() {
  const freqs = [523.25, 659.25, 783.99, 1046.5]
  arpeggio(freqs, getCtx().currentTime, 0.1, 'sine', 0.12)
}

/** UI click — soft tick. */
export function click() {
  const c = getCtx()
  const now = c.currentTime
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(900, now)
  gain.gain.setValueAtTime(0.06, now)
  gain.gain.linearRampToValueAtTime(0, now + 0.04)
  osc.connect(gain).connect(c.destination)
  osc.start(now)
  osc.stop(now + 0.05)
}
