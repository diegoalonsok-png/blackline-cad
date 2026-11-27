/* Blackline CAD · Proyectos en la nube y enlaces de solo lectura.
 * Usa el servidor de cuentas (api.blackline-cad.org): guarda el proyecto completo (capas, bloques, láminas),
 * conserva versiones anteriores (30 en Pro y Estudio, 10 en el plan gratis) y comparte un enlace de solo lectura
 * (?ver=<id>) donde quien lo recibe puede dejar comentarios marcados en el plano (dueño con Pro o Estudio). */
(function(){
'use strict';
const CORE=window.CAD2D_CORE;if(!CORE?.project)return;
const cfg=window.CAD2D_AUTH_CONFIG||{};
const base=(()=>{try{return new URL(cfg.statusUrl).origin}catch(e){return ''}})();
const es=()=>{try{return /^es/i.test(localStorage.getItem('cad2d-alias-language')||'')}catch(e){return false}};
const L=(a,b)=>es()?a:b;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let cloudId=null;try{cloudId=sessionStorage.getItem('cad2d-cloud-id')}catch(e){}
const setId=id=>{cloudId=id;try{id?sessionStorage.setItem('cad2d-cloud-id',id):sessionStorage.removeItem('cad2d-cloud-id')}catch(e){}};
async function api(path,opt={}){
 if(!base)throw Object.assign(Error(L('La nube no está disponible en esta versión del sitio.','Cloud is not available on this copy of the site.')),{code:0});
 const r=await fetch(base+path,{credentials:'include',...opt,headers:{'content-type':'application/json',accept:'application/json',...(opt.headers||{})}});
 let j={};try{j=await r.json()}catch(e){}
 if(!r.ok)throw Object.assign(Error(j.error||('HTTP '+r.status)),{code:r.status,upgrade:j.upgrade});
 return j;
}
const loginUrl=()=>cfg.loginUrl||'';
function needLogin(){
 if(!window.confirm(L('Para usar la nube ingresá con tu correo (te llega un enlace, sin contraseña). ¿Ir a ingresar?','To use the cloud, sign in with your email (you get a link, no password). Go to sign in?')))return;
 try{sessionStorage.setItem('cad2d-after-login','cloud')}catch(e){}
 if(loginUrl())location.href=loginUrl();
}
const fmtDate=t=>new Date(t*1000).toLocaleString(es()?'es-AR':'en-US',{dateStyle:'short',timeStyle:'short'});
async function save(){
 const name=CORE.state.file||'Dibujo';
 try{
  CORE.toast(L('Guardando en la nube…','Saving to the cloud…'));
  const data=JSON.stringify(CORE.project.snapshot(name));
  const j=await api('/api/projects',{method:'POST',body:JSON.stringify({id:cloudId,name,data})});
  setId(j.id);CORE.toast(L('Guardado en la nube · ','Saved to the cloud · ')+name);CORE.log('NUBE · '+name);
 }catch(e){if(e.code===401)return needLogin();if(e.upgrade&&window.CAD2D_PLAN)return window.CAD2D_PLAN.upsell?.(e.message);CORE.toast(L('No se pudo guardar en la nube: ','Could not save to the cloud: ')+e.message)}
}
async function open(id,name,data){
 if(CORE.state.entities.length&&!window.confirm(L('¿Abrir «'+name+'»? Lo que no hayas guardado del dibujo actual se pierde.','Open “'+name+'”? Unsaved changes in the current drawing will be lost.')))return false;
 await CORE.project.load(data,name);setId(id);CORE.toast(L('Abierto desde la nube: ','Opened from the cloud: ')+name);return true;
}
async function dialog(){
 document.getElementById('cadCloudDlg')?.remove();
 const d=document.createElement('div');d.id='cadCloudDlg';d.className='modal-backdrop show';
 d.innerHTML='<div class="modal" style="max-width:720px"><div class="modal-head"><h2>'+L('Mis proyectos en la nube','My cloud projects')+'</h2><button class="btn" data-x>✕</button></div><div class="cad-cloud-body"><p class="help">'+L('Cargando…','Loading…')+'</p></div><div style="display:flex;justify-content:space-between;gap:8px;margin-top:12px;flex-wrap:wrap"><span class="help">'+L('Versiones anteriores por proyecto: 30 en Pro y Estudio, 10 en el plan gratis.','Previous versions per project: 30 on Pro and Studio, 10 on the free plan.')+'</span><button class="btn primary" data-save>☁ '+L('Guardar el dibujo actual','Save current drawing')+'</button></div></div>';
 document.body.append(d);
 const body=d.querySelector('.cad-cloud-body');
 const render=async()=>{
  let list;try{list=(await api('/api/projects')).projects}catch(e){if(e.code===401){body.innerHTML='<p class="help">'+L('Ingresá con tu correo para ver tus proyectos.','Sign in with your email to see your projects.')+'</p><button class="btn primary" data-login>'+L('Ingresar','Sign in')+'</button>';return}body.innerHTML='<p class="help">'+esc(e.message)+'</p>';return}
  if(!list.length){body.innerHTML='<p class="help">'+L('Todavía no guardaste proyectos en la nube.','No cloud projects yet.')+'</p>';return}
  body.innerHTML='<table class="cad-cloud-table" data-no-cad-translate><tr><th>'+L('Proyecto','Project')+'</th><th>'+L('Modificado','Modified')+'</th><th>'+L('Tamaño','Size')+'</th><th></th></tr>'+list.map(p=>'<tr data-id="'+esc(p.id)+'"'+(p.id===cloudId?' class="cur"':'')+'><td><b>'+esc(p.name)+'</b>'+(p.shareId?' <span class="tag">🔗</span>':'')+'</td><td>'+fmtDate(p.updatedAt)+'</td><td>'+(p.size/1024).toFixed(0)+' KB</td><td class="acts"><button class="btn slim" data-open>'+L('Abrir','Open')+'</button><button class="btn slim" data-share>'+(p.shareId?L('Enlace','Link'):L('Compartir','Share'))+'</button><button class="btn slim" data-ver>'+L('Versiones','Versions')+'</button>'+(p.shareId?'<button class="btn slim" data-com>💬</button>':'')+'<button class="btn slim" data-ren>✎</button><button class="btn slim" data-del>🗑</button></td></tr>').join('')+'</table>';
  body._list=list;
 };
 d.addEventListener('click',async e=>{
  if(e.target===d||e.target.closest('[data-x]'))return d.remove();
  if(e.target.closest('[data-login]'))return needLogin();
  if(e.target.closest('[data-save]')){await save();return render()}
  const tr=e.target.closest('tr[data-id]');if(!tr)return;const id=tr.dataset.id,p=(body._list||[]).find(x=>x.id===id);if(!p)return;
  try{
   if(e.target.closest('[data-open]')){const j=await api('/api/projects/'+id);if(await open(id,j.name,j.data))d.remove();return}
   if(e.target.closest('[data-ren]')){const n=window.prompt(L('Nuevo nombre','New name'),p.name);if(!n?.trim())return;await api('/api/projects/'+id+'/rename',{method:'POST',body:JSON.stringify({name:n.trim()})});return render()}
   if(e.target.closest('[data-del]')){if(!window.confirm(L('¿Borrar «'+p.name+'» de la nube? No se puede deshacer.','Delete “'+p.name+'” from the cloud? This cannot be undone.')))return;await api('/api/projects/'+id+'/delete',{method:'POST',body:'{}'});if(id===cloudId)setId(null);return render()}
   if(e.target.closest('[data-share]')){
    let sid=p.shareId;if(!sid)sid=(await api('/api/projects/'+id+'/share',{method:'POST',body:'{"on":true}'})).shareId;
    const url=location.origin+location.pathname+'?ver='+encodeURIComponent(sid);
    try{await navigator.clipboard.writeText(url)}catch(err){}
    const off=window.prompt(L('Enlace de solo lectura (copiado). Cualquiera con el enlace puede ver el plano sin cuenta.\nEscribí BORRAR para desactivarlo.','Read-only link (copied). Anyone with the link can view the drawing without an account.\nType DELETE to disable it.'),url);
    if(off&&/^(BORRAR|DELETE)$/i.test(off.trim()))await api('/api/projects/'+id+'/share',{method:'POST',body:'{"on":false}'});
    return render();
   }
   if(e.target.closest('[data-com]')){d.remove();return ownerComments(id,p.name)}
   if(e.target.closest('[data-ver]')){
    const v=(await api('/api/projects/'+id+'/versions')).versions;
    if(!v.length)return CORE.toast(L('Todavía no hay versiones anteriores.','No previous versions yet.'));
    const pick=window.prompt(L('Versiones anteriores (escribí el número para abrirla):\n','Previous versions (type the number to open it):\n')+v.map((x,i)=>(i+1)+') '+fmtDate(x.createdAt)).join('\n'),'1');
    const k=Number(pick);if(!(k>=1&&k<=v.length))return;
    const j=await api('/api/projects/'+id+'/versions/'+v[k-1].id);if(await open(id,j.name+' ('+fmtDate(v[k-1].createdAt)+')',j.data)){setId(null);CORE.toast(L('Versión abierta como copia: guardala con otro nombre o en la nube para restaurarla.','Version opened as a copy: save it to restore it.'));d.remove()}
   }
  }catch(err){if(err.code===401)return needLogin();CORE.toast(err.message)}
 });
 render();
}
// Vista compartida: ?ver=<id>
async function sharedView(){
 const sid=new URLSearchParams(location.search).get('ver');if(!sid||!base)return;
 try{
  const j=await api('/api/share/'+encodeURIComponent(sid));
  await CORE.project.load(j.data,j.name);setId(null);
  const bar=document.createElement('div');bar.id='cadSharedBar';bar.setAttribute('data-no-cad-translate','');
  bar.innerHTML='<b>'+esc(j.name)+'</b> · '+L('vista compartida de solo lectura','read-only shared view')+' · '+fmtDate(j.updatedAt)+' <button class="btn slim" data-com>💬 '+L('Comentarios','Comments')+'</button><button class="btn slim" data-copy>'+L('Guardar una copia para editar','Save a copy to edit')+'</button><button class="btn slim" data-close>✕</button>';
  document.body.append(bar);
  bar.addEventListener('click',e=>{if(e.target.closest('[data-close]'))bar.remove();if(e.target.closest('[data-com]'))commentsPanel({sid});if(e.target.closest('[data-copy]')){bar.remove();document.getElementById('saveAsBtn')?.click()}});
  // Si ya hay comentarios, se muestran sus marcas en el plano.
  api('/api/share/'+encodeURIComponent(sid)+'/comments').then(r=>{pins=r.comments||[];CORE.schedule()}).catch(()=>{});
 }catch(e){CORE.toast(L('No se pudo abrir el plano compartido: ','Could not open the shared drawing: ')+e.message)}
}
/* ---------- Comentarios: marcas numeradas sobre el plano ---------- */
let pins=[],placing=null;
function centerOn(c){
 if(!Number.isFinite(c?.x)||!Number.isFinite(c?.y))return;
 const v=CORE.state.view,cv=CORE.canvas;v.ox=cv.clientWidth/2-c.x*v.scale;v.oy=cv.clientHeight/2+c.y*v.scale;CORE.schedule();
}
function commentsPanel({sid,pid,name}){
 document.getElementById('cadCommentsDlg')?.remove();
 const owner=!!pid,d=document.createElement('aside');d.id='cadCommentsDlg';d.setAttribute('data-no-cad-translate','');
 d.innerHTML='<header><b>💬 '+L('Comentarios','Comments')+(name?' · '+esc(name):'')+'</b><button class="btn slim" data-x>✕</button></header><div class="list"><p class="help">'+L('Cargando…','Loading…')+'</p></div>'+
  (owner?'':'<div class="form"><input data-name maxlength="60" placeholder="'+L('Tu nombre','Your name')+'"><textarea data-text maxlength="1000" rows="3" placeholder="'+L('Escribí tu comentario…','Write your comment…')+'"></textarea><div class="row"><button class="btn slim" data-pin>📍 '+L('Marcar en el plano','Mark on drawing')+'</button><span class="help" data-where></span><button class="btn primary slim" data-send>'+L('Enviar','Send')+'</button></div></div>');
 document.body.append(d);
 const list=d.querySelector('.list');let point=null;
 try{const n=localStorage.getItem('cad2d-comment-name');if(n&&d.querySelector('[data-name]'))d.querySelector('[data-name]').value=n}catch(e){}
 const paint=arr=>{pins=arr;CORE.schedule();
  list.innerHTML=arr.length?arr.map((c,i)=>'<div class="c" data-i="'+i+'"><div><b>'+(i+1)+'. '+esc(c.author)+'</b> <span class="help">'+fmtDate(c.createdAt)+'</span>'+(owner?' <button class="btn slim" data-del="'+c.id+'">🗑</button>':'')+'</div><div>'+esc(c.text)+'</div>'+(Number.isFinite(c.x)?'<button class="btn slim" data-go="'+i+'">📍 '+L('Ver en el plano','Show on drawing')+'</button>':'')+'</div>').join(''):'<p class="help">'+L('Todavía no hay comentarios.','No comments yet.')+'</p>'};
 const url=owner?'/api/projects/'+encodeURIComponent(pid)+'/comments':'/api/share/'+encodeURIComponent(sid)+'/comments';
 api(url).then(r=>paint(r.comments||[])).catch(e=>{list.innerHTML='<p class="help">'+esc(e.message)+'</p>';d.querySelector('.form')?.remove()});
 d.addEventListener('click',async e=>{
  if(e.target.closest('[data-x]')){d.remove();placing=null;return}
  const go=e.target.closest('[data-go]');if(go)return centerOn(pins[Number(go.dataset.go)]);
  const del=e.target.closest('[data-del]');
  if(del){if(!window.confirm(L('¿Borrar este comentario?','Delete this comment?')))return;try{paint((await api('/api/projects/'+encodeURIComponent(pid)+'/comments/'+del.dataset.del+'/delete',{method:'POST',body:'{}'})).comments||[])}catch(err){CORE.toast(err.message)}return}
  if(e.target.closest('[data-pin]')){placing=p=>{point=p;d.querySelector('[data-where]').textContent='📍 '+L('punto marcado','point marked')};CORE.toast(L('Hacé clic en el plano donde va el comentario','Click the drawing where the comment goes'));return}
  if(e.target.closest('[data-send]')){
   const text=d.querySelector('[data-text]').value.trim(),nm=d.querySelector('[data-name]').value.trim();
   if(!text)return CORE.toast(L('Escribí un comentario.','Write a comment.'));
   try{localStorage.setItem('cad2d-comment-name',nm)}catch(err){}
   try{const r=await api(url,{method:'POST',body:JSON.stringify({name:nm,text,...(point?{x:point.x,y:point.y}:{})})});d.querySelector('[data-text]').value='';point=null;d.querySelector('[data-where]').textContent='';paint(r.comments||[])}catch(err){CORE.toast(err.message)}
  }
 });
}
async function ownerComments(pid,name){
 try{const j=await api('/api/projects/'+encodeURIComponent(pid));if(!(await open(pid,j.name,j.data)))return}catch(e){return CORE.toast(e.message)}
 commentsPanel({pid,name});
}
// Clic en el plano para ubicar un comentario (antes que las herramientas de dibujo).
addEventListener('pointerdown',ev=>{
 if(!placing||ev.target!==CORE.canvas||ev.button!==0)return;
 ev.preventDefault();ev.stopImmediatePropagation();
 const r=CORE.canvas.getBoundingClientRect(),f=placing;placing=null;f(CORE.world({x:ev.clientX-r.left,y:ev.clientY-r.top}));
},true);
{const EXT=window.CAD2D_EXTENSIONS=window.CAD2D_EXTENSIONS||{commands:{},context:[],overlays:[],ribbon:{}};EXT.overlays=EXT.overlays||[];
 EXT.overlays.push(ctx=>{
  if(!pins.length||!document.getElementById('cadCommentsDlg')&&!document.getElementById('cadSharedBar'))return;
  ctx.save();ctx.font='bold 11px system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  pins.forEach((c,i)=>{if(!Number.isFinite(c.x))return;const s=CORE.screen(c);
   ctx.fillStyle='#d3b47a';ctx.strokeStyle='#16222b';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(s.x,s.y-12,9,0,Math.PI*2);ctx.fill();ctx.stroke();
   ctx.beginPath();ctx.moveTo(s.x-4,s.y-5);ctx.lineTo(s.x,s.y);ctx.lineTo(s.x+4,s.y-5);ctx.fill();ctx.fillStyle='#16222b';ctx.fillText(String(i+1),s.x,s.y-12)});
  ctx.restore();
 });
}
const css=document.createElement('style');css.textContent=`
#cadCommentsDlg{position:fixed;right:12px;top:60px;width:min(340px,92vw);max-height:70vh;z-index:9001;display:flex;flex-direction:column;background:#16222b;color:#e6eef3;border:1px solid #d3b47a;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.45);font-size:12px}
#cadCommentsDlg header{display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border-bottom:1px solid #2c3a44}
#cadCommentsDlg .list{overflow:auto;padding:8px 10px;display:grid;gap:8px}#cadCommentsDlg .c{border:1px solid #2c3a44;border-radius:8px;padding:6px 8px;display:grid;gap:4px}
#cadCommentsDlg .form{border-top:1px solid #2c3a44;padding:8px 10px;display:grid;gap:6px}#cadCommentsDlg input,#cadCommentsDlg textarea{background:#0f171d;color:#e6eef3;border:1px solid #3a4b57;border-radius:6px;padding:6px;font:inherit}
#cadCommentsDlg .row{display:flex;gap:6px;align-items:center;justify-content:space-between}.bl-light #cadCommentsDlg{background:#fff;color:#1e2a33}
.cad-cloud-table{width:100%;border-collapse:collapse;font-size:12px}.cad-cloud-table th{text-align:left;color:#9fb3bf;font-weight:600;padding:6px}
.cad-cloud-table td{border-top:1px solid #2c3a44;padding:6px;vertical-align:middle}.cad-cloud-table tr.cur td{background:rgba(211,180,122,.08)}
.cad-cloud-table .acts{display:flex;gap:4px;justify-content:flex-end;flex-wrap:wrap}.cad-cloud-table .tag{font-size:11px}
#cadSharedBar{position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:9000;background:#16222b;color:#e6eef3;border:1px solid #d3b47a;border-radius:10px;padding:8px 12px;display:flex;gap:10px;align-items:center;font-size:13px;box-shadow:0 8px 24px rgba(0,0,0,.4)}
.bl-light #cadSharedBar{background:#fff;color:#1e2a33}.bl-light .cad-cloud-table td{border-color:#e1e6ea}`;
document.head.append(css);
const X=window.CAD2D_EXTENSIONS=window.CAD2D_EXTENSIONS||{commands:{},context:[],overlays:[],ribbon:{}};X.commands=X.commands||{};
for(const k of['MISPROYECTOS','PROYECTOS','CLOUD','PROYECTOSNUBE'])X.commands[k]=dialog;
for(const k of['GUARDARNUBE','CLOUDSAVE','SAVECLOUD'])X.commands[k]=save;
for(const k of['COMENTARIOS','COMMENTS','MARKUP'])X.commands[k]=()=>{const sid=new URLSearchParams(location.search).get('ver');if(sid)return commentsPanel({sid});if(cloudId)return commentsPanel({pid:cloudId,name:CORE.state.file});CORE.toast(L('Abrí un proyecto de la nube con enlace compartido para ver sus comentarios.','Open a shared cloud project to see its comments.'))};
window.CAD2D_CLOUD=Object.freeze({save,dialog,comments:commentsPanel});
if(document.readyState==='complete')setTimeout(sharedView,400);else addEventListener('load',()=>setTimeout(sharedView,400));
try{if(sessionStorage.getItem('cad2d-after-login')==='cloud'){sessionStorage.removeItem('cad2d-after-login');addEventListener('load',()=>setTimeout(dialog,800))}}catch(e){}
})();
