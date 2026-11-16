/* OTRACK: transient orthogonal construction guides.
   Geometry is deliberately independent of drawing persistence and export. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.BlacklineTrackingMath=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const valid=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
 function project(pointer,anchors,scale,tolerancePixels=10){
  if(!valid(pointer)||!Array.isArray(anchors)||!(scale>0))return null;
  const limit=tolerancePixels/scale;
  let horizontal=null,vertical=null;
  let closestH=limit,closestV=limit;
  for(const anchor of anchors){
   if(!valid(anchor))continue;
   const dx=Math.abs(pointer.x-anchor.x),dy=Math.abs(pointer.y-anchor.y);
   if(dx<closestV){closestV=dx;vertical=anchor}
   if(dy<closestH){closestH=dy;horizontal=anchor}
  }
  if(!horizontal&&!vertical)return null;
  const target={x:vertical?vertical.x:pointer.x,y:horizontal?horizontal.y:pointer.y};
  return {point:target,vertical:vertical?{x:vertical.x,y:vertical.y}:null,
    horizontal:horizontal?{x:horizontal.x,y:horizontal.y}:null,
    intersection:!!vertical&&!!horizontal};
 }
 function acquire(anchors,point,max=4){
  if(!valid(point))return anchors.slice();
  const next=anchors.filter(p=>valid(p)&&Math.hypot(p.x-point.x,p.y-point.y)>1e-8);
  next.push({x:point.x,y:point.y});
  return next.slice(-max);
 }
 return Object.freeze({project,acquire});
});
