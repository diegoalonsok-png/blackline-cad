const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const start=html.indexOf('async function cad2dAutoSave(force=false)');
const end=html.indexOf('\nsetInterval(',start);
assert.ok(start>=0&&end>start);
function fixture({permission='granted',fail='',changeAt=''}={}){
 const events=[];let revision=0;
 const state={entities:[{id:1}],file:'drawing'};
 const change=()=>{revision++;};
 const stream={async write(){events.push('write');if(changeAt==='write')change();if(fail==='write')throw Error('write failed')},async close(){events.push('close');if(changeAt==='close')change()},async abort(){events.push('abort')}};
 const handle={name:'drawing.dxf',async queryPermission(){if(fail==='permission')throw Error('permission error');return permission},async createWritable(){if(fail==='create')throw Error('open failed');return stream}};
 const ctx=vm.createContext({state,cadProjectSaveHandle:handle,cadBlockEdit:null,cadAutoSaveBusy:false,cad2dLastAutoSig:'',cad2dLastAutoTime:0,cad2dDrawingSignature:()=>String(revision),cadBakName:()=>state.file,cadDxfWithProject:()=>'DXF',cadWriteBak:async()=>events.push('bak'),persistLocalBackup:async()=>{events.push('local');if(changeAt==='local')change();return true},toast:m=>events.push(m),log:()=>{},console:{warn:()=>{}},Date});
 vm.runInContext(html.slice(start,end),ctx);
 return {ctx,events,run:()=>vm.runInContext('cad2dAutoSave()',ctx)};
}
test('successful disk autosave updates signature only after closing stream',async()=>{
 const f=fixture();await f.run();assert.deepEqual(f.events.slice(0,3),['bak','write','close']);assert.equal(f.ctx.cad2dLastAutoSig,'0');assert.equal(f.ctx.cadAutoSaveBusy,false);
});
test('drawing changed during write aborts stale disk snapshot',async()=>{
 const f=fixture({changeAt:'write'});await f.run();assert.deepEqual(f.events,['bak','write','abort']);assert.equal(f.ctx.cad2dLastAutoSig,'');
});
test('disk write failure aborts and falls back to browser recovery',async()=>{
 const f=fixture({fail:'write'});await f.run();assert.deepEqual(f.events.slice(0,4),['bak','write','abort','local']);assert.equal(f.ctx.cad2dLastAutoSig,'0');
});
test('permission exceptions and denials fall back to browser recovery',async()=>{
 for(const opts of [{fail:'permission'},{permission:'denied'},{fail:'create'}]){const f=fixture(opts);await f.run();assert.deepEqual(f.events.slice(0,2),['bak','local']);assert.equal(f.ctx.cad2dLastAutoSig,'0')}
});
test('edits during close or local recovery are not marked saved',async()=>{
 for(const opts of [{changeAt:'close'},{permission:'denied',changeAt:'local'}]){const f=fixture(opts);await f.run();assert.equal(f.ctx.cad2dLastAutoSig,'');assert.equal(f.ctx.cadAutoSaveBusy,false);assert(!f.events.some(e=>e.startsWith('Autosave')))}
});
