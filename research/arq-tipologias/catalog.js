/* Catálogo de tipologías: recorre programas y superficies, dimensiona cada variante para la superficie pedida
 * (superficie cubierta exterior ±3 %), descarta las que no cumplen (puertas, muebles, proporciones) y devuelve las mejores. */
'use strict';
const { build } = require('./build.js');
const r2 = (n) => Math.round(n * 20) / 20; // módulo de 5 cm

const PROGRAMS = [
  { key: 'M', dorms: 0, baths: 1, areas: [25, 28, 30, 32, 35, 38], label: 'Monoambiente' },
  { key: '1D', dorms: 1, baths: 1, areas: [42, 45, 50, 55, 60], cells: [['d1', 'dorm', 3.2, true], ['b1', 'bath', 1.8]] },
  { key: '2D', dorms: 2, baths: 1, areas: [55, 60, 65, 70, 75, 80, 85, 90], cells: [['d1', 'dorm', 3.4, true], ['b1', 'bath', 1.9], ['d2', 'dorm', 3.0]] },
  { key: '2D2B', dorms: 2, baths: 2, areas: [75, 80, 90, 100, 110], cells: [['d1', 'dorm', 3.5, true], ['s1', 'suite', 1.8, false, 'd1'], ['b1', 'bath', 1.8], ['d2', 'dorm', 3.1]] },
  { key: '3D', dorms: 3, baths: 2, areas: [90, 100, 110, 120, 130, 140, 150], cells: [['d1', 'dorm', 3.6, true], ['s1', 'suite', 1.9, false, 'd1'], ['d2', 'dorm', 3.0], ['b1', 'bath', 1.9], ['d3', 'dorm', 3.0]] },
  { key: '3DE', dorms: 3, baths: 2, areas: [130, 150, 165, 180], cells: [['d1', 'dorm', 3.8, true], ['s1', 'suite', 2.0, false, 'd1'], ['d2', 'dorm', 3.1], ['b1', 'bath', 2.0], ['e1', 'estudio', 2.8], ['d3', 'dorm', 3.1]] },
  { key: '4D', dorms: 4, baths: 3, areas: [150, 165, 180, 200, 220, 250], cells: [['d1', 'dorm', 3.8, true], ['s1', 'suite', 2.1, false, 'd1'], ['d2', 'dorm', 3.1], ['b1', 'bath', 2.0], ['d3', 'dorm', 3.1], ['b2', 'bath', 1.8], ['d4', 'dorm', 3.1]] },
];
const B_PROGRAMS = [
  { key: '2D-B', dorms: 2, baths: 1, areas: [70, 75, 80, 90], L: [['d1', 'dorm', 3.5, true], ['d2', 'dorm', 3.2]], R: [['b1', 'bath', 2.3], ['l1', 'lav', 1.7], ['e1', 'estudio', 2.7]] },
  { key: '3D-B', dorms: 3, baths: 2, areas: [95, 100, 110, 120], L: [['d1', 'dorm', 3.6, true], ['s1', 'suite', 2.3, false, 'd1'], ['d2', 'dorm', 3.2]], R: [['b1', 'bath', 2.3], ['l1', 'lav', 1.7], ['d3', 'dorm', 3.2]] },
];

function cellsFrom(list, f) {
  return list.map(([id, type, w, main, suiteOf]) => ({ id, type, w: r2(type === 'dorm' || type === 'estudio' ? Math.max(2.7, Math.min(4.6, w * f)) : Math.max(1.6, Math.min(2.4, w * (0.6 + 0.4 * f)))), main: !!main, suiteOf }));
}

