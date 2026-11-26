/* Plantas CAD editables de baños especiales y cocinas industriales para el catálogo ARQASSIST.
   Escribe JSON blackline.architecture.v1 + miniatura SVG (misma función que la galería).
   Medidas de referencia habituales (Neufert / Ley 24.314 y Decreto 914/97 para accesibilidad):
   - Baño accesible: círculo libre Ø 1,50 m; espacio de transferencia ≥ 0,80 m junto al inodoro;
     eje del inodoro a 0,45–0,50 m del muro con barral; puerta ≥ 0,80 m libres (se dibuja 0,90 m).
   - Cabina de inodoro pública: 0,90 × 1,50 m; puerta 0,65 m.  Mingitorios cada 0,70 m.
   - Lavatorios en batería cada 0,70 m.  Duchas en cabina 0,90 × 0,90 m (+ 0,10 de tabique).
   - Vestuario: lockers 0,40 m de frente; banco 0,40 m; circulación ≥ 1,20 m.
   - Cocina industrial: líneas de trabajo de 0,70–0,85 m; pasillo entre líneas ≥ 1,20 m (1,50 donde
     se cruzan dos personas); zonas recepción → frío → preparación → cocción → lavado.
   Son anteproyectos: verificar siempre con la normativa local.
   Uso: node research/arq-catalogue/compose-special.js [--write] */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const DIR = path.join(ROOT, 'assets/arq-catalogue/v1');
const LIB = require(path.join(ROOT, 'assets/cad2d-arq-generators.js'));
const WRITE = process.argv.includes('--write');
const index = JSON.parse(fs.readFileSync(path.join(DIR, 'index.json'), 'utf8'));
const byId = Object.fromEntries(LIB.library.map((x) => [x.id, x]));
const T = 0.15, PT = 0.08; // exterior wall, partition (CAD2D walls: 0,08–0,50 m)
// Search tags in the same bilingual form as assets/arq-room-cad (matched by cad-block-browser roomTermsMatch).
const TAG = { accesible: 'accesible accessible discapacitados wheelchair silla de ruedas publico public', publico: 'publico public teatro theatre theater auditorio auditorium cine cinema oficina office', gimnasio: 'gym gimnasio vestuario locker deportivo sports club duchas shower', industrial: 'industrial comercial commercial restaurante restaurant gastronomia catering' };
const tagText = (t) => Object.keys(TAG).filter((k) => t.includes(k)).map((k) => TAG[k]).join(' ') + (t.includes('damas') ? ' damas women' : '') + (t.includes('caballeros') ? ' caballeros men' : '');

