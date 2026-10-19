/**
 * Verify the mascot walk animation actually PLAYS in the browser.
 *
 * Two rules that make or break this test:
 *
 *  1. Hash pixel CONTENT, not the count of lit pixels. A walking character keeps
 *     a roughly constant silhouette area, so a lit-pixel count reads as
 *     "static" even while the legs are clearly swinging.
 *
 *  2. Sample EVERY canvas, not just the first. HeroStage renders two
 *     `mascot-track` canvases; if the first happens to be static, measuring it
 *     alone hides an animating second and reports a false failure.
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://127.0.0.1:5174';
const browser = await chromium.launch({
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await (await browser.newContext({ viewport: { width: 412, height: 915 } })).newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));

await page.goto(BASE + '/', { waitUntil: 'load', timeout: 40000 });
await page.waitForTimeout(6000);

const perCanvas = await page.evaluate(async () => {
  const canvases = [...document.querySelectorAll('.mascot-track canvas')];
  const out = [];
  for (const c of canvases) {
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) { out.push({ w: 0, h: 0, distinct: 0, err: 'no gl context' }); continue; }
    const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
    const seen = new Set();
    for (let i = 0; i < 25; i++) {
      await new Promise(r => requestAnimationFrame(r));
      const px = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
      let hash = 0;
      for (let k = 3; k < px.length; k += 16) hash = (hash * 31 + px[k]) >>> 0;
      seen.add(hash);
    }
    out.push({ w, h, distinct: seen.size });
  }
  return out;
});

console.log('per-canvas animation check:');
let animating = 0;
for (let i = 0; i < perCanvas.length; i++) {
  const r = perCanvas[i];
  const live = r.distinct > 15;
  if (live) animating++;
  console.log(
    `  canvas[${i}] ${r.w}x${r.h}  distinct=${r.distinct}  ${live ? '<-- ANIMATING' : '<-- static'}${r.err ? '  ' + r.err : ''}`
  );
}
console.log('');
console.log(animating > 0
  ? `RESULT: WALK IS PLAYING on ${animating}/${perCanvas.length} mascot canvas(es)`
  : 'RESULT: STATIC — no mascot canvas is animating');
console.log('errors:', errs.length ? errs.slice(0, 4) : '(none)');
await browser.close();
process.exit(animating > 0 && errs.length === 0 ? 0 : 1);
