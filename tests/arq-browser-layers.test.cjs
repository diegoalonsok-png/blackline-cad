'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {spawn,spawnSync}=require('node:child_process'),os=require('node:os');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
test('real browser: architecture gallery, inserted plan, independent layers, dimension labels and editable openings', {timeout:90000},async t=>{
 const chrome=['chromium','google-chrome','chromium-browser'].map(c=>spawnSync('which',[c],{encoding:'utf8'})).find(r=>r.status===0)?.stdout.trim();
 if(!chrome){t.skip('Chromium not installed');return;}
 const cwd=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cad-arq-browser-'));
 const server=http.createServer((req,res)=>{
  const u=new URL(req.url,'http://localhost'),name=decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname);
  const full=path.resolve(cwd,'.'+name);
  if(full!==cwd&&!full.startsWith(cwd+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(full,(err,data)=>{if(err){res.writeHead(404).end();return;}
   const ext=path.extname(full),types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png','.svg':'image/svg+xml'};
   res.setHeader('content-type',types[ext]||'application/octet-stream');res.end(data);
  });
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const port=server.address().port;
 const proc=spawn(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
  '--remote-allow-origins=*','--remote-debugging-port=0','--user-data-dir='+tmp,'about:blank'],{stdio:'ignore'});
 let ws;
 try{
  const active=path.join(tmp,'DevToolsActivePort');
  for(let i=0;i<160&&!fs.existsSync(active);i++)await sleep(100);
  assert.ok(fs.existsSync(active),'Chromium opened DevTools');
  const devPort=fs.readFileSync(active,'utf8').split('\n')[0];
  const resp=await fetch('http://127.0.0.1:'+devPort+'/json/new?'+encodeURIComponent('http://127.0.0.1:'+port+'/'),{method:'PUT'});
  assert.ok(resp.ok);const tab=await resp.json();
  ws=new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',j,{once:true});});
  const pending=new Map();let id=0;
  ws.addEventListener('message',ev=>{const m=JSON.parse(String(ev.data));const p=pending.get(m.id);if(!p)return;pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);});
  const call=(method,params={})=>new Promise((resolve,reject)=>{const next=++id,timer=setTimeout(()=>reject(Error('timeout '+method)),25000);pending.set(next,{resolve,reject,timer});ws.send(JSON.stringify({id:next,method,params}));});
  const evalJS=async expr=>{const r=await call('Runtime.evaluate',{expression:expr,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(expr+' '+r.exceptionDetails.text);return r.result.value;};
  await call('Runtime.enable');await call('Page.enable');
  await call('Emulation.setDeviceMetricsOverride',{width:1500,height:950,deviceScaleFactor:1,mobile:false});

  let ready=false;
  for(let i=0;i<100;i++){ready=await evalJS("Boolean(window.CAD2D_CORE&&window.CAD2D_ARQ&&document.getElementById('arqPanelSearch'))");if(ready)break;await sleep(200)}
  assert.ok(ready,'architecture palette loaded');
  const setup=await evalJS("(()=>{const input=document.getElementById('arqPanelSearch');input.value='Mostrame dormitorios familiares';input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));return {cards:[...document.querySelectorAll('#arqPanelGrid [data-arq]')].map(x=>x.dataset.arq),help:document.getElementById('arqHelp').textContent};})()");
  console.log('ARQ search',JSON.stringify(setup));
  assert.ok(setup.cards.length>=1,'family bedroom options');
  const info=await evalJS("(()=>{const c=window.CAD2D_CORE,s=c.state;const before=new Set(s.entities.map(e=>e.id));document.querySelector('#arqPanelGrid [data-arq]').click();if(s.tool!=='insertBlock')throw Error('Insertion not armed: '+s.tool);insertSelectedBlock({x:0,y:0});const r=s.entities.find(e=>!before.has(e.id)&&e.type==='blockRef');if(!r)throw Error('No inserted block');window.__arqTestId=r.id;c.zoomExtents();c.updateAll();const d=s.blocks[r.blockName],kids=c.blockChildren(r);return {item:d.arq.id,layers:[...new Set(kids.map(e=>e.layer))],dimensions:kids.filter(e=>e.type==='dimension').flatMap(e=>dimensionPrimitives(e)).filter(e=>e.type==='text').map(e=>e.text),openings:d.arq.openings};})()");
  console.log('ARQ inserted',JSON.stringify(info));
  for(const name of ['A-ARQ-MUROS','A-ARQ-ABERTURAS','A-ARQ-MOBILIARIO','A-ARQ-COTAS','A-ARQ-HATCH'])assert.ok(info.layers.includes(name),name);
  assert.equal(info.dimensions.length,2);
  assert.ok(info.dimensions.every(x=>/^\d+\.\d{2}$/.test(x)),'metre labels without units');
  const visibility=await evalJS("(async()=>{const c=window.CAD2D_CORE,s=c.state;const layer=s.layers.find(l=>l.id==='A-ARQ-HATCH');const button=()=>document.querySelector('#layers [data-layer=\"A-ARQ-HATCH\"][data-act=\"visible\"]');const frame=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));await frame();const before=c.canvas.toDataURL();const initial=layer.visible;button().click();await frame();const hidden=!layer.visible,changed=before!==c.canvas.toDataURL();button().click();await frame();return {initial,hidden,changed,restored:layer.visible};})()");
  console.log('ARQ visibility',JSON.stringify(visibility));
  assert.equal(visibility.initial,true);assert.equal(visibility.hidden,true);assert.equal(visibility.changed,true);assert.equal(visibility.restored,true);
  const edited=await evalJS("(()=>{const c=window.CAD2D_CORE,s=c.state,r=s.entities.find(e=>e.id===window.__arqTestId);s.selected=[r.id];c.updateAll();document.getElementById('arqDoorW').value='100';document.getElementById('arqDoorH').value='205';document.getElementById('arqWindowW').value='180';document.getElementById('arqWindowH').value='120';document.getElementById('arqOpeningApply').click();const a=s.blocks[r.blockName].arq;return {opening:a.opening,openings:a.openings};})()");
  console.log('ARQ edited',JSON.stringify(edited));
  assert.equal(edited.opening.doorWidth,1);assert.equal(edited.opening.windowWidth,1.8);
  assert.equal(edited.openings.find(x=>x.id==='entry').width,1);
  assert.equal(edited.openings.find(x=>x.id==='window').width,1.8);
 }finally{try{ws?.close();}catch(_){}proc.kill('SIGTERM');server.close();try{fs.rmSync(tmp,{recursive:true,force:true,maxRetries:8,retryDelay:100});}catch(_){} }
});
