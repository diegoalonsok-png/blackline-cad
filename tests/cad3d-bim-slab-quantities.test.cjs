const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('cad3d-lab.js','utf8');
test('BIM inventory includes slab net area and volume and imported material metadata',async()=>{
 let blob;
 const ctx={records:[
 {id:1,type:'slab',w:10,d:8,h:.2,openings:[{id:4,kind:'opening',w:2,d:3,offset:0,offsetY:0}]},
 {id:2,type:'slab',slabKind:'roof',w:5,d:4,h:.25},
 {id:3,type:'slab',w:5,d:4,h:0},
 {id:4,type:'imported3d',ifcClass:'Wall',ifcMaterial:'Concrete',ifcNativeProps:{Style:'Original style'}}
 ],layerForRecord:()=>({name:'Layer 1'}),Blob,URL:{createObjectURL:b=>{blob=b;return 'blob:test'},revokeObjectURL(){}},document:{createElement:()=>({click(){},remove(){}}),body:{append(){}}},setTimeout(){},text(){}};
 vm.createContext(ctx);
 for(const [a,b] of [['function cad3dMassProperties(r){','function cad3dPropertyDetails('],['function cad3dBimWallQuantities(r){','function cad3dEditBimWall('],["function cad3dBimInventory(format='csv'){",'function cad3dScheduleTo2D(']]){
  const start=source.indexOf(a),end=source.indexOf(b,start);assert(start>=0&&end>start);vm.runInContext(source.slice(start,end),ctx);
 }
 ctx.cad3dBimInventory('json');
 const rows=JSON.parse(await blob.text()).elements;
 const slab=rows.find(r=>r.id==='3D:1'),roof=rows.find(r=>r.id==='3D:2'),invalid=rows.find(r=>r.id==='3D:3'),imported=rows.find(r=>r.id==='3D:4');
 assert.equal(slab.grossArea,80);assert.ok(Math.abs(slab.netArea-74)<1e-9);assert.ok(Math.abs(slab.netVolume-14.8)<1e-9);
 assert.equal(roof.class,'Roof');assert.equal(roof.netArea,20);assert.equal(roof.netVolume,5);
 assert.equal(invalid.netArea,null);assert.equal(invalid.netVolume,null);
 assert.equal(imported.material,'Concrete');assert.equal(imported.style,'Original style');
});