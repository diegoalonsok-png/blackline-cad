/* XREF y caché de geometría de bloques.
 * Run: node --test tests/xref-perf.test.cjs */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
test('XREF commands, faded drawing and per-layer children',()=>{
 for(const k of ['XREF','REFX','XRELOAD','XRECARGAR','XDETACH','XBIND','UNIRREFX'])assert.ok(html.includes("'"+k+"'"),k);
 assert.match(html,/ctx\.globalAlpha\*=cadXrefFade/);
 assert.match(html,/\(ref\.xref(?:\|\|definition\.preserveLayers)?\)?&&e\.layer\?e\.layer:ref\.layer/);
 assert.match(html,/explodeInserts/);
});
test('block children are cached per reference and invalidated by edits',()=>{
 const a=html.indexOf('let cadDrawEpoch=0;'),b=html.indexOf('function blockChildren(ref',a);
 let calls=0;const state={blocks:{B:{entities:[{type:'line'}]}}};
 const api=new Function('state','blockChildren',html.slice(a,b)+';return {get:cadBlockChildrenCached,bump:()=>cadDrawEpoch++}')(state,ref=>{calls++;return [{type:'line',p:ref.p}]});
 const ref={type:'blockRef',blockName:'B',p:{x:0,y:0}};
 api.get(ref);api.get(ref);assert.equal(calls,1,'second frame reuses geometry');
 ref.p={x:1,y:0};api.get(ref);assert.equal(calls,2,'moving the reference recomputes');
 api.bump();api.get(ref);assert.equal(calls,2,'an unrelated drawing edit keeps the cached geometry');
 state.blocks.B.entities.push({type:'circle'});api.bump();api.get(ref);assert.equal(calls,3,'editing the block definition recomputes');
});
