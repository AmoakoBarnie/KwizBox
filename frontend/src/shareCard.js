/**
 * PNG result card for sharing.
 *
 * Renders a 1080×1350 (4:5, WhatsApp/Instagram friendly) card on an offscreen
 * canvas — no extra dependency, no server round-trip. Used by the Summary share
 * modal: "Save PNG" downloads it, "Share image" hands it to the Web Share API
 * when file sharing is supported and falls back to a download.
 */

const W = 1080
const H = 1350

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function wrapLines(ctx, text, maxWidth) {
  const words = String(text || '').split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines
}

function gradeFor(pct) {
  if (pct >= 90) return { letter: 'A', color: '#ffd23f', label: 'Excellent' }
  if (pct >= 75) return { letter: 'B', color: '#4ade80', label: 'Great' }
  if (pct >= 60) return { letter: 'C', color: '#a78bfa', label: 'Good' }
  if (pct >= 45) return { letter: 'D', color: '#fbbf24', label: 'Keep going' }
  return { letter: 'F', color: '#94a3b8', label: 'Try again' }
}

export function safeFilename(name) {
  const slug = String(name || 'player').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `kwizbox-${slug || 'player'}-${new Date().toISOString().slice(0, 10)}.png`
}

/** Render the result card. Returns a PNG Blob. */
export async function buildShareCardPng({ result, cfg, user }) {
  const {
    total = 0, correct = 0, accuracy = 0, score = 0, streak = 0,
  } = result || {}
  const bestStreak = result?.best_streak ?? streak ?? 0
  const pct = Math.round((accuracy || 0) * 100)
  const grade = gradeFor(pct)
  const nickname = user?.nickname || 'A player'
  const meta = [cfg?.class_level, cfg?.subject].filter(Boolean).join(' · ')
  const dateStr = new Date().toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D is not available')

  // ---- Background: deep green → navy, with a warm glow ----
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#06301f')
  bg.addColorStop(0.55, '#0a2136')
  bg.addColorStop(1, '#0b1524')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  const glow = ctx.createRadialGradient(W * 0.78, H * 0.12, 40, W * 0.78, H * 0.12, 620)
  glow.addColorStop(0, 'rgba(255, 210, 63, 0.20)')
  glow.addColorStop(1, 'rgba(255, 210, 63, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  // ---- Kente stripe top and bottom (Ghana flag palette) ----
  const stripe = ['#CE1126', '#FCD116', '#006B3F', '#0b0b0b']
  stripe.forEach((color, i) => {
    ctx.fillStyle = color
    ctx.fillRect(0, i * 12, W, 12)
    ctx.fillRect(0, H - (i + 1) * 12, W, 12)
  })

  // ---- Card panel ----
  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)'
  ctx.shadowBlur = 40
  ctx.shadowOffsetY = 18
  roundRect(ctx, 60, 110, W - 120, H - 240, 48)
  ctx.fillStyle = 'rgba(9, 27, 40, 0.82)'
  ctx.fill()
  ctx.restore()

  ctx.strokeStyle = 'rgba(255, 210, 63, 0.35)'
  ctx.lineWidth = 2
  roundRect(ctx, 60, 110, W - 120, H - 240, 48)
  ctx.stroke()

  const left = 120
  const right = W - 120

  // ---- Brand ----
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#ffd23f'
  ctx.font = '800 56px "Segoe UI", system-ui, -apple-system, sans-serif'
  ctx.fillText('KwizBox', left, 205)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.62)'
  ctx.font = '600 26px "Segoe UI", system-ui, sans-serif'
  ctx.fillText('STEM QUIZ RESULT · 🇬🇭', left, 246)

  // ---- Player ----
  ctx.fillStyle = '#ffffff'
  ctx.font = '800 64px "Segoe UI", system-ui, sans-serif'
  const nameLines = wrapLines(ctx, nickname, right - left)
  nameLines.slice(0, 2).forEach((line, i) => ctx.fillText(line, left, 352 + i * 72))

  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
  ctx.font = '600 30px "Segoe UI", system-ui, sans-serif'
  ctx.fillText(meta || 'KwizBox quiz', left, 352 + nameLines.slice(0, 2).length * 72 + 10)

  // ---- Score + grade disc ----
  ctx.fillStyle = '#ffffff'
  ctx.font = '900 168px "Segoe UI", system-ui, sans-serif'
  const scoreText = String(score)
  ctx.fillText(scoreText, left, 610)
  const scoreWidth = ctx.measureText(scoreText).width
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)'
  ctx.font = '700 42px "Segoe UI", system-ui, sans-serif'
  ctx.fillText('pts', left + scoreWidth + 18, 602)

  const cx = right - 90
  const cy = 560
  ctx.beginPath()
  ctx.arc(cx, cy, 86, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)'
  ctx.fill()
  ctx.strokeStyle = grade.color
  ctx.lineWidth = 8
  ctx.stroke()
  ctx.textAlign = 'center'
  ctx.fillStyle = grade.color
  ctx.font = '900 96px "Segoe UI", system-ui, sans-serif'
  ctx.fillText(grade.letter, cx, cy + 20)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.72)'
  ctx.font = '700 26px "Segoe UI", system-ui, sans-serif'
  ctx.fillText(`${pct}%`, cx, cy + 62)
  ctx.textAlign = 'left'

  // ---- Accuracy bar ----
  const barY = 700
  roundRect(ctx, left, barY, right - left, 26, 13)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.10)'
  ctx.fill()
  const barW = Math.max(10, (right - left) * Math.min(1, pct / 100))
  roundRect(ctx, left, barY, barW, 26, 13)
  const barGrad = ctx.createLinearGradient(left, 0, right, 0)
  barGrad.addColorStop(0, '#00d27e')
  barGrad.addColorStop(1, '#ffd23f')
  ctx.fillStyle = barGrad
  ctx.fill()
  ctx.fillStyle = grade.color
  ctx.font = '700 28px "Segoe UI", system-ui, sans-serif'
  ctx.fillText(`${pct}% accuracy · ${grade.label}`, left, barY + 70)

  // ---- Stat tiles ----
  const stats = [
    { value: `${correct}/${total}`, label: 'CORRECT' },
    { value: `${bestStreak}🔥`, label: 'BEST STREAK' },
    { value: result?.challenge?.code || (cfg?.daily ? 'DAILY' : 'QUIZ'), label: 'MODE' },
  ]
  const tileW = (right - left - 32) / 3
  stats.forEach((stat, i) => {
    const x = left + i * (tileW + 16)
    roundRect(ctx, x, 840, tileW, 170, 26)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.055)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.fillStyle = '#ffffff'
    ctx.font = '800 52px "Segoe UI", system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(String(stat.value), x + tileW / 2, 925)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.font = '700 22px "Segoe UI", system-ui, sans-serif'
    ctx.fillText(stat.label, x + tileW / 2, 972)
    ctx.textAlign = 'left'
  })

  // ---- Footer ----
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)'
  ctx.font = '600 26px "Segoe UI", system-ui, sans-serif'
  ctx.fillText(dateStr, left, 1105)
  ctx.fillStyle = '#ffd23f'
  ctx.font = '800 30px "Segoe UI", system-ui, sans-serif'
  ctx.fillText('Play free at kwizbox.app', left, 1150)

  return await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Could not encode the PNG'))
    }, 'image/png')
  })
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Share a PNG through the Web Share API when the platform accepts files.
 * Returns 'shared' | 'downloaded'; throws AbortError if the user cancels.
 */
export async function sharePngBlob(blob, filename, text) {
  const file = typeof File !== 'undefined'
    ? new File([blob], filename, { type: 'image/png' })
    : null

  if (file && navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: 'KwizBox Result', text })
    return 'shared'
  }
  downloadBlob(blob, filename)
  return 'downloaded'
}
