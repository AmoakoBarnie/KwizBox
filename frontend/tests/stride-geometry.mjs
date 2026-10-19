/**
 * Measure the stride from the live canvas.
 *
 * The legs occupy rows 33..93 of a 196px canvas (measured). The stride shows up
 * as a change in the width of that leg band across the walk cycle.
 *
 * NOTE: WebGL readPixels is bottom-up, so row 0 is the canvas bottom and the
 * character's feet are at LOW row indices. An earlier version of this test had
 * that comment inverted and sampled the top of the head instead.
 */
import { chromium } from 'playwright';

const b = await chromium.launch({args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const p = await (await b.newContext({viewport:{width:412,height:915}})).newPage();
await p.goto('http://127.0.0.1:5174/', {waitUntil:'load', timeout:40000});
await p.waitForTimeout(8000);

const r = await p.evaluate(async () => {
  const els=[...document.querySelectorAll('.mascot-track > div')].filter(el=>el.querySelector('canvas'));
  const out=[];
  for(const el of els){
    const c=el.querySelector('canvas');
    const gl=c.getContext('webgl2')||c.getContext('webgl');
    const w=gl.drawingBufferWidth,h=gl.drawingBufferHeight;
    const spans=[];
    for(let k=0;k<200;k++){
      await new Promise(r=>requestAnimationFrame(r));
      const px=new Uint8Array(w*h*4);
      gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,px);
      // find the character's rows
      let miny=1e9,maxy=-1;
      for(let y=0;y<h;y++)for(let x=0;x<w;x++)
        if(px[(y*w+x)*4+3]>8){ if(y<miny)miny=y; if(y>maxy)maxy=y; }
      if(maxy<0){ spans.push(0); continue; }
      // legs = the lower 45% of the character, measured from its feet (miny)
      const legTop = miny + 0.45*(maxy-miny);
      let lo=1e9,hi=-1;
      for(let y=miny;y<=legTop;y++)for(let x=0;x<w;x++)
        if(px[(y*w+x)*4+3]>8){ if(x<lo)lo=x; if(x>hi)hi=x; }
      spans.push(hi<0?0:hi-lo);
    }
    out.push({w,h,
      min:Math.min(...spans), max:Math.max(...spans),
      range:Math.max(...spans)-Math.min(...spans),
      first:spans.slice(0,8).map(v=>String(v).padStart(3)).join(' ')});
  }
  return out;
});
let ok=true;
for(let i=0;i<r.length;i++){
  const x=r[i];
  const good = x.range >= 6;
  if(!good) ok=false;
  console.log(`mascot[${i}] canvas ${x.w}x${x.h}`);
  console.log(`  leg-band width: ${x.min}..${x.max}  range ${x.range}px  ${good?'STRIDE VISIBLE':'NOT VISIBLE'}`);
  console.log(`  samples: ${x.first}`);
}
console.log('');
console.log(ok?'RESULT: stride visible':'RESULT: stride not visible');
await b.close();
process.exit(ok?0:1);
