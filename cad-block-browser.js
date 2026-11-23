/* Block Browser: ventana flotante grande para trabajar con muchos bloques dinámicos a la vez.
   Esquinas redondeadas, se mueve desde la barra de título y se agranda desde cualquier borde o esquina.
   Pestañas: Todo · Plantas · Cortes y vistas · Símbolos. Categorías, búsqueda y tamaño de miniaturas.
   Clic en una miniatura → se inserta en el dibujo (la ventana queda abierta para seguir trabajando).
   Comandos: BLOCKBROWSER · BB · BLOQUES+ · GALERIA. */
(function(){
 'use strict';
 const CORE=window.CAD2D_CORE,ARQ=window.CAD2D_ARQ,LIB=window.CAD2D_ARQ_LIBRARY;
 if(!CORE||!ARQ||!LIB||window.CAD2D_BLOCK_BROWSER)return;
 const es=()=>{try{return /^es/i.test(localStorage.getItem('cad2d-alias-language')||'')}catch(e){return false}};
 const T=(en,sp)=>es()?sp:en;
 const tr=t=>window.BlacklineUILanguage?.translate?.(t)??t;
 // Paper swatches only change thumbnail previews, never CAD geometry or print settings.
 const PAPERS=[
  {id:'cream',label:'crema',bg:'#fffaf0',ink:'#293238'},
  {id:'white',label:'blanco',bg:'#ffffff',ink:'#20272d'},
  {id:'ivory',label:'marfil',bg:'#f4ecd8',ink:'#293238'},
  {id:'gray',label:'gris claro',bg:'#e5e7e9',ink:'#252b30'},
  {id:'kraft',label:'papel kraft',bg:'#d5c19e',ink:'#292929'},
  {id:'rose',label:'rosado',bg:'#f4ded8',ink:'#2a292b'},
  {id:'blue',label:'azul técnico',bg:'#28465c',ink:'#f5f8fc'},
  {id:'black',label:'negro',bg:'#22272b',ink:'#f7f7f3'}
 ];
 const paperControls=()=>'<span class="paper-palette" role="group" aria-label="Probar fondo de papel">'+PAPERS.map(p=>'<button type="button" data-paper="'+p.id+'" style="--paper-swatch:'+p.bg+'" title="Papel '+p.label+'" aria-label="Papel '+p.label+'"></button>').join('')+'</span>';
 const VIEWS={
  all:{en:'All',es:'Todo',cats:null},
  visual:{en:'Visual gallery',es:'Galería visual',item:it=>/^(?:olymp26-|olymp2-|cc0-fp-|bl-view-window-)/.test(it.id)||
    /^(?:dk-arbol-vista|dk-arbol-invierno|dk-arbol-radial|dk-arbusto-arbol|dk-arbol-hojas|dk-arbol-ramas|dk-dos-arboles|dk-ventana-2x2-vista|dk-ventana-bano-vista)$/.test(it.id)},
  dk:{en:'Blackline library',es:'Biblioteca Blackline',item:it=>/^dk-|^doc-/.test(it.id)},
  bath:{en:'Bathrooms',es:'Baños',family:'Baños'},
  kitchen:{en:'Kitchens',es:'Cocinas',family:'Cocinas'},
  bedroom:{en:'Bedrooms',es:'Dormitorios',family:'Dormitorios'},
  vehicles:{en:'Vehicles',es:'Vehículos',family:'Vehículos'},
  carpentry:{en:'Doors & windows',es:'Puertas y ventanas',family:'Puertas y ventanas'},
  furniture:{en:'Furniture',es:'Mobiliario',family:'Mobiliario'},
  plan:{en:'Plans',es:'Plantas',mode:'Planta'},
  section:{en:'Sections & elevations',es:'Cortes y vistas',mode:'Vistas'},
  archive:{en:'Recovered views',es:'Vistas recuperadas',item:it=>archivedView(it)},
  olymp3:{en:'2D blocks · 1,000+ vectors',es:'Bloques 2D · 1.000+ vectores',item:it=>/^olymp3-/.test(it.id)},
  doorElev:{en:'Door elevations',es:'Puertas en vista',item:it=>/puerta|door/i.test(it.name)&&/vista|alzado|elevaci/i.test(it.name)},
  windowElev:{en:'Window elevations',es:'Ventanas en vista',item:it=>/ventana|ventanal|window|paño fijo|pano fijo/i.test(it.name)&&/vista|alzado|elevaci/i.test(it.name)},
  fridgeElev:{en:'Fridge elevations',es:'Heladeras en vista',item:it=>/heladera|refrigerador|fridge|freezer/i.test(it.name)&&/vista|alzado|elevaci/i.test(it.name)},
  symbol:{en:'Symbols',es:'Símbolos',cats:c=>c==='Símbolos'},
  doc:{en:'Documentation (levels, axes, sections…)',es:'Documentación (niveles, ejes, cortes…)',cats:c=>c==='Documentación'}
 };
 const KEY='cad2d-block-browser';
 let st={x:null,y:null,w:980,h:640,view:'all',cat:'',q:'',size:120,paper:'cream'};
 try{Object.assign(st,JSON.parse(localStorage.getItem(KEY)||'{}'))}catch(e){}
 const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(st))}catch(e){}};
 const css=document.createElement('style');
 css.textContent=`#cadBlockBrowser{position:fixed;z-index:9000;display:flex;flex-direction:column;background:#141b22;border:1px solid #4a6070;border-radius:18px;box-shadow:0 26px 70px #000a;color:#e6eef3;font:13px/1.35 system-ui,-apple-system,Segoe UI,Arial,sans-serif;overflow:hidden;min-width:420px;min-height:300px}
#cadBlockBrowser .hd{display:flex;align-items:center;gap:10px;padding:10px 12px 10px 16px;background:#1b252e;border-bottom:1px solid #2d3d49;cursor:move;user-select:none}
#cadBlockBrowser .hd b{font-size:12px;letter-spacing:.08em;color:#a9cbdc;flex:1}
#cadBlockBrowser .hd button{all:unset;cursor:pointer;width:26px;height:26px;display:grid;place-items:center;border-radius:8px;color:#c9d6de;font-size:15px}
#cadBlockBrowser .hd button:hover{background:#2b3a46}
#cadBlockBrowser .tabs{display:flex;gap:6px;padding:10px 14px 0;flex-wrap:wrap}
#cadBlockBrowser .tabs button{all:unset;cursor:pointer;padding:7px 14px;border-radius:999px;border:1px solid #3b4f5d;color:#cfdbe2}
#cadBlockBrowser .tabs button.house{margin-left:auto;border-color:#d3b47a;color:#f3dcae}
#cadBlockBrowser .tabs button.on{background:#d4a748;border-color:#d4a748;color:#17120a;font-weight:700}
#cadBlockBrowser .tools{display:flex;gap:10px;align-items:center;padding:10px 14px;border-bottom:1px solid #26333d}
#cadBlockBrowser input[type=search]{flex:1;min-width:120px;background:#0e1419;border:1px solid #3b4f5d;border-radius:10px;padding:8px 12px;color:#e6eef3;font:inherit}
#cadBlockBrowser .tools label{display:flex;gap:6px;align-items:center;color:#9fb0bb;font-size:12px;white-space:nowrap}
#cadBlockBrowser .main{flex:1;display:grid;grid-template-columns:210px 1fr;min-height:0}
#cadBlockBrowser .cats{overflow:auto;border-right:1px solid #26333d;padding:8px}
#cadBlockBrowser .cats button{all:unset;box-sizing:border-box;cursor:pointer;display:flex;justify-content:space-between;width:100%;padding:7px 10px;border-radius:9px;color:#cfdbe2}
#cadBlockBrowser .cats button:hover{background:#1f2b34}#cadBlockBrowser .cats button.on{background:#24384a;color:#fff}
#cadBlockBrowser .cats small{color:#7f95a3}
#cadBlockBrowser .grid{overflow:auto;padding:12px;display:grid;gap:10px;align-content:start}
#cadBlockBrowser .card{all:unset;box-sizing:border-box;cursor:pointer;display:flex;flex-direction:column;gap:4px;padding:8px;border:1px solid #33475a;border-radius:12px;background:#10171d;color:#dce9f2;min-width:0}
#cadBlockBrowser .card:hover{border-color:#9adff3;background:#132029}#cadBlockBrowser .card.armed{border-color:#d4a748;box-shadow:0 0 0 3px #d4a74833}
#cadBlockBrowser .card .nm{font-size:12px;color:#e8eef2;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
#cadBlockBrowser .card .mt{font-size:11px;color:#8fd0e4}
#cadBlockBrowser .card .pro{align-self:flex-start;font-size:9px;font-weight:700;padding:1px 6px;border-radius:6px;background:#c79a3a;color:#111}
#cadBlockBrowser .card .archive-label{align-self:flex-start;font-size:9px;letter-spacing:.04em;color:#b9b2a4;border:1px solid #687078;border-radius:5px;padding:1px 5px}
#cadBlockBrowser.visual .card .archive-label{color:#6a5846;border-color:#b5a385}
#cadBlockBrowser .ft{padding:7px 14px;border-top:1px solid #26333d;color:#8ea2ae;font-size:12px}
#cadBlockBrowser .rz{position:absolute;z-index:2}#cadBlockBrowser .rz.e{right:0;top:0;bottom:0;width:7px;cursor:ew-resize}#cadBlockBrowser .rz.s{left:0;right:0;bottom:0;height:7px;cursor:ns-resize}
#cadBlockBrowser .rz.w{left:0;top:0;bottom:0;width:7px;cursor:ew-resize}#cadBlockBrowser .rz.n{left:0;right:0;top:0;height:5px;cursor:ns-resize}
#cadBlockBrowser .rz.se{right:0;bottom:0;width:18px;height:18px;cursor:nwse-resize;background:linear-gradient(135deg,transparent 55%,#6c8597 55%,#6c8597 62%,transparent 62%,transparent 72%,#6c8597 72%,#6c8597 79%,transparent 79%)}
/* Architectural cream-background visual catalog: no changes to CAD workspace/theme. */
#cadBlockBrowser.visual{background:#efe4cc;border-color:#a88b60;color:#272921}
#cadBlockBrowser.visual .hd{background:#ddcba8;border-color:#baa17c}
#cadBlockBrowser.visual .hd b{color:#47392c}
#cadBlockBrowser.visual .hd button{color:#3c3429}
#cadBlockBrowser.visual .hd button:hover{background:#d1bd98}
#cadBlockBrowser.visual .tabs{background:#eee0c1}
#cadBlockBrowser.visual .tabs button{color:#4b4232;border-color:#c4ad83}
#cadBlockBrowser.visual .tabs button.on{background:#73562e;border-color:#73562e;color:#fffaf0}
#cadBlockBrowser.visual .tools{background:#f3e8d3;border-color:#ccb997}
#cadBlockBrowser.visual .tools label{color:#4b4539}
#cadBlockBrowser.visual input[type=search]{background:#fffaf0;color:#29302b;border-color:#c7b28c}
#cadBlockBrowser.visual .cats{background:#e7d7b9;border-color:#cab38b}
#cadBlockBrowser.visual .cats button{color:#3e3a31}
#cadBlockBrowser.visual .cats button.on{background:#fdf7e9;color:#2d2920}
#cadBlockBrowser.visual .cats button:hover{background:#f4e8d0}
#cadBlockBrowser.visual .cats small{color:#695943}
#cadBlockBrowser.visual .grid{background:#f3ead8;gap:14px}
#cadBlockBrowser.visual .card{background:#fffaf0;color:#2c302f;border:1px solid #cbb796;border-radius:8px;padding:12px;box-shadow:0 3px 10px #765b3012}
#cadBlockBrowser.visual .card:hover{background:#fffcf6;border-color:#897047;box-shadow:0 4px 16px #765b3033}
#cadBlockBrowser.visual .card.armed{border-color:#815b28;box-shadow:0 0 0 3px #bfa16f66}
#cadBlockBrowser.visual .card svg{max-width:100%;overflow:visible}
#cadBlockBrowser .paper-palette{display:none;align-items:center;gap:9px;flex-wrap:wrap;padding:2px 0}
#cadBlockBrowser.visual .paper-palette{display:flex}
#cadBlockBrowser .paper-palette button{all:unset;display:block;box-sizing:border-box;cursor:pointer;width:23px;height:23px;flex:0 0 23px;border-radius:50%;background:var(--paper-swatch);border:1px solid #9c8b70}
#cadBlockBrowser .paper-palette button:hover{transform:scale(1.1)}
#cadBlockBrowser .paper-palette button[aria-pressed=true]{outline:2px solid #8a6231;outline-offset:2px}
#cadBlockBrowser.visual .card .preview{display:grid;place-items:center;padding:7px;background:var(--paper-bg,#fffaf0);border:1px solid #c8bca8;border-radius:4px;color:var(--paper-ink,#293238);width:100%;box-sizing:border-box;min-width:0}
#cadBlockBrowser.visual .card .preview svg{color:inherit}
#cadBlockBrowser.visual .tools{flex-wrap:wrap}
#cadBlockBrowser.visual .paper-palette{flex:1 0 auto}
#cadBlockBrowser.visual .card .nm{color:#35362e;font-weight:600}
#cadBlockBrowser.visual .card .mt{color:#725b39}
#cadBlockBrowser.visual .ft{background:#eee0c1;border-color:#c6ae87;color:#4f493d}
#cadBlockBrowser.min .tabs,#cadBlockBrowser.min .tools,#cadBlockBrowser.min .main,#cadBlockBrowser.min .ft,#cadBlockBrowser.min .rz{display:none}
#cadBlockBrowser.min{min-height:0;height:auto!important}
@media (max-width:640px){#cadBlockBrowser .main{grid-template-columns:1fr}#cadBlockBrowser .cats{display:none}}
.bl-light #cadBlockBrowser{background:#f6f8fa;color:#16212a;border-color:#b8c5ce}
.bl-light #cadBlockBrowser .hd{background:#e6edf2;border-color:#cbd6dd}.bl-light #cadBlockBrowser .hd b{color:#2b5468}.bl-light #cadBlockBrowser .hd button{color:#2a3a44}
.bl-light #cadBlockBrowser .card{background:#fff;color:#1f2b33;border-color:#c8d3da}.bl-light #cadBlockBrowser .card .nm{color:#16212a}.bl-light #cadBlockBrowser .card .mt{color:#21708a}
.bl-light #cadBlockBrowser .cats button,.bl-light #cadBlockBrowser .tabs button{color:#22323c}.bl-light #cadBlockBrowser .cats button.on{background:#d5e6ef}
.bl-light #cadBlockBrowser input[type=search]{background:#fff;color:#16212a;border-color:#b8c5ce}
.bl-light #cadBlockBrowser.visual{background:#efe4cc;color:#272921}
.bl-light #cadBlockBrowser.visual .hd{background:#ddcba8}
.bl-light #cadBlockBrowser.visual .card{background:#fffaf0;color:#293238;border-color:#cbb796}
.bl-light #cadBlockBrowser.visual .card .nm{color:#35362e}
.bl-light #cadBlockBrowser.visual .card .mt{color:#725b39}
.bl-light #cadBlockBrowser.visual input[type=search]{background:#fffaf0;color:#29302b;border-color:#c7b28c}`;
 document.head.append(css);

 let el=null,armedId=null,visibleCount=st.view==='olymp3'?18:72;
 const pageSize=()=>st.view==='visual'?12:st.view==='olymp3'?18:72;
 function loadOlimpiadas(){const pkg=window.CAD2D_OLYMPIADAS3;
  if(pkg&&!pkg.loading&&pkg.loaded<pkg.total)pkg.load().catch(err=>CORE.toast('Bloques 2D: '+err.message));
 }
 // Quality gate: the temporary schematic views26 set remains in source for
 // backward compatibility, but is not advertised as production CAD drafting.
 // Quality review hid older schematic views, not their editable geometry.
 // Recover access only in view-specific tabs, retaining curated main gallery.
 const archivedView=it=>Boolean(it.hideFromGallery&&/^(?:cv-|vm-|alz-)/.test(it.id));
 const archiveTabs=new Set(['section','archive','doorElev','windowElev','fridgeElev']);
 const items=()=>LIB.library.filter(it=>!/^views26-/.test(it.id)&&
   (!it.hideFromGallery||(archiveTabs.has(st.view)&&archivedView(it))));
 const familyOf=it=>{
  const id=String(it.id||'').toLowerCase(),c=String(it.cat||'').toLowerCase(),n=String(it.name||'').toLowerCase();
  if(/sanit|bañ|bath|inodoro|bidet|lavatorio|ducha|mingitorio|vanitory|bañera|jacuzzi|wc\b|toilet|urinal|shower/.test(c+' '+n)||/^san-|^ca_ba_/.test(id))return 'Baños';
  if(/cocina|kitchen|heladera|freezer|horno|anafe|lavavajillas|microondas|campana|extractor|cafetera|lavarropas|secarropas|vinoteca|induc|refrig/.test(c+' '+n)||/^kq-|^ca_co_/.test(id))return 'Cocinas';
  if(/dormitorio|bedroom|cama|cucheta|cuna|colchón|mattress|bunk|crib|placard/.test(c+' '+n)||/^dor-|^ca_dorm/.test(id))return 'Dormitorios';
  if(/vehículo|auto|camión|colectivo|bus|pickup|furgón|coupé|tractor|moto|biciclet|vehic|truck|van\b|car\b/.test(c+' '+n)||/^veh-|^ca_auto|^ca_v_(?:bus|cam|moto)/.test(id))return 'Vehículos';
  if(/puerta|ventana|carpinter|persiana|abertura|door|window|marco|muro cortina|dvh|opening|umbral/.test(c+' '+n)||/^alz-puerta|^ca_puerta/.test(id))return 'Puertas y ventanas';
  if(/escritorio|oficina|office|mesa reunión/.test(c+' '+n)||/^ca_ofic/.test(id))return 'Oficina';
  if(/mobili|furniture|sillón|sofá|silla|mesa|estante|biblioteca|mueble|shelf|sofa|chair|desk/.test(c+' '+n)||/^mob-|^ca_mueb/.test(id))return 'Mobiliario';
  if(/exterior|outdoor|árbol|arbusto|planta ornamental|palmera|tree/.test(c+' '+n)||/^ext-|^ca_arb/.test(id))return 'Exterior';
  if(/persona|people|person|figura humana/.test(c+' '+n)||/^pv-|^ca_pers/.test(id))return 'Personas';
  if(/símbolo|symbol/.test(c+' '+n))return 'Símbolos';
  if(/document|cota|nivel|eje/.test(c+' '+n))return 'Documentación';
  return it.cat||'Otros';
 };
 const modeOf=it=>{
  const n=String(it.name||'').toLowerCase(),id=String(it.id||'').toLowerCase(),c=String(it.cat||'');
  if(/corte|sección|section|perfil|sectional/.test(n)||/\bsection\b/.test(id))return 'Corte';
  if(/vista|alzado|elevac|frontal|posterior|lateral|elevation/.test(n)||c==='Alzados'||c==='Mobiliario en vista'||/^ca_puerta_elev|^bl-view-window-|^olymp2-ca-puerta-elev/.test(id))return 'Alzado';
  if(c==='Cortes y vistas'||c==='Mobiliario en vista')return 'Alzado';
  return 'Planta';
 };
 const inView=it=>{const v=VIEWS[st.view];if(!v)return true;if(v.item)return v.item(it);
  if(v.family)return familyOf(it)===v.family;
  if(v.mode==='Planta')return modeOf(it)==='Planta'&&it.cat!=='Símbolos'&&it.cat!=='Documentación';
  if(v.mode==='Vistas')return modeOf(it)!=='Planta';
  return !v.cats||v.cats(it.cat)};
 const groupOf=it=>VIEWS[st.view]?.family?modeOf(it):familyOf(it);
 const cm=v=>Math.round(v*100);
 function filtered(){
  const q=st.q.trim().toLowerCase();
  return items().filter(it=>inView(it)&&(!st.cat||groupOf(it)===st.cat)&&(!q||(it.name+' '+tr(it.name)+' '+it.cat+' '+tr(it.cat)+' '+familyOf(it)+' '+it.id).toLowerCase().includes(q)));
 }
 // Nombres visibles simples; identificadores, definiciones y búsqueda original intactos.
 function simpleBlockNames(){
  const counters=Object.create(null),out=new Map();
  const patterns=[['Puerta',/\b(?:puerta|door|porton|portón)\b/i],['Ventana',/\b(?:ventana|ventanal|window)\b/i],['Escalera',/\b(?:escalera|stair)\b/i],['Inodoro',/\b(?:inodoro|toilet|wc)\b/i],['Bañadera',/\b(?:bañadera|bañera|bathtub)\b/i],['Auto',/\b(?:auto|automóvil|coche|car)\b/i],['Camión',/\b(?:camión|camion|truck)\b/i],['Árbol',/\b(?:árbol|arbol|tree)\b/i],['Heladera',/\b(?:heladera|refrigerador|fridge)\b/i],['Cocina',/\b(?:cocina|kitchen)\b/i]];
  for(const it of LIB.library.slice().sort((a,b)=>String(a.id).localeCompare(String(b.id)))){
   const candidate=patterns.find(p=>p[1].test(String(it.name||'')))?.[0];
   if(candidate){counters[candidate]=(counters[candidate]||0)+1;out.set(it.id,candidate+' '+counters[candidate]);}
  }
  return out;
 }
 const simpleName=it=>simpleBlockNames().get(it.id)||tr(it.name);
 function paint(){
  if(!el)return;
  const visual=st.view==='visual'||st.view==='olymp3';
  const paper=PAPERS.find(p=>p.id===st.paper)||PAPERS[0];
  el.style.setProperty('--paper-bg',paper.bg);
  el.style.setProperty('--paper-ink',paper.ink);
  el.querySelectorAll('[data-paper]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.paper===paper.id)));
  el.classList.toggle('visual',visual);
  el.setAttribute('aria-label',visual?T('Visual block gallery','Galería visual de bloques'):'Block browser');
  el.querySelector('.hd b').textContent=visual?'BLACKLINE CAD · '+T('VISUAL GALLERY','GALERÍA VISUAL'):'BLACKLINE CAD · '+T('BLOCK BROWSER','EXPLORADOR DE BLOQUES');
  el.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.v===st.view));
  const cats=[...new Set(items().filter(inView).map(groupOf))].sort((a,b)=>a.localeCompare(b,es()?'es':'en'));
  if(st.cat&&!cats.includes(st.cat))st.cat='';
  const count=c=>items().filter(i=>inView(i)&&(!c||groupOf(i)===c)).length;
  el.querySelector('.cats').innerHTML=`<button data-c="" class="${st.cat?'':'on'}"><span>${T('All categories','Todas las categorías')}</span><small>${count('')}</small></button>`+
   cats.map(c=>`<button data-c="${c}" class="${st.cat===c?'on':''}"><span>${tr(c)}</span><small>${count(c)}</small></button>`).join('');
  const list=filtered(),grid=el.querySelector('.grid');
  if(visual)list.sort((a,b)=>{
   const rank=x=>/^(?:dk-arbol|dk-dos-arboles|dk-arbusto-arbol)/.test(x.id)?0:familyOf(x)==='Exterior'?1:2;
   return rank(a)-rank(b)||a.name.localeCompare(b.name,es()?'es':'en');
  });
  const shown=list.slice(0,visibleCount),cardSize=visual?Math.max(170,st.size):st.size;
  grid.style.gridTemplateColumns=`repeat(auto-fill,minmax(${cardSize}px,1fr))`;
  grid.innerHTML=shown.map(it=>`<button class="card${it.id===armedId?' armed':''}" data-id="${it.id}" title="${simpleName(it)} · ${T('Click to select, then click on drawing','Clic para seleccionar, luego clic en el plano')}"><span class="preview">${ARQ.thumb(it.id,visual?Math.max(145,Math.round(cardSize*.9)):Math.round(st.size*.72))}</span>${it.pro?'<span class="pro">PRO</span>':''}${archivedView(it)?'<span class="archive-label" title="Vista histórica conservada; verificar detalle y escala">VISTA HISTÓRICA</span>':''}<span class="nm">${simpleName(it)}</span><span class="mt">${cm(it.w)}×${cm(it.d)} cm${it.wMax>it.wMin||it.dMax>it.dMin?' · ↔':''}</span></button>`).join('')||`<p style="color:inherit;padding:20px">${T('No blocks match.','No hay bloques que coincidan.')}</p>`;
  if(list.length>shown.length)grid.insertAdjacentHTML('beforeend',`<button class="card" data-more="1" style="justify-content:center;align-items:center;min-height:110px;text-align:center">${T('Show more','Mostrar más')} · ${list.length-shown.length} ${T('remaining','restantes')}</button>`);
  el.querySelector('.ft').textContent=visual
   ?T(`${list.length} detailed blocks · Click the preview, then click the drawing to place it · Esc cancels`,`${list.length} bloques detallados · Clic en la imagen y después en el plano para colocarlo · Esc cancela`)
   :T(`${list.length} of ${items().length} blocks · click a block, then click in the drawing · ↔ = resizable with grips`,`${list.length} de ${items().length} bloques · clic en un bloque y luego en el dibujo · ↔ = se ajusta con pinzas`);
  const pkg=window.CAD2D_OLYMPIADAS3;
  if(pkg&&(pkg.loading||pkg.loaded<pkg.total))el.querySelector('.ft').textContent+=' · Bloques '+pkg.loaded+'/'+pkg.total+(pkg.loading?' · cargando…':'');
 }
 function place(){
  const W=innerWidth,H=innerHeight;st.w=Math.min(Math.max(420,st.w),W-16);st.h=Math.min(Math.max(300,st.h),H-16);
  if(st.x===null){st.x=Math.round((W-st.w)/2);st.y=Math.round(Math.max(60,(H-st.h)/2))}
  st.x=Math.max(8-st.w+120,Math.min(W-120,st.x));st.y=Math.max(4,Math.min(H-44,st.y));
  Object.assign(el.style,{left:st.x+'px',top:st.y+'px',width:st.w+'px',height:st.h+'px'});
 }
 function open(){
  if(el){el.classList.remove('min');el.style.display='flex';place();paint();loadOlimpiadas();el.querySelector('input').focus();return}
  el=document.createElement('div');el.id='cadBlockBrowser';el.setAttribute('role','dialog');el.setAttribute('aria-label','Block browser');
  el.innerHTML=`<div class="hd"><b>BLACKLINE CAD · ${T('BLOCK BROWSER','EXPLORADOR DE BLOQUES')}</b><button data-a="min" title="${T('Collapse','Plegar')}">▁</button><button data-a="max" title="${T('Maximize','Maximizar')}">▢</button><button data-a="close" title="${T('Close · Esc','Cerrar · Esc')}">×</button></div>
<div class="tabs">${Object.entries(VIEWS).map(([k,v])=>`<button data-v="${k}">${es()?v.es:v.en}</button>`).join('')}</div>
<div class="tools"><input type="search" placeholder="${T('Search: toilet, kitchen, car, section, north…','Buscar: inodoro, cocina, auto, corte, norte…')}" value=""><label>${T('Size','Tamaño')} <input type="range" min="84" max="220" step="4" value="${st.size}"></label>${paperControls()}</div>
<div class="main"><div class="cats"></div><div class="grid"></div></div><div class="ft"></div>
<span class="rz n" data-r="n"></span><span class="rz e" data-r="e"></span><span class="rz s" data-r="s"></span><span class="rz w" data-r="w"></span><span class="rz se" data-r="se"></span>`;
  document.body.append(el);place();
  const q=el.querySelector('input[type=search]');q.value=st.q;
  q.addEventListener('input',()=>{st.q=q.value;visibleCount=72;paint()});
  el.querySelector('input[type=range]').addEventListener('input',e=>{st.size=Number(e.target.value);save();paint()});
  el.addEventListener('click',e=>{
   const a=e.target.closest('[data-a]')?.dataset.a;
   if(a==='close')return close();
   if(a==='min'){el.classList.toggle('min');return}
   if(a==='max'){const full=st.w>=innerWidth-30&&st.h>=innerHeight-30;if(full){Object.assign(st,st.prev||{w:980,h:640,x:null,y:null})}else{st.prev={x:st.x,y:st.y,w:st.w,h:st.h};Object.assign(st,{x:8,y:8,w:innerWidth-16,h:innerHeight-16})}place();save();return}
   const paperButton=e.target.closest('[data-paper]');if(paperButton){st.paper=paperButton.dataset.paper;save();paint();return}
   const v=e.target.closest('[data-v]')?.dataset.v;if(v){st.view=v;st.cat='';visibleCount=pageSize();save();paint();return}
   const c=e.target.closest('[data-c]');if(c){st.cat=c.dataset.c;visibleCount=pageSize();save();paint();return}
   if(e.target.closest('[data-more]')){const grid=el.querySelector('.grid'),pos=grid.scrollTop;visibleCount+=pageSize();paint();el.querySelector('.grid').scrollTop=pos;return}
   const card=e.target.closest('[data-id]');if(card){const targetId=card.dataset.id;try{if(ARQ.insert(targetId)===false)return;armedId=targetId}catch(err){CORE.toast(String(err?.message||err));return}el.querySelectorAll('.card').forEach(x=>x.classList.toggle('armed',x.dataset.id===armedId));CORE.toast(T('Click in the drawing to place it · Esc cancels','Hacé clic en el dibujo para ubicarlo · Esc cancela'))}
  });
  // Mover desde la barra de título.
  const hd=el.querySelector('.hd');let drag=null;
  hd.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;drag={dx:e.clientX-st.x,dy:e.clientY-st.y};hd.setPointerCapture(e.pointerId)});
  hd.addEventListener('pointermove',e=>{if(!drag)return;st.x=e.clientX-drag.dx;st.y=e.clientY-drag.dy;place()});
  hd.addEventListener('pointerup',()=>{if(drag){drag=null;save()}});
  hd.addEventListener('dblclick',e=>{if(!e.target.closest('button'))el.querySelector('[data-a=max]').click()});
  // Agrandar desde bordes y esquina.
  el.querySelectorAll('.rz').forEach(h=>{
   let r=null;
   h.addEventListener('pointerdown',e=>{r={mx:e.clientX,my:e.clientY,x:st.x,y:st.y,w:st.w,h:st.h,k:h.dataset.r};h.setPointerCapture(e.pointerId);e.preventDefault()});
   h.addEventListener('pointermove',e=>{if(!r)return;const dx=e.clientX-r.mx,dy=e.clientY-r.my;
    if(r.k.includes('e'))st.w=r.w+dx;if(r.k.includes('s'))st.h=r.h+dy;
    if(r.k==='w'){st.w=Math.max(420,r.w-dx);st.x=r.x+(r.w-st.w)}if(r.k==='n'){st.h=Math.max(300,r.h-dy);st.y=r.y+(r.h-st.h)}
    place()});
   h.addEventListener('pointerup',()=>{if(r){r=null;save()}});
  });
  for(const ev of ['pointerdown','wheel','contextmenu'])el.addEventListener(ev,e=>e.stopPropagation());
  paint();loadOlimpiadas();q.focus();
 }
 function close(){if(el)el.style.display='none';armedId=null}
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&el&&el.style.display!=='none'&&document.activeElement&&el.contains(document.activeElement)){close();e.stopPropagation()}},true);
 window.addEventListener('resize',()=>{if(el&&el.style.display!=='none')place()});
 function openOlimpiadas(){st.view='olymp3';st.cat='';st.q='';visibleCount=18;save();open();
  const q=el?.querySelector('input[type=search]');if(q)q.value='';paint();
 }
 function openRecovered(){st.view='archive';st.cat='';st.q='';visibleCount=72;save();open();
  const q=el?.querySelector('input[type=search]');if(q)q.value='';paint();
 }
 function openVisual(){st.view='visual';st.cat='';st.q='';visibleCount=12;save();open();
  const q=el?.querySelector('input[type=search]');if(q)q.value='';paint();
 }
 window.CAD2D_BLOCK_BROWSER=Object.freeze({open,openVisual,openRecovered,openOlimpiadas,close,refresh:paint});
 const EXT=window.CAD2D_EXTENSIONS;
 if(EXT?.commands){
  for(const k of ['BLOCKBROWSER','BB','GALERIA','GALLERY','EXPLORADORBLOQUES'])EXT.commands[k]=open;
  for(const k of ['GALERIAVISUAL','BLOQUESVISUALES','VISUALGALLERY','GV'])EXT.commands[k]=openVisual;
  for(const k of ['VISTASRECUPERADAS','VISTASBLOQUES'])EXT.commands[k]=openRecovered;
  for(const k of ['OLIMPIADAS','OLIMPIADAS3','BLOQUESOLIMPIADAS'])EXT.commands[k]=openOlimpiadas;
 }
 // Botón grande en la cinta (Inicio y Arquitectura) y en la barra rápida.
 const ico='<rect x="2" y="3" width="6" height="6" rx="1"/><rect x="9" y="3" width="6" height="6" rx="1"/><rect x="16" y="3" width="6" height="6" rx="1"/><rect x="2" y="11" width="6" height="6" rx="1"/><rect x="9" y="11" width="6" height="6" rx="1"/><rect x="16" y="11" width="6" height="6" rx="1"/><path d="M4 21h16"/>';
 try{CORE.ribbon.add('home','BLOCKS+',[{id:'blockBrowser',label:T('Block browser','Explorador'),icon:ico,run:open}]);CORE.ribbon.add('arq','BLOCKS+',[{id:'blockBrowser',label:T('Block browser','Explorador'),icon:ico,run:open}]);CORE.ribbon.rebuild()}catch(e){console.warn(e)}
 // Curated preview gallery is an additional view of the same insertion mechanism.
 const qb=document.querySelector('#cadQuickBar [data-qb=blocks]');if(qb){const n=qb.cloneNode(true);n.title=T('Block browser · BB','Explorador de bloques · BB');n.addEventListener('click',e=>{e.stopPropagation();open()});qb.replaceWith(n)}
})();
