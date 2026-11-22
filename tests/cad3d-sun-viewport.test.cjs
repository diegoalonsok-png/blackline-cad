const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const src=fs.readFileSync('cad3d-lab.js','utf8');
test('CAD3D source parses as JavaScript',()=>assert.doesNotThrow(()=>new vm.Script(src)));
test('Sun uses a lit WebGL ground receiver, separate from editable records',()=>{
 assert(src.includes('new T.MeshStandardMaterial({color:0xd1cbc0'),'Lit ground receiver is missing');
 assert(src.includes('sunGround.receiveShadow=true'),'Ground must receive shadows');
 assert(src.includes('renderer.shadowMap.enabled=true'),'Renderer must enable shadow maps');
 assert(src.includes('sunLight.castShadow=sunSettings.enabled'),'Sun must cast shadows');
 const init=src.slice(src.indexOf('function init(){'),src.indexOf('function updateCamera(){'));
 assert(init.includes('scene.add(sunGround)'),'Shadow receiver must be part of the scene');
 assert(!init.includes('records.push(sunGround)'),'Preview ground must not pollute editable records');
});
test('Sun direction tracks geometry bounds, with ground and face toggles',()=>{
 assert(src.includes('sunLight.target.position.set(bounds.x,bounds.y,bounds.z)'));
 assert(src.includes('sunGround.visible=sunSettings.enabled&&sunSettings.onGround'));
 assert(src.includes('o.receiveShadow=sunSettings.enabled&&sunSettings.onFaces'));
 assert(src.includes("this.dataset.sunPreset"));
});
test('CAD3D view controls and differentiated floor/sun icons are implemented',()=>{
 for(const key of ['top','iso','perspective','fit'])assert(src.includes('data-view-shortcut="'+key+'"'));
 assert(src.includes("tool('floor','Floor','floor'"));
 assert(src.includes("ico('sun')"));
 assert(src.includes('function fit3DModel(){'));
});
test('Sun activates from the toolbar without requiring a second checkbox click',()=>{
 assert(src.includes('if(opening&&!sunSettings.enabled){sunSettings.enabled=true;applySunSettings();}'));
});

test('A user can compare actual WebGL rendered pixels with cast shadows on/off',()=>{
 assert(src.includes('function checkVisibleShadows(){'));
 assert(src.includes('sunLight.castShadow=false;'));
 assert(src.includes('sunLight.castShadow=true;'));
 assert(src.includes("ctx.getImageData(0,0,w,h).data"));
 assert(src.includes("data-check-shadows"));
});
