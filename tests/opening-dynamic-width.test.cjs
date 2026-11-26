'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const fs=require('node:fs');
const path=require('node:path');
const main=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
test('door and window keep adjustable metric dimensions without multiple drawing grips',()=>{
 assert.match(main,/function cadOpeningResizeEditor\(ref,client\)/);
 assert.match(main,/function cadResizeOpening\(ref,meters\)/);
 assert.match(main,/function blockGripPoints\(ref\)/);
 assert.match(main,/return ref\?\.type==='blockRef'&&ref\.p\?\[ref\.p\]:\[\]/);
});
test('metric input converts 0.90 metres to model units',()=>{
 assert.match(main,/target\*1000\/U\[state\.unit\]\/scale/);
 assert.match(main,/const target=Number\(meters\),next=target\*1000\/U\[state\.unit\]\/scale/);
 assert.match(main,/input\.type='text'/);
});
test('doors resize proportionally and window retains frame cross section',()=>{
 assert.match(main,/if\(kind==='framed-window'\)/);
 assert.match(main,/params\.frameWidth=Number\(params\.frameWidth\)\*ratio/);
 assert.match(main,/params\.frameDepth=Number\(params\.frameDepth\)\*ratio/);
});
test('resize is undoable and rolls back unsafe opening changes',()=>{
 assert.match(main,/const snapshot=historySnapshot\(\),hadWall=/);
 assert.match(main,/saveHistory\(\);ref\.params=params/);
 assert.match(main,/result=relocateOpeningWithBlock\(ref,clone\(ref\.p\)\)/);
 assert.match(main,/Object\.assign\(state,(?:cadMaterializeSnapshot\(snapshot\)|snapshot)\);state\.history\.pop\(\)/);
});

test('editable virtual dimension remains only in UI and is never stored or plotted',()=>{
 const start=main.indexOf('function cadOpeningResizeEditor(ref,client){');
 const end=main.indexOf('function cadDrawOpeningQuickGrips(ref){',start);
 assert.ok(start>=0&&end>start,'editor exists');
 const source=main.slice(start,end);
 assert.match(source,/createElementNS\(ns,'svg'\)/);
 assert.match(source,/overlay\.append\(svg\)/);
 assert.match(source,/wrap\.append\(overlay\)/);
 assert.match(source,/control\.replaceWith\(input\)/);
 assert.match(source,/input\.addEventListener\('keydown'/);
 assert.ok(!source.includes('state.entities.push'),'dimension must not be persisted in drawing entities');
 assert.ok(!source.includes('newEntity('),'dimension must not be exported as geometry');
});
