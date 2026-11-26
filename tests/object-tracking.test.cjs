const test=require('node:test'),assert=require('node:assert/strict');
const {project,acquire}=require('../cad-object-tracking.js');
test('horizontal guide tracks anchor Y',()=>{
 const v=project({x:9,y:4.98},[{x:2,y:5}],10,10);
 assert.equal(v.point.y,5);assert.equal(v.point.x,9);assert.equal(v.horizontal.y,5);
});
test('vertical guide tracks anchor X',()=>{
 const v=project({x:3.01,y:12},[{x:3,y:2}],20,10);
 assert.deepEqual(v.point,{x:3,y:12});
});
test('cross-axis tracking from two acquired points',()=>{
 const v=project({x:3.03,y:7.02},[{x:3,y:2},{x:9,y:7}],20,10);
 assert.deepEqual(v.point,{x:3,y:7});assert.equal(v.intersection,true);
});
test('no guide outside pixel tolerance',()=>assert.equal(project({x:30,y:40},[{x:2,y:5}],20,10),null));
test('guide tolerance is pixel-based across zoom levels',()=>{
 assert.ok(project({x:3.5,y:12},[{x:3,y:2}],10,10));
 assert.equal(project({x:3.5,y:12},[{x:3,y:2}],40,10),null);
});
test('acquisition caps memory and never mutates arguments',()=>{
 const first=[{x:0,y:0}],copy=acquire(first,{x:1,y:1},2);
 assert.equal(first.length,1);assert.equal(copy.length,2);
 assert.deepEqual(acquire(copy,{x:2,y:2},2),[{x:1,y:1},{x:2,y:2}]);
});
test('duplicate acquisition reorders without duplicates',()=>{
 const list=acquire([{x:1,y:1},{x:2,y:2}],{x:1,y:1});
 assert.deepEqual(list,[{x:2,y:2},{x:1,y:1}]);
});
test('invalid coordinates do not create tracking guides',()=>assert.equal(project({x:NaN,y:0},[{x:1,y:1}],1),null));


test('cardinal OTRACK rays preserve exact coordinates even far from origin',()=>{
 const {projectRays}=require('../cad-object-tracking.js');
 const anchors=[{x:0,y:0}];
 for(const angle of [0,90,180,270,-90,450]){
  const vertical=angle%180!==0;
  const pointer=vertical?{x:0.01,y:1e8}:{x:1e8,y:0.01};
  const expected=vertical?{x:0,y:1e8}:{x:1e8,y:0};
  assert.deepEqual(projectRays(pointer,anchors,10,10,[angle]).point,expected,'angle '+angle);
 }
});
test('exact cardinal rays still support polar tracking at 45 degrees',()=>{
 const {projectRays}=require('../cad-object-tracking.js');
 const result=projectRays({x:5.02,y:4.98},[{x:0,y:0}],10,10,[45]);
 assert.ok(result);
 assert.ok(Math.abs(result.point.x-result.point.y)<1e-12);
});
