'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const engine=require('../architecture/blackline-engine.js'),lib=require('../assets/cad2d-arq-generators.js');
const cases=[
 ['aula de 8 x 9 m para 30 alumnos',1,30],
 ['aulas x 3 de 8 x 9 m para 30 alumnos con pasillo de 1,2 m',3,30],
 ['classroom 8 by 9 m for 24 students',1,24],
 ['aula de 7 x 8 para 20 alumnos con 4 filas',1,20]
];
for(const [q,n,students] of cases)test('classroom seating: '+q,()=>{
 const p=engine.run(q);assert.equal(p.rooms.length,n);assert.equal(p.blocks.length,n*(students+2));
 assert.equal(p.blocks.filter(b=>b.role==='studentDesk').length,n*students);
 assert.equal(p.walls.length,3*n+1);assert.ok(p.virtualDimensions.every(v=>!v.editable));
 for(const room of p.rooms){
  const [X,Y,W,D]=room.clearBounds,lo=X+(W-room.centralAisle)/2,hi=lo+room.centralAisle;
  const blocks=p.blocks.filter(b=>b.envelope[0]>=X-1e-8&&b.envelope[0]<X+W);
  assert.equal(blocks.length,students+2);
  for(const b of blocks){
   const [x,y,w,d]=b.envelope;assert.ok(x>=X-1e-8&&y>=Y-1e-8&&x+w<=X+W+1e-8&&y+d<=Y+D+1e-8);
   if(b.role==='studentDesk')assert.ok(x+w<=lo+1e-8||x>=hi-1e-8);
   assert.ok(lib.library.some(k=>k.id===b.catalogId));assert.ok(lib.build(b.catalogId,...b.nominalSize).entities.length);
  }
  for(let i=0;i<blocks.length;i++)for(let j=i+1;j<blocks.length;j++){
   const [x,y,w,d]=blocks[i].envelope,[a,b,c,e]=blocks[j].envelope;
   assert.ok(x+w<=a+1e-8||a+c<=x+1e-8||y+d<=b+1e-8||b+e<=y+1e-8);
  }
 }
});
test('classrooms reject insufficient space or quantity instead of omitting desks',()=>{
 for(const q of ['aula de 4 x 4 para 30 alumnos','aula de 8 x 9 para 0 alumnos','aula de 8 x 9 para 30 alumnos con 1 filas','aula de 8 x 9 para 30 alumnos con pasillo de 0,5 m'])assert.throws(()=>engine.run(q));
});
test('classroom instructions route to native generator and cannot lose seating via generic resize',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../cad-arq-pro.js'),'utf8');
 const a=src.indexOf('function arqClassroomRequest(raw)'),b=src.indexOf('function arqSanitaryBatteryRequest(raw)',a);
 const match=new Function(src.slice(a,b)+'return arqClassroomRequest;')();
 for(const [q] of cases)assert.ok(match(q));
 assert.equal(match('buscar aulas con pupitres'),false);
 assert.match(src,/if\(arqClassroomRequest\(raw\)\)return \{kind:'draw'\}/);
 assert.match(src,/!meta\.brief\.classroomGrid/);
});
