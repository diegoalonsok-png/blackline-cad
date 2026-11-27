const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const src=fs.readFileSync('cad3d-lab.js','utf8');
test('CAD3D grip module parses and hooks into selection and camera',()=>{
 assert.doesNotThrow(()=>new vm.Script(src));
 for(const token of ['cad3dGripLayer','get3DGripDefinitions','apply3DGripCandidate',
  'render3DGrips','bind3DGripOverlay(root.querySelector','grip3DDragMeters',
  'numeric3DGripAdjustment','openingFitsCADHost','pointercancel'])
  assert(src.includes(token),token);
 assert(src.includes('class="cad3dGripLayer"'));
});
function pure(){
 const start=src.indexOf('var active3DGrip=null;'),end=src.indexOf('function boxGeom(w,d,h){',start);
 const check=src.slice(src.indexOf('function openingFitsCADHost(host,item,excludeId){'),src.indexOf('function placeOpening(e){'));
 assert(start>=0&&end>start&&check.includes('openingFitsCADHost'));
 const ctx={JSON,Math,Number,clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),root:null,records:[]};
 const cloneStart=src.indexOf('function cad3dCloneRecord(r){');
 const cloneEnd=src.indexOf('function cad3dBuildImportedMesh',cloneStart);
 assert(cloneStart>=0&&cloneEnd>cloneStart,'production clone helper must exist');
 vm.runInNewContext(src.slice(cloneStart,cloneEnd)+'\n'+check+'\n'+src.slice(start,end),ctx);return ctx;
}
const c=pure();
const wall={id:5,type:'wall',layerId:'0',x:0,y:0,z:0,rot:0,w:6,d:.20,h:3,radius:1,openings:[
 {id:7,kind:'door',styleId:'single-swing',offset:1,w:.9,h:2.1,sill:0},
 {id:8,kind:'window',styleId:'fixed',offset:-1.5,w:1.2,h:1.2,sill:.9}
]};
test('Wall endpoint grip lengthens without moving hosted openings in world',()=>{
 const r=c.apply3DGripCandidate(wall,'length-end',2,null);
 assert(r);assert.equal(r.w,8);assert.equal(r.x,1);
 assert.equal(r.openings[0].offset,0);assert.equal(r.openings[1].offset,-2.5);
 assert.equal(wall.w,6);assert.equal(wall.openings[0].offset,1);
});
test('Wall width and height protect actual attached doors and windows',()=>{
 assert.equal(c.apply3DGripCandidate(wall,'height',-1,null),null);
 const wider=c.apply3DGripCandidate(wall,'thickness',.10,null);
 assert(wider);assert(Math.abs(wider.d-.4)<1e-8);
 assert.equal(c.apply3DGripCandidate(wall,'length-end',-5,null),null);
});
test('Door and window grips edit dimensions but prevent overlaps and overflow',()=>{
 const door=c.apply3DGripCandidate(wall,'opening-end',.2,7);
 assert(door);assert(Math.abs(door.openings[0].w-1.1)<1e-8);
 assert.equal(c.apply3DGripCandidate(wall,'opening-offset',-2.5,7),null);
 assert.equal(c.apply3DGripCandidate(wall,'opening-height',1.5,7),null);
 const win=c.apply3DGripCandidate(wall,'opening-sill',.1,8);
 assert(win);assert(Math.abs(win.openings[1].sill-1)<1e-8);
});
test('All existing gallery 3D solids expose dimensions and move grips',()=>{
 for(const type of ['wall','slab','box','sphere','cylinder','cone','boolean']){
  const r=Object.assign({},wall,{type,openings:[]});
  const grips=c.get3DGripDefinitions(r,null);
  assert(grips.some(g=>g.kind==='move'),type+' move');
  if(type!=='boolean')assert(grips.some(g=>['length-end','radius'].includes(g.kind)),type+' dimensions');
 }
 const grips=c.get3DGripDefinitions(wall,7);
 for(const kind of ['opening-offset','opening-start','opening-end','opening-height','opening-sill'])
  assert(grips.some(g=>g.kind===kind),kind);
});
