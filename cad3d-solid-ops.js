/* Bounded polygonal CSG for closed solids. No network or proprietary kernel. */
(function(root){
'use strict';
const EPS=1e-7,MAX=120000;
const sub=(a,b)=>a.map((x,i)=>x-b[i]),dot=(a,b)=>a.reduce((n,x,i)=>n+x*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function volume(t){if(!t.length)return 0;const origin=t.slice(0,3);let v=0,correction=0;for(let i=0;i<t.length;i+=9){const a=sub(t.slice(i,i+3),origin),b=sub(t.slice(i+3,i+6),origin),c=sub(t.slice(i+6,i+9),origin);const term=dot(a,cross(b,c))/6-correction,next=v+term;correction=(next-v)-term;v=next}return v}
function poly(v){let n;for(let i=2;i<v.length;i++){const c=cross(sub(v[i-1],v[0]),sub(v[i],v[0])),l=Math.hypot(...c);if(l>EPS*EPS){n=c.map(x=>x/l);break}}return n?{v,n,w:dot(n,v[0])}:null}
function flip(p){return {v:p.v.slice().reverse(),n:p.n.map(x=>-x),w:-p.w}}
function boolean(a,b,op){
 if(!['subtract','intersect','union'].includes(op))throw Error('Operación desconocida');
 let budget=500000;
 function split(p,q,cf,cb,f,b){
  if(--budget<0)throw Error('Corte demasiado complejo para el motor local');
  let type=0;const ts=q.v.map(v=>{const d=dot(p.n,sub(v,p.v[0])),t=d>EPS?1:d< -EPS?2:0;type|=t;return t});
  if(type===0){(dot(p.n,q.n)>0?cf:cb).push(q);return}
  if(type===1){f.push(q);return}if(type===2){b.push(q);return}
  const fv=[],bv=[];for(let i=0;i<q.v.length;i++){const j=(i+1)%q.v.length,ti=ts[i],tj=ts[j],vi=q.v[i],vj=q.v[j];if(ti!==2)fv.push(vi);if(ti!==1)bv.push(vi);if((ti|tj)===3){const d=sub(vj,vi),den=dot(p.n,d),ratio=dot(p.n,sub(p.v[0],vi))/den;if(!Number.isFinite(ratio))throw Error('Intersección de arista inválida');const t=Math.max(0,Math.min(1,ratio)),v=vi.map((x,k)=>x+t*d[k]);fv.push(v);bv.push(v)}}
  const x=poly(fv),y=poly(bv);if(x)f.push(x);if(y)b.push(y);
 }
 class Node{
  constructor(p=[],depth=0){this.p=[];this.pl=null;this.f=null;this.b=null;this.depth=depth;this.build(p)}
  build(p){if(!p.length)return;if(this.depth>220)throw Error('Complejidad geométrica excesiva');if(!this.pl)this.pl=p[0];const f=[],b=[];for(const q of p)split(this.pl,q,this.p,this.p,f,b);if(f.length){if(!this.f)this.f=new Node([],this.depth+1);this.f.build(f)}if(b.length){if(!this.b)this.b=new Node([],this.depth+1);this.b.build(b)}}
  invert(){this.p=this.p.map(flip);if(this.pl)this.pl=flip(this.pl);if(this.f)this.f.invert();if(this.b)this.b.invert();[this.f,this.b]=[this.b,this.f]}
  clip(p){if(!this.pl)return p.slice();let f=[],b=[];for(const q of p)split(this.pl,q,f,b,f,b);if(this.f)f=this.f.clip(f);if(this.b)b=this.b.clip(b);else b=[];return f.concat(b)}
  clipTo(n){this.p=n.clip(this.p);if(this.f)this.f.clipTo(n);if(this.b)this.b.clipTo(n)}
  all(){return this.p.concat(this.f?this.f.all():[],this.b?this.b.all():[])}
 }
 function input(t){if(!Array.isArray(t)||!t.length||t.length%9||t.length>MAX||!t.every(Number.isFinite))throw Error('Malla inválida o demasiado grande');const signed=volume(t);if(!Number.isFinite(signed)||Math.abs(signed)<EPS*EPS)throw Error('El objeto no encierra volumen válido');const out=[],reverse=signed<0;for(let i=0;i<t.length;i+=9){let p=poly([t.slice(i,i+3),t.slice(i+3,i+6),t.slice(i+6,i+9)]);if(p)out.push(reverse?flip(p):p)}return out}
 const A=new Node(input(a)),B=new Node(input(b));
 if(op==='subtract'){A.invert();A.clipTo(B);B.clipTo(A);B.invert();B.clipTo(A);B.invert();A.build(B.all());A.invert()}
 else if(op==='intersect'){A.invert();B.clipTo(A);B.invert();A.clipTo(B);B.clipTo(A);A.build(B.all());A.invert()}
 else if(op==='union'){A.clipTo(B);B.clipTo(A);B.invert();B.clipTo(A);B.invert();A.build(B.all())}
 else throw Error('Operación desconocida');
 const out=[];for(const p of A.all())for(let i=2;i<p.v.length;i++){const q=poly([p.v[0],p.v[i-1],p.v[i]]);if(q){out.push(...q.v[0],...q.v[1],...q.v[2]);if(out.length>MAX)throw Error('Resultado supera el límite de malla guardable')}}
 if(!out.every(Number.isFinite))throw Error('Resultado inválido');
 return out;
}
function revolve(profile,angle,faces){
 if(!Array.isArray(profile)||profile.length<3||profile.length>128||!Number.isFinite(angle)||angle<=0||angle>360||profile.some(p=>!Array.isArray(p)||p.length!==2||p[0]<-EPS||!p.every(Number.isFinite)))throw Error('Perfil o ángulo inválido');
 const area=profile.reduce((v,p,i)=>{const q=profile[(i+1)%profile.length];return v+p[0]*q[1]-p[1]*q[0]},0);if(area<=EPS)throw Error('El perfil debe tener orientación antihoraria y área positiva');
 const full=Math.abs(angle-360)<EPS,n=Math.max(8,Math.ceil(angle/5)),a=angle*Math.PI/180,out=[];
 const pt=(p,j)=>{const r=Math.max(0,p[0]),theta=full&&j===n?0:a*j/n;return [r*Math.cos(theta),r*Math.sin(theta),p[1]]};
 function tri(a,b,c){if(poly([a,b,c])){if(out.length+9>MAX)throw Error('Revolución supera el límite de malla guardable');out.push(...a,...b,...c)}}
 for(let j=0;j<n;j++)for(let i=0;i<profile.length;i++){const p=profile[i],q=profile[(i+1)%profile.length],u=pt(p,j),v=pt(q,j),w=pt(q,j+1),x=pt(p,j+1);tri(u,w,v);tri(u,x,w)}
 if(!full){if(!Array.isArray(faces)||faces.length!==profile.length-2||faces.some(f=>!Array.isArray(f)||f.length!==3||new Set(f).size!==3||f.some(i=>!Number.isInteger(i)||i<0||i>=profile.length)))throw Error('Triangulación de tapas inválida');for(const f of faces){let [i,j,k]=f;const p=profile[i],q=profile[j],r=profile[k];if((q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0])<0)[j,k]=[k,j];tri(pt(profile[i],0),pt(profile[j],0),pt(profile[k],0));tri(pt(profile[k],n),pt(profile[j],n),pt(profile[i],n))}}
 const signed=volume(out);if(out.length>MAX||!Number.isFinite(signed)||Math.abs(signed)<EPS*EPS)throw Error('Revolución sin volumen válido');
 if(signed<0)for(let i=0;i<out.length;i+=9)for(let j=0;j<3;j++)[out[i+3+j],out[i+6+j]]=[out[i+6+j],out[i+3+j]];
 return out;
}
root.CAD3DSolidOps={boolean,revolve,volume};
})(globalThis);
