'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('cad3d-lab.js','utf8');
const start=source.indexOf('function cad3dPolyCross'),end=source.indexOf('function cad3dCutSlabPolyline',start);
const ctx=vm.createContext({});vm.runInContext(source.slice(start,end),ctx);
const slab=()=>({type:'slab',w:10,d:8,h:.2,rot:37,openings:[],slabPolyHoles:[]});
const approx=(a,b,t=1e-8)=>assert.ok(Math.abs(a-b)<t,a+' != '+b);
test('direct rectangular circular and elliptical openings have requested local dimensions',()=>{
 for(const shape of ['rectangle','circle','ellipse']){
  const r=slab(),holes=ctx.cad3dSlabCutShapePlan(r,shape,1,-1,2,1,0);
  assert.equal(holes.length,1);const b=ctx.cad3dSlabCutBounds(holes[0]);approx(b.x,1);approx(b.y,-1);approx(b.w,2);approx(b.d,shape==='circle'?2:1);
  approx(Math.abs(ctx.cad3dPolyArea(holes[0])),shape==='rectangle'?2:Math.PI*(shape==='circle'?1:.5),.003);
 }
});
test('existing cut can move resize and rotate without changing the host or other cuts',()=>{
 const r=slab();r.slabPolyHoles=ctx.cad3dSlabCutShapePlan(r,'rectangle',-2,0,2,1,0);
 r.slabPolyHoles=ctx.cad3dSlabCutShapePlan(r,'circle',2,0,1,1,0);
 const old=JSON.stringify(r);
 let q=ctx.cad3dSlabCutEditPlan(r,0,'rotate',90);assert.ok(q);
 const b=ctx.cad3dSlabCutBounds(q[0]);approx(b.w,1);approx(b.d,2);approx(b.x,-2);
 q=ctx.cad3dSlabCutEditPlan({...r,slabPolyHoles:q},0,'w',1.5);approx(ctx.cad3dSlabCutBounds(q[0]).w,1.5);
 q=ctx.cad3dSlabCutEditPlan({...r,slabPolyHoles:q},0,'y',1);approx(ctx.cad3dSlabCutBounds(q[0]).y,1);
 assert.equal(JSON.stringify(q[1]),JSON.stringify(r.slabPolyHoles[1]));assert.equal(JSON.stringify(r),old);
});
test('reject edges, overlap, invalid measures and conflicts with existing rectangular opening',()=>{
 const r=slab();r.openings=[{offset:0,offsetY:0,w:1,d:1}];
 assert.equal(ctx.cad3dSlabCutShapePlan(r,'rectangle',0,0,1,1,0),null);
 assert.equal(ctx.cad3dSlabCutShapePlan(r,'circle',4.8,0,1,1,0),null);
 r.slabPolyHoles=ctx.cad3dSlabCutShapePlan(r,'rectangle',2,0,1,1,0);
 assert.equal(ctx.cad3dSlabCutEditPlan(r,0,'x',0),null);
 assert.equal(ctx.cad3dSlabCutEditPlan(r,0,'w',NaN),null);
 assert.equal(ctx.cad3dSlabCutEditPlan(r,0,'d',0),null);
});
test('properties expose direct creation, editing and undo without flattening slab',()=>{
 const html=ctx.cad3dSlabCutHTML({...slab(),slabPolyHoles:[[[-1,-1],[1,-1],[1,1],[-1,1]]]});
 for(const key of ['x','y','w','d','rotate'])assert.ok(html.includes('data-cut-param="'+key+'"'));
 assert.ok(html.includes('data-add-slab-cut'));assert.ok(html.includes('data-remove-slab-poly'));
 assert.match(source,/cad3dHistoryStart\(\);r\.slabPolyHoles=holes/);
 assert.match(source,/cad3dHistoryStart\(\);host\.slabPolyHoles=holes/);
});
