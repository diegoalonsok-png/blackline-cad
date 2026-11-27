/* Genera el catálogo publicado: assets/arq-tipologias/v1/
 *   index.json · <código>.json (plano insertable) · <código>.jpg (lámina) · <código>.webp (miniatura)
 *   <código>.dxf · <código>.dwg  (DXF en metros con capas, bloques y rótulos; DWG convertido con el núcleo propio)
 * Uso: node research/arq-tipologias/export.js [--limit N] */
'use strict';
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const C = require('./catalog.js');
const { render, wallRects } = require('./render.js');
const { blockPrims } = require('./blocks.js');
const ROOT = path.join(__dirname, '..', '..'), OUT = path.join(ROOT, 'assets/arq-tipologias/v1'), TMP = '/tmp/arq-tipologias';
fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(TMP, { recursive: true });
const f2 = (n) => n.toFixed(2).replace('.', ',');
const SCHEME = { A: 'Franjas · estar al frente', B: 'Pasillo central · lote angosto', L: 'En L con patio', H: 'Doble ala · estar central', M: 'Monoambiente' };
const STYLES = ['color', 'linea', 'gris'];

function doorGeom(h) {
  const out = [];
  for (const d of h.doors) {
    const into = h.rooms.find((r) => r.id === d.into); const sgn = into ? (d.h ? ((into.y0 + into.y1) / 2 > d.c ? 1 : -1) : ((into.x0 + into.x1) / 2 > d.c ? 1 : -1)) : 1;
    const face = d.c + sgn * d.t / 2, P = (along, n) => (d.h ? [along, face + n] : [face + n, along]);
    const leaves = d.kind === 'double-door' ? [[d.a + 0.035, (d.width - 0.07) / 2, 1], [d.b - 0.035, (d.width - 0.07) / 2, -1]] : (() => { const hingeLow = (d.dir || 1) > 0 ? d.hingeAtStart : !d.hingeAtStart; return [[hingeLow ? d.a + 0.035 : d.b - 0.035, d.width - 0.07, hingeLow ? 1 : -1]]; })();
    for (const [hp, span, toward] of leaves) {
      const c = P(hp, 0), open = P(hp, sgn * span), closed = P(hp + toward * span, 0);
      out.push({ t: 'line', a: c, b: open, layer: 'PUERTAS' });
      let a1 = Math.atan2(open[1] - c[1], open[0] - c[0]), a2 = Math.atan2(closed[1] - c[1], closed[0] - c[0]);
      let s = a1, e = a2; if (((e - s) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) > Math.PI) { s = a2; e = a1; }
      out.push({ t: 'arc', c, r: span, a0: s * 180 / Math.PI, a1: e * 180 / Math.PI, layer: 'PUERTAS' });
    }
  }
  return out;
}
function drawing(h, it, meta) {
  const ents = [], blocks = {};
  for (const r of wallRects(h)) ents.push({ t: 'poly', pts: [[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]]], closed: true, layer: 'MUROS', fill: true });
  for (const w of h.windows) {
    const t = w.t, L = w.h ? (y) => [[w.a, y], [w.b, y]] : (x) => [[x, w.a], [x, w.b]];
    for (const o of [-t / 2, -0.02, 0.02, t / 2]) { const [a, b] = L(w.c + o); ents.push({ t: 'line', a, b, layer: 'VENTANAS' }); }
    const ends = w.h ? [[[w.a, w.c - t / 2], [w.a, w.c + t / 2]], [[w.b, w.c - t / 2], [w.b, w.c + t / 2]]] : [[[w.c - t / 2, w.a], [w.c + t / 2, w.a]], [[w.c - t / 2, w.b], [w.c + t / 2, w.b]]];
    for (const [a, b] of ends) ents.push({ t: 'line', a, b, layer: 'VENTANAS' });
  }
  ents.push(...doorGeom(h));
  for (const b of h.plan.blocks) {
    const ns = b.nominalSize || [null, null], name = 'CAD2D3D_' + b.catalogId.toUpperCase().replace(/[^A-Z0-9]+/g, '_') + (b.nominalSize ? '_' + Math.round(ns[0] * 100) + 'x' + Math.round(ns[1] * 100) : '');
    if (!blocks[name]) blocks[name] = blockPrims(b.catalogId, ns[0], ns[1], [0, 0], 0).prims.map((p) => (p.t === 'pl' ? { t: 'poly', pts: p.pts.map((q) => [q.x, q.y]), closed: !!p.closed, fill: !!p.fill } : { t: 'circle', c: [p.c.x, p.c.y], r: p.r }));
    ents.push({ t: 'insert', name, p: b.point, rot: b.rotation, layer: b.layer === 'FIXTURES' ? 'SANITARIOS' : b.layer === 'KITCHEN' ? 'COCINA' : 'EQUIPAMIENTO' });
  }
  for (const r of h.rooms) ents.push({ t: 'poly', pts: [[r.cx0, r.cy0], [r.cx1, r.cy0], [r.cx1, r.cy1], [r.cx0, r.cy1]], closed: true, layer: 'LOCALES' });
  for (const l of h.labels) { ents.push({ t: 'text', p: l.point, h: 0.18, s: l.text, layer: 'TEXTOS', center: true }); ents.push({ t: 'text', p: [l.point[0], l.point[1] - 0.26], h: 0.13, s: l.sub, layer: 'TEXTOS', center: true }); }
  const { W, D } = h; ents.push({ t: 'dim', a: [-0.15, D + 0.15], b: [W + 0.15, D + 0.15], off: 0.8, layer: 'COTAS' }, { t: 'dim', a: [W + 0.15, -0.15], b: [W + 0.15, D + 0.15], off: 0.8, layer: 'COTAS', vertical: true });
  ents.push({ t: 'text', p: [0, -1.2 - (h.frontPorch ? 2.2 : 0)], h: 0.3, s: meta.title, layer: 'ROTULO' }, { t: 'text', p: [0, -1.65 - (h.frontPorch ? 2.2 : 0)], h: 0.16, s: meta.subtitle + ' · CAD2D3D ' + meta.code, layer: 'ROTULO' });
  return { blocks, ents };
}

