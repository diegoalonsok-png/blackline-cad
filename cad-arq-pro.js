/* CAD2D · ARQ PRO (Nov 2026)
 * - Galería arquitectónica grande: baños y cocinas completos + bloques sueltos paramétricos.
 * - Bloques dinámicos 2D con pinzamientos: estirar ancho ▶ / profundidad ▲ con regeneración
 *   inteligente (los artefactos se reubican, no se deforman) y pinzamiento de variantes ▼.
 * - Menú contextual ampliado y comandos estilo CAD: AISLAR/OCULTAR, ORDEN DE DIBUJO, GRUPO,
 *   CONTARBLOQUES, DIVIDIR, GRADUAR, NUBEREV, LINEACONST, SEMIRRECTA, LOCAL (etiqueta de superficie).
 * Implementación propia. No usa código, iconos ni bloques de terceros.
 * Depende del puente window.CAD2D_CORE expuesto por index.html.
 */
(function(){
'use strict';
const LIB=window.CAD2D_ARQ_LIBRARY,CORE=window.CAD2D_CORE,EXT=window.CAD2D_EXTENSIONS;
if(!LIB||!CORE||!EXT){console.warn('[CAD2D ARQ] puente del núcleo no disponible');return}
const $=id=>document.getElementById(id);
const P=(x,y)=>({x,y});
const S=()=>CORE.state;
const f=()=>1000/CORE.U[S().unit]; // metros → unidades del modelo
const cm=m=>Math.round(m*100);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const byId=id=>LIB.library.find(x=>x.id===id);
const plan=()=>window.CAD2D_PLAN;
// Blackline Select is intentionally stricter than the general 90-day trial:
// its use requires a paid plan confirmed by the billing server.
const verifiedPaid=()=>{
 const p=plan(),status=p?.status;
 return Boolean(p?.enforced&&status?.source==='server'&&['pro','studio'].includes(status.plan));
};
const allowed=item=>item.paidOnly?verifiedPaid():!item.pro||!plan()||plan().can('arq-pro');

/* ---------- Capas arquitectónicas ---------- */
const LAYERS={
 'Baños completos':['A-SANITARIOS','#7fc8ff'],'Sanitarios':['A-SANITARIOS','#7fc8ff'],
 'Cocinas completas':['A-EQUIPAMIENTO','#ffd27f'],'Cocina · equipos':['A-EQUIPAMIENTO','#ffd27f'],
 'Mobiliario':['A-MOBILIARIO','#c7a4ff'],'Dormitorio':['A-MOBILIARIO','#c7a4ff'],
 'Escaleras':['A-ESCALERAS','#e6e6e6'],'Exterior':['A-VEGETACION','#8fd18f'],
 'Vehículos':['A-VEHICULOS','#b7c0c7'],'Equipos':['A-INSTALACIONES','#ff9f7f'],
 'Alzados':['A-ALZADOS','#9fd6e6'],'Personas':['A-PERSONAS','#d9c6a5'],'Oficina':['A-MOBILIARIO','#c7a4ff'],'Símbolos':['A-SIMBOLOS','#f2f2f2'],'Obra y maquinaria':['A-OBRA','#f0b35a'],'Cortes y vistas':['A-CORTES','#c9d6e8'],'Documentación':['A-DOC','#e8d38a']
};
// Folder/category names are organizational only. Library blocks have no
// architectural layer assignment: they are defined on layer 0 in white.
function ensureLayer(){
 const st=S();let layer=st.layers.find(l=>l.id==='0'||l.name==='0');
 if(!layer){
  layer={id:'0',name:'0',color:'#ffffff',visible:true,locked:false,width:.13};
  st.layers.unshift(layer);
 }
 return layer;
}

/* ---------- Definiciones de bloque generadas ---------- */
function defName(item,W,D){return 'ARQ · '+item.name+' · '+cm(W)+'×'+cm(D)}
function ensureDefinition(item,W,D,defer=false){
 const built=LIB.build(item.id,W,D),k=f(),st=S();
 const oldName=defName(item,built.w,built.d);
 // Preserve old colored definitions used by existing drawings. New insertions
 // receive a separate white/0 definition instead of silently mutating history.
 const name=st.blocks[oldName]&&!st.blocks[oldName].libraryLayer0?oldName+' · Layer 0':oldName;
 if(!st.blocks[name]){
  const ents=built.entities.map(e=>scaleEntity(e,k));
  for(const e of ents){e.layer='0';e.color='#ffffff';if(e.width===undefined)e.width=e.type==='text'?.09:.13}
  const def=CORE.cadPrepareDynamicBlock({name,entities:CORE.normalizeBlockEntities(ents)});
  // La familia ARQ regenera geometría en lugar de deformarla: el estiramiento genérico se desactiva.
  def.dynamic2d=false;def.dynamicActions=true;def.pro=Boolean(item.pro);def.paidOnly=Boolean(item.paidOnly);def.libraryLayer0=true;
  const bb=LIB.bounds(built.entities);
  def.arq={id:item.id,w:built.w,d:built.d,unit:st.unit,ext:bb?{x0:bb.minX,y0:bb.minY,x1:bb.maxX,y1:bb.maxY}:null};
  st.blocks[name]=def;if(!defer){CORE.renderBlockLibrary();CORE.queueLocalBackup()}
 }
 return name;
}
function scaleEntity(e,k){
 const o=JSON.parse(JSON.stringify(e));
 for(const key of ['a','b','c','p'])if(o[key])o[key]={x:o[key].x*k,y:o[key].y*k};
 if(o.pts)o.pts=o.pts.map(p=>({x:p.x*k,y:p.y*k}));
 if(o.r)o.r*=k;if(o.rx)o.rx*=k;if(o.ry)o.ry*=k;if(o.h)o.h*=k;
 return o;
}
const arqOf=ref=>ref&&ref.type==='blockRef'?S().blocks[ref.blockName]?.arq:null;

/* ---------- Inserción ---------- */
let pendingInsert=null,lastItem=null,dkInsertIntent=0;
const dkNeeds=item=>item?.remoteDK&&!window.CAD2D_DK_DEMAND.isReady(item.id);
async function dkPrepare(item){if(dkNeeds(item))await window.CAD2D_DK_DEMAND.prepare(item.id)}
function armInsert(item,W,D,isCurrent){
 const intent=++dkInsertIntent;
 // Full DXF plans already contain their original geometry; never prefetch the JSON copy.
 if(item.dxfPlan&&window.cadInsertDxfPlan&&allowed(item))return window.cadInsertDxfPlan(item.dxfPlan,item.name,{isCurrent:()=>intent===dkInsertIntent&&(!isCurrent||isCurrent())});
 if(dkNeeds(item)&&allowed(item)){
  const st=S(),entities=st.entities,blocks=st.blocks,tool=st.tool;
  CORE.toast('Descargando '+item.name+'…');
  return dkPrepare(item).then(()=>{
   if(intent!==dkInsertIntent||S().entities!==entities||S().blocks!==blocks||S().tool!==tool||(isCurrent&&!isCurrent()))return false;
   return armInsertReady(item,W,D);
  }).catch(e=>{CORE.toast(e.message);return false});
 }
 return armInsertReady(item,W,D);
}
function armInsertReady(item,W,D){
 if(!allowed(item)){
  if(plan()?.upsell)plan().upsell(item.paidOnly?'Blackline Select requiere membresía PRO o Estudio confirmada':'Bloque Pro: '+item.name);
  else CORE.toast('Requiere membresía PRO o Estudio');
  return false;
 }
 if(item.dxfPlan&&window.cadInsertDxfPlan)return window.cadInsertDxfPlan(item.dxfPlan,item.name);
 const name=ensureDefinition(item,W??item.w,D??item.d),st=S();
 const layer=ensureLayer(item.cat);
 if(!pendingInsert)pendingInsert={prevLayer:st.layerId};
 st.layerId=layer.id;lastItem=item;
 window.BlacklineBlockAPI.selectBlock(name);
 CORE.toast('ARQ · '+item.name+' listo · clic en el plano para insertar · Esc cancela');
 syncSizeRow(item,st.blocks[name].arq);
 return true;
}
function finishPendingInsert(){
 if(!pendingInsert)return;
 const st=S();if(st.tool==='insertBlock')return;
 if(st.layers.some(l=>l.id===pendingInsert.prevLayer))st.layerId=pendingInsert.prevLayer;
 pendingInsert=null;CORE.updateAll();
}

/* ---------- Miniaturas SVG con la misma geometría que se inserta ---------- */
const NS='http://www.w3.org/2000/svg';
function svgFor(item,W,D,{height=96,pad=.08}={}){
 const {entities}=LIB.build(item.id,W??item.w,D??item.d),b=LIB.bounds(entities);
 const w=Math.max(.01,b.maxX-b.minX),h=Math.max(.01,b.maxY-b.minY),p=Math.max(w,h)*pad;
 const sw=Math.max(w,h)/160;
 let body='';
 const pt=q=>q.x.toFixed(4)+','+(-q.y).toFixed(4);
 for(const e of entities){
  const dash=e.linetype==='DASHED'?` stroke-dasharray="${(sw*4).toFixed(4)} ${(sw*3).toFixed(4)}"`:'';
  const thick=e.width&&e.width>.15?` stroke-width="${(sw*2.2).toFixed(4)}"`:'';
  const a=dash+thick;
  if(e.type==='line')body+=`<line x1="${e.a.x}" y1="${-e.a.y}" x2="${e.b.x}" y2="${-e.b.y}"${a}/>`;
  else if(e.type==='rect')body+=`<rect x="${Math.min(e.a.x,e.b.x)}" y="${-Math.max(e.a.y,e.b.y)}" width="${Math.abs(e.b.x-e.a.x)}" height="${Math.abs(e.b.y-e.a.y)}"${a}/>`;
  else if(e.type==='polyline')body+=`<${e.closed?'polygon':'polyline'} points="${e.pts.map(pt).join(' ')}"${a}/>`;
  else if(e.type==='circle')body+=`<circle cx="${e.c.x}" cy="${-e.c.y}" r="${e.r}"${a}/>`;
  else if(e.type==='ellipse')body+=`<ellipse cx="${e.c.x}" cy="${-e.c.y}" rx="${e.rx}" ry="${e.ry}" transform="rotate(${(-(e.rotation||0)*180/Math.PI).toFixed(3)} ${e.c.x} ${-e.c.y})"${a}/>`;
  else if(e.type==='arc'){
   let sweep=e.a1-e.a0;while(sweep<=0)sweep+=Math.PI*2;
   const s0=P(e.c.x+e.r*Math.cos(e.a0),e.c.y+e.r*Math.sin(e.a0)),s1=P(e.c.x+e.r*Math.cos(e.a1),e.c.y+e.r*Math.sin(e.a1));
   body+=`<path d="M${pt(s0)} A${e.r} ${e.r} 0 ${sweep>Math.PI?1:0} 0 ${pt(s1)}"${a}/>`;
  }else if(e.type==='hatch'&&e.pts?.length>2)body+=`<polygon points="${e.pts.map(pt).join(' ')}" fill="currentColor" stroke="none"/>`;
  else if(e.type==='text')body+=`<text x="${e.p.x}" y="${-e.p.y}" font-size="${e.h}" fill="currentColor" fill-opacity=".75" stroke="none" font-family="Arial" transform="rotate(${-(e.rotation||0)} ${e.p.x} ${-e.p.y})">${esc(e.text)}</text>`;
 }
 return `<svg xmlns="${NS}" viewBox="${(b.minX-p).toFixed(4)} ${(-b.maxY-p).toFixed(4)} ${(w+2*p).toFixed(4)} ${(h+2*p).toFixed(4)}" style="display:block;width:100%;height:${height}px" role="img" aria-label="Planta de ${esc(item.name)}"><g fill="none" stroke="currentColor" stroke-width="${sw.toFixed(4)}" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke">${body}</g></svg>`;
}
const thumbCache=new Map();let thumbCacheChars=0;
const dkStaticPreviewIds=new Set(["dk-teclado","dk-mouse","dk-arbol-radial","dk-puerta-bano-70","dk-bacha-doble","dk-auto-planta","dk-anafe-4","dk-arbusto-arbol","dk-living","dk-cama-1p","dk-inodoro-a","dk-bidet-oval","dk-cama-2p","dk-ventana-135","dk-ventana-217","dk-ventana-287","dk-pano-245","dk-ventana-100","dk-ventana-086","dk-heladera","dk-puerta-140","dk-puerta-pano","dk-mesa-redonda-chica","dk-puerta-135","dk-bacha-circular","dk-modulor-silueta","dk-arbol-vista","dk-arbol-invierno","dk-arbol-hojas","dk-arbol-organico","dk-dos-arboles","dk-ventana-bano","dk-ventana-2x2-vista","dk-ventana-bano-vista","dk-arbol-follaje","dk-arbol-ramas","dk-mesa-redonda-6","dk-mesa-8","dk-puerta-098","dk-corrediza-3m","dk-puerta-solia","dk-planta-alta","dk-inodoro-sup","dk-lavatorio","dk-bano-chico","dk-mesa-6","dk-puerta-060","dk-bacha-apoyo","dk-banera-160","dk-inodoro-mochila","dk-bidet","dk-bano-armado","dk-puerta-070","dk-bano-local","dk-planta-baja","dk-toilette-damero"]);
function thumb(item,height){
 // Static previews do not build or transform CAD geometry in the gallery.
 if(dkStaticPreviewIds.has(item.id)){
  const h=Math.max(40,Math.min(400,Number(height)||96));
  return '<img alt="" loading="lazy" decoding="async" style="display:block;width:100%;height:'+h+'px;object-fit:contain" src="assets/blackline-dk-demand-v1/'+encodeURIComponent(item.id)+'.svg">';
 }
 const key=item.id+'|'+height;
 if(thumbCache.has(key)){const hit=thumbCache.get(key);thumbCache.delete(key);thumbCache.set(key,hit);return hit}
 const svg=svgFor(item,null,null,{height});
 if(svg.length<=2000000){thumbCache.set(key,svg);thumbCacheChars+=svg.length;while(thumbCache.size>240||thumbCacheChars>8000000){const first=thumbCache.keys().next().value;thumbCacheChars-=thumbCache.get(first).length;thumbCache.delete(first)}}
 return svg;
}
const sizeLabel=item=>cm(item.w)+'×'+cm(item.d)+' cm';
const isDynamic=item=>item.wMax>item.wMin||item.dMax>item.dMin;
const familyOf=item=>LIB.library.filter(x=>x.family===item.family&&!x.hideFromGallery&&!/^views26-/.test(x.id));

/* ---------- Estilos del módulo (mismo lenguaje visual del CAD) ---------- */
const css=document.createElement('style');
css.textContent=`
#arqPanel .arq-chips{display:flex;gap:4px;flex-wrap:wrap;margin:6px 0}
#arqPanel .arq-chips button,#arqModal .arq-chips button{font-size:10px;padding:3px 7px;border-radius:10px}
#arqPanel .arq-chips button[aria-pressed=true],#arqModal .arq-chips button[aria-pressed=true]{background:#385263;border-color:#91bfd5}
#arqModal .arq-chips .bls-premium-tab{border-color:#ad843d;color:#f2d38f;font-weight:700}
#arqModal .arq-chips .bls-premium-tab[aria-pressed=true]{background:#3a3122;border-color:#e2b65d;color:#fff1cf}
#arqPanel .arq-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;max-height:340px;overflow-y:auto}
.arq-card{color:#dce9f2;position:relative;padding:4px!important;min-width:0;white-space:normal!important;text-align:left;display:flex!important;flex-direction:column;gap:2px;height:auto!important}
.arq-card .arq-name{font-size:10px;line-height:1.25;color:#e5eef7}
.arq-card .arq-meta{font-size:9px;color:#9cdeed}
.arq-card .arq-pro{position:absolute;top:4px;right:4px;font-size:8px;font-weight:700;padding:1px 5px;border-radius:6px;background:#c79a3a;color:#111}
.arq-card[aria-pressed=true]{outline:2px solid #91bfd5}
#arqPanel input[type=search],#arqModal input[type=search]{width:100%;box-sizing:border-box}
#arqSizeRow{display:grid;grid-template-columns:1fr 1fr auto;gap:5px;align-items:end;margin-top:7px;font-size:10px}
#arqSizeRow input{width:100%;box-sizing:border-box}
#arqSizeRow[hidden]{display:none}
#arqPanelCat{width:100%;margin:6px 0}
#arqModal{position:fixed;inset:0;z-index:9000;background:transparent;display:block;pointer-events:none}
#arqModal[hidden]{display:none}
#arqModal .arq-box{position:absolute;left:3vw;top:5vh;pointer-events:auto;overflow:visible;min-width:320px;min-height:260px;max-width:98vw;max-height:96vh;width:min(1180px,94vw);height:min(820px,90vh);display:flex;flex-direction:column;background:#141c24;border:1px solid #4d6676;border-radius:12px;box-shadow:0 18px 60px rgba(0,0,0,.5);color:#e5eef7}
#arqModal header{cursor:move;user-select:none;display:flex;gap:10px;align-items:center;padding:12px 14px;border-bottom:1px solid #2f4250}
#arqModal header h2{font-size:14px;margin:0;letter-spacing:.06em;flex:1}
#arqModal .arq-tools{padding:10px 14px;display:grid;gap:6px}
#arqModal .arq-box{position:absolute}
#arqModal .arq-grip{position:absolute;z-index:3;background:transparent}
#arqModal .arq-grip.e{top:12px;right:-4px;width:10px;bottom:12px;cursor:ew-resize}#arqModal .arq-grip.w{top:12px;left:-4px;width:10px;bottom:12px;cursor:ew-resize}
#arqModal .arq-grip.s{left:12px;right:12px;bottom:-4px;height:10px;cursor:ns-resize}#arqModal .arq-grip.n{left:12px;right:12px;top:-4px;height:8px;cursor:ns-resize}
#arqModal .arq-grip.se,#arqModal .arq-grip.sw,#arqModal .arq-grip.ne,#arqModal .arq-grip.nw{width:18px;height:18px;background:transparent;border:0}
#arqModal .arq-grip.se{right:-7px;bottom:-7px;cursor:nwse-resize}#arqModal .arq-grip.sw{left:-7px;bottom:-7px;cursor:nesw-resize}#arqModal .arq-grip.ne{right:-7px;top:-7px;cursor:nesw-resize}#arqModal .arq-grip.nw{left:-7px;top:-7px;cursor:nwse-resize}
#arqModal .arq-grip.e:hover,#arqModal .arq-grip.w:hover,#arqModal .arq-grip.s:hover,#arqModal .arq-grip.n:hover{background:linear-gradient(currentColor,currentColor) center/2px 60% no-repeat;color:#9adff3aa}#arqModal .arq-grip.s:hover,#arqModal .arq-grip.n:hover{background-size:60% 2px}
#arqModal .arq-box{border-radius:16px}#arqModal .arq-box header{border-radius:16px 16px 0 0}#arqModal .arq-box:hover{border-color:#6f93a6}
#arqModal .arq-sizes{display:flex;gap:4px}#arqModal .arq-sizes .btn{padding:3px 8px;font-size:11px}
#arqModal .arq-box.compact .arq-grid{grid-template-columns:repeat(auto-fill,minmax(110px,1fr))}#arqModal .arq-box.compact .arq-tools{padding-bottom:4px}#arqModal .arq-box.compact header{flex-wrap:wrap;gap:6px}#arqModal .arq-box.compact header h2{font-size:12px;flex:1 1 100%;margin:0}
#arqModal .arq-grid{flex:1;overflow:auto;padding:0 14px 14px;display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px;align-content:start}
#arqModal .arq-card .arq-name{font-size:11px}
#arqVariantMenu{position:fixed;z-index:9100;background:#141c24;border:1px solid #4d6676;border-radius:8px;padding:6px;max-height:60vh;overflow:auto;display:grid;gap:3px;min-width:230px;box-shadow:0 10px 30px rgba(0,0,0,.45)}
#arqVariantMenu button{text-align:left;font-size:11px}
#arqVariantMenu .arq-vt{font-size:10px;color:#9cb1bc;padding:2px 4px}
#arqDialog{position:fixed;inset:0;z-index:9200;background:rgba(5,9,13,.6);display:flex;align-items:center;justify-content:center}
#arqDialog .arq-dlg{background:#141c24;border:1px solid #4d6676;border-radius:10px;padding:14px;min-width:300px;max-width:560px;color:#e5eef7;font-size:12px}
#arqDialog table{border-collapse:collapse;width:100%;margin:8px 0}#arqDialog td,#arqDialog th{border-bottom:1px solid #2f4250;padding:4px 6px;text-align:left}
`;
document.head.append(css);

/* ---------- Paleta acoplada ---------- */
let activeCat='Baños completos',query='';
function cardsFor(cat,q){
 const s=q.trim().toLowerCase();
 return LIB.library.filter(x=>!x.hideFromGallery&&(s?(x.name+' '+x.cat).toLowerCase().includes(s):(cat==='Todos'||x.cat===cat)));
}
// Etiquetas genéricas en la paleta, sin cambiar el nombre CAD ni su geometría.
let arqNames=new Map(),arqNamesLength=-1;
function arqSimpleName(item){
 if(arqNamesLength===LIB.library.length)return arqNames.get(item.id)||item.name;
 const patterns=[['Puerta',/\b(?:puerta|door|porton|portón)\b/i],['Ventana',/\b(?:ventana|ventanal|window)\b/i],['Escalera',/\b(?:escalera|stair)\b/i],['Inodoro',/\b(?:inodoro|toilet|wc)\b/i],['Bañadera',/\b(?:bañadera|bañera|bathtub)\b/i],['Auto',/\b(?:auto|automóvil|coche|car)\b/i],['Camión',/\b(?:camión|camion|truck)\b/i],['Árbol',/\b(?:árbol|arbol|tree)\b/i],['Heladera',/\b(?:heladera|refrigerador|fridge)\b/i],['Cocina',/\b(?:cocina|kitchen)\b/i]];
 const counters=new Map();arqNames=new Map();
 for(const x of LIB.library.slice().sort((a,b)=>String(a.id).localeCompare(String(b.id)))){const type=patterns.find(p=>p[1].test(String(x.name||'')))?.[0];if(!type)continue;const n=(counters.get(type)||0)+1;counters.set(type,n);arqNames.set(x.id,type+' '+n)}
 arqNamesLength=LIB.library.length;return arqNames.get(item.id)||item.name;
}
function makeCard(item,height){
 const b=document.createElement('button');b.type='button';b.className='btn arq-card';b.dataset.arq=item.id;
 b.title=arqSimpleName(item)+' · '+sizeLabel(item)+(isDynamic(item)?' · dinámico: '+cm(item.wMin)+'–'+cm(item.wMax)+' × '+cm(item.dMin)+'–'+cm(item.dMax)+' cm':'')+' · clic para insertar';
 b.innerHTML=thumb(item,height)+`<span class="arq-name">${esc(arqSimpleName(item))}</span><span class="arq-meta">${sizeLabel(item)}${isDynamic(item)?' · ↔ dinámico':''}</span>`+(item.pro?'<span class="arq-pro">PRO</span>':'');
 b.onclick=async()=>{if(await armInsert(item)===false)return;for(const c of document.querySelectorAll('.arq-card'))c.setAttribute('aria-pressed',String(c.dataset.arq===item.id));closeModal()};
 return b;
}
function chips(container,onPick){
 container.replaceChildren();
 const categories=['Todos',...LIB.categories.filter(c=>LIB.library.some(x=>x.cat===c&&!x.hideFromGallery))];
 for(const cat of categories){
  const b=document.createElement('button');b.type='button';b.className='btn slim';
  if(cat==='Blackline Select'){b.classList.add('bls-premium-tab');b.textContent='BLACKLINE SELECT · PRO'}
  else b.textContent=cat;
  b.setAttribute('aria-pressed',String(cat===activeCat));
  b.onclick=()=>{activeCat=cat;onPick()};container.append(b);
 }
}
window.CAD2D_ARQ_REFRESH=()=>{arqNamesLength=-1;const s=$('arqPanelCat');if(s)s.innerHTML='';renderPanel()};
function fillPanelGrid(items){
 const grid=$('arqPanelGrid');if(!grid)return;
 const cap=48;
 grid.replaceChildren(...items.slice(0,cap).map(x=>makeCard(x,74)));
 if(items.length>cap){
  const more=document.createElement('button');more.type='button';more.className='btn slim';
  more.style.gridColumn='1 / -1';more.textContent='Ver '+(items.length-cap)+' bloques más en el explorador';
  more.onclick=()=>window.CAD2D_BLOCK_BROWSER?.open?.();
  grid.appendChild(more);
 }
}
function renderPanel(){
 const grid=$('arqPanelGrid');if(!grid||$('arqPanelBody')?.hidden)return;
 const sel=$('arqPanelCat');
 if(!sel.options.length){for(const cat of ['Todos',...LIB.categories.filter(c=>LIB.library.some(x=>x.cat===c&&!x.hideFromGallery))]){const o=document.createElement('option');o.value=cat;o.textContent=cat+' ('+(cat==='Todos'?LIB.library.filter(x=>!x.hideFromGallery).length:LIB.library.filter(x=>x.cat===cat&&!x.hideFromGallery).length)+')';sel.append(o)}sel.onchange=()=>{activeCat=sel.value;query='';$('arqPanelSearch').value='';renderPanel()}}
 sel.value=activeCat;
 fillPanelGrid(cardsFor(activeCat,query));
}
function buildPanel(){
 if($('arqPanel'))return;
 // Se ubica junto a la paleta de bloques existente (visible por defecto); si no existe, en el primer dock.
 const neighbour=$('blacklineBlockGallery');
 const dock=neighbour?.parentElement||document.querySelector('.workspace>.sidebar.rightside')||document.querySelector('.sidebar');
 if(!dock)return;
 const panel=document.createElement('section');panel.className='panel';panel.id='arqPanel';
 panel.innerHTML=`<div class="panel-title"><span>GALERÍA ARQ · BAÑOS · COCINAS · BLOQUES</span><button type="button" id="arqCollapse" class="btn slim" title="Contraer / expandir" aria-label="Contraer galería arquitectónica">−</button></div>
 <div id="arqPanelBody" class="panel-content" style="padding:8px">
  <div style="display:flex;gap:5px"><input type="search" id="arqPanelSearch" placeholder="Buscar: baño, isla, bañera, escalera…" aria-label="Buscar bloque arquitectónico"><button type="button" class="btn slim" id="arqOpenBig" title="Galería grande (GALERIA)">⤢</button></div>
  <button type="button" class="btn slim" id="arqOpenVisual" title="Galería visual en fondo crema · clic en imagen y luego en plano" style="display:block;width:100%;margin:7px 0 4px;text-align:center;background:#e6d3a9;color:#3d352b;border:1px solid #bca175;font-weight:600">▦ Galería visual · bloques 2D</button>
  <div id="arqDrawingBlocksSlot"><button type="button" class="btn slim" id="arqDrawingBlocksFallback" style="display:block;width:100%;margin:3px 0 6px;text-align:center;font-weight:600">▦ BLOQUES DEL PLANO</button></div>
  <select id="arqPanelCat" aria-label="Categoría de bloques"></select>
  <div class="arq-grid" id="arqPanelGrid"></div>
  <div id="arqSizeRow" hidden><label>Ancho cm<input type="number" id="arqW" step="5"></label><label>Prof. cm<input type="number" id="arqD" step="5"></label><button type="button" class="btn" id="arqApplySize">Aplicar</button></div>
  <p id="arqHelp" style="font-size:10px;color:#9cb1bc;margin:7px 0 0">Clic en una miniatura y luego en el plano. Al seleccionar el bloque insertado: ▶ ancho, ▲ profundidad, ▼ variantes. Los artefactos se reubican, no se deforman.</p>
 </div>`;
 if(neighbour)neighbour.before(panel);else dock.prepend(panel);
 // Mount the actual document-block controls inside this palette, not in a different dock.
 const blockSlot=$('arqDrawingBlocksSlot');
 function mountDrawingBlocks(){
  if(typeof window.CAD2D_MOUNT_DOCUMENT_BLOCKS==='function')window.CAD2D_MOUNT_DOCUMENT_BLOCKS(blockSlot);
  else{const section=$('cadDocumentBlocks');if(section){blockSlot.replaceChildren(section);}}
 }
 mountDrawingBlocks();
 $('arqDrawingBlocksFallback')?.addEventListener('click',()=>{mountDrawingBlocks();const toggle=$('cadDocBlockToggle');if(toggle)toggle.click();else CORE.toast('Recargá CAD2D3D para activar los bloques del plano')});
 $('arqCollapse').onclick=()=>{const body=$('arqPanelBody');body.hidden=!body.hidden;$('arqCollapse').textContent=body.hidden?'+':'−';if(!body.hidden)renderPanel()};
 $('arqPanelSearch').oninput=e=>{query=e.target.value;fillPanelGrid(cardsFor(activeCat,query))};
 $('arqOpenBig').onclick=()=>openModal();
 $('arqOpenVisual').onclick=()=>{const browser=window.CAD2D_BLOCK_BROWSER;
  if(browser?.openVisual)return browser.openVisual();
  CORE.toast('La galería visual todavía no está disponible');
 };
 $('arqApplySize').onclick=applySizeRow;
 for(const id of ['arqW','arqD'])$(id).addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();applySizeRow()}});
 renderPanel();
}
function syncSizeRow(item,arq){
 const row=$('arqSizeRow');if(!row)return;
 row.hidden=!isDynamic(item);if(row.hidden)return;
 $('arqW').value=cm(arq?.w??item.w);$('arqD').value=cm(arq?.d??item.d);
 $('arqW').min=cm(item.wMin);$('arqW').max=cm(item.wMax);$('arqD').min=cm(item.dMin);$('arqD').max=cm(item.dMax);
 $('arqD').disabled=item.lockAspect||item.dMin===item.dMax;
 row.dataset.item=item.id;
}
function applySizeRow(){
 const item=byId($('arqSizeRow').dataset.item);if(!item)return;
 const W=Number($('arqW').value)/100,D=Number($('arqD').value)/100;
 const ref=selectedArqRef();
 if(ref&&arqOf(ref).id===item.id)return resizeRef(ref,W,D);
 armInsert(item,W,D);
}

