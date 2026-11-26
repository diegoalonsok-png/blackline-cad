/* CAD2D3D · ARQASSIST: estilos de cota y detalles constructivos.
   - «estilos de cota», «cotas 1:50», «dimstyle» → galería de estilos de cota de arquitectura listos para usar.
   - «detalle constructivo», «detalle de fundación», «cubierta de chapa»… → galería de detalles DXF editables
     (assets/arq-details/v1, dibujos originales) que se insertan como CAD con sombreados, capas y textos.
   Sin imágenes de internet: todo es CAD. */
(function(){
'use strict';
const CORE=window.CAD2D_CORE;if(!CORE)return;
const lang=()=>{try{return /^es/i.test(localStorage.getItem('cad2d-alias-language')||document.documentElement.lang||'')}catch(e){return false}};
const T=(en,es)=>lang()?es:en;
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9:. ]+/g,' ').replace(/\s+/g,' ').trim();
const DIM_RE=/\b(?:estilos? de cotas?|estilos? de acotacion|estilo de cota|tipos? de cotas?|cotas? (?:de )?arquitectura|cotas?|acotar|acotacion(?:es)?|dimstyles?|dimension styles?|dimensions? styles?|dimensioning)\b/;
const DET_RE=/\b(?:detalles? constructivos?|detalles?|construction details?|details?|corte constructivo|cortes? de muro|fundacion(?:es)?|zapata|platea|cimiento|cubierta|techo de chapa|azotea|parapeto|contrapiso|tabique|durlock|placa de yeso|antepecho|alfeizar|dintel|encadenado|muro doble|camara de aire|capa aisladora)\b/;
function match(raw){const q=norm(raw);if(!q)return null;if(DIM_RE.test(q)&&!/\b(?:baño|bano|cocina|planta)\b/.test(q))return 'dim';if(DET_RE.test(q)&&!/\b(?:bano|banos|cocina|cocinas|dormitorio|casa|vivienda)\b/.test(q))return 'detail';return null;}

