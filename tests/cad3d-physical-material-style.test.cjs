const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('cad3d-lab.js','utf8');
test('realistic style preserves authored physical materials and generic finish remains reversible',()=>{
 const start=source.indexOf('function applyRenderStyle(){'),end=source.indexOf('function setVisualStyle(',start);
 assert(start>=0&&end>start);
 function mesh(roughness,metalness,extra={},data={}){
  let hex=0xabcdef;
  return {isMesh:true,material:{roughness,metalness,color:{getHex:()=>hex,setHex:v=>{hex=v}},transparent:false,opacity:1,depthWrite:true,...extra},geometry:{},userData:data,children:[]};
 }
 const generic=mesh(.8,.04),glass=mesh(.1,.02,{}, {cadGlass:true}),steel=mesh(.21,.85),mapped=mesh(.8,.04,{map:{isCanvasTexture:false}}),roughMap=mesh(.8,.04,{roughnessMap:{}});
 const meshes=[generic,glass,steel,mapped,roughMap];
 const ctx={T:{},CAD3D_SKETCH_PRESETS:{},renderStyle:'realistic',renderStyleControls(){},isCad3DWireframe:()=>false,cad3dShowsGrid:()=>true,gridHelper:null,axesHelper:null,underlayGroup:null,apply3DEnvironment(){},modelRoot:{traverse:fn=>meshes.forEach(fn)},sunSettings:{enabled:true,onFaces:true}};
 vm.createContext(ctx);vm.runInContext(source.slice(start,end),ctx);
 const values=m=>[m.material.roughness,m.material.metalness];
 ctx.applyRenderStyle();
 assert.deepEqual(values(generic),[.54,.10]);
 assert.deepEqual(values(glass),[.1,.02]);
 assert.deepEqual(values(steel),[.21,.85]);
 assert.deepEqual(values(mapped),[.8,.04]);
 assert.deepEqual(values(roughMap),[.8,.04]);
 ctx.renderStyle='shaded';ctx.applyRenderStyle();
 assert.deepEqual(values(generic),[.8,.04]);
 assert.deepEqual(values(glass),[.1,.02]);
 assert.deepEqual(values(steel),[.21,.85]);
});