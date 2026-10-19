/**
 * With prefers-reduced-motion, the mascots must hold still.
 */
import { chromium } from 'playwright';

const b = await chromium.launch({args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const ctx = await b.newContext({viewport:{width:412,height:915}, reducedMotion:'reduce'});
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:5174/', {waitUntil:'load', timeout:40000});
await p.waitForTimeout(6000);

const r = await p.evaluate(async () => {
  const els=[...document.querySelectorAll('.mascot-track > div')].filter(el=>el.querySelector('canvas'));
  const out=[];
  for(const el of els){
    const xs=[], fs=[];
    for(let k=0;k<30;k++){
      await new Promise(r=>requestAnimationFrame(r));
      const m=new DOMMatrixReadOnly(getComputedStyle(el).transform);
      xs.push(Math.round(el.getBoundingClientRect().x));
      fs.push(Math.round(m.f));
    }
    out.push({xMin:Math.min(...xs), xMax:Math.max(...xs), fMin:Math.min(...fs), fMax:Math.max(...fs)});
  }
  return {noMotionClass: document.documentElement.classList.contains('no-motion'), out};
});
console.log('no-motion class applied:', r.noMotionClass);
for(let i=0;i<r.out.length;i++){
  const o=r.out[i];
  const still = (o.xMax-o.xMin) <= 2 && (o.fMax-o.fMin) <= 2;
  console.log(`  mascot[${i}] x ${o.xMin}..${o.xMax}  y ${o.fMin}..${o.fMax}  ${still?'STILL (correct)':'MOVING (bug)'}`);
}
await b.close();