/* ---------- Galería grande (modal) ---------- */
function buildModal(){
 if($('arqModal'))return;
 const m=document.createElement('div');m.id='arqModal';m.hidden=true;m.setAttribute('role','dialog');m.setAttribute('aria-modal','false');m.setAttribute('aria-label','Galería arquitectónica (ventana flotante)');
 m.innerHTML=`<div class="arq-box"><header><h2>GALERÍA ARQUITECTÓNICA · ${LIB.library.filter(x=>!x.hideFromGallery).length} BLOQUES DINÁMICOS</h2><span id="arqModalCount" style="font-size:11px;color:#9cb1bc"></span><span class="arq-sizes" role="group" aria-label="Tamaño de la ventana"><button type="button" class="btn" data-size="s" title="Ventana chica al costado: el dibujo queda libre para arrastrar">▯ Chica</button><button type="button" class="btn" data-size="m" title="Mitad de pantalla">◧ Media</button><button type="button" class="btn" data-size="l" title="Grande">▣ Grande</button></span><button type="button" class="btn" id="arqModalClose" aria-label="Cerrar">✕</button></header>
 <div class="arq-tools"><input type="search" id="arqModalSearch" placeholder="Buscar en toda la galería…" aria-label="Buscar en la galería"><div class="arq-chips" id="arqModalChips" role="group" aria-label="Categorías"></div></div>
 <div class="arq-grid" id="arqModalGrid"></div></div>`;
 document.body.append(m);
 // Ventana flotante: se mueve desde el título y se agranda/achica desde la esquina; recuerda posición y tamaño.
 const box=m.querySelector('.arq-box'),KEY='cad2d-gallery-window';
 try{const g=JSON.parse(localStorage.getItem(KEY)||'null');if(g){box.style.left=g.l+'px';box.style.top=g.t+'px';box.style.width=g.w+'px';box.style.height=g.h+'px'}}catch(e){}
 const save=()=>{try{const r=box.getBoundingClientRect();localStorage.setItem(KEY,JSON.stringify({l:Math.round(r.left),t:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height)}))}catch(e){}};
 new ResizeObserver(()=>{if(!m.hidden)save()}).observe(box);
 const hd=box.querySelector('header');let mv=null;
 hd.addEventListener('pointerdown',e=>{if(e.target.closest('button,input'))return;const r=box.getBoundingClientRect();mv={dx:e.clientX-r.left,dy:e.clientY-r.top};hd.setPointerCapture(e.pointerId)});
 hd.addEventListener('pointermove',e=>{if(!mv)return;const x=Math.min(innerWidth-80,Math.max(-box.offsetWidth+120,e.clientX-mv.dx)),y=Math.min(innerHeight-40,Math.max(0,e.clientY-mv.dy));box.style.left=x+'px';box.style.top=y+'px'});
 hd.addEventListener('pointerup',()=>{if(mv){mv=null;save()}});
 // Pinzamientos visibles en bordes y esquinas.
 for(const d of ['n','s','e','w','ne','nw','se','sw']){const g=document.createElement('div');g.className='arq-grip '+d;g.dataset.d=d;g.title='Arrastrá para cambiar el tamaño';box.append(g)}
 box.style.resize='none';let rz=null;
 box.addEventListener('pointerdown',e=>{const g=e.target.closest('.arq-grip');if(!g)return;e.preventDefault();const r=box.getBoundingClientRect();rz={d:g.dataset.d,x:e.clientX,y:e.clientY,r};g.setPointerCapture(e.pointerId)});
 box.addEventListener('pointermove',e=>{if(!rz)return;const {d,x,y,r}=rz,dx=e.clientX-x,dy=e.clientY-y,MW=320,MH=240;let L=r.left,T=r.top,W=r.width,H=r.height;
  if(d.includes('e'))W=Math.max(MW,r.width+dx);if(d.includes('s'))H=Math.max(MH,r.height+dy);
  if(d.includes('w')){W=Math.max(MW,r.width-dx);L=r.right-W}if(d.includes('n')){H=Math.max(MH,r.height-dy);T=Math.max(0,r.bottom-H)}
  Object.assign(box.style,{left:L+'px',top:T+'px',width:W+'px',height:H+'px'});box.classList.toggle('compact',W<700)});
 box.addEventListener('pointerup',()=>{if(rz){rz=null;save()}});
 const sizeTo=k=>{const W=innerWidth,H=innerHeight;const g=k==='s'?{l:W-400,t:90,w:380,h:H-150}:k==='m'?{l:W/2,t:70,w:W/2-20,h:H-120}:{l:W*.03,t:H*.05,w:Math.min(1180,W*.94),h:Math.min(820,H*.9)};
  Object.assign(box.style,{left:g.l+'px',top:g.t+'px',width:g.w+'px',height:g.h+'px'});box.classList.toggle('compact',g.w<700);save()};
 box.querySelector('.arq-sizes').addEventListener('click',e=>{const b=e.target.closest('[data-size]');if(b)sizeTo(b.dataset.size)});
 if(parseFloat(box.style.width)<700)box.classList.add('compact');
 hd.addEventListener('dblclick',e=>{if(e.target.closest('button,input'))return;box.style.left='3vw';box.style.top='5vh';box.style.width='';box.style.height='';save()});
 $('arqModalClose').onclick=closeModal;
 $('arqModalSearch').oninput=e=>{query=e.target.value;renderModal()};
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!m.hidden){e.stopPropagation();closeModal()}},true);
}
function renderModal(){
 chips($('arqModalChips'),()=>{query='';$('arqModalSearch').value='';renderModal()});
 const list=cardsFor(activeCat,query);
 $('arqModalGrid').replaceChildren(...list.map(x=>makeCard(x,130)));
 $('arqModalCount').textContent=list.length+' resultados';
}
function openModal(cat){
 buildModal();if(cat)activeCat=cat;query='';$('arqModalSearch').value='';renderModal();$('arqModal').hidden=false;setTimeout(()=>$('arqModalSearch').focus(),0);
}
function closeModal(){const m=$('arqModal');if(m&&!m.hidden){m.hidden=true;renderPanel()}}

/* ---------- Bloques dinámicos: pinzamientos ARQ ---------- */
function selectedArqRef(){
 const st=S();
 const refs=st.entities.filter(e=>st.selected.includes(e.id)&&arqOf(e)&&!e.cadHidden);
 return refs.length===1?refs[0]:null;
}
function localToWorld(ref,x,y){
 const k=f(),s=Number(ref.scale)||1,t=(Number(ref.rotation)||0)*Math.PI/180;
 let lx=x*k,ly=y*k;if(ref.flipBlockX)lx=-lx;
 return P(ref.p.x+s*(lx*Math.cos(t)-ly*Math.sin(t)),ref.p.y+s*(lx*Math.sin(t)+ly*Math.cos(t)));
}
function worldToLocal(ref,q){
 const k=f(),s=Number(ref.scale)||1,t=(Number(ref.rotation)||0)*Math.PI/180;
 const dx=(q.x-ref.p.x)/s,dy=(q.y-ref.p.y)/s;
 let lx=dx*Math.cos(-t)-dy*Math.sin(-t);const ly=dx*Math.sin(-t)+dy*Math.cos(-t);
 if(ref.flipBlockX)lx=-lx;return P(lx/k,ly/k);
}
function extOf(a){
 if(!a.ext){const bb=dkNeeds(byId(a.id))?null:LIB.bounds(LIB.build(a.id,a.w,a.d).entities);a.ext=bb?{x0:bb.minX,y0:bb.minY,x1:bb.maxX,y1:bb.maxY}:{x0:0,y0:0,x1:a.w,y1:a.d}}
 const e=a.ext;return {x0:Math.min(0,e.x0),y0:Math.min(0,e.y0),x1:Math.max(a.w,e.x1),y1:Math.max(a.d,e.y1)};
}
function gripsFor(ref){
 const a=arqOf(ref),item=a&&byId(a.id);if(!item)return [];
 const g=[],e=extOf(a);
 // Pinzas sobre el borde real del dibujo, para que no queden dentro ni lejos del bloque.
 // Proportional openings on the Y axis have their usable length along Y.
 if(item.lockAspect&&item.dynamicAxis==='d'){
  if(item.dMax>item.dMin)g.push({kind:'d',local:P((e.x0+e.x1)/2,e.y1)});
 }else{
  if(item.wMax>item.wMin)g.push({kind:'w',local:P(e.x1,(e.y0+e.y1)/2)});
  if(item.dMax>item.dMin&&!item.lockAspect)g.push({kind:'d',local:P((e.x0+e.x1)/2,e.y1)});
 }
 if(familyOf(item).length>1)g.push({kind:'v',local:P(e.x1,e.y0)});
 return g.map(x=>({...x,world:localToWorld(ref,x.local.x,x.local.y),screen:CORE.screen(localToWorld(ref,x.local.x,x.local.y))}));
}
let gripDrag=null;
Object.defineProperty(window,'CAD2D_GRIP_TYPING',{get:()=>!!gripDrag,configurable:true});
function drawTriangle(ctx,p,dir,active){
 ctx.save();ctx.translate(p.x,p.y);ctx.rotate(dir);ctx.beginPath();ctx.moveTo(9,0);ctx.lineTo(-6,-7);ctx.lineTo(-6,7);ctx.closePath();
 ctx.fillStyle=active?'#ff5f8f':'#37d6ff';ctx.strokeStyle='#06131b';ctx.lineWidth=1.2;ctx.fill();ctx.stroke();ctx.restore();
}
EXT.overlays.push(ctx=>{
 if(pick.active)drawPickPreview(ctx);
 const ref=selectedArqRef();if(!ref||CORE.layerFor(ref).locked)return;
 const a=arqOf(ref),item=byId(a.id);
 for(const g of gripsFor(ref)){
  const scr=g.screen;
  if(g.kind==='v'){ctx.save();ctx.fillStyle='#37d6ff';ctx.strokeStyle='#06131b';ctx.beginPath();ctx.moveTo(scr.x-8,scr.y-4);ctx.lineTo(scr.x+8,scr.y-4);ctx.lineTo(scr.x,scr.y+8);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();continue}
  // dirección de pantalla del eje local
  const o=CORE.screen(localToWorld(ref,a.w/2,a.d/2)),dir=Math.atan2(scr.y-o.y,scr.x-o.x);
  drawTriangle(ctx,scr,dir,gripDrag&&gripDrag.kind===g.kind);
 }
 if(gripDrag){
  const W=gripDrag.W,D=gripDrag.D,e=extOf(a),X1=e.x1+(W-a.w),Y1=e.y1+(D-a.d);
  const corners=[[e.x0,e.y0],[X1,e.y0],[X1,Y1],[e.x0,Y1]].map(([x,y])=>CORE.screen(localToWorld(ref,x,y)));
  ctx.save();ctx.setLineDash([6,4]);ctx.strokeStyle='#ff5f8f';ctx.lineWidth=1.4;ctx.beginPath();corners.forEach((c,i)=>i?ctx.lineTo(c.x,c.y):ctx.moveTo(c.x,c.y));ctx.closePath();ctx.stroke();
  const label=(gripDrag.typed?gripDrag.typed+' m ⏎ · ':'')+cm(W)+' × '+cm(D)+' cm';const at=CORE.screen(localToWorld(ref,X1,Y1));
  ctx.setLineDash([]);ctx.font='bold 12px Arial';const tw=ctx.measureText(label).width;
  ctx.fillStyle='rgba(6,19,27,.9)';ctx.fillRect(at.x+10,at.y-24,tw+12,20);ctx.fillStyle='#ffd3e0';ctx.fillText(label,at.x+16,at.y-10);
  ctx.restore();
 }
});
function hitGrip(raw){
 const ref=selectedArqRef();if(!ref||CORE.layerFor(ref).locked)return null;
 for(const g of gripsFor(ref))if(Math.hypot(raw.x-g.screen.x,raw.y-g.screen.y)<=10)return {ref,g};
 return null;
}
function snapMeters(v,fine){const step=fine?.01:.05;return Math.round(v/step)*step}
function resizeRef(ref,W,D){
 const a=arqOf(ref),item=a&&byId(a.id);if(!item)return;
 if(dkNeeds(item)&&allowed(item)){const old=ref.blockName;return dkPrepare(item).then(()=>{if(S().entities.includes(ref)&&ref.blockName===old&&!CORE.layerFor(ref).locked)resizeRef(ref,W,D)}).catch(e=>CORE.toast(e.message))}
 if(!allowed(item))return plan().upsell('Bloque Pro: '+item.name);
 let requestedW=W;
 if(item.lockAspect&&item.dynamicAxis==='d'&&Math.abs(D-a.d)>1e-6)
  requestedW=D*(item.w/item.d);
 const w=Math.max(item.wMin,Math.min(item.wMax,requestedW));
 const d=item.lockAspect?w*(item.d/item.w):Math.max(item.dMin,Math.min(item.dMax,D));
 if(Math.abs(w-a.w)<1e-6&&Math.abs(d-a.d)<1e-6)return CORE.toast('Sin cambios · rango '+cm(item.wMin)+'–'+cm(item.wMax)+' × '+cm(item.dMin)+'–'+cm(item.dMax)+' cm');
 CORE.saveHistory();
 ref.blockName=ensureDefinition(item,w,d);delete ref.dynamic;
 CORE.updateAll();syncSizeRow(item,S().blocks[ref.blockName].arq);
 CORE.toast(item.name+' → '+cm(w)+' × '+cm(d)+' cm · Ctrl+Z deshace');
}
function swapVariant(ref,id){
 const a=arqOf(ref),item=byId(id);if(!a||!item)return;
 if(dkNeeds(item)&&allowed(item)){const old=ref.blockName;return dkPrepare(item).then(()=>{if(S().entities.includes(ref)&&ref.blockName===old&&!CORE.layerFor(ref).locked)swapVariant(ref,id)}).catch(e=>CORE.toast(e.message))}
 if(!allowed(item))return plan().upsell('Bloque Pro: '+item.name);
 CORE.saveHistory();ref.blockName=ensureDefinition(item,a.w,a.d);delete ref.dynamic;
 CORE.updateAll();syncSizeRow(item,S().blocks[ref.blockName].arq);CORE.toast('Variante: '+item.name);
}
function variantMenu(ref,x,y){
 closeVariantMenu();
 const a=arqOf(ref),item=byId(a.id),menu=document.createElement('div');menu.id='arqVariantMenu';menu.setAttribute('role','menu');
 menu.innerHTML='<div class="arq-vt">VARIANTES · '+esc(item.family.toUpperCase())+' · se conserva '+cm(a.w)+'×'+cm(a.d)+' cm si entra en rango</div>';
 for(const v of familyOf(item)){
  const b=document.createElement('button');b.type='button';b.className='btn';b.setAttribute('role','menuitem');
  b.textContent=(v.id===item.id?'● ':'')+v.name+(v.pro?'  · PRO':'');b.onclick=()=>{closeVariantMenu();swapVariant(ref,v.id)};menu.append(b);
 }
 const more=document.createElement('button');more.type='button';more.className='btn';more.textContent='Abrir galería completa…';more.onclick=()=>{closeVariantMenu();openModal(item.cat)};menu.append(more);
 document.body.append(menu);
 menu.style.left=Math.min(x,innerWidth-menu.offsetWidth-8)+'px';menu.style.top=Math.min(y,innerHeight-menu.offsetHeight-8)+'px';
 setTimeout(()=>document.addEventListener('pointerdown',outsideMenu,true),0);
}
function outsideMenu(e){const m=$('arqVariantMenu');if(m&&!m.contains(e.target))closeVariantMenu()}
function closeVariantMenu(){$('arqVariantMenu')?.remove();document.removeEventListener('pointerdown',outsideMenu,true)}

function onPointerDown(ev){
 if(ev.button!==0)return;
 const raw=P(ev.offsetX,ev.offsetY);
 if(pick.active){ev.preventDefault();ev.stopImmediatePropagation();pickClick(raw);return}
 if(S().tool!=='select')return;
 const hit=hitGrip(raw);if(!hit)return;
 ev.preventDefault();ev.stopImmediatePropagation();
 if(hit.g.kind==='v'){variantMenu(hit.ref,ev.clientX+8,ev.clientY+8);return}
 const a=arqOf(hit.ref);gripDrag={kind:hit.g.kind,id:hit.ref.id,W:a.w,D:a.d};
 try{CORE.canvas.setPointerCapture(ev.pointerId)}catch(e){}
 CORE.schedule();
}
function onPointerMove(ev){
 if(pick.active){pick.mouse=CORE.snapPoint(CORE.world(P(ev.offsetX,ev.offsetY)));CORE.schedule()}
 if(!gripDrag)return;
 ev.stopImmediatePropagation();
 const ref=S().entities.find(e=>e.id===gripDrag.id),a=arqOf(ref),item=a&&byId(a.id);if(!item){gripDrag=null;return}
 const q=worldToLocal(ref,CORE.snapPoint(CORE.world(P(ev.offsetX,ev.offsetY))));
 const e=extOf(a);
 if(gripDrag.kind==='w'){gripDrag.W=Math.max(item.wMin,Math.min(item.wMax,snapMeters(q.x-(e.x1-a.w),ev.shiftKey)));if(item.lockAspect)gripDrag.D=gripDrag.W*(item.d/item.w)}
 else{
  gripDrag.D=Math.max(item.dMin,Math.min(item.dMax,snapMeters(q.y-(e.y1-a.d),ev.shiftKey)));
  if(item.lockAspect)gripDrag.W=gripDrag.D*(item.w/item.d);
 }
 CORE.schedule();
}
window.addEventListener('keydown',ev=>{
 if(!gripDrag)return;
 if(/^[0-9.,]$/.test(ev.key)){gripDrag.typed=(gripDrag.typed||'')+(ev.key===','?'.':ev.key);ev.preventDefault();ev.stopImmediatePropagation();CORE.schedule();return}
 if(ev.key==='Backspace'&&gripDrag.typed){gripDrag.typed=gripDrag.typed.slice(0,-1);ev.preventDefault();ev.stopImmediatePropagation();CORE.schedule();return}
 if(ev.key==='Enter'&&gripDrag.typed){ev.preventDefault();ev.stopImmediatePropagation();const g=gripDrag,v=Number(g.typed);gripDrag=null;
  const ref=S().entities.find(e=>e.id===g.id);if(ref&&v>0)resizeRef(ref,g.kind==='w'?v:g.W,g.kind==='d'?v:g.D);CORE.schedule();return}
 if(ev.key==='Escape'){gripDrag=null;CORE.schedule()}
},true);
function onPointerUp(ev){
 if(gripDrag){
  if(gripDrag.typed)return;
  ev.stopImmediatePropagation();
  const g=gripDrag;gripDrag=null;const ref=S().entities.find(e=>e.id===g.id);
  if(ref)resizeRef(ref,g.W,g.D);CORE.schedule();return;
 }
 setTimeout(finishPendingInsert,0);
}

