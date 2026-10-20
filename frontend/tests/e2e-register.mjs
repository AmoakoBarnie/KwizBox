/**
 * End-to-end: register with age + sex, verify the profile, then play a quiz.
 *
 * Drives the real UI in headless Chromium through the Vite dev server.
 *
 * NOTE: the tab buttons are `type="submit"`, so role-based lookups by name are
 * ambiguous — always scope the submit button to `.popup-panel form`.
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://127.0.0.1:5174';
const NICK = `e2e_${Date.now().toString(36)}`;
const browser = await chromium.launch({
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));

const results = [];
const check = (ok, msg) => { results.push(ok); console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${msg}`); };

try {
  await page.goto(BASE + '/', { waitUntil: 'load', timeout: 40000 });
  await page.waitForTimeout(1500);
  check(true, 'landing page loaded');

  // ---------- SIGN UP ----------
  await page.getByRole('button', { name: 'Sign up' }).click();
  await page.waitForTimeout(700);

  const sexLabels = await page.locator('.sex-chip').allInnerTexts();
  check(sexLabels.length === 3 && sexLabels.join(',').includes('Male'),
        `sex chips: ${sexLabels.join(' / ')}`);

  const selects = page.locator('.popup-panel select');
  const optCounts = await selects.evaluateAll(ss => ss.map(s => s.options.length));
  check(optCounts.length >= 2, `class + age selects (${optCounts.join(',')} options)`);

  await page.locator('.popup-panel label', { hasText: 'Nickname' }).locator('input').fill(NICK);
  await page.locator('.popup-panel input[type="password"]').fill('secret123');
  await selects.nth(0).selectOption('B7');
  await selects.nth(1).selectOption('13');
  await page.locator('.sex-chip', { hasText: /^Female$/ }).click();

  check(await page.locator('.popup-panel form').evaluate(f => f.checkValidity()), 'form valid');

  await page.locator('.popup-panel button[type="submit"]').click();
  await page.waitForURL('**/play', { timeout: 20000 });
  check(true, 'registered -> /play');

  const greeting = await page.locator('.hi').first().innerText().catch(() => '');
  check(greeting.includes(NICK), `greeting shows "${greeting.trim()}"`);

  const me = await page.evaluate(async () => {
    const keys = Object.keys(localStorage);
    const tok = keys.map(k => localStorage.getItem(k)).find(v => v && v.length > 60);
    if (!tok) return { err: 'no token in localStorage' };
    const r = await fetch('/auth/me', { headers: { Authorization: `Bearer ${tok}` } });
    return { status: r.status, body: await r.json() };
  });
  if (me.err) check(false, me.err);
  else {
    check(me.status === 200, '/auth/me 200');
    check(me.body.age === 13, `age persisted: ${me.body.age}`);
    check(me.body.gender === 'female', `gender persisted: ${me.body.gender}`);
  }

  // ---------- PLAY A QUIZ ----------
  await page.goto(BASE + '/choose-quiz', { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(1500);
  const rows = await page.locator('.section-row-btn').count();
  check(rows > 0, `quiz chooser shows ${rows} section rows`);

  // pick a class, then a subject, then start
  await page.locator('.section-row-btn').first().click();
  await page.waitForTimeout(700);
  const classChips = page.locator('.inline-panel .inline-chip');
  if (await classChips.count() > 0) {
    await classChips.first().click();
    await page.waitForTimeout(700);
  }
  const rowButtons = page.locator('.section-row-btn');
  const n = await rowButtons.count();
  if (n > 1) { await rowButtons.nth(1).click(); await page.waitForTimeout(700); }
  const subjectChips = page.locator('.inline-panel .inline-chip');
  if (await subjectChips.count() > 0) {
    await subjectChips.first().click();
    await page.waitForTimeout(700);
  }
  const startBtn = page.locator('.start-btn');
  const canStart = await startBtn.isEnabled();
  check(canStart, 'start button enabled after choosing class + subject');

  await startBtn.click();
  await page.waitForURL('**/quiz**', { timeout: 20000 });
  check(true, `quiz started (url: ${new URL(page.url()).pathname})`);

  const onQuiz = page.url().includes('/quiz') || await page.locator('.question').count() > 0;
  check(onQuiz, 'quiz question rendered');

  if (onQuiz) {
    // Answer questions until the summary appears (cap at 12 to avoid a runaway).
    let answered = 0;
    for (let i = 0; i < 12; i++) {
      // Options are buttons; wait for one rather than counting immediately.
      const opt = page.locator('button.option').first();
      if (await opt.count() === 0) {
        await page.waitForTimeout(1500);
        if (await opt.count() === 0) break;
      }
      await opt.click();
      answered++;
      await page.waitForTimeout(1600);

      const next = page.locator('.next-btn');
      if (await next.count() > 0 && await next.first().isVisible()) {
        const label = (await next.first().innerText()).trim();
        await next.first().click();
        await page.waitForTimeout(1400);
        if (/See results/i.test(label)) break;
      }
    }
    check(answered > 0, `answered ${answered} question(s)`);

    const summary = await page.locator('.summary-grid, .big-score, .summary-top').count();
    check(summary > 0, `quiz summary rendered (${summary} elements)`);
  }

  console.log('');
  console.log('errors:', errs.length ? errs.slice(0, 4) : '(none)');
} catch (e) {
  check(false, e.message);
  console.log('');
  console.log('errors:', errs.length ? errs.slice(0, 4) : '(none)');
}

console.log(`\nnickname used: ${NICK}`);
await browser.close();
process.exit(results.every(Boolean) ? 0 : 1);
