const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('cad3d-lab.js','utf8');
test('IFC4 supported subset accepts Windows newlines and wrapped STEP records without splitting quoted labels',()=>{
 const ctx={};vm.createContext(ctx);
 for(const [startName,endName] of [['function cad3dDecodeIFC(source){','function cad3dImportIFC('],['function cad3dEncodeIFC(items,randomBytes){','function exportIFC(']]){
  const start=source.indexOf(startName),end=source.indexOf(endName,start);
  assert(start>=0&&end>start);vm.runInContext(source.slice(start,end),ctx);
 }
 let serial=0;
 const items=[{id:1,name:"Wall; O'Brien",type:'wall',level:{name:'Ground',elevation:0},triangles:[[[0,0,0],[2,0,0],[0,0,3]]]}];
 const encoded=ctx.cad3dEncodeIFC(items,()=>Uint8Array.from({length:16},()=>++serial%256));
 const original=JSON.stringify(ctx.cad3dDecodeIFC(encoded));
 const wrapped=encoded.replace(/(#\d+)=([A-Z0-9]+)\(/g,'$1 = $2 (\n').replace(/;\n(?=#)/g,'; ').replace(/\n/g,'\r\n');
 assert.equal(JSON.stringify(ctx.cad3dDecodeIFC('\uFEFF'+wrapped)),original);
 assert.equal(ctx.cad3dDecodeIFC(encoded)[0].name,"Wall; O'Brien");
 assert.throws(()=>ctx.cad3dDecodeIFC(encoded.replace(/;\nENDSEC;\nEND-ISO/,'\nENDSEC;\nEND-ISO')),/invalid entity/);
 assert.throws(()=>ctx.cad3dDecodeIFC(encoded.replace("FILE_SCHEMA(('IFC4'));","FILE_SCHEMA(('IFC2X3'));")),/only Blackline IFC4/);
});