/* ---------- Selector de puntos para comandos interactivos ---------- */
const pick={active:false,points:[],need:0,label:'',done:null,mouse:null,mode:'line'};
function startPick(need,label,done,mode='line'){
 Object.assign(pick,{active:true,points:[],need,label,done,mouse:null,mode,planPreview:null});
 CORE.setTool('select');CORE.toast(label+' · Esc cancela');statusHint(label+' · punto 1');
}
function statusHint(text){const h=$('statusHint');if(h)h.textContent=text}
function pickClick(raw){
 const p=CORE.snapPoint(CORE.world(raw));pick.points.push(p);
 if(pick.points.length>=pick.need){const pts=pick.points.slice(),done=pick.done;pick.active=pick.mode==='repeat';if(pick.mode==='repeat')pick.points=[pts[0]];try{done(pts)}finally{CORE.schedule()}}
 else statusHint(pick.label+' · punto '+(pick.points.length+1));
 CORE.schedule();
}
function drawPickPreview(ctx){
 if(pick.planPreview&&pick.mouse){
  const p=pick.planPreview,k=f(),to=(x,y)=>CORE.screen(P(pick.mouse.x+x*k,pick.mouse.y+y*k));
  ctx.save();ctx.strokeStyle='#91d8e8';ctx.globalAlpha=.75;ctx.setLineDash([]);ctx.lineCap='butt';
  for(const w of p.walls){const L=Math.hypot(w.b[0]-w.a[0],w.b[1]-w.a[1]),ux=(w.b[0]-w.a[0])/L,uy=(w.b[1]-w.a[1])/L,at=v=>to(w.a[0]+ux*v,w.a[1]+uy*v);const A=to(0,0),B=to(w.thickness,0);ctx.lineWidth=Math.max(1,Math.hypot(A.x-B.x,A.y-B.y));let t=0;const segment=(a,b)=>{if(b<=a)return;const x=at(a),y=at(b);ctx.beginPath();ctx.moveTo(x.x,x.y);ctx.lineTo(y.x,y.y);ctx.stroke()};for(const o of p.openings.filter(o=>o.host===w.id).sort((a,b)=>a.offset-b.offset)){segment(t,o.offset-o.width/2);t=o.offset+o.width/2;}segment(t,L);}
  ctx.lineWidth=1;ctx.setLineDash([3,3]);for(const b of p.blocks){if(!b.envelope)continue;const [x,y,w,d]=b.envelope,A=to(x,y),B=to(x+w,y+d);ctx.strokeRect(Math.min(A.x,B.x),Math.min(A.y,B.y),Math.abs(A.x-B.x),Math.abs(A.y-B.y));}
  ctx.restore();return;
 }
 if(!pick.points.length||!pick.mouse)return;
 const a=CORE.screen(pick.points[0]),b=CORE.screen(pick.mouse);
 ctx.setLineDash([5,4]);ctx.strokeStyle='#ffce78';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
}
document.addEventListener('keydown',ev=>{
 if(ev.key==='Escape'){
  dkInsertIntent++;
  if(pick.active){pick.active=false;pick.points=[];CORE.toast('Comando cancelado');CORE.schedule()}
  if(gripDrag){gripDrag=null;CORE.schedule()}
  closeVariantMenu();setTimeout(finishPendingInsert,0);
 }
 if(ev.key==='Enter'&&pick.active&&pick.mode==='repeat'&&!['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)){pick.active=false;pick.points=[];CORE.schedule()}
},true);

/* ---------- Utilidades de geometría ---------- */
const selected=()=>{const st=S();return st.entities.filter(e=>st.selected.includes(e.id)&&!CORE.layerFor(e).locked&&!e.cadHidden)};
function newEntity(e){const st=S();const o={...e,id:CORE.nextId()};if(!o.layer)o.layer=st.layerId;st.entities.push(o);return o}
function pathOf(e){ // polilínea de muestreo en coordenadas del modelo
 if(e.type==='line')return {pts:[e.a,e.b],closed:false};
 if(e.type==='polyline')return {pts:e.pts,closed:!!e.closed};
 if(e.type==='rect')return {pts:[P(e.a.x,e.a.y),P(e.b.x,e.a.y),P(e.b.x,e.b.y),P(e.a.x,e.b.y)],closed:true};
 if(e.type==='circle'){const pts=[];for(let i=0;i<256;i++){const t=i/256*Math.PI*2;pts.push(P(e.c.x+e.r*Math.cos(t),e.c.y+e.r*Math.sin(t)))}return {pts,closed:true}}
 if(e.type==='arc'){let sw=e.a1-e.a0;while(sw<=0)sw+=Math.PI*2;const pts=[];for(let i=0;i<=128;i++){const t=e.a0+sw*i/128;pts.push(P(e.c.x+e.r*Math.cos(t),e.c.y+e.r*Math.sin(t)))}return {pts,closed:false}}
 return null;
}
function segments(path){const s=[];for(let i=1;i<path.pts.length;i++)s.push([path.pts[i-1],path.pts[i]]);if(path.closed&&path.pts.length>2)s.push([path.pts.at(-1),path.pts[0]]);return s}
function length(path){return segments(path).reduce((n,[a,b])=>n+CORE.dist(a,b),0)}
function pointAt(path,d){
 for(const [a,b] of segments(path)){const l=CORE.dist(a,b);if(d<=l+1e-12){const t=l?d/l:0;return P(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t)}d-=l}
 return path.closed?path.pts[0]:path.pts.at(-1);
}
function polygonArea(pts){let a=0;for(let i=0;i<pts.length;i++){const p=pts[i],q=pts[(i+1)%pts.length];a+=p.x*q.y-q.x*p.y}return a/2}
function areaOf(e){
 if(e.type==='rect')return Math.abs((e.b.x-e.a.x)*(e.b.y-e.a.y));
 if(e.type==='circle')return Math.PI*e.r*e.r;
 if(e.type==='ellipse')return Math.PI*e.rx*e.ry;
 if(e.type==='polyline'&&e.closed)return Math.abs(polygonArea(e.pts));
 return null;
}
function centroid(e){const b=CORE.boundsEntity(e);return P((b.minX+b.maxX)/2,(b.minY+b.maxY)/2)}
function translateEntity(e,dx,dy){
 const o=JSON.parse(JSON.stringify(e));
 for(const key of Object.keys(o)){const v=o[key];if(v&&typeof v==='object'&&Number.isFinite(v.x)&&Number.isFinite(v.y)&&!Array.isArray(v))o[key]={x:v.x+dx,y:v.y+dy}}
 if(Array.isArray(o.pts))o.pts=o.pts.map(p=>({x:p.x+dx,y:p.y+dy}));
 return o;
}
const ask=(label,def)=>{const r=window.prompt(label,def);if(r===null)return null;return r.trim().replace(',','.')};

/* ---------- Comandos ---------- */
const C={};
const reg=(names,fn)=>{for(const n of names)C[n]=fn};
reg(['CALCOPRUEBA','TRACEPYTHONTEST'],openReviewedTrace);
reg(['GALERIA','GALERIAARQ','ARQ','DESIGNCENTER','ADC','TOOLPALETTES','TP','BIBLIOTECA','BLOQUESARQ'],()=>openModal());
reg(['BANO','BANOS','BAÑO','BAÑOS','SANITARIOS'],()=>openModal('Baños completos'));
reg(['COCINA','COCINAS'],()=>openModal('Cocinas completas'));
reg(['ESCALERA','ESCALERAS','STAIR','STAIRS'],()=>openModal('Escaleras'));
reg(['MOBILIARIO','MUEBLES','FURNITURE'],()=>openModal('Mobiliario'));
reg(['ARQPARAM','BPARAM','DIMBLOQUE'],()=>{const ref=selectedArqRef();if(!ref)return CORE.toast('Seleccioná un bloque ARQ de la galería');paramPrompt(ref)});
function paramPrompt(ref){
 const a=arqOf(ref),item=byId(a.id);
 const elevation=item.dynamicOpening?.projection==='elevation';
 const raw=ask(item.name+'\nAncho × '+(elevation?'Alto':'Profundidad')+' en cm (rango '+cm(item.wMin)+'–'+cm(item.wMax)+' × '+cm(item.dMin)+'–'+cm(item.dMax)+')',cm(a.w)+'x'+cm(a.d));
 if(raw===null)return;const m=raw.toLowerCase().split(/\s*[x×*]\s*/).map(Number);
 if(!(m[0]>0))return CORE.toast('Formato: 180x240');resizeRef(ref,m[0]/100,(m[1]>0?m[1]:cm(a.d))/100);
}
// Visibilidad de objetos (no modifica geometría; se guarda en el proyecto)
function hide(list){for(const e of list)e.cadHidden=true;const st=S();st.selected=[];CORE.updateProps();CORE.schedule();updateIsoBadge()}
reg(['HIDEOBJECTS','OCULTAR','OCULTAROBJETOS','HO'],()=>{const s=selected();if(!s.length)return CORE.toast('OCULTAR: seleccioná objetos primero');hide(s);CORE.toast(s.length+' objeto(s) ocultos · MOSTRARTODO los recupera')});
reg(['ISOLATEOBJECTS','AISLAR','AISLAROBJETOS','IO'],()=>{const st=S(),keep=new Set(st.selected);if(!keep.size)return CORE.toast('AISLAR: seleccioná objetos primero');const others=st.entities.filter(e=>!keep.has(e.id));hide(others);CORE.toast('Aislados '+keep.size+' objeto(s) · MOSTRARTODO termina el aislamiento')});
reg(['UNISOLATEOBJECTS','UNHIDE','MOSTRARTODO','MOSTRAR','UO','FINAISLAR'],()=>{let n=0;for(const e of S().entities)if(e.cadHidden){delete e.cadHidden;n++}CORE.schedule();updateIsoBadge();CORE.toast(n?n+' objeto(s) visibles nuevamente':'No había objetos ocultos')});
function updateIsoBadge(){
 let b=$('arqIsoBadge');const n=S().entities.filter(e=>e.cadHidden).length;
 if(!n){b?.remove();return}
 if(!b){b=document.createElement('button');b.id='arqIsoBadge';b.type='button';b.className='btn slim';b.style.cssText='position:absolute;right:12px;top:12px;z-index:30;background:#5a3b14;border-color:#e0a24a;color:#ffe3b8';b.onclick=()=>C.MOSTRARTODO();(CORE.canvas.parentElement||document.body).append(b)}
 b.textContent='◐ '+n+' ocultos · clic para mostrar';
}
// Orden de dibujo
function drawOrder(front){
 if(window.cadDrawOrder)return window.cadDrawOrder(front?'front':'back'); // maneja también sombreados al frente
 const st=S(),ids=new Set(selected().map(e=>e.id));if(!ids.size)return CORE.toast('ORDEN DE DIBUJO: seleccioná objetos primero');
 CORE.saveHistory();const moving=st.entities.filter(e=>ids.has(e.id)),rest=st.entities.filter(e=>!ids.has(e.id));
 st.entities.splice(0,st.entities.length,...(front?[...rest,...moving]:[...moving,...rest]));CORE.updateAll();CORE.toast(front?'Traído al frente':'Enviado al fondo');
}
reg(['BRINGTOFRONT','ALFRENTE','TRAERALFRENTE'],()=>drawOrder(true));
reg(['SENDTOBACK','ALFONDO','ENVIARALFONDO'],()=>drawOrder(false));
reg(['DRAWORDER','DR','ORDENDIBUJO','ORDENAR'],()=>{const r=ask('ORDEN DE DIBUJO · F = al frente · B = al fondo','F');if(r===null)return;drawOrder(!/^(b|fondo|back|a)/i.test(r))});
// Grupos (definición anónima reutilizando el motor de bloques)
let groupN=1;
reg(['GROUP','GRUPO','AGRUPAR'],()=>{
 const st=S(),list=selected().filter(e=>e.type!=='hatch');if(list.length<2)return CORE.toast('GRUPO: seleccioná 2 o más objetos');
 const flat=[];for(const e of list){if(e.type==='blockRef')flat.push(...CORE.blockChildren(e));else flat.push(e)}
 const allowedTypes=new Set(['line','polyline','rect','circle','arc','ellipse','text','dimension']);
 const usable=flat.filter(e=>allowedTypes.has(e.type));if(!usable.length)return CORE.toast('GRUPO: tipos no compatibles');
 const b=CORE.getBounds(usable),base=P(b.minX,b.minY);
 while(st.blocks['*GRUPO-'+groupN])groupN++;const name='*GRUPO-'+groupN;
 CORE.saveHistory();
 st.blocks[name]=CORE.cadPrepareDynamicBlock({name,entities:CORE.normalizeBlockEntities(usable.map(e=>translateEntity(e,-base.x,-base.y)))});
 st.blocks[name].dynamic2d=false;st.blocks[name].group=true;
 const ids=new Set(list.map(e=>e.id));st.entities=st.entities.filter(e=>!ids.has(e.id));
 const ref=newEntity({type:'blockRef',blockName:name,p:base,scale:1,rotation:0,layer:list[0].layer});
 st.selected=[ref.id];CORE.renderBlockLibrary();CORE.updateAll();CORE.toast(name+' · '+usable.length+' objetos agrupados · DESAGRUPAR los separa');
});
reg(['UNGROUP','DESAGRUPAR'],()=>{
 const st=S(),refs=selected().filter(e=>e.type==='blockRef');if(!refs.length)return CORE.toast('DESAGRUPAR: seleccioná un grupo o bloque');
 CORE.saveHistory();const out=[];
 for(const ref of refs){const kids=CORE.blockChildren(ref);st.entities=st.entities.filter(e=>e.id!==ref.id);for(const k of kids){const {id,...rest}=k;out.push(newEntity({...rest,layer:ref.layer}).id)}}
 st.selected=out;CORE.updateAll();CORE.toast('Separado en '+out.length+' objetos');
});
// Conteo de bloques
reg(['BCOUNT','CONTARBLOQUES','CONTAR'],()=>{
 const st=S(),pool=st.selected.length?st.entities.filter(e=>st.selected.includes(e.id)):st.entities;const counts=new Map();
 for(const e of pool)if(e.type==='blockRef'){const n=e.blockName.replace(/^ARQ · /,'').replace(/^BL /,'');counts.set(n,(counts.get(n)||0)+1)}
 if(!counts.size)return CORE.toast('No hay bloques '+(st.selected.length?'en la selección':'en el dibujo'));
 const rows=[...counts].sort((a,b)=>b[1]-a[1]);
 dialog('CONTARBLOQUES · '+(st.selected.length?'selección':'dibujo completo'),'<table><tr><th>Bloque</th><th>Cantidad</th></tr>'+rows.map(([n,c])=>'<tr><td>'+esc(n)+'</td><td>'+c+'</td></tr>').join('')+'<tr><th>Total</th><th>'+rows.reduce((s,r)=>s+r[1],0)+'</th></tr></table>',
  [['Copiar CSV',()=>navigator.clipboard?.writeText('Bloque;Cantidad\n'+rows.map(r=>r.join(';')).join('\n')).then(()=>CORE.toast('Tabla copiada'),()=>CORE.toast('No se pudo copiar'))]]);
});
function dialog(title,html,buttons=[]){
 $('arqDialog')?.remove();const d=document.createElement('div');d.id='arqDialog';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');
 d.innerHTML='<div class="arq-dlg"><b>'+esc(title)+'</b><div>'+html+'</div><div style="display:flex;gap:6px;justify-content:flex-end" id="arqDlgBtns"></div></div>';
 document.body.append(d);
 for(const [label,fn] of [...buttons,['Cerrar',null]]){const b=document.createElement('button');b.type='button';b.className='btn';b.textContent=label;b.onclick=()=>{if(fn)fn();else d.remove()};$('arqDlgBtns').append(b)}
 d.addEventListener('pointerdown',e=>{if(e.target===d)d.remove()});
}
// DIVIDIR y GRADUAR: marcadores en el trayecto (círculos chicos de centro capturable)
function markers(kind){
 const s=selected().map(e=>({e,path:pathOf(e)})).filter(x=>x.path);
 if(s.length!==1)return CORE.toast(kind+': seleccioná una línea, polilínea, arco, círculo o rectángulo');
 const {e,path}=s[0],L=length(path),U=S().unit;
 let dists=[];
 if(kind==='DIVIDIR'){const r=ask('DIVIDIR · número de segmentos (2–500)','4');if(r===null)return;const n=Math.round(Number(r));if(!(n>=2&&n<=500))return CORE.toast('DIVIDIR: entre 2 y 500');for(let i=1;i<n;i++)dists.push(L*i/n);if(path.closed)dists.unshift(0)}
 else{const r=ask('GRADUAR · distancia entre marcas ('+U+')',String(+(L/5).toPrecision(3)));if(r===null)return;const d=Number(r);if(!(d>0)||L/d>2000)return CORE.toast('GRADUAR: distancia inválida o demasiadas marcas');for(let x=d;x<L-1e-9;x+=d)dists.push(x)}
 CORE.saveHistory();const rad=Math.max(L/400,.02*f());
 for(const d of dists)newEntity({type:'circle',c:pointAt(path,d),r:rad,layer:e.layer,color:'#ffce78',width:.09});
 CORE.updateAll();CORE.toast(kind+': '+dists.length+' marcas · OSNAP centro las captura');
}
reg(['DIVIDE','DIV','DIVIDIR'],()=>markers('DIVIDIR'));
reg(['MEASURE','ME','GRADUAR'],()=>markers('GRADUAR'));
// NUBE DE REVISIÓN
function cloudFrom(pts,arcLen){
 const out=[],ccw=polygonArea(pts)>0;
 for(let i=0;i<pts.length;i++){
  const a=pts[i],b=pts[(i+1)%pts.length],L=CORE.dist(a,b);if(L<1e-9)continue;
  const n=Math.max(1,Math.round(L/arcLen)),ux=(b.x-a.x)/L,uy=(b.y-a.y)/L,nx=ccw?uy:-uy,ny=ccw?-ux:ux,c=L/n;
  for(let k=0;k<n;k++)for(let j=0;j<8;j++){const t=j/8,s=(k+t)*c,h=Math.sin(Math.PI*t)*c*.32;out.push(P(a.x+ux*s+nx*h,a.y+uy*s+ny*h))}
 }
 return out;
}
reg(['REVCLOUD','NUBEREV','NUBE'],()=>{
 const s=selected().filter(e=>e.type==='rect'||(e.type==='polyline'&&e.closed));
 const run=(pts,layer,removeId)=>{const b=CORE.getBounds([{type:'polyline',pts,closed:true}]),arc=Math.max(b.maxX-b.minX,b.maxY-b.minY)/12;
  const r=ask('NUBEREV · longitud de arco ('+S().unit+')',String(+arc.toPrecision(3)));if(r===null)return;const al=Number(r);if(!(al>0))return CORE.toast('Longitud inválida');
  CORE.saveHistory();if(removeId)S().entities=S().entities.filter(e=>e.id!==removeId);newEntity({type:'polyline',pts:cloudFrom(pts,al),closed:true,layer,color:'#ff6b6b'});CORE.updateAll();CORE.toast('Nube de revisión creada')};
 if(s.length===1){const p=pathOf(s[0]);return run(p.pts,s[0].layer,s[0].id)}
 startPick(2,'NUBEREV · esquinas opuestas',([a,b])=>run([P(a.x,a.y),P(b.x,a.y),P(b.x,b.y),P(a.x,b.y)],S().layerId,null));
});
// Líneas de construcción acotadas a 3 diagonales de la vista (no alteran la extensión del dibujo de forma desmedida)
function viewSpan(){const c=CORE.canvas,a=CORE.world(P(0,0)),b=CORE.world(P(c.clientWidth,c.clientHeight));return CORE.dist(a,b)*1.5}
function ensureConstruction(){const st=S();let l=st.layers.find(x=>x.name==='A-CONSTRUCCION');if(!l){l={id:'a-construccion',name:'A-CONSTRUCCION',color:'#5f7f95',visible:true,locked:false,width:.05};st.layers.push(l)}return l.id}
reg(['XLINE','XL','LINEACONST','LC'],()=>startPick(2,'LINEACONST · punto de paso y dirección (Enter termina)',([a,b])=>{
 const L=viewSpan(),d=CORE.dist(a,b);if(d<1e-9)return;const ux=(b.x-a.x)/d,uy=(b.y-a.y)/d;
 CORE.saveHistory();newEntity({type:'line',a:P(a.x-ux*L,a.y-uy*L),b:P(a.x+ux*L,a.y+uy*L),layer:ensureConstruction(),linetype:'DASHED',width:.05});CORE.updateAll();
},'repeat'));
reg(['RAY','SEMIRRECTA','RAYO'],()=>startPick(2,'SEMIRRECTA · origen y dirección (Enter termina)',([a,b])=>{
 const L=viewSpan(),d=CORE.dist(a,b);if(d<1e-9)return;
 CORE.saveHistory();newEntity({type:'line',a,b:P(a.x+(b.x-a.x)/d*L,a.y+(b.y-a.y)/d*L),layer:ensureConstruction(),linetype:'DASHED',width:.05});CORE.updateAll();
},'repeat'));
// Etiqueta de local: nombre + superficie en m² al centro del contorno
reg(['ROOMTAG','LOCAL','SUPERFICIE','ETIQUETALOCAL','ETIQUETA'],()=>{
 const s=selected().filter(e=>areaOf(e)!==null);if(!s.length){if(window.cadRoomTool)return window.cadRoomTool();return CORE.toast('LOCAL: seleccioná rectángulos, polilíneas cerradas o círculos')}
 const name=ask('LOCAL · nombre del ambiente','ESTAR');if(name===null)return;
 const k=f(),toM2=1/(k*k),h=.15*k;CORE.saveHistory();
 for(const e of s){const c=centroid(e),m2=areaOf(e)*toM2,label=(name||'LOCAL').toUpperCase(),sup=m2.toFixed(2).replace('.',',')+' m²';if(e.type==='polyline'&&e.closed)e.roomName=(name||'LOCAL').trim().slice(0,40);
  newEntity({type:'text',p:P(c.x-label.length*h*.33,c.y+h*.3),text:label,h,fontFamily:'Arial',rotation:0,bold:true,layer:e.layer});
  newEntity({type:'text',p:P(c.x-sup.length*h*.25,c.y-h*1.1),text:sup,h:h*.75,fontFamily:'Arial',rotation:0,layer:e.layer});}
 CORE.updateAll();CORE.toast('LOCAL: '+s.length+' etiqueta(s) con superficie');
});
reg(['PLAN','LICENCIA','SUSCRIPCION','CUENTA'],()=>plan()?plan().showPlans():CORE.toast('Planes no disponibles'));
Object.assign(EXT.commands,C);

/* ---------- Menú contextual ampliado ---------- */
EXT.context.push(info=>{
 const {item,active,count}=info;if(active)return [];
 const out=[],top=[],st=S();
 const ref=info.blockTarget&&arqOf(info.blockTarget)?info.blockTarget:selectedArqRef();
 if(ref){
  const a=arqOf(ref),it=byId(a.id);
  top.push(item('▶▲ Dimensiones del bloque · '+cm(a.w)+'×'+cm(a.d),()=>{st.selected=[ref.id];paramPrompt(ref)},!isDynamic(it)));
  if(familyOf(it).length>1)top.push(item('▼ Cambiar variante ('+familyOf(it).length+')',()=>{st.selected=[ref.id];const p=CORE.screen(ref.p);const r=CORE.canvas.getBoundingClientRect();variantMenu(ref,r.left+p.x,r.top+p.y)}));
  top.push(item('↺ Restablecer tamaño original',()=>resizeRef(ref,it.w,it.d)));
 }
 if(count){
  out.push(item('Aislar objetos · AISLAR',()=>C.AISLAR()),item('Ocultar objetos · OCULTAR',()=>C.OCULTAR()));
  if(count>1)out.push(item('Agrupar · GRUPO',()=>C.GRUPO()));
  if(st.entities.some(e=>st.selected.includes(e.id)&&e.type==='blockRef'))out.push(item('Desagrupar · DESAGRUPAR',()=>C.DESAGRUPAR()),item('Contar bloques · CONTARBLOQUES',()=>C.CONTARBLOQUES()));
  if(count===1&&selected().some(e=>pathOf(e)))out.push(item('Dividir · DIV',()=>C.DIVIDIR()),item('Graduar · ME',()=>C.GRADUAR()));
  if(st.entities.some(e=>st.selected.includes(e.id)&&areaOf(e)!==null))out.push(item('Etiqueta de local + m² · LOCAL',()=>C.LOCAL()),item('Nube de revisión · NUBEREV',()=>C.NUBEREV()));
 }else{
  out.push(item('Galería arquitectónica · GALERIA',()=>openModal()),item('Baños completos',()=>openModal('Baños completos')),item('Cocinas completas',()=>openModal('Cocinas completas')));
  out.push(item('Contar bloques · CONTARBLOQUES',()=>C.CONTARBLOQUES()));
 }
 if(st.entities.some(e=>e.cadHidden))out.push(item('Terminar aislamiento · MOSTRARTODO',()=>C.MOSTRARTODO()));
 const recent=[...new Set(CORE.commandHistory().slice().reverse())].filter(x=>!/^[0-9.,@<+\-]/.test(x)).slice(0,6);
 if(recent.length&&!count)for(const r of recent)top.push(item('↻ Entrada reciente: '+r,()=>CORE.command(r)));
 return {top,bottom:out};
});


/* Independent architecture assistant: uses the existing regenerative ARQ engine. */

// Deterministic natural-language room-row generator; no external AI service.
function parseRoomRow(raw){
 const s=String(raw).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 if(!/\b(?:habitacion(?:es)?|dormitorios?|rooms?|bedrooms?)\b/.test(s))return null;
 if(!/\b(?:tandem|fila|row|alinead[oa]s?|side by side)\b/.test(s))return null;
 if(/\b(?:bano|banos|bathroom|bathrooms|suite|vestidor|closet|ventana|windows?)\b/.test(s))throw Error('Esta versión genera muros, puertas y ventanas de habitaciones en fila; todavía no admite baños privados, ventanas personalizadas ni vestidores en esta orden.');
 const words={un:1,una:1,uno:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9,diez:10,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10};
 const n=s.match(/\b(\d+|un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:habitacion(?:es)?|dormitorios?|rooms?|bedrooms?)\b/);
 const m=s.match(/(\d+(?:[.,]\d+)?)\s*(?:x|×|por|by)\s*(\d+(?:[.,]\d+)?)/);
 const t=s.match(/(?:muros?|walls?)\s+(?:de\s+|of\s+)?(\d+(?:[.,]\d+)?)\s*(cm|mm|m\b)?/);
 const num=x=>Number(x.replace(',','.'));
 const count=n?(words[n[1]]||Number(n[1])):0,W=m?num(m[1]):4,D=m?num(m[2]):5,T=t?num(t[1])/(t[2]==='cm'?100:t[2]==='mm'?1000:1):.15;
 if(!Number.isInteger(count)||count<1||count>30||W<1.5||W>20||D<1.5||D>20||T<.08||T>.5)throw Error('Indicá entre 1 y 30 habitaciones, medidas de 1.50 a 20 m y muros de 0.08 a 0.50 m.');
 return {count,W,D,T,defaults:!m||!t};
}
function drawRoomRow(spec,origin){
 if(typeof CORE.wall.roomRow!=='function')throw Error('Recargá CAD2D3D para activar el motor de muros nativos.');
 const count=CORE.wall.roomRow(spec,origin);
 CORE.toast(count+' habitaciones · muros compartidos · puertas y ventanas paramétricas');
}

let arqWorker=null,arqIdle=null,arqPending=null,arqSeq=0;
let arqSemanticBusy=false;
async function understandArchitecture(text){
 if(arqSemanticBusy)throw Error('ARQASSIST está interpretando otra instrucción.');
 if(!navigator.gpu)throw Error('La IA local necesita WebGPU. Activá la aceleración gráfica o usá un navegador compatible.');
 arqSemanticBusy=true;
 let worker;
 try{
  if(!localStorage.getItem('cad-arq-ai-download-ok')){
   if(!window.confirm('ARQASSIST usa una IA gratuita local. La primera vez descargará un modelo de aproximadamente 1 GB y requerirá memoria gráfica. ¿Activar?'))throw Error('Carga de IA cancelada.');
   try{localStorage.setItem('cad-arq-ai-download-ok','1')}catch(e){}
  }
  worker=new Worker('architecture/semantic-worker.mjs?v=20261124-local-ai-v1',{type:'module'});
  return await new Promise((resolve,reject)=>{
   const timeout=setTimeout(()=>reject(Error('Tiempo de espera de la IA local agotado. Verificá la conexión o la memoria gráfica.')),300000);
   let last=0;
   const done=(err,value)=>{clearTimeout(timeout);if(err)reject(err);else resolve(value)};
   worker.onmessage=e=>{const d=e.data;if(d.id!==1)return;if(d.error)return done(Error(d.error));if(d.brief)return done(null,d.brief);if(d.message&&Date.now()-last>1500){last=Date.now();CORE.toast('ARQASSIST · '+d.message)}};
   worker.onerror=e=>done(Error(e.message||'No se pudo cargar la IA local.'));
   worker.postMessage({id:1,text});
  });
 }finally{worker?.terminate();arqSemanticBusy=false}
}
async function solveArchitecture(text,brief=null){
 // Own engine is always the default: no WebGPU, downloads or API charges.
 return solveGeometry(text,brief,false);
}
EXT.commands.ARQAI=async()=>{
 const bar=document.getElementById('cadArqInstructionBar'),raw=bar?.querySelector('[data-arq-text]')?.value.trim();
 if(!raw)return CORE.toast('Escribí primero una instrucción en ARQASSIST.');
 if(S().tool!=='select'||S().stage.length)return CORE.toast('Terminá el comando CAD actual.');
 const epoch=++arqCommandEpoch;
 try{
  const brief=await understandArchitecture(raw);if(epoch!==arqCommandEpoch)return;
  const plan=await solveGeometry('',brief,true);if(epoch!==arqCommandEpoch)return;
  startPick(1,'ARQAI · clic en origen / click origin',([p])=>{if(epoch===arqCommandEpoch)try{applyArchitecture(plan,p)}catch(e){CORE.toast(e.message)}},'arq-command');
 }catch(e){if(epoch===arqCommandEpoch)CORE.toast(e.message)}
};
function solveGeometry(text,brief=null,semantic=false){
 if(arqPending)return Promise.reject(Error('Architecture engine is busy.'));
 if(!brief&&!text.trim())return Promise.reject(Error('Enter an architectural instruction.'));
 clearTimeout(arqIdle);
 if(!arqWorker)arqWorker=new Worker('architecture/solver-worker.js?v=20261127-casa1');
 const worker=arqWorker,id=++arqSeq;
 return new Promise((resolve,reject)=>{
  const done=(err,value,terminate=false)=>{clearTimeout(timeout);arqPending=null;worker.onmessage=worker.onerror=null;
   if(terminate){worker.terminate();arqWorker=null}else arqIdle=setTimeout(()=>{if(!arqPending&&arqWorker===worker){worker.terminate();arqWorker=null}},45000);
   if(err)reject(err);else resolve(value)};
  const timeout=setTimeout(()=>done(Error('Architecture engine timed out.'),null,true),60000);
  arqPending=id;worker.onmessage=e=>{if(e.data.id===id)done(e.data.error?Error(e.data.error):null,e.data.plan)};
  worker.onerror=e=>done(Error(e.message||'Python engine unavailable'),null,true);
  worker.postMessage({id,text,brief,semantic});
 });
}

function applyArchitectureDetail(plan,origin){
// A rotated rectangle is valid even if its opposite corners share one coordinate.
function arqValidRectangle(pts){
 const v=pts.map((p,i)=>[pts[(i+1)%4][0]-p[0],pts[(i+1)%4][1]-p[1]]);
 const l=v.map(p=>Math.hypot(...p));
 if(l.some(x=>x<1e-8))return false;
 return v.every((p,i)=>Math.abs(p[0]*v[(i+1)%4][0]+p[1]*v[(i+1)%4][1])<=1e-8*l[i]*l[(i+1)%4])&&
  Math.abs(l[0]-l[2])<=1e-8*Math.max(1,l[0],l[2])&&Math.abs(l[1]-l[3])<=1e-8*Math.max(1,l[1],l[3]);
}

 if(plan.units!=='m'||!Array.isArray(plan.entities)||!plan.entities.length||plan.entities.length>500)throw Error('Detalle inválido.');
 const pool=plan.brief?.kind==='pool_plan',parking=plan.brief?.kind==='parking_plan';
 const st=S(),k=f(),names=new Set(pool?['POOL-WATER','POOL-DECK','POOL-STAIRS']:parking?['PARKING-SPACE','PARKING-AISLE','PARKING-CARS']:['STAIRS','RAILS','SECTIONS','SECTION-CUT','SECTION-FINISH','SECTION-FIXTURES']),layers=new Map(),add=[];
 const validPoint=p=>Array.isArray(p)&&p.length===2&&p.every(v=>Number.isFinite(v)&&Math.abs(v)<=(pool||parking?500:100));
 const getLayer=name=>{
  if(!names.has(name))throw Error('Capa de detalle inválida');
  if(!layers.has(name)){
   const old=st.layers.find(l=>l.name.toUpperCase()===name);
   if(old&&(old.locked||old.visible===false))throw Error('Capa bloqueada u oculta: '+name);
   const id=old?.id||'arq-detail-'+name.toLowerCase();if(!old&&st.layers.some(l=>l.id===id))throw Error('Colisión de capa.');
   const l=old||{id,name,color:name==='PARKING-AISLE'?'#8d9295':name==='PARKING-CARS'?'#a5b9ca':name==='POOL-WATER'?'#45b8df':name==='POOL-DECK'?'#b9a78f':name==='SECTION-CUT'?'#777b80':name==='SECTION-FINISH'?'#8d9295':'#e5e7eb',visible:true,locked:false,width:name==='SECTIONS'?.35:.13,linetype:'CONTINUOUS'};
   layers.set(name,l);if(!old)add.push(l);
  }return layers.get(name).id;
 };
 for(const e of plan.entities){if((pool||parking)&&e.type==='polyline'){if(!e.closed||!Array.isArray(e.pts)||e.pts.length!==4||!e.pts.every(validPoint)||!arqValidRectangle(e.pts))throw Error('Contorno rectangular inválido.');}else if(e.type!=='line'||![e.a,e.b].every(validPoint)||Math.hypot(e.a[0]-e.b[0],e.a[1]-e.b[1])<1e-8)throw Error('Geometría de detalle inválida.');getLayer(e.layer);}
 const fills=plan.fills||[],blocks=plan.blocks||[];
 if(!Array.isArray(fills)||fills.length>50||!Array.isArray(blocks)||blocks.length>50)throw Error('Detalle demasiado complejo.');
 for(const e of fills){if(e.layer!=='SECTION-CUT'||!Array.isArray(e.pts)||e.pts.length!==4||!e.pts.every(validPoint))throw Error('Relleno inválido.');getLayer(e.layer);}
 const prepared=blocks.map(b=>{const it=byId(b.catalogId),[w,d]=b.nominalSize||[];if(b.layer!=='SECTION-FIXTURES'||!it||!allowed(it)||it.dxfPlan||!validPoint(b.point)||![w,d].every(Number.isFinite)||w<it.wMin-1e-8||w>it.wMax+1e-8||d<it.dMin-1e-8||d>it.dMax+1e-8)throw Error('Bloque de detalle no disponible: '+b.catalogId);getLayer(b.layer);LIB.build(it.id,w,d);return {b,it,w,d};});
 CORE.saveHistory();
 const resolved=prepared.map(({b,it,w,d})=>({b,name:ensureDefinition(it,w,d,true)}));
 st.layers.push(...add);
 const batch='arq-detail-'+CORE.nextId(),p=a=>P(origin.x+a[0]*k,origin.y+a[1]*k);
 for(const e of fills)st.entities.push({id:CORE.nextId(),type:'hatch',pts:e.pts.map(p),layer:getLayer(e.layer),hatchStyle:'solid',width:.05,arqBatch:batch});
 for(const e of plan.entities){const common={id:CORE.nextId(),layer:getLayer(e.layer),width:e.layer==='SECTIONS'&&plan.brief?.kind==='bath_section'?.35:e.layer==='SECTION-FINISH'?.09:.18,arqBatch:batch};st.entities.push(e.type==='polyline'?{...common,type:'polyline',pts:e.pts.map(p),closed:true}:{...common,type:'line',a:p(e.a),b:p(e.b)});}
 for(const {b,name} of resolved)st.entities.push({id:CORE.nextId(),type:'blockRef',blockName:name,p:p(b.point),scale:1,rotation:0,layer:getLayer(b.layer),arqBatch:batch});
 st.selected=[];CORE.updateAll();return plan.entities.length+fills.length+blocks.length;
}

/* CALCOPRUEBA: explicit, experimental import of a reviewed Python JSON.
 * No raster inference, no server calls, no replacement of normal CALCO. */
function prepareReviewedTrace(raw){
 if(raw?.schema!=='blackline.architecture.review.v1'||raw.units!=='m'||!Array.isArray(raw.walls)||!Array.isArray(raw.openings)||!Array.isArray(raw.blocks))throw Error('Elegí un JSON revisado por Python.');
 if(raw.walls.length>500||raw.openings.length>300||raw.blocks.length>500)throw Error('Plano demasiado grande.');
 if((raw.dimensions||[]).length||(raw.texts||[]).length||(raw.projections||[]).length||(raw.hatches||[]).length)throw Error('Esta prueba aún no admite textos, cotas, proyecciones ni hatch.');
 const ppm=raw.scale?.pixelsPerUnit;
 if(!Number.isFinite(ppm)||ppm<=0)throw Error('Escala provisional inválida.');
 const defs=raw.customBlockDefinitions||{}, custom=new Map();
 const blocks=raw.blocks.map(b=>{
  if(!Array.isArray(b.point)||b.point.length!==2||!b.point.every(Number.isFinite)||!Number.isFinite(b.rotation)||b.scale!==1||!Array.isArray(b.sourceFootprintPx)||b.sourceFootprintPx.length!==4||!b.sourceFootprintPx.every(Number.isFinite))throw Error('Bloque inválido.');
  const [x,y,x1,y1]=b.sourceFootprintPx,sw=(x1-x)/ppm,sd=(y1-y)/ppm;
  if(!(sw>0&&sd>0))throw Error('Huella inválida.');
  let bb,item=byId(b.catalogId);
  if(item&&allowed(item)&&!item.dxfPlan&&!item.remoteDK&&!item.remoteOlym){
   bb=LIB.bounds(LIB.build(item.id,item.w,item.d).entities);
  }else if(!item&&Object.prototype.hasOwnProperty.call(defs,b.catalogId)){
   const def=defs[b.catalogId],pr=def?.primitives;
   if(!/^[A-Za-z0-9_-]{1,80}$/.test(b.catalogId)||!Array.isArray(pr)||pr.length!==1||pr[0].type!=='rect'||!Array.isArray(pr[0].a)||!Array.isArray(pr[0].b)||pr[0].a.length!==2||pr[0].b.length!==2||![...pr[0].a,...pr[0].b].every(v=>Number.isFinite(v)&&Math.abs(v)<=20))throw Error('Bloque nuevo no admitido: '+b.catalogId);
   const [ax,ay]=pr[0].a,[bx,by]=pr[0].b;
   bb={minX:Math.min(ax,bx),maxX:Math.max(ax,bx),minY:Math.min(ay,by),maxY:Math.max(ay,by)};
   if(!(bb.maxX>bb.minX&&bb.maxY>bb.minY))throw Error('Bloque rectangular vacío.');
   custom.set(b.catalogId,{a:[ax,ay],b:[bx,by]});
  }else throw Error('Bloque de catálogo no disponible: '+b.catalogId);
  if(!bb)throw Error('Bloque sin geometría.');
  const theta=b.rotation*Math.PI/180,c=Math.cos(theta),s=Math.sin(theta),cx=(bb.minX+bb.maxX)/2,cy=(bb.minY+bb.maxY)/2;
  return {...b,point:[b.point[0]+sw/2-(cx*c-cy*s),b.point[1]+sd/2-(cx*s+cy*c)],scale:1,...(item?{nominalSize:[item.w,item.d]}:{})};
 });
 const openings=raw.openings.map(o=>{
  if(!o.nativeMarginOK||!['swing-door','double-door','framed-window'].includes(o.kind))throw Error('Abertura pendiente de revisión: '+o.host);
  if(o.kind!=='framed-window'&&(!o.orientation||typeof o.orientation.mirror!=='boolean'||typeof o.orientation.reverseHostDirection!=='boolean'))throw Error('Sentido de puerta no confirmado.');
  return {...o};
 });
 return {plan:{schema:'blackline.architecture.v1',units:'m',traceReviewed:true,walls:raw.walls,openings,blocks,rooms:[]},custom};
}
// Calco con IA: inserta el plano revisado en el origen indicado (bloques del catálogo y rectángulos propios).
function applyTracePlan(raw,origin){
 const {plan,custom}=prepareReviewedTrace(raw);
 return CORE.wall.applyPlan({...plan,brief:{kind:'trace'}},origin||P(0,0),b=>{
  if(!custom.has(b.catalogId)){const it=byId(b.catalogId);return ensureDefinition(it,it.w,it.d,true);}
  const def=custom.get(b.catalogId),k=f(),name='CALCO · '+b.catalogId+' · '+JSON.stringify(def)+' · '+S().unit;
  if(!S().blocks[name])S().blocks[name]={name,entities:[{type:'rect',a:P(def.a[0]*k,def.a[1]*k),b:P(def.b[0]*k,def.b[1]*k),layer:'0',color:'#ffffff',width:.13}],dynamicActions:true,libraryLayer0:true};
  return name;
 });
}
EXT.applyTracePlan=applyTracePlan;
function insertReviewedTrace(raw){
 if(S().entities.length)throw Error('Abrí un dibujo vacío para esta prueba.');
 const {plan,custom}=prepareReviewedTrace(raw);
 if(!window.confirm('Calco experimental revisado manualmente. Escala provisional, sin cotas. ¿Insertar en el dibujo vacío?'))return;
 const n=CORE.wall.applyPlan(plan,P(0,0),b=>{
  if(!custom.has(b.catalogId)){const it=byId(b.catalogId);return ensureDefinition(it,it.w,it.d,true);}
  const def=custom.get(b.catalogId),k=f(),name='CALCO · '+b.catalogId+' · '+JSON.stringify(def)+' · '+S().unit;
  if(!S().blocks[name])S().blocks[name]={name,entities:[{type:'rect',a:P(def.a[0]*k,def.a[1]*k),b:P(def.b[0]*k,def.b[1]*k),layer:'0',color:'#ffffff',width:.13}],dynamicActions:true,libraryLayer0:true};
  return name;
 });
 CORE.toast('CALCOPRUEBA: '+n+' entidades nativas. Escala provisional.');
}
function openReviewedTrace(){
 const input=document.createElement('input');input.type='file';input.accept='.json,application/json';
 input.onchange=async()=>{try{const file=input.files?.[0];if(!file)return;if(file.size>2*1024*1024)throw Error('JSON supera 2 MB.');insertReviewedTrace(JSON.parse(await file.text()));}catch(e){CORE.toast('CALCOPRUEBA: '+e.message);}};
 input.click();
}

window.CAD2D_APPLY_TRACE_PLAN=(plan,origin)=>applyArchitecture(plan,origin);

/* ---------- ARQASSIST · amueblar un ambiente vacío con bloques de la galería ----------
   «amueblá el living», «colocá un sillón, mesa y sillas», «armá living y comedor para 6».
   El ambiente sale de una polilínea/rectángulo cerrado seleccionado o de dos clics en esquinas
   interiores opuestas. Los muebles son bloques dinámicos del catálogo, sin superposiciones. */
function T(en,es){try{return /^es/i.test(localStorage.getItem('cad2d-alias-language')||'')?es:en}catch(e){return en}}
function arqFurnishRequest(raw){
 const s=arqCleanRequest(raw);
 const verb=/\b(?:amuebl\w*|amobl\w*|equip\w*|coloc\w*|pon\w*|arm\w*|distribu\w*|ubic\w*|furnish\w*|place|arrange|put|layout)\b/.test(String(raw).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''));
 const what=/\b(?:living|estar|dormitorios?|habitacion(?:es)?|cuarto|bedroom|cocina|kitchen|bano|banos|bathroom|sofas?|sillon(?:es)?|butacas?|ratona|mesa ratona|mesa baja|tv|television|tele|comedor|mesa y sillas|mesa con sillas|mesa de comedor|sillas|dining|lounge|sofa)\b/.test(s);
 return verb&&what;
}
function arqFurnishSpec(raw){
 const s=String(raw).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
 const living=/\b(?:living|estar|lounge|sala)\b/.test(s);
 const dining=/\b(?:comedor|mesa y sillas|mesa con sillas|mesa de comedor|sillas|dining)\b/.test(s);
 const sofa=living||/\b(?:sofas?|sillon(?!es)|sofa)\b/.test(s);
 const n=Number((s.match(/\b(\d+)\s*(?:personas|sillas|lugares|comensales|people|seats)\b/)||s.match(/\bpara\s+(\d+)\b/)||[])[1]||0);
 const room=/\b(?:dormitorio|habitacion|cuarto|bedroom)\b/.test(s)?'bedroom':/\b(?:cocina|kitchen)\b/.test(s)&&!living?'kitchen':/\b(?:bano|bathroom|toilette)\b/.test(s)&&!living?'bath':null;
 if(room)return {room,desk:/\b(?:escritorio|desk)\b/.test(s),queen:/\b(?:queen|king|matrimonial|2 plazas|doble)\b/.test(s),single:/\b(?:1 plaza|individual|single|chico|nino|nina)\b/.test(s)};
 return {sofa,coffee:sofa&&!/\bsin (?:mesa )?ratona\b/.test(s),armchairs:living||/\b(?:sillones|butacas|sillon(?:es)? individual(?:es)?)\b/.test(s),tv:living||/\b(?:tv|tele|television)\b/.test(s),dining,seats:n,sofaL:/\b(?:en l|sofa l|esquinero)\b/.test(s)};
}
function arqFurnishRoom(W,D,spec){
 const swap=D>W,L=swap?D:W,S=swap?W:D,blocks=[],box=[];
 const free=(x,y,w,d)=>x>=-1e-6&&y>=-1e-6&&x+w<=L+1e-6&&y+d<=S+1e-6&&!box.some(b=>x<b[0]+b[2]-1e-6&&b[0]<x+w-1e-6&&y<b[1]+b[3]-1e-6&&b[1]<y+d-1e-6);
 const put=(id,role,x,y,w,d,rot)=>{if(!free(x,y,w,d))return false;box.push([x,y,w,d]);const it=byId(id),nw=rot%180?d:w,nd=rot%180?w:d;const pt=rot===0?[x,y]:rot===90?[x+w,y]:rot===180?[x+w,y+d]:[x,y+d];blocks.push({catalogId:id,role,point:pt,rotation:rot,scale:1,layer:'FURNITURE',nominalSize:[Math.max(it.wMin,Math.min(it.wMax,nw)),Math.max(it.dMin,Math.min(it.dMax,nd))]});return true;};
 if(spec.room==='bedroom'){
  const beds=spec.single?[['dor-cama1',1.4,2]]:spec.queen?[['dor-queen',2.6,2],['dor-cama2',2.4,1.9]]:[['dor-queen',2.6,2],['dor-cama2',2.4,1.9],['dor-cama1',1.4,2]];
  const bed=beds.find(b=>b[1]+.2<=L&&b[2]+.6<=S);if(!bed)throw Error(T('Room too small for a bed (min. 1.60 × 2.60 m)','No entra una cama: hace falta al menos 1,60 × 2,60 m'));
  const bx=Math.max(0,(L-bed[1])/2);put(bed[0],'bed',bx,0,bed[1],bed[2],180);
  const free2=S-bed[2];
  if(free2>=.62+.6){const pw=Math.min(Math.max(.8,L-1.4),2.4);put('mob-placard','wardrobe',0,S-.62,pw,.62,0);if(L-pw>=1.4)put('dor-comoda','dresser',L-1.2,S-.5,1.2,.5,0);}
  else if(L-bed[1]-bx>=.62+.1){put('mob-placard','wardrobe',L-.62,0,.62,Math.min(2.4,S),90);}
  if(spec.desk&&free2>=1.2+.6)put('mob-escritorio','desk',L-1.4,bed[2]+.6,1.4,1.2,0);
 }else{
  const cat=spec.room==='kitchen'?/^kit-/:/^bano-/;
  // Prefer the largest complete layout at its own size, upright or turned 90°; stretch only when none fits as drawn.
  const lib=LIB.library.filter(x=>cat.test(x.id));
  let opts=lib.flatMap(x=>[x.w<=L&&x.d<=S?{x,rot:0,fw:x.w,fd:x.d}:null,x.d<=L&&x.w<=S?{x,rot:90,fw:x.d,fd:x.w}:null]).filter(Boolean).sort((a,b)=>b.x.w*b.x.d-a.x.w*a.x.d);
  if(!opts.length)opts=lib.map(x=>({x,rot:0,fw:Math.min(x.wMax,L),fd:Math.min(x.dMax,S)})).filter(o=>o.fw>=o.x.wMin&&o.fd>=o.x.dMin).sort((a,b)=>b.fw*b.fd-a.fw*a.fd);
  if(!opts.length)throw Error(spec.room==='kitchen'?T('No complete kitchen fits this room','Ninguna cocina completa entra en este ambiente'):T('No complete bathroom fits this room','Ningún baño completo entra en este ambiente'));
  const o=opts[0];put(o.x.id,spec.room,0,0,o.fw,o.fd,o.rot);
 }
 if(!blocks.length)throw Error(T('Nothing could be placed','No se pudo colocar ningún mueble'));
 if(swap)for(const b of blocks){const [x,y]=b.point;b.point=[S-y,x];b.rotation=(b.rotation+90)%360;}
 return blocks;
}
function arqFurnishLayout(W,D,spec){
 // Local frame: long side along x.
 const swap=D>W,L=swap?D:W,S=swap?W:D,blocks=[],box=[];
 const free=(x,y,w,d)=>x>=-1e-6&&y>=-1e-6&&x+w<=L+1e-6&&y+d<=S+1e-6&&!box.some(b=>x<b[0]+b[2]-1e-6&&b[0]<x+w-1e-6&&y<b[1]+b[3]-1e-6&&b[1]<y+d-1e-6);
 const put=(id,role,x,y,w,d,rot)=>{ // x,y,w,d = footprint in local frame; rot in local frame
  if(!free(x,y,w,d))return false;box.push([x,y,w,d]);
  const it=byId(id),nw=rot%180?d:w,nd=rot%180?w:d; // nominal size (block axes)
  const pt=rot===0?[x,y]:rot===90?[x+w,y]:rot===180?[x+w,y+d]:[x,y+d];
  blocks.push({catalogId:id,role,point:pt,rotation:rot,scale:1,layer:'FURNITURE',nominalSize:[Math.max(it.wMin,Math.min(it.wMax,nw)),Math.max(it.dMin,Math.min(it.dMax,nd))]});return true;};
 let table=null;
 if(spec.dining){
  const want=spec.seats||(spec.sofa?6:4),opts=[['mob-mesa4',1.2,1.8,4],['mob-mesa6',1.8,1.9,6],['mob-mesa8',2.4,2.0,8]].filter(t=>t[3]>=Math.min(want,8));
  for(const t of opts.length?opts:[['mob-mesa8',2.4,2.0,8]]){if(t[1]+1.0<=L&&t[2]+0.8<=S){table=t;break}}
  if(!table)throw Error(T('Room too small for the dining table','El ambiente es chico para la mesa de comedor'));
 }
 const diningW=table?table[1]+1.2:0,Lz=table&&spec.sofa?L-diningW:L;
 if(spec.sofa){
  if(S<2.6||Lz<2.4)throw Error(T('Not enough space for the living area (min. 2.40 × 2.60 m)','No entra el living: hace falta al menos 2,40 × 2,60 m libres'));
  const cx=Lz/2,sofa=Lz>=3.4?['mob-sofa3',2.3,.92]:['mob-sofa2',1.7,.9];
  put(sofa[0],'sofa',cx-sofa[1]/2,.05,sofa[1],sofa[2],180);
  const ty=.05+sofa[2]+.45;
  if(spec.coffee&&ty+.6+.9<=S)put('mob-ratona','coffee',cx-.55,ty,1.1,.6,0);
  if(spec.armchairs&&ty+.3+.85<=S){const y=ty+.3-.425;put('mob-sillon','armchair',cx-.55-.35-.85,y,.85,.85,90);put('mob-sillon','armchair',cx+.55+.35,y,.85,.85,270);}
  if(spec.tv&&S>=3.2)put('mob-tv','tv',cx-.9,S-.5,1.8,.45,0);
 }
 if(table){const x0=spec.sofa?Lz+.6:(L-table[1])/2;put(table[0],'dining',x0,(S-table[2])/2,table[1],table[2],0);}
 if(!blocks.length)throw Error(T('Nothing could be placed','No se pudo colocar ningún mueble'));
 // Back to the room frame.
 if(swap)for(const b of blocks){const [x,y]=b.point;b.point=[S-y,x];b.rotation=(b.rotation+90)%360;}
 return blocks;
}
function arqFurnish(raw){
 const spec=arqFurnishSpec(raw),k=f(),st=S();
 const run=(minX,minY,maxX,maxY)=>{
  const W=(maxX-minX)/k,D=(maxY-minY)/k;
  if(!(W>1&&D>1&&W<40&&D<40))throw Error(T('Invalid room size','Medidas de ambiente inválidas'));
  const blocks=spec.room?arqFurnishRoom(W,D,spec):arqFurnishLayout(W,D,spec);
  const plan={schema:'blackline.architecture.v1',units:'m',walls:[],openings:[],blocks,rooms:[],virtualDimensions:[],connections:[],variants:[]};
  const n=applyArchitecture(plan,P(minX,minY));
  CORE.toast('ARQASSIST · '+blocks.length+T(' furniture blocks placed (',' muebles colocados (')+W.toFixed(2)+' × '+D.toFixed(2)+' m)');return n;
 };
 const sel=st.entities.filter(e=>st.selected.includes(e.id));
 if(sel.length===1&&(sel[0].type==='rect'||sel[0].type==='polyline'&&sel[0].closed)){
  const b=CORE.boundsEntity(sel[0]);try{run(b.minX,b.minY,b.maxX,b.maxY)}catch(e){CORE.toast(e.message)}return;
 }
 startPick(2,T('ARQASSIST · click two opposite INNER corners of the room','ARQASSIST · clic en dos esquinas INTERIORES opuestas del ambiente'),([a,b])=>{try{run(Math.min(a.x,b.x),Math.min(a.y,b.y),Math.max(a.x,b.x),Math.max(a.y,b.y))}catch(e){CORE.toast(e.message);CORE.log?.(e.message)}},'line');
}
/* Strict topology for reviewed orthogonal house plans. Validate centerlines
   before native wall-face joins and hosted parametric opening insertion. */
function arqAuditHouseTopology(plan){
 const eps=1e-6,issues=[],walls=new Map(),nodes=new Map(),axes=[];
 const near=(a,b)=>Math.abs(a-b)<=eps,point=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite);
 const key=p=>p.map(n=>Math.round(n/eps)).join(',');
 for(const w of plan.walls){
  if(!w||!w.id||walls.has(w.id)||!point(w.a)||!point(w.b)||!Number.isFinite(w.thickness)||w.thickness<=eps){issues.push('Invalid or duplicate wall ID');continue;}
  const h=near(w.a[1],w.b[1]),v=near(w.a[0],w.b[0]);
  if(h===v){issues.push('Invalid orthogonal wall: '+w.id);continue;}
  const i=h?0:1,j=1-i,lo=Math.min(w.a[i],w.b[i]),hi=Math.max(w.a[i],w.b[i]),axis={w,h,lo,hi,c:w.a[j],length:hi-lo};
  axes.push(axis);walls.set(w.id,axis);
  for(const p of [w.a,w.b]){const k=key(p);nodes.set(k,(nodes.get(k)||0)+1);}
 }
 for(const a of axes)for(const p of [a.w.a,a.w.b])if(nodes.get(key(p))===1)issues.push('Unjoined wall endpoint: '+a.w.id);
 for(let i=0;i<axes.length;i++)for(const b of axes.slice(i+1)){
  const a=axes[i],label=a.w.id+' / '+b.w.id;
  if(a.h===b.h){
   if(Math.min(a.hi,b.hi)-Math.max(a.lo,b.lo)>eps&&Math.abs(a.c-b.c)<(a.w.thickness+b.w.thickness)/2-eps)issues.push('Overlapping parallel walls: '+label);
  }else{
   const h=a.h?a:b,v=a.h?b:a,x=v.c,y=h.c;
   if(x>=h.lo-eps&&x<=h.hi+eps&&y>=v.lo-eps&&y<=v.hi+eps&&(!(near(x,h.lo)||near(x,h.hi))||!(near(y,v.lo)||near(y,v.hi))))issues.push('Unsplit wall junction: '+label);
  }
 }
 const hosted=new Map();
 for(const o of plan.openings){
  const a=walls.get(o.host);
  if(!a||!['swing-door','double-door','framed-window'].includes(o.kind)||!Number.isFinite(o.offset)||!Number.isFinite(o.width)||o.width<=eps){issues.push('Invalid hosted opening: '+o.host);continue;}
  const start=o.offset-o.width/2,end=o.offset+o.width/2;
  // At L/T/X junctions the perpendicular wall face may be thicker than the host.
  const clearance=p=>axes.reduce((m,b)=>b.h!==a.h&&[b.w.a,b.w.b].some(q=>near(p[0],q[0])&&near(p[1],q[1]))?Math.max(m,b.w.thickness/2):m,a.w.thickness/2);
  if(start<clearance(a.w.a)-eps||end>a.length-clearance(a.w.b)+eps)issues.push('Opening too close to junction: '+o.host);
  const list=hosted.get(o.host)||[];
  if(list.some(q=>Math.min(end,q[1])-Math.max(start,q[0])>eps))issues.push('Overlapping openings: '+o.host);
  list.push([start,end]);hosted.set(o.host,list);
 }
 return [...new Set(issues)];
}
function arqRequireHouseTopology(plan){
 if(plan?.strictHouseTopology!==true)return;
 const issues=arqAuditHouseTopology(plan);
 if(issues.length)throw Error('ARQASSIST: '+issues.join(' · '));
}

