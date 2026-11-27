// Nube: 30 versiones en Pro/Estudio/prueba (10 gratis) y comentarios en enlaces compartidos, con el Worker real.
const test=require('node:test'),assert=require('node:assert'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const {DatabaseSync}=require('node:sqlite');const root=path.join(__dirname,'..');
function d1(){const db=new DatabaseSync(':memory:');db.exec(fs.readFileSync(path.join(root,'billing/schema.sql'),'utf8'));
 const st=(sql,args=[])=>({bind:(...a)=>st(sql,a),first:async()=>db.prepare(sql).get(...args)??null,all:async()=>({results:db.prepare(sql).all(...args)}),run:async()=>{const r=db.prepare(sql).run(...args);return {meta:{changes:r.changes}}}});
 return {prepare:sql=>st(sql),raw:db}}
const b64url=b=>Buffer.from(b).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
test('versiones por plan y comentarios en el enlace compartido',async()=>{
 const W=(await import(path.join(root,'billing/worker.js'))).default;
 const DB=d1(),env={DB,SESSION_SECRET:'s'.repeat(64),APP_ORIGIN:'https://blackline-cad.org',API_ORIGIN:'https://api.blackline-cad.org',APP_PATH:'/'};
 const now=Math.floor(Date.now()/1000);
 DB.raw.prepare('INSERT INTO users(id,email,created_at,trial_ends_at) VALUES(?,?,?,?)').run('u1','a@x.com',now,now+86400*30);
 DB.raw.prepare('INSERT INTO users(id,email,created_at,trial_ends_at) VALUES(?,?,?,?)').run('u2','b@x.com',now,now-10);
 const ck=u=>{const exp=now+3600;return 'cad2d_session='+encodeURIComponent(u+'.'+exp+'.'+b64url(crypto.createHmac('sha256',env.SESSION_SECRET).update(u+'.'+exp).digest()))};
 const call=(p,body,u='u1')=>W.fetch(new Request('https://api.blackline-cad.org'+p,{method:body?'POST':'GET',headers:{...(u?{cookie:ck(u)}:{}),origin:env.APP_ORIGIN,'content-type':'application/json'},body:body?JSON.stringify(body):undefined}),env).then(async r=>({s:r.status,j:await r.json()}));
 const data=JSON.stringify({entities:[],layers:[]});
 let r=await call('/api/projects',{name:'A',data});const id=r.j.id;
 for(let i=0;i<35;i++)await call('/api/projects',{id,name:'A',data});
 r=await call('/api/projects/'+id+'/versions');assert.strictEqual(r.j.keep,30);assert.strictEqual(r.j.versions.length,30);
 r=await call('/api/projects',{name:'B',data},'u2');const id2=r.j.id;for(let i=0;i<15;i++)await call('/api/projects',{id:id2,name:'B',data},'u2');
 r=await call('/api/projects/'+id2+'/versions',null,'u2');assert.strictEqual(r.j.versions.length,10);
 // Comentarios: el dueño (en prueba) comparte; un invitado comenta sin sesión con un punto del plano
 const sid=(await call('/api/projects/'+id+'/share',{on:true})).j.shareId;
 r=await call('/api/share/'+sid+'/comments',{name:'Ana',text:'Mover la puerta 20 cm',x:3.5,y:-1},null);assert.strictEqual(r.s,200);assert.strictEqual(r.j.comments[0].author,'Ana');assert.strictEqual(r.j.comments[0].x,3.5);
 r=await call('/api/share/'+sid+'/comments',{text:'   '},null);assert.strictEqual(r.s,400);
 r=await call('/api/projects/'+id+'/comments');assert.strictEqual(r.j.comments.length,1);
 r=await call('/api/projects/'+id+'/comments/'+r.j.comments[0].id+'/delete',{});assert.strictEqual(r.j.comments.length,0);
 // Dueño en plan gratis: sin comentarios
 const sid2=(await call('/api/projects/'+id2+'/share',{on:true},'u2')).j.shareId;
 r=await call('/api/share/'+sid2+'/comments',null,null);assert.strictEqual(r.s,402);
});
