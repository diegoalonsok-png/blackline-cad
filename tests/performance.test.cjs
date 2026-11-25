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


test('static frame reuse permits basic drawing previews but not mutable interactions',()=>{
 const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const snippet=html.match(/const cadReadOnlyDraftTools=new Set\([^\n]+\);\nfunction cadReadOnlyDraftPreview\(\)\{[^\n]+\}/);
 assert.ok(snippet,'preview eligibility helper exists');
 const base={state:{tool:'line',drag:null,selected:[],stage:[{x:1,y:2}],mtextBox:null},cadPrimitiveGripPlacement:null,cadVertexPlacement:null,cadSelectionAnchor:null};
 const check=(overrides={},globals={})=>vm.runInNewContext(snippet[0]+'\ncadReadOnlyDraftPreview()', {...base,...globals,state:{...base.state,...overrides}});
 for(const tool of ['line','polyline','rect','circle','arc','ellipse'])assert.equal(check({tool}),true);
 assert.equal(check({tool:'select',stage:[]}),true);
 assert.equal(check({tool:'select'}),false);
 assert.equal(check({tool:'trim'}),false);
 assert.equal(check({tool:'wall2d'}),false);
 assert.equal(check({drag:{type:'pan'}}),false);
 assert.equal(check({selected:[1]}),false);
 assert.equal(check({}, {cadPrimitiveGripPlacement:{}}),false);
 assert.equal(check({}, {cadVertexPlacement:{}}),false);
 assert.equal(check({}, {cadSelectionAnchor:{}}),false);
 assert.equal(check({mtextBox:{}}),false);
});


test('cached spatial query preserves reverse picking priority and conservative fallback',()=>{
 const perf=require('../cad-performance.js');
 const entities=Array.from({length:1000},(_,i)=>({id:i,type:'line',a:{x:i*2,y:0},b:{x:i*2+2,y:0}}));
 entities.push({id:1000,type:'line',a:{x:20,y:0},b:{x:22,y:0}});
 entities.push({id:1001,type:'unknown'});
 const query=perf.spatialIndex(entities,perf.basicBounds);
 const found=query({minX:19.9,maxX:20.1,minY:-.1,maxY:.1});
 assert.deepEqual(found.map(e=>e.id),[9,10,1000,1001]);
 assert.equal(found.filter(e=>e.type==='line').at(-1).id,1000);
 assert.deepEqual(query(null),entities);
 assert.equal(entities.length,1002);
});
