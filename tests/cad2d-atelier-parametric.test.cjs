'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const baseSrc=read('assets/cad2d-arq-generators.js'),extraSrc=read('assets/cad2d-atelier-parametric.js');
const html=read('index.html'),palette=read('cad-arq-pro.js');
function setup(){
 const context={window:{},module:{exports:{}}};vm.createContext(context);
 vm.runInContext(baseSrc,context,{timeout:5000});
 const before=context.window.CAD2D_ARQ_LIBRARY.library.length;
 vm.runInContext(extraSrc,context,{timeout:5000});
 return {api:context.window.CAD2D_ARQ_LIBRARY,meta:context.window.CAD2D_ATELIER_PARAMETRIC,
 context,before};
}
test('Atelier extension loads before the CAD ARQ UI and preserves existing blocks',()=>{
 const src=html.indexOf('cad2d-arq-generators.js'),atelier=html.indexOf('cad2d-atelier-parametric.js'),arq=html.lastIndexOf('cad-arq-pro.js');
 assert.ok(src>0&&atelier>src&&arq>atelier);
 const r=setup();assert.equal(r.meta.newBlocks,120);
 assert.equal(r.api.library.length,r.before+120);
 assert.ok(r.api.library.some(x=>x.id==='modern-sofa-3'));
 assert.ok(r.api.library.some(x=>x.id==='bano-toilette'));
});
test('120 distinct contemporary definitions in 15 discoverable categories',()=>{
 const r=setup(),items=r.api.library.filter(x=>x.id.startsWith('atelier-'));
 assert.equal(items.length,120);
 assert.equal(new Set(items.map(x=>x.id)).size,120);
 assert.equal(new Set(items.map(x=>x.cat)).size,15);
 for(const d of items){assert.ok(r.api.categories.includes(d.cat),d.id);assert.ok(d.wMax>d.wMin&&d.dMax>d.dMin,d.id);
  assert.ok(typeof d.gen==='function'&&d.dynamicActions,d.id);}
});
test('All original vector blocks generate finite geometry at min/default/max dimensions',()=>{
 const {api}=setup();
 const items=api.library.filter(x=>x.id.startsWith('atelier-'));
 let tested=0;
 for(const item of items)for(const [w,d] of [[item.wMin,item.dMin],[item.w,item.d],[item.wMax,item.dMax]]){
  const {entities,w:outW,d:outD}=api.build(item.id,w,d);
  assert.ok(entities.length>0,item.id);
  assert.ok(Math.abs(outW-w)<1e-8&&Math.abs(outD-d)<1e-8,item.id);
  const allowed=new Set(['line','rect','polyline','circle','ellipse','arc','text']);
  for(const e of entities){assert.ok(allowed.has(e.type),item.id+':'+e.type);
   assert.ok(!JSON.stringify(e).includes('null')&&!JSON.stringify(e).includes('NaN'),item.id);
   const numbers=JSON.stringify(e).match(/-?\d+(\.\d+)?(e[+-]?\d+)?/gi)||[];
   for(const n of numbers)assert.ok(Number.isFinite(Number(n)),item.id);
  }
  tested++;
 }
 assert.equal(tested,360);
});
test('Key dynamic families regenerate internal detail counts, not simply stretched raster artwork',()=>{
 const {api}=setup();
 for(const id of ['atelier-living-01','atelier-office-04','atelier-kitchen-03',
                  'atelier-windows-07','atelier-outdoor-04','atelier-plants-02','atelier-stairs-01']){
  const d=api.library.find(x=>x.id===id);
  const a=api.build(id,d.wMin,d.dMin),b=api.build(id,d.wMax,d.dMax);
  assert.notEqual(JSON.stringify(a.entities),JSON.stringify(b.entities),id);
  assert.notEqual(a.entities.length,b.entities.length,id+' should add/remove architectural details by rules');
 }
});
test('Dynamic ARQ insertion and grips regenerate definitions with undo, not generic stretch',()=>{
 for(const k of ['function resizeRef(ref,W,D)','LIB.build(item.id,W,D)',
  "def.dynamic2d=false;def.dynamicActions=true","def.arq={id:item.id",
  "CORE.saveHistory();","ref.blockName=ensureDefinition(item,w,d)",
  "if(item.wMax>item.wMin)g.push","if(item.dMax>item.dMin&&!item.lockAspect)g.push"])
 assert.ok(palette.includes(k),k);
});
test('Extension is idempotent and never overwrites registered IDs',()=>{
 const r=setup(),size=r.api.library.length;
 vm.runInContext(extraSrc,r.context,{timeout:5000});
 assert.equal(r.api.library.length,size);
 assert.equal(r.context.window.CAD2D_ATELIER_PARAMETRIC.newBlocks,0);
});
