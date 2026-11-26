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
 assert(fs.readFileSync('cad3d-lab.js','utf8').includes('sunGround.receiveShadow=sunSettings.enabled&&sunSettings.onGround'));
 assert(sun.includes("sunSettings.elevation*Math.PI/180"));
 assert(!sun.includes('records.push('),'Sun controls must never create CAD objects');
});
test('Both wireframes override a custom sky and render white, unoccluded geometric edges',async()=>{
 const T=await import('../assets/three-cad3d-r160.module.js');
 const model=new T.Group(),scene=new T.Scene(),grid=new T.Group(),axes=new T.Group();
 const ground=new T.Mesh(new T.PlaneGeometry(10,10),new T.MeshBasicMaterial());
 const underlay=new T.Group(),reference=new T.LineSegments(new T.BufferGeometry(),new T.LineBasicMaterial());
 underlay.add(reference);
 for(const geometry of [new T.BoxGeometry(),new T.SphereGeometry(1,28,18)]){
  model.add(new T.Mesh(geometry,new T.MeshStandardMaterial({color:0x8a7654})));
 }
 const env={T,modelRoot:model,scene,gridHelper:grid,axesHelper:axes,sunGround:ground,underlayGroup:underlay,
  root:null,fallbackCanvas:null,cloudTexture:null,cloudTextureKey:'',draftModes:{grid:true},sunSettings:{enabled:true,onGround:true},
  environmentSettings:{customSky:true,sky:'#80bdcf',customGround:true,ground:'#abc123',clouds:'none',showGround:true},
  CAD3D_SKETCH_PRESETS:{},renderStyleControls(){},isCad3DSketch(){return false;}};
 const apply=vm.runInNewContext([
  block('function isCad3DWireframe(','var environmentSettings='),
  block('function cad3dSkyColor(){','/* Panorama procedimental'),
  block('function apply3DEnvironment(){','function applySunSettings(){'),
  block('function cad3dStyleUnderlay(','function drawUnderlay(){'),
  block('function applyRenderStyle(){','function setVisualStyle(mode){'),
  '(mode)=>{renderStyle=mode;applyRenderStyle();}'
 ].join('\n'),env);
 for(const mode of ['wire2d','wire3d']){
  apply(mode);
  assert.equal(scene.background.getHex(),0x000000);
  assert.equal(grid.visible||axes.visible||ground.visible,false);
  assert.equal(reference.material.color.getHex(),0xffffff);
  for(const mesh of model.children){
   assert.equal(mesh.material.colorWrite,false);
   assert.equal(mesh.material.depthWrite,false);
   const line=mesh.children.find(child=>child.isLineSegments);
   assert.ok(line.geometry.getAttribute('position').count>0,mesh.geometry.type);
   assert.equal(line.material.color.getHex(),0xffffff);
   assert.equal(line.material.depthTest||line.material.toneMapped,false);
  }
 }
 apply('shaded');
 assert.equal(scene.background.getHexString(),'80bdcf');
 assert.ok(grid.visible&&axes.visible&&ground.visible);
 assert.ok(model.children.every(mesh=>mesh.material.colorWrite&&mesh.material.depthWrite&&!mesh.children.length));
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
