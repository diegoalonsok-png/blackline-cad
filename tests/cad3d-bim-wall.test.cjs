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
