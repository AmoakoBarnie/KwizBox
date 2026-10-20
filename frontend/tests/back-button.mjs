/** Do the policy pages' Back buttons actually navigate? */
import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:5174';
const PAGES = ['/privacy-policy', '/cookie-policy', '/terms-and-conditions'];
const b = await chromium.launch({args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const ctx = await b.newContext({viewport:{width:412,height:915}});
const p = await ctx.newPage();
const errs=[]; p.on('pageerror', e=>errs.push(e.message));
const results=[];
for (const path of PAGES) {
  await p.goto(BASE+path, {waitUntil:'load', timeout:30000});
  await p.waitForTimeout(1200);
  const before = new URL(p.url()).pathname;
  const btn = p.locator('button.back').first();
  const count = await p.locator('button.back').count();
  if (count === 0) { results.push(false); console.log(`  FAIL  ${path} — no back button`); continue; }
  await btn.click();
  await p.waitForTimeout(1500);
  const after = new URL(p.url()).pathname;
  const ok = after !== before;
  results.push(ok);
  console.log(`  ${ok?'PASS':'FAIL'}  ${path}  ${before} -> ${after}`);
}
// also check the footer links from the landing page
await p.goto(BASE+'/', {waitUntil:'load', timeout:30000});
await p.waitForTimeout(1200);
const footLinks = await p.locator('.policy-link').allInnerTexts();
console.log(`  footer policy links: ${footLinks.join(' / ')}`);
console.log('');
console.log('errors:', errs.length ? errs.slice(0,3) : '(none)');
await b.close();
process.exit(results.every(Boolean)?0:1);
