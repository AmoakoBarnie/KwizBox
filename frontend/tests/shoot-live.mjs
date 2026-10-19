/**
 * Visual check of the framing fix: crop each mascot canvas region from the
 * page so the actual on-screen result can be inspected.
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://127.0.0.1:5174';
const browser = await chromium.launch({ args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 412, height: 915 } })).newPage();

for (const [route, name] of [['/', 'landing'], ['/quiz', 'quiz'], ['/choose-quiz', 'choose']]) {
  await page.goto(BASE + route, { waitUntil: 'load', timeout: 40000 });
  await page.waitForTimeout(9000);
  await page.screenshot({ path: `/home/stephen/.hermes/cache/scratch/mockup/live-${name}.png` });

  // crop tightly around each mascot canvas
  const boxes = await page.evaluate(() =>
    [...document.querySelectorAll('canvas')].map(c => {
      const r = c.getBoundingClientRect();
      return { x: Math.round(r.x) - 14, y: Math.round(r.y) - 14,
               width: Math.round(r.width) + 28, height: Math.round(r.height) + 28 };
    })
  );
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    await page.screenshot({
      path: `/home/stephen/.hermes/cache/scratch/mockup/live-${name}-crop${i}.png`,
      clip: { x: Math.max(0, b.x), y: Math.max(0, b.y), width: b.width, height: b.height },
    });
  }
  console.log(`${route}: ${boxes.length} mascot canvas(es), page + crops saved`);
}
await browser.close();
