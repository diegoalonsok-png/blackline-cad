/* Mis bloques y estilos de cota por arrastre, como las paletas de herramientas de AutoCAD.
   · Seleccioná una cota y arrastrala (desde la cota, no desde un grip) hasta la paleta de cotas:
     se crea un estilo de cota con su altura de texto, flechas, precisión, unidades y color.
   · Seleccioná un bloque o un grupo de objetos y arrastralo a la galería o al explorador de bloques:
     queda guardado en «Mis bloques», disponible en todos tus dibujos de este navegador.
   También desde el clic derecho («Agregar a Mis bloques», «Crear estilo de cota») y con los comandos
   AGREGARBLOQUE / ADDTOMYBLOCKS y ESTILODECOTA / DIMSTYLEFROM. */
(function(){
'use strict';
const CORE=window.CAD2D_CORE,LIB=window.CAD2D_ARQ_LIBRARY;
if(!CORE||!LIB||window.CAD2D_MY_BLOCKS)return;
const KEY='cad2d-my-blocks',CAT='Mis bloques',S=()=>CORE.state,P=CORE.P;
const EXT=window.CAD2D_EXTENSIONS=window.CAD2D_EXTENSIONS||{commands:{},context:[],overlays:[],ribbon:{}};EXT.commands=EXT.commands||{};EXT.context=EXT.context||[];

/* ---------- Biblioteca persistente ---------- */
const load=()=>{try{const v=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(v)?v:[]}catch(e){return []}};
const save=list=>{try{localStorage.setItem(KEY,JSON.stringify(list));return true}catch(e){CORE.toast('No hay espacio en este navegador para guardar más bloques');return false}};
function libEntry(rec){
 return {id:rec.id,name:rec.name,cat:CAT,family:rec.id,w:rec.w,d:rec.d,wMin:rec.w*.1,wMax:rec.w*10,dMin:rec.d*.1,dMax:rec.d*10,lockAspect:true,author:'Mis bloques',mine:true,
  gen(b,W,D){
   const sx=W/rec.w,sy=D/rec.d,X=v=>v*sx,Y=v=>v*sy,r=Math.min(sx,sy),uni=Math.abs(sx-sy)<1e-6*Math.max(sx,sy);
   const arcPts=(c,R,a0,a1)=>{if(a1<=a0)a1+=360;const n=Math.max(8,Math.ceil((a1-a0)/8)),o=[];for(let i=0;i<=n;i++){const t=(a0+(a1-a0)*i/n)*Math.PI/180;o.push([X(c.x+R*Math.cos(t)),Y(c.y+R*Math.sin(t))])}return o};
   for(const e of rec.ents){
    if(e.type==='line')b.line(X(e.a.x),Y(e.a.y),X(e.b.x),Y(e.b.y));
    else if(e.type==='polyline'&&Array.isArray(e.pts))b.poly(e.pts.map(q=>[X(q.x),Y(q.y)]),!!e.closed);
    else if(e.type==='rect')b.poly([[X(e.a.x),Y(e.a.y)],[X(e.b.x),Y(e.a.y)],[X(e.b.x),Y(e.b.y)],[X(e.a.x),Y(e.b.y)]],true);
    else if(e.type==='circle'){if(uni)b.circle(X(e.c.x),Y(e.c.y),e.r*r);else b.poly(arcPts(e.c,e.r,0,360),true)}
    else if(e.type==='arc'){const a0=e.a0*180/Math.PI,a1=e.a1*180/Math.PI;if(uni)b.arc(X(e.c.x),Y(e.c.y),e.r*r,a0,a1);else b.poly(arcPts(e.c,e.r,a0,a1),false)}
    else if(e.type==='ellipse'&&e.c){const n=48,o=[];for(let i=0;i<=n;i++){const t=i/n*2*Math.PI,rot=(e.rotation||0)*Math.PI/180,x=e.rx*Math.cos(t),y=e.ry*Math.sin(t);o.push([X(e.c.x+x*Math.cos(rot)-y*Math.sin(rot)),Y(e.c.y+x*Math.sin(rot)+y*Math.cos(rot))])}b.poly(o,true)}
    else if(e.type==='text'&&e.p)b.push({type:'text',p:b.tp(X(e.p.x),Y(e.p.y)),h:(e.h||.2)*sy,rotation:e.rotation||0,text:String(e.text||''),fontFamily:e.fontFamily||'Arial'});
    else if(e.type==='hatch'&&Array.isArray(e.pts))b.push({type:'hatch',pts:e.pts.map(q=>b.tp(X(q.x),Y(q.y))),hatchStyle:e.hatchStyle||'solid'});
   }
  }};
}
function register(rec){
 if(LIB.library.some(x=>x.id===rec.id))return;
 LIB.library.push(libEntry(rec));
 if(Array.isArray(LIB.categories)&&!LIB.categories.includes(CAT))LIB.categories.push(CAT);
}
load().forEach(register);

/* ---------- Geometría de la selección, normalizada a su esquina inferior izquierda ---------- */
const KEEP=new Set(['line','polyline','rect','circle','arc','ellipse','text','hatch']);
function selectionGeometry(){
 const st=S(),sel=st.entities.filter(e=>st.selected.includes(e.id));
 const flat=[];for(const e of sel){if(e.type==='blockRef')flat.push(...CORE.blockChildren(e));else flat.push(e)}
 const ents=flat.filter(e=>KEEP.has(e.type)).map(e=>CORE.clone(e));
 if(!ents.length)return null;
 let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
 for(const e of ents){const b=CORE.boundsEntity(e);if(!b)continue;x0=Math.min(x0,b.minX);y0=Math.min(y0,b.minY);x1=Math.max(x1,b.maxX);y1=Math.max(y1,b.maxY)}
 if(!Number.isFinite(x0))return null;
 const mv=q=>q&&P(q.x-x0,q.y-y0);
 const out=ents.map(e=>{const o={type:e.type};
  for(const k of ['a','b','c','p'])if(e[k])o[k]=mv(e[k]);
  if(e.pts)o.pts=e.pts.map(mv);
  for(const k of ['r','a0','a1','rx','ry','rotation','h','closed','hatchStyle','fontFamily'])if(e[k]!==undefined)o[k]=e[k];
  if(e.type==='text')o.text=String(e.text||'').slice(0,500);
  return o});
 return {ents:out,w:Math.max(1e-6,x1-x0),d:Math.max(1e-6,y1-y0),name:sel.length===1&&sel[0].type==='blockRef'?sel[0].blockName:''};
}
/* Nombre automático y legible: Puerta01, Baño05, Arbol02… según el nombre del bloque, su capa y sus textos;
   si no hay pistas, por la forma (hoja de puerta = arco de 90° con radio ≈ ancho). */
const KINDS=[
 [/puert|door|\bpta\b|hoja/i,'Puerta'],[/ventan|window|\bvent\b|carpinter/i,'Ventana'],
 [/ba[ñn]o|inodor|\bwc\b|toilet|bidet|lavator|ba[ñn]era|ducha|bath|shower|sanit|mingit|urinal/i,'Baño'],
 [/cocin|kitchen|anafe|horno|heladera|fridge|bacha|mesada|lavaplat/i,'Cocina'],
 [/\bcama|\bbed\b|cucheta/i,'Cama'],[/mesa|table|escritorio|desk/i,'Mesa'],[/sill[aó]n|sof[aá]|couch|sofa/i,'Sillon'],[/silla|chair|banqueta|stool/i,'Silla'],
 [/[aá]rbol|tree|planta|plant|veget|arbust|palm/i,'Arbol'],[/\bauto|\bcar\b|vehic|camion|truck|moto/i,'Auto'],
 [/persona|people|person|human|hombre|mujer|figura/i,'Persona'],[/escaler|stair/i,'Escalera'],[/placard|armari|closet|ropero|mueble/i,'Mueble'],
 [/norte|north|flecha/i,'Norte'],[/r[oó]tulo|title|car[aá]tula/i,'Rotulo']];
function autoName(g){
 const st=S(),sel=st.entities.filter(e=>st.selected.includes(e.id));
 const hint=[g.name,...sel.map(e=>CORE.state.layers.find(l=>l.id===e.layer)?.name||''),...g.ents.filter(e=>e.type==='text').map(e=>e.text)].join(' ');
 let base=(KINDS.find(([re])=>re.test(hint))||[])[1];
 if(!base){const big=Math.max(g.w,g.d),arcs=g.ents.filter(e=>{if(e.type!=='arc')return false;let sw=(e.a1-e.a0)*180/Math.PI;while(sw<=0)sw+=360;return sw>70&&sw<110&&e.r>=.4*big&&g.ents.some(l=>l.type==='line'&&Math.abs(Math.hypot(l.b.x-l.a.x,l.b.y-l.a.y)-e.r)<.12*e.r)});if(arcs.length)base='Puerta'}
 base=base||'Bloque';
 const re=new RegExp('^'+base+'(\\d+)$','i');let n=0;for(const r of load()){const m=re.exec(r.name);if(m)n=Math.max(n,+m[1])}
 return base+String(n+1).padStart(2,'0');
}
function addSelectionToMyBlocks(){
 const g=selectionGeometry();
 if(!g)return CORE.toast('Seleccioná un bloque o los objetos que querés guardar en Mis bloques');
 const name=autoName(g);
 const rec={id:'mine-'+Date.now().toString(36),name,w:g.w,d:g.d,ents:g.ents};
 if(JSON.stringify(rec).length>400000)return CORE.toast('El bloque es demasiado grande para guardarlo en Mis bloques');
 const list=load();list.push(rec);if(!save(list))return;
 register(rec);window.CAD2D_ARQ_REFRESH?.();
 CORE.toast('«'+name+'» guardado en Mis bloques · clic derecho sobre el bloque en la galería para renombrarlo o borrarlo');
}
function renameMyBlock(id,name){const list=load(),r=list.find(x=>x.id===id);if(!r)return;r.name=name;save(list);const e=LIB.library.find(x=>x.id===id);if(e)e.name=name;window.CAD2D_ARQ_REFRESH?.()}
document.addEventListener?.('contextmenu',ev=>{
 const card=ev.target.closest?.('.arq-card[data-arq^="mine-"]');if(!card)return;ev.preventDefault();
 const id=card.dataset.arq,r=load().find(x=>x.id===id);if(!r)return;
 const v=window.prompt('Renombrar «'+r.name+'» (dejalo vacío para borrar el bloque):',r.name);if(v===null)return;
 const name=v.trim().slice(0,80);
 if(!name){if(window.confirm('¿Borrar «'+r.name+'» de Mis bloques?')){removeMyBlock(id);CORE.toast('Bloque borrado')}return}
 renameMyBlock(id,name);CORE.toast('Renombrado: '+name);
},true);
function removeMyBlock(id){const list=load().filter(r=>r.id!==id);save(list);const i=LIB.library.findIndex(x=>x.id===id);if(i>=0)LIB.library.splice(i,1);window.CAD2D_ARQ_REFRESH?.()}

/* ---------- Estilo de cota desde una cota del dibujo ---------- */
function dimStyleFromSelection(){
 const st=S(),d=st.entities.find(e=>st.selected.includes(e.id)&&e.type==='dimension');
 if(!d)return CORE.toast('Seleccioná una cota para crear un estilo con sus propiedades');
 const base=d.style||{};
 const style=CORE.dimStyles.validate({...base,color:base.color||d.color||''});
 if(!style)return CORE.toast('Esta cota no tiene un estilo válido');
 const name=(window.prompt('Nombre del estilo de cota:',d.dimStyleName||'Cota '+(Object.keys(st.dimStyles||{}).length+1))||'').trim().slice(0,70);
 if(!name)return;
 if(!/^[\p{L}\p{N} _.-]+$/u.test(name))return CORE.toast('El nombre tiene caracteres no permitidos');
 if(st.dimStyles[name]&&!window.confirm('Reemplazar el estilo de cota '+name+'?'))return;
 CORE.saveHistory();st.dimStyles[name]=style;st.activeDimStyle=name;
 try{const L=JSON.parse(localStorage.getItem('cad2d-my-dimstyles')||'{}')||{};L[name]=style;localStorage.setItem('cad2d-my-dimstyles',JSON.stringify(L))}catch(e){}
 CORE.dimStyles.render();CORE.dimStyles.apply(style);CORE.dimStyles.backup();
 CORE.toast('Estilo de cota «'+name+'» creado y activo · las próximas cotas lo usan');
}

/* ---------- Arrastre desde el dibujo hasta una paleta ---------- */
const dimPalette=el=>el?.closest?.('#cadDimStylePalette')||(el?.closest?.('.panel')?.querySelector?.('#dimStyleLibrary')?el.closest('.panel'):null);
const blockPalette=el=>el?.closest?.('#arqPanel,#cadBlockBrowser,#blacklineBlockGallery,#arqModal')||(el?.closest?.('.panel')?.querySelector?.('#blockLibrary')?el.closest('.panel'):null);
let drag=null,ghost=null;
function showGhost(x,y,text){
 if(!ghost){ghost=document.createElement('div');ghost.id='cadPaletteDragGhost';ghost.style.cssText='position:fixed;z-index:100005;pointer-events:none;padding:6px 10px;border-radius:8px;background:#203540;color:#fff;border:1px solid #8cc9df;font:12px Arial;box-shadow:0 6px 18px #0008';document.body.append(ghost)}
 ghost.textContent=text;ghost.style.left=(x+14)+'px';ghost.style.top=(y+14)+'px';ghost.hidden=false;
}
const hideGhost=()=>{if(ghost)ghost.hidden=true;document.querySelectorAll('.cad-drop-target').forEach(e=>e.classList.remove('cad-drop-target'))};
const css=document.createElement('style');css.textContent='.cad-drop-target{outline:2px dashed #8cc9df!important;outline-offset:-3px}';document.head.append(css);
CORE.canvas.addEventListener('pointerdown',ev=>{
 drag=null;const st=S();if(ev.button!==0||st.tool!=='select'||!st.selected.length)return;
 const e=CORE.pick(CORE.world(P(ev.offsetX,ev.offsetY)));
 if(e&&st.selected.includes(e.id))drag={x:ev.clientX,y:ev.clientY,out:false,dim:st.entities.some(x=>st.selected.includes(x.id)&&x.type==='dimension')};
});
CORE.canvas.addEventListener('pointermove',ev=>{
 if(!drag||!(ev.buttons&1))return;
 const r=CORE.canvas.getBoundingClientRect(),outside=ev.clientX<r.left||ev.clientX>r.right||ev.clientY<r.top||ev.clientY>r.bottom;
 if(!outside){if(drag.out)hideGhost();drag.out=false;return}
 drag.out=true;hideGhost();
 const el=document.elementFromPoint(ev.clientX,ev.clientY),dp=drag.dim&&dimPalette(el),bp=!dp&&blockPalette(el);
 (dp||bp)?.classList.add('cad-drop-target');
 showGhost(ev.clientX,ev.clientY,dp?'Soltá: crear estilo de cota':bp?'Soltá: guardar en Mis bloques':drag.dim?'Arrastrá a la paleta de cotas o de bloques':'Arrastrá a la galería de bloques');
});
CORE.canvas.addEventListener('pointerup',ev=>{
 const d=drag;drag=null;hideGhost();if(!d?.out)return;
 const el=document.elementFromPoint(ev.clientX,ev.clientY),dp=d.dim&&dimPalette(el),bp=!dp&&blockPalette(el);
 if(!dp&&!bp)return;
 ev.preventDefault();ev.stopImmediatePropagation();
 try{CORE.canvas.releasePointerCapture(ev.pointerId)}catch(e){}
 S().drag=null;CORE.canvas.style.cursor='';CORE.schedule();
 setTimeout(()=>dp?dimStyleFromSelection():addSelectionToMyBlocks(),0);
},true);

/* ---------- Comandos y clic derecho ---------- */
for(const k of ['ADDTOMYBLOCKS','AGREGARBLOQUE','MISBLOQUES+','GUARDARBLOQUE'])EXT.commands[k]=()=>addSelectionToMyBlocks();
for(const k of ['DIMSTYLEFROM','ESTILODECOTA','ESTILOCOTA+'])EXT.commands[k]=()=>dimStyleFromSelection();
EXT.context.push(({item,active,count})=>{
 if(active||!count)return [];
 const st=S(),out=[item('Agregar a Mis bloques · AGREGARBLOQUE',()=>addSelectionToMyBlocks())];
 if(st.entities.some(e=>st.selected.includes(e.id)&&e.type==='dimension'))out.push(item('Crear estilo de cota con esta cota · ESTILODECOTA',()=>dimStyleFromSelection()));
 return out;
});
window.CAD2D_MY_BLOCKS=Object.freeze({add:addSelectionToMyBlocks,remove:removeMyBlock,list:load,dimStyleFromSelection});
})();
