/* Blackline CAD · Proyectos en la nube y enlaces de solo lectura.
 * Usa el servidor de cuentas (api.blackline-cad.org): guarda el proyecto completo (capas, bloques, láminas),
 * conserva 10 versiones anteriores y permite compartir un enlace de solo lectura (?ver=<id>). */
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
 d.innerHTML='<div class="modal" style="max-width:720px"><div class="modal-head"><h2>'+L('Mis proyectos en la nube','My cloud projects')+'</h2><button class="btn" data-x>✕</button></div><div class="cad-cloud-body"><p class="help">'+L('Cargando…','Loading…')+'</p></div><div style="display:flex;justify-content:space-between;gap:8px;margin-top:12px;flex-wrap:wrap"><span class="help">'+L('Se guardan 10 versiones anteriores de cada proyecto.','The last 10 versions of each project are kept.')+'</span><button class="btn primary" data-save>☁ '+L('Guardar el dibujo actual','Save current drawing')+'</button></div></div>';
 document.body.append(d);
 const body=d.querySelector('.cad-cloud-body');
 const render=async()=>{
  let list;try{list=(await api('/api/projects')).projects}catch(e){if(e.code===401){body.innerHTML='<p class="help">'+L('Ingresá con tu correo para ver tus proyectos.','Sign in with your email to see your projects.')+'</p><button class="btn primary" data-login>'+L('Ingresar','Sign in')+'</button>';return}body.innerHTML='<p class="help">'+esc(e.message)+'</p>';return}
  if(!list.length){body.innerHTML='<p class="help">'+L('Todavía no guardaste proyectos en la nube.','No cloud projects yet.')+'</p>';return}
  body.innerHTML='<table class="cad-cloud-table" data-no-cad-translate><tr><th>'+L('Proyecto','Project')+'</th><th>'+L('Modificado','Modified')+'</th><th>'+L('Tamaño','Size')+'</th><th></th></tr>'+list.map(p=>'<tr data-id="'+esc(p.id)+'"'+(p.id===cloudId?' class="cur"':'')+'><td><b>'+esc(p.name)+'</b>'+(p.shareId?' <span class="tag">🔗</span>':'')+'</td><td>'+fmtDate(p.updatedAt)+'</td><td>'+(p.size/1024).toFixed(0)+' KB</td><td class="acts"><button class="btn slim" data-open>'+L('Abrir','Open')+'</button><button class="btn slim" data-share>'+(p.shareId?L('Enlace','Link'):L('Compartir','Share'))+'</button><button class="btn slim" data-ver>'+L('Versiones','Versions')+'</button><button class="btn slim" data-ren>✎</button><button class="btn slim" data-del>🗑</button></td></tr>').join('')+'</table>';
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
  bar.innerHTML='<b>'+esc(j.name)+'</b> · '+L('vista compartida de solo lectura','read-only shared view')+' · '+fmtDate(j.updatedAt)+' <button class="btn slim" data-copy>'+L('Guardar una copia para editar','Save a copy to edit')+'</button><button class="btn slim" data-close>✕</button>';
  document.body.append(bar);
  bar.addEventListener('click',e=>{if(e.target.closest('[data-close]'))bar.remove();if(e.target.closest('[data-copy]')){bar.remove();document.getElementById('saveAsBtn')?.click()}});
 }catch(e){CORE.toast(L('No se pudo abrir el plano compartido: ','Could not open the shared drawing: ')+e.message)}
}
const css=document.createElement('style');css.textContent=`
.cad-cloud-table{width:100%;border-collapse:collapse;font-size:12px}.cad-cloud-table th{text-align:left;color:#9fb3bf;font-weight:600;padding:6px}
.cad-cloud-table td{border-top:1px solid #2c3a44;padding:6px;vertical-align:middle}.cad-cloud-table tr.cur td{background:rgba(211,180,122,.08)}
.cad-cloud-table .acts{display:flex;gap:4px;justify-content:flex-end;flex-wrap:wrap}.cad-cloud-table .tag{font-size:11px}
#cadSharedBar{position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:9000;background:#16222b;color:#e6eef3;border:1px solid #d3b47a;border-radius:10px;padding:8px 12px;display:flex;gap:10px;align-items:center;font-size:13px;box-shadow:0 8px 24px rgba(0,0,0,.4)}
.bl-light #cadSharedBar{background:#fff;color:#1e2a33}.bl-light .cad-cloud-table td{border-color:#e1e6ea}`;
document.head.append(css);
const X=window.CAD2D_EXTENSIONS=window.CAD2D_EXTENSIONS||{commands:{},context:[],overlays:[],ribbon:{}};X.commands=X.commands||{};
for(const k of['MISPROYECTOS','PROYECTOS','CLOUD','PROYECTOSNUBE'])X.commands[k]=dialog;
for(const k of['GUARDARNUBE','CLOUDSAVE','SAVECLOUD'])X.commands[k]=save;
window.CAD2D_CLOUD=Object.freeze({save,dialog});
if(document.readyState==='complete')setTimeout(sharedView,400);else addEventListener('load',()=>setTimeout(sharedView,400));
try{if(sessionStorage.getItem('cad2d-after-login')==='cloud'){sessionStorage.removeItem('cad2d-after-login');addEventListener('load',()=>setTimeout(dialog,800))}}catch(e){}
})();
