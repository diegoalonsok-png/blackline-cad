/* CC0 web blocks — licensing, no duplicate IDs, metric geometry, quality filtering.
 * Run: node --test tests/cad-cc0-web-blocks.test.cjs */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),libPath=p=>fs.readFileSync(path.join(root,p),'utf8');
const ctx=vm.createContext({window:{},atob:x=>Buffer.from(x,'base64').toString('latin1')});
for(const name of ['assets/cad2d-arq-generators.js',
 'assets/cad2d-doc-blocks.js','cad-dk-demand.js','assets/cad2d-dk-blocks.js','assets/cad2d-modern-pro-blocks.js',
 'assets/cad2d-olympiadas-pro.js','assets/cad2d-olimpiadas-banos-20261123.js',
 'assets/cad2d-olimpiadas-cocinas-20261123.js','assets/cad2d-views-cuts-20261123.js',
 'assets/cad2d-dynamic-openings-20261123.js','assets/cad2d-quality-curation-20261123.js',
 'assets/cad2d-cc0-curated-web-20261123.js']){
 vm.runInContext(libPath(name),ctx,{filename:name});
}
const catalog=ctx.window.CAD2D_ARQ_LIBRARY,all=catalog.library;
const ids=['cc0-fp-suv-elev','cc0-fp-bike-elev','cc0-fp-tractor-loader-elev','cc0-fp-nautical-trailer-elev'];
test('only four rights-cleared original vehicle elevations are introduced',()=>{
 assert.equal(ctx.window.CAD2D_CC0_WEB_SELECTION.count,4);
 assert.equal(new Set(all.map(x=>x.id)).size,all.length);
 for(const id of ids){
  const x=all.find(b=>b.id===id);
  assert.ok(x,id);assert.equal(x.license,'CC0-1.0');
  assert.ok(x.originalSVG&&x.source.startsWith('https://github.com/pjm4github/FloorPlanner/'));
  assert.notEqual(x.hideFromGallery,true);assert.equal(x.pro,false);
 }
});
test('each new block has useful vector detail and nominal real-world dimensions',()=>{
 const nominal={ 'cc0-fp-suv-elev':[4.8768,1.778,17],
  'cc0-fp-bike-elev':[1.7272,1.0668,16],
  'cc0-fp-tractor-loader-elev':[3.048,1.27,16],
  'cc0-fp-nautical-trailer-elev':[5.4864,1.8288,17]};
 for(const id of ids){
  const x=all.find(b=>b.id===id),g=catalog.build(id,x.w,x.d);
  assert.ok(Math.abs(g.w-nominal[id][0])<1e-6);
  assert.ok(Math.abs(g.d-nominal[id][1])<1e-6);
  assert.equal(g.entities.length,nominal[id][2]);
  assert.ok(g.entities.every(e=>['circle','polyline'].includes(e.type)));
  const vertices=g.entities.reduce((n,e)=>n+(e.type==='polyline'?e.pts.length:1),0);
  assert.ok(vertices>=45,id+' lacks sufficient vector detail: '+vertices);
 }
});
test('previous curation and professionally detailed Olimpiadas blocks remain untouched',()=>{
 assert.equal(all.filter(x=>!x.hideFromGallery).length,159);
 for(const id of ['alz-persona-1','pv-parado-fre','views26-vehicle-suv-lateral']){
  const x=all.find(x=>x.id===id);if(x)assert.equal(x.hideFromGallery,true);
 }
 assert.ok(all.filter(x=>/^(olymp26-|olymp2-)/.test(x.id)).every(x=>!x.hideFromGallery));
});
test('loading order: after catalog and curation but before galleries',()=>{
 const html=libPath('index.html');
 const scripts=['src="assets/cad2d-arq-generators.js','src="assets/cad2d-quality-curation-20261123.js',
 'src="assets/cad2d-cc0-curated-web-20261123.js','src="cad-arq-pro.js'];
 const pos=scripts.map(s=>html.indexOf(s));assert.ok(pos.every((x,i)=>x>=0&&(!i||x>pos[i-1])));
});
