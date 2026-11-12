/**
 * Group D end-to-end: live duel room.
 *
 * Two isolated browser contexts register, create/join the same challenge code,
 * and must see each other in the lobby and inside the quiz. While player B
 * answers, player A's rival strip advances; when B finishes, A sees the finish.
 * Scores themselves stay server-authoritative (challenge submit) — this test
 * only asserts the display relay.
 *
 * Run against the live dev stack:
 *   node tests/e2e-duel.mjs http://localhost:5174
 */
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://localhost:5174'
const STAMP = Date.now().toString(36)
const NICK_A = `e2e_duel_a_${STAMP}`
const NICK_B = `e2e_duel_b_${STAMP}`

const browser = await chromium.launch({
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
})
const results = []
const check = (ok, msg) => { results.push(ok); console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${msg}`) }

const errors = { A: [], B: [] }

async function newPlayer(nickname, key) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 } })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors[key].push(e.message))
  await page.goto(BASE + '/', { waitUntil: 'load', timeout: 40000 })
  await page.waitForTimeout(1200)
  await page.getByRole('button', { name: 'Sign up' }).click()
  await page.waitForTimeout(600)
  await page.locator('.popup-panel label', { hasText: 'Nickname' }).locator('input').fill(nickname)
  await page.locator('.popup-panel input[type="password"]').fill('secret123')
  const sel = page.locator('.popup-panel select')
  await sel.nth(0).selectOption('B7')
  await sel.nth(1).selectOption('13')
  await page.locator('.sex-chip', { hasText: /^Male$/ }).click()
  await page.locator('.popup-panel button[type="submit"]').click()
  await page.waitForURL('**/play', { timeout: 20000 })
  return { ctx, page }
}

const state = (page, selector) => page.locator(selector).innerText()
const includes = async (page, selector, text) =>
  (await state(page, selector)).includes(text)

try {
  const A = await newPlayer(NICK_A, 'A')
  const B = await newPlayer(NICK_B, 'B')
  check(true, `registered ${NICK_A} and ${NICK_B}`)

  // ---------- Creator opens the room ----------
  await A.page.goto(BASE + '/challenge', { waitUntil: 'load', timeout: 30000 })
  await A.page.getByRole('button', { name: /🎯 Create challenge/ }).click()
  await A.page.waitForSelector('.code-big', { timeout: 20000 })
  const code = (await A.page.locator('.code-big').innerText()).trim()
  check(/^[A-Z0-9]{6}$/.test(code), `created challenge ${code}`)

  await A.page.waitForSelector('.duel-lobby .duel-dot.open', { timeout: 20000 })
  check(true, 'creator duel room is live')
  check(await includes(A.page, '.duel-lobby', 'Waiting for your friend'), 'lobby waits for a friend')

  // ---------- Joiner enters the room ----------
  await B.page.goto(BASE + '/challenge', { waitUntil: 'load', timeout: 30000 })
  await B.page.getByRole('button', { name: 'Join challenge' }).click()
  await B.page.locator('input[placeholder="e.g. A1B2C3"]').fill(code)
  await B.page.getByRole('button', { name: /🎮 Join challenge/ }).click()
  await B.page.waitForSelector('.duel-lobby .duel-dot.open', { timeout: 20000 })
  check(await includes(B.page, '.duel-lobby', NICK_A), 'joiner sees the creator in the lobby')

  await A.page.waitForFunction(
    (name) => document.querySelector('.duel-lobby')?.textContent.includes(name),
    NICK_B, { timeout: 20000 },
  )
  check(true, 'creator sees the joiner arrive live')
  const avatars = await A.page.locator('.duel-avatar').count()
  check(avatars >= 2, `lobby shows ${avatars} player avatars`)

  // ---------- Both start the quiz ----------
  await B.page.getByRole('button', { name: /▶ Start my quiz/ }).click()
  await B.page.waitForURL('**/quiz?challenge=**', { timeout: 20000 })
  await A.page.getByRole('button', { name: /Load my questions/ }).click()
  await A.page.getByRole('button', { name: /▶ Start my quiz/ }).click()
  await A.page.waitForURL('**/quiz?challenge=**', { timeout: 20000 })

  await A.page.waitForSelector('.duel-strip', { timeout: 20000 })
  await B.page.waitForSelector('.duel-strip', { timeout: 20000 })
  check(true, 'both players are in the in-quiz duel strip')

  await A.page.waitForFunction(
    (name) => document.querySelector('.duel-strip')?.textContent.includes(name),
    NICK_B, { timeout: 20000 },
  )
  await B.page.waitForFunction(
    (name) => document.querySelector('.duel-strip')?.textContent.includes(name),
    NICK_A, { timeout: 20000 },
  )
  check(true, 'each player sees the rival nickname')

  // ---------- B answers question 1; A's strip must advance ----------
  await B.page.locator('.option').first().click()
  await B.page.waitForSelector('.next-btn', { timeout: 15000 })
  await B.page.locator('.next-btn').click()
  await A.page.waitForFunction(
    () => /(^|\D)1\/12/.test(document.querySelector('.duel-strip')?.textContent || ''),
    { timeout: 20000 },
  )
  check(true, "creator's rival strip advanced to 1/12")

  // ---------- B finishes all 12 ----------
  for (let i = 2; i <= 12; i++) {
    await B.page.locator('.option').first().click()
    await B.page.waitForSelector('.next-btn', { timeout: 15000 })
    await B.page.locator('.next-btn').click()
    await B.page.waitForTimeout(120)
  }
  await B.page.waitForURL('**/summary', { timeout: 25000 })
  check(true, 'joiner finished the quiz and reached Summary')

  await A.page.waitForFunction(
    () => /Finished/.test(document.querySelector('.duel-strip')?.textContent || ''),
    { timeout: 25000 },
  )
  const finishedText = await state(A.page, '.duel-strip')
  check(/Finished\s*·\s*\d+\/12/.test(finishedText),
    `creator sees rival finish (${finishedText.replace(/\s+/g, ' ').trim()})`)

  const fatal = [...errors.A, ...errors.B].filter((e) => /Invalid hook call|is not a function|Cannot read|is not defined/.test(e))
  check(fatal.length === 0, `no fatal page errors (${errors.A.length + errors.B.length} total)`)

  console.log('')
  console.log('pageerrors:', errors.A.length + errors.B.length
    ? { A: errors.A.slice(0, 3), B: errors.B.slice(0, 3) }
    : '(none)')
  console.log(`challenge: ${code}`)
} catch (e) {
  check(false, 'EXCEPTION: ' + e.message.split('\n')[0])
  console.log('')
  console.log('pageerrors:', { A: errors.A.slice(0, 5), B: errors.B.slice(0, 5) })
}

await browser.close()
const passed = results.filter(Boolean).length
console.log(`${passed}/${results.length} checks passed`)
process.exit(results.every(Boolean) ? 0 : 1)
