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
const demandDir=path.join(root,'assets','architecture-demand-v1');
const catalog=JSON.parse(fs.readFileSync(path.join(demandDir,'catalog.json'),'utf8'));
test('All 28 remote geometry files match the originals, and metadata contains no primitives',()=>{
 assert.equal(catalog.schema,'cad2d-architecture-metadata-v1');
 assert.equal(catalog.units,'m');assert.equal(catalog.blocks.length,28);
 assert.equal(new Set(catalog.blocks.map(x=>x.key)).size,28);
 for(const meta of catalog.blocks){
  assert.match(meta.key,/^block-\d{2}$/);
  assert.equal(Object.hasOwn(meta,'parts'),false);
  const original=pack.blocks.find(b=>b.id===meta.id);
  assert.ok(original,meta.id);
  const block=JSON.parse(fs.readFileSync(path.join(demandDir,meta.key+'.json'),'utf8'));
  assert.deepEqual(block,original,meta.id);
  assert.equal(meta.width,block.width);assert.equal(meta.depth,block.depth);
  assert.equal(meta.category,block.category);
  assert.ok(fs.existsSync(path.join(demandDir,meta.key+'.svg')));
 }
});
test('Additional block loader leaves existing palettes intact',()=>{
 new vm.Script(loader,{filename:'cad2d-architecture-pack.js'});
 assert.equal((html.match(/assets\/cad2d-architecture-pack\.js/g)||[]).length,1);
 assert.match(html,/<script defer src="assets\/cad2d-architecture-pack\.js\?v=[^"]+"><\/script>/);
 assert.match(html,/assets\/dxf-block-collection\.js/);
 assert.match(html,/assets\/dxf-featured-blocks\.js/);
 assert.match(html,/assets\/cad2d-curated-library\.js/);
});
test('Gallery fetches only metadata initially and individual no-store geometry on selection',async()=>{
 const calls=[],added=new Map(),selected=[];
 const elements=[];
 function element(tag){
  const e={tag,style:{},children:[],listeners:{},append(...items){this.children.push(...items)},
   replaceChildren(){this.children=[]},setAttribute(){},
   addEventListener(name,fn){this.listeners[name]=fn}};
  elements.push(e);return e;
 }
 const container=element('root');
 const api={hasBlock:k=>added.has(k),addBlock:(k,g)=>added.set(k,g),unit:()=> 'mm',selectBlock:k=>selected.push(k)};
 let fail=false;
 const ctx={window:{BlacklineBlockAPI:api},document:{readyState:'complete',getElementById:id=>id==='blBody'?container:null,createElement:element},
  fetch:async(url,opts)=>{calls.push({url,cache:opts.cache});
   if(fail)return {ok:false,status:503};
   const json=JSON.parse(fs.readFileSync(path.join(root,url),'utf8'));
   return {ok:true,json:async()=>json};
  }};
 vm.runInNewContext(loader,ctx);
 await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(calls.map(c=>c.url),['assets/architecture-demand-v1/catalog.json']);
 assert.equal(added.size,0);assert.equal(selected.length,0);
 const buttons=elements.filter(e=>e.tag==='button'&&e.textContent==='Insertar bloque');
 assert.equal(buttons.length,28);
 fail=true;await buttons[0].listeners.click();assert.equal(added.size,0);assert.equal(selected.length,0);assert.equal(buttons[0].disabled,false);
 fail=false;await buttons[0].listeners.click();
 assert.deepEqual(calls.slice(1).map(x=>x.cache),['no-store','no-store']);
 assert.ok(calls.slice(1).every(x=>x.url==='assets/architecture-demand-v1/block-01.json'));
 assert.equal(added.size,1);assert.equal(selected.length,1);
 const geometry=[...added.values()][0];assert.equal(geometry[0].b.x,catalog.blocks[0].width*1000);
 await buttons[0].listeners.click();assert.equal(calls.length,3);assert.equal(added.size,1);assert.equal(selected.length,2);
});