function applyArchitecture(plan,origin,replaceBatch=null){
 arqRequireHouseTopology(plan);
 if(plan?.schema==='blackline.architecture.detail.v1'){if(replaceBatch)throw Error('No se puede reemplazar un ambiente por un detalle.');return applyArchitectureDetail(plan,origin);}
 if(typeof CORE.wall.applyPlan!=='function')throw Error('Reload CAD2D3D to update the architecture engine.');
 // Validate individual library objects before touching the drawing.
 for(const b of plan.blocks){const it=byId(b.catalogId);if(!it||!allowed(it)||it.dxfPlan)throw Error('Block unavailable: '+b.catalogId)}
 return CORE.wall.applyPlan(plan,origin,b=>{const it=byId(b.catalogId);const [w,d]=b.nominalSize||[it.w,it.d];if(![w,d].every(Number.isFinite)||w<it.wMin-1e-8||w>it.wMax+1e-8||d<it.dMin-1e-8||d>it.dMax+1e-8)throw Error('Medidas de bloque fuera del catálogo: '+b.catalogId);return ensureDefinition(it,w,d,true)},replaceBatch);
}


/* Rectangular reference resize: move wall axes and preserve fixture sizes.
   Refuse any collision or invalid opening instead of scaling equipment. */
function arqResizeReference(source,axis,value){
 if(!source||source.rooms.length!==1||source.walls.length!==4||!['width','depth'].includes(axis))throw Error('Redimensionado disponible para ambientes rectangulares individuales.');
 const p=JSON.parse(JSON.stringify(source)),room=p.rooms[0],[x,y,w,d]=room.clearBounds,i=axis==='width'?0:1,lo=i?y:x,old=i?d:w,delta=value-old,t=p.walls[0].thickness,eps=1e-7;
 if(!Number.isFinite(value)||value<(axis==='width'&&room.kind==='bathroom'?.9:1.2)||value>20||!p.walls.every(w=>Math.abs(w.thickness-t)<eps))throw Error('Medida fuera de rango.');
 const far=lo+old+t/2,near=lo-t/2;
 if(p.walls.some(w=>[w.a,w.b].some(q=>Math.abs(q[i]-near)>eps&&Math.abs(q[i]-far)>eps)))throw Error('La geometría no es rectangular.');
 const lengths=new Map(p.walls.map(w=>[w.id,Math.hypot(w.b[0]-w.a[0],w.b[1]-w.a[1])]));
 for(const wall of p.walls)for(const q of [wall.a,wall.b])if(Math.abs(q[i]-far)<eps)q[i]+=delta;
 for(const o of p.openings){
  const wall=p.walls.find(w=>w.id===o.host),L=Math.hypot(wall.b[0]-wall.a[0],wall.b[1]-wall.a[1]),prev=lengths.get(o.host);
  if(Math.abs(L-prev)>eps)o.offset=o.offset/prev*L;
  if(o.offset-o.width/2<=t/2+eps||o.offset+o.width/2>=L-t/2-eps)throw Error('La nueva medida no permite conservar la abertura.');
 }
 room.clearBounds[i+2]=value;
 for(const b of p.blocks){
  const e=b.envelope,free=old-e[i+2],relative=e[i]-lo;
  if(free< -eps||value<e[i+2]-eps)throw Error('No entra el equipamiento sin deformarlo.');
  // Anchor to the nearer wall; intermediate fixtures preserve their relative position.
  const move=relative<.025?0:free-relative<.025?delta:free>eps?delta*relative/free:delta/2;
  e[i]+=move;b.point[i]+=move;
 }
 const [X,Y,W,D]=room.clearBounds,over=(a,b)=>a[0]<b[0]+b[2]-eps&&b[0]<a[0]+a[2]-eps&&a[1]<b[1]+b[3]-eps&&b[1]<a[1]+a[3]-eps;
 for(let j=0;j<p.blocks.length;j++){const e=p.blocks[j].envelope;if(e[0]<X-eps||e[1]<Y-eps||e[0]+e[2]>X+W+eps||e[1]+e[3]>Y+D+eps||p.blocks.slice(j+1).some(b=>over(e,b.envelope)))throw Error('La nueva medida produce interferencias de equipamiento.');}
 // Test inward door sweep in local wall coordinates, with the true quarter circle.
 for(const o of p.openings.filter(o=>o.kind==='swing-door')){
  const wall=p.walls.find(w=>w.id===o.host),L=Math.hypot(wall.b[0]-wall.a[0],wall.b[1]-wall.a[1]),ux=(wall.b[0]-wall.a[0])/L,uy=(wall.b[1]-wall.a[1])/L,nx=-uy,ny=ux;
  const hx=wall.a[0]+ux*(o.offset-o.width/2),hy=wall.a[1]+uy*(o.offset-o.width/2);
  for(const b of p.blocks){const [a,z,bw,bd]=b.envelope,corners=[[a,z],[a+bw,z],[a,z+bd],[a+bw,z+bd]].map(([x,y])=>[(x-hx)*ux+(y-hy)*uy,(x-hx)*nx+(y-hy)*ny]);const us=corners.map(q=>q[0]),vs=corners.map(q=>q[1]);if(Math.max(...us)<=eps||Math.max(...vs)<=eps)continue;const u=Math.max(0,Math.min(...us)),v=Math.max(0,Math.min(...vs));if(u*u+v*v<(o.width-eps)**2)throw Error('La puerta interfiere con un artefacto en la nueva distribución.');}
 }
 p.virtualDimensions=[{room:room.id,axis:'width',value:W,editable:true},{room:room.id,axis:'depth',value:D,editable:true}];
 p.brief={...p.brief,kind:'bath_reference',width:W,depth:D,alternatives:1};p.status='approximate';p.warning='Dimensiones ajustadas sin escalar artefactos. Revisar holguras, circulación y normativa.';p.assumptions=[p.warning];return p;
}
function arqCanResize(meta){
 return !!meta?.brief&&meta.rooms?.length===1&&meta.brief.kind!=='suite_row'&&!meta.brief.classroomGrid&&!meta.brief.auditoriumGrid&&!meta.brief.restaurantGrid&&(meta.brief.alternatives||1)===1&&(meta.brief.kind!=='bath_reference'||meta.sourcePlan?.walls?.length===4);
}

