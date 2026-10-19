/**
 * Measure mascot locomotion: traverse distance, facing direction, and bob.
 *
 * Selects only the mascot wrappers — `.mascot-track > div` also matches the
 * dust-particle divs, which sit at x=0 and read as "static mascots".
 *
 * Sampling window: 40s, so a full traverse cycle (up to ~23s at the slowest
 * speed) is captured and both turnarounds are observed.
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://127.0.0.1:5174';
const WINDOW_MS = Number(process.argv[3] ?? 40000);
const browser = await chromium.launch({
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await (await browser.newContext({ viewport: { width: 412, height: 915 } })).newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));

await page.goto(BASE + '/', { waitUntil: 'load', timeout: 40000 });
await page.waitForTimeout(6000);

const rows = await page.evaluate(async (windowMs) => {
  const els = [...document.querySelectorAll('.mascot-track > div')]
    .filter(el => el.querySelector('canvas'));
  const out = [];
  for (const el of els) {
    const s = [];
    const t0 = performance.now();
    while (performance.now() - t0 < windowMs) {
      await new Promise(r => requestAnimationFrame(r));
      const r = el.getBoundingClientRect();
      const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
      s.push({ x: Math.round(r.x), a: +m.a.toFixed(3), f: Math.round(m.f) });
    }
    out.push(s);
  }
  return out;
}, WINDOW_MS);

let allOk = true;
for (let i = 0; i < rows.length; i++) {
  const s = rows[i];
  const xs = s.map(v => v.x);
  const span = Math.max(...xs) - Math.min(...xs);
  const flips = [];
  for (let k = 1; k < s.length; k++) {
    const prev = Math.sign(s[k - 1].a) || 1, cur = Math.sign(s[k].a) || 1;
    if (prev !== cur) flips.push(s[k].x);
  }
  const bob = Math.max(...s.map(v => v.f)) - Math.min(...s.map(v => v.f));
  const ok = span > 250 && flips.length >= 2 && bob >= 2 && bob <= 8;
  if (!ok) allOk = false;
  console.log(`mascot[${i}]`);
  console.log(`  traverse span : ${span}px   ${span > 250 ? 'OK' : 'TOO SHORT'}`);
  console.log(`  facing flips  : ${flips.length}  ${flips.length >= 2 ? 'OK' : 'NO DIRECTION'}`);
  console.log(`  bob amplitude : ${bob}px   ${bob >= 2 && bob <= 8 ? 'OK (walk, not hop)' : 'BAD'}`);
  console.log(`  x range       : ${Math.min(...xs)} .. ${Math.max(...xs)}`);
  console.log('');
}
console.log(allOk ? 'RESULT: both mascots traverse, turn both ways, and bob like walking'
                  : 'RESULT: locomotion still wrong');
console.log('errors:', errs.length ? errs.slice(0, 4) : '(none)');
await browser.close();
process.exit(allOk && errs.length === 0 ? 0 : 1);
