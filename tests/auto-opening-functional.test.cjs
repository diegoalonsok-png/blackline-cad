const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {plan}=require('../cad-auto-opening.js');
const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
const begin=html.indexOf('let autoOpeningEnabled=true;'),end=html.indexOf('/* DXF block-library importer:',begin);
assert.ok(begin>0&&end>begin,'production opening routines found');
const alignmentStart=html.indexOf('function cadWallCenterline(meta){');
const alignmentEnd=html.indexOf('let autoWallJoinEnabled=true;',alignmentStart);
assert.ok(alignmentStart>0&&alignmentEnd>alignmentStart,'real parametric-wall alignment routines found');
const alignment=html.slice(alignmentStart,alignmentEnd);
const routines=html.slice(begin,end);
const P=(x,y)=>({x,y}),copy=x=>JSON.parse(JSON.stringify(x));
function start(options={}){
 const state={entities:[
  {id:1,type:'line',layer:'walls',a:P(-2,0),b:P(5,0),width:.30},
  {id:2,type:'line',layer:'walls',a:P(5,.18),b:P(-2,.18),width:.30},
  {id:3,type:'line',layer:'electric',a:P(-2,.10),b:P(5,.10),width:.13}
 ],nextId:4,blocks:{},layers:[
  {id:'walls',name:'WALLS',visible:true,locked:false},
  {id:'electric',name:'ELECTRIC',visible:true,locked:false},
  {id:'openings',name:'OPENINGS',visible:true,locked:false}
 ],layerId:'walls',stage:[],tool:'select',selected:[],galleryRepeatedInsert:false,history:[],view:{scale:40},unit:'m'};
 const door={name:'Puerta test',parametric:{kind:'swing-door',defaults:{width:.9,frameWidth:.05,frameDepth:.12}},entities:[]};
 state.blocks[door.name]=door;
 const ui={blockScale:{value:'1'},blockRotation:{value:'0'},blAutoOpening:{checked:true}};
 const messages=[],events=[],storage={};
 const runtime=new Function('state','ui','messages','events','storage','P','copy','door','plan',`
 const $=id=>ui[id];const clone=copy;const localStorage={getItem:key=>storage[key]??null,setItem:(key,val)=>{storage[key]=val}};
 const window={BlacklineAutoOpening:{plan}},BlacklineAutoOpening=window.BlacklineAutoOpening;
 const layerFor=e=>state.layers.find(l=>l.id===e.layer)||state.layers[0];
 const U={m:1000,cm:10,mm:1};
 const add=(a,b)=>P(a.x+b.x,a.y+b.y),sub=(a,b)=>P(a.x-b.x,a.y-b.y),mul=(a,n)=>P(a.x*n,a.y*n);
 const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const explicitWallLayerName=name=>/^(WALLS?|MUROS?)$/i.test(name);
 const ensureArchitecturalLayer=()=> 'openings';
 const selectedBlock=()=>door;
 const saveHistory=()=>{state.history.push(copy({entities:state.entities,nextId:state.nextId}));events.push('history')};
 const toast=message=>messages.push(message),units=n=>n.toFixed(2);
 const buildRibbon=()=>{},document={querySelector:()=>({dataset:{tab:'home'}})};
 const updateAll=()=>events.push('update');
 ${alignment}
 ${routines}
 return {insertSelectedBlock,autoCutWallForOpening,relocateOpeningWithBlock,openingOverlapsAnother,configureAutoOpening};
 `)(state,ui,messages,events,storage,P,copy,door,plan);
 const move=(ref,x,y)=>{state.history.push(copy({entities:state.entities,nextId:state.nextId}));const original=copy(ref.p);ref.p=P(x,y);return runtime.relocateOpeningWithBlock(ref,original)};
 const undo=()=>{const snap=state.history.pop();state.entities=snap.entities;state.nextId=snap.nextId};
 return {state,ui,messages,events,storage,door,move,undo,...runtime};
}
function owned(state,id){return state.entities.filter(e=>e.autoOpeningRef===id)}
function approx(a,b){assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`)}
test('real insertion routine cuts both wall faces and leaves other layers untouched',()=>{
 const app=start();app.insertSelectedBlock(P(0,0));
 const ref=app.state.entities.find(e=>e.type==='blockRef');
 assert.ok(ref);assert.equal(owned(app.state,ref.id).length,4);
 assert.equal(app.state.entities.filter(e=>e.layer==='electric').length,1);
 assert.equal(app.events.filter(x=>x==='history').length,1);
 assert.equal(app.state.entities.filter(e=>e.id===1||e.id===2).length,0);
});
test('MOVE restores former opening and recuts at new position',()=>{
 const app=start();app.insertSelectedBlock(P(0,0));
 const ref=app.state.entities.find(e=>e.type==='blockRef');
 const outcome=app.move(ref,1,0);
 assert.equal(outcome.ok,true);assert.equal(outcome.cut,2);
 const segments=owned(app.state,ref.id);
 assert.equal(segments.length,4);
 for(const faceY of [0,.18]){
  const face=segments.filter(x=>Math.abs(x.a.y-faceY)<1e-8);
  assert.equal(face.length,2);
  const endpoints=face.flatMap(x=>[x.a.x,x.b.x]).sort((a,b)=>a-b);
  approx(endpoints[1],1);approx(endpoints[2],1.9);
 }
 assert.equal(app.state.entities.filter(e=>e.layer==='electric').length,1);
});
test('Ctrl+Z state restores moved opening together with block',()=>{
 const app=start();app.insertSelectedBlock(P(0,0));
 const before=copy(app.state.entities),ref=app.state.entities.find(e=>e.type==='blockRef');
 app.move(ref,1,0);app.undo();
 assert.deepEqual(app.state.entities,before);
});
test('turning auto openings off keeps walls unchanged at insertion',()=>{
 const app=start();app.configureAutoOpening();app.ui.blAutoOpening.checked=false;app.ui.blAutoOpening.onchange();
 const original=copy(app.state.entities);
 app.insertSelectedBlock(P(0,0));
 assert.deepEqual(app.state.entities.filter(e=>e.type==='line'),original);
 assert.equal(owned(app.state,4).length,0);
});
test('manually changed wall fragments block relocation and keep prior hole',()=>{
 const app=start();app.insertSelectedBlock(P(0,0));
 const ref=app.state.entities.find(e=>e.type==='blockRef');
 owned(app.state,ref.id)[0].b.x=.42;
 const snapshot=copy(app.state.entities);
 const outcome=app.move(ref,1,0);
 assert.equal(outcome.ok,false);approx(ref.p.x,0);
 assert.deepEqual(app.state.entities,snapshot);
});
test('two overlapping doors do not cut the same wall a second time',()=>{
 const app=start();app.insertSelectedBlock(P(0,0));const first=app.state.entities.find(e=>e.type==='blockRef');
 app.insertSelectedBlock(P(.3,0));const refs=app.state.entities.filter(e=>e.type==='blockRef');
 assert.equal(refs.length,2);
 assert.equal(owned(app.state,refs[1].id).length,0);
 assert.equal(owned(app.state,first.id).length,4);
});
test('drag move refuses overlap and restores old hole',()=>{
 const app=start();app.insertSelectedBlock(P(0,0));app.insertSelectedBlock(P(2,0));
 const first=app.state.entities.filter(e=>e.type==='blockRef')[0];
 const snapshot=copy(app.state.entities);
 const outcome=app.move(first,2.2,0);
 assert.equal(outcome.ok,false);approx(first.p.x,0);
 assert.deepEqual(app.state.entities,snapshot);
});
test('existing walls on locked layer cannot be cut',()=>{
 const app=start();app.state.layers[0].locked=true;
 app.insertSelectedBlock(P(0,0));
 const ref=app.state.entities.find(e=>e.type==='blockRef');
 assert.equal(owned(app.state,ref.id).length,0);
 assert.equal(app.state.entities.filter(e=>e.type==='line'&&e.layer==='walls').length,2);
});

test('parametric double-line wall receives a centered door opening across both faces',()=>{
 const app=start();
 const wall2d={group:'wall-1',thickness:.18,justify:'center',guideA:P(-2,.09),guideB:P(5,.09)};
 for(const [i,face] of app.state.entities.slice(0,2).entries()){
  face.wall2d={...copy(wall2d),face:i};
 }
 app.insertSelectedBlock(P(0,.09));
 const ref=app.state.entities.find(e=>e.type==='blockRef');
 assert.ok(ref,'door reference inserted');
 approx(ref.p.x,-.45);approx(ref.p.y,.09);
 approx(ref.wallThickness,.18);
 const pieces=owned(app.state,ref.id);
 assert.equal(pieces.length,4,'both faces split into two segments');
 assert.equal(new Set(pieces.map(x=>x.wall2d.face)).size,2);
 assert.equal(app.state.entities.filter(e=>e.layer==='electric').length,1,'other disciplines unchanged');
});
test('parametric window produces the same automatic paired-wall void',()=>{
 const app=start();
 app.door.parametric.kind='framed-window';
 const metadata={group:'wall-window',thickness:.18,justify:'center',guideA:P(-2,.09),guideB:P(5,.09)};
 app.state.entities[0].wall2d={...copy(metadata),face:0};
 app.state.entities[1].wall2d={...copy(metadata),face:1};
 app.insertSelectedBlock(P(1,.09));
 const ref=app.state.entities.find(e=>e.type==='blockRef');
 assert.ok(ref,'window reference inserted');assert.equal(owned(app.state,ref.id).length,4);
 assert.equal(app.state.entities.some(e=>e.id===1||e.id===2),false,'both uncut faces replaced');
});
test('parametric wall never cuts just one of its two faces',()=>{
 const app=start();
 const metadata={group:'wall-incomplete',thickness:.18,justify:'center',guideA:P(-2,.09),guideB:P(5,.09)};
 app.state.entities[0].wall2d={...copy(metadata),face:0};
 app.state.entities[1].wall2d={...copy(metadata),face:1};
 app.state.layers[0].locked=false;
 // One wall face cannot span the width of the proposed opening.
 app.state.entities[1].a.x=-.2;
 app.insertSelectedBlock(P(0,.09));
 const ref=app.state.entities.find(e=>e.type==='blockRef');
 assert.equal(ref,undefined,'abort the insertion instead of leaving a door on an uncut wall');
 assert.equal(app.state.entities.filter(e=>e.layer==='walls').length,2);
 assert.equal(app.state.history.length,0,'failed opening must not leave an undo entry');
});

test('parametric door closes both exposed wall jambs at the opening edges',()=>{
 const app=start();
 const meta={group:'wall-jamb',thickness:.18,justify:'center',guideA:P(-2,.09),guideB:P(5,.09)};
 app.state.entities[0].wall2d={...copy(meta),face:0};
 app.state.entities[1].wall2d={...copy(meta),face:1};
 app.insertSelectedBlock(P(0,.09));
 const ref=app.state.entities.find(e=>e.type==='blockRef');
 assert.ok(ref);
 const jambs=app.state.entities.filter(e=>e.autoOpeningJambRef===ref.id);
 assert.equal(jambs.length,2,'two end caps close wall thickness');
 assert.deepEqual(new Set(jambs.map(e=>e.autoOpeningJambSide)),new Set(['start','end']));
 for(const jamb of jambs){
  approx(Math.abs(jamb.a.y-jamb.b.y),.18);
  approx(jamb.a.x,jamb.b.x);
 }
});
test('moving a parametric door rebuilds the two jambs at its new opening edges',()=>{
 const app=start();
 const meta={group:'wall-jamb',thickness:.18,justify:'center',guideA:P(-2,.09),guideB:P(5,.09)};
 app.state.entities[0].wall2d={...copy(meta),face:0};
 app.state.entities[1].wall2d={...copy(meta),face:1};
 app.insertSelectedBlock(P(0,.09));
 const ref=app.state.entities.find(e=>e.type==='blockRef');
 assert.ok(ref);
 const before=app.state.entities.filter(e=>e.autoOpeningJambRef===ref.id).map(e=>e.id);
 const moved=app.move(ref,1,0);
 assert.equal(moved.ok,true);
 const after=app.state.entities.filter(e=>e.autoOpeningJambRef===ref.id);
 assert.equal(after.length,2);
 assert.equal(after.some(e=>before.includes(e.id)),false,'stale jambs removed');
 const x=after.map(e=>e.a.x).sort((a,b)=>a-b);
 approx(x[0],1);approx(x[1],1.9);
});
