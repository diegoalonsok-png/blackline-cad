const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const h=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function source(a,b){const i=h.indexOf(a),j=h.indexOf(b,i);assert.ok(i>=0&&j>i);return h.slice(i,j)}
test('autosave detects geometry changes even with unchanged entity counts',()=>{
 const state={entities:[{id:1,a:{x:0,y:0}}],layers:[],blocks:{},history:[],future:[]};
 const sig=new Function('state','collectLayoutState','cadLayoutsSnapshot',source('function cad2dDrawingSignature(){','async function cad2dAutoSave(')+';return cad2dDrawingSignature')(state,()=>({}),()=>[]);
 const before=sig();assert.equal(sig(),before);state.entities[0].a.x=10;assert.notEqual(sig(),before);
 const moved=sig();state.layers.push({id:'wall'});assert.notEqual(sig(),moved);
});
function fake(){const request={result:42},tx={objectStore:()=>({})},db={transaction:()=>tx};const run=new Function('backupDb',source('function backupTransaction(','function backupPayload(')+';return backupTransaction')(db);return {request,tx,p:run('readwrite',()=>request)}}
test('backup waits for committed transaction',async()=>{const {request,tx,p}=fake();let done=false;p.then(()=>done=true);request.onsuccess();await Promise.resolve();assert.equal(done,false);tx.oncomplete();assert.equal(await p,42)});
test('backup rejects abort even after request success',async()=>{const {request,tx,p}=fake();const check=assert.rejects(p,/aborted/);request.onsuccess();tx.onabort();await check});
test('local XREF reload does not resurrect a removed definition',async()=>{
 const def={xref:{lastModified:0}},state={blocks:{'REFX:A':def}},handles=new Map([['REFX:A',{getFile:async()=>({lastModified:1})}]]);
 let applied=0;const reload=new Function('state','cadXrefHandles','cadXrefRead','saveHistory','cadXrefApply','toast','renderLayers','updateAll',source('async function cadXrefReload(','function cadXrefSelectedKeys(')+';return cadXrefReload')(state,handles,async()=>{delete state.blocks['REFX:A'];return {}},()=>{},()=>applied++,()=>{},()=>{},()=>{});
 await reload(null,true);assert.equal(applied,0);
});
test('cloud XREF reload ignores removed definition',async()=>{
 const state={blocks:{'REFX:A':{xref:{cloudId:'a'}}}};
 const reload=new Function('state','cadApi','cadXrefSafe',source('async function cadXrefLoadCloud(','async function cadXrefAttachCloud(')+';return cadXrefLoadCloud')(state,async()=>{delete state.blocks['REFX:A'];return {}},x=>x);
 assert.equal(await reload('a','A',true),false);
});
