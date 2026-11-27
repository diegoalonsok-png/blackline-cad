'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const s=fs.readFileSync(path.join(__dirname,'../cad3d-lab.js'),'utf8');
function section(a,b){const i=s.indexOf(a),j=s.indexOf(b,i);assert.ok(i>=0&&j>i);return s.slice(i,j);}
const api=new Function(section('function cad3dMassProperties(','function cad3dPropertyDetails(')+section('function cad3dBimWallLayers(','function cad3dEditBimWall(')+';return {cad3dBimWallLayers,cad3dBimWallQuantities};')();
const wall={type:'wall',w:5,h:3,d:.2,openings:[{offset:0,w:1,h:2,sill:0},{offset:.25,w:1,h:2,sill:0}],bimWallLayers:[{material:'Brick',thickness:.16},{material:'Plaster',thickness:.04}]};
test('BIM wall computes net area and layer volumes without double subtracting overlapping openings',()=>{
 const q=api.cad3dBimWallQuantities(wall);
 assert.equal(q.grossArea,15);assert.equal(q.netArea,12.5);assert.equal(q.netVolume,2.5);
 assert.equal(q.layers[0].netVolume,2);assert.equal(q.layers[1].netVolume,.5);
});
test('BIM wall rejects invalid layer values and flags changed wall thickness',()=>{
 for(const t of [NaN,Infinity,-.2,0,'0.2'])assert.throws(()=>api.cad3dBimWallLayers([{material:'Brick',thickness:t}],.2));
 assert.throws(()=>api.cad3dBimWallLayers([{material:'Brick',thickness:.1}],.2));
 const q=api.cad3dBimWallQuantities({...wall,d:.25});assert.equal(q.status,'layer thickness mismatch');assert.equal(q.layers.length,0);
});
test('BIM wall keeps missing quantities null and connects existing property controls',()=>{
 assert.equal(api.cad3dBimWallQuantities({...wall,openings:[{w:NaN}]}).netVolume,null);
 for(const token of ['data-bim-level','data-bim-wall','data-bim-qto','cad3dBimWallLayers(r.bimWallLayers,o.d)'])assert.ok(s.includes(token),token);
 assert.doesNotThrow(()=>new Function(s));
});

test('structural BIM primitives remain editable native boxes with reliable volumes',()=>{
 const spec=new Function(section('function cad3dBimStructureSpec(','function cad3dCreateBimStructure(')+';return cad3dBimStructureSpec;')();
 const mass=new Function(section('function cad3dMassProperties(','function cad3dPropertyDetails(')+';return cad3dMassProperties;')();
 for(const [kind,dims,expected] of [['Column',[.3,.3,3,2,3,0],.27],['Beam',[4,.25,.45,0,0,3],.45],['Footing',[1.2,1.2,.4,0,0,-.4],.576]]){
  const r=spec(kind,dims);assert.equal(r.type,'box');assert.equal(r.bimClass,kind);assert.ok(Math.abs(mass(r).volume-expected)<1e-12);
 }
 assert.throws(()=>spec('Beam',[0,.25,.45,0,0,0]));
 assert.throws(()=>spec('Unknown',[1,1,1,0,0,0]));
 assert.throws(()=>spec('Column',[1,1,1,NaN,0,0]));
});
test('IFC4 exchange preserves structural element classes',()=>{
 const x=new Function(section('function cad3dEncodeIFC(','function exportIFC(')+section('function cad3dDecodeIFC(','function cad3dImportIFC(')+';return {cad3dEncodeIFC,cad3dDecodeIFC};')();
 let i=0;const rng=()=>Uint8Array.from({length:16},(_,k)=>k===15?++i:0);
 const triangles=[[[0,0,0],[1,0,0],[0,1,0]]];
 const ifc=x.cad3dEncodeIFC(['column','beam','footing'].map((type,id)=>({id,type,triangles})),rng);
 assert.match(ifc,/=IFCFOOTING\(/);
 assert.deepEqual(x.cad3dDecodeIFC(ifc).map(r=>r.ifcClass),['Column','Beam','Footing']);
});
