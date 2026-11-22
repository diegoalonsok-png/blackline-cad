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
  openingMotionType:o=>/sliding|terrace|patio|guillotine/.test(o.styleId||'')?'sliding':/fixed/.test(o.styleId||'')?'fixed':'hinged',
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


test('Quick grips reposition, stretch and flip selected door without changing wall dimensions',()=>{
 const a=source.indexOf('function clickProps(e){'),b=source.indexOf('/* Exact axis-aligned box boolean prototype:',a);
 assert(a>=0&&b>a);
 const original=wall(),host=Object.assign({w:4,h:3,type:'wall',layerId:'0'},original);
 const ctx={
  records:[host],selected:[22],selectedOpeningId:4,editableRecord:()=>true,
  openingFitsHost:(wall,trial,id)=>trial.w>0&&trial.w<=wall.w&&Math.abs(trial.offset)+trial.w/2<=wall.w/2,
  redraw(){},renderProps(){},highlight(){},text(){},
 };
 vm.runInNewContext(source.slice(a,b),ctx);
 const invoke=action=>ctx.clickProps({target:{closest:selector=>selector==='[data-opening-quick]'?{dataset:{openingQuick:action,openingId:'4'}}:null}});
 invoke('shift-right');assert.equal(host.openings[0].offset,.1);
 invoke('widen');assert(Math.abs(host.openings[0].w-1.1)<1e-8);
 invoke('flip-hinge');assert.equal(host.openings[0].hingeSide,'right');
 invoke('flip-swing');assert.equal(host.openings[0].openDirection,-1);
 assert.equal(host.w,4);assert.equal(host.h,3);
});
test('In plan view the door swing symbol takes picking priority over wall faces',()=>{
 const a=source.indexOf('function selectAt(e){'),b=source.indexOf('function boxGeom(',a);
 assert(a>=0&&b>a);
 const mesh={isMesh:true,userData:{owner:22}},arc={isLine:true,userData:{owner:22,openingId:4}};
 const ctx={
  fallbackCanvas:null,activeView:'top',viewMode:'ortho',root:{querySelector(){return {}}},
  worldPerPixel:()=>.01,selected:[],selectedOpeningId:null,
  records:[{id:22,type:'wall'}],editableRecord:()=>true,
  renderer:{domElement:{getBoundingClientRect(){return {left:0,top:0,width:200,height:200}}}},
  T:{Vector2:class{constructor(x,y){this.x=x;this.y=y}}},
  camera:{},modelRoot:{traverse(fn){fn(mesh);fn(arc)}},
  raycaster:{params:{Line:{}},setFromCamera(){},intersectObjects(objs){
   assert(objs.includes(arc));return [{object:mesh},{object:arc}];
  }},
  clamp:(v,a,b)=>Math.max(a,Math.min(v,b)),
  renderProps(){},highlight(){},text(){}
 };
 vm.runInNewContext(source.slice(a,b),ctx);
 ctx.selectAt({clientX:100,clientY:100,shiftKey:false});
 assert.equal(ctx.selectedOpeningId,4);
 assert.deepEqual(Array.from(ctx.selected),[22]);
});


test('Guillotine window opens vertically with two full-width sashes',()=>{
 const ctx=makeEnv();
 const g=render(ctx,wall({kind:'window',styleId:'guillotine',w:1.2,h:1.4,sill:.7,openFraction:.8}));
 assert.equal(g.length,2);
 assert(g[0].position.z> .7);
 assert(g[1].position.z>g[0].position.z);
 assert(g[0].children.some(m=>m.glass===true));
 assert.equal(g[0].children[0].geometry.w,g[1].children[0].geometry.w);
});
test('Sliding doors have parallel plan tracks rather than hinged arcs',()=>{
 const symbol=render(makeEnv(),wall({styleId:'terrace-door',w:2.4}))[0];
 assert.equal(symbol.userData.cadPlanSymbol,true);
 assert.equal(symbol.children.length,3);
 assert(symbol.children.every(line=>line.geometry.points.length===2));
});
