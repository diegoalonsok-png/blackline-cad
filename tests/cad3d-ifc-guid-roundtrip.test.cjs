const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('cad3d-lab.js','utf8');
test('IFC roundtrip preserves source product GUID and allocates unique IDs for duplicates',()=>{
 const ctx={};vm.createContext(ctx);
 for(const [a,b] of [['function cad3dDecodeIFC(source){','function cad3dImportIFC('],['function cad3dEncodeIFC(items,randomBytes){','function exportIFC(']]){
  const start=source.indexOf(a),end=source.indexOf(b,start);assert(start>=0&&end>start);vm.runInContext(source.slice(start,end),ctx);
 }
 const triangles=[[[0,0,0],[2,0,0],[0,0,3]]],guid='0'.repeat(22),random=()=>new Uint8Array(16);
 const encoded=ctx.cad3dEncodeIFC([{id:1,type:'wall',name:'Original',ifcGuid:guid,triangles},{id:2,type:'wall',name:'Duplicate',ifcGuid:guid,triangles},{id:3,type:'slab',name:'New',triangles}],random);
 const result=ctx.cad3dDecodeIFC(encoded);
 assert.equal(result[0].ifcGuid,guid);assert.equal(new Set(result.map(i=>i.ifcGuid)).size,3);
 const all=[...encoded.matchAll(/^#\d+=IFC[A-Z0-9]+\('([0-3][A-Za-z0-9_$]{21})',/gm)].map(m=>m[1]);assert.equal(new Set(all).size,all.length);
 const roundtrip=ctx.cad3dDecodeIFC(ctx.cad3dEncodeIFC(result.map((item,id)=>({...item,id,type:item.ifcClass.toLowerCase()})),random));
 assert.deepEqual(Array.from(roundtrip,i=>i.ifcGuid),Array.from(result,i=>i.ifcGuid));
 assert(source.includes('delete dest.ifcGuid'));assert(source.includes('delete copy.ifcGuid'));
 assert(source.includes('ifcGuid:r.ifcGuid,triangles:[]'));
});