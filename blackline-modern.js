/* Blackline CAD 2026-11-16: appearance + optional block catalog controls.
   Intentionally does not replace or reinterpret CAD drawing functions. */
(()=>{'use strict';
const d=document,app=d.querySelector('.app'),canvasWrap=d.getElementById('canvasWrap');
if(!app||!canvasWrap)return;
const $=id=>d.getElementById(id);
app.classList.add('blackline-modern');
// Raise legacy compact 42px ribbon once for the new 39px icon tiles; users can resize afterward.
try{if(!localStorage.getItem('blackline-modern-ribbon-v1')){const current=parseFloat(getComputedStyle(app).getPropertyValue('--ribbon-height'))||42;if(current<58){app.style.setProperty('--ribbon-height','61px');localStorage.setItem('cad2d-ribbon-height','61');}localStorage.setItem('blackline-modern-ribbon-v1','1')}}catch(e){}
const brand=d.querySelector('.brand');
if(brand){const n=[...brand.childNodes].find(x=>x.nodeType===Node.TEXT_NODE);if(n)n.textContent='Blackline CAD';const sm=brand.querySelector('small');if(sm)sm.textContent='DIBUJO ARQUITECTÓNICO · 2D';}
const mark=d.querySelector('.brandbar .mark');if(mark)mark.textContent='◇';
d.title='Blackline CAD — Diseño arquitectónico 2D';
const left=d.querySelector('.workspace>.sidebar:not(.rightside)');
const right=d.querySelector('.workspace>.sidebar.rightside');
function setSection(key,checked){
 const control=d.querySelector('input[data-cad-section="'+key+'"]');
 if(control&&control.checked!==checked){control.checked=checked;control.dispatchEvent(new Event('change',{bubbles:true}));}
}
setSection('right',true);
setSection('left',false);
const workspace=d.querySelector('.workspace');
try{if(workspace&&!localStorage.getItem('blackline-modern-right-v1')){const width=parseFloat(getComputedStyle(workspace).getPropertyValue('--right-width'))||202;if(width<260){workspace.style.setProperty('--right-width','280px');localStorage.setItem('cad2d-right-width','280');}localStorage.setItem('blackline-modern-right-v1','1')}}catch(e){}

function movePanels(){
 if(!right)return;
 const selection=$('selectionSummary')?.closest('.panel');
 const props=$('cadPropertiesPanel');
 const layers=$('layers')?.closest('.panel');
 const gallery=$('blacklineBlockGallery');
 for(const panel of [selection,props,layers,gallery]){
  if(panel&&!panel.classList.contains('floating'))right.prepend(panel);
 }
 const title=gallery?.querySelector('.panel-title span');if(title)title.textContent='BLOQUES · BIBLIOTECA';
 const layerTitle=layers?.querySelector('.panel-title')?.firstChild;
 if(layerTitle?.nodeType===Node.TEXT_NODE)layerTitle.textContent='CAPAS ';
 const propsTitle=props?.querySelector('.panel-title')?.firstChild;
 if(propsTitle?.nodeType===Node.TEXT_NODE)propsTitle.textContent='PROPIEDADES ';
}
movePanels();
function revealBlocks(){
 setSection('right',true);
 const gallery=$('blacklineBlockGallery');
 if(!gallery)return;
 if(!gallery.classList.contains('floating')&&right)right.prepend(gallery);
 const body=$('blBody');if(body)body.hidden=false;
 const toggle=$('blCollapse');if(toggle){toggle.textContent='−';toggle.setAttribute('aria-expanded','true');}
 if(right)right.scrollTop=0;
 gallery.scrollIntoView({block:'nearest',behavior:'smooth'});
}
// Stop the legacy gallery command from moving the library into a hidden left sidebar.
const ribbonDock=$('ribbon');
ribbonDock?.addEventListener('click',event=>{
 const control=event.target.closest('[data-tool="blockgallery"]');
 if(control){event.preventDefault();event.stopImmediatePropagation();revealBlocks();}
},true);
// Keep existing movable palette infrastructure and CAD button handlers.
const iconPaths={
 select:'<path d="M5 3 5 21 10 16 14 22 17 20 13 14 21 12Z"/>',
 line:'<path d="M5 19 19 5"/>',
 polyline:'<path d="M3 18 8 7 15 12 20 4"/><circle cx="3" cy="18" r="1.3"/><circle cx="8" cy="7" r="1.3"/><circle cx="15" cy="12" r="1.3"/><circle cx="20" cy="4" r="1.3"/>',
 rect:'<rect x="4" y="5" width="16" height="14" rx="1.5"/>',
 circle:'<circle cx="12" cy="12" r="8"/>',
 arc:'<path d="M4 18 A10 10 0 0 1 20 18"/>',
 trim:'<path d="M5 6 19 20M19 6 5 20"/><circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/>',
 move:'<path d="M12 2v20M2 12h20M9 5l3-3 3 3M9 19l3 3 3-3M5 9l-3 3 3 3M19 9l3 3-3 3"/>',
 copy:'<rect x="4" y="4" width="12" height="12" rx="1.5"/><rect x="8" y="8" width="12" height="12" rx="1.5"/>',
 rotate:'<path d="M19 8a8 8 0 1 0 1 7M19 3v5h-5"/>',
 dimension:'<path d="M4 5v14M20 5v14M5 12h14M8 9l-3 3 3 3m8-6 3 3-3 3"/>',
 blockgallery:'<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>'
};
const rails=[
 ['select','Seleccionar','home'],['line','Línea','home'],['polyline','Polilínea','home'],
 ['rect','Rectángulo','home'],['circle','Círculo','home'],['arc','Arco','home'],
 ['trim','Recortar / TRIM','home'],['move','Mover','home'],['copy','Copiar','home'],
 ['rotate','Girar','modify'],['dimension','Acotar','home'],['blockgallery','Bloques','home']
];
const rail=d.createElement('nav');rail.className='bl-icon-rail';rail.setAttribute('aria-label','Barra de herramientas CAD');
for(const [key,title,tab] of rails){
 if(key==='trim'||key==='blockgallery'){const hr=d.createElement('div');hr.className='bl-icon-divider';rail.append(hr);}
 const btn=d.createElement('button');btn.type='button';btn.title=title;btn.setAttribute('aria-label',title);btn.dataset.blCommand=key;
 btn.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+iconPaths[key]+'</svg>';
 btn.addEventListener('click',()=>{
  if(key==='blockgallery'){revealBlocks();return;}
  let tool=d.querySelector('#ribbon [data-tool="'+key+'"]');
  if(tool){tool.click();return;}
  const nav=d.querySelector('#tabs .tab[data-tab="'+tab+'"]');
  if(!nav)return;
  nav.click();
  requestAnimationFrame(()=>{tool=d.querySelector('#ribbon [data-tool="'+key+'"]');if(tool)tool.click();});
 });
 rail.append(btn);
}
canvasWrap.append(rail);
const ribbon=$('ribbon');
function updateRail(){
 const selected=ribbon?.querySelector('.tool.active')?.dataset.tool||'select';
 rail.querySelectorAll('[data-bl-command]').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.blCommand===selected)));
}
if(ribbon){new MutationObserver(updateRail).observe(ribbon,{childList:true,subtree:false});updateRail();}
const gallery=$('blacklineBlockGallery'),body=$('blBody'),categories=$('blCategories'),cards=$('blCards'),select=$('blockLibrary');
if(gallery&&body&&categories&&cards&&select){
 const search=d.createElement('input');
 search.type='search';search.className='bl-block-search';search.placeholder='Buscar en la categoría actual…';
 search.setAttribute('aria-label','Buscar bloques arquitectónicos');categories.before(search);
 function searchCards(){
  const q=search.value.toLocaleLowerCase('es').trim();
  for(const b of cards.querySelectorAll('button'))b.hidden=!!q&&!((b.title||'')+' '+(b.getAttribute('aria-label')||'')).toLocaleLowerCase('es').includes(q);
 }
 search.addEventListener('input',searchCards);
 categories.addEventListener('click',()=>{search.value='';requestAnimationFrame(searchCards);});
 const title=d.createElement('div');title.className='bl-imported-title';title.textContent='BLOQUES DE ESTE PROYECTO';
 const userBlocks=d.createElement('div');userBlocks.className='bl-user-blocks';userBlocks.id='blImportedBlocks';
 const archiveNote=d.createElement('p');archiveNote.className='bl-archive-note';
 archiveNote.textContent='DWG originales: colección pendiente de incorporación. Los ejemplos geométricos disponibles no reemplazan esos archivos. El servicio de conversión DWG aún no funciona en GitHub Pages.';
 body.append(title,userBlocks,archiveNote);
 function syncUserBlocks(){
  userBlocks.replaceChildren();
  const names=[...select.options].map(o=>o.value).filter(Boolean);
  const unique=[...new Set(names)];
  for(const name of unique){
   const b=d.createElement('button');b.type='button';b.className='btn';b.textContent=name;b.title='Seleccionar '+name+' para insertar';
   b.addEventListener('click',()=>{
    select.value=name;select.dispatchEvent(new Event('change',{bubbles:true}));
    const insert=$('insertBlockBtn');if(insert)insert.click();
    archiveNote.textContent='Bloque seleccionado: '+name+' · elegí el punto de inserción en el dibujo.';
   });userBlocks.append(b);
  }
  if(!unique.length){const empty=d.createElement('p');empty.className='bl-archive-note';empty.textContent='Aún no hay definiciones importadas en este proyecto.';userBlocks.append(empty);}
 }
 new MutationObserver(syncUserBlocks).observe(select,{childList:true});
 syncUserBlocks();
 // Shortcuts remain attached to the original library, preserving existing export/import logic.
}
const cssDemoMedia=window.matchMedia('(max-width:850px)');
if(cssDemoMedia.matches)setSection('left',false);
const requestResize=()=>{window.dispatchEvent(new Event('resize'));$('cadCanvas')?.dispatchEvent(new Event('cad-workspace-resize'));};
requestAnimationFrame(requestResize);
})();

