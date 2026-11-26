/* Pure 2D middle-grip wall translation and temporary room-clearance measurements. */
(function(root,factory){
 const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.BlacklineWallGrip=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const good=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
 const length=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);
 const midpoint=e=>({x:(e.a.x+e.b.x)/2,y:(e.a.y+e.b.y)/2});
 function normal(line){if(!line||!good(line.a)||!good(line.b))return null;const d=length(line.a,line.b);return d>1e-8?{x:-(line.b.y-line.a.y)/d,y:(line.b.x-line.a.x)/d}:null}
 function projectShift(line,origin,current,grid=0){
  const n=normal(line);if(!n||!good(origin)||!good(current))return null;
  let displacement=(current.x-origin.x)*n.x+(current.y-origin.y)*n.y;
  if(Number.isFinite(grid)&&grid>0)displacement=Math.round(displacement/grid)*grid;
  return {dx:n.x*displacement,dy:n.y*displacement,displacement};
 }
 function shifted(line,shift){return {...line,a:{x:line.a.x+shift.dx,y:line.a.y+shift.dy},b:{x:line.b.x+shift.dx,y:line.b.y+shift.dy}}}
 function nearestParallelWall(wall,others){
  const n=normal(wall);if(!n)return null;
  const mid=midpoint(wall),axis={x:-n.y,y:n.x};
  const half=length(wall.a,wall.b)/2;
  let best=null;
  for(const other of others){
   if(!other||other.id===wall.id||other.type!=='line'||!good(other.a)||!good(other.b))continue;
   const otherN=normal(other);if(!otherN||Math.abs(n.x*otherN.x+n.y*otherN.y)<.9995)continue;
   const rel=p=>({x:p.x-mid.x,y:p.y-mid.y});
   const a=rel(other.a),b=rel(other.b);
   const alongA=a.x*axis.x+a.y*axis.y,alongB=b.x*axis.x+b.y*axis.y;
   const min=Math.max(-half,Math.min(alongA,alongB));
   const max=Math.min(half,Math.max(alongA,alongB));
   if(max<=min)continue; // no shared longitudinal interval
   // Measure at the midpoint of the shared interval, not at the midpoint
   // of a potentially much longer, slightly skewed neighbouring wall.
   const t=((min+max)/2-alongA)/(alongB-alongA);
   const clearance=(a.x+(b.x-a.x)*t)*n.x+(a.y+(b.y-a.y)*t)*n.y;
   if(!Number.isFinite(clearance))continue;
   if(Math.abs(clearance)<1e-7)continue;
   if(!best||Math.abs(clearance)<Math.abs(best.signed))best={signed:clearance,wallId:other.id};
  }
  return best;
 }
 return Object.freeze({midpoint,normal,projectShift,shifted,nearestParallelWall});
});
