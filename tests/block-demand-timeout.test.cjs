const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function boot(file,fetch,library){
 const timers=new Map();let next=0;
 const window=library?{CAD2D_ARQ_LIBRARY:library}:{};
 const context={window,fetch,AbortController,atob,console,
  setTimeout(fn,ms){assert.equal(ms,20000);const id=++next;timers.set(id,fn);return id},
  clearTimeout(id){timers.delete(id)}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context);
 return {window,timers,expire(){for(const fn of [...timers.values()])fn()}};
}
function stalled(signal){return new Promise((resolve,reject)=>{
 if(signal.aborted)return reject(Error('aborted'));
 signal.addEventListener('abort',()=>reject(Error('aborted')),{once:true});
})}
const response=doc=>({ok:true,json:async()=>doc});
test('Blackline: no preload, coalesces stalled requests, clears timeout and retries without cache',async()=>{
 let calls=0;
 const data={id:'dk-teclado',w:.46,d:.165,e:Array.from({length:11},()=>['L',0,0,1,1])};
 const h=boot('cad-dk-demand.js',async(url,opts)=>{
  assert.match(url,/dk-teclado\.json$/);assert.equal(opts.cache,'no-store');
  if(++calls===1)return {ok:true,json:()=>stalled(opts.signal)};
  return response(data);
 });
 const api=h.window.CAD2D_DK_DEMAND;
 assert.equal(calls,0);const a=api.prepare(data.id),b=api.prepare(data.id);
 const failed=Promise.allSettled([a,b]);await new Promise(setImmediate);h.expire();
 const result=await failed;assert.equal(calls,1);
 for(const x of result){assert.equal(x.status,'rejected');assert.match(x.reason.message,/Tiempo de espera/)}
 assert.equal(h.timers.size,0);assert.equal(api.isReady(data.id),false);
 await api.prepare(data.id);assert.equal(api.isReady(data.id),true);assert.equal(calls,2);assert.equal(h.timers.size,0);
});
test('Olimpiadas: stalled catalog can be retried, stalled geometry does not register a block',async()=>{
 const library={library:[],categories:[]};
 const blocks=Array.from({length:1001},(_,i)=>({id:'olymp3-test-'+i,source:'s'+i,name:'Block '+i,category:'Test',width:1,depth:1,sourceHash:'1234567890abcdef',segments:1}));
 let catalogCalls=0,geometryCalls=0;
 const h=boot('cad2d-olimpiadas3-loader.js',async(url,opts)=>{
  if(url.endsWith('catalog.json')){
   if(++catalogCalls===1)return stalled(opts.signal);
   return response({version:1,parts:16,blocks});
  }
  assert.equal(opts.cache,'no-store');
  if(++geometryCalls===1)return stalled(opts.signal);
  return response({...blocks[0],data:'AAAAAAAAAAA='});
 },library);
 const api=h.window.CAD2D_OLYMPIADAS3;
 assert.equal(catalogCalls,0);
 let failure=assert.rejects(api.loadCatalog(),/Tiempo de espera/);h.expire();await failure;
 await api.loadCatalog();assert.equal(catalogCalls,2);assert.equal(h.timers.size,0);
 failure=assert.rejects(api.ensureBlock(blocks[0].id),/Tiempo de espera/);
 // Allow loadCatalog's already-resolved async promise to settle first.
 await new Promise(setImmediate);
 assert.equal(geometryCalls,1);h.expire();await failure;
 assert.equal(library.library.length,0);assert.equal(h.timers.size,0);
 assert.equal(await api.ensureBlock(blocks[0].id),blocks[0].id);
 assert.equal(library.library.length,1);assert.equal(geometryCalls,2);assert.equal(h.timers.size,0);
});
