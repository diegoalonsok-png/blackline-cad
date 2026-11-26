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
  if(!(s>0)||w<0||h<0||pad<0)return null;
  if(!Number.isFinite(s)||!Number.isFinite(ox)||!Number.isFinite(oy)||!Number.isFinite(w)||!Number.isFinite(h)||!Number.isFinite(pad))return null;
  return {minX:(-pad-ox)/s,maxX:(w+pad-ox)/s,
   minY:(oy-h-pad)/s,maxY:(oy+pad)/s};
 }
 function overlap(b,v){
  return b.maxX>=v.minX&&b.minX<=v.maxX&&b.maxY>=v.minY&&b.minY<=v.maxY;
 }
 function basicBounds(e){
  if(!e||typeof e!=='object')return null;
  if((e.type==='line'||e.type==='rect')&&finite(e.a)&&finite(e.b)){
   const b={minX:Math.min(e.a.x,e.b.x),maxX:Math.max(e.a.x,e.b.x),
    minY:Math.min(e.a.y,e.b.y),maxY:Math.max(e.a.y,e.b.y)};
   if(finite(e.p)){b.minX=Math.min(b.minX,e.p.x);b.maxX=Math.max(b.maxX,e.p.x);b.minY=Math.min(b.minY,e.p.y);b.maxY=Math.max(b.maxY,e.p.y);}
   return b;
  }
  if((e.type==='circle'||e.type==='arc')&&finite(e.c)&&Number.isFinite(e.r)&&e.r>=0){
   return {minX:e.c.x-e.r,maxX:e.c.x+e.r,minY:e.c.y-e.r,maxY:e.c.y+e.r};
  }
  if(e.type==='point'&&finite(e.p))return {minX:e.p.x,maxX:e.p.x,minY:e.p.y,maxY:e.p.y};
  if(e.type==='ellipse'&&finite(e.c)&&Number.isFinite(e.rx)&&Number.isFinite(e.ry)&&e.rx>=0&&e.ry>=0){
   const a=Number(e.rotation)||0,co=Math.cos(a),si=Math.sin(a);
   const dx=Math.hypot(e.rx*co,e.ry*si),dy=Math.hypot(e.rx*si,e.ry*co);
   if(Number.isFinite(dx)&&Number.isFinite(dy))return {minX:e.c.x-dx,maxX:e.c.x+dx,minY:e.c.y-dy,maxY:e.c.y+dy};
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
  if(!v)return true;
  const b=basicBounds(e);
  // Keep the existing exact bounds calculator for complex CAD entities.
  // A wide CAD polyline/rectangle may still paint inside the viewport even
  // when its centreline is outside. Preserve visibility at every zoom level.
  const halfWidth=(e?.type==='polyline'||e?.type==='rect')&&Number.isFinite(e.pwidth)&&e.pwidth>0?e.pwidth/2:0;
  if(b)return halfWidth?overlap({minX:b.minX-halfWidth,minY:b.minY-halfWidth,maxX:b.maxX+halfWidth,maxY:b.maxY+halfWidth},v):overlap(b,v);
  if(halfWidth)return true; // Complex wide geometry: conservative fallback.
  return typeof fallback==='function'?fallback(e):true;
 }

 // Read-only bounding-volume hierarchy. Built for a single calculation,
 // never retained across geometry edits. Unknown bounds are always included.
 function spatialIndex(items,bounds){
  const entries=[],unknown=[],source=items.slice();
  source.forEach((value,i)=>{
   let b;try{b=bounds(value)}catch(err){b=null}
   if(b&&[b.minX,b.minY,b.maxX,b.maxY].every(Number.isFinite)&&b.minX<=b.maxX&&b.minY<=b.maxY){
    // Snapshot bounds: a reused/mutated caller object cannot corrupt the tree.
    entries.push({b:{minX:b.minX,minY:b.minY,maxX:b.maxX,maxY:b.maxY},i,value});
   }else unknown.push({i,value});
  });
  function build(list){
   if(!list.length)return null;
   let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
   for(const e of list){const b=e.b;minX=Math.min(minX,b.minX);minY=Math.min(minY,b.minY);maxX=Math.max(maxX,b.maxX);maxY=Math.max(maxY,b.maxY);}
   const b={minX,minY,maxX,maxY};
   if(list.length<=16)return {b,list};
   const x=maxX-minX>=maxY-minY;list.sort((a,c)=>x?(a.b.minX+a.b.maxX-c.b.minX-c.b.maxX):(a.b.minY+a.b.maxY-c.b.minY-c.b.maxY));
   const mid=list.length>>1;return {b,left:build(list.slice(0,mid)),right:build(list.slice(mid))};
  }
  const tree=build(entries);
  return function query(box){
   if(!box||!Number.isFinite(box.minX)||!Number.isFinite(box.maxX)||!Number.isFinite(box.minY)||!Number.isFinite(box.maxY)||box.minX>box.maxX||box.minY>box.maxY)return source.slice();
   const result=unknown.slice();
   function visit(n){if(!n||!overlap(n.b,box))return;if(n.list){for(const e of n.list)if(overlap(e.b,box))result.push(e);}else{visit(n.left);visit(n.right);}}
   visit(tree);return result.sort((a,b)=>a.i-b.i).map(e=>e.value);
  };
 }
 return Object.freeze({viewport,overlap,basicBounds,inViewport,spatialIndex});
});
