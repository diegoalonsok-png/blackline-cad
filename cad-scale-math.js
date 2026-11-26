/* Uniform CAD scale math: pure, independently testable and model-unit agnostic. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.BlacklineScaleMath=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function scalePoint(p,origin,factor){
  return {x:origin.x+(p.x-origin.x)*factor,y:origin.y+(p.y-origin.y)*factor};
 }
 function referenceRadius(entities,origin,bounds){
  let far=0;
  for(const entity of entities){
   const b=bounds(entity);if(!b||![b.minX,b.maxX,b.minY,b.maxY].every(Number.isFinite)||b.minX>b.maxX||b.minY>b.maxY)continue;
   for(const x of [b.minX,b.maxX])for(const y of [b.minY,b.maxY]){
    const distance=Math.hypot(x-origin.x,y-origin.y);
    if(Number.isFinite(distance))far=Math.max(far,distance);
   }
  }
  return far>1e-10?far:1;
 }
 function mouseFactor(origin,cursor,reference){
  if(!(reference>0)||!Number.isFinite(reference))return null;
  const factor=Math.hypot(cursor.x-origin.x,cursor.y-origin.y)/reference;
  return Number.isFinite(factor)&&factor>=1e-4&&factor<=1e4?factor:null;
 }
 function scaleEntity(entity,origin,factor){
  if(!Number.isFinite(factor)||factor<=0)throw Error('Invalid SCALE factor');
  const copy=JSON.parse(JSON.stringify(entity)),map=p=>scalePoint(p,origin,factor);
  if(copy.p)copy.p=map(copy.p);
  if(copy.a)copy.a=map(copy.a);
  if(copy.b)copy.b=map(copy.b);
  if(copy.c)copy.c=map(copy.c);
  if(Array.isArray(copy.pts))copy.pts=copy.pts.map(map);
  if(Array.isArray(copy.holes))copy.holes=copy.holes.map(loop=>Array.isArray(loop)?loop.map(map):loop);
  if(copy.wall2d){
   if(Number.isFinite(copy.wall2d.thickness))copy.wall2d.thickness*=factor;
   for(const key of ['guideA','guideB'])if(copy.wall2d[key])copy.wall2d[key]=map(copy.wall2d[key]);
  }
  if(copy.type==='blockRef')copy.scale=(Number(copy.scale)||1)*factor;
  else{
   for(const prop of ['r','rx','ry','h','pwidth','hatchSpacing','hatchScale'])if(Number.isFinite(copy[prop]))copy[prop]*=factor;
   // Original DXF hatch definitions no longer describe a scaled contour/pattern.
   // The exporter rebuilds the pattern from the scaled native spacing.
   if(copy.type==='hatch'&&factor!==1)delete copy.dxfPattern;
   if(copy.type==='text'){
    // Model-space text box and circular path must scale with glyph height.
    for(const prop of ['mtextWidth','textRadius'])if(Number.isFinite(copy[prop]))copy[prop]*=factor;
   }
   if(copy.type==='dimension'&&copy.style){
    for(const prop of ['textHeight','arrow','gap','extensionOffset','extensionExtension','tickSize','extOffset','tolerance']){
     if(Number.isFinite(copy.style[prop]))copy.style[prop]*=factor;
    }
    if(Number.isFinite(copy.style.extBeyond)&&copy.style.extBeyond>=0)copy.style.extBeyond*=factor;
   }
  }
  return copy;
 }
 return Object.freeze({scalePoint,referenceRadius,mouseFactor,scaleEntity});
});
