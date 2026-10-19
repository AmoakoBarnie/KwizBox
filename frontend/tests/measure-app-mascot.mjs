/** Measure what fraction of each model the ACTUAL app displays. */
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://127.0.0.1:5174';
const browser = await chromium.launch({ args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 412, height: 915 } })).newPage();

await page.goto(BASE + '/', { waitUntil: 'load', timeout: 40000 });
await page.waitForTimeout(8000);

const res = await page.evaluate(() => new Promise(resolve => {
  requestAnimationFrame(() => {
    const out = [];
    document.querySelectorAll('canvas').forEach((c, i) => {
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      if (!gl) return;
      const w = c.width, h = c.height;
      const px = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
      let lit = 0, minY = h, maxY = -1, minX = w, maxX = -1;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (px[(y * w + x) * 4 + 3] > 8) {
          lit++;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
          if (x < minX) minX = x; if (x > maxX) maxX = x;
        }
      }
      const r = c.getBoundingClientRect();
      out.push({
        i, canvas: `${w}x${h}`, css: `${Math.round(r.width)}x${Math.round(r.height)}`,
        lit, litPct: +(lit / (w * h) * 100).toFixed(1),
        spanX: maxX - minX + 1, spanY: maxY - minY + 1,
        at: { x: Math.round(r.x), y: Math.round(r.y) },
        viewportW: innerWidth,
        offRightEdge: r.x + r.width > innerWidth,
      });
    });
    resolve(out);
  });
}));
console.log('mascot canvases in the live app:');
for (const c of res) {
  console.log(`  canvas[${c.i}] buffer ${c.canvas}  css ${c.css}  at (${c.at.x},${c.at.y})`);
  console.log(`     lit ${c.lit}px (${c.litPct}%)  content span ${c.spanX}x${c.spanY}`);
  console.log(`     viewport ${c.viewportW}px wide · runs off right edge: ${c.offRightEdge}`);
}
await browser.close();
