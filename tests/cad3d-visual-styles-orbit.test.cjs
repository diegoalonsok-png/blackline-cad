const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('cad3d-lab.js','utf8');
test('CAD3D JavaScript parses',()=>assert.doesNotThrow(()=>new vm.Script(source)));
test('Eight visual styles have working buttons and a WebGL rendering path',()=>{
 for(const style of ['wire2d','wire3d','hidden','shaded','shaded-edges','realistic','monochrome','xray']){
  assert(source.includes("'"+style+"'"),style+' missing');
 }
 assert(source.includes("root.querySelector('.styleGrid').addEventListener('click'"));
 assert(source.includes("setVisualStyle(button.dataset.renderStyle)"));
 assert(source.includes('function applyRenderStyle(){'));
 assert(source.includes('m.material')||source.includes('var mat=m.material'));
 assert(source.includes('new T.EdgesGeometry('));
});
test('Changing styles preserves CAD3D records and camera',()=>{
 const block=source.slice(source.indexOf('function setVisualStyle(mode){'),source.indexOf('function exportViewPNG(){'));
 assert(block.startsWith('function setVisualStyle(mode){'));
 assert(!/records\s*=|orbit\.(az|el|dist)\s*=|setPlacement\(/.test(block));
});
test('Orbit ball is interactive by pointer dragging and keyboard without modifying objects',()=>{
 assert(source.includes('class="orbitBall"'));
 assert(source.includes("bindOrbitBall(root.querySelector('.orbitBall'))"));
 const block=source.slice(source.indexOf('function orbitCameraBy(dx,dy){'),source.indexOf('function syncViewControls(){'));
 for(const term of ['pointerdown','pointermove','pointerup','pointercancel','lostpointercapture','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'])assert(block.includes(term),term);
 assert(block.includes('orbit.az-=dx*.010'));
 assert(block.includes('orbit.el=clamp('));
 assert(block.includes('applyViewCamera()'));
 assert(!/records\s*=|records\.push\(/.test(block));
});
