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
 const stairOriginal=it=>/^(?:esc-(?:recta|L|U|caracol|rampa)|cv-(?:escalera-corte|escalon-detalle|baranda-fre))$/.test(String(it.id||''));
 const stairFamily=it=>stairOriginal(it)||/escaler|escal[oó]n|stair|pasamanos|baranda|railing|handrail|\brampa\b|\bramp\b/i.test([it.cat,it.name,it.family].join(' '));
 const VIEWS={
  all:{en:'All',es:'Todo',cats:null},
  visual:{en:'Visual gallery',es:'Galería visual',item:it=>stairOriginal(it)||/^userdx4-/.test(it.id)||/^(?:olymp26-|olymp2-|cc0-fp-|bl-view-window-)/.test(it.id)||
    /^(?:dk-arbol-vista|dk-arbol-invierno|dk-arbol-radial|dk-arbusto-arbol|dk-arbol-hojas|dk-arbol-ramas|dk-dos-arboles|dk-ventana-2x2-vista|dk-ventana-bano-vista)$/.test(it.id)},
  dk:{en:'Blackline library',es:'Biblioteca Blackline',item:it=>/^dk-|^doc-/.test(it.id)},
  bath:{en:'Bathrooms',es:'Baños',family:'Baños'},
  kitchen:{en:'Kitchens',es:'Cocinas',family:'Cocinas'},
  bedroom:{en:'Bedrooms',es:'Dormitorios',family:'Dormitorios'},
  vehicles:{en:'Vehicles',es:'Vehículos',family:'Vehículos'},
  carpentry:{en:'Doors & windows',es:'Puertas y ventanas',family:'Puertas y ventanas'},
  furniture:{en:'Furniture',es:'Mobiliario',family:'Mobiliario'},
  stairs:{en:'Stairs & railings',es:'Escaleras y barandas',family:'Escaleras'},
  plan:{en:'Plans',es:'Plantas',mode:'Planta'},
  section:{en:'Sections & elevations',es:'Cortes y vistas',mode:'Vistas'},
  archive:{en:'Recovered views',es:'Vistas recuperadas',item:it=>archivedView(it)},
  olymp3:{en:'2D blocks · 1,000+ vectors',es:'Bloques 2D · 1.000+ vectores',item:it=>stairOriginal(it)||/^(?:olymp3-|userdx4-)/.test(it.id)},
  imported:{en:'Imported blocks',es:'Bloques importados',item:it=>/^userdx4-/.test(it.id)},
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
/* Match only the DXF import button to the existing palette. */
#cadBlockBrowser .tools button[data-a="local-pack"]{appearance:none;-webkit-appearance:none;box-sizing:border-box;background:#1b252e;border:1px solid #3b4f5d;color:#cfdbe2;font:inherit;font-weight:500;border-radius:9px;padding:7px 14px;min-height:34px;cursor:pointer;white-space:nowrap;box-shadow:none}
#cadBlockBrowser .tools button[data-a="local-pack"]:hover{background:#273943;border-color:#82bbd2}
#cadBlockBrowser .tools button[data-a="local-pack"]:active{filter:brightness(.94)}
#cadBlockBrowser .tools button[data-a="local-pack"]:focus-visible{outline:2px solid #82bbd2;outline-offset:3px}
#cadBlockBrowser.visual .tools button[data-a="local-pack"]{background:#f3e8d3;border-color:#c4ad83;color:#4b4232}
#cadBlockBrowser.visual .tools button[data-a="local-pack"]:hover{background:#e7d7b9;border-color:#927447}
#cadBlockBrowser.visual .tools button[data-a="local-pack"]:focus-visible{outline-color:#927447}
.bl-light #cadBlockBrowser:not(.visual) .tools button[data-a="local-pack"]{background:#f4f6f7;border-color:#9aaab3;color:#354550}
.bl-light #cadBlockBrowser:not(.visual) .tools button[data-a="local-pack"]:hover{background:#e4ebef;border-color:#57778a}
.bl-light #cadBlockBrowser:not(.visual) .tools button[data-a="local-pack"]:focus-visible{outline-color:#57778a}

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
#cadBlockBrowser .static-block-preview{filter:var(--static-preview-filter,none);max-height:220px}
/* Static SVGs use dark ink; adapt only their presentation to the browser theme. */
#cadBlockBrowser:not(.visual) .static-block-preview{filter:brightness(0) invert(.88)}
.bl-light #cadBlockBrowser:not(.visual) .static-block-preview{filter:none}
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
 css.textContent+=`
#cadBlockBrowser.compact-search{min-width:0;min-height:0;border-radius:18px}
#cadBlockBrowser.compact-search .tabs,#cadBlockBrowser.compact-search .cats,#cadBlockBrowser.compact-search .tools label,#cadBlockBrowser.compact-search .paper-palette,#cadBlockBrowser.compact-search [data-a=local-pack],#cadBlockBrowser.compact-search [data-a=max],#cadBlockBrowser.compact-search .rz{display:none}
#cadBlockBrowser.compact-search .main{grid-template-columns:minmax(0,1fr)}
#cadBlockBrowser.compact-search .grid{gap:8px;padding:8px;grid-auto-rows:minmax(0,1fr);align-content:start}
#cadBlockBrowser.compact-search .card{min-height:0;padding:6px;gap:3px;overflow:hidden}
#cadBlockBrowser.compact-search .card .preview{min-height:0!important;flex:1;height:76px;padding:3px;overflow:hidden}
#cadBlockBrowser.compact-search .card .preview svg,#cadBlockBrowser.compact-search .card .preview img{height:100%!important;max-height:76px!important;width:100%}
#cadBlockBrowser.compact-search .card .nm,#cadBlockBrowser.compact-search .card .mt{font-size:11px;line-height:1.2}
#cadBlockBrowser.compact-search .ft{display:flex;align-items:center;justify-content:space-between;gap:5px;padding:7px 10px}
#cadBlockBrowser.compact-search .ft button{border:1px solid #b8a17a;border-radius:7px;background:#fffaf0;color:#51432e;padding:4px 9px;cursor:pointer}
#cadBlockBrowser.compact-search .ft button:disabled{opacity:.35;cursor:default}
#cadBlockBrowser.compact-search.min .ft{display:none}
`;
 css.textContent+=`
#cadBlockBrowser .web-links{display:none}
#cadBlockBrowser.web-reference .web-links{display:flex;gap:4px;flex-wrap:wrap;padding:5px 9px;background:#ede2cc}
#cadBlockBrowser.web-reference .tools{padding:6px 9px}
#cadBlockBrowser.house-gallery .web-links{display:none}
#cadBlockBrowser.house-gallery .area-links button[aria-pressed=true]{background:#85683e;color:#fff}
#cadBlockBrowser.house-gallery .grid{grid-template-rows:repeat(2,minmax(170px,1fr));overflow:auto;gap:10px;padding:10px}
#cadBlockBrowser.house-gallery .web-card img{height:0;flex:1 1 0;min-height:100px;width:100%;object-fit:contain;display:block;background:#fff}
#cadBlockBrowser.compact-search .rz.se{display:block;touch-action:none;z-index:10}
#cadBlockBrowser.web-reference .web-card img{height:0;flex:1 1 70px;min-height:48px;max-height:none}
#cadBlockBrowser.web-reference .area-links{display:flex;flex-wrap:wrap;gap:4px;padding:4px 9px;background:#ede2cc}
#cadBlockBrowser.web-reference .area-links button{border:1px solid #b8a17a;background:#fffaf0;color:#51432e;border-radius:6px;padding:3px 7px;cursor:pointer;font-size:11px}
#cadBlockBrowser:not(.web-reference) .area-links,#cadBlockBrowser.min .area-links{display:none}
#cadBlockBrowser.web-reference .tools input{min-width:0}
#cadBlockBrowser.web-reference .grid{grid-template-rows:none;grid-auto-rows:minmax(230px,auto);align-content:start;overflow-y:auto;min-height:0}
#cadBlockBrowser.web-reference .main{min-height:0;overflow:hidden}
#cadBlockBrowser.web-reference .web-card .plan-preview{height:160px;min-height:160px;flex:none;display:flex;align-items:center;justify-content:center;background:#fff;border-radius:5px;overflow:hidden}
#cadBlockBrowser.web-reference .web-card .plan-preview img{display:block;width:100%;height:100%;min-height:0;object-fit:contain;flex:none}
#cadBlockBrowser.web-reference .web-card .plan-preview span{padding:10px;text-align:center;color:#75674f;font-size:12px}
#cadBlockBrowser.web-reference .web-card a{flex:none;min-height:14px}
#cadBlockBrowser.web-reference .web-card>span{flex:none}
#cadBlockBrowser.web-reference .web-card button{min-height:29px}
#cadBlockBrowser.web-reference .web-links,#cadBlockBrowser.web-reference .area-links,#cadBlockBrowser.web-reference .tools{flex-shrink:0}
#cadBlockBrowser.web-reference .web-card{display:flex;flex-direction:column;min-height:0;padding:5px;gap:3px;border:1px solid #cbb796;border-radius:8px;background:#fffaf0;color:#293238;overflow:hidden}
#cadBlockBrowser.web-reference .web-card img{width:100%;min-height:0;flex:1;object-fit:contain;background:#fff}
#cadBlockBrowser.web-reference .web-card a{color:#59482d;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#cadBlockBrowser.web-reference .web-card button,#cadBlockBrowser.web-reference .web-links button{border:1px solid #b8a17a;background:#fffaf0;color:#51432e;border-radius:6px;padding:3px 6px;cursor:pointer;font-size:11px}
#cadBlockBrowser.web-reference.min .web-links{display:none}
`;document.head.append(css);

 let el=null,armedId=null,visibleCount=st.view==='olymp3'?18:72;
 const pageSize=()=>st.view==='visual'?12:st.view==='olymp3'?18:72;
 let catalogOpening=null,selectionEpoch=0;
 function loadOlimpiadas(){const pkg=window.CAD2D_OLYMPIADAS3;
  if(!pkg||pkg.catalogReady||catalogOpening||pkg.loaded===pkg.total)return;
  catalogOpening=(async()=>{
   try{await pkg.loadCatalog();paint()}
   catch(err){CORE.toast(T('Block catalog unavailable. Reopen the gallery to retry.','Catálogo de bloques no disponible. Volvé a abrir la galería para reintentar.'))}
  })().catch(err=>CORE.toast('Bloques 2D: '+err.message)).finally(()=>{catalogOpening=null});
 }
 function galleryItems(){
  const base=LIB.library,remote=window.CAD2D_OLYMPIADAS3?.catalog||[];
  if(!remote.length)return base;
  const ids=new Set(base.map(it=>it.id)),sources=new Set(base.map(it=>String(it.source||'').toLowerCase()).filter(Boolean));
  return base.concat(remote.filter(it=>!ids.has(it.id)&&!sources.has(String(it.source||'').toLowerCase())));
 }
 // Quality gate: the temporary schematic views26 set remains in source for
 // backward compatibility, but is not advertised as production CAD drafting.
 // Quality review hid older schematic views, not their editable geometry.
 // Recover access only in view-specific tabs, retaining curated main gallery.
 const archivedView=it=>Boolean(it.hideFromGallery||/^views26-/.test(it.id));
 const archiveTabs=new Set(['section','archive','doorElev','windowElev','fridgeElev']);
 const items=()=>galleryItems().filter(it=>(commandGallery&&String(st.q||'').trim())||(!/^views26-/.test(it.id)&&
   (!it.hideFromGallery||(archiveTabs.has(st.view)&&it.hideFromGallery&&/^(?:cv-|vm-|alz-)/.test(it.id))||(stairOriginal(it)&&['all','visual','olymp3','stairs','plan','section'].includes(st.view)))));
 const familyOf=it=>{
  const id=String(it.id||'').toLowerCase(),c=String(it.cat||'').toLowerCase(),n=String(it.name||'').toLowerCase();
  // Explicit botanical names and source IDs take precedence over generic keyword matches.
  if(/árbol|arbol|arbusto|palmera|vegetaci[oó]n|planta ornamental|planta en maceta|follaje|con[ií]fera|cactus|\b(?:tree|trees|shrub|shrubs|bush|bushes|foliage|potted plant)\b/.test(n)||/^(?:olymp3-|olymp2-)?ca[-_]arb[-_]/.test(id))return 'Exterior';
  if(stairFamily(it))return 'Escaleras';
  if(/^userdx4-/.test(it.id))return it.cat||'Sin clasificar';
  if(/sanit|bañ|bath|inodoro|bidet|lavatorio|ducha|mingitorio|vanitory|bañera|jacuzzi|wc\b|toilet|urinal|shower/.test(c+' '+n)||/^san-|^ca_ba_/.test(id))return 'Baños';
  if(/cocina|kitchen|heladera|freezer|horno|anafe|lavavajillas|microondas|campana|extractor|cafetera|lavarropas|secarropas|vinoteca|induc|refrig/.test(c+' '+n)||/^kq-|^ca_co_/.test(id))return 'Cocinas';
  if(/dormitorio|bedroom|cama|cucheta|cuna|colchón|mattress|bunk|crib|placard/.test(c+' '+n)||/^dor-|^ca_dorm/.test(id))return 'Dormitorios';
  if(/vehículo|\bauto(?:s|móvil|móviles)?\b|camión|colectivo|\b(?:bus|buses|autobús|autobuses|omnibus|ómnibus|pickup|van|vans|car|cars|truck|trucks)\b|furgón|coupé|tractor|\bmoto(?:s|cicleta|cicletas)?\b|biciclet|vehic/.test(c+' '+n)||/^veh-|^ca_auto|^ca_v_(?:bus|cam|moto)/.test(id))return 'Vehículos';
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
 const blockTerms=[
 ['anafe anafes cooktop cooktops hob hobs placa',/\b(?:anafes?|cooktops?|hobs?|placa de coccion)\b/],
 ['horno hornos oven ovens',/\b(?:hornos?|ovens?)\b/],
 ['cocina a gas|gas stove|stove|estufa',/\b(?:cocina a gas|gas stove|stoves?|ranges?|cocina con horno)\b/],
 ['microondas microwave microwaves',/\b(?:microondas|microwaves?)\b/],
 ['palmera palmeras palm',/\b(?:palmeras?|palm)\b/],
 ['persona personas person people',/\b(?:personas?|person|people|human)\b/],
 ['camion camiones truck trucks',/\b(?:camion(?:es)?|trucks?)\b/],
 ['bicicleta bicicletas bicycle bicycles',/\b(?:bicicletas?|bicycles?|bikes?)\b/],
 ['moto motos motorcycle motorcycles',/\b(?:motos?|motocicletas?|motorcycles?)\b/],
 ['inodoro toilet toilets inodoros wc retrete retretes',/\b(?:inodoros?|toilets?|wc|retretes?|water closet)\b/],
 ['bidet bidets bidé bidés bides',/\b(?:bidet|bide)s?\b/],
 ['lavabo lavatorio bacha sink washbasin',/\b(?:lavabos?|lavatorios?|bachas?|sinks?|washbasins?|vanitory)\b/],
 ['ducha shower showers duchas',/\b(?:duchas?|showers?)\b/],
 ['bañadera bañera bathtub bathtubs banadera banera',/\b(?:banaderas?|baneras?|bathtubs?)\b/],
 ['puerta puertas door doors',/\b(?:puertas?|doors?)\b/],
 ['ventana ventanas window windows',/\b(?:ventanas?|ventanales?|windows?)\b/],
 ['escalera escaleras stair stairs staircase',/\b(?:escaleras?|stairs?|staircases?)\b/],
 ['heladera refrigerador fridge refrigerator',/\b(?:heladeras?|refrigeradores?|fridges?|refrigerators?)\b/],
 ['silla sillas chair chairs',/\b(?:sillas?|chairs?)\b/],
 ['mesa mesas table tables',/\b(?:mesas?|tables?)\b/],
 ['cama camas bed beds',/\b(?:camas?|beds?)\b/],
 ['sofa sofá sillon sillón couch',/\b(?:sofas?|sillones?|sillon|couches?|couch)\b/],
 ['auto autos car cars coche coches',/\b(?:autos?|automoviles?|automovil|cars?|coches?)\b/],
 ['arbol árbol tree trees arboles árboles',/\b(?:arbol(?:es)?|trees?)\b/]
 ];
 const normalizeTerm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
 const termIndex=new Map(blockTerms.flatMap(([keys,re])=>(keys.includes('|')?keys.split('|'):keys.split(' ')).map(k=>[normalizeTerm(k),re])));
 function blockQuery(raw){
  const q=normalizeTerm(raw);
  const mode=/\b(?:cortes?|secciones?|seccion|sections?|sectional|cross.section)\b/.test(q)?'Corte':/\b(?:vistas?|alzados?|elevaciones?|elevacion|elevations?|front|side|frontal|laterales?|perfil|posterior|rear|costado|frente|trasera|trasero|atras|detras|back)\b/.test(q)?'Alzado':/\b(?:plantas?|top|plan|arriba|superior)\b/.test(q)?'Planta':null;
  const direction=/\b(?:laterales?|perfil|side|costado)\b/.test(q)?'side':/\b(?:frontal|front|frente)\b/.test(q)?'front':/\b(?:posterior|rear|trasera|trasero|atras|detras|back)\b/.test(q)?'rear':null;
  const text=q.replace(/\b(?:en|de|del|la|el|los|las|un|una|desde|visto|vista|in|of|the|from|cortes?|secciones?|seccion|sections?|sectional|cross.section|vistas?|alzados?|elevaciones?|elevacion|elevations?|front|side|frontal|laterales?|perfil|posterior|rear|costado|frente|trasera|trasero|atras|detras|back|plantas?|top|plan|arriba|superior|view)\b/g,' ').replace(/\s+/g,' ').trim();
  return {q,mode,direction,text};
 }
 function blockMatchRank(it,query){
  const {q,mode,direction,text}=query;if(!q)return 0;
  const name=normalizeTerm([it.name,tr(it.name),String(it.id||'').replace(/[_-]/g,' '),String(it.source||'').replace(/[_-]/g,' ')].filter(Boolean).join(' '));
  const all=normalizeTerm([name,it.cat,tr(it.cat),familyOf(it),...(Array.isArray(it.tags)?it.tags:[])].filter(Boolean).join(' '));
  const syn=termIndex.get(text);
  const tokens=text.split(/[\s_-]+/).filter(Boolean);
  const matched=!text||(syn?syn.test(name):tokens.every(t=>{const alias=termIndex.get(t);return alias?alias.test(name):all.includes(t)}));
  if(!matched)return -1;
  const actual=modeOf(it);
  if(direction&&!(direction==='side'?/lateral|perfil|side|\blat\b/:direction==='front'?/frontal|front|\bfre\b/:/posterior|rear|trasera/).test(name))return -1;
  if(!mode||actual===mode)return 0;
  // Furniture shown in a building section may be an elevation rather than a cut through the object.
  // Label these alternatives explicitly, after true section blocks.
  if(mode==='Corte'&&actual==='Alzado'&&text&&!direction)return 1;
  return -1;
 }
 function filtered(pool=items().filter(inView)){
  const query=blockQuery(st.q);
  return pool.filter(it=>(!st.cat||groupOf(it)===st.cat)&&blockMatchRank(it,query)>=0);
 }
 // Nombres visibles simples; identificadores, definiciones y búsqueda original intactos.
 function simpleBlockNames(){
  const counters=Object.create(null),out=new Map();
  const patterns=[['Puerta',/\b(?:puerta|door|porton|portón)\b/i],['Ventana',/\b(?:ventana|ventanal|window)\b/i],['Escalera',/\b(?:escalera|stair)\b/i],['Inodoro',/\b(?:inodoro|toilet|wc)\b/i],['Bañadera',/\b(?:bañadera|bañera|bathtub)\b/i],['Auto',/\b(?:auto|automóvil|coche|car)\b/i],['Camión',/\b(?:camión|camion|truck)\b/i],['Árbol',/\b(?:árbol|arbol|tree)\b/i],['Heladera',/\b(?:heladera|refrigerador|fridge)\b/i],['Cocina',/\b(?:cocina|kitchen)\b/i]];
  for(const it of galleryItems().slice().sort((a,b)=>String(a.id).localeCompare(String(b.id)))){
   const candidate=patterns.find(p=>p[1].test(String(it.name||'')))?.[0];
   if(candidate){counters[candidate]=(counters[candidate]||0)+1;out.set(it.id,candidate+' '+counters[candidate]);}
  }
  return out;
 }
 const simpleName=(it,names)=>{const n=names.get(it.id)||tr(it.name);return /^userdx4-/.test(it.id)?n.replace(/ · escala estimada| · parcial/g,'')+(it.importFlags&1?' · '+T('check scale','revisar escala'):'')+(it.importFlags&6?' · '+T('partial','parcial'):''):n};
 // Prebuilt thumbnails are optional; local geometry remains the insertion source.
 let previewObserver=null,previewFrame=0,previewQueue=[],previewEpoch=0,staticIds=new Set(),staticLoad=null;
 function loadStaticPreviews(){
  if(staticLoad)return staticLoad;
  staticLoad=fetch('/assets/block-previews/v1/catalog.json',{cache:'default'}).then(r=>{if(!r.ok)throw Error('no preview catalog');return r.json()}).then(data=>{
   if(data.version!==1||!Array.isArray(data.blocks))return;
   staticIds=new Set(data.blocks.map(x=>x.id).filter(x=>/^olymp3-[a-z0-9_-]+$/i.test(x)));
   if(el&&el.style.display!=='none'&&!el.classList.contains('min'))paint();
  }).catch(()=>{staticLoad=null});
  return staticLoad;
 }
 function resetPreviews(){
  previewEpoch++;previewObserver?.disconnect();previewObserver=null;previewQueue=[];
  if(previewFrame)cancelAnimationFrame(previewFrame);previewFrame=0;
 }
 function mountPreviews(grid){
  const epoch=previewEpoch;
  function render(node){
   if(epoch!==previewEpoch||!node.isConnected)return;
   const id=node.dataset.previewId,h=Number(node.dataset.previewHeight);
   const dk=window.CAD2D_DK_DEMAND?.has(id),olymp=staticIds.has(id)||(/^olymp3-/.test(id)&&window.CAD2D_OLYMPIADAS3?.catalogReady);
   if(dk||olymp){
    const img=document.createElement('img');img.alt=T('Block preview','Vista previa del bloque');img.decoding='async';img.loading='eager';
    img.style.cssText='display:block;width:100%;height:'+Math.max(40,Math.min(400,h||96))+'px;object-fit:contain';
    img.className='static-block-preview';
    node.setAttribute('aria-busy','true');
    img.onload=()=>{if(epoch===previewEpoch&&node.isConnected)node.removeAttribute('aria-busy')};
    img.onerror=()=>{if(epoch===previewEpoch&&node.isConnected){node.removeAttribute('aria-busy');node.textContent=T('Preview unavailable','Miniatura no disponible')}};
    // IntersectionObserver already limits requests to visible or nearby cards.
    // Never generate/download CAD geometry to paint a cloud thumbnail.
    img.src=(dk?'assets/blackline-dk-demand-v1/':'/assets/block-previews/v1/')+encodeURIComponent(id)+'.svg';node.replaceChildren(img);
   }else{try{node.innerHTML=ARQ.thumb(id,h)}catch(e){node.textContent='—'}}
  }
  function pump(){
   previewFrame=0;if(epoch!==previewEpoch)return;
   const until=performance.now()+6;
   do{const node=previewQueue.shift();if(!node)break;render(node)}while(previewQueue.length&&performance.now()<until);
   if(previewQueue.length)previewFrame=requestAnimationFrame(pump);
  }
  const enqueue=node=>{previewQueue.push(node);if(!previewFrame)previewFrame=requestAnimationFrame(pump)};
  const nodes=grid.querySelectorAll('[data-preview-id]');
  if(typeof IntersectionObserver==='function'){
   previewObserver=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){previewObserver?.unobserve(entry.target);enqueue(entry.target)}},{root:grid,rootMargin:'120px'});
   nodes.forEach(node=>previewObserver.observe(node));
  }else nodes.forEach(enqueue);
 }
 function paint(){
  if(!el||el.style.display==='none'||el.classList.contains('min'))return;
  if(webMode){paintWeb();return;}
  resetPreviews();
  const allItems=items(),pool=allItems.filter(inView),names=simpleBlockNames(),counts=new Map();
  for(const it of pool){const cat=groupOf(it);counts.set(cat,(counts.get(cat)||0)+1)}
  const visual=commandGallery||st.view==='visual'||st.view==='olymp3'||st.view==='imported';
  const paper=PAPERS.find(p=>p.id===(commandGallery?'cream':st.paper))||PAPERS[0];
  el.style.setProperty('--paper-bg',paper.bg);
  el.style.setProperty('--paper-ink',paper.ink);
  el.style.setProperty('--static-preview-filter',['blue','black'].includes(paper.id)?'invert(1)':'none');
  el.querySelectorAll('[data-paper]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.paper===paper.id)));
  el.classList.remove('web-reference','house-gallery');el.classList.toggle('visual',visual);el.classList.toggle('compact-search',commandGallery);
  el.setAttribute('aria-label',visual?T('Visual block gallery','Galería visual de bloques'):'Block browser');
  el.querySelector('.hd b').textContent=visual?'BLACKLINE CAD · '+T('VISUAL GALLERY','GALERÍA VISUAL'):'BLACKLINE CAD · '+T('BLOCK BROWSER','EXPLORADOR DE BLOQUES');
  el.querySelectorAll('.tabs button').forEach(b=>{b.classList.toggle('on',b.dataset.v===st.view);if(b.dataset.v==='imported')b.textContent=T('Imported blocks','Bloques importados')+' · '+allItems.filter(it=>/^userdx4-/.test(it.id)).length;});
  const cats=[...counts.keys()].sort((a,b)=>a.localeCompare(b,es()?'es':'en'));
  if(st.cat&&!cats.includes(st.cat))st.cat='';
  const count=c=>c?(counts.get(c)||0):pool.length;
  el.querySelector('.cats').innerHTML=`<button data-c="" class="${st.cat?'':'on'}"><span>${T('All categories','Todas las categorías')}</span><small>${count('')}</small></button>`+
   cats.map(c=>`<button data-c="${c}" class="${st.cat===c?'on':''}"><span>${tr(c)}</span><small>${count(c)}</small></button>`).join('');
  const list=filtered(pool),grid=el.querySelector('.grid');
  const searchQuery=blockQuery(st.q);
  if(visual)list.sort((a,b)=>{
   const rank=x=>/^(?:dk-arbol|dk-dos-arboles|dk-arbusto-arbol)/.test(x.id)?0:familyOf(x)==='Exterior'?1:2;
   return blockMatchRank(a,searchQuery)-blockMatchRank(b,searchQuery)||Number(archivedView(a))-Number(archivedView(b))||rank(a)-rank(b)||a.name.localeCompare(b.name,es()?'es':'en');
  });
  searchPage=Math.min(searchPage,Math.max(0,Math.ceil(list.length/4)-1));const shown=commandGallery?list.slice(searchPage*4,searchPage*4+4):list.slice(0,visibleCount),cardSize=commandGallery?100:visual?Math.max(170,st.size):st.size;
  grid.style.gridTemplateColumns=commandGallery?'repeat(2,minmax(0,1fr))':`repeat(auto-fill,minmax(${cardSize}px,1fr))`;
  grid.innerHTML=shown.map(it=>`<button class="card${it.id===armedId?' armed':''}" data-id="${it.id}" title="${simpleName(it,names)} · ${T('Click to select, then click on drawing','Clic para seleccionar, luego clic en el plano')}"><span class="preview" data-preview-id="${it.id}" data-preview-height="${visual?Math.max(145,Math.round(cardSize*.9)):Math.round(st.size*.72)}" style="min-height:${visual?Math.max(145,Math.round(cardSize*.9)):Math.round(st.size*.72)}px"></span>${it.pro?'<span class="pro">PRO</span>':''}${archivedView(it)?'<span class="archive-label" title="Bloque histórico o esquemático; verificar detalle y escala">'+T('HISTORICAL / SCHEMATIC','HISTÓRICO / ESQUEMÁTICO')+'</span>':''}<span class="nm">${simpleName(it,names)}</span>${commandGallery&&st.q?'<span class="mt">'+({Planta:T('Plan','Planta'),Corte:T('Section','Corte'),Alzado:T('Elevation','Alzado')}[modeOf(it)])+(blockMatchRank(it,searchQuery)===1?' · '+T('related view','vista relacionada'):'')+'</span>':''}<span class="mt">${cm(it.w)}×${cm(it.d)} cm${it.wMax>it.wMin||it.dMax>it.dMin?' · ↔':''}</span></button>`).join('')||`<p style="color:inherit;padding:20px">${T('No blocks match.','No hay bloques que coincidan.')}</p>`;
  mountPreviews(grid);
  if(!commandGallery&&list.length>shown.length)grid.insertAdjacentHTML('beforeend',`<button class="card" data-more="1" style="justify-content:center;align-items:center;min-height:110px;text-align:center">${T('Show more','Mostrar más')} · ${list.length-shown.length} ${T('remaining','restantes')}</button>`);
  el.querySelector('.ft').textContent=visual
   ?T(`${list.length} detailed blocks · Click the preview, then click the drawing to place it · Esc cancels`,`${list.length} bloques detallados · Clic en la imagen y después en el plano para colocarlo · Esc cancela`)
   :T(`${list.length} of ${allItems.length} blocks · click a block, then click in the drawing · ↔ = resizable with grips`,`${list.length} de ${allItems.length} bloques · clic en un bloque y luego en el dibujo · ↔ = se ajusta con pinzas`);
  if(commandGallery){const ft=el.querySelector('.ft');ft.replaceChildren();const prev=document.createElement('button'),next=document.createElement('button'),label=document.createElement('span');prev.dataset.page='-1';next.dataset.page='1';prev.textContent='‹';next.textContent='›';prev.setAttribute('aria-label',T('Previous four','Cuatro anteriores'));next.setAttribute('aria-label',T('Next four','Cuatro siguientes'));prev.disabled=searchPage===0;next.disabled=(searchPage+1)*4>=list.length;label.textContent=list.length?((searchPage*4+1)+'–'+Math.min((searchPage+1)*4,list.length)+' / '+list.length):'0';ft.append(prev,label,next);return;}
  const pkg=window.CAD2D_OLYMPIADAS3;
  if(pkg&&!pkg.catalogReady&&(pkg.loading||pkg.loaded<pkg.total))el.querySelector('.ft').textContent+=' · Bloques '+pkg.loaded+'/'+pkg.total+(pkg.loading?' · cargando…':'');
 }
 function place(){
  const W=innerWidth,H=innerHeight;if(commandGallery&&compactRect){const c=compactRect;c.w=Math.min(Math.max(300,c.w||370),W-16);c.h=Math.min(Math.max(320,c.h||420),H-16);c.x=Math.max(8,Math.min(W-c.w-8,c.x));c.y=Math.max(8,Math.min(H-c.h-8,c.y));Object.assign(el.style,{left:c.x+'px',top:c.y+'px',width:c.w+'px',height:c.h+'px'});return;}st.w=Math.min(Math.max(420,st.w),W-16);st.h=Math.min(Math.max(300,st.h),H-16);
  if(st.x===null){st.x=Math.round((W-st.w)/2);st.y=Math.round(Math.max(60,(H-st.h)/2))}
  st.x=Math.max(8-st.w+120,Math.min(W-120,st.x));st.y=Math.max(4,Math.min(H-44,st.y));
  Object.assign(el.style,{left:st.x+'px',top:st.y+'px',width:st.w+'px',height:st.h+'px'});
 }
 function open(){
  if(!webMode)loadStaticPreviews();
  if(el){el.classList.remove('min');el.style.display='flex';place();paint();if(!webMode)loadOlimpiadas();el.querySelector('input').focus();return}
  el=document.createElement('div');el.id='cadBlockBrowser';el.setAttribute('role','dialog');el.setAttribute('aria-label','Block browser');
  el.innerHTML=`<div class="hd"><b>BLACKLINE CAD · ${T('BLOCK BROWSER','EXPLORADOR DE BLOQUES')}</b><button data-a="min" title="${T('Collapse','Plegar')}">▁</button><button data-a="max" title="${T('Maximize','Maximizar')}">▢</button><button data-a="close" title="${T('Close · Esc','Cerrar · Esc')}">×</button></div>
<div class="tabs">${Object.entries(VIEWS).map(([k,v])=>`<button data-v="${k}">${es()?v.es:v.en}</button>`).join('')}</div>
<div class="tools"><input type="search" placeholder="${T('Search: toilet, kitchen, car, section, north…','Buscar: inodoro, cocina, auto, corte, norte…')}" value=""><label>${T('Size','Tamaño')} <input type="range" min="84" max="220" step="4" value="${st.size}"></label>${paperControls()}<button type="button" data-a="local-pack" title="Importar ZIP completos, DWG, DXF o paquete JSON local">${T("Import ZIP / DWG / DXF","Importar ZIP / DWG / DXF")}</button></div>
<div class="web-links"><button data-web="search">Buscar / Search</button><button data-web="google">Google</button><button data-web="pinterest">Pinterest</button><button data-web="file">Archivo / File</button><button data-web="url">URL</button></div><div class="area-links"><button data-web="all-houses">${T('All','Todas')}</button><button data-web="house-references">${T('References','Referencias')}</button>${[['Baños','Bathrooms'],['Cocinas','Kitchens'],['Dormitorios','Bedrooms'],['Detalles','Details']].map(([es,en])=>`<button data-web="ref-type" data-ref-type="${es}">${T(en,es)}</button>`).join('')}${[30,45,60,70,75,90,100,120,150,180,200,250].map(n=>`<button data-web="area" data-area="${n}">${n} m²</button>`).join('')}</div><div class="main"><div class="cats"></div><div class="grid"></div></div><div class="ft"></div>
<span class="rz n" data-r="n"></span><span class="rz e" data-r="e"></span><span class="rz s" data-r="s"></span><span class="rz w" data-r="w"></span><span class="rz se" data-r="se"></span>`;
  document.body.append(el);place();
  const q=el.querySelector('input[type=search]');q.value=st.q;
  let repaintFrame=0;const schedulePaint=()=>{if(!repaintFrame)repaintFrame=requestAnimationFrame(()=>{repaintFrame=0;paint()})};
  q.addEventListener('keydown',e=>{if(webMode&&e.key==='Enter'){e.preventDefault();e.stopPropagation();searchWeb(q.value);}});
  q.addEventListener('input',()=>{selectionEpoch++;st.q=q.value;searchPage=0;visibleCount=pageSize();if(webMode){webEpoch++;webController?.abort();webItems=[];webStatus=T('Press Enter to search','Presioná Enter para buscar');}schedulePaint()});
  el.querySelector('input[type=range]').addEventListener('input',e=>{st.size=Number(e.target.value);save();schedulePaint()});
  el.addEventListener('click',async e=>{
   const action=e.target.closest('[data-web]');if(action){handleWebAction(action);return;}const page=e.target.closest('[data-page]');if(page){selectionEpoch++;searchPage=Math.max(0,searchPage+Number(page.dataset.page));paint();return;}const a=e.target.closest('[data-a]')?.dataset.a;
   if(a==='local-pack'){if(window.CAD2D_LOCAL_VECTOR_PACKS)window.CAD2D_LOCAL_VECTOR_PACKS.choose();else CORE.toast('Importador DXF todavía no disponible');return;}
   if(a==='close')return close();
   if(a==='min'){selectionEpoch++;el.classList.toggle('min');if(!el.classList.contains('min'))paint();else{resetPreviews();el.querySelector('.grid')?.replaceChildren()}return}
   if(a==='max'){if(commandGallery)return;const full=st.w>=innerWidth-30&&st.h>=innerHeight-30;if(full){Object.assign(st,st.prev||{w:980,h:640,x:null,y:null})}else{st.prev={x:st.x,y:st.y,w:st.w,h:st.h};Object.assign(st,{x:8,y:8,w:innerWidth-16,h:innerHeight-16})}place();save();return}
   const paperButton=e.target.closest('[data-paper]');if(paperButton){st.paper=paperButton.dataset.paper;save();paint();return}
   const v=e.target.closest('[data-v]')?.dataset.v;if(v){selectionEpoch++;st.view=v;st.cat='';visibleCount=pageSize();save();paint();return}
   const c=e.target.closest('[data-c]');if(c){selectionEpoch++;st.cat=c.dataset.c;visibleCount=pageSize();save();paint();return}
   if(e.target.closest('[data-more]')){const grid=el.querySelector('.grid'),pos=grid.scrollTop;visibleCount+=pageSize();paint();el.querySelector('.grid').scrollTop=pos;return}
   const card=e.target.closest('[data-id]');
   if(card){
    const targetId=card.dataset.id,epoch=++selectionEpoch,initial=CORE.state;
    const entities=initial.entities,blocks=initial.blocks,tool=initial.tool,stageLength=initial.stage?.length;
    const current=()=>epoch===selectionEpoch&&el&&el.style.display!=='none'&&!el.classList.contains('min')&&CORE.state.entities===entities&&CORE.state.blocks===blocks&&CORE.state.tool===tool&&CORE.state.stage?.length===stageLength;
    try{
     let insertId=targetId;
     const item=LIB.library.find(x=>x.id===targetId),dk=window.CAD2D_DK_DEMAND;
     const olymp=!item&&/^olymp3-/.test(targetId);
     const remote=item?.remoteDK&&!(item.dxfPlan&&window.cadInsertDxfPlan)&&dk&&!dk.isReady(targetId)&&ARQ.canEdit(targetId);
     if(olymp||remote){
      card.setAttribute('aria-busy','true');CORE.toast(T('Downloading block…','Descargando bloque…'));
      try{if(olymp)insertId=await window.CAD2D_OLYMPIADAS3.ensureBlock(targetId);else await dk.prepare(targetId)}
      finally{card.removeAttribute('aria-busy')}
     }
     if(!current())return;
     if(await ARQ.insert(insertId,undefined,undefined,current)===false||epoch!==selectionEpoch)return;
     armedId=targetId;
     if(commandGallery){close();CORE.toast(T('Click in the drawing to place it · Esc cancels','Hacé clic en el dibujo para ubicarlo · Esc cancela'));return}
    }catch(err){if(epoch===selectionEpoch)CORE.toast(String(err?.message||err));return}
    el.querySelectorAll('.card').forEach(x=>x.classList.toggle('armed',x.dataset.id===armedId));
    CORE.toast(T('Click in the drawing to place it · Esc cancels','Hacé clic en el dibujo para ubicarlo · Esc cancela'));
   }
  });
  // Mover desde la barra de título.
  const hd=el.querySelector('.hd');let drag=null;
  hd.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;const p=commandGallery?compactRect:st;drag={dx:e.clientX-p.x,dy:e.clientY-p.y};hd.setPointerCapture(e.pointerId)});
  hd.addEventListener('pointermove',e=>{if(!drag)return;const p=commandGallery?compactRect:st;p.x=e.clientX-drag.dx;p.y=e.clientY-drag.dy;place()});
  hd.addEventListener('pointerup',()=>{if(drag){drag=null;if(houseMode)rememberHouseRect();else save()}});
  hd.addEventListener('dblclick',e=>{if(!e.target.closest('button'))el.querySelector('[data-a=max]').click()});
  // Agrandar desde bordes y esquina.
  el.querySelectorAll('.rz').forEach(h=>{
   let r=null;
   h.addEventListener('pointerdown',e=>{const p=commandGallery?compactRect:st;r={mx:e.clientX,my:e.clientY,x:p.x,y:p.y,w:p.w,h:p.h,k:h.dataset.r};h.setPointerCapture(e.pointerId);e.preventDefault()});
   h.addEventListener('pointermove',e=>{if(!r)return;const dx=e.clientX-r.mx,dy=e.clientY-r.my;
    const p=commandGallery?compactRect:st;if(r.k.includes('e'))p.w=r.w+dx;if(r.k.includes('s'))p.h=r.h+dy;
    if(r.k==='w'){st.w=Math.max(420,r.w-dx);st.x=r.x+(r.w-st.w)}if(r.k==='n'){st.h=Math.max(300,r.h-dy);st.y=r.y+(r.h-st.h)}
    place()});
   h.addEventListener('pointerup',()=>{if(r){r=null;if(houseMode)rememberHouseRect();else save()}});
  });
  for(const ev of ['pointerdown','wheel','contextmenu'])el.addEventListener(ev,e=>e.stopPropagation());
  paint();if(!webMode)loadOlimpiadas();q.focus();
 }
 function close(){stopHouseRefresh();rememberHouseRect();classicMode=false;el?.querySelectorAll('.classic-links').forEach(n=>n.remove());houseMode=false;webMode=false;webController?.abort();webEpoch++;commandGallery=false;compactRect=null;selectionEpoch++;resetPreviews();if(el){el.style.display='none';el.querySelector('.grid')?.replaceChildren()}armedId=null}
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&el&&el.style.display!=='none'){selectionEpoch++;if(document.activeElement&&el.contains(document.activeElement)){close();e.stopPropagation()}}},true);
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
 function openImported(){st.view='imported';st.cat='';st.q='';visibleCount=72;save();open();const q=el?.querySelector('input[type=search]');if(q)q.value='';paint()}
 let commandGallery=false,searchPage=0,compactRect=null;
 let classicMode=false,classicLinks=[],classicModern=false;
 let houseMode=false,webMode=false,webItems=[],webStatus='',webEpoch=0,webController=null,webArea=null;
 let houseRefreshTimer=null,houseQuery='';
 function stopHouseRefresh(){clearTimeout(houseRefreshTimer);houseRefreshTimer=null;}
 function scheduleHouseRefresh(){stopHouseRefresh();if(houseMode)houseRefreshTimer=setTimeout(refreshHouseGallery,60000);}
 async function refreshHouseGallery(){
  const epoch=webEpoch;if(!houseMode)return;
  try{if(!el||el.style.display==='none'||el.classList.contains('min')||document.hidden||el.querySelector('.grid button:disabled'))return;
   const refsOnly=(/referencias|references/i.test(houseQuery)||!!houseRefCategory(houseQuery))&&!webArea;const next=(await archivedReferences(houseQuery)).filter(x=>(!refsOnly||(!x.planId&&!x.cadUrl))&&(!webArea||Number.isFinite(x.area)&&Math.abs(x.area-webArea)<.5));
   if(epoch!==webEpoch||!houseMode)return;
   const seen=new Set(webItems.map(x=>x.url||x.cadUrl||x.thumb));const added=next.filter(x=>!seen.has(x.url||x.cadUrl||x.thumb));
   if(added.length){webItems=webItems.concat(added);webStatus='';paintWeb();}
  }catch(e){}finally{if(epoch===webEpoch&&houseMode)scheduleHouseRefresh();}
 }

 function openSearch(term){stopHouseRefresh();classicMode=false;el?.querySelectorAll('.classic-links').forEach(n=>n.remove());houseMode=false;webMode=false;webController?.abort();st.view='all';st.cat='';st.q=term;visibleCount=4;searchPage=0;commandGallery=true;selectionEpoch++;const bar=document.getElementById('cadArqInstructionBar')?.getBoundingClientRect();compactRect={x:bar?bar.left:Math.max(8,(innerWidth-370)/2),y:bar?bar.bottom+8:80,w:370,h:420};open();const q=el?.querySelector('input[type=search]');if(q)q.value=term;el.querySelector('.grid').scrollTop=0}
 
 function houseRefCategory(raw){
  const q=String(raw||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  if(!/\b(?:referencias?|references?|jpg|jpeg|png|webp|imagenes?|images?|fotos?|photos?)\b/.test(q))return null;
  if(/\b(?:banos?|bathrooms?|toilets?)\b/.test(q))return 'bathroom';
  if(/\b(?:cocinas?|kitchens?)\b/.test(q))return 'kitchen';
  if(/\b(?:dormitorios?|habitaciones?|suites?|bedrooms?)\b/.test(q))return 'bedroom';
  if(/\b(?:detalles?|details?)\b/.test(q))return 'detail';
  return null;
 }
 function safeHttps(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null}catch(e){return null}}
 function cleanMeta(value){return String(value||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,500)}
 function parseArea(value){const m=String(value).match(/(\d+(?:[.,]\d+)?)\s*(?:m(?:ts?)?\s*(?:²|2|\^2)|sqm|square metres|square meters|metros cuadrados)/i);return m?Number(m[1].replace(',','.')):null}
 function webQuery(raw){const area=parseArea(raw),q=String(raw).trim();if(area&&/casa|vivienda|house|home/i.test(q))return 'house floor plan '+area+' square meters';return q.replace(/^(?:web|referencias?|reference|buscar web)\s*:?\s*/i,'')}

 let localGalleryPromise=null;
 function localGallery(){
  if(!localGalleryPromise)localGalleryPromise=fetch(new URL('assets/arq-catalogue/v1/index.json',document.baseURI)).then(r=>{if(!r.ok)throw Error('Catálogo no disponible');return r.json()}).catch(e=>{localGalleryPromise=null;throw e});
  return localGalleryPromise;
 }
 async function localHousePreviews(raw){
  if(!/\b(?:casa|casas|vivienda|viviendas|house|houses|home|homes)\b/i.test(raw))return [];
  const a=parseArea(raw),rows=await localGallery(),base=new URL('assets/arq-catalogue/v1/',document.baseURI);
  return rows.filter(x=>x.category==='house'&&(!a||Math.abs(x.area-a)<=Math.max(5,a*.15))).map(x=>({title:x.name,area:x.area,thumb:new URL(x.id+'.svg',base).href,url:new URL(x.id+'.svg',base).href,source:new URL(x.id+'.svg',base).href,license:T('Own preliminary plan','Planta propia preliminar'),local:true,planId:x.id}));
 }
 async function insertLocalPreview(item){
  const im=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error('No se pudo cargar la planta'));i.src=item.url;});
  const w=im.naturalWidth||800,h=im.naturalHeight||800,k=1800/Math.max(w,h),cv=document.createElement('canvas');cv.width=Math.max(1,Math.round(w*k));cv.height=Math.max(1,Math.round(h*k));cv.getContext('2d').drawImage(im,0,0,cv.width,cv.height);
  const blob=await new Promise(resolve=>cv.toBlob(resolve,'image/png'));if(!blob)throw Error('No se pudo crear imagen');await importReference(new File([blob],item.title+'.png',{type:'image/png'}));
 }

 async function archivedReferences(raw){
  const base=new URL('assets/architecture-references/',document.baseURI);
  const read=async name=>{try{const r=await fetch(new URL(name,base),{cache:'no-cache'});if(!r.ok)return [];const rows=await r.json();return Array.isArray(rows)?rows:[]}catch(e){return []}};
  const [archive,uploads,driveRefs,r2Refs]=await Promise.all([read('index.json'),read('user-house-plans.json'),read('drive-house-references.json'),read('r2-house-plans.json')]);
  const rows=[...new Map(archive.concat(uploads,driveRefs,r2Refs).filter(x=>x&&typeof x.original==='string').map(x=>[x.original,x])).values()];
  const area=parseArea(raw),category=houseRefCategory(raw),house=/\b(?:casa|casas|vivienda|viviendas|house|houses|home|homes)\b/i.test(raw);
  const file=v=>{if(typeof v!=='string'||!/^[\w./-]+$/.test(v)||v.includes('..')||v.startsWith('/'))return null;return new URL(v,base).href;};
  return rows.filter(x=>(/^(?:CC0|CC BY(?:-SA)?(?: [\d.]+)?|Public domain)$/i.test(x.license||'')||x.license==='User supplied'&&['house','bathroom','kitchen','bedroom','detail'].includes(x.category)&&/^(?:house|bathroom|kitchen|bedroom|detail)\/(?:\d+|unverified)\/user-[\w-]+\.(?:png|jpe?g|webp)$/i.test(x.original||''))&&(category?x.category===category:(!house||x.category==='house'))&&(!area||Number.isFinite(x.area)&&Math.abs(x.area-area)<=Math.max(5,area*.15))).map(x=>{
   const original=file(x.original),image=file(x.image)||(/\.(?:png|jpe?g|webp|pdf)$/i.test(original||'')?original:null),cad=file(x.cad)||(/\.(?:dxf|dwg)$/i.test(original||'')?original:null);
   return {title:x.title,area:x.area??null,thumb:file(x.thumb)||(/\.(?:png|jpe?g|webp)$/i.test(image||'')?image:null),url:image,cadUrl:cad,source:x.license==='User supplied'?original:safeHttps(x.source),license:x.license==='User supplied'?(x.area==null?T('Reference image','Imagen de referencia'):T('Reference image · Approximate area','Imagen de referencia · Superficie aproximada')):x.license+' · '+(x.author||'')};
  }).filter(x=>x.thumb&&(x.url||x.cadUrl)&&x.source);
 }
 // Public-domain plates of historical treatises (Palladio, Vitruvio, Serlio…), served by the
 // site's own Cloudflare functions: /classics/search (Commons, PD only) and /classics/img (cache).
 async function searchClassics(raw){
  webController?.abort();const ctrl=new AbortController();webController=ctrl;const epoch=++webEpoch;
  st.q=raw;searchPage=0;webItems=[];webArea=null;webStatus=T('Loading classic plans…','Cargando plantas clásicas…');paintWeb();
  try{
   const res=await fetch('/classics/search?q='+encodeURIComponent(raw)+'&v=3',{signal:ctrl.signal,credentials:'omit'});
   const data=await res.json();if(epoch!==webEpoch||!classicMode)return;
   if(!res.ok||!Array.isArray(data.items))throw Error(data?.error||'HTTP '+res.status);
   const img=u=>'/classics/img?u='+encodeURIComponent(u);
   classicLinks=Array.isArray(data.links)?data.links.filter(l=>/^https:\/\//.test(l.u)):[];classicModern=!!data.modern;webItems=data.items.map(x=>{const photo=x.kind==='photo',cover=x.kind==='cover',credit=photo?T('Photo','Foto')+': '+(x.credit||'Wikimedia Commons')+' · '+x.license:(cover?T('Cover','Portada'):T('Plate','Lámina'))+(x.date?' '+x.date:'')+' · '+T('Public domain','Dominio público');return {title:(photo?x.title+' · '+credit:x.title),area:null,classic:true,kind:x.kind,local:true,thumb:img(x.thumb),url:img(x.image),source:x.page,license:x.author+' · '+credit};});
   webStatus=webItems.length?'':T('Nothing found. Try another work or author: Palladio, Vitruvio, Serlio, Piranesi, Ledoux, Viollet-le-Duc, Choisy, Mies, Le Corbusier.','No encontré resultados. Probá otra obra o autor: Palladio, Vitruvio, Serlio, Piranesi, Ledoux, Viollet-le-Duc, Choisy, Mies, Le Corbusier.');
  }catch(e){if(e.name==='AbortError'||epoch!==webEpoch)return;webStatus=T('Classic library unavailable. Retry.','Biblioteca clásica no disponible. Volvé a buscar.');}
  if(epoch===webEpoch&&classicMode)paintWeb();
 }
 function openClassics(term='Plantas clásicas'){
  stopHouseRefresh();webController?.abort();classicMode=true;houseMode=false;webMode=true;webItems=[];webStatus='';commandGallery=true;searchPage=0;selectionEpoch++;st.q=term;
  const bar=document.getElementById('cadArqInstructionBar')?.getBoundingClientRect();
  compactRect={x:bar?bar.left:40,y:bar?bar.bottom+8:80,w:Math.min(760,innerWidth-16),h:Math.min(690,innerHeight-16)};open();el.querySelector('input[type=search]').value=term;searchClassics(term);
 }
 async function searchWeb(raw){
  if(classicMode)return searchClassics(raw);
  if(houseMode)return searchHouseGallery(raw);
  const query=webQuery(raw);if(!query)return;
  webController?.abort();const ctrl=new AbortController();webController=ctrl;const epoch=++webEpoch;
  webArea=parseArea(raw);st.q=raw;searchPage=0;webItems=[];webStatus=T('Searching open references…','Buscando referencias libres…');paintWeb();
  try{const [own,archived]=await Promise.all([localHousePreviews(raw).catch(()=>[]),archivedReferences(raw).catch(()=>[])]);if(epoch!==webEpoch||!webMode)return;webItems=own.concat(archived);paintWeb();}catch(e){}
  const api=new URL('https://commons.wikimedia.org/w/api.php');
  const args={action:'query',generator:'search',gsrsearch:query,gsrnamespace:'6',gsrlimit:'40',prop:'imageinfo',iiprop:'url|mime|extmetadata',iiurlwidth:'360',format:'json',origin:'*'};
  for(const [k,v] of Object.entries(args))api.searchParams.set(k,v);
  try{
   const res=await fetch(api,{signal:ctrl.signal,credentials:'omit'});if(!res.ok)throw Error('HTTP '+res.status);const data=await res.json();
   if(epoch!==webEpoch||!webMode)return;
   const remoteItems=Object.values(data.query?.pages||{}).flatMap(p=>{
    const i=p.imageinfo?.[0],m=i?.extmetadata||{},license=cleanMeta(m.LicenseShortName?.value),title=cleanMeta(p.title?.replace(/^File:/,''));
    const thumb=safeHttps(i?.thumburl),url=safeHttps(i?.url),source=safeHttps(i?.descriptionurl);
    if(!thumb||!url||!source||!/^image\/(?:png|jpeg|webp|svg\+xml)$/.test(i?.mime||'')||!(/^(?:CC BY|CC0|Public domain|PD|CC-BY)/i.test(license)))return [];
    const area=parseArea(title+' '+cleanMeta(m.ImageDescription?.value));
    return [{title,thumb,url,source,license,area}];
   });
   webItems=webItems.concat(remoteItems.filter(i=>!webItems.some(j=>j.url===i.url)));
   if(webArea)webItems.sort((a,b)=>(a.area===null?1e9:Math.abs(a.area-webArea))-(b.area===null?1e9:Math.abs(b.area-webArea))||Number(!!b.local)-Number(!!a.local));
   webStatus=webItems.length?'':T('No open previews found. Try Google or Pinterest.','Sin miniaturas libres encontradas. Probá Google o Pinterest.');paintWeb();
  }catch(e){if(epoch!==webEpoch||ctrl.signal.aborted)return;webStatus=webItems.length?'':T('Search unavailable. Use external links or import a file.','Búsqueda no disponible. Usá los enlaces o importá un archivo.');paintWeb();}
 }
 function paintWeb(){
  if(!el||!webMode||el.style.display==='none'||el.classList.contains('min'))return;
  resetPreviews();el.classList.add('visual','compact-search','web-reference');el.classList.toggle('house-gallery',houseMode);el.querySelector('.hd b').textContent='ARQASSIST · '+(classicMode?(classicModern?T('MODERN MASTERS · FREE PHOTOS','MAESTROS MODERNOS · FOTOS LIBRES'):T('CLASSIC PLANS · PUBLIC DOMAIN','PLANTAS CLÁSICAS · DOMINIO PÚBLICO')):houseMode?(houseRefCategory(st.q)?T('ARCHITECTURAL REFERENCES','REFERENCIAS DE ARQUITECTURA'):T('HOUSE PLANS','PLANTAS DE VIVIENDAS')):T('WEB REFERENCES','REFERENCIAS WEB'));
  el.querySelectorAll('[data-area]').forEach(b=>b.setAttribute('aria-pressed',String(houseMode&&Number(b.dataset.area)===webArea)));const grid=el.querySelector('.grid');grid.style.gridTemplateColumns='repeat(2,minmax(0,1fr))';grid.replaceChildren();grid.parentNode.querySelectorAll(':scope>.classic-links').forEach(n=>n.remove());if(classicMode&&(classicLinks.length||classicModern)){const row=document.createElement('div');row.className='classic-links';row.style.cssText='margin:6px 8px 2px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:11px;color:#51432e';const lb=document.createElement('b');lb.textContent=T('Codices and sources:','Códices y fuentes:');row.append(lb);for(const l of classicLinks){const a=document.createElement('a');a.href=l.u;a.target='_blank';a.rel='noopener noreferrer';a.textContent=l.t+' ↗';a.title=l.a||'';a.style.cssText='padding:3px 8px;border:1px solid #b7a17a;border-radius:999px;color:#3b2f1c;text-decoration:none;background:#fff8ea';row.append(a);}if(classicModern){const n=document.createElement('span');n.style.cssText='flex-basis:100%;opacity:.8';n.textContent=T('Modern master: their drawings are still under copyright, so only free photos of the works and links are shown.','Maestro moderno: sus dibujos siguen protegidos por derechos de autor; se muestran solo fotos libres de las obras y enlaces.');row.append(n);}grid.parentNode.insertBefore(row,grid);}
  searchPage=Math.min(searchPage,Math.max(0,Math.ceil(webItems.length/4)-1));
  for(const [offset,item] of webItems.slice(searchPage*4,searchPage*4+4).entries()){
   const card=document.createElement('div');card.className='web-card';
   const preview=document.createElement('div');preview.className='plan-preview';
   const img=document.createElement('img');img.alt=item.title||'Planta';img.loading='eager';img.decoding='async';img.referrerPolicy='no-referrer';
   let retried=false;img.onerror=()=>{if(!retried&&item.url&&item.url!==item.thumb&&/\.(?:png|jpe?g|webp|svg)(?:\?|$)/i.test(item.url)){retried=true;img.src=item.url;return;}const notice=document.createElement('span');notice.textContent=T('Preview unavailable','Miniatura no disponible');preview.replaceChildren(notice);};
   preview.append(img);img.src=item.thumb;
   const name=document.createElement('a');name.href=item.source;name.target='_blank';name.rel='noopener noreferrer';name.textContent=item.title;name.title=item.title;
   const info=document.createElement('span');info.style.fontSize='10px';info.textContent=item.classic?item.license:(item.area!==null?item.area+' m²':T('Area unverified','Superficie sin verificar'))+' · '+item.license;
   const button=document.createElement('button');button.dataset.web='insert';button.dataset.index=String(searchPage*4+offset);button.textContent=T('Insert image','Insertar imagen');const actions=document.createElement('div');actions.style.cssText='display:flex;gap:4px;flex:none';button.style.flex='1';if(item.url&&(!houseMode||!(item.planId||item.cadUrl)))actions.append(button);if(item.classic&&item.kind==='plate'){const vb=document.createElement('button');vb.dataset.web='insert-trace';vb.dataset.index=button.dataset.index;vb.textContent=T('Insert + vectorize','Insertar y vectorizar');vb.title='CALCOPY';vb.style.flex='1';actions.append(vb);}card.append(preview,name,info,actions);if(item.planId||item.cadUrl){const cad=document.createElement('button');cad.dataset.web='cad';cad.dataset.index=String(searchPage*4+offset);cad.textContent=T('Insert CAD','Insertar CAD');cad.style.flex='1';actions.append(cad);}grid.append(card);
  }
  if(!webItems.length){const p=document.createElement('p');p.style.cssText='grid-column:1/-1;color:#51432e;font-size:12px';p.textContent=webStatus;grid.append(p)}
  const ft=el.querySelector('.ft');ft.replaceChildren();const prev=document.createElement('button'),next=document.createElement('button'),label=document.createElement('span');prev.dataset.page='-1';next.dataset.page='1';prev.textContent='‹';next.textContent='›';prev.disabled=searchPage===0;next.disabled=(searchPage+1)*4>=webItems.length;label.textContent=webItems.length?((searchPage*4+1)+'–'+Math.min((searchPage+1)*4,webItems.length)+' / '+webItems.length):'0';ft.append(prev,label,next);
 }
 async function importReference(f){if(!window.CAD2D_IMPORT_REFERENCE)throw Error('Importador no disponible');const ok=await window.CAD2D_IMPORT_REFERENCE(f);if(ok!==false)close()}
 async function importWebUrl(url){
  const u=safeHttps(url);if(!u)throw Error('URL HTTPS inválida');const ext=new URL(u).pathname.match(/\.(pdf|png|jpe?g|webp|dxf|dwg)$/i)?.[1];if(!ext)throw Error('Usá un enlace directo PDF, PNG, JPG, DXF o DWG');
  const res=await fetch(u,{credentials:'omit',signal:AbortSignal.timeout(20000)});if(!res.ok)throw Error('HTTP '+res.status);
  if(/text\/html/i.test(res.headers.get('content-type')||''))throw Error('El enlace es una página, no un archivo');
  const max=30*1024*1024;if(Number(res.headers.get('content-length'))>max)throw Error('Máximo 30 MB');
  const reader=res.body.getReader(),parts=[];let size=0;try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max)throw Error('Máximo 30 MB');parts.push(value)}}finally{await reader.cancel().catch(()=>{})}
  await importReference(new File(parts,'referencia.'+ext.toLowerCase(),{type:res.headers.get('content-type')||''}));
 }
 async function handleWebAction(button){
  const a=button.dataset.web,q=el.querySelector('input[type=search]').value;
  if(a==='all-houses')return openHouses('Casas')
  if(a==='house-references'){if(!houseMode)return openHouses('Casas referencias');const raw='Casas referencias';el.querySelector('input[type=search]').value=raw;return searchHouseGallery(raw)}
  if(a==='ref-type'){const raw='Referencias '+button.dataset.refType;if(!houseMode)return openHouses(raw);el.querySelector('input[type=search]').value=raw;return searchHouseGallery(raw);}
  if(a==='area'){const raw='Casas de '+button.dataset.area+' m²';if(!houseMode)return openHouses(raw);el.querySelector('input[type=search]').value=raw;return searchHouseGallery(raw)}
  if(a==='search')return searchWeb(q);
  if(a==='google'||a==='pinterest'){const query=webQuery(q),url=a==='google'?'https://www.google.com/search?tbm=isch&q='+encodeURIComponent(query):'https://www.pinterest.com/search/pins/?q='+encodeURIComponent(query);window.open(url,'_blank','noopener,noreferrer');return;}
  if(a==='file'){const i=document.createElement('input');i.type='file';i.accept='.pdf,.png,.jpg,.jpeg,.webp,.dxf,.dwg';i.onchange=()=>{if(i.files[0])importReference(i.files[0]).catch(e=>CORE.toast(e.message))};i.click();return;}
  const item=(a==='insert'||a==='cad'||a==='insert-trace')?webItems[Number(button.dataset.index)]:null;
  if(a==='insert-trace'&&item?.local){button.disabled=true;try{await insertLocalPreview(item);setTimeout(()=>{try{const S=CORE.state,im=S.entities.filter(e=>e.type==='image').at(-1);if(im){S.selected=[im.id];}if(window.CAD2D_CALCO)window.CAD2D_CALCO(true);else CORE.toast('CALCOPY');}catch(e){CORE.toast(e.message)}},400);}catch(e){CORE.toast(e.message)}finally{button.disabled=false}return;}
  if(a==='cad'&&item?.cadUrl){button.disabled=true;try{await importWebUrl(item.cadUrl)}catch(e){CORE.toast(e.message)}finally{button.disabled=false}return;}
  if(a==='cad'&&item?.planId){const epoch=webEpoch;button.disabled=true;try{if(!window.CAD2D_INSERT_CATALOGUE_PLAN)throw Error('Importador CAD no disponible');const ok=await window.CAD2D_INSERT_CATALOGUE_PLAN(item.planId,()=>webMode&&epoch===webEpoch);if(ok)close();}catch(e){CORE.toast(e.message)}finally{button.disabled=false}return;}
  if(item?.local){button.disabled=true;try{await insertLocalPreview(item)}catch(e){CORE.toast(e.message)}finally{button.disabled=false}return;}
  const url=item?.url||(a==='url'?prompt('URL directa de archivo autorizado / Direct file URL'):null);if(!url)return;
  button.disabled=true;try{await importWebUrl(url)}catch(e){CORE.toast(e.message+' · Descargá el archivo desde su fuente e importalo con Archivo.');}finally{button.disabled=false}
 }

 async function searchHouseGallery(raw){
  stopHouseRefresh();webController?.abort();const epoch=++webEpoch;webArea=parseArea(raw);st.q=raw;searchPage=0;webItems=[];webStatus=T('Loading house library…','Cargando biblioteca de viviendas…');paintWeb();
  try{
   const refCategory=houseRefCategory(raw),refsOnly=(/referencias|references/i.test(raw)||!!refCategory)&&!webArea;const query=webArea?'Casas de '+webArea+' m²':refCategory?raw:refsOnly?'Casas referencias':'Casas';houseQuery=query;
   const [own,archive]=await Promise.all([refsOnly?Promise.resolve([]):localHousePreviews(query).catch(()=>[]),archivedReferences(query).catch(()=>[])]);
   if(epoch!==webEpoch||!houseMode)return;
   webItems=own.concat(archive).filter(x=>(!refsOnly||(!x.planId&&!x.cadUrl))&&(!webArea||Number.isFinite(x.area)&&Math.abs(x.area-webArea)<.5)).sort((a,b)=>refsOnly?(a.area??-1)-(b.area??-1):(a.area??Infinity)-(b.area??Infinity));
   webStatus=webItems.length?'':T('No plans for this area yet.','Todavía no hay plantas para esta superficie.');
   paintWeb();
  }catch(e){if(epoch===webEpoch&&houseMode){webStatus=T('House library unavailable. Retry.','Biblioteca no disponible. Volvé a buscar.');paintWeb();}}finally{if(epoch===webEpoch&&houseMode)scheduleHouseRefresh();}
 }
 function loadHouseRect(bar){
  const w=Math.min(760,innerWidth-16),h=Math.min(690,innerHeight-16);
  let saved;try{saved=JSON.parse(localStorage.getItem('cad2d.houseGallery.rect.v2')||'null')}catch(e){}
  if(saved&&['x','y','w','h'].every(k=>Number.isFinite(saved[k])))return {...saved};
  return {x:Math.max(8,Math.min(innerWidth-w-8,bar?bar.left:40)),y:Math.max(8,Math.min(innerHeight-h-8,bar?bar.bottom+8:80)),w,h};
 }
 function rememberHouseRect(){if(!houseMode||!compactRect)return;try{localStorage.setItem('cad2d.houseGallery.rect.v2',JSON.stringify(compactRect))}catch(e){}}
 function openHouses(term='Casas'){
  webController?.abort();classicMode=false;el?.querySelectorAll('.classic-links').forEach(n=>n.remove());houseMode=true;webMode=true;webItems=[];webStatus='';commandGallery=true;searchPage=0;selectionEpoch++;st.q=term;
  const bar=document.getElementById('cadArqInstructionBar')?.getBoundingClientRect();
  compactRect=loadHouseRect(bar);open();el.querySelector('input[type=search]').value=term;searchHouseGallery(term);
 }
 function openWeb(term){stopHouseRefresh();classicMode=false;el?.querySelectorAll('.classic-links').forEach(n=>n.remove());houseMode=false;webMode=true;webItems=[];webStatus='';commandGallery=true;searchPage=0;selectionEpoch++;st.q=term;const bar=document.getElementById('cadArqInstructionBar')?.getBoundingClientRect();compactRect={x:bar?bar.left:40,y:bar?bar.bottom+8:80,w:Math.min(760,innerWidth-16),h:Math.min(690,innerHeight-16)};open();el.querySelector('input[type=search]').value=term;searchWeb(term)}

 window.CAD2D_BLOCK_BROWSER=Object.freeze({open,openSearch,openWeb,openHouses,openClassics,openVisual,openRecovered,openOlimpiadas,openImported,close,refresh:paint});
 const EXT=window.CAD2D_EXTENSIONS;
 if(EXT?.commands){
  for(const key of termIndex.keys()){const command=key.toUpperCase();if(!EXT.commands[command])EXT.commands[command]=()=>openSearch(key)}
  for(const k of ['HOUSEGALLERY','GALERIACASAS','VIVIENDAS'])EXT.commands[k]=()=>openHouses();
  for(const k of ['BLOCKBROWSER','BB','GALERIA','GALLERY','EXPLORADORBLOQUES'])EXT.commands[k]=open;
  for(const k of ['GALERIAVISUAL','BLOQUESVISUALES','VISUALGALLERY','GV'])EXT.commands[k]=openVisual;
  for(const k of ['VISTASRECUPERADAS','VISTASBLOQUES'])EXT.commands[k]=openRecovered;
  for(const k of ['OLIMPIADAS','OLIMPIADAS3','BLOQUESOLIMPIADAS'])EXT.commands[k]=openOlimpiadas;
  for(const k of ['IMPORTEDBLOCKS','BLOQUESIMPORTADOS'])EXT.commands[k]=openImported;
 }
 // Botón grande en la cinta (Inicio y Arquitectura) y en la barra rápida.
 const ico='<rect x="2" y="3" width="6" height="6" rx="1"/><rect x="9" y="3" width="6" height="6" rx="1"/><rect x="16" y="3" width="6" height="6" rx="1"/><rect x="2" y="11" width="6" height="6" rx="1"/><rect x="9" y="11" width="6" height="6" rx="1"/><rect x="16" y="11" width="6" height="6" rx="1"/><path d="M4 21h16"/>';
 try{CORE.ribbon.add('home','BLOCKS+',[{id:'blockBrowser',label:T('Block browser','Explorador'),icon:ico,run:open}]);CORE.ribbon.add('arq','BLOCKS+',[{id:'blockBrowser',label:T('Block browser','Explorador'),icon:ico,run:open}]);CORE.ribbon.rebuild()}catch(e){console.warn(e)}
 // Curated preview gallery is an additional view of the same insertion mechanism.
 const qb=document.querySelector('#cadQuickBar [data-qb=blocks]');if(qb){const n=qb.cloneNode(true);n.title=T('Block browser · BB','Explorador de bloques · BB');n.addEventListener('click',e=>{e.stopPropagation();open()});qb.replaceWith(n)}
 // Cargar detalles constructivos CC0 en la misma galería, sin reemplazar bloques.
 const cc0Script=document.createElement('script');cc0Script.src='assets/cc0-details-loader.js?v=20261123-1';cc0Script.defer=true;document.head.append(cc0Script);
 // Nuevos bloques arquitectónicos CC0: se añaden a la galería existente, sin sobrescribirla.
 for(const asset of ["cc0-bathroom-blocks.js","cc0-door-blocks.js","cc0-kitchen-blocks.js"]){const script=document.createElement('script');script.src='assets/'+asset+'?v=20261123-2';document.head.appendChild(script)}
 // Ventanas CC0 en planta, integradas sin modificar las herramientas existentes.
 const windowsScript=document.createElement('script');windowsScript.src='assets/cc0-window-blocks.js?v=20261123-2';document.head.appendChild(windowsScript);
 // Símbolos de documentación y vegetación CC0, dentro de la biblioteca habitual.
 const symbolsScript=document.createElement('script');symbolsScript.src='assets/cc0-symbol-blocks.js?v=20261123-2';document.head.appendChild(symbolsScript);
})();
