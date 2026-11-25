'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'cad-dk-demand.js'),'utf8');
function setup(fetcher,timers={}){
 const ctx=vm.createContext({window:{},fetch:fetcher,AbortController,setTimeout:timers.setTimeout||setTimeout,clearTimeout:timers.clearTimeout||clearTimeout});
 vm.runInContext(source,ctx);
 const api=ctx.window.CAD2D_DK_DEMAND,lib={library:[],categories:[]};
 api.register(lib);
 return {api,lib};
}
function payload(url){
 const name=url.split('/').pop();
 return JSON.parse(fs.readFileSync(path.join(root,'assets/blackline-dk-demand-v1',name),'utf8'));
}
test('metadata registration does not download any of the 56 geometry files',()=>{
 let requests=0;
 const {api,lib}=setup(()=>{requests++;throw Error('unexpected fetch')});
 assert.equal(api.count,56);assert.equal(lib.library.length,56);
 api.register(lib);assert.equal(lib.library.length,56);
 assert.equal(requests,0);assert.ok(lib.library.every(x=>!api.isReady(x.id)));
});
test('individual selection coalesces simultaneous downloads and never requests browser cache',async()=>{
 const requests=[];
 const {api,lib}=setup(async(url,opts)=>{
  requests.push({url,opts});
  return {ok:true,json:async()=>payload(url)};
 });
 await Promise.all([api.prepare('dk-auto-planta'),api.prepare('dk-auto-planta')]);
 assert.equal(requests.length,1);assert.match(requests[0].url,/dk-auto-planta\.json$/);
 assert.equal(requests[0].opts.cache,'no-store');assert.ok(requests[0].opts.signal);
 assert.ok(api.isReady('dk-auto-planta'));assert.ok(!api.isReady('dk-arbol-vista'));
 const item=lib.library.find(x=>x.id==='dk-auto-planta'),calls=[];
 const builder=new Proxy({}, {get:(_,k)=>k==='tp'?((x,y)=>({x,y})):(...args)=>calls.push([k,args])});
 item.gen(builder,item.w,item.d);assert.ok(calls.length>100);
});
test('invalid payload fails closed and can be retried',async()=>{
 let calls=0;
 const {api}=setup(async url=>({ok:true,json:async()=>++calls===1?{id:'wrong'}:payload(url)}));
 await assert.rejects(api.prepare('dk-auto-planta'),/incompatible/);
 assert.equal(api.isReady('dk-auto-planta'),false);
 await api.prepare('dk-auto-planta');
 assert.equal(calls,2);assert.equal(api.isReady('dk-auto-planta'),true);
});
test('timeout aborts the request, clears pending state and permits retry',async()=>{
 let trigger,ms,clears=0,calls=0;
 const {api}=setup((url,{signal})=>{
  if(++calls===1)return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('aborted')),{once:true}));
  return Promise.resolve({ok:true,json:async()=>payload(url)});
 },{setTimeout:(fn,n)=>{trigger=fn;ms=n;return 1},clearTimeout:()=>{clears++}});
 const first=api.prepare('dk-auto-planta');assert.equal(ms,20000);trigger();
 await assert.rejects(first,/Tiempo de descarga agotado/);
 assert.equal(api.isReady('dk-auto-planta'),false);
 await api.prepare('dk-auto-planta');assert.equal(calls,2);assert.equal(clears,2);
});