function variantsA(prog, area) {
  const out = [];
  for (const f of [0.82, 0.9, 1.0, 1.1, 1.2, 1.3]) for (const Dp of [3.0, 3.2, 3.4, 3.6, 3.8, 4.2]) for (const corr of (area <= 75 && prog.dorms <= 2 ? [0, 1.1] : prog.dorms >= 2 || prog.baths >= 2 ? [1.1] : [0])) {
    for (const rev of corr ? [false] : [false, true]) {
    let cells = cellsFrom(prog.cells, f); if (rev) cells.reverse();
    const W = cells.reduce((s, c) => s + c.w, 0);
    const D = area / (W + 0.3) - 0.3, Ds = r2(D - corr - Dp);
    if (Ds < 3.3 || Ds > 5.6) continue;
    for (const kitchenSide of ['R', 'L']) for (const kitchenOpen of [false, true]) {
      const kw = r2(kitchenOpen && area <= 60 ? 2.1 : Math.max(2.4, Math.min(3.6, (area > 120 ? 3.4 : area > 70 ? 3.0 : 2.6) + (Ds > 5 ? -0.2 : 0))));
      if (W - kw < (kitchenOpen ? 3.3 : 3.6)) continue;
      // el hall debe abrir sobre el estar
      if (corr) { const h0 = cells[0].w, h1 = W - cells[cells.length - 1].w, l0 = kitchenSide === 'L' ? kw : 0, l1 = kitchenSide === 'L' ? W : W - kw; if (Math.min(h1, l1) - Math.max(h0, l0) < 1.25) continue; }
      out.push({ scheme: 'A', p: { cells: cells.map((c) => ({ ...c })), Ds, corr, Dp, kw, kitchenSide, kitchenOpen, porch: area >= 60 ? (kitchenSide === 'R' ? [0.6, Math.min(W - kw - 0.4, 6)] : [kw + 0.4, Math.min(W - 0.6, kw + 6.4)]) : null }, W, D: r2(Ds + corr + Dp), ratio: (r2(Ds + corr + Dp) + 0.3) / (W + 0.3) });
    }
    }
  }
  return out;
}
function variantsB(prog, area) {
  const out = [];
  for (const f of [1.05, 1.1, 1.15, 1.2]) for (const Ds of [3.8, 4.1, 4.4, 4.8]) {
    const L = cellsFrom(prog.L, 1).map((c) => ({ ...c, d: c.w })), R = cellsFrom(prog.R, 1).map((c) => ({ ...c, d: c.w }));
    const Wl = r2(3.0 * f), Wr = r2(3.0 * f), c = 1.1, W = Wl + c + Wr;
    const Dp = area / (W + 0.3) - 0.3 - Ds; const sumL = L.reduce((s, q) => s + q.d, 0), sumR = R.reduce((s, q) => s + q.d, 0);
    if (Dp < Math.max(sumL, sumR) * 0.8 || Dp > Math.max(sumL, sumR) * 1.35) continue;
    const kL = L.map((q) => ({ ...q, d: r2(q.d * Dp / sumL) })), kR = R.map((q) => ({ ...q, d: r2(q.d * Dp / sumR) }));
    for (const kitchenSide of ['R', 'L']) for (const kitchenOpen of [false, true]) {
      const kw = r2(Math.min(3.0, W * 0.38)); if (W - kw < 3.8) continue;
      out.push({ scheme: 'B', p: { L: kL, R: kR, Wl, Wr, c, Ds, kw, kitchenSide, kitchenOpen, porch: null }, W, D: Ds + Dp, ratio: (Ds + Dp + 0.3) / (W + 0.3) });
    }
  }
  return out;
}
function variantsM(area) {
  const out = [];
  for (const ratio of [0.8, 1.0, 1.25, 1.5]) for (const bathSide of ['L', 'R']) {
    const Wo = Math.sqrt(area / ratio), W = r2(Wo - 0.3), D = r2(area / Wo - 0.3);
    if (W < 3.6 || D < 4.6) continue;
    out.push({ scheme: 'M', p: { W, D, bw: 1.8, bd: 2.4, bathSide }, W, D, ratio: (D + 0.3) / (W + 0.3) });
  }
  return out;
}

