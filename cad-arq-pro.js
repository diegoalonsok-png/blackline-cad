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


const DOC_DIMS='A-ARQ-COTAS',DOC_HATCH='A-ARQ-HATCH';
const docEligible=item=>['Dormitorios completos','Baños completos','Cocinas completas','Habitaciones completas','Vestidores completos','Dormitorios en suite','Sanitarios colectivos','Cocinas hoteleras'].includes(item.cat);
function ensureDocLayer(id,color){
 const st=S();let layer=st.layers.find(l=>l.id===id);
 if(!layer){layer={id,name:id,color,visible:true,locked:false,width:.13};st.layers.push(layer)}
 return layer;
}
function isCleanOpening(item){
 if(item.dynamicOpening)return true;
 return /^(?:alz-(?:puerta|ventana)|dk-(?:puerta|ventana|pano|corrediza)|cv-ventana)/.test(item.id)||(['Carpinterías','Aberturas','Puertas y ventanas'].includes(item.cat)&&/puerta|ventana|ventanal|paño fijo|pano fijo|portón|door|window/i.test(item.name));
}
function cleanPlanEntities(item,entities){
 return isCleanOpening(item)?entities.filter(e=>!['text','dimension','mtext','attdef','attrib'].includes(e.type)&&!e.attdef):entities;
}
function grayPlanColor(e){
 if(e.type==='hatch')return '#a2a2a2';
 if(e.type==='text')return '#8c8c8c';
 return e.width>=.18?'#707070':'#b0b0b0';
}
function docChoices(item){
 return docEligible(item)?{dims:$('arqDocDims')?.checked??true,hatch:$('arqDocHatch')?.checked??true}:{dims:false,hatch:false};
}
function docGeometry(entities,W,D,opts){
 const out=[],eps=1e-6;
 if(opts.hatch){
  // Match the actual parallel outer and inner faces; never bridge an entry gap.
  const ls=entities.filter(e=>e.type==='line'&&e.a&&e.b);
  for(const axis of ['x','y']){
   const along=axis==='x'?'y':'x',limit=axis==='x'?W:D;
   const axisLines=ls.filter(e=>Math.abs(e.a[axis]-e.b[axis])<eps);
   for(const edge of [0,limit]){
    const outer=axisLines.filter(e=>Math.abs(e.a[axis]-edge)<eps);
    const inner=axisLines.filter(e=>[.12,.15].some(t=>Math.abs(e.a[axis]-(edge===0?t:limit-t))<eps));
    for(const a of outer)for(const b of inner){
     const p=Math.max(Math.min(a.a[along],a.b[along]),Math.min(b.a[along],b.b[along]));
     const q=Math.min(Math.max(a.a[along],a.b[along]),Math.max(b.a[along],b.b[along]));
     if(q-p<.02)continue;
     const v=b.a[axis],pt=(x,y)=>axis==='x'?{x,y}:{x:y,y:x};
     // Trim horizontal strips at the vertical wall corners to avoid duplicate fill.
     const p2=axis==='y'?Math.max(p,.15):p,q2=axis==='y'?Math.min(q,W-.15):q;
     if(q2-p2<.02)continue;
     out.push({type:'hatch',pts:[pt(edge,p2),pt(edge,q2),pt(v,q2),pt(v,p2)],hatchStyle:'solid',width:.05,layer:DOC_HATCH,arqDocLayer:true,color:'#a2a2a2'});
    }
   }
  }
 }
 if(opts.dims){
  const style={precision:2,textHeight:.12,arrow:.10,displayUnit:'m',hideUnit:true,suffix:'',color:'#909090',arrowType:'tick',extOffset:.05,extBeyond:.08};
  for(const [a,b,p] of [[P(0,D),P(W,D),P(W/2,D+.35)],[P(W,0),P(W,D),P(W+.35,D/2)]])
   out.push({type:'dimension',mode:'aligned',a,b,p,style:{...style},width:.13,layer:DOC_DIMS,arqDocLayer:true});
 }
 return out;
}

