'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const fs=require('node:fs');
const path=require('node:path');
const main=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
test('door and window dynamic sizing grip is visible and selectable',()=>{
 assert.match(main,/action:'resize'/);
 assert.match(main,/grip\.action==='resize'\?'⇔'/);
 assert.match(main,/type:'openingResize'/);
 assert.match(main,/cadOpeningResizeEditor\(ref/);
});
test('metric input converts 0.90 metres to model units',()=>{
 assert.match(main,/target\*1000\/U\[state\.unit\]\/scale/);
 assert.match(main,/0\.90 = 90 cm/);
 assert.match(main,/input\.type='number'/);
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
 assert.match(main,/Object\.assign\(state,snapshot\);state\.history\.pop\(\)/);
});
