/* Blackline CAD2D — independent analytic constraint solver, phase 1.
 * Solves one target against fixed references. Pure, no UI, no state mutation.
 * Not a global constraint graph; unsupported or conflicting requests fail closed.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.BlacklineConstraints=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const EPS=1e-9,ANG=1e-9;
 const point=p=>!!p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
 const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y});
 const norm=v=>Math.hypot(v.x,v.y);
 const cross=(a,b)=>a.x*b.y-a.y*b.x;
 const dot=(a,b)=>a.x*b.x+a.y*b.y;
 const unit=v=>{const l=norm(v);return Number.isFinite(l)&&l>EPS?{x:v.x/l,y:v.y/l}:null;};
 const near=(a,b)=>Math.abs(a-b)<=EPS*Math.max(1,Math.abs(a),Math.abs(b));
 // Coordinate coincidence needs an absolute tolerance plus floating-point resolution,
 // not a relative tolerance that grows to centimeters at georeferenced origins.
 const coordNear=(a,b)=>Math.abs(a-b)<=Math.max(EPS,4*Number.EPSILON*Math.max(Math.abs(a),Math.abs(b)));
 const same=(a,b)=>coordNear(a.x,b.x)&&coordNear(a.y,b.y);
 const goodLine=e=>e?.type==='line'&&point(e.a)&&point(e.b)&&!!unit(sub(e.b,e.a));
 const goodCircle=e=>e?.type==='circle'&&point(e.c)&&Number.isFinite(e.r)&&e.r>EPS;
 const fail=reason=>({ok:false,reason});
 const positive=v=>Number.isFinite(v)&&v>EPS;
 function solveLine(e,rules,refs){
  const original=unit(sub(e.b,e.a));
  let direction=null,length=null,a=null,b=null;
  const reference=c=>refs.get(c.ref);
  for(const c of rules){
   let d=null,l=null,p=null;
   if(c.kind==='horizontal')d={x:1,y:0};
   else if(c.kind==='vertical')d={x:0,y:1};
   else if(c.kind==='parallel'||c.kind==='perpendicular'){
    const ref=reference(c);if(!goodLine(ref)||ref.id===e.id)return fail('invalid line reference');
    d=unit(sub(ref.b,ref.a));if(c.kind==='perpendicular')d={x:-d.y,y:d.x};
   }else if(c.kind==='length'){l=c.value;if(!positive(l))return fail('invalid length');}
   else if(c.kind==='equalLength'){
    const ref=reference(c);if(!goodLine(ref)||ref.id===e.id)return fail('invalid line reference');l=norm(sub(ref.b,ref.a));
   }else if(c.kind==='coincident'){
    const ref=reference(c);if(!ref||ref.id===e.id||!['a','b'].includes(c.anchor)||!['a','b','c'].includes(c.refPoint)||!point(ref[c.refPoint]))return fail('invalid coincidence');
    p=ref[c.refPoint];
    if(c.anchor==='a'){if(a&&!same(a,p))return fail('conflicting start points');a={...p};}
    else{if(b&&!same(b,p))return fail('conflicting end points');b={...p};}
   }else return fail('unsupported line constraint');
   if(d){if(direction&&Math.abs(cross(direction,d))>ANG)return fail('conflicting directions');direction=d;}
   if(l!==null){if(length!==null&&!near(length,l))return fail('conflicting lengths');length=l;}
  }
  if(a&&b){
   const v=sub(b,a),u=unit(v),l=norm(v);
   if(!u||direction&&Math.abs(cross(u,direction))>ANG||length!==null&&!near(l,length))return fail('incompatible anchored endpoints');
   return {ok:true,entity:{...e,a,b}};
  }
  let d=direction||original;if(dot(d,original)<0)d={x:-d.x,y:-d.y};
  const l=length??norm(sub(e.b,e.a));
  if(b)a={x:b.x-d.x*l,y:b.y-d.y*l};
  else{a=a||{...e.a};b={x:a.x+d.x*l,y:a.y+d.y*l};}
  if(!point(a)||!point(b)||!unit(sub(b,a)))return fail('invalid solved line');
  return {ok:true,entity:{...e,a,b}};
 }
 function solveCircle(e,rules,refs){
  let radius=null,center=null,tangent=null;
  for(const c of rules){
   let r=null;
   if(c.kind==='radius')r=c.value;
   else if(c.kind==='diameter')r=c.value/2;
   else if(c.kind==='equalRadius'){
    const ref=refs.get(c.ref);if(!goodCircle(ref)||ref.id===e.id)return fail('invalid circle reference');r=ref.r;
   }else if(c.kind==='concentric'){
    const ref=refs.get(c.ref);if(!goodCircle(ref)||ref.id===e.id)return fail('invalid circle reference');
    if(center&&!same(center,ref.c))return fail('conflicting centers');center={...ref.c};
   }else if(c.kind==='tangentLine'){
    const ref=refs.get(c.ref);if(!goodLine(ref)||ref.id===e.id||tangent)return fail('invalid or multiple tangencies');
    tangent=ref;
   }else return fail('unsupported circle constraint');
   if(r!==null){if(!positive(r)||radius!==null&&!near(radius,r))return fail('invalid or conflicting radius');radius=r;}
  }
  const r=radius??e.r;
  let c=center||{...e.c};
  if(tangent){
   const v=sub(tangent.b,tangent.a),u=unit(v),n={x:-u.y,y:u.x};
   const signed=dot(sub(c,tangent.a),n),sign=signed<0?-1:1;
   if(center){if(!near(Math.abs(signed),r))return fail('center conflicts with tangency');}
   else {const shift=sign*r-signed;c={x:c.x+n.x*shift,y:c.y+n.y*shift};}
   // Tangency is to the finite segment, not merely its infinite supporting line.
   const t=dot(sub(c,tangent.a),u);if(t<-EPS||t>norm(v)+EPS)return fail('tangency lies outside segment');
  }
  if(!point(c)||!positive(r))return fail('invalid solved circle');
  return {ok:true,entity:{...e,c,r}};
 }
 function solve(entity,rules,references=[]){
  if(!Array.isArray(rules)||!rules.length||rules.length>32||rules.some(c=>!c||typeof c.kind!=='string')||!Array.isArray(references))return fail('invalid rules');
  const refs=new Map();for(const e of references)if(e&&e.id!=null){if(refs.has(e.id))return fail('duplicate reference id');refs.set(e.id,e);}
  if(goodLine(entity))return solveLine(entity,rules,refs);
  if(goodCircle(entity))return solveCircle(entity,rules,refs);
  return fail('unsupported or degenerate target');
 }
 return Object.freeze({solve});
});
