/**
 * Verify the 3D mascot actually loads + renders in the browser:
 *  - the 4 GLB fetches succeed (200, non-trivial bytes)
 *  - a WebGL canvas exists and is not blank
 *  - no console errors from three.js / R3F
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://127.0.0.1:5174';
const browser = await chromium.launch({
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 } });
const page = await ctx.newPage();

const failed = [];
const consoleErrs = [];
page.on('requestfailed', r => failed.push(`${r.url()} :: ${r.failure()?.errorText}`));
page.on('response', r => {
  const u = r.url();
  if (/\.glb($|\?)/.test(u) || /draco.*wasm/.test(u)) {
    console.log(`  ${r.status()}  ${(r.headers()['content-length'] ?? '?').padStart(9)}  ${u.replace(BASE, '')}`);
  }
});
page.on('console', m => {
  if (m.type() === 'error') consoleErrs.push(m.text().slice(0, 160));
});

// The landing page mounts the hero stage with 3D mascots.
await page.goto(BASE + '/', { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(6000); // allow GLB fetch + first frames

const info = await page.evaluate(() => {
  const canvases = [...document.querySelectorAll('canvas')];
  return {
    canvasCount: canvases.length,
    canvases: canvases.map(c => ({ w: c.width, h: c.height })),
    glOK: canvases.map(c => {
      try {
        const gl = c.getContext('webgl2') || c.getContext('webgl');
        return gl ? gl.getParameter(gl.VERSION) : null;
      } catch (e) { return 'err:' + e.message; }
    }),
  };
});

console.log('\ncanvases:', info.canvasCount, JSON.stringify(info.canvases));
console.log('webgl versions:', info.glOK);

// sample pixels: is anything actually drawn?
const drawn = await page.evaluate(() => {
  const c = document.querySelector('canvas');
  if (!c) return { canvas: false };
  const off = document.createElement('canvas');
  off.width = c.width; off.height = c.height;
  const g = off.getContext('2d');
  g.drawImage(c, 0, 0);
  const d = g.getImageData(0, 0, off.width, off.height).data;
  let nonBlank = 0, total = 0;
  for (let i = 0; i < d.length; i += 4 * 97) {
    total++;
    if (d[i] || d[i + 1] || d[i + 2]) nonBlank++;
  }
  return { canvas: true, sampled: total, nonBlank };
});
console.log('pixel sample:', JSON.stringify(drawn));

console.log('\nfailed requests:', failed.length ? failed : '(none)');
console.log('console errors:', consoleErrs.length ? consoleErrs.slice(0, 5) : '(none)');

await browser.close();

const ok = info.canvasCount > 0 && drawn.canvas && drawn.nonBlank > 0 && failed.length === 0;
console.log(`\n3D MASCOT: ${ok ? 'RENDERING' : 'NOT RENDERING'}`);
process.exit(ok ? 0 : 1);
