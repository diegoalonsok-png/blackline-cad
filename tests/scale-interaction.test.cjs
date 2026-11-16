/* Behavioral checks for the actual SCALE command in index.html. No browser required.
 * Run: node --test tests/scale-interaction.test.cjs */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const math=require('../cad-scale-math.js');
const html=fs.readFileSync(require('node:path').resolve(__dirname,'../index.html'),'utf8');
const start=html.indexOf('function doTransform(t,p)');
const end=html.indexOf('\nfunction eraseSelected()',start);
assert.ok(start>0&&end>start,'Could not extract SCALE dispatch');
const dispatcher=html.slice(start,end);
function harness(entity){
 const state={stage:[],selected:[entity.id],entities:[entity],tool:'scale'};
 const events=[];
 const create=new Function('state','BlacklineScaleMath','events',`
 const P=(x,y)=>({x,y}),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const sub=(a,b)=>P(a.x-b.x,a.y-b.y),add=(a,b)=>P(a.x+b.x,a.y+b.y),mul=(a,k)=>P(a.x*k,a.y*k);
 const clone=x=>JSON.parse(JSON.stringify(x));
 const updateProps=()=>{},toast=x=>events.push('toast:'+x),schedule=()=>{},prompt=()=>{};
 const log=()=>{},updateAll=()=>{},saveHistory=()=>events.push('history');
 const layerFor=e=>({visible:true,locked:false});
 const boundsEntity=e=>e.type==='blockRef'?{minX:e.p.x,minY:e.p.y,maxX:e.p.x+1,maxY:e.p.y+1}:e.type==='line'?{minX:Math.min(e.a.x,e.b.x),minY:Math.min(e.a.y,e.b.y),maxX:Math.max(e.a.x,e.b.x),maxY:Math.max(e.a.y,e.b.y)}:null;
 const setTool=t=>{state.tool=t;state.stage=[]};
 const window={prompt:()=>{throw Error('SCALE must not open a modal dialog')}},pick=()=>null;
 const transformEntity=(e,fn)=>e;
 ${dispatcher}
 return doTransform;`);
 return {state,events,invoke:create(state,math,events)};
}
test('SCALE is two clicks; first does not mutate, second commits and records one history step',()=>{
 const h=harness({id:1,type:'line',a:{x:0,y:0},b:{x:10,y:0}});
 h.invoke('scale',{x:0,y:0});
 assert.equal(h.state.entities[0].b.x,10);
 assert.equal(h.state.stage.length,1);
 h.invoke('scale',{x:20,y:0});
 assert.equal(h.state.entities[0].b.x,20);
 assert.equal(h.state.tool,'select');
 assert.equal(h.events.filter(x=>x==='history').length,1);
});
test('SCALE keeps block metadata and moves grouped reference',()=>{
 const h=harness({id:2,type:'blockRef',blockName:'PUERTA',p:{x:0,y:0},scale:1,rotation:90,params:{width:.8}});
 h.invoke('scale',{x:0,y:0});
 h.invoke('scale',{x:h.state.scaleReference*2,y:0});
 assert.equal(h.state.entities[0].type,'blockRef');
 assert.equal(h.state.entities[0].scale,2);
 assert.equal(h.state.entities[0].rotation,90);
 assert.equal(h.state.entities[0].params.width,.8);
});
test('SCALE rejects zero factor, preserves object and history',()=>{
 const h=harness({id:3,type:'line',a:{x:0,y:0},b:{x:10,y:0}});
 h.invoke('scale',{x:0,y:0});
 h.invoke('scale',{x:0,y:0});
 assert.equal(h.state.entities[0].b.x,10);
 assert.equal(h.state.stage.length,1);
 assert.equal(h.events.filter(x=>x==='history').length,0);
});