/* Room-level virtual dimensions, screen only, never printed. */
let arqRoomHits=[];
EXT.overlays.push(ctx=>{
 arqRoomHits=[];const st=S();if(st.tool!=='select')return;
 const batches=new Set(st.entities.filter(e=>st.selected.includes(e.id)&&e.arqBatch).map(e=>e.arqBatch));
 if(batches.size!==1)return;const batch=[...batches][0],meta=st.entities.find(e=>e.arqBatch===batch&&e.arqPlan)?.arqPlan;
 if(!meta?.origin||meta.unit!==st.unit)return;
 const k=f(),p=(x,y)=>CORE.screen(P(meta.origin.x+x*k,meta.origin.y+y*k));
 const editable=arqCanResize(meta);
 ctx.save();ctx.font='bold 12px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=1;ctx.setLineDash([]);
 for(const room of meta.rooms){
  const [x,y,w,d]=room.clearBounds,A=p(x,y),B=p(x+w,y+d),top=Math.min(A.y,B.y),left=Math.min(A.x,B.x),right=Math.max(A.x,B.x),bottom=Math.max(A.y,B.y);
  if(right-left<30||bottom-top<30)continue;
  const color=editable?'#59d0ff':'#9fb9c6';ctx.strokeStyle=color;ctx.fillStyle=color;
  const dim=(a,b,axis,value)=>{
   ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);
   if(axis==='width'){ctx.moveTo(a.x,a.y-4);ctx.lineTo(a.x,a.y+4);ctx.moveTo(b.x,b.y-4);ctx.lineTo(b.x,b.y+4)}
   else{ctx.moveTo(a.x-4,a.y);ctx.lineTo(a.x+4,a.y);ctx.moveTo(b.x-4,b.y);ctx.lineTo(b.x+4,b.y)}
   ctx.stroke();const label=value.toFixed(2),cx=(a.x+b.x)/2,cy=(a.y+b.y)/2,tw=ctx.measureText(label).width+12;
   ctx.fillStyle='rgba(6,22,32,.94)';ctx.fillRect(cx-tw/2,cy-10,tw,20);ctx.strokeRect(cx-tw/2,cy-10,tw,20);ctx.fillStyle=color;ctx.fillText(label,cx,cy);
   if(editable)arqRoomHits.push({batch,meta,axis,value,x:cx-tw/2,y:cy-10,w:tw,h:20});
  };
  dim(P(left,top-16),P(right,top-16),'width',w);
  dim(P(left-18,top),P(left-18,bottom),'depth',d);
 }
 ctx.restore();
});
CORE.canvas.addEventListener('pointerdown',async e=>{
 if(e.button!==0)return;const h=arqRoomHits.find(a=>e.offsetX>=a.x&&e.offsetX<=a.x+a.w&&e.offsetY>=a.y&&e.offsetY<=a.y+a.h);if(!h)return;
 e.preventDefault();e.stopImmediatePropagation();
 const raw=window.prompt((h.axis==='width'?'Ancho / Width':'Largo / Depth')+' (m)',h.value.toFixed(2));if(raw===null)return;
 const value=Number(raw.replace(',','.'));if(!(value>=(h.axis==='width'&&h.meta.rooms[0].kind==='bathroom'?.9:1.2)&&value<=20))return CORE.toast('Medida inválida / Invalid dimension');
 try{const spec={...h.meta.brief,[h.axis]:value};let plan;if(spec.kind==='bath_reference'||spec.templateLayout||spec.compactTransverse){plan=arqResizeReference(h.meta.sourcePlan,h.axis,value);}else{plan=await solveArchitecture('',spec);}arqRequireHouseTopology(plan);
 if(plan.warning&&!window.confirm(plan.warning+'\n\n¿Aplicar cambio?'))return;applyArchitecture(plan,h.meta.origin,h.batch);CORE.toast('Ambiente recalculado · Ctrl+Z deshace')}catch(err){CORE.toast(err.message)}
},true);

let arqCommandEpoch=0;
EXT.cancelArchitectureCommand=()=>{
 arqCommandEpoch++;
 if(pick.active&&pick.mode==='arq-command'){pick.active=false;pick.points=[];CORE.schedule()}
};
document.addEventListener('keydown',e=>{if(e.key==='Escape')EXT.cancelArchitectureCommand()},true);
EXT.drawArchitectureCommand=async raw=>{
 if(!arqRoomSetRequest(raw)&&!arqHouseDesignRequest(raw)){
 if(!arqPoolRequest(raw)){
 if(!arqParkingRequest(raw)&&!arqSanitaryBatteryRequest(raw)&&!arqClassroomRequest(raw)&&!arqAuditoriumRequest(raw)&&!arqRestaurantRequest(raw)){
 if(arqRoomCAD(raw)){arqOpenRoomCAD(raw);return;}
 if(arqHouseGallery(raw)){arqOpenHouseGallery(raw);return;}
 if(arqWebReference(raw)){arqOpenWebReference(raw);return;}
 const object=!arqCatalogueCategory(raw)&&arqObjectSearch(raw);if(object){arqOpenObjectSearch(object);return;}
 }
 }
 }
 const epoch=++arqCommandEpoch;
 CORE.toast('ARQASSIST · Calculando / Calculating…');
 try{
  const plan=await solveArchitecture(raw);
  if(epoch!==arqCommandEpoch)return;
  if(S().tool!=='select'||S().stage.length)return CORE.toast('ARQASSIST · command cancelled');
  CORE.log('ARQASSIST · '+(plan.assumptions||[]).join(' · '));
  if(plan.warning&&!window.confirm(plan.warning+'\n\n¿Insertar la propuesta editable?'))return;
  startPick(1,'ARQASSIST · clic en origen / click origin',([p])=>{
   if(epoch!==arqCommandEpoch)return;
   try{const n=applyArchitecture(plan,p);CORE.toast('ARQASSIST · '+n+' entidades CAD / entities drawn')}
   catch(e){CORE.toast(e.message);CORE.log('ARQASSIST: '+e.message)}
  },'arq-command');
 }catch(e){if(epoch===arqCommandEpoch){CORE.toast(e.message);CORE.log('ARQASSIST: '+e.message)}}
};


/* Visual catalogue: generated, checked plans from the native architectural engine.
   Thumbnails and insertion use the same plan, not a raster reference. */
