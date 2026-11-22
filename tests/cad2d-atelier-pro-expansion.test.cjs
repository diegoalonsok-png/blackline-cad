'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const R=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(R,name),'utf8');
const core=read('assets/cad2d-arq-generators.js');
const first=read('assets/cad2d-atelier-parametric.js');
const extra=read('assets/cad2d-atelier-pro-expansion.js');
const page=read('index.html'),ui=read('cad-arq-pro.js');
function load(){
 const context={window:{},module:{exports:{}}};vm.createContext(context);
 vm.runInContext(core,context,{timeout:5000});
 vm.runInContext(first,context,{timeout:5000});
 const before=context.window.CAD2D_ARQ_LIBRARY.library.length;
 vm.runInContext(extra,context,{timeout:5000});
 return {...context,api:context.window.CAD2D_ARQ_LIBRARY,before,
  details:context.window.CAD2D_ATELIER_PRO_EXPANSION};
}
const isPro=id=>id.startsWith('modern-')||id.startsWith('atelier-');
test('All 146 previous modern blocks and 96 new additions are labelled PRO, no old library removals',()=>{
 const {api,before,details}=load();
 const pro=api.library.filter(x=>isPro(x.id));
 assert.equal(details.added,96);
 assert.equal(api.library.length,before+96);
 assert.equal(pro.length,242);
 assert.ok(pro.every(x=>x.pro===true));
 assert.equal(new Set(api.library.map(x=>x.id)).size,api.library.length);
 assert.ok(api.library.some(x=>x.id==='bano-toilette'));
});
test('12 PRO categories discoverable and loaded before ARQ modal builds',()=>{
 const {api,details}=load();
 assert.equal(details.categories.length,12);
 assert.ok(details.categories.every(c=>api.categories.includes(c)));
 for(const cat of details.categories)assert.equal(api.library.filter(x=>x.cat===cat).length,8,cat);
 const order=['cad2d-arq-generators.js','cad2d-atelier-parametric.js','cad2d-atelier-pro-expansion.js','cad-arq-pro.js'];
 const positions=order.map(x=>page.lastIndexOf(x));
 assert.ok(positions.every(n=>n>0));
 assert.ok(positions.every((n,i)=>i===0||n>positions[i-1]));
});
test('96 vector originals regenerate in min/default/max sizes = 288 independent cases',()=>{
 const {api}=load();let verified=0;
 const valid=new Set(['line','rect','polyline','circle','arc','ellipse','text','hatch']);
 for(const item of api.library.filter(x=>x.id.startsWith('atelier-pro-'))){
  assert.equal(item.pro,true);assert.equal(item.dynamicActions,true);
  assert.ok(item.wMax>item.wMin&&item.dMax>item.dMin,item.id);
  for(const [w,d] of [[item.wMin,item.dMin],[item.w,item.d],[item.wMax,item.dMax]]){
   const g=api.build(item.id,w,d);
   assert.ok(g.entities.length>0,item.id);
   assert.ok(Math.abs(g.w-w)<1e-8&&Math.abs(g.d-d)<1e-8,item.id);
   const ext=api.bounds(g.entities);
   assert.ok([ext.minX,ext.minY,ext.maxX,ext.maxY].every(Number.isFinite),item.id);
   for(const p of g.entities){assert.ok(valid.has(p.type),item.id+':'+p.type);
    assert.ok(!JSON.stringify(p).includes('null')&&!JSON.stringify(p).includes('NaN'),item.id);}
   verified++;
  }
 }
 assert.equal(verified,288);
});
test('Details regenerate by rule, including wardrobe panels, sofa cushions and facade fins',()=>{
 const {api}=load();
 const cases=['atelier-pro-storage-01','atelier-pro-modular-01','atelier-pro-kitchen-01',
  'atelier-pro-cowork-01','atelier-pro-retail-01','atelier-pro-glazing-07',
  'atelier-pro-exterior-01','atelier-pro-greenery-02','atelier-pro-lighting-02',
  'atelier-pro-civic-04'];
 for(const id of cases){const item=api.library.find(x=>x.id===id);assert.ok(item,id);
  const lo=api.build(id,item.wMin,item.dMin),hi=api.build(id,item.wMax,item.dMax);
  assert.notEqual(JSON.stringify(lo.entities),JSON.stringify(hi.entities));
  assert.notEqual(lo.entities.length,hi.entities.length,id+' should change part count');
 }
});
test('Gallery marks PRO visually and blocks insert, resize and variant without arq-pro permission',()=>{
 assert.ok(ui.includes('item.pro?'));
 assert.ok(ui.includes("const allowed=item=>!item.pro||Boolean(plan()?.can('arq-pro'));"));
 assert.ok(ui.includes("const denyPro=item=>"));
 assert.equal((ui.match(/return denyPro\(item\)/g)||[]).length,4);
 assert.ok(ui.includes("LIB.library.filter(x=>x.pro).length"));
 assert.ok(ui.includes("ref.blockName=ensureDefinition(item,w,d)"));
});
test('Loading PRO pack a second time does not duplicate definitions',()=>{
 const {api,window,details}=load(),count=api.library.length;
 const context={window};vm.createContext(context);vm.runInContext(extra,context,{timeout:5000});
 assert.equal(api.library.length,count);
 assert.equal(window.CAD2D_ATELIER_PRO_EXPANSION.added,0);
});
