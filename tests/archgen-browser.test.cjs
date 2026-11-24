'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawn,spawnSync}=require('node:child_process');

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const findChrome=()=>['google-chrome','google-chrome-stable','chromium','chromium-browser']
 .map(bin=>spawnSync('which',[bin],{encoding:'utf8'})).find(r=>r.status===0)?.stdout.trim();

test('browser: ARCHGEN gallery, native insertion and undo for four families', {timeout:45000},async t=>{
 const chrome=findChrome();
 assert.ok(chrome,'Chrome is required for ARCHGEN browser validation');
 const root=path.resolve(__dirname,'..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'archgen-browser-'));
 const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  const pathname=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);
  const filename=path.resolve(root,'.'+pathname);
  if(filename!==root&&!filename.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(filename,(err,data)=>{
   if(err){res.writeHead(404).end();return;}
   const ext=path.extname(filename).toLowerCase();
   const types={'.html':'text/html','.js':'application/javascript','.json':'application/json',
    '.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
   res.setHeader('Content-Type',types[ext]||'application/octet-stream');
   res.end(data);
  });
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port+'/';
 const browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
  '--remote-allow-origins=*','--remote-debugging-port=0','--user-data-dir='+temp,'about:blank'],{stdio:['ignore','ignore','pipe']});
 let browserErrors='';browser.stderr.on('data',chunk=>{browserErrors+=chunk.toString().slice(-2000)});
 console.log('Browser binary: '+chrome);
 let ws=null;
 try{
  const portFile=path.join(temp,'DevToolsActivePort');
  for(let i=0;i<200&&!fs.existsSync(portFile);i++)await sleep(100);
  assert.ok(fs.existsSync(portFile),'headless Chrome started; exit='+browser.exitCode+'; stderr='+browserErrors.slice(-2400));
  const port=fs.readFileSync(portFile,'utf8').split('\n')[0];
  const res=await fetch('http://127.0.0.1:'+port+'/json/new?'+encodeURIComponent(url),{method:'PUT'});
  assert.equal(res.ok,true,'Chrome DevTools target created');
  const target=await res.json();
  ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})});
  let nextId=0;
  const pending=new Map();
  ws.addEventListener('message',event=>{
   const msg=JSON.parse(String(event.data));
   if(!msg.id||!pending.has(msg.id))return;
   const entry=pending.get(msg.id);pending.delete(msg.id);clearTimeout(entry.timer);
   if(msg.error)entry.reject(new Error(JSON.stringify(msg.error)));
   else entry.resolve(msg.result);
  });
  const call=(method,params={})=>new Promise((resolve,reject)=>{
   const id=++nextId;
   const timer=setTimeout(()=>{pending.delete(id);reject(new Error('DevTools timeout: '+method))},8000);
   pending.set(id,{resolve,reject,timer});
   ws.send(JSON.stringify({id,method,params}));
  });
  const evaluate=async expression=>{
   const response=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
   if(response.exceptionDetails)throw Error('Browser JavaScript error: '+expression);
   return response.result.value;
  };
  await call('Runtime.enable');
  await call('Page.enable');
  await call('Page.bringToFront');
  await call('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  let ready=false;
  for(let i=0;i<80;i++){
   ready=await evaluate("Boolean(window.CAD2D_CORE && document.getElementById('cadCanvas'))");
   if(ready)break;
   await sleep(100);
  }
  assert.ok(ready,'CAD engine initialized');
  // Exercise the real CAD ribbon command, gallery and insertion bridge.
  for(let i=0;i<80;i++){
   if(await evaluate("Boolean(window.CAD2D_ARCHGEN && window.CAD2D_ARCHGEN_INSERT && window.CAD2D_ARQ_LIBRARY && window.CAD2D_EXTENSIONS?.commands?.ARCHGEN)"))break;
   await sleep(100);
  }
  assert.equal(await evaluate("typeof window.CAD2D_ARCHGEN_INSERT"),'function');
  assert.equal(await evaluate("window.CAD2D_CORE.state.unit"),'m','test drawing uses metres');
  const capture=async name=>{
   const dir=process.env.ARCHGEN_SCREENSHOTS;
   if(!dir)return;
   fs.mkdirSync(dir,{recursive:true});
   const image=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
   fs.writeFileSync(path.join(dir,name+'.png'),Buffer.from(image.data,'base64'));
  };
  for(const spec of [{kind:'bath',w:3,d:3},{kind:'accessible',w:4,d:4},{kind:'bedroom',w:4,d:5},{kind:'kitchen',w:6,d:5}]){
   const before=await evaluate("JSON.stringify(window.CAD2D_CORE.state.entities)");
   const result=await evaluate(`(()=>{
    const core=window.CAD2D_CORE;
    const ids=new Set(core.state.entities.map(e=>e.id));
    core.command('ARCHGEN');
    const dlg=document.querySelector('[data-archgen-palette][open]');
    if(!dlg)return {error:'ARCHGEN palette did not open'};
    const q=s=>dlg.querySelector(s);
    q('[data-kind]').value=${JSON.stringify(spec.kind)};
    q('[data-w]').value=${spec.w};q('[data-d]').value=${spec.d};q('[data-count]').value=12;
    q('[data-hatch]').checked=true;q('[data-dim]').checked=true;
    q('[data-generate]').click();
    const cards=q('[data-gallery]').children;
    if(!cards.length)return {error:q('[data-status]').textContent};
    const variants=cards.length;
    cards[0].click();
    q('[data-insert]').click();
    if(dlg.open)return {error:q('[data-status]').textContent};
    const es=core.state.entities.filter(e=>!ids.has(e.id));
    const refs=es.filter(e=>e.type==='blockRef');
    const openings=refs.filter(e=>core.state.blocks[e.blockName]?.parametric);
    return {variants,entities:es.length,openings:openings.map(e=>({kind:core.state.blocks[e.blockName].parametric.kind,width:e.params?.width,cut:es.some(f=>f.autoOpeningRef===e.id)})),furniture:refs.length-openings.length,ordinary:refs.filter(e=>!openings.includes(e)).every(e=>{const def=core.state.blocks[e.blockName];return def&&!def.parametric&&!def.dynamic2d&&!def.dynamicActions&&!e.params}),dimensions:es.filter(e=>e.type==='dimension').length,hatches:es.filter(e=>e.type==='hatch').length};
   })()`);
   console.log(spec.kind+' CAD insertion: '+JSON.stringify(result));
   assert.ok(!result.error,result.error);
   assert.ok(result.variants>0);
   assert.ok(result.entities>6);
   assert.equal(result.openings.length,2);
   assert.deepEqual(result.openings.map(e=>e.kind).sort(),['framed-window','swing-door']);
   assert.ok(result.openings.every(e=>e.width>0&&e.cut),'parametric openings cut their own walls');
   assert.ok(result.furniture>=2);
   assert.equal(result.ordinary,true,'furniture and fixtures remain conventional CAD blocks');
   assert.equal(result.dimensions,2);
   assert.equal(result.hatches,1);
   await evaluate("window.CAD2D_CORE.undo()");
   assert.equal(await evaluate("JSON.stringify(window.CAD2D_CORE.state.entities)"),before,'undo restores drawing');
  }
  // Batch insertion through the actual gallery, with optional annotations switched off.
  const before=await evaluate("JSON.stringify(window.CAD2D_CORE.state.entities)");
  const readyBatch=await evaluate(`(()=>{
   const core=window.CAD2D_CORE;
   core.command('ARCHGEN');
   const dlg=document.querySelector('[data-archgen-palette][open]');
   if(!dlg)return false;
   const q=s=>dlg.querySelector(s);
   q('[data-kind]').value='bath';q('[data-w]').value=3;q('[data-d]').value=3;
   q('[data-count]').value=6;q('[data-dim]').checked=false;q('[data-hatch]').checked=false;
   q('[data-generate]').click();q('[data-all]').click();
   return q('[data-gallery]').children.length===6&&!q('[data-insert]').disabled;
  })()`);
  assert.equal(readyBatch,true,'six options selected from gallery');
  await capture('01-gallery-bath');
  const batch=await evaluate(`(()=>{
   const core=window.CAD2D_CORE,ids=new Set(core.state.entities.map(e=>e.id));
   const dlg=document.querySelector('[data-archgen-palette][open]');
   dlg.querySelector('[data-insert]').click();
   if(dlg.open)return {error:dlg.querySelector('[data-status]').textContent};
   const es=core.state.entities.filter(e=>!ids.has(e.id));
   const doors=es.filter(e=>e.type==='blockRef'&&core.state.blocks[e.blockName]?.parametric?.kind==='swing-door');
   const windows=es.filter(e=>e.type==='blockRef'&&core.state.blocks[e.blockName]?.parametric?.kind==='framed-window');
   return {doors:doors.length,windows:windows.length,positions:new Set(doors.map(e=>e.p.x+','+e.p.y)).size,cut:[...doors,...windows].every(e=>es.some(f=>f.autoOpeningRef===e.id)),dimensions:es.filter(e=>e.type==='dimension').length,hatches:es.filter(e=>e.type==='hatch').length};
  })()`);
  console.log('Batch CAD insertion: '+JSON.stringify(batch));
  assert.deepEqual(batch,{doors:6,windows:6,positions:6,cut:true,dimensions:0,hatches:0});
  await sleep(300);await capture('02-six-baths-in-cad');
  await evaluate("window.CAD2D_CORE.undo()");
  assert.equal(await evaluate("JSON.stringify(window.CAD2D_CORE.state.entities)"),before,'batch undo is atomic');
 }finally{
  ws?.close();browser.kill('SIGKILL');await new Promise(resolve=>server.close(resolve));
  try{fs.rmSync(temp,{recursive:true,force:true,maxRetries:10,retryDelay:100})}catch(error){console.warn('Chrome test cleanup: '+error.message)}
 }
});
