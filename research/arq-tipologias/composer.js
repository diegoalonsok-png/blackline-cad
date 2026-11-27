/* CAD2D3D · Compositor de tipologías de vivienda (dibujo propio, sin datos de terceros).
 * Entrada: locales rectangulares (ejes de muro) + puertas + ventanas.
 * Salida: plano blackline.architecture.v1 (muros, aberturas, bloques, rótulos) listo para insertar en CAD2D3D,
 * y la geometría de locales que usan el renderizador de láminas y el exportador DXF. */
'use strict';
const { item } = require('./blocks.js');
const EXT = 0.30, INT = 0.15, EPS = 1e-6, BOXC = new Map();
const r3 = (n) => Math.round(n * 1000) / 1000;

// ---------- Muros a partir de locales ----------
function roomAt(rooms, x, y) { return rooms.find((r) => x > r.x0 + EPS && x < r.x1 - EPS && y > r.y0 + EPS && y < r.y1 - EPS) || null; }
function buildSegments(rooms) {
  const xs = [...new Set(rooms.flatMap((r) => [r.x0, r.x1]).map(r3))].sort((a, b) => a - b);
  const ys = [...new Set(rooms.flatMap((r) => [r.y0, r.y1]).map(r3))].sort((a, b) => a - b);
  const segs = [], d = 0.02;
  for (const y of ys) for (let i = 0; i < xs.length - 1; i++) {
    const mx = (xs[i] + xs[i + 1]) / 2, lo = roomAt(rooms, mx, y - d), hi = roomAt(rooms, mx, y + d);
    if (!lo && !hi) continue; if (lo && hi && (lo === hi || (lo.group && lo.group === hi.group))) continue;
    segs.push({ h: true, c: y, a: xs[i], b: xs[i + 1], lo, hi, t: lo && hi ? INT : EXT });
  }
  for (const x of xs) for (let i = 0; i < ys.length - 1; i++) {
    const my = (ys[i] + ys[i + 1]) / 2, lo = roomAt(rooms, x - d, my), hi = roomAt(rooms, x + d, my);
    if (!lo && !hi) continue; if (lo && hi && (lo === hi || (lo.group && lo.group === hi.group))) continue;
    segs.push({ h: false, c: x, a: ys[i], b: ys[i + 1], lo, hi, t: lo && hi ? INT : EXT });
  }
  return segs;
}
// Segmentos compartidos entre dos locales (o local y exterior), ordenados.
function shared(segs, A, B) {
  return segs.filter((s) => (s.lo === A && s.hi === B) || (s.lo === B && s.hi === A));
}
function edgeOf(segs, room, side) {
  // side: S/N/W/E del local → segmentos sobre ese borde
  return segs.filter((s) => (side === 'S' && s.h && s.hi === room && Math.abs(s.c - room.y0) < EPS) || (side === 'N' && s.h && s.lo === room && Math.abs(s.c - room.y1) < EPS) ||
    (side === 'W' && !s.h && s.hi === room && Math.abs(s.c - room.x0) < EPS) || (side === 'E' && !s.h && s.lo === room && Math.abs(s.c - room.x1) < EPS));
}
// Une segmentos contiguos en tramos continuos [a,b] (misma recta, mismo espesor).
function runs(list) {
  const s = list.slice().sort((p, q) => p.a - q.a), out = [];
  for (const g of s) { const last = out[out.length - 1]; if (last && Math.abs(last.b - g.a) < EPS && last.t === g.t) { last.b = g.b; last.segs.push(g); } else out.push({ h: g.h, c: g.c, a: g.a, b: g.b, t: g.t, segs: [g] }); }
  return out;
}

