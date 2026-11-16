/* Regression: block grips preserve BLOCK/INSERT and coordinates.
 * Run: node --test tests/block-grips.test.cjs */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const begin=html.indexOf('function blockGripPoints(ref)'),end=html.indexOf('function flattenCADEntities(entities)',begin);
assert.ok(begin>=0&&end>begin,'Block grip utilities must exist');
const source=html.slice(begin,end);
function fixture(){
 const state={entities:[{id:23,type:'blockRef',blockName:'Puerta',p:{x:10,y:20},rotation:90,scale:1.5,params:{width:.9},layer:'openings'}],selected:[23],snapOn:false,grid:.1,view:{scale:100}};
 const funcs=new Function('state',`
 const P=(x,y)=>({x,y}),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),
 screen=p=>P(p.x*state.view.scale,-p.y*state.view.scale),
 world=p=>P(p.x/state.view.scale,-p.y/state.view.scale),
 layerFor=e=>({visible:true,locked:e.layer==='locked'}),
 blockChildren=ref=>[{type:'line',a:{x:10,y:20},b:{x:11,y:20}},{type:'rect',a:{x:10,y:20},b:{x:11,y:21}}];
 ${source}
 return {blockGripPoints,findSelectedBlockGrip,blockGripTargetPoint};
 `)(state);
 return {state,...funcs};
}
test('blocks present distinct geometry grips',()=>{const x=fixture();assert.equal(x.blockGripPoints(x.state.entities[0]).length,4)});
test('selected grips can be hit at model vertices',()=>{const x=fixture();const grip=x.findSelectedBlockGrip({x:1100,y:-2100});assert.equal(grip.id,23);assert.deepEqual(grip.vertex,{x:11,y:21})});
test('screen deltas map to model coordinates (inverted canvas Y)',()=>{const x=fixture(),p=x.blockGripTargetPoint({start:{x:1100,y:-2100},vertex:{x:11,y:21}},{x:1300,y:-2000});assert.deepEqual(p,{x:13,y:20})});
test('grid snap operates on grabbed vertex',()=>{const x=fixture();x.state.snapOn=true;const p=x.blockGripTargetPoint({start:{x:1100,y:-2100},vertex:{x:11,y:21}},{x:1234,y:-2063});assert.ok(Math.abs(p.x-12.3)<1e-10);assert.ok(Math.abs(p.y-20.6)<1e-10)});
test('locked layers cannot start grip drag',()=>{const x=fixture();x.state.entities[0].layer='locked';assert.equal(x.findSelectedBlockGrip({x:1100,y:-2100}),null);});
