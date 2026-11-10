/**
 * Capture promo screenshots of KwizBox in both dark and light themes.
 *
 * Theme is driven the same way the app does it: set localStorage `stem_mode`
 * before load, and set the `data-mode` attribute on <html>.
 *
 * Usage: node tests/promo-shots.mjs [baseUrl] [outDir]
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.argv[2] ?? 'http://127.0.0.1:5174';
const OUT = process.argv[3] ?? join(process.env.HOME ?? '/tmp', '.hermes', 'cache', 'scratch', 'promo');
mkdirSync(OUT, { recursive: true });

// Which screens to shoot. `login` pages get a registered user first.
const SCREENS = [
  { slug: '01-landing',   path: '/',              full: false, tall: true },
  { slug: '02-choose',    path: '/choose-quiz',   full: false, tall: true },
  { slug: '03-quiz',      path: '/quiz?class_level=B7&subject=Science', full: false, tall: true, login: true },
  { slug: '04-summary',   path: '/summary',       full: false, tall: true, login: true },
  { slug: '05-leaderboard', path: '/leaderboard', full: false, tall: true },
];

const browser = await chromium.launch({
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});

const shots = [];

for (const theme of ['dark', 'light']) {
  const ctx = await browser.newContext({
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2, // retina-quality for the promo video
    colorScheme: theme,
  });
  // Seed the theme BEFORE any page loads so there is no flash of the wrong one.
  await ctx.addInitScript((mode) => {
    try { localStorage.setItem('stem_mode', mode); } catch {}
    document.documentElement.setAttribute('data-mode', mode);
  }, theme);

  const page = await ctx.newPage();

  for (const s of SCREENS) {
    // Register once when a screen needs an authenticated user. The landing page
    // shows a greeting instead of the tabs when a user is already signed in, so
    // only register if the tabs are actually present.
    if (s.login) {
      await page.goto(BASE + '/', { waitUntil: 'load', timeout: 40000 });
      await page.waitForTimeout(1500);
      if (await page.getByRole('button', { name: 'Sign up' }).count() > 0) {
        const nick = `promo_${theme}_${Date.now().toString(36)}`;
        await page.getByRole('button', { name: 'Sign up' }).click();
        await page.waitForTimeout(700);
        const sels = page.locator('.popup-panel select');
        await page.locator('.popup-panel label', { hasText: 'Nickname' }).locator('input').fill(nick);
        await page.locator('.popup-panel input[type="password"]').fill('secret123');
        await sels.nth(0).selectOption('B7');
        await sels.nth(1).selectOption('13');
        await page.locator('.popup-panel button[type="submit"]').click();
        await page.waitForURL('**/play', { timeout: 20000 });
      }
    }

    await page.goto(BASE + s.path, { waitUntil: 'load', timeout: 40000 });
    await page.waitForTimeout(2600); // let the mascots mount + animate

    // Confirm the theme actually applied, and report it.
    const mode = await page.evaluate(() => document.documentElement.getAttribute('data-mode'));

    // Centre the hero stage for the landing shot.
    if (s.path === '/') {
      await page.evaluate(() => document.querySelector('.hero-stage')?.scrollIntoView({ block: 'center' }));
      await page.waitForTimeout(1200);
    }

    const file = join(OUT, `${s.slug}-${theme}.png`);
    await page.screenshot({ path: file, fullPage: s.full });
    const { statSync } = await import('node:fs');
    shots.push({ file, theme, mode, kb: (statSync(file).size / 1024).toFixed(0) });
    console.log(`  ${s.slug}-${theme}.png   data-mode=${mode}  ${shots.at(-1).kb} KB`);
  }

  await ctx.close();
}

await browser.close();

console.log('');
console.log(`captured ${shots.length} screenshots in ${OUT}`);
// Report the lightest and darkest so it is obvious both themes rendered.
const bad = shots.filter((s) => s.mode !== s.theme);
if (bad.length) {
  console.log(`WARNING: ${bad.length} shot(s) had the wrong data-mode: ${bad.map((b) => b.file).join(', ')}`);
}
console.log('');
for (const s of shots) console.log(`MEDIA:${s.file}`);
