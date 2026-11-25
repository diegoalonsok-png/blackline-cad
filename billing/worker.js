/* CAD2D · Servidor de cuentas y suscripciones (Cloudflare Worker + D1 + Stripe).
 * PLANTILLA NO DESPLEGADA. Ver billing/README.md antes de publicar.
 *
 * Variables (wrangler secret put …): STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SESSION_SECRET, RESEND_API_KEY
 * Variables (wrangler.toml [vars]):    APP_ORIGIN, APP_PATH ('/' en Cloudflare Pages), API_ORIGIN, PRICE_PRO_MONTHLY, PRICE_PRO_YEARLY, PRICE_STUDIO_MONTHLY, PRICE_STUDIO_YEARLY, STRIPE_TAX ('1' = IVA automático),
 *                                      TRIAL_DAYS (90 = 3 meses), MAIL_FROM, COOKIE_DOMAIN
 * Base de datos D1 enlazada como DB (schema.sql).
 *
 * Endpoints
 *   GET  /auth/login              formulario de acceso por enlace mágico (sin contraseñas)
 *   POST /auth/request            {email} → envía enlace de un solo uso (15 min)
 *   GET  /auth/verify?token=      paso de confirmación (no consume el token; evita que antivirus de correo lo gasten)
 *   POST /auth/verify             crea la sesión (cookie HttpOnly, Secure, SameSite=Lax) y vuelve a la app
 *
 * Protecciones: cabeceras de seguridad y CSP en todas las respuestas, POST solo desde la app (anti-CSRF),
 * límite de tamaño, máx. 3 enlaces vigentes por correo, límites por IP opcionales (AUTH_LIMITER, API_LIMITER).
 *   POST /auth/logout
 *   GET  /api/status              {plan:'trial'|'free'|'pro'|'studio', trialEndsAt, email, teamOf?}
 *   POST /api/checkout            {plan:'pro'|'pro-yearly'|'studio'|'studio-yearly'} → {url} de Stripe Checkout
 *   GET  /api/xref/projects       XREF: mis proyectos + los de mi equipo (solo lectura) · GET /api/xref/projects/<id> · GET /api/xref/stamps?ids=a,b
 *   GET  /api/team                plan Estudio: {members:[email], max} · POST /api/team/add {email} · POST /api/team/remove {email}
 *   POST /api/portal              → {url} del portal de facturación de Stripe
 *   POST /api/stripe-webhook      eventos firmados de Stripe (fuente de verdad del plan)
 *   GET  /api/projects            lista de proyectos en la nube · POST /api/projects {id?,name,data} guarda (crea o actualiza; guarda 10 versiones)
 *   GET  /api/projects/<id>       abre · POST …/rename · POST …/delete · POST …/share {on} · GET …/versions[/<n>]
 *   GET  /api/share/<shareId>     proyecto compartido de solo lectura (sin sesión)
 */
const enc=new TextEncoder();
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8',...headers}});
const now=()=>Math.floor(Date.now()/1000);
const b64url=buf=>btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const randomToken=(n=32)=>b64url(crypto.getRandomValues(new Uint8Array(n)));
async function hmac(secret,data){
 const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(data)));
}
const hex=u8=>[...u8].map(b=>b.toString(16).padStart(2,'0')).join('');
function safeEqual(a,b){if(a.length!==b.length)return false;let r=0;for(let i=0;i<a.length;i++)r|=a.charCodeAt(i)^b.charCodeAt(i);return r===0}
async function sha256(s){return hex(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(s))))}

/* ---------- Sesión firmada ---------- */
async function makeSession(env,userId){
 const payload=userId+'.'+(now()+60*60*24*30);
 return payload+'.'+b64url(await hmac(env.SESSION_SECRET,payload));
}
async function readSession(env,req){
 const raw=(req.headers.get('cookie')||'').split(/;\s*/).find(c=>c.startsWith('cad2d_session='));
 if(!raw)return null;
 const [id,exp,sig]=decodeURIComponent(raw.slice(14)).split('.');
 if(!id||!exp||!sig||Number(exp)<now())return null;
 const expected=b64url(await hmac(env.SESSION_SECRET,id+'.'+exp));
 return safeEqual(sig,expected)?id:null;
}
const cookie=(env,value,maxAge)=>`cad2d_session=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}${env.COOKIE_DOMAIN?'; Domain='+env.COOKIE_DOMAIN:''}`;

