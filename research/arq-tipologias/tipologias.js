/* CAD2D3D · Tipologías de vivienda en planta baja (frente al sur del dibujo: y = 0).
 * Esquemas:
 *  A · Franjas: estar-comedor y cocina al frente; dormitorios y baños al fondo con un hall corto.
 *  B · Pasillo central (lote angosto): estar y cocina al frente; locales a ambos lados de un pasillo hacia el fondo.
 *  M · Monoambiente: estar-dormitorio con kitchenette y baño.
 * Todo dibujo es propio y se genera con los bloques del catálogo CAD2D3D. */
'use strict';
const { compose, EXT, INT, r3 } = require('./composer.js');
const { Fitter, ov } = require('./furnish.js');

const NAMES = { living: 'ESTAR · COMEDOR', kitchen: 'COCINA', dorm: 'DORMITORIO', main: 'DORMITORIO PPAL.', bath: 'BAÑO', suite: 'BAÑO EN SUITE', toil: 'TOILETTE', lav: 'LAVADERO', hall: 'HALL', estudio: 'ESTUDIO', mono: 'ESTAR · DORMITORIO' };

// ---------- Esquema A ----------
function schemeA(p) {
  const cells = p.cells, W = r3(cells.reduce((s, c) => s + c.w, 0)), Ds = p.Ds, c = p.corr, Dp = p.Dp, D = r3(Ds + c + Dp);
  const kL = p.kitchenSide === 'L', kw = p.kw;
  const rooms = [], doors = [], windows = [], passages = [];
  const living = { id: 'living', type: 'living', x0: kL ? kw : 0, y0: 0, x1: kL ? W : W - kw, y1: Ds };
  const kitchen = { id: 'kitchen', type: 'kitchen', x0: kL ? 0 : W - kw, y0: 0, x1: kL ? kw : W, y1: Ds };
  if (p.kitchenOpen) { living.group = 'social'; kitchen.group = 'social'; }
  rooms.push(living, kitchen);
  let x = 0; const n = cells.length;
  cells.forEach((cl, i) => {
    const end = c > 0 && (i === 0 || i === n - 1);
    rooms.push({ id: cl.id, type: cl.type, x0: r3(x), y0: end || c === 0 ? Ds : r3(Ds + c), x1: r3(x + cl.w), y1: D, main: cl.main });
    x += cl.w;
  });
  if (c > 0) rooms.push({ id: 'hall', type: 'hall', x0: cells[0].w, y0: Ds, x1: r3(W - cells[n - 1].w), y1: r3(Ds + c) });
  // Puertas
  doors.push({ a: 'living', b: 'EXT', side: 'S', width: 0.9, at: kL ? 'start' : 'end', margin: 0.25 });
  if (!p.kitchenOpen) { if (p.kitchenDoor) doors.push({ a: 'kitchen', b: 'living', width: 0.8, at: 'start', into: 'kitchen' }); else passages.push({ a: 'kitchen', b: 'living', width: Math.min(1.2, Ds - 1.2), at: 'end' }); }
  if (c > 0) passages.push({ a: 'hall', b: 'living', width: 1.0, at: kL ? 'start' : 'end' });
  cells.forEach((cl, i) => {
    if (cl.type === 'suite') { doors.push({ a: cl.id, b: cl.suiteOf, width: 0.7, at: 'end', into: cl.id }); return; }
    const w = cl.type === 'bath' || cl.type === 'toil' || cl.type === 'lav' ? 0.7 : 0.8;
    if (c === 0) {
      const ov = (q) => Math.min(cl.x1 ?? 0, q.x1) - Math.max(cl.x0 ?? 0, q.x0);
      const me = rooms.find((q) => q.id === cl.id), olL = Math.min(me.x1, living.x1) - Math.max(me.x0, living.x0);
      const target = cl.type === 'lav' ? 'kitchen' : olL >= w + 0.35 ? 'living' : (p.kitchenOpen ? 'kitchen' : 'living');
      const tgt = target === 'living' ? living : kitchen, lo = Math.max(me.x0, tgt.x0), hi = Math.min(me.x1, tgt.x1);
      doors.push({ a: cl.id, b: target, width: w, at: (lo + hi) / 2 < (me.x0 + me.x1) / 2 ? 'start' : 'end', into: cl.id }); return;
    }
    if (i === 0 || i === n - 1) doors.push({ a: cl.id, b: 'hall', width: w, at: 'start', into: cl.id, margin: 0.0 });
    else doors.push({ a: cl.id, b: 'hall', width: w, at: i < n / 2 ? 'start' : 'end', into: cl.id });
  });
  // Ventanas
  const lw = living.x1 - living.x0;
  windows.push({ room: 'living', side: 'S', width: Math.min(2.6, Math.max(1.5, lw * 0.42)), at: kL ? 'end' : 'start' });
  windows.push({ room: 'living', side: kL ? 'E' : 'W', width: Math.min(1.8, Ds - 1.4) });
  windows.push({ room: 'kitchen', side: 'S', width: Math.min(1.2, kw - 1.0) });
  for (const cl of cells) windows.push({ room: cl.id, side: 'N', width: cl.type === 'dorm' || cl.type === 'estudio' ? (cl.w > 3.2 ? 1.8 : 1.4) : 0.6 });
  if (p.endWindows) { windows.push({ room: cells[0].id, side: 'W', width: 1.2 }); }
  return { rooms, doors, windows, passages, W, D, frontPorch: p.porch };
}

