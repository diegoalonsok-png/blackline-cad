const test=require('node:test'),assert=require('node:assert/strict');
const {classifyRooms}=require('../assets/cad-calcopy-assist.js');
const p={id:'p',x:0,y:0,w:400,h:400,area:90000,kind:'polygonal_room_candidate',rings:[{hole:false,points:[[0,0],[400,0],[400,100],[100,100],[100,400],[0,400]]}]};
const q={id:'q',x:200,y:200,w:100,h:100,area:10000,kind:'room_candidate',possible_parent:'p'};
const o=(id,x,y)=>({id,x,y});
test('polygon excludes objects outside actual footprint and supports nested bathroom',()=>{
 const a=classifyRooms([p,q],[o('mob-sofa3',50,200),o('san-wc',250,250),o('dor-queen',350,350)]);
 assert.equal(a[0].use,'living_candidate');assert.ok(a[1].possible_nested_bath);assert.ok(!a[0].objects.includes('dor-queen'));
});
test('oversized bathroom is flagged, not silently deleted',()=>{
 const a=classifyRooms([{...p,area:5000},q],[o('dor-queen',50,200),o('san-wc',250,250)]);
 assert.equal(a[1].area_review,'bathroom_not_smaller_than_parent');assert.equal(a[1].use,'bathroom_candidate');
});