function main() {
  const lim = process.argv.includes('--limit') ? +process.argv[process.argv.indexOf('--limit') + 1] : Infinity;
  const items = C.generate(5).slice(0, lim), index = [], seen = {};
  const dxfJobs = [];
  items.forEach((it, n) => {
    const p = it.prog, letter = String.fromCharCode(97 + (seen[p.key + it.area] = (seen[p.key + it.area] ?? -1) + 1));
    const code = 'T-' + p.key + '-' + String(it.area).padStart(3, '0') + letter;
    const h = it.r.house, style = STYLES[n % 3];
    const prog = p.key === 'M' ? 'Monoambiente' : p.dorms + (p.dorms === 1 ? ' dormitorio' : ' dormitorios') + ' · ' + p.baths + (p.baths === 1 ? ' baño' : ' baños');
    const title = 'VIVIENDA ' + it.area + ' m² · ' + prog.toUpperCase();
    const subtitle = SCHEME[it.v.scheme] + ' · ' + f2(h.W + 0.3) + ' × ' + f2(h.D + 0.3) + ' m' + (it.v.p.kitchenOpen ? ' · cocina integrada' : '');
    const plan = { ...it.r.plan, name: title, code, area: it.area, rooms: h.rooms.map((r) => ({ id: r.id, kind: r.type, name: (h.labels.find((l) => l.room === r.id) || {}).text || r.type, clearBounds: [+(r.cx0).toFixed(3), +(r.cy0).toFixed(3), +(r.cx1 - r.cx0).toFixed(3), +(r.cy1 - r.cy0).toFixed(3)] })) };
    plan.blocks = plan.blocks.map(({ box, footprint, ...b }) => b);
    fs.writeFileSync(path.join(OUT, code + '.json'), JSON.stringify(plan));
    const svg = render(h, { title, subtitle, code, seed: n * 7 + 3 }, { ppm: 48, style });
    fs.writeFileSync(path.join(TMP, code + '.svg'), svg);
    execFileSync('rsvg-convert', ['-w', '1200', path.join(TMP, code + '.svg'), '-o', path.join(TMP, code + '.png')]);
    execFileSync('convert', [path.join(TMP, code + '.png'), '-quality', '72', '-sampling-factor', '4:2:0', '-strip', '-interlace', 'JPEG', path.join(OUT, code + '.jpg')]);
    execFileSync('convert', [path.join(TMP, code + '.png'), '-resize', '520x', '-quality', '72', '-strip', path.join(OUT, code + '.webp')]);
    execFileSync('convert', [path.join(TMP, code + '.png'), '-resize', '256x', path.join(TMP, code + '.prev.png')]);
    fs.writeFileSync(path.join(TMP, code + '.draw.json'), JSON.stringify(drawing(h, it, { title, subtitle, code })));
    dxfJobs.push(code);
    const counts = {}; for (const b of plan.blocks) counts[b.catalogId] = (counts[b.catalogId] || 0) + 1;
    index.push({ code, name: title.charAt(0) + title.slice(1).toLowerCase().replace('m²', 'm²'), program: p.key, dorms: p.dorms, baths: p.baths, area: it.area, dims: [+(h.W + 0.3).toFixed(2), +(h.D + 0.3).toFixed(2)], scheme: it.v.scheme, schemeName: SCHEME[it.v.scheme], kitchenOpen: !!it.v.p.kitchenOpen, style, rooms: h.labels.map((l) => l.text + ' ' + l.sub) });
    if (n % 20 === 0) process.stdout.write(n + ' ');
  });
  fs.writeFileSync(path.join(TMP, 'jobs.json'), JSON.stringify(dxfJobs));
  fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index));
  console.log('\n' + index.length + ' tipologías');
}
main();
