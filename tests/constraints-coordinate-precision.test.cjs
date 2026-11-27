'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {solve}=require('../cad-constraints.js');
test('coincidence rejects distinct anchors at large coordinate origins',()=>{
 const e={id:1,type:'line',a:{x:1e9,y:0},b:{x:1e9+5,y:0}};
 const refs=[{id:2,a:{x:1e9,y:0}},{id:3,a:{x:1e9+.1,y:0}}];
 const rules=[{kind:'coincident',anchor:'a',ref:2,refPoint:'a'},{kind:'coincident',anchor:'a',ref:3,refPoint:'a'}];
 assert.equal(solve(e,rules,refs).ok,false);
 refs[1].a.x=1e9;assert.equal(solve(e,rules,refs).ok,true);
 assert.equal(e.a.x,1e9);
});
test('concentric constraints reject distinct centers at large coordinate origins',()=>{
 const e={id:1,type:'circle',c:{x:1e9,y:0},r:2};
 const refs=[{id:2,type:'circle',c:{x:1e9,y:0},r:3},{id:3,type:'circle',c:{x:1e9+.1,y:0},r:4}];
 const rules=[{kind:'concentric',ref:2},{kind:'concentric',ref:3}];
 assert.equal(solve(e,rules,refs).ok,false);
 refs[1].c.x=1e9;assert.equal(solve(e,rules,refs).ok,true);
});
