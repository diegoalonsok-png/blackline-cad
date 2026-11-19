/* CAD2D · Servidor de cuentas y suscripciones (Cloudflare Worker + D1 + Stripe).
 * PLANTILLA NO DESPLEGADA. Ver billing/README.md antes de publicar.
 *
 * Variables (wrangler secret put …): STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SESSION_SECRET, RESEND_API_KEY
 * Variables (wrangler.toml [vars]):    APP_ORIGIN, API_ORIGIN, PRICE_PRO_MONTHLY, PRICE_PRO_YEARLY, PRICE_STUDIO_MONTHLY,
 *                                      TRIAL_DAYS (90), MAIL_FROM, COOKIE_DOMAIN
 * Base de datos D1 enlazada como DB (schema.sql).
 *
 * Endpoints
 *   GET  /auth/login              formulario de acceso por enlace mágico (sin contraseñas)
 *   POST /auth/request            {email} → envía enlace de un solo uso (15 min)
 *   GET  /auth/verify?token=      crea la sesión (cookie HttpOnly) y vuelve a la app
 *   POST /auth/logout
 *   GET  /api/status              {plan:'trial'|'free'|'pro'|'studio', trialEndsAt, email}
 *   POST /api/checkout            {plan:'pro'|'pro-yearly'|'studio'} → {url} de Stripe Checkout
 *   POST /api/portal              → {url} del portal de facturación de Stripe
 *   POST /api/stripe-webhook      eventos firmados de Stripe (fuente de verdad del plan)
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
const cookie=(env,value,maxAge)=>`cad2d_session=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=${maxAge}${env.COOKIE_DOMAIN?'; Domain='+env.COOKIE_DOMAIN:''}`;

/* ---------- CORS (solo el origen de la app, con credenciales) ---------- */
function cors(env,req,res){
 const origin=req.headers.get('origin');
 if(origin&&origin===env.APP_ORIGIN){
  res.headers.set('access-control-allow-origin',origin);res.headers.set('access-control-allow-credentials','true');
  res.headers.set('access-control-allow-headers','content-type');res.headers.set('access-control-allow-methods','GET,POST,OPTIONS');res.headers.set('vary','origin');
 }
 return res;
}

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
const PLAN_BY_PRICE=env=>({[env.PRICE_PRO_MONTHLY]:'pro',[env.PRICE_PRO_YEARLY]:'pro',[env.PRICE_STUDIO_MONTHLY]:'studio'});

/* ---------- Estado del usuario ---------- */
async function planFor(env,userId){
 const user=await env.DB.prepare('SELECT id,email,trial_ends_at FROM users WHERE id=?').bind(userId).first();
 if(!user)return null;
 const sub=await env.DB.prepare("SELECT plan,status,current_period_end FROM subscriptions WHERE user_id=? AND status IN ('active','trialing','past_due') ORDER BY current_period_end DESC LIMIT 1").bind(userId).first();
 const trialEndsAt=new Date(user.trial_ends_at*1000).toISOString();
 if(sub&&sub.current_period_end>now()-3*86400)return {plan:sub.plan,email:user.email,trialEndsAt}; // 3 días de gracia
 return {plan:user.trial_ends_at>now()?'trial':'free',email:user.email,trialEndsAt};
}

const loginPage=env=>`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>CAD2D · Acceso</title>
<body style="font-family:system-ui;background:#111821;color:#e5eef7;display:grid;place-items:center;min-height:100vh;margin:0">
<form id="f" style="background:#18222c;padding:24px;border-radius:12px;border:1px solid #3c5262;width:min(360px,90vw)">
<h2 style="margin-top:0">CAD2D</h2><p>Te enviamos un enlace de acceso a tu correo. Sin contraseñas.</p>
<input name="email" type="email" required placeholder="tu@correo.com" style="width:100%;padding:10px;box-sizing:border-box">
<button style="margin-top:10px;width:100%;padding:10px">Enviar enlace</button><p id="m"></p></form>
<script>f.onsubmit=async e=>{e.preventDefault();const r=await fetch('/auth/request',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:f.email.value})});m.textContent=r.ok?'Revisá tu correo.':'No se pudo enviar.'}</script>`;

