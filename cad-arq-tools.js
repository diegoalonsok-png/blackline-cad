/* CAD2D · Herramientas de arquitectura y de presentación (Nov 2026)
 * 1. Cinta: pestaña ARQUITECTURA y grupos nuevos en Dibujo, Modificar, Anotar, Vista y Salida,
 *    con icono propio para cada orden (tipo de línea punteada/discontinua/eje incluido).
 * 2. Muros con COTAS VIRTUALES: al seleccionar un muro se ven su largo y su espesor (no se imprimen
 *    ni se exportan). Clic en la cota → nuevo valor. Pinzamientos ▶ en las puntas para estirarlo;
 *    los muros conectados en esa esquina acompañan y las uniones se rehacen solas.
 * 3. Ventanas gráficas (MVIEW / VENTANA) en LAYOUT: varias por hoja, cada una con escala y encuadre.
 * Implementación propia; pictogramas genéricos de dibujo técnico.
 */
(function(){
'use strict';
const CORE=window.CAD2D_CORE,EXT=window.CAD2D_EXTENSIONS;if(!CORE||!EXT||!CORE.ribbon)return;
const P=(x,y)=>({x,y}),S=()=>CORE.state,$=id=>document.getElementById(id);
const f=()=>1000/CORE.U[S().unit];
const run=cmd=>()=>CORE.command(cmd);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* =================== 1. CINTA =================== */
const I={
 muro:'<path d="M2 8h20M2 16h20"/><path d="M5 8v8M9 8v8M13 8v8M17 8v8M21 8v8" stroke-dasharray="1.5 1.5"/>',
 puerta:'<path d="M3 21h4M17 21h4M7 21V7"/><path d="M7 7a14 14 0 0 1 14 14" stroke-dasharray="2 1.6"/>',
 ventana:'<path d="M2 9h20M2 15h20M4 9v6M20 9v6M4 12h16"/>',
 galeria:'<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><path d="M17 14v6M14 17h6"/>',
 bano:'<rect x="3" y="3" width="18" height="18" rx="1"/><ellipse cx="9" cy="14" rx="3" ry="4"/><rect x="6.5" y="5" width="5" height="3"/><rect x="14.5" y="5" width="4.5" height="6" rx="1.5"/>',
 cocina:'<rect x="3" y="3" width="18" height="7"/><circle cx="7" cy="6.5" r="1.6"/><circle cx="11.5" cy="6.5" r="1.6"/><rect x="14.5" y="4.5" width="5" height="4" rx="1"/><rect x="7" y="14" width="10" height="6"/>',
 escalera:'<path d="M4 21h4v-4h4v-4h4V9h4V5"/><path d="M4 21V5" stroke-dasharray="1.5 1.5"/>',
 mobiliario:'<rect x="3" y="9" width="18" height="8" rx="2"/><path d="M5 9V6h14v3M5 17v3M19 17v3"/>',
 local:'<rect x="3" y="3" width="18" height="18"/><path d="M8 10h8M9 14h6"/><text x="7.2" y="19.5" font-size="4" fill="currentColor" stroke="none" font-family="Arial">m²</text>',
 contar:'<rect x="3" y="4" width="7" height="7"/><rect x="3" y="13" width="7" height="7"/><path d="M13 7h8M13 16h8M15 5v4M15 14v4"/>',
 spline:'<path d="M3 17c3-9 6-9 9-3s6 6 9-6"/><circle cx="3" cy="17" r="1.2"/><circle cx="12" cy="14" r="1.2"/><circle cx="21" cy="8" r="1.2"/>',
 arandela:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/><path d="M6.5 9.5 9 12M7.5 15l2.3-1.5M15 7.5l-1.5 2.3M17.5 14.5 15 13" stroke-width="1"/>',
 xline:'<path d="M2 20 22 4" stroke-dasharray="3 2"/><circle cx="12" cy="12" r="1.6"/>',
 ray:'<path d="M5 19 22 5" stroke-dasharray="3 2"/><circle cx="5" cy="19" r="1.8"/>',
 nube:'<path d="M6 17a3 3 0 0 1 0-6 4 4 0 0 1 7-2 3.5 3.5 0 0 1 5.5 2 3 3 0 0 1-.5 6z"/>',
 dividir:'<path d="M3 12h18"/><circle cx="7.5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="16.5" cy="12" r="1.4"/><path d="M3 9v6M21 9v6"/>',
 graduar:'<path d="M3 15h18M3 15V9M7 15v-3M11 15v-3M15 15v-3M19 15v-3"/>',
 centro:'<circle cx="12" cy="12" r="7"/><path d="M12 2v6M12 16v6M2 12h6M16 12h6M10.5 12h3M12 10.5v3"/>',
 eje:'<path d="M3 6h18M3 18h18"/><path d="M3 12h4M9 12h2M13 12h4M19 12h2"/>',
 matrizcamino:'<path d="M3 19C8 19 9 5 21 5" stroke-dasharray="1.5 1.5"/><rect x="2" y="16" width="4" height="4"/><rect x="9" y="9" width="4" height="4"/><rect x="18" y="3" width="4" height="4"/>',
 grupo:'<rect x="2" y="2" width="20" height="20" rx="1" stroke-dasharray="3 2"/><circle cx="8" cy="9" r="3"/><rect x="12" y="12" width="7" height="6"/>',
 desagrupar:'<circle cx="7" cy="7" r="3.5"/><rect x="13" y="13" width="8" height="7"/><path d="m14 4 6 6M20 4l-6 6"/>',
 alfrente:'<rect x="3" y="3" width="11" height="11" stroke-dasharray="2 1.6"/><rect x="9" y="9" width="12" height="12" fill="currentColor" fill-opacity=".25"/>',
 alfondo:'<rect x="9" y="9" width="12" height="12" stroke-dasharray="2 1.6"/><rect x="3" y="3" width="11" height="11" fill="currentColor" fill-opacity=".25"/>',
 porcapa:'<path d="m3 8 9-5 9 5-9 5z"/><path d="M3 13l9 5 9-5"/><path d="M15 20l2 2 4-5"/>',
 aislar:'<circle cx="12" cy="12" r="4"/><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/>',
 mostrar:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/><path d="M3 21 21 3" stroke-dasharray="2 2"/>',
 acocont:'<path d="M3 6v12M10 6v12M17 6v12M3 12h14m-11-2-3 2 3 2M14 10l3 2-3 2"/><path d="M19 12h3" stroke-dasharray="1.2 1.2"/>',
 acobase:'<path d="M3 4v17M11 10v11M19 16v5M3 10h8M3 16h16"/>',
 lt_cont:'<path d="M2 12h20"/>',
 lt_dash:'<path d="M2 12h20" stroke-dasharray="4 2.5"/>',
 lt_dot:'<path d="M2 12h20" stroke-dasharray="0.1 3" stroke-width="2.2"/>',
 lt_eje:'<path d="M2 12h20" stroke-dasharray="6 2 1 2"/>',
 capaiso:'<path d="m3 8 9-5 9 5-9 5z"/><path d="M3 13l9 5 9-5M3 18l9 5 9-5" stroke-dasharray="1.6 1.6"/>',
 capauniso:'<path d="m3 7 9-5 9 5-9 5zM3 12l9 5 9-5M3 17l9 5 9-5"/>',
 capades:'<path d="m3 8 9-5 9 5-9 5zM3 13l9 5 9-5"/><path d="M4 21 20 3"/>',
 capaact:'<path d="m3 8 9-5 9 5-9 5zM3 13l9 5 9-5"/><circle cx="18.5" cy="18.5" r="3"/>',
 capabloq:'<path d="m3 8 9-5 9 5-9 5z"/><rect x="13" y="15" width="8" height="6" rx="1"/><path d="M15 15v-2a2 2 0 0 1 4 0v2"/>',
 zo:'<circle cx="10" cy="10" r="6.5"/><path d="m15 15 6 6"/><rect x="7.5" y="7.5" width="5" height="5"/>',
 estado:'<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M8 8h8M8 12h8M8 16h5"/>',
 cal:'<rect x="5" y="2.5" width="14" height="19" rx="2"/><rect x="7.5" y="5" width="9" height="4"/><path d="M8 13h1M11.5 13h1M15 13h1M8 16.5h1M11.5 16.5h1M15 16.5h1"/>',
 mview:'<rect x="2" y="3" width="20" height="18" rx="1"/><rect x="4.5" y="5.5" width="8" height="7"/><rect x="14" y="5.5" width="5.5" height="5"/><path d="M4.5 15h15v3.5h-15z" stroke-dasharray="1.5 1.5"/>',
 buscar:'<circle cx="10" cy="10" r="6.5"/><path d="m15 15 6 6M7 10h6"/>',
 auditar:'<path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5z"/><path d="m8.5 12 2.5 2.5 5-5"/>'
};
function setLinetype(lt){
 const st=S(),list=st.entities.filter(e=>st.selected.includes(e.id)&&!CORE.layerFor(e).locked);
 if(!list.length)return CORE.toast('Tipo de línea: seleccioná objetos primero');
 CORE.saveHistory();for(const e of list){if(lt==='CONTINUOUS')delete e.linetype;else e.linetype=lt}CORE.updateAll();
 CORE.toast('Tipo de línea '+({CONTINUOUS:'continua',DASHED:'discontinua',DOTTED:'punteada',CENTER:'eje'}[lt])+' en '+list.length+' objeto(s)');
}
const add=(tab,group,items)=>CORE.ribbon.add(tab,group,items.map(([id,label,icon,fn])=>({id,label,icon:I[icon]||I[id],run:fn})));
add('arq','MUROS',[['arqMuro','Muro','muro',run('WALL')],['arqPuerta','Puertas y ventanas','puerta',()=>{try{document.querySelector('[data-tool="blockgallery"]')?.click()}catch(e){}CORE.toast('Elegí una puerta o ventana en la paleta BLOQUES → Openings: se alinea y corta el muro sola')}]]);
add('arq','GALERÍA',[['arqGaleria','Galería','galeria',run('GALERIA')],['arqBano','Baños','bano',run('BANO')],['arqCocina','Cocinas','cocina',run('COCINA')],['arqEscalera','Escaleras','escalera',run('ESCALERA')],['arqMuebles','Mobiliario','mobiliario',run('MOBILIARIO')]]);
add('arq','LOCALES',[['arqLocal','Local + m²','local',run('LOCAL')],['arqContar','Contar bloques','contar',run('CONTARBLOQUES')]]);
add('draw','MÁS DIBUJO',[['drSpline','Spline','spline',run('SPLINE')],['drDonut','Arandela','arandela',run('ARANDELA')],['drXline','Línea const.','xline',run('LINEACONST')],['drRay','Semirrecta','ray',run('SEMIRRECTA')],['drNube','Nube rev.','nube',run('NUBEREV')],['drDiv','Dividir','dividir',run('DIVIDIR')],['drMed','Graduar','graduar',run('GRADUAR')],['drCentro','Marca centro','centro',run('MARCACENTRO')],['drEje','Línea eje','eje',run('LINEACENTRO')]]);
add('modify','ORGANIZAR',[['mdCamino','Matriz camino','matrizcamino',run('MATRIZCAMINO')],['mdGrupo','Agrupar','grupo',run('GRUPO')],['mdDesag','Desagrupar','desagrupar',run('DESAGRUPAR')],['mdFrente','Al frente','alfrente',run('ALFRENTE')],['mdFondo','Al fondo','alfondo',run('ALFONDO')],['mdPorCapa','Por capa','porcapa',run('PORCAPA')]]);
add('annotate','COTAS EN SERIE',[['anCont','Cota continua','acocont',run('ACOCONT')],['anBase','Línea base','acobase',run('ACOLINEABASE')],['anLocal','Local + m²','local',run('LOCAL')]]);
add('annotate','TIPO DE LÍNEA',[['ltCont','Continua','lt_cont',()=>setLinetype('CONTINUOUS')],['ltDash','Discontinua','lt_dash',()=>setLinetype('DASHED')],['ltDot','Punteada','lt_dot',()=>setLinetype('DOTTED')],['ltEje','Eje','lt_eje',()=>setLinetype('CENTER')]]);
add('view','CAPAS',[['vwIso','Aislar capa','capaiso',run('CAPAISO')],['vwUniso','Restaurar capas','capauniso',run('CAPAUNISO')],['vwOff','Apagar capa','capades',run('CAPADES')],['vwOn','Encender todas','capaact',run('CAPAACT')],['vwLock','Bloquear capa','capabloq',run('CAPABLOQ')]]);
add('view','OBJETOS',[['vwAislar','Aislar objetos','aislar',run('AISLAR')],['vwMostrar','Mostrar todo','mostrar',run('MOSTRARTODO')],['vwZo','Zoom objeto','zo',run('ZO')],['vwEstado','Estado','estado',run('ESTADO')],['vwCal','Calculadora','cal',run('CAL')],['vwBuscar','Buscar texto','buscar',run('BUSCAR')],['vwAudit','Auditar','auditar',run('AUDITAR')]]);
add('output','VENTANAS',[['ouMview','Nueva ventana','mview',run('VENTANA')]]);
// Pestaña ARQUITECTURA
(function addTab(){
 const tabs=[...document.querySelectorAll('.tab')];if(!tabs.length||document.querySelector('.tab[data-tab="arq"]'))return;
 const b=document.createElement('button');b.type='button';b.className='tab';b.dataset.tab='arq';b.textContent='Arquitectura';
 tabs[0].after(b);
 b.addEventListener('click',()=>{for(const t of document.querySelectorAll('.tab'))t.classList.toggle('active',t===b);CORE.ribbon.rebuild()});
 for(const t of tabs)t.addEventListener('click',()=>b.classList.remove('active'));
})();
CORE.ribbon.rebuild();

/* =================== 2. MUROS: COTAS VIRTUALES Y ESTIRAMIENTO =================== */
function wallOfSelection(){
 const st=S();if(st.tool!=='select')return null;
 const sel=st.entities.filter(e=>st.selected.includes(e.id));
 const groups=new Set(sel.filter(e=>e.wall2d).map(e=>e.wall2d.group));if(groups.size!==1)return null;
 const g=[...groups][0],faces=st.entities.filter(e=>e.type==='line'&&e.wall2d?.group===g&&e.autoOpeningRef===undefined);
 if(faces.length!==2||CORE.layerFor(faces[0]).locked)return null;
 faces.sort((a,b)=>a.wall2d.face-b.wall2d.face);
 const m=faces[0].wall2d,axis=CORE.wall.centerline(m);if(!axis)return null;
 return {group:g,faces,meta:m,axis};
}
function wallGroups(){const map=new Map();for(const e of S().entities){if(e.type!=='line'||!e.wall2d||e.autoOpeningRef!==undefined)continue;if(!map.has(e.wall2d.group))map.set(e.wall2d.group,[]);map.get(e.wall2d.group).push(e)}return [...map.entries()].filter(([,v])=>v.length===2).map(([group,faces])=>({group,faces:faces.sort((a,b)=>a.wall2d.face-b.wall2d.face)}))}
function rebuildGroup(faces,guideA,guideB,thickness){
 const m=faces[0].wall2d,t=thickness??m.thickness,built=CORE.wall.faces(guideA,guideB,t,m.justify);if(!built)return false;
 faces.forEach((e,i)=>{e.a={...built[i].a};e.b={...built[i].b};e.wall2d={...e.wall2d,guideA:{...guideA},guideB:{...guideB},thickness:t}});
 return true;
}
function rejoinAll(groups){for(const g of groups)CORE.wall.join(g.faces)}
function applyWallChange(w,newA,newB,thickness){
 const tol=Math.max(.02*f(),w.meta.thickness*.6),changed=[{faces:w.faces}];
 const moves=[[w.meta.guideA,newA],[w.meta.guideB,newB]].filter(([o,n])=>CORE.dist(o,n)>1e-9);
 CORE.saveHistory();
 // Muros conectados en una esquina movida: su punta acompaña (como en un CAD de arquitectura).
 for(const g of wallGroups()){
  if(g.group===w.group)continue;const m=g.faces[0].wall2d;let A=m.guideA,B=m.guideB,touched=false;
  for(const [o,n] of moves){if(CORE.dist(A,o)<=tol){A=n;touched=true}if(CORE.dist(B,o)<=tol){B=n;touched=true}}
  // Cambio de espesor: los tabiques que llegan en T se vuelven a unir contra las caras nuevas.
  if(!touched&&thickness!==undefined&&thickness!==w.meta.thickness){
   for(const tip of [A,B]){const ax=w.axis,vx=ax.b.x-ax.a.x,vy=ax.b.y-ax.a.y,L2=vx*vx+vy*vy,t=((tip.x-ax.a.x)*vx+(tip.y-ax.a.y)*vy)/L2,d=Math.abs((tip.x-ax.a.x)*vy-(tip.y-ax.a.y)*vx)/Math.sqrt(L2);if(t>0&&t<1&&d<=Math.max(thickness,w.meta.thickness))touched=true}
  }
  if(touched&&rebuildGroup(g.faces,A,B))changed.push(g);
 }
 if(!rebuildGroup(w.faces,newA,newB,thickness)){CORE.toast('Muro: geometría inválida');return}
 rejoinAll(changed);CORE.updateAll();
}
const fmtM=v=>(v*CORE.U[S().unit]/1000).toFixed(2).replace('.',',');
let wallDrag=null,wallHits=[];
EXT.overlays.push(ctx=>{
 wallHits=[];const w=wallOfSelection();if(!w)return;
 const m=w.meta,A=wallDrag?.A||m.guideA,B=wallDrag?.B||m.guideB,len=CORE.dist(A,B);if(!(len>1e-9))return;
 const sa=CORE.screen(A),sb=CORE.screen(B),dx=sb.x-sa.x,dy=sb.y-sa.y,L=Math.hypot(dx,dy)||1,ux=dx/L,uy=dy/L,nx=-uy,ny=ux;
 const half=Math.max(8,m.thickness*S().view.scale/2),off=half+26;
 const p1={x:sa.x+nx*off,y:sa.y+ny*off},p2={x:sb.x+nx*off,y:sb.y+ny*off};
 ctx.save();ctx.strokeStyle='#59d0ff';ctx.fillStyle='#59d0ff';ctx.lineWidth=1;ctx.setLineDash([]);
 // cota virtual de largo (solo pantalla)
 ctx.beginPath();ctx.moveTo(sa.x+nx*(half+4),sa.y+ny*(half+4));ctx.lineTo(p1.x+nx*5,p1.y+ny*5);ctx.moveTo(sb.x+nx*(half+4),sb.y+ny*(half+4));ctx.lineTo(p2.x+nx*5,p2.y+ny*5);ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.stroke();
 for(const [p,s] of [[p1,1],[p2,-1]]){ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+ux*8*s+nx*3,p.y+uy*8*s+ny*3);ctx.lineTo(p.x+ux*8*s-nx*3,p.y+uy*8*s-ny*3);ctx.closePath();ctx.fill()}
 const label=(wallDrag?'⟷ ':'')+fmtM(len)+' m',mid={x:(p1.x+p2.x)/2,y:(p1.y+p2.y)/2};
 ctx.font='bold 12px Arial';const tw=ctx.measureText(label).width+12;
 ctx.fillStyle='rgba(6,22,32,.92)';ctx.strokeStyle='#59d0ff';ctx.fillRect(mid.x-tw/2,mid.y-10,tw,20);ctx.strokeRect(mid.x-tw/2,mid.y-10,tw,20);
 ctx.fillStyle='#d8f4ff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,mid.x,mid.y+.5);
 wallHits.push({kind:'len',x:mid.x-tw/2,y:mid.y-10,w:tw,h:20});
 // espesor
 const c={x:(sa.x+sb.x)/2-nx*(half+20),y:(sa.y+sb.y)/2-ny*(half+20)},tl='e '+fmtM(m.thickness);
 const ew=ctx.measureText(tl).width+12;ctx.fillStyle='rgba(6,22,32,.92)';ctx.fillRect(c.x-ew/2,c.y-10,ew,20);ctx.strokeRect(c.x-ew/2,c.y-10,ew,20);ctx.fillStyle='#d8f4ff';ctx.fillText(tl,c.x,c.y+.5);
 wallHits.push({kind:'thick',x:c.x-ew/2,y:c.y-10,w:ew,h:20});
 // pinzamientos de estiramiento ▶ en las puntas
 for(const [p,s,end] of [[sa,-1,'A'],[sb,1,'B']]){const g={x:p.x+ux*s*16,y:p.y+uy*s*16};ctx.save();ctx.translate(g.x,g.y);ctx.rotate(Math.atan2(uy*s,ux*s));ctx.beginPath();ctx.moveTo(9,0);ctx.lineTo(-6,-7);ctx.lineTo(-6,7);ctx.closePath();ctx.fillStyle=wallDrag?.end===end?'#ff5f8f':'#37d6ff';ctx.strokeStyle='#06131b';ctx.fill();ctx.stroke();ctx.restore();wallHits.push({kind:'end',end,x:g.x-10,y:g.y-10,w:20,h:20})}
 ctx.restore();
});
const inBox=(p,h)=>p.x>=h.x&&p.x<=h.x+h.w&&p.y>=h.y&&p.y<=h.y+h.h;
CORE.canvas.addEventListener('pointerdown',ev=>{
 if(ev.button!==0||!wallHits.length)return;const raw=P(ev.offsetX,ev.offsetY),hit=wallHits.find(h=>inBox(raw,h));if(!hit)return;
 const w=wallOfSelection();if(!w)return;ev.preventDefault();ev.stopImmediatePropagation();
 const m=w.meta,U=CORE.U[S().unit]/1000;
 if(hit.kind==='len'){
  const r=window.prompt('Largo del muro en metros (se mantiene el extremo inicial)',fmtM(CORE.dist(m.guideA,m.guideB)).replace(',','.'));if(r===null)return;
  const L=Number(r.replace(',','.'))/U;if(!(L>.01/U))return CORE.toast('Largo inválido');
  const d=CORE.dist(m.guideA,m.guideB),u={x:(m.guideB.x-m.guideA.x)/d,y:(m.guideB.y-m.guideA.y)/d};
  applyWallChange(w,m.guideA,{x:m.guideA.x+u.x*L,y:m.guideA.y+u.y*L});CORE.toast('Muro: '+r+' m · Ctrl+Z deshace');return;
 }
 if(hit.kind==='thick'){
  const r=window.prompt('Espesor del muro en metros (ej. 0.15, 0.20, 0.30)',fmtM(m.thickness).replace(',','.'));if(r===null)return;
  const T=Number(r.replace(',','.'))/U;if(!(T>=.04/U&&T<=3/U))return CORE.toast('Espesor entre 0,04 y 3 m');
  applyWallChange(w,m.guideA,m.guideB,T);CORE.toast('Espesor '+r+' m · Ctrl+Z deshace');return;
 }
 wallDrag={end:hit.end,group:w.group,A:{...m.guideA},B:{...m.guideB}};try{CORE.canvas.setPointerCapture(ev.pointerId)}catch(e){}
},true);
CORE.canvas.addEventListener('pointermove',ev=>{
 if(!wallDrag)return;ev.stopImmediatePropagation();
 const w=wallOfSelection();if(!w){wallDrag=null;return}
 const m=w.meta,q=CORE.snapPoint(CORE.world(P(ev.offsetX,ev.offsetY))),fixed=wallDrag.end==='A'?m.guideB:m.guideA,moving=wallDrag.end==='A'?m.guideA:m.guideB;
 const d=CORE.dist(fixed,moving),u={x:(moving.x-fixed.x)/d,y:(moving.y-fixed.y)/d};
 let L=(q.x-fixed.x)*u.x+(q.y-fixed.y)*u.y;const step=(ev.shiftKey?.01:.05)*f();L=Math.max(step,Math.round(L/step)*step);
 const np={x:fixed.x+u.x*L,y:fixed.y+u.y*L};if(wallDrag.end==='A')wallDrag.A=np;else wallDrag.B=np;CORE.schedule();
},true);
CORE.canvas.addEventListener('pointerup',ev=>{
 if(!wallDrag)return;ev.stopImmediatePropagation();const d=wallDrag;wallDrag=null;const w=wallOfSelection();if(!w)return CORE.schedule();
 applyWallChange(w,d.A,d.B);CORE.toast('Muro estirado a '+fmtM(CORE.dist(d.A,d.B))+' m · los muros conectados acompañan · Ctrl+Z deshace');
},true);
document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&wallDrag){wallDrag=null;CORE.schedule()}},true);

