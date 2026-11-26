'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const pack=JSON.parse(fs.readFileSync(path.join(root,'assets/cad2d-architecture-pack-28.json'),'utf8'));
const loader=fs.readFileSync(path.join(root,'assets/cad2d-architecture-pack.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const expected={'Cocina':6,'Baños':6,'Dormitorio':4,'Mobiliario':4,'Oficinas':2,'Paisajismo':2,'Accesibilidad':2,'Circulación':2};
test('28 new vector blocks, unique IDs, metric sizes and a clear provenance',()=>{
 assert.equal(pack.schema,'cad2d-architecture-blocks-v1');
 assert.equal(pack.units,'m');assert.equal(pack.blocks.length,28);
 assert.equal(new Set(pack.blocks.map(b=>b.id)).size,28);
 assert.match(pack.provenance,/originales/);
 for(const [category,n] of Object.entries(expected))
  assert.equal(pack.blocks.filter(b=>b.category===category).length,n,category);
});
test('Every primitive is supported and contained in the declared 1:1 block bounds',()=>{
 for(const b of pack.blocks){
  assert.ok(b.width>0&&b.width<20&&b.depth>0&&b.depth<20,b.id);
  assert.ok(b.parts.length>0&&b.parts.length<=100,b.id);
  for(const p of b.parts){
   const t=p[0];assert.ok(['line','rect','circle','ellipse'].includes(t),b.id+': '+t);
   assert.ok(p.slice(1).every(Number.isFinite),b.id);
   const x=p[1],y=p[2];
   if(t==='rect')assert.ok(p.length===5&&p[3]>0&&p[4]>0&&x>=0&&y>=0&&x+p[3]<=b.width+.001&&y+p[4]<=b.depth+.001,b.id);
   if(t==='line')assert.ok(p.length===5&&x>=0&&x<=b.width&&p[3]>=0&&p[3]<=b.width&&y>=0&&y<=b.depth&&p[4]>=0&&p[4]<=b.depth,b.id);
   if(t==='circle')assert.ok(p.length===4&&p[3]>0&&x-p[3]>=0&&y-p[3]>=0&&x+p[3]<=b.width+.001&&y+p[3]<=b.depth+.001,b.id);
   if(t==='ellipse')assert.ok(p.length===5&&p[3]>0&&p[4]>0&&x-p[3]>=0&&y-p[4]>=0&&x+p[3]<=b.width+.001&&y+p[4]<=b.depth+.001,b.id);
  }
 }
});
test('Additional block loader leaves existing palettes intact and adds only on selection',()=>{
 new vm.Script(loader,{filename:'cad2d-architecture-pack.js'});
 assert.match(loader,/if\(!api\.hasBlock\(key\)\)api\.addBlock\(key,geometry\((?:item|block),api\.unit\(\)\)\)/);
 assert.match(loader,/api\.selectBlock\(key\)/);
 assert.match(loader,/FACTOR=\{m:1,cm:100,mm:1000,in:/);
 assert.match(loader,/new Set\(catalog\.blocks\.map\(x=>x\.category\)\)/);
 assert.equal((html.match(/assets\/cad2d-architecture-pack\.js/g)||[]).length,1);
 assert.match(html,/<script defer src="assets\/cad2d-architecture-pack\.js\?v=[^"]+"><\/script>/);
 assert.match(html,/assets\/dxf-block-collection\.js/);
 assert.match(html,/assets\/dxf-featured-blocks\.js/);
 assert.match(html,/assets\/cad2d-curated-library\.js/);
});