const L_PROGRAMS = [
  { key: '1D-L', dorms: 1, baths: 1, areas: [50, 55, 60, 65], col: [['kitchen', 'kitchen', 2.8], ['b1', 'bath', 2.0], ['d1', 'dorm', 3.4, true]] },
  { key: '2D-L', dorms: 2, baths: 1, areas: [65, 70, 75, 80, 90], col: [['kitchen', 'kitchen', 3.0], ['b1', 'bath', 2.1], ['d2', 'dorm', 3.0], ['d1', 'dorm', 3.4, true]] },
  { key: '3D-L', dorms: 3, baths: 2, areas: [95, 100, 110, 120, 130], col: [['kitchen', 'kitchen', 3.2], ['b1', 'bath', 2.1], ['d3', 'dorm', 3.0], ['d2', 'dorm', 3.0], ['s1', 'suite', 2.0, false, 'd1'], ['d1', 'dorm', 3.6, true]] },
];
const H_PROGRAMS = [
  { key: '2D-H', dorms: 2, baths: 2, areas: [90, 100, 110], left: [['d1', 'dorm', 3.6, true], ['s1', 'suite', 2.2, false, 'd1']], right: [['d2', 'dorm', 3.4], ['b1', 'bath', 2.2]] },
  { key: '3D-H', dorms: 3, baths: 2, areas: [115, 125, 135, 150], left: [['d1', 'dorm', 3.6, true], ['s1', 'suite', 2.2, false, 'd1'], ['e1', 'estudio', 2.8]], right: [['d2', 'dorm', 3.2], ['b1', 'bath', 2.2], ['d3', 'dorm', 3.2]] },
  { key: '4D-H', dorms: 4, baths: 3, areas: [160, 180, 200, 220], left: [['d1', 'dorm', 3.8, true], ['s1', 'suite', 2.3, false, 'd1'], ['d2', 'dorm', 3.2]], right: [['d3', 'dorm', 3.2], ['b1', 'bath', 2.2], ['d4', 'dorm', 3.2], ['b2', 'bath', 2.0]] },
];
const depthList = (list, f) => list.map(([id, type, d, main, suiteOf]) => ({ id, type, d: r2(type === 'dorm' || type === 'estudio' || type === 'kitchen' ? d * f : Math.max(1.8, d * (0.7 + 0.3 * f))), main: !!main, suiteOf }));
function variantsL(prog, area) {
  const out = [];
  for (const f of [1.0, 1.1, 1.2, 1.3]) for (const Wc of [3.2, 3.4, 3.6, 3.8]) for (const Ds of [4.2, 4.6, 5.0, 5.4]) for (const kitchenOpen of [false, true]) {
    const col = depthList(prog.col, f), D = col.reduce((s, q) => s + q.d, 0), c = 1.1;
    if (Ds > D - 2.4) continue;
    // área ≈ (Wc+c)·D + Wl·Ds + perímetro → despejar Wl
    const Wl = r2((area - (Wc + c + 0.3) * (D + 0.3)) / (Ds + 0.15));
    if (Wl < 3.8 || Wl > 7.5) continue;
    out.push({ scheme: 'L', p: { col, Wc, c, Wl, Ds, kitchenOpen }, W: Wc + c + Wl, D, ratio: D / (Wc + c + Wl) });
  }
  return out;
}
function variantsH(prog, area) {
  const out = [];
  for (const f of [1.0, 1.1, 1.2, 1.3]) for (const Wa of [3.3, 3.5, 3.7]) for (const kitchenOpen of [false, true]) {
    const left = depthList(prog.left, f), right = depthList(prog.right, f), c = 1.1;
    const D = Math.max(left.reduce((s, q) => s + q.d, 0), right.reduce((s, q) => s + q.d, 0));
    const Wc = r2(area / (D + 0.3) - 0.3 - 2 * Wa - 2 * c);
    if (Wc < 4.2 || Wc > 7.2) continue;
    for (const kd of [3.0, 3.4]) { const Dl = r2(D - kd); if (Dl < 3.8) continue; out.push({ scheme: 'H', p: { left, right, Wa, Wb: Wa, c, Wc, Dl, kitchenOpen }, W: 2 * Wa + 2 * c + Wc, D, ratio: D / (2 * Wa + 2 * c + Wc) }); }
  }
  return out;
}

