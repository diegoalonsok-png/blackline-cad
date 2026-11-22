'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const src=fs.readFileSync('cad3d-lab.js','utf8');
function app(){
 const marker='window.BlacklineCAD3D=Object.freeze(';
 const hook="window.__testHooks={setRoot:function(r){root=r;},getState:function(){return {activeView:activeView,style:renderStyle,restore:topStored3DStyle};},setViewPreset:setViewPreset,setVisualStyle:setVisualStyle,orbitCameraBy:orbitCameraBy};\n";
 assert.ok(src.includes(marker));
 const code=src.replace(marker,hook+marker);
 const doc={head:{appendChild(){}},createElement(){return {style:{}};},readyState:'loading',addEventListener(){}};
 const win={addEventListener(){}};
 new Function('window','document',code)(win,doc);
 const cache={};
 const root={hidden:false,querySelector(key){
  if(!cache[key])cache[key]={checked:false,hidden:false,classList:{toggle(){}},setAttribute(){},textContent:''};
  return cache[key];
 },querySelectorAll(){return []}};
 win.__testHooks.setRoot(root);
 return win.__testHooks;
}
test('Top automatically switches to ordinary 2D wireframe and restores original material view',()=>{
 const x=app();
 x.setVisualStyle('shaded-edges');
 x.setViewPreset('top');
 assert.equal(x.getState().style,'wire2d');
 assert.equal(x.getState().restore,'shaded-edges');
 x.setViewPreset('iso');
 assert.equal(x.getState().style,'shaded-edges');
 assert.equal(x.getState().restore,null);
});
test('Top retains wireframe when a 3D material is selected, then applies it after returning to 3D',()=>{
 const x=app();
 x.setViewPreset('top');
 x.setVisualStyle('realistic');
 assert.equal(x.getState().style,'wire2d');
 assert.equal(x.getState().restore,'realistic');
 x.setViewPreset('perspective');
 assert.equal(x.getState().style,'realistic');
});
test('Sketch selection is not lost by temporary Top wireframe, including orbit-ball exit',()=>{
 const x=app();
 x.setViewPreset('iso');x.setVisualStyle('sketch-ink');
 x.setViewPreset('top');
 assert.equal(x.getState().style,'wire2d');
 x.orbitCameraBy(12,0);
 assert.equal(x.getState().activeView,'perspective');
 assert.equal(x.getState().style,'sketch-ink');
});
test('Original editing and geometry paths remain present',()=>{
 for(const key of ['function architectureParts(','function openingFitsCADHost(','function buildObject(',
  'function exportJSON(','function setViewPreset(','function rotateViewCube(','function restore3DStyleFromTop('])
  assert.ok(src.includes(key),key);
});
