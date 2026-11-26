'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const engine=require('../architecture/blackline-engine.js');
for(const [q,n,l,w,b,stairs] of [
 ['pileta 8 x 4',1,8,4,.25,false],
 ['pileta de natación de 10 x 3 m',1,10,3,.25,false],
 ['piscina 7,50 x 3,20 m con borde de 1 m y escalera',1,7.5,3.2,1,true],
 ['2 piletas de 8 x 4',2,8,4,.25,false],
 ['piscinas x 3 de 800 x 400 cm sin borde',3,8,4,0,false],
 ['swimming pool 8 by 4 m with steps',1,8,4,.25,true]
])test('ARQASSIST pool: '+q,()=>{
 const p=engine.run(q);assert.equal(p.pools.length,n);
 for(const pool of p.pools){assert.deepEqual(pool.waterBounds.slice(2),[l,w]);assert.equal(pool.border,b);}
 const water=p.entities.filter(e=>e.layer==='POOL-WATER');
 assert.equal(water.length,n);assert.ok(water.every(e=>e.type==='polyline'&&e.closed&&e.pts.length===4));
 assert.equal(p.entities.filter(e=>e.layer==='POOL-DECK').length,b>0?n:0);
 assert.equal(p.entities.filter(e=>e.layer==='POOL-STAIRS').length,stairs?6*n:0);
 for(let i=1;i<n;i++)assert.ok(p.pools[i].waterBounds[0]-p.pools[i-1].waterBounds[0]>=l+2*b+1-1e-8);
});
test('pool instructions reject unsupported shapes, dimensions and counts',()=>{
 for(const q of ['pileta 8 x 4 con jacuzzi','pileta 0 x 4','11 piletas de 8 x 4'])assert.throws(()=>engine.run(q));
});
test('pool routing bypasses catalogue and CAD insertion preserves layers and model units',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../cad-arq-pro.js'),'utf8');
 const a=src.indexOf('function arqPoolRequest(raw)'),b=src.indexOf('function arqRoomSetRequest(raw)',a);
 const match=new Function(src.slice(a,b)+'return arqPoolRequest;')();
 assert.equal(match('pileta 8 x 4'),true);assert.equal(match('pileta de lavar 1 x 1'),false);assert.equal(match('buscar piletas'),false);
 assert.match(src,/if\(arqPoolRequest\(raw\)\)return \{kind:'draw'\}/);
 const start=src.indexOf('function applyArchitectureDetail(plan,origin)'),end=src.indexOf('/* CALCOPRUEBA',start);
 const state={layers:[],entities:[],selected:[]};let seq=0,hist=0;
 const core={saveHistory(){hist++},nextId(){return ++seq},updateAll(){}};
 const apply=new Function('S','f','P','CORE',src.slice(start,end)+'return applyArchitectureDetail;')(()=>state,()=>1000,(x,y)=>({x,y}),core);
 assert.equal(apply(engine.run('pileta 8 x 4 con borde de 1 m y escalera'),{x:100,y:200}),8);
 assert.equal(hist,1);assert.equal(state.layers.length,3);
 assert.equal(state.entities.filter(e=>e.type==='polyline'&&e.closed).length,2);
 assert.equal(state.entities[0].pts[1].x-state.entities[0].pts[0].x,8000);
});