/* ---------- estilos de cota (alturas en metros de papel × escala → metros de modelo) ---------- */
const STYLES=[
 {key:'ARQ 1:50 · trazo oblicuo · m',es:'Arquitectura 1:50 · trazo oblicuo · metros (3,45)',en:'Architecture 1:50 · oblique tick · metres',scale:50,arrowType:'tick',precision:2,displayUnit:'m',text:2.5,arrow:1.5},
 {key:'ARQ 1:100 · trazo oblicuo · m',es:'Arquitectura 1:100 · trazo oblicuo · metros',en:'Architecture 1:100 · oblique tick · metres',scale:100,arrowType:'tick',precision:2,displayUnit:'m',text:2.5,arrow:1.5},
 {key:'ARQ 1:200 · trazo oblicuo · m',es:'Arquitectura 1:200 · trazo oblicuo · metros',en:'Architecture 1:200 · oblique tick · metres',scale:200,arrowType:'tick',precision:2,displayUnit:'m',text:2.5,arrow:1.5},
 {key:'DETALLE 1:20 · trazo · cm',es:'Detalle 1:20 · trazo oblicuo · centímetros',en:'Detail 1:20 · oblique tick · centimetres',scale:20,arrowType:'tick',precision:0,displayUnit:'cm',text:2.5,arrow:1.5},
 {key:'DETALLE 1:5 · punto · mm',es:'Detalle constructivo 1:5 · punto · milímetros',en:'Construction detail 1:5 · dot · millimetres',scale:5,arrowType:'dot',precision:0,displayUnit:'mm',text:2.5,arrow:1.2},
 {key:'ESTRUCTURA 1:50 · flecha · cm',es:'Estructura 1:50 · flecha · centímetros',en:'Structure 1:50 · arrow · centimetres',scale:50,arrowType:'arrow',precision:0,displayUnit:'cm',text:2.5,arrow:2.5},
 {key:'INTERIORES 1:25 · punto · cm',es:'Interiores y equipamiento 1:25 · punto · centímetros',en:'Interiors and joinery 1:25 · dot · centimetres',scale:25,arrowType:'dot',precision:0,displayUnit:'cm',text:2.5,arrow:1.2},
 {key:'URBANISMO 1:500 · flecha abierta · m',es:'Urbanismo / implantación 1:500 · flecha abierta · metros',en:'Site plan 1:500 · open arrow · metres',scale:500,arrowType:'open',precision:1,displayUnit:'m',text:2.5,arrow:2.5},
];
function modelPerMetre(){const U=CORE.U||{};const u=CORE.state?.unit||'m';return U.m&&U[u]?U.m/U[u]:1;}
function styleObject(s){const k=modelPerMetre(),paper=mm=>mm/1000*s.scale*k;return {precision:s.precision,textHeight:paper(s.text),arrow:paper(s.arrow),suffix:'',displayUnit:s.displayUnit,tolerance:0,arrowType:s.arrowType,color:'',extOffset:paper(1.25),extBeyond:paper(1.5)};}
function useStyle(s){
 const st=CORE.state;st.dimStyles=st.dimStyles||{};st.dimStyles[s.key]=styleObject(s);st.activeDimStyle=s.key;
 const sel=document.getElementById('dimStyleLibrary');
 if(sel){if(![...sel.options].some(o=>o.value===s.key)){const o=document.createElement('option');o.value=s.key;o.textContent=s.key;sel.append(o);}sel.value=s.key;sel.dispatchEvent(new Event('change',{bubbles:true}));}
 const dims=st.entities.filter(e=>st.selected.includes(e.id)&&e.type==='dimension');
 if(dims.length){const b=document.getElementById('applyDimensionStyle');if(b)b.click();}
 CORE.toast?.(T('Dimension style active: ','Estilo de cota activo: ')+s.key+(dims.length?T(' · applied to ',' · aplicado a ')+dims.length+T(' selected dimensions',' cotas seleccionadas'):''));
}
function dimPreview(s){
 const tick=s.arrowType==='tick'?'<path d="M14 54 l8 -8 M146 54 l8 -8" stroke="#2c3035" stroke-width="2"/>':s.arrowType==='dot'?'<circle cx="18" cy="50" r="3.2" fill="#2c3035"/><circle cx="150" cy="50" r="3.2" fill="#2c3035"/>':s.arrowType==='open'?'<path d="M30 45 L18 50 L30 55 M138 45 L150 50 L138 55" fill="none" stroke="#2c3035" stroke-width="1.6"/>':'<path d="M30 45 L18 50 L30 55 Z M138 45 L150 50 L138 55 Z" fill="#2c3035"/>';
 const value=s.displayUnit==='m'?(s.precision===1?'3,5':'3,45'):s.displayUnit==='cm'?'345':'3450';
 return '<svg viewBox="0 0 168 90" style="width:100%;height:92px;display:block;background:#f4efe3;border-radius:4px"><rect x="18" y="66" width="132" height="14" fill="#d8a487" stroke="#53575a"/><path d="M18 62 V40 M150 62 V40" stroke="#53575a" stroke-width="1"/><path d="M12 50 H156" stroke="#2c3035" stroke-width="1.2"/>'+tick+'<text x="84" y="44" text-anchor="middle" font-family="Arial" font-size="13" fill="#2c3035">'+value+'</text><text x="84" y="16" text-anchor="middle" font-family="Arial" font-size="10" fill="#6b6f75">1:'+s.scale+'</text></svg>';
}

/* ---------- detalles ---------- */
const BASE=new URL('assets/arq-details/v1/',document.baseURI);let detailsPromise=null;
function details(){if(!detailsPromise)detailsPromise=fetch(new URL('index.json?v=20261126-1',BASE)).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then(d=>{if(d.schema!=='blackline-details-v1'||!Array.isArray(d.items))throw Error('Catálogo inválido');return d.items}).catch(e=>{detailsPromise=null;throw e});return detailsPromise;}
function filterDetails(items,raw){
 const q=norm(raw).replace(/\b(?:detalles?|constructivos?|construction|details?|de|del|la|el|los|las|un|una|corte|cortes|ver|mostrar|quiero|insertar)\b/g,' ').replace(/\s+/g,' ').trim();
 if(!q)return items;const words=q.split(' ').filter(w=>w.length>2);
 const scored=items.map(x=>{const t=norm(x.es+' '+x.en+' '+x.tags);return [words.filter(w=>t.includes(w)||t.includes(w.replace(/s$/,''))).length,x]}).filter(([n])=>n>0).sort((a,b)=>b[0]-a[0]).map(([,x])=>x);
 return scored.length?scored:items;
}

