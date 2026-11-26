/* Genera más plantas de baños y cocinas para el catálogo ARQASSIST (assets/arq-catalogue/v1).
   Usa el mismo motor que el programa (architecture/blackline-engine.js) y las mismas miniaturas.
   Uso: node research/arq-catalogue/generate-more.js [--write] */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const E = require(path.join(ROOT, 'architecture/blackline-engine.js'));
const LIB = require(path.join(ROOT, 'assets/cad2d-arq-generators.js'));
const DIR = path.join(ROOT, 'assets/arq-catalogue/v1');
const index = JSON.parse(fs.readFileSync(path.join(DIR, 'index.json'), 'utf8'));
const WRITE = process.argv.includes('--write');

const LABEL = { toilet: 'inodoro', toiletCompact: 'inodoro compacto', bidet: 'bidet', basin: 'lavatorio', basin45: 'lavatorio compacto', shower: 'ducha', shower75: 'ducha compacta', bathtub: 'bañera', bathtub150: 'bañera 1,50', sink: 'bacha', range: 'cocina', fridge: 'heladera', island: 'isla', dishwasher: 'lavavajillas', oven: 'horno' };
const f2 = (n) => n.toFixed(2).replace('.', ',');
const BATH_SETS = [
  [['toilet', 'basin', 'shower'], 'Baño con ducha'],
  [['toilet', 'bidet', 'basin', 'shower'], 'Baño con ducha y bidet'],
  [['toilet', 'basin', 'bathtub'], 'Baño con bañera'],
  [['toilet', 'bidet', 'basin', 'bathtub'], 'Baño completo con bañera'],
  [['toilet', 'bidet', 'basin', 'bathtub', 'shower'], 'Baño principal con bañera y ducha'],
  [['toiletCompact', 'basin45', 'shower75'], 'Baño compacto con ducha'],
  [['toilet', 'basin'], 'Toilette'],
];
const BATH_SIZES = [[1.4, 2.0], [1.6, 2.0], [1.6, 2.2], [1.7, 2.3], [1.8, 2.2], [1.8, 2.6], [2.0, 2.2], [2.0, 2.4], [2.2, 2.2], [2.2, 2.4], [2.4, 2.6], [1.2, 1.5], [1.3, 1.6]];
const KIT_SETS = [
  [['sink', 'range', 'fridge'], 'Cocina'],
  [['sink', 'range', 'fridge', 'dishwasher'], 'Cocina con lavavajillas'],
  [['sink', 'range', 'fridge', 'oven'], 'Cocina con horno empotrado'],
  [['sink', 'range', 'fridge', 'dishwasher', 'oven'], 'Cocina completa'],
];
// Larger rooms leave the fixtures bunched on one wall with this engine: kept out on purpose.
const KIT_SIZES = [[2.4, 3.0], [2.6, 3.2], [2.8, 3.0], [3.0, 3.4], [3.2, 3.6]];

function sig(p) {
  const r = (n) => Math.round(n * 100);
  return JSON.stringify([p.walls.map((w) => [r(w.a[0]), r(w.a[1]), r(w.b[0]), r(w.b[1])]), p.openings.map((o) => [o.host, o.kind, r(o.offset), r(o.width)]), p.blocks.map((b) => [b.catalogId, r(b.point[0]), r(b.point[1]), b.rotation]).sort()]);
}
const have = new Set();
for (const it of index) { try { have.add(sig(JSON.parse(fs.readFileSync(path.join(DIR, it.id + '.json'), 'utf8')))); } catch (e) {} }

const { thumb } = require('./generate-more-thumb.js');

const out = [];
function tryMake(kind, W, D, fixtures, base, doorX) {
  const spec = { ...E.interpret((kind === 'bathroom' ? 'baño' : 'cocina') + ' de ' + f2(W) + ' x ' + f2(D)), width: W, depth: D, fixtures, alternatives: 1 };
  if (doorX !== undefined) spec.doorX = doorX;
  let p; try { p = E.solve(spec); } catch (e) { return; }
  if (!p || !p.blocks || p.blocks.length < fixtures.length) return;
  if (p.status === 'approximate') return;
  const s = sig(p); if (have.has(s)) return; have.add(s);
  const area = Math.round(W * D * 100) / 100;
  out.push({ kind, plan: p, name: base + ' ' + f2(W) + ' × ' + f2(D), W, D, area, roles: p.blocks.map((b) => b.role) });
}
for (const [W, D] of BATH_SIZES) for (const [fx, base] of BATH_SETS) for (const dx of [undefined]) tryMake('bathroom', W, D, fx, base, dx);
for (const [W, D] of KIT_SIZES) for (const [fx, base] of KIT_SETS) for (const dx of [undefined]) tryMake('kitchen', W, D, fx, base, dx);

// Keep a balanced selection: same name gets "· variante B/C" when the door position changes.
const seen = {};
for (const o of out) { seen[o.name] = (seen[o.name] || 0) + 1; if (seen[o.name] > 1) o.name += ' · variante ' + String.fromCharCode(64 + seen[o.name]); }
let next = Math.max(...index.map((x) => Number(x.id.slice(5)))) + 1;
const counts = { bathroom: 0, kitchen: 0 };
for (const o of out) {
  counts[o.kind]++;
  if (!WRITE) continue;
  const id = 'plan-' + String(next++).padStart(3, '0');
  fs.writeFileSync(path.join(DIR, id + '.json'), JSON.stringify(o.plan));
  fs.writeFileSync(path.join(DIR, id + '.svg'), thumb(o.plan));
  index.push({ id, name: o.name, category: o.kind, dimensions: [o.W, o.D], roomCount: 1, area: o.area, roles: o.roles, preliminary: false, format: 'cad' });
}
if (WRITE) fs.writeFileSync(path.join(DIR, 'index.json'), JSON.stringify(index));
console.log('nuevas', counts, WRITE ? 'escritas' : '(simulación)');
if (process.argv.includes('--check')) { const p = JSON.parse(fs.readFileSync(path.join(DIR, 'plan-005.json'), 'utf8')); console.log('thumb igual al original:', thumb(p) === fs.readFileSync(path.join(DIR, 'plan-005.svg'), 'utf8')); }
console.log(out.slice(0, 12).map((o) => o.name).join('\n'));
