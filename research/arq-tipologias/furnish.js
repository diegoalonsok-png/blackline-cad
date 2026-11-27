/* Equipamiento de locales por búsqueda con restricciones: ningún mueble sobre el barrido de puertas,
 * los pasos, ni otro mueble; con espacios de uso libres frente a camas, sanitarios y mesadas. */
'use strict';
const { place } = require('./composer.js');
const { item } = require('./blocks.js');
const ov = (a, b, m = 0) => a[0] < b[2] - m && b[0] < a[2] - m && a[1] < b[3] - m && b[1] < a[3] - m;
const inside = (f, r, tol = 1e-6) => f[0] >= r.cx0 - tol && f[1] >= r.cy0 - tol && f[2] <= r.cx1 + tol && f[3] <= r.cy1 + tol;
const clip = (f, r) => [Math.max(f[0], r.cx0), Math.max(f[1], r.cy0), Math.min(f[2], r.cx1), Math.min(f[3], r.cy1)];

// Zonas prohibidas de un local: barrido de puertas (ambos lados) y pasos.
function zonesFor(room, house) {
  const z = [];
  for (const d of house.doors) {
    const along = [d.a - 0.05, d.b + 0.05], into = d.into === room.id, depth = into ? d.width + 0.05 : 0.6;
    if (d.h) { if (d.c < room.y0 - 1e-6 || d.c > room.y1 + 1e-6 || d.b < room.x0 || d.a > room.x1) continue; const up = room.y0 >= d.c - 1e-6; z.push(up ? [along[0], d.c, along[1], d.c + depth + d.t / 2] : [along[0], d.c - depth - d.t / 2, along[1], d.c]); }
    else { if (d.c < room.x0 - 1e-6 || d.c > room.x1 + 1e-6 || d.b < room.y0 || d.a > room.y1) continue; const rt = room.x0 >= d.c - 1e-6; z.push(rt ? [d.c, along[0], d.c + depth + d.t / 2, along[1]] : [d.c - depth - d.t / 2, along[0], d.c, along[1]]); }
  }
  for (const g of house.gaps) {
    if (g.h) { if (g.c < room.y0 - 1e-6 || g.c > room.y1 + 1e-6 || g.b < room.x0 || g.a > room.x1) continue; z.push([g.a, g.c - 0.9, g.b, g.c + 0.9]); }
    else { if (g.c < room.x0 - 1e-6 || g.c > room.x1 + 1e-6 || g.b < room.y0 || g.a > room.y1) continue; z.push([g.c - 0.9, g.a, g.c + 0.9, g.b]); }
  }
  return z;
}
const SIDES = ['S', 'N', 'W', 'E'];
// Huella de un bloque contra un lado en la posición t (desde el comienzo del lado).
function fpAgainst(room, side, w, d, t) {
  if (side === 'S') return [room.cx0 + t, room.cy0, room.cx0 + t + w, room.cy0 + d];
  if (side === 'N') return [room.cx0 + t, room.cy1 - d, room.cx0 + t + w, room.cy1];
  if (side === 'W') return [room.cx0, room.cy0 + t, room.cx0 + d, room.cy0 + t + w];
  return [room.cx1 - d, room.cy0 + t, room.cx1, room.cy0 + t + w];
}
const sideLen = (room, side) => (side === 'S' || side === 'N' ? room.cx1 - room.cx0 : room.cy1 - room.cy0);
// Zona de uso delante del bloque (hacia el interior del local).
function front(fp, side, depth, extraSides = 0) {
  const [x0, y0, x1, y1] = fp, e = extraSides;
  if (side === 'S') return [x0 - e, y1, x1 + e, y1 + depth];
  if (side === 'N') return [x0 - e, y0 - depth, x1 + e, y0];
  if (side === 'W') return [x1, y0 - e, x1 + depth, y1 + e];
  return [x0 - depth, y0 - e, x0, y1 + e];
}
class Fitter {
  constructor(room, house) { this.room = room; this.zones = zonesFor(room, house); this.solid = []; this.clear = []; this.blocks = []; this.windows = house.windows.filter((w) => w.room === room.id); }
  free(fp, use) {
    if (!inside(fp, this.room)) return false;
    if (this.zones.some((z) => ov(fp, z)) || this.solid.some((s) => ov(fp, s)) || this.clear.some((s) => ov(fp, s))) return false;
    if (use) { const u = clip(use, this.room); if ((u[2] - u[0]) * (u[3] - u[1]) < (use[2] - use[0]) * (use[3] - use[1]) * 0.8) return false; if (this.solid.some((s) => ov(u, s, 0.02)) || this.zones.some((z) => ov(u, z, 0.3))) return false; }
    return true;
  }
  underWindow(fp, side) {
    const r = this.room, c = { S: r.y0, N: r.y1, W: r.x0, E: r.x1 }[side];
    return this.windows.some((w) => Math.abs(w.c - c) < 1e-6 && (w.h ? (side === 'S' || side === 'N') && w.a < fp[2] + 0.1 && w.b > fp[0] - 0.1 : (side === 'W' || side === 'E') && w.a < fp[3] + 0.1 && w.b > fp[1] - 0.1));
  }
  // Busca la mejor ubicación contra un lado; score(fp, side, t) más alto = mejor.
  wall(id, opts = {}) {
    const it = item(id), w = opts.w ?? it.w, d = opts.d ?? it.d, sides = opts.sides || SIDES;
    if (opts.region) { const R = opts.region; opts = { ...opts, score: ((sc) => (fp, s2, t, span) => (fp[0] >= R[0] - 1e-6 && fp[2] <= R[2] + 1e-6 && fp[1] >= R[1] - 1e-6 && fp[3] <= R[3] + 1e-6 ? 0 : -100) + (sc ? sc(fp, s2, t, span) : 0))(opts.score) }; }
    let best = null;
    for (const side of sides) {
      const L = sideLen(this.room, side); if (L < w - 1e-6) continue;
      const steps = Math.max(1, Math.round((L - w) / 0.05));
      for (let i = 0; i <= steps; i++) {
        const t = (L - w) * (steps ? i / steps : 0.5), fp = fpAgainst(this.room, side, w, d, t);
        const use = opts.use ? front(fp, side, opts.use, opts.useSides || 0) : null;
        if (!this.free(fp, use)) continue;
        if (opts.noWindow && this.underWindow(fp, side)) continue;
        const s = (opts.score ? opts.score(fp, side, t, L - w) : 0) - (opts.center ? Math.abs(t - (L - w) / 2) * 0.3 : 0);
        if (!best || s > best.s + 1e-9) best = { s, fp, side, use, w, d };
      }
    }
    if (!best) return null;
    return this.commit(id, best.w, best.d, best.fp, best.side, best.use, opts);
  }
  snap() { return [this.solid.length, this.clear.length, this.blocks.length]; }
  undo(k) { this.solid.length = k[0]; this.clear.length = k[1]; this.blocks.length = k[2]; }
  commit(id, w, d, fp, side, use, opts = {}) {
    const blk = place(id, w, d, [fp[0], fp[1]], side, opts.layer, opts.role);
    this.blocks.push(blk); this.solid.push(blk.box); if (use) this.clear.push(clip(use, this.room));
    return { blk, fp, side };
  }
  // Pieza exenta (mesa, sofá suelto) con respaldo hacia "side"; prueba una grilla.
  floating(id, opts = {}) {
    const it = item(id), w = opts.w ?? it.w, d = opts.d ?? it.d, side = opts.side || 'S';
    const fw = side === 'S' || side === 'N' ? w : d, fd = side === 'S' || side === 'N' ? d : w, R = opts.region || [this.room.cx0, this.room.cy0, this.room.cx1, this.room.cy1];
    let best = null; const tx = opts.target || [(R[0] + R[2]) / 2, (R[1] + R[3]) / 2], m = opts.margin ?? 0.6;
    for (let x = R[0] + m; x + fw <= R[2] - m + 1e-6; x += 0.05) for (let y = R[1] + m; y + fd <= R[3] - m + 1e-6; y += 0.05) {
      const fp = [x, y, x + fw, y + fd]; const bx = place(id, w, d, [x, y], side).box; if (!this.free(fp) || !this.free(bx) || this.solid.some((s) => ov([fp[0] - m * .8, fp[1] - m * .8, fp[2] + m * .8, fp[3] + m * .8], s))) continue;
      const dd = Math.hypot((x + fw / 2) - tx[0], (y + fd / 2) - tx[1]); if (!best || dd < best.dd) best = { dd, fp };
    }
    if (!best) return null; return this.commit(id, w, d, best.fp, side, null, opts);
  }
}
module.exports = { Fitter, zonesFor, ov, fpAgainst, front };
