'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
const start=html.indexOf('function cadOpeningWallClearances(');
const end=html.indexOf('function drawWallDragMeasurement(){',start);
assert.ok(start>=0&&end>start,'temporary dimension routines are present');
const functions=html.slice(start,end);
function fixture(){
 const ref={id:5,type:'blockRef',blockName:'Door',p:{x:2,y:.09},rotation:0,scale:1,params:{width:.9}};
 const wall={id:1,type:'line',autoOpeningRef:5,wall2d:{guideA:{x:0,y:.09},guideB:{x:5,y:.09},thickness:.18,justify:'center'}};
 const state={blocks:{Door:{parametric:{kind:'swing-door',defaults:{width:.9}}}},entities:[wall],selected:[5],tool:'select'};
 const cadWallCenterline=meta=>({a:meta.guideA,b:meta.guideB});
 const P=(x,y)=>({x,y});
 const fn=new Function('state','cadWallCenterline','P',functions+';return cadOpeningWallClearances;')(state,cadWallCenterline,P);
 return {state,ref,fn};
}
test('opening shows clearances to both wall ends in model units',()=>{
 const {ref,fn}=fixture(),m=fn(ref);
 assert.ok(m);assert.ok(Math.abs(m.left-2)<1e-9);assert.ok(Math.abs(m.right-2.1)<1e-9);
});
test('moving a door updates the corner clearance without editing geometry',()=>{
 const {state,ref,fn}=fixture();
 const before=JSON.stringify(state.entities);
 const m=fn(ref,{x:2.5,y:.09});
 assert.ok(Math.abs(m.left-2.5)<1e-9);assert.ok(Math.abs(m.right-1.6)<1e-9);
 assert.equal(JSON.stringify(state.entities),before);
});
test('changing a window or door width updates the available end distance',()=>{
 const {ref,fn}=fixture();
 const m=fn(ref,ref.p,1.2);
 assert.ok(Math.abs(m.right-1.8)<1e-9);
});
test('preview dimensions never enter DXF/SVG drawing entities',()=>{
 const {state,ref,fn}=fixture();
 const before=state.entities.length;
 fn(ref,{x:2.7,y:.09},1.1);
 assert.equal(state.entities.length,before);
 assert.match(html,/cadDrawOpeningWallClearances\(\);drawCadLiveMeasure\(\)/);
});
