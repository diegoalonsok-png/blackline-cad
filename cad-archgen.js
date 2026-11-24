/* ARCHGEN: metre-based candidate layouts, independent from CAD UI.
 * Candidates are design studies, not building-code certifications.
 * Furniture IDs resolve through the existing architectural library.
 */
(function(root){
'use strict';
const overlap=(a,b)=>a.x<b.x+b.w-1e-8&&b.x<a.x+a.w-1e-8&&a.y<b.y+b.d-1e-8&&b.y<a.y+a.d-1e-8;
// Kitchen typologies: continuous cabinet runs, not independent randomly scattered appliances.
function generateKitchens(width,depth,wall,count,lib){
 const out=[],groups=new Map(),seen=new Set(),cache=new Map(),doorWidth=.9;
 const dim=id=>{if(!cache.has(id)){const b=lib.bounds(lib.build(id).entities);cache.set(id,{w:b.maxX-b.minX,d:b.maxY-b.minY})}return cache.get(id)};
 const within=a=>a.x>=-1e-8&&a.y>=-1e-8&&a.x+a.w<=width+1e-8&&a.y+a.d<=depth+1e-8;
 const front=(a,gap)=>a.side==='N'?{x:a.x,y:a.y-gap,w:a.w,d:gap}:a.side==='W'?{x:a.x+a.w,y:a.y,w:gap,d:a.d}:a.side==='E'?{x:a.x-gap,y:a.y,w:gap,d:a.d}:null;
 const run=(ids,side,align)=>{
  const horizontal=side==='N',span=horizontal?width:depth,corner=horizontal?.08:.85;
  const length=ids.reduce((s,id)=>s+dim(id).w,0);
  if(length>span-corner-.08+1e-8)return null;
  let at=.08+(span-corner-.08-length)*align;
  const result=[];
  for(const id of ids){const b=dim(id),p=horizontal?{x:at,y:depth-b.d-.04,w:b.w,d:b.d,rotation:0}:side==='W'?{x:.04,y:at,w:b.d,d:b.w,rotation:90}:{x:width-b.d-.04,y:at,w:b.d,d:b.w,rotation:270};result.push({id,...p,side});at+=b.w}
  return result;
 };
 const equipment=[['kq-bacha','kq-cocina','kq-heladera'],['kq-bacha2','kq-cocina','kq-heladera'],['kq-bacha','kq-cocina','kq-heladera2']];
 const types=[['Lineal',['N']],['Lineal lateral',['W']],['En L',['N','W']],['En L invertida',['N','E']],['Paralela',['W','E']],['En U',['N','W','E']],['Con isla',['N']],['En L con isla',['N','W']]];
 const permutations=a=>a.length<2?[a]:a.flatMap((v,i)=>permutations(a.filter((_,j)=>j!==i)).map(p=>[v,...p]));
 for(const [name,sides] of types)for(const ids of equipment)for(const order of permutations(ids))for(const addCounter of [true,false]){
  const parts=order.slice();if(addCounter)parts.splice(1,0,'kq-mesada');
  // Require a work surface, either independent counter or the sink's drainboard.
  for(const split of sides.length===1?[0]:sides.length===2?[1,2,3]:[1,2]){
   const runs=sides.length===1?[parts]:sides.length===2?[parts.slice(0,split),parts.slice(split)]:[parts.slice(0,split),parts.slice(split,split+1),parts.slice(split+1)];
   if(runs.some(r=>!r.length))continue;
   for(const align of [0,.5,1]){
    const placed=runs.map((r,i)=>run(r,sides[i],align));if(placed.some(x=>!x))continue;
    const items=placed.flat();
    if(name.includes('isla')){
     const b=dim('kq-isla');items.push({id:'kq-isla',x:(width-b.w)/2,y:(depth-b.d)/2,w:b.w,d:b.d,rotation:0,side:'I'});
    }
    if(items.some((a,i)=>!within(a)||items.slice(0,i).some(b=>overlap(a,b))))continue;
    const free=items.filter(a=>a.side!=='I').map(a=>front(a,.95));
    if(free.some((a,i)=>!within(a)||items.some((b,j)=>j!==i&&overlap(a,b))))continue;
    const island=items.find(a=>a.side==='I');if(island){
     const ring={x:island.x-.95,y:island.y-.95,w:island.w+1.9,d:island.d+1.9};
     if(!within(ring)||items.some(a=>a!==island&&overlap(a,ring)))continue;
    }
    for(const dx of [.12,(width-doorWidth)/2,width-doorWidth-.12]){
     const swing={x:dx,y:0,w:doorWidth,d:doorWidth};if(dx<.08||dx+doorWidth>width-.08||items.some(a=>overlap(a,swing)))continue;
     const key=name+'|'+runs.map(r=>r.join(',')).join('|'),sig=key+'|'+align+'|'+dx;
     if(seen.has(sig))continue;seen.add(sig);
     if(!groups.has(key))groups.set(key,[]);const g=groups.get(key);if(g.length>=2)continue;
     g.push({kind:'kitchen',typology:name+(addCounter?' · mesada':' · compacta'),width,depth,wall,items:items.slice(),door:{x:dx,width:doorWidth,outward:false},window:{x:(width-.9)/2,width:.9},turn:null,transfer:null,area:width*depth});
    }
   }
  }
 }
 const families=new Map();for(const [key,values] of groups){const name=key.split('|')[0];if(!families.has(name))families.set(name,[]);families.get(name).push(values)}
 for(let rank=0;rank<2&&out.length<count;rank++)for(let i=0;i<Math.max(0,...[...families.values()].map(v=>v.length))&&out.length<count;i++)for(const v of families.values()){if(v[i]?.[rank])out.push(v[i][rank]);if(out.length===count)break}
 return out;
}
function generate({kind='bath',width=3,depth=3,wall=.2,count=50}={}){
 if(!['bath','accessible','bedroom','kitchen'].includes(kind)||![width,depth,wall,count].every(Number.isFinite)||width<1.5||depth<1.5||width>20||depth>20||wall<.08||wall>.6||!Number.isInteger(count)||count<1||count>100)throw Error('Parámetros ARCHGEN inválidos');
 const lib=root.CAD2D_ARQ_LIBRARY;if(!lib?.build)throw Error('Biblioteca arquitectónica no disponible');
 if(kind==='kitchen')return generateKitchens(width,depth,wall,count,lib);
 const accessible=kind==='accessible',doorWidth=accessible?1:.9;
 if(accessible&&(width<2.8||depth<2.8))return [];
 const bounds=new Map(),get=id=>{if(!bounds.has(id)){const b=lib.bounds(lib.build(id).entities);bounds.set(id,{w:b.maxX-b.minX,d:b.maxY-b.minY})}return bounds.get(id)};
 const within=a=>a.x>=-1e-8&&a.y>=-1e-8&&a.x+a.w<=width+1e-8&&a.y+a.d<=depth+1e-8;
 const sides=['N','W','E','S'];
 const placements=(id,bed=false)=>{
  const b=get(id),out=[];
  for(const side of sides){
   const horizontal=side==='N'||side==='S',span=horizontal?width:depth;
   if(span<b.w+.18)continue;
   for(const [slot,f] of [['L',0],['C',.5],['R',1]]){
    const a=.09+(span-b.w-.18)*f;
    let x,y,rotation;
    if(side==='N'){x=a;y=depth-b.d-.06;rotation=180}
    if(side==='S'){x=a;y=.06;rotation=0}
    if(side==='W'){x=.06;y=a;rotation=270}
    if(side==='E'){x=width-b.d-.06;y=a;rotation=90}
    if(bed||id==='mob-placard')rotation=(rotation+180)%360;
    const p={id,x,y,w:horizontal?b.w:b.d,d:horizontal?b.d:b.w,rotation,side,slot};
    if(within(p))out.push(p);
   }
  }
  return out;
 };
 const front=(a,gap)=>{
  if(a.side==='N')return {x:a.x,y:a.y-gap,w:a.w,d:gap};
  if(a.side==='S')return {x:a.x,y:a.y+a.d,w:a.w,d:gap};
  if(a.side==='W')return {x:a.x+a.w,y:a.y,w:gap,d:a.d};
  return {x:a.x-gap,y:a.y,w:gap,d:a.d};
 };
 const specs=kind==='bedroom'?
  [['Queen con placard',['dor-queen','mob-placard']],['King con placard',['dor-king','mob-placard']],['Matrimonial con placard',['dor-cama2','mob-placard']],['Individual con placard y escritorio',['dor-cama1','mob-placard','mob-escritorio']]]:
 accessible?
  [['Accesible con ducha a piso',['san-wc','san-lav-acc','san-ducha-piso']],['Accesible con inodoro suspendido',['san-wc-susp','san-lav-acc','san-ducha-piso']]]:
  [['Ducha y bidet',['san-wc','san-bidet','san-lav','san-ducha']],['Bañera y bidet',['san-wc','san-bidet','san-lav','san-banera']],['Ducha con inodoro suspendido',['san-wc-susp','san-lav','san-ducha']],['Bañera y lavabo de pie',['san-wc','san-lav-pie','san-banera']],['Ducha y doble lavabo',['san-wc','san-lav2','san-ducha']],['Toilette',['san-wc','san-lav-pie']]];
 const doors=[.12,(width-doorWidth)/2,width-doorWidth-.12].filter(x=>x>=.08&&x+doorWidth<=width-.08);
 const seen=new Set(),groups=new Map();let attempts=0;
 function addCandidate(name,items,door){
  let turn=null,transfer=null,final=items.slice();
  if(accessible){
   const wc=items[0],bar=get('san-barra');
   const candidates=wc.side==='N'||wc.side==='S'?
    [{x:wc.x-.8,y:wc.y,w:.8,d:.8},{x:wc.x+wc.w,y:wc.y,w:.8,d:.8}]:
    [{x:wc.x,y:wc.y-.8,w:.8,d:.8},{x:wc.x,y:wc.y+wc.d,w:.8,d:.8}];
   transfer=candidates.find(a=>within(a)&&items.every(b=>!overlap(a,b)));
   if(!transfer)return;
   // A lateral support bar is only placed when the toilet is adjacent to a side wall.
   let support=null;
   if(wc.side==='N'||wc.side==='S'){
    if(wc.x<.16)support={id:'san-barra',x:.025,y:wc.y,w:bar.d,d:bar.w,rotation:90};
    else if(width-wc.x-wc.w<.16)support={id:'san-barra',x:width-.025-bar.d,y:wc.y,w:bar.d,d:bar.w,rotation:90};
   }else if(wc.y<.16)support={id:'san-barra',x:wc.x,y:.025,w:bar.w,d:bar.d,rotation:0};
   else if(depth-wc.y-wc.d<.16)support={id:'san-barra',x:wc.x,y:depth-.025-bar.d,w:bar.w,d:bar.d,rotation:0};
   if(!support||!within(support)||items.some(a=>overlap(a,support))||overlap(transfer,support))return;
   final.push(support);
   for(const fy of [.5,.4,.6])for(const fx of [.5,.4,.6]){
    const c={x:width*fx,y:depth*fy,r:.75};
    if(!turn&&c.x>=c.r&&c.y>=c.r&&width-c.x>=c.r&&depth-c.y>=c.r&&final.every(a=>Math.hypot(Math.max(a.x-c.x,0,c.x-a.x-a.w),Math.max(a.y-c.y,0,c.y-a.y-a.d))>=c.r-1e-8))turn=c;
   }
   if(!turn)return;
  }
  const topology=items.map(a=>a.id+':'+a.side).join('|'),signature=topology+'|'+items.map(a=>a.slot).join('|')+'|'+door.slot;
  if(seen.has(signature))return;seen.add(signature);
  const key=name+'|'+topology;
  if(!groups.has(key))groups.set(key,[]);
  const g=groups.get(key);if(g.length>=4)return;
  g.push({kind,typology:name,width,depth,wall,items:final,door:{x:door.x,width:doorWidth,outward:accessible},window:{x:(width-.9)/2,width:.9},turn,transfer,area:width*depth});
 }
 for(const [name,ids] of specs){
  const options=ids.map(id=>placements(id,id.startsWith('dor-')));let budget=30000;
  for(let di=0;di<doors.length;di++){
   const door={x:doors[di],slot:di},swing={x:door.x,y:0,w:doorWidth,d:accessible?.35:doorWidth};
   function visit(items,i){
    if(--budget<0)return;
    if(i===ids.length){addCandidate(name,items,door);return}
    for(const p of options[i]){
     if(budget<=0)break;attempts++;
     const clearance=front(p,kind==='bedroom'?.55:.42);
     if(overlap(p,swing)||!within(clearance)||items.some(a=>overlap(a,p)||overlap(a,clearance)||overlap(front(a,kind==='bedroom'?.55:.42),p)))continue;
     visit([...items,p],i+1);
    }
   }
   visit([],0);
  }
 }
 // Round-robin by architectural topology: no cluster of nearly identical plans.
 const families=new Map();for(const [key,values] of groups){const name=key.split('|')[0];if(!families.has(name))families.set(name,[]);families.get(name).push(values)}
 const out=[];for(let rank=0;rank<4&&out.length<count;rank++){
  const max=Math.max(0,...[...families.values()].map(v=>v.length));
  for(let i=0;i<max&&out.length<count;i++)for(const v of families.values()){if(v[i]?.[rank])out.push(v[i][rank]);if(out.length===count)break}
 }
 return out;
}
// Resize a standard room without scaling any component or changing its wall assignment.
// A rejected contraction leaves the original model untouched.
function resizeModel(model,width,depth){
 if(!model||!['bath','bedroom'].includes(model.kind))throw Error('Redimensionamiento inicial disponible para baños y dormitorios comunes');
 if(![width,depth,model.width,model.depth,model.wall].every(Number.isFinite)||width<1.5||depth<1.5||width>20||depth>20||!Array.isArray(model.items))throw Error('Dimensiones inválidas');
 const w0=model.width,d0=model.depth,eps=1e-8;
 const within=a=>a.x>=-eps&&a.y>=-eps&&a.x+a.w<=width+eps&&a.y+a.d<=depth+eps;
 const slide=(p,span,oldSize,newSize)=>{
  const free=oldSize-span;if(free<eps)return (newSize-span)/2;
  return p/free*(newSize-span);
 };
 const items=model.items.map(a=>{
  let x=slide(a.x,a.w,w0,width),y=slide(a.y,a.d,d0,depth);
  if(a.side==='N')y=depth-(d0-a.y);
  if(a.side==='S')y=a.y;
  if(a.side==='E')x=width-(w0-a.x);
  if(a.side==='W')x=a.x;
  return {...a,x,y};
 });
 const door={...model.door,x:slide(model.door.x,model.door.width,w0,width)};
 const window={...model.window,x:slide(model.window.x,model.window.width,w0,width)};
 for(const o of [door,window])if(!Number.isFinite(o.x)||o.x<.08-eps||o.x+o.width>width-.08+eps)throw Error('No hay espacio para conservar el vano');
 const swing={x:door.x,y:0,w:door.width,d:door.outward?.35:door.width};
 const gap=model.kind==='bedroom'?.55:.42;
 const front=a=>a.side==='N'?{x:a.x,y:a.y-gap,w:a.w,d:gap}:a.side==='S'?{x:a.x,y:a.y+a.d,w:a.w,d:gap}:a.side==='W'?{x:a.x+a.w,y:a.y,w:gap,d:a.d}:{x:a.x-gap,y:a.y,w:gap,d:a.d};
 for(const [i,a] of items.entries()){
  if(!within(a)||!within(front(a))||overlap(a,swing)||items.some((b,j)=>i!==j&&(overlap(a,b)||overlap(front(a),b))))throw Error('El tamaño solicitado genera interferencias o falta de espacio');
 }
 return {...model,width,depth,area:width*depth,items,door,window};
}
root.CAD2D_ARCHGEN=Object.freeze({generate,resizeModel});
if(typeof document==='undefined'||!root.CAD2D_CORE)return;
function openPalette(){
 const core=root.CAD2D_CORE,lib=root.CAD2D_ARQ_LIBRARY;
 if(!lib?.build)return core.toast('ARCHGEN: biblioteca aún no disponible');
 document.querySelector('[data-archgen-palette]')?.remove();
 const dlg=document.createElement('dialog');dlg.dataset.archgenPalette='1';
 dlg.style.cssText='width:min(960px,94vw);max-height:86vh;overflow:auto;background:#f4eddb;color:#38332c;border:1px solid #bcb29e;border-radius:6px;padding:14px;font:13px Arial,sans-serif';
 dlg.innerHTML='<div style="display:flex;align-items:center;gap:8px"><strong style="flex:1">ARCHGEN · Módulos arquitectónicos · Experimental</strong><button type="button" data-close>×</button></div><hr><div style="display:flex;flex-wrap:wrap;gap:10px"><label>Familia <select data-kind><option value="bath">Baños</option><option value="accessible">Baños accesibles</option><option value="bedroom">Dormitorios</option><option value="kitchen">Cocinas</option></select></label><label>Ancho (m) <input data-w type="number" min="1.5" max="20" step=".05" value="3" style="width:70px"></label><label>Largo (m) <input data-d type="number" min="1.5" max="20" step=".05" value="3" style="width:70px"></label><label>Muro (m) <input data-wall type="number" min=".08" max=".6" step=".01" value=".20" style="width:65px"></label><label>Variantes <input data-count type="number" min="1" max="100" value="50" style="width:55px"></label><label><input data-dim type="checkbox" checked> Cotas</label><label><input data-hatch type="checkbox"> HATCH pisos</label><button type="button" data-generate>Generar</button></div><p data-status role="status"></p><div data-gallery style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px"></div><hr><div style="display:flex;gap:8px;align-items:center"><label>X (m) <input data-x type="number" step=".1" value="0" style="width:85px"></label><label>Y (m) <input data-y type="number" step=".1" value="0" style="width:85px"></label><button type="button" data-insert disabled>Insertar seleccionados</button><button type="button" data-all>Seleccionar todos</button></div>';
 const q=s=>dlg.querySelector(s),num=s=>q(s).valueAsNumber;
 let models=[],chosen=new Set();
 const status=t=>q('[data-status]').textContent=t;
 const refresh=()=>q('[data-insert]').disabled=!chosen.size;
 const svgNS='http://www.w3.org/2000/svg';
 function preview(m){
  const svg=document.createElementNS(svgNS,'svg');svg.setAttribute('viewBox',[-m.wall-.15,-m.wall-.15,m.width+2*m.wall+.3,m.depth+2*m.wall+.3].join(' '));svg.style.cssText='width:100%;height:140px;display:block';
  const g=document.createElementNS(svgNS,'g');g.setAttribute('transform','translate(0 '+m.depth+') scale(1 -1)');svg.append(g);
  const el=(tag,attrs)=>{const e=document.createElementNS(svgNS,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));g.append(e)};
  const line=(a,b)=>el('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:'#38332c','stroke-width':.012});
  const rect=(x,y,w,h)=>el('rect',{x,y,width:w,height:h,fill:'none',stroke:'#38332c','stroke-width':.022});
  const t=m.wall,w=m.width,d=m.depth;
  // Continuous wall contours: no internal corner seams; openings remain clear.
  const dx0=m.door.x,dx1=dx0+m.door.width,wx0=m.window.x,wx1=wx0+m.window.width;
  const wallOutline=ps=>el('polygon',{points:ps.map(p=>p.join(',')).join(' '),fill:'none',stroke:'#38332c','stroke-width':.022,'stroke-linejoin':'miter'});
  wallOutline([[dx0,-t],[-t,-t],[-t,d+t],[wx0,d+t],[wx0,d],[0,d],[0,0],[dx0,0]]);
  wallOutline([[dx1,-t],[w+t,-t],[w+t,d+t],[wx1,d+t],[wx1,d],[w,d],[w,0],[dx1,0]]);
  for(const item of m.items){
   const b=lib.build(item.id),bb=lib.bounds(b.entities),r=(item.rotation||0)*Math.PI/180,c=Math.cos(r),s=Math.sin(r);
   const cs=[[bb.minX,bb.minY],[bb.maxX,bb.minY],[bb.maxX,bb.maxY],[bb.minX,bb.maxY]].map(([x,y])=>[x*c-y*s,x*s+y*c]),ox=item.x-Math.min(...cs.map(v=>v[0])),oy=item.y-Math.min(...cs.map(v=>v[1]));
   const tr=p=>({x:ox+p.x*c-p.y*s,y:oy+p.x*s+p.y*c});
   for(const e of b.entities){
    if(e.type==='line')line(tr(e.a),tr(e.b));
    else if(e.type==='rect'){const a=e.a,z=e.b,ps=[a,{x:z.x,y:a.y},z,{x:a.x,y:z.y}].map(tr);ps.forEach((p,i)=>line(p,ps[(i+1)%4]))}
    else if(e.type==='polyline'){const ps=e.pts.map(tr);for(let i=1;i<ps.length;i++)line(ps[i-1],ps[i]);if(e.closed)line(ps.at(-1),ps[0])}
    else if(e.type==='circle'||e.type==='ellipse'||e.type==='arc'){const rx=e.r||e.rx,ry=e.r||e.ry;let a=e.type==='arc'?e.a0:0,z=e.type==='arc'?e.a1:Math.PI*2;while(z<a)z+=Math.PI*2;let last=null;for(let j=0;j<=32;j++){const u=a+(z-a)*j/32,p=tr({x:e.c.x+rx*Math.cos(u),y:e.c.y+ry*Math.sin(u)});if(last)line(last,p);last=p}}
   }
  }
  const dx=m.door.x,dy=-t/2,sign=m.door.outward?-1:1,dw=m.door.width;line({x:dx,y:dy},{x:dx,y:dy+sign*dw});el('path',{d:'M '+(dx+dw)+' '+dy+' A '+dw+' '+dw+' 0 0 '+(sign>0?1:0)+' '+dx+' '+(dy+sign*dw),fill:'none',stroke:'#777','stroke-width':.012});
  for(const yy of [d+t*.25,d+t*.75])line({x:m.window.x,y:yy},{x:m.window.x+m.window.width,y:yy});
  if(m.turn)el('circle',{cx:m.turn.x,cy:m.turn.y,r:m.turn.r,fill:'none',stroke:'#777','stroke-width':.012,'stroke-dasharray':'.05 .04'});
  return svg;
 }
 function render(){
  chosen.clear();q('[data-gallery]').replaceChildren();
  try{models=generate({kind:q('[data-kind]').value,width:num('[data-w]'),depth:num('[data-d]'),wall:num('[data-wall]'),count:num('[data-count]')});
   models.forEach((m,i)=>{const card=document.createElement('button');card.type='button';card.style.cssText='background:#fbf6e9;color:#38332c;border:1px solid #bcb29e;padding:5px;cursor:pointer';card.append(preview(m));const label=document.createElement('span');label.textContent='Modelo '+(i+1)+' · '+m.typology+' · '+m.area.toFixed(2)+' m²';card.append(label);card.setAttribute('aria-pressed','false');card.onclick=()=>{chosen.has(i)?chosen.delete(i):chosen.add(i);card.setAttribute('aria-pressed',String(chosen.has(i)));card.style.outline=chosen.has(i)?'2px solid #746447':'';refresh()};q('[data-gallery]').append(card)});
   status(models.length+' alternativas preliminares. Revisar funcionalidad y medidas antes de utilizar en obra.');
  }catch(e){models=[];q('[data-gallery]').replaceChildren();status(e.message)}refresh();
 }
 q('[data-kind]').onchange=()=>{const kind=q('[data-kind]').value;q('[data-w]').value=kind==='bedroom'||kind==='kitchen'?5:3;q('[data-d]').value=kind==='bedroom'?4.5:kind==='kitchen'?4:3;render()};
 q('[data-generate]').onclick=render;
 q('[data-all]').onclick=()=>{Array.from(q('[data-gallery]').children).forEach((card,i)=>{if(!chosen.has(i))card.click()})};
 q('[data-insert]').onclick=()=>{try{if(!Number.isFinite(num('[data-x]'))||!Number.isFinite(num('[data-y]')))throw Error('Origen inválido');const n=root.CAD2D_ARCHGEN_INSERT([...chosen].sort((a,b)=>a-b).map(i=>models[i]),{x:num('[data-x]'),y:num('[data-y]')},{dimensions:q('[data-dim]').checked,floorHatch:q('[data-hatch]').checked});dlg.close();core.zoomExtents();core.toast('ARCHGEN: '+n+' módulos insertados')}catch(e){status(e.message)}};
 q('[data-close]').onclick=()=>dlg.close();dlg.addEventListener('close',()=>dlg.remove());document.body.append(dlg);dlg.showModal();render();
}
root.CAD2D_EXTENSIONS.commands.ARCHGEN=openPalette;
root.CAD2D_CORE.ribbon.add('home','Architecture',[{id:'archgenModules',label:'ARCHGEN',run:openPalette}]);
root.CAD2D_CORE.ribbon.rebuild();
})(globalThis);
