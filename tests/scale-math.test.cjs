const test=require('node:test');
const assert=require('node:assert/strict');
const g=require('../cad-scale-math.js');
const eq=(a,b)=>Math.abs(a-b)<1e-8;
test('pivot is invariant',()=>assert.deepEqual(g.scalePoint({x:4,y:8},{x:4,y:8},2),{x:4,y:8}));
test('scale around custom pivot',()=>assert.deepEqual(g.scalePoint({x:5,y:8},{x:1,y:2},2),{x:9,y:14}));
test('circle doubles radius and moves center',()=>{const c=g.scaleEntity({type:'circle',c:{x:3,y:1},r:2},{x:1,y:1},2);assert.deepEqual(c.c,{x:5,y:1});assert.equal(c.r,4)});
test('block retains identity and gets new uniform scale',()=>{const x={id:5,type:'blockRef',blockName:'PUERTA',p:{x:5,y:1},scale:1.5,rotation:30,params:{width:.9}};const y=g.scaleEntity(x,{x:1,y:1},2);assert.equal(y.id,5);assert.equal(y.blockName,'PUERTA');assert.equal(y.scale,3);assert.equal(y.rotation,30);assert.deepEqual(y.params,x.params);assert.equal(y.p.x,9);assert.equal(x.p.x,5)});
test('line endpoints grow proportionally',()=>{const l=g.scaleEntity({type:'line',a:{x:1,y:0},b:{x:3,y:0}},{x:1,y:0},3);assert.equal(l.b.x-l.a.x,6)});
test('zero mouse distance cannot destroy entity',()=>assert.equal(g.mouseFactor({x:0,y:0},{x:0,y:0},5),null));
test('same reference radius means factor 1',()=>assert.ok(eq(g.mouseFactor({x:1,y:1},{x:4,y:5},5),1)));
test('mouse farther means larger scale',()=>assert.ok(eq(g.mouseFactor({x:0,y:0},{x:10,y:0},5),2)));
test('reject invalid factor',()=>assert.throws(()=>g.scaleEntity({type:'line'},{x:0,y:0},0)));
test('dimension annotation sizes preserve ratios',()=>{const d=g.scaleEntity({type:'dimension',a:{x:0,y:0},b:{x:2,y:0},p:{x:1,y:1},style:{textHeight:.2,arrow:.1}},{x:0,y:0},2);assert.equal(d.style.textHeight,.4);assert.equal(d.style.arrow,.2)});

test('scaled hatch preserves island position, pattern spacing and source data',()=>{
 const h={type:'hatch',pts:[{x:0,y:0},{x:4,y:0},{x:4,y:4}],holes:[[{x:1,y:1},{x:2,y:1},{x:2,y:2}]],hatchSpacing:.25,dxfPattern:{scale:1,spacing:.25,lines:[{a:45,bx:1,by:1,ox:0,oy:.25,d:[.1,-.1]}]}};
 const out=g.scaleEntity(h,{x:1,y:1},2);
 assert.deepEqual(out.holes[0],[{x:1,y:1},{x:3,y:1},{x:3,y:3}]);
 assert.equal(out.hatchSpacing,.5);assert.equal(out.dxfPattern.spacing,.5);assert.equal(out.dxfPattern.lines[0].oy,.5);assert.deepEqual(out.dxfPattern.lines[0].d,[.2,-.2]);assert.equal(h.hatchSpacing,.25);
});
test('wide polyline and architectural wall guide scale with geometry',()=>{
 const e={type:'polyline',pts:[{x:0,y:0},{x:2,y:0}],pwidth:.2,wall2d:{thickness:.2,guideA:{x:0,y:0},guideB:{x:2,y:0}}};
 const out=g.scaleEntity(e,{x:0,y:0},3);
 assert.ok(eq(out.pwidth,.6));assert.ok(eq(out.wall2d.thickness,.6));assert.deepEqual(out.wall2d.guideB,{x:6,y:0});assert.equal(e.wall2d.thickness,.2);
});
test('dimension extension offsets scale, preserving automatic sentinel',()=>{
 const e={type:'dimension',style:{extOffset:.1,extBeyond:.2,tolerance:.01,precision:2}};
 const out=g.scaleEntity(e,{x:0,y:0},2);
 assert.deepEqual(out.style,{extOffset:.2,extBeyond:.4,tolerance:.02,precision:2});
 e.style.extBeyond=-1;assert.equal(g.scaleEntity(e,{x:0,y:0},2).style.extBeyond,-1);
});
