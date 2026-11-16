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
   const b=bounds(entity);if(!b)continue;
   for(const x of [b.minX,b.maxX])for(const y of [b.minY,b.maxY])
    far=Math.max(far,Math.hypot(x-origin.x,y-origin.y));
  }
  return far>1e-10?far:1;
 }
 function mouseFactor(origin,cursor,reference){
  if(!(reference>0)||!Number.isFinite(reference))return null;
  const factor=Math.hypot(cursor.x-origin.x,cursor.y-origin.y)/reference;
  return Number.isFinite(factor)&&factor>=1e-4&&factor<=1e4?factor:null;
 }
 function scaleEntity(entity,origin,factor){
  if(!(factor>0)&&factor!==1)throw Error('Invalid SCALE factor');
  if(!Number.isFinite(factor))throw Error('Invalid SCALE factor');
  const copy=JSON.parse(JSON.stringify(entity)),map=p=>scalePoint(p,origin,factor);
  if(copy.p)copy.p=map(copy.p);
  if(copy.a)copy.a=map(copy.a);
  if(copy.b)copy.b=map(copy.b);
  if(copy.c)copy.c=map(copy.c);
  if(Array.isArray(copy.pts))copy.pts=copy.pts.map(map);
  if(copy.type==='blockRef')copy.scale=(Number(copy.scale)||1)*factor;
  else{
   for(const prop of ['r','rx','ry','h'])if(Number.isFinite(copy[prop]))copy[prop]*=factor;
   if(copy.type==='dimension'&&copy.style){
    for(const prop of ['textHeight','arrow','gap','extensionOffset','extensionExtension','tickSize']){
     if(Number.isFinite(copy.style[prop]))copy.style[prop]*=factor;
    }
   }
  }
  return copy;
 }
 return Object.freeze({scalePoint,referenceRadius,mouseFactor,scaleEntity});
});
