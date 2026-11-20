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
 free:{label:'Gratis',price:'0 €',features:['draw','dxf','pdf-a4','arq-basic','projects-3']},
 pro:{label:'Pro',price:'1,59 € / mes · 12,99 € / año (ahorrás 32 %) · IVA incl.',features:['draw','dxf','pdf-a4','pdf-all','arq-basic','arq-pro','projects-unlimited','dwg','cloud','no-watermark']},
 studio:{label:'Estudio',price:'4,99 € / mes · 49,99 € / año · 5 usuarios · IVA incl.',features:['draw','dxf','pdf-a4','pdf-all','arq-basic','arq-pro','projects-unlimited','dwg','cloud','no-watermark','team','custom-blocks']}
};
const FEATURE_LABEL={'arq-pro':'Bloques Pro de la galería (baño principal, cocinas con isla, sanitario público…)','pdf-all':'Ploteo PDF A0–A3 y escalas personalizadas','dwg':'Apertura de archivos .dwg (cuando el conversor esté operativo)','cloud':'Proyectos en la nube y recuperación entre dispositivos','projects-unlimited':'Proyectos ilimitados','team':'Equipo y bibliotecas compartidas'};

/* Prueba por persona: 90 días desde el primer uso en este navegador (sin registrarse).
   Con cuenta, manda la fecha del servidor. Es una indicación local, no un control de pago. */