function Plan(kind, W, D) {
  const p = { schema: 'blackline.architecture.v1', units: 'm', walls: [], openings: [], blocks: [], rooms: [], virtualDimensions: [], connections: [], variants: [{ id: 'v0', number: 1 }] };
  const X0 = T, Y0 = T, X1 = T + W, Y1 = T + D, h = T / 2;
  p.walls.push(
    { id: 'v0-side0', a: [h, h], b: [h, Y1 + h], thickness: T, layer: 'WALLS', join: 'native' },
    { id: 'v0-side1', a: [X1 + h, h], b: [X1 + h, Y1 + h], thickness: T, layer: 'WALLS', join: 'native' },
    { id: 'v0-front0', a: [h, h], b: [X1 + h, h], thickness: T, layer: 'WALLS', join: 'native' },
    { id: 'v0-back0', a: [h, Y1 + h], b: [X1 + h, Y1 + h], thickness: T, layer: 'WALLS', join: 'native' });
  p.rooms.push({ id: 'v0-room0', kind, clearBounds: [X0, Y0, W, D] });
  const api = {
    p, X0, Y0, X1, Y1, W, D,
    door(host, centerAlong, width = 0.9) { const w = p.walls.find((q) => q.id === host); const along = Math.abs(w.a[0] - w.b[0]) > 1e-9 ? centerAlong - w.a[0] : centerAlong - w.a[1]; p.openings.push({ host, kind: 'swing-door', offset: +along.toFixed(4), width, layer: 'OPENINGS' }); },
    window(host, centerAlong, width = 1.2) { const w = p.walls.find((q) => q.id === host); const along = Math.abs(w.a[0] - w.b[0]) > 1e-9 ? centerAlong - w.a[0] : centerAlong - w.a[1]; p.openings.push({ host, kind: 'framed-window', offset: +along.toFixed(4), width, layer: 'OPENINGS' }); },
    wall(id, a, b, th = PT) { p.walls.push({ id, a, b, thickness: th, layer: th < 0.1 ? 'PARTITIONS' : 'WALLS', join: 'native' }); return id; },
    // Fixture with its back (local y = 0) against a face: side S|N|W|E, at coordinate `at` along that face.
    put(catalogId, side, at, face, role, size) {
      const it = byId[catalogId]; if (!it) throw Error('bloque ' + catalogId);
      const [w, d] = size || [it.w, it.d];
      let point, rotation, env;
      if (side === 'S') { point = [at, face]; rotation = 0; env = [at, face, w, d]; }
      else if (side === 'N') { point = [at + w, face]; rotation = 180; env = [at, face - d, w, d]; }
      else if (side === 'W') { point = [face, at + w]; rotation = 270; env = [face, at, d, w]; }
      else { point = [face, at]; rotation = 90; env = [face - d, at, d, w]; }
      p.blocks.push({ catalogId, role: role || catalogId, point: point.map((v) => +v.toFixed(4)), rotation, scale: 1, layer: /^(?:mob|per)-/.test(catalogId) ? 'FURNITURE' : /^kq-/.test(catalogId) ? 'EQUIPMENT' : 'FIXTURES', envelope: env.map((v) => +v.toFixed(4)), nominalSize: [w, d] });
      return env;
    },
  };
  return api;
}
// Row of toilet cabins against the north face, from x0; returns right edge.
function cabins(A, x0, n, { w = 0.9, d = 1.5, door = 0.65, id = 'cab' } = {}) {
  const yf = A.Y1 - d;
  for (let i = 0; i < n; i++) {
    const x = x0 + i * (w + PT);
    A.put('san-wc', 'N', x + (w - 0.4) / 2, A.Y1, 'toilet');
    if (i > 0 || x0 > A.X0 + 1e-6) A.wall(id + '-div' + i, [x - PT / 2, yf], [x - PT / 2, A.Y1]);
  }
  const xr = x0 + n * (w + PT) - PT;
  if (xr < A.X1 - 1e-6) A.wall(id + '-div' + n, [xr + PT / 2, yf], [xr + PT / 2, A.Y1]);
  const fid = A.wall(id + '-front', [x0 - (x0 > A.X0 + 1e-6 ? PT : 0), yf + PT / 2], [xr + (xr < A.X1 - 1e-6 ? PT : 0), yf + PT / 2]);
  const fw = A.p.walls.find((q) => q.id === fid);
  for (let i = 0; i < n; i++) { const cx = x0 + i * (w + PT) + w / 2; A.p.openings.push({ host: fid, kind: 'swing-door', offset: +(cx - fw.a[0]).toFixed(4), width: door, layer: 'OPENINGS' }); }
  return xr + PT;
}
function showers(A, x0, n, { w = 0.9, d = 0.9, id = 'duc' } = {}) {
  for (let i = 0; i < n; i++) {
    const x = x0 + i * (w + PT);
    A.put('san-ducha', 'N', x, A.Y1, 'shower', [w, d]);
    A.wall(id + '-div' + i, [x - PT / 2, A.Y1 - d - 0.1], [x - PT / 2, A.Y1]);
  }
  const xr = x0 + n * (w + PT) - PT;
  if (xr < A.X1 - 1e-6) A.wall(id + '-div' + n, [xr + PT / 2, A.Y1 - d - 0.1], [xr + PT / 2, A.Y1]);
  return xr + PT;
}
const P = [];
const add = (name, category, A, extra = {}) => {
  const [x, y, w, d] = A.p.rooms[0].clearBounds;
  A.p.virtualDimensions.push({ room: 'v0-room0', axis: 'width', value: w, between: ['v0-side0', 'v0-side1'], editable: false }, { room: 'v0-room0', axis: 'depth', value: d, between: ['v0-front0', 'v0-back0'], editable: false });
  A.p.brief = { kind: category, width: w, depth: d, wall: T, ...extra.brief };
  A.p.assumptions = extra.notes || [];
  A.p.status = 'reference';
  P.push({ name, category, plan: A.p, W: w, D: d, roles: A.p.blocks.map((b) => b.role), tags: extra.tags || [] });
};

