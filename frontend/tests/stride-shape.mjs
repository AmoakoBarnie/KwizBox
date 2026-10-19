/**
 * Is the walk cycle visibly deforming the silhouette?
 *
 * Compares the lit-pixel bitmap between opposite phases of the cycle. A stride
 * changes the shape, not just the width, so this catches motion that a
 * width-only metric misses.
 */
import { chromium } from 'playwright';
const b = await chromium.launch({args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const p = await (await b.newContext({viewport:{width:412,height:915}})).newPage();
await p.goto('http://127.0.0.1:5174/', {waitUntil:'load', timeout:40000});
await p.waitForTimeout(9000);
const r = await p.evaluate(async () => {
  const el=[...document.querySelectorAll('.mascot-track > div')].filter(e=>e.querySelector('canvas'))[0];
  const c=el.querySelector('canvas');
  const gl=c.getContext('webgl2')||c.getContext('webgl');
  const w=gl.drawingBufferWidth,h=gl.drawingBufferHeight;
  const frames=[];
  for(let k=0;k<140;k++){
    await new Promise(r=>requestAnimationFrame(r));
    const px=new Uint8Array(w*h*4);
    gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,px);
    // crop to the character bbox region to normalise position
    let minx=1e9,maxx=-1,miny=1e9,maxy=-1;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++)
      if(px[(y*w+x)*4+3]>8){ if(x<minx)minx=x; if(x>maxx)maxx=x; if(y<miny)miny=y; if(y>maxy)maxy=y; }
    if(maxx<0) continue;
    const W=maxx-minx+1, H=maxy-miny+1;
    const sig=new Uint8Array(W*H);
    for(let y=miny;y<=maxy;y++)for(let x=minx;x<=maxx;x++)
      sig[(y-miny)*W+(x-minx)] = px[(y*w+x)*4+3]>8?1:0;
    frames.push({W,H,sig:Array.from(sig)});
  }
  // compare frame i with frame i+12 (half cycle apart) and i+6
  const diff=(a,b2)=>{let d=0;for(let i=0;i<a.length;i++)if(a[i]!==b2[i])d++;return d;};
  const half=[], quarter=[];
  for(let i=0;i+14<frames.length;i++){
    half.push(diff(frames[i].sig, frames[i+12].sig));
    quarter.push(diff(frames[i].sig, frames[i+7].sig));
  }
  const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
  return {n:frames.length, W:frames[0].W, H:frames[0].H,
          halfMean:+mean(half).toFixed(1), quarterMean:+mean(quarter).toFixed(1),
          halfMax:Math.max(...half)};
});
console.log(`frames ${r.n}  bbox ${r.W}x${r.H}`);
console.log(`pixels differing from half-cycle-apart frame: mean ${r.halfMean} (max ${r.halfMax})`);
console.log(`pixels differing from quarter-cycle frame:    mean ${r.quarterMean}`);
const pct = r.halfMean/(r.W*r.H)*100;
console.log(`=> ${pct.toFixed(1)}% of the silhouette changes over half a cycle`);
console.log(pct > 3 ? 'RESULT: stride visibly deforms the silhouette' : 'RESULT: silhouette barely changes');
await b.close();
