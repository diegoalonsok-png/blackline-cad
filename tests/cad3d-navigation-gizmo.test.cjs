const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const src=fs.readFileSync('cad3d-lab.js','utf8');
test('CAD3D navigation UI source parses',()=>assert.doesNotThrow(()=>new vm.Script(src)));
test('View cube is camera-aware, has face, edge, corner hotspots and keeps existing view selector',()=>{
 for(const token of ['function renderNavigationCube(){','function orientToCubeVector(value){','function bindNavigationCube(cube){','cubeFaceZone','cubeEdgeZone','cubeCornerZone','class="cubeScene"','class="cad3dViewSelect"','renderNavigationCube();'])assert(src.includes(token),token);
 for(const face of ['right','left','front','back','top','bottom'])assert(src.includes("key:'"+face+"'"),face);
 assert(src.includes('bindNavigationCube(root.querySelector(\'.viewCube\'))'));
});
test('Navigation pointer controls only change camera, never drawing objects',()=>{
 const start=src.indexOf('/* Native 3D navigation:');
 const end=src.indexOf('function syncViewControls(){',start);
 const nav=src.slice(start,end);
 assert(start>0&&end>start);
 assert(nav.includes('orientToCubeVector(d.vector)'));
 for(const token of ['pointerdown','pointermove','pointerup','pointercancel','lostpointercapture','Home','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','setPointerCapture','getBoundingClientRect','panView(dx,dy','orbitCameraBy(dx,dy)'])assert(nav.includes(token),token);
 assert(!/records\s*=|records\.push\(|modelRoot\.add\(/.test(nav));
});
test('Orbit control uses outer orbit, center pan and wheel zoom',()=>{
 const start=src.indexOf('function bindOrbitBall(ball){'),end=src.indexOf('function syncViewControls(){',start);
 const code=src.slice(start,end);
 for(const token of ["mode==='pan'",'ball.addEventListener(\'wheel\'','orbit.dist=clamp','panView(dx,dy','applyViewCamera()'])assert(code.includes(token),token);
});
