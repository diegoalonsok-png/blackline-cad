'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('four standalone Blackline blocks register without fetching, then load individually',async()=>{
 const calls=[];
 const ctx=vm.createContext({window:{},AbortController,setTimeout,clearTimeout,fetch:async(url,options)=>{
  calls.push({url,cache:options.cache});
  return {ok:true,json:async()=>JSON.parse(read(url))};
 }});
 for(const name of ['assets/cad2d-arq-generators.js','cad-dk-demand.js','assets/cad2d-dk-blocks.js'])vm.runInContext(read(name),ctx,{filename:name});
 const lib=ctx.window.CAD2D_ARQ_LIBRARY,loader=ctx.window.CAD2D_DK_DEMAND;
 const ids=['dk-auto-planta','dk-arbol-vista','dk-modulor-silueta','dk-dos-arboles'];
 assert.equal(calls.length,0);
 for(const id of ids){
  const item=lib.library.find(x=>x.id===id);
  assert.ok(item?.remoteDK,id);
  assert.equal(loader.isReady(id),false);
  await Promise.all([loader.prepare(id),loader.prepare(id)]);
  assert.equal(loader.isReady(id),true);
  const built=lib.build(id,item.w,item.d);
  assert.ok(built.entities.length>0,id);
 }
 assert.equal(calls.length,ids.length);
 assert.ok(calls.every(c=>c.cache==='no-store'));
});
