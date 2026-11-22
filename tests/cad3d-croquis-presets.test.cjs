const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('cad3d-lab.js','utf8');
const begin=source.indexOf('const CAD3D_VISUAL_STYLES='),end=source.indexOf('function renderStyleControls()',begin);
assert(begin>=0&&end>begin,'Missing Croquis preset registry');
const ctx={};vm.runInNewContext(source.slice(begin,end),ctx);
test('Seven Croquis presets are registered with selectable labels',()=>{
 const c=vm.runInNewContext(source.slice(begin,end)+'\n({CAD3D_SKETCH_PRESETS,CAD3D_VISUAL_STYLES,isCad3DSketch})',ctx);
 const names=Object.keys(c.CAD3D_SKETCH_PRESETS);
 assert.equal(names.length,7);
 for(const name of names){
  assert(c.CAD3D_VISUAL_STYLES[name]);
  assert.equal(c.isCad3DSketch(name),true);
  const p=c.CAD3D_SKETCH_PRESETS[name];
  assert([p.bg,p.ground,p.fill,p.edge,p.alpha].every(Number.isFinite));
 }
 assert.equal(c.isCad3DSketch('shaded'),false);
});
test('Visual Style toolbar exposes all seven selectable Croquis buttons',()=>{
 const from=source.indexOf('data-render-style="'+ "'+st[0]+'" +'"');
 assert(from>=0);
 const toolbar=source.slice(source.indexOf("'Visual styles"),source.indexOf("tool('shot'"));
 for(const name of ['sketch','sketch-pencil','sketch-ink','sketch-marker','sketch-watercolor','sketch-mono','sketch-blueprint']){
  assert(toolbar.includes("['"+name+"'"),name+' missing from toolbar');
 }
});
test('Croquis keeps shadow-receiving ground enabled',()=>{
 const sun=source.slice(source.indexOf('function applySunSettings(){'),source.indexOf('function toggleDraftMode('));
 const style=source.slice(source.indexOf('function applyRenderStyle(){'),source.indexOf('function exportViewPNG()'));
 assert(!sun.includes("!['sketch','hidden','wire2d','wire3d'].includes(renderStyle)"));
 assert(!style.includes("!['sketch','hidden','wire2d','wire3d'].includes(renderStyle)"));
 assert(style.includes('isCad3DSketch(mode))applySunSettings()'));
});
test('Croquis preserves the user's 3D geometry while changing rendering',()=>{
 const style=source.slice(source.indexOf('function setVisualStyle('),source.indexOf('function exportViewPNG()'));
 assert(style.includes("renderStyle=mode"));
 assert(!style.includes("records.push("));
 assert(!style.includes("records.splice("));
});