/* ---------- Baños accesibles ---------- */
{ const A = Plan('bathroom', 1.9, 2.2);
  A.put('san-wc', 'N', A.X0 + 0.475 - 0.2, A.Y1, 'toilet');            // eje a 0,475 m del muro con barral
  A.put('san-lav-acc', 'E', A.Y0 + 0.35, A.X1, 'basin');
  A.put('per-silla-ruedas', 'S', A.X0 + 0.85, A.Y0 + 1.0, 'wheelchair');
  A.door('v0-front0', A.X0 + 0.6, 0.9); A.window('v0-back0', A.X0 + 1.4, 0.6);
  add('Baño accesible 1,90 × 2,20 · inodoro + lavatorio · giro Ø1,50', 'bathroom', A, { tags: ['accesible', 'discapacitados'], notes: ['Círculo libre Ø 1,50 m; transferencia lateral 0,80 m; barrales a 0,75 m; puerta 0,90 m (abrir hacia afuera o corrediza).'] }); }
{ const A = Plan('bathroom', 2.2, 2.2);
  A.put('san-wc', 'W', A.Y1 - 0.475 - 0.2, A.X0, 'toilet');
  A.put('san-ducha-piso', 'N', A.X1 - 1.0, A.Y1, 'shower', [1.0, 1.0]);
  A.put('san-lav-acc', 'E', A.Y0 + 0.2, A.X1, 'basin');
  A.door('v0-front0', A.X0 + 0.65, 0.9); A.window('v0-back0', A.X0 + 0.9, 0.6);
  add('Baño accesible 2,20 × 2,20 · ducha a piso con banco', 'bathroom', A, { tags: ['accesible', 'discapacitados'], notes: ['Ducha sin resalto con banco rebatible y barrales; círculo Ø 1,50 m libre.'] }); }
{ const A = Plan('bathroom', 2.4, 2.6);
  A.put('san-wc', 'N', A.X0 + 0.475 - 0.2, A.Y1, 'toilet');
  A.put('san-ducha-piso', 'N', A.X1 - 1.0, A.Y1, 'shower', [1.0, 1.0]);
  A.put('san-lav-acc', 'E', A.Y0 + 0.3, A.X1, 'basin');
  A.put('per-silla-ruedas', 'S', A.X0 + 1.1, A.Y0 + 1.0, 'wheelchair');
  A.door('v0-front0', A.X0 + 0.65, 0.9);
  A.window('v0-side0', A.Y0 + 1.6, 0.6);
  add('Baño accesible 2,40 × 2,60 · inodoro, lavatorio y ducha', 'bathroom', A, { tags: ['accesible', 'discapacitados'], notes: ['Transferencia lateral 0,80 m a la derecha del inodoro; giro Ø 1,50 m.'] }); }

