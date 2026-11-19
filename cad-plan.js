/* CAD2D · Planes y licencias (cliente).
 * Diseño: el NAVEGADOR nunca decide quién pagó. Solo muestra lo que responde el servidor
 * (Cloudflare Worker de billing/, con Stripe). Sin servidor configurado → BETA ABIERTA:
 * todas las funciones habilitadas y un aviso del período de prueba.
 *
 * Configuración en producción (antes de cargar este script):
 *   window.CAD2D_AUTH_CONFIG = {
 *     loginUrl:  'https://api.tu-dominio.com/auth/login',
 *     statusUrl: 'https://api.tu-dominio.com/api/status',     // devuelve {plan, trialEndsAt, email}
 *     checkoutUrl:'https://api.tu-dominio.com/api/checkout',  // POST → {url} de Stripe Checkout
 *     portalUrl: 'https://api.tu-dominio.com/api/portal',     // POST → {url} del portal del cliente
 *     enforce: true
 *   };
 */
(function(){
'use strict';
const cfg=window.CAD2D_AUTH_CONFIG||{};
const https=u=>typeof u==='string'&&/^https:\/\//.test(u)?u:'';
const urls={login:https(cfg.loginUrl),status:https(cfg.statusUrl),checkout:https(cfg.checkoutUrl),portal:https(cfg.portalUrl)};
const enforce=cfg.enforce===true&&!!urls.status;

/* Matriz de planes. Las funciones básicas de dibujo NUNCA se bloquean: el usuario siempre
   puede abrir y exportar sus propios dibujos (evita "secuestrar" el trabajo del cliente). */
const PLANS={
 free:{label:'Gratis',price:'US$ 0',features:['draw','dxf','pdf-a4','arq-basic','projects-3']},
 pro:{label:'Pro',price:'US$ 9 / mes · US$ 90 / año',features:['draw','dxf','pdf-a4','pdf-all','arq-basic','arq-pro','projects-unlimited','dwg','cloud','no-watermark']},
 studio:{label:'Estudio',price:'US$ 29 / mes · 5 usuarios',features:['draw','dxf','pdf-a4','pdf-all','arq-basic','arq-pro','projects-unlimited','dwg','cloud','no-watermark','team','custom-blocks']}
};
const FEATURE_LABEL={'arq-pro':'Bloques Pro de la galería (baño principal, cocinas con isla, sanitario público…)','pdf-all':'Ploteo PDF A0–A3 y escalas personalizadas','dwg':'Apertura de DWG (cuando el conversor esté operativo)','cloud':'Proyectos en la nube y recuperación entre dispositivos','projects-unlimited':'Proyectos ilimitados','team':'Equipo y bibliotecas compartidas'};

let status={plan:'beta',trialEndsAt:null,email:null,source:'local'};
const trialDays=()=>{
 if(!status.trialEndsAt)return null;
 return Math.ceil((new Date(status.trialEndsAt).getTime()-Date.now())/864e5);
};
function can(feature){
 if(!enforce||status.plan==='beta')return true;           // beta abierta: todo habilitado
 if(status.plan==='trial'&&(trialDays()??0)>0)return true;  // prueba vigente verificada por servidor
 const p=PLANS[status.plan]||PLANS.free;return p.features.includes(feature);
}
async function refresh(){
 if(!urls.status)return status;
 try{
  const r=await fetch(urls.status,{credentials:'include',headers:{accept:'application/json'}});
  if(!r.ok)throw Error('HTTP '+r.status);
  const j=await r.json();
  status={plan:['free','pro','studio','trial'].includes(j.plan)?j.plan:'free',trialEndsAt:j.trialEndsAt||null,email:j.email||null,source:'server'};
 }catch(e){
  // Si el servidor no responde, NO se bloquea al usuario (fail-open): mejor perder un cobro que un dibujo.
  status={...status,source:'offline'};
 }
 paintBadge();return status;
}
async function go(kind){
 const url=urls[kind];if(!url){toast('El cobro todavía no está activado: la beta es gratuita.');return}
 if(kind==='login'){location.assign(url);return}
 try{
  const r=await fetch(url,{method:'POST',credentials:'include',headers:{'content-type':'application/json'},body:JSON.stringify({plan:'pro',returnUrl:location.href})});
  const j=await r.json();if(j.url&&/^https:\/\//.test(j.url))location.assign(j.url);else throw Error('Respuesta inválida');
 }catch(e){toast('No se pudo abrir el pago: '+e.message)}
}
function toast(t){const h=document.getElementById('statusHint');if(h)h.textContent=t;else alert(t)}

/* ---------- UI ---------- */
const css=document.createElement('style');
css.textContent=`#cadPlanDlg{position:fixed;inset:0;z-index:9300;background:rgba(5,9,13,.66);display:flex;align-items:center;justify-content:center}
#cadPlanDlg .box{background:#141c24;border:1px solid #4d6676;border-radius:12px;padding:16px;width:min(760px,94vw);color:#e5eef7;font-size:12px}
#cadPlanDlg .cols{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:12px 0}
#cadPlanDlg .col{border:1px solid #33495a;border-radius:10px;padding:10px}#cadPlanDlg .col.cur{border-color:#91bfd5;background:#1b2833}
#cadPlanDlg h3{margin:0 0 4px;font-size:13px}#cadPlanDlg ul{padding-left:16px;margin:6px 0}
#cadPlanBadge{font-size:10px;padding:2px 8px;border-radius:9px;border:1px solid #4d6676;background:#1b2833;color:#cfe3ef;cursor:pointer;margin-left:6px}
@media (max-width:640px){#cadPlanDlg .cols{grid-template-columns:1fr}}`;
document.head.append(css);
function featureList(p){return '<ul>'+PLANS[p].features.filter(f=>FEATURE_LABEL[f]).map(f=>'<li>'+FEATURE_LABEL[f]+'</li>').join('')+'</ul>'}
function showPlans(reason){
 document.getElementById('cadPlanDlg')?.remove();
 const d=document.createElement('div');d.id='cadPlanDlg';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');
 const cur=status.plan,days=trialDays();
 const head=reason?'<p style="color:#ffd27f">'+reason+' requiere el plan Pro.</p>':'';
 const state=!enforce?'<p>Estás usando la <b>beta abierta</b>: todas las funciones están habilitadas sin cargo. Cuando se active la suscripción, tus dibujos y exportaciones seguirán siendo tuyos; el plan gratuito conserva el dibujo, DXF y PDF A4.</p>'
  :cur==='trial'?'<p>Período de prueba: <b>'+Math.max(0,days??0)+' días</b> restantes.</p>':'<p>Plan actual: <b>'+(PLANS[cur]?.label||cur)+'</b>'+(status.email?' · '+status.email:'')+'</p>';
 d.innerHTML='<div class="box"><b style="font-size:14px">CAD2D · PLANES</b>'+head+state+'<div class="cols">'+
  Object.entries(PLANS).map(([k,p])=>'<div class="col'+(k===cur?' cur':'')+'"><h3>'+p.label+'</h3><div>'+p.price+'</div>'+(k==='free'?'<ul><li>Dibujo 2D completo, capas, cotas</li><li>DXF, SVG, PNG, PDF A4</li><li>Galería básica de bloques</li></ul>':featureList(k))+'</div>').join('')+
  '</div><div style="display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap">'+
  (urls.login&&!status.email?'<button class="btn" data-go="login">Ingresar / crear cuenta</button>':'')+
  (urls.checkout?'<button class="btn" data-go="checkout">Pasar a Pro</button>':'')+
  (urls.portal&&status.email?'<button class="btn" data-go="portal">Administrar suscripción</button>':'')+
  '<button class="btn" data-go="close">Cerrar</button></div></div>';
 document.body.append(d);
 const onKey=e=>{if(e.key==='Escape'){d.remove();document.removeEventListener('keydown',onKey,true)}};document.addEventListener('keydown',onKey,true);
 d.addEventListener('click',e=>{const g=e.target.closest('[data-go]')?.dataset.go;if(!g&&e.target!==d)return;if(!g||g==='close'){d.remove();return}go(g)});
}
function upsell(reason){showPlans(reason)}
function paintBadge(){
 let b=document.getElementById('cadPlanBadge');
 const host=document.querySelector('.brand, header, .topbar')||document.body;
 if(!b){b=document.createElement('button');b.type='button';b.id='cadPlanBadge';b.onclick=()=>showPlans();host.append(b)}
 const days=trialDays();
 b.textContent=!enforce||status.plan==='beta'?'BETA ABIERTA':status.plan==='trial'?'PRUEBA · '+Math.max(0,days??0)+' d':(PLANS[status.plan]?.label||'Gratis').toUpperCase();
 b.title='Planes y suscripción (comando PLAN)';
}
window.CAD2D_PLAN=Object.freeze({can,refresh,showPlans,upsell,plans:PLANS,get status(){return {...status}},enforced:enforce});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{paintBadge();refresh()});else{paintBadge();refresh()}
})();