/* =================== 3. VENTANAS GRÁFICAS (MVIEW) =================== */
const SCALES=['fit','20','25','50','75','100','125','200','250','500','1000'];
let vpCreate=false,vpDrag=null;
function pageMetrics(){const o=CORE.layout.options(),page=$('cadLayoutPage');if(!page||!page.clientWidth)return null;return {o,page,k:page.clientWidth/o.w}}
function modelViewCenter(){const c=CORE.canvas;return CORE.world(P((c.clientWidth||800)/2,(c.clientHeight||600)/2))}
function saveVp(list){CORE.layout.viewports=list;CORE.layout.render();renderVpPanel();CORE.queueLocalBackup()}
function addViewport(rect){
 const list=CORE.layout.viewports.slice(),c=modelViewCenter(),sel=S().entities.filter(e=>S().selected.includes(e.id));
 let cx=c.x,cy=c.y;if(sel.length){const b=CORE.getBounds(sel);cx=(b.minX+b.maxX)/2;cy=(b.minY+b.maxY)/2}
 list.push({id:'vp'+Date.now().toString(36),x:+rect.x.toFixed(1),y:+rect.y.toFixed(1),w:+rect.w.toFixed(1),h:+rect.h.toFixed(1),cx,cy,scale:'100',frame:true});
 saveVp(list);CORE.toast('Ventana creada a 1:100 centrada en '+(sel.length?'la selección':'la vista actual del modelo')+' · cambiá la escala en el panel VENTANAS');
}
function renderVpPanel(){
 const ws=$('cadLayoutWorkspace');if(!ws)return;let panel=$('cadVpPanel');
 if(!panel){panel=document.createElement('section');panel.id='cadVpPanel';panel.style.cssText='position:absolute;right:14px;top:14px;z-index:5;width:280px;max-height:70%;overflow:auto;background:#141c24;border:1px solid #4d6676;border-radius:10px;padding:9px;color:#e5eef7;font-size:11px;box-shadow:0 8px 24px rgba(0,0,0,.35)';ws.append(panel)}
 const list=CORE.layout.viewports;
 panel.innerHTML='<b style="letter-spacing:.05em">VENTANAS GRÁFICAS</b><p style="margin:5px 0;color:#9cb1bc">'+(list.length?'Arrastrá dentro de una ventana para moverla; desde su esquina inferior derecha, para cambiar su tamaño.':'Sin ventanas: la hoja muestra todo el dibujo ajustado. Creá una para elegir encuadre y escala.')+'</p><div style="display:flex;gap:5px;margin-bottom:6px"><button type="button" class="btn" id="cadVpNew">'+(vpCreate?'Dibujá el rectángulo…':'+ Nueva ventana')+'</button></div>';
 list.forEach((v,i)=>{
  const row=document.createElement('div');row.style.cssText='border-top:1px solid #2f4250;padding:6px 0;display:grid;gap:4px';
  row.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center"><b>Ventana '+(i+1)+'</b><button type="button" class="btn slim" data-del>✕</button></div>'+
   '<label>Escala <select data-k="scale">'+SCALES.map(s=>'<option value="'+s+'"'+(String(v.scale)===s?' selected':'')+'>'+(s==='fit'?'Ajustar todo':'1:'+s)+'</option>').join('')+'</select></label>'+
   '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:3px">'+['x','y','w','h'].map(k=>'<label>'+({x:'X',y:'Y',w:'Ancho',h:'Alto'}[k])+' mm<input type="number" step="1" data-k="'+k+'" value="'+v[k]+'" style="width:100%"></label>').join('')+'</div>'+
   '<div style="display:flex;gap:4px;flex-wrap:wrap"><button type="button" class="btn slim" data-center>Centrar en vista del modelo</button><button type="button" class="btn slim" data-sel>Centrar en selección</button><label><input type="checkbox" data-frame '+(v.frame!==false?'checked':'')+'> Marco</label></div>';
  const upd=patch=>{const l=CORE.layout.viewports.slice();l[i]={...l[i],...patch};saveVp(l)};
  row.querySelector('[data-del]').onclick=()=>{const l=CORE.layout.viewports.slice();l.splice(i,1);saveVp(l)};
  row.querySelector('[data-k="scale"]').onchange=e=>upd({scale:e.target.value});
  for(const k of ['x','y','w','h'])row.querySelector('[data-k="'+k+'"]').onchange=e=>{const n=Number(e.target.value);if(Number.isFinite(n)&&(k==='x'||k==='y'||n>3))upd({[k]:n})};
  row.querySelector('[data-center]').onclick=()=>{const c=modelViewCenter();upd({cx:c.x,cy:c.y})};
  row.querySelector('[data-sel]').onclick=()=>{const sel=S().entities.filter(e=>S().selected.includes(e.id));if(!sel.length)return CORE.toast('Seleccioná objetos en MODEL');const b=CORE.getBounds(sel);upd({cx:(b.minX+b.maxX)/2,cy:(b.minY+b.maxY)/2})};
  row.querySelector('[data-frame]').onchange=e=>upd({frame:e.target.checked});
  panel.append(row);
 });
 $('cadVpNew').onclick=()=>{vpCreate=!vpCreate;renderVpPanel();CORE.toast(vpCreate?'VENTANA: arrastrá un rectángulo sobre la hoja':'Creación cancelada')};
}
function pagePoint(ev){const m=pageMetrics();if(!m)return null;const r=m.page.getBoundingClientRect();return {m,x:(ev.clientX-r.left)/m.k,y:(ev.clientY-r.top)/m.k}}
document.addEventListener('pointerdown',ev=>{
 const page=$('cadLayoutPage');if(!page||!page.contains(ev.target)||CORE.layout.active!=='layout'||ev.button!==0)return;
 const q=pagePoint(ev);if(!q)return;ev.preventDefault();
 if(vpCreate){ev.stopPropagation();vpDrag={mode:'create',x0:q.x,y0:q.y,x:q.x,y:q.y};return}
 const list=CORE.layout.viewports;for(let i=list.length-1;i>=0;i--){const v=list[i];if(q.x>=v.x&&q.x<=v.x+v.w&&q.y>=v.y&&q.y<=v.y+v.h){const corner=q.x>v.x+v.w-6&&q.y>v.y+v.h-6;ev.stopPropagation();vpDrag={mode:corner?'resize':'move',i,x0:q.x,y0:q.y,orig:{...v}};return}}
},true);
document.addEventListener('pointermove',ev=>{
 if(!vpDrag)return;const q=pagePoint(ev);if(!q)return;
 if(vpDrag.mode==='create'){vpDrag.x=q.x;vpDrag.y=q.y;drawRubber();return}
 const l=CORE.layout.viewports.slice(),o=vpDrag.orig,dx=q.x-vpDrag.x0,dy=q.y-vpDrag.y0;
 l[vpDrag.i]=vpDrag.mode==='move'?{...o,x:+(o.x+dx).toFixed(1),y:+(o.y+dy).toFixed(1)}:{...o,w:+Math.max(10,o.w+dx).toFixed(1),h:+Math.max(10,o.h+dy).toFixed(1)};
 CORE.layout.viewports=l;CORE.layout.render();
},true);
document.addEventListener('pointerup',()=>{
 if(!vpDrag)return;const d=vpDrag;vpDrag=null;$('cadVpRubber')?.remove();
 if(d.mode==='create'){vpCreate=false;const r={x:Math.min(d.x0,d.x),y:Math.min(d.y0,d.y),w:Math.abs(d.x-d.x0),h:Math.abs(d.y-d.y0)};if(r.w>10&&r.h>10)addViewport(r);else renderVpPanel();return}
 saveVp(CORE.layout.viewports.slice());
},true);
function drawRubber(){
 const m=pageMetrics();if(!m||!vpDrag)return;let r=$('cadVpRubber');
 if(!r){r=document.createElement('div');r.id='cadVpRubber';r.style.cssText='position:absolute;border:1.5px dashed #2a8fd8;background:rgba(42,143,216,.08);pointer-events:none';m.page.style.position='relative';m.page.append(r)}
 Object.assign(r.style,{left:Math.min(vpDrag.x0,vpDrag.x)*m.k+'px',top:Math.min(vpDrag.y0,vpDrag.y)*m.k+'px',width:Math.abs(vpDrag.x-vpDrag.x0)*m.k+'px',height:Math.abs(vpDrag.y-vpDrag.y0)*m.k+'px'});
}
// El panel aparece al entrar en LAYOUT.
new MutationObserver(()=>{if(CORE.layout.active==='layout')renderVpPanel()}).observe($('cadLayoutWorkspace')||document.body,{attributes:true,attributeFilter:['hidden']});
Object.assign(EXT.commands,{
 MVIEW:()=>{CORE.layout.switchTo('layout');vpCreate=true;renderVpPanel();CORE.toast('VENTANA: arrastrá un rectángulo sobre la hoja')},
 MV:()=>EXT.commands.MVIEW(),VENTANA:()=>EXT.commands.MVIEW(),VENTANAGRAFICA:()=>EXT.commands.MVIEW(),VPORTS:()=>EXT.commands.MVIEW(),
 TIPOLINEA:()=>{const r=window.prompt('Tipo de línea para la selección: C = continua · D = discontinua · P = punteada · E = eje','P');if(r===null)return;setLinetype({C:'CONTINUOUS',D:'DASHED',P:'DOTTED',E:'CENTER'}[r.trim().toUpperCase()[0]]||'DOTTED')},
 PUNTEADA:()=>setLinetype('DOTTED'),DISCONTINUA:()=>setLinetype('DASHED')
});
window.CAD2D_ARQTOOLS=Object.freeze({icons:Object.keys(I),wallOfSelection,applyWallChange});
})();
