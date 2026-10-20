/** Guest flow: age + sex captured, quiz playable. */
import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:5174';
const browser = await chromium.launch({args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const ctx = await browser.newContext({viewport:{width:412,height:915}});
const page = await ctx.newPage();
const results=[]; const check=(ok,m)=>{results.push(ok);console.log(`  ${ok?'PASS':'FAIL'}  ${m}`)};
try {
  await page.goto(BASE+'/', {waitUntil:'load', timeout:40000});
  await page.waitForTimeout(1500);
  await page.getByRole('button',{name:'Play as Guest'}).click();
  await page.waitForTimeout(700);
  const sels = page.locator('.popup-panel select');
  await page.locator('.popup-panel label',{hasText:'Nickname'}).locator('input').fill('GuestE2E');
  await sels.nth(0).selectOption('B6');
  await sels.nth(1).selectOption('11');
  await page.locator('.sex-chip',{hasText:/^Male$/}).click();
  await page.locator('.popup-panel button[type="submit"]').click();
  await page.waitForURL('**/play',{timeout:20000});
  check(true,'guest registered -> /play');
  const me = await page.evaluate(async ()=>{
    const k=Object.keys(localStorage).map(x=>localStorage.getItem(x)).find(v=>v&&v.length>60);
    const r=await fetch('/auth/me',{headers:{Authorization:`Bearer ${k}`}});
    return {status:r.status, body:await r.json()};
  });
  check(me.body.age===11, `guest age persisted: ${me.body.age}`);
  check(me.body.gender==='male', `guest gender persisted: ${me.body.gender}`);
  check(me.body.is_guest===true, 'marked as guest');
} catch(e) { check(false, e.message); }
await browser.close();
process.exit(results.every(Boolean)?0:1);
