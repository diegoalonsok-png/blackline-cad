const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const engine=require('../architecture/blackline-engine.js');
const src=fs.readFileSync('cad-arq-pro.js','utf8');
const section=(a,b)=>src.slice(src.indexOf(a),src.indexOf(b,src.indexOf(a)));
const audit=new Function(section('function arqAuditHouseTopology(','function arqRequireHouseTopology(')+';return arqAuditHouseTopology;')();
test('24 connected room layouts retain exact dimensions, native openings and correctly contained blocks',()=>{
 for(const [name,second,firstSizes,secondSizes,roles] of [
 ['cocina','lavadero',[[4,3],[5,4],[3,3],[4,4]],[[2,2],[3,2.5],[4,3]],['fridge','sink','range','washer','laundrySink']],
 ['living','comedor',[[4,3],[5,4],[6,5],[4,4]],[[3,3],[4,3],[5,4]],['sofa','table6']]
 ])for(const a of firstSizes)for(const b of secondSizes){
  const q=name+' '+a.join('x')+' + '+second+' '+b.join('x'),p=engine.run(q);
  assert.equal(p.strictHouseTopology,true,q);
  assert.deepEqual(p.rooms.map(r=>r.clearBounds.slice(2)),[a,b],q);
  assert.deepEqual(audit(p),[],q);
  assert.deepEqual(p.blocks.map(b=>b.role).sort(),roles.slice().sort(),q);
  assert.equal(p.connections.length,1,q);
  assert.ok(p.openings.some(o=>o.host===p.connections[0].via&&o.kind==='swing-door'),q);
  for(const block of p.blocks){const [x,y,w,d]=block.envelope;assert.ok(p.rooms.some(r=>{const [X,Y,W,D]=r.clearBounds;return x>=X-1e-7&&y>=Y-1e-7&&x+w<=X+W+1e-7&&y+d<=Y+D+1e-7}),q);}
 }
});
test('dimensioned linked-room language routes to drawing, not furnishing',()=>{
 const route=new Function(section('function arqLinkedRoomRequest(','function arqRouteOf(')+';return arqLinkedRoomRequest;')();
 for(const q of ['armar una cocina 4x3 + lavadero 2x2','kitchen 4x3 + laundry room 2x2','living 5x4 con comedor 4x3']){
  assert.equal(route(q),true,q);assert.equal(engine.run(q).rooms.length,2,q);
 }
 assert.equal(route('buscar cocina 4x3 + lavadero'),false);
 assert.equal(route('amueblar un living'),false);
});
