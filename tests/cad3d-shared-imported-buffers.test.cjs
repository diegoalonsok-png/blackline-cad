const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('cad3d-lab.js','utf8');
const start=source.indexOf('var cad3dImportedGeometryCache=new WeakMap();');
const end=source.indexOf('function buildCAD3DBlock',start);
function harness(){
 let disposed=0,created=0;
 class Geometry {constructor(){created++;this.attributes={};}setAttribute(k,v){this.attributes[k]=v;}computeVertexNormals(){}dispose(){disposed++;}}
 const context={T:{BufferGeometry:Geometry,BufferAttribute:class{constructor(array){this.array=array;}}},addMesh:(g,color,id,group)=>{const m={geometry:g,material:{color},userData:{owner:id}};group.push(m);return m;}};
 vm.createContext(context);
 vm.runInContext(source.slice(start,end),context);
 return {context,counts:()=>({disposed,created})};
}
test('imported copies share buffers and keep independent material and transform',()=>{
 assert.doesNotThrow(()=>new vm.Script(source));
 const {context:c,counts}=harness();
 const r={type:'imported3d',id:1,w:2,d:1,h:1,x:0,meshVertices:[0,0,0,1,0,0,0,1,0],materialColor:'#ffffff'};
 const copy=c.cad3dCloneRecord(r);copy.id=2;copy.x=4;copy.materialColor='#000000';
 assert.equal(copy.meshVertices,r.meshVertices);assert.equal(r.x,0);
 const g=[];c.cad3dBuildImportedMesh(r,g);c.cad3dBuildImportedMesh(copy,g);
 assert.equal(g[0].geometry,g[1].geometry);assert.notEqual(g[0].material,g[1].material);
 assert.deepEqual(counts(),{created:1,disposed:0});
 c.cad3dReleaseImportedGeometry(g[0].userData.cad3dSharedGeometry);assert.equal(counts().disposed,0);
 c.cad3dReleaseImportedGeometry(g[1].userData.cad3dSharedGeometry);assert.equal(counts().disposed,1);
});
test('different dimensions allocate independent geometry and last release frees it',()=>{
 const {context:c,counts}=harness();
 const r={type:'imported3d',w:1,d:1,h:1,meshVertices:[0,0,0,1,0,0,0,1,0]};
 const a=c.cad3dAcquireImportedGeometry(r),b=c.cad3dAcquireImportedGeometry({...r,w:2});
 assert.notEqual(a.geometry,b.geometry);
 assert.equal(b.geometry.attributes.position.array[3],2);
 c.cad3dReleaseImportedGeometry(a);c.cad3dReleaseImportedGeometry(b);
 assert.deepEqual(counts(),{created:2,disposed:2});
});
test('100 duplicates allocate one geometry; copy and grip paths use shared source',()=>{
 const {context:c,counts}=harness();const r={type:'imported3d',w:1,d:1,h:1,meshVertices:[0,0,0,1,0,0,0,1,0]};
 const entries=Array.from({length:100},()=>c.cad3dAcquireImportedGeometry(c.cad3dCloneRecord(r)));
 assert.equal(counts().created,1);
 for(const e of entries)c.cad3dReleaseImportedGeometry(e);
 assert.equal(counts().disposed,1);
 assert(source.includes("kind==='copy'?cad3dCloneRecord(r):r"));
 assert(source.includes('var original=cad3dCloneRecord(r)'));
 assert(source.includes('cad3dReleaseImportedGeometry(o.userData.cad3dSharedGeometry)'));
});
