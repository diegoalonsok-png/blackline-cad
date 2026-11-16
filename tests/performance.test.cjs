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
