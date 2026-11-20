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
const allowed=item=>!item.pro||!plan()||plan().can('arq-pro');

/* ---------- Capas arquitectónicas ---------- */
const LAYERS={
 'Baños completos':['A-SANITARIOS','#7fc8ff'],'Sanitarios':['A-SANITARIOS','#7fc8ff'],
 'Cocinas completas':['A-EQUIPAMIENTO','#ffd27f'],'Cocina · equipos':['A-EQUIPAMIENTO','#ffd27f'],
 'Mobiliario':['A-MOBILIARIO','#c7a4ff'],'Dormitorio':['A-MOBILIARIO','#c7a4ff'],
 'Escaleras':['A-ESCALERAS','#e6e6e6'],'Exterior':['A-VEGETACION','#8fd18f'],
 'Vehículos':['A-VEHICULOS','#b7c0c7'],'Equipos':['A-INSTALACIONES','#ff9f7f'],
 'Alzados':['A-ALZADOS','#9fd6e6'],'Personas':['A-PERSONAS','#d9c6a5'],'Oficina':['A-MOBILIARIO','#c7a4ff'],'Símbolos':['A-SIMBOLOS','#f2f2f2'],'Obra y maquinaria':['A-OBRA','#f0b35a'],'Cortes y vistas':['A-CORTES','#c9d6e8'],'Documentación':['A-DOC','#e8d38a']
};
function ensureLayer(cat){
 const [name,color]=LAYERS[cat]||['A-MOBILIARIO','#c7a4ff'];
 const st=S();let layer=st.layers.find(l=>l.name.toUpperCase()===name);
 if(!layer){layer={id:name.toLowerCase(),name,color,visible:true,locked:false,width:.13};st.layers.push(layer)}
 return layer;
}

