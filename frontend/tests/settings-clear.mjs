/**
 * Settings → Data → Clear Cache must remove the real local keys and the
 * offline practice pack (BUG-020 regression guard).
 *
 * Creates a guest session (so /settings is reachable), seeds every storage
 * value the app really writes, clicks the button, then checks the browser.
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://localhost:5174';
const KEYS = [
  'kwizbox_badges',
  'kwizbox_last_result',
  'kwizbox_last_cfg',
  'stem_mode',
  'app_mode',
  'stem_mute',
  // Legacy keys written by older builds.
  'stem_theme',
  'stem_sound',
  // localStorage fallback for the offline pack.
  'kwizbox_offline_practice_pack',
];

const browser = await chromium.launch({ args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 } });
const page = await ctx.newPage();
const results = [];
const check = (ok, msg) => { results.push(ok); console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${msg}`); };

try {
  await page.goto(BASE + '/', { waitUntil: 'load', timeout: 40000 });
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: 'Play as Guest' }).click();
  await page.waitForTimeout(700);
  await page.locator('.popup-panel label', { hasText: 'Nickname' }).locator('input').fill('ClearCacheE2E');
  const sel = page.locator('.popup-panel select');
  await sel.nth(0).selectOption('B6');
  await sel.nth(1).selectOption('11');
  await page.locator('.sex-chip', { hasText: /^Male$/ }).click();
  await page.locator('.popup-panel button[type="submit"]').click();
  await page.waitForURL('**/play', { timeout: 20000 });
  check(true, 'guest session created');

  await page.evaluate(async (keys) => {
    for (const key of keys) localStorage.setItem(key, 'seeded');
    // Real offline pack in IndexedDB.
    await new Promise((resolve, reject) => {
      const request = indexedDB.open('kwizbox-offline-practice', 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('packs')) db.createObjectStore('packs');
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('packs', 'readwrite');
        tx.objectStore('packs').put({ questions: [{ id: 1 }] }, 'active');
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
      };
    });
    // Media cache entry.
    const cache = await caches.open('kwizbox-offline-media');
    await cache.put('/seeded.png', new Response('x'));
  }, KEYS);
  check(true, 'seeded 9 localStorage keys + IndexedDB pack + media cache');

  await page.goto(BASE + '/settings', { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: 'Data', exact: true }).click();
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: 'Clear Cache', exact: true }).click();
  await page.waitForTimeout(1500);

  const toast = await page.getByText('Local data cleared', { exact: true }).first().textContent().catch(() => '');
  check(/Local data cleared/i.test(toast || ''), `success toast shown (got: ${(toast || '').trim() || 'none'})`);

  const after = await page.evaluate(async (keys) => {
    const remaining = keys.filter((key) => localStorage.getItem(key) !== null);
    const idbValue = await new Promise((resolve, reject) => {
      const request = indexedDB.open('kwizbox-offline-practice', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('packs', 'readonly');
        const get = tx.objectStore('packs').get('active');
        get.onsuccess = () => resolve(get.result ?? null);
        get.onerror = () => reject(get.error);
        tx.oncomplete = () => db.close();
      };
    });
    return { remaining, idbValue, media: await caches.has('kwizbox-offline-media') };
  }, KEYS);

  check(after.remaining.length === 0, `all localStorage keys cleared (remaining: ${after.remaining.join(', ') || 'none'})`);
  check(after.idbValue === null, 'offline pack removed from IndexedDB');
  check(after.media === false, 'offline media cache deleted');
} catch (e) {
  check(false, e.message);
}

await browser.close();
process.exit(results.every(Boolean) ? 0 : 1);
