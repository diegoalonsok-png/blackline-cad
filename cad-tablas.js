/* CAD2D3D · Pegar texto y tablas, y planillas de aberturas (Nov 2026). Implementación propia.
 *
 * Ctrl+V con el cursor en el dibujo:
 *   - texto copiado de cualquier programa (bloc de notas, Word, un mail) → texto multilínea en el cursor;
 *   - celdas copiadas de una planilla de cálculo (columnas separadas por tabulaciones, o tabla HTML)
 *     → tabla CAD de líneas y textos editables, con anchos de columna según el contenido;
 *   - objetos copiados con Ctrl+C dentro del programa → se pegan como siempre.
 * PLANILLAABERTURAS / DOORSCHEDULE: cuenta puertas y ventanas de la planta (bloques de aberturas),
 *   las agrupa por tipo y medida, numera P1, P2… V1, V2… y dibuja la planilla; opcionalmente rotula la planta.
 * Desde el 3D, la misma planilla sale con alto y antepecho reales (puente addSchedule).
 */
(function(){
'use strict';
const CORE=window.CAD2D_CORE,EXT=window.CAD2D_EXTENSIONS;if(!CORE||!EXT)return;
const P=(x,y)=>({x,y}),S=()=>CORE.state,$=id=>document.getElementById(id);
const L=(es,en)=>document.documentElement.lang==='es'?es:en;
const MARK='⁣CAD2D3D-OBJETOS⁣';
const textH=()=>{const v=Number(String($('textHeight')?.value||'').replace(',','.'));return v>0&&v<1e6?v:.25*1000/CORE.U[S().unit]};
function layerId(name,color){
 const st=S();let l=st.layers.find(x=>x.name===name);
 if(!l){let id='tb-'+name.toLowerCase().replace(/[^a-z0-9]+/g,'-');while(st.layers.some(x=>x.id===id))id+='-';l={id,name,visible:true,locked:false,color,width:.18,linetype:'CONTINUOUS'};st.layers.push(l)}
 return l.id;
}
// Capas de anotación: se usa la del dibujo si ya existe (con nombres habituales en castellano o inglés), si no se crea.
const TEXT_LAYER=/^(TEXT|TEXTS|TEXTO|TEXTOS|A[-_ ]?TEXT\w*|A[-_ ]?ANNO[-_ ]?TEXT\w*|A[-_ ]?TEXTO\w*|ANNOTATION|ANOTACION(ES)?)$/i;
const TABLE_LAYER=/^(TABLES?|TABLAS?|PLANILLAS?|A[-_ ]?TABL\w*|A[-_ ]?PLANILL\w*|A[-_ ]?ANNO[-_ ]?TABL\w*|SCHEDULES?)$/i;
function annotationLayer(re,name,color){const l=S().layers.find(x=>re.test(String(x.name||'').trim()));if(l){if(l.locked)l.locked=false;if(l.visible===false)l.visible=true;return l.id}return layerId(name,color)}
const textLayer=()=>annotationLayer(TEXT_LAYER,'TEXT','#ffffff'),tableLayer=()=>annotationLayer(TABLE_LAYER,'TABLES','#e6e6e6');
const fmtNum=v=>Number(v).toFixed(2).replace('.',',');

/* ---------- Tabla genérica: filas de texto → líneas y textos ---------- */
function gridTable(origin,data,opt={}){
 const rows=data.map(r=>r.map(c=>String(c??'').replace(/\s+/g,' ').trim().slice(0,200)));
 const nCols=Math.max(...rows.map(r=>r.length));if(!rows.length||!nCols)return [];
 for(const r of rows)while(r.length<nCols)r.push('');
 const h=opt.h||textH(),pad=h*.6,rowH=h*2.1,cw=h*.62;
 const widths=[...Array(nCols)].map((_,j)=>Math.max(h*3,...rows.map(r=>r[j].length*cw))+pad*2);
 const total=widths.reduce((a,b)=>a+b,0),layer=opt.layer||S().layerId,out=[];
 let y=origin.y;
 if(opt.title){out.push({type:'text',p:P(origin.x,y+h*.8),text:opt.title,h:h*1.25,layer,fontFamily:'Arial'})}
 const nRows=rows.length,bottom=y-nRows*rowH;
 for(let i=0;i<=nRows;i++)out.push({type:'line',a:P(origin.x,y-i*rowH),b:P(origin.x+total,y-i*rowH),layer,...(i===0||i===1||i===nRows?{width:.35}:{})});
 let x=origin.x;
 for(let j=0;j<=nCols;j++){out.push({type:'line',a:P(x,y),b:P(x,bottom),layer,...(j===0||j===nCols?{width:.35}:{})});if(j<nCols)x+=widths[j]}
 rows.forEach((r,i)=>{let cx=origin.x;r.forEach((c,j)=>{
  if(c){const num=/^[-+]?\d+([.,]\d+)?\s*(m|cm|mm|m²|%)?$/.test(c)&&i>0;
   const tx=num?cx+widths[j]-pad-c.length*cw:cx+pad;
   out.push({type:'text',p:P(tx,y-i*rowH-rowH*.68),text:c,h,layer,fontFamily:'Arial',...(i===0&&opt.header!==false?{bold:true}:{})})}
  cx+=widths[j]})});
 return out;
}
function commit(list,label){
 if(!list.length)return [];
 const st=S();CORE.saveHistory();const ids=[];
 for(const e of list){e.id=CORE.nextId();if(e.width==null)e.width=.18;st.entities.push(e);ids.push(e.id)}
 st.selected=ids;CORE.updateAll();CORE.log?.(label+' · '+list.length+' objetos');
 return ids;
}

/* ---------- Pegado desde el portapapeles ---------- */
function parseHTMLTable(html){
 try{const doc=new DOMParser().parseFromString(html,'text/html'),t=doc.querySelector('table');if(!t)return null;
  const rows=[...t.querySelectorAll('tr')].map(tr=>[...tr.querySelectorAll('th,td')].map(td=>td.textContent.replace(/ /g,' ').trim()));
  return rows.filter(r=>r.some(c=>c)).slice(0,400)}catch(e){return null}
}
function parseTSV(text){
 const lines=text.replace(/\r\n?/g,'\n').replace(/\n+$/,'').split('\n');
 if(lines.length<1||!lines.some(l=>l.includes('\t')))return null;
 return lines.slice(0,400).map(l=>l.split('\t').slice(0,40));
}
function pasteText(text,at){
 const clean=String(text).replace(/\r\n?/g,'\n').replace(/\t/g,'    ').replace(/[\u0000-\u0008\u000b-\u001f]/g,'').slice(0,20000).replace(/\n+$/,'');
 if(!clean.trim())return false;
 const h=textH(),lines=clean.split('\n'),width=Math.min(400,Math.max(...lines.map(l=>l.length)))*h*.62;
 const e={type:'text',p:P(at.x,at.y),text:clean,h,layer:textLayer(),fontFamily:'Arial',...(lines.length>1?{mtextWidth:+width.toFixed(6)}:{})};
 commit([e],'PEGAR TEXTO');CORE.toast(L('Texto pegado en la capa ','Text pasted on layer ')+(S().layers.find(l=>l.id===e.layer)?.name||'')+' · '+lines.length+' '+L('renglón(es)','line(s)'));
 return true;
}
function pasteTable(rows,at){
 const list=gridTable(at,rows,{layer:tableLayer()});const n=commit(list,'PEGAR TABLA');
 CORE.toast(L('Tabla pegada en la capa ','Table pasted on layer ')+(S().layers.find(l=>l.id===list[0]?.layer)?.name||'')+' · '+rows.length+' × '+Math.max(...rows.map(r=>r.length))+' · '+L('seleccionada para moverla','selected to move it'));
 return n.length>0;
}
let pasteHandled=0,lastBlur=0,lastInternalCopy=0;
// Copiar en otro programa obliga a salir de esta ventana: si no se salió desde Ctrl+C, se pegan los objetos internos.
window.addEventListener('blur',()=>{lastBlur=Date.now()});
function noteInternalCopy(){lastInternalCopy=Date.now();try{navigator.clipboard?.writeText?.(MARK).catch(()=>{})}catch(e){}}
function editingTarget(t){return !!t&&(t.closest?.('input,textarea,select,[contenteditable],[contenteditable=""],[contenteditable="true"]'))}
document.addEventListener('paste',ev=>{
 if(editingTarget(ev.target)||editingTarget(document.activeElement))return;
 if(document.querySelector('.modal-backdrop.show,dialog[open]'))return;
 const cd=ev.clipboardData;if(!cd)return;
 const text=cd.getData('text/plain')||'',html=cd.getData('text/html')||'';
 pasteHandled=Date.now();
 const internalNewer=CORE.hasCadClipboard?.()&&lastInternalCopy>lastBlur;
 if(text.includes(MARK)||(!text&&!html)||internalNewer){if(CORE.hasCadClipboard?.()){ev.preventDefault();CORE.pasteCadObjects()}return}
 const at=S().mouse&&Number.isFinite(S().mouse.x)?S().mouse:P(0,0);
 const rows=parseTSV(text)||(html?parseHTMLTable(html):null);
 ev.preventDefault();
 if(rows&&rows.length&&(rows.length>1||rows[0].length>1))pasteTable(rows,at);else pasteText(text,at);
});
/* Ctrl+V sin evento de pegado (portapapeles vacío o sin permiso): se pegan los objetos internos, como antes. */
document.addEventListener('keydown',ev=>{
 if(!(ev.ctrlKey||ev.metaKey)||ev.key.toLowerCase()!=='v'||ev.shiftKey||ev.altKey)return;
 if(editingTarget(ev.target))return;
 const t=Date.now();setTimeout(()=>{if(pasteHandled<t&&CORE.hasCadClipboard?.())CORE.pasteCadObjects()},120);
},true);

/* ---------- Planilla de aberturas desde la planta 2D ---------- */
const DOOR_KINDS=new Set(['swing-door','double-door','sliding-door','pocket-door']),WIN_KINDS=new Set(['framed-window','window']);
function classify(ref){
 const st=S(),def=st.blocks?.[ref.blockName];if(!def)return null;
 const kind=def.parametric?.kind||'',name=String(ref.blockName||'')+' '+(CORE.layerFor(ref)?.name||'');
 if(DOOR_KINDS.has(kind)||/door/.test(kind))return 'P';
 if(WIN_KINDS.has(kind)||/window/.test(kind))return 'V';
 if(/PORT[OÓ]N|GARAGE|GARAJE/i.test(name))return 'P';
 if(/PUERTA|DOOR|PTA\b/i.test(ref.blockName||''))return 'P';
 if(/VENTANA|WINDOW|PA[ÑN]O FIJO|BANDEROLA|VENT\b/i.test(ref.blockName||''))return 'V';
 return null;
}
function openingWidth(ref){
 const def=S().blocks[ref.blockName],k=Math.abs(Number(ref.scale)||1)*Math.abs(Number(ref.scaleX)||1);
 const w=Number(ref.params?.width??def.parametric?.defaults?.width);
 if(Number.isFinite(w)&&w>0)return w*k;
 const dw=Number(ref.dynamic?.width);if(Number.isFinite(dw)&&dw>0)return dw*k;
 try{const ch=CORE.blockChildren({...ref,p:P(0,0),rotation:0,scale:1,scaleX:undefined,scaleY:undefined});const b=CORE.getBounds(ch);return (b.maxX-b.minX)*k}catch(e){return 0}
}
function scheduleRows(items,withHeights){
 const groups=new Map();
 for(const it of items){const key=it.t+'|'+it.desc+'|'+it.w.toFixed(2)+'|'+(withHeights?(it.h||0).toFixed(2)+'|'+(it.sill||0).toFixed(2):'');
  const g=groups.get(key)||{...it,n:0,members:[]};g.n++;g.members.push(it);groups.set(key,g)}
 const list=[...groups.values()].sort((a,b)=>a.t.localeCompare(b.t)||a.w-b.w||a.desc.localeCompare(b.desc));
 const cnt={P:0,V:0};for(const g of list)g.code=(g.t==='P'?L('P','D'):L('V','W'))+(++cnt[g.t]);
 const head=withHeights?[L('Código','Code'),L('Tipo','Type'),L('Descripción','Description'),L('Ancho (m)','Width (m)'),L('Alto (m)','Height (m)'),L('Antepecho (m)','Sill (m)'),L('Cantidad','Qty')]
  :[L('Código','Code'),L('Tipo','Type'),L('Descripción','Description'),L('Ancho (m)','Width (m)'),L('Cantidad','Qty')];
 const rows=[head,...list.map(g=>withHeights?[g.code,g.t==='P'?L('Puerta','Door'):L('Ventana','Window'),g.desc,fmtNum(g.w),g.h?fmtNum(g.h):'—',g.t==='V'?fmtNum(g.sill||0):'—',String(g.n)]
  :[g.code,g.t==='P'?L('Puerta','Door'):L('Ventana','Window'),g.desc,fmtNum(g.w),String(g.n)])];
 const tot={P:0,V:0};for(const g of list)tot[g.t]+=g.n;
 rows.push(withHeights?['','','',L('Total','Total'),'',L('P ','D ')+tot.P+' · '+L('V ','W ')+tot.V,String(tot.P+tot.V)]:['','',L('Total','Total'),L('P ','D ')+tot.P+' · '+L('V ','W ')+tot.V,String(tot.P+tot.V)]);
 return {rows,groups:list};
}
function placeBeside(){const st=S(),vis=st.entities.filter(e=>!e.cadHidden);if(!vis.length)return P(0,0);const b=CORE.getBounds(vis),k=1000/CORE.U[st.unit];return P(b.maxX+2*k,b.maxY)}
function schedule2D(){
 const st=S(),sel=new Set(st.selected),pool=st.entities.filter(e=>e.type==='blockRef'&&!e.cadHidden&&CORE.layerFor(e).visible&&(!sel.size||sel.has(e.id)));
 const items=[];
 for(const ref of pool){const t=classify(ref);if(!t)continue;const w=openingWidth(ref);if(!(w>0))continue;
  const unit=CORE.U[st.unit]/1000;items.push({t,w:w*unit,desc:String(ref.blockName).replace(/^\*|_\d+$/g,'').slice(0,48),ref})}
 if(!items.length)return CORE.toast(L('PLANILLA DE ABERTURAS: no encontré puertas ni ventanas (bloques de aberturas) en la planta'+(sel.size?' seleccionada':''),'OPENING SCHEDULE: no doors or windows (opening blocks) found'));
 const {rows,groups}=scheduleRows(items,false);
 const tag=window.confirm(L('Planilla de aberturas: '+items.length+' abertura(s) en '+groups.length+' tipo(s).\n\n¿Rotular también cada abertura en la planta (P1, V1…)?','Opening schedule: '+items.length+' opening(s), '+groups.length+' type(s).\n\nAlso tag each opening on the plan (D1, W1…)?'));
 const lay=tableLayer(),out=gridTable(placeBeside(),rows,{title:L('PLANILLA DE ABERTURAS','OPENING SCHEDULE'),layer:lay});
 if(tag){const tl=textLayer(),h=textH()*.8;
  for(const g of groups)for(const m of g.members){let c=m.ref.p;try{const b=CORE.getBounds(CORE.blockChildren(m.ref));c=P((b.minX+b.maxX)/2,(b.minY+b.maxY)/2)}catch(e){}
   const r=h*1.15;out.push({type:'circle',c:P(c.x,c.y),r,layer:tl},{type:'text',p:P(c.x-g.code.length*h*.31,c.y-h*.45),text:g.code,h,layer:tl,fontFamily:'Arial'})}}
 commit(out,'PLANILLA DE ABERTURAS');CORE.zoomExtents?.();
 CORE.toast(L('Planilla de aberturas: ','Opening schedule: ')+items.length+' '+L('abertura(s)','opening(s)')+(tag?L(' · rótulos en la planta',' · plan tags added'):''));
}
/* ---------- Planilla desde el 3D (con alto y antepecho reales) ---------- */
function addSchedule(p){
 const raw=Array.isArray(p?.items)?p.items.slice(0,5000):[];
 const items=raw.filter(i=>i&&(i.t==='P'||i.t==='V')&&Number(i.w)>0).map(i=>({t:i.t,w:Number(i.w),h:Number(i.h)||0,sill:Number(i.sill)||0,desc:String(i.desc||'').slice(0,48)}));
 if(!items.length)return {count:0};
 const {rows}=scheduleRows(items,true),k=1000/CORE.U[S().unit];
 const lay=tableLayer(),out=gridTable(placeBeside(),rows,{title:String(p.title||L('PLANILLA DE ABERTURAS (MODELO 3D)','OPENING SCHEDULE (3D MODEL)')).slice(0,80),layer:lay,h:.18*k});
 commit(out,'PLANILLA DE ABERTURAS 3D');CORE.zoomExtents?.();CORE.toast(L('Planilla de aberturas del 3D: ','3D opening schedule: ')+items.length+' '+L('abertura(s)','opening(s)'));
 return {count:items.length};
}

/* ---------- Órdenes ---------- */
const C={};const reg=(n,f)=>{for(const k of n)C[k]=f};
reg(['PLANILLAABERTURAS','TABLAABERTURAS','PLANILLAPUERTAS','DOORSCHEDULE','WINDOWSCHEDULE','OPENINGSCHEDULE','TABLAPUERTAS'],schedule2D);
reg(['PEGARTEXTO','PASTETEXT','PEGARTABLA','PASTETABLE','PEGAREXCEL'],async()=>{
 try{const text=await navigator.clipboard.readText();if(!text)return CORE.toast(L('El portapapeles está vacío','Clipboard is empty'));
  const at=S().mouse||P(0,0),rows=parseTSV(text);if(rows&&(rows.length>1||rows[0].length>1))pasteTable(rows,at);else pasteText(text,at);
 }catch(e){CORE.toast(L('Usá Ctrl+V con el cursor sobre el dibujo (el navegador no dio permiso para leer el portapapeles)','Use Ctrl+V over the drawing (clipboard permission denied)'))}
});
Object.assign(EXT.commands,C);
window.CAD2D_TABLES=Object.freeze({noteInternalCopy,gridTable,parseTSV,parseHTMLTable,scheduleRows,addSchedule,MARK,commands:Object.keys(C)});
})();
