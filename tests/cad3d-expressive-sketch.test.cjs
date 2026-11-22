const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const src=fs.readFileSync('cad3d-lab.js','utf8');
const start=src.indexOf('const CAD3D_SKETCH_PRESETS='),end=src.indexOf('function renderStyleControls()',start);
assert(start>=0&&end>start);
const presets=vm.runInNewContext(src.slice(start,end)+'\nCAD3D_SKETCH_PRESETS', {});
test('All seven Croquis modes have independent line weight, material wash and paper profiles',()=>{
 assert.equal(Object.keys(presets).length,7);
 const profiles=new Set();
 for(const [key,s] of Object.entries(presets)){
  assert(s.width>0&&s.width<.1,key+' profile thickness');
  assert(s.alpha>0&&s.alpha<=1,key+' opacity');
  assert(s.passes>=1&&s.passes<=4,key+' number of strokes');
  assert(s.fillMix>0&&s.fillMix<=1,key+' wash');
  assert(s.paper);
  profiles.add([s.stroke,s.width,s.jitter,s.paper,s.passes].join('-'));
 }
 assert.equal(profiles.size,7,'Each mode must have distinctive drawing behavior, not a color-only change');
});
const ribbonCode=src.slice(src.indexOf('function cadSketchRibbonGeometry('),src.indexOf('function applyRenderStyle(){'));
class Geometry {
 constructor(){this.attrs={};}
 setAttribute(name,value){this.attrs[name]=value;return this;}
 getAttribute(name){return this.attrs[name];}
}
class Attribute {
 constructor(data,itemSize){this.data=data;this.itemSize=itemSize;this.count=data.length/itemSize;}
 getX(i){return this.data[i*this.itemSize];}
 getY(i){return this.data[i*this.itemSize+1];}
 getZ(i){return this.data[i*this.itemSize+2];}
}
const ctx={T:{BufferGeometry:Geometry,Float32BufferAttribute:Attribute},clamp:(x,a,b)=>Math.max(a,Math.min(x,b))};
vm.runInNewContext(ribbonCode,ctx);
const edge=new Geometry().setAttribute('position',new Attribute([0,0,0,4,0,0,0,0,0,0,0,3,0,0,0,0,2,0],3));
test('Sketch profiles render actual triangles with world-space visible thickness',()=>{
 const g=ctx.cadSketchRibbonGeometry(edge,presets['sketch-ink'],4);
 const a=g.getAttribute('position');
 assert(a.count>0);
 assert(a.data.every(Number.isFinite));
 assert(a.data.some((v,i)=>i%3===1&&Math.abs(v)>.001),'Horizontal stroke must have real width');
 assert(a.data.some((v,i)=>i%3===0&&Math.abs(v)>.001),'Vertical stroke must have real width');
});
test('Pencil has more irregular stroke vertices than clean technical mode',()=>{
 const clean=ctx.cadSketchRibbonGeometry(edge,presets.sketch,4).getAttribute('position').data;
 const pencil=ctx.cadSketchRibbonGeometry(edge,presets['sketch-pencil'],4).getAttribute('position').data;
 assert(pencil.length>clean.length);
 assert.notDeepEqual(Array.from(pencil.slice(0,36)),Array.from(clean.slice(0,36)));
});
test('Watercolor has distinct broken contour strokes and lighter overlays',()=>{
 const wash=ctx.cadSketchRibbonGeometry(edge,presets['sketch-watercolor'],4).getAttribute('position');
 assert(wash.count>0);
 assert(presets['sketch-watercolor'].alpha<presets['sketch-ink'].alpha);
 assert(presets['sketch-watercolor'].stroke==='wash');
});
test('Sketch overlays are removed/rebuilt without altering CAD solids',()=>{
 const style=src.slice(src.indexOf('function applyRenderStyle(){'),src.indexOf('function setVisualStyle('));
 assert(style.includes('cadSketchRibbonGeometry(edge,sketch,span)'));
 assert(style.includes('ink.userData.cadSketch=true'));
 assert(style.includes('m.remove(ch);ch.geometry.dispose();ch.material.dispose()'));
 assert(style.includes('if(!m.isMesh||!m.material||!m.geometry||m.userData?.cadSketch'));
 assert(!style.includes('records.push('));
});
test('Paper grain overlays do not intercept mouse clicks',()=>{
 assert(src.includes('#cad3dLab .view.sketchView::after'));
 assert(src.includes('pointer-events:none'));
 for(const name of ['pencil','marker','watercolor','blueprint'])
  assert(src.includes('data-sketch-paper="'+name+'"'));
});
test('Drawing overlays cannot crash CAD object highlighting or mesh export',()=>{
 assert(src.includes('o.isMesh&&o.material?.emissive'));
 assert(src.includes('mesh.isMesh&&!mesh.userData.cadSketch'));
});
