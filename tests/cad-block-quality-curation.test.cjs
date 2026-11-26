/* QA: schematic gallery cleanup preserves existing CAD block geometry.
 * Run: node --test tests/cad-block-quality-curation.test.cjs */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const sources=[
 'assets/cad2d-arq-generators.js',
 'assets/cad2d-doc-blocks.js',
 'cad-dk-demand.js',
 'assets/cad2d-dk-blocks.js',
 'assets/cad2d-modern-pro-blocks.js',
 'assets/cad2d-olympiadas-pro.js',
 'assets/cad2d-olimpiadas-banos-20261123.js',
 'assets/cad2d-olimpiadas-cocinas-20261123.js',
 'assets/cad2d-views-cuts-20261123.js',
 'assets/cad2d-dynamic-openings-20261123.js',
 'assets/cad2d-quality-curation-20261123.js'
];
const context=vm.createContext({window:{},atob:s=>Buffer.from(s,'base64').toString('latin1')});
for(const file of sources)vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
const lib=context.window.CAD2D_ARQ_LIBRARY,items=lib.library,quality=context.window.CAD2D_BLOCK_QUALITY;
test('all rudimentary people, vehicles and trees are hidden from BOTH galleries',()=>{
 for(const id of ['alz-persona-1','alz-persona-2','alz-persona-nino','pv-parado-fre',
  'pv-parada-falda-fre','alz-arbol-copa','ext-arbol','veh-camioneta',
  'cv-auto-lat','vm-mesa-comedor-fre','pro26-vehicle-suv-200']){
  const item=items.find(x=>x.id===id);
  assert.ok(item,id+' missing');assert.equal(item.hideFromGallery,true,id+' visible');
 }
 const browser=fs.readFileSync(path.join(root,'cad-block-browser.js'),'utf8');
 const panel=fs.readFileSync(path.join(root,'cad-arq-pro.js'),'utf8');
 assert.match(browser,/!it\.hideFromGallery/);assert.match(panel,/!x\.hideFromGallery/);
});
test('Olimpiadas originals and approved drawings remain available and editable',()=>{
 const originals=items.filter(x=>/^(?:olymp26-|olymp2-)/.test(x.id));
 assert.ok(originals.length>=44);
 for(const item of originals){
  assert.equal(Boolean(item.hideFromGallery),false,item.id);
  assert.ok(lib.build(item.id,item.w,item.d).entities.length>20,item.id+' source lost');
 }
 for(const id of ['dk-ventana-217','dk-puerta-140','bano-completo','kit-isla','sim-norte','doc-etiq']){
  assert.ok(items.find(x=>x.id===id&&!x.hideFromGallery),id+' incorrectly filtered');
 }
});
test('hidden blocks retain their vector definitions for old drawings',()=>{
 assert.equal(quality.missing,0);
 assert.ok(quality.newlyHidden>=295);
 for(const id of ['alz-persona-1','cv-auto-lat','vm-mesa-comedor-fre']){
  const item=items.find(x=>x.id===id);
  assert.ok(lib.build(id,item.w,item.d).entities.length>0,id+' geometry removed');
 }
});
test('personal blocks are never hidden by the catalog cleanup',()=>{
 const own={id:'my-door-test',name:'Puerta personal',cat:'Mis bloques',mine:true,
  w:.9,d:.9,gen(b,W,D){b.rect(0,0,W,D)}};
 items.push(own);
 vm.runInContext(fs.readFileSync(path.join(root,sources.at(-1)),'utf8'),context);
 assert.notEqual(own.hideFromGallery,true);
 items.pop();
});
test('quality filter loads after source libraries and before galleries',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const positions=['assets/cad2d-arq-generators.js','assets/cad2d-dk-blocks.js',
  'assets/cad2d-olimpiadas-cocinas-20261123.js',
  'cad-my-blocks.js','assets/cad2d-quality-curation-20261123.js',
  'cad-arq-pro.js','cad-block-browser.js'].map(x=>html.indexOf('src="'+x));
 assert.ok(positions.every((x,i)=>x>=0&&(i===0||x>positions[i-1])));
});
