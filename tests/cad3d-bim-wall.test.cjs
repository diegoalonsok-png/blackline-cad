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

test('hosted BIM wall openings export axis position and sill elevation after wall transformations',()=>{
 const position=new Function(section('function cad3dBimOpeningPosition(','function cad3dBimInventory(')+';return cad3dBimOpeningPosition;')();
 const wall={type:'wall',x:10,y:20,z:3,rot:0,w:6,h:3},opening={offset:1,w:1,h:1,sill:1};
 for(const [rot,x,y] of [[0,11,20],[90,10,21],[180,9,20],[-90,10,19]]){
  const p=position({...wall,rot},opening);assert.ok(Math.abs(p.x-x)<1e-9&&Math.abs(p.y-y)<1e-9);assert.equal(p.z,4);
 }
 assert.deepEqual(position({...wall,x:15,y:25,z:6},opening),{x:16,y:25,z:7});
 for(const [r,o] of [[wall,{...opening,offset:3}],[wall,{...opening,sill:3}],[{...wall,type:'slab'},opening],[{...wall,x:NaN},opening]])assert.deepEqual(position(r,o),{x:null,y:null,z:null});
 assert.ok(section('function cad3dBimInventory(','function cad3dScheduleTo2D(').includes('...cad3dBimOpeningPosition(r,o)'));
});

test('BIM slab inventory deducts rectangular and polygon openings and locates rotated pitched slabs',()=>{
 const api=new Function(section('function cad3dPolyCross(','// Bounds are in slab-local metres')+section('function cad3dMassProperties(','function cad3dPropertyDetails(')+section('function cad3dBimSlabQuantities(','function cad3dBimInventory(')+';return {q:cad3dBimSlabQuantities,p:cad3dBimOpeningPosition};')();
 const slab={type:'slab',x:10,y:20,z:3,rot:90,w:6,d:4,h:.2,openings:[{offset:1,offsetY:.5,w:1,d:2}]};
 const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,String(a)+' != '+b);
 for(const pitch of [0,30,-30]){
  const r={...slab,pitch},q=api.q(r),p=api.p(r,r.openings[0]);
  near(q.grossArea,24);near(q.netArea,22);near(q.netVolume,4.4);
  near(p.x,9.5);near(p.y,21);near(p.z,3+Math.tan(pitch*Math.PI/180));
 }
 near(api.q({...slab,openings:[],slabPolyHoles:[[[-1,-1],[1,-1],[1,1],[-1,1]]]}).netArea,20);
 assert.equal(api.q({...slab,h:0}).netVolume,null);
 assert.deepEqual(api.p(slab,{...slab.openings[0],offset:10}),{x:null,y:null,z:null});
 assert.ok(section('function cad3dBimInventory(','function cad3dScheduleTo2D(').includes('cad3dBimWallQuantities(r)||cad3dBimSlabQuantities(r)'));
});

test('BIM polygon cuts have individual projected quantities and true transformed centroids',()=>{
 const cut=new Function(section('function cad3dPolyCross(','function cad3dSlabCutEditPlan(')+section('function cad3dBimPolygonCut(','function cad3dBimInventory(')+';return cad3dBimPolygonCut;')();
 const r={id:12,type:'slab',x:10,y:20,z:3,rot:90,w:10,d:10,h:.2,pitch:30},p=[[0,0],[4,0],[0,2]];
 const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,String(a)+' != '+b);
 const q=cut(r,p,0);
 assert.equal(q.id,'3D:12:polygon-cut:0');near(q.cutArea,4);near(q.cutVolume,.8);
 near(q.x,10-2/3);near(q.y,20+4/3);near(q.z,3+Math.tan(Math.PI/6)*4/3);
 assert.equal(q.width,4);assert.equal(q.depth,2);assert.equal(q.netVolume,null);
 const rev=cut(r,p.slice().reverse(),0);near(q.x,rev.x);near(q.y,rev.y);near(q.cutArea,rev.cutArea);
 for(const invalid of [[],[[0,0],[2,2],[0,2],[2,0]],[[0,0],[6,0],[0,2]]]){
  const v=cut(r,invalid,1);assert.equal(v.x,null);assert.equal(v.cutArea,undefined);
 }
 const inventory=section('function cad3dBimInventory(','function cad3dScheduleTo2D(');
 assert.ok(inventory.includes('cad3dBimPolygonCut(r,p,i)'));assert.ok(inventory.includes("'cutArea','cutVolume'"));
});

test('CAD2D reference transfer preserves metric scale and rejects silent truncation',()=>{
 const api=new Function(section('function segmentsFromEntities(','function cad3dStyleUnderlay(')+';return {segmentsFromEntities,dxfToUnderlay};')();
 const line={type:'line',a:{x:0,y:0},b:{x:5000,y:0}};
 assert.deepEqual(api.segmentsFromEntities([line],.001),[[0,0,5,0]]);
 assert.equal(api.segmentsFromEntities(Array(30000).fill(line),.001).length,30000);
 assert.throws(()=>api.segmentsFromEntities(Array(30001).fill(line),1),/30,000 segments/);
 assert.throws(()=>api.segmentsFromEntities([line],NaN),/Invalid CAD reference scale/);
 assert.throws(()=>api.segmentsFromEntities([{...line,b:{x:Number.MAX_VALUE,y:0}}],2),/Invalid CAD reference coordinates/);
 assert.ok(api.segmentsFromEntities([{type:'circle',c:{x:0,y:0},r:1}],1).length>100);
 assert.deepEqual(api.segmentsFromEntities([{type:'circle',c:{x:0,y:0},r:Infinity}],1),[]);
 assert.ok(section('function useOpenCAD2D(','async function importCADFile(').includes('Unknown CAD2D units'));
 assert.ok(section('function dxfToUnderlay(','function cad3dStyleUnderlay(').includes('!e.cadHidden'));
});

