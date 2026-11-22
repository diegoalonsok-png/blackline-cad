'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../assets/cad2d-olympiadas-pro.js'),'utf8');
function load(library=[]){
 const window={CAD2D_ARQ_LIBRARY:{library,categories:[]}};
 vm.runInNewContext(source,{window,atob:s=>Buffer.from(s,'base64').toString('latin1')},{timeout:12000});
 return window.CAD2D_ARQ_LIBRARY;
}
test('Twenty distinct original Olimpiadas blocks register into existing PRO palette',()=>{
 const lib=load();assert.equal(lib.library.length,20);
 assert.equal(new Set(lib.library.map(x=>x.id)).size,20);
 assert.ok(lib.library.every(x=>x.pro===true&&x.source.startsWith('ca_')));
 assert.ok(lib.categories.includes('Vehículos'));
});
test('All twenty blocks generate editable nonempty line vectors within scaled bounds',()=>{
 const lib=load();
 for(const item of lib.library){
  let drawn=0;const W=item.w,D=item.d;
  item.gen({line(x,y,X,Y){
   assert.ok([x,y,X,Y].every(Number.isFinite),item.name+' finite coordinates');
   assert.ok(x>=-1e-8&&y>=-1e-8&&X>=-1e-8&&Y>=-1e-8);
   assert.ok(x<=W+1e-8&&X<=W+1e-8&&y<=D+1e-8&&Y<=D+1e-8);
   drawn++;
  }},W,D);
  assert.ok(drawn>=20,item.name+' real vectors');
 }
});
test('Re-loading the pack does not duplicate IDs',()=>{
 const lib=load();const second=load(lib.library);assert.equal(second.library.length,20);
});
