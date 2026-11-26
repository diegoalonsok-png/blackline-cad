const test=require('node:test'),assert=require('node:assert/strict');
const {reviewSpaces,classifyRooms,layoutDiagnostics,doorClearance}=require('../assets/cad-calcopy-assist.js');
const w=(v,c,lo,hi)=>({v,c,lo,hi,t:10});
const walls=[w(true,20,20,220),w(true,220,20,220),w(false,20,20,220),w(false,220,20,80),w(false,220,160,220)];
const door={w:walls[3],v:false,c:220,g0:80,g1:160,t:10,kind:'swing-door',side:-1,hingeAtLo:true};
test('unconfirmed opening cannot enclose a room',()=>assert.equal(reviewSpaces(walls,[],300,300,.01).regions.length,0));
test('confirmed opening closes topology, not physical geometry',()=>{
 const before=JSON.stringify(walls),T=reviewSpaces(walls,[door],300,300,.01);
 assert.equal(T.regions.length,1);assert.equal(JSON.stringify(walls),before);
 assert.ok(T.regions[0].contains(80,80));assert.ok(!T.regions[0].contains(10,10));
 assert.equal(classifyRooms(T.regions,[{id:'san-wc',x:80,y:80}])[0].use,'bathroom_candidate');
});
test('kitchen and living share one room; WC conflicts',()=>{
 const {regions}=reviewSpaces(walls,[door],300,300,.01);
 const objects=[{id:'kq-heladera',x:60,y:60},{id:'mob-sofa3',x:150,y:150}];
 assert.equal(layoutDiagnostics(regions,objects).openPlans.length,1);
 assert.equal(layoutDiagnostics(regions,[...objects,{id:'san-wc',x:100,y:100}]).conflicts.length,1);
});
test('lavamanos can face access outside swing and passage; obstruction flagged',()=>{
 const o={kind:'swing-door',v:false,c:100,g0:100,g1:180,t:10,side:1,hingeAtLo:true};
 const b={id:'san-lav',x:125,y:250,w:.4,d:.25,rotation:0};
 assert.equal(doorClearance([o],[b],.01,.01).length,0);
 assert.equal(doorClearance([o],[{...b,y:155}],.01,.01).length,1);
});
