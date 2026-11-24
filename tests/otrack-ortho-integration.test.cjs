const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const tracking=require('../cad-object-tracking.js');

// Exercise the same snapPoint implementation loaded by the 2D editor, with
// the minimum canvas/geometry state needed to reproduce ORTHO + OTRACK.
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const from = html.indexOf('function snapPoint(p,gripBase=null){');
const to = html.indexOf('\nfunction segmentDist(', from);
assert.ok(from >= 0 && to > from, 'CAD2D snapPoint source is available');
const source = html.slice(from, to);

function editor({orthoOn = true, otrackOn = true} = {}) {
 const anchors = [];
 const acquired = [];
 const state = {
  orthoOn, osnapOn: true, polarOn: false, snapOn: false,
  stage: [{x:10,y:0}], tool:'line', view:{scale:10},
  entities:[{type:'line',a:{x:7,y:5},b:{x:7,y:9}}]
 };
 const context = vm.createContext({
  state, Math, P:(x,y)=>({x,y}),
  snapIndicator:null, otrkGuide:null, cadOtrkHoverPt:null, cadOneShotOsnap:null,
  window:{BlacklineTrackingMath:tracking}, BlacklineTrackingMath:tracking,
  trackingEligible:()=>otrackOn,
  cadOtrackHover:p=>{
   acquired.push({x:p.x,y:p.y});
   if(!anchors.some(a=>a.x===p.x&&a.y===p.y))anchors.push({x:p.x,y:p.y});
  },
  cadOtrackReleaseHover:()=>{},
  otrkAnchors:anchors,
  cadOsnapEnabled:kind=>kind==='END'||kind==='POINT',
  layerFor:()=>({visible:true,locked:false}),
  boundsEntity:e=>({minX:Math.min(e.a.x,e.b.x),maxX:Math.max(e.a.x,e.b.x),minY:Math.min(e.a.y,e.b.y),maxY:Math.max(e.a.y,e.b.y)}),
  getVertices:e=>[e.a,e.b],
  screen:p=>({x:p.x*10,y:p.y*10}),
  dist:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)
 });
 vm.runInContext(source,context,{filename:'CAD2D snapPoint'});
 const point = (x,y) => vm.runInContext('snapPoint({x:'+x+',y:'+y+'})',context);
 return {point,state,anchors,acquired,context};
}

test('OTRACK acquires two off-axis vertices while ORTHO stays enabled',()=>{
 const cad=editor();
 const first=cad.point(7,5);
 assert.equal(first.x,10);assert.equal(first.y,5);
 const second=cad.point(7,9);
 assert.equal(second.x,10);assert.equal(second.y,9);
 assert.deepEqual(cad.acquired,[{x:7,y:5},{x:7,y:9}]);
 assert.equal(cad.anchors.length,2);
});

test('second OTRACK reference aligns the orthogonal endpoint',()=>{
 const cad=editor();
 cad.point(7,5);cad.point(7,9);
 const endpoint=cad.point(10.02,8.96);
 assert.equal(endpoint.x,10);
 assert.equal(endpoint.y,9);
 assert.equal(cad.context.otrkGuide.point.y,9);
});

test('ORTHO without OTRACK preserves its existing constrained snap behavior',()=>{
 const cad=editor({otrackOn:false});
 const p=cad.point(7,5);
 assert.equal(p.x,10);assert.equal(p.y,5);
 assert.equal(cad.acquired.length,0);
});

test('with ORTHO disabled, standard endpoint snapping still works',()=>{
 const cad=editor({orthoOn:false});
 const p=cad.point(7,5);
 assert.equal(p.x,7);assert.equal(p.y,5);
 assert.equal(cad.acquired.length,1);
});

test('near a real horizontal intersection, tracking must not be reprojected to vertical',()=>{
 const cad=editor();
 cad.anchors.push({x:10.5,y:5});
 const p=cad.point(10.45,.55);
 assert.equal(p.x,10.5);
 assert.equal(p.y,0);
 assert.equal(cad.context.otrkGuide.axis,'h');
});
test('ORT​HO + OTRACK rejects a distant intersection and never creates a diagonal',()=>{
 const cad=editor();
 cad.anchors.push({x:7,y:5});
 const p=cad.point(12,5.05);
 assert.equal(p.x,10);
 assert.equal(p.y,5.05);
 assert.equal(cad.context.otrkGuide,null);
});
