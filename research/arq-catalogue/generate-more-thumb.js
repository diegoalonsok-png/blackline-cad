/* Miniatura SVG de una planta blackline.architecture.v1 — idéntica a la de la galería (cad-arq-pro.js). */
const path = require('path');
const LIB = require(path.join(__dirname, '..', '..', 'assets/cad2d-arq-generators.js'));
/* --- thumbnails: same code as cad-arq-pro.js (svgFor + arqPlanThumbnail) --- */
const P = (x, y) => ({ x, y });
function svgFor(id, W, D) {
  const { entities } = LIB.build(id, W, D), b = LIB.bounds(entities);
  const w = Math.max(.01, b.maxX - b.minX), h = Math.max(.01, b.maxY - b.minY), sw = Math.max(w, h) / 160;
  let body = '';
  const pt = (q) => q.x.toFixed(4) + ',' + (-q.y).toFixed(4);
  for (const e of entities) {
    const a = (e.linetype === 'DASHED' ? ` stroke-dasharray="${(sw * 4).toFixed(4)} ${(sw * 3).toFixed(4)}"` : '') + (e.width && e.width > .15 ? ` stroke-width="${(sw * 2.2).toFixed(4)}"` : '');
    if (e.type === 'line') body += `<line x1="${e.a.x}" y1="${-e.a.y}" x2="${e.b.x}" y2="${-e.b.y}"${a}/>`;
    else if (e.type === 'rect') body += `<rect x="${Math.min(e.a.x, e.b.x)}" y="${-Math.max(e.a.y, e.b.y)}" width="${Math.abs(e.b.x - e.a.x)}" height="${Math.abs(e.b.y - e.a.y)}"${a}/>`;
    else if (e.type === 'polyline') body += `<${e.closed ? 'polygon' : 'polyline'} points="${e.pts.map(pt).join(' ')}"${a}/>`;
    else if (e.type === 'circle') body += `<circle cx="${e.c.x}" cy="${-e.c.y}" r="${e.r}"${a}/>`;
    else if (e.type === 'ellipse') body += `<ellipse cx="${e.c.x}" cy="${-e.c.y}" rx="${e.rx}" ry="${e.ry}" transform="rotate(${(-(e.rotation || 0) * 180 / Math.PI).toFixed(3)} ${e.c.x} ${-e.c.y})"${a}/>`;
    else if (e.type === 'arc') {
      let sweep = e.a1 - e.a0; while (sweep <= 0) sweep += Math.PI * 2;
      const s0 = P(e.c.x + e.r * Math.cos(e.a0), e.c.y + e.r * Math.sin(e.a0)), s1 = P(e.c.x + e.r * Math.cos(e.a1), e.c.y + e.r * Math.sin(e.a1));
      body += `<path d="M${pt(s0)} A${e.r} ${e.r} 0 ${sweep > Math.PI ? 1 : 0} 0 ${pt(s1)}"${a}/>`;
    } else if (e.type === 'hatch' && e.pts && e.pts.length > 2) body += `<polygon points="${e.pts.map(pt).join(' ')}" fill="currentColor" stroke="none"/>`;
    else if (e.type === 'text') body += `<text x="${e.p.x}" y="${-e.p.y}" font-size="${e.h}" fill="currentColor" fill-opacity=".75" stroke="none" font-family="Arial" transform="rotate(${-(e.rotation || 0)} ${e.p.x} ${-e.p.y})">${String(e.text).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</text>`;
  }
  return { body, sw };
}
function thumb(plan) {
  const xs = plan.walls.flatMap((w) => [w.a[0] - w.thickness / 2, w.b[0] + w.thickness / 2, w.a[0] + w.thickness / 2, w.b[0] - w.thickness / 2]);
  const ys = plan.walls.flatMap((w) => [w.a[1] - w.thickness / 2, w.b[1] + w.thickness / 2, w.a[1] + w.thickness / 2, w.b[1] - w.thickness / 2]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys), pad = .23;
  let body = '';
  for (const w of plan.walls) {
    const L = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]), ux = (w.b[0] - w.a[0]) / L, uy = (w.b[1] - w.a[1]) / L, pt = (t) => [w.a[0] + ux * t, -w.a[1] - uy * t];
    const ops = plan.openings.filter((o) => o.host === w.id).sort((a, b) => a.offset - b.offset); let at = 0;
    const line = (a, b) => { if (b > a) body += '<line x1="' + pt(a)[0] + '" y1="' + pt(a)[1] + '" x2="' + pt(b)[0] + '" y2="' + pt(b)[1] + '" stroke="#53575a" stroke-width="' + w.thickness + '" stroke-linecap="butt"/>'; };
    for (const o of ops) {
      const a = o.offset - o.width / 2, b = o.offset + o.width / 2; line(at, a); const [x, y] = pt(a), angle = -Math.atan2(uy, ux) * 180 / Math.PI;
      if (o.kind === 'swing-door') body += '<g transform="translate(' + x + ' ' + y + ') rotate(' + angle + ')" stroke="#74716b" stroke-width=".012" fill="none"><path d="M0 0 V-' + o.width + ' M0 -' + o.width + ' A' + o.width + ' ' + o.width + ' 0 0 1 ' + o.width + ' 0"/></g>';
      else body += '<g transform="translate(' + x + ' ' + y + ') rotate(' + angle + ')" stroke="#69949b" stroke-width=".018"><path d="M0 -.025 H' + o.width + ' M0 .025 H' + o.width + '"/></g>';
      at = b;
    }
    line(at, L);
    for (const [x, y] of [w.a, w.b]) body += '<rect x="' + (x - w.thickness / 2) + '" y="' + (-y - w.thickness / 2) + '" width="' + w.thickness + '" height="' + w.thickness + '" fill="#53575a"/>';
  }
  for (const b of plan.blocks) {
    const { body: g, sw } = svgFor(b.catalogId, ...b.nominalSize);
    body += '<g transform="translate(' + b.point[0] + ' ' + (-b.point[1]) + ') rotate(' + (-b.rotation) + ')" color="#343e40"><g fill="none" stroke="currentColor" stroke-width="' + sw.toFixed(4) + '" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke">' + g + '</g></g>';
  }
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + [minX - pad, -maxY - pad, maxX - minX + 2 * pad, maxY - minY + 2 * pad].join(' ') + '" style="width:100%;height:142px;display:block;background:#f4efe3;border-radius:4px" role="img" aria-label="Planta arquitectónica">' + body + '</svg>';
}

module.exports = { thumb };