function compose(spec) {
  const rooms = spec.rooms.map((r) => ({ ...r }));
  const byId = Object.fromEntries(rooms.map((r) => [r.id, r]));
  const segs = buildSegments(rooms);
  const errors = [];
  // ---- Aberturas: cada una se ubica sobre un tramo compartido ----
  const ops = []; // {seg-run, pos (centro sobre el eje), width, kind, into(room)|null, hingeLow(bool)}
  for (const d of spec.doors) {
    const A = byId[d.a], B = d.b === 'EXT' ? null : byId[d.b];
    let cand = B ? shared(segs, A, B) : edgeOf(segs, A, d.side).filter((s) => !s.lo || !s.hi);
    if (d.side && B) cand = cand.filter((s) => edgeOf(segs, A, d.side).includes(s));
    const rr = runs(cand); if (!rr.length) { errors.push('sin borde para puerta ' + d.a + '-' + d.b); continue; }
    const run = rr.sort((p, q) => (q.b - q.a) - (p.b - p.a))[0];
    const margin = (d.margin ?? 0.12) + run.t / 2 + 0.02, w = d.width;
    // Límite real del tramo: descontar media pared de los muros perpendiculares en los extremos.
    let lo = run.a + margin + w / 2, hi = run.b - margin - w / 2;
    if (hi < lo - EPS) { errors.push('tramo corto para puerta ' + d.a + '-' + (d.b) + ' ' + (run.b - run.a).toFixed(2)); continue; }
    let pos = d.at === 'start' ? lo : d.at === 'end' ? hi : typeof d.at === 'number' ? Math.min(hi, Math.max(lo, d.at)) : (lo + hi) / 2;
    ops.push({ run, pos, width: w, kind: d.kind || 'swing-door', into: d.into ? byId[d.into] : (d.b === 'EXT' ? A : (d.into === null ? null : B || A)), hinge: d.hinge, door: true });
  }
  for (const v of spec.windows) {
    const A = byId[v.room]; const rr = runs(edgeOf(segs, A, v.side).filter((s) => !s.lo || !s.hi));
    if (!rr.length) { errors.push('sin muro exterior para ventana ' + v.room + ' ' + v.side); continue; }
    const run = rr.sort((p, q) => (q.b - q.a) - (p.b - p.a))[0];
    const room0 = v.side === 'S' || v.side === 'N' ? A.x0 : A.y0, room1 = v.side === 'S' || v.side === 'N' ? A.x1 : A.y1;
    const mg = room1 - room0 < 1.6 ? run.t / 2 + 0.1 : 0.35, a = Math.max(run.a, room0) + mg, b = Math.min(run.b, room1) - mg;
    const w = Math.min(v.width, b - a); if (w < 0.5) { errors.push('ventana sin lugar ' + v.room); continue; }
    let pos = v.at === 'start' ? a + w / 2 : v.at === 'end' ? b - w / 2 : typeof v.at === 'number' ? Math.min(b - w / 2, Math.max(a + w / 2, v.at)) : (a + b) / 2;
    ops.push({ run, pos, width: w, kind: 'framed-window', room: A });
  }
  // Huecos sin hoja (pasos abiertos): se quitan del muro.
  const gaps = (spec.passages || []).map((p) => {
    const A = byId[p.a], B = byId[p.b]; const rr = runs(shared(segs, A, B)); if (!rr.length) { errors.push('sin borde para paso'); return null; }
    const run = rr.sort((p2, q) => (q.b - q.a) - (p2.b - p2.a))[0]; const m = run.t / 2 + 0.075 + (p.margin ?? 0.05);
    let a = run.a + m, b = run.b - m; const w = Math.min(p.width ?? (b - a), b - a);
    const at = p.at === 'start' ? a : p.at === 'end' ? b - w : typeof p.at === 'number' ? Math.min(b - w, Math.max(a, p.at - w / 2)) : (a + b - w) / 2;
    return { h: run.h, c: run.c, a: at, b: at + w };
  }).filter(Boolean);

  // ---- Muros: tramos continuos partidos por huecos y por conflictos de sentido de giro ----
  // Puerta gira hacia la izquierda del sentido A→B del muro (convención del bloque paramétrico).
  const lines = new Map();
  for (const s of segs) { const key = (s.h ? 'h' : 'v') + s.c.toFixed(3) + ':' + s.t; if (!lines.has(key)) lines.set(key, []); lines.get(key).push(s); }
  const walls = [], openings = [];
  let wid = 0;
  for (const list of lines.values()) for (const run of runs(list)) {
    // cortar por huecos
    let pieces = [[run.a, run.b]];
    for (const g of gaps) if (g.h === run.h && Math.abs(g.c - run.c) < EPS) pieces = pieces.flatMap(([a, b]) => (g.b <= a || g.a >= b) ? [[a, b]] : [[a, g.a], [g.b, b]].filter(([p, q]) => q - p > 0.12));
    for (const [a, b] of pieces) {
      const mine = ops.filter((o) => o.run.h === run.h && Math.abs(o.run.c - run.c) < EPS && o.pos > a && o.pos < b).sort((p, q) => p.pos - q.pos);
      // sentido requerido por cada puerta: +1 (creciente) o -1
      const need = (o) => { if (!o.door || !o.into) return 0; const r = o.into, mid = run.h ? (r.y0 + r.y1) / 2 : (r.x0 + r.x1) / 2, above = mid > run.c; return run.h ? (above ? 1 : -1) : (above ? -1 : 1); };
      // partir en grupos de sentido compatible, cortando en una junta intermedia
      const joints = [...new Set(list.flatMap((s) => [s.a, s.b]))].filter((j) => j > a + EPS && j < b - EPS).sort((p, q) => p - q);
      const groups = []; let cur = { a, ops: [], dir: 0 };
      for (const o of mine) { const n = need(o); if (n && cur.dir && n !== cur.dir) { const cut = joints.find((j) => j > cur.ops[cur.ops.length - 1].pos + cur.ops[cur.ops.length - 1].width / 2 + 0.2 && j < o.pos - o.width / 2 - 0.2); if (cut === undefined) { errors.push('sentidos de puerta incompatibles en un muro'); } else { cur.b = cut; groups.push(cur); cur = { a: cut, ops: [], dir: 0 }; } } cur.ops.push(o); if (n) cur.dir = n; }
      cur.b = b; groups.push(cur);
      for (const g of groups) {
        const dir = g.dir || 1, id = 'm' + (++wid);
        const A = run.h ? [g.a, run.c] : [run.c, g.a], B = run.h ? [g.b, run.c] : [run.c, g.b];
        const [pa, pb] = dir > 0 ? [A, B] : [B, A], L = g.b - g.a;
        walls.push({ id, a: pa.map(r3), b: pb.map(r3), thickness: run.t });
        for (const o of g.ops) {
          const offset = dir > 0 ? o.pos - g.a : g.b - o.pos;
          if (offset - o.width / 2 <= run.t / 2 + 1e-3 || offset + o.width / 2 >= L - run.t / 2 - 1e-3) { errors.push('abertura fuera de muro ' + id); continue; }
          const op = { host: id, kind: o.kind, offset: r3(offset), width: r3(o.width) };
          if (o.kind === 'swing-door') {
            // bisagra hacia la esquina más cercana (o la pedida)
            const lowSide = (o.pos - g.a) < (g.b - o.pos); let hingeAtStart = dir > 0 ? lowSide : !lowSide; if (o.hinge === 'far') hingeAtStart = !hingeAtStart;
            if (!hingeAtStart) op.orientation = { reverseHostDirection: false, mirror: true };
          }
          openings.push(op); o.wall = id; o.dir = dir; o.hingeAtStart = !op.orientation;
        }
      }
    }
  }
  // ---- Locales: área libre interior (descontando medio muro de cada borde) ----
  for (const r of rooms) {
    const half = (side) => { const e = edgeOf(segs, r, side); return e.length ? Math.max(...e.map((s) => s.t)) / 2 : 0; };
    r.cx0 = r.x0 + half('W'); r.cx1 = r.x1 - half('E'); r.cy0 = r.y0 + half('S'); r.cy1 = r.y1 - half('N');
    r.area = (r.cx1 - r.cx0) * (r.cy1 - r.cy0);
  }
  // área libre de locales unidos (mismo grupo) se suma
  const doorsInfo = ops.filter((o) => o.door).map((o) => {
    const run = o.run, a = o.pos - o.width / 2, b = o.pos + o.width / 2;
    return { h: run.h, c: run.c, t: run.t, a, b, pos: o.pos, width: o.width, kind: o.kind, into: o.into?.id, dir: o.dir, hingeAtStart: o.hingeAtStart };
  });
  const winInfo = ops.filter((o) => !o.door).map((o) => ({ h: o.run.h, c: o.run.c, t: o.run.t, a: o.pos - o.width / 2, b: o.pos + o.width / 2, room: o.room.id }));
  return { walls, openings, rooms, segs, gaps, doors: doorsInfo, windows: winInfo, errors };
}

