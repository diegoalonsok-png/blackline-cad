/* CAD2D3D | Conversión DWG a DXF por lotes. Reutiliza exclusivamente el conversor existente. */
(function(){
'use strict';
if(window.CAD2D_DWG_BATCH)return;
const $=id=>document.getElementById(id);
let busy=false,cancel=false;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function button(){
 if($('cadDwgBatchButton'))return;
 const b=document.createElement('button');b.id='cadDwgBatchButton';b.type='button';b.textContent='DWG → DXF · Lotes';
 b.className='btn slim';b.title='Convertir varios archivos DWG usando el conversor normal del programa, uno por uno';
 b.style.cssText='margin:4px;white-space:nowrap';
 b.onclick=show;
 const target=document.querySelector('.brandbar .right')||document.querySelector('.brandbar')||document.body;
 target.appendChild(b);
}
function show(){
 let pane=$('cadDwgBatchPanel');
 if(pane){pane.hidden=false;return}
 pane=document.createElement('section');
 pane.id='cadDwgBatchPanel';
 pane.style.cssText='position:fixed;z-index:12000;top:65px;right:16px;width:min(480px,calc(100vw - 32px));max-height:calc(100vh - 85px);overflow:auto;padding:18px;border-radius:12px;background:#18232b;border:1px solid #b7a17a;color:#f5f5f3;box-shadow:0 12px 40px #000a;font:13px system-ui';
 pane.innerHTML='<div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><strong>Conversión DWG → DXF por lotes</strong><button class="btn slim" data-close type="button">Cerrar</button></div><p>Seleccioná varios DWG. Se convierten uno por vez con el mismo servicio de CAD2D3D. Los planos abiertos no se modifican. Guardá cada DXF generado.</p><input data-files type="file" multiple accept=".dwg,.dwt" style="display:block;max-width:100%;margin-bottom:12px"><button class="btn primary" data-start type="button">Convertir archivos</button> <button class="btn slim" data-stop type="button" disabled>Detener después del actual</button><p data-status aria-live="polite"></p><div data-results style="max-height:260px;overflow:auto"></div>';
 document.body.appendChild(pane);
 pane.querySelector('[data-close]').onclick=()=>{if(busy){pane.querySelector('[data-status]').textContent='Detené la conversión antes de cerrar';return}pane.hidden=true};
 pane.querySelector('[data-stop]').onclick=()=>{cancel=true};
 pane.querySelector('[data-start]').onclick=run;
}
function download(name,text){
 const blob=new Blob([text],{type:'application/dxf'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=name;a.style.display='none';document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),60000);
}
async function run(){
 const pane=$('cadDwgBatchPanel'),files=Array.from(pane.querySelector('[data-files]').files||[]);
 if(busy||!files.length)return;
 const converter=window.CAD2D_CONVERT_DWG_TEXT;
 if(typeof converter!=='function'){pane.querySelector('[data-status]').textContent='El conversor interno todavía no está disponible';return}
 busy=true;cancel=false;
 const start=pane.querySelector('[data-start]'),stop=pane.querySelector('[data-stop]'),out=pane.querySelector('[data-results]'),status=pane.querySelector('[data-status]');
 start.disabled=true;stop.disabled=false;out.innerHTML='';
 let ok=0,fail=0,seen=new Set();
 for(let i=0;i<files.length;i++){
  if(cancel)break;
  const f=files[i],name=f.name.replace(/\.(dwg|dwt)$/i,'.dxf');
  if(!/\.(dwg|dwt)$/i.test(f.name)||seen.has(f.name+'|'+f.size)){continue}
  seen.add(f.name+'|'+f.size);
  status.textContent='Convirtiendo '+(i+1)+' / '+files.length+': '+f.name;
  const line=document.createElement('div');line.style.cssText='padding:5px 0;border-top:1px solid #46525a';line.textContent=f.name+' — procesando…';out.appendChild(line);
  try{
   const source=/\.dwt$/i.test(f.name)?new File([f],f.name.replace(/\.dwt$/i,'.dwg'),{type:f.type}):f;
   const dxf=await converter(source);
   if(typeof dxf!=='string'||!/(^|\n)\s*SECTION\s*(\r?\n|$)/.test(dxf.slice(0,20000)))throw Error('DXF inválido');
   download(name,dxf);ok++;line.textContent=f.name+' — convertido, DXF descargado';
  }catch(e){fail++;line.textContent=f.name+' — ERROR: '+String(e.message||e).slice(0,150)}
 }
 status.textContent='Terminado: '+ok+' convertido(s), '+fail+' fallido(s)'+(cancel?', interrumpido por el usuario':'')+'. Revisar geometría, escala y licencia antes de incorporarlos a la biblioteca.';
 busy=false;start.disabled=false;stop.disabled=true;
}
window.CAD2D_DWG_BATCH={open:show};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',button);else button();
})();
