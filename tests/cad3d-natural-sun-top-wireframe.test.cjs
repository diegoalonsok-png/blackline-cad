const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const src=fs.readFileSync('cad3d-lab.js','utf8');
function block(begin,end){
 const a=src.indexOf(begin),b=src.indexOf(end,a+begin.length);
 assert(a>=0&&b>a,'Missing segment '+begin);
 return src.slice(a,b);
}
test('Sunlight and orthographic wireframe CAD3D source parses',()=>assert.doesNotThrow(()=>new vm.Script(src)));
test('Natural sunlight uses warm direct light, skylight and color-managed renderer',()=>{
 const init=block('function init(){','function updateCamera(){');
 for(const term of ["T.HemisphereLight(0xdceefb,0x918c83","T.DirectionalLight(0xffeed1",
  "renderer.outputColorSpace=T.SRGBColorSpace","renderer.toneMapping=T.ACESFilmicToneMapping",
  "renderer.shadowMap.type=T.PCFSoftShadowMap","sunGround.receiveShadow=true"]){
  assert(init.includes(term),term);
 }
 const sun=block('function applySunSettings(){','function renderDraftModes(){');
 assert(sun.includes("sunLight.shadow.mapSize.set(2048,2048)"));
 assert(sun.includes('bounds.span*1.25'));
 assert(sun.includes("sunLight.castShadow=sunSettings.enabled"));
 assert(sun.includes('sunGround.visible=sunSettings.enabled&&sunSettings.onGround'));
 assert(sun.includes("sunSettings.elevation*Math.PI/180"));
 assert(!sun.includes('records.push('),'Sun controls must never create CAD objects');
});
test('2D Wireframe uses black geometric edges and vertices in WebGL and compatibility canvas',()=>{
 const render=block('function applyRenderStyle(){','function setVisualStyle(mode){');
 for(const term of ["renderStyle==='wire2d'?0x111111","if(renderStyle==='wire2d'){",
  'new T.Points(','new T.PointsMaterial({','depthTest:false,depthWrite:false',
  'points.userData.cadSketch=true']){
  assert(render.includes(term),term);
 }
 const compat=block('function fallbackBox(','function scheduleFallbackDraw(){');
 assert(compat.includes("renderStyle==='wire2d'?'#111111'"));
 assert(compat.includes('pts.forEach(function(p)'));
 assert(compat.includes("if(renderStyle!=='wire2d')ctx.fill()"));
});
test('TOP stays in same CAD3D workspace with selection, parametric grips and drawing active',()=>{
 const view=block('function setViewPreset(key){','function checkVisibleShadows(){');
 assert(view.includes("activeView=v[0];viewMode=v[2];"));
 assert(view.includes('applyViewCamera()'));
 assert(!view.includes('setVisualStyle('),'Top must not force a different visual style');
 assert(!view.includes('records='),'Top must not replace CAD3D records');
 const canvas=block('function bindCanvas(el){','function rayAt(e){');
 assert(canvas.includes('selectAt(e)'),'Selection must work in top');
 assert(canvas.includes('placeAt(e)'),'Placement must work in top');
 const pointer=block('function render3DGrips(){','function numeric3DGripAdjustment(');
 assert(pointer.includes('pointOnScreen(def.point,view)'),'Dynamic 3D grips must follow top viewport projection');
 assert(src.includes("['top','Planta','ortho',0,Math.PI/2]"));
});
