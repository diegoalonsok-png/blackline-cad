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
urls.team=https(cfg.teamUrl)||(urls.status?urls.status.replace(/\/status$/,'/team'):'');
// Mercado Pago (pesos) y descuento de estudiante: mismos Worker y sesión que el resto.
urls.mp=urls.status?urls.status.replace(/\/status$/,'/mp-checkout'):'';
urls.mpCancel=urls.status?urls.status.replace(/\/status$/,'/mp-cancel'):'';
urls.student=urls.status?urls.status.replace(/\/status$/,'/student'):'';
const enforce=cfg.enforce===true&&!!urls.status;

/* Matriz de planes. Las funciones básicas de dibujo NUNCA se bloquean: el usuario siempre
   puede abrir y exportar sus propios dibujos (evita "secuestrar" el trabajo del cliente). */
const PLANS={
 free:{label:'Gratis',price:'0 €',features:['draw','dxf','pdf-a4','arq-basic','projects-3']},
 pro:{label:'Pro',price:'5,99 € / mes · 49,99 € / año (ahorrás 30 %) · IVA incl.',features:['draw','dxf','pdf-a4','pdf-all','arq-basic','arq-pro','projects-unlimited','dwg','cloud','ai-retouch']},
 studio:{label:'Estudio',price:'9,99 € / mes · 89,99 € / año · 5 usuarios · IVA incl.',features:['draw','dxf','pdf-a4','pdf-all','arq-basic','arq-pro','projects-unlimited','dwg','cloud','ai-retouch','team']}
};
const FEATURE_LABEL={'arq-pro':'Bloques Pro de la galería (baño principal, cocinas con isla, sanitario público…)','pdf-all':'Ploteo PDF A0–A3 y escalas personalizadas','dwg':'Apertura de archivos .dwg','cloud':'Proyectos en la nube y recuperación entre dispositivos','projects-unlimited':'Proyectos ilimitados','ai-retouch':'Retoque con IA del render artístico 3D','team':'Equipo: el titular + 4 personas con Pro'};

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
// The 90-day trial and its expiry are unchanged. Only the UI wording changes.
const finalTrialDay=(plan,days)=>plan==='trial'&&days===1;
const trialBadgeText=(plan,days)=>{
 if(plan==='pro'||plan==='studio')return plan==='studio'?L('ESTUDIO','STUDIO'):'PRO';
 if(plan==='trial'&&(days??0)>0)
  return finalTrialDay(plan,days)?L('PRO · 1 día','PRO · 1 day'):L('PRO · prueba','PRO · trial');
 return L('PLANES','PLANS');
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
  status={plan,trialEndsAt:ends,email:j.email||null,teamOf:j.teamOf||null,source:'server',
   mercadoPago:j.mercadoPago&&j.mercadoPago.prices?j.mercadoPago:null,studentDiscount:Number(j.studentDiscount)||0,studentUntil:j.studentUntil||null};
 }catch(e){
  // Si el servidor no responde, NO se bloquea al usuario (fail-open): mejor perder un cobro que un dibujo.
  status={...status,source:'offline'};
 }
 paintBadge();resumePendingCheckout();return status;
}
const PENDING_KEY='cad2d-pending-checkout';
const PRICE_EUR={pro:5.99,'pro-yearly':49.99,studio:9.99,'studio-yearly':89.99};
const track=(n,p)=>{try{window.cad2dTrack?.(n,p)}catch(e){}};
async function go(kind,plan='pro'){
 const url=urls[kind];if(!url){toast(L('El cobro todavía no está activado: la beta es gratuita.','Payments are not active yet: the beta is free.'));return}
 if(kind==='login'){track('login_start');location.assign(url);return}
 if(kind==='mp'){track('begin_checkout',{currency:'ARS',value:status.mercadoPago?.prices?.[plan]||0,items:[{item_id:plan,item_name:plan}]})}
 if(kind==='checkout'){track('begin_checkout',{currency:'EUR',value:PRICE_EUR[plan]||0,items:[{item_id:plan,item_name:plan}]});try{sessionStorage.setItem('cad2d-last-plan',plan)}catch(e){}}
 try{
  const r=await fetch(url,{method:'POST',credentials:'include',headers:{'content-type':'application/json'},body:JSON.stringify({plan,returnUrl:location.href})});
  // Sin sesión: se recuerda el plan elegido, se inicia sesión con el enlace por mail y la compra sigue sola al volver.
  if(r.status===401&&(kind==='checkout'||kind==='mp')&&urls.login){try{localStorage.setItem(PENDING_KEY,JSON.stringify({plan,kind,at:Date.now()}))}catch(e){}location.assign(urls.login);return}
  const j=await r.json();if(kind==='mpCancel'&&j.ok){toast(L('Listo: no se renueva más. Tu plan sigue hasta el fin del período pagado.','Done: it will not renew. Your plan stays active until the end of the paid period.'));return}
  if(j.url&&/^https:\/\//.test(j.url))location.assign(j.url);else throw Error(j.error||'Respuesta inválida');
 }catch(e){toast(L('No se pudo abrir el pago: ','Could not open checkout: ')+e.message)}
}
function resumePendingCheckout(){
 let p=null;try{p=JSON.parse(localStorage.getItem(PENDING_KEY)||'null')}catch(e){}
 if(!p||!status.email||Date.now()-p.at>2*864e5)return;
 try{localStorage.removeItem(PENDING_KEY)}catch(e){}
 if(status.plan==='pro'||status.plan==='studio')return;
 go(p.kind==='mp'?'mp':'checkout',['pro','pro-yearly','studio','studio-yearly'].includes(p.plan)?p.plan:'pro');
}
function paymentReturn(){
 const q=new URLSearchParams(location.search).get('pago');if(!q)return;
 history.replaceState(null,'',location.pathname+location.hash);
 if(q==='ok'){let plan='pro';try{plan=sessionStorage.getItem('cad2d-last-plan')||'pro'}catch(e){}track('purchase',{currency:'EUR',value:PRICE_EUR[plan]||0,transaction_id:'cad2d-'+Date.now(),items:[{item_id:plan,item_name:plan}]})}
 setTimeout(()=>toast(q==='ok'?L('¡Gracias! Tu plan ya está activo.','Thank you! Your plan is now active.'):L('Pago cancelado. Podés seguir usando CAD2D.','Payment cancelled. You can keep using CAD2D.')),900);
}
function L(es,en){let lang='en';try{lang=localStorage.getItem('cad2d-alias-language')||document.documentElement.lang||'en'}catch(e){}return /^es/i.test(lang)?es:en}
function toast(t){if(window.CAD2D_CORE?.toast)window.CAD2D_CORE.toast(t);const h=document.getElementById('statusHint');if(h)h.textContent=t}

/* ---------- UI ---------- */
const css=document.createElement('style');
css.textContent=`#cadPlanDlg{position:fixed;inset:0;z-index:9300;background:rgba(5,9,13,.66);display:flex;align-items:center;justify-content:center}
#cadPlanDlg .box{background:#141c24;border:1px solid #4d6676;border-radius:14px;padding:18px 18px 14px;width:min(900px,94vw);max-height:92vh;overflow:auto;color:#e5eef7;font:13px/1.45 system-ui,-apple-system,Segoe UI,Arial,sans-serif;box-shadow:0 24px 60px #000a}
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
#cadPlanDlg .cols.three{grid-template-columns:.8fr 1.3fr 1.3fr}#cadPlanDlg .col.studio{border-color:#6f9fb8}
#cadPlanDlg .team{border:1px solid #33495a;border-radius:12px;padding:10px 12px;margin:0 0 12px}#cadPlanDlg .team .row{display:flex;gap:6px;align-items:center;margin:4px 0}#cadPlanDlg .team .row span{flex:1}#cadPlanDlg .team input{flex:1;padding:7px;border-radius:7px;border:1px solid #4d6676;background:#0f151b;color:#e5eef7}
#cadPlanDlg [hidden]{display:none!important}
@media (max-width:760px){#cadPlanDlg .cols.three{grid-template-columns:1fr}}
@media (max-width:640px){#cadPlanDlg .cols,#cadPlanDlg .cols.two{grid-template-columns:1fr}}`;
document.head.append(css);
function featureList(p){return '<ul>'+PLANS[p].features.filter(f=>FEATURE_LABEL[f]).map(f=>'<li>'+FEATURE_LABEL[f]+'</li>').join('')+'</ul>'}
function showPlans(reason,notice){
 document.getElementById('cadPlanDlg')?.remove();
 track('view_plans',{reason:reason?String(reason).slice(0,60):'manual'});
 const d=document.createElement('div');d.id='cadPlanDlg';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');
 const cur=status.plan,days=trialDays(),lastDay=finalTrialDay(cur,days);
 const head=(notice?'<p class="note">'+notice+'</p>':'')+(reason?'<p class="note">'+reason+L(' es parte del plan Pro.',' is part of the Pro plan.')+'</p>':'');
 const state=!enforce?'<p>'+L('Estás usando la <b>beta abierta</b>: todo está habilitado sin cargo.','You are using the <b>open beta</b>: everything is enabled for free.')+'</p>'
  :cur==='trial'?(lastDay
   ?'<p>'+L('Último día de la prueba PRO.','Final day of your PRO trial.')+'</p><p class="note">'+L('Después podés seguir dibujando con las funciones gratuitas o elegir un plan, como prefieras.','Afterwards you can keep drawing with the free features or choose a plan, whichever you prefer.')+'</p>'
   :'<p>'+L('Tu prueba PRO está activa. Disfrutá las herramientas sin interrupciones.','Your PRO trial is active. Enjoy the tools without interruption.')+'</p>')
  :'<p>'+L('Plan actual','Current plan')+': <b>'+(cur==='pro'?'Pro':cur==='studio'?L('Estudio','Studio'):L('Gratis','Free'))+'</b>'+(status.email?' · '+esc(status.email):'')+(status.teamOf?' · '+L('incluido en el equipo de ','included in the team of ')+esc(status.teamOf):'')+'</p>';
 const li=a=>'<ul>'+a.map(x=>'<li>'+x+'</li>').join('')+'</ul>';
 const free=li([L('Dibujo 2D completo, capas y cotas','Full 2D drafting, layers and dimensions'),L('DXF, SVG, PNG y PDF A4','DXF, SVG, PNG and A4 PDF'),L('Galería básica de bloques','Basic block gallery')]);
 const pro=li([L('Toda la galería de bloques dinámicos','The whole dynamic block gallery'),L('Ploteo PDF A0–A3 y escalas a medida','A0–A3 PDF plotting and custom scales'),L('Proyectos ilimitados','Unlimited projects'),L('Retoque con IA del render 3D','AI retouch of the 3D render')]);
 const isPro=cur==='pro'||cur==='studio';
 const studio=li([L('Todo lo de Pro','Everything in Pro'),L('El titular + 4 personas con Pro','The owner + 4 people with Pro'),L('Invitás y quitás personas por correo cuando quieras','Add or remove people by email at any time')]);
 d.innerHTML='<div class="box"><div class="top"><b>BLACKLINE CAD · '+L('PLANES','PLANS')+'</b><button class="x" data-go="close" aria-label="Close">×</button></div>'+head+state+
  '<div class="cols three">'+
   '<div class="col'+(cur==='free'?' cur':'')+'"><h3>'+L('Gratis','Free')+'</h3><div class="price">0 €</div>'+free+'</div>'+
   '<div class="col pro'+(isPro?' cur':'')+'"><h3>Pro</h3>'+
    '<div class="opts">'+
     '<button class="opt" data-go="checkout" data-plan="pro"><span class="per">'+L('Mensual','Monthly')+'</span><span class="amt">5,99 €</span><span class="sub">'+L('por mes','per month')+'</span></button>'+
     '<button class="opt best" data-go="checkout" data-plan="pro-yearly"><span class="tag">'+L('Ahorrás 30 %','Save 30 %')+'</span><span class="per">'+L('Anual','Yearly')+'</span><span class="amt">49,99 €</span><span class="sub">'+L('por año · ≈ 4,17 € / mes','per year · ≈ €4.17 / month')+'</span></button>'+
    '</div>'+pro+'<p class="fine">'+L('IVA incluido · tarjeta, PayPal y otros medios · cancelás cuando quieras','VAT included · card, PayPal and more · cancel anytime')+'</p></div>'+
   '<div class="col studio'+(cur==='studio'?' cur':'')+'"><h3>'+L('Estudio','Studio')+' · '+L('5 personas','5 people')+'</h3>'+
    '<div class="opts">'+
     '<button class="opt" data-go="checkout" data-plan="studio"><span class="per">'+L('Mensual','Monthly')+'</span><span class="amt">9,99 €</span><span class="sub">'+L('por mes','per month')+'</span></button>'+
     '<button class="opt" data-go="checkout" data-plan="studio-yearly"><span class="tag">'+L('Ahorrás 25 %','Save 25 %')+'</span><span class="per">'+L('Anual','Yearly')+'</span><span class="amt">89,99 €</span><span class="sub">'+L('por año · ≈ 7,50 € / mes','per year · ≈ €7.50 / month')+'</span></button>'+
    '</div>'+studio+'<p class="fine">'+L('IVA incluido · 2 € por persona al mes','VAT included · €2 per person per month')+'</p></div>'+
  '</div>'+(cur==='studio'&&!status.teamOf&&urls.team?'<div class="team" id="cadPlanTeam"><b>'+L('Tu equipo','Your team')+'</b> <span class="fine">'+L('Cada persona entra con su correo y tiene Pro mientras tu plan esté vigente.','Each person signs in with their email and has Pro while your plan is active.')+'</span><div class="list">…</div><div class="row"><input type="email" placeholder="'+L('correo@estudio.com','name@studio.com')+'" aria-label="Email"><button class="btn" data-team="add">'+L('Agregar','Add')+'</button></div></div>':'')+
  arsBlock(isPro)+studentBlock()+
  '<div class="foot">'+
  (urls.login&&!status.email?'<button class="btn" data-go="login">'+L('Ingresar / crear cuenta','Sign in / create account')+'</button>':'')+
  (status.mercadoPago&&status.email&&isPro?'<button class="btn" data-go="mpCancel">'+L('Cancelar renovación en Mercado Pago','Cancel Mercado Pago renewal')+'</button>':'')+
  (urls.portal&&status.email&&isPro?'<button class="btn" data-go="portal">'+L('Administrar suscripción','Manage subscription')+'</button>':'')+
  (window.CAD2D_BUY_GUIDE?'<button class="btn" data-go="guide">'+L('▶ Cómo funciona · 1 min','▶ How it works · 1 min')+'</button>':'')+
  '<button class="btn" data-go="close">'+L('Seguir con el plan gratis','Keep using the free plan')+'</button></div></div>';
 if(isPro)d.querySelectorAll('.opt').forEach(b=>b.disabled=true);
 if(d.querySelector('#cadPlanStudent'))studentUI(d.querySelector('#cadPlanStudent'));
 document.body.append(d);
 if(d.querySelector('#cadPlanTeam'))teamUI(d.querySelector('#cadPlanTeam'));
 const onKey=e=>{if(e.key==='Escape'){d.remove();document.removeEventListener('keydown',onKey,true)}};document.addEventListener('keydown',onKey,true);
 d.addEventListener('click',e=>{const t=e.target.closest('[data-go]'),g=t?.dataset.go;if(!g&&e.target!==d)return;if(!g||g==='close'){d.remove();return}if(g==='guide'){d.remove();window.CAD2D_BUY_GUIDE?.open();return}go(g,t.dataset.plan||'pro')});
}
/* ---------- Pesos argentinos (Mercado Pago) y estudiantes ---------- */
const ars=n=>'$ '+Math.round(n).toLocaleString('es-AR');
function arsBlock(isPro){
 const mpS=status.mercadoPago;if(!mpS)return '';
 const pct=status.studentUntil?status.studentDiscount||50:0,names={pro:L('Pro mensual','Pro monthly'),'pro-yearly':L('Pro anual','Pro yearly'),studio:L('Estudio mensual','Studio monthly'),'studio-yearly':L('Estudio anual','Studio yearly')};
 const btns=Object.entries(mpS.prices).map(([k,v])=>{const fin=pct?v*(100-pct)/100:v;
  return '<button class="opt'+(k==='pro-yearly'?' best':'')+'" data-go="mp" data-plan="'+k+'"'+(isPro?' disabled':'')+'><span class="per">'+names[k]+'</span><span class="amt">'+ars(fin)+'</span><span class="sub">'+(pct?'<s>'+ars(v)+'</s> · '+L('estudiante','student'):k.endsWith('yearly')?L('por año','per year'):L('por mes','per month'))+'</span></button>'}).join('');
 return '<div class="team" id="cadPlanArs"><b>'+L('Pagá en pesos con Mercado Pago','Pay in pesos with Mercado Pago')+'</b> <span class="fine">'+L('Débito automático con tarjeta o dinero en cuenta · cancelás cuando quieras · si estás en la prueba, el primer cobro es al terminarla','Automatic debit with card or account balance · cancel anytime · during the trial, the first charge is when it ends')+'</span><div class="opts" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-top:10px">'+btns+'</div></div>';
}
function studentBlock(){
 if(!urls.status||!status.studentDiscount)return '';
 const pct=status.studentDiscount;
 if(status.studentUntil)return '<div class="team"><b>'+L('Descuento de estudiante activo','Student discount active')+' · '+pct+' %</b> <span class="fine">'+L('hasta el ','until ')+esc(new Date(status.studentUntil).toLocaleDateString())+'</span></div>';
 return '<div class="team" id="cadPlanStudent"><b>'+L('¿Sos estudiante? ','Are you a student? ')+pct+' % '+L('de descuento','off')+'</b> <span class="fine">'+L('Verificá tu correo de la facultad o universidad: te mandamos un código.','Verify your school or university email: we will send you a code.')+'</span>'+
  (status.email?'<div class="row"><input type="email" data-st="mail" placeholder="'+L('nombre@facultad.edu.ar','name@university.edu')+'"><button class="btn" data-st="send">'+L('Enviar código','Send code')+'</button></div><div class="row" data-st="step2" hidden><input inputmode="numeric" maxlength="6" data-st="code" placeholder="000000"><button class="btn" data-st="ok">'+L('Verificar','Verify')+'</button></div>'
   :'<p class="fine">'+L('Primero ingresá con tu cuenta.','Sign in with your account first.')+'</p>')+'</div>';
}
async function studentCall(p,body){
 const r=await fetch(urls.student+p,{method:'POST',credentials:'include',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
 const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||'HTTP '+r.status);return j;
}
function studentUI(box){
 const q=k=>box.querySelector('[data-st="'+k+'"]');if(!q('send'))return;
 box.addEventListener('click',e=>{const t=e.target.closest('[data-st]');if(!t||t.tagName!=='BUTTON')return;e.stopPropagation();
  if(t.dataset.st==='send')studentCall('/request',{email:q('mail').value.trim()}).then(()=>{q('step2').hidden=false;q('code').focus();toast(L('Te mandamos el código. Revisá el correo de la facultad.','Code sent. Check your university inbox.'))},err=>toast(err.message));
  if(t.dataset.st==='ok')studentCall('/verify',{code:q('code').value}).then(async()=>{await refresh();showPlans()},err=>toast(err.message));
 });
}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function teamCall(path,body){
 const r=await fetch(urls.team+path,body?{method:'POST',credentials:'include',headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{credentials:'include',headers:{accept:'application/json'}});
 const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||'HTTP '+r.status);return j;
}
function teamUI(box){
 const listEl=box.querySelector('.list'),input=box.querySelector('input');
 const paint=j=>{const m=j.members||[];listEl.innerHTML=(m.length?m.map(e=>'<div class="row"><span>'+esc(e)+'</span><button class="btn" data-team="remove" data-email="'+esc(e)+'">'+L('Quitar','Remove')+'</button></div>').join(''):'<p class="fine">'+L('Todavía no invitaste a nadie.','You have not invited anyone yet.')+'</p>')+'<p class="fine">'+m.length+' / '+(j.max||4)+'</p>'};
 const fail=e=>toast(L('Equipo: ','Team: ')+e.message);
 teamCall('').then(paint,fail);
 box.addEventListener('click',e=>{
  const t=e.target.closest('[data-team]');if(!t)return;e.stopPropagation();
  if(t.dataset.team==='add'){const v=input.value.trim();if(!v)return;teamCall('/add',{email:v}).then(j=>{input.value='';paint(j)},fail)}
  else teamCall('/remove',{email:t.dataset.email}).then(paint,fail);
 });
 input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();box.querySelector('[data-team="add"]').click()}});
}
function upsell(reason){showPlans(reason)}
function paintBadge(){
 let b=document.getElementById('cadPlanBadge');
 const host=document.querySelector('.brand, header, .topbar')||document.body;
 if(!b){b=document.createElement('button');b.type='button';b.id='cadPlanBadge';b.onclick=()=>showPlans();host.append(b)}
 const days=trialDays();
 // No day count before the final day; no automatic sales or expiry popups.
 b.hidden=!enforce||status.plan==='beta';
 b.textContent=trialBadgeText(status.plan,days);
 b.title=finalTrialDay(status.plan,days)?L('Último día de prueba · Ver planes','Final trial day · View plans'):L('Planes y suscripción (comando PLAN)','Plans & subscription (PLAN command)');
 b.setAttribute('aria-label',b.title);
}
window.CAD2D_PLAN=Object.freeze({can,refresh,showPlans,upsell,plans:PLANS,get status(){return {...status}},enforced:enforce});
paymentReturn();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{paintBadge();refresh()});else{paintBadge();refresh()}
// The last-day label appears without requiring a page reload.
document.addEventListener('visibilitychange',()=>{if(!document.hidden)paintBadge()});
setInterval(()=>{if(!document.hidden)paintBadge()},60*1000);
})();
