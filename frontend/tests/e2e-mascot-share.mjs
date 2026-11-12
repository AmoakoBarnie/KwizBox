/**
 * Group C end-to-end: mascot animation playback, 3D/2D style preference,
 * gender picker persistence, and the PNG share card in Summary.
 *
 * Run against the live dev stack:
 *   node tests/e2e-mascot-share.mjs http://localhost:5174
 */
import { chromium } from 'playwright'
import { readFile } from 'node:fs/promises'

const BASE = process.argv[2] ?? 'http://localhost:5174'
const NICK = `e2e_mascot_${Date.now().toString(36)}`
const browser = await chromium.launch({
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
})
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 } })
const page = await ctx.newPage()
const pageErrors = []
page.on('pageerror', (e) => pageErrors.push(e.message))

const results = []
const check = (ok, msg) => { results.push(ok); console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${msg}`) }

try {
  // ---------- Register ----------
  await page.goto(BASE + '/', { waitUntil: 'load', timeout: 40000 })
  await page.waitForTimeout(1200)
  await page.getByRole('button', { name: 'Sign up' }).click()
  await page.waitForTimeout(600)
  await page.locator('.popup-panel label', { hasText: 'Nickname' }).locator('input').fill(NICK)
  await page.locator('.popup-panel input[type="password"]').fill('secret123')
  const sel = page.locator('.popup-panel select')
  await sel.nth(0).selectOption('B7')
  await sel.nth(1).selectOption('13')
  await page.locator('.sex-chip', { hasText: /^Male$/ }).click()
  await page.locator('.popup-panel button[type="submit"]').click()
  await page.waitForURL('**/play', { timeout: 20000 })
  check(true, `registered ${NICK}`)

  // ---------- 1. 3D mascot loads and plays a real clip ----------
  await page.goto(BASE + '/profile', { waitUntil: 'load', timeout: 30000 })
  await page.waitForSelector('.mascot-3d[data-anim]', { timeout: 30000 })
  const idleClip = await page.locator('.mascot-3d[data-anim]').first().getAttribute('data-anim')
  check(/idle/i.test(idleClip || ''), `3D idle clip resolved (${idleClip})`)

  // ---------- 2. 2D style toggle persists ----------
  await page.getByRole('button', { name: /2D/ }).click()
  await page.waitForTimeout(500)
  check(await page.locator('.mascot-2d').count() > 0, 'switching to 2D renders the SVG mascot')
  check(await page.locator('.mascot-3d').count() === 0, '3D canvases unmounted in 2D mode')
  const storedStyle = await page.evaluate(() => localStorage.getItem('kwiz_mascot_style'))
  check(storedStyle === '2d', `kwiz_mascot_style persisted (${storedStyle})`)

  await page.reload({ waitUntil: 'load' })
  await page.waitForTimeout(1200)
  check(await page.locator('.mascot-2d').count() > 0, '2D style survives reload')

  // ---------- 3. Back to 3D + gender picker ----------
  await page.getByRole('button', { name: /3D/ }).click()
  await page.waitForSelector('.mascot-3d[data-anim]', { timeout: 30000 })
  check(true, 'switched back to 3D and a clip is playing')

  const patchPromise = page.waitForResponse(
    (r) => r.url().includes('/auth/me/avatar') && r.request().method() === 'PATCH',
    { timeout: 15000 },
  )
  await page.getByRole('button', { name: /Girl/ }).click()
  const patchRes = await patchPromise.catch(() => null)
  check(patchRes?.status() === 200, `gender PATCH returned ${patchRes?.status()}`)

  const me = await page.evaluate(async () => {
    const r = await fetch('/auth/me', { credentials: 'include' })
    return r.json()
  })
  check(me?.avatar?.gender === 'female', `server persisted gender=female (got ${me?.avatar?.gender})`)

  await page.reload({ waitUntil: 'load' })
  await page.waitForSelector('.mascot-3d[data-model="female"]', { timeout: 30000 })
  check(true, 'reloaded profile uses the female 3D model')

  // ---------- 4. Summary PNG share card ----------
  // Seed a deterministic stored result (the Summary reads localStorage on a
  // direct navigation) so the test does not depend on quiz timing.
  await page.evaluate(() => {
    localStorage.setItem('kwizbox_last_result', JSON.stringify({
      total: 10, correct: 7, accuracy: 0.7, score: 88,
      streak: 4, best_streak: 5, daily_streak: 2,
      feedback: [],
    }))
    localStorage.setItem('kwizbox_last_cfg', JSON.stringify({ class_level: 'B7', subject: 'Science' }))
  })
  await page.goto(BASE + '/summary', { waitUntil: 'load', timeout: 30000 })
  await page.waitForSelector('.share-btn', { timeout: 15000 })
  check(true, 'summary rendered from stored result')

  // Walking mascot on the summary uses the bare `walk` clip.
  await page.waitForSelector('.mascot-3d[data-anim]', { timeout: 30000 })
  const walkClip = await page.locator('.mascot-3d[data-anim]').first().getAttribute('data-anim')
  check(walkClip === 'walk', `summary walking clip resolved (${walkClip})`)

  await page.locator('.share-btn').click()
  await page.waitForSelector('.share-modal', { timeout: 10000 })

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 30000 }),
    page.getByRole('button', { name: /Save PNG/ }).click(),
  ])
  const filename = download.suggestedFilename()
  check(/^kwizbox-.*\.png$/.test(filename), `download filename (${filename})`)

  const path = await download.path()
  const bytes = await readFile(path)
  const isPng = bytes.length > 8
    && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
  check(isPng, `downloaded file is a PNG (${bytes.length} bytes)`)
  // IHDR: width/height are big-endian uint32 at offsets 16 and 20.
  const width = bytes.readUInt32BE(16)
  const height = bytes.readUInt32BE(20)
  check(width === 1080 && height === 1350, `PNG dimensions ${width}×${height}`)
  check(bytes.length > 20000, 'PNG has real content (>20 kB)')

  // ---------- 5. Share image falls back to a download when File Share is absent ----------
  const [download2] = await Promise.all([
    page.waitForEvent('download', { timeout: 30000 }),
    page.getByRole('button', { name: /Share Image/ }).click(),
  ])
  const bytes2 = await readFile(await download2.path())
  check(bytes2.length > 20000 && bytes2[0] === 0x89, 'Share Image fallback produced a PNG')

  const fatal = pageErrors.filter((e) => /Invalid hook call|is not a function|Cannot read|is not defined/.test(e))
  check(fatal.length === 0, `no fatal page errors (${pageErrors.length} total)`)

  console.log('')
  console.log('pageerrors:', pageErrors.length ? pageErrors.slice(0, 5) : '(none)')
} catch (e) {
  check(false, 'EXCEPTION: ' + e.message.split('\n')[0])
  console.log('')
  console.log('pageerrors:', pageErrors.slice(0, 5))
}

console.log(`\nnickname used: ${NICK}`)
await browser.close()
const passed = results.filter(Boolean).length
console.log(`${passed}/${results.length} checks passed`)
process.exit(results.every(Boolean) ? 0 : 1)
