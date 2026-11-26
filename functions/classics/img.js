/* GET /classics/img?u=https://upload.wikimedia.org/...
   Same-origin image proxy for the ARQASSIST galleries: Wikimedia Commons, Openverse thumbnails and Flickr originals,
   only images, cached at the edge for 30 days. Keeps the app's CSP at img-src 'self'. */
const UA = 'BlacklineCAD/1.0 (https://blackline-cad.org; classic plans gallery)';
const MAX = 25 * 1024 * 1024;

export async function onRequestGet({ request, waitUntil }) {
  const raw = new URL(request.url).searchParams.get('u') || '';
  let target;
  try { target = new URL(raw); } catch (e) { return new Response('Bad URL', { status: 400 }); }
  const h = target.hostname, path = target.pathname;
  const ok = (['upload.wikimedia.org', 'thumb.wikimedia.org'].includes(h) && /\/wikipedia\/commons\//.test(path))
    || (h === 'api.openverse.org' && /^\/v1\/images\/[0-9a-f-]{36}\/thumb\/$/.test(path))
    || (/^(?:live|farm\d+)\.staticflickr\.com$/.test(h) && /^\/[\w/.-]+\.(?:jpe?g|png)$/i.test(path));
  if (target.protocol !== 'https:' || !ok) {
    return new Response('Forbidden', { status: 403 });
  }
  const cache = caches.default, key = new Request(target.toString(), { method: 'GET' });
  const hit = await cache.match(key);
  if (hit) return hit;
  const res = await fetch(target, { headers: { 'User-Agent': UA }, cf: { cacheTtl: 2592000, cacheEverything: true } });
  const type = res.headers.get('content-type') || '';
  if (!res.ok || !/^image\/(?:jpeg|png|webp|gif|tiff)/i.test(type)) return new Response('Not an image', { status: 502 });
  if (Number(res.headers.get('content-length')) > MAX) return new Response('Too large', { status: 413 });
  const out = new Response(res.body, {
    status: 200,
    headers: {
      'Content-Type': type,
      'Cache-Control': 'public, max-age=2592000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Cross-Origin-Resource-Policy': 'same-origin',
    },
  });
  waitUntil(cache.put(key, out.clone()));
  return out;
}
