/* Conservative opening cutter for architectural LINE walls.
   Pure geometry: no state mutation, no history, no UI side effects. */
(function(root,factory){
 const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.BlacklineAutoOpening=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const valid=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
 function plan(lines,origin,width,angleDegrees,maxOffset){
  if(!Array.isArray(lines)||!valid(origin)||!(Number.isFinite(width)&&width>0)||!Number.isFinite(angleDegrees)||!(Number.isFinite(maxOffset)&&maxOffset>=0))return [];
  const theta=angleDegrees*Math.PI/180,ux=Math.cos(theta),uy=Math.sin(theta),vx=-uy,vy=ux;
  const output=[],start=origin,end={x:origin.x+ux*width,y:origin.y+uy*width},eps=Math.max(1e-8,width*1e-7);
  for(const e of lines){
   if(!e||e.type!=='line'||!valid(e.a)||!valid(e.b))continue;
   const d={x:e.b.x-e.a.x,y:e.b.y-e.a.y},length=Math.hypot(d.x,d.y);
   if(length<eps)continue;
   // Line orientation must match the axis of the inserted opening.
   if(Math.abs((d.x*vy-d.y*vx)/length)>1e-4)continue;
   const offsetA=(e.a.x-origin.x)*vx+(e.a.y-origin.y)*vy;
   const offsetB=(e.b.x-origin.x)*vx+(e.b.y-origin.y)*vy;
   if(Math.max(Math.abs(offsetA),Math.abs(offsetB))>maxOffset+eps)continue;
   const tA=(e.a.x-origin.x)*ux+(e.a.y-origin.y)*uy;
   const tB=(e.b.x-origin.x)*ux+(e.b.y-origin.y)*uy;
   const lo=Math.min(tA,tB),hi=Math.max(tA,tB);
   // Only cut a continuous wall segment crossing the ENTIRE opening,
   // retaining stubs on both sides. Shorter/adjacent walls remain intact.
   if(lo>=-eps||hi<=width+eps)continue;
   const point=t=>({x:e.a.x+(e.b.x-e.a.x)*t,y:e.a.y+(e.b.y-e.a.y)*t});
   const t0=(0-tA)/(tB-tA),t1=(width-tA)/(tB-tA);
   const first=Math.min(t0,t1),second=Math.max(t0,t1);
   if(first<=eps||second>=1-eps||second-first<=eps)continue;
   output.push({id:e.id,first:{a:{...e.a},b:point(first)},second:{a:point(second),b:{...e.b}},opening:{start,end}});
  }
  return output;
 }
 return Object.freeze({plan});
});