/* ---------- Protecciones ---------- */
const SEC_HEADERS={'x-content-type-options':'nosniff','referrer-policy':'same-origin','x-frame-options':'DENY',
 'strict-transport-security':'max-age=31536000; includeSubDomains','cache-control':'no-store','cross-origin-opener-policy':'same-origin',
 'permissions-policy':'camera=(), microphone=(), geolocation=(), payment=()'};
const PAGE_CSP="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'";
function secure(res){
 const r=new Response(res.body,res);
 for(const [k,v] of Object.entries(SEC_HEADERS))if(!r.headers.has(k))r.headers.set(k,v);
 if((r.headers.get('content-type')||'').startsWith('text/html'))r.headers.set('content-security-policy',PAGE_CSP);
 return r;
}
const html=(body,status=200)=>new Response(body,{status,headers:{'content-type':'text/html; charset=utf-8'}});
const escHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Solo la app y la propia API pueden hacer POST (anti-CSRF); el webhook de Stripe va firmado.
function originAllowed(env,req){
 const o=req.headers.get('origin');if(!o)return false;
 return [env.APP_ORIGIN,env.API_ORIGIN].filter(Boolean).includes(o);
}
function tooLarge(req,max){const n=Number(req.headers.get('content-length')||0);return n>max}
const clientIp=req=>req.headers.get('cf-connecting-ip')||'0.0.0.0';
// Límite por IP con la API de Rate Limiting de Cloudflare (binding opcional AUTH_LIMITER / API_LIMITER en wrangler.toml).
async function limited(binding,key){try{if(!binding)return false;const {success}=await binding.limit({key});return !success}catch(e){return false}}

/* ---------- CORS (solo el origen de la app, con credenciales) ---------- */
function cors(env,req,res){
 const origin=req.headers.get('origin');
 if(origin&&origin===env.APP_ORIGIN){
  res.headers.set('access-control-allow-origin',origin);res.headers.set('access-control-allow-credentials','true');
  res.headers.set('access-control-allow-headers','content-type');res.headers.set('access-control-allow-methods','GET,POST,OPTIONS');res.headers.set('vary','origin');
 }
 return res;
}

/* ---------- Compresión de proyectos (gzip + base64) ---------- */
async function zip(text){const s=new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));const u8=new Uint8Array(await new Response(s).arrayBuffer());let bin='';for(let i=0;i<u8.length;i+=0x8000)bin+=String.fromCharCode(...u8.subarray(i,i+0x8000));return btoa(bin)}
async function unzip(b64){const bin=atob(b64),u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);return await new Response(new Blob([u8]).stream().pipeThrough(new DecompressionStream('gzip'))).text()}

/* ---------- Stripe ---------- */
async function stripe(env,path,params){
 const body=new URLSearchParams();
 const add=(prefix,value)=>{if(value&&typeof value==='object')for(const [k,v] of Object.entries(value))add(prefix?`${prefix}[${k}]`:k,v);else if(value!==undefined&&value!==null)body.append(prefix,String(value))};
 add('',params);
 const r=await fetch('https://api.stripe.com/v1/'+path,{method:'POST',headers:{authorization:'Bearer '+env.STRIPE_SECRET_KEY,'content-type':'application/x-www-form-urlencoded'},body});
 const j=await r.json();if(!r.ok)throw Error(j.error?.message||'Stripe '+r.status);return j;
}
async function verifyStripe(env,req,raw){
 const header=req.headers.get('stripe-signature')||'';
 const parts=Object.fromEntries(header.split(',').map(x=>x.split('=')));
 const t=Number(parts.t);if(!t||Math.abs(now()-t)>300)return false; // tolerancia 5 min contra repeticiones
 const sig=hex(await hmac(env.STRIPE_WEBHOOK_SECRET,t+'.'+raw));
 return header.split(',').filter(x=>x.startsWith('v1=')).some(x=>safeEqual(x.slice(3),sig));
}
const PLAN_BY_PRICE=env=>({[env.PRICE_PRO_MONTHLY]:'pro',[env.PRICE_PRO_YEARLY]:'pro',[env.PRICE_STUDIO_MONTHLY]:'studio',[env.PRICE_STUDIO_YEARLY]:'studio'});

