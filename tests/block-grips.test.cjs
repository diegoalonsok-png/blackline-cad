/* Regression: block grips preserve BLOCK/INSERT and coordinates.
 * Run: node --test tests/block-grips.test.cjs */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const begin=html.indexOf('function blockGripPoints(ref)'),end=html.indexOf('function flattenCADEntities(entities)',begin);
assert.ok(begin>=0&&end>begin,'Block grip utilities must exist');
const source=html.slice(begin,end);
const lookupStart=html.indexOf('function cadSelectedLookup(');
const lookupSource=html.slice(lookupStart,html.indexOf('\n}',lookupStart)+2);
const dynamicGripSource=html.slice(html.indexOf('function blDynBounds(def){'),html.indexOf('function blockInstanceGeometry(definition,ref)'));
function fixture(){
 const state={entities:[{id:23,type:'blockRef',blockName:'Puerta',p:{x:10,y:20},rotation:90,scale:1.5,params:{width:.9},layer:'openings'}],selected:[23],snapOn:false,grid:.1,view:{scale:100},blocks:{Puerta:{name:'Puerta',entities:[],dynamic2d:false}}};
 const funcs=new Function('state','dynamicGripSource','lookupSource',`
 const document={addEventListener(){},activeElement:null},addEventListener=()=>{};
 const P=(x,y)=>({x,y}),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),
 screen=p=>P(p.x*state.view.scale,-p.y*state.view.scale),
 world=p=>P(p.x/state.view.scale,-p.y/state.view.scale),
 layerFor=e=>({visible:true,locked:e.layer==='locked'}),
 blockChildren=ref=>[{type:'line',a:{x:10,y:20},b:{x:11,y:20}},{type:'rect',a:{x:10,y:20},b:{x:11,y:21}}];
 ${lookupSource}
 ${dynamicGripSource}
 ${source}
 return {blockGripPoints,findSelectedBlockGrip,blockGripTargetPoint};
 `)(state,dynamicGripSource,lookupSource);
 return {state,...funcs};
}
test('grouped block exposes only its insertion-point grip',()=>{const x=fixture();assert.deepEqual(x.blockGripPoints(x.state.entities[0]),[{x:10,y:20}])});
test('insertion grip is draggable; child geometry vertices are not separate grips',()=>{const x=fixture();const grip=x.findSelectedBlockGrip({x:1000,y:-2000});assert.equal(grip.id,23);assert.deepEqual(grip.vertex,{x:10,y:20});assert.equal(x.findSelectedBlockGrip({x:1100,y:-2100}),null)});
test('screen deltas map to model coordinates (inverted canvas Y)',()=>{const x=fixture(),p=x.blockGripTargetPoint({start:{x:1100,y:-2100},vertex:{x:11,y:21}},{x:1300,y:-2000});assert.deepEqual(p,{x:13,y:20})});
test('grid snap operates on grabbed vertex',()=>{const x=fixture();x.state.snapOn=true;const p=x.blockGripTargetPoint({start:{x:1100,y:-2100},vertex:{x:11,y:21}},{x:1234,y:-2063});assert.ok(Math.abs(p.x-12.3)<1e-10);assert.ok(Math.abs(p.y-20.6)<1e-10)});
test('locked layers cannot start grip drag',()=>{const x=fixture();x.state.entities[0].layer='locked';assert.equal(x.findSelectedBlockGrip({x:1000,y:-2000}),null);});
