'use strict';
// Production-only smoke test. No mocks, no local web server, no account login.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path');
const out=path.resolve('calcopy-public-output');fs.mkdirSync(out,{recursive:true});
const url='https://blackline-cad.org/';
const root=process.cwd();
const sample=path.join(root,'assets/architecture-references/house/unverified/user-drive-20261125-01.jpg');
const results=[];
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const mode of ['CALCOPYCONTORNO','CALCOPY']){
   const context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'});
   const page=await context.newPage(),errors=[],dialogs=[];
   const row={mode,url,sample:path.basename(sample),assumedWidthM:15,errors,dialogs};
   results.push(row);
   page.on('pageerror',e=>errors.push(e.message));
   page.on('dialog',async d=>{dialogs.push({type:d.type(),message:d.message()});if(d.type()==='confirm'&&/modelo|model/i.test(d.message()))await d.accept();else if(d.type()==='prompt')await d.dismiss();else await d.accept();});
   try{
    const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
    row.http=response?.status();
    if(!response?.ok())throw Error('Public website HTTP '+row.http);
    await page.waitForFunction(()=>window.CAD2D_CORE&&window.CAD2D_EXTENSIONS?.commands?.CALCOPY&&window.CAD2D_ARQ_LIBRARY,{},{timeout:30000});
    row.commands=await page.evaluate(()=>Object.keys(window.CAD2D_EXTENSIONS.commands).filter(k=>/^CALCOPY/.test(k)));
    if(!row.commands.includes(mode))throw Error('Command not deployed: '+mode);
    // Import the actual JPG through the editor's own raster importer. No fake CAD entities.
    await page.evaluate(async ({bytes,name})=>{
     const C=window.CAD2D_CORE,S=C.state,arr=Uint8Array.from(atob(bytes),s=>s.charCodeAt(0));
     await window.CAD2D_IMPORT_FILE(new File([arr],name,{type:'image/jpeg'}));
     const im=S.entities.filter(e=>e.type==='image').at(-1);if(!im)throw Error('Raster importer created no image');
     // Explicit assumed total width for this smoke test; not a verified physical dimension.
     const k=1000/C.U[S.unit],w=Math.abs(im.b.x-im.a.x),h=Math.abs(im.b.y-im.a.y),center=C.world(C.P(C.canvas.clientWidth/2,C.canvas.clientHeight/2));
     if(!(w>0&&h>0))throw Error('Raster size invalid');
     im.a=C.P(center.x-7.5*k,center.y-7.5*k*h/w);im.b=C.P(center.x+7.5*k,center.y+7.5*k*h/w);
     S.selected=[im.id];C.updateAll();C.zoomExtents();
    },{bytes:fs.readFileSync(sample).toString('base64'),name:path.basename(sample)});
    await page.screenshot({path:path.join(out,mode+'-01-source.png')});
    await page.evaluate(mode=>window.CAD2D_CORE.command(mode),mode);
    if(mode==='CALCOPYCONTORNO'){
     const bar=page.locator('#calcopyContourBar');await bar.waitFor({timeout:30000});
     row.preview=await bar.innerText();await page.screenshot({path:path.join(out,mode+'-02-preview.png')});
     await bar.getByRole('button',{name:/Insertar polilíneas|Insert polylines/}).click({timeout:10000});
    }else{
     const bar=page.locator('dialog[open]').filter({has:page.locator('input[placeholder*="block"],input[placeholder*="bloque"]')});
     await bar.waitFor({timeout:65000});
     row.previewBeforeAI=await bar.innerText();
     const ai=bar.getByRole('button',{name:/IA · Objetos|AI · Objects/});
     if(await ai.count()){
      await ai.click({timeout:10000});
      try{await page.waitForFunction(()=>[...document.querySelectorAll('dialog[open] button')].some(b=>/^(IA · Objetos|AI · Objects)$/.test(b.textContent)&&!b.disabled),{},{timeout:90000});}catch(e){row.aiTimeout=true;}
     }
     row.preview=await bar.innerText();await page.screenshot({path:path.join(out,mode+'-02-preview.png')});
     await bar.getByRole('button',{name:/^(Finalizar|Finish)$/}).click({timeout:10000});
    }
    await page.waitForTimeout(1200);
    row.entities=await page.evaluate(()=>{const S=window.CAD2D_CORE.state,es=S.entities;return {walls:es.filter(e=>e.wall2d).length,wallGroups:new Set(es.filter(e=>e.wall2d).map(e=>e.wall2d.group)).size,closedPolylines:es.filter(e=>e.type==='polyline'&&e.closed).length,blocks:es.filter(e=>e.type==='blockRef').length,roles:es.filter(e=>e.type==='blockRef').map(e=>e.arqRole||e.blockName),images:es.filter(e=>e.type==='image').length};});
    // Hide the raster in the isolated test drawing so screenshots show generated geometry alone.
    await page.evaluate(()=>{const C=window.CAD2D_CORE;C.state.entities=C.state.entities.filter(e=>e.type!=='image');C.state.selected=[];C.updateAll();C.zoomExtents();});
    await page.screenshot({path:path.join(out,mode+'-03-native-only.png')});
    row.geometryCreated=mode==='CALCOPYCONTORNO'?row.entities.closedPolylines>0:row.entities.wallGroups>0;
    row.autonomousWallsAndBlocks=mode==='CALCOPY'&&row.entities.wallGroups>0&&row.entities.blocks>0;
   }catch(e){row.failure=String(e.message||e);await page.screenshot({path:path.join(out,mode+'-error.png')}).catch(()=>{});}
   finally{await context.close();console.log(JSON.stringify(row));}
  }
 }finally{await browser.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));}
 if(!results.every(r=>r.geometryCreated)||!results.find(r=>r.mode==='CALCOPY')?.autonomousWallsAndBlocks)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
