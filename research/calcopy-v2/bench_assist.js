const A=require('../../assets/cad-calcopy-assist.js'),fs=require('fs');
const out={};
for(const k of process.argv.slice(2)){
 const r=JSON.parse(fs.readFileSync(`./bench/${k}.json`)),pix=fs.readFileSync(`./bench/${k}.rgba`);
 const G=A.gray(pix,r.w,r.h);const walls=r.readings[r.best].map(A.axis);
 // 1) re-measure each detected wall from a click at its middle
 const remeasured=[];for(const w of walls){const m=(w.lo+w.hi)/2,x=w.v?w.c:m,y=w.v?m:w.c;const q=A.measureWall(G,x,y);if(q)remeasured.push({click:[x,y],q});}
 // 2) click in the middle of each gap between collinear walls -> door
 const ops=[];const pxPerM=(()=>{const ts=walls.map(w=>w.t).sort((a,b)=>a-b);return ts.length?ts[ts.length>>1]/.15:100;})();
 for(const w of walls)for(const o of walls){if(o===w||o.v!==w.v||Math.abs(o.c-w.c)>.6*Math.max(o.t,w.t)||o.lo<=w.hi)continue;const gap=o.lo-w.hi;if(gap<.5*pxPerM||gap>2.4*pxPerM)continue;const m=(w.hi+o.lo)/2,x=w.v?w.c:m,y=w.v?m:w.c;const op=A.openingAt(G,walls,x,y,'door',pxPerM);if(op)ops.push({click:[x,y],v:op.v,c:op.c,g0:op.g0,g1:op.g1,t:op.t,side:op.side,hingeAtLo:op.hingeAtLo,kind:op.kind});}
 out[k]={walls,remeasured,ops,pxPerM};
}
fs.writeFileSync('./bench/out.json',JSON.stringify(out));
for(const k in out)console.log(k,'walls',out[k].walls.length,'remeasured',out[k].remeasured.length,'doors',out[k].ops.length);
