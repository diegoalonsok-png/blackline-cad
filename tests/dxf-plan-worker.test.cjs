const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const start=html.indexOf('var cadPlanInsertSequence='),end=html.indexOf('window.cadInsertDxfPlan=cadInsertDxfPlan;',start);
assert.ok(start>=0&&end>start);
function boot(overrides={}){
 const calls=[],listeners=new Map(),state={entities:[],unit:'m'};
 const context={state,cadDrawEpoch:1,cadDxfActiveJob:null,Worker:function(){},U:{m:1},
  fetch:async(url,opts)=>{calls.push(['fetch',opts.cache]);return {ok:true,arrayBuffer:async()=>new ArrayBuffer(0)}},
  cadDxfDecode:()=>'',readDimensionStyle:()=>({}),cadParseDXFWorker:async()=>{calls.push(['worker']);return {entities:[{type:'line',a:{x:0,y:0},b:{x:1,y:1}}],unitCode:6}},
  toast:m=>calls.push(['toast',m]),setTool:()=>{},saveHistory:()=>calls.push(['history']),
  canvas:{style:{},addEventListener:(n,fn)=>listeners.set(n,fn),removeEventListener:(n)=>listeners.delete(n)},
  document:{addEventListener:(n,fn)=>listeners.set(n,fn),removeEventListener:(n)=>listeners.delete(n)},...overrides};
 vm.runInNewContext(html.slice(start,end),context);return {context,calls,listeners};
}
test('DXF insertion uses background parser and avoids caching geometry',async()=>{
 const h=boot();await h.context.cadInsertDxfPlan('plan.dxf','Plan');
 assert.deepEqual(h.calls.slice(0,2),[['fetch','no-store'],['worker']]);
 assert.ok(h.listeners.has('pointerdown'));assert.equal(h.context.state.entities.length,0);
 h.listeners.get('keydown')({key:'Escape'});assert.equal(h.listeners.size,0);
});
test('Late worker response cannot arm insertion after switching drawings',async()=>{
 let resolve;const h=boot({cadParseDXFWorker:()=>new Promise(r=>{resolve=r})});
 const job=h.context.cadInsertDxfPlan('plan.dxf','Plan');
 for(let i=0;i<10&&!resolve;i++)await Promise.resolve();
 assert.ok(resolve);h.context.state.entities=[];
 resolve({entities:[{type:'line',a:{x:0,y:0},b:{x:1,y:1}}],unitCode:6});await job;
 assert.equal(h.listeners.size,0);assert.equal(h.context.state.entities.length,0);
});
test('New insertion removes prior placement listeners; changed drawing cancels placement',async()=>{
 const h=boot();await h.context.cadInsertDxfPlan('a.dxf','A');
 const old=h.listeners.get('pointerdown');await h.context.cadInsertDxfPlan('b.dxf','B');
 assert.notEqual(h.listeners.get('pointerdown'),old);h.context.cadDrawEpoch++;
 h.listeners.get('pointerdown')({button:0});assert.equal(h.listeners.size,0);
 assert.ok(!h.calls.some(x=>x[0]==='history'));
});
test('No synchronous fallback for plan insertion when worker is unavailable',async()=>{
 const h=boot({Worker:undefined});await h.context.cadInsertDxfPlan('a.dxf','A');
 assert.equal(h.listeners.size,0);assert.ok(h.calls.some(x=>x[0]==='toast'&&/segundo plano/.test(x[1])));
 assert.ok(!h.calls.some(x=>x[0]==='worker'));
});
