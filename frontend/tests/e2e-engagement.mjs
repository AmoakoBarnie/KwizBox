/**
 * Engagement end-to-end (Groups A/B UI): register -> play a quiz -> summary
 * streak stats -> profile XP/league/streak-calendar -> avatar save persistence
 * -> leaderboard Schools tab.
 *
 * Drives the real UI in headless Chromium through the Vite dev server
 * (default http://localhost:5174, proxying API calls to the backend).
 *
 * Requires the dev DB to contain at least one school with monthly points for
 * the Schools-tab assertion (Test School JHS / GH-4IBZ0P from the BUG-009
 * verification runs); the check degrades to "board renders" if absent.
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://127.0.0.1:5174';
const API = process.env.KWIZBOX_API_URL ?? 'http://127.0.0.1:8001';
const NICK = `e2e_eng_${Date.now().toString(36)}`;
const browser = await chromium.launch({
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 } });
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));

const results = [];
const check = (ok, msg) => { results.push(ok); console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${msg}`); };

try {
  // ---------- 1. Register via the real sign-up form ----------
  await page.goto(BASE + '/', { waitUntil: 'load', timeout: 40000 });
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: 'Sign up' }).click();
  await page.waitForTimeout(700);

  await page.locator('.popup-panel label', { hasText: 'Nickname' }).locator('input').fill(NICK);
  await page.locator('.popup-panel input[type="password"]').fill('secret123');
  const sel = page.locator('.popup-panel select');
  await sel.nth(0).selectOption('B7');
  await sel.nth(1).selectOption('13');
  await page.locator('.sex-chip', { hasText: /^Male$/ }).click();
  await page.locator('.popup-panel button[type="submit"]').click();
  await page.waitForURL('**/play', { timeout: 20000 });
  check(true, `registered new user ${NICK} -> /play`);

  // ---------- 2. Play a quiz through the chooser ----------
  await page.goto(BASE + '/choose-quiz', { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(1200);
  await page.locator('.section-row-btn').first().click();
  await page.waitForTimeout(600);
  const classChips = page.locator('.inline-panel .inline-chip');
  if (await classChips.count() > 0) { await classChips.first().click(); await page.waitForTimeout(600); }
  const rowButtons = page.locator('.section-row-btn');
  if (await rowButtons.count() > 1) { await rowButtons.nth(1).click(); await page.waitForTimeout(600); }
  const subjectChips = page.locator('.inline-panel .inline-chip');
  if (await subjectChips.count() > 0) { await subjectChips.first().click(); await page.waitForTimeout(600); }
  await page.locator('.start-btn').click();
  await page.waitForURL('**/quiz**', { timeout: 20000 });
  check(true, 'quiz started');

  let answered = 0;
  for (let i = 0; i < 14; i++) {
    const opt = page.locator('button.option').first();
    if (await opt.count() === 0) {
      await page.waitForTimeout(1200);
      if (await opt.count() === 0) break;
    }
    await opt.click();
    answered += 1;
    await page.waitForTimeout(1200);
    const next = page.locator('.next-btn');
    if (await next.count() > 0 && await next.first().isVisible()) {
      const label = (await next.first().innerText()).trim();
      await next.first().click();
      await page.waitForTimeout(1100);
      if (/See results/i.test(label)) break;
    }
  }
  check(answered > 0, `answered ${answered} question(s)`);

  await page.waitForSelector('.summary-grid, .big-score', { timeout: 20000 }).catch(() => {});
  const onSummary = (await page.locator('.summary-grid, .big-score').count()) > 0;
  check(onSummary, 'summary rendered after submit');

  if (onSummary) {
    // Best-streak stat card (now fed by the server-computed best_streak)
    const bestCard = page.locator('.stat-card', { hasText: 'Best streak' });
    const bestVal = (await bestCard.locator('.stat-card-value').innerText().catch(() => '')).trim();
    check(/^\d+$/.test(bestVal), `Best streak stat shows a number (${bestVal || 'missing'})`);
    // Day-streak chip (result.daily_streak >= 1 on the first session today)
    const dayChip = await page.locator('.daily-badge', { hasText: 'day streak' }).count();
    check(dayChip > 0, 'day-streak chip rendered on summary');
  }

  // ---------- 3. Profile: XP level bar, league chip, streak calendar ----------
  await page.goto(BASE + '/profile', { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(1800);

  const xpBar = await page.locator('.xp-bar').count();
  const xpLabel = xpBar ? (await page.locator('.xp-bar-label').innerText()).trim() : '';
  check(xpBar > 0, `XP level bar rendered (${xpLabel})`);

  const leagueChip = await page.locator('.league-chip').count();
  const leagueTxt = leagueChip ? (await page.locator('.league-chip').innerText()).trim() : '';
  check(leagueChip > 0, `league chip rendered (${leagueTxt})`);

  const heatCells = await page.locator('.heat-grid .heat-cell').count();
  check(heatCells === 56, `streak calendar renders 56 day cells (got ${heatCells})`);
  const litCells = await page.locator('.heat-grid .heat-cell.h1, .heat-grid .heat-cell.h2, .heat-grid .heat-cell.h3').count();
  check(litCells > 0, `streak calendar shows today's activity (${litCells} lit cells)`);

  const badgeText = await page.locator('.badge-grid').innerText().catch(() => '');
  check(badgeText.includes('Unstoppable') && badgeText.includes('Daily Devotee') && badgeText.includes('Kwiz Master'),
        'new engagement badges appear in the badge catalog');

  // ---------- 4. Avatar save persists (BUG: invalid hook call + stale state) ----------
  const patchPromise = page.waitForResponse(
    (r) => r.url().includes('/auth/me/avatar') && r.request().method() === 'PATCH',
    { timeout: 15000 },
  );
  await page.locator('.avatar-swatch-btn[title="Deep"]').click();
  const patchRes = await patchPromise.catch(() => null);
  check(!!patchRes && patchRes.status() === 200, `avatar PATCH fired and returned 200 (got ${patchRes?.status()})`);

  const meAfterSave = await page.evaluate(async () => {
    const r = await fetch('/auth/me', { credentials: 'include' });
    return r.json();
  });
  check(meAfterSave?.avatar?.skin === 'deep', `server persisted skin=deep (got ${meAfterSave?.avatar?.skin})`);

  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1600);
  const selectedTitle = await page.locator('.avatar-swatch-btn.selected').getAttribute('title').catch(() => '');
  check(selectedTitle === 'Deep', `reload shows the saved skin selected (got "${selectedTitle}")`);

  // ---------- 5. Leaderboard: 5 tabs + Schools competition tab ----------
  await page.goto(BASE + '/leaderboard', { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(1400);
  const tabCount = await page.locator('.tabs .tab').count();
  check(tabCount === 5, `leaderboard has 5 tabs (got ${tabCount})`);

  await page.locator('.tab', { hasText: 'Schools' }).click();
  await page.waitForTimeout(1500);
  const schoolRows = await page.locator('.board-row').count();
  const schoolText = await page.locator('.board').innerText().catch(() => '');
  check(schoolRows > 0 || /No school scores yet/.test(schoolText),
        `Schools tab renders a board (${schoolRows} rows)`);
  if (schoolRows > 0) {
    check(/Test School JHS|player/.test(schoolText), 'school row shows a school name + player count');
  }

  // ---------- 6. No fatal UI errors anywhere ----------
  const fatal = pageErrors.filter((e) => /Invalid hook call|is not a function|Cannot read|is not defined/.test(e));
  check(fatal.length === 0, `no fatal page errors (${pageErrors.length} total pageerrors)`);

  console.log('');
  console.log('pageerrors:', pageErrors.length ? pageErrors.slice(0, 5) : '(none)');
} catch (e) {
  check(false, 'EXCEPTION: ' + e.message.split('\n')[0]);
  console.log('');
  console.log('pageerrors:', pageErrors.slice(0, 5));
}

console.log(`\nnickname used: ${NICK}`);
await browser.close();
const passed = results.filter(Boolean).length;
console.log(`${passed}/${results.length} checks passed`);
process.exit(results.every(Boolean) ? 0 : 1);