const arqCatalogueCounts={"bathroom":37,"kitchen":12,"bedroom":11,"laundry":1,"office":1,"dining":1,"closet":1,"house":34};
const arqCatalogueBase=new URL('assets/arq-catalogue/v1/',document.baseURI);
let arqCataloguePromise=null;
function arqCatalogueIndex(){if(!arqCataloguePromise)arqCataloguePromise=fetch(new URL('index.json?v=20261127-bathroom-catalogue8',arqCatalogueBase)).then(r=>{if(!r.ok)throw Error('Catálogo no disponible');return r.json()}).then(x=>{if(!Array.isArray(x)||x.length>10000||x.some(i=>!/^plan-\d+$/.test(i.id)||!Array.isArray(i.dimensions)||!Array.isArray(i.roles)))throw Error('Índice inválido');return x}).catch(e=>{arqCataloguePromise=null;throw e});return arqCataloguePromise;}
// Natural requests: "quiero un bidé", "poné un auto en corte", "necesito un baño completo".
function arqRoomCAD(raw){return window.CAD2D_BLOCK_BROWSER?.roomQuery?.(raw)||null;}
function arqOpenRoomCAD(raw){const b=window.CAD2D_BLOCK_BROWSER;if(!b?.openWeb)return CORE.toast('Catálogo CAD no disponible / CAD catalogue unavailable');EXT.cancelArchitectureCommand();b.openWeb(raw);}
function arqCleanRequest(raw){
 let s=String(raw||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[¿?¡!.,;:]+/g,' ').replace(/\s+/g,' ').trim();
 const lead=/^(?:por favor|porfa|hola|quiero|quisiera|necesito|me gustaria|me falta|busco|buscame|busca|buscar|dame|mostrame|mostra|mostrar|ver|pone|poneme|poner|pon|agrega|agregame|agregar|anadi|anadir|inserta|insertame|insertar|coloca|colocame|colocar|traeme|trae|please|i want|i need|give me|show me|add|put|insert|place|find|search)\s+/;
 for(let i=0;i<4;i++){const t=s.replace(lead,'').replace(/^(?:un|una|unos|unas|el|la|los|las|a|an|the|some)\s+/,'');if(t===s)break;s=t;}
 return s.replace(/\s+(?:por favor|porfa|please)$/,'').trim();
}
function arqCatalogueCategory(raw){
 let s=arqCleanRequest(raw);
 if(/^(?:bano|banos|bathroom|bathrooms)\s+(?:completo|completos|armado|armados|entero|principal|de servicio|en suite|con banera|con ducha|full|complete|ensuite)$/.test(s))s='bano';
 if(/^(?:casas?|viviendas?|houses?|homes?)(?:\s+(?:de\s+)?\d+(?:[.,]\d+)?\s*(?:m\s*(?:2|²|\^2)|mts?\s*(?:2|²)?|sqm|metros?(?:\s+cuadrados?)?)?)?[\s.]*$/.test(s))return 'house';
 if(/^(?:bnao|bno|banio|banios|bnaos|banoo|banoss)$/.test(s))return 'bathroom';
 if(/^(?:bano|banos|toilette|mostrar banos|listado de banos|bath|baths|bathroom|bathrooms|salle de bains|bagno|bagni|banheiro|banheiros|badezimmer|浴室|卫生间|衛生間|ванная|حمام|욕실)$/.test(s))return 'bathroom';
 if(/^(?:cocina|cocinas|kitchen|kitchens|cuisine|cucina|cozinha|kuche|厨房|キッチン|кухня|مطبخ)$/.test(s))return 'kitchen';
 if(/^(?:habitacion|habitaciones|dormitorio|dormitorios|bedroom|bedrooms|chambre|camera|quarto|schlafzimmer|寝室|卧室|спальня|غرفة نوم)$/.test(s))return 'bedroom';
 if(/^(?:lavadero|lavaderos|laundry|buanderie|lavanderia)$/.test(s))return 'laundry';
 if(/^(?:oficina|oficinas|office|bureau|ufficio)$/.test(s))return 'office';
 if(/^(?:comedor|comedores|dining room|sala da pranzo)$/.test(s))return 'dining';
 if(/^(?:vestidor|vestidores|dressing|walk-in closet)$/.test(s))return 'closet';
 if(/^(?:escalera|escaleras|stair|stairs|staircase|staircases|escalera en [lu]|escalera caracol|escalera recta|escalera curva|escalera compensada)$/.test(s))return 'stairs';
 if(/^(?:pasamanos|baranda|barandas|barandilla|barandillas|handrail|handrails|railing|railings)$/.test(s))return 'rails';
 return null;
}
function arqPlanThumbnail(plan){
 const xs=plan.walls.flatMap(w=>[w.a[0]-w.thickness/2,w.b[0]+w.thickness/2,w.a[0]+w.thickness/2,w.b[0]-w.thickness/2]),ys=plan.walls.flatMap(w=>[w.a[1]-w.thickness/2,w.b[1]+w.thickness/2,w.a[1]+w.thickness/2,w.b[1]-w.thickness/2]);
 const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),pad=.23,sw=.012;
 let body='';
 for(const w of plan.walls){
  const L=Math.hypot(w.b[0]-w.a[0],w.b[1]-w.a[1]),ux=(w.b[0]-w.a[0])/L,uy=(w.b[1]-w.a[1])/L,pt=t=>[w.a[0]+ux*t,-w.a[1]-uy*t];
  const ops=plan.openings.filter(o=>o.host===w.id).sort((a,b)=>a.offset-b.offset);let at=0;
  const line=(a,b)=>{if(b>a)body+='<line x1="'+pt(a)[0]+'" y1="'+pt(a)[1]+'" x2="'+pt(b)[0]+'" y2="'+pt(b)[1]+'" stroke="#53575a" stroke-width="'+w.thickness+'" stroke-linecap="butt"/>'};
  for(const o of ops){const a=o.offset-o.width/2,b=o.offset+o.width/2;line(at,a);const [x,y]=pt(a),angle=-Math.atan2(uy,ux)*180/Math.PI;
   const fw=Math.min(.05,o.width*.12),fd=w.thickness,span=o.width-2*fw,flip=o.orientation?.mirror?' translate('+o.width+' 0) scale(-1 1)':'',rev=o.orientation?.reverseHostDirection?' translate('+o.width+' 0) rotate(180)':'';
   body+='<g transform="translate('+x+' '+y+') rotate('+angle+')'+rev+flip+'" stroke="'+(o.kind==='framed-window'?'#69949b':'#74716b')+'" stroke-width=".012" fill="none"><rect x="0" y="'+(-fd/2)+'" width="'+fw+'" height="'+fd+'"/><rect x="'+(o.width-fw)+'" y="'+(-fd/2)+'" width="'+fw+'" height="'+fd+'"/>';
   if(o.kind==='swing-door')body+='<path d="M'+fw+' 0 V-'+span+' M'+fw+' -'+span+' A'+span+' '+span+' 0 0 1 '+(o.width-fw)+' 0"/>';
   else if(o.kind==='double-door'){const half=span/2;body+='<path d="M'+fw+' 0 V-'+half+' M'+fw+' -'+half+' A'+half+' '+half+' 0 0 1 '+(o.width/2)+' 0 M'+(o.width-fw)+' 0 V-'+half+' M'+(o.width-fw)+' -'+half+' A'+half+' '+half+' 0 0 0 '+(o.width/2)+' 0"/>';}
   else for(const yy of [-fd/2,fd/2,-fw*.28,fw*.28])body+='<path d="M'+fw+' '+yy+' H'+(o.width-fw)+'"/>';
   body+='</g>';at=b;}
  line(at,L);
  // Corner fill only at actual junctions; native insertion has its own wall joiner.
  for(const [x,y] of [w.a,w.b])body+='<rect x="'+(x-w.thickness/2)+'" y="'+(-y-w.thickness/2)+'" width="'+w.thickness+'" height="'+w.thickness+'" fill="#53575a"/>';
 }
 for(const b of plan.blocks){const it=byId(b.catalogId);if(!it)continue;const svg=svgFor(it,...(b.nominalSize||[it.w,it.d]),{height:110});const i=svg.indexOf('<g '),j=svg.lastIndexOf('</svg>');if(i<0||j<0)continue;
  body+='<g transform="translate('+b.point[0]+' '+(-b.point[1])+') rotate('+(-b.rotation)+')" color="#343e40">'+svg.slice(i,j)+'</g>';}
 for(const l of plan.labels||[]){if(!Array.isArray(l.point))continue;const [x,y]=l.point;body+='<g fill="#444" font-family="Arial,sans-serif" text-anchor="middle" font-size=".15"><text x="'+x+'" y="'+(-y)+'">'+esc(l.text||'')+'</text><text x="'+x+'" y="'+(-y+.18)+'">'+esc(l.sub||'')+'</text></g>';}
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+[minX-pad,-maxY-pad,maxX-minX+2*pad,maxY-minY+2*pad].join(' ')+'" style="width:100%;height:142px;display:block;background:#f4efe3;border-radius:4px" role="img" aria-label="Planta arquitectónica">'+body+'</svg>';
}
async function openArqPlanCatalogue(category,query=''){
 const old=document.getElementById('arqPlanCatalogue');if(old){old.close();old.remove();}
 const dlg=document.createElement('dialog');dlg.id='arqPlanCatalogue';
 dlg.style.cssText='position:fixed;inset:auto;margin:0;z-index:1200;width:min(760px,94vw);height:min(620px,80vh);min-width:min(300px,94vw);min-height:min(220px,80vh);max-width:calc(100vw - 12px);max-height:calc(100vh - 12px);resize:both;overflow:hidden;background:#25282d;color:#e6e7eb;border:1px solid #777;border-radius:12px;padding:14px;box-sizing:border-box';
 const header=document.createElement('div');header.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;flex:none;cursor:move;touch-action:none;user-select:none';header.title='Arrastrar para mover / Drag to move';
 const title=document.createElement('strong');title.textContent='ARQASSIST · '+({bathroom:'Baños / Bathrooms',kitchen:'Cocinas / Kitchens',bedroom:'Habitaciones / Bedrooms',laundry:'Lavaderos / Laundry',office:'Oficinas / Offices',dining:'Comedores / Dining',closet:'Vestidores / Dressing',stairs:'Escaleras / Stairs',rails:'Pasamanos / Railings',house:'Viviendas / Houses'}[category]||'Plantas');
 const close=document.createElement('button');close.className='btn slim';close.textContent='×';close.setAttribute('aria-label','Cerrar / Close');close.onclick=()=>dlg.close();const handle=document.createElement('span');handle.textContent='⠿';handle.setAttribute('aria-hidden','true');handle.style.cssText='opacity:.75;font-size:18px;line-height:1';title.style.flex='1';header.append(handle,title,close);dlg.append(header);
 const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(min(158px,100%),1fr));gap:9px;overflow:auto;min-height:0;flex:1;align-content:start;padding-right:3px';dlg.append(grid);
 const fmt=n=>n.toFixed(2);
 const status=document.createElement('p');status.textContent='Cargando catálogo…';dlg.append(status);
 const storageKey='cad2d.arqCatalogue.palette.v1';
 let saved={};try{saved=JSON.parse(localStorage.getItem(storageKey)||'{}')||{}}catch(e){}
 const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
 const fit=()=>{const r=dlg.getBoundingClientRect();dlg.style.left=clamp(r.left,6,Math.max(6,innerWidth-r.width-6))+'px';dlg.style.top=clamp(r.top,6,Math.max(6,innerHeight-r.height-6))+'px';};
 const remember=()=>{if(!dlg.isConnected||!dlg.open)return;const r=dlg.getBoundingClientRect();try{localStorage.setItem(storageKey,JSON.stringify({x:r.left,y:r.top,w:r.width,h:r.height}))}catch(e){}};
 dlg.setAttribute('aria-label','ARQASSIST · Galería de plantas');
 document.body.append(dlg);dlg.show();dlg.style.display='flex';dlg.style.flexDirection='column';
 if(Number.isFinite(saved.w))dlg.style.width=clamp(saved.w,Math.min(300,innerWidth-12),innerWidth-12)+'px';
 if(Number.isFinite(saved.h))dlg.style.height=clamp(saved.h,Math.min(220,innerHeight-12),innerHeight-12)+'px';
 dlg.style.left=(Number.isFinite(saved.x)?saved.x:(innerWidth-dlg.offsetWidth)/2)+'px';
 dlg.style.top=(Number.isFinite(saved.y)?saved.y:(innerHeight-dlg.offsetHeight)/2)+'px';fit();
 let drag=null;
 header.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('button'))return;const r=dlg.getBoundingClientRect();drag={id:e.pointerId,x:e.clientX-r.left,y:e.clientY-r.top};header.setPointerCapture(e.pointerId);e.preventDefault();});
 header.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;dlg.style.left=clamp(e.clientX-drag.x,6,Math.max(6,innerWidth-dlg.offsetWidth-6))+'px';dlg.style.top=clamp(e.clientY-drag.y,6,Math.max(6,innerHeight-dlg.offsetHeight-6))+'px';});
 const stopDrag=e=>{if(drag&&drag.id===e.pointerId){drag=null;remember();}};
 header.addEventListener('pointerup',stopDrag);header.addEventListener('pointercancel',stopDrag);header.addEventListener('lostpointercapture',stopDrag);
 const onResize=()=>{if(!dlg.isConnected)return;fit();remember();};
 const observer=typeof ResizeObserver==='function'?new ResizeObserver(onResize):null;observer?.observe(dlg);
 window.addEventListener('resize',onResize);
 dlg.addEventListener('close',()=>{observer?.disconnect();window.removeEventListener('resize',onResize);dlg.remove();});
 dlg.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();dlg.close();}});
 if(category==='stairs'||category==='rails'){
  status.remove();
  for(const item of LIB.library.filter(x=>x.cat===(category==='rails'?'Pasamanos':'Escaleras')&&!x.hideFromGallery&&x.id!=='esc-rampa')){
   const card=document.createElement('button');card.type='button';card.className='btn arq-card';card.style.cssText='display:flex;flex-direction:column;gap:5px;padding:6px;text-align:center;min-width:0';
   const preview=document.createElement('div');preview.style.cssText='background:#f4efe3;color:#343e40;border-radius:4px;width:100%';preview.innerHTML=svgFor(item,item.w,item.d,{height:142});const label=document.createElement('span');label.textContent=item.name;const size=document.createElement('small');size.textContent=fmt(item.w)+' × '+fmt(item.d)+' · '+(item.id.startsWith('rail-elev-')?'alzado':'planta')+' preliminar';card.append(preview,label,size);
   card.onclick=async()=>{if(S().tool!=='select'||S().stage.length)return CORE.toast('Terminá el comando CAD actual.');if(await armInsert(item)!==false)dlg.close();};grid.append(card);
  }
  return;
 }
 let items;try{items=await arqCatalogueIndex()}catch(e){if(dlg.isConnected)status.textContent=e.message+' · Cerrá y volvé a intentar.';return}if(!dlg.isConnected)return;
 const requestedArea=category==='house'?String(query).match(/\d+(?:[.,]\d+)?/):null;
 let filtered=items.filter(x=>x.category===category&&(!requestedArea||Math.abs(x.area-Number(requestedArea[0].replace(',','.')))<.5)).sort((a,b)=>a.area-b.area);
 const approvedPreviews=new Map();
 if(['house','bathroom'].includes(category)&&window.CAD2D_SANITARY_PREVIEW){
  status.textContent='Verificando plantas aprobadas…';let cursor=0;
  const worker=async()=>{while(dlg.isConnected&&cursor<filtered.length){const item=filtered[cursor++];try{const result=await window.CAD2D_SANITARY_PREVIEW(item.id);if(result&&!result.issues.length&&result.preview)approvedPreviews.set(item.id,result.preview);}catch(e){/* unavailable plans are omitted, not deleted */}}};
  await Promise.all(Array.from({length:Math.min(8,filtered.length)},worker));if(!dlg.isConnected)return;
  filtered=filtered.filter(item=>approvedPreviews.has(item.id));
 }
 status.remove();
 if(!filtered.length){const note=document.createElement('p');note.textContent='No hay plantas aprobadas disponibles para esta búsqueda.';grid.append(note);}
 for(const item of filtered){
  const button=document.createElement('button');button.className='btn arq-card';button.style.cssText='display:flex;flex-direction:column;gap:5px;padding:6px;text-align:center;min-width:0';
  const img=document.createElement('img');img.src=new URL(item.id+'.svg?v=20261127-bathroom-catalogue6',arqCatalogueBase).href;img.loading='lazy';img.decoding='async';img.alt=item.name;img.style.cssText='width:100%;height:142px;object-fit:contain;background:#f4efe3;border-radius:4px';button.append(img);const name=document.createElement('span');name.textContent=item.name;const size=document.createElement('span');const [w,d]=item.dimensions;size.textContent=item.category==='house'?fmt(item.area)+' m² cubiertos · '+fmt(w)+' × '+fmt(d)+' m':item.roomCount===1?fmt(w)+' × '+fmt(d)+' m · '+fmt(item.area)+' m²':fmt(item.area)+' m² útiles aprox. · Varios ambientes';size.style.opacity='.8';button.append(name,size);const roles={toilet:'Inodoro',toiletCompact:'Inodoro compacto',bidet:'Bidet',basin:'Lavatorio',basin45:'Lavatorio compacto',doubleBasin:'Doble lavatorio',doubleShower:'Doble ducha',shower:'Ducha',shower75:'Ducha compacta',bathtub:'Bañadera',bathtub150:'Bañadera 1,50',fridge:'Heladera',sink:'Bacha',range:'Cocina',island:'Isla',bed:'Cama',singlebed:'Cama individual',doublebed:'Cama doble',wardrobe:'Placard',counter:'Mesada',kingbed:'Cama king',bunk:'Cucheta',crib:'Cuna',desk:'Escritorio',washer:'Lavarropas',dryer:'Secarropas',laundrySink:'Pileta',bookshelf:'Biblioteca',table8:'Mesa para ocho'};const equipment=document.createElement('small');equipment.style.cssText='font-size:10px;opacity:.85;white-space:normal';equipment.textContent=item.roles.map(role=>roles[role]||role).join(' · ');button.append(equipment);
  if(item.preliminary){const note=document.createElement('small');note.textContent='Preliminar / Preliminary';note.style.color='#dfc28b';button.append(note);}
  button.onclick=async()=>{if(S().tool!=='select'||S().stage.length)return CORE.toast('Terminá el comando CAD actual.');const epoch=++arqCommandEpoch;button.disabled=true;
   try{const response=await fetch(new URL(item.id+'.json?v=20261127-house-framed1',arqCatalogueBase));if(!response.ok)throw Error('No se pudo descargar la planta.');let plan=await response.json();if(epoch!==arqCommandEpoch||!dlg.isConnected)return;{const checked=arqCheckSanitary(plan,LIB.library);if(checked.issues.length)throw Error('Planta pendiente de revisión sanitaria: '+checked.issues.join(' · '));plan=checked.plan;}if(plan.schema!=='blackline.architecture.v1'||!Array.isArray(plan.walls)||!Array.isArray(plan.openings)||!Array.isArray(plan.blocks))throw Error('Planta inválida.');if(plan.warning&&!window.confirm(plan.warning+'\n\n¿Insertar la propuesta editable?'))return;if(S().tool!=='select'||S().stage.length)return CORE.toast('Terminá el comando CAD actual.');dlg.close();startPick(1,'ARQASSIST · clic en origen / click origin',([p])=>{if(epoch!==arqCommandEpoch)return;try{const n=applyArchitecture(plan,p);CORE.toast('ARQASSIST · '+n+' entidades CAD')}catch(e){CORE.toast(e.message);CORE.log(e.message)}},'arq-command');pick.planPreview=plan;CORE.schedule();}
   catch(e){CORE.toast(e.message)}finally{button.disabled=false}};
  grid.append(button);
  if(approvedPreviews.has(item.id))img.src=approvedPreviews.get(item.id);
 }
 const foot=document.createElement('p');foot.style.cssText='font-size:12px;opacity:.8;margin-bottom:0;flex:none';foot.textContent='Seleccioná una planta para insertarla como muros, aberturas y bloques independientes. / Select a plan to insert editable CAD objects.';dlg.append(foot);
}

/* Free-text architecture bar is separate from the CAD command interpreter. */

// Route object names to the existing lazy-loading block browser.
function arqRasterRoomQuery(raw){
 const q=String(raw).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 const type='(?:banos?|cocinas?|habitaciones?|dormitorios?|suites?|detalles(?: constructivos)?|baths?|bathrooms?|kitchens?|bedrooms?|details?)';
 const format='(?:jpg|jpeg|png|webp|imagenes?|fotos?|images?|photos?|referencias?|references)';
 return new RegExp('^(?:'+type+'\\s+(?:en\\s+)?'+format+'|'+format+'\\s+(?:de\\s+)?'+type+')$','i').test(q);
}
function arqRasterHouseQuery(raw){
 const q=String(raw).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 return /^(?:plantas?|planos?|casas?|viviendas?|floor plans?|house plans?)\s+(?:(?:en|in)\s+)?(?:jpg|jpeg|png|webp|imagenes?|fotos?|images?|photos?|referencias?|references)$/i.test(q);
}
// "palladio", "palladio rotonda", "plantas clásicas", "vitruvio basílica"… → public-domain plates.
// Obras emblemáticas → autor (la búsqueda de clásicos trabaja por autor).
const ARQ_CLASSIC_WORKS=[[/\b(?:villa savoye|ville savoye|casa curutchet|curutchet|ronchamp|unite d ?habitation|unidad de habitacion|la tourette|ville radieuse|villa stein|villa garches)\b/,'le corbusier'],
 [/\b(?:farnsworth|pabellon de barcelona|barcelona pavilion|seagram|casa tugendhat|tugendhat|crown hall)\b/,'mies van der rohe'],
 [/\b(?:fallingwater|casa de la cascada|casa kaufmann|robie house|casa robie|guggenheim|taliesin|johnson wax)\b/,'frank lloyd wright'],
 [/\b(?:villa rotonda|la rotonda|villa capra|palazzo chiericati|villa foscari|villa emo|san giorgio maggiore)\b/,'palladio'],
 [/\b(?:sagrada familia|casa batllo|casa mila|la pedrera|park guell|parque guell|palau guell)\b/,'gaudi'],
 [/\b(?:bauhaus dessau|edificio bauhaus|casa gropius)\b/,'gropius'],
 [/\b(?:villa mairea|sanatorio de paimio|paimio)\b/,'alvar aalto'],
 [/\b(?:kimbell|salk institute|instituto salk|biblioteca de exeter|exeter library)\b/,'louis kahn']];