/* ---------- Sanitarios públicos (teatro, auditorio, oficinas) ---------- */
{ const A = Plan('bathroom', 6.0, 4.0);
  cabins(A, A.X0, 6);
  for (let i = 0; i < 4; i++) A.put('san-lav-pie', 'S', A.X1 - 0.15 - (i + 1) * 0.7 + 0.075, A.Y0, 'basin');
  A.door('v0-front0', A.X0 + 0.7, 0.9);
  A.window('v0-side1', A.Y0 + 2.0, 1.0);
  add('Sanitario público damas · 6 inodoros + 4 lavatorios (teatro)', 'bathroom', A, { tags: ['publico', 'teatro', 'damas'] }); }
{ const A = Plan('bathroom', 6.0, 4.0);
  const xr = cabins(A, A.X0, 3);
  for (let i = 0; i < 4; i++) { const x = xr + 0.25 + i * 0.7; A.put('san-mingitorio', 'N', x, A.Y1, 'urinal'); if (i) A.wall('ming-div' + i, [x - 0.17, A.Y1 - 0.45], [x - 0.17, A.Y1]); }
  for (let i = 0; i < 3; i++) A.put('san-lav-pie', 'S', A.X1 - 0.15 - (i + 1) * 0.7 + 0.075, A.Y0, 'basin');
  A.door('v0-front0', A.X0 + 0.7, 0.9);
  A.window('v0-side1', A.Y0 + 2.0, 1.0);
  add('Sanitario público caballeros · 3 inodoros + 4 mingitorios + 3 lavatorios (teatro)', 'bathroom', A, { tags: ['publico', 'teatro', 'caballeros'] }); }
{ const A = Plan('bathroom', 3.6, 3.2);
  cabins(A, A.X0, 2);
  A.put('san-mingitorio', 'N', A.X0 + 2.2, A.Y1, 'urinal'); A.put('san-mingitorio', 'N', A.X0 + 2.9, A.Y1, 'urinal');
  A.put('san-lav-pie', 'S', A.X1 - 0.7, A.Y0, 'basin'); A.put('san-lav-pie', 'S', A.X1 - 1.4, A.Y0, 'basin');
  A.door('v0-front0', A.X0 + 0.6, 0.9);
  A.window('v0-side1', A.Y0 + 1.6, 0.8);
  add('Sanitario público mixto chico · 2 inodoros + 2 mingitorios + 2 lavatorios', 'bathroom', A, { tags: ['publico', 'oficinas'] }); }
{ const A = Plan('bathroom', 8.0, 4.2);
  cabins(A, A.X0, 8);
  for (let i = 0; i < 6; i++) A.put('san-lav-pie', 'S', A.X1 - 0.15 - (i + 1) * 0.7 + 0.075, A.Y0, 'basin');
  A.door('v0-front0', A.X0 + 0.7, 1.0);
  A.window('v0-side1', A.Y0 + 2.1, 1.2);
  add('Sanitario público damas grande · 8 inodoros + 6 lavatorios (teatro, estadio)', 'bathroom', A, { tags: ['publico', 'teatro', 'damas'] }); }

/* ---------- Vestuarios de gimnasio ---------- */
{ const A = Plan('bathroom', 6.4, 5.0);
  let x = cabins(A, A.X0, 2);
  x = showers(A, x + 0.3, 4);
  for (let i = 0; i < 3; i++) A.put('san-lav-pie', 'E', A.Y0 + 0.3 + i * 0.7, A.X1, 'basin');
  for (let i = 0; i < 7; i++) A.put('mob-locker', 'W', A.Y0 + 0.2 + i * 0.4, A.X0, 'locker');
  A.put('mob-banco-vest', 'S', A.X0 + 1.4, A.Y0 + 1.4, 'bench'); A.put('mob-banco-vest', 'S', A.X0 + 1.4, A.Y0 + 0.35 + 0.05, 'bench');
  A.door('v0-front0', A.X0 + 4.2, 0.9);
  A.window('v0-front0', A.X0 + 1.9, 1.2);
  add('Vestuario de gimnasio 6,40 × 5,00 · 4 duchas, 2 inodoros, 3 lavatorios, 7 lockers', 'bathroom', A, { tags: ['gimnasio', 'vestuario', 'club'] }); }
{ const A = Plan('bathroom', 8.2, 6.0);
  let x = cabins(A, A.X0, 3);
  x = showers(A, x + 0.25, 5);
  A.put('san-mingitorio', 'E', A.Y0 + 3.0, A.X1, 'urinal'); A.put('san-mingitorio', 'E', A.Y0 + 3.7, A.X1, 'urinal');
  for (let i = 0; i < 4; i++) A.put('san-lav-pie', 'E', A.Y0 + 0.2 + i * 0.7, A.X1, 'basin');
  for (let i = 0; i < 10; i++) A.put('mob-locker', 'W', A.Y0 + 0.2 + i * 0.4, A.X0, 'locker');
  for (let i = 0; i < 6; i++) A.put('mob-locker', 'S', A.X0 + 0.9 + i * 0.4, A.Y0, 'locker');
  A.put('mob-banco-vest', 'S', A.X0 + 1.6, A.Y0 + 2.0, 'bench'); A.put('mob-banco-vest', 'S', A.X0 + 3.3, A.Y0 + 2.0, 'bench');
  A.door('v0-front0', A.X0 + 4.6, 1.0);
  A.window('v0-side1', A.Y0 + 4.6, 1.0);
  add('Vestuario de gimnasio 8,20 × 6,00 · 5 duchas, 3 inodoros, 2 mingitorios, 4 lavatorios, 16 lockers', 'bathroom', A, { tags: ['gimnasio', 'vestuario', 'club'] }); }

