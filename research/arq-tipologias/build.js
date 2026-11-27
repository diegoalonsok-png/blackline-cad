'use strict';
const { compose, r3 } = require('./composer.js');
const T = require('./tipologias.js');
const { ov } = require('./furnish.js');
const f2 = (n) => n.toFixed(2).replace('.', ',');

function labelsFor(h, blocks) {
  const out = [];
  const counts = {};
  for (const r of h.rooms) {
    if (r.type === 'hall' && (r.cx1 - r.cx0) * (r.cy1 - r.cy0) < 3) continue;
    let name = r.label || T.NAMES[r.main && r.type === 'dorm' ? 'main' : r.type] || r.type.toUpperCase();
    if (r.type === 'dorm' && !r.main) { counts.dorm = (counts.dorm || 0) + 1; }
    const W = 0.19 * name.length * 0.7 + 0.15, H = 0.5;
    let best = null; const cx = (r.cx0 + r.cx1) / 2, cy = (r.cy0 + r.cy1) / 2;
    for (let x = r.cx0 + W / 2 + 0.05; x <= r.cx1 - W / 2 - 0.05; x += 0.05) for (let y = r.cy0 + 0.3; y <= r.cy1 - 0.3; y += 0.05) {
      const box = [x - W / 2, y - 0.3, x + W / 2, y + 0.22];
      if (blocks.some((b) => ov(box, b.box || b.footprint))) continue;
      const d = Math.hypot(x - cx, (y - cy) * 1.2); if (!best || d < best.d) best = { d, x, y };
    }
    if (!best) best = { x: cx, y: cy };
    const area = (r.cx1 - r.cx0) * (r.cy1 - r.cy0);
    out.push({ text: name, sub: f2(area) + ' m²', point: [r3(best.x), r3(best.y)], room: r.id });
  }
  return out;
}

function build(scheme, params, meta) {
  const spec = T['scheme' + scheme](params);
  const c = compose(spec);
  const house = { ...spec, ...c };
  const { blocks, warn } = T.furnish(house);
  const plan = { schema: 'blackline.architecture.v1', units: 'm', walls: c.walls, openings: c.openings, blocks, labels: null, brief: { kind: 'house-typology', code: meta.code } };
  house.plan = plan;
  const { item } = require('./blocks.js');
  for (const b of blocks) { const it = item(b.catalogId), [w, d] = b.nominalSize || [it.w, it.d]; if (w < it.wMin - 1e-6 || w > it.wMax + 1e-6 || d < it.dMin - 1e-6 || d > it.dMax + 1e-6) c.errors.push('medida fuera de catálogo ' + b.catalogId + ' ' + w + 'x' + d); }
  house.labels = labelsFor(house, blocks);
  plan.labels = house.labels.map((l) => ({ text: l.text, sub: l.sub, point: l.point }));
  // superficie cubierta: locales a ejes + medio muro exterior + esquinas
  let outer = spec.rooms.reduce((s2, r) => s2 + (r.x1 - r.x0) * (r.y1 - r.y0), 0), per = 0;
  for (const g of c.segs) if (!g.lo || !g.hi) per += g.b - g.a;
  outer += per * 0.15 + 4 * 0.0225;
  return { house, plan, errors: c.errors, warn, area: outer };
}
module.exports = { build };
