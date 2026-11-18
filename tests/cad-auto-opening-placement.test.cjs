'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const auto=require('../cad-auto-opening.js');
const main=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');

test('door automatically cuts both faces of a 15 cm wall with a 90 cm opening',()=>{
 const lines=[
  {id:1,type:'line',a:{x:0,y:-.075},b:{x:5,y:-.075},wall2d:{group:'wall-1',face:0}},
  {id:2,type:'line',a:{x:0,y:.075},b:{x:5,y:.075},wall2d:{group:'wall-1',face:1}}
 ];
 const edits=auto.plan(lines,{x:2,y:0},.9,0,.11);
 assert.equal(edits.length,2);
 assert.deepEqual(edits.map(e=>e.id),[1,2]);
 for(const edit of edits){
  assert.ok(Math.abs(edit.first.b.x-2)<1e-9);
  assert.ok(Math.abs(edit.second.a.x-2.9)<1e-9);
  assert.equal(edit.first.a.x,0);
  assert.equal(edit.second.b.x,5);
 }
});

test('an opening outside a wall does not damage geometry',()=>{
 const lines=[{id:1,type:'line',a:{x:0,y:1},b:{x:5,y:1}}];
 assert.equal(auto.plan(lines,{x:2,y:0},.9,0,.11).length,0);
});

test('opening insertion is atomic if both wall faces cannot be opened',()=>{
 assert.match(main,/const beforeInsertion=historySnapshot\(\);[\s\S]*?saveHistory\(\);/);
 assert.match(main,/if\(aligned&&autoOpeningEnabled&&cutCount<2\)\{/);
 assert.match(main,/Object\.assign\(state,beforeInsertion\)/);
 assert.match(main,/state\.history\.pop\(\)/);
 assert.match(main,/No se pudo abrir el vano en ambas caras/);
});

test('only insertion-point grip is drawn on a selected block',()=>{
 assert.match(main,/function blockGripPoints\(ref\)\{[\s\S]*?return ref\?\.type==='blockRef'&&ref\.p\?\[ref\.p\]:\[\];/);
 const code=main.slice(main.indexOf('function drawBlockGrips(ref){'),main.indexOf('function blockGripTargetPoint(d,raw){'));
 assert.ok(!code.includes('cadDrawOpeningQuickGrips('));
 assert.ok(!code.includes('cadDrawGenericBlockGrips('));
 assert.ok(!code.includes('blDynHandles('));
});
