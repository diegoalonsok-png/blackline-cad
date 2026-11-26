const test=require('node:test');
const assert=require('node:assert/strict');

test('CALCOPY: horizontal and vertical placement follows native block dimensions',async()=>{
 const {orthogonalFit}=await import('../assets/cad-calco-vision.mjs');
 const cases=[
  [[10,20,50,90],{w:.4,d:.7},.01,.01,0],
  [[10,20,80,60],{w:.4,d:.7},.01,.01,90],
  [[0,0,120,50],{w:1.2,d:.5},.01,.01,0],
  [[0,0,50,120],{w:1.2,d:.5},.01,.01,90],
  [[0,0,40,80],{w:.8,d:.4},.02,.005,0]
 ];
 for(const [box,it,sx,sy,angle] of cases){
  const fit=orthogonalFit(box,it,sx,sy);assert.equal(fit.rotation,angle);
  const a=angle*Math.PI/180;
  assert.ok(Math.abs(fit.x+(it.w*Math.cos(a)-it.d*Math.sin(a))/2/sx-(box[0]+box[2])/2)<1e-8);
  assert.ok(Math.abs(fit.y-(it.w*Math.sin(a)+it.d*Math.cos(a))/2/sy-(box[1]+box[3])/2)<1e-8);
 }
 assert.equal(orthogonalFit([0,0,50,50],{w:.5,d:.5},.01,.01).uncertain,true);
 assert.equal(orthogonalFit([0,0,1000,1000],{w:.5,d:.5},.01,.01),null);
});