/* ---------- Cocinas industriales ---------- */
{ const A = Plan('kitchen', 6.0, 4.0);
  let x = A.X0; for (const [id, w] of [['kq-industrial-fridge', 1.4], ['kq-industrial-prep', 1.8], ['kq-industrial-range', 1.2], ['kq-industrial-wash', 1.6]]) { A.put(id, 'N', x, A.Y1, id.slice(14)); x += w; }
  A.put('kq-industrial-prep', 'S', A.X1 - 1.8, A.Y0, 'prep'); A.put('kq-industrial-prep', 'S', A.X1 - 3.6, A.Y0, 'prep');
  A.door('v0-front0', A.X0 + 0.7, 1.0);
  A.window('v0-side0', A.Y0 + 2.0, 1.2);
  add('Cocina industrial 6,00 × 4,00 · línea simple + mesada de apoyo', 'kitchen', A, { tags: ['industrial', 'gastronomica', 'restaurante'], notes: ['Pasillo libre 1,40 m entre líneas de trabajo.'] }); }
{ const A = Plan('kitchen', 8.0, 6.0);
  let x = A.X0; for (const [id, w] of [['kq-industrial-fridge', 1.4], ['kq-industrial-fridge', 1.4], ['kq-industrial-range', 1.2], ['kq-industrial-range', 1.2], ['kq-industrial-prep', 1.8]]) { A.put(id, 'N', x, A.Y1, id.slice(14)); x += w; }
  A.put('kq-industrial-wash', 'S', A.X1 - 1.6, A.Y0, 'wash'); A.put('kq-industrial-prep', 'S', A.X1 - 3.4, A.Y0, 'prep');
  A.put('kq-industrial-prep', 'S', A.X0 + 2.0, A.Y0 + 2.25, 'prep'); A.put('kq-industrial-prep', 'N', A.X0 + 2.0, A.Y0 + 3.75, 'prep');
  A.put('kq-industrial-prep', 'S', A.X0 + 3.8, A.Y0 + 2.25, 'prep'); A.put('kq-industrial-prep', 'N', A.X0 + 3.8, A.Y0 + 3.75, 'prep');
  A.door('v0-front0', A.X0 + 0.8, 1.0); A.door('v0-side1', A.Y0 + 3.0, 1.0);
  A.window('v0-side0', A.Y0 + 3.0, 1.5);
  add('Cocina industrial 8,00 × 6,00 · doble línea + isla central de preparación', 'kitchen', A, { tags: ['industrial', 'gastronomica', 'restaurante'], notes: ['Pasillos de 1,40–1,50 m; isla de preparación doble enfrentada.'] }); }
{ const A = Plan('kitchen', 10.0, 7.0);
  // recepción y frío al oeste, preparación al centro, cocción al norte, lavado al este
  for (let i = 0; i < 3; i++) A.put('kq-industrial-fridge', 'W', A.Y0 + 1.6 + i * 1.4, A.X0, 'fridge');
  let x = A.X0 + 1.3; for (const id of ['kq-industrial-prep', 'kq-industrial-range', 'kq-industrial-range', 'kq-industrial-range', 'kq-industrial-prep']) { A.put(id, 'N', x, A.Y1, id.slice(14)); x += byId[id].w; }
  A.put('kq-industrial-prep', 'S', A.X0 + 2.6, A.Y0 + 3.2, 'prep'); A.put('kq-industrial-prep', 'N', A.X0 + 2.6, A.Y0 + 4.7, 'prep');
  A.put('kq-industrial-prep', 'S', A.X0 + 4.4, A.Y0 + 3.2, 'prep'); A.put('kq-industrial-prep', 'N', A.X0 + 4.4, A.Y0 + 4.7, 'prep');
  A.put('kq-industrial-wash', 'E', A.Y0 + 0.4, A.X1, 'wash'); A.put('kq-industrial-wash', 'E', A.Y0 + 2.0, A.X1, 'wash');
  A.put('kq-industrial-prep', 'S', A.X0 + 3.0, A.Y0, 'prep'); A.put('kq-industrial-prep', 'S', A.X0 + 4.8, A.Y0, 'prep');
  A.door('v0-front0', A.X0 + 1.4, 1.2); A.door('v0-side1', A.Y0 + 4.6, 1.0);
  A.window('v0-front0', A.X0 + 7.5, 1.5);
  add('Cocina de restaurante 10,00 × 7,00 · recepción, frío, preparación, cocción y lavado', 'kitchen', A, { tags: ['industrial', 'gastronomica', 'restaurante'], notes: ['Circuito lineal: recepción → cámara/frío → preparación → cocción → pase; lavado separado.'] }); }

