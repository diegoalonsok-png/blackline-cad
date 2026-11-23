/* Quality regression: 2D door, window and refrigerator elevations.
   Run: node --test tests/cad2d-elevation-views-restored.test.cjs */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const get=p=>fs.readFileSync(path.join(root,p),'utf8');
const context=vm.createContext({window:{},atob:s=>Buffer.from(s,'base64').toString('latin1')});
const scripts=['assets/cad2d-arq-generators.js',
 'assets/cad2d-dk-blocks.js',
 'assets/cad2d-views-cuts-20261123.js',
 'assets/cad2d-elevations-curated-20261123.js',
 'assets/cad2d-dynamic-openings-20261123.js',
 'assets/cad2d-quality-curation-20261123.js'];
for(const src of scripts)vm.runInContext(get(src),context,{filename:src});
const lib=context.window.CAD2D_ARQ_LIBRARY,all=lib.library;
const created=all.filter(x=>/^olymp2-ca-puerta-elev|^olymp2-ca-co-refr|^bl-view-window-/.test(x.id));
test('restores 10 detailed doors, 5 technical windows and 3 refrigerators',()=>{
 assert.equal(context.window.CAD2D_ELEVATION_RESCUE.doors,10);
 assert.equal(context.window.CAD2D_ELEVATION_RESCUE.windows,5);
 assert.equal(context.window.CAD2D_ELEVATION_RESCUE.fridges,3);
 assert.equal(created.length,18);
 assert.ok(created.every(x=>!x.hideFromGallery));
});
test('door and window elevations are dynamic and preserve editable source entities',()=>{
 const openings=created.filter(x=>/puerta|window/.test(x.id));
 assert.equal(openings.length,15);
 for(const item of openings){
  assert.equal(item.dynamicOpening?.projection,'elevation',item.id);
  const a=lib.build(item.id,item.w,item.d);
  assert.ok(a.entities.length>=12,item.id);
  const b=lib.build(item.id,item.w*1.10,item.d*1.05);
  assert.equal(a.entities.length,b.entities.length,item.id+' changes topology');
  assert.ok(a.entities.every(x=>['line','rect','arc','circle'].includes(x.type)));
 }
});
test('fridge drawings and old high-quality windows are visible, low-detail drafts remain hidden',()=>{
 for(const item of created.filter(x=>/refr/.test(x.id))){
  assert.ok(lib.build(item.id,item.w,item.d).entities.length>=15,item.id);
 }
 for(const id of ['dk-ventana-2x2-vista','dk-ventana-bano-vista']){
  assert.ok(all.find(x=>x.id===id&&!x.hideFromGallery),id+' hidden');
 }
 for(const id of ['alz-puerta-placa','alz-ventana-corrediza','cv-heladera-fre']){
  assert.equal(all.find(x=>x.id===id)?.hideFromGallery,true,id+' schematics resurfaced');
 }
});
test('gallery access is loaded after elevation definitions and groups views separately',()=>{
 const html=get('index.html'),browser=get('cad-block-browser.js');
 const order=['assets/cad2d-elevations-curated-20261123.js',
  'assets/cad2d-dynamic-openings-20261123.js','cad-arq-pro.js','cad-block-browser.js'];
 const i=order.map(x=>html.indexOf('src="'+x));
 assert.ok(i.every((x,n)=>x>=0&&(!n||x>i[n-1])));
 for(const key of ['doorElev','windowElev','fridgeElev'])
  assert.match(browser,new RegExp('\\b'+key+':\\{'));
 assert.match(browser,/!it\.hideFromGallery/);
});
