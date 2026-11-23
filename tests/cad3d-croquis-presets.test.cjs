const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('cad3d-lab.js', 'utf8');
function section(start, end) {
 const a = source.indexOf(start);
 const b = source.indexOf(end, a + start.length);
 assert(a >= 0 && b > a, 'Missing source section: ' + start);
 return source.slice(a, b);
}
const registry = section('const CAD3D_VISUAL_STYLES=', 'function renderStyleControls()');
const presetApi = vm.runInNewContext(registry + '\n({CAD3D_SKETCH_PRESETS,CAD3D_VISUAL_STYLES,isCad3DSketch})', {});
const names = ['sketch','sketch-pencil','sketch-ink','sketch-marker','sketch-watercolor','sketch-mono','sketch-blueprint'];
test('Seven Croquis presets registered with materials and labels', () => {
 assert(Object.keys(presetApi.CAD3D_SKETCH_PRESETS).length >= names.length);
 for(const name of names) {
  assert(presetApi.CAD3D_VISUAL_STYLES[name], name);
  assert.equal(presetApi.isCad3DSketch(name), true);
  const p = presetApi.CAD3D_SKETCH_PRESETS[name];
  assert([p.bg,p.ground,p.fill,p.edge,p.alpha].every(Number.isFinite));
 }
 assert.equal(presetApi.isCad3DSketch('shaded'), false);
});
test('Visual Style gallery still contains the seven core Croquis choices', () => {
 const gallery = section("['Técnico','wire2d'", "].map(function(st){return '<button type=\"button\" data-render-family=");
 assert(gallery.includes('sketch-pencil'));
 for(const name of names) {
  assert(gallery.includes("'"+name+"'"),'Missing core style: '+name);
 }
 assert(source.includes('data-render-style'));
});
test('Croquis retains the solar shadow ground and turns on sun', () => {
 const sunlight = section('function applySunSettings(){', 'function toggleDraftMode(');
 const styles = section('function applyRenderStyle(){', 'function exportViewPNG()');
 assert(!sunlight.includes("!['sketch','hidden','wire2d','wire3d'].includes(renderStyle)"));
 assert(!styles.includes("!['sketch','hidden','wire2d','wire3d'].includes(renderStyle)"));
 assert(styles.includes('isCad3DSketch(mode))applySunSettings()'));
});
test('Changing Croquis style does not change CAD geometry', () => {
 const setStyle = section('function setVisualStyle(', 'function exportViewPNG()');
 assert(setStyle.includes('renderStyle=mode'));
 assert(!setStyle.includes('records.push('));
 assert(!setStyle.includes('records.splice('));
});
