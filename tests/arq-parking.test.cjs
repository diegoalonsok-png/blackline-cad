'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const engine=require('../architecture/blackline-engine.js');
const cases=[
 ['cocheras en tándem x 3 de 2,60 x 5,50 m',3,2.6,16.5],
 ['estacionamientos x 5 de 2,50 x 5 m',5,12.5,5],
 ['3 cocheras en fila de 2,70 x 5,50',3,8.1,5.5],
 ['2 módulos de cochera en tándem',4,5,10],
 ['2 cocheras dobles en tándem de 2,6 x 5,5',4,5.2,11],
 ['estacionamientos x 8 de 2,50 x 5 con circulación de 6 m y autos',8,20,5],
 ['playa de estacionamiento con 10 plazas',10,25,5],
 ['parking x 6 of 2.5 by 5 m',6,15,5]
];
for(const [q,n,W,D] of cases)test('ARQASSIST parking: '+q,()=>{
 const plan=engine.run(q);assert.equal(plan.spaces.length,n);
 const e=plan.entities[0];assert.equal(e.type,'polyline');assert.equal(e.closed,true);
 assert.ok(Math.abs(e.pts[2][0]-W)<1e-8);assert.ok(Math.abs(e.pts[2][1]-D)<1e-8);
 const {width:w,depth:d}=plan.brief;
 for(const s of plan.spaces){assert.deepEqual(s.clearBounds.slice(2),[w,d]);}
 for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){
  const [x,y]=plan.spaces[i].clearBounds,[a,b]=plan.spaces[j].clearBounds;
  assert.ok(Math.abs(x-a)>=w-1e-8||Math.abs(y-b)>=d-1e-8);
 }
});
test('parking rejects unsupported angles and invalid counts',()=>{
 for(const q of ['estacionamientos x 0 de 2,5 x 5','cocheras en tándem x 61 de 2,5 x 5','estacionamientos x 5 de 2,5 x 5 a 30 grados'])assert.throws(()=>engine.run(q));
});
test('individual enclosed garage generation remains unchanged',()=>{
 for(const q of ['cochera de 3 x 5','garage 3 x 6'])assert.equal(engine.run(q).walls.length,4);
});
test('parking routing and insertion use native geometry, units and dedicated layers',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../cad-arq-pro.js'),'utf8');
 const a=src.indexOf('function arqParkingRequest(raw)'),b=src.indexOf('function arqPoolRequest(raw)',a);
 const match=new Function(src.slice(a,b)+'return arqParkingRequest;')();
 for(const [q] of cases)assert.equal(match(q),true,q);
 for(const q of ['buscar cocheras','cocheras jpg','pileta 8 x 4','cochera de 3 x 5'])assert.equal(match(q),false,q);
 const start=src.indexOf('function applyArchitectureDetail(plan,origin)'),end=src.indexOf('/* CALCOPRUEBA',start);
 const state={layers:[],entities:[],selected:[]};let seq=0,hist=0;
 const core={saveHistory(){hist++},nextId(){return ++seq},updateAll(){}};
 const apply=new Function('S','f','P','CORE',src.slice(start,end)+'return applyArchitectureDetail;')(()=>state,()=>1000,(x,y)=>({x,y}),core);
 assert.equal(apply(engine.run(cases[5][0]),{x:100,y:200}),35);assert.equal(hist,1);
 assert.deepEqual(state.layers.map(l=>l.name).sort(),['PARKING-AISLE','PARKING-CARS','PARKING-SPACE']);
 assert.equal(state.entities[0].pts[2].x-state.entities[0].pts[0].x,20000);
});

for(const [q,n,angle,opposed] of [
 ['estacionamientos x 8 de 2,5 x 5 a 45 grados con autos',8,45,false],
 ['cocheras x 5 de 2,60 x 5,50 a 60°',5,60,false],
 ['estacionamientos x 12 de 2,5 x 5 a 90° en filas enfrentadas con calle central de 6 m',12,90,true],
 ['estacionamientos x 7 de 2,5 x 5 a 45° en filas enfrentadas con circulación de 6 m y autos',7,45,true]
])test('inclined/opposed parking: '+q,()=>{
 const p=engine.run(q);assert.equal(p.spaces.length,n);assert.equal(p.brief.angle,angle);assert.equal(p.brief.opposed,opposed);
 const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8);
 const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
 for(const space of p.spaces){
  const [A,B,C,D]=space.corners;near(dist(A,B),p.brief.width);near(dist(B,C),p.brief.depth);
  if(opposed)for(const v of space.corners)assert.ok(space.row===1?v[1]>=-1e-8:v[1]<=-6+1e-8);
 }
 const s=Math.sin(angle*Math.PI/180),c=Math.cos(angle*Math.PI/180);
 for(let row=1;row<=(opposed?2:1);row++){
  const spaces=p.spaces.filter(x=>x.row===row);
  for(let i=1;i<spaces.length;i++){
   const a=spaces[i-1].corners[0],b=spaces[i].corners[0];
   near((b[0]-a[0])*s,p.brief.width);near(b[1],a[1]);
  }
 }
 if(opposed){const aisle=p.entities.find(e=>e.layer==='PARKING-AISLE');near(dist(aisle.pts[1],aisle.pts[2]),6);}
});
test('tandem and opposed requests reject incompatible or incomplete combinations',()=>{
 for(const q of ['cocheras en tándem x 3 de 2,5 x 5 a 45 grados','estacionamientos x 4 de 2,5 x 5 en filas enfrentadas'])assert.throws(()=>engine.run(q));
});
test('rotated parking inserts as one undoable operation with true geometry',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../cad-arq-pro.js'),'utf8');
 const start=src.indexOf('function applyArchitectureDetail(plan,origin)'),end=src.indexOf('/* CALCOPRUEBA',start);
 const state={layers:[],entities:[],selected:[]};let seq=0,hist=0;
 const core={saveHistory(){hist++},nextId(){return ++seq},updateAll(){}};
 const apply=new Function('S','f','P','CORE',src.slice(start,end)+'return applyArchitectureDetail;')(()=>state,()=>1000,(x,y)=>({x,y}),core);
 const plan=engine.run('estacionamientos x 7 de 2,5 x 5 a 45° en filas enfrentadas con circulación de 6 m y autos');
 assert.equal(apply(plan,{x:100,y:200}),29);assert.equal(hist,1);
 const [a,b]=state.entities[0].pts;assert.ok(Math.abs(Math.hypot(b.x-a.x,b.y-a.y)-2500)<1e-6);
});
