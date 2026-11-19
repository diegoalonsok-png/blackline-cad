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

test('browser: AutoCAD-style PL, LINE distance 5, WALL options and wall distance 5', {timeout:45000},async t=>{
 const chrome=findChrome();
 if(!chrome){t.skip('Chrome not installed on the test runner');return;}
 const root=path.resolve(__dirname,'..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'cad2d-browser-'));
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
  '--remote-allow-origins=*','--remote-debugging-port=0','--user-data-dir='+temp,'about:blank'],{stdio:'ignore'});
 let ws=null;
 try{
  const portFile=path.join(temp,'DevToolsActivePort');
  for(let i=0;i<100&&!fs.existsSync(portFile);i++)await sleep(100);
  assert.ok(fs.existsSync(portFile),'headless Chrome started');
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
  await call('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  let ready=false;
  for(let i=0;i<80;i++){
   ready=await evaluate("Boolean(window.CAD2D_CORE && document.getElementById('cadCanvas'))");
   if(ready)break;
   await sleep(100);
  }
  assert.ok(ready,'CAD engine initialized');
  const key=async name=>{
   const character=name.length===1;
   const code=character?(/[0-9]/.test(name)?'Digit':'Key')+name.toUpperCase():name;
   const virtual=character?name.toUpperCase().charCodeAt(0):name==='Enter'?13:27;
   const params={key:name,code,windowsVirtualKeyCode:virtual,nativeVirtualKeyCode:virtual};
   await call('Input.dispatchKeyEvent',{type:'keyDown',...params,...(character?{text:name}:{} )});
   await call('Input.dispatchKeyEvent',{type:'keyUp',...params});
  };
  const type=async value=>{for(const char of value)await key(char)};
  const click=async (x,y)=>{
   await call('Input.dispatchMouseEvent',{type:'mouseMoved',x,y,button:'none'});
   await call('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',clickCount:1});
   await call('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',clickCount:1});
  };
  await evaluate("document.getElementById('cadCanvas').focus()");
  await type('pl');
  assert.equal((await evaluate("document.getElementById('command').value")).toUpperCase(),'PL');
  await key('Enter');
  assert.equal(await evaluate("window.CAD2D_CORE.state.tool"),'polyline');
  await key('Escape');
  await evaluate("document.getElementById('cadCanvas').focus()");
  await type('l');await key('Enter');
  assert.equal(await evaluate("window.CAD2D_CORE.state.tool"),'line');
  const box=await evaluate("(()=>{const b=document.getElementById('cadCanvas').getBoundingClientRect();return {x:b.left,y:b.top,w:b.width,h:b.height}})()");
  const x=Math.round(box.x+box.w*.35),y=Math.round(box.y+box.h*.35);
  await click(x,y);
  assert.equal(await evaluate("window.CAD2D_CORE.state.stage.length"),1);
  await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:x+130,y,button:'none'});
  await type('5');await key('Enter');
  const line=await evaluate("(()=>{const e=window.CAD2D_CORE.state.entities.filter(e=>e.type==='line'&&!e.wall2d).at(-1);return e?Math.hypot(e.b.x-e.a.x,e.b.y-e.a.y):null})()");
  assert.ok(line!==null&&Math.abs(line-5)<1e-5,'LINE 5 + Enter creates 5 meters, got '+line);
  await key('Escape');
  await evaluate("document.getElementById('cadCanvas').focus()");
  await type('wall');await key('Enter');
  assert.equal(await evaluate("window.CAD2D_CORE.state.tool"),'wall2d');
  await type('j');await key('Enter');
  await type('c');await key('Enter');
  assert.equal(await evaluate("document.getElementById('cadWallJustification').value"),'center');
  const wx=Math.round(box.x+box.w*.62),wy=Math.round(box.y+box.h*.64);
  await click(wx,wy);
  assert.equal(await evaluate("window.CAD2D_CORE.state.stage.length"),1);
  await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:wx+120,y:wy,button:'none'});
  await type('5');await key('Enter');
  const wall=await evaluate("(()=>{const e=window.CAD2D_CORE.state.entities.filter(e=>e.wall2d).at(-1);return e?Math.hypot(e.wall2d.guideB.x-e.wall2d.guideA.x,e.wall2d.guideB.y-e.wall2d.guideA.y):null})()");
  assert.ok(wall!==null&&Math.abs(wall-5)<1e-5,'WALL 5 + Enter creates 5 meters, got '+wall);
 }finally{
  ws?.close();browser.kill('SIGKILL');await new Promise(resolve=>server.close(resolve));
  fs.rmSync(temp,{recursive:true,force:true});
 }
});
