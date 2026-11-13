/**
 * Offline practice end-to-end:
 *   choose a quiz -> save a pack -> switch the browser offline -> play the
 *   saved pack -> Summary shows the device-only banner.
 *
 * The decisive checks are (a) the pack download includes answer keys, (b) no
 * quiz/auth API request is made after `context.setOffline(true)`, and (c) the
 * Summary offers no leaderboard action and stores an `offline: true` result.
 *
 * Usage: node tests/e2e-offline.mjs [baseUrl]
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://127.0.0.1:5174';

const browser = await chromium.launch({
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 } });
const page = await ctx.newPage();

const results = [];
const check = (ok, msg) => { results.push(ok); console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${msg}`); };
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));

let offlinePhase = false;
let offlinePackCalls = 0;
const offlineApiCalls = [];
page.on('request', (req) => {
  let path = '';
  try { path = new URL(req.url()).pathname; } catch { return; }
  if (path === '/quiz/offline-pack') offlinePackCalls += 1;
  if (!offlinePhase) return;
  if (/^\/quiz\/(pack|check|submit|offline-pack|challenge)/.test(path) || path.startsWith('/auth/')) {
    offlineApiCalls.push(`${req.method()} ${path}`);
  }
});

try {
  // ---------- 1. Choose a quiz (anonymous is fine for device-local practice) ----------
  await page.goto(BASE + '/choose-quiz', { waitUntil: 'load', timeout: 40000 });
  await page.waitForTimeout(1200);

  await page.locator('.section-row-btn').first().click();
  await page.waitForTimeout(400);
  await page.locator('.inline-panel .inline-chip').first().click();
  await page.waitForTimeout(500);

  const rowButtons = page.locator('.section-row-btn');
  await rowButtons.nth(1).click();
  await page.waitForTimeout(400);
  await page.locator('.inline-panel .inline-chip').first().click();
  await page.waitForTimeout(1500); // curriculum topics load + auto-select

  const card = page.locator('.offline-practice-card');
  check(await card.count() === 1, 'offline practice card rendered');

  // ---------- 2. Download a pack while online ----------
  const packResponsePromise = page.waitForResponse(
    (r) => new URL(r.url()).pathname === '/quiz/offline-pack' && r.request().method() === 'POST',
    { timeout: 30000 },
  );
  await page.getByRole('button', { name: /Save for offline/i }).click();
  const packResponse = await packResponsePromise.catch(() => null);
  check(!!packResponse && packResponse.status() === 200, `offline pack download returned 200 (got ${packResponse?.status()})`);

  let packBody = null;
  try { packBody = await packResponse.json(); } catch {}
  const packSize = Array.isArray(packBody) ? packBody.length : 0;
  check(
    packSize > 0 && Number.isInteger(packBody[0]?.answer_index),
    `downloaded pack has ${packSize} questions with answer keys`,
  );
  check(offlinePackCalls === 1, `exactly one offline-pack request (got ${offlinePackCalls})`);

  const practiseBtn = page.getByRole('button', { name: /Practise offline/i });
  await practiseBtn.waitFor({ state: 'visible', timeout: 30000 });
  check(true, 'saved pack is ready to practise');

  const summaryText = (await page.locator('.offline-pack-summary').innerText().catch(() => '')).trim();
  check(new RegExp(`${packSize} questions`).test(summaryText), `saved-pack summary shows ${packSize} questions ("${summaryText.slice(0, 80)}")`);

  // ---------- 3. Go offline and start the saved pack ----------
  await ctx.setOffline(true);
  offlinePhase = true;
  await page.waitForTimeout(800);
  const statusText = (await page.locator('.offline-practice-status').innerText().catch(() => '')).trim();
  check(/offline/i.test(statusText), `connection status switches to offline ("${statusText.slice(0, 80)}")`);

  await practiseBtn.click();
  await page.waitForURL('**/quiz?offline=true', { timeout: 15000 });
  check(true, 'offline quiz route opened');

  const quizBanner = (await page.locator('.quiz .offline-practice-banner').innerText().catch(() => '')).trim();
  check(/Offline practice/i.test(quizBanner), 'quiz shows the offline-mode banner');

  // ---------- 4. Answer the whole pack (local grading) ----------
  let answered = 0;
  for (let i = 0; i < 20; i++) {
    const opt = page.locator('button.option').first();
    await opt.waitFor({ state: 'visible', timeout: 15000 });
    await opt.click();
    answered += 1;
    await page.waitForTimeout(350);

    const next = page.locator('.next-btn');
    await next.waitFor({ state: 'visible', timeout: 15000 });
    const label = (await next.innerText()).trim();
    await next.click();
    await page.waitForTimeout(450);
    if (/See results/i.test(label)) break;
  }
  check(answered === packSize, `answered all ${packSize} questions (got ${answered})`);

  // ---------- 5. Summary is device-local ----------
  await page.waitForURL('**/summary', { timeout: 15000 });
  await page.waitForSelector('.summary-offline-banner', { timeout: 15000 }).catch(() => {});
  const banner = (await page.locator('.summary-offline-banner').innerText().catch(() => '')).trim();
  check(/Offline practice result/i.test(banner), `Summary shows the offline banner ("${banner.slice(0, 90)}")`);

  const reviewCount = await page.locator('.review').count();
  check(reviewCount === packSize, `Summary lists all ${packSize} answers (got ${reviewCount})`);

  const scoreText = (await page.locator('.big-score').innerText().catch(() => '')).trim();
  check(/\d+\s*pts/.test(scoreText), `Summary shows a score (${scoreText.split('\n')[0]})`);

  const leaderboardActions = await page.locator('.action-btn', { hasText: 'Leaderboard' }).count();
  check(leaderboardActions === 0, 'offline Summary hides the leaderboard action');

  const stored = await page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('kwizbox_last_result') || 'null'); } catch { return null; }
  });
  check(stored?.offline === true, 'stored result is marked offline');
  check(stored?.session_id === 0, 'stored result has no server session id');
  check(stored?.total === packSize, `stored result total is ${packSize} (got ${stored?.total})`);

  check(offlineApiCalls.length === 0, `no quiz/auth API calls while offline (got ${offlineApiCalls.join(', ') || 'none'})`);
  check(pageErrors.length === 0, `no uncaught page errors (${pageErrors.join(' | ') || 'none'})`);

  // Clean up the saved pack so repeated runs start fresh.
  await ctx.setOffline(false);
  await page.evaluate(async () => {
    try { localStorage.removeItem('kwizbox_offline_practice_pack'); } catch {}
    try {
      await new Promise((resolve) => {
        const req = indexedDB.deleteDatabase('kwizbox-offline-practice');
        req.onsuccess = req.onerror = req.onblocked = () => resolve();
      });
    } catch {}
    try { await caches.delete('kwizbox-offline-media'); } catch {}
  });
} catch (e) {
  check(false, `unexpected: ${e.message.split('\n')[0]}`);
}

await browser.close();
const failed = results.filter((ok) => !ok).length;
console.log(`\n  ${results.length - failed}/${results.length} checks passed`);
process.exit(failed === 0 ? 0 : 1);
