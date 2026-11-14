/**
 * Measure the walk cycle from the live canvas.
 *
 * The original check compared only the width of the leg band. That works for
 * the male model, but the female model's dress covers the legs, so her leg
 * band stays ~2px wide even though the walk clip is playing (measured: the
 * silhouette changes just as much as the male's). The check therefore accepts
 * either a leg-band swing of 6px+ or a clear silhouette deformation.
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
    const frames=[];
    for(let k=0;k<200;k++){
      await new Promise(r=>requestAnimationFrame(r));
      const px=new Uint8Array(w*h*4);
      gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,px);
      // find the character's rows
      let miny=1e9,maxy=-1,minx=1e9,maxx=-1;
      for(let y=0;y<h;y++)for(let x=0;x<w;x++)
        if(px[(y*w+x)*4+3]>8){ if(y<miny)miny=y; if(y>maxy)maxy=y; if(x<minx)minx=x; if(x>maxx)maxx=x; }
      if(maxy<0){ spans.push(0); frames.push(null); continue; }
      // legs = the lower 45% of the character, measured from its feet (miny)
      const legTop = miny + 0.45*(maxy-miny);
      let lo=1e9,hi=-1;
      for(let y=miny;y<=legTop;y++)for(let x=0;x<w;x++)
        if(px[(y*w+x)*4+3]>8){ if(x<lo)lo=x; if(x>hi)hi=x; }
      spans.push(hi<0?0:hi-lo);
      // Coarse silhouette on a bbox-relative grid, for the dress-covered case.
      const GW=32, GH=64;
      const sig=new Uint8Array(GW*GH);
      for(let gy=0;gy<GH;gy++)for(let gx=0;gx<GW;gx++){
        const x=Math.min(maxx,minx+Math.floor((gx+0.5)*(maxx-minx+1)/GW));
        const y=Math.min(maxy,miny+Math.floor((gy+0.5)*(maxy-miny+1)/GH));
        sig[gy*GW+gx]=px[(y*w+x)*4+3]>8?1:0;
      }
      frames.push(sig);
    }
    const diff=(a,b2)=>{let d=0;for(let i=0;i<a.length;i++)if(a[i]!==b2[i])d++;return d;};
    let silDiff=0;
    for(const lag of [4,5,6,7,8]){
      const ds=[];
      for(let i=0;i+lag<frames.length;i++)
        if(frames[i]&&frames[i+lag]) ds.push(diff(frames[i],frames[i+lag]));
      if(ds.length) silDiff=Math.max(silDiff, ds.reduce((a,b)=>a+b,0)/ds.length);
    }
    out.push({w,h,
      min:Math.min(...spans), max:Math.max(...spans),
      range:Math.max(...spans)-Math.min(...spans),
      silDiff:+silDiff.toFixed(1),
      first:spans.slice(0,8).map(v=>String(v).padStart(3)).join(' ')});
  }
  return out;
});
let ok=true;
for(let i=0;i<r.length;i++){
  const x=r[i];
  const legGood = x.range >= 6;
  const silGood = x.silDiff >= 15;
  const good = legGood || silGood;
  if(!good) ok=false;
  console.log(`mascot[${i}] canvas ${x.w}x${x.h}`);
  console.log(`  leg-band width: ${x.min}..${x.max}  range ${x.range}px  ${legGood?'STRIDE VISIBLE':'leg width hidden/steady'}`);
  console.log(`  silhouette: mean ${x.silDiff} grid cells differ a few frames apart  ${silGood?'STRIDE VISIBLE':'NOT VISIBLE'}`);
  console.log(`  samples: ${x.first}`);
}
console.log('');
console.log(ok?'RESULT: stride visible':'RESULT: stride not visible');
await b.close();
process.exit(ok?0:1);
