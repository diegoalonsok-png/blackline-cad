/* CAD2D · ARQ PRO (Nov 2026)
 * - Galería arquitectónica grande: baños y cocinas completos + bloques sueltos paramétricos.
 * - Bloques dinámicos 2D con pinzamientos: estirar ancho ▶ / profundidad ▲ con regeneración
 *   inteligente (los artefactos se reubican, no se deforman) y pinzamiento de variantes ▼.
 * - Menú contextual ampliado y comandos estilo CAD: AISLAR/OCULTAR, ORDEN DE DIBUJO, GRUPO,
 *   CONTARBLOQUES, DIVIDIR, GRADUAR, NUBEREV, LINEACONST, SEMIRRECTA, LOCAL (etiqueta de superficie).
 * Implementación propia. No usa código, iconos ni bloques de Autodesk.
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
let pendingInsert=null,lastItem=null;
function armInsert(item,W,D){
 if(!allowed(item)){
  if(plan()?.upsell)plan().upsell(item.paidOnly?'Blackline Select requiere membresía PRO o Estudio confirmada':'Bloque Pro: '+item.name);
  else CORE.toast('Requiere membresía PRO o Estudio');
  return false;
 }
 if(item.dxfPlan&&window.cadInsertDxfPlan){window.cadInsertDxfPlan(item.dxfPlan,item.name);return true}
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
function thumb(item,height){
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
 b.onclick=()=>{if(armInsert(item)===false)return;for(const c of document.querySelectorAll('.arq-card'))c.setAttribute('aria-pressed',String(c.dataset.arq===item.id));closeModal()};
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
  <button type="button" class="btn slim" id="arqOpenVisual" title="Galería visual en fondo crema · clic en imagen y luego en plano" style="display:block;width:100%;margin:7px 0 4px;text-align:center;background:#e6d3a9;color:#3d352b;border:1px solid #bca175;font-weight:600">▦ Galería visual · bloques detallados</button>
  <button type="button" class="btn slim" id="arqOpenOlimpiadas" title="Abrir biblioteca de bloques 2D · más de 1000 bloques en vista y planta" style="display:block;width:100%;margin:3px 0 6px;text-align:center;background:#e4dccb;color:#3d352b;border:1px solid #bca175;font-weight:600">▦ BLOQUES 2D · 1.000+</button>
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
 $('arqOpenOlimpiadas').onclick=()=>{const browser=window.CAD2D_BLOCK_BROWSER;
  if(browser?.openOlimpiadas)return browser.openOlimpiadas();
  CORE.toast('El explorador de bloques todavía no está disponible');
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
 if(!a.ext){const bb=LIB.bounds(LIB.build(a.id,a.w,a.d).entities);a.ext=bb?{x0:bb.minX,y0:bb.minY,x1:bb.maxX,y1:bb.maxY}:{x0:0,y0:0,x1:a.w,y1:a.d}}
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
 if(!arqWorker)arqWorker=new Worker('architecture/solver-worker.js?v=20261124-bath-section-v1');
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
 if(plan.units!=='m'||!Array.isArray(plan.entities)||!plan.entities.length||plan.entities.length>500)throw Error('Detalle inválido.');
 const st=S(),k=f(),names=new Set(['STAIRS','RAILS','SECTIONS','SECTION-CUT','SECTION-FINISH','SECTION-FIXTURES']),layers=new Map(),add=[];
 const validPoint=p=>Array.isArray(p)&&p.length===2&&p.every(v=>Number.isFinite(v)&&Math.abs(v)<=100);
 const getLayer=name=>{
  if(!names.has(name))throw Error('Capa de detalle inválida');
  if(!layers.has(name)){
   const old=st.layers.find(l=>l.name.toUpperCase()===name);
   if(old&&(old.locked||old.visible===false))throw Error('Capa bloqueada u oculta: '+name);
   const id=old?.id||'arq-detail-'+name.toLowerCase();if(!old&&st.layers.some(l=>l.id===id))throw Error('Colisión de capa.');
   const l=old||{id,name,color:name==='SECTION-CUT'?'#777b80':name==='SECTION-FINISH'?'#8d9295':'#e5e7eb',visible:true,locked:false,width:name==='SECTIONS'?.35:.13,linetype:'CONTINUOUS'};
   layers.set(name,l);if(!old)add.push(l);
  }return layers.get(name).id;
 };
 for(const e of plan.entities){if(e.type!=='line'||![e.a,e.b].every(validPoint)||Math.hypot(e.a[0]-e.b[0],e.a[1]-e.b[1])<1e-8)throw Error('Geometría de detalle inválida.');getLayer(e.layer);}
 const fills=plan.fills||[],blocks=plan.blocks||[];
 if(!Array.isArray(fills)||fills.length>50||!Array.isArray(blocks)||blocks.length>50)throw Error('Detalle demasiado complejo.');
 for(const e of fills){if(e.layer!=='SECTION-CUT'||!Array.isArray(e.pts)||e.pts.length!==4||!e.pts.every(validPoint))throw Error('Relleno inválido.');getLayer(e.layer);}
 const prepared=blocks.map(b=>{const it=byId(b.catalogId),[w,d]=b.nominalSize||[];if(b.layer!=='SECTION-FIXTURES'||!it||!allowed(it)||it.dxfPlan||!validPoint(b.point)||![w,d].every(Number.isFinite)||w<it.wMin-1e-8||w>it.wMax+1e-8||d<it.dMin-1e-8||d>it.dMax+1e-8)throw Error('Bloque de detalle no disponible: '+b.catalogId);getLayer(b.layer);LIB.build(it.id,w,d);return {b,it,w,d};});
 CORE.saveHistory();
 const resolved=prepared.map(({b,it,w,d})=>({b,name:ensureDefinition(it,w,d,true)}));
 st.layers.push(...add);
 const batch='arq-detail-'+CORE.nextId(),p=a=>P(origin.x+a[0]*k,origin.y+a[1]*k);
 for(const e of fills)st.entities.push({id:CORE.nextId(),type:'hatch',pts:e.pts.map(p),layer:getLayer(e.layer),hatchStyle:'solid',width:.05,arqBatch:batch});
 for(const e of plan.entities)st.entities.push({id:CORE.nextId(),type:'line',a:p(e.a),b:p(e.b),layer:getLayer(e.layer),width:e.layer==='SECTIONS'&&plan.brief?.kind==='bath_section'?.35:e.layer==='SECTION-FINISH'?.09:.18,arqBatch:batch});
 for(const {b,name} of resolved)st.entities.push({id:CORE.nextId(),type:'blockRef',blockName:name,p:p(b.point),scale:1,rotation:0,layer:getLayer(b.layer),arqBatch:batch});
 st.selected=[];CORE.updateAll();return plan.entities.length+fills.length+blocks.length;
}

function applyArchitecture(plan,origin,replaceBatch=null){
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
 return !!meta?.brief&&meta.rooms?.length===1&&meta.brief.kind!=='suite_row'&&(meta.brief.alternatives||1)===1&&(meta.brief.kind!=='bath_reference'||meta.sourcePlan?.walls?.length===4);
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
 try{const spec={...h.meta.brief,[h.axis]:value};let plan;if(spec.kind==='bath_reference'||spec.templateLayout||spec.compactTransverse){plan=arqResizeReference(h.meta.sourcePlan,h.axis,value);}else{plan=await solveArchitecture('',spec);}if(plan.warning&&!window.confirm(plan.warning+'\n\n¿Aplicar cambio?'))return;applyArchitecture(plan,h.meta.origin,h.batch);CORE.toast('Ambiente recalculado · Ctrl+Z deshace')}catch(err){CORE.toast(err.message)}
},true);

let arqCommandEpoch=0;
EXT.cancelArchitectureCommand=()=>{
 arqCommandEpoch++;
 if(pick.active&&pick.mode==='arq-command'){pick.active=false;pick.points=[];CORE.schedule()}
};
document.addEventListener('keydown',e=>{if(e.key==='Escape')EXT.cancelArchitectureCommand()},true);
EXT.drawArchitectureCommand=async raw=>{
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
const arqCatalogueCounts={"bathroom":37,"kitchen":12,"bedroom":11,"laundry":1,"office":1,"dining":1,"closet":1};
const arqCatalogueBase=new URL('assets/arq-catalogue/v1/',document.baseURI);
let arqCataloguePromise=null;
function arqCatalogueIndex(){if(!arqCataloguePromise)arqCataloguePromise=fetch(new URL('index.json?v=20261124-expanded-v2',arqCatalogueBase)).then(r=>{if(!r.ok)throw Error('Catálogo no disponible');return r.json()}).then(x=>{if(!Array.isArray(x)||x.length>10000||x.some(i=>!/^plan-\d+$/.test(i.id)||!Array.isArray(i.dimensions)||!Array.isArray(i.roles)))throw Error('Índice inválido');return x}).catch(e=>{arqCataloguePromise=null;throw e});return arqCataloguePromise;}
function arqCatalogueCategory(raw){
 const s=String(raw).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 if(/^(?:bnao|bno|banio|banios|bnaos|banoo|banoss)$/.test(s))return 'bathroom';
 if(/^(?:bano|banos|toilette|mostrar banos|listado de banos|bathroom|bathrooms|salle de bains|bagno|bagni|banheiro|banheiros|badezimmer|浴室|卫生间|衛生間|ванная|حمام|욕실)$/.test(s))return 'bathroom';
 if(/^(?:cocina|cocinas|kitchen|kitchens|cuisine|cucina|cozinha|kuche|厨房|キッチン|кухня|مطبخ)$/.test(s))return 'kitchen';
 if(/^(?:habitacion|habitaciones|dormitorio|dormitorios|bedroom|bedrooms|chambre|camera|quarto|schlafzimmer|寝室|卧室|спальня|غرفة نوم)$/.test(s))return 'bedroom';
 if(/^(?:lavadero|lavaderos|laundry|buanderie|lavanderia)$/.test(s))return 'laundry';
 if(/^(?:oficina|oficinas|office|bureau|ufficio)$/.test(s))return 'office';
 if(/^(?:comedor|comedores|dining room|sala da pranzo)$/.test(s))return 'dining';
 if(/^(?:vestidor|vestidores|dressing|walk-in closet)$/.test(s))return 'closet';
 if(/^(?:escalera|escaleras|stair|stairs|staircase|staircases|escalera en [lu]|escalera caracol|escalera recta|escalera curva|escalera compensada)$/.test(s))return 'stairs';
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
   if(o.kind==='swing-door')body+='<g transform="translate('+x+' '+y+') rotate('+angle+')" stroke="#74716b" stroke-width=".012" fill="none"><path d="M0 0 V-'+o.width+' M0 -'+o.width+' A'+o.width+' '+o.width+' 0 0 1 '+o.width+' 0"/></g>';
   else body+='<g transform="translate('+x+' '+y+') rotate('+angle+')" stroke="#69949b" stroke-width=".018"><path d="M0 -.025 H'+o.width+' M0 .025 H'+o.width+'"/></g>';at=b;}
  line(at,L);
  // Corner fill only at actual junctions; native insertion has its own wall joiner.
  for(const [x,y] of [w.a,w.b])body+='<rect x="'+(x-w.thickness/2)+'" y="'+(-y-w.thickness/2)+'" width="'+w.thickness+'" height="'+w.thickness+'" fill="#53575a"/>';
 }
 for(const b of plan.blocks){const it=byId(b.catalogId);if(!it)continue;const svg=svgFor(it,...b.nominalSize,{height:110});const i=svg.indexOf('<g '),j=svg.lastIndexOf('</svg>');if(i<0||j<0)continue;
  body+='<g transform="translate('+b.point[0]+' '+(-b.point[1])+') rotate('+(-b.rotation)+')" color="#343e40">'+svg.slice(i,j)+'</g>';}
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+[minX-pad,-maxY-pad,maxX-minX+2*pad,maxY-minY+2*pad].join(' ')+'" style="width:100%;height:142px;display:block;background:#f4efe3;border-radius:4px" role="img" aria-label="Planta arquitectónica">'+body+'</svg>';
}
async function openArqPlanCatalogue(category){
 const old=document.getElementById('arqPlanCatalogue');if(old){old.close();old.remove();}
 const dlg=document.createElement('dialog');dlg.id='arqPlanCatalogue';
 dlg.style.cssText='position:fixed;inset:auto;margin:0;z-index:1200;width:min(760px,94vw);height:min(620px,80vh);min-width:min(300px,94vw);min-height:min(220px,80vh);max-width:calc(100vw - 12px);max-height:calc(100vh - 12px);resize:both;overflow:hidden;background:#25282d;color:#e6e7eb;border:1px solid #777;border-radius:12px;padding:14px;box-sizing:border-box';
 const header=document.createElement('div');header.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;flex:none;cursor:move;touch-action:none;user-select:none';header.title='Arrastrar para mover / Drag to move';
 const title=document.createElement('strong');title.textContent='ARQASSIST · '+({bathroom:'Baños / Bathrooms',kitchen:'Cocinas / Kitchens',bedroom:'Habitaciones / Bedrooms',laundry:'Lavaderos / Laundry',office:'Oficinas / Offices',dining:'Comedores / Dining',closet:'Vestidores / Dressing',stairs:'Escaleras / Stairs'}[category]||'Plantas');
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
 if(category==='stairs'){
  status.remove();
  for(const item of LIB.library.filter(x=>x.cat==='Escaleras'&&!x.hideFromGallery&&x.id!=='esc-rampa')){
   const card=document.createElement('button');card.type='button';card.className='btn arq-card';card.style.cssText='display:flex;flex-direction:column;gap:5px;padding:6px;text-align:center;min-width:0';
   const preview=document.createElement('div');preview.style.cssText='background:#f4efe3;color:#343e40;border-radius:4px;width:100%';preview.innerHTML=svgFor(item,item.w,item.d,{height:142});const label=document.createElement('span');label.textContent=item.name;const size=document.createElement('small');size.textContent=fmt(item.w)+' × '+fmt(item.d)+' · planta preliminar';card.append(preview,label,size);
   card.onclick=()=>{if(S().tool!=='select'||S().stage.length)return CORE.toast('Terminá el comando CAD actual.');if(armInsert(item)!==false)dlg.close();};grid.append(card);
  }
  return;
 }
 let items;try{items=await arqCatalogueIndex()}catch(e){if(dlg.isConnected)status.textContent=e.message+' · Cerrá y volvé a intentar.';return}if(!dlg.isConnected)return;status.remove();
 for(const item of items.filter(x=>x.category===category).sort((a,b)=>a.area-b.area)){
  const button=document.createElement('button');button.className='btn arq-card';button.style.cssText='display:flex;flex-direction:column;gap:5px;padding:6px;text-align:center;min-width:0';
  const img=document.createElement('img');img.src=new URL(item.id+'.svg',arqCatalogueBase).href;img.loading='lazy';img.decoding='async';img.alt=item.name;img.style.cssText='width:100%;height:142px;object-fit:contain;background:#f4efe3;border-radius:4px';button.append(img);const name=document.createElement('span');name.textContent=item.name;const size=document.createElement('span');const [w,d]=item.dimensions;size.textContent=item.roomCount===1?fmt(w)+' × '+fmt(d)+' m · '+fmt(item.area)+' m²':fmt(item.area)+' m² útiles aprox. · Varios ambientes';size.style.opacity='.8';button.append(name,size);const roles={toilet:'Inodoro',toiletCompact:'Inodoro compacto',bidet:'Bidet',basin:'Lavatorio',basin45:'Lavatorio compacto',doubleBasin:'Doble lavatorio',doubleShower:'Doble ducha',shower:'Ducha',shower75:'Ducha compacta',bathtub:'Bañadera',bathtub150:'Bañadera 1,50',fridge:'Heladera',sink:'Bacha',range:'Cocina',island:'Isla',bed:'Cama',singlebed:'Cama individual',doublebed:'Cama doble',wardrobe:'Placard',counter:'Mesada',kingbed:'Cama king',bunk:'Cucheta',crib:'Cuna',desk:'Escritorio',washer:'Lavarropas',dryer:'Secarropas',laundrySink:'Pileta',bookshelf:'Biblioteca',table8:'Mesa para ocho'};const equipment=document.createElement('small');equipment.style.cssText='font-size:10px;opacity:.85;white-space:normal';equipment.textContent=item.roles.map(role=>roles[role]||role).join(' · ');button.append(equipment);
  if(item.preliminary){const note=document.createElement('small');note.textContent='Preliminar / Preliminary';note.style.color='#dfc28b';button.append(note);}
  button.onclick=async()=>{if(S().tool!=='select'||S().stage.length)return CORE.toast('Terminá el comando CAD actual.');const epoch=++arqCommandEpoch;button.disabled=true;
   try{const response=await fetch(new URL(item.id+'.json',arqCatalogueBase));if(!response.ok)throw Error('No se pudo descargar la planta.');const plan=await response.json();if(epoch!==arqCommandEpoch||!dlg.isConnected)return;if(plan.schema!=='blackline.architecture.v1'||!Array.isArray(plan.walls)||!Array.isArray(plan.openings)||!Array.isArray(plan.blocks))throw Error('Planta inválida.');if(plan.warning&&!window.confirm(plan.warning+'\n\n¿Insertar la propuesta editable?'))return;if(S().tool!=='select'||S().stage.length)return CORE.toast('Terminá el comando CAD actual.');dlg.close();startPick(1,'ARQASSIST · clic en origen / click origin',([p])=>{if(epoch!==arqCommandEpoch)return;try{const n=applyArchitecture(plan,p);CORE.toast('ARQASSIST · '+n+' entidades CAD')}catch(e){CORE.toast(e.message);CORE.log(e.message)}},'arq-command');pick.planPreview=plan;CORE.schedule();}
   catch(e){CORE.toast(e.message)}finally{button.disabled=false}};
  grid.append(button);
 }
 const foot=document.createElement('p');foot.style.cssText='font-size:12px;opacity:.8;margin-bottom:0;flex:none';foot.textContent='Seleccioná una planta para insertarla como muros, aberturas y bloques independientes. / Select a plan to insert editable CAD objects.';dlg.append(foot);
}

/* Free-text architecture bar is separate from the CAD command interpreter. */

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
  bar.innerHTML='<button class="qb-handle" type="button" title="Arrastrar · doble clic para plegar / Drag · double-click to collapse">⠿</button><b>ARQASSIST</b><span class="qb-sep"></span><textarea rows="1" wrap="soft" data-arq-text aria-label="Architectural instruction" autocomplete="off" spellcheck="false" placeholder="Habitación de 4 x 5 / Bedroom 4 x 5"></textarea><span class="qb-sep"></span><button type="button" data-arq-run title="Dibujar / Draw" aria-label="Dibujar / Draw"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg></button><button type="button" data-arq-close title="Ocultar / Hide ARQASSIST" aria-label="Ocultar / Hide"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button>';
  host.append(bar);
  const input=bar.querySelector('[data-arq-text]'),run=bar.querySelector('[data-arq-run]'),handle=bar.querySelector('.qb-handle');
  const catalogue=document.createElement('button');catalogue.type='button';catalogue.className='btn slim';catalogue.hidden=true;catalogue.style.cssText='white-space:nowrap;font-size:11px;flex:none';catalogue.setAttribute('aria-label','Abrir catálogo de plantas');bar.insertBefore(catalogue,run);
  const updateCatalogue=()=>{const category=arqCatalogueCategory(input.value);catalogue.hidden=!category;catalogue.style.display=category?'':'none';if(category){catalogue.textContent=(category==='stairs'?LIB.library.filter(x=>x.cat==='Escaleras'&&!x.hideFromGallery&&x.id!=='esc-rampa').length:(arqCatalogueCounts[category]||0))+' modelos';catalogue.title='Ver plantas y dimensiones';}resizeText();};
  catalogue.onclick=()=>{const cat=arqCatalogueCategory(input.value);if(!cat)return;if(S().tool!=='select'||S().stage.length)return CORE.toast('Terminá el comando CAD actual.');EXT.cancelArchitectureCommand();openArqPlanCatalogue(cat);};

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
   const category=arqCatalogueCategory(raw);if(category){EXT.cancelArchitectureCommand();openArqPlanCatalogue(category);return;}
   run.disabled=true;try{await EXT.drawArchitectureCommand(raw)}finally{run.disabled=false}
  };
  input.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();submit()}else if(e.key==='Escape'){EXT.cancelArchitectureCommand();input.blur()}});
  for(const type of ['pointerdown','pointerup','mousedown','click','wheel','contextmenu','keyup','keypress'])bar.addEventListener(type,e=>e.stopPropagation());
  run.addEventListener('click',submit);
  bar.querySelector('[data-arq-close]').onclick=()=>{EXT.cancelArchitectureCommand();bar.style.display='none';syncArchitectureToggle()};
 }
 bar.style.display='flex';if(focus){bar.classList.remove('arq-min');bar.querySelector('[data-arq-text]').focus();}bar.arqResize?.();syncArchitectureToggle();
}
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
  q('[data-insert]').onclick=()=>{try{const {it,W,D}=valid();if(armInsert(it,W,D))say('Clic en el plano para insertar.')}catch(e){say(e.message)}};
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
window.CAD2D_ARQ=Object.freeze({openGallery:openModal,thumb:(id,h)=>{const it=byId(id);return it?thumb(it,h||96):''},layerFor:cat=>'0',insert:(id,W,D)=>{const it=byId(id);if(!it)throw Error('Bloque inexistente');return armInsert(it,W,D)},resizeSelected:(W,D)=>{const r=selectedArqRef();if(r)resizeRef(r,W,D)},canEdit:id=>{const item=byId(id);return Boolean(item&&allowed(item))},resizeByRefId:(id,W,D)=>{const ref=S().entities.find(e=>e.id===id),a=ref&&arqOf(ref),item=a&&byId(a.id);if(!item||!allowed(item)||CORE.layerFor(ref).locked||CORE.layerFor(ref).visible===false)return false;resizeRef(ref,W,D);return true},count:LIB.library.filter(x=>!x.hideFromGallery).length,selectedInfo:()=>{const r=selectedArqRef(),a=r&&arqOf(r);return a?{id:a.id,w:a.w,d:a.d}:null},grips:()=>{const r=selectedArqRef();return r?gripsFor(r).map(g=>({kind:g.kind,x:g.screen.x,y:g.screen.y})):[]}});
})();
