'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const main=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const start=main.indexOf(' // Primer lote piloto de ambientes completos');
const end=main.indexOf(' const door=(name,w,reverse=false)=>entries.push',start);
assert.ok(start>=0&&end>start,'pilot room definitions must exist');
function rooms(){const result=[];new Function('entries',main.slice(start,end))(result);return result}
test('12 complete architectural room definitions with real dimensions',()=>{
 const list=rooms();
 assert.ok(list.length>=12);
 for(const block of list){
  assert.equal(block.cat,'Rooms');
  assert.ok(block.w>1&&block.h>1);
  assert.ok(block.draw.length>=15);
  assert.ok(block.draw.every(shape=>['line','rect','arc','circle','ellipse'].includes(shape[0])));
 }
});
test('all bathroom bedroom kitchen and living parts remain within room bounding box',()=>{
 for(const block of rooms())for(const d of block.draw){
  if(d[0]==='rect'){
   assert.ok(d[1]>=0&&d[2]>=0&&d[3]>0&&d[4]>0,block.id);
   assert.ok(d[1]+d[3]<=block.w+.001&&d[2]+d[4]<=block.h+.001,block.id);
  }
  if(d[0]==='line'){
   assert.ok(d[1]>=0&&d[1]<=block.w&&d[3]>=0&&d[3]<=block.w,block.id);
   assert.ok(d[2]>=0&&d[2]<=block.h&&d[4]>=0&&d[4]<=block.h,block.id);
  }
 }
});
test('gallery offers rooms and creates one dynamic reference per complete room',()=>{
 assert.match(main,/Rooms:\['BL_ROOMS'/);
 assert.match(main,/x\.wholeRoom\)\{state\.blocks\[key\]\.dynamic2d=blDynEligible\(state\.blocks\[key\]\);state\.blocks\[key\]\.dynamicActions=true;state\.blocks\[key\]\.compositeRoom=true\}/);
 assert.match(main,/state\.blocks\[key\]=cadPrepareDynamicBlock\(/);
 assert.match(main,/setTool\('insertBlock'\)/);
});