const TRIAL_DAYS=90,FIRST_KEY='cad2d-guest-first-use-v1';
function firstUse(){
 let t=null;try{t=Number(localStorage.getItem(FIRST_KEY))}catch(e){}
 if(!Number.isFinite(t)||t<Date.UTC(2020,0,1)||t>Date.now()){t=Date.now();try{localStorage.setItem(FIRST_KEY,String(t))}catch(e){}}
 return t;
}
const localTrialEnd=new Date(firstUse()+TRIAL_DAYS*864e5).toISOString();
let status={plan:!enforce?'beta':Date.parse(localTrialEnd)>Date.now()?'trial':'free',trialEndsAt:enforce?localTrialEnd:null,email:null,source:'local'};
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
  let plan=['free','pro','studio','trial'].includes(j.plan)?j.plan:'free',ends=j.trialEndsAt||null;
  // Sin suscripción paga: vale la prueba más larga entre la de la cuenta y la de este navegador.
  if(plan==='free'||plan==='trial'){
   const best=[ends,localTrialEnd].filter(Boolean).sort().pop();
   if(Date.parse(best)>Date.now()){plan='trial';ends=best}else{plan='free';ends=best}
  }
  status={plan,trialEndsAt:ends,email:j.email||null,source:'server'};
 }catch(e){
  // Si el servidor no responde, NO se bloquea al usuario (fail-open): mejor perder un cobro que un dibujo.
  status={...status,source:'offline'};
 }
 paintBadge();resumePendingCheckout();return status;
}
const PENDING_KEY='cad2d-pending-checkout';
async function go(kind,plan='pro'){
 const url=urls[kind];if(!url){toast(L('El cobro todavía no está activado: la beta es gratuita.','Payments are not active yet: the beta is free.'));return}
 if(kind==='login'){location.assign(url);return}
 try{
  const r=await fetch(url,{method:'POST',credentials:'include',headers:{'content-type':'application/json'},body:JSON.stringify({plan,returnUrl:location.href})});
  // Sin sesión: se recuerda el plan elegido, se inicia sesión con el enlace por mail y la compra sigue sola al volver.
  if(r.status===401&&kind==='checkout'&&urls.login){try{localStorage.setItem(PENDING_KEY,JSON.stringify({plan,at:Date.now()}))}catch(e){}location.assign(urls.login);return}
  const j=await r.json();if(j.url&&/^https:\/\//.test(j.url))location.assign(j.url);else throw Error(j.error||'Respuesta inválida');
 }catch(e){toast(L('No se pudo abrir el pago: ','Could not open checkout: ')+e.message)}
}
function resumePendingCheckout(){
 let p=null;try{p=JSON.parse(localStorage.getItem(PENDING_KEY)||'null')}catch(e){}
 if(!p||!status.email||Date.now()-p.at>2*864e5)return;
 try{localStorage.removeItem(PENDING_KEY)}catch(e){}
 if(status.plan==='pro'||status.plan==='studio')return;
 go('checkout',p.plan==='pro-yearly'?'pro-yearly':'pro');
}
function paymentReturn(){
 const q=new URLSearchParams(location.search).get('pago');if(!q)return;
 history.replaceState(null,'',location.pathname+location.hash);
 setTimeout(()=>toast(q==='ok'?L('¡Gracias! Tu plan Pro ya está activo.','Thank you! Your Pro plan is now active.'):L('Pago cancelado. Podés seguir usando CAD2D.','Payment cancelled. You can keep using CAD2D.')),900);
}
function L(es,en){let lang='en';try{lang=localStorage.getItem('cad2d-alias-language')||document.documentElement.lang||'en'}catch(e){}return /^es/i.test(lang)?es:en}
function toast(t){if(window.CAD2D_CORE?.toast)window.CAD2D_CORE.toast(t);const h=document.getElementById('statusHint');if(h)h.textContent=t}

/* ---------- UI ---------- */
const css=document.createElement('style');
css.textContent=`#cadPlanDlg{position:fixed;inset:0;z-index:9300;background:rgba(5,9,13,.66);display:flex;align-items:center;justify-content:center}
#cadPlanDlg .box{background:#141c24;border:1px solid #4d6676;border-radius:14px;padding:18px 18px 14px;width:min(640px,94vw);color:#e5eef7;font:13px/1.45 system-ui,-apple-system,Segoe UI,Arial,sans-serif;box-shadow:0 24px 60px #000a}
#cadPlanDlg .top{display:flex;justify-content:space-between;align-items:center;letter-spacing:.06em;font-size:12px;color:#9fc3d6}
#cadPlanDlg .x{all:unset;cursor:pointer;font-size:20px;color:#b9c9d4;padding:0 6px}
#cadPlanDlg .note{color:#ffd27f;margin:10px 0 0}
#cadPlanDlg .cols{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:14px 0}#cadPlanDlg .cols.two{grid-template-columns:1fr 1.5fr}
#cadPlanDlg .col{border:1px solid #33495a;border-radius:12px;padding:12px}#cadPlanDlg .col.cur{border-color:#91bfd5;background:#1b2833}
#cadPlanDlg .col.pro{border-color:#c79a3a;background:linear-gradient(180deg,#1d2530,#161d26)}
#cadPlanDlg h3{margin:0 0 4px;font-size:15px}#cadPlanDlg .price{font-size:22px;font-weight:700}#cadPlanDlg ul{padding-left:18px;margin:8px 0}
#cadPlanDlg .opts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:6px 0 4px}
#cadPlanDlg .opt{all:unset;box-sizing:border-box;cursor:pointer;position:relative;display:grid;gap:1px;padding:10px 10px 9px;border-radius:10px;border:1px solid #4d6676;background:#0f151b;text-align:center}
#cadPlanDlg .opt:hover{border-color:#9adff3;background:#13202a}#cadPlanDlg .opt:focus-visible{outline:2px solid #9adff3}
#cadPlanDlg .opt.best{border-color:#c79a3a}#cadPlanDlg .opt[disabled]{opacity:.45;cursor:default}
#cadPlanDlg .opt .per{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#9fc3d6}#cadPlanDlg .opt .amt{font-size:22px;font-weight:700}#cadPlanDlg .opt .sub{font-size:11px;color:#a9b8c2}
#cadPlanDlg .opt .tag{position:absolute;top:-9px;left:50%;transform:translateX(-50%);background:#c79a3a;color:#111;font-size:10px;font-weight:700;padding:1px 8px;border-radius:9px;white-space:nowrap}
#cadPlanDlg .fine{font-size:11px;color:#8fa3b0;margin:6px 0 0}
#cadPlanDlg .foot{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
#cadPlanBadge{font-size:10px;padding:2px 8px;border-radius:9px;border:1px solid #4d6676;background:#1b2833;color:#cfe3ef;cursor:pointer;margin-left:6px}
@media (max-width:640px){#cadPlanDlg .cols,#cadPlanDlg .cols.two{grid-template-columns:1fr}}`;
document.head.append(css);
function featureList(p){return '<ul>'+PLANS[p].features.filter(f=>FEATURE_LABEL[f]).map(f=>'<li>'+FEATURE_LABEL[f]+'</li>').join('')+'</ul>'}
function showPlans(reason,notice){
 document.getElementById('cadPlanDlg')?.remove();
 const d=document.createElement('div');d.id='cadPlanDlg';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');
 const cur=status.plan,days=trialDays();
 const head=(notice?'<p class="note">'+notice+'</p>':'')+(reason?'<p class="note">'+reason+L(' es parte del plan Pro.',' is part of the Pro plan.')+'</p>':'');
 const state=!enforce?'<p>'+L('Estás usando la <b>beta abierta</b>: todo está habilitado sin cargo.','You are using the <b>open beta</b>: everything is enabled for free.')+'</p>'
  :cur==='trial'?'<p>'+L('Prueba con todo incluido: <b>'+Math.max(0,days??0)+' días</b> restantes.','All-inclusive trial: <b>'+Math.max(0,days??0)+' days</b> left.')+'</p><p class="note">'+L('Podés pasar a Pro cuando quieras. Si te suscribís ahora, el primer cobro se hace recién cuando terminan tus días de prueba: no perdés ningún día.','You can go Pro at any time. If you subscribe now, the first charge happens only when your trial days end: you lose no days.')+'</p>'
  :'<p>'+L('Plan actual','Current plan')+': <b>'+(cur==='pro'?'Pro':cur==='studio'?'Studio':L('Gratis','Free'))+'</b>'+(status.email?' · '+status.email:'')+'</p>';
 const li=a=>'<ul>'+a.map(x=>'<li>'+x+'</li>').join('')+'</ul>';
 const free=li([L('Dibujo 2D completo, capas y cotas','Full 2D drafting, layers and dimensions'),L('DXF, SVG, PNG y PDF A4','DXF, SVG, PNG and A4 PDF'),L('Galería básica de bloques','Basic block gallery')]);
 const pro=li([L('Toda la galería de bloques dinámicos','The whole dynamic block gallery'),L('Ploteo PDF A0–A3 y escalas a medida','A0–A3 PDF plotting and custom scales'),L('Proyectos ilimitados','Unlimited projects'),L('Sin marca de agua','No watermark')]);
 const isPro=cur==='pro'||cur==='studio';
 d.innerHTML='<div class="box"><div class="top"><b>BLACKLINE CAD · '+L('PLANES','PLANS')+'</b><button class="x" data-go="close" aria-label="Close">×</button></div>'+head+state+
  '<div class="cols two">'+
   '<div class="col'+(cur==='free'?' cur':'')+'"><h3>'+L('Gratis','Free')+'</h3><div class="price">0 €</div>'+free+'</div>'+
   '<div class="col pro'+(isPro?' cur':'')+'"><h3>Pro</h3>'+
    '<div class="opts">'+
     '<button class="opt" data-go="checkout" data-plan="pro"><span class="per">'+L('Mensual','Monthly')+'</span><span class="amt">1,59 €</span><span class="sub">'+L('por mes','per month')+'</span></button>'+
     '<button class="opt best" data-go="checkout" data-plan="pro-yearly"><span class="tag">'+L('Ahorrás 32 %','Save 32 %')+'</span><span class="per">'+L('Anual','Yearly')+'</span><span class="amt">12,99 €</span><span class="sub">'+L('por año · ≈ 1,08 € / mes','per year · ≈ €1.08 / month')+'</span></button>'+
    '</div>'+pro+'<p class="fine">'+L('IVA incluido · tarjeta, PayPal y otros medios · cancelás cuando quieras','VAT included · card, PayPal and more · cancel anytime')+'</p></div>'+
  '</div><div class="foot">'+
  (urls.login&&!status.email?'<button class="btn" data-go="login">'+L('Ingresar / crear cuenta','Sign in / create account')+'</button>':'')+
  (urls.portal&&status.email&&isPro?'<button class="btn" data-go="portal">'+L('Administrar suscripción','Manage subscription')+'</button>':'')+
  (window.CAD2D_BUY_GUIDE?'<button class="btn" data-go="guide">'+L('▶ Cómo funciona · 1 min','▶ How it works · 1 min')+'</button>':'')+
  '<button class="btn" data-go="close">'+L('Seguir con el plan gratis','Keep using the free plan')+'</button></div></div>';
 if(isPro)d.querySelectorAll('.opt').forEach(b=>b.disabled=true);
 document.body.append(d);
 const onKey=e=>{if(e.key==='Escape'){d.remove();document.removeEventListener('keydown',onKey,true)}};document.addEventListener('keydown',onKey,true);
 d.addEventListener('click',e=>{const t=e.target.closest('[data-go]'),g=t?.dataset.go;if(!g&&e.target!==d)return;if(!g||g==='close'){d.remove();return}if(g==='guide'){d.remove();window.CAD2D_BUY_GUIDE?.open();return}go(g,t.dataset.plan||'pro')});
}
function upsell(reason){showPlans(reason)}
function paintBadge(){
 let b=document.getElementById('cadPlanBadge');
 const host=document.querySelector('.brand, header, .topbar')||document.body;
 if(!b){b=document.createElement('button');b.type='button';b.id='cadPlanBadge';b.onclick=()=>showPlans();host.append(b)}
 const days=trialDays();
 const inTrial=status.plan==='trial'&&(days??0)>0;
 // Durante la prueba también se puede comprar: el botón muestra los días que quedan.
 b.hidden=!enforce||status.plan==='beta';
 b.textContent=status.plan==='pro'||status.plan==='studio'?(PLANS[status.plan].label).toUpperCase():inTrial?L('PRO · prueba: '+days+' d','PRO · trial: '+days+' d'):L('PASAR A PRO','GO PRO');
 b.title='Planes y suscripción (comando PLAN)';
 maybeTrialEnded();
}
/* Al terminar los 90 días: un aviso amable, como mucho una vez por semana. Nunca bloquea el dibujo. */
function maybeTrialEnded(){
 if(!enforce||status.plan!=='free'||!status.trialEndsAt||Date.parse(status.trialEndsAt)>Date.now())return;
 const KEY='cad2d-trial-ended-notice';let last=0;try{last=Number(localStorage.getItem(KEY))||0}catch(e){}
 if(Date.now()-last<7*864e5||document.getElementById('cadPlanDlg'))return;
 try{localStorage.setItem(KEY,String(Date.now()))}catch(e){}
 setTimeout(()=>showPlans(null,L('¿Te está sirviendo Blackline CAD? Ya llevás 3 meses usándolo con todo incluido. Podés seguir dibujando gratis con lo básico, o conservar todo por 12,99 € al año (poco más de 1 € por mes) y ayudar a que siga creciendo.','Is Blackline CAD working for you? You have been using it with everything included for 3 months. You can keep drawing for free with the basics, or keep everything for €12.99 a year (about €1 a month) and help it keep growing.')),1500);
}
window.CAD2D_PLAN=Object.freeze({can,refresh,showPlans,upsell,plans:PLANS,get status(){return {...status}},enforced:enforce});
paymentReturn();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{paintBadge();refresh()});else{paintBadge();refresh()}
})();
