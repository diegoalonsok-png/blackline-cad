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
 for(const q of ['estacionamientos x 0 de 2,5 x 5','cocheras en tándem x 61 de 2,5 x 5','estacionamientos x 5 de 2,5 x 5 a 45 grados'])assert.throws(()=>engine.run(q));
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