// ---------- Esquema B (pasillo central) ----------
function schemeB(p) {
  const { L: left, R: right, Wl, Wr, c } = p, W = r3(Wl + c + Wr), Ds = p.Ds;
  const kL = p.kitchenSide === 'L', kw = p.kw;
  const depthL = left.reduce((s, q) => s + q.d, 0), depthR = right.reduce((s, q) => s + q.d, 0), Dp = Math.max(depthL, depthR), D = r3(Ds + Dp);
  const rooms = [], doors = [], windows = [], passages = [];
  const living = { id: 'living', type: 'living', x0: kL ? kw : 0, y0: 0, x1: kL ? W : W - kw, y1: Ds };
  const kitchen = { id: 'kitchen', type: 'kitchen', x0: kL ? 0 : W - kw, y0: 0, x1: kL ? kw : W, y1: Ds };
  if (p.kitchenOpen) { living.group = 'social'; kitchen.group = 'social'; }
  rooms.push(living, kitchen, { id: 'hall', type: 'hall', x0: Wl, y0: Ds, x1: r3(Wl + c), y1: r3(Ds + Dp - (p.hallEnd || 0)) });
  if (p.hallEnd) rooms.push({ id: p.endRoom.id, type: p.endRoom.type, x0: Wl, y0: r3(D - p.hallEnd), x1: r3(Wl + c), y1: D });
  const stack = (list, x0, x1) => { let y = Ds; list.forEach((q, i) => { const last = i === list.length - 1; rooms.push({ id: q.id, type: q.type, x0, y0: r3(y), x1, y1: last ? D : r3(y + q.d), main: q.main }); y += q.d; }); };
  stack(left, 0, Wl); stack(right, r3(Wl + c), W);
  doors.push({ a: 'living', b: 'EXT', side: 'S', width: 0.9, at: kL ? 'end' : 'start', margin: 0.25 });
  if (!p.kitchenOpen) passages.push({ a: 'kitchen', b: 'living', width: Math.min(1.2, Ds - 1.2), at: 'end' });
  passages.push({ a: 'hall', b: 'living', width: c - 0.0 });
  for (const q of [...left, ...right]) {
    if (q.type === 'suite') { doors.push({ a: q.id, b: q.suiteOf, width: 0.7, at: 'start', into: q.id }); continue; }
    if (q.via === 'kitchen') { doors.push({ a: q.id, b: 'kitchen', width: 0.7, at: 'start', into: q.id }); continue; }
    doors.push({ a: q.id, b: 'hall', width: q.type === 'dorm' || q.type === 'estudio' ? 0.8 : 0.7, at: 'start', into: q.id });
  }
  if (p.hallEnd) doors.push({ a: p.endRoom.id, b: 'hall', width: 0.7, into: p.endRoom.id });
  const lw = living.x1 - living.x0;
  windows.push({ room: 'living', side: 'S', width: Math.min(2.4, Math.max(1.5, lw * 0.45)), at: kL ? 'start' : 'end' });
  windows.push({ room: 'kitchen', side: kL ? 'W' : 'E', width: Math.min(1.2, Ds - 1.6) });
  windows.push({ room: 'kitchen', side: 'S', width: Math.min(1.0, kw - 1.1) });
  for (const q of left) windows.push({ room: q.id, side: 'W', width: q.type === 'dorm' || q.type === 'estudio' ? 1.5 : 0.6 });
  for (const q of right) windows.push({ room: q.id, side: 'E', width: q.type === 'dorm' || q.type === 'estudio' ? 1.5 : 0.6 });
  const lastL = left[left.length - 1], lastR = right[right.length - 1];
  if (lastL.type === 'dorm') windows.push({ room: lastL.id, side: 'N', width: 1.4 });
  if (lastR.type === 'dorm') windows.push({ room: lastR.id, side: 'N', width: 1.4 });
  if (p.hallEnd) windows.push({ room: p.endRoom.id, side: 'N', width: 0.6 });
  return { rooms, doors, windows, passages, W, D, frontPorch: p.porch };
}