/* ---------- diálogo ---------- */
function dialog(titleText){
 document.getElementById('arqDocsDialog')?.remove();
 const dlg=document.createElement('dialog');dlg.id='arqDocsDialog';
 dlg.style.cssText='position:fixed;inset:auto;left:max(8px,calc(50vw - 380px));top:64px;margin:0;z-index:1200;width:min(760px,94vw);height:min(620px,80vh);resize:both;overflow:hidden;background:#25282d;color:#e6e7eb;border:1px solid #777;border-radius:12px;padding:14px;box-sizing:border-box;display:flex;flex-direction:column';
 const head=document.createElement('div');head.style.cssText='display:flex;align-items:center;gap:12px;margin-bottom:10px;cursor:move;user-select:none';
 const title=document.createElement('strong');title.textContent=titleText;title.style.flex='1';
 const close=document.createElement('button');close.className='btn slim';close.textContent='×';close.setAttribute('aria-label',T('Close','Cerrar'));close.onclick=()=>dlg.close();
 head.append(title,close);
 let drag=null;head.addEventListener('pointerdown',e=>{if(e.target===close)return;const r=dlg.getBoundingClientRect();drag={dx:e.clientX-r.left,dy:e.clientY-r.top};head.setPointerCapture(e.pointerId)});head.addEventListener('pointermove',e=>{if(!drag)return;dlg.style.left=Math.max(0,e.clientX-drag.dx)+'px';dlg.style.top=Math.max(0,e.clientY-drag.dy)+'px'});head.addEventListener('pointerup',()=>drag=null);
 const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fill,minmax(min(200px,100%),1fr));gap:9px;overflow:auto;min-height:0;flex:1;align-content:start';
 const foot=document.createElement('div');foot.style.cssText='margin-top:8px;font-size:12px;opacity:.85';
 dlg.append(head,grid,foot);dlg.addEventListener('close',()=>dlg.remove());document.body.append(dlg);dlg.show();
 return {dlg,grid,foot};
}
function card(grid,preview,name,sub,actions){
 const c=document.createElement('div');c.style.cssText='display:flex;flex-direction:column;gap:6px;padding:8px;border:1px solid #4a4e55;border-radius:8px;background:#2d3036';
 const pv=document.createElement('div');if(preview instanceof Node)pv.append(preview);else pv.innerHTML=preview;
 const n=document.createElement('div');n.textContent=name;n.style.cssText='font-size:13px;line-height:1.3';
 const s=document.createElement('div');s.textContent=sub;s.style.cssText='font-size:11px;opacity:.75';
 const row=document.createElement('div');row.style.cssText='display:flex;gap:6px;margin-top:auto';
 for(const [label,fn,primary] of actions){const b=document.createElement(fn.href?'a':'button');b.className='btn slim';b.textContent=label;b.style.cssText='flex:1;text-align:center;text-decoration:none'+(primary?';font-weight:600':'');if(fn.href){b.href=fn.href;b.download=fn.download;}else b.onclick=fn;row.append(b);}
 c.append(pv,n,s,row);grid.append(c);
}
function openDimStyles(){
 const {dlg,grid,foot}=dialog('ARQASSIST · '+T('Dimension styles','Estilos de cota'));
 for(const s of STYLES)card(grid,dimPreview(s),T(s.en,s.es),T('Text 2.5 mm on paper · ','Texto 2,5 mm en papel · ')+s.displayUnit+' · '+s.precision+T(' decimals',' decimales'),[[T('Use style','Usar estilo'),()=>{useStyle(s);dlg.close();},true]]);
 foot.textContent=T('The style becomes the active DIMSTYLE for new dimensions; selected dimensions are updated too. Sizes follow the drawing unit.','El estilo queda como DIMSTYLE activo para las cotas nuevas; si hay cotas seleccionadas también se actualizan. Los tamaños se ajustan a la unidad del dibujo.');
}
async function openDetails(raw){
 const {dlg,grid,foot}=dialog('ARQASSIST · '+T('Construction details · editable DXF','Detalles constructivos · DXF editables'));
 foot.textContent=T('Loading…','Cargando…');
 let items;try{items=filterDetails(await details(),raw)}catch(e){foot.textContent=T('Catalogue unavailable: ','Catálogo no disponible: ')+e.message;return}
 for(const x of items){
  const url=new URL(x.id+'.dxf',BASE).href;
  card(grid,'<div style="background:#fbf8f1;border-radius:4px">'+x.preview+'</div>',T(x.en,x.es),'DXF · '+T('scale','esc.')+' '+x.scale+' · '+T('hatches, layers and notes','sombreados, capas y textos'),[
   [T('Insert CAD','Insertar CAD'),async()=>{if(!window.cadInsertDxfPlan)return CORE.toast?.(T('DXF importer unavailable','Importador DXF no disponible'));dlg.close();await window.cadInsertDxfPlan(url,T(x.en,x.es));},true],
   ['DXF ↓',{href:url,download:x.id+'.dxf'}]]);
 }
 foot.textContent=T('Original Blackline CAD drawings in metres, schematic: check thicknesses against the project, structural design and local codes.','Dibujos originales de Blackline CAD en metros, esquemáticos: verificar espesores con el proyecto, el cálculo estructural y la normativa.');
}
window.CAD2D_ARQ_DOCS=Object.freeze({match,open:(kind,raw)=>kind==='dim'?openDimStyles():openDetails(raw),openDimStyles,openDetails,styles:STYLES.map(s=>s.key)});
})();
