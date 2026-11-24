'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const lib=require('../assets/cad2d-arq-generators.js');
require('../cad-archgen.js');
const {generate}=globalThis.CAD2D_ARCHGEN;
const eps=1e-7;
const overlap=(a,b)=>a.x<b.x+b.w-eps&&b.x<a.x+a.w-eps&&a.y<b.y+b.d-eps&&b.y<a.y+a.d-eps;
const within=(a,w,d)=>a.x>=-eps&&a.y>=-eps&&a.x+a.w<=w+eps&&a.y+a.d<=d+eps;
const cases=[
 {kind:'bath',width:3,depth:3},
 {kind:'bath',width:2.4,depth:2.8},
 {kind:'accessible',width:4,depth:4},
 {kind:'bedroom',width:5,depth:4.5},
 {kind:'bedroom',width:4,depth:5},
 {kind:'kitchen',width:5,depth:4},
 {kind:'kitchen',width:6,depth:5}
];
for(const spec of cases)test('ARCHGEN '+spec.kind+' '+spec.width+'x'+spec.depth+' — geometría, bloques y vanos',()=>{
 const args={...spec,wall:.2,count:50};
 const models=generate(args);
 assert.ok(models.length>0,'debe generar al menos una alternativa');
 assert.ok(models.length<=args.count);
 assert.deepEqual(models,generate(args),'generación reproducible');
 const keys=new Set();
 for(const m of models){
  assert.equal(m.kind,spec.kind);
  assert.equal(m.area,m.width*m.depth);
  assert.equal(m.wall,.2);
  assert.ok(m.door.x>=0&&m.door.x+m.door.width<=m.width+eps);
  assert.ok(m.window.x>=0&&m.window.x+m.window.width<=m.width+eps);
  const key=JSON.stringify([m.typology,m.items,m.door,m.window]);
  assert.ok(!keys.has(key),'alternativa duplicada');keys.add(key);
  const swing={x:m.door.x,y:0,w:m.door.width,d:m.door.outward?.35:m.door.width};
  for(const [i,a] of m.items.entries()){
   const meta=lib.library.find(b=>b.id===a.id);
   assert.ok(meta&&!meta.pro&&!meta.paidOnly,'bloque libre: '+a.id);
   assert.ok([a.x,a.y,a.w,a.d,a.rotation].every(Number.isFinite),a.id);
   assert.ok(a.w>0&&a.d>0&&within(a,m.width,m.depth),'fuera del ambiente: '+a.id);
   assert.ok(!overlap(a,swing),'interferencia con puerta: '+a.id);
   for(const b of m.items.slice(0,i))assert.ok(!overlap(a,b),a.id+' choca con '+b.id);
   const bb=lib.bounds(lib.build(a.id).entities),r=a.rotation*Math.PI/180,c=Math.cos(r),s=Math.sin(r);
   const w=bb.maxX-bb.minX,d=bb.maxY-bb.minY;
   assert.ok(Math.abs(a.w-(Math.abs(c)*w+Math.abs(s)*d))<eps,'ancho real '+a.id);
   assert.ok(Math.abs(a.d-(Math.abs(s)*w+Math.abs(c)*d))<eps,'largo real '+a.id);
  }
  if(m.kind==='accessible'){
   assert.equal(m.door.outward,true);
   assert.equal(m.turn.r,.75);
   assert.ok(within({x:m.turn.x-.75,y:m.turn.y-.75,w:1.5,d:1.5},m.width,m.depth));
   assert.ok(within(m.transfer,m.width,m.depth));
   for(const a of m.items){
    assert.ok(!overlap(a,m.transfer),'transferencia obstruida');
    const dx=Math.max(a.x-m.turn.x,0,m.turn.x-a.x-a.w);
    const dy=Math.max(a.y-m.turn.y,0,m.turn.y-a.y-a.d);
    assert.ok(Math.hypot(dx,dy)>=.75-eps,'giro obstruido');
   }
  }
 }
});
test('ARCHGEN rechaza parámetros inválidos y evita forzar un baño accesible imposible',()=>{
 for(const bad of [{kind:'otro'},{width:NaN},{depth:1},{wall:0},{count:101},{count:2.5}])
  assert.throws(()=>generate(bad),/inválidos/);
 assert.deepEqual(generate({kind:'accessible',width:2,depth:2}),[]);
});
test('ARCHGEN integración: comando, puente, aberturas paramétricas y capas de cotas/hatch',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const js=fs.readFileSync(path.join(__dirname,'../cad-archgen.js'),'utf8');
 assert.match(html,/CAD2D_ARCHGEN_INSERT=function/);
 assert.match(html,/parametric:\{kind,defaults:/);
 assert.match(html,/cadCutRectWallForOpening\(ref,width\)/);
 assert.match(html,/HATCH-PISOS/);
 assert.match(html,/suffix:''/);
 assert.match(js,/commands\.ARCHGEN=openPalette/);
 assert.match(js,/CAD2D_ARCHGEN_INSERT/);
});

test('ARCHGEN resize preserves furniture dimensions, wall attachment and openings',()=>{
 const resize=globalThis.CAD2D_ARCHGEN.resizeModel;
 for(const spec of [{kind:'bath',width:3,depth:3},{kind:'bedroom',width:5,depth:4.5}]){
  const model=generate({...spec,wall:.2,count:12})[0];
  const original=JSON.stringify(model);
  const expanded=resize(model,spec.width+.8,spec.depth+.6);
  assert.equal(JSON.stringify(model),original);
  assert.equal(expanded.width,spec.width+.8);
  assert.equal(expanded.depth,spec.depth+.6);
  assert.equal(expanded.area,expanded.width*expanded.depth);
  assert.equal(expanded.wall,model.wall);
  assert.equal(expanded.door.width,model.door.width);
  assert.equal(expanded.window.width,model.window.width);
  for(const [i,a] of expanded.items.entries()){
   const b=model.items[i];
   assert.deepEqual([a.id,a.w,a.d,a.rotation,a.side],[b.id,b.w,b.d,b.rotation,b.side]);
   assert.ok(within(a,expanded.width,expanded.depth));
   if(a.side==='N')assert.ok(Math.abs((expanded.depth-a.y)-(model.depth-b.y))<eps);
   if(a.side==='E')assert.ok(Math.abs((expanded.width-a.x)-(model.width-b.x))<eps);
   if(a.side==='S')assert.equal(a.y,b.y);
   if(a.side==='W')assert.equal(a.x,b.x);
   for(const other of expanded.items.slice(0,i))assert.ok(!overlap(a,other));
  }
  const restored=resize(expanded,spec.width,spec.depth);
  for(const [i,a] of restored.items.entries()){
   assert.ok(Math.abs(a.x-model.items[i].x)<eps);
   assert.ok(Math.abs(a.y-model.items[i].y)<eps);
  }
 }
});
test('ARCHGEN resize rejects impossible dimensions without modifying the original',()=>{
 const model=generate({kind:'bedroom',width:5,depth:4.5,count:1})[0];
 const old=JSON.stringify(model);
 assert.throws(()=>globalThis.CAD2D_ARCHGEN.resizeModel(model,1.5,1.5),/espacio|interferencias/);
 assert.equal(JSON.stringify(model),old);
});
