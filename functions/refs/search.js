/* GET /refs/search?q=villa rotonda planta
   Open architectural references for ARQASSIST (Pinterest-style grid): Openverse images
   (Flickr, museums, Wikimedia…) under licences that allow commercial reuse: CC BY, CC BY-SA,
   CC0 and public domain mark. Credit and source travel with every item. Cached for a day. */
const UA = 'BlacklineCAD/1.0 (https://blackline-cad.org; architectural references)';
// Modern masters: their drawings are still protected; plans/sections of their works are not shown.
const MODERN = /\b(?:le ?corbusier|corbu|mies|frank lloyd wright|gropius|aalto|louis kahn|niemeyer|tadao ando|zaha|gehry|koolhaas|siza|foster|piano|barragan|utzon|scarpa|botta|herzog|meier|eisenman|venturi|rossi)\b/;
const DRAWING = /\b(?:plan|plans|planta|plantas|plano|planos|section|sections|corte|cortes|seccion|elevation|alzado|fachada|drawing|dibujo|sketch|croquis|grundriss|pianta)\b/i;
const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': status === 200 ? 'public, max-age=86400' : 'no-store', 'X-Content-Type-Options': 'nosniff' },
});

export async function onRequestGet({ request, waitUntil }) {
  const url = new URL(request.url);
  const q = String(url.searchParams.get('q') || '').replace(/\s+/g, ' ').trim().slice(0, 120);
  if (q.length < 2) return json({ items: [] });
  const norm = q.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const cache = caches.default, key = new Request('https://cache.blackline-cad.org/refs/v1?q=' + encodeURIComponent(norm));
  const hit = await cache.match(key);
  if (hit) return hit;
  const api = new URL('https://api.openverse.org/v1/images/');
  api.searchParams.set('q', q);
  api.searchParams.set('license', 'by,by-sa,cc0,pdm');
  api.searchParams.set('page_size', '20');
  api.searchParams.set('mature', 'false');
  try {
    const res = await fetch(api, { headers: { 'User-Agent': UA, Accept: 'application/json' }, cf: { cacheTtl: 86400, cacheEverything: true } });
    if (!res.ok) throw Error('Openverse HTTP ' + res.status + ' ' + (await res.text()).slice(0, 120));
    const data = await res.json();
    const modern = MODERN.test(norm);
    const items = (data.results || []).flatMap((r) => {
      const lic = String(r.license || '').toLowerCase();
      if (!['by', 'by-sa', 'cc0', 'pdm'].includes(lic) || !r.id || !r.foreign_landing_url) return [];
      const title = String(r.title || '').replace(/\s+/g, ' ').trim().slice(0, 140) || 'Referencia';
      const tags = (r.tags || []).map((t) => t.name).join(' ');
      if (modern && DRAWING.test(title + ' ' + tags)) return [];
      const big = /^https:\/\/(?:live|farm\d+)\.staticflickr\.com\//.test(r.url || '') ? r.url : null;
      return [{
        title,
        credit: String(r.creator || '').slice(0, 80),
        license: (lic === 'pdm' ? 'Public domain' : lic === 'cc0' ? 'CC0' : 'CC ' + lic.toUpperCase() + (r.license_version ? ' ' + r.license_version : '')),
        provider: String(r.source || r.provider || 'Openverse'),
        thumb: 'https://api.openverse.org/v1/images/' + r.id + '/thumb/',
        image: big || 'https://api.openverse.org/v1/images/' + r.id + '/thumb/',
        page: r.foreign_landing_url,
      }];
    });
    const out = json({ query: q, modern, items });
    waitUntil(cache.put(key, out.clone()));
    return out;
  } catch (e) {
    return new Response(JSON.stringify({ items: [], error: 'Openverse no disponible: ' + String(e && e.message || e).slice(0, 160) }), { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
  }
}
