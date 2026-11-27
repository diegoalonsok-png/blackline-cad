const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const engine=require('../cad3d-croquis-studio.js'),ai=engine.semantic;
const empty={version:1,examples:[]};
const scene={sky:.4,glass:.05,ground:.2,cutout:.15,light:.7,edges:.3};
test('semantic render interprets Spanish and English intents and selects actual style',()=>{
 const a=ai.predict('acuarela suave de fachada',scene,'estudio',empty);
 const b=ai.predict('soft architectural watercolor',scene,'estudio',empty);
 assert.equal(a.style,'acuarela');assert.equal(b.style,'acuarela');
 assert.equal(ai.predict('croquis a lápiz monocromo',scene,'acuarela',empty).settings.color,0);
 assert.equal(ai.predict('plumilla intensa',scene,'estudio',empty).style,'plumilla');
 assert.equal(a.warp,0);
 assert(a.settings.shadow<ai.predict('acuarela intensa',scene,'estudio',empty).settings.shadow);
});
test('explicit training learns corrected controls and persists in a portable dataset',()=>{
 const p='acuarela suave de fachada',before=ai.predict(p,scene,'estudio',empty);
 const settings={...before.settings,shadow:24,grain:88,lineWeight:.7};
 const trained=ai.train(empty,p,scene,before.style,settings);
 assert.equal(empty.examples.length,0);
 assert.equal(trained.examples.length,1);
 const restored=ai.validate(JSON.parse(JSON.stringify(trained)));
 assert.deepEqual(ai.predict(p,scene,'estudio',restored).settings,settings);
 const near=ai.predict('acuarela suave de fachada arquitectónica',scene,'estudio',restored);
 assert(near.settings.shadow<ai.predict('acuarela suave de fachada arquitectónica',scene,'estudio',empty).settings.shadow);
 assert.equal(ai.train(trained,p,scene,before.style,settings).examples.length,1);
});
test('scene statistics distinguish sky, glazing and photographic cutouts',()=>{
 const g={w:2,h:2,id:new Uint16Array([0,1,2,3]),light:new Uint8Array([0,200,100,150]),materials:[null,{glass:true},{ground:true},{cutout:true}]};
 const f=ai.scene(g);
 for(const k of ['sky','glass','ground','cutout'])assert.equal(f[k],.25);
 assert(f.light>0&&f.light<1);
 assert.equal(ai.scene(null).light,.5);
});
test('training input is bounded and invalid files cannot contaminate model',()=>{
 assert.throws(()=>ai.validate({version:2,examples:[]}));
 assert.throws(()=>ai.validate({version:1,examples:Array(301).fill({})}));
 assert.throws(()=>ai.train(empty,'acuarela',{...scene,sky:2},'acuarela',{}));
 assert.throws(()=>ai.train(empty,'acuarela',scene,'acuarela',{color:NaN}));
});
test('semantic panel uses local model, explicit learning and no remote service',()=>{
 const lab=fs.readFileSync('cad3d-lab.js','utf8');
 assert.doesNotThrow(()=>new vm.Script(lab));
 const section=lab.slice(lab.indexOf('function cad3dInitSemanticRender'),lab.indexOf('function cad3dInitSketchCapture'));
 for(const k of ['ai.predict','ai.train','localStorage.setItem','data-semantic-export','data-semantic-import','studioWarp'])assert(section.includes(k));
 assert(!/fetch\(|Authorization|apiKey|CAD2D_PLAN/.test(section));
});


test('recursive practice refuses to train on insufficient approved examples',()=>{
 const r=ai.practice(empty,undefined,0);
 assert.equal(r.accepted,false);assert.equal(r.reason,'insufficient');
 assert.deepEqual(r.calibration,ai.calibration());
});
test('recursive calibration cannot promote a worse held-out error',()=>{
 let data=empty;
 for(let i=0;i<12;i++){
  const prompt='acuarela suave fachada variante'+i,sc={...scene,sky:.1+i*.05};
  const settings={...ai.predict(prompt,sc,'acuarela',empty).settings,grain:95,shadow:15};
  data=ai.train(data,prompt,sc,'acuarela',settings);
 }
 const before=JSON.stringify(data);let c=ai.calibration();
 for(let i=0;i<3;i++){
  const r=ai.practice(data,c,i);
  assert.equal(r.groups,12);assert(r.holdout>0);
  if(r.accepted)assert(r.after<r.before);else assert.deepEqual(r.calibration,c);
  c=r.calibration;
 }
 assert.equal(JSON.stringify(data),before,'never generate new training labels');
 assert.throws(()=>ai.calibration({strength:999,bandwidth:1,neighbors:3}));
});
test('practice worker runs actual bounded artistic raster and contour checks locally',()=>{
 const worker=fs.readFileSync('assets/cad3d-semantic-practice-worker.js','utf8');
 let result;
 const ctx={self:{BlacklineCroquisStudio:engine,postMessage:r=>{result=r;}},importScripts:()=>{}};
 vm.runInNewContext(worker,ctx);
 ctx.self.onmessage({data:{dataset:empty,calibration:ai.calibration(),pass:0}});
 assert.equal(result.ok,true,result.error);
 assert.equal(result.checks.length,3);
 assert(result.checks.every(c=>c.pixels===96*64&&c.contrast>=8));
 assert(!/fetch\(|Authorization|apiKey/.test(worker));
});
test('background practice is capped and terminates when hidden',()=>{
 const lab=fs.readFileSync('cad3d-lab.js','utf8');
 const section=lab.slice(lab.indexOf('function cad3dInitSemanticRender'),lab.indexOf('function cad3dInitSketchCapture'));
 for(const k of ['new Worker','worker.terminate','round>=3','document.hidden','visibilitychange','revision','20000'])assert(section.includes(k));
});