export default {
 async fetch(req,env){
  const url=new URL(req.url),path=url.pathname;
  if(req.method==='OPTIONS')return cors(env,req,new Response(null,{status:204}));
  try{
   if(path==='/auth/login'&&req.method==='GET')return new Response(loginPage(env),{headers:{'content-type':'text/html; charset=utf-8'}});
   if(path==='/auth/request'&&req.method==='POST'){
    const {email}=await req.json().catch(()=>({}));
    const mail=String(email||'').trim().toLowerCase();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)||mail.length>200)return json({error:'email inválido'},400);
    const token=randomToken();
    await env.DB.prepare('INSERT INTO login_tokens(token_hash,email,expires_at) VALUES(?,?,?)').bind(await sha256(token),mail,now()+900).run();
    const link=`${env.API_ORIGIN}/auth/verify?token=${token}`;
    await fetch('https://api.resend.com/emails',{method:'POST',headers:{authorization:'Bearer '+env.RESEND_API_KEY,'content-type':'application/json'},
     body:JSON.stringify({from:env.MAIL_FROM,to:mail,subject:'Tu acceso a CAD2D',html:`<p>Ingresá a CAD2D con este enlace (vence en 15 minutos):</p><p><a href="${link}">${link}</a></p>`})});
    return json({ok:true}); // misma respuesta exista o no la cuenta
   }
   if(path==='/auth/verify'&&req.method==='GET'){
    const token=url.searchParams.get('token')||'',h=await sha256(token);
    const row=await env.DB.prepare('SELECT email,expires_at,used FROM login_tokens WHERE token_hash=?').bind(h).first();
    if(!row||row.used||row.expires_at<now())return new Response('Enlace vencido o usado. Pedí uno nuevo.',{status:400});
    await env.DB.prepare('UPDATE login_tokens SET used=1 WHERE token_hash=?').bind(h).run();
    let user=await env.DB.prepare('SELECT id FROM users WHERE email=?').bind(row.email).first();
    if(!user){
     const id=crypto.randomUUID(),trial=now()+86400*Number(env.TRIAL_DAYS||90);
     await env.DB.prepare('INSERT INTO users(id,email,created_at,trial_ends_at) VALUES(?,?,?,?)').bind(id,row.email,now(),trial).run();user={id};
    }
    return new Response(null,{status:302,headers:{location:env.APP_ORIGIN+'/blackline-cad/','set-cookie':cookie(env,await makeSession(env,user.id),60*60*24*30)}});
   }
   if(path==='/auth/logout'&&req.method==='POST')return cors(env,req,json({ok:true},200,{'set-cookie':cookie(env,'',0)}));
   if(path==='/api/stripe-webhook'&&req.method==='POST'){
    const raw=await req.text();if(!await verifyStripe(env,req,raw))return new Response('firma inválida',{status:400});
    const event=JSON.parse(raw),o=event.data.object;
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
   // A partir de aquí, endpoints de la app (requieren sesión)
   const userId=await readSession(env,req);
   if(path==='/api/status'&&req.method==='GET'){
    if(!userId)return cors(env,req,json({plan:'free',email:null,trialEndsAt:null,anonymous:true}));
    return cors(env,req,json(await planFor(env,userId)||{plan:'free'}));
   }
   if(!userId)return cors(env,req,json({error:'iniciá sesión'},401));
   if(path==='/api/checkout'&&req.method==='POST'){
    const {plan='pro'}=await req.json().catch(()=>({}));
    const price={pro:env.PRICE_PRO_MONTHLY,'pro-yearly':env.PRICE_PRO_YEARLY,studio:env.PRICE_STUDIO_MONTHLY}[plan];
    if(!price)return cors(env,req,json({error:'plan inválido'},400));
    const user=await env.DB.prepare('SELECT email,stripe_customer_id FROM users WHERE id=?').bind(userId).first();
    const session=await stripe(env,'checkout/sessions',{mode:'subscription',client_reference_id:userId,
     ...(user.stripe_customer_id?{customer:user.stripe_customer_id}:{customer_email:user.email}),
     line_items:{0:{price,quantity:1}},allow_promotion_codes:'true',
     success_url:env.APP_ORIGIN+'/blackline-cad/?pago=ok',cancel_url:env.APP_ORIGIN+'/blackline-cad/?pago=cancelado'});
    return cors(env,req,json({url:session.url}));
   }
   if(path==='/api/portal'&&req.method==='POST'){
    const user=await env.DB.prepare('SELECT stripe_customer_id FROM users WHERE id=?').bind(userId).first();
    if(!user?.stripe_customer_id)return cors(env,req,json({error:'sin suscripción'},400));
    const portal=await stripe(env,'billing_portal/sessions',{customer:user.stripe_customer_id,return_url:env.APP_ORIGIN+'/blackline-cad/'});
    return cors(env,req,json({url:portal.url}));
   }
   return cors(env,req,json({error:'no encontrado'},404));
  }catch(error){
   console.error(error);return cors(env,req,json({error:'error interno'},500));
  }
 }
};