test('INTERFERE detects nominal vertical cylinders against cylinders, boxes and spheres',()=>{
 const api=new Function(section('function cad3dInterferenceShape(','function cad3dInterferenceReport(')+';return {shape:cad3dInterferenceShape,pair:cad3dInterferencePair,scan:cad3dInterferenceScan};')();
 const c={id:1,type:'cylinder',x:0,y:0,z:0,radius:1,h:2},b={id:2,type:'box',x:1.4,y:0,z:0,w:1,d:1,h:2},s={id:3,type:'sphere',x:0,y:0,z:1.5,radius:.5};
 const hit=(a,b)=>api.pair(api.shape(a),api.shape(b));
 for(const [a,o,v] of [[c,{...c,x:1.9},true],[c,{...c,x:2},false],[c,{...c,z:2},false],[c,b,true],[c,{...b,x:1.5},false],[c,{...b,x:1.4,y:1.4},false],[c,s,true],[c,{...s,z:2},false],[c,{...s,x:1.4,z:1.7},true],[c,{...s,x:1.4,z:1.9},false],[c,{...b,rot:45},true]]){
  assert.equal(hit(a,o),v);assert.equal(hit(o,a),v);
 }
 assert.equal(api.shape({...c,radius:0}),null);
 const result=api.scan([c,b,{...s,x:10}],[],'all');
 assert.equal(result.found,1);assert.equal(result.supported,3);
});

test('INTERFERE includes only rectangular solid walls verified by the actual join resolver',()=>{
 const api=new Function('let records=[];'+section('function wallJoinOffsets(','function applyWallMiter(')+section('function cad3dInterferenceShape(','function cad3dInterferenceReport(')+';return {shape:cad3dInterferenceShape,scan:(all,ids=[],scope="all")=>{records=all;return cad3dInterferenceScan(all,ids,scope,200000,wallJoinOffsets)}};')();
 const w={id:1,type:'wall',x:0,y:0,z:0,w:5,d:.2,h:3,rot:0},b={id:2,type:'box',bimClass:'Column',x:0,y:0,z:0,w:.3,d:.3,h:3};
 assert.equal(api.scan([w,b]).found,1);
 assert.equal(api.scan([w,{...b,y:.25}]).found,0);
 assert.equal(api.scan([{...w,rot:90},{...b,y:1}]).found,1);
 assert.equal(api.scan([w,{...b,z:3}]).found,0);
 assert.equal(api.scan([{...w,openings:[{offset:0,w:1,h:2,sill:0}]},b]).found,1);
 const l={...w,id:3,x:2.5,y:2.5,rot:90},t={...w,id:4,x:0,y:2.5,rot:90};
 assert.equal(api.scan([w,l,b]).unsupported.length,2);
 assert.ok(api.scan([w,t,b]).unsupported.some(x=>x.id===4));
 assert.equal(api.shape(w),null);
 assert.equal(api.scan([w,b],[1,2],'selection').found,1);
});

test('INTERFERE tests actual masonry around rectangular wall voids with bounded compound work',()=>{
 const api=new Function('let records=[];'+section('function wallJoinOffsets(','function applyWallMiter(')+section('function cad3dInterferenceShape(','function cad3dInterferenceReport(')+';return {scan:(all,limit=200000)=>{records=all;return cad3dInterferenceScan(all,[],"all",limit,wallJoinOffsets)}};')();
 const w={id:1,type:'wall',x:0,y:0,z:0,w:5,d:.2,h:3,rot:0,openings:[{offset:0,w:1,h:2,sill:0}]},b={id:2,type:'box',x:0,y:0,z:0,w:.5,d:.5,h:1};
 assert.equal(api.scan([w,b]).found,0);assert.equal(api.scan([w,b]).supported,2);
 assert.equal(api.scan([w,{...b,z:2}]).found,1);
 assert.equal(api.scan([w,{...b,x:.6}]).found,1);
 assert.equal(api.scan([w,{...b,x:.25}]).found,0);
 assert.equal(api.scan([{...w,rot:90},b]).found,0);
 assert.equal(api.scan([{...w,openings:[{offset:0,w:1,h:1,sill:1}]},b]).found,1);
 assert.equal(api.scan([{...w,openings:[...w.openings,{offset:.5,w:1,h:2,sill:0}]},{...b,x:.6}]).found,0);
 assert.equal(api.scan([{...w,openings:[{offset:0,w:100,h:2,sill:0}]},b]).unsupported.length,1);
 assert.equal(api.scan([w,b],1).truncated,true);
 assert.equal(api.scan([w,{id:3,type:'cylinder',x:0,y:0,z:0,radius:.2,h:1}]).found,0);
 assert.equal(api.scan([w,{...w,id:3,rot:90}]).found,1);
});
