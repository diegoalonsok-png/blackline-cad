const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('cad3d-lab.js','utf8');
const begin=source.indexOf('function addOperableOpeningMeshes(');
const end=source.indexOf('function buildObject(',begin);
assert(begin>=0&&end>begin,'Operable sash implementation must exist');
const snippet=source.slice(begin,end);
function makeEnv(opts={}){
 const Three={
  Group:class{constructor(){this.children=[];this.userData={};this.rotation={z:0};this.position={set(x,y,z){this.x=x;this.y=y;this.z=z}};}add(item){this.children.push(item)}},
  Vector3:class{constructor(x,y,z){this.x=x;this.y=y;this.z=z}},
  LineBasicMaterial:class{constructor(options){this.options=options}clone(){return new this.constructor(this.options)}},
  BufferGeometry:class{setFromPoints(points){this.points=points;return this}},
  Line:class{constructor(geom,material){this.geometry=geom;this.material=material;this.userData={}}}
 };
 const context={
  T:Three,activeView:opts.activeView||'top',viewMode:opts.viewMode||'ortho',cadPlanClassic:true,
  clamp:(n,a,b)=>Math.min(b,Math.max(a,n)),finite:(n,d)=>Number.isFinite(Number(n))?Number(n):d,
  openingMotionType:o=>/sliding|terrace|patio/.test(o.styleId||'')?'sliding':/fixed/.test(o.styleId||'')?'fixed':'hinged',
  openingIsGlass:o=>o.kind==='window'||/french|terrace/.test(o.styleId||''),
  glazingOpacity:()=>.24,boxGeom:(w,d,h)=>({w,d,h}),
  addMesh:(geom,color,id,parent,x,y,z,glass)=>{
   const mesh={geometry:geom,color,x,y,z,glass,userData:{owner:id,cadGlass:glass},castShadow:!glass};
   parent.add(mesh);return mesh;
  }
 };
 vm.runInNewContext(snippet,context);
 return context;
}
function wall(overrides={}){
 return {id:22,type:'wall',d:.2,openings:[Object.assign({
  id:4,kind:'door',styleId:'single-swing',shape:'rect',offset:0,sill:0,
  w:1,h:2,hingeSide:'left',openDirection:1,openAngle:0,openFraction:0
 },overrides)]};
}
function render(context,w){const group={children:[],add(x){this.children.push(x)}};context.addOperableOpeningMeshes(w,group);context.addDoorPlanSymbols(w,group);return group.children;}
test('A selected parametric door at 90 degrees rotates an actual 3D sash',()=>{
 const g=render(makeEnv(),wall({openAngle:90}));
 assert.equal(g.length,2);assert(Math.abs(g[0].rotation.z-Math.PI/2)<1e-9);
 assert.equal(g[0].children[0].userData.openingId,4);
 assert.equal(g[0].children[0].castShadow,true);
 assert.equal(g[1].userData.cadPlanSymbol,true);
});
test('Closed or fixed door does not create a duplicate moving sash',()=>{
 const closed=render(makeEnv(),wall());assert.equal(closed.length,1);
 const fixed=render(makeEnv(),wall({styleId:'fixed',openAngle:90}));assert.equal(fixed.length,0);
});
test('Double glazed French doors animate two opposite leaves with transparent infill',()=>{
 const g=render(makeEnv(),wall({styleId:'french-door',w:2,openAngle:60}));
 const sashes=g.filter(x=>!x.userData.cadPlanSymbol);
 assert.equal(sashes.length,2);
 assert(Math.abs(sashes[0].rotation.z+sashes[1].rotation.z)<1e-8);
 for(const sash of sashes){
  assert(sash.children.some(m=>m.glass===true&&m.castShadow===false));
  assert(sash.children.some(m=>m.glass===false&&m.castShadow===true));
 }
});
test('Sliding window moves only one sash, preserving its glazing and frame',()=>{
 const g=render(makeEnv(),wall({kind:'window',styleId:'sliding-window',w:2,h:1.2,sill:1,openFraction:.75}));
 assert.equal(g.length,2);
 assert.equal(g[0].rotation.z,0);assert.equal(g[1].rotation.z,0);
 assert.notEqual(g[0].children[0].x,g[1].children[0].x);
 assert(g.every(sash=>sash.children.some(m=>m.glass===true)));
});
test('Door swing plan symbol consists of segmented arc and leaf line, only visible in top',()=>{
 const top=render(makeEnv(),wall())[0],iso=render(makeEnv({activeView:'iso'}),wall())[0];
 assert.equal(top.visible,true);assert.equal(iso.visible,false);
 assert.equal(top.children.length,2);
 assert.equal(top.children[0].geometry.points.length,25);
 assert.equal(top.children[1].geometry.points.length,2);
});
test('Animated wall architecture omits static infill, keeping its jamb/head frame',()=>{
 const b=source.indexOf('function openingSpanAtX('),e=source.indexOf('/* Build a true miter',b);
 const ctx={clamp:(x,a,d)=>Math.max(a,Math.min(d,x)),finite:(x,d)=>Number.isFinite(Number(x))?Number(x):d,
 openingMotionType:o=>/sliding/.test(o.styleId)?'sliding':'hinged',glazingOpacity:()=>.24};
 vm.runInNewContext(source.slice(b,e),ctx);
 const samples=[];
 for(const angle of [0,70]){
  const parts=[];ctx.architectureParts({type:'wall',w:5,h:3,d:.2,openings:[wall({openAngle:angle}).openings[0]]},(...args)=>parts.push(args));
  samples.push(parts);
 }
 assert(samples[0].length>samples[1].length,'Open doors must not retain closed static panel');
 assert(samples[1].some(p=>p[10]===4),'Jamb/head frame must remain associated with door');
});
