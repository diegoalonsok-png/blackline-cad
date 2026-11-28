const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const root='assets/arq-catalogue/v1/';
const catalogue=JSON.parse(fs.readFileSync(root+'index.json'));
const code=fs.readFileSync('cad-arq-pro.js','utf8');
const sanitary=new Function(code.slice(code.indexOf('function arqCheckSanitary('),code.indexOf('async function insertCataloguePlanById('))+';return arqCheckSanitary;')();
test('Native U and courtyard homes have connected furnished rooms and sanitary pairs',()=>{
 for(const [id,bedrooms,baths] of [['plan-901',3,1],['plan-902',4,2]]){
  const p=JSON.parse(fs.readFileSync(root+id+'.json'));
  assert(catalogue.some(x=>x.id===id&&x.format==='cad'&&x.typology));
  assert.equal(p.units,'m');assert.equal(p.rooms.filter(r=>r.kind==='bedroom').length,bedrooms);assert.equal(p.rooms.filter(r=>r.kind==='bathroom').length,baths);
  assert.equal(p.blocks.filter(b=>b.role==='bed').length,bedrooms);
  assert.equal(p.blocks.filter(b=>b.role==='toilet').length,baths);assert.equal(p.blocks.filter(b=>b.role==='bidet').length,baths);
  assert.deepEqual(sanitary(p,[]).issues,[]);
  const ids=new Set(p.walls.map(w=>w.id));assert.equal(ids.size,p.walls.length);
  for(const o of p.openings){const w=p.walls.find(w=>w.id===o.host);assert(w);const length=Math.hypot(w.a[0]-w.b[0],w.a[1]-w.b[1]);assert(o.offset-o.width/2>=.075-1e-8&&o.offset+o.width/2<=length-.075+1e-8);}
  const reach=new Set(['room0']);for(let i=0;i<p.rooms.length;i++)for(const c of p.connections){assert(ids.has(c.via));assert(p.openings.some(o=>o.host===c.via&&o.kind==='swing-door'));if(reach.has(c.from)||reach.has(c.to)){reach.add(c.from);reach.add(c.to);}}
  assert.equal(reach.size,p.rooms.length);
  for(const b of p.blocks){const [x,y,w,d]=b.envelope;assert(p.rooms.some(r=>{const [a,z,W,D]=r.clearBounds;return x>=a-1e-6&&y>=z-1e-6&&x+w<=a+W+1e-6&&y+d<=z+D+1e-6;}));}
  for(let i=0;i<p.blocks.length;i++)for(const b of p.blocks.slice(i+1)){const [x,y,w,d]=p.blocks[i].envelope,[a,z,W,D]=b.envelope;assert(!(x<a+W-1e-6&&a<x+w-1e-6&&y<z+D-1e-6&&z<y+d-1e-6));}
  assert(fs.readFileSync(root+id+'.svg','utf8').includes('<svg'));
 }
});
test('House gallery interleaves schemes before repeated graphic variants',()=>{
 const s=fs.readFileSync('cad-block-browser.js','utf8');
 const sort=new Function(s.slice(s.indexOf('function diversifyHousePlans('),s.indexOf('function isScaleFloorPlan('))+';return diversifyHousePlans;')();
 const a=[{planId:'a1',houseScheme:'bar',houseVariantKey:'a'},{planId:'a2',houseScheme:'bar',houseVariantKey:'a'},{planId:'b',houseScheme:'bar'},{planId:'u',houseScheme:'U'},{planId:'o',houseScheme:'courtyard'}];
 assert.deepEqual(sort(a).map(x=>x.planId),['a1','u','o','b','a2']);
});