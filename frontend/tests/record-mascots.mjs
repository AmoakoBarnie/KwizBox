/**
 * Record a real video of the walking mascots on the landing page.
 *
 * Playwright's context records video natively (WebM, h264 where supported).
 * This captures the live app — the actual WebGL animation, not a mockup.
 *
 * Usage: node tests/record-mascots.mjs [outName] [seconds]
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.argv[2] ?? 'http://127.0.0.1:5174';
const OUT_NAME = process.argv[3] ?? 'mascot-walk';
const SECONDS = Number(process.argv[4] ?? 8);

const outDir = join(process.env.HOME ?? '/tmp', '.hermes', 'cache', 'scratch', 'videos');
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, `${OUT_NAME}.webm`);

const browser = await chromium.launch({
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
const ctx = await browser.newContext({
  viewport: { width: 412, height: 915 },
  recordVideo: { dir: outDir, size: { width: 412, height: 915 } },
});
const page = await ctx.newPage();
await page.goto(BASE + '/', { waitUntil: 'load', timeout: 40000 });
await page.waitForTimeout(2000);

// Keep the mascots on screen: scroll so the hero stage is centred
await page.evaluate(() => {
  const el = document.querySelector('.hero-stage');
  if (el) el.scrollIntoView({ block: 'center' });
});
await page.waitForTimeout(800);

console.log(`recording ${SECONDS}s of the landing page...`);
await page.waitForTimeout(SECONDS * 1000);

// video path is only known after the context closes
await ctx.close();
await browser.close();

const { readdirSync } = await import('node:fs');
const files = readdirSync(outDir).filter((f) => f.endsWith('.webm'));
if (!files.length) throw new Error('no video produced');
const latest = files.sort().pop();
const final = join(outDir, latest);
const { renameSync } = await import('node:fs');
renameSync(final, outPath);

const { statSync } = await import('node:fs');
const kb = (statSync(outPath).size / 1024).toFixed(0);
console.log(`\nVIDEO: ${outPath}  (${kb} KB)`);
console.log(`MEDIA:${outPath}`);
