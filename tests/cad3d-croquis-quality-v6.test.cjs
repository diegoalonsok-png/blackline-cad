const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const src=fs.readFileSync('cad3d-lab.js','utf8');
function block(from,to){
 const start=src.indexOf(from),end=src.indexOf(to,start+from.length);
 assert(start>=0&&end>start,'source section missing: '+from);
 return src.slice(start,end);
}
const engineText=block('function cad3dSketchNoise(x,y){','function cad3dSketchRenderPasses(');
const render=vm.runInNewContext(engineText+'\ncad3dSketchMultiPass', {Uint8ClampedArray,Uint8Array,Int32Array,Math,Number,Error});
function facade(){
 const w=96,h=72,p=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const k=(y*w+x)*4,inside=x>15&&x<80&&y>12&&y<60;
  const glass=x>37&&x<57&&y>24&&y<48;
  p[k]=glass?74:inside?203:y<35?182:220;
  p[k+1]=glass?89:inside?197:y<35?212:212;
  p[k+2]=glass?105:inside?183:y<35?239:196;
  p[k+3]=255;
 }
 return {w,h,p};
}
test('CAD3D sketch script parses without altering CAD2D',()=>{
 assert.doesNotThrow(()=>new vm.Script(src));
 assert(src.includes('function cad3dSketchGeometryEdges('));
 assert(src.includes('function cad3dSketchMultiPass('));
 assert(!src.includes('window.CAD2D ='));
});
test('Croquis multiple CPU passes are deterministic and preserve the source image',()=>{
 const {w,h,p}=facade(),copy=p.slice();
 const options={style:'pencil',sky:true,ground:true,shadow:70,grain:45,detail:60};
 const a=render(p,w,h,options),b=render(p,w,h,options);
 assert.deepEqual(Array.from(a.data),Array.from(b.data));
 assert.deepEqual(Array.from(p),Array.from(copy));
 assert(a.edgeMask.some(x=>x>0),'facade outlines detectable');
 assert.equal(a.data.length,w*h*4);
 for(let i=3;i<a.data.length;i+=4)assert.equal(a.data[i],255);
});
test('Geometry overlay uses bounded, segmented rays and source edge support',()=>{
 const segment=block('function cad3dSketchGeometryEdges(','function cad3dSketchHex(');
 for(const term of ['rayBudget=2400','new Uint8Array(slices)','a.clone().lerp(b,fr)',
  'ray.intersectObjects(meshes,false)','opts.edgeMask','if(!visible[first])'])assert(segment.includes(term),term);
 assert(!segment.includes('hidden edge rejection at the line midpoint'));
 assert(!/records\.(push|splice)|camera\.position\.set\(/.test(segment));
});
test('Artistic presets reuse the existing geometric line pass; technical remains clean',()=>{
 const presets=block('var cad3dSketchSource=null;','function cad3dSketchStyleData(');
 for(const style of ['ink','watercolor','pencil','marker','wash']){
  assert(new RegExp(style+":\\{style:'"+style+"'[^}]+passes:true,geometry:true").test(presets),style);
 }
 assert(/technical:\{style:'ink'[^}]+passes:true,geometry:false/.test(presets));
 assert(src.includes('Math.min(1,2560/w,1600/h)'));
});
