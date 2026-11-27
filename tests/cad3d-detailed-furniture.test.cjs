const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('cad3d-lab.js','utf8');
test('detailed gallery furniture has valid metric geometry and preserves legacy IDs',()=>{
 const start=source.indexOf('(function(){',source.indexOf('CAD3D_DETAIL_FURNITURE_V1'));
 const end=source.indexOf('function cad3dDetailedPartGeometry',start);
 const old=['bedSingle','bed','nightstand','dresser','wardrobe1','wardrobe2','sofa','sofa2','sofa3','armchair1','armchair2'];
 const C=Object.fromEntries(old.map(id=>[id,{parts:[]}]));
 vm.runInNewContext(source.slice(start,end),{CAD3D_COMPONENTS:C});
 assert.equal(Object.keys(C).filter(id=>id.startsWith('detail-')).length,13);
 for(const id of old)assert.equal(C[id].superseded,true);
 for(const [id,d] of Object.entries(C).filter(([id])=>id.startsWith('detail-'))){
  assert(d.parts.length>=6,id);
  assert(d.parts.every(p=>p.length===8&&p.every(Number.isFinite)&&p.slice(3,6).every(v=>v>0)&&p[7]>=0),id);
  assert(d.parts.some(p=>p[7]>.01),id);
  for(const p of d.parts){assert(Math.abs(p[0])+p[3]/2<=d.w/2+.001,id+' width');assert(Math.abs(p[1])+p[4]/2<=d.d/2+.001,id+' depth');assert(p[2]>=0&&p[2]+p[5]<=d.h+.001,id+' height');}
 }
 assert(source.includes('cad3dDetailedPreview(c,spec)'));
 assert(source.includes('def.detail?cad3dDetailedPartGeometry'));
});
test('local AI is isolated and optional, without credentials or hosted inference',()=>{
 const worker=fs.readFileSync('assets/cad3d-local-render-ai-worker.js','utf8');
 assert.doesNotThrow(()=>new vm.Script(worker));
 assert(worker.includes("pipeline('image-to-image'"));
 assert(worker.includes("device:'wasm'"));
 assert(!/Authorization|apiKey|\/croquis\/render|fetch\(/.test(worker));
 assert(source.includes('worker?.terminate()'));
 assert(source.includes('data-sketch-local-ai'));
});