/* ---------- Equipo del plan Estudio: el titular + hasta 4 correos invitados, que pasan a Pro ---------- */
const TEAM_MAX=4;
let teamReady=false;
async function ensureTeam(env){
 if(teamReady)return;
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS team_members (owner_id TEXT NOT NULL, email TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY(owner_id,email))').run();
 await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_team_email ON team_members(email)').run();
 teamReady=true;
}
const ACTIVE_SUB="status IN ('active','trialing','past_due') AND current_period_end>?";

/* ---------- Estado del usuario ---------- */
async function planFor(env,userId){
 const user=await env.DB.prepare('SELECT id,email,trial_ends_at FROM users WHERE id=?').bind(userId).first();
 if(!user)return null;
 const sub=await env.DB.prepare("SELECT plan,status,current_period_end FROM subscriptions WHERE user_id=? AND status IN ('active','trialing','past_due') ORDER BY current_period_end DESC LIMIT 1").bind(userId).first();
 const trialEndsAt=new Date(user.trial_ends_at*1000).toISOString();
 if(sub&&sub.current_period_end>now()-3*86400)return {plan:sub.plan,email:user.email,trialEndsAt}; // 3 días de gracia
 // Invitado por un titular del plan Estudio con la suscripción vigente → Pro
 await ensureTeam(env);
 const team=await env.DB.prepare(`SELECT u.email AS owner FROM team_members t JOIN users u ON u.id=t.owner_id JOIN subscriptions s ON s.user_id=t.owner_id
  WHERE t.email=? AND s.plan='studio' AND s.${ACTIVE_SUB} LIMIT 1`).bind(user.email,now()-3*86400).first();
 if(team)return {plan:'pro',email:user.email,trialEndsAt,teamOf:team.owner};
 return {plan:user.trial_ends_at>now()?'trial':'free',email:user.email,trialEndsAt};
}

// Idioma de la persona (encabezado Accept-Language): español si lo pide, si no inglés.
const isEs=req=>/^es\b/i.test(String(req.headers.get('accept-language')||'').trim());
const loginPage=(env,es)=>`<!doctype html><html lang="${es?'es':'en'}"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>CAD2D · ${es?'Acceso':'Sign in'}</title>
<body style="font-family:system-ui;background:#111821;color:#e5eef7;display:grid;place-items:center;min-height:100vh;margin:0">
<form id="f" style="background:#18222c;padding:24px;border-radius:12px;border:1px solid #3c5262;width:min(360px,90vw)">
<h2 style="margin-top:0">CAD2D</h2><p>${es?'Te enviamos un enlace de acceso a tu correo. Sin contraseñas.':'We will email you a sign-in link. No passwords.'}</p>
<input name="email" type="email" required placeholder="${es?'tu@correo.com':'you@email.com'}" style="width:100%;padding:10px;box-sizing:border-box">
<button style="margin-top:10px;width:100%;padding:10px">${es?'Enviar enlace':'Send link'}</button><p id="m"></p></form>
<script>f.onsubmit=async e=>{e.preventDefault();const r=await fetch('/auth/request',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:f.email.value})});m.textContent=r.ok?${es?"'Revisá tu correo.'":"'Check your inbox.'"}:${es?"'No se pudo enviar.'":"'Could not send the email.'"}}</script>`;

