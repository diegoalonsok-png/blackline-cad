'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),L=require('../assets/cad2d-arq-generators.js');
const base='assets/arq-catalogue/v1/';
test('T house uses actual catalogue block geometry, non-overlapping room footprints and clear door swings',()=>{
 const p=JSON.parse(fs.readFileSync(base+'plan-904.json')),index=JSON.parse(fs.readFileSync(base+'index.json'));
 assert(index.some(r=>r.id==='plan-904'&&r.typology==='t-shape'&&r.area===152));
 assert.equal(p.rooms.filter(r=>r.kind==='bedroom').length,3);
 assert.equal(p.rooms.filter(r=>r.kind==='bathroom').length,1);
 const bounds=b=>{const a=L.bounds(L.build(b.catalogId,...b.nominalSize).entities),c=Math.cos(b.rotation*Math.PI/180),s=Math.sin(b.rotation*Math.PI/180),ps=[[a.minX,a.minY],[a.minX,a.maxY],[a.maxX,a.minY],[a.maxX,a.maxY]].map(([x,y])=>[b.point[0]+x*c-y*s,b.point[1]+x*s+y*c]);return [Math.min(...ps.map(q=>q[0])),Math.min(...ps.map(q=>q[1])),Math.max(...ps.map(q=>q[0])),Math.max(...ps.map(q=>q[1]))]};
 const eps=1e-5,overlap=(a,b)=>a[0]<b[2]-eps&&b[0]<a[2]-eps&&a[1]<b[3]-eps&&b[1]<a[3]-eps;
 const reach=new Set(['room0']);for(let i=0;i<p.rooms.length;i++)for(const c of p.connections){assert(p.openings.some(o=>o.host===c.via&&o.kind==='swing-door'));if(reach.has(c.from)||reach.has(c.to)){reach.add(c.from);reach.add(c.to)}}
 assert.equal(reach.size,p.rooms.length);
 for(const [i,b] of p.blocks.entries()){
  const it=L.library.find(k=>k.id===b.catalogId),[W,D]=b.nominalSize;assert(it);assert(W>=it.wMin-eps&&W<=it.wMax+eps&&D>=it.dMin-eps&&D<=it.dMax+eps);
  const a=bounds(b);assert(p.rooms.some(r=>{const [x,y,w,d]=r.clearBounds;return a[0]>=x-eps&&a[1]>=y-eps&&a[2]<=x+w+eps&&a[3]<=y+d+eps;}),b.catalogId);
  for(const c of p.blocks.slice(i+1))assert(!overlap(a,bounds(c)),b.catalogId+' vs '+c.catalogId);
  for(const o of p.openings.filter(o=>o.kind==='swing-door')){
   const w=p.walls.find(w=>w.id===o.host),len=Math.hypot(w.b[0]-w.a[0],w.b[1]-w.a[1]),ux=(w.b[0]-w.a[0])/len,uy=(w.b[1]-w.a[1])/len,nx=-uy,ny=ux,hx=w.a[0]+ux*(o.offset-o.width/2),hy=w.a[1]+uy*(o.offset-o.width/2);
   const q=[[a[0],a[1]],[a[0],a[3]],[a[2],a[1]],[a[2],a[3]]].map(([x,y])=>[(x-hx)*ux+(y-hy)*uy,(x-hx)*nx+(y-hy)*ny]),u=q.map(t=>t[0]),v=q.map(t=>t[1]);
   assert(!(Math.max(...u)>eps&&Math.max(...v)>eps&&Math.hypot(Math.max(0,Math.min(...u)),Math.max(0,Math.min(...v)))<o.width-eps),o.host+': '+b.catalogId);
  }
 }
 const src=fs.readFileSync('cad-arq-pro.js','utf8'),sanitary=new Function(src.slice(src.indexOf('function arqCheckSanitary('),src.indexOf('async function insertCataloguePlanById('))+';return arqCheckSanitary;')();
 assert.deepEqual(sanitary(p,L.library).issues,[]);
});