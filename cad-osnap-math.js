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
  const vx=b.x-a.x,vy=b.y-a.y,den=vx*vx+vy*vy;
  if(den<1e-20)return null;
  const t=((q.x-a.x)*vx+(q.y-a.y)*vy)/den;
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
  const dx=origin.x-center.x,dy=origin.y-center.y,d2=dx*dx+dy*dy,r2=r*r;
  if(d2<=r2+1e-12)return [];
  const base=r2/d2,offset=r*Math.sqrt(d2-r2)/d2;
  return [
   point(center.x+base*dx-offset*dy,center.y+base*dy+offset*dx),
   point(center.x+base*dx+offset*dy,center.y+base*dy-offset*dx)
  ];
 }
 return Object.freeze({segmentFoot,perpendicular,nearestOnSegment,tangentPoints});
});
