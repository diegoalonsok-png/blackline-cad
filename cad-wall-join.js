/* Planar 2D wall LINE joining. Pure planning: never changes source objects.
   Only endpoints are joined; intersecting continuous walls stay intact. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.BlacklineWallJoin=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const valid=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
 const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const copy=p=>({x:p.x,y:p.y});
 function intersection(a,b,c,d){
  if(![a,b,c,d].every(valid))return null;
  const lu=dist(a,b),lv=dist(c,d);
  if(!Number.isFinite(lu)||!Number.isFinite(lv)||lu===0||lv===0)return null;
  const ux=(b.x-a.x)/lu,uy=(b.y-a.y)/lu,vx=(d.x-c.x)/lv,vy=(d.y-c.y)/lv;
  const den=ux*vy-uy*vx;
  if(!Number.isFinite(den)||Math.abs(den)<1e-10)return null;
  const dx=c.x-a.x,dy=c.y-a.y;
  const along=(dx*vy-dy*vx)/den,other=(dx*uy-dy*ux)/den;
  const t=along/lu,s=other/lv,point={x:a.x+along*ux,y:a.y+along*uy};
  return valid(point)&&Number.isFinite(t)&&Number.isFinite(s)?{point,t,s}:null;
 }
 function plan(incoming,existing,tolerance){
  if(!incoming||incoming.type!=='line'||!valid(incoming.a)||!valid(incoming.b)||
     !Number.isFinite(tolerance)||tolerance<=0||dist(incoming.a,incoming.b)<=1e-8)return {line:incoming,updates:[]};
  const candidate={...incoming,a:copy(incoming.a),b:copy(incoming.b)};
  const updates=new Map();
  for(const end of ['a','b']){
   let best=null;
   for(const wall of Array.isArray(existing)?existing:[]){
    if(!wall||wall.id===incoming.id||wall.type!=='line'||
       !valid(wall.a)||!valid(wall.b)||dist(wall.a,wall.b)<=1e-8)continue;
    const crossing=intersection(candidate.a,candidate.b,wall.a,wall.b);
    if(!crossing)continue;
    const p=crossing.point;
    const gap=dist(candidate[end],p);
    if(gap>tolerance)continue;
    const otherEnd=end==='a'?'b':'a';
    if(dist(candidate[otherEnd],p)<=1e-8)continue;
    const wallLen=dist(wall.a,wall.b);
    const wallTol=tolerance/wallLen;
    // T intersection: keep the existing continuous wall untouched.
    if(crossing.s>=-1e-8&&crossing.s<=1+1e-8){
     const towardA=dist(wall.a,p),towardB=dist(wall.b,p);
     const adjust=towardA<=tolerance&&towardA<=towardB?{id:wall.id,end:'a',point:p}:
      towardB<=tolerance?{id:wall.id,end:'b',point:p}:null;
     if(!best||gap<best.gap)best={gap,p,wall:adjust};
    }else if(crossing.s<0&&crossing.s>=-wallTol){
     // L: both nearest tips meet at the mathematical intersection.
     if(!best||gap<best.gap)best={gap,p,wall:{id:wall.id,end:'a',point:p}};
    }else if(crossing.s>1&&crossing.s<=1+wallTol){
     if(!best||gap<best.gap)best={gap,p,wall:{id:wall.id,end:'b',point:p}};
    }
   }
   if(best){candidate[end]=copy(best.p);if(best.wall)updates.set(best.wall.id+':'+best.wall.end,best.wall)}
  }
  if(dist(candidate.a,candidate.b)<=1e-8)return {line:incoming,updates:[]};
  return {line:candidate,updates:[...updates.values()]};
 }
 return Object.freeze({plan,intersection});
});