// ---------- Esquema L (ala de dormitorios + estar con patio) ----------
// Columna de locales a la izquierda (cocina al frente), pasillo junto a ella; el estar ocupa el frente derecho
// y el fondo derecho queda como patio con deck.
function schemeL(p) {
  const { col, Wc, c, Wl, Ds } = p, D = r3(col.reduce((s, q) => s + q.d, 0)), W = r3(Wc + c + Wl);
  const rooms = [], doors = [], windows = [], passages = [];
  let y = 0; col.forEach((q, i) => { rooms.push({ id: q.id, type: q.type, x0: 0, y0: r3(y), x1: Wc, y1: i === col.length - 1 ? D : r3(y + q.d), main: q.main }); y += q.d; });
  const first = col[0];
  rooms.push({ id: 'living', type: 'living', x0: Wc, y0: 0, x1: W, y1: Ds });
  rooms.push({ id: 'hall', type: 'hall', x0: Wc, y0: Ds, x1: r3(Wc + c), y1: D });
  passages.push({ a: 'hall', b: 'living', width: c });
  doors.push({ a: 'living', b: 'EXT', side: 'S', width: 0.9, at: 'start', margin: 0.25 });
  for (const q of col) {
    if (q.type === 'kitchen') { if (p.kitchenOpen) passages.push({ a: q.id, b: 'living', width: Math.min(1.6, q.d - 0.8), at: 'start' }); else doors.push({ a: q.id, b: 'living', width: 0.8, at: 'start', into: q.id }); continue; }
    if (q.type === 'suite') { doors.push({ a: q.id, b: q.suiteOf, width: 0.7, at: 'start', into: q.id }); continue; }
    const r = rooms.find((z) => z.id === q.id), viaHall = r.y1 > Ds + 0.9;
    doors.push({ a: q.id, b: viaHall ? 'hall' : 'living', width: q.type === 'dorm' || q.type === 'estudio' ? 0.8 : 0.7, at: viaHall ? 'end' : 'start', into: q.id });
  }
  windows.push({ room: 'living', side: 'S', width: Math.min(2.6, Wl * 0.5), at: 'end' });
  windows.push({ room: 'living', side: 'N', width: Math.min(3.0, Wl - 1.2), at: 'end' });
  windows.push({ room: 'living', side: 'E', width: Math.min(1.8, Ds - 1.4) });
  for (const q of col) windows.push({ room: q.id, side: 'W', width: q.type === 'dorm' || q.type === 'estudio' ? 1.5 : q.type === 'kitchen' ? 1.2 : 0.6 });
  windows.push({ room: col[col.length - 1].id, side: 'N', width: 1.4 });
  windows.push({ room: 'hall', side: 'N', width: 0.6 });
  return { rooms, doors, windows, passages, W, D, patio: [r3(Wc + c), Ds, W, D] };
}

