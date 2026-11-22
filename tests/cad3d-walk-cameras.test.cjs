const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const src=fs.readFileSync('cad3d-lab.js','utf8');
const slice=(a,b)=>{const i=src.indexOf(a),j=src.indexOf(b,i+a.length);assert(i>=0&&j>i,a);return src.slice(i,j);};
test('camera tools do not change wall drawing pointer handling',()=>{
 assert.doesNotThrow(()=>new vm.Script(src));
 const block=slice('function bindCanvas(el){','function rayAt(e){');
 assert(block.includes('if(e.button===0&&placing'));
 assert(block.includes('placeAt(e)'));
});
test('walk buttons use same movement and saved cameras restore view',()=>{
 const code=slice('function walk3DStep(direction,step){','function syncViewControls(){');
 assert(code.includes('applyViewCamera()'));
 assert(code.includes("viewMode!=='walk'"));
 assert(code.includes('target.x+='));
 assert(code.includes('orbit.az'));
 assert(code.includes('saved3DCameras.push('));
 assert(code.includes('syncViewControls();syncCameraToolbar();applyViewCamera()'));
});
test('saved cameras are included in project export and read on import',()=>{
 assert(src.includes('cameras:saved3DCameras'));
 assert(src.includes('saved3DCameras=sanitize3DCameras(data.cameras)'));
 assert(src.includes("data-camera-save"));
 assert(src.includes("data-camera-recall"));
});
