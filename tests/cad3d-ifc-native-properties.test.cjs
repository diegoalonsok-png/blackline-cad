const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('cad3d-lab.js','utf8');
test('IFC native property set survives import and export as source metadata',()=>{
 const ctx={};vm.createContext(ctx);
 for(const [a,b] of [['function cad3dDecodeIFC(source){','async function cad3dImportMeshFile('],['function cad3dEncodeIFC(items,randomBytes){','function exportIFC(']]){
  const start=source.indexOf(a),end=source.indexOf(b,start);assert(start>=0&&end>start);vm.runInContext(source.slice(start,end),ctx);
 }
 const triangles=[[[0,0,0],[2,0,0],[0,0,3]]],random=()=>new Uint8Array(16);
 const encoded=ctx.cad3dEncodeIFC([{id:41,type:'wall',name:'Wall',style:"Muro; ladrillo",layer:'Muros — PB',triangles}],random);
 const item=ctx.cad3dDecodeIFC(encoded)[0];
 const expected={NativeType:'wall',NativeId:'41',Style:'Muro; ladrillo',Layer:'Muros — PB'};
 assert.deepEqual(JSON.parse(JSON.stringify(item.nativeProps)),expected);
 ctx.records=[];ctx.cad3dHistoryStart=()=>{};ctx.newRecord=type=>({type,id:99});ctx.redraw=()=>{};ctx.renderProps=()=>{};ctx.text=()=>{};
 ctx.cad3dImportIFC(encoded);
 assert.deepEqual(JSON.parse(JSON.stringify(ctx.records[0].ifcNativeProps)),expected);
 assert.equal(ctx.records[0].styleId,undefined);
 const reencoded=ctx.cad3dEncodeIFC([{...item,id:99,type:'wall',style:'new',layer:'new'}],random);
 assert.deepEqual(JSON.parse(JSON.stringify(ctx.cad3dDecodeIFC(reencoded)[0].nativeProps)),expected);
 assert(source.includes('o.ifcNativeProps=props'));
 assert(source.includes('delete dest.ifcNativeProps.NativeId'));
 assert(source.includes('delete copy.ifcNativeProps.NativeId'));
});