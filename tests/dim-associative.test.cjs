/* Cotas asociativas: siguen al vértice acotado al estirar y acompañan al mover.
 * Run: node --test tests/dim-associative.test.cjs */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const a=html.indexOf('/* Cotas asociativas:'),b=html.indexOf('function cadDimAssocCommand(',a);
assert.ok(a>=0&&b>a,'associative dimension helpers present');
function make(entities){
 const state={entities};
 return {state,...new Function('state',`const P=(x,y)=>({x,y});${html.slice(a,b)};return {cadAssociateDim,cadSyncAssocDims,cadAssocVertices};`)(state)};
}
const line=()=>({id:1,type:'line',a:{x:0,y:0},b:{x:4,y:0}});
const dim=()=>({id:2,type:'dimension',mode:'aligned',a:{x:0,y:0},b:{x:4,y:0},p:{x:2,y:1}});

test('a dimension snapped to endpoints is associated',()=>{
 const t=make([line(),dim()]),d=t.state.entities[1];
 assert.equal(t.cadAssociateDim(d),true);
 assert.deepEqual(d.assoc,{owner:2,a:{id:1,i:0},b:{id:1,i:1}});
});
test('stretching one end updates the dimension and keeps the dimension line',()=>{
 const t=make([line(),dim()]),[l,d]=t.state.entities;t.cadAssociateDim(d);
 l.b={x:6,y:0};t.cadSyncAssocDims();
 assert.deepEqual(d.b,{x:6,y:0});assert.deepEqual(d.p,{x:2,y:1});
});
test('moving the whole object carries the dimension along',()=>{
 const t=make([line(),dim()]),[l,d]=t.state.entities;t.cadAssociateDim(d);
 l.a={x:1,y:2};l.b={x:5,y:2};t.cadSyncAssocDims();
 assert.deepEqual([d.a,d.b,d.p],[{x:1,y:2},{x:5,y:2},{x:3,y:3}]);
});
test('rectangle corners and erased objects',()=>{
 const t=make([{id:1,type:'rect',a:{x:0,y:0},b:{x:3,y:2}},{id:2,type:'dimension',mode:'aligned',a:{x:3,y:0},b:{x:3,y:2},p:{x:4,y:1}}]),d=t.state.entities[1];
 t.cadAssociateDim(d);assert.deepEqual(d.assoc.a,{id:1,i:1});
 t.state.entities.shift();t.cadSyncAssocDims();
 assert.equal(d.assoc,undefined,'association is dropped when the object is erased');
 assert.deepEqual(d.a,{x:3,y:0});
});
test('a copied dimension re-associates with whatever lies under it',()=>{
 const t=make([line(),dim()]),d=t.state.entities[1];t.cadAssociateDim(d);
 t.state.entities.push({id:3,type:'line',a:{x:0,y:5},b:{x:4,y:5}},{...JSON.parse(JSON.stringify(d)),id:4,a:{x:0,y:5},b:{x:4,y:5},p:{x:2,y:6}});
 t.cadSyncAssocDims();
 assert.deepEqual(t.state.entities[3].assoc,{owner:4,a:{id:3,i:0},b:{id:3,i:1}});
 assert.deepEqual(t.state.entities[3].a,{x:0,y:5});
});
