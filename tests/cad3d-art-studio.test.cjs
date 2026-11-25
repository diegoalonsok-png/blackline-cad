'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const studio=require('../cad3d-croquis-studio.js');
const entourage=require('../cad3d-entourage.js');
const lab=fs.readFileSync('cad3d-lab.js','utf8');

/* Synthetic G-buffer: sky, ground, two wall faces in shade/light, a cut-out figure. */
function gbuffer(){
 const w=120,h=80,n=w*h;
 const gb={w,h,id:new Uint16Array(n),depth:new Float32Array(n),normal:new Int8Array(n*3),
  light:new Uint8Array(n),lightFree:new Uint8Array(n),cut:new Uint8Array(n*3),up:[0,0,1],
  materials:[null,{rgb:[209,203,192],ground:true},{rgb:[214,208,196]},{rgb:[214,208,196]},{rgb:[150,150,150],cutout:true}],
  camera:{pos:[20,-20,8],right:[.707,.707,0],up:[0,0,1],back:[.707,-.707,0],ortho:false,tanX:.42,tanY:.28},
  segments:[{a:[.3,.3],b:[.3,.8],runs:[[0,1]],profile:1,d:.2},{a:[.3,.3],b:[.62,.25],runs:[[0,.5],[.6,1]],profile:0,d:.4}]};
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=y*w+x;let id=y<28?0:1,nz=[0,0,127],z=28+(h-y)*.4,l=230;
  if(x>=36&&x<74&&y>=22&&y<64){id=2;nz=[-90,-90,0];z=26-(x-36)*.04;l=120;}
  if(x>=74&&x<100&&y>=20&&y<62){id=3;nz=[90,-90,0];z=27+(x-74)*.05;l=235;}
  if(x>=20&&x<26&&y>=44&&y<66){id=4;nz=[0,-127,0];z=22;l=220;gb.cut.set([60,70,90],i*3);}
  gb.id[i]=id;gb.depth[i]=id?z:1000;gb.normal.set(nz,i*3);
  const shaded=id===1&&x>60&&x<=100&&y>62;
  gb.light[i]=shaded?140:l;gb.lightFree[i]=l;
 }
 return gb;
}

test('art engine is pure, deterministic and covers eight artistic styles',()=>{
 const ids=studio.STYLES.map(s=>s.id);
 assert.deepEqual(ids,['estudio','acuarela','plumilla','grabado','bicromia','aguada','lineaclara','riso','sucio']);
 const outputs={};
 for(const style of ids){
  const a=studio.paint(gbuffer(),{style}),b=studio.paint(gbuffer(),{style});
  assert.equal(a.length,120*80*4);
  assert.deepEqual(Buffer.from(a),Buffer.from(b),style+' deterministic');
  for(let i=3;i<a.length;i+=4)assert.equal(a[i],255);
  outputs[style]=Buffer.from(a).toString('base64');
 }
 assert.equal(new Set(Object.values(outputs)).size,ids.length,'every style is visually distinct');
});

test('G-buffer analysis finds silhouettes, creases, shade and accent material',()=>{
 const gb=gbuffer(),pre=studio.prepare(gb);
 assert(pre.kind.some(k=>k===3),'profile lines from depth/background');
 assert(pre.kind.some(k=>k===2),'crease between the two wall faces');
 assert(pre.shadow.some(s=>s>.3),'cast shadow detected from light with and without shadows');
 assert(pre.regionZ.length>=4,'planar regions');
 assert.equal(pre.accentId,0,'neutral materials receive no accent colour');
 const coloured=gbuffer();coloured.materials[3]={rgb:[230,90,40]};
 assert.equal(studio.prepare(coloured).accentId,3);
});

test('hand-drawn edge strokes: extensions only at real endpoints, hidden runs preserved',()=>{
 const gb=gbuffer();
 const plan=studio.strokePlan(gb,{style:'estudio',extension:10},1400,930);
 assert(plan.length>=3);
 const straight=studio.strokePlan(gb,{style:'lineaclara'},1400,930);
 const first=straight[0].points;
 assert(Math.abs(first[0][1]-.3*930)<1.5&&Math.abs(first[first.length-1][1]-.8*930)<1.5,'clean style keeps exact endpoints');
 const ext=plan.find(s=>s.index===0).points;
 assert(ext[0][1]<.3*930-2,'sketch style overshoots the corner like a hand drawing');
 assert(studio.strokePlan(gb,{style:'estudio',vectorLines:false},1400,930).length===0);
});

test('preview resample keeps every buffer, including cut-out colours',()=>{
 const gb=gbuffer(),small=studio.resample(gb,60,40);
 assert.equal(small.id.length,2400);assert.equal(small.cut.length,7200);
 assert.equal(small.segments,gb.segments);
 assert.equal(studio.paint(small,{style:'riso'}).length,60*40*4);
});

test('2.5D library: original people and vegetation, legacy cut-outs mapped',()=>{
 const lib=entourage.LIBRARY;
 assert(lib.filter(s=>s.kind==='person').length>=8);
 assert(lib.filter(s=>s.kind!=='person').length>=10);
 assert(lib.every(s=>s.w>0&&s.h>0&&(s.mount==='face'||s.mount==='cross')));
 assert(lib.filter(s=>s.kind==='person').every(s=>s.mount==='face'));
 for(let i=1;i<=10;i++)assert(entourage.spec('cutout'+i),'legacy cutout'+i);
 const src=fs.readFileSync('cad3d-entourage.js','utf8');
 assert(!/https?:\/\//.test(src.replace(/\/\*[\s\S]*?\*\//g,'')),'no external images');
});

test('CAD3D integration: render panel restored, per-mesh passes keep cut-out alpha',()=>{
 assert.doesNotThrow(()=>new vm.Script(lab));
 assert(lab.includes(" cad3dInitSketchCapture(); // Render artístico"));
 assert(lab.includes('cad3dRenderSketchLaunch')&&lab.includes("'+cad3dSketchRenderMarkup()+"));
 const capture=lab.slice(lab.indexOf('function cad3dStudioCapture('),lab.indexOf('function cad3dStudioSegments('));
 for(const term of ['function swapAll(','maskOf(m.map)','RGBADepthPacking','lightPass(true)','lightPass(false)',
  'gb.cut=new Uint8Array','applySunSettings();sunChanged=true','scene.background=oldBackground'])assert(capture.includes(term),term);
 assert(!/records\.(push|splice)/.test(capture),'capture never edits the model');
 const segments=lab.slice(lab.indexOf('function cad3dStudioSegments('),lab.indexOf('function cad3dStudioOptions('));
 assert(segments.includes('!o.userData?.cadCutout')&&segments.includes('visCount<depthVis*.55'));
 assert(lab.includes("plane.rotateX(Math.PI/2)")&&lab.includes('cadFaceCamera'));
 const html=fs.readFileSync('index.html','utf8');
 const a=html.indexOf('cad3d-entourage.js'),b=html.indexOf('cad3d-croquis-studio.js'),c=html.indexOf('cad3d-lab.js?v=');
 assert(a>0&&a<b&&b<c,'engine scripts load before the CAD3D module');
});
