/* Blackline CAD · service worker: permite instalar la app y abrirla sin conexión.
 * Estrategia «red primero»: siempre se usa la versión publicada más nueva; la copia guardada
 * solo se usa si no hay conexión. Nunca guarda llamadas a la API, pagos ni analítica. */
const CACHE='blackline-cad-v1';
const CORE=['./','./index.html','./manifest.webmanifest','./assets/icons/icon-192.png','./assets/icons/icon-512.png'];
self.addEventListener('install',ev=>{ev.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).catch(()=>{}));self.skipWaiting()});
self.addEventListener('activate',ev=>{ev.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('blackline-cad-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',ev=>{
 const req=ev.request,url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==self.location.origin)return;   // API, Stripe, Google: siempre por red
 if(/\.(dxf|dwg)$/i.test(url.pathname)&&url.pathname.includes('/examples/'))return;
 ev.respondWith(fetch(req).then(res=>{
  if(res&&res.ok&&res.type==='basic'){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{})}
  return res;
 }).catch(()=>caches.match(req,{ignoreSearch:req.mode==='navigate'}).then(hit=>hit||(req.mode==='navigate'?caches.match('./index.html'):Response.error()))));
});
