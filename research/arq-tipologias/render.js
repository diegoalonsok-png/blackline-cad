/* Lámina de presentación de una tipología: muros llenos, solados, equipamiento, vegetación, rótulos y cotas. */
'use strict';
const { blockPrims } = require('./blocks.js');
const f2 = (n) => n.toFixed(2).replace('.', ',');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
// pseudo-azar determinista
function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909), (s >>> 0) / 4294967296)); }

function wallRects(house) {
  // rectángulos de muro (con extensión de medio espesor en extremos para cerrar esquinas), partidos por aberturas y pasos
  const out = [];
  for (const w of house.plan.walls) {
    const h = Math.abs(w.a[1] - w.b[1]) < 1e-6, t = w.thickness;
    const c = h ? w.a[1] : w.a[0], lo = Math.min(h ? w.a[0] : w.a[1], h ? w.b[0] : w.b[1]), hi = Math.max(h ? w.a[0] : w.a[1], h ? w.b[0] : w.b[1]);
    const ext = (p) => { // extender hasta el borde exterior del muro perpendicular que llega a ese extremo
      let e = 0; for (const q of house.plan.walls) { if (q === w) continue; const qh = Math.abs(q.a[1] - q.b[1]) < 1e-6; if (qh === h) continue; const qc = qh ? q.a[1] : q.a[0], qlo = Math.min(qh ? q.a[0] : q.a[1], qh ? q.b[0] : q.b[1]), qhi = Math.max(qh ? q.a[0] : q.a[1], qh ? q.b[0] : q.b[1]); if (Math.abs(qc - p) < 1e-6 && c >= qlo - 1e-6 && c <= qhi + 1e-6) e = Math.max(e, q.thickness / 2); } return e; };
    let pieces = [[lo - ext(lo), hi + ext(hi)]];
    for (const o of house.plan.openings.filter((q) => q.host === w.id)) {
      const dirPos = (w.b[h ? 0 : 1] - w.a[h ? 0 : 1]) > 0, ctr = dirPos ? (h ? w.a[0] : w.a[1]) + o.offset : (h ? w.a[0] : w.a[1]) - o.offset;
      const a = ctr - o.width / 2, b = ctr + o.width / 2; pieces = pieces.flatMap(([p, q]) => (b <= p || a >= q) ? [[p, q]] : [[p, a], [b, q]].filter(([x, y]) => y - x > 1e-4));
    }
    for (const [p, q] of pieces) out.push(h ? [p, c - t / 2, q, c + t / 2] : [c - t / 2, p, c + t / 2, q]);
  }
  return out;
}
function render(house, meta, opts = {}) {
  const { W, D } = house, pad = 2.2 + (house.frontPorch ? 0.4 : 0), S = opts.ppm || 60;
  const X0 = -pad - 0.15, Y0 = -pad - 0.15 - (house.frontPorch ? 2.2 : 0), X1 = W + pad + 0.15, Y1 = D + pad + 0.15 + 1.1;
  const vw = X1 - X0, vh = Y1 - Y0, R = rng(meta.seed || 7);
  const tx = (x) => (x - X0) * S, ty = (y) => (Y1 - y) * S, out = [];
  const poly = (pts, attr) => `<polygon points="${pts.map((p) => tx(p[0]).toFixed(1) + ',' + ty(p[1]).toFixed(1)).join(' ')}" ${attr}/>`;
  const rect = (r, attr) => `<rect x="${tx(r[0]).toFixed(1)}" y="${ty(r[3]).toFixed(1)}" width="${((r[2] - r[0]) * S).toFixed(1)}" height="${((r[3] - r[1]) * S).toFixed(1)}" ${attr}/>`;
  const line = (a, b, attr) => `<line x1="${tx(a[0]).toFixed(1)}" y1="${ty(a[1]).toFixed(1)}" x2="${tx(b[0]).toFixed(1)}" y2="${ty(b[1]).toFixed(1)}" ${attr}/>`;
  out.push(`<rect x="0" y="0" width="${vw * S}" height="${vh * S}" fill="#f7f5ef"/>`);
  // Terreno: césped con textura y árboles
  const lot = [X0 + 0.5, Y0 + 0.5, X1 - 0.5, Y1 - 1.4];
  out.push(rect(lot, 'fill="#e8ecdc" stroke="#9aa486" stroke-width="1" stroke-dasharray="6 4"'));
  for (let i = 0; i < (vw * vh) * 3; i++) { const x = lot[0] + R() * (lot[2] - lot[0]), y = lot[1] + R() * (lot[3] - lot[1]); if (x > -0.2 && x < W + 0.2 && y > -0.2 - (house.frontPorch ? 2.2 : 0) && y < D + 0.2) continue; out.push(`<circle cx="${tx(x).toFixed(1)}" cy="${ty(y).toFixed(1)}" r="${(0.8 + R()).toFixed(1)}" fill="#b9c39f"/>`); }
  // vereda de acceso
  const entry = house.doors.find((d) => d.into === 'living' && d.h && Math.abs(d.c) < 1e-6) || house.doors.find((d) => d.h && Math.abs(d.c) < 1e-6);
  if (entry) out.push(rect([entry.pos - 0.6, lot[1], entry.pos + 0.6, -0.15 - (house.frontPorch ? 2.2 : 0)], 'fill="#ddd8cb" stroke="#b9b2a2" stroke-width="1"'));
  // galería / deck al frente
  if (house.frontPorch) { const pr = [house.frontPorch[0], -2.35, house.frontPorch[1], -0.15]; out.push(rect(pr, 'fill="#e9dfc8" stroke="#8d7f63" stroke-width="1.2"')); for (let x = pr[0] + 0.14; x < pr[2]; x += 0.14) out.push(line([x, pr[1]], [x, pr[3]], 'stroke="#c8b994" stroke-width="0.8"')); for (const x of [pr[0] + 0.1, pr[2] - 0.3]) out.push(rect([x, pr[1] + 0.05, x + 0.2, pr[1] + 0.25], 'fill="#3a3a36"')); }
  // patio (esquema L): deck de madera, cantero y árbol
  if (house.patio) { const pr = [house.patio[0] + 0.15, house.patio[1] + 0.15, house.patio[2] + 0.15, house.patio[3] + 0.15]; out.push(rect(pr, 'fill="#e9dfc8" stroke="#8d7f63" stroke-width="1.2"')); for (let y = pr[1] + 0.14; y < pr[3]; y += 0.14) out.push(line([pr[0], y], [pr[2], y], 'stroke="#c8b994" stroke-width="0.8"')); const cx = pr[2] - 1.0, cy = pr[3] - 1.0; out.push(rect([cx - 0.7, cy - 0.7, cx + 0.7, cy + 0.7], 'fill="#cfd7b6" stroke="#7d8b62" stroke-width="1.2"')); }
  // árboles (copas)
  const trees = []; const spots = [[X0 + 1.2, Y1 - 2.4], [X1 - 1.2, Y1 - 2.6], [X0 + 1.2, Y0 + 1.4], [X1 - 1.3, Y0 + 1.5], [X0 + 1.0, (Y0 + Y1) / 2], [X1 - 1.0, (Y0 + Y1) / 2 + 1]];
  for (const [x, y] of spots) if (R() < 0.85) trees.push([x + (R() - 0.5) * 0.6, y + (R() - 0.5) * 0.6, 0.7 + R() * 0.55]);
  for (const [x, y, r] of trees) { out.push(`<circle cx="${tx(x)}" cy="${ty(y)}" r="${r * S}" fill="#c9d2b0" stroke="#7d8b62" stroke-width="1.3" opacity=".95"/>`); for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2; out.push(line([x, y], [x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8], 'stroke="#8f9c74" stroke-width="0.7"')); } out.push(`<circle cx="${tx(x)}" cy="${ty(y)}" r="2" fill="#5f6b47"/>`); }
  // Solados
  for (const r of house.rooms) {
    const cr = [r.cx0, r.cy0, r.cx1, r.cy1];
    const wet = ['bath', 'suite', 'toil', 'lav', 'kitchen', 'kitchenette'].includes(r.type);
    out.push(rect(cr, `fill="${wet ? '#f1efe9' : '#f3ead9'}"`));
    if (wet) { const s = r.type === 'kitchen' || r.type === 'kitchenette' ? 0.45 : 0.3; for (let x = cr[0] + s; x < cr[2] - 1e-3; x += s) out.push(line([x, cr[1]], [x, cr[3]], 'stroke="#d7d3c8" stroke-width="0.7"')); for (let y = cr[1] + s; y < cr[3] - 1e-3; y += s) out.push(line([cr[0], y], [cr[2], y], 'stroke="#d7d3c8" stroke-width="0.7"')); }
    else { const horiz = (cr[2] - cr[0]) >= (cr[3] - cr[1]); const s = 0.15; if (horiz) for (let y = cr[1] + s; y < cr[3]; y += s) { out.push(line([cr[0], y], [cr[2], y], 'stroke="#e2d4b8" stroke-width="0.8"')); const off = R() * 1.4; for (let x = cr[0] + off; x < cr[2]; x += 1.4) out.push(line([x, y - s], [x, y], 'stroke="#e2d4b8" stroke-width="0.7"')); } else for (let x = cr[0] + s; x < cr[2]; x += s) { out.push(line([x, cr[1]], [x, cr[3]], 'stroke="#e2d4b8" stroke-width="0.8"')); const off = R() * 1.4; for (let y = cr[1] + off; y < cr[3]; y += 1.4) out.push(line([x - s, y], [x, y], 'stroke="#e2d4b8" stroke-width="0.7"')); } }
  }
  // Sombra suave exterior
  // Muros (poché)
  const wr = wallRects(house); for (const r of wr) out.push(rect(r, 'fill="#1f1f1d"'));
  // Ventanas
  for (const w of house.windows) { const t = w.t; if (w.h) { out.push(rect([w.a, w.c - t / 2, w.b, w.c + t / 2], 'fill="#fff" stroke="#1f1f1d" stroke-width="1.2"')); out.push(line([w.a, w.c - 0.02], [w.b, w.c - 0.02], 'stroke="#1f1f1d" stroke-width="0.9"')); out.push(line([w.a, w.c + 0.02], [w.b, w.c + 0.02], 'stroke="#1f1f1d" stroke-width="0.9"')); } else { out.push(rect([w.c - t / 2, w.a, w.c + t / 2, w.b], 'fill="#fff" stroke="#1f1f1d" stroke-width="1.2"')); out.push(line([w.c - 0.02, w.a], [w.c - 0.02, w.b], 'stroke="#1f1f1d" stroke-width="0.9"')); out.push(line([w.c + 0.02, w.a], [w.c + 0.02, w.b], 'stroke="#1f1f1d" stroke-width="0.9"')); } }
  // Puertas: hoja y barrido (hacia la izquierda del sentido del muro; bisagra según espejo)
  for (const d of house.doors) {
    const span = d.width - 0.07, dir = d.dir || 1; // dir +1: sentido creciente
    const into = house.rooms.find((r) => r.id === d.into); let sgn;
    if (into) sgn = d.h ? ((into.y0 + into.y1) / 2 > d.c ? 1 : -1) : ((into.x0 + into.x1) / 2 > d.c ? 1 : -1); else sgn = 1;
    const hingeLow = dir > 0 ? d.hingeAtStart : !d.hingeAtStart, hp = hingeLow ? d.a + 0.035 : d.b - 0.035, fp = hingeLow ? d.b - 0.035 : d.a + 0.035;
    const face = d.c + sgn * d.t / 2;
    const H = d.h ? (p) => [p, face] : (p) => [face, p], Hn = d.h ? (p, n) => [p, face + n] : (p, n) => [face + n, p];
    if (d.kind === 'double-door') { const half = (d.width - 0.07) / 2, A0 = d.a + 0.035, B0 = d.b - 0.035; out.push(line(H(A0), Hn(A0, sgn * half), 'stroke="#1f1f1d" stroke-width="2"'), line(H(B0), Hn(B0, sgn * half), 'stroke="#1f1f1d" stroke-width="2"')); const m = (A0 + B0) / 2; for (const [h0, sw] of [[A0, 1], [B0, -1]]) { const a = Hn(h0, sgn * half), b = H(m); const sweep = (d.h ? (sw > 0 ? sgn > 0 : sgn < 0) : (sw > 0 ? sgn < 0 : sgn > 0)) ? 1 : 0; out.push(`<path d="M${tx(a[0])},${ty(a[1])} A${half * S},${half * S} 0 0 ${sweep} ${tx(b[0])},${ty(b[1])}" fill="none" stroke="#6b6b66" stroke-width="0.9" stroke-dasharray="4 3"/>`); } continue; }
    out.push(line(H(hp), Hn(hp, sgn * span), 'stroke="#1f1f1d" stroke-width="2"'));
    const a = Hn(hp, sgn * span), b = H(fp); const sweep = (d.h ? (hingeLow ? sgn > 0 : sgn < 0) : (hingeLow ? sgn < 0 : sgn > 0)) ? 1 : 0;
    out.push(`<path d="M${tx(a[0])},${ty(a[1])} A${span * S},${span * S} 0 0 ${sweep} ${tx(b[0])},${ty(b[1])}" fill="none" stroke="#6b6b66" stroke-width="0.9" stroke-dasharray="4 3"/>`);
  }
  // Equipamiento
  for (const b of house.plan.blocks) {
    const nominal = b.nominalSize || [null, null];
    const { prims } = blockPrims(b.catalogId, nominal[0], nominal[1], b.point, b.rotation);
    if (b.footprint && !/^mob-mesa/.test(b.catalogId)) out.push(rect(b.footprint, 'fill="#ffffff" opacity=".88"'));
    for (const p of prims) {
      if (p.t === 'pl') out.push(`<${p.closed ? 'polygon' : 'polyline'} points="${p.pts.map((q) => tx(q.x).toFixed(1) + ',' + ty(q.y).toFixed(1)).join(' ')}" fill="${p.fill ? '#55554f' : 'none'}" stroke="#3b3b37" stroke-width="0.9"${p.dash ? ' stroke-dasharray="3 3"' : ''}/>`);
      else out.push(`<circle cx="${tx(p.c.x).toFixed(1)}" cy="${ty(p.c.y).toFixed(1)}" r="${(p.r * S).toFixed(1)}" fill="none" stroke="#3b3b37" stroke-width="0.9"/>`);
    }
  }
  // Rótulos de locales
  for (const l of house.labels) {
    out.push(`<text x="${tx(l.point[0])}" y="${ty(l.point[1])}" font-family="Helvetica,Arial,sans-serif" font-size="${0.19 * S}" font-weight="700" fill="#2b2b28" text-anchor="middle" letter-spacing="0.6">${esc(l.text)}</text>`);
    out.push(`<text x="${tx(l.point[0])}" y="${ty(l.point[1]) + 0.24 * S}" font-family="Helvetica,Arial,sans-serif" font-size="${0.15 * S}" fill="#55554f" text-anchor="middle">${esc(l.sub)}</text>`);
  }
  // Cotas generales
  const dim = (a, b, off, horiz) => {
    const tick = (p) => horiz ? line([p, off - 0.09], [p, off + 0.09], 'stroke="#2b2b28" stroke-width="1.6"') : line([off - 0.09, p], [off + 0.09, p], 'stroke="#2b2b28" stroke-width="1.6"');
    const L = b - a, txt = f2(L);
    if (horiz) out.push(line([a, off], [b, off], 'stroke="#2b2b28" stroke-width="0.9"'), tick(a), tick(b), `<text x="${tx((a + b) / 2)}" y="${ty(off + 0.08)}" font-family="Helvetica,Arial" font-size="${0.17 * S}" text-anchor="middle" fill="#2b2b28">${txt}</text>`);
    else out.push(line([off, a], [off, b], 'stroke="#2b2b28" stroke-width="0.9"'), tick(a), tick(b), `<text transform="translate(${tx(off - 0.08)},${ty((a + b) / 2)}) rotate(-90)" font-family="Helvetica,Arial" font-size="${0.17 * S}" text-anchor="middle" fill="#2b2b28">${txt}</text>`);
  };
  dim(-0.15, W + 0.15, D + 0.85, true); dim(-0.15, D + 0.15, W + 0.85, false);
  // Rótulo y escala
  const tyT = Y1 - 0.55;
  out.push(`<text x="${tx(X0 + 0.6)}" y="${ty(tyT)}" font-family="Helvetica,Arial,sans-serif" font-size="${0.34 * S}" font-weight="700" fill="#1f1f1d">${esc(meta.title)}</text>`);
  out.push(`<text x="${tx(X0 + 0.6)}" y="${ty(tyT - 0.42)}" font-family="Helvetica,Arial,sans-serif" font-size="${0.2 * S}" fill="#55554f">${esc(meta.subtitle)}</text>`);
  // escala gráfica 0-1-2-5 m y norte
  const sx = X1 - 6.0, sy = Y0 + 0.55;
  for (let i = 0; i < 5; i++) out.push(rect([sx + i, sy, sx + i + 1, sy + 0.12], `fill="${i % 2 ? '#f7f5ef' : '#1f1f1d'}" stroke="#1f1f1d" stroke-width="1"`));
  for (const m of [0, 1, 2, 5]) out.push(`<text x="${tx(sx + m)}" y="${ty(sy + 0.22)}" font-family="Helvetica,Arial" font-size="${0.15 * S}" text-anchor="middle" fill="#1f1f1d">${m}</text>`);
  const nx = X0 + 1.2, ny = Y0 + 1.0; out.push(`<circle cx="${tx(nx)}" cy="${ty(ny)}" r="${0.42 * S}" fill="none" stroke="#1f1f1d" stroke-width="1.3"/>`, poly([[nx, ny + 0.38], [nx - 0.14, ny - 0.2], [nx, ny - 0.08], [nx + 0.14, ny - 0.2]], 'fill="#1f1f1d"'), `<text x="${tx(nx)}" y="${ty(ny + 0.5)}" font-family="Helvetica,Arial" font-size="${0.2 * S}" font-weight="700" text-anchor="middle">N</text>`);
  out.push(`<text x="${tx(X1 - 0.5)}" y="${ty(Y0 + 0.2)}" font-family="Helvetica,Arial" font-size="${0.13 * S}" text-anchor="end" fill="#8a877d">CAD2D3D · blackline-cad.org · ${esc(meta.code)}</text>`);
  const MAP = { linea: { '#f7f5ef': '#ffffff', '#e8ecdc': '#ffffff', '#9aa486': '#bbbbbb', '#b9c39f': '#dadada', '#ddd8cb': '#ffffff', '#b9b2a2': '#9a9a9a', '#e9dfc8': '#ffffff', '#8d7f63': '#555555', '#c8b994': '#c4c4c4', '#c9d2b0': '#ffffff', '#7d8b62': '#555555', '#8f9c74': '#a5a5a5', '#5f6b47': '#333333', '#cfd7b6': '#ffffff', '#f1efe9': '#ffffff', '#d7d3c8': '#d6d6d6', '#f3ead9': '#ffffff', '#e2d4b8': '#e6e6e6', '#1f1f1d': '#111111' },
    gris: { '#f7f5ef': '#f1f1ef', '#e8ecdc': '#e4e4e1', '#9aa486': '#a5a5a0', '#b9c39f': '#c8c8c3', '#ddd8cb': '#d5d5d1', '#e9dfc8': '#dddcd7', '#8d7f63': '#7b7b76', '#c8b994': '#bebeb8', '#c9d2b0': '#d3d3ce', '#7d8b62': '#7a7a74', '#8f9c74': '#9c9c96', '#5f6b47': '#555552', '#cfd7b6': '#cfcfca', '#f1efe9': '#ebebe8', '#d7d3c8': '#cfcfcb', '#f3ead9': '#e8e6e1', '#e2d4b8': '#d6d3cb', '#1f1f1d': '#4d4d4a' } }[opts.style];
  if (MAP) for (let i = 0; i < out.length; i++) out[i] = out[i].replace(/#[0-9a-f]{6}/g, (h) => MAP[h] || h);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(vw * S)}" height="${Math.round(vh * S)}" viewBox="0 0 ${(vw * S).toFixed(0)} ${(vh * S).toFixed(0)}">${out.join('\n')}</svg>`;
}
module.exports = { render, wallRects };
