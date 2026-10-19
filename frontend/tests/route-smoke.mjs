/**
 * Route smoke test: load each route in headless Chromium, capture console
 * errors + uncaught exceptions + whether the page actually rendered.
 *
 * Usage: node route-smoke.mjs <baseUrl> <route...>
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const BASE = process.argv[2] ?? 'http://127.0.0.1:5174';
const ROUTES = process.argv.slice(3);

const ROUTE_LIST = ROUTES.length ? ROUTES : [
  '/', '/choose-quiz', '/play', '/challenge', '/quiz', '/summary',
  '/leaderboard', '/profile', '/settings', '/admin',
  '/privacy-policy', '/terms-and-conditions', '/cookie-policy',
];

const browser = await chromium.launch({ args: ['--no-sandbox', '--use-gl=swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 } });
const page = await ctx.newPage();

const consoleErrors = [];
const pageErrors = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', e => pageErrors.push(e.message));

const rows = [];
for (const route of ROUTE_LIST) {
  consoleErrors.length = 0;
  pageErrors.length = 0;
  const url = BASE + route;
  let status = 0;
  try {
    const resp = await page.goto(url, { waitUntil: 'load', timeout: 25000 });
    status = resp?.status() ?? 0;
    // let React mount + any lazy chunks resolve
    await page.waitForTimeout(1800);
  } catch (e) {
    pageErrors.push('NAVIGATION: ' + e.message.split('\n')[0]);
  }

  const info = await page.evaluate(() => {
    const root = document.getElementById('root');
    const txt = document.body.innerText.replace(/\s+/g, ' ').trim();
    return {
      rootChildren: root ? root.children.length : -1,
      textLen: txt.length,
      text: txt.slice(0, 140),
      canvases: document.querySelectorAll('canvas').length,
      h1: (document.querySelector('h1') || {}).innerText || '',
    };
  });

  const fatal = pageErrors.some(e => /ReferenceError|TypeError|Cannot read|is not defined|is not a function/.test(e));
  const rendered = info.rootChildren > 0 && info.textLen > 10;
  const ok = status === 200 && rendered && !fatal;

  rows.push({ route, ok, status, ...info, pageErrors, consoleErrors });
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${route.padEnd(24)} status=${status} ` +
    `children=${info.rootChildren} text=${info.textLen} canvas=${info.canvases}` +
    (fatal ? `  FATAL: ${pageErrors[0].slice(0, 110)}` : '')
  );
  if (!ok) {
    if (pageErrors.length) console.log('      pageErrors:', pageErrors.slice(0, 3));
    if (consoleErrors.length) console.log('      consoleErrors:', consoleErrors.slice(0, 3));
    console.log('      text:', info.text);
  }
}

await browser.close();

const passed = rows.filter(r => r.ok).length;
console.log(`\n${'='.repeat(50)}`);
console.log(`ROUTES: ${passed}/${rows.length} rendered without fatal errors`);
console.log('='.repeat(50));
process.exit(passed === rows.length ? 0 : 1);
