/* Fast, allocation-light screen culling for common 2D primitives.
 * Complex shapes use the existing accurate boundsEntity fallback.
 * Source units stay at 1:1; never mutates entities or viewport. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.BlacklinePerformance=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function finite(p){return p&&Number.isFinite(p.x)&&Number.isFinite(p.y)}
 function viewport(view,w,h,pad=30){
  const s=view?.scale,ox=view?.ox,oy=view?.oy;
  if(!(s>0)&&s!==1)return null;
  if(![s,ox,oy,w,h,pad].every(Number.isFinite))return null;
  return {minX:(-pad-ox)/s,maxX:(w+pad-ox)/s,
   minY:(oy-h-pad)/s,maxY:(oy+pad)/s};
 }
 function overlap(b,v){
  return b.maxX>=v.minX&&b.minX<=v.maxX&&b.maxY>=v.minY&&b.minY<=v.maxY;
 }
 function basicBounds(e){
  if(!e||typeof e!=='object')return null;
  if((e.type==='line'||e.type==='rect')&&finite(e.a)&&finite(e.b)){
   return {minX:Math.min(e.a.x,e.b.x),maxX:Math.max(e.a.x,e.b.x),
    minY:Math.min(e.a.y,e.b.y),maxY:Math.max(e.a.y,e.b.y)};
  }
  if((e.type==='circle'||e.type==='arc')&&finite(e.c)&&Number.isFinite(e.r)&&e.r>=0){
   return {minX:e.c.x-e.r,maxX:e.c.x+e.r,minY:e.c.y-e.r,maxY:e.c.y+e.r};
  }
  if(e.type==='polyline'&&Array.isArray(e.pts)&&e.pts.length&&!e.bulges&&!e.bulge){
   let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
   for(const p of e.pts){
    if(!finite(p))return null;
    if(p.x<minX)minX=p.x;
    if(p.x>maxX)maxX=p.x;
    if(p.y<minY)minY=p.y;
    if(p.y>maxY)maxY=p.y;
   }
   return {minX,minY,maxX,maxY};
  }
  return null;
 }
 function inViewport(e,v,fallback){
  const b=basicBounds(e);
  // Keep the existing exact bounds calculator for complex CAD entities.
  if(b)return overlap(b,v);
  return typeof fallback==='function'?fallback(e):true;
 }
 return Object.freeze({viewport,overlap,basicBounds,inViewport});
});
