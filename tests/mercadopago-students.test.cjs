// Circuito completo de Mercado Pago (ARS) y descuento de estudiante, ejecutando el Worker real
// con una base SQLite en memoria y la API de Mercado Pago simulada.
const test=require('node:test'),assert=require('node:assert'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const {DatabaseSync}=require('node:sqlite');
const root=path.join(__dirname,'..');
function d1(){const db=new DatabaseSync(':memory:');db.exec(fs.readFileSync(path.join(root,'billing/schema.sql'),'utf8'));
 const st=(sql,args=[])=>({bind:(...a)=>st(sql,a),first:async()=>db.prepare(sql).get(...args)??null,all:async()=>({results:db.prepare(sql).all(...args)}),run:async()=>{const r=db.prepare(sql).run(...args);return {meta:{changes:r.changes}}}});
 return {prepare:sql=>st(sql),raw:db}}
const b64url=b=>Buffer.from(b).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
test('Mercado Pago en pesos + estudiantes 50 %',async()=>{
 const W=(await import(path.join(root,'billing/worker.js'))).default;
 const DB=d1(),env={DB,SESSION_SECRET:'s'.repeat(64),APP_ORIGIN:'https://blackline-cad.org',API_ORIGIN:'https://api.blackline-cad.org',APP_PATH:'/',TRIAL_DAYS:'90',
  MP_ACCESS_TOKEN:'TEST-token',MP_WEBHOOK_SECRET:'whsec',MP_PRICE_PRO_MONTHLY:'9000',MP_PRICE_PRO_YEARLY:'75000',RESEND_API_KEY:'re',MAIL_FROM:'x@y'};
 const now=Math.floor(Date.now()/1000);
 DB.raw.prepare('INSERT INTO users(id,email,created_at,trial_ends_at) VALUES(?,?,?,?)').run('u1','ana@gmail.com',now,now-10);
 const exp=now+3600,sig=b64url(crypto.createHmac('sha256',env.SESSION_SECRET).update('u1.'+exp).digest());
 const cookie='cad2d_session='+encodeURIComponent('u1.'+exp+'.'+sig);
 const pre={},calls=[];let mail=null;
 global.fetch=async(u,o={})=>{u=String(u);calls.push([o.method||'GET',u,o.body]);
  if(u.includes('resend.com')){mail=JSON.parse(o.body);return new Response('{}')}
  if(u.endsWith('/preapproval')&&o.method==='POST'){const b=JSON.parse(o.body),id='pre'+(Object.keys(pre).length+1);pre[id]={id,...b,init_point:'https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_id='+id};return new Response(JSON.stringify(pre[id]))}
  const m=u.match(/\/preapproval\/(\w+)$/);if(m){if(o.method==='PUT')Object.assign(pre[m[1]],JSON.parse(o.body));return new Response(JSON.stringify(pre[m[1]]))}
  return new Response('{}',{status:404})};
 const call=(p,body,extra={})=>{const req=new Request('https://api.blackline-cad.org'+p,{method:body?'POST':'GET',headers:{cookie,origin:env.APP_ORIGIN,'content-type':'application/json','accept-language':'es',...extra},body:body?JSON.stringify(body):undefined});
  Object.defineProperty(req,'cf',{value:{country:'AR'}});return W.fetch(req,env).then(async r=>({s:r.status,j:await r.json().catch(()=>null)}))};
 let r=await call('/api/status');
 assert.deepStrictEqual(r.j.mercadoPago,{currency:'ARS',prices:{pro:9000,'pro-yearly':75000}});assert.strictEqual(r.j.studentDiscount,50);
 r=await call('/api/mp-checkout',{plan:'pro'});assert.match(r.j.url,/^https:\/\/www\.mercadopago\.com\.ar\//);
 assert.strictEqual(pre.pre1.auto_recurring.transaction_amount,9000);assert.strictEqual(pre.pre1.auto_recurring.currency_id,'ARS');assert.strictEqual(pre.pre1.external_reference,'u1|pro');
 // Aviso firmado → se consulta el estado real → plan Pro
 pre.pre1.status='authorized';pre.pre1.next_payment_date=new Date((now+30*86400)*1000).toISOString();
 const ts=String(now),manifest='id:pre1;request-id:rq1;ts:'+ts+';',v1=crypto.createHmac('sha256','whsec').update(manifest).digest('hex');
 const hook=(sigv)=>W.fetch(new Request('https://api.blackline-cad.org/api/mp-webhook?data.id=pre1&type=subscription_preapproval',{method:'POST',headers:{'x-signature':'ts='+ts+',v1='+sigv,'x-request-id':'rq1','content-type':'application/json'},body:JSON.stringify({type:'subscription_preapproval',data:{id:'pre1'}})}),env);
 assert.strictEqual((await hook('0'.repeat(64))).status,400,'firma falsa rechazada');
 assert.strictEqual((await hook(v1)).status,200);
 r=await call('/api/status');assert.strictEqual(r.j.plan,'pro');
 // Estudiantes: gmail no; correo de facultad sí; el código llega por mail y baja el precio a la mitad
 r=await call('/api/student/request',{email:'ana@gmail.com'});assert.strictEqual(r.s,400);
 r=await call('/api/student/request',{email:'ana@fadu.uba.ar'});assert.strictEqual(r.s,200);
 const code=mail.html.match(/>(\d{6})</)[1];
 assert.strictEqual((await call('/api/student/verify',{code:'000000'===code?'111111':'000000'})).s,400);
 r=await call('/api/student/verify',{code});assert.strictEqual(r.s,200);assert.strictEqual(r.j.discount,50);
 r=await call('/api/status');assert.ok(r.j.studentUntil);
 await call('/api/mp-checkout',{plan:'pro-yearly'});assert.strictEqual(pre.pre2.auto_recurring.transaction_amount,37500);assert.strictEqual(pre.pre2.auto_recurring.frequency,12);
 // Cancelar: deja de renovar pero respeta lo pagado
 r=await call('/api/mp-cancel',{});assert.strictEqual(r.s,200);assert.strictEqual(pre.pre1.status,'cancelled');
 r=await call('/api/status');assert.strictEqual(r.j.plan,'pro');
 // Fuera de Argentina no se ofrece
 const req=new Request('https://api.blackline-cad.org/api/status',{headers:{cookie}});Object.defineProperty(req,'cf',{value:{country:'ES'}});
 assert.strictEqual((await (await W.fetch(req,env)).json()).mercadoPago,undefined);
});
