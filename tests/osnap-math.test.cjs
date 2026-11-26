/* Run without dependencies: node --test tests/osnap-math.test.cjs */
const test=require('node:test');
const assert=require('node:assert/strict');
const g=require('../cad-osnap-math.js');
const close=(a,b)=>Math.abs(a-b)<1e-9;
test('NEAREST projects within line',()=>{const p=g.nearestOnSegment({x:5,y:3},{x:0,y:0},{x:10,y:0});assert.ok(close(p.x,5)&&close(p.y,0))});
test('NEAREST clamps to endpoints',()=>{const p=g.nearestOnSegment({x:15,y:3},{x:0,y:0},{x:10,y:0});assert.ok(close(p.x,10)&&close(p.y,0))});
test('PERP uses construction origin',()=>{const p=g.perpendicular({x:5,y:7},{x:0,y:0},{x:10,y:0});assert.ok(close(p.x,5)&&close(p.y,0))});
test('PERP excludes extensions outside segment',()=>assert.equal(g.perpendicular({x:15,y:7},{x:0,y:0},{x:10,y:0}),null));
test('TAN from exterior yields two real tangents',()=>{const list=g.tangentPoints({x:5,y:0},{x:0,y:0},3);assert.equal(list.length,2);for(const p of list){assert.ok(close(p.x*p.x+p.y*p.y,9));assert.ok(close((p.x-5)*p.x+p.y*p.y,0))}});
test('TAN cannot be constructed from inside the circle',()=>assert.deepEqual(g.tangentPoints({x:1,y:0},{x:0,y:0},3),[]));
test('degenerate segments and invalid radius do not produce NaNs',()=>{assert.equal(g.segmentFoot({x:1,y:1},{x:0,y:0},{x:0,y:0}),null);assert.deepEqual(g.tangentPoints({x:5,y:0},{x:0,y:0},0),[])});


test('NEAREST returns the stored endpoint exactly even on extremely long segments',()=>{
 const a={x:1e16,y:0},b={x:1,y:0};
 assert.deepEqual(g.nearestOnSegment({x:-2,y:3},a,b),b);
 assert.deepEqual(g.nearestOnSegment({x:1e16+100,y:3},a,b),a);
});
test('NEAREST and PERP agree inside a reversed segment',()=>{
 const a={x:10,y:0},b={x:0,y:0},q={x:7,y:3};
 assert.deepEqual(g.nearestOnSegment(q,a,b),{x:7,y:0});
 assert.deepEqual(g.perpendicular(q,a,b),{x:7,y:0});
});
