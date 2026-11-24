/* Blackline OSNAP geometry, independent of canvas and units.
 * Projection to segments and tangent candidates from a reference point.
 * Public for browser; CommonJS export for Node regression checks. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.BlacklineOSNAPMath=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const finite=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
 const point=(x,y)=>({x,y});
 function segmentFoot(q,a,b){
  if(!finite(q)||!finite(a)||!finite(b))return null;
  const vx=b.x-a.x,vy=b.y-a.y,len=Math.hypot(vx,vy);
  if(!Number.isFinite(len)||len<1e-10)return null;
  const t=(((q.x-a.x)*(vx/len))+((q.y-a.y)*(vy/len)))/len;
  if(!Number.isFinite(t))return null;
  const clipped=Math.max(0,Math.min(1,t));
  return {point:point(a.x+clipped*vx,a.y+clipped*vy),t,within:t>=0&&t<=1};
 }
 function perpendicular(origin,a,b){
  const foot=segmentFoot(origin,a,b);
  return foot&&foot.within?foot.point:null;
 }
 function nearestOnSegment(q,a,b){
  const foot=segmentFoot(q,a,b);
  return foot?foot.point:null;
 }
 function tangentPoints(origin,center,r){
  if(!finite(origin)||!finite(center)||!Number.isFinite(r)||r<=0)return [];
  const dx=origin.x-center.x,dy=origin.y-center.y,d=Math.hypot(dx,dy);
  if(!Number.isFinite(d)||d<=r||!d)return [];
  const ratio=r/d,ux=dx/d,uy=dy/d;
  const base=r*ratio,offset=r*Math.sqrt((1-ratio)*(1+ratio));
  return [
   point(center.x+base*ux-offset*uy,center.y+base*uy+offset*ux),
   point(center.x+base*ux+offset*uy,center.y+base*uy-offset*ux)
  ].filter(finite);
 }
 return Object.freeze({segmentFoot,perpendicular,nearestOnSegment,tangentPoints});
});
