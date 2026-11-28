const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const src=fs.readFileSync('index.html','utf8');
const section=(a,b)=>src.slice(src.indexOf(a),src.indexOf(b,src.indexOf(a)));
const api=new Function(section('function cadJoinGeneratedArqFaces(','function cadApplyArchitecturePlan(')+';return {join:cadJoinGeneratedArqFaces,bounds:cadArqHostBoundaries};')();
const pair=(a,b,t)=>{const l=Math.hypot(b[0]-a[0],b[1]-a[1]),nx=-(b[1]-a[1])/l,ny=(b[0]-a[0])/l;return [-1,1].map(k=>({a:{x:a[0]+k*nx*t/2,y:a[1]+k*ny*t/2},b:{x:b[0]+k*nx*t/2,y:b[1]+k*ny*t/2},wall2d:{guideA:{x:a[0],y:a[1]},guideB:{x:b[0],y:b[1]},thickness:t}}));};
test('ARQ wall hosts split at T and X intersections without cutting across an opening',()=>{
 const h={id:'h',a:[0,0],b:[8,0],thickness:.2},t={id:'t',a:[3,0],b:[3,4],thickness:.2},x={id:'x',a:[6,-2],b:[6,2],thickness:.3};
 assert.deepEqual(api.bounds(h,[h,t,x],[],8),[0,3,6,8]);
 assert.deepEqual(api.bounds({...h,a:h.b,b:h.a},[t,x],[],8),[0,2,5,8]);
 assert.deepEqual(api.bounds(h,[h,t,x],[{offset:1,width:.8},{offset:7,width:.8}],8),[0,3,4,6,8]);
 assert.throws(()=>api.bounds(h,[h,t],[{offset:3,width:.8}],8),/Opening intersects wall junction/);
});
test('Newest retained native T-shaped house has joined face endpoints after production splitting and joining',()=>{
 const p=JSON.parse(fs.readFileSync('assets/arq-catalogue/v1/plan-904.json'));
 const pairs=[];
 for(const w of p.walls){
  const L=Math.hypot(w.b[0]-w.a[0],w.b[1]-w.a[1]),at=t=>w.a.map((v,i)=>v+(w.b[i]-v)*t/L);
  const cuts=api.bounds(w,p.walls,p.openings.filter(o=>o.host===w.id).sort((a,b)=>a.offset-b.offset),L);
  for(let i=1;i<cuts.length;i++)pairs.push(pair(at(cuts[i-1]),at(cuts[i]),w.thickness));
 }
 assert.equal(api.join(pairs),true);
 const nodes=new Map();
 for(const e of pairs.flat())for(const p of [e.a,e.b]){const k=[p.x,p.y].map(v=>Math.round(v*1e6)).join(',');nodes.set(k,(nodes.get(k)||0)+1);}
 assert.ok([...nodes.values()].every(n=>n===2),'all wall outline endpoints must meet exactly one neighboring face before openings');
});
test('ARQ opening definitions reuse the actual native catalogue and preserve the reference layer',()=>{
 const state={blocks:{}},calls=[];
 const window={CAD2D_ENSURE_ARQ_OPENING:(...args)=>{calls.push(args);return 'gallery-door';}};
 const f=new Function('window','state','cadPrepareDynamicBlock','blockInstanceGeometry',section('function cadArqOpeningDefinition(','function cadApplyArchitecturePlan(')+';return cadArqOpeningDefinition;')(window,state,d=>({...d,dynamicActions:true}),()=>[{type:'rect',layer:'0'}]);
 const defaults={width:.7,frameWidth:.035,frameDepth:.12,mirror:true};
 assert.equal(f({kind:'swing-door',width:.7},1,defaults,'ARQ'), 'gallery-door');
 assert.deepEqual(calls,[['swing-door',.7,true]]);
 window.CAD2D_ENSURE_ARQ_OPENING=()=>null;
 assert.equal(f({kind:'swing-door',width:.7},1,defaults,'ARQ'),'ARQ · Layer 0');
 assert.equal(state.blocks['ARQ · Layer 0'].dynamicActions,true);
 assert.equal(state.blocks['ARQ · Layer 0'].entities[0].type,'rect');
 assert.ok(section('function blockChildren(','/* Atributos de bloque').includes("definition.libraryLayer0&&!ref.arqBatch?'0'"));
});