function quality(r) {
  // penalizar locales angostos y desequilibrios
  let q = 0; for (const room of r.house.rooms) { const w = room.cx1 - room.cx0, d = room.cy1 - room.cy0, m = Math.min(w, d); if (room.type === 'dorm' && m < 2.7) q -= 5; if (room.type === 'dorm' && w * d < (room.main ? 10 : 8.5)) q -= 4; if (room.type === 'dorm' && room.main && w * d < 9) q -= 4; if (room.type === 'hall' && w * d > 12) q -= 2; if (room.type === 'living' && m < 3.4) q -= 5; if (room.type === 'kitchen' && m < 2.2) q -= 3; if (Math.max(w, d) / m > 2.6 && room.type !== 'hall') q -= 2; }
  return q;
}

function generate(limitPer = 4) {
  const items = [];
  const all = [...PROGRAMS.map((p) => ({ p, kind: p.key === 'M' ? 'M' : 'A' })), ...B_PROGRAMS.map((p) => ({ p, kind: 'B' })), ...L_PROGRAMS.map((p) => ({ p, kind: 'L' })), ...H_PROGRAMS.map((p) => ({ p, kind: 'H' }))];
  for (const { p: prog, kind } of all) for (const area of prog.areas) {
    const cands = kind === 'M' ? variantsM(area) : kind === 'A' ? variantsA(prog, area) : kind === 'L' ? variantsL(prog, area) : kind === 'H' ? variantsH(prog, area) : variantsB(prog, area);
    const ok = [];
    for (const v of cands) {
      let r; try { r = build(v.scheme, v.p, { code: '' }); } catch (e) { continue; }
      if (r.errors.length || r.warn.length) continue;
      if (Math.abs(r.area - area) / area > 0.035) continue;
      ok.push({ v, r, q: quality(r) });
    }
    // diversidad: proporción y lado de cocina / integrada
    ok.sort((a, b) => b.q - a.q);
    const chosen = [];
    const key = (o) => [o.v.p.kitchenSide || o.v.p.bathSide, o.v.p.kitchenOpen, Math.round(o.v.ratio * 3)].join('|');
    for (const o of ok) { if (chosen.length >= limitPer) break; if (chosen.some((c) => key(c) === key(o))) continue; if (o.q < ok[0].q - 4) continue; chosen.push(o); }
    for (const o of ok) { if (chosen.length >= Math.min(limitPer, 2)) break; if (!chosen.includes(o) && o.q >= ok[0].q - 6) chosen.push(o); }
    chosen.forEach((o, i) => items.push({ prog, area, i, ...o }));
  }
  return items;
}
module.exports = { generate, PROGRAMS, B_PROGRAMS, L_PROGRAMS, H_PROGRAMS };
if (require.main === module) {
  const t = Date.now(); const items = generate(+process.argv[2] || 4);
  const by = {}; for (const it of items) { const k = it.prog.key + ' ' + it.area; by[k] = (by[k] || 0) + 1; }
  console.log(items.length, 'tipologías', ((Date.now() - t) / 1000).toFixed(1) + ' s'); console.log(by);
  const missing = []; for (const p of [...PROGRAMS, ...B_PROGRAMS, ...L_PROGRAMS, ...H_PROGRAMS]) for (const a of p.areas) if (!by[p.key + ' ' + a]) missing.push(p.key + ' ' + a); console.log('sin variantes:', missing.join(', '));
}
