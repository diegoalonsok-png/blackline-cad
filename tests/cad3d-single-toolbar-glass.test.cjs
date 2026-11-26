const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const src=fs.readFileSync('cad3d-lab.js','utf8');
function section(a,b){
 const start=src.indexOf(a),end=src.indexOf(b,start+a.length);
 assert(start>=0&&end>start,'Missing '+a);
 return src.slice(start,end);
}
test('CAD3D source compiles and has one active Draw/Modify ribbon',()=>{
 assert.doesNotThrow(()=>new vm.Script(src));
 const build=section('function build(){','function moveWindow(e)');
 assert(build.includes('cad3dBasicBars()+'));
 assert(!build.includes("'<div class=\"solidTools\""));
 const bars=section('function cad3dBasicBars(){','function build(){');
 for(const command of ["tool('wall'","tool('door'","tool('window'","tool('slab'","tool('floor'","tool('opening'","tool('move'","tool('copy'","tool('rotate'"]){
  assert(bars.includes(command),command);
 }
});
test('Windows use perimeter frames and distinct transparent glazing',()=>{
 const parts=section('function architectureParts(r,part){','/* Build a true miter');
 assert(parts.includes('sashWidth-2*sashBar'));
 assert(parts.includes('0x4d8297'));
 assert(!parts.includes('carpPart(Math.max(.04,leafW-.018),.052,leafH'));
 const build=section('function buildObject(r){','function disposeMeshes');
 assert(build.includes('component.userData.cadGlass=true'));
 assert(build.includes('component.castShadow=false'));
});
test('Sun shadows and visual style never re-enable opaque glass shadows',()=>{
 const sun=section('function applySunSettings(){','function renderDraftModes(){');
 const style=section('function applyRenderStyle(){','function setVisualStyle(mode){');
 assert(/if\(o\.userData\?\.cadGlass(?:\|\|[^)]*)?\)\{o\.receiveShadow=false;o\.castShadow=false;\}/.test(sun));
 assert(style.includes('glass=!!m.userData.cadGlass')&&style.includes('m.castShadow=!glass&&!plainLines'));
 assert(/mat\.opacity=[^;]*glass\?\.28/.test(style),'glass stays translucent (0.28)');
});
