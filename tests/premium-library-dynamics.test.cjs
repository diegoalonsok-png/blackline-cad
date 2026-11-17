'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
test('premium architectural gallery contains 14 editable vector definitions',()=>{
 const count=(source.match(/premium\('/g)||[]).length;
 assert.equal(count,14);
 for(const phrase of ['Sofá modular 3 cuerpos','Mesa comedor 8 plazas','Cama king vestida','Isla cocina','Bañera exenta oval','Lavabo doble','Banco exterior'])
  assert.ok(source.includes(phrase),phrase);
 assert.match(source,/entries\.push\(\{id,cat,w,h,draw\}\)/);
});
test('created, imported, and library definitions are automatically prepared for dynamic editing',()=>{
 for(const phrase of [
 'state.blocks[key]=cadPrepareDynamicBlock({name:key,entities:entries})',
 'state.blocks[key]=cadPrepareDynamicBlock({name:key,entities:normalizeBlockEntities(converted)})',
 'state.blocks[name]=cadPrepareDynamicBlock({name,entities:converted,...metadata})',
 'state.blocks[name]=cadPrepareDynamicBlock({name,entities:normalized,'
 ])assert.ok(source.includes(phrase),phrase);
 assert.match(source,/function cadPrepareDynamicBlock\(def\)/);
 assert.match(source,/def\.dynamic2d=blDynEligible\(def\)/);
});
test('generic rotate mirror scale controls are available without exploding geometry',()=>{
 for(const action of ["'genericMirror'","'genericRotate'","'genericScale'"])
  assert.ok(source.includes(action),action);
 assert.match(source,/cadGenericGripHit\(raw\)/);
 assert.match(source,/cadMirrorGenericBlockGeometry\(cadOpeningMirrorGeometry\(blockInstanceGeometry/);
 assert.match(source,/saveHistory\(\)/);
});
test('window frame depth stays independent of X stretching, editable up to 15cm',()=>{
 assert.match(source,/function cadWindowDepthModel/);
 assert.match(source,/Math\.min\(0\.15,actual\/modelPerMeter\)/);
 assert.match(source,/function cadSetWindowDepth/);
 assert.match(source,/depth<0\.04\|\|depth>0\.15/);
 assert.match(source,/cadWindowDepthEditor\(ref/);
});
