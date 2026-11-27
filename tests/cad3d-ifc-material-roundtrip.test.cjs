const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('cad3d-lab.js','utf8');
test('IFC simple material names survive import and re-export without implying a visual texture',()=>{
 const ctx={};vm.createContext(ctx);
 for(const [a,b] of [['function cad3dDecodeIFC(source){','async function cad3dImportMeshFile('],['function cad3dEncodeIFC(items,randomBytes){','function exportIFC(']]){
  const start=source.indexOf(a),end=source.indexOf(b,start);assert(start>=0&&end>start);vm.runInContext(source.slice(start,end),ctx);
 }
 const triangles=[[[0,0,0],[2,0,0],[0,0,3]]],random=()=>new Uint8Array(16);
 const encoded=ctx.cad3dEncodeIFC([{id:1,type:'wall',name:'Wall',material:"Béton; O'Brien",triangles},{id:2,type:'slab',name:'Slab',triangles}],random);
 const result=ctx.cad3dDecodeIFC(encoded);
 assert.equal(result[0].material,"Béton; O'Brien");
 assert.equal(result[1].material,undefined);
 ctx.records=[];ctx.cad3dHistoryStart=()=>{};ctx.newRecord=type=>({type,id:ctx.records.length+1});ctx.redraw=()=>{};ctx.renderProps=()=>{};ctx.text=()=>{};
 ctx.cad3dImportIFC(encoded);
 assert.equal(ctx.records[0].ifcMaterial,"Béton; O'Brien");
 assert.equal(ctx.records[0].materialId,undefined);
 const reencoded=ctx.cad3dEncodeIFC(result.map((r,id)=>({...r,id,type:r.ifcClass.toLowerCase(),material:ctx.records[id].ifcMaterial})),random);
 assert.equal(ctx.cad3dDecodeIFC(reencoded)[0].material,result[0].material);
 assert(source.includes('o.ifcMaterial=r.ifcMaterial.slice(0,120)'));
 assert(source.includes('material:r.ifcMaterial||r.materialId'));
});