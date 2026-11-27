'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const cat=[{id:'san-wc',w:.4,d:.7},{id:'san-wc-susp',w:.38,d:.6}];
test('toilet scale uses both axes and accepts orthogonal rotations',async()=>{
 const {toiletScale}=await import('../assets/cad-calco-vision.mjs');
 const e=toiletScale([{label:'toilet',box:[20,20,60,90]},{label:'wc',box:[100,100,170,140]}],cat,1000,800);
 assert.equal(e.samples,2);assert.equal(e.confidence,'corroborated');assert.ok(Math.abs(e.widthM-10)<1e-9);assert.ok(Math.abs(e.heightM-8)<1e-9);
});
test('toilet scale rejects cropped, room-sized, tiny and incompatible labels',async()=>{
 const {toiletScale}=await import('../assets/cad-calco-vision.mjs');
 for(const det of [{label:'toilet room',box:[20,20,60,90]},{label:'wc',box:[0,20,40,90]},{label:'wc',box:[20,20,25,29]},{label:'wc',box:[20,20,120,120]},{label:'bidet',box:[20,20,60,90]}])assert.equal(toiletScale([det],cat,1000,800),null);
});
test('WC image resize is uniform, anchored and respects model units',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../assets/cad-pdf-import.js'),'utf8');
 const a=src.indexOf('function toiletImageResize'),b=src.indexOf('async function wcScaleImage',a);
 const resize=new Function(src.slice(a,b)+'return toiletImageResize;')();
 for(const [unit,w,h] of [[1000,5,4],[1,5000,4000],[10,500,400]]){
  const image={a:{x:4,y:5},b:{x:4+w,y:5-h}};
  const o=resize(image,10,unit);assert.deepEqual(o.a,image.a);assert.equal(o.b.x-4,10000/unit);assert.ok(Math.abs((5-o.b.y)/(o.b.x-4)-.8)<1e-9);assert.equal(image.b.x,4+w);
 }
 assert.equal(resize({a:{x:0,y:0},b:{x:0,y:5}},10,1000),null);
});
test('reference scaling remains explicitly gated and checks drawing state',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../assets/cad-pdf-import.js'),'utf8');
 assert.match(src,/opts\.autoToiletScale===true/);assert.match(src,/if\(!current\(\)\)return/);assert.match(src,/C\.saveHistory\(\);image\.b=/);
 const gallery=fs.readFileSync(path.join(__dirname,'../cad-block-browser.js'),'utf8');assert.match(gallery,/autoToiletScale:isScaleFloorPlan\(item\)/);
});

test('known dimension calibration preserves the first picked anchor and image aspect ratio',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../assets/cad-pdf-import.js'),'utf8');
 const a=src.indexOf('function referenceImageResize'),b=src.indexOf('let imageCalibrationCancel',a);
 const resize=new Function(src.slice(a,b)+'return referenceImageResize;')();
 for(const unit of [1,10,1000]){
  const k=1000/unit,image={a:{x:0,y:0},b:{x:10*k,y:8*k}};
  const p={x:2*k,y:2*k},q={x:6*k,y:2*k},o=resize(image,p,q,8,unit);
  assert.equal(o.factor,2);assert.equal(o.widthM,20);assert.deepEqual(o.a,{x:-2*k,y:-2*k});assert.deepEqual(o.b,{x:18*k,y:14*k});
  assert.equal(resize(image,p,p,8,unit),null);
  assert.equal(resize(image,p,{x:11*k,y:2*k},8,unit),null);
  assert.equal(resize(image,p,q,0,unit),null);
 }
});
test('known dimension takes priority over experimental toilet scaling',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../assets/cad-pdf-import.js'),'utf8');
 assert.match(src,/image\.calcoScale\?\.method==='known-dimension'/);
 assert.match(src,/method:'known-dimension',approximate:false/);
 assert.match(src,/Does the plan lack known dimensions/);
 assert.match(src,/IMAGECALIBRATE','CALIBRARIMAGEN','CALIBRARPLANTA/);
});
