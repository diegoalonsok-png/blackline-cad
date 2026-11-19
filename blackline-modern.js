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
if(brand){const n=[...brand.childNodes].find(x=>x.nodeType===Node.TEXT_NODE);if(n)n.textContent='CAD2D';const sm=brand.querySelector('small');if(sm)sm.textContent='DIBUJO ARQUITECTÓNICO · 2D';}
const mark=d.querySelector('.brandbar .mark');
if(mark){
 mark.innerHTML='<svg class="cad2d-logo-symbol" viewBox="0 0 40 40" aria-hidden="true" focusable="false"><path d="M20 4 34 12 34 28 20 36 6 28 6 12Z"/><path d="M6 12 20 20 34 12M20 20V36M20 4V12"/><path d="M14 8 26 15 26 25 20 29 14 25V15" opacity=".55"/></svg>';
 mark.setAttribute('aria-label','Menú CAD2D');mark.setAttribute('aria-keyshortcuts','Enter Space');
}
d.title='CAD2D — Diseño arquitectónico 2D';
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
 trim:'<path d="M4 6 18 20 M18 6 4 20"/><path d="M8 5h8 M8 19h8" stroke-dasharray="2 2"/><circle cx="5" cy="6" r="1.5"/><circle cx="19" cy="6" r="1.5"/>',
 move:'<path d="M12 2v20M2 12h20M9 5l3-3 3 3M9 19l3 3 3-3M5 9l-3 3 3 3M19 9l3 3-3 3"/>',
 copy:'<rect x="4" y="4" width="12" height="12" rx="1.5"/><rect x="8" y="8" width="12" height="12" rx="1.5"/>',
 rotate:'<path d="M19 8a8 8 0 1 0 1 7M19 3v5h-5"/>',
 dimension:'<path d="M4 5v14M20 5v14M5 12h14M8 9l-3 3 3 3m8-6 3 3-3 3"/>',
 blockgallery:'<path d="M12 2 21 7 21 17 12 22 3 17 3 7Z M3 7 12 12 21 7 M12 12V22"/>',
 layers:'<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5 M3 16l9 5 9-5"/>',
 scissors:'<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><path d="m8 8 12 12 M8 16 20 4"/>',
 offset:'<path d="M4 19 16 7 M9 20 21 8 M4 7h10"/>',
 fillet:'<path d="M4 20V12A8 8 0 0 1 12 4h8"/>',
 erase:'<path d="m4 14 10-10 7 7-10 10H8z M8 21h13"/>',
 text:'<path d="M4 5h16 M12 5v15 M8 20h8"/>',
 layersstatus:'<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5 M3 16l9 5 9-5"/>'
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


/* Original Blackline file application menu, attached to the existing brand mark. */
(function initBlacklineFileMenu(){
 const mark=document.querySelector('.brandbar .mark');
 if(!mark||document.getElementById('blFileMenu'))return;
 mark.setAttribute('role','button');mark.setAttribute('tabindex','0');
 mark.setAttribute('aria-label','Menú CAD2D: archivos e impresión');
 mark.setAttribute('aria-haspopup','menu');mark.setAttribute('aria-expanded','false');
 mark.title='Menú CAD2D · Archivo';
 mark.style.cursor='pointer';
 const menu=document.createElement('div');menu.id='blFileMenu';
 menu.setAttribute('role','menu');menu.setAttribute('aria-label','Archivo CAD2D');
 menu.hidden=true;
 const actions=[
  ['file-new','Nuevo dibujo','file-plus'],
  ['file-open','Abrir archivo','folder-open'],
  ['file-save','Guardar proyecto','save'],
  ['file-dxf','Guardar DXF','download'],
  ['file-print','Imprimir / Exportar PDF','printer']
 ];
 const icons={
  'file-plus':'<path d="M4 3h11l5 5v13H4zM15 3v5h5M12 12v7m-3.5-3.5h7"/>',
  'folder-open':'<path d="M3 7V4h7l3 3h8v4M3 11h18l-3 10H5z"/>',
  save:'<path d="M4 3h14l3 3v15H3zM8 3v7h9V3M8 21v-8h9v8"/>',
  download:'<path d="M5 3h14v18H5zM12 7v10m-4-4 4 4 4-4"/>',
  printer:'<path d="M6 9V3h12v6M6 18H4V9h16v9h-2M6 14h12v7H6z"/>'
 };
 const title=document.createElement('div');title.className='bl-file-menu-title';title.textContent='CAD2D · ARCHIVO';menu.append(title);
 for(const [id,label,icon] of actions){
  const button=document.createElement('button');button.type='button';button.dataset.blFileAction=id;button.setAttribute('role','menuitem');
  button.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">'+icons[icon]+'</svg><span></span>';
  button.querySelector('span').textContent=label;
  menu.append(button);
 }
 document.body.append(menu);
 function close(){menu.hidden=true;mark.setAttribute('aria-expanded','false')}
 function open(){const r=mark.getBoundingClientRect();menu.hidden=false;mark.setAttribute('aria-expanded','true');menu.style.left=Math.max(8,Math.min(window.innerWidth-menu.offsetWidth-8,r.left))+'px';menu.style.top=Math.max(8,Math.min(window.innerHeight-menu.offsetHeight-8,r.bottom+8))+'px'}
 function toggle(){if(menu.hidden)open();else close()}
 const runCommand=command=>{const input=document.getElementById('command'),run=document.getElementById('runCommand');if(input&&run){input.value=command;run.click()}};
 mark.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();toggle()});
 mark.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle()}if(e.key==='Escape')close()});
 menu.addEventListener('click',e=>{
  const b=e.target.closest('[data-bl-file-action]');if(!b)return;
  const key=b.dataset.blFileAction;close();
  if(key==='file-new')runCommand('NEW');
  if(key==='file-open')document.getElementById('openBtn')?.click();
  if(key==='file-save')document.getElementById('saveProjectBtn')?.click();
  if(key==='file-dxf')document.getElementById('dxfBtn')?.click();
  if(key==='file-print')document.getElementById('pdfBtn')?.click();
 });
 document.addEventListener('pointerdown',e=>{if(!menu.hidden&&!menu.contains(e.target)&&!mark.contains(e.target))close()},true);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden){e.preventDefault();close();mark.focus()}});
 window.addEventListener('resize',close);
 document.addEventListener('scroll',()=>{if(!menu.hidden)close()},true);
})();


/* Keep the ribbon-height drag handle below controls, never across clickable icons. */
(function keepRibbonSizerBelowButtons(){
 const app=document.querySelector('.app'),shell=document.getElementById('ribbonShell'),handle=document.getElementById('ribbonSizer');
 if(!app||!shell||!handle)return;
 function align(){
  const a=app.getBoundingClientRect(),r=shell.getBoundingClientRect();
  if(shell.classList.contains('floating')||app.classList.contains('ribbon-undocked'))return;
  // The sizer is absolutely positioned against .app; derive its actual row, not a fragile CSS sum.
  handle.style.setProperty('top',Math.round(r.bottom-a.top-3)+'px','important');
  handle.style.setProperty('height','6px','important');
 }
 const observer=new ResizeObserver(align);observer.observe(shell);observer.observe(app);
 window.addEventListener('resize',align);
 requestAnimationFrame(align);
})();


