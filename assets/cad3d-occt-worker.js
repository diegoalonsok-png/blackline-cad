/* CAD2D3D browser-only CAD exchange import worker.
 * occt-import-js 0.0.23 (LGPL-2.1), upstream source and licence:
 * https://github.com/kovacsv/occt-import-js/tree/0.0.23
 * https://github.com/kovacsv/occt-import-js/blob/main/LICENSE.md
 * Unmodified runtime loaded from a pinned npm CDN URL; model bytes stay in this worker.
 */
'use strict';
const BASE='https://cdn.jsdelivr.net/npm/occt-import-js@0.0.23/dist/';
let kernel;
function getKernel(){
 if(!kernel){
  importScripts(BASE+'occt-import-js.js');
  kernel=self.occtimportjs({locateFile:name=>BASE+name});
 }
 return kernel;
}
function cad3dOcctMesh(result,scale){
 if(!result||!result.success||!Array.isArray(result.meshes))throw Error('Open CASCADE no pudo leer el modelo');
 let nv=0,nf=0;
 for(const m of result.meshes){
  const p=m.attributes?.position?.array,i=m.index?.array;
  if(!p||!i||p.length%3||i.length%3)throw Error('Malla CAD inválida');
  nv+=p.length/3;nf+=i.length/3;
  if(nv>400000||nf>120000)throw Error('Modelo supera 400.000 vértices o 120.000 triángulos');
 }
 if(!nf)throw Error('El archivo no contiene superficies triangulables');
 const positions=new Float64Array(nv*3),indices=new Uint32Array(nf*3);
 let vp=0,ip=0;
 for(const m of result.meshes){
  const p=m.attributes.position.array,i=m.index.array,base=vp/3;
  for(const v of p){if(!Number.isFinite(v))throw Error('Coordenada CAD inválida');positions[vp++]=v*scale;}
  for(const v of i){if(!Number.isInteger(v)||v<0||v>=p.length/3)throw Error('Índice CAD inválido');indices[ip++]=base+v;}
 }
 return {positions,indices};
}
self.onmessage=async function(e){
 try{
  const {format,buffer,brepScale}=e.data;
  const method={step:'ReadStepFile',iges:'ReadIgesFile',brep:'ReadBrepFile'}[format];
  if(!method||!(buffer instanceof ArrayBuffer))throw Error('Formato CAD inválido');
  const occt=await getKernel();
  const params={linearUnit:'meter',linearDeflectionType:'bounding_box_ratio',linearDeflection:0.001,angularDeflection:0.5};
  const result=occt[method](new Uint8Array(buffer),params);
  const mesh=cad3dOcctMesh(result,format==='brep'?brepScale:1);
  self.postMessage(mesh,[mesh.positions.buffer,mesh.indices.buffer]);
 }catch(err){self.postMessage({error:err?.message||String(err)});}
};
