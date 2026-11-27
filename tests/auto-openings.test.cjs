const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {plan}=require('../cad-auto-opening.js');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const wall=(id,x0,y0,x1,y1)=>({id,type:'line',layer:'walls',a:{x:x0,y:y0},b:{x:x1,y:y1},width:.30});
const origin={x:0,y:0};
test('door cuts both wall faces, but not distant walls or perpendicular jamb',()=>{
 const edits=plan([wall(1,-1,0,3,0),wall(2,3,.18,-1,.18),wall(3,-1,2,3,2),wall(4,-1,0,-1,2)],origin,.9,0,.20);
 assert.deepEqual(edits.map(x=>x.id),[1,2]);
 assert.ok(Math.abs(edits[0].first.b.x)<1e-9);
 assert.ok(Math.abs(edits[0].second.a.x-.9)<1e-9);
});
test('opening can align with a vertical wall',()=>{
 const edits=plan([wall(1,2,-2,2,4)],{x:2,y:0},1.5,90,.25);
 assert.equal(edits.length,1);
 assert.ok(Math.abs(edits[0].first.b.y)<1e-8);
 assert.ok(Math.abs(edits[0].second.a.y-1.5)<1e-8);
});
test('rotated opening does not cut unaligned walls',()=>{
 assert.deepEqual(plan([wall(1,-1,0,3,0)],origin,.9,30,.2),[]);
});
test('wall must span full opening with material on both sides',()=>{
 assert.deepEqual(plan([wall(1,0,0,1,0),wall(2,-1,0,.5,0)],origin,.9,0,.2),[]);
});
test('invalid width and coordinates never cause an edit',()=>{
 assert.deepEqual(plan([wall(1,-1,0,3,0)],origin,0,0,.2),[]);
 assert.deepEqual(plan([wall(1,-1,0,3,0)],{x:NaN,y:0},.9,0,.2),[]);
});
test('planner never changes supplied wall geometry',()=>{
 const original=wall(8,-1,0,3,0),copy=JSON.stringify(original);
 plan([original],origin,.9,0,.2);assert.equal(JSON.stringify(original),copy);
});
test('automatic opening enabled by default with user opt-out',()=>{
 assert.match(html,/let autoOpeningEnabled=true/);
 assert.match(html,/localStorage\.getItem\('blackline-auto-openings'\)!=='false'/);
 assert.match(html,/id="blAutoOpening" checked/);
 assert.match(html,/checkbox\.onchange=\(\)=>/);
});
test('new cut fragments remember ownership and original geometry',()=>{
 assert.match(html,/autoOpeningRef:ref\.id,autoOpeningSource:original\.id,autoOpeningRole:role/);
 assert.match(html,/autoOpeningOriginal:clone\(original\),autoOpeningShape:clone\(piece\)/);
});
test('movement via grip and MOVE command triggers opening relocation',()=>{
 assert.match(html,/relocateOpeningWithBlock\(ref,d\.original\)/);
 assert.match(html,/if\(t==='move'\)for\(const item of moving\)/);
});
test('properties panel triggers opening relocation and protects edits',()=>{
 assert.match(html,/relocateOpeningWithBlock\(ref,originalPoint\)/);
 assert.match(html,/parts\.length!==2\|\|!first\|\|!second/);
 assert.match(html,/ref\.p=P\(previous\.x,previous\.y\)/);
});
test('wall trimming requires explicit WALLS layer',()=>{
 assert.match(html,/explicitWallLayerName\(l\.id\)\|\|explicitWallLayerName\(l\.name\)/);
});

test('opening cutter preserves physical stubs across meters and millimeters',()=>{
 for(const k of [1,10,1000]){
  const e=wall(1,-.001*k,0,100*k,0);
  const edits=plan([e],origin,.9*k,0,.2*k);
  assert.equal(edits.length,1);
  assert.ok(Math.abs(edits[0].first.b.x)<1e-8*k);
  assert.ok(Math.abs(edits[0].second.a.x-.9*k)<1e-8*k);
 }
});
test('cardinal opening angles remain exact after multiple rotations',()=>{
 for(const angle of [90,-270,450]){
  const e=wall(1,2,-2,2,4),o=plan([e],{x:2,y:0},1.5,angle,.25);
  assert.equal(o.length,1);assert.deepEqual(o[0].opening.end,{x:2,y:1.5});
 }
});
