const test=require('node:test');
const assert=require('node:assert/strict');
const engine=require('../architecture/blackline-engine.js');
test('suite prompts generate separated native door and window openings',()=>{
 for(const q of ['habitación de 4x3 + baño','habitación de 4x3 con baño','habitación de 4 x 3 y baño','dormitorio 4x3 con baño en suite','bedroom 4x3 + bathroom','habitaciones x 3 de 4 x 3 cada una con baño','habitación de 4x3 + baño de 4x2.4']){
  const p=engine.run(q);assert.equal(p.rooms.length,q.startsWith('habitaciones x')?6:2);
  assert.equal(p.rooms[0].clearBounds[2],4);assert.equal(p.rooms[0].clearBounds[3],3);
  assert.ok(p.blocks.some(b=>b.role==='toilet'));assert.ok(p.blocks.some(b=>b.role==='bidet'));
  for(const w of p.walls){
   const L=Math.hypot(w.b[0]-w.a[0],w.b[1]-w.a[1]);
   const ops=p.openings.filter(o=>o.host===w.id).sort((a,b)=>a.offset-b.offset);
   for(let i=0;i<ops.length;i++){const o=ops[i];assert.ok(o.offset-o.width/2>w.thickness/2,q);assert.ok(o.offset+o.width/2<L-w.thickness/2,q);if(i)assert.ok(ops[i-1].offset+ops[i-1].width/2<o.offset-o.width/2,q);}
  }
 }
});