/* Instant accessible CAD hover labels instead of browser-delayed native title tooltips. */
(function instantCadTooltips(){
 const bubble=document.createElement('div');bubble.id='blInstantTooltip';
 bubble.setAttribute('role','tooltip');
 bubble.style.cssText='position:fixed;z-index:2147483000;pointer-events:none;display:none;max-width:290px;padding:6px 9px;border:1px solid #698297;border-radius:6px;background:#18212b;color:#f3f7fa;box-shadow:0 6px 20px #0009;font:12px/1.35 system-ui,sans-serif;white-space:normal';
 document.body.append(bubble);let active=null;
 function hide(){bubble.style.display='none';active=null}
 function show(el){
  if(!el)return hide();
  const label=el.dataset.blTooltip||el.getAttribute('title');if(!label)return hide();
  active=el;el.dataset.blTooltip=label;el.removeAttribute('title');
  bubble.textContent=label;bubble.style.display='block';
  const r=el.getBoundingClientRect(),w=bubble.offsetWidth,h=bubble.offsetHeight;
  bubble.style.left=Math.max(5,Math.min(innerWidth-w-6,r.left+(r.width-w)/2))+'px';
  bubble.style.top=(r.bottom+h+9<innerHeight?r.bottom+7:Math.max(5,r.top-h-7))+'px';
 }
 document.addEventListener('pointerover',e=>{
  const el=e.target.closest?.('button[title],button[data-bl-tooltip],.tool[title],.tool[data-bl-tooltip],[role="button"][title],[role="button"][data-bl-tooltip]');
  if(el&&el!==active)show(el);
 },true);
 document.addEventListener('pointerout',e=>{if(active&&!active.contains(e.relatedTarget))hide()},true);
 document.addEventListener('focusin',e=>{const el=e.target.closest?.('button[title],button[data-bl-tooltip],.tool[title],.tool[data-bl-tooltip],[role="button"][title],[role="button"][data-bl-tooltip]');if(el)show(el)},true);
 document.addEventListener('focusout',hide,true);
 document.addEventListener('keydown',e=>{if(e.key==='Escape')hide()},true);
 document.addEventListener('scroll',hide,true);
})();


/* User-switchable light/dark CAD interface; geometry and plot color are untouched. */
(function initBlacklineTheme(){
 const host=document.querySelector('.brandbar .right')||document.querySelector('.brandbar');
 if(!host)return;
 const b=document.createElement('button');b.id='blThemeToggle';b.type='button';b.className='btn slim';b.style.whiteSpace='nowrap';
 const saved=(()=>{try{return localStorage.getItem('blackline-ui-theme')}catch(e){return null}})();
 function apply(theme){
  const light=theme==='light';document.querySelector('.app')?.classList.toggle('bl-light',light);
  b.textContent=light?'☾ Oscuro':'☼ Claro';b.title=light?'Cambiar a modo oscuro':'Cambiar a modo claro';b.setAttribute('aria-pressed',String(light));
  try{localStorage.setItem('blackline-ui-theme',light?'light':'dark')}catch(e){}
 }
 b.onclick=()=>apply(document.querySelector('.app')?.classList.contains('bl-light')?'dark':'light');
 host.prepend(b);apply(saved==='light'?'light':'dark');
})();