// ---------- Esquema H (doble ala: estar y cocina al centro, dormitorios a ambos lados) ----------
function schemeH(p) {
  const { left, right, Wa, Wb, c, Wc, Dl } = p;
  const D = r3(Math.max(left.reduce((s, q) => s + q.d, 0), right.reduce((s, q) => s + q.d, 0)));
  const W = r3(Wa + c + Wc + c + Wb), rooms = [], doors = [], windows = [], passages = [];
  const xc0 = r3(Wa + c), xc1 = r3(Wa + c + Wc);
  rooms.push({ id: 'living', type: 'living', x0: xc0, y0: 0, x1: xc1, y1: Dl, big: true });
  rooms.push({ id: 'kitchen', type: 'kitchen', x0: xc0, y0: Dl, x1: xc1, y1: D });
  if (p.kitchenOpen) { rooms[0].group = 'social'; rooms[1].group = 'social'; } else passages.push({ a: 'kitchen', b: 'living', width: Math.min(1.6, Wc - 1.4), at: 'start' });
  rooms.push({ id: 'hallA', type: 'hall', x0: Wa, y0: 0, x1: xc0, y1: D }, { id: 'hallB', type: 'hall', x0: xc1, y0: 0, x1: r3(xc1 + c), y1: D });
  passages.push({ a: 'hallA', b: 'living', width: 1.0, at: 'end' }, { a: 'hallB', b: 'living', width: 1.0, at: 'end' });
  const stack = (list, x0, x1, hall, side) => { let y = 0; list.forEach((q, i) => { rooms.push({ id: q.id, type: q.type, x0, y0: r3(y), x1, y1: i === list.length - 1 ? D : r3(y + q.d), main: q.main }); y += q.d;
    if (q.type === 'suite') doors.push({ a: q.id, b: q.suiteOf, width: 0.7, at: 'start', into: q.id }); else doors.push({ a: q.id, b: hall, width: q.type === 'dorm' || q.type === 'estudio' ? 0.8 : 0.7, at: 'start', into: q.id });
    windows.push({ room: q.id, side, width: q.type === 'dorm' || q.type === 'estudio' ? 1.5 : 0.6 }); }); };
  stack(left, 0, Wa, 'hallA', 'W'); stack(right, r3(xc1 + c), W, 'hallB', 'E');
  doors.push({ a: 'living', b: 'EXT', side: 'S', width: 1.2, kind: 'double-door', margin: 0.3 });
  windows.push({ room: 'kitchen', side: 'N', width: Math.min(1.6, Wc - 1.4) });
  windows.push({ room: 'hallA', side: 'S', width: 0.6 }, { room: 'hallB', side: 'S', width: 0.6 });
  const lw = Wc; windows.push({ room: 'living', side: 'S', width: Math.min(1.6, (lw - 1.6) / 2), at: 'start' });
  return { rooms, doors, windows, passages, W, D, frontPorch: [xc0 - 0.4, xc1 + 0.4] };
}

// ---------- Monoambiente ----------
function schemeM(p) {
  const { W, D, bw, bd } = p; const rooms = [], doors = [], windows = [], passages = [];
  rooms.push({ id: 'living', type: 'mono', x0: 0, y0: 0, x1: W, y1: D });
  // baño en la esquina posterior; el estar envuelve: se modela como dos locales del mismo grupo
  const bL = p.bathSide === 'L';
  rooms[0] = { id: 'living', type: 'mono', group: 'm', x0: 0, y0: 0, x1: W, y1: r3(D - bd) };
  rooms.push({ id: 'kitchen', type: 'kitchenette', group: 'm', x0: bL ? bw : 0, y0: r3(D - bd), x1: bL ? W : r3(W - bw), y1: D });
  rooms.push({ id: 'bath', type: 'bath', x0: bL ? 0 : r3(W - bw), y0: r3(D - bd), x1: bL ? bw : W, y1: D });
  doors.push({ a: 'living', b: 'EXT', side: 'S', width: 0.9, at: bL ? 'start' : 'end', margin: 0.25 });
  doors.push({ a: 'bath', b: 'living', width: 0.7, at: bL ? 'end' : 'start', into: 'bath' });
  windows.push({ room: 'living', side: 'S', width: Math.min(2.4, W * 0.45), at: bL ? 'end' : 'start' });
  windows.push({ room: 'living', side: bL ? 'E' : 'W', width: 1.5 });
  windows.push({ room: 'kitchen', side: 'N', width: 1.0 });
  windows.push({ room: 'bath', side: 'N', width: 0.6 });
  return { rooms, doors, windows, passages, W, D, frontPorch: p.porch };
}

