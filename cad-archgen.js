/* ARCHGEN: metre-based candidate layouts, independent from CAD UI.
 * Candidates are design studies, not building-code certifications.
 * Furniture IDs resolve through the existing architectural library.
 */
(function(root){
'use strict';
const overlap=(a,b)=>a.x<b.x+b.w-1e-8&&b.x<a.x+a.w-1e-8&&a.y<b.y+b.d-1e-8&&b.y<a.y+a.d-1e-8;
function generate({kind='bath',width=3,depth=3,wall=.2,count=25}={}){
 if(!['bath','accessible','bedroom'].includes(kind)||![width,depth,wall,count].every(Number.isFinite)||width<1.5||depth<1.5||width>20||depth>20||wall<.08||wall>.6||!Number.isInteger(count)||count<1||count>25)throw Error('Parámetros ARCHGEN inválidos');
 const out=[],seen=new Set(),accessible=kind==='accessible',doorWidth=accessible?1:.9;
 if(accessible&&(width<2.8||depth<2.8))return [];
 for(const mirror of [false,true])for(const style of [0,1,2])for(const variant of [0,1,2,3,4]){
  const items=[],add=(id,x,y,w,d,rotation=0)=>items.push({id,x,y,w,d,rotation});
  let turn=null,transfer=null;
  if(kind==='bedroom'){
   const bed=style===0?['dor-queen',2.6,2]:style===1?['dor-king',3,2]:['dor-cama2',2.4,1.9];
   add(bed[0],(width-bed[1])/2+(variant-2)*.12,depth-bed[2]-.08,bed[1],bed[2]);
   add('mob-placard',width-1.85,.15,1.8,.62);
  }else{
   add(style===1?'san-wc-susp':'san-wc',.12,depth-.82,.4,.7,180);
   add(accessible?'san-lav-acc':style===2?'san-lav-pie':'san-lav',width-.82,depth-.65,.70,.50,180);
   if(accessible){
    add('san-ducha-piso',width-1.12,.08,1,1);
    add('san-barra',.03,depth-.9,.035,.8,90);
    turn={x:width/2,y:depth/2,r:.75};
    transfer={x:.54,y:depth-.85,w:.8,d:.8};
   }else{
    add(style===2?'san-banera':'san-ducha',width-(style===2?1.8:1),.10,style===2?1.7:.9,style===2?.75:.9);
    if(style!==1)add('san-bidet',.12+(variant*.04),depth-1.5,.38,.58,180);
   }
  }
  const dx=.12+variant*.08;
  const door={x:dx,width:doorWidth,outward:accessible};
  const swing={x:dx,y:0,w:doorWidth,d:accessible?0:doorWidth};
  if(items.some((a,i)=>a.x<0||a.y<0||a.x+a.w>width+1e-8||a.y+a.d>depth+1e-8||items.slice(0,i).some(b=>overlap(a,b))||(!accessible&&overlap(a,swing))))continue;
  if(accessible&&(items.some(a=>overlap(a,transfer))||items.some(a=>Math.hypot(Math.max(a.x-turn.x,0,turn.x-a.x-a.w),Math.max(a.y-turn.y,0,turn.y-a.y-a.d))<turn.r-1e-8)))continue;
  if(mirror){for(const a of items){a.x=width-a.x-a.w;a.rotation=(360-a.rotation)%360}door.x=width-door.x-door.width;if(transfer)transfer.x=width-transfer.x-transfer.w}
  const signature=JSON.stringify({items,door});if(seen.has(signature))continue;seen.add(signature);
  out.push({kind,width,depth,wall,items,door,window:{x:(width-.9)/2,width:.9},turn,transfer,area:width*depth});
  if(out.length===count)return out;
 }
 return out;
}
root.CAD2D_ARCHGEN=Object.freeze({generate});
if(typeof document==='undefined'||!root.CAD2D_CORE)return;
function openPalette(){
 const core=root.CAD2D_CORE,lib=root.CAD2D_ARQ_LIBRARY;
 if(!lib?.build)return core.toast('ARCHGEN: biblioteca aún no disponible');
 document.querySelector('[data-archgen-palette]')?.remove();
 const dlg=document.createElement('dialog');dlg.dataset.archgenPalette='1';
 dlg.style.cssText='width:min(960px,94vw);max-height:86vh;overflow:auto;background:#f4eddb;color:#38332c;border:1px solid #bcb29e;border-radius:6px;padding:14px;font:13px Arial,sans-serif';
 dlg.innerHTML='<div style="display:flex;align-items:center;gap:8px"><strong style="flex:1">ARCHGEN · Módulos arquitectónicos · Experimental</strong><button type="button" data-close>×</button></div><hr><div style="display:flex;flex-wrap:wrap;gap:10px"><label>Familia <select data-kind><option value="bath">Baños</option><option value="accessible">Baños accesibles</option><option value="bedroom">Dormitorios</option></select></label><label>Ancho (m) <input data-w type="number" min="1.5" max="20" step=".05" value="3" style="width:70px"></label><label>Largo (m) <input data-d type="number" min="1.5" max="20" step=".05" value="3" style="width:70px"></label><label>Muro (m) <input data-wall type="number" min=".08" max=".6" step=".01" value=".20" style="width:65px"></label><label>Variantes <input data-count type="number" min="1" max="25" value="25" style="width:55px"></label><label><input data-dim type="checkbox" checked> Cotas</label><label><input data-hatch type="checkbox"> HATCH pisos</label><button type="button" data-generate>Generar</button></div><p data-status role="status"></p><div data-gallery style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px"></div><hr><div style="display:flex;gap:8px;align-items:center"><label>X (m) <input data-x type="number" step=".1" value="0" style="width:85px"></label><label>Y (m) <input data-y type="number" step=".1" value="0" style="width:85px"></label><button type="button" data-insert disabled>Insertar seleccionados</button><button type="button" data-all>Seleccionar todos</button></div>';
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
  rect(-t,0,t,d);rect(w,0,t,d);rect(-t,-t,m.door.x+t,t);rect(m.door.x+m.door.width,-t,w+t-m.door.x-m.door.width,t);rect(-t,d,m.window.x+t,t);rect(m.window.x+m.window.width,d,w+t-m.window.x-m.window.width,t);
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
   models.forEach((m,i)=>{const card=document.createElement('button');card.type='button';card.style.cssText='background:#fbf6e9;color:#38332c;border:1px solid #bcb29e;padding:5px;cursor:pointer';card.append(preview(m));const label=document.createElement('span');label.textContent='Modelo '+(i+1)+' · '+m.area.toFixed(2)+' m²';card.append(label);card.setAttribute('aria-pressed','false');card.onclick=()=>{chosen.has(i)?chosen.delete(i):chosen.add(i);card.setAttribute('aria-pressed',String(chosen.has(i)));card.style.outline=chosen.has(i)?'2px solid #746447':'';refresh()};q('[data-gallery]').append(card)});
   status(models.length+' alternativas preliminares. Revisar funcionalidad y medidas antes de utilizar en obra.');
  }catch(e){models=[];q('[data-gallery]').replaceChildren();status(e.message)}refresh();
 }
 q('[data-kind]').onchange=()=>{const bedroom=q('[data-kind]').value==='bedroom';q('[data-w]').value=bedroom?5:3;q('[data-d]').value=bedroom?4.5:3;render()};
 q('[data-generate]').onclick=render;
 q('[data-all]').onclick=()=>{Array.from(q('[data-gallery]').children).forEach((card,i)=>{if(!chosen.has(i))card.click()})};
 q('[data-insert]').onclick=()=>{try{if(!Number.isFinite(num('[data-x]'))||!Number.isFinite(num('[data-y]')))throw Error('Origen inválido');const n=root.CAD2D_ARCHGEN_INSERT([...chosen].sort((a,b)=>a-b).map(i=>models[i]),{x:num('[data-x]'),y:num('[data-y]')},{dimensions:q('[data-dim]').checked,floorHatch:q('[data-hatch]').checked});dlg.close();core.zoomExtents();core.toast('ARCHGEN: '+n+' módulos insertados')}catch(e){status(e.message)}};
 q('[data-close]').onclick=()=>dlg.close();dlg.addEventListener('close',()=>dlg.remove());document.body.append(dlg);dlg.showModal();render();
}
root.CAD2D_EXTENSIONS.commands.ARCHGEN=openPalette;
root.CAD2D_CORE.ribbon.add('home','Architecture',[{id:'archgenModules',label:'ARCHGEN',run:openPalette}]);
root.CAD2D_CORE.ribbon.rebuild();
})(globalThis);
