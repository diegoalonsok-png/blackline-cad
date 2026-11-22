'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {spawn,spawnSync}=require('node:child_process'),os=require('node:os');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const source=fs.readFileSync(path.join(__dirname,'../cad3d-lab.js'),'utf8');
test('CAD3D docking source is valid and keeps toolbar command wiring',()=>{
 assert.doesNotThrow(()=>new Function(source));
 for(const token of ['cad3dDockTop','cad3dDockBottom','cad3dDockLeft','cad3dDockRight',
  'window.addEventListener(\'pointermove\',onMove,true)',
  "cad3dToolbarLayout=cad3dEnableMovableToolbars()",
  'cad3dCompactMode',"data-solid-command=\"extrude\""])
  assert.ok(source.includes(token),token);
});
test('real browser: toolbars compact, drag to bottom, re-dock to top and keep commands', {timeout:55000},async t=>{
 const chrome=['chromium','google-chrome','chromium-browser'].map(c=>spawnSync('which',[c],{encoding:'utf8'})).find(r=>r.status===0)?.stdout.trim();
 if(!chrome){t.skip('Chromium not installed');return;}
 const cwd=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cad3d-dock-'));
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
  const call=(method,params={})=>new Promise((resolve,reject)=>{const next=++id,timer=setTimeout(()=>reject(Error('timeout '+method)),12000);pending.set(next,{resolve,reject,timer});ws.send(JSON.stringify({id:next,method,params}));});
  const evalJS=async expr=>{const r=await call('Runtime.evaluate',{expression:expr,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(expr+' '+r.exceptionDetails.text);return r.result.value;};
  await call('Runtime.enable');await call('Page.enable');
  await call('Emulation.setDeviceMetricsOverride',{width:1500,height:950,deviceScaleFactor:1,mobile:false});
  let ready=false;for(let i=0;i<100;i++){ready=await evalJS("Boolean(document.getElementById('cad3dOpen'))");if(ready)break;await sleep(100);}
  assert.ok(ready,'launcher available');
  await evalJS("document.getElementById('cad3dOpen').click()");
  let built=false;for(let i=0;i<50;i++){built=await evalJS("Boolean(document.querySelector('#cad3dLab .cad3dDockBottom'))");if(built)break;await sleep(100);}
  assert.ok(built,'dock zones created');
  const initial=await evalJS(`(()=>{const r=document.getElementById('cad3dLab');const b=r.querySelector('.cad3dProfileTools [data-action="line"]');return {compact:r.classList.contains('cad3dCompactMode'),bars:r.querySelectorAll('.cad3dDockTop > .cad3dDockBar').length,width:b.getBoundingClientRect().width,hidden:getComputedStyle(b.querySelector('span')).display==='none'};})()`);
  assert.equal(initial.compact,true);assert.equal(initial.bars,5);
  assert.ok(initial.width<=40,'compact icon size = '+initial.width);assert.equal(initial.hidden,true);
  const result=await evalJS(`(()=>{
   const r=document.getElementById('cad3dLab'),el=r.querySelector('.cad3dProfileTools'),grip=el.querySelector('.cad3dToolbarGrip'),top=r.querySelector('.cad3dDockTop');
   const p=grip.getBoundingClientRect(),id=172,px=p.left+p.width/2,py=p.top+p.height/2;
   const ev=(kind,x,y,target)=>target.dispatchEvent(new PointerEvent(kind,{bubbles:true,cancelable:true,pointerId:id,button:0,clientX:x,clientY:y}));
   ev('pointerdown',px,py,grip);ev('pointermove',px+30,py+60,window);
   const bottom=r.querySelector('.cad3dDockBottom'),bt=bottom.getBoundingClientRect();
   ev('pointermove',bt.left+bt.width/2,bt.top+Math.max(5,bt.height/2),window);
   ev('pointerup',bt.left+bt.width/2,bt.top+Math.max(5,bt.height/2),window);
   const docked=el.parentNode.dataset.dockZone;
   el.querySelector('[data-action="line"]').click();
   const commandWorked=el.querySelector('[data-action="line"]').classList.contains('armed');
   const grip2=el.querySelector('.cad3dToolbarGrip'),p2=grip2.getBoundingClientRect(),xx=p2.left+p2.width/2,yy=p2.top+p2.height/2;
   ev('pointerdown',xx,yy,grip2);ev('pointermove',xx+20,yy-50,window);
   const tp=top.getBoundingClientRect();ev('pointermove',tp.left+40,tp.top+15,window);ev('pointerup',tp.left+40,tp.top+15,window);
   const returned=el.parentNode.dataset.dockZone;
   const g3=el.querySelector('.cad3dToolbarGrip'),p3=g3.getBoundingClientRect(),x3=p3.left+p3.width/2,y3=p3.top+p3.height/2;
   ev('pointerdown',x3,y3,g3);ev('pointermove',x3+20,y3+55,window);
   const body=r.querySelector('.body').getBoundingClientRect();
   ev('pointermove',body.left+18,body.top+Math.min(130,body.height/2),window);
   ev('pointerup',body.left+18,body.top+Math.min(130,body.height/2),window);
   const lateral=el.parentNode.dataset.dockZone;
   g3.dispatchEvent(new MouseEvent('dblclick',{bubbles:true,cancelable:true}));
   return {docked,commandWorked,returned,lateral,reset:el.parentNode.dataset.dockZone,
    saved:!!localStorage.getItem('blackline-cad3d-dock-layout-v2')};
  })()`);
  assert.equal(result.docked,'bottom');assert.equal(result.commandWorked,true);
  assert.equal(result.returned,'top');assert.equal(result.lateral,'left');
  assert.equal(result.reset,'top');assert.equal(result.saved,true);
 }finally{try{ws?.close();}catch(_){}proc.kill('SIGTERM');server.close();try{fs.rmSync(tmp,{recursive:true,force:true,maxRetries:8,retryDelay:100});}catch(_){} }
});