/* ---------- Definiciones de bloque generadas ---------- */
function defName(item,W,D){return 'ARQ · '+item.name+' · '+cm(W)+'×'+cm(D)}
function ensureDefinition(item,W,D,opts=docChoices(item),openingOptions){
 const opening=item.arqBedroom?{...item.openingDefaults,...openingOptions}:undefined;
 const built=LIB.build(item.id,W,D,opening),k=f(),st=S();
 const gray=docEligible(item)||isCleanOpening(item);
 built.entities=cleanPlanEntities(item,built.entities);
 const docs=docEligible(item)?docGeometry(built.entities,built.w,built.d,opts):[];
 const docSuffix=docs.length?' · '+(opts.dims?'C':'')+(opts.hatch?'H':''):'',oldName=defName(item,built.w,built.d)+docSuffix+(gray?' · Gris v1':'')+(opening?' · P'+cm(opening.doorWidth)+'x'+cm(opening.doorHeight)+' V'+cm(opening.windowWidth)+'x'+cm(opening.windowHeight):'');
 if(docs.some(e=>e.layer===DOC_DIMS))ensureDocLayer(DOC_DIMS,'#909090');
 if(docs.some(e=>e.layer===DOC_HATCH))ensureDocLayer(DOC_HATCH,'#a2a2a2');
 // Preserve old colored definitions used by existing drawings. New insertions
 // receive a separate white/0 definition instead of silently mutating history.
 const name=st.blocks[oldName]&&!st.blocks[oldName].libraryLayer0?oldName+' · Layer 0':oldName;
 if(!st.blocks[name]){
  const ents=built.entities.map(e=>scaleEntity(e,k));
  for(const e of ents){e.layer='0';e.color=gray?grayPlanColor(e):'#ffffff';if(e.width===undefined)e.width=e.type==='text'?.09:.13}
  const docEnts=docs.map(e=>scaleEntity(e,k));
  const def=CORE.cadPrepareDynamicBlock({name,entities:CORE.normalizeBlockEntities([...docEnts.filter(e=>e.type==='hatch'),...ents,...docEnts.filter(e=>e.type==='dimension')])});
  if(docs.length)def.arqDocumentation=true;
  if(gray)def.arqGrayPlan=true;
  // La familia ARQ regenera geometría en lugar de deformarla: el estiramiento genérico se desactiva.
  def.dynamic2d=false;def.dynamicActions=true;def.pro=Boolean(item.pro);def.paidOnly=Boolean(item.paidOnly);def.libraryLayer0=true;
  const bb=LIB.bounds(built.entities);
  def.arq={id:item.id,w:built.w,d:built.d,unit:st.unit,...(opening?{opening,openings:built.openings}:{}),doc:docs.length?{...opts}:{dims:false,hatch:false},ext:bb?{x0:bb.minX,y0:bb.minY,x1:bb.maxX,y1:bb.maxY}:null};
  st.blocks[name]=def;CORE.renderBlockLibrary();CORE.queueLocalBackup();
 }
 return name;
}
function scaleEntity(e,k){
 const o=JSON.parse(JSON.stringify(e));
 for(const key of ['a','b','c','p'])if(o[key])o[key]={x:o[key].x*k,y:o[key].y*k};
 if(o.pts)o.pts=o.pts.map(p=>({x:p.x*k,y:p.y*k}));
 if(o.r)o.r*=k;if(o.rx)o.rx*=k;if(o.ry)o.ry*=k;if(o.h)o.h*=k;
 if(o.type==='dimension'&&o.style)for(const key of ['textHeight','arrow','extOffset','extBeyond'])if(Number.isFinite(o.style[key]))o.style[key]*=k;
 return o;
}
const arqOf=ref=>ref&&ref.type==='blockRef'?S().blocks[ref.blockName]?.arq:null;

