/* CAD2D3D | Conversión local DWG ↔ DXF por lotes. No usa el servicio pago. */
(function(){
'use strict';
if(window.CAD2D_DWG_BATCH)return;
const $=id=>document.getElementById(id);
let busy=false,cancel=false;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function button(){
 if($('cadDwgBatchButton'))return;
 const b=document.createElement('button');b.id='cadDwgBatchButton';b.type='button';b.textContent='DWG ↔ DXF · Lotes';
 b.className='btn slim';b.title='Conversor local gratuito DWG ↔ DXF, sin enviar archivos';
 b.style.cssText='margin:4px 2px;white-space:nowrap;flex-shrink:0';
 b.onclick=show;
 const target=document.querySelector('.brandbar .right')||document.querySelector('.brandbar')||document.body;
 target.appendChild(b);
 if(!$('cadVitruviaLink')){
  const v=document.createElement('a');v.id='cadVitruviaLink';v.className='btn slim';
  v.href='https://vitruvius-digital-library.org/vitruvia';v.target='_blank';v.rel='noopener';
  v.textContent='Vitruvia';v.title='Vitruvia · buscador académico de arquitectura y humanidades (Vitruvius Digital Library)';
  v.style.cssText='margin:4px 0 4px 2px;padding:0 9px;white-space:nowrap;text-decoration:none;display:inline-flex;align-items:center;flex-shrink:0;font-family:Georgia,serif;letter-spacing:.02em';
  target.appendChild(v);
  const fit=()=>{if(target.scrollWidth>target.clientWidth+1)b.textContent='DWG ↔ DXF';else if(target.scrollWidth+60<target.clientWidth)b.textContent='DWG ↔ DXF · Lotes';};
  requestAnimationFrame(fit);addEventListener('resize',()=>{b.textContent='DWG ↔ DXF · Lotes';requestAnimationFrame(fit)});
 }
}
function show(){
 let pane=$('cadDwgBatchPanel');
 if(pane){pane.hidden=false;return}
 pane=document.createElement('section');
 pane.id='cadDwgBatchPanel';
 pane.style.cssText='position:fixed;z-index:12000;top:65px;right:16px;width:min(480px,calc(100vw - 32px));max-height:calc(100vh - 85px);overflow:auto;padding:18px;border-radius:12px;background:#18232b;border:1px solid #b7a17a;color:#f5f5f3;box-shadow:0 12px 40px #000a;font:13px system-ui';
 pane.innerHTML='<div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><strong>Conversión DWG ↔ DXF por lotes</strong><button class="btn slim" data-close type="button">Cerrar</button></div><p>Seleccioná el sentido y los archivos. El motor local se carga solo al convertir. No se envían planos ni se modifica el dibujo abierto.</p><label style="display:block;margin:8px 0">Formato de salida <select data-direction class="btn slim"><option value="dwg-dxf">DWG → DXF</option><option value="dxf-dwg">DXF → DWG</option></select></label><input data-files type="file" multiple accept=".dwg,.dwt" style="display:block;max-width:100%;margin-bottom:12px"><button class="btn primary" data-start type="button">Convertir archivos</button> <button class="btn slim" data-stop type="button" disabled>Detener después del actual</button><p data-status aria-live="polite"></p><div data-results style="max-height:260px;overflow:auto"></div><p style="font-size:11px">Motor local experimental. Si todavía no está publicado, podés usar <a href="https://www.gnu.org/software/libredwg/" target="_blank" rel="noopener noreferrer" style="color:#9edbe8">LibreDWG</a> (instalación independiente) o <a href="https://www.opendesign.com/guestfiles/oda_file_converter" target="_blank" rel="noopener noreferrer" style="color:#9edbe8">ODA File Converter</a> sujeto a sus términos.</p>';
 document.body.appendChild(pane);
 pane.querySelector('[data-close]').onclick=()=>{if(busy){pane.querySelector('[data-status]').textContent='Detené la conversión antes de cerrar';return}pane.hidden=true};
 pane.querySelector('[data-stop]').onclick=()=>{cancel=true};
 pane.querySelector('[data-start]').onclick=run;
 pane.querySelector('[data-direction]').onchange=e=>{const f=pane.querySelector('[data-files]');f.value='';f.accept=e.target.value==='dwg-dxf'?'.dwg,.dwt':'.dxf'};
}
function download(name,data){
 const blob=new Blob([data],{type:/\.dwg$/i.test(name)?'application/acad':'application/dxf'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=name;a.style.display='none';document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),60000);
}
async function convertLocal(file,direction,options={}){
 try{return await convertOnce(file,direction,false,options)}
 catch(err){
  const reason=String(err.message||err);
  if(direction!=='dwg-dxf'||!reason.startsWith('AEC_OMISSIONS:'))throw err;
  if(!window.confirm(reason.replace('AEC_OMISSIONS: ','')+'\n\nLa copia DXF puede quedar incompleta y perder objetos o propiedades arquitectónicas. El DWG original no cambia. ¿Abrir o convertir solamente lo recuperable?'))throw Error('Conversión cancelada; DWG original conservado.');
  return await convertOnce(file,direction,true,options);
 }
}
async function convertOnce(file,direction,allowPartial,options={}){
 const signal=options.signal;
 if(signal?.aborted)throw Error('Conversión cancelada');
 if(!file.size||file.size>64*1024*1024)throw Error('Archivo vacío o mayor a 64 MiB');
 let bytes=await file.arrayBuffer();
 if(signal?.aborted)throw Error('Conversión cancelada');
 if(direction==='dxf-dwg'){
  const raw=new Uint8Array(bytes),marker=new TextEncoder().encode('CAD2D-PROJECT-JSON');
  // Strip the app's optional embedded project only when directly after DXF EOF.
  const eof=new TextEncoder().encode('EOF');
  outer:for(let i=0;i<=raw.length-marker.length;i++){
   if(raw[i]!==marker[0])continue;
   for(let j=1;j<marker.length;j++)if(raw[i+j]!==marker[j])continue outer;
   let k=i-1;while(k>=0&&(raw[k]===10||raw[k]===13||raw[k]===32||raw[k]===9))k--;
   if(k>=2&&raw[k-2]===eof[0]&&raw[k-1]===eof[1]&&raw[k]===eof[2]){bytes=bytes.slice(0,i);break}
  }
 }
 return new Promise((resolve,reject)=>{
  const worker=new Worker(new URL('cad-dwg-local-worker.js?v=20261123-wasm-v4',document.baseURI),{type:'module'}),timer=setTimeout(()=>finish('Tiempo límite de conversión'),180000);
  let done=false;
  const abort=()=>finish('Conversión cancelada');
  function finish(error,output){if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);worker.terminate();if(error)reject(Error(error));else resolve(output)}
  worker.onmessage=e=>{const d=e.data||{};if(d.error)return finish(d.error);if(!(d.output instanceof ArrayBuffer)||!d.output.byteLength)return finish('Salida inválida del conversor');try{if(options.preview instanceof ArrayBuffer)options.onPreview?.(d.previewEmbedded===true)}catch(err){return finish(err.message||String(err))}finish(null,d.output)};
  worker.onerror=e=>finish(e.message||'No pudo iniciarse el motor');
  worker.onmessageerror=()=>finish('No se pudo recuperar la respuesta del conversor');
  if(signal?.aborted)return abort();signal?.addEventListener('abort',abort,{once:true});
  try{worker.postMessage({bytes,direction,allowPartial,preview:options.preview},[bytes])}catch(err){finish(err.message)}
 });
}
async function run(){
 const pane=$('cadDwgBatchPanel'),files=Array.from(pane.querySelector('[data-files]').files||[]);
 if(busy||!files.length)return;
 const direction=pane.querySelector('[data-direction]').value,reverse=direction==='dxf-dwg';
 busy=true;cancel=false;
 const start=pane.querySelector('[data-start]'),stop=pane.querySelector('[data-stop]'),out=pane.querySelector('[data-results]'),status=pane.querySelector('[data-status]'),mode=pane.querySelector('[data-direction]');mode.disabled=true;
 start.disabled=true;stop.disabled=false;out.innerHTML='';
 let ok=0,fail=0,seen=new Set();
 for(let i=0;i<files.length;i++){
  if(cancel)break;
  const f=files[i],name=f.name.replace(/\.(dwg|dwt|dxf)$/i,reverse?'.dwg':'.dxf');
  if(!(reverse?/\.dxf$/i:/\.(dwg|dwt)$/i).test(f.name)||seen.has(f.name+'|'+f.size)){continue}
  seen.add(f.name+'|'+f.size);
  status.textContent='Convirtiendo '+(i+1)+' / '+files.length+': '+f.name;
  const line=document.createElement('div');line.style.cssText='padding:5px 0;border-top:1px solid #46525a';line.textContent=f.name+' — procesando…';out.appendChild(line);
  try{
   const bytes=await convertLocal(f,direction);
   if(!(bytes instanceof ArrayBuffer)||!bytes.byteLength)throw Error('Salida inválida');
   const header=new TextDecoder().decode(bytes.slice(0,20000));
   if(reverse?!/^AC10\d{2}/.test(header):!/\bSECTION\b/.test(header))throw Error('Formato de salida inválido');
   download(name,bytes);ok++;line.textContent=f.name+' — convertido, '+name+' descargado';
  }catch(e){fail++;line.textContent=f.name+' — ERROR: '+String(e.message||e).slice(0,150)}
 }
 status.textContent='Terminado: '+ok+' convertido(s), '+fail+' fallido(s)'+(cancel?', interrumpido por el usuario':'')+'. Revisar geometría, escala y licencia antes de incorporarlos a la biblioteca.';
 busy=false;start.disabled=false;stop.disabled=true;mode.disabled=false;
}
window.CAD2D_DWG_BATCH={open:show,convertLocal};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',button);else button();
})();
