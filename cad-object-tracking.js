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
  if(!valid(pointer)||!Array.isArray(anchors)||!Number.isFinite(scale)||!(scale>0)||!Number.isFinite(tolerancePixels)||tolerancePixels<=0)return null;
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
 // Rastreo como en los CAD de escritorio: rayos desde cada punto adquirido a 0/90/180/270° (y a los ángulos polares si POLAR está activo).
 // Devuelve el punto sobre el rayo más cercano al cursor, o la intersección de dos rayos de puntos distintos.
 function projectRays(pointer,anchors,scale,tolerancePixels=10,angles=[0,90]){
  if(!valid(pointer)||!Array.isArray(anchors)||!Number.isFinite(scale)||!(scale>0)||!Number.isFinite(tolerancePixels)||tolerancePixels<=0)return null;
  const limit=tolerancePixels/scale,dirs=[];
  if(!Array.isArray(angles))return null;
  for(const deg of angles){if(!Number.isFinite(deg))continue;const a=deg*Math.PI/180;dirs.push([Math.cos(a),Math.sin(a)]);}
  const hits=[];
  for(const anchor of anchors){if(!valid(anchor))continue;
   for(const [ux,uy] of dirs){
    const vx=pointer.x-anchor.x,vy=pointer.y-anchor.y,t=vx*ux+vy*uy,d=Math.abs(-vx*uy+vy*ux);
    if(d<limit&&Math.abs(t)>limit*.5){const s=t>=0?1:-1;hits.push({anchor,ux:ux*s,uy:uy*s,d,t:Math.abs(t),point:{x:anchor.x+ux*t,y:anchor.y+uy*t}})}
   }}
  if(!hits.length)return null;
  hits.sort((a,b)=>a.d-b.d);
  const best=hits[0];
  for(const h of hits.slice(1)){
   if(h.anchor===best.anchor)continue;
   const den=best.ux*h.uy-best.uy*h.ux;if(Math.abs(den)<1e-9)continue;
   const dx=h.anchor.x-best.anchor.x,dy=h.anchor.y-best.anchor.y,s=(dx*h.uy-dy*h.ux)/den;
   const t=(dx*best.uy-dy*best.ux)/den;
   // An intersection behind either acquired ray is not a valid tracking target.
   if(s<-1e-9||t<-1e-9)continue;
   const ip={x:best.anchor.x+best.ux*s,y:best.anchor.y+best.uy*s};
   if(Math.hypot(ip.x-pointer.x,ip.y-pointer.y)<limit*1.6)return {point:ip,rays:[best,h],intersection:true};
  }
  return {point:best.point,rays:[best],intersection:false};
 }
 // ORTHO is a hard constraint: OTRACK can change only the free coordinate.
 function projectOrtho(pointer,base,anchors,scale,tolerancePixels=10,axis){
  if(!valid(pointer)||!valid(base)||!Number.isFinite(scale)||!(scale>0)||!Number.isFinite(tolerancePixels)||tolerancePixels<=0)return null;
  const h=axis?axis==='h':Math.abs(pointer.x-base.x)>=Math.abs(pointer.y-base.y);
  const limit=tolerancePixels/scale,coord=h?'x':'y';
  const point=h?{x:pointer.x,y:base.y}:{x:base.x,y:pointer.y};
  let best=null,distance=limit;
  for(const a of anchors||[]){
   if(!valid(a))continue;
   const d=Math.abs(pointer[coord]-a[coord]);
   if(d<distance){distance=d;best=a}
  }
  if(best)point[coord]=best[coord];
  return {point,axis:h?'h':'v',vertical:h&&best?{x:best.x,y:best.y}:null,horizontal:!h&&best?{x:best.x,y:best.y}:null,intersection:!!best};
 }
 return Object.freeze({project,acquire,projectRays,projectOrtho});
});
