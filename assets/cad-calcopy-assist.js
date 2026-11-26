/* CALCOPY asistido: medición local de muros, aberturas y armado del plan nativo.
   Todo en píxeles de la imagen (y hacia abajo); sin dependencias, también corre en Node para pruebas. */
(function(root){
'use strict';
function gray(pix,w,h){
 const g=new Uint8Array(w*h),hist=new Uint32Array(256);
 for(let i=0;i<w*h;i++){const r=pix[i*4],gg=pix[i*4+1],b=pix[i*4+2];const v=(.299*r+.587*gg+.114*b)|0;
  // Saturated colour (UI buttons, logos) never counts as wall ink.
  const mx=Math.max(r,gg,b),mn=Math.min(r,gg,b);g[i]=mx-mn>70?255:v;hist[g[i]]++;}
 let n=0,paper=255;for(let k=255;k>=0;k--){n+=hist[k];if(n>=w*h*.1){paper=k;break;}}
 return {g,w,h,paper,thr:Math.min(paper-35,paper*.85)};
}
function axis(q){const v=Math.abs(q.a[0]-q.b[0])<Math.abs(q.a[1]-q.b[1]);return v?{v,c:(q.a[0]+q.b[0])/2,lo:Math.min(q.a[1],q.b[1]),hi:Math.max(q.a[1],q.b[1]),t:q.t}:{v,c:(q.a[1]+q.b[1])/2,lo:Math.min(q.a[0],q.b[0]),hi:Math.max(q.a[0],q.b[0]),t:q.t};}
function seg(A){return A.v?{a:[A.c,A.lo],b:[A.c,A.hi],t:A.t}:{a:[A.lo,A.c],b:[A.hi,A.c],t:A.t};}
/* Measure the wall under a click: solid band, or the core between two parallel strokes. */
function measureWall(G,x0,y0){
 const {g,w,h,thr}=G;x0=Math.round(x0);y0=Math.round(y0);
 const R=Math.max(16,Math.round(Math.max(w,h)*.06));
 let best=null;
 for(const v of [false,true]){
  // u runs along the wall, s across it.
  const ink=(u,s)=>{const x=v?x0+s:x0+u,y=v?y0+u:y0+s;return x>=0&&y>=0&&x<w&&y<h&&g[y*w+x]<thr;};
  let e1,e2,kind,s1,s2;
  const on=[0,1,-1,2,-2].find(s=>ink(0,s));
  if(on!==undefined){
   kind='solid';e1=on;e2=on;
   while(e1-1>-R&&(ink(0,e1-1)||ink(0,e1-2)&&e1-2>-R))e1-=ink(0,e1-1)?1:2;
   while(e2+1<R&&(ink(0,e2+1)||ink(0,e2+2)&&e2+2<R))e2+=ink(0,e2+1)?1:2;
   if(e2-e1+1>R)continue;
   // A wall band has paper on both sides; a dark fill (rug, sofa, table) does not.
   let side=0;for(let u=-2;u<=2;u++){side+=ink(u,e1-3)+ink(u,e2+3);}if(side>4)continue;
  }else{
   kind='hollow';s1=null;s2=null;
   for(let s=1;s<R;s++){if(s1===null&&ink(0,-s))s1=-s;if(s2===null&&ink(0,s))s2=s;}
   if(s1===null||s2===null)continue;
   e1=s1;while(e1-1>-R-6&&ink(0,e1-1))e1--;e2=s2;while(e2+1<R+6&&ink(0,e2+1))e2++;
   if(s2-s1<3||e2-e1+1>R)continue;
  }
  const t=e2-e1+1;
  const present=u=>{
   if(kind==='solid'){let n=0;for(let s=e1;s<=e2;s++)n+=ink(u,s);return n>=.7*t&&!(ink(u,e1-3)&&ink(u,e2+3)&&ink(u,e1-Math.round(t))&&ink(u,e2+Math.round(t)));}
   let a=false,b=false;for(let s=e1-1;s<=s1+1;s++)a=a||ink(u,s);for(let s=s2-1;s<=e2+1;s++)b=b||ink(u,s);return a&&b;
  };
  const maxGap=Math.max(3,Math.round((kind==='solid'?.8:1.3)*t)),lim=v?h:w,start=v?y0:x0;
  const walk=dir=>{let last=0,gap=0;for(let u=dir;Math.abs(u)<lim;u+=dir){const p=start+u;if(p<0||p>=lim)break;if(present(u)){last=u;gap=0;}else if(++gap>maxGap)break;}return last;};
  const lo=walk(-1),hi=walk(1),len=hi-lo;
  if(len<2.5*t)continue;
  const c=(v?x0:y0)+(e1+e2)/2;
  const cand={v,c,lo:start+lo,hi:start+hi,t,kind,len};
  if(!best||cand.len>best.len)best=cand;
 }
 return best;
}
/* Extend new wall ends onto perpendicular wall axes (L/T joins). */
function snapEnds(A,walls){
 const tol=Math.max(3,1.2*A.t);
 for(const end of ['lo','hi']){
  let bestD=Infinity,to=null;
  for(const o of walls){if(o===A||o.v===A.v||o.skip)continue;if(!(o.lo-tol<=A.c&&A.c<=o.hi+tol))continue;const d=Math.abs(o.c-A[end]);if(d<=tol+o.t/2&&d<bestD){bestD=d;to=o.c;}}
  if(to!==null)A[end]=to;
 }
 if(A.lo>A.hi)[A.lo,A.hi]=[A.hi,A.lo];
 return A;
}
/* Opening from a click in a wall gap. pxPerM converts the standard widths. */
function openingAt(G,walls,x,y,kind,pxPerM){
 const live=walls.filter(w=>!w.skip);let best=null;
 for(const w of live){
  const u=w.v?y:x,s=w.v?x:y;if(Math.abs(s-w.c)>Math.max(w.t*.9,6))continue;
  if(u>=w.lo&&u<=w.hi)continue;
  const d=u>w.hi?u-w.hi:w.lo-u;if(d>2.6*pxPerM)continue;
  if(!best||d<best.d)best={w,d,after:u>w.hi};
 }
 if(!best)return null;
 const w=best.w,col=o=>o!==w&&o.v===w.v&&Math.abs(o.c-w.c)<=.6*Math.min(o.t,w.t)+2&&Math.max(o.t,w.t)<=1.5*Math.min(o.t,w.t)+2;
 let g0,g1,partner=null,perp=null;
 if(best.after){
  g0=w.hi;let far=w.hi+2.6*pxPerM;
  for(const o of live)if(col(o)&&o.lo>=w.hi-1&&o.lo<far){far=o.lo;partner=o;perp=null;}
  for(const o of live)if(o.v!==w.v&&o.lo-1<=w.c&&w.c<=o.hi+1&&o.c>w.hi&&o.c-o.t/2<far){far=o.c-o.t/2;perp=o;partner=null;}
  g1=far;
 }else{
  g1=w.lo;let far=w.lo-2.6*pxPerM;
  for(const o of live)if(col(o)&&o.hi<=w.lo+1&&o.hi>far){far=o.hi;partner=o;perp=null;}
  for(const o of live)if(o.v!==w.v&&o.lo-1<=w.c&&w.c<=o.hi+1&&o.c<w.lo&&o.c+o.t/2>far){far=o.c+o.t/2;perp=o;partner=null;}
  g0=far;
 }
 if(!partner&&!perp){const def=(kind==='window'?1.2:.8)*pxPerM;if(best.after)g1=g0+def;else g0=g1-def;}
 const width=(g1-g0)/pxPerM;
 if(kind==='window'?!(width>=.3&&width<=5):!(width>=.5&&width<=2.4))return null;
 const op={w,partner,perp,v:w.v,c:w.c,g0,g1,t:w.t,kind:kind==='window'?'framed-window':width>1.3?'double-door':'swing-door',side:1,hingeAtLo:true};
 if(kind!=='window'&&G){
  const {g,w:W,h:H,thr}=G,W0=g1-g0;
  const ink=(u,s)=>{const X=Math.round(op.v?s:u),Y=Math.round(op.v?u:s);return X>=0&&Y>=0&&X<W&&Y<H&&g[Y*W+X]<thr?1:0;};
  const count=(sgn,u0,u1)=>{let n=0;for(let u=u0;u<=u1;u+=1)for(let k=op.t/2+2;k<=op.t/2+W0*.95;k+=1)n+=ink(u,op.c+sgn*k);return n;};
  const plus=count(1,g0+1,g1-1),minus=count(-1,g0+1,g1-1);op.side=plus>=minus?1:-1;
  const strip=u0=>{let n=0;for(let u=u0-1;u<=u0+1;u++)for(let k=op.t/2+2;k<=op.t/2+W0*.85;k++)n+=ink(u,op.c+op.side*k);return n;};
  op.hingeAtLo=strip(g0+Math.max(1,op.t*.25))>=strip(g1-Math.max(1,op.t*.25));
 }
 return op;
}
/* Build the native plan: merge hosts across openings and compute offsets/orientation. local(px)->[m,m] (y up). */
function buildPlan(walls,openings,local,maxT){
 const parent=new Map(),find=w=>{while(parent.has(w))w=parent.get(w);return w;};
 const work=new Map();for(const w of walls)if(!w.skip)work.set(w,{...w});
 const host=w=>work.get(find(w));
 const ops=[];
 for(const op of openings){
  const w=find(op.w);if(!work.has(w))continue;const H=work.get(w);
  if(op.partner&&work.has(find(op.partner))&&find(op.partner)!==w){const P=work.get(find(op.partner));const lw=H.hi-H.lo,lp=P.hi-P.lo;H.c=(H.c*lw+P.c*lp)/(lw+lp);H.t=(H.t*lw+P.t*lp)/(lw+lp);H.lo=Math.min(H.lo,P.lo);H.hi=Math.max(H.hi,P.hi);work.delete(find(op.partner));parent.set(find(op.partner),w);}
  else if(!op.partner){
   if(op.g1>H.hi)H.hi=op.perp?op.perp.c:op.g1+H.t;
   if(op.g0<H.lo)H.lo=op.perp?op.perp.c:op.g0-H.t;
  }
  ops.push({op,w});
 }
 const ids=new Map(),out=[];let n=0;
 for(const [w,H] of work){const S=seg(H),a=local(S.a),b=local(S.b),dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy);if(!(L>.1))continue;
  const tp=local([S.a[0]+(H.v?H.t:0),S.a[1]+(H.v?0:H.t)]),thickness=Math.hypot(tp[0]-a[0],tp[1]-a[1]);
  if(!(thickness>=.08&&thickness<=maxT))continue;const id='trace-'+(n++);ids.set(w,{id,a,b,L,H,thickness});out.push({id,a,b,thickness,layer:'WALLS',join:'native'});}
 const res=[];
 for(const {op,w} of ops){
  const info=ids.get(find(w));if(!info)continue;const {a,b,L,H,thickness}=info;
  const P=u=>local(H.v?[H.c,u]:[u,H.c]),d=p=>Math.hypot(p[0]-a[0],p[1]-a[1]);
  let s0=d(P(op.g0)),s1=d(P(op.g1));if(s0>s1)[s0,s1]=[s1,s0];
  const margin=thickness/2+.01;s0=Math.max(s0,margin);s1=Math.min(s1,L-margin);
  const width=s1-s0;if(!(width>=.3&&width<=5))continue;
  const dx=b[0]-a[0],dy=b[1]-a[1],mid=(op.g0+op.g1)/2,sp=local(H.v?[H.c+op.side*(H.t/2+10),mid]:[mid,H.c+op.side*(H.t/2+10)]);
  const left=dx*(sp[1]-a[1])-dy*(sp[0]-a[0])>0;
  // a is the low end of the host; hinge at the low end means "A side".
  const hingeA=op.hingeAtLo,reverse=!left,mirror=reverse?hingeA:!hingeA;
  res.push({host:info.id,kind:op.kind,offset:(s0+s1)/2,width,orientation:{reverseHostDirection:reverse,mirror}});
 }
 // Drop overlapping openings on the same host (keep the first).
 res.sort((p,q)=>p.host<q.host?-1:p.host>q.host?1:p.offset-q.offset);
 const openingsOut=[];for(const o of res){const prev=openingsOut[openingsOut.length-1];if(prev&&prev.host===o.host&&prev.offset+prev.width/2>=o.offset-o.width/2)continue;openingsOut.push(o);}
 return {walls:out,openings:openingsOut};
}
// Room use is inferred only from recognized objects, never from size alone.
// Bounding boxes provide a provisional assignment; actual access requires a door.
function classifyRooms(regions,objects){
 const out=regions.map(r=>({...r,objects:[]}));
 for(const o of objects){
  if(!Number.isFinite(o.x)||!Number.isFinite(o.y))continue;
  const candidates=out.filter(r=>r.kind!=='technical_void_candidate'&&r.kind!=='isolated_object_candidate'&&o.x>=r.x&&o.x<=r.x+r.w&&o.y>=r.y&&o.y<=r.y+r.h).sort((a,b)=>a.area-b.area);
  if(candidates.length)candidates[0].objects.push(o.id);
 }
 for(const r of out){
  const wc=r.objects.some(id=>/^san-wc(?:-|$)/.test(id)),bath=r.objects.some(id=>/^san-(?:bidet|lav|ducha|banera|mingitorio)/.test(id)),bed=r.objects.some(id=>/^dor-(?:cama|queen|king|cucheta)/.test(id));
  r.use=wc||bath?'bathroom_candidate':bed?'bedroom_candidate':null;
 }
 for(const r of out){
  const parent=out.find(p=>p.id===r.possible_parent);
  r.possible_suite=r.use==='bathroom_candidate'&&parent?.use==='bedroom_candidate';
 }
 return out;
}
const api={gray,axis,seg,measureWall,snapEnds,openingAt,buildPlan,classifyRooms};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CAD2D_CALCOPY_ASSIST=api;
})(typeof self!=='undefined'?self:this);
