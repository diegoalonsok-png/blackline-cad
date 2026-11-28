'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const src=fs.readFileSync('cad-arq-pro.js','utf8');
const audit=new Function(src.slice(src.indexOf('function arqAuditHouseTopology('),src.indexOf('function applyArchitecture(plan'))+';return arqAuditHouseTopology;')();
const html=fs.readFileSync('index.html','utf8'),begin=html.indexOf('function cadJoinGeneratedArqFaces('),end=html.indexOf('function cadApplyArchitecturePlan(',begin);
const join=new Function(html.slice(begin,end)+';return cadJoinGeneratedArqFaces;')();
const load=id=>JSON.parse(fs.readFileSync('assets/arq-catalogue/v1/'+id+'.json','utf8'));
const eps=1e-6;
test('reviewed houses use one wall centerline per physical wall with segmented L/T junctions and hosted openings',()=>{
 for(const id of ['plan-901','plan-902','plan-904']){
  const p=load(id);assert.equal(p.strictHouseTopology,true);assert.deepEqual(audit(p),[]);
  const pairs=p.walls.map(w=>{const [x,y]=w.a,[X,Y]=w.b,l=Math.hypot(X-x,Y-y),dx=-(Y-y)/l*w.thickness/2,dy=(X-x)/l*w.thickness/2;
   return [-1,1].map(k=>({a:{x:x+k*dx,y:y+k*dy},b:{x:X+k*dx,y:Y+k*dy},wall2d:{guideA:{x,y},guideB:{x:X,y:Y},thickness:w.thickness}}));});
  assert.equal(join(pairs),true);
  const faces=pairs.flat(),axis=e=>{const h=Math.abs(e.a.y-e.b.y)<eps,i=h?'x':'y',j=h?'y':'x';return {h,c:e.a[j],lo:Math.min(e.a[i],e.b[i]),hi:Math.max(e.a[i],e.b[i])}};
  for(let i=0;i<faces.length;i++){const a=axis(faces[i]);assert(a.hi-a.lo>eps);for(const e of faces.slice(i+1)){const b=axis(e);assert(!(a.h===b.h&&Math.abs(a.c-b.c)<eps&&Math.min(a.hi,b.hi)-Math.max(a.lo,b.lo)>eps),'duplicated joined wall face in '+id);}}
 }
});
test('reject duplicate walls, overlapping openings, disconnected ends and unsplit intersections',()=>{
 const p=load('plan-904'),copy=x=>JSON.parse(JSON.stringify(x));
 let q=copy(p);q.walls.push({...q.walls[0],id:'duplicate'});assert(audit(q).some(x=>x.includes('Overlapping parallel walls')));
 q=copy(p);q.openings.push({...q.openings[0]});assert(audit(q).some(x=>x.includes('Overlapping openings')));
 q=copy(p);q.walls[0].a[0]+=.01;assert(audit(q).some(x=>x.includes('Unjoined wall endpoint')));
 q=copy(p);q.walls.push({id:'cross',a:[6,0],b:[6,6],thickness:.15});assert(audit(q).some(x=>x.includes('Unsplit wall junction')));
 q=copy(p);q.openings[0].offset=.01;assert(audit(q).some(x=>x.includes('Opening too close')));
});

test('hosted openings clear thicker perpendicular walls at both ends and in reversed host direction',()=>{
 const p={walls:[
 {id:'bottom',a:[0,0],b:[4,0],thickness:.15},
 {id:'right',a:[4,0],b:[4,4],thickness:.5},
 {id:'top',a:[4,4],b:[0,4],thickness:.15},
 {id:'left',a:[0,4],b:[0,0],thickness:.5}
 ],openings:[{host:'bottom',kind:'swing-door',offset:.55,width:.8}]};
 const o=p.openings[0],bad=()=>audit(p).some(x=>x.includes('Opening too close'));
 assert(bad());o.offset=.65;assert.deepEqual(audit(p),[]);
 o.offset=3.45;assert(bad());o.offset=3.35;assert.deepEqual(audit(p),[]);
 [p.walls[0].a,p.walls[0].b]=[p.walls[0].b,p.walls[0].a];
 o.offset=.55;assert(bad());o.offset=3.45;assert(bad());
 o.offset=2;o.kind='framed-window';assert.deepEqual(audit(p),[]);
});
