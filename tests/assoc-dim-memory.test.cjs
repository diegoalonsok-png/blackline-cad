const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const a=source.indexOf('function cadAssocVertices('),b=source.indexOf('function cadDimAssocCommand(',a);
assert.ok(a>=0&&b>a);
const P=(x,y)=>({x,y});
function boot(entities){
 let max=0;
 class TrackedMap extends Map{set(k,v){super.set(k,v);max=Math.max(max,this.size);return this}}
 const context={state:{entities},P,Map:TrackedMap};
 vm.runInNewContext(source.slice(a,b),context);return {sync:context.cadSyncAssocDims,max:()=>max};
}
const line=(id,x=0,y=0)=>({id,type:'line',a:P(x,y),b:P(x+5,y)});
const dim=(id,target)=>({id,type:'dimension',mode:'aligned',a:P(0,0),b:P(5,0),p:P(0,2),assoc:{owner:id,a:{id:target,i:0},b:{id:target,i:1}}});
test('Large drawing indexes only referenced entities and preserves rigid dimension movement',()=>{
 const es=Array.from({length:100000},(_,i)=>line(i+1));
 const d=dim(100001,9);es[8]=line(9,3,4);es.push(d);
 const h=boot(es);h.sync();
 assert.equal(h.max(),1);assert.deepEqual(d.a,P(3,4));assert.deepEqual(d.b,P(8,4));assert.deepEqual(d.p,P(3,6));
 h.sync();assert.deepEqual(d.p,P(3,6));
});
test('Missing references are removed; valid references remain',()=>{
 const d=dim(3,1);d.assoc.b.id=99;
 boot([line(1,1,2),d]).sync();assert.deepEqual(d.a,P(1,2));assert.equal(d.assoc.b,undefined);assert.deepEqual(d.p,P(0,2));
});
test('Copied dimensions re-associate and update on subsequent edit',()=>{
 const l=line(1),d=dim(2,1);d.assoc.owner=99;
 const h=boot([l,d]);h.sync();assert.equal(d.assoc.owner,2);assert.equal(d.assoc.a.id,1);
 l.a=P(1,1);l.b=P(6,1);h.sync();assert.deepEqual(d.p,P(1,3));
});
test('No associated dimensions allocates no index entries',()=>{
 const h=boot([line(1),line(2)]);h.sync();assert.equal(h.max(),0);
});
