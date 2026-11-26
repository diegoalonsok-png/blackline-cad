const test=require('node:test');
const assert=require('node:assert/strict');
const lib=require('../assets/cad2d-arq-generators.js');

test('CALCOPY chooses dynamic variants and regenerates native geometry',async()=>{
 const {bestCatalogMatch}=await import('../assets/cad-calco-vision.mjs');
 const cases=[
 ['fridge',90,72,'kq-heladera2',0],
 ['fridge',65,70,'kq-heladera',0],
 ['dining table',120,180,'mob-mesa4',0],
 ['dining table',190,200,'mob-mesa6',0],
 ['toilet',70,40,'san-wc',90],
 ['sofa',230,92,'mob-sofa3',0],
 ['cooktop',45,55,'kq-anafe2',0],
 ['bathtub',170,75,'san-banera',0]
 ];
 for(const [label,w,d,id,rotation] of cases){
  const x=bestCatalogMatch(label,[0,0,w,d],lib.library,.01,.01);
  assert.equal(x.item.id,id);assert.equal(x.rotation,rotation);
  const built=lib.build(id,x.w,x.d);
  assert.ok(built.entities.length);assert.ok(Math.abs(built.w-x.w)<1e-8);
  assert.ok(Math.abs(built.d-x.d)<1e-8);
 }
 assert.equal(bestCatalogMatch('unknown',[0,0,50,50],lib.library,.01,.01),null);
});
