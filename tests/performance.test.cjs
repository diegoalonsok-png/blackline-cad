const test=require('node:test'),assert=require('node:assert/strict');
const {viewport,basicBounds,inViewport}=require('../cad-performance.js');
const view={scale:20,ox:500,oy:500},v=viewport(view,1000,1000,30);
test('viewport matches CAD coordinates and inverted Y',()=>{
 assert.deepEqual(v,{minX:-26.5,maxX:26.5,minY:-26.5,maxY:26.5});
});
test('visible line is kept',()=>assert.equal(inViewport({type:'line',a:{x:1,y:1},b:{x:2,y:3}},v),true));
test('distant line is culled',()=>assert.equal(inViewport({type:'line',a:{x:100,y:100},b:{x:101,y:101}},v),false));
test('rectangle with reversed corners is kept when crossing edge',()=>assert.equal(inViewport({type:'rect',a:{x:27,y:0},b:{x:26,y:2}},v),true));
test('circle overlap uses radius correctly',()=>assert.equal(inViewport({type:'circle',c:{x:30,y:0},r:5},v),true));
test('arc conservatively uses full circle bounds',()=>assert.equal(inViewport({type:'arc',c:{x:30,y:0},r:5,a0:0,a1:.1},v),true));
test('polyline uses all vertices',()=>assert.equal(inViewport({type:'polyline',pts:[{x:100,y:100},{x:0,y:0}]},v),true));
test('empty polyline falls back without exclusion',()=>assert.equal(inViewport({type:'polyline',pts:[]},v,()=>true),true));
test('blockRef and dimension preserve existing bounds fallback',()=>{
 assert.equal(inViewport({type:'blockRef',p:{x:100,y:100}},v,()=>false),false);
 assert.equal(inViewport({type:'dimension'},v,()=>true),true);
});
test('10000 sample lines can be culled without mutation',()=>{
 const entities=Array.from({length:10000},(_,i)=>({type:'line',a:{x:i,y:0},b:{x:i+1,y:1}}));
 let visible=0;for(const e of entities)if(inViewport(e,v))visible++;
 assert.equal(visible,27);assert.deepEqual(entities[0].a,{x:0,y:0});
});
test('invalid view is rejected',()=>assert.equal(viewport({scale:0,ox:0,oy:0},100,100),null));

test('wide polyline remains visible when its centreline is outside the viewport',()=>{
 const e={type:'polyline',pwidth:4,pts:[{x:28,y:0},{x:28,y:8}]};
 assert.equal(inViewport(e,v),true);
 assert.equal(inViewport({...e,pwidth:1},v),false);
});
test('wide rectangles and bulged polylines use conservative paint culling',()=>{
 assert.equal(inViewport({type:'rect',a:{x:28,y:0},b:{x:30,y:2},pwidth:4},v),true);
 assert.equal(inViewport({type:'polyline',pts:[{x:28,y:0},{x:30,y:2}],bulges:[1],pwidth:4},v,()=>false),true);
});
test('rotated ellipse bounds match exact analytic extent',()=>{
 const b=basicBounds({type:'ellipse',c:{x:10,y:20},rx:5,ry:2,rotation:Math.PI/2});
 assert.ok(Math.abs(b.minX-8)<1e-9);assert.ok(Math.abs(b.maxX-12)<1e-9);
 assert.ok(Math.abs(b.minY-15)<1e-9);assert.ok(Math.abs(b.maxY-25)<1e-9);
});
test('spatial index agrees with linear search for 10000 entities and 100 query boxes',()=>{
 const {spatialIndex,overlap}=require('../cad-performance.js');
 const items=Array.from({length:10000},(_,i)=>({type:'line',id:i,a:{x:i%100,y:Math.floor(i/100)},b:{x:i%100+0.4,y:Math.floor(i/100)+0.4}}));
 const query=spatialIndex(items,basicBounds);
 for(let i=0;i<100;i++){
  const box={minX:i%25*4,minY:i%20*5,maxX:i%25*4+2,maxY:i%20*5+3};
  assert.deepEqual(query(box).map(e=>e.id),items.filter(e=>overlap(basicBounds(e),box)).map(e=>e.id));
 }
});
test('spatial index preserves unknown geometry and snapshots mutable bounds',()=>{
 const {spatialIndex}=require('../cad-performance.js');
 const b={minX:0,minY:0,maxX:1,maxY:1};
 const query=spatialIndex(['known','unknown'],e=>{if(e==='unknown')throw Error('missing bounds');return b});
 b.minX=100;b.maxX=101;
 assert.deepEqual(query({minX:0,minY:0,maxX:1,maxY:1}),['known','unknown']);
 assert.deepEqual(query({minX:99,minY:99,maxX:101,maxY:101}),['unknown']);
});