/* ---------- Definiciones de bloque generadas ---------- */
function defName(item,W,D){return 'ARQ · '+item.name+' · '+cm(W)+'×'+cm(D)}
function ensureDefinition(item,W,D){
 const built=LIB.build(item.id,W,D),k=f(),st=S();
 const name=defName(item,built.w,built.d);
 if(!st.blocks[name]){
  const ents=built.entities.map(e=>scaleEntity(e,k));
  for(const e of ents){e.layer='0';if(e.width===undefined)e.width=e.type==='text'?.09:.13}
  const def=CORE.cadPrepareDynamicBlock({name,entities:CORE.normalizeBlockEntities(ents)});
  // La familia ARQ regenera geometría en lugar de deformarla: el estiramiento genérico se desactiva.
  def.dynamic2d=false;def.dynamicActions=true;
  const bb=LIB.bounds(built.entities);
  def.arq={id:item.id,w:built.w,d:built.d,unit:st.unit,ext:bb?{x0:bb.minX,y0:bb.minY,x1:bb.maxX,y1:bb.maxY}:null};
  st.blocks[name]=def;CORE.renderBlockLibrary();CORE.queueLocalBackup();
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
 if(!allowed(item))return plan().upsell('Bloque Pro: '+item.name);
 const name=ensureDefinition(item,W??item.w,D??item.d),st=S();
 const layer=ensureLayer(item.cat);
 if(!pendingInsert)pendingInsert={prevLayer:st.layerId};
 st.layerId=layer.id;lastItem=item;
 window.BlacklineBlockAPI.selectBlock(name);
 CORE.toast('ARQ · '+item.name+' listo · clic en el plano para insertar · Esc cancela');
 syncSizeRow(item,st.blocks[name].arq);
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
const thumbCache=new Map();
function thumb(item,height){
 const key=item.id+'|'+height;if(!thumbCache.has(key))thumbCache.set(key,svgFor(item,null,null,{height}));
 return thumbCache.get(key);
}
const sizeLabel=item=>cm(item.w)+'×'+cm(item.d)+' cm';
const isDynamic=item=>item.wMax>item.wMin||item.dMax>item.dMin;
const familyOf=item=>LIB.library.filter(x=>x.family===item.family);

/* ---------- Estilos del módulo (mismo lenguaje visual del CAD) ---------- */
const css=document.createElement('style');
css.textContent=`
#arqPanel .arq-chips{display:flex;gap:4px;flex-wrap:wrap;margin:6px 0}
#arqPanel .arq-chips button,#arqModal .arq-chips button{font-size:10px;padding:3px 7px;border-radius:10px}
#arqPanel .arq-chips button[aria-pressed=true],#arqModal .arq-chips button[aria-pressed=true]{background:#385263;border-color:#91bfd5}
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
#arqModal{position:fixed;inset:0;z-index:9000;background:rgba(5,9,13,.72);display:flex;align-items:center;justify-content:center}
#arqModal[hidden]{display:none}
#arqModal .arq-box{width:min(1180px,94vw);height:min(820px,90vh);display:flex;flex-direction:column;background:#141c24;border:1px solid #4d6676;border-radius:12px;box-shadow:0 18px 60px rgba(0,0,0,.5);color:#e5eef7}
#arqModal header{display:flex;gap:10px;align-items:center;padding:12px 14px;border-bottom:1px solid #2f4250}
#arqModal header h2{font-size:14px;margin:0;letter-spacing:.06em;flex:1}
#arqModal .arq-tools{padding:10px 14px;display:grid;gap:6px}
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
 return LIB.library.filter(x=>(s?(x.name+' '+x.cat).toLowerCase().includes(s):(cat==='Todos'||x.cat===cat)));
}
function makeCard(item,height){
 const b=document.createElement('button');b.type='button';b.className='btn arq-card';b.dataset.arq=item.id;
 b.title=item.name+' · '+sizeLabel(item)+(isDynamic(item)?' · dinámico: '+cm(item.wMin)+'–'+cm(item.wMax)+' × '+cm(item.dMin)+'–'+cm(item.dMax)+' cm':'')+' · clic para insertar';
 b.innerHTML=thumb(item,height)+`<span class="arq-name">${esc(item.name)}</span><span class="arq-meta">${sizeLabel(item)}${isDynamic(item)?' · ↔ dinámico':''}</span>`+(item.pro?'<span class="arq-pro">PRO</span>':'');
 b.onclick=()=>{armInsert(item);for(const c of document.querySelectorAll('.arq-card'))c.setAttribute('aria-pressed',String(c.dataset.arq===item.id));closeModal()};
 return b;
}
function chips(container,onPick){
 container.replaceChildren();
 for(const cat of ['Todos',...LIB.categories]){
  const b=document.createElement('button');b.type='button';b.className='btn slim';b.textContent=cat;
  b.setAttribute('aria-pressed',String(cat===activeCat));
  b.onclick=()=>{activeCat=cat;onPick()};container.append(b);
 }
}
function renderPanel(){
 const grid=$('arqPanelGrid');if(!grid)return;
 const sel=$('arqPanelCat');
 if(!sel.options.length){for(const cat of ['Todos',...LIB.categories]){const o=document.createElement('option');o.value=cat;o.textContent=cat+' ('+(cat==='Todos'?LIB.library.length:LIB.library.filter(x=>x.cat===cat).length)+')';sel.append(o)}sel.onchange=()=>{activeCat=sel.value;query='';$('arqPanelSearch').value='';renderPanel()}}
 sel.value=activeCat;
 grid.replaceChildren(...cardsFor(activeCat,query).map(x=>makeCard(x,74)));
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
  <select id="arqPanelCat" aria-label="Categoría de bloques"></select>
  <div class="arq-grid" id="arqPanelGrid"></div>
  <div id="arqSizeRow" hidden><label>Ancho cm<input type="number" id="arqW" step="5"></label><label>Prof. cm<input type="number" id="arqD" step="5"></label><button type="button" class="btn" id="arqApplySize">Aplicar</button></div>
  <p id="arqHelp" style="font-size:10px;color:#9cb1bc;margin:7px 0 0">Clic en una miniatura y luego en el plano. Al seleccionar el bloque insertado: ▶ ancho, ▲ profundidad, ▼ variantes. Los artefactos se reubican, no se deforman.</p>
 </div>`;
 if(neighbour)neighbour.before(panel);else dock.prepend(panel);
 $('arqCollapse').onclick=()=>{const body=$('arqPanelBody');body.hidden=!body.hidden;$('arqCollapse').textContent=body.hidden?'+':'−'};
 $('arqPanelSearch').oninput=e=>{query=e.target.value;$('arqPanelGrid').replaceChildren(...cardsFor(activeCat,query).map(x=>makeCard(x,74)))};
 $('arqOpenBig').onclick=()=>openModal();
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
 const m=document.createElement('div');m.id='arqModal';m.hidden=true;m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');m.setAttribute('aria-label','Galería arquitectónica');
 m.innerHTML=`<div class="arq-box"><header><h2>GALERÍA ARQUITECTÓNICA · ${LIB.library.length} BLOQUES DINÁMICOS</h2><span id="arqModalCount" style="font-size:11px;color:#9cb1bc"></span><button type="button" class="btn" id="arqModalClose" aria-label="Cerrar">✕</button></header>
 <div class="arq-tools"><input type="search" id="arqModalSearch" placeholder="Buscar en toda la galería…" aria-label="Buscar en la galería"><div class="arq-chips" id="arqModalChips" role="group" aria-label="Categorías"></div></div>
 <div class="arq-grid" id="arqModalGrid"></div></div>`;
 document.body.append(m);
 m.addEventListener('pointerdown',e=>{if(e.target===m)closeModal()});
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
 if(item.wMax>item.wMin)g.push({kind:'w',local:P(e.x1,(e.y0+e.y1)/2)});
 if(item.dMax>item.dMin&&!item.lockAspect)g.push({kind:'d',local:P((e.x0+e.x1)/2,e.y1)});
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
 const w=Math.max(item.wMin,Math.min(item.wMax,W)),d=item.lockAspect?w:Math.max(item.dMin,Math.min(item.dMax,D));
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
 if(gripDrag.kind==='w'){gripDrag.W=Math.max(item.wMin,Math.min(item.wMax,snapMeters(q.x-(e.x1-a.w),ev.shiftKey)));if(item.lockAspect)gripDrag.D=gripDrag.W}
 else gripDrag.D=Math.max(item.dMin,Math.min(item.dMax,snapMeters(q.y-(e.y1-a.d),ev.shiftKey)));
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
 Object.assign(pick,{active:true,points:[],need,label,done,mouse:null,mode});
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
 const raw=ask(item.name+'\nAncho × Profundidad en cm (rango '+cm(item.wMin)+'–'+cm(item.wMax)+' × '+cm(item.dMin)+'–'+cm(item.dMax)+')',cm(a.w)+'x'+cm(a.d));
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
 const s=selected().filter(e=>areaOf(e)!==null);if(!s.length)return CORE.toast('LOCAL: seleccioná rectángulos, polilíneas cerradas o círculos');
 const name=ask('LOCAL · nombre del ambiente','ESTAR');if(name===null)return;
 const k=f(),toM2=1/(k*k),h=.15*k;CORE.saveHistory();
 for(const e of s){const c=centroid(e),m2=areaOf(e)*toM2,label=(name||'LOCAL').toUpperCase(),sup=m2.toFixed(2).replace('.',',')+' m²';
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
  out.push(item('Orden: traer al frente',()=>drawOrder(true)),item('Orden: enviar al fondo',()=>drawOrder(false)));
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

/* ---------- Clic derecho estilo CAD ----------
   Sin comando activo, sin selección y sin objeto bajo el cursor: menú contextual por defecto
   (Repetir último, Entrada reciente, Galería…) en lugar de un Enter silencioso.
   Con comando activo se mantiene el comportamiento actual (Enter / confirmar). */
CORE.canvas.addEventListener('contextmenu',ev=>{
 if(ev.shiftKey||ev.ctrlKey)return; // Shift/Ctrl + clic derecho: menú de referencias a objetos
 const st=S();if(st.tool!=='select'||st.stage.length||pick.active)return;
 const cmd=document.getElementById('command');if(cmd&&cmd.value.trim())return;
 const w=CORE.world(P(ev.offsetX,ev.offsetY));if(CORE.pick(w))return; // el núcleo abre el menú de objeto
 ev.preventDefault();ev.stopImmediatePropagation();
 try{localStorage.getItem('cad2d-rightclick-enter')==='1'?CORE.command(''):CORE.openContextMenu(ev.clientX,ev.clientY,w)}catch(e){CORE.openContextMenu(ev.clientX,ev.clientY,w)}
},true);
/* ---------- Conexión ---------- */
const canvas=CORE.canvas;
canvas.addEventListener('pointerdown',onPointerDown,true);
canvas.addEventListener('pointermove',onPointerMove,true);
canvas.addEventListener('pointerup',onPointerUp,true);
buildPanel();buildModal();updateIsoBadge();
window.CAD2D_ARQ=Object.freeze({openGallery:openModal,thumb:(id,h)=>{const it=byId(id);return it?thumb(it,h||96):''},layerFor:cat=>(LAYERS[cat]||[])[0]||null,insert:(id,W,D)=>{const it=byId(id);if(!it)throw Error('Bloque inexistente');armInsert(it,W,D)},resizeSelected:(W,D)=>{const r=selectedArqRef();if(r)resizeRef(r,W,D)},count:LIB.library.length,selectedInfo:()=>{const r=selectedArqRef(),a=r&&arqOf(r);return a?{id:a.id,w:a.w,d:a.d}:null},grips:()=>{const r=selectedArqRef();return r?gripsFor(r).map(g=>({kind:g.kind,x:g.screen.x,y:g.screen.y})):[]}});
})();