// ---------- Equipamiento por local ----------
function furnish(house) {
  const blocks = [], warn = [];
  const byId = Object.fromEntries(house.rooms.map((r) => [r.id, r]));
  for (const r of house.rooms) {
    const F = new Fitter(r, house), cw = r.cx1 - r.cx0, cd = r.cy1 - r.cy0, need = (ok, what) => { if (!ok) warn.push(r.id + ': ' + what); return ok; };
    if (r.type === 'dorm' || r.type === 'estudio') {
      const big = r.main || (cw >= 3.0 && cd >= 3.0 && (r.main !== false) && r.double);
      if (r.type === 'estudio') { need(F.wall('mob-escritorio', { use: 0.3, noWindow: false, score: (fp, s) => (s === 'N' ? 1 : 0) }), 'escritorio'); F.wall('mob-biblioteca', { w: Math.min(2.4, Math.max(1.0, Math.min(cw, cd) - 1.2)), use: 0.6 }); F.wall('mob-sillon', { use: 0.5 }); blocks.push(...F.blocks); continue; }
      const bed = r.main ? (cw >= 3.0 && cd >= 3.0 ? 'dor-queen' : 'dor-cama2') : (cw * cd >= 10 ? 'dor-cama2' : 'dor-cama1');
      let okBed = null, pl = null;
      for (const L0 of [2.4, 2.0, 1.8, 1.6, 1.4, 1.2, 1.0]) {
        const k0 = F.snap();
        pl = F.wall('mob-placard', { w: L0, use: 0.6, noWindow: true, score: (fp, s, t, span) => -Math.min(t, span - t) * 0.2 });
        if (!pl) { F.undo(k0); continue; }
        okBed = F.wall(bed, { use: 0.6, noWindow: true, center: bed !== 'dor-cama1', score: (fp, s) => (s === 'N' ? -0.3 : 0) + (bed === 'dor-cama1' ? -Math.min(fp[0] - r.cx0, r.cx1 - fp[2], fp[1] - r.cy0, r.cy1 - fp[3]) : 0) })
          || F.wall(bed, { use: 0.55, center: true });
        if (okBed) break; F.undo(k0); pl = null;
      }
      if (!okBed) { okBed = F.wall(bed, { use: 0.55, center: true }) || F.wall('dor-cama1', { use: 0.55 }); if (okBed) pl = F.wall('mob-placard', { w: 1.2, use: 0.55 }) || F.wall('mob-placard-bat', { w: 0.9, use: 0.55 }) || F.wall('dor-comoda', { w: 0.9, use: 0.5 }); }
      need(okBed, 'cama'); need(pl, 'placard');
      if (!r.main && cw * cd > 9.5) F.wall('dor-escritorio-juvenil', { use: 0.6, score: (fp, s) => (s === 'N' ? 0.5 : 0) });
      else if (r.main && cw * cd > 13) F.wall('dor-comoda', { w: 1.2, use: 0.6 });
    } else if (r.type === 'bath' || r.type === 'suite' || r.type === 'toil') {
      const full = r.type !== 'toil';
      if (full) {
        const tub = (r.main || r.type === 'suite' || r.tub) && Math.max(cw, cd) >= 2.5 && Math.min(cw, cd) >= 1.62;
        if (tub) need(F.wall('san-banera', { w: Math.min(1.7, Math.min(cw, cd)), d: 0.75, use: 0.5, score: (fp, s) => (s === 'N' ? 1 : 0) + ((fp[2] - fp[0]) > 1.6 || (fp[3] - fp[1]) > 1.6 ? 0.5 : 0) - Math.min(Math.abs(fp[0] - r.cx0), Math.abs(r.cx1 - fp[2])) }) || F.wall('san-ducha', { w: Math.min(1.0, cw), d: 0.9, use: 0.5 }), 'bañera');
        else need(F.wall('san-ducha', { w: Math.max(0.8, Math.min(1.2, Math.min(cw, cd) - 0.0, cw * cd < 3.6 ? 0.85 : 9)), d: cw * cd < 3.6 ? 0.8 : 0.9, use: 0.55, score: (fp, s) => (s === 'N' ? 1 : 0) - Math.min(Math.abs(fp[0] - r.cx0), Math.abs(r.cx1 - fp[2]), Math.abs(fp[1] - r.cy0), Math.abs(r.cy1 - fp[3])) }), 'ducha');
      }
      // El inodoro y bidé forman un conjunto: mismo respaldo, misma pared.
      // Probar el par antes de aceptar un WC individual; nunca repartirlos entre paredes.
      let pair = false;
      { // Residential WC + bidet are mandatory regardless of room size.
        const wc = require('./blocks.js').item('san-wc'), bd = require('./blocks.js').item('san-bidet');
        for (const side of ['W']) {
          const L = side === 'W' || side === 'E' ? cd : cw;
          for (const order of [[wc, bd], [bd, wc]]) {
            if (pair) break;
            for (let t = 0.05; t + order[0].w + 0.25 + order[1].w <= L + 1e-6; t += 0.05) {
              const save = F.snap(), a = order[0], b = order[1];
              const fp = fpOf(r, side, a.w, a.d, t), use = frontOf(fp, side, 0.5, 0.1);
              const next = fpOf(r, side, b.w, b.d, t + a.w + 0.25), nextUse = frontOf(next, side, 0.5, 0.1);
              if (!F.free(fp, use) || !F.privateFixture(fp, side) || !F.privateFixture(next, side) || F.underWindow(fp, side) || F.underWindow(next, side)) continue;
              F.commit(a.id, a.w, a.d, fp, side, use);
              if (F.free(next, nextUse)) { F.commit(b.id, b.w, b.d, next, side, nextUse); pair = true; break; }
              F.undo(save);
            }
          }
          if (pair) break;
        }
        need(pair, 'par inodoro + bidé sobre misma pared; revisar distribución si no cabe');
      }
      // No single-WC fallback: the generator rejects this variant through warn.
      need(F.wall(full && Math.max(cw, cd) > 2.9 && Math.min(cw, cd) > 1.9 ? 'san-lav2' : 'san-lav', { w: full && Math.max(cw, cd) > 2.9 && Math.min(cw, cd) > 1.9 ? 1.2 : 0.6, use: 0.55, sides: ['E','N','S'] }) || F.wall('san-lav-pie', { use: 0.5, sides: ['E','N','S'] }), 'lavatorio');
    } else if (r.type === 'lav') {
      need(F.wall('kq-lavarropas', { use: 0.6 }), 'lavarropas'); F.wall('kq-pileta', { use: 0.5 }); F.wall('kq-termo', { use: 0.3 });
    } else if (r.type === 'kitchen' || r.type === 'kitchenette') {
      kitchenRun(F, r, house, need);
      if (r.type === 'kitchen' && cw * cd > 11 && !r.group) F.floating('mob-mesa4', { side: 'S', margin: 0.55 });
    } else if (r.type === 'living' || r.type === 'mono') {
      livingSet(F, r, house, byId, need);
    }
    blocks.push(...F.blocks);
  }
  return { blocks, warn };
}
function kitchenRun(F, r, house, need) {
  // Línea de cocina: heladera · mesada · bacha · mesada · cocina · mesada, contra el lado más largo libre.
  const parts = [['kq-heladera', 0.7, 0.7], ['kq-mesada', 0.6, 0.6], ['kq-bacha', 0.8, 0.6], ['kq-mesada', 0.7, 0.6], ['kq-cocina', 0.6, 0.62], ['kq-mesada', 0.6, 0.6]];
  const SHORT = [['kq-heladera', 0.6, 0.7], ['kq-bacha', 0.8, 0.6], ['kq-mesada', 0.6, 0.6], ['kq-cocina', 0.6, 0.62]];
  const total = (ps) => ps.reduce((s, q) => s + q[1], 0);
  const sides = ['N', 'W', 'E', 'S'].map((s) => ({ s, L: s === 'S' || s === 'N' ? r.cx1 - r.cx0 : r.cy1 - r.cy0 }));
  let done = false;
  for (const pref of [r.type === 'kitchenette' ? ['N'] : [], ['N', 'W', 'E', 'S']].flat()) {
    if (done) break; const sd = sides.find((q) => q.s === pref);
    for (const stretch of [1.3, 1, 0.8, 0]) {
      let ps = stretch ? parts.map((q) => q.slice()) : SHORT.map((q) => q.slice()); if (!stretch) { const extra = sd.L - 0.05 - total(ps); if (extra < 0) continue; ps[2][1] += Math.min(extra, 0.6); } else { ps[3][1] = Math.max(0.6, Math.min(1.6, 0.7 * stretch)); ps[1][1] = Math.max(0.6, 0.6 * stretch);
      const extra = sd.L - 0.05 - total(ps); if (extra < 0) { ps = ps.filter((q, i) => i !== 5); if (sd.L - 0.05 - total(ps) < 0) continue; } else ps[3][1] += Math.min(extra, 1.2); }
      // buscar inicio libre
      const L = sd.L, tot = total(ps); let placed = null;
      for (let t0 = 0; t0 <= L - tot + 1e-6 && !placed; t0 += 0.05) {
        let t = t0, ok = true, fps = [];
        for (const [id, w, d] of ps) { const fp = fpOf(r, pref, w, d, t); const use = frontOf(fp, pref, 0.9); if (!F.free(fp, use) || fps.some((f) => ov(f, fp))) { ok = false; break; } fps.push(fp); t += w; }
        if (ok) placed = { t0 };
      }
      if (!placed) continue;
      let t = placed.t0; for (const [id, w, d] of ps) { const fp = fpOf(r, pref, w, d, t); F.commit(id, w, d, fp, pref, frontOf(fp, pref, 0.9)); t += w; }
      done = true; break;
    }
  }
  need(done, 'línea de cocina');
}
const { fpAgainst: fpOf, front: frontOf } = require('./furnish.js');
function livingSet(F, r, house, byId, need) {
  const cw = r.cx1 - r.cx0, cd = r.cy1 - r.cy0, k = byId.kitchen;
  const mono = r.type === 'mono';
  // dirección de la zona de estar: lejos de la cocina
  const kitchenLeft = k && k.x1 <= r.x0 + 1e-6, kitchenRight = k && k.x0 >= r.x1 - 1e-6;
  const farSide = kitchenLeft ? 'E' : kitchenRight ? 'W' : (mono ? (k && (k.x0 + k.x1) / 2 < (r.x0 + r.x1) / 2 ? 'E' : 'W') : 'E');
  if (mono) {
    need(F.wall('dor-cama2', { use: 0.6, noWindow: true, sides: [farSide, 'N'], center: true }) || F.wall('dor-cama1', { use: 0.6 }), 'cama');
    F.wall('mob-placard', { w: 1.6, use: 0.6 }) || F.wall('mob-placard', { w: 1.2, use: 0.6 });
    F.wall('mob-sofa2', { use: 0.6, sides: ['S', farSide === 'E' ? 'W' : 'E'] });
    F.floating('mob-mesa-cafe-red', { side: 'S', margin: 0.5, target: [r.cx0 + cw / 2, r.cy0 + cd * 0.45] }) || F.floating('mob-mesa4', { side: 'S', margin: 0.4 });
    return;
  }
  // Estar (TV + sofá + ratona + sillón) del lado lejano a la cocina y comedor del lado de la cocina.
  const longX = cw >= cd, I = require('./blocks.js').item;
  const tries = [];
  for (const frac of [0.5, 0.56, 0.45, 0.62]) {
    const seatW = cw * (longX ? frac : 1), seatD = cd * (longX ? 1 : frac);
    const region = longX ? (farSide === 'E' ? [r.cx1 - seatW, r.cy0, r.cx1, r.cy1] : [r.cx0, r.cy0, r.cx0 + seatW, r.cy1]) : [r.cx0, r.cy1 - seatD, r.cx1, r.cy1];
    const dRegion = longX ? (farSide === 'E' ? [r.cx0, r.cy0, r.cx1 - seatW, r.cy1] : [r.cx0 + seatW, r.cy0, r.cx1, r.cy1]) : [r.cx0, r.cy0, r.cx1, r.cy1 - seatD];
    for (const tvSide of longX ? [farSide, 'N', 'S'] : ['N', farSide]) tries.push({ region, dRegion, tvSide });
  }
  let okAll = false;
  for (const { region, dRegion, tvSide } of tries) {
    const k0 = F.snap();
    const tv = F.wall('mob-tv', { w: 1.6, use: 0.3, sides: [tvSide], noWindow: true, region, score: (fp) => -Math.abs((fp[1] + fp[3]) / 2 - (region[1] + region[3]) / 2) - Math.abs((fp[0] + fp[2]) / 2 - (region[0] + region[2]) / 2) });
    let sofa = null;
    if (tv) {
      const big = Math.min(region[2] - region[0], region[3] - region[1]) >= 3.0 && Math.max(region[2] - region[0], region[3] - region[1]) >= 2.8 ? 'mob-sofa3' : 'mob-sofa2', it = I(big);
      const back = { E: 'W', W: 'E', N: 'S', S: 'N' }[tvSide];
      for (const dist of [2.3, 2.1, 2.5, 1.9, 2.7, 1.7]) {
        const c = [(tv.fp[0] + tv.fp[2]) / 2, (tv.fp[1] + tv.fp[3]) / 2]; let fp;
        if (tvSide === 'E') fp = [tv.fp[0] - dist - it.d, c[1] - it.w / 2, tv.fp[0] - dist, c[1] + it.w / 2];
        else if (tvSide === 'W') fp = [tv.fp[2] + dist, c[1] - it.w / 2, tv.fp[2] + dist + it.d, c[1] + it.w / 2];
        else if (tvSide === 'N') fp = [c[0] - it.w / 2, tv.fp[1] - dist - it.d, c[0] + it.w / 2, tv.fp[1] - dist];
        else fp = [c[0] - it.w / 2, tv.fp[3] + dist, c[0] + it.w / 2, tv.fp[3] + dist + it.d];
        const behind = tvSide === 'E' ? [fp[0] - 0.7, fp[1], fp[0], fp[3]] : tvSide === 'W' ? [fp[2], fp[1], fp[2] + 0.7, fp[3]] : tvSide === 'N' ? [fp[0], fp[1] - 0.7, fp[2], fp[1]] : [fp[0], fp[3], fp[2], fp[3] + 0.7];
        const wallBehind = (tvSide === 'E' && fp[0] - r.cx0 < 0.05) || (tvSide === 'W' && r.cx1 - fp[2] < 0.05) || (tvSide === 'N' && fp[1] - r.cy0 < 0.05) || (tvSide === 'S' && r.cy1 - fp[3] < 0.05);
        if (F.free(fp) && (wallBehind || F.free(behind.map((v, i) => v)) || true)) { sofa = F.commit(big, it.w, it.d, fp, back); break; }
      }
    }
    let table = null;
    if (sofa) {
      const rt = I('mob-ratona'), vert = tvSide === 'E' || tvSide === 'W';
      const mid = vert ? [((tvSide === 'E' ? sofa.fp[2] : tv.fp[2]) + (tvSide === 'E' ? tv.fp[0] : sofa.fp[0])) / 2, (sofa.fp[1] + sofa.fp[3]) / 2] : [(sofa.fp[0] + sofa.fp[2]) / 2, ((tvSide === 'N' ? sofa.fp[3] : tv.fp[3]) + (tvSide === 'N' ? tv.fp[1] : sofa.fp[1])) / 2];
      const fw = vert ? rt.d : rt.w, fd = vert ? rt.w : rt.d, fpr = [mid[0] - fw / 2, mid[1] - fd / 2, mid[0] + fw / 2, mid[1] + fd / 2];
      if (F.free(fpr)) F.commit('mob-ratona', rt.w, rt.d, fpr, vert ? 'W' : 'S');
      const sl = I('mob-sillon');
      for (const s of [1, -1]) {
        let f2; if (vert) { const y = s > 0 ? sofa.fp[3] + 0.2 : sofa.fp[1] - 0.2 - sl.w; f2 = [mid[0] - sl.d / 2, y, mid[0] + sl.d / 2, y + sl.w]; }
        else { const x = s > 0 ? sofa.fp[2] + 0.2 : sofa.fp[0] - 0.2 - sl.w; f2 = [x, mid[1] - sl.d / 2, x + sl.w, mid[1] + sl.d / 2]; }
        if (F.free(f2) && !ov(f2, dRegion, -0.3)) { F.commit('mob-sillon', sl.w, sl.d, f2, vert ? (s > 0 ? 'N' : 'S') : (s > 0 ? 'E' : 'W')); break; }
      }
      const big6 = r.big && (dRegion[2] - dRegion[0]) * (dRegion[3] - dRegion[1]) > 9;
      const opts = (side, m) => ({ side, region: dRegion, margin: m });
      table = (big6 && (F.floating('mob-mesa6', opts('S', 0.3)) || F.floating('mob-mesa6', opts('E', 0.3)))) || F.floating('mob-mesa4', opts('S', 0.3)) || F.floating('mob-mesa4', opts('E', 0.3)) || F.floating('mob-mesa-red', { w: 1.8, d: 1.8, ...opts('S', 0.25) });
    }
    if (tv && sofa && !table) table = F.wall('mob-mesa-cafe-red', { use: 0.2, region: dRegion }) || F.wall('mob-mesa4', { use: 0.3, region: dRegion, sides: ['N', 'S', 'W', 'E'] });
    if (tv && sofa && table) { okAll = true; break; }
    F.undo(k0);
  }
  if (!okAll) {
    // living chico: sofá contra un muro, mesa ratona delante y mesa de comedor donde entre
    const k0 = F.snap();
    const so = F.wall('mob-sofa2', { use: 1.1, score: (fp, s) => (s === farSide ? 1 : 0) + (s === 'N' ? 0.5 : 0) }) || F.wall('mob-sofa2', { use: 0.9 });
    let tb = null;
    if (so) tb = F.floating('mob-mesa4', { side: 'S', margin: 0.25 }) || F.floating('mob-mesa4', { side: 'E', margin: 0.25 }) || F.floating('mob-mesa-cafe-red', { side: 'S', margin: 0.2 }) || F.wall('mob-mesa-cafe-red', { use: 0.2 }) || F.wall('mob-mesa4', { use: 0.3 });
    if (so && tb) { okAll = true; F.wall('mob-tv', { w: 1.4, use: 0.4, noWindow: true }); } else F.undo(k0);
  }
  need(okAll, 'estar-comedor');
  if (cw * cd > 24) F.wall('mob-biblioteca', { w: 1.6, use: 0.6, sides: ['N', 'S'] });
}

module.exports = { schemeA, schemeB, schemeM, schemeL, schemeH, furnish, NAMES };