// ---------- Equipamiento ----------
// Convención de los bloques: sanitarios y cocina con el respaldo en y=0 local; camas y muebles con el respaldo en y=D.
const BACK0 = (id) => /^(san-|kq-)/.test(id);
function rotFor(id, back) { const base = { S: 0, E: 90, N: 180, W: 270 }[back]; return (base + (BACK0(id) ? 0 : 180)) % 360; }
// Ubica un bloque dentro del rectángulo [x0,y0,x1,y1] (huella) con el respaldo contra el lado indicado.
function place(id, w, d, fp, back, layer, role) {
  const it = item(id); w = w ?? it.w; d = d ?? it.d;
  const rot = rotFor(id, back), c = Math.round(Math.cos(rot * Math.PI / 180)), s = Math.round(Math.sin(rot * Math.PI / 180));
  const corners = [[0, 0], [w, 0], [w, d], [0, d]].map(([x, y]) => [x * c - y * s, x * s + y * c]);
  const mx = Math.min(...corners.map((p) => p[0])), my = Math.min(...corners.map((p) => p[1]));
  const blk = { catalogId: id, point: [r3(fp[0] - mx), r3(fp[1] - my)], rotation: rot, scale: 1, layer: layer || (/^san-/.test(id) ? 'FIXTURES' : /^kq-/.test(id) ? 'KITCHEN' : 'FURNITURE'), role: role || id };
  if (Math.abs(w - it.w) > 1e-6 || Math.abs(d - it.d) > 1e-6) blk.nominalSize = [r3(w), r3(d)];
  const fw = rot % 180 === 0 ? w : d, fd = rot % 180 === 0 ? d : w;
  blk.footprint = [r3(fp[0]), r3(fp[1]), r3(fp[0] + fw), r3(fp[1] + fd)];
  // huella real (sillas y mesas de luz pueden exceder la medida nominal)
  const key = id + '|' + r3(w) + '|' + r3(d) + '|' + rot;
  let dl = BOXC.get(key);
  if (!dl) {
    const { prims } = require('./blocks.js').blockPrims(id, w, d, [0, 0], rot);
    const xs = [0 + mx * 0], ys = []; xs.length = 0;
    for (const p of prims) { if (p.pts) for (const q of p.pts) { xs.push(q.x); ys.push(q.y); } else { xs.push(p.c.x - p.r, p.c.x + p.r); ys.push(p.c.y - p.r, p.c.y + p.r); } }
    // relativo a la esquina mínima de la huella nominal (que en coordenadas locales rotadas es (mx,my))
    dl = xs.length ? [Math.min(...xs) - mx, Math.min(...ys) - my, Math.max(...xs) - mx, Math.max(...ys) - my] : [0, 0, fw, fd];
    dl = [Math.min(dl[0], 0), Math.min(dl[1], 0), Math.max(dl[2], fw), Math.max(dl[3], fd)]; BOXC.set(key, dl);
  }
  blk.box = [r3(fp[0] + dl[0]), r3(fp[1] + dl[1]), r3(fp[0] + dl[2]), r3(fp[1] + dl[3])];
  return blk;
}
// Huella contra un lado del local, a una distancia "at" desde el comienzo del lado (S/N: desde x0; W/E: desde y0).
function against(room, side, along, depth, at) {
  const { cx0, cx1, cy0, cy1 } = room;
  if (side === 'S') return [cx0 + at, cy0];
  if (side === 'N') return [cx0 + at, cy1 - depth];
  if (side === 'W') return [cx0, cy0 + at];
  return [cx1 - depth, cy0 + at];
}
function put(list, room, id, side, at, w, d, extra) {
  const it = item(id); w = w ?? it.w; d = d ?? it.d;
  const fp = against(room, side, w, d, at); list.push(place(id, w, d, fp, side, extra?.layer, extra?.role)); return list[list.length - 1];
}

module.exports = { compose, place, put, against, EXT, INT, r3 };
