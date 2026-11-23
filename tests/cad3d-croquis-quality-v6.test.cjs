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
 const presets=block("var preset=panel.querySelector('[data-sketch-preset]');","panel.querySelector('[data-sketch-save-preset]')");
 for(const style of ['ink','watercolor','pencil','marker','wash']){
  assert(new RegExp(style+":\\{style:'"+style+"'[^}]+passes:true,geometry:true").test(presets),style);
 }
 assert(/technical:\{style:'ink'[^}]+passes:true,geometry:false/.test(presets));
 assert(src.includes('2560/sw')&&src.includes('1600/sh'));
});

test('Render Croquis has dedicated action and all 8 finish engines',()=>{
 const markupSource=block('function cad3dSketchRenderMarkup(){','function cad3dInitSketchCapture(){');
 const markup=vm.runInNewContext(markupSource+'\ncad3dSketchRenderMarkup()', {});
 for(const style of ['ink','pencil','charcoal','engraving','watercolor','pastel','marker','wash']){
  assert(markup.includes('<option value="'+style+'"'),style);
 }
 for(const selector of ['cad3dSketchCapturePreview','cad3dSketchCaptureOriginal',
  'cad3dSketchDownload','cad3dSketchCaptureStyle','data-sketch-setting="baseStyle"',
  'data-sketch-setting="resolution"'])assert(markup.includes(selector),selector);
 assert(src.includes('cad3dRenderSketchLaunch'));
 assert(src.includes('cad3dInitSketchCapture();'));
});
test('Capture restores original camera, render style and WebGL resolution',()=>{
 const capture=block('function cad3dSketchCapture(){','function cad3dSketchGeometryEdges(');
 for(const term of ["renderStyle='realistic'","renderStyle=oldStyle;applyRenderStyle()",
  'renderer.setPixelRatio(oldPixelRatio)', 'camera.updateProjectionMatrix()',
  'Math.sqrt(4000000/(sw*sh))','cad3dSketchSource=canvas',
  "panel.querySelector('.cad3dSketchCaptureOriginal')"])assert(capture.includes(term),term);
 assert(!/records\.(push|splice)|currentLayer\s*=/.test(capture));
});
test('Eight distinct art engines produce deterministic different images',()=>{
 const {w,h,p}=facade();
 const styles=['ink','pencil','charcoal','engraving','watercolor','pastel','marker','wash'];
 const output={};
 for(const style of styles){
  const options={style,sky:true,ground:true,shadow:80,grain:70,pigment:65};
  const a=render(p,w,h,options),b=render(p,w,h,options);
  assert.deepEqual(Array.from(a.data),Array.from(b.data),'determinism: '+style);
  output[style]=a.data;
 }
 for(let i=0;i<styles.length;i++)for(let j=i+1;j<styles.length;j++){
  const a=output[styles[i]],b=output[styles[j]];
  let delta=0;
  for(let k=0;k<a.length;k++)delta+=Math.abs(a[k]-b[k]);
  assert(delta>100,'not distinct: '+styles[i]+' '+styles[j]);
 }
});

test('Croquis export reuses full-resolution raster for PNG, JPEG and PDF',()=>{
 const dl=block("panel.querySelector('.cad3dSketchDownload').addEventListener",'handle.addEventListener');
 for(const term of ['cad3dSketchProcess(true,out)','cad3dPDFfromJPEG',
  "out.toBlob(saveBlob,fmt==='jpg'?'image/jpeg':'image/png'",'link.download=filename']){
  assert(dl.includes(term),term);
 }
 const sourceMarkup=block('function cad3dSketchRenderMarkup(){','function cad3dInitSketchCapture(){');
 const markup=vm.runInNewContext(sourceMarkup+'\ncad3dSketchRenderMarkup()', {});
 for(const format of ['png','jpg','pdf'])assert(markup.includes('value="'+format+'"'),format);
});