/* ---------- Inserción ---------- */
let pendingInsert=null,lastItem=null;
function armInsert(item,W,D){
 window.CAD2D_DYNAMIC_OPENINGS?.enhance?.();
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
 const entities=cleanPlanEntities(item,LIB.build(item.id,W??item.w,D??item.d).entities),b=LIB.bounds(entities);
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
function arqSimpleName(item){
 const patterns=[['Puerta',/\b(?:puerta|door|porton|portón)\b/i],['Ventana',/\b(?:ventana|ventanal|window)\b/i],['Escalera',/\b(?:escalera|stair)\b/i],['Inodoro',/\b(?:inodoro|toilet|wc)\b/i],['Bañadera',/\b(?:bañadera|bañera|bathtub)\b/i],['Auto',/\b(?:auto|automóvil|coche|car)\b/i],['Camión',/\b(?:camión|camion|truck)\b/i],['Árbol',/\b(?:árbol|arbol|tree)\b/i],['Heladera',/\b(?:heladera|refrigerador|fridge)\b/i],['Cocina',/\b(?:cocina|kitchen)\b/i]];
 const type=patterns.find(p=>p[1].test(String(item.name||'')))?.[0];
 if(!type)return item.name;
 const matching=LIB.library.filter(x=>patterns.find(p=>p[1].test(String(x.name||'')))?.[0]===type).sort((a,b)=>String(a.id).localeCompare(String(b.id)));
 return type+' '+(matching.findIndex(x=>x.id===item.id)+1);
}
function makeCard(item,height,dims){
 const W=dims?.[0],D=dims?.[1];
 const b=document.createElement('button');b.type='button';b.className='btn arq-card';b.dataset.arq=item.id;
 b.title=arqSimpleName(item)+' · '+sizeLabel(item)+(isDynamic(item)?' · dinámico: '+cm(item.wMin)+'–'+cm(item.wMax)+' × '+cm(item.dMin)+'–'+cm(item.dMax)+' cm':'')+' · clic para insertar';
 b.innerHTML=(dims?svgFor(item,W,D,{height}):thumb(item,height))+`<span class="arq-name">${esc(arqSimpleName(item))}</span><span class="arq-meta">${dims?cm(W)+'×'+cm(D)+' cm':sizeLabel(item)}${isDynamic(item)?' · ↔ dinámico':''}</span>`+(item.pro?'<span class="arq-pro">PRO</span>':'');
 b.onclick=()=>{if(armInsert(item,W,D)===false)return;for(const c of document.querySelectorAll('.arq-card'))c.setAttribute('aria-pressed',String(c.dataset.arq===item.id));closeModal()};
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
window.CAD2D_ARQ_REFRESH=()=>{window.CAD2D_DYNAMIC_OPENINGS?.enhance?.();const s=$('arqPanelCat');if(s)s.innerHTML='';renderPanel()};
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
 const grid=$('arqPanelGrid');if(!grid)return;
 const sel=$('arqPanelCat');
 if(!sel.options.length){for(const cat of ['Todos',...LIB.categories.filter(c=>LIB.library.some(x=>x.cat===c&&!x.hideFromGallery))]){const o=document.createElement('option');o.value=cat;o.textContent=cat+' ('+(cat==='Todos'?LIB.library.filter(x=>!x.hideFromGallery).length:LIB.library.filter(x=>x.cat===cat&&!x.hideFromGallery).length)+')';sel.append(o)}sel.onchange=()=>{activeCat=sel.value;query='';$('arqPanelSearch').value='';renderPanel()}}
 sel.value=activeCat;
 fillPanelGrid(cardsFor(activeCat,query));
}
function parseArqRequest(raw){
 const s=String(raw||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/^cad2d3d[,:\s]+/,'');
 if(!/^(?:mostra(?:me|r)?|muestra(?:me)?|mostrar|ver|lista(?:me|r|do)?|show(?: me)?|list|construi(?:me|r)?|construye(?:me)?|crea(?:me|r)?|genera(?:me|r)?|disena(?:me|r)?|build|create|generate|design)\b/.test(s))return null;
 const generate=/^(?:construi|construye|crea|genera|disena|build|create|generate|design)/.test(s);
 const wardrobe=/\b(?:vestidor(?:es)?|walk-in(?: closet)?|closet(?:s)?)\b/.test(s);
 const suite=/\b(?:suite|ensuite|en-suite)\b/.test(s);
 const room=/\b(?:habitacion(?:es)?|dormitorio(?:s)?|hotel(?:es)?|bedroom(?:s)?|room(?:s)?|tandem)\b/.test(s)||suite;
 
 const bath=/\b(?:bano(?:s)?|bathroom(?:s)?|toilette(?:s)?)\b/.test(s);
 const kitchen=/\b(?:cocina(?:s)?|kitchen(?:s)?)\b/.test(s);
 const gym=/\b(?:gimnasio(?:s)?|gym(?:s)?|vestuario(?:s)?|changing rooms?|sanitarios colectivos|club(?:es)?|escuela(?:s)?|school(?:s)?)\b/.test(s);
 const hotelKitchen=kitchen&&/\b(?:hotel(?:es)?|hotelera(?:s)?|hotelero(?:s)?|banquete(?:s)?|banquet(?:s)?)\b/.test(s);
 if(!gym&&!hotelKitchen&&!room&&!wardrobe&&bath===kitchen)return {kind:'unsupported'};
 const category=room?'Habitaciones completas':wardrobe?'Vestidores completos':bath?'Baños completos':'Cocinas completas';
 const match=s.match(/(\d+(?:[.,]\d+)?)\s*(cm|mm|m)?\s*(?:x|×|por|by)\s*(\d+(?:[.,]\d+)?)\s*(cm|mm|m)?\b/);
 const unit=(n,u)=>Number(n.replace(',','.'))/({cm:100,mm:1000,m:1}[u]||1);
 const dims=match?[unit(match[1],match[2]||match[4]),unit(match[3],match[4]||match[2])]:null;
 if(dims&&dims.some(n=>!Number.isFinite(n)||n<=0||n>30))return {kind:'invalid'};
 if(gym&&(bath||/\b(?:wc|inodoro(?:s)?|ducha(?:s)?|shower(?:s)?|toilet(?:s)?|sanitarios|vestuario(?:s)?|changing rooms?)\b/.test(s))){
  if(/\b(?:accesible|accessible|mixto|mixed)\b/.test(s))return {kind:'unsupported'};
  const numbers={cero:0,uno:1,una:1,un:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8};
  const num='(\\d+|'+Object.keys(numbers).join('|')+')';
  const q=s.match(new RegExp('\\b'+num+'\\s+(?:wc|inodoro(?:s)?|toilet(?:s)?|cabina(?:s)?|bano(?:s)?)\\b'));
  const d=s.match(new RegExp('\\b'+num+'\\s+(?:ducha(?:s)?|shower(?:s)?)\\b'));
  const parse=m=>m?(numbers[m[1]]??Number(m[1])):null;
  const n=parse(q),m=parse(d);
  const noShowers=/\b(?:sin duchas|without showers|no showers)\b/.test(s);
  if(n!==null&&(!Number.isInteger(n)||n<2||n>8)||m!==null&&(!Number.isInteger(m)||m<0||m>8))return {kind:'invalid'};
  if(noShowers&&m>0)return {kind:'invalid'};
  const showerCount=noShowers?0:m;
  const showers=showerCount!==null?showerCount>0:/\b(?:ducha(?:s)?|shower(?:s)?)\b/.test(s)?true:null;
  const bench=/\b(?:banco(?:s)?|bench(?:es)?|vestuario(?:s)?|changing rooms?)\b/.test(s)?true:null;
  const lockers=/\b(?:locker(?:s)?|casillero(?:s)?|taquilla(?:s)?|vestuario(?:s)?|changing rooms?)\b/.test(s)?true:null;
  return {kind:'catalog',category:'Sanitarios colectivos',dims,count:null,filters:[],stallCount:n,showerCount,showers,bench,lockers};
 }
 if(hotelKitchen){
  if(/\b\d+\s*(?:comensales|cubiertos|huespedes|guests|covers)\b/.test(s))return {kind:'unsupported'};
  const filters=[];
  if(/\b(?:banquete(?:s)?|banquet(?:s)?)\b/.test(s))filters.push(/banquetes/);
  if(/\b(?:desayuno(?:s)?|breakfast)\b/.test(s))filters.push(/desayunos/);
  if(/\b(?:restaurante|restaurant)\b/.test(s))filters.push(/restaurante/);
  return {kind:'catalog',category:'Cocinas hoteleras',dims,count:null,filters};
 }
 if(wardrobe&&!room&&!bath&&!kitchen){
  const filters=[];
  if(/\b(?:en l|l-shaped)\b/.test(s))filters.push(/en l\b/);
  if(/\b(?:en u|u-shaped)\b/.test(s))filters.push(/en u\b/);
  if(/\b(?:paralelo|parallel)\b/.test(s))filters.push(/paralelo/);
  if(/\b(?:lineal|linear)\b/.test(s))filters.push(/lineal/);
  return {kind:'catalog',category:'Vestidores completos',dims,count:null,filters};
 }
 if(room){
  if(/\b(?:accesible|accessible|sin pasillo|without corridor|cocina|kitchen|bano compartido|shared bathroom)\b/.test(s))return {kind:'unsupported'};
  const words={un:1,una:1,uno:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9,diez:10,once:11,doce:12,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12};
  const q=s.match(/\b(\d+|un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(?:hotel\s+)?(?:habitacion(?:es)?|dormitorio(?:s)?|bedroom(?:s)?|room(?:s)?)\b/);
  const n=q?(words[q[1]]??Number(q[1])):1;
  if(!Number.isInteger(n)||n<1||n>12)return {kind:'invalid'};
  const noBath=/\b(?:sin bano|without (?:a )?bathroom|no bathroom)\b/.test(s);
  const privateBath=noBath?false:bath||/\b(?:suite|ensuite|en-suite|hotel|private bath)\b/.test(s)?true:null;
  if(wardrobe){
   if(n!==1||/\b(?:tandem|hotel|sin bano|without (?:a )?bathroom)\b/.test(s))return {kind:'unsupported'};
   const filters=[];
   if(/\bking\b/.test(s))filters.push(/king/);
   if(/\bqueen\b/.test(s))filters.push(/queen/);
   if(/\b(?:matrimonial|double)\b/.test(s))filters.push(/double/);
   if(/\b(?:en l|l-shaped)\b/.test(s))filters.push(/en l\b/);
   if(/\b(?:paralelo|parallel)\b/.test(s))filters.push(/paralelo/);
   return {kind:'catalog',category:'Dormitorios en suite',dims,count:null,filters};
  }
  if(n===1&&!privateBath&&!/\b(?:tandem|hotel|corredor|corridor)\b/.test(s)){
   const filters=[];
   if(/\b(?:individual|single)\b/.test(s))filters.push(/individual/);
   if(/\bqueen\b/.test(s))filters.push(/queen/);
   if(/\bking\b/.test(s))filters.push(/king/);
   if(/\b(?:familiar|family)\b/.test(s))filters.push(/familiar/);
   if(/\b(?:dos camas|twin)\b/.test(s))filters.push(/dos camas/);
   if(/\b(?:escritorio|desk)\b/.test(s))filters.push(/escritorio/);
   return {kind:'catalog',category:'Dormitorios completos',dims,count:null,filters};
  }
  const moduleDims=dims||[4,6];
  return {kind:'rooms',category,n,privateBath,dims:[moduleDims[0]*n,moduleDims[1]+1.65],moduleDims};
 }
 const number=s.match(/\b(\d+)\s+(?:distribuciones|alternativas|variantes|layouts|options|bano(?:s)?|cocina(?:s)?|bathroom(?:s)?|kitchen(?:s)?)\b/);
 const count=number?Number(number[1]):null;
 if(count!==null&&(count<1||count>500))return {kind:'invalid'};
 if(generate&&count!==null&&count>1)return {kind:'unsupported'};
 const filters=[];
 if(bath){
  if(/\b(?:bidet)\b/.test(s))filters.push(/bidet/);
  if(/\b(?:ducha|shower)\b/.test(s))filters.push(/ducha/);
  if(/\b(?:banera|banadera|bathtub)\b/.test(s))filters.push(/banera|banadera/);
  if(/\b(?:accesible|accessible)\b/.test(s))filters.push(/accesible/);
  if(/\b(?:toilette)\b/.test(s))filters.push(/toilette/);
 }else{
  if(/\b(?:isla|island)\b/.test(s))filters.push(/isla/);
  if(/\b(?:peninsula)\b/.test(s))filters.push(/peninsula/);
  if(/\b(?:en l|l-shaped)\b/.test(s))filters.push(/en l\b/);
  if(/\b(?:en u|u-shaped)\b/.test(s))filters.push(/en u\b/);
 }
 return {kind:'catalog',category,dims,count,filters};
}
function runArqRequest(raw){
 const request=parseArqRequest(raw);
 if(!request)return false;
 const msg=$('arqHelp');
 if(request.kind==='rooms'){
  const {category,n,privateBath,dims,moduleDims}=request;
  const items=LIB.library.filter(x=>x.cat===category&&x.roomCount===n&&(privateBath===null||x.privateBath===privateBath)&&dims[0]>=x.wMin&&dims[0]<=x.wMax&&dims[1]>=x.dMin&&dims[1]<=x.dMax);
  activeCat=category;query='';$('arqPanelCat').value=category;
  $('arqPanelGrid').replaceChildren(...items.map(x=>makeCard(x,100,dims)));
  msg.textContent=items.length?items.length+' alternativas · '+n+' habitación(es), módulo nominal '+cm(moduleDims[0])+' × '+cm(moduleDims[1])+' cm + corredor libre de 150 cm y muro exterior de 15 cm. Medidas libres interiores menores por muros. Revisá normativa y circulación. Clic para insertar.':'No hay una configuración para esas dimensiones. Probá módulos de 3,80–6 m por 5–10 m.';
  return true;
 }
 if(request.kind!=='catalog'){
  msg.textContent=request.kind==='invalid'?'Medidas o cantidad inválidas.':'Esta configuración todavía no está disponible. No se modificó el dibujo.';
  return true;
 }
 const normalize=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const {category,dims,count,filters,stallCount,showerCount,showers,bench,lockers}=request;
 const items=LIB.library.filter(x=>x.cat===category&&!x.hideFromGallery&&(stallCount==null||x.stallCount===stallCount)&&(showerCount==null||x.showerCount===showerCount)&&(showers==null||(x.showerCount>0)===showers)&&(bench==null||x.hasBench===bench)&&(lockers==null||x.hasLockers===lockers)&&filters.every(rx=>rx.test(normalize(x.name)))&&(!dims||(typeof x.gen==='function'&&!x.lockAspect&&dims[0]>=(x.wMin??x.w)&&dims[0]<=(x.wMax??x.w)&&dims[1]>=(x.dMin??x.d)&&dims[1]<=(x.dMax??x.d))));
 activeCat=category;query='';$('arqPanelCat').value=category;
 const shown=count===null?items:items.slice(0,count);
 $('arqPanelGrid').replaceChildren(...shown.map(x=>makeCard(x,74,dims)));
 msg.textContent=shown.length+' configuraciones disponibles'+(count!==null&&shown.length<count?' de '+count+' solicitadas':'')+(dims?' · '+cm(dims[0])+' × '+cm(dims[1])+' cm':'')+'. '+(shown.length?'Seleccioná una miniatura para insertar.':'Probá otras dimensiones o características.');
 return true;
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
  <div style="display:flex;gap:5px"><input type="search" id="arqPanelSearch" placeholder="Buscar o pedir: mostrame baños…" aria-label="Buscar bloque arquitectónico"><button type="button" class="btn slim" id="arqOpenBig" title="Galería grande (GALERIA)">⤢</button></div>
  <button type="button" class="btn slim" id="arqOpenVisual" title="Galería visual en fondo crema · clic en imagen y luego en plano" style="display:block;width:100%;margin:7px 0 4px;text-align:center;background:#e6d3a9;color:#3d352b;border:1px solid #bca175;font-weight:600">▦ Galería visual · bloques detallados</button>
  <button type="button" class="btn slim" id="arqOpenOlimpiadas" title="Abrir biblioteca de bloques 2D · más de 1000 bloques en vista y planta" style="display:block;width:100%;margin:3px 0 6px;text-align:center;background:#e4dccb;color:#3d352b;border:1px solid #bca175;font-weight:600">▦ BLOQUES 2D · 1.000+</button>
  <div id="arqDrawingBlocksSlot"><button type="button" class="btn slim" id="arqDrawingBlocksFallback" style="display:block;width:100%;margin:3px 0 6px;text-align:center;font-weight:600">▦ BLOQUES DEL PLANO</button></div>
  <select id="arqPanelCat" aria-label="Categoría de bloques"></select>
  <div style="display:flex;gap:10px;flex-wrap:wrap;font-size:11px;margin:5px 0"><label><input type="checkbox" id="arqDocDims" checked> Cotas generales</label><label><input type="checkbox" id="arqDocHatch" checked> Hatch muros</label></div>
  <div class="arq-grid" id="arqPanelGrid"></div>
  <div id="arqSizeRow" hidden><label>Ancho cm<input type="number" id="arqW" step="5"></label><label>Prof. cm<input type="number" id="arqD" step="5"></label><button type="button" class="btn" id="arqApplySize">Aplicar</button></div>
  <div id="arqOpeningRow" hidden style="font-size:11px;margin:5px 0"><div>ABERTURAS · cm</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:4px"><label>Puerta ancho<input type="number" id="arqDoorW" min="80" max="110" step="5" style="width:100%"></label><label>Puerta alto<input type="number" id="arqDoorH" min="190" max="250" step="5" style="width:100%"></label><label>Ventana ancho<input type="number" id="arqWindowW" min="80" max="240" step="5" style="width:100%"></label><label>Ventana alto<input type="number" id="arqWindowH" min="60" max="180" step="5" style="width:100%"></label></div><button type="button" class="btn slim" id="arqOpeningApply">Aplicar aberturas</button></div>
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
 $('arqCollapse').onclick=()=>{const body=$('arqPanelBody');body.hidden=!body.hidden;$('arqCollapse').textContent=body.hidden?'+':'−'};
 $('arqPanelSearch').oninput=e=>{query=e.target.value;fillPanelGrid(cardsFor(activeCat,query))};
 $('arqPanelSearch').addEventListener('keydown',e=>{if(e.key==='Enter'&&runArqRequest(e.currentTarget.value)){e.preventDefault();e.stopPropagation()}});
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
 $('arqOpeningApply').onclick=applyBedroomOpenings;
 for(const id of ['arqW','arqD'])$(id).addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();applySizeRow()}});
 renderPanel();
}
function syncSizeRow(item,arq){
 const op=$('arqOpeningRow');if(op){op.hidden=!item.arqBedroom;if(item.arqBedroom){const o=arq?.opening||item.openingDefaults;for(const [id,key] of [['arqDoorW','doorWidth'],['arqDoorH','doorHeight'],['arqWindowW','windowWidth'],['arqWindowH','windowHeight']])$(id).value=cm(o[key]);}}
 const row=$('arqSizeRow');if(!row)return;
 row.hidden=!isDynamic(item);if(row.hidden)return;
 $('arqW').value=cm(arq?.w??item.w);$('arqD').value=cm(arq?.d??item.d);
 $('arqW').min=cm(item.wMin);$('arqW').max=cm(item.wMax);$('arqD').min=cm(item.dMin);$('arqD').max=cm(item.dMax);
 $('arqD').disabled=item.lockAspect||item.dMin===item.dMax;
 row.dataset.item=item.id;
}
function applyBedroomOpenings(){
 const ref=selectedArqRef(),a=ref&&arqOf(ref),item=a&&byId(a.id);
 if(!item?.arqBedroom||!allowed(item)||CORE.layerFor(ref).locked||!CORE.layerFor(ref).visible)return CORE.toast('Seleccioná un dormitorio editable.');
 const opening={doorWidth:Number($('arqDoorW').value)/100,doorHeight:Number($('arqDoorH').value)/100,windowWidth:Number($('arqWindowW').value)/100,windowHeight:Number($('arqWindowH').value)/100};
 try{
  LIB.build(item.id,a.w,a.d,opening); // Validate before modifying the drawing or undo history.
  CORE.saveHistory();
  ref.blockName=ensureDefinition(item,a.w,a.d,a.doc||{dims:false,hatch:false},opening);delete ref.dynamic;
  CORE.updateAll();syncSizeRow(item,S().blocks[ref.blockName].arq);CORE.toast('Aberturas regeneradas · Ctrl+Z deshace');
 }catch(e){CORE.toast(e.message)}
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
 ref.blockName=ensureDefinition(item,w,d,a.doc||{dims:false,hatch:false},a.opening);delete ref.dynamic;
 CORE.updateAll();syncSizeRow(item,S().blocks[ref.blockName].arq);
 CORE.toast(item.name+' → '+cm(w)+' × '+cm(d)+' cm · Ctrl+Z deshace');
}
function swapVariant(ref,id){
 const a=arqOf(ref),item=byId(id);if(!a||!item)return;
 if(!allowed(item))return plan().upsell('Bloque Pro: '+item.name);
 CORE.saveHistory();ref.blockName=ensureDefinition(item,a.w,a.d,a.doc||{dims:false,hatch:false},a.opening);delete ref.dynamic;
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

/* ---------- Conexión ---------- */
const canvas=CORE.canvas;
canvas.addEventListener('pointerdown',onPointerDown,true);
canvas.addEventListener('pointermove',onPointerMove,true);
canvas.addEventListener('pointerup',onPointerUp,true);
buildPanel();buildModal();updateIsoBadge();
window.CAD2D_ARQ=Object.freeze({openGallery:openModal,thumb:(id,h)=>{const it=byId(id);return it?thumb(it,h||96):''},layerFor:cat=>'0',insert:(id,W,D)=>{const it=byId(id);if(!it)throw Error('Bloque inexistente');return armInsert(it,W,D)},resizeSelected:(W,D)=>{const r=selectedArqRef();if(r)resizeRef(r,W,D)},canEdit:id=>{const item=byId(id);return Boolean(item&&allowed(item))},resizeByRefId:(id,W,D)=>{const ref=S().entities.find(e=>e.id===id),a=ref&&arqOf(ref),item=a&&byId(a.id);if(!item||!allowed(item)||CORE.layerFor(ref).locked||CORE.layerFor(ref).visible===false)return false;resizeRef(ref,W,D);return true},count:LIB.library.filter(x=>!x.hideFromGallery).length,selectedInfo:()=>{const r=selectedArqRef(),a=r&&arqOf(r);return a?{id:a.id,w:a.w,d:a.d}:null},grips:()=>{const r=selectedArqRef();return r?gripsFor(r).map(g=>({kind:g.kind,x:g.screen.x,y:g.screen.y})):[]}});
})();