export default {
 async fetch(req,env){return secure(await handle(req,env))}
};
async function handle(req,env){
  {const url=new URL(req.url),path=url.pathname;
  if(req.method==='OPTIONS')return cors(env,req,new Response(null,{status:204}));
  try{
   if(req.method!=='GET'&&req.method!=='POST')return json({error:'método no permitido'},405);
   if(req.method==='POST'&&path!=='/api/stripe-webhook'){
    if(!originAllowed(env,req))return cors(env,req,json({error:'origen no permitido'},403));
    if(tooLarge(req,path.startsWith('/api/projects')?8*1024*1024:16*1024))return cors(env,req,json({error:'demasiado grande'},413));
   }
   if(path==='/api/stripe-webhook'&&tooLarge(req,512*1024))return json({error:'demasiado grande'},413);
   if(path.startsWith('/api/')&&path!=='/api/stripe-webhook'&&await limited(env.API_LIMITER,clientIp(req)))return cors(env,req,json({error:'demasiados pedidos'},429));
   if(path==='/auth/login'&&req.method==='GET')return new Response(loginPage(env,isEs(req)),{headers:{'content-type':'text/html; charset=utf-8'}});
   if(path==='/auth/request'&&req.method==='POST'){
    const {email}=await req.json().catch(()=>({}));
    const mail=String(email||'').trim().toLowerCase();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)||mail.length>200)return json({error:'email inválido'},400);
    if(!(req.headers.get('content-type')||'').includes('application/json'))return json({error:'formato inválido'},415);
    if(await limited(env.AUTH_LIMITER,clientIp(req)))return json({error:'demasiados pedidos, probá en unos minutos'},429);
    const recent=await env.DB.prepare('SELECT COUNT(*) AS n FROM login_tokens WHERE email=? AND expires_at>?').bind(mail,now()).first();
    if((recent?.n||0)>=3)return json({ok:true}); // máx. 3 enlaces vigentes por correo (evita spam); misma respuesta
    const token=randomToken();
    await env.DB.prepare('INSERT INTO login_tokens(token_hash,email,expires_at) VALUES(?,?,?)').bind(await sha256(token),mail,now()+900).run();
    const link=`${env.API_ORIGIN}/auth/verify?token=${token}`;
    await fetch('https://api.resend.com/emails',{method:'POST',headers:{authorization:'Bearer '+env.RESEND_API_KEY,'content-type':'application/json'},
     body:JSON.stringify({from:env.MAIL_FROM,to:mail,...(isEs(req)?{subject:'Tu acceso a CAD2D',html:`<p>Ingresá a CAD2D con este enlace (vence en 15 minutos):</p><p><a href="${link}">${link}</a></p>`}:{subject:'Your CAD2D sign-in link',html:`<p>Sign in to CAD2D with this link (it expires in 15 minutes):</p><p><a href="${link}">${link}</a></p>`})})});
    return json({ok:true}); // misma respuesta exista o no la cuenta
   }
   if(path==='/auth/verify'&&req.method==='GET'){
    // Los antivirus de correo abren los enlaces: el GET no consume el token, solo muestra un paso que se confirma solo.
    const token=(url.searchParams.get('token')||'').slice(0,100),es=isEs(req);
    return html(`<!doctype html><html lang="${es?'es':'en'}"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>CAD2D</title>
<body style="font-family:system-ui;background:#111821;color:#e5eef7;display:grid;place-items:center;min-height:100vh;margin:0">
<form id="f" method="POST" action="/auth/verify" style="background:#18222c;padding:24px;border-radius:12px;border:1px solid #3c5262;width:min(360px,90vw);text-align:center">
<input type="hidden" name="token" value="${escHtml(token)}"><p>${es?'Ingresando a CAD2D…':'Signing in to CAD2D…'}</p><button style="padding:10px 18px">${es?'Continuar':'Continue'}</button></form>
<script>document.getElementById('f').submit()</script>`);
   }
   if(path==='/auth/verify'&&req.method==='POST'){
    const form=await req.formData().catch(()=>null);
    const token=String(form?.get('token')||'').slice(0,100),h=await sha256(token);
    const row=await env.DB.prepare('SELECT email,expires_at,used FROM login_tokens WHERE token_hash=?').bind(h).first();
    if(!row||row.used||row.expires_at<now())return html('<p style="font-family:system-ui">'+(isEs(req)?'Enlace vencido o usado. Pedí uno nuevo.':'Link expired or already used. Request a new one.')+'</p>',400);
    const upd=await env.DB.prepare('UPDATE login_tokens SET used=1 WHERE token_hash=? AND used=0').bind(h).run();
    if(upd?.meta&&upd.meta.changes===0)return html('<p>'+(isEs(req)?'Enlace ya usado.':'Link already used.')+'</p>',400);
    let user=await env.DB.prepare('SELECT id FROM users WHERE email=?').bind(row.email).first();
    if(!user){
     const id=crypto.randomUUID(),trial=now()+86400*Number(env.TRIAL_DAYS||90);
     await env.DB.prepare('INSERT INTO users(id,email,created_at,trial_ends_at) VALUES(?,?,?,?)').bind(id,row.email,now(),trial).run();user={id};
    }
    return new Response(null,{status:302,headers:{location:env.APP_ORIGIN+(env.APP_PATH||'/'),'set-cookie':cookie(env,await makeSession(env,user.id),60*60*24*30)}});
   }
   if(path==='/auth/logout'&&req.method==='POST')return cors(env,req,json({ok:true},200,{'set-cookie':cookie(env,'',0)}));
   if(path==='/api/stripe-webhook'&&req.method==='POST'){
    const raw=await req.text();if(!await verifyStripe(env,req,raw))return new Response('firma inválida',{status:400});
    let event;try{event=JSON.parse(raw)}catch(e){return json({error:'json inválido'},400)}const o=event?.data?.object||{};
    const seen=await env.DB.prepare('SELECT id FROM stripe_events WHERE id=?').bind(event.id).first();if(seen)return json({ok:true});
    await env.DB.prepare('INSERT INTO stripe_events(id,type,created_at) VALUES(?,?,?)').bind(event.id,event.type,now()).run();
    if(event.type==='checkout.session.completed'&&o.client_reference_id){
     await env.DB.prepare('UPDATE users SET stripe_customer_id=? WHERE id=?').bind(o.customer,o.client_reference_id).run();
    }
    if(event.type.startsWith('customer.subscription.')){
     const user=await env.DB.prepare('SELECT id FROM users WHERE stripe_customer_id=?').bind(o.customer).first();
     if(user){
      const price=o.items?.data?.[0]?.price?.id,plan=PLAN_BY_PRICE(env)[price]||'pro';
      await env.DB.prepare(`INSERT INTO subscriptions(id,user_id,plan,status,current_period_end,updated_at) VALUES(?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET plan=excluded.plan,status=excluded.status,current_period_end=excluded.current_period_end,updated_at=excluded.updated_at`)
       .bind(o.id,user.id,plan,event.type==='customer.subscription.deleted'?'canceled':o.status,o.current_period_end||o.items?.data?.[0]?.current_period_end||0,now()).run();
     }
    }
    return json({ok:true});
   }
   // Proyecto compartido (solo lectura, sin sesión): GET /api/share/<id>
   if(path.startsWith('/api/share/')&&req.method==='GET'){
    const sid=path.slice(11).replace(/[^A-Za-z0-9_-]/g,'').slice(0,40);
    const row=sid&&await env.DB.prepare('SELECT name,data,updated_at FROM projects WHERE share_id=?').bind(sid).first();
    if(!row)return cors(env,req,json({error:'enlace no válido o desactivado'},404));
    return cors(env,req,json({name:row.name,data:await unzip(row.data),updatedAt:row.updated_at,readOnly:true}));
   }
   // A partir de aquí, endpoints de la app (requieren sesión)
   const userId=await readSession(env,req);
   if(path==='/api/status'&&req.method==='GET'){
    if(!userId)return cors(env,req,json({plan:'free',email:null,trialEndsAt:null,anonymous:true}));
    return cors(env,req,json(await planFor(env,userId)||{plan:'free'}));
   }
   if(!userId)return cors(env,req,json({error:'iniciá sesión'},401));
   if(path==='/api/checkout'&&req.method==='POST'){
    const {plan='pro'}=await req.json().catch(()=>({}));
    const price={pro:env.PRICE_PRO_MONTHLY,'pro-yearly':env.PRICE_PRO_YEARLY,studio:env.PRICE_STUDIO_MONTHLY,'studio-yearly':env.PRICE_STUDIO_YEARLY}[plan];
    if(!price)return cors(env,req,json({error:'plan inválido'},400));
    const user=await env.DB.prepare('SELECT email,stripe_customer_id,trial_ends_at FROM users WHERE id=?').bind(userId).first();
    // Compra durante la prueba: Stripe empieza a cobrar recién al terminar los días gratis (mínimo 48 h, regla de Stripe).
    const trialEnd=Number(user.trial_ends_at)||0,keepTrial=trialEnd>now()+2*86400+300;
    // Métodos de pago dinámicos: tarjeta, PayPal, SEPA, Apple/Google Pay… se activan desde el Dashboard
    // (Configuración → Métodos de pago) sin tocar este código (a propósito no se fija una lista de métodos).
    const tax=env.STRIPE_TAX==='1';
    const session=await stripe(env,'checkout/sessions',{mode:'subscription',client_reference_id:userId,locale:'auto',
     ...(user.stripe_customer_id?{customer:user.stripe_customer_id,customer_update:{address:'auto',name:'auto'}}:{customer_email:user.email}),
     line_items:{0:{price,quantity:1}},allow_promotion_codes:'true',billing_address_collection:'required',
     ...(tax?{automatic_tax:{enabled:'true'},tax_id_collection:{enabled:'true'}}:{}),
     subscription_data:{metadata:{user_id:userId},...(keepTrial?{trial_end:trialEnd}:{})},
     success_url:env.APP_ORIGIN+(env.APP_PATH||'/')+'?pago=ok',cancel_url:env.APP_ORIGIN+(env.APP_PATH||'/')+'?pago=cancelado'});
    return cors(env,req,json({url:session.url}));
   }
   // ---------- Equipo (plan Estudio) ----------
   if(path==='/api/team'||path==='/api/team/add'||path==='/api/team/remove'){
    const me=await planFor(env,userId);
    if(me?.plan!=='studio'||me.teamOf)return cors(env,req,json({error:'El equipo es parte del plan Estudio.',upgrade:true},402));
    await ensureTeam(env);
    const list=async()=>((await env.DB.prepare('SELECT email FROM team_members WHERE owner_id=? ORDER BY created_at').bind(userId).all()).results||[]).map(r=>r.email);
    if(path==='/api/team'&&req.method==='GET')return cors(env,req,json({members:await list(),max:TEAM_MAX}));
    if(req.method!=='POST')return cors(env,req,json({error:'método no permitido'},405));
    const b=await req.json().catch(()=>({}));
    const mail=String(b.email||'').trim().toLowerCase();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)||mail.length>200)return cors(env,req,json({error:'email inválido'},400));
    if(path==='/api/team/add'){
     if(mail===me.email)return cors(env,req,json({error:'Vos ya estás incluido como titular.'},400));
     const cur=await list();
     if(!cur.includes(mail)){
      if(cur.length>=TEAM_MAX)return cors(env,req,json({error:'El plan Estudio incluye hasta '+TEAM_MAX+' personas además del titular.'},400));
      await env.DB.prepare('INSERT OR IGNORE INTO team_members(owner_id,email,created_at) VALUES(?,?,?)').bind(userId,mail,now()).run();
     }
    }else await env.DB.prepare('DELETE FROM team_members WHERE owner_id=? AND email=?').bind(userId,mail).run();
    return cors(env,req,json({ok:true,members:await list(),max:TEAM_MAX}));
   }
   // ---------- XREF en la nube: leer (nunca modificar) proyectos propios y del equipo Estudio ----------
   if(path.startsWith('/api/xref/')&&req.method==='GET'){
    const me=await planFor(env,userId);await ensureTeam(env);
    let owner=null;
    if(me?.plan==='studio'&&!me.teamOf)owner=userId;
    else if(me?.teamOf)owner=(await env.DB.prepare('SELECT id FROM users WHERE email=?').bind(me.teamOf).first())?.id||null;
    let ids=[userId];
    if(owner){const {results}=await env.DB.prepare('SELECT u.id FROM team_members t JOIN users u ON u.email=t.email WHERE t.owner_id=?').bind(owner).all();ids=[...new Set([userId,owner,...(results||[]).map(r=>r.id)])]}
    const marks=ids.map(()=>'?').join(',');
    if(path==='/api/xref/projects'){
     const {results}=await env.DB.prepare(`SELECT p.id,p.name,p.size,p.updated_at,p.user_id,u.email FROM projects p JOIN users u ON u.id=p.user_id WHERE p.user_id IN (${marks}) ORDER BY p.updated_at DESC LIMIT 300`).bind(...ids).all();
     return cors(env,req,json({team:!!owner,projects:(results||[]).map(r=>({id:r.id,name:r.name,size:r.size,updatedAt:r.updated_at,owner:r.email,mine:r.user_id===userId}))}));
    }
    if(path==='/api/xref/stamps'){
     const want=String(url.searchParams.get('ids')||'').split(',').map(x=>x.replace(/[^A-Za-z0-9-]/g,'')).filter(Boolean).slice(0,50);
     if(!want.length)return cors(env,req,json({stamps:{}}));
     const {results}=await env.DB.prepare(`SELECT id,updated_at FROM projects WHERE id IN (${want.map(()=>'?').join(',')}) AND user_id IN (${marks})`).bind(...want,...ids).all();
     return cors(env,req,json({stamps:Object.fromEntries((results||[]).map(r=>[r.id,r.updated_at]))}));
    }
    const m=path.match(/^\/api\/xref\/projects\/([A-Za-z0-9-]{8,40})$/);
    if(m){const r=await env.DB.prepare(`SELECT id,name,data,updated_at FROM projects WHERE id=? AND user_id IN (${marks})`).bind(m[1],...ids).first();
     if(!r)return cors(env,req,json({error:'no encontrado o sin acceso'},404));
     return cors(env,req,json({id:r.id,name:r.name,updatedAt:r.updated_at,data:await unzip(r.data)}));}
    return cors(env,req,json({error:'no encontrado'},404));
   }
   // ---------- Proyectos en la nube ----------
   if(path==='/api/projects'&&req.method==='GET'){
    const {results}=await env.DB.prepare('SELECT id,name,size,updated_at,share_id FROM projects WHERE user_id=? ORDER BY updated_at DESC LIMIT 200').bind(userId).all();
    return cors(env,req,json({projects:(results||[]).map(r=>({id:r.id,name:r.name,size:r.size,updatedAt:r.updated_at,shareId:r.share_id||null}))}));
   }
   if(path==='/api/projects'&&req.method==='POST'){
    const body=await req.json().catch(()=>null);
    if(!body||typeof body.data!=='string'||body.data.length<2)return cors(env,req,json({error:'proyecto inválido'},400));
    try{const j=JSON.parse(body.data);if(!Array.isArray(j.entities)||!Array.isArray(j.layers))throw 0}catch(e){return cors(env,req,json({error:'proyecto inválido'},400))}
    const name=String(body.name||'Dibujo').replace(/[\u0000-\u001f]/g,'').trim().slice(0,80)||'Dibujo';
    const packed=await zip(body.data);if(packed.length>1900000)return cors(env,req,json({error:'proyecto demasiado grande para la nube (máx. ~1,9 MB comprimido)'},413));
    const plan=(await planFor(env,userId))?.plan||'free';
    let id=String(body.id||'').replace(/[^A-Za-z0-9-]/g,'').slice(0,40);
    const own=id&&await env.DB.prepare('SELECT id,data FROM projects WHERE id=? AND user_id=?').bind(id,userId).first();
    if(!own){
     const n=(await env.DB.prepare('SELECT COUNT(*) AS n FROM projects WHERE user_id=?').bind(userId).first())?.n||0;
     if(plan==='free'&&n>=3)return cors(env,req,json({error:'El plan gratis guarda hasta 3 proyectos en la nube. Pasá a Pro para guardar más.',upgrade:true},402));
     if(n>=500)return cors(env,req,json({error:'límite de proyectos alcanzado'},400));
     id=crypto.randomUUID();
     await env.DB.prepare('INSERT INTO projects(id,user_id,name,data,size,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').bind(id,userId,name,packed,body.data.length,now(),now()).run();
    }else{
     await env.DB.prepare('INSERT INTO project_versions(project_id,data,created_at) VALUES(?,?,?)').bind(id,own.data,now()).run();
     await env.DB.prepare('DELETE FROM project_versions WHERE project_id=? AND id NOT IN (SELECT id FROM project_versions WHERE project_id=? ORDER BY id DESC LIMIT 10)').bind(id,id).run();
     await env.DB.prepare('UPDATE projects SET name=?,data=?,size=?,updated_at=? WHERE id=? AND user_id=?').bind(name,packed,body.data.length,now(),id,userId).run();
    }
    return cors(env,req,json({ok:true,id,updatedAt:now()}));
   }
   {const m=path.match(/^\/api\/projects\/([A-Za-z0-9-]{8,40})(?:\/(share|delete|versions|rename))?(?:\/(\d+))?$/);
    if(m){
     const [,pid,action,vid]=m;
     const own=await env.DB.prepare('SELECT id,name,data,share_id FROM projects WHERE id=? AND user_id=?').bind(pid,userId).first();
     if(!own)return cors(env,req,json({error:'no encontrado'},404));
     if(!action&&req.method==='GET')return cors(env,req,json({id:pid,name:own.name,data:await unzip(own.data)}));
     if(action==='delete'&&req.method==='POST'){await env.DB.prepare('DELETE FROM project_versions WHERE project_id=?').bind(pid).run();await env.DB.prepare('DELETE FROM projects WHERE id=? AND user_id=?').bind(pid,userId).run();return cors(env,req,json({ok:true}))}
     if(action==='rename'&&req.method==='POST'){const b=await req.json().catch(()=>({}));const nm=String(b.name||'').trim().slice(0,80);if(!nm)return cors(env,req,json({error:'nombre vacío'},400));await env.DB.prepare('UPDATE projects SET name=? WHERE id=? AND user_id=?').bind(nm,pid,userId).run();return cors(env,req,json({ok:true}))}
     if(action==='share'&&req.method==='POST'){
      const b=await req.json().catch(()=>({}));
      if(b.on===false){await env.DB.prepare('UPDATE projects SET share_id=NULL WHERE id=? AND user_id=?').bind(pid,userId).run();return cors(env,req,json({ok:true,shareId:null}))}
      const sid=own.share_id||randomToken(12);await env.DB.prepare('UPDATE projects SET share_id=? WHERE id=? AND user_id=?').bind(sid,pid,userId).run();return cors(env,req,json({ok:true,shareId:sid}));
     }
     if(action==='versions'&&req.method==='GET'){
      if(vid){const v=await env.DB.prepare('SELECT data,created_at FROM project_versions WHERE id=? AND project_id=?').bind(Number(vid),pid).first();if(!v)return cors(env,req,json({error:'no encontrado'},404));return cors(env,req,json({name:own.name,data:await unzip(v.data),createdAt:v.created_at}))}
      const {results}=await env.DB.prepare('SELECT id,created_at,length(data) AS bytes FROM project_versions WHERE project_id=? ORDER BY id DESC LIMIT 10').bind(pid).all();
      return cors(env,req,json({versions:(results||[]).map(r=>({id:r.id,createdAt:r.created_at,bytes:r.bytes}))}));
     }
    }
   }
   if(path==='/api/portal'&&req.method==='POST'){
    const user=await env.DB.prepare('SELECT stripe_customer_id FROM users WHERE id=?').bind(userId).first();
    if(!user?.stripe_customer_id)return cors(env,req,json({error:'sin suscripción'},400));
    const portal=await stripe(env,'billing_portal/sessions',{customer:user.stripe_customer_id,return_url:env.APP_ORIGIN+(env.APP_PATH||'/')});
    return cors(env,req,json({url:portal.url}));
   }
   return cors(env,req,json({error:'no encontrado'},404));
  }catch(error){
   console.error(error);return cors(env,req,json({error:'error interno'},500));
  }
 }
}
