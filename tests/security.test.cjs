// Protecciones del sitio y del servidor de cuentas.
const test=require('node:test'),assert=require('node:assert'),fs=require('fs'),path=require('path');
const R=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
test('cabeceras de seguridad del sitio (CSP, HSTS, anti-iframe)',()=>{
 const h=R('_headers');
 for(const k of['Content-Security-Policy',"object-src 'none'","frame-ancestors 'self'",'Strict-Transport-Security','X-Frame-Options','Cross-Origin-Opener-Policy'])assert.ok(h.includes(k),k);
 assert.doesNotMatch(h,/unsafe-eval/);
});
test('sin eval ni new Function en el código de la app',()=>{
 for(const f of fs.readdirSync(path.join(__dirname,'..')).filter(f=>/\.js$/.test(f)).concat(['index.html']))assert.doesNotMatch(R(f),/new Function\(|[^.\w]eval\(/,f);
});
test('worker: anti-CSRF, límites, enlace no consumible por antivirus, cookie Lax',()=>{
 const w=R('billing/worker.js');
 assert.match(w,/originAllowed\(env,req\)/);assert.match(w,/tooLarge\(req,16\*1024\)/);assert.match(w,/AUTH_LIMITER/);
 assert.match(w,/SameSite=Lax/);assert.match(w,/path==='\/auth\/verify'&&req\.method==='POST'/);assert.match(w,/content-security-policy/);
});
