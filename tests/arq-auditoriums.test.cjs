'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const engine=require('../architecture/blackline-engine.js'),lib=require('../assets/cad2d-arq-generators.js');
const cases=[
 ['auditorio de 12 x 16 m para 100 butacas',100],
 ['teatro de 14 x 18 m para 120 personas con escenario de 3 m y pasillo central de 1,5 m',120],
 ['sala de cine de 10 x 14 m para 60 butacas',60],
 ['auditorio de 10 x 12 para 48 butacas con 6 filas',48],
 ['auditorium 12 by 16 m for 100 seats',100]
];
for(const [q,seats] of cases)test('auditorium: '+q,()=>{
 const p=engine.run(q),room=p.rooms[0],[X,Y,W,D]=room.clearBounds,lo=X+(W-room.centralAisle)/2,hi=lo+room.centralAisle;
 assert.equal(p.blocks.filter(b=>b.role==='auditoriumSeat').length,seats);
 assert.equal(p.blocks.filter(b=>b.role==='screen').length,1);
 assert.equal(p.blocks.filter(b=>b.role==='stage').length,p.brief.stage?1:0);
 assert.equal(p.walls.length,4);assert.ok(p.virtualDimensions.every(v=>!v.editable));
 for(const b of p.blocks){
  const [x,y,w,d]=b.envelope;assert.ok(x>=X-1e-8&&y>=Y-1e-8&&x+w<=X+W+1e-8&&y+d<=Y+D+1e-8);
  if(b.role==='auditoriumSeat')assert.ok(x+w<=lo+1e-8||x>=hi-1e-8);
  assert.ok(lib.build(b.catalogId,...b.nominalSize).entities.length);
 }
 for(let i=0;i<p.blocks.length;i++)for(let j=i+1;j<p.blocks.length;j++){
  const [x,y,w,d]=p.blocks[i].envelope,[a,b,c,e]=p.blocks[j].envelope;
  assert.ok(x+w<=a+1e-8||a+c<=x+1e-8||y+d<=b+1e-8||b+e<=y+1e-8);
 }
});
test('reject impossible auditorium capacities or aisle widths',()=>{
 for(const q of ['auditorio de 5 x 5 para 100 butacas','auditorio de 12 x 16 para 0 butacas','auditorio de 12 x 16 para 100 butacas con pasillo de 0,5 m','auditorio de 12 x 16 para 100 butacas con 2 filas'])assert.throws(()=>engine.run(q));
});
test('auditorium routes to CAD and prevents generic resize losing seating',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../cad-arq-pro.js'),'utf8');
 const a=src.indexOf('function arqAuditoriumRequest(raw)'),b=src.indexOf('function arqClassroomRequest(raw)',a);
 const match=new Function(src.slice(a,b)+'return arqAuditoriumRequest;')();
 for(const [q] of cases)assert.ok(match(q));
 assert.equal(match('buscar auditorios'),false);assert.match(src,/if\(arqAuditoriumRequest\(raw\)\)return \{kind:'draw'\}/);assert.match(src,/!meta\.brief\.auditoriumGrid/);
});
