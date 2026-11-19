/* CAD2D · Worker de entrada al conversor DWG (Cloudflare Containers).
 * POST https://api.<dominio>/api/convert/dwg  (multipart con campo "file")  →  DXF ASCII
 * - Solo acepta pedidos desde APP_ORIGIN (CORS) y archivos .dwg de hasta 25 MB.
 * - Límite simple por IP para evitar abusos.
 * - El contenedor convierte y borra el archivo; nada se guarda.
 */
import { DurableObject } from 'cloudflare:workers';

// Cada instancia del contenedor vive detrás de un Durable Object (API documentada de Cloudflare Containers).
export class DwgConverter extends DurableObject {
  async fetch(request) {
    const container = this.ctx.container;
    if (!container.running) container.start();
    const port = container.getTcpPort(8080);
    for (let i = 0; i < 40; i++) {            // espera a que el servicio responda (arranque en frío)
      try { const r = await port.fetch('http://container/health'); if (r.ok) break; } catch (e) {}
      await new Promise(r => setTimeout(r, 500));
    }
    return port.fetch(new Request('http://container/convert', {
      method: 'POST', body: await request.arrayBuffer(), headers: { 'content-type': 'application/octet-stream' }
    }));
  }
}

const MAX = 25 * 1024 * 1024;
const hits = new Map(); // límite por instancia del Worker; suficiente como freno básico

function cors(env, req, res) {
  const origin = req.headers.get('origin');
  const allowed = String(env.APP_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
  if (origin && allowed.includes(origin)) {
    res.headers.set('access-control-allow-origin', origin);
    res.headers.set('access-control-allow-methods', 'POST,OPTIONS');
    res.headers.set('access-control-allow-headers', 'content-type');
    res.headers.set('access-control-expose-headers', 'x-cad2d-warnings');
    res.headers.set('vary', 'origin');
  }
  return res;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return cors(env, req, new Response(null, { status: 204 }));
    if (url.pathname !== '/api/convert/dwg' || req.method !== 'POST')
      return cors(env, req, new Response('no encontrado', { status: 404 }));
    const allowed = String(env.APP_ORIGIN || '').split(',').map(s => s.trim());
    if (!allowed.includes(req.headers.get('origin') || ''))
      return new Response('origen no permitido', { status: 403 });
    const ip = req.headers.get('cf-connecting-ip') || 'x', now = Date.now();
    const recent = (hits.get(ip) || []).filter(t => now - t < 60_000);
    if (recent.length >= Number(env.MAX_PER_MINUTE || 6))
      return cors(env, req, new Response('demasiadas conversiones, probá en un minuto', { status: 429 }));
    recent.push(now); hits.set(ip, recent);
    const form = await req.formData().catch(() => null);
    const file = form?.get('file');
    if (!file || typeof file === 'string' || !/\.dwg$/i.test(file.name || ''))
      return cors(env, req, new Response('se esperaba un archivo .dwg', { status: 415 }));
    if (file.size > MAX) return cors(env, req, new Response('el archivo supera 25 MB', { status: 413 }));
    const body = await file.arrayBuffer();
    const slot = 'conversor-' + Math.floor(Math.random() * Number(env.CONTAINER_INSTANCES || 2));
    const res = await env.DWG_CONVERTER.getByName(slot).fetch(new Request('http://do/convert', { method: 'POST', body }));
    const out = new Response(res.body, res);
    out.headers.set('cache-control', 'no-store');
    return cors(env, req, out);
  }
};
