'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const engine=require('../architecture/blackline-engine.js'),lib=require('../assets/cad2d-arq-generators.js');
const cases=[
 ['restaurante de 12 x 15 m con 20 mesas de 4 personas',20,80],
 ['restaurante de 10 x 12 para 48 personas',12,48],
 ['restaurante de 12 x 16 con 16 mesas de 6 y pasillo central de 1,5 m',16,96],
 ['restaurant 12 by 15 m with 20 tables for 4 people',20,80],
 ['restaurante de 8 x 10 con 10 mesas de 2 y separación entre mesas de 0,8 m',10,20]
];
for(const [q,t,n] of cases)test('restaurant layout: '+q,()=>{
 const p=engine.run(q),room=p.rooms[0],[X,Y,W,D]=room.clearBounds,lo=X+(W-room.centralAisle)/2,hi=lo+room.centralAisle;
 assert.equal(p.blocks.length,t);assert.equal(room.seatCount,n);assert.equal(p.blocks.reduce((a,b)=>a+b.seatCount,0),n);
 assert.equal(p.walls.length,4);assert.ok(p.virtualDimensions.every(v=>!v.editable));
 for(const b of p.blocks){
  const [x,y,w,d]=b.envelope;assert.ok(x>=X-1e-8&&y>=Y-1e-8&&x+w<=X+W+1e-8&&y+d<=Y+D+1e-8);
  assert.ok(x+w<=lo+1e-8||x>=hi-1e-8);
  assert.equal(lib.build(b.catalogId,...b.nominalSize).entities.length,1+2*b.seatCount);
 }
 for(let i=0;i<p.blocks.length;i++)for(let j=i+1;j<p.blocks.length;j++){
  const [x,y,w,d]=p.blocks[i].envelope,[a,b,c,e]=p.blocks[j].envelope;
  assert.ok(x+w<=a+1e-8||a+c<=x+1e-8||y+d<=b+1e-8||b+e<=y+1e-8);
 }
});
test('restaurant table blocks have exact chair counts',()=>{
 for(const n of [2,4,6,8]){const b=lib.library.find(x=>x.id==='mob-rest-mesa'+n);assert.equal(lib.build(b.id,b.w,b.d).entities.length,1+2*n);}
});
test('impossible restaurant requests are rejected',()=>{
 for(const q of ['restaurante de 4 x 4 con 20 mesas','restaurante de 12 x 15 con 20 mesas de 3','restaurante de 12 x 15 para 41 personas','restaurante de 12 x 15 con 20 mesas de 4 y pasillo de 0,5 m'])assert.throws(()=>engine.run(q));
});
test('restaurant routes to CAD and preserves counted tables',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../cad-arq-pro.js'),'utf8');
 const a=src.indexOf('function arqRestaurantRequest(raw)'),b=src.indexOf('function arqAuditoriumRequest(raw)',a);
 const match=new Function(src.slice(a,b)+'return arqRestaurantRequest;')();
 for(const [q] of cases)assert.ok(match(q));
 assert.equal(match('buscar restaurantes'),false);assert.match(src,/if\(arqRestaurantRequest\(raw\)\)return \{kind:'draw'\}/);assert.match(src,/!meta\.brief\.restaurantGrid/);
});