/* ---------- comprobaciones ---------- */
function overlap(a, b) { return a[0] < b[0] + b[2] - 1e-6 && b[0] < a[0] + a[2] - 1e-6 && a[1] < b[1] + b[3] - 1e-6 && b[1] < a[1] + a[3] - 1e-6; }
let bad = 0;
for (const o of P) {
  const [x, y, w, d] = o.plan.rooms[0].clearBounds;
  for (const b of o.plan.blocks) {
    const e = b.envelope, it = byId[b.catalogId];
    if (e[0] < x - 1e-6 || e[1] < y - 1e-6 || e[0] + e[2] > x + w + 1e-6 || e[1] + e[3] > y + d + 1e-6) { bad++; console.log('FUERA', o.name, b.catalogId, e); }
    if (b.nominalSize[0] < it.wMin - 1e-8 || b.nominalSize[0] > it.wMax + 1e-8 || b.nominalSize[1] < it.dMin - 1e-8 || b.nominalSize[1] > it.dMax + 1e-8) { bad++; console.log('MEDIDA', o.name, b.catalogId, b.nominalSize, [it.wMin, it.wMax, it.dMin, it.dMax]); }
  }
  const bl = o.plan.blocks.filter((b) => b.role !== 'wheelchair');
  for (let i = 0; i < bl.length; i++) for (let j = i + 1; j < bl.length; j++) if (overlap(bl[i].envelope, bl[j].envelope)) { bad++; console.log('CHOQUE', o.name, bl[i].catalogId, bl[j].catalogId); }
  for (const w of o.plan.walls) if (w.thickness < 0.08 || Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]) <= 0.1) { bad++; console.log('MURO', o.name, w.id); }
  for (const op of o.plan.openings) { const wl = o.plan.walls.find((q) => q.id === op.host), L = Math.hypot(wl.b[0] - wl.a[0], wl.b[1] - wl.a[1]); if (op.offset - op.width / 2 <= wl.thickness / 2 || op.offset + op.width / 2 >= L - wl.thickness / 2) { bad++; console.log('ABERTURA', o.name, op); } }
}
console.log(P.length, 'plantas ·', bad, 'problemas');
if (WRITE && !bad) {
  const gen = require('./generate-more-thumb.js');
  let next = Math.max(...index.map((x) => Number(x.id.slice(5)))) + 1;
  for (const o of P) {
    if (index.some((x) => x.name === o.name)) continue;
    const id = 'plan-' + String(next++).padStart(3, '0');
    fs.writeFileSync(path.join(DIR, id + '.json'), JSON.stringify(o.plan));
    fs.writeFileSync(path.join(DIR, id + '.svg'), gen.thumb(o.plan));
    index.push({ id, name: o.name, category: o.category, dimensions: [o.W, o.D], roomCount: 1, area: Math.round(o.W * o.D * 100) / 100, roles: o.roles, preliminary: false, format: 'cad', tags: tagText(o.tags) });
  }
  fs.writeFileSync(path.join(DIR, 'index.json'), JSON.stringify(index));
  console.log('escritas');
}
