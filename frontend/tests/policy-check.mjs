/** Do the three policy pages render with their corrected content? */
import { chromium } from 'playwright';
const BASE='http://127.0.0.1:5174';
const PAGES=['/privacy-policy','/cookie-policy','/terms-and-conditions'];
const b=await chromium.launch({args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const p=await (await b.newContext({viewport:{width:412,height:915}})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
let ok=true;
for(const path of PAGES){
  await p.goto(BASE+path,{waitUntil:'load',timeout:30000});
  await p.waitForTimeout(1500);
  const info=await p.evaluate(()=>{
    const body=document.querySelector('.policy-body');
    const secs=[...document.querySelectorAll('.policy-section')].length;
    return {
      title: document.querySelector('.policy-title')?.textContent,
      updated: document.querySelector('.policy-sub')?.textContent,
      sections: secs,
      words: body ? body.textContent.replace(/\s+/g,' ').trim().split(' ').length : 0,
      backBtn: document.querySelector('.policy-nav button')?.textContent,
    };
  });
  const good = info.sections>0 && info.words>300 && !!info.backBtn;
  if(!good) ok=false;
  console.log(`  ${good?'PASS':'FAIL'}  ${path}`);
  console.log(`        title="${info.title}"  updated="${info.updated}"`);
  console.log(`        sections=${info.sections}  words=${info.words}  back="${info.backBtn}"`);
}
console.log('');
console.log('errors:', errs.length?errs.slice(0,3):'(none)');
await b.close();
process.exit(ok?0:1);
