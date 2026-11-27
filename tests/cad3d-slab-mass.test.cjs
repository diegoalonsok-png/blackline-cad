'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('cad3d-lab.js','utf8');
const part=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
const ctx=vm.createContext({});vm.runInContext(part('function cad3dPolyCross','function cad3dCutSlabPolyline')+part('function cad3dMassProperties','function cad3dPropertyDetails'),ctx);
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,a+' != '+b);
const base=()=>({type:'slab',w:10,d:8,h:.2,pitch:0,openings:[],slabPolyHoles:[[[1,-1],[3,-1],[3,1],[1,1]]]});
test('perforated slab net volume, exposed surface and asymmetric centroid',()=>{
 const p=ctx.cad3dMassProperties(base());near(p.volume,15.2);near(p.surface,160.8);near(p.center[0],-8/76);near(p.center[1],0);near(p.center[2],.1);
});
test('inclined perforated slab uses vertical extrusion thickness and sheared centroid',()=>{
 const p=ctx.cad3dMassProperties({...base(),pitch:30,rot:90,x:10,y:20,z:3});
 near(p.volume,15.2);near(p.surface,152/Math.cos(Math.PI/6)+44*.2);near(p.center[0],10);near(p.center[1],20-8/76);near(p.center[2],3.1-Math.tan(Math.PI/6)*8/76);
});
test('net solid calculation accepts mixed hole orientation and rejects overlap',()=>{
 const r=base();r.slabPolyHoles[0].reverse();near(ctx.cad3dMassProperties(r).volume,15.2);
 r.openings=[{offset:-2,offsetY:0,w:2,d:1}];near(ctx.cad3dMassProperties(r).volume,14.8);
 r.openings[0].offset=2;assert.equal(ctx.cad3dMassProperties(r).volume,null);
});
test('inclined slab without holes has exact area and volume',()=>{
 const p=ctx.cad3dMassProperties({...base(),slabPolyHoles:[],pitch:45});
 near(p.volume,16);near(p.surface,160*Math.SQRT2+36*.2);near(p.center[2],.1);
});
