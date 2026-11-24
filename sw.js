/* Blackline CAD · service worker: permite instalar la app y abrirla sin conexión.
 * Estrategia «red primero»: siempre se usa la versión publicada más nueva; la copia guardada
 * solo se usa si no hay conexión. Nunca guarda llamadas a la API, pagos ni analítica. */
const CACHE='blackline-cad-v3';
const SCOPE=new URL(self.registration.scope).pathname;
const CORE=['./','./index.html','./manifest.webmanifest','./assets/icons/icon-192.png','./assets/icons/icon-512.png'];
self.addEventListener('install',ev=>{ev.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).catch(()=>{}));self.skipWaiting()});
self.addEventListener('activate',ev=>{ev.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('blackline-cad-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',ev=>{
 const req=ev.request,url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==self.location.origin||req.headers.has('range')||req.cache==='no-store')return;   // API, Stripe, Google: siempre por red
 if(/\.(dxf|dwg)$/i.test(url.pathname)&&url.pathname.includes('/examples/'))return;
 // The converter must never run with a stale or mixed JS/WASM runtime.
 if(/\/(?:cad-dwg-(?:batch|local-worker)\.js|cad-(?:block-browser|local-vector-packs|dxf-parser)\.js|dwg-wasm\/pkg\/[^/]+)$/.test(url.pathname)){
  ev.respondWith(fetch(req,{cache:'reload'}));return;
 }
 const relative=url.pathname.startsWith(SCOPE)?url.pathname.slice(SCOPE.length):null;
 if(relative===null)return;
 const appEntry=req.mode==='navigate'&&(relative===''||relative==='index.html');
 // Only cache public static resources and the app shell, never arbitrary same-origin endpoints.
 const staticAsset=/\.(?:js|css|png|jpe?g|webp|svg|ico|woff2?|webmanifest)$/i.test(relative);
 if(!appEntry&&!staticAsset)return;
 ev.respondWith(fetch(req,appEntry?{cache:'reload'}:undefined).then(res=>{
  if(res&&res.ok&&res.status===200&&res.type==='basic'&&!/\b(?:no-store|private)\b/i.test(res.headers.get('Cache-Control')||'')){const copy=res.clone();ev.waitUntil(caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{}))}
  return res;
 }).catch(()=>caches.open(CACHE).then(async c=>(await c.match(req))||(appEntry?await c.match(new URL('index.html',self.registration.scope).href):null)||Response.error())));
});
