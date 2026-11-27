const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');const src=fs.readFileSync(path.join(root,'cad-arq-pro.js'),'utf8');const start=src.indexOf('function arqCheckSanitary('),end=src.indexOf('\nasync function insertCataloguePlanById',start);const check=new Function(src.slice(start,end)+';return arqCheckSanitary;')();const L=new Function('window',fs.readFileSync(path.join(root,'assets/cad2d-arq-generators.js'),'utf8')+';return window.CAD2D_ARQ_LIBRARY;')({}).library;
const cases=['T-3D-150a','T-3D-150b','T-3D-150c','T-3D-150d','T-2D-090a','T-4D-250a','T-4D-250b','T-4D-250c','T-4D-250d'];
for(const code of cases)test('Sanitary pair and privacy '+code,()=>{
 const original=JSON.parse(fs.readFileSync(path.join(root,'assets/arq-tipologias/v1',code+'.json'),'utf8')),r=check(original,L);
 assert.deepEqual(r.issues,[]);
 for(const room of r.plan.rooms.filter(x=>/bath|suite/.test(x.kind))){
  const [x,y,w,h]=room.clearBounds;
  const pairs=r.plan.blocks.filter(b=>/^san-(wc|bidet)/.test(b.catalogId)&&b.point[0]>=x-1e-6&&b.point[0]<=x+w+1e-6&&b.point[1]>=y-1e-6&&b.point[1]<=y+h+1e-6);
  assert.ok(pairs.length);
  if(pairs.length===2){assert.equal(pairs[0].rotation,pairs[1].rotation);const horizontal=pairs[0].rotation%180===0;assert.ok(Math.abs(pairs[0].point[horizontal?1:0]-pairs[1].point[horizontal?1:0])<.001);assert.ok(Math.abs(pairs[0].point[horizontal?0:1]-pairs[1].point[horizontal?0:1])<1);}
 }
 assert.deepEqual(check(r.plan,L).issues,[]);
 assert.deepEqual(r.plan.walls,original.walls);
 assert.deepEqual(r.plan.openings,original.openings);
});
for(const code of ['plan-008','plan-017','plan-108','plan-109'])test('Missing bidet is added or layout rejected '+code,()=>{const p=JSON.parse(fs.readFileSync(path.join(root,'assets/arq-catalogue/v1',code+'.json'),'utf8'));p.blocks=p.blocks.filter(b=>b.catalogId!=='san-bidet');const r=check(p,L);if(['plan-108','plan-109'].includes(code))assert.deepEqual(r.issues,[]);if(!r.issues.length){const wc=r.plan.blocks.find(b=>/^san-wc/.test(b.catalogId)),bd=r.plan.blocks.find(b=>b.catalogId==='san-bidet');assert.ok(wc&&bd);assert.equal(wc.rotation,bd.rotation);assert.ok(Math.abs(wc.point[wc.rotation%180===0?1:0]-bd.point[bd.rotation%180===0?1:0])<.001);assert.deepEqual(check(r.plan,L).issues,[]);}});
test('Accessible bathroom must be reviewed before adding bidet',()=>{const p=JSON.parse(fs.readFileSync(path.join(root,'assets/arq-catalogue/v1/plan-166.json'),'utf8'));p.blocks=p.blocks.filter(b=>b.catalogId!=='san-bidet');assert.ok(check(p,L).issues.length);});
