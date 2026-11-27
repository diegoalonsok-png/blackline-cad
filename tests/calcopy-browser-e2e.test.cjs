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

test('browser: CALCOPY reads walls, marks a typed block and commits native CAD entities', {timeout:90000},async t=>{
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
  '--remote-allow-origins=*','--remote-debugging-port=0','--user-data-dir='+temp,'about:blank'],{stdio:['ignore','ignore','pipe']});
 let browserErrors='';browser.stderr.on('data',chunk=>{browserErrors+=chunk.toString().slice(-2000)});
 console.log('Browser binary: '+chrome);
 let ws=null;
 try{
  const portFile=path.join(temp,'DevToolsActivePort');
  for(let i=0;i<350&&!fs.existsSync(portFile)&&browser.exitCode===null;i++)await sleep(100);
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
   ready=await evaluate("Boolean(window.CAD2D_CORE && window.CAD2D_APPLY_TRACE_PLAN && window.CAD2D_EXTENSIONS?.commands?.CALCOPY && window.CAD2D_ARQ_LIBRARY && document.getElementById('cadCanvas'))");
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
  // A deterministic worker response isolates browser wiring from CDN/model downloads.
  // All subsequent canvas interaction and the native CAD transaction are real.
  await evaluate("(async()=>{const C=window.CAD2D_CORE,S=C.state;const cv=document.createElement('canvas');cv.width=600;cv.height=400;const ctx=cv.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,600,400);ctx.fillStyle='#000';ctx.fillRect(50,50,500,10);ctx.fillRect(50,340,500,10);ctx.fillRect(50,50,10,300);ctx.fillRect(540,50,10,300);const blob=await new Promise(r=>cv.toBlob(r,'image/png'));await window.CAD2D_IMPORT_FILE(new File([blob],'calcopy-e2e.png',{type:'image/png'}));const im=S.entities.filter(e=>e.type==='image').at(-1);if(!im)throw Error('no inserted image');const center=C.world(C.P(C.canvas.clientWidth/2,C.canvas.clientHeight/2));const k=1000/C.U[S.unit];im.a=C.P(center.x-6*k,center.y-4*k);im.b=C.P(center.x+6*k,center.y+4*k);S.selected=[im.id];C.updateAll();C.zoomExtents();const Native=window.Worker;window.Worker=class extends EventTarget{constructor(url,opts){super();if(!String(url).includes('cad-calcopy-worker.js'))return new Native(url,opts);}postMessage(){setTimeout(()=>this.onmessage?.({data:{type:'result',best:'solid',readings:{solid:[{a:[55,55],b:[545,55],t:10}],lines:[],metric:[{a:[55,55],b:[545,55],t:10},{a:[55,55],b:[55,345],t:10},{a:[545,55],b:[545,345],t:10},{a:[55,345],b:[545,345],t:10}]},regions:[],floor_grids:[],doors:[]}}),20);}terminate(){}};C.command('CALCOPY');return true;})()");
  let bar=false;for(let i=0;i<100;i++){bar=await evaluate("Boolean([...document.querySelectorAll('dialog[open] input[type=text]')].find(e=>e.placeholder.includes('bloque')||e.placeholder.includes('block')))");if(bar)break;await sleep(100);}
  assert.ok(bar,'CALCOPY toolbar appeared');
  const initial=await evaluate("(()=>{const d=[...document.querySelectorAll('dialog[open]')].find(e=>e.querySelector('input[placeholder]'));return d.textContent.match(/\\d+ WALL · \\d+ BLK/)?.[0]||''})()");
  assert.match(initial,/4 WALL · 0 BLK/);
  await evaluate("(()=>{const e=[...document.querySelectorAll('dialog[open] input[type=text]')].find(e=>e.placeholder.includes('bloque')||e.placeholder.includes('block'));e.focus();e.value='';})()");
  await type('inodoro');await key('Enter');
  const block=await evaluate("(()=>{const e=[...document.querySelectorAll('dialog[open] input[type=text]')].find(e=>e.placeholder.includes('bloque')||e.placeholder.includes('block'));return e.value;})()");
  assert.match(block,/inodoro|toilet/i,'typed block recognized');
  const location=await evaluate("(()=>{const C=window.CAD2D_CORE,im=C.state.entities.filter(e=>e.type==='image').at(-1),r=C.canvas.getBoundingClientRect(),p=C.screen(C.P((im.a.x+im.b.x)/2,(im.a.y+im.b.y)/2));return {x:Math.round(r.left+p.x),y:Math.round(r.top+p.y)};})()");
  await click(location.x,location.y);
  const marked=await evaluate("(()=>{const d=[...document.querySelectorAll('dialog[open]')].find(e=>e.querySelector('input[placeholder]'));return d.textContent.match(/\\d+ WALL · \\d+ BLK/)?.[0]||''})()");
  assert.match(marked,/4 WALL · 1 BLK/);
  await evaluate("(()=>{const b=[...document.querySelectorAll('dialog[open] button')].find(e=>/^(Finalizar|Finish)$/.test(e.textContent));if(!b||b.disabled)throw Error('finish unavailable');b.click();})()");
  let result;for(let i=0;i<50;i++){result=await evaluate("(()=>{const S=window.CAD2D_CORE.state;return {walls:S.entities.filter(e=>e.wall2d).length,blocks:S.entities.filter(e=>e.type==='blockRef'&&e.arqRole==='san-wc').length,images:S.entities.filter(e=>e.type==='image').length};})()");if(result.walls>=8&&result.blocks===1)break;await sleep(100);}
  assert.equal(result.walls,8,'four native wall face pairs');assert.equal(result.blocks,1,'one editable WC block');assert.equal(result.images,1,'reference retained');
 }finally{
  ws?.close();browser.kill('SIGKILL');await new Promise(resolve=>server.close(resolve));
  try{fs.rmSync(temp,{recursive:true,force:true,maxRetries:10,retryDelay:100})}catch(error){console.warn('Chrome test cleanup: '+error.message)}
 }
});
