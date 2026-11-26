'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../cad3d-lab.js'),'utf8');
function section(a,b){const start=source.indexOf(a),end=source.indexOf(b,start+a.length);assert(start>=0&&end>start);return source.slice(start,end);}
test('CAD3D has one Draw bar and one instance of every 2D and 3D command',()=>{
 assert.doesNotThrow(()=>new vm.Script(source));
 const bars=section('function cad3dBasicBars(){','function cad3dMakeSunPanelMovable(){');
 for(const command of ['line','polyline','rectangle','circle','arc','wall','slab','floor','door','window','opening','box','sphere','cylinder','cone']){
  assert.equal(bars.split("tool('"+command+"'").length-1,1,command);
 }
 assert.equal(bars.includes("tool('select'"),false,'Select belongs to Navigation');
 const nav=section('function cad3dCompact3DBar(){','function cad3dSyncCompactBars(){');
 assert.ok(nav.split("['pan'").length-1<=1,'no duplicate Pan tool (panning lives on the orbit ring / middle button)');
 assert.equal(nav.includes("['hand'"),false,'no redundant Hand/Pan');
 assert.equal(source.includes("['draw2d','.cad3dProfileTools']"),false,'no duplicate 2D dock group');
 const build=section('function build(){','function moveWindow(e)');
 assert.equal(build.includes("'<div class=\"cad3dProfileTools\""),false,'no duplicate 2D toolbar');
 assert.ok(build.includes('cad3dBasicBars()+'));
 assert.equal(source.includes("root.querySelector('.cad3dProfileTools').addEventListener"),false,'no duplicate listener');
 assert.ok(source.includes("root.querySelectorAll('.cad3dBar button[data-action]')"),'highlight follows shared toolbar');
});
test('Ctrl+Z from empty CAD3D command affects model, not property text',()=>{
 assert.ok(source.includes("editing.id==='cad3dCommand'&&!editing.value.trim()"));
 assert.ok(source.includes('cad3dUndo()'));
});
