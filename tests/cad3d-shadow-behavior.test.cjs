const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('cad3d-lab.js','utf8');
function extract(start,end){
 const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
 assert(a>=0&&b>a,`Missing function boundaries: ${start}`);
 return source.slice(a,b);
}
function fakeLight(){
 const camera={left:0,right:0,top:0,bottom:0,near:0,far:0,updateProjectionMatrix(){this.updated=true;}};
 return {position:{set(...v){this.xyz=v;}},target:{position:{set(...v){this.xyz=v;}},updateMatrixWorld(){this.updated=true;}},shadow:{mapSize:{set(...v){this.xy=v;}},camera},castShadow:false,intensity:0};
}
function setup(){
 const meshes=[{isMesh:true,userData:{},castShadow:true,receiveShadow:true},{isMesh:true,userData:{},castShadow:true,receiveShadow:true},{isMesh:true,userData:{cadGlass:true},castShadow:false,receiveShadow:false}];
 const sunLight=fakeLight(), sunGround={visible:false,receiveShadow:true},sunAmbient={intensity:1.3},sunFill={intensity:.7};
 const sunSettings={enabled:true,azimuth:135,elevation:45,onGround:true,onFaces:true};
 const modelRoot={traverse(fn){meshes.forEach(fn);}};
 const renderer={shadowMap:{enabled:true,needsUpdate:false}};
 const scene={add(obj){this.lastAdded=obj;}};
 const root={querySelector(selector){
  return {checked:false,value:0,textContent:'',setAttribute(){}};
 }};
 const ctx={root,sunSettings,sunGround,sunAmbient,sunFill,modelRoot,sunLight,renderer,scene,T:{},renderStyle:'shaded-edges',
  records:[{id:1,type:'box',x:1,y:2,z:0,w:2,d:2,h:2}],
  visibleRecord:()=>true,isCad3DSketch:mode=>mode.startsWith('sketch'),Math,Number,Infinity};
 vm.runInNewContext(extract('function cad3dBounds(){','function renderDraftModes(){'),ctx);
 return {ctx,meshes,sunLight,sunGround,renderer,sunSettings};
}
test('Sun actually enables real casting light, face receiving, and ground receiving',()=>{
 const {ctx,meshes,sunLight,sunGround,renderer}=setup();
 ctx.applySunSettings();
 assert.equal(sunLight.castShadow,true);
 assert.equal(sunGround.visible,true);
 assert.equal(sunGround.receiveShadow,true);
 assert(meshes.filter(m=>!m.userData.cadGlass).every(m=>m.castShadow&&m.receiveShadow));
 assert(meshes.filter(m=>m.userData.cadGlass).every(m=>!m.castShadow&&!m.receiveShadow),'Glass must transmit sunlight');
 assert.deepEqual(Array.from(sunLight.shadow.mapSize.xy),[2048,2048]);
 assert(sunLight.shadow.camera.updated);
 assert(sunLight.target.updated);
 assert(renderer.shadowMap.needsUpdate);
 assert(Number.isFinite(sunLight.position.xyz[2]));
 assert(sunLight.position.xyz[2]>0);
});
test('Ground and face shadow settings are independent',()=>{
 const {ctx,meshes,sunLight,sunGround,sunSettings}=setup();
 sunSettings.onGround=false;sunSettings.onFaces=true;ctx.applySunSettings();
 assert.equal(sunGround.visible,false);assert(meshes.filter(m=>!m.userData.cadGlass).every(m=>m.receiveShadow));assert(sunLight.castShadow);
 sunSettings.onGround=true;sunSettings.onFaces=false;ctx.applySunSettings();
 assert.equal(sunGround.visible,true);assert(meshes.every(m=>!m.receiveShadow));assert(sunLight.castShadow);
});
test('Disabling Sun disables casting and receivers without deleting objects',()=>{
 const {ctx,meshes,sunLight,sunGround,sunSettings}=setup();
 sunSettings.enabled=false;ctx.applySunSettings();
 assert.equal(sunLight.castShadow,false);assert.equal(sunGround.visible,false);
 assert(meshes.filter(m=>!m.userData.cadGlass).every(m=>m.castShadow&&!m.receiveShadow));
 assert(meshes.filter(m=>m.userData.cadGlass).every(m=>!m.castShadow&&!m.receiveShadow));
 assert.equal(ctx.records.length,1);
});
test('Opaque CAD3D meshes cast shadows while glass meshes transmit sunlight',()=>{
 const code=extract('function addMesh(','/* Partition the wall elevation');
 const objects=[];
 const ctx={T:{MeshStandardMaterial:class{constructor(p){this.options=p}},Mesh:class{constructor(geometry,mat){this.geometry=geometry;this.material=mat;this.userData={};this.position={set(){}};objects.push(this);}},DoubleSide:2},sunSettings:{onFaces:true}};
 vm.runInNewContext(code,ctx);
 const parent={add(obj){this.object=obj;}};
 ctx.addMesh({isGeometry:true},0xffffff,4,parent);
 assert.equal(parent.object.castShadow,true);
 assert.equal(parent.object.receiveShadow,true);
 ctx.addMesh({isGeometry:true},0xaaccff,5,parent,0,0,0,true,.4);
 assert.equal(parent.object.castShadow,false);
 assert.equal(parent.object.receiveShadow,false);
 assert.equal(parent.object.material.options.opacity,.4);
});