function arqClassicWorkAuthor(raw){const q=arqCleanRequest(raw);for(const [re,a] of ARQ_CLASSIC_WORKS)if(re.test(q))return a;return null}
function arqClassicExpand(raw){const a=arqClassicWorkAuthor(raw);return a&&!arqCleanRequest(raw).includes(a.split(' ')[0])?a+' '+raw:raw}
function arqClassicQuery(raw){
 const q=arqCleanRequest(raw);
 if(arqClassicWorkAuthor(raw))return true;
 if(/\b(?:autores|arquitectos|maestros|tratadistas|tratados|authors|architects|masters)\b.*\b(?:clasic[oa]s|historic[oa]s|antiguos|modernos|de la arquitectura|classical|classic|historic|modern)\b|\b(?:clasic[oa]s|classic(?:al)?)\b.*\b(?:autores|arquitectos|authors|architects)\b/.test(q))return true;
 return /^(?:autor(?:a)?|author|arquitect[oa]|architect)\s*:?\s+[a-z][a-z .'-]{2,70}$/i.test(q)||/\b(?:palladio|vitruvi(?:o|us|ius)|serlio|vignola|letarouilly|durand|schinkel|brunelleschi|bramante|borromini|bernini|michelangelo|miguel angel|soane|gaudi|mackintosh|adolf loos|otto wagner|louis sullivan|leon battista alberti|christopher wren|peter behrens|filarete|francesco di giorgio|scamozzi|philibert de l ?orme|fischer von erlach|piranesi|laugier|boullee|ledoux|semper|labrouste|viollet.?le.?duc|choisy|guadet|horta|berlage|sant ?elia|tony garnier|auguste perret|eliel saarinen|asplund|lutyens|le ?corbusier|mies|frank\s+l(?:l)?oy(?:d|ds|s)?\s+(?:wright|write)|wright|gropius|alvar aalto|louis kahn)\b/.test(q)||/^(?:tapas|portadas|tratados|codices)\s+(?:de\s+)?(?:arquitectura|clasic[oa]s)$/.test(q)||/^(?:plantas?|planos?|laminas?|obras?)\s+(?:clasic[oa]s?|historic[oa]s?|antiguas?)$|^(?:clasicos|plantas clasicas|classic plans|classical plans|tratados(?: de arquitectura)?)$/.test(q);
}
function arqHouseGallery(raw){
 if(arqRasterHouseQuery(raw)||arqRasterRoomQuery(raw))return true;
 const q=String(raw).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 if(/\b(?:dibujar|generar|crear|draw|generate|create)\b/.test(q))return false;
 // Tipologías del catálogo: iglesias, museos, casas con patio, vivienda colectiva… (sin medidas).
 if(window.CAD2D_BLOCK_BROWSER?.typology?.(raw))return true;
 // Cortes, vistas y planos de viviendas en CAD; departamentos y monoambientes con superficie o ambientes.
 if(/\b(?:cortes?|secciones?|vistas?|alzados?|fachadas?|sections?|elevations?)\s+(?:de\s+)?(?:casas?|viviendas?|houses?)\b/.test(q)||/\b(?:casas?|viviendas?|houses?)\s+(?:en\s+)?(?:dwg|dxf|cad)\b/.test(q))return true;
 if(/\b(?:departamentos?|deptos?|monoambientes?|apartments?|flats?|studios?)\b/.test(q)&&(/\d+(?:[.,]\d+)?\s*(?:m(?:ts?)?\s*(?:2|²|\^2)|sqm|square meters|metros cuadrados)/.test(q)||/\b\d+\s+ambientes?\b/.test(q)))return true;
 return /^(?:casas?|viviendas?|houses?|homes?|plantas?|planos? de viviendas?|floor plans?|galeria de (?:casas|plantas)|house gallery)$/.test(q)||/^(?:plantas?|floor plans?)\s+(?:de\s+)?\d+(?:[.,]\d+)?\s*(?:m(?:ts?)?\s*(?:2|²|\^2)|sqm|square meters|metros cuadrados)$/.test(q)||(/\b(?:casas?|viviendas?|houses?|homes?)\b/.test(q)&&(/\d+(?:[.,]\d+)?\s*(?:m(?:ts?)?\s*(?:2|²|\^2)|sqm|square meters|metros cuadrados)/.test(q)||/\b(?:plantas?|planos?|floor plans?|galeria|gallery)\b/.test(q)));
}
function arqOpenHouseGallery(raw){const b=window.CAD2D_BLOCK_BROWSER;if(!b?.openHouses)return CORE.toast('Galería de viviendas no disponible');EXT.cancelArchitectureCommand();b.openHouses(arqRasterHouseQuery(raw)?'Casas referencias':raw);}
function arqWebReference(raw){
 const q=String(raw).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 if(/^(?:web|referencias?|reference|buscar web)\s*[: ]/.test(q))return true;
 // "auto en planta", "árbol en planta": a view of an object, not a request for floor-plan references.
 if(/^(?:quiero |necesito |un |una )*[a-z]+(?:\s+[a-z]+)?\s+(?:en|de|vista en|vista de)\s+planta$/.test(q)&&!/^(?:casa|vivienda|departamento|edificio|oficina|planta)\b/.test(q))return false;
 if(/\b(?:casas?|viviendas?|houses?|homes?)\b/.test(q)&&/\d+(?:[.,]\d+)?\s*(?:m(?:ts?)?\s*(?:2|²|\^2)|sqm|square meters|metros cuadrados)/.test(q))return true;
 return /\b(?:planos?|plantas?|floor plans?|detalles constructivos|construction details|fachadas?|facades?|architectural references)\b/.test(q)&&!/\b(?:dibujar|generar|crear|draw|generate|create)\b/.test(q);
}
const arqTypologyBase=new URL('assets/arq-tipologias/v1/',document.baseURI);

// Shared residential sanitary QA: same wall, right preferred, privacy, clearance and collision checks.
function arqCheckSanitary(plan,library){
 const lib=new Map(library.map(x=>[x.id,x])),eps=1e-6;
 const pairId=b=>/^san-(?:wc(?:-compact|-susp)?|bidet)$/.test(b.catalogId),bidet=b=>b.catalogId==='san-bidet';
 const dims=b=>b.nominalSize||[lib.get(b.catalogId)?.w,lib.get(b.catalogId)?.d];
 const box=b=>{const [w,d]=dims(b),a=(b.rotation||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a),k=b.scale||1;
  if(!Number.isFinite(w)||!Number.isFinite(d))return null;
  const xy=[[0,0],[w,0],[w,d],[0,d]].map(([x,y])=>[b.point[0]+k*(x*c-y*s),b.point[1]+k*(x*s+y*c)]);
  return [Math.min(...xy.map(p=>p[0])),Math.min(...xy.map(p=>p[1])),Math.max(...xy.map(p=>p[0])),Math.max(...xy.map(p=>p[1]))]};
 const overlaps=(a,b)=>a[0]<b[2]-eps&&b[0]<a[2]-eps&&a[1]<b[3]-eps&&b[1]<a[3]-eps;
 const inside=(a,r)=>a&&a[0]>=r[0]-eps&&a[1]>=r[1]-eps&&a[2]<=r[2]+eps&&a[3]<=r[3]+eps;
 const clone=JSON.parse(JSON.stringify(plan)),walls=new Map(clone.walls.map(w=>[w.id,w])),issues=[],moved=[],assigned=new Set();
 for(const room of clone.rooms||[]){
  if(!/^(?:bath|bathroom|suite|toil|toilette)$/.test(room.kind)||!Array.isArray(room.clearBounds))continue;
  const [x,y,w,h]=room.clearBounds,R=[x,y,x+w,y+h],own=clone.blocks.filter(b=>inside(box(b),R));
  const sanitary=own.filter(pairId),wc=sanitary.filter(b=>!bidet(b)),bd=sanitary.filter(bidet);
  if(!sanitary.length&&!own.some(b=>/^san-banera/.test(b.catalogId)))continue;
  if(wc.length>1&&!bd.length&&!own.some(b=>/^san-banera/.test(b.catalogId))){sanitary.forEach(b=>assigned.add(b));continue} // public multi-stall rooms are not a residential pair
  if(wc.length===1&&!bd.length){
   if(own.some(b=>/san-lav-acc|san-ducha-piso/.test(b.catalogId))){sanitary.forEach(b=>assigned.add(b));issues.push(room.id+': baño accesible requiere revisión de transferencia antes de añadir bidé');continue;}
   const b={catalogId:'san-bidet',role:'bidet',point:[...wc[0].point],rotation:wc[0].rotation,scale:1,layer:'FIXTURES',envelope:[0,0,0,0]};
   bd.push(b);sanitary.push(b);
  }
  if(wc.length!==1||bd.length>1){issues.push(room.id+': conjunto sanitario ausente o ambiguo');continue}
  sanitary.forEach(b=>assigned.add(b));
  const sideOf=wall=>{
   if(Math.abs(wall.a[0]-wall.b[0])<eps){const c=wall.a[0],t=wall.thickness/2;if(Math.abs(c+t-x)<.015)return 'W';if(Math.abs(c-t-R[2])<.015)return 'E'}
   if(Math.abs(wall.a[1]-wall.b[1])<eps){const c=wall.a[1],t=wall.thickness/2;if(Math.abs(c+t-y)<.015)return 'S';if(Math.abs(c-t-R[3])<.015)return 'N'}
   return null;
  };
  const horizontal=s=>s==='S'||s==='N',axis=(s,p)=>horizontal(s)?p[0]:p[1];
  const intervals={W:[],E:[],S:[],N:[]},openings={W:[],E:[],S:[],N:[]},doors=[],view=[],doorSides=new Set();
  for(const wall of clone.walls){const s=sideOf(wall);if(s)intervals[s].push([Math.min(axis(s,wall.a),axis(s,wall.b)),Math.max(axis(s,wall.a),axis(s,wall.b))])}
  for(const o of clone.openings){
   const wall=walls.get(o.host);if(!wall)continue;const s=sideOf(wall);if(!s)continue;
   const dx=wall.b[0]-wall.a[0],dy=wall.b[1]-wall.a[1],len=Math.hypot(dx,dy);if(!len)continue;
   const cx=wall.a[0]+dx*o.offset/len,cy=wall.a[1]+dy*o.offset/len,half=o.width/2+.05;
   const t=horizontal(s)?cx:cy,low=horizontal(s)?x:y,high=horizontal(s)?R[2]:R[3];
   if(t+half<=low||t-half>=high)continue;
   openings[s].push([t-half,t+half]);
   if(!/door/i.test(o.kind))continue;
   doorSides.add(s);
   const dir=(horizontal(s)?dx:dy)/len*(o.orientation?.reverseHostDirection?-1:1)*(o.orientation?.mirror?-1:1),hinge=t-dir*o.width/2; doors.push({side:s,hinge,dir,width:o.width,face:s==='S'?y:s==='N'?R[3]:s==='W'?x:R[2]});
   // Conservative straight-ahead sight corridor through the whole opening;
   // oblique views and 3D screening still need architectural review.
   const v=o.width/2+.10;
   view.push({side:s,rect:horizontal(s)?[cx-v,y,cx+v,R[3]]:[x,cy-v,R[2],cy+v]});
  }
  if(!doorSides.size){issues.push(room.id+': acceso no identificado');continue}
  const basin=own.filter(b=>/^san-lav/.test(b.catalogId)),wet=own.filter(b=>/^san-(?:ducha|banera)/.test(b.catalogId)),other=own.filter(b=>!pairId(b)&&!basin.includes(b)&&!wet.includes(b)).map(box).filter(Boolean);let fixed=[...other,...wet.map(box)];
  function candidate(b,s,t,clearance=.50,allowWindow=false){
   const [bw,dd]=dims(b),k=b.scale||1,a=bw*k,d=dd*k;
   if(!Number.isFinite(a)||!Number.isFinite(d))return null;
   const fp=s==='W'?[x,t,x+d,t+a]:s==='E'?[R[2]-d,t,R[2],t+a]:s==='S'?[t,y,t+a,y+d]:[t,R[3]-d,t+a,R[3]];
   const front=s==='W'?[x+d,t,x+d+clearance,t+a]:s==='E'?[R[2]-d-clearance,t,R[2]-d,t+a]:s==='S'?[t,y+d,t+a,y+d+clearance]:[t,R[3]-d-clearance,t+a,R[3]-d];
   const rotation={W:270,E:90,S:0,N:180}[s],point=s==='W'?[x,t+a]:s==='E'?[R[2],t]:s==='S'?[t,y]:[t+a,R[3]];
   if(!inside(fp,R)||!inside(front,R)||!intervals[s].some(z=>z[0]<=t+eps&&z[1]>=t+a-eps)||(!allowWindow&&openings[s].some(z=>t<z[1]&&t+a>z[0])))return null;
   return {b,fp,front,rotation,point:point.map(n=>Math.round(n*1000)/1000)};
  }
  const conflict=(a,obs)=>obs.some(z=>overlaps(a.fp,z)||overlaps(a.front,z));
  const sweep=(fp,o)=>{const h=horizontal(o.side),along=h?[fp[0],fp[2]]:[fp[1],fp[3]],across=h?[fp[1],fp[3]]:[fp[0],fp[2]],u=along.map(v=>(v-o.hinge)*o.dir).sort((a,b)=>a-b),v=across.map(v=>(v-o.face)*(['S','W'].includes(o.side)?1:-1)).sort((a,b)=>a-b);return u[1]>eps&&v[1]>eps&&Math.hypot(Math.max(0,u[0]),Math.max(0,v[0]))<o.width-.001;};
  const near=(fp,o)=>{const dist=o.side==='S'?fp[1]-y:o.side==='N'?R[3]-fp[3]:o.side==='W'?fp[0]-x:R[2]-fp[2];return dist<.35-eps;};
  const opposite={S:'N',N:'S',W:'E',E:'W'};
  const orders=bd.length?[[wc[0],bd[0]],[bd[0],wc[0]]]:[[wc[0]]];let best=null;
  function search(strict=true){
  for(const side of ['W','E']){
   if(doorSides.has(side))continue;
   const lo=horizontal(side)?x:y,hi=horizontal(side)?R[2]:R[3];
   for(const order of orders)for(const gap of (w*h<3.6?[.10,.20,.25]:[.25,.20]))for(let at=lo+.05;at<=hi;at+=.025){
    let t=at,layout=[],ok=true,score=side==='W'?0:side==='E'?100:200;
    for(const b of order){const c=candidate(b,side,t);if(!c||conflict(c,fixed)||doors.some(o=>sweep(c.fp,o)||near(c.fp,o))||view.some(z=>(strict||side===opposite[z.side])&&overlaps(c.fp,z.rect))){ok=false;break}
     score+=Math.hypot(c.point[0]-b.point[0],c.point[1]-b.point[1]);layout.push(c);t+=dims(b)[0]*(b.scale||1)+gap;
    }
    if(!ok)continue;
    for(const b of basin){const old=box(b),obstacles=[...fixed,...layout.flatMap(q=>[q.fp,q.front])];if(((b.rotation||0)%360+360)%360!==({W:270,E:90,S:0,N:180}[side])&&inside(old,R)&&!obstacles.some(z=>overlaps(old,z))&&!doors.some(o=>sweep(old,o))){layout.push({b,fp:old,front:old,point:b.point,rotation:b.rotation,keep:true});continue}
     let pick=null;
     for(const bs of ['E','N','S','W']){if(bs===side)continue;const l=horizontal(bs)?x:y,u=horizontal(bs)?R[2]:R[3];for(let pos=l+.05;pos<=u;pos+=.05){const c=candidate(b,bs,pos);if(!c||conflict(c,obstacles)||doors.some(o=>sweep(c.fp,o)))continue;const d=Math.hypot(c.point[0]-b.point[0],c.point[1]-b.point[1]);if(!pick||d<pick.d)pick={...c,d}}}
     if(!pick){ok=false;break}score+=2+pick.d;layout.push(pick);
    }
    if(ok&&(!best||score<best.score))best={layout,score};
   }
  }
  }
  search();
  if(!best&&wet.length===1){
    const b=wet[0],options=[];
    for(const side of ['N','S','E','W']){if(doorSides.has(side))continue;const lo=horizontal(side)?x:y,hi=horizontal(side)?R[2]:R[3];for(let t=lo;t<=hi;t+=.10){const c=candidate(b,side,t,.45,true);if(!c||doors.some(o=>sweep(c.fp,o)||sweep(c.front,o))||conflict(c,other))continue;options.push({...c,cost:Math.hypot(c.point[0]-b.point[0],c.point[1]-b.point[1])});}}
    options.sort((a,b)=>a.cost-b.cost);
    for(const q of options.slice(0,35)){fixed=[...other,q.fp,q.front];search();if(best){best.layout.push(q);break;}}
  }
  // Compact rooms: a lateral fixture may project into the doorway's sight strip,
  // but may never face the entrance or touch the actual door sweep.
  if(!best){fixed=[...other,...wet.map(box)];search(false);}
  if(!best&&wet.length===1){const b=wet[0];for(const side of ['N','S','E','W']){if(doorSides.has(side))continue;const lo=horizontal(side)?x:y,hi=horizontal(side)?R[2]:R[3];for(let t=lo;t<=hi;t+=.05){const c=candidate(b,side,t,.45,true);if(!c||doors.some(o=>sweep(c.fp,o)||sweep(c.front,o))||conflict(c,other))continue;fixed=[...other,c.fp,c.front];search(false);if(best){best.layout.push(c);break;}}if(best)break;}}
  if(!best){issues.push(room.id+': no cabe inodoro + bidé juntos en pared lateral con lavatorio separado; redistribuir baño');continue}
  for(const b of bd)if(!clone.blocks.includes(b)){clone.blocks.push(b);moved.push('added:san-bidet');if(Array.isArray(clone.brief?.fixtures)&&!clone.brief.fixtures.includes('bidet'))clone.brief.fixtures.push('bidet');}
  for(const q of best.layout){if(q.keep)continue;const changed=q.b.rotation!==q.rotation||q.b.point.some((v,i)=>Math.abs(v-q.point[i])>eps);q.b.point=q.point;q.b.rotation=q.rotation;if(q.b.footprint)q.b.footprint=q.fp;if(q.b.box)q.b.box=q.fp;if(q.b.envelope)q.b.envelope=[q.fp[0],q.fp[1],q.fp[2]-q.fp[0],q.fp[3]-q.fp[1]];if(changed)moved.push(q.b.catalogId)}
 }
 for(const b of clone.blocks.filter(pairId))if(!assigned.has(b)&&clone.rooms?.some(r=>/^(?:bath|bathroom|suite|toil|toilette)$/.test(r.kind)))issues.push('Sanitario fuera de un baño identificado: '+b.catalogId);
 return {plan:clone,issues,moved};
}

async function insertCataloguePlanById(id,isCurrent=()=>true){
 const typology=/^T-[A-Z0-9-]{1,8}-\d{3}[a-z]$/.test(id);
 if(!typology&&!/^plan-\d+$/.test(id))throw Error('Identificador de planta inválido');
 if(S().tool!=='select'||S().stage.length)throw Error('Terminá el comando CAD actual.');
 const epoch=++arqCommandEpoch;
 const response=await fetch(new URL(id+'.json?v=20261127-house-framed1',typology?arqTypologyBase:arqCatalogueBase));if(!response.ok)throw Error('No se pudo descargar la planta.');
 let plan=await response.json();if(epoch!==arqCommandEpoch||!isCurrent())return false;
 if(plan.schema!=='blackline.architecture.v1'||!Array.isArray(plan.walls)||!Array.isArray(plan.openings)||!Array.isArray(plan.blocks))throw Error('Planta inválida.');
 {const checked=arqCheckSanitary(plan,LIB.library);if(checked.issues.length)throw Error('Planta pendiente de revisión sanitaria: '+checked.issues.join(' · '));plan=checked.plan;}
 if(plan.warning&&!window.confirm(plan.warning+'\n\n¿Insertar la propuesta editable?'))return false;
 if(S().tool!=='select'||S().stage.length||!isCurrent())return false;
 startPick(1,'ARQASSIST · clic en origen / click origin',([p])=>{if(epoch!==arqCommandEpoch)return;try{const n=applyArchitecture(plan,p);CORE.toast('ARQASSIST · '+n+' entidades CAD')}catch(e){CORE.toast(e.message);CORE.log(e.message)}},'arq-command');pick.planPreview=plan;CORE.schedule();return true;
}
window.CAD2D_INSERT_CATALOGUE_PLAN=insertCataloguePlanById;
// Preview and insertion use the same validated native geometry, not stale raster files.
const arqSanitaryPreviewCache=new Map();
window.CAD2D_SANITARY_PREVIEW=async id=>{if(!/^(?:plan-\d+|T-[A-Z0-9-]{1,8}-\d{3}[a-z])$/.test(id))throw Error('Identificador inválido');if(!arqSanitaryPreviewCache.has(id)){const p=fetch(new URL(id+'.json?v=20261127-house-framed1',id.startsWith('T-')?arqTypologyBase:arqCatalogueBase)).then(r=>{if(!r.ok)throw Error('Planta no disponible');return r.json()}).then(plan=>{const result=arqCheckSanitary(plan,LIB.library);return {issues:result.issues,moved:result.moved.length,preview:result.issues.length?null:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(arqPlanThumbnail(result.plan))}}).catch(e=>{arqSanitaryPreviewCache.delete(id);throw e});arqSanitaryPreviewCache.set(id,p);}return arqSanitaryPreviewCache.get(id);};
function arqOpenWebReference(raw){const b=window.CAD2D_BLOCK_BROWSER;if(!b?.openWeb)return CORE.toast('Visor web no disponible');EXT.cancelArchitectureCommand();b.openWeb(raw);}
function arqObjectSearch(raw){
 const q=arqCleanRequest(String(raw).replace(/^\s*(?:bloques? de)\s+/i,''));
 const groups=[['anafe',/^(?:anafes?|cooktops?|hobs?|placa de coccion)$/],['horno',/^(?:hornos?|ovens?)$/],['cocina a gas',/^(?:cocina a gas|gas stove|stove|estufa)$/],['microondas',/^(?:microondas|microwaves?)$/],['inodoro',/^(?:inodoros?|wc|toilets?|retretes?)$/],['arbol',/^(?:arbol(?:es)?|trees?)$/],['auto',/^(?:autos?|automovil(?:es)?|coches?|cars?|vehiculos?)$/],['bidet',/^(?:bidets?|bides?)$/],['lavatorio',/^(?:lavatorios?|lavabos?|bachas?|sinks?|basins?)$/],['ducha',/^(?:duchas?|showers?)$/],['banera',/^(?:baneras?|banaderas?|bathtubs?)$/],['puerta',/^(?:puertas?|doors?)$/],['ventana',/^(?:ventanas?|windows?)$/],['cama',/^(?:camas?|beds?)$/],['mesa',/^(?:mesas?|tables?)$/],['silla',/^(?:sillas?|chairs?)$/],['sofa',/^(?:sofas?|sillones?|couches?)$/],['heladera',/^(?:heladeras?|frigorificos?|refrigeradores?|refrigerators?|fridges?)$/],['persona',/^(?:personas?|people|person)$/],['palmera',/^(?:palmeras?|palm trees?)$/],['camion',/^(?:camion(?:es)?|trucks?)$/],['bicicleta',/^(?:bicicletas?|bicycles?)$/],['moto',/^(?:motos?|motocicletas?|motorcycles?)$/]];
 for(const [term,re] of groups)if(re.test(q))return term;
 // Explicit object searches accept every catalogue name, including model numbers.
 const explicit=/^(?:buscar|insertar|importar|colocar|bloques? de|search|insert|import|place)\s+/i.test(raw.trim());
 if(!q||q.length>160)return null;
 if(explicit)return q;
 // Keep room generation and dimensioned architectural instructions separate.
 if(arqCatalogueCategory(raw)||/^(?:calco|calcar|calcar planta|traceplan|trace plan)$/i.test(q))return null;
 if(/\d\s*(?:[x×*]|por|by)\s*\d|\b(?:dibujar|generar|crear|disenar|draw|generate|create|design)\b/.test(q))return null;
 if(/\b(?:habitacion(?:es)?|dormitorios?|bedrooms?|banos?|bathrooms?|cocinas?|kitchens?)\b/.test(q)&&/\d|\b(?:con|with|suite|vestidor|fila|tandem)\b/.test(q))return null;
 return q;
}
function arqOpenObjectSearch(term){
 const browser=window.CAD2D_BLOCK_BROWSER;
 if(!browser?.openSearch){CORE.toast('Explorador de bloques no disponible / Block browser unavailable');return;}
 EXT.cancelArchitectureCommand();browser.openSearch(term);
}
function openArchitectureBar(focus=true){
 let bar=document.getElementById('cadArqInstructionBar');
 if(!bar){
  const host=document.getElementById('canvasWrap');if(!host)return;
  const css=document.createElement('style');css.id='cadArqBarStyle';css.textContent=`
#cadArqInstructionBar{width:min(620px,calc(100% - 12px));box-sizing:border-box;color:#f2f5f7}
#cadArqInstructionBar button{flex:none}
#cadArqInstructionBar button:disabled{opacity:.4;cursor:wait}
#cadArqInstructionBar .qb-handle{touch-action:none}
#cadArqInstructionBar .qb-sep{flex:none}
#cadArqInstructionBar b{font:600 11px Arial,sans-serif;white-space:nowrap;padding:0 3px}
#cadArqInstructionBar textarea{flex:1;min-width:0;width:100%;height:30px;min-height:30px;max-height:192px;resize:none;overflow-y:hidden;box-sizing:border-box;background:transparent;border:0;border-radius:15px;padding:6px 8px;color:inherit;font:12px/18px Arial,sans-serif;user-select:text;touch-action:auto;white-space:pre-wrap;overflow-wrap:anywhere}
#cadArqInstructionBar textarea:focus-visible{outline:2px solid #9adff3}
#cadArqInstructionBar textarea::placeholder{color:#929aa1}
.bl-light #cadArqInstructionBar{color:#18232b}
#cadArqInstructionBar.arq-min{width:auto}
#cadArqInstructionBar.arq-expanded{border-radius:22px;align-items:flex-start}
#cadArqInstructionBar.arq-expanded b{margin-top:11px}
#cadArqInstructionBar.arq-expanded .qb-sep{margin-top:6px}
#cadArqInstructionBar.arq-min textarea,#cadArqInstructionBar.arq-min button[aria-label="Abrir catálogo de plantas"],#cadArqInstructionBar.arq-min [data-arq-run],#cadArqInstructionBar.arq-min .qb-sep{display:none}
`;document.head.append(css);
  bar=document.createElement('div');bar.id='cadArqInstructionBar';bar.setAttribute('role','region');bar.setAttribute('aria-label','ARQASSIST');
  bar.innerHTML='<button class="qb-handle" type="button" title="Arrastrar · doble clic para plegar / Drag · double-click to collapse">⠿</button><b>ARQASSIST</b><span class="qb-sep"></span><textarea rows="1" wrap="soft" data-arq-text aria-label="Architectural instruction" autocomplete="off" spellcheck="false" placeholder="Habitaciones x 5 · Pileta 8 x 4 · Cocheras x 6 de 2,5 x 5"></textarea><span class="qb-sep"></span><button type="button" data-arq-run title="Dibujar / Draw" aria-label="Dibujar / Draw"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg></button><button type="button" data-arq-close title="Ocultar / Hide ARQASSIST" aria-label="Ocultar / Hide"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button>';
  host.append(bar);
  const input=bar.querySelector('[data-arq-text]'),run=bar.querySelector('[data-arq-run]'),handle=bar.querySelector('.qb-handle');
  const catalogue=document.createElement('button');catalogue.type='button';catalogue.className='btn slim';catalogue.hidden=true;catalogue.style.cssText='white-space:nowrap;font-size:11px;flex:none;width:auto;min-width:max-content;padding:0 10px;margin-right:6px';catalogue.setAttribute('aria-label','Abrir catálogo de plantas');bar.insertBefore(catalogue,run);
  const updateCatalogue=()=>{if(arqHouseDesignRequest(input.value)||arqRestaurantRequest(input.value)||arqAuditoriumRequest(input.value)||arqClassroomRequest(input.value)||arqSanitaryBatteryRequest(input.value)||arqParkingRequest(input.value)||arqPoolRequest(input.value)||arqRoomSetRequest(input.value)){catalogue.hidden=true;catalogue.style.display='none';resizeText();return;}if(arqRoomCAD(input.value)){catalogue.hidden=false;catalogue.style.display='';let spanish=false;try{spanish=/^es/i.test(localStorage.getItem('cad2d-alias-language')||'')}catch(e){}catalogue.textContent=spanish?'Ver CAD':'View CAD';catalogue.title=spanish?'Plantas CAD editables':'Editable CAD plans';resizeText();return;}if(arqClassicQuery(input.value)){catalogue.hidden=false;catalogue.style.display='';catalogue.textContent=(()=>{try{return localStorage.getItem('cad2d-alias-language')==='es'?'Plantas clásicas':'Classic plans'}catch(e){return 'Classic plans'}})();catalogue.title='Plantas, cortes y vistas / Plans, sections and elevations';resizeText();return;}if(arqHouseGallery(input.value)){catalogue.hidden=false;catalogue.style.display='';catalogue.textContent='Viviendas';catalogue.title='Galería de viviendas por superficie';resizeText();return;}if(arqWebReference(input.value)){catalogue.hidden=false;catalogue.style.display='';catalogue.textContent='Ver web';catalogue.title='Referencias arquitectónicas';resizeText();return;}const category=arqCatalogueCategory(input.value);const object=!category&&arqObjectSearch(input.value);catalogue.hidden=!(category||object);catalogue.style.display=category||object?'':'none';if(object){catalogue.textContent='Ver bloques';catalogue.title='Buscar e insertar bloques';}if(category){catalogue.textContent=((category==='stairs'||category==='rails')?LIB.library.filter(x=>x.cat===(category==='rails'?'Pasamanos':'Escaleras')&&!x.hideFromGallery&&x.id!=='esc-rampa').length:(arqCatalogueCounts[category]||0))+' modelos';catalogue.title='Ver plantas y dimensiones';}resizeText();};
  catalogue.onclick=()=>{if(arqRoomCAD(input.value)){if(S().tool!=='select'||S().stage.length)return CORE.toast('Terminá el comando CAD actual.');arqOpenRoomCAD(input.value);return;}if(arqClassicQuery(input.value)){const b=window.CAD2D_BLOCK_BROWSER;if(b?.openClassics){EXT.cancelArchitectureCommand();b.openClassics(arqClassicExpand(input.value));}return;}if(arqHouseGallery(input.value)){if(S().tool!=='select'||S().stage.length)return CORE.toast('Terminá el comando CAD actual.');arqOpenHouseGallery(input.value);return;}if(arqWebReference(input.value)){if(S().tool!=='select'||S().stage.length)return CORE.toast('Terminá el comando CAD actual.');arqOpenWebReference(input.value);return;}const cat=arqCatalogueCategory(input.value);const object=!cat&&arqObjectSearch(input.value);if(!cat&&!object)return;if(S().tool!=='select'||S().stage.length)return CORE.toast('Terminá el comando CAD actual.');if(object){arqOpenObjectSearch(object);return;}EXT.cancelArchitectureCommand();openArqPlanCatalogue(cat,input.value);};

  const KEY='cad2d-arqbar-pos';
  const place=(x,y)=>{const w=host.clientWidth,h=host.clientHeight;x=Math.max(4,Math.min(w-bar.offsetWidth-4,x));y=Math.max(4,Math.min(h-bar.offsetHeight-4,y));bar.style.left=x+'px';bar.style.top=y+'px'};
  const resizeText=()=>{if(bar.style.display==='none'||bar.classList.contains('arq-min'))return;input.style.height='30px';const h=Math.max(30,Math.min(192,input.scrollHeight));input.style.height=h+'px';input.style.overflowY=input.scrollHeight>h?'auto':'hidden';bar.classList.toggle('arq-expanded',h>34);place(bar.offsetLeft,bar.offsetTop)};
  input.addEventListener('input',updateCatalogue);bar.arqResize=updateCatalogue;
  let pos=null;try{pos=JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){}
  requestAnimationFrame(()=>{const quick=document.getElementById('cadQuickBar');if(Array.isArray(pos)&&pos.length===2&&pos.every(Number.isFinite))place(...pos);else if(quick&&quick.offsetWidth){const x=quick.offsetLeft+quick.offsetWidth+8;place(x+bar.offsetWidth<=host.clientWidth?x:quick.offsetLeft,x+bar.offsetWidth<=host.clientWidth?quick.offsetTop:quick.offsetTop+quick.offsetHeight+8)}else place((host.clientWidth-bar.offsetWidth)/2,60)});
  window.addEventListener('resize',()=>{if(bar.style.display!=='none')resizeText()});
  let drag=null;handle.addEventListener('pointerdown',e=>{drag={dx:e.clientX-bar.offsetLeft,dy:e.clientY-bar.offsetTop};handle.setPointerCapture(e.pointerId);e.preventDefault();e.stopPropagation()});
  handle.addEventListener('pointermove',e=>{if(drag)place(e.clientX-drag.dx,e.clientY-drag.dy)});
  const endDrag=()=>{if(!drag)return;drag=null;try{localStorage.setItem(KEY,JSON.stringify([bar.offsetLeft,bar.offsetTop]))}catch(e){}};
  handle.addEventListener('pointerup',endDrag);handle.addEventListener('pointercancel',endDrag);
  handle.addEventListener('dblclick',()=>{bar.classList.toggle('arq-min');if(!bar.classList.contains('arq-min'))resizeText();else{bar.classList.remove('arq-expanded');place(bar.offsetLeft,bar.offsetTop)}});
  const submit=async()=>{
   const raw=input.value.trim().replace(/\s+/g,' ');if(!raw){input.focus();return}
   if(S().tool!=='select'||S().stage.length){CORE.toast('Terminá el comando CAD actual o presioná Esc / Finish current CAD command first');return}
   const route=arqRouteOf(raw);
   if(route.kind==='calco'){EXT.cancelArchitectureCommand();if(window.CAD2D_CALCO)await window.CAD2D_CALCO();else CORE.toast('CALCO no disponible; actualizá la página.');return;}
   if(route.kind==='furnish'){EXT.cancelArchitectureCommand();arqFurnish(raw);return;}
   if(route.kind==='wall'){EXT.cancelArchitectureCommand();const v=route.length*1000/CORE.U[S().unit],txt=String(+v.toFixed(4)).replace('.',',');CORE.command('MURO');CORE.toast(T('WALL · click the start point, move in the direction and type '+txt+' ⏎','MURO · clic en el punto inicial, mové hacia la dirección y escribí '+txt+' ⏎'));return;}
   if(route.kind==='docs'){EXT.cancelArchitectureCommand();window.CAD2D_ARQ_DOCS.open(route.docs,raw);return;}
   if(route.kind==='classic'){const b=window.CAD2D_BLOCK_BROWSER;if(b?.openClassics){EXT.cancelArchitectureCommand();b.openClassics(arqClassicExpand(raw));}return;}
   if(route.kind==='roomcad'){arqOpenRoomCAD(raw);return;}
   if(route.kind==='house'){arqOpenHouseGallery(raw);return;}
   if(route.kind==='web'){arqOpenWebReference(raw);return;}
   if(route.kind==='catalogue'){EXT.cancelArchitectureCommand();openArqPlanCatalogue(route.category,raw);return;}
   if(route.kind==='object'){arqOpenObjectSearch(route.object);return;}
   run.disabled=true;try{await EXT.drawArchitectureCommand(raw)}finally{run.disabled=false}
  };
  input.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();submit()}else if(e.key==='Escape'){EXT.cancelArchitectureCommand();input.blur()}});
  for(const type of ['pointerdown','pointerup','mousedown','click','wheel','contextmenu','keyup','keypress'])bar.addEventListener(type,e=>e.stopPropagation());
  run.addEventListener('click',submit);
  bar.querySelector('[data-arq-close]').onclick=()=>{EXT.cancelArchitectureCommand();bar.style.display='none';syncArchitectureToggle()};
 }
 bar.style.display='flex';if(focus){bar.classList.remove('arq-min');bar.querySelector('[data-arq-text]').focus();}bar.arqResize?.();syncArchitectureToggle();
}
// «muro de 5 m», «pared de 3,20 metros», «tabique 250 cm», «wall 4 m» → orden MURO con la longitud indicada.
function arqWallRequest(raw){
 const q=String(raw||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[¿?¡!;:]+/g,' ').replace(/\s+/g,' ').trim().replace(/^(?:por favor\s+)?(?:dibuja\w*|traza\w*|hace\w*|haz|draw|quiero|necesito)\s+(?:un\s+|una\s+|a\s+)?/,'').replace(/\.$/,'');
 const m=q.match(/^(?:muro|pared|tabique|wall)\s+(?:de\s+|of\s+)?(\d+(?:[.,]\d+)?)\s*(cm|centimetros?|mm|m|mts?|metros?|meters?|metres?)?(?:\s+(?:de\s+)?(?:largo|longitud|long))?$/);
 if(!m)return null;const n=Number(m[1].replace(',','.')),u=m[2]||'m',meters=/^c/.test(u)?n/100:/^mm/.test(u)?n/1000:n;
 return meters>0&&meters<=500?meters:null;
}
// Decisión de ARQ Assist para un pedido (sin efectos): la usa el envío y sirve para medir aciertos.
// Repeated room requests are drawing commands, not block-catalogue queries.
function arqRestaurantRequest(raw){
 const s=String(raw||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 return /^(?:(?:quiero|necesito|dibujar|dibuja|crear|generar|draw|create|generate)\s+)*(?:restaurantes?|restoran(?:es)?|restaurants?|comedores gastronomicos?|salones gastronomicos?)\b/.test(s)&&/\d/.test(s)&&!/\b(?:jpg|png|fotos?|references|referencias)\b/.test(s);
}
function arqAuditoriumRequest(raw){
 const s=String(raw||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 return /^(?:(?:quiero|necesito|dibujar|dibuja|crear|generar|draw|create|generate)\s+)*(?:auditorios?|teatros?|salas? de cine|cines?|auditoriums?|theaters?|theatres?|cinemas?)\b/.test(s)&&/\d/.test(s)&&!/\b(?:jpg|png|fotos?|references|referencias)\b/.test(s);
}
function arqClassroomRequest(raw){
 const s=String(raw||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 return /^(?:(?:quiero|necesito|dibujar|dibuja|crear|generar|draw|create|generate)\s+)*(?:\d+\s+)?(?:aulas?|classrooms?|salones de clase)\b/.test(s)&&/\b(?:alumnos?|estudiantes?|pupitres?|students?|desks?)\b/.test(s)&&!/\b(?:jpg|png|fotos?|references|referencias)\b/.test(s);
}
function arqSanitaryBatteryRequest(raw){
 const s=String(raw||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 return /^(?:(?:quiero|necesito|dibujar|dibuja|crear|generar|draw|create|generate)\s+)*(?:\d+\s+)?(?:banos? (?:publicos?|colectivos?|en bateria)|bateria de (?:banos?|sanitarios?)|sanitarios? en bateria|vestuarios? deportivos?|public bathrooms?|public restrooms?)\b/.test(s)&&/\d/.test(s)&&!/\b(?:jpg|png|fotos?|references|referencias)\b/.test(s);
}
function arqParkingRequest(raw){
 const s=String(raw||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 const head=s.match(/^(?:(?:por favor|quiero|necesito|dibujar|dibuja|generar|genera|crear|crea|colocar|insertar|draw|create|generate|insert)\s+)*(?:(\d+|un|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|one|two|three|four|five|six|seven|eight|nine|ten)\s+)?(?:(modulos? de\s+))?(?:playa de estacionamiento|plazas? de estacionamiento|estacionamientos?|cocheras?|garajes?|garages?|parking(?: spaces?)?)\b/);
 if(!head||/\b(?:jpg|png|fotos?|references|referencias)\b/.test(s))return false;
 const rest=s.slice(head[0].length).trim();
 return !!(head[1]||head[2]||/\b(?:tandem|fila|hilera|contigu[ao]s?|dobles?|row|side by side|set|serie|enfrentad[ao]s?|opuestas?|opposed)\b/.test(rest)||/\d+\s*(?:°|grados?|degrees?)/.test(rest)||/^[x×*]\s*\d+/.test(rest)||(/estacionamiento|parking/.test(head[0])&&/\d/.test(rest)));
}
function arqPoolRequest(raw){
 const s=String(raw||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 return /^(?:(?:por favor|quiero|necesito|dibujar|dibuja|generar|genera|crear|crea|colocar|insertar|draw|create|generate|insert)\s+)*(?:(?:\d+|un|una|dos|tres|cuatro|cinco|one|two|three|four|five)\s+)?(?:piletas?|piscinas?|swimming pools?|pools?)\b/.test(s)&&/\d/.test(s)&&!/\b(?:de lavar|lavadero|cocina|sink|jpg|png|fotos?|references|referencias)\b/.test(s);
}
function arqRoomSetRequest(raw){
 const s=String(raw||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 if(/\b(?:buscar|busca|mostrar|mostrame|search|find|show|fotos?|jpg|png|referencias?|references)\b/.test(s))return false;
 const room='(?:habitacion(?:es)?|dormitorios?|cuartos?|banos?|bedrooms?|bathrooms?|oficinas?|despachos?|offices?|aulas?|classrooms?|salones de clase|cocinas?|kitchens?|lavaderos?|laundry|depositos?|storerooms?|vestidores?|closets?|consultorios?|consulting rooms?|locales?|locales comerciales|shops?)';
 const quantity='(?:\\d+(?:[.,]\\d+)?|un|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|one|two|three|four|five|six|seven|eight|nine|ten)';
 const set='(?:tandem|set|fila|row|conjunto|serie)';
 return new RegExp('\\b'+room+'\\s*(?:(?:en|in|de)\\s+)?(?:'+set+'\\s*(?:(?:de|of)\\s+)?)?(?:[x×*]|:|cantidad\\s*[:=]?)\\s*'+quantity+'(?=\\s|$)').test(s)||
  (new RegExp('\\b'+room+'\\b').test(s)&&new RegExp('\\b'+set+'\\b').test(s)&&new RegExp('\\b'+quantity+'\\b').test(s));
}
// Programa de vivienda ("casa de 75 mts 2 hab + 2 baños + cocina + living"): se DIBUJA con el motor propio,
// no se muestran catálogos. Pedir ejemplos, fotos o referencias sigue yendo a la galería.
function arqHouseDesignRequest(raw){
 const q=String(raw||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 if(!/\b(?:casa|vivienda|chalet|departamento|depto|house)\b/.test(q))return false;
 if(/\b(?:ejemplos?|referencias?|fotos?|imagenes?|jpg|png|galeria|catalogo|ver plantas|mostrame|mostrar|buscar|busca|modelos?)\b/.test(q))return false;
 const bed=/\b(?:\d+|un|una|dos|tres|cuatro|cinco|seis)\s*(?:hab\w*|dorm\w*|cuartos?|ambientes?)\b/.test(q)||/\b(?:habitacion|dormitorio)/.test(q);
 const program=(/\bban/.test(q)?1:0)+(/\bcocina/.test(q)?1:0)+(/\b(?:living|estar|comedor)\b/.test(q)?1:0);
 return bed&&program>=2;
}
function arqRouteOf(raw){
 raw=String(raw||'').trim().replace(/\s+/g,' ');
 if(/^(?:calco|calcar|calcar planta|traceplan|trace plan)$/i.test(raw))return {kind:'calco'};
 if(arqRestaurantRequest(raw))return {kind:'draw'};
 if(arqAuditoriumRequest(raw))return {kind:'draw'};
 if(arqClassroomRequest(raw))return {kind:'draw'};
 if(arqSanitaryBatteryRequest(raw))return {kind:'draw'};
 if(arqParkingRequest(raw))return {kind:'draw'};
 if(arqPoolRequest(raw))return {kind:'draw'};
 if(arqRoomSetRequest(raw))return {kind:'draw'};
 if(arqHouseDesignRequest(raw))return {kind:'draw'};
 if(arqFurnishRequest(raw))return {kind:'furnish'};
 {const w=arqWallRequest(raw);if(w)return {kind:'wall',length:w};}
 const docs=window.CAD2D_ARQ_DOCS?.match(raw);if(docs)return {kind:'docs',docs};
 if(arqClassicQuery(raw))return {kind:'classic'};
 if(arqRoomCAD(raw))return {kind:'roomcad'};
 if(arqHouseGallery(raw))return {kind:'house'};
 if(arqWebReference(raw))return {kind:'web'};
 const category=arqCatalogueCategory(raw);if(category)return {kind:'catalogue',category};
 const object=arqObjectSearch(raw);if(object)return {kind:'object',object};
 return {kind:'draw'};
}
window.CAD2D_ARQ_ROUTE=raw=>{const r=arqRouteOf(raw);return {kind:r.kind,length:r.length||null,category:r.category||null,object:r.object||null,docs:r.docs?String(r.docs.kind||r.docs.type||r.docs):null}};
window.CAD2D_ARQ_SOLVE_PREVIEW=async raw=>{const plan=await solveArchitecture(String(raw||''));return {walls:plan.walls?.length||0,openings:plan.openings?.length||0,blocks:plan.blocks?.length||0,rooms:plan.rooms?.length||0,assumptions:plan.assumptions||[],warning:plan.warning||''}};
function syncArchitectureToggle(){
 const bar=document.getElementById('cadArqInstructionBar'),on=!!bar&&bar.style.display!=='none';
 for(const b of document.querySelectorAll('[data-tool="arqAssistantOpen"],[data-tool="arqAssistantHome"],[data-qb="arqassist"]')){b.setAttribute('aria-pressed',String(on));b.classList.toggle('arq-toggle-active',on)}
}
function toggleArchitectureBar(){
 const bar=document.getElementById('cadArqInstructionBar');
 if(bar&&bar.style.display!=='none'){EXT.cancelArchitectureCommand();bar.style.display='none';syncArchitectureToggle()}else openArchitectureBar();
}
EXT.toggleArchitectureBar=toggleArchitectureBar;
function openArchitectureAssistant(category){
 let panel=document.getElementById('arqAssistant');
 if(!panel){
  panel=document.createElement('section');panel.id='arqAssistant';
  panel.className='panel';panel.setAttribute('translate','no');panel.style.cssText='min-width:0';
  panel.innerHTML='<div class="panel-title"><span>ARCHITECTURE ASSISTANT</span><button class="btn slim" data-close aria-label="Contraer">−</button></div><div class="panel-content" data-body style="padding:8px"><p>Ambientes paramétricos · medidas en metros</p><label>Tipo <select data-cat><option value="bath">Baños completos</option><option value="kitchen">Cocinas completas</option></select></label><p><label>Configuración <select data-model style="width:100%"></select></label></p><div style="display:flex;gap:8px"><label>Ancho <input data-w type="number" step=".05" style="width:85px"></label><label>Largo <input data-d type="number" step=".05" style="width:85px"></label></div><div data-preview style="margin:10px 0;background:#0d1418;color:#dce8ef;border-radius:6px"></div><label>Instrucción (tipo y medidas)<textarea data-command rows="2" style="width:100%;box-sizing:border-box" placeholder="Baño con ducha y bidet de 1.80 x 2.40"></textarea></label><div style="display:flex;gap:6px;margin:6px 0"><button data-interpret>Interpretar</button><button data-voice>Dictar</button></div><p data-status role="status" style="min-height:30px;color:#b2cbd8"></p><button data-insert style="width:100%;padding:8px">Insertar en plano</button></div>';
  const dock=document.querySelector('.workspace>.sidebar.rightside');if(!dock)return;dock.prepend(panel);panel.querySelectorAll('button').forEach(b=>b.classList.add('btn','slim'));panel.querySelectorAll('input,select,textarea').forEach(e=>{e.style.maxWidth='100%';e.style.minWidth='0'});
  const q=s=>panel.querySelector(s),cat=q('[data-cat]'),model=q('[data-model]'),w=q('[data-w]'),d=q('[data-d]'),status=q('[data-status]');
  const say=s=>status.textContent=s;
  const available=()=>LIB.library.filter(x=>(cat.value==='bath'?x.family==='bano':x.family==='cocina')&&!x.hideFromGallery&&!x.dxfPlan&&!x.paidOnly&&typeof x.gen==='function');
  let currentModels=[];const selected=()=>currentModels.find(x=>x.id===model.value)||currentModels[model.selectedIndex];const fits=(it,W,D)=>it&&W>=it.wMin&&W<=it.wMax&&D>=it.dMin&&D<=it.dMax;
  const valid=()=>{const it=selected(),W=Number(w.value),D=Number(d.value);if(!it)throw Error('Elegí una configuración.');if(!Number.isFinite(W)||!Number.isFinite(D)||!fits(it,W,D))throw Error('Rango de '+it.name+': ancho '+it.wMin+'–'+it.wMax+'; largo '+it.dMin+'–'+it.dMax+' m. Elegí otro modelo si es necesario.');return {it,W,D}};
  const preview=()=>{try{const {it,W,D}=valid();q('[data-preview]').innerHTML=svgFor(it,W,D,{height:170});say('Vista preliminar. Verificar accesos y circulación antes de construir.')}catch(e){q('[data-preview]').replaceChildren();say(e.message)}};
  const defaults=()=>{const it=selected();if(!it){w.value=d.value='';preview();return}w.min=it.wMin;w.max=it.wMax;d.min=it.dMin;d.max=it.dMax;w.value=it.w;d.value=it.d;preview()};
  const refresh=()=>{currentModels=available();model.replaceChildren(...currentModels.map(it=>new Option(it.name,it.id)));model.selectedIndex=currentModels.length?0:-1;defaults()};
  cat.onchange=refresh;model.onchange=defaults;w.oninput=d.oninput=preview;
  const norm=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  function interpret(){
   const raw=q('[data-command]').value.trim();if(!raw)return say('Escribí una instrucción, por ejemplo: Baño con ducha y bidet de 1.80 x 2.40.');
   const s=norm(raw),m=s.match(/(\d+(?:[.,]\d+)?)\s*(?:[x×]|por)\s*(\d+(?:[.,]\d+)?)/);
   if(/cocina|kitchen/.test(s))cat.value='kitchen';else if(/bano|toilette|bathroom/.test(s))cat.value='bath';refresh();
   const W=m?Number(m[1].replace(',','.')):null,D=m?Number(m[2].replace(',','.')):null;
   let id=null;
   if(cat.value==='bath'){
    if(/toilette/.test(s))id='bano-toilette';
    else if(/accesible/.test(s))id='bano-accesible';
    else if(/banera/.test(s)&&/bidet/.test(s))id='bano-completo';
    else if(/ducha/.test(s)&&/bidet/.test(s))id='bano-ducha-bidet';
    else if(/banera/.test(s))id='bano-banera';
    else if(/suite|doble bacha|doble lavabo/.test(s))id='bano-suite';
    else if(/ducha/.test(s))id='bano-minimo';
   }else{
    if(/isla/.test(s))id='kit-isla';else if(/peninsula/.test(s))id='kit-peninsula';else if(/en l\b/.test(s))id='kit-L';else if(/en u\b/.test(s))id='kit-U';else if(/paralela/.test(s))id='kit-paralela';else if(/lineal/.test(s))id='kit-lineal';
   }
   const it=id?currentModels.find(x=>x.id===id):m?currentModels.find(x=>fits(x,W,D)&&allowed(x)):selected();
   if(it){model.selectedIndex=currentModels.indexOf(it);defaults()}
   if(m){w.value=W;d.value=D}
   preview();if(!it){model.selectedIndex=-1;q('[data-preview]').replaceChildren();say('No hay una configuración compatible. Elegí un modelo o cambiá las medidas.')}
  }
  const drawButton=document.createElement('button');drawButton.className='btn';drawButton.textContent='Dibujar instrucción / Draw instruction';drawButton.style.cssText='display:block;width:100%;margin:6px 0';q('[data-insert]').before(drawButton);
  async function drawInstruction(){
   const raw=q('[data-command]').value.trim();if(!raw)return say('Escribí qué necesitás / Describe the layout.');
   drawButton.disabled=true;say('Calculando distribución / Calculating layout…');
   try{const plan=await solveArchitecture(raw);
    say((plan.assumptions||[]).join(' · ')+' · Clic en el origen / Click insertion origin');
    startPick(1,'ARQASSIST · origin / origen',([p])=>{try{const n=applyArchitecture(plan,p);say(n+' entidades CAD dibujadas / entities drawn.')}catch(e){say(e.message)}});
   }catch(e){say(e.message)}finally{drawButton.disabled=false}
  }
  drawButton.onclick=drawInstruction;
  q('[data-command]').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();drawInstruction()}});
  q('[data-interpret]').onclick=drawInstruction;
  q('[data-voice]').onclick=()=>{const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;if(!Recognition)return say('Dictado no disponible en este navegador. Usá el teclado.');try{const rec=new Recognition();rec.lang='es-AR';rec.onresult=e=>{q('[data-command]').value=e.results[0][0].transcript;drawInstruction()};rec.onerror=()=>say('No se pudo reconocer la voz. Usá el teclado.');rec.start()}catch(e){say(e.message)}};
  q('[data-insert]').onclick=async()=>{try{const {it,W,D}=valid();if(await armInsert(it,W,D))say('Clic en el plano para insertar.')}catch(e){say(e.message)}};
  q('[data-close]').onclick=()=>{const body=q('[data-body]');body.hidden=!body.hidden;q('[data-close]').textContent=body.hidden?'+':'−'};
  panel.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape')panel.hidden=true});
  panel.setCategory=value=>{cat.value=value==='Cocinas completas'?'kitchen':'bath';refresh()};
  refresh();
 }
 panel.hidden=false;panel.querySelector('[data-body]').hidden=false;panel.querySelector('[data-close]').textContent='−';if(category)panel.setCategory(category);panel.scrollIntoView({block:'nearest'});
}

/* Raster tracing prototype: orthogonal ink strokes, no semantic classification. */
function tracePlanRaster(data,w,h,threshold=150,minRun=12){
 if(!Number.isInteger(w)||!Number.isInteger(h)||w<2||h<2||w*h>2500000||data.length!==4*w*h)throw Error('Imagen inválida.');
 const ink=new Uint8Array(w*h);
 for(let i=0;i<ink.length;i++){const a=data[i*4+3]/255;ink[i]=a*(.299*data[i*4]+.587*data[i*4+1]+.114*data[i*4+2])+255*(1-a)<threshold?1:0}
 const result=[];
 for(const vertical of [false,true]){
  const outer=vertical?w:h,inner=vertical?h:w,active=[];
  for(let j=0;j<outer;j++){
   const runs=[];let i=0;
   while(i<inner){if(!ink[vertical?i*w+j:j*w+i]){i++;continue}const a=i;while(i<inner&&ink[vertical?i*w+j:j*w+i])i++;if(i-a>=minRun)runs.push([a,i-1]);}
   const used=new Set();
   for(const [a,b] of runs){
    const match=active.find(x=>x.last===j-1&&!used.has(x)&&Math.abs(x.a-a)<=2&&Math.abs(x.b-b)<=2);
    if(match){match.last=j;used.add(match)}else active.push({a,b,first:j,last:j});
   }
  }
  for(const q of active){const mid=(q.first+q.last)/2;if(q.last-q.first+1>q.b-q.a+1)continue;const a=vertical?[mid,q.a]:[q.a,mid],b=vertical?[mid,q.b]:[q.b,mid];result.push({a,b})}
 }
 if(result.length>12000)throw Error('Demasiados trazos: recortá la imagen o aumentá longitud mínima.');
 return result;
}
function openTracePlan(){
 if(document.getElementById('cadTracePlan'))return;
 const dlg=document.createElement('dialog');dlg.id='cadTracePlan';dlg.style.cssText='background:#25282d;color:#e6e7eb;border:1px solid #777;border-radius:12px;padding:18px;width:min(520px,90vw);max-height:90vh;overflow:auto';
 dlg.innerHTML='<b>CALCAR PLANTA · prototipo</b><p>JPG / PNG. Detecta trazos horizontales y verticales; no reconoce todavía muebles ni aberturas. Recortá la imagen al área de interés.</p><input type="file" accept="image/png,image/jpeg"><p>Ancho real de la imagen completa (m): <input data-width type="number" min=".01" step=".01" value="3" style="width:90px"></p><p>Umbral: <input data-threshold type="range" min="30" max="240" value="150"> Longitud mínima: <input data-min type="number" min="4" max="200" value="12" style="width:65px"></p><canvas style="width:100%;max-height:45vh;object-fit:contain;background:white"></canvas><p data-status></p><button data-preview>Previsualizar</button> <button class="btn" data-insert disabled>Insertar trazos</button> <button class="btn" data-block disabled>Guardar bloque</button> <button class="btn" data-dxf disabled>DXF</button> <button class="btn" data-dwg disabled>DWG</button> <button class="btn" data-close>Cerrar</button>';
 document.body.append(dlg);const q=s=>dlg.querySelector(s),cv=q('canvas'),ctx=cv.getContext('2d',{willReadFrequently:true});let original=null,lines=[];
 const status=s=>q('[data-status]').textContent=s;
 q('input[type=file]').onchange=async()=>{try{const file=q('input[type=file]').files[0];if(!file)return;if(file.size>25*1024*1024)throw Error('Máximo 25 MB.');const bmp=await createImageBitmap(file);const factor=Math.min(1,1400/Math.max(bmp.width,bmp.height));cv.width=Math.max(2,Math.round(bmp.width*factor));cv.height=Math.max(2,Math.round(bmp.height*factor));ctx.fillStyle='white';ctx.fillRect(0,0,cv.width,cv.height);ctx.drawImage(bmp,0,0,cv.width,cv.height);bmp.close();original=ctx.getImageData(0,0,cv.width,cv.height);for(const el of dlg.querySelectorAll('[data-insert],[data-block],[data-dxf],[data-dwg]'))el.disabled=true;status('Imagen cargada. Previsualizá los trazos.')}catch(e){status(e.message)}};
 const preview=()=>{if(!original)throw Error('Elegí una imagen.');lines=tracePlanRaster(original.data,cv.width,cv.height,+q('[data-threshold]').value,Math.max(4,+q('[data-min]').value||12));ctx.putImageData(original,0,0);ctx.strokeStyle='#d44835';ctx.lineWidth=1.5;ctx.beginPath();for(const l of lines){ctx.moveTo(...l.a);ctx.lineTo(...l.b)}ctx.stroke();status(lines.length+' trazos detectados. Revisá la superposición roja.');for(const el of dlg.querySelectorAll('[data-insert],[data-block],[data-dxf],[data-dwg]'))el.disabled=!lines.length;};
 q('[data-preview]').onclick=()=>{try{preview()}catch(e){status(e.message)}};
 q('[data-insert]').onclick=()=>{try{preview();const width=+q('[data-width]').value;if(!Number.isFinite(width)||width<=0||width>1000||!lines.length)throw Error('Ancho real o trazos inválidos.');const k=width/cv.width*f(),h=cv.height,copy=lines.slice();dlg.close();startPick(1,'CALCAR · clic en origen',([p])=>{const st=S();let layer=st.layers.find(l=>l.name==='TRACE-REFERENCE');if(layer&&(layer.locked||!layer.visible))return CORE.toast('Desbloqueá y mostrá TRACE-REFERENCE.');CORE.saveHistory();if(!layer){layer={id:'arq-trace-reference',name:'TRACE-REFERENCE',color:'#e5e7eb',visible:true,locked:false,width:.18,linetype:'CONTINUOUS'};st.layers.push(layer)}for(const l of copy)newEntity({type:'line',a:P(p.x+l.a[0]*k,p.y+(h-l.a[1])*k),b:P(p.x+l.b[0]*k,p.y+(h-l.b[1])*k),layer:layer.id});CORE.updateAll();CORE.toast(copy.length+' líneas editables · trazado preliminar, no muros verificados.');});}catch(e){status(e.message)}};
 const traceEntities=()=>{preview();const width=Number(q('[data-width]').value);if(!Number.isFinite(width)||width<=0||width>1000||!lines.length)throw Error('Ancho real o trazos inválidos.');const k=width/cv.width*f(),h=cv.height;return lines.map(l=>({type:'line',a:P(l.a[0]*k,(h-l.a[1])*k),b:P(l.b[0]*k,(h-l.b[1])*k),layer:'0',width:.18}));};
 const traceName=()=>{const name=window.prompt('Nombre del bloque o archivo:','Planta calcada');if(name===null)return null;const clean=name.trim().replace(/[\x00-\x1f<>:"/\\|?*]/g,'_').slice(0,120);if(!clean||['__proto__','constructor','prototype'].includes(clean))throw Error('Nombre inválido.');return clean;};
 let actionBusy=false;
 const action=fn=>async()=>{if(actionBusy)return;actionBusy=true;try{await fn()}catch(e){status(e.message);CORE.toast(e.message)}finally{actionBusy=false}};
 q('[data-block]').onclick=action(async()=>{const entities=traceEntities(),name=traceName();if(name===null)return;if(typeof CORE.savePersonalBlock!=='function')throw Error('Recargá CAD2D3D.');if(window.BlacklineBlockAPI.hasBlock(name))throw Error('Ya existe un bloque con ese nombre.');window.BlacklineBlockAPI.addBlock(name,entities);await CORE.savePersonalBlock(name);status('Bloque '+name+' guardado en el documento y solicitado en Mis bloques.');});
 for(const format of ['dxf','dwg'])q('[data-'+format+']').onclick=action(async()=>{const entities=traceEntities(),name=traceName();if(name===null)return;if(typeof CORE.exportTrace!=='function')throw Error('Recargá CAD2D3D.');if(format==='dwg'&&!window.confirm('Exportar los trazos como DWG mediante conversión local. ¿Continuar?'))return;const saved=await CORE.exportTrace(entities,name,format);status(saved?'Exportación '+format.toUpperCase()+' completada.':'Guardado cancelado o no completado.');});
 q('[data-close]').onclick=()=>dlg.close();dlg.addEventListener('close',()=>dlg.remove());dlg.showModal();
}
EXT.commands.CALCARPLANTA=EXT.commands.CALCAR=openTracePlan;

EXT.commands.ARQRELLENO=EXT.commands.ARQPOCHE=()=>window.CAD2D_ARQ_POCHE?.();
EXT.commands.ARQASSIST=EXT.commands.ASISTENTEARQ=()=>openArchitectureBar();
EXT.commands.BANO=EXT.commands.BANOS=EXT.commands['BAÑO']=EXT.commands['BAÑOS']=()=>openArchitectureAssistant('Baños completos');
EXT.commands.COCINA=EXT.commands.COCINAS=()=>openArchitectureAssistant('Cocinas completas');
CORE.ribbon.add('arq','ASISTENTE',[{id:'arqAssistantOpen',label:'Asistente paramétrico',icon:'<rect x="3" y="3" width="18" height="18"/><path d="M3 12h18M12 3v18"/>',run:()=>toggleArchitectureBar()}]);
CORE.ribbon.add('home','ASISTENTE',[{id:'arqAssistantHome',label:'Asistente paramétrico',icon:'<rect x="3" y="3" width="18" height="18"/><path d="M3 12h18M12 3v18"/>',run:()=>toggleArchitectureBar()}]);
CORE.ribbon.add('home','ASISTENTE',[{id:'arqTracePlan',label:'Calcar planta',icon:'<path d="M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5M7 7h10v10H7z"/>',run:openTracePlan}]);
CORE.ribbon.rebuild();

/* ---------- Conexión ---------- */
const canvas=CORE.canvas;
canvas.addEventListener('pointerdown',onPointerDown,true);
canvas.addEventListener('pointermove',onPointerMove,true);
canvas.addEventListener('pointerup',onPointerUp,true);
buildPanel();buildModal();updateIsoBadge();
window.CAD2D_ARQ=Object.freeze({openGallery:openModal,thumb:(id,h)=>{const it=byId(id);return it?thumb(it,h||96):''},layerFor:cat=>'0',insert:(id,W,D,isCurrent)=>{const it=byId(id);if(!it)throw Error('Bloque inexistente');return armInsert(it,W,D,isCurrent)},resizeSelected:(W,D)=>{const r=selectedArqRef();if(r)resizeRef(r,W,D)},canEdit:id=>{const item=byId(id);return Boolean(item&&allowed(item))},resizeByRefId:(id,W,D)=>{const ref=S().entities.find(e=>e.id===id),a=ref&&arqOf(ref),item=a&&byId(a.id);if(!item||!allowed(item)||CORE.layerFor(ref).locked||CORE.layerFor(ref).visible===false)return false;resizeRef(ref,W,D);return true},count:LIB.library.filter(x=>!x.hideFromGallery).length,selectedInfo:()=>{const r=selectedArqRef(),a=r&&arqOf(r);return a?{id:a.id,w:a.w,d:a.d}:null},grips:()=>{const r=selectedArqRef();return r?gripsFor(r).map(g=>({kind:g.kind,x:g.screen.x,y:g.screen.y})):[]}});
})();
