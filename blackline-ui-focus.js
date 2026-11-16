/* Blackline UI focus & bilingual labels — additive, no geometry mutations. */
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const translations={
  'Drawing properties':'Propiedades del dibujo','Layer manager':'Administrador de capas',
  'Display / Cursor colors':'Pantalla y cursor','Modify geometry':'Modificar geometría',
  'Blocks / Symbols':'Bloques y símbolos','Dimensions / Annotation':'Cotas y anotaciones',
  'Text / Typography':'Texto y tipografía','Units':'Unidades','Grid spacing':'Separación de grilla',
  'Precision':'Precisión','Line width':'Grosor de línea','Millimeters':'Milímetros',
  'Centimeters':'Centímetros','Meters':'Metros','Inches':'Pulgadas','Feet':'Pies',
  '+ Add layer':'+ Añadir capa','Remove':'Eliminar','Reset layout':'Restablecer paneles',
  'Open drawing':'Abrir dibujo','Print / PDF':'Imprimir / PDF','Drawing':'Dibujo',
  'Modify':'Modificar','Layers':'Capas','Properties':'Propiedades','Block':'Bloque',
  'Model':'Modelo','Layout':'Presentación','Export':'Exportar',
  'Select a layer name to make it current. Toggle visibility and lock on each row.':'Seleccioná una capa para activarla. En cada fila podés cambiar visibilidad y bloqueo.',
  'Model space is unbounded. Use mouse wheel to zoom and middle mouse / Space + drag to pan. All geometry is stored in drawing units.':'El espacio modelo no tiene límites. Usá la rueda para zoom y el botón central o Espacio + arrastrar para desplazarte. La geometría conserva las unidades del dibujo.'
 };
 const inverse=Object.fromEntries(Object.entries(translations).map(([en,es])=>[es,en]));
 const select=document.createElement('select');select.id='blLanguage';select.setAttribute('aria-label','Idioma de la interfaz / Interface language');
 select.title='Idioma de interfaz / Interface language';
 select.innerHTML='<option value="es">ES · Español</option><option value="en">EN · English</option>';
 select.style.cssText='background:#202c36;color:#f4f8fb;border:1px solid #526b7a;border-radius:6px;padding:5px 6px;font:11px system-ui;min-width:98px';
 const header=document.querySelector('.brandbar')||document.querySelector('.brandbar .right');
 if(header){const right=header.querySelector('.right');(right||header).prepend(select)}
 else {select.style.position='fixed';select.style.top='7px';select.style.right='10px';select.style.zIndex='80';document.body.append(select)}
 const style=document.createElement('style');
 style.textContent=`
 .cad-palette.bl-focus-collapsed>.panel-content{display:none!important}
 .cad-palette.bl-focus-collapsed{min-height:0!important;flex:0 0 auto!important}
 .bl-focus-indicator{font-size:9px;color:#b3c6d3;margin-left:4px;pointer-events:none}
 `;
 document.head.append(style);
 const paletteTitles=[...document.querySelectorAll('.workspace>.sidebar>.panel .panel-title')];
 let current='es';
 function applyLanguage(lang){
  current=lang;document.documentElement.lang=lang;
  const nodes=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  let node;
  while((node=nodes.nextNode())){
   if(!node.parentElement||node.parentElement.closest('script,style,option#blLanguage'))continue;
   const before=node.nodeValue,trim=before.trim();
   const value=lang==='es'?translations[trim]:inverse[trim];
   if(value)node.nodeValue=before.replace(trim,value);
  }
  document.querySelectorAll('#units option').forEach(opt=>{const val=lang==='es'?translations[opt.textContent.trim()]:inverse[opt.textContent.trim()];if(val)opt.textContent=val});
  try{localStorage.setItem('blackline-interface-language',lang)}catch(e){}
 }
 let stored='es';try{const saved=localStorage.getItem('blackline-interface-language');if(saved==='es'||saved==='en')stored=saved}catch(e){}
 select.value=stored;applyLanguage(stored);
 select.addEventListener('change',()=>applyLanguage(select.value));
 // Existing floating palettes are preserved. Collapse only secondary palettes
 // once at first visit; essential drawing/layers controls remain expanded.
 let initial=false;try{initial=localStorage.getItem('blackline-focus-layout-set')==='1'}catch(e){}
 const panels=[...document.querySelectorAll('.workspace>.sidebar>.panel')];
 for(let i=0;i<panels.length;i++){
  const panel=panels[i],title=panel.querySelector('.panel-title');
  if(!title)continue;
  const label=title.textContent.trim().toLowerCase();
  if(!initial&&/color|cursor|typograph|tipograf|table|tabla|dimension|anotaci|modify|modificar|blocks|bloques/.test(label)){
   panel.classList.add('bl-focus-collapsed');
  }
  const collapse=title.querySelector('[data-palette-act="collapse"]');
  if(collapse){
   const setAria=()=>{const hidden=panel.classList.contains('bl-focus-collapsed')||panel.classList.contains('collapsed');collapse.setAttribute('aria-expanded',String(!hidden));};
   collapse.addEventListener('click',e=>{if(panel.classList.contains('bl-focus-collapsed')){e.preventDefault();e.stopImmediatePropagation();panel.classList.remove('bl-focus-collapsed');panel.classList.remove('collapsed');collapse.textContent='−';setAria();requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')))}else requestAnimationFrame(setAria)},true);
   setAria();
  }
 }
 if(!initial)try{localStorage.setItem('blackline-focus-layout-set','1')}catch(e){}
 // Double click header to expand a palette without conflicting with pointer dragging.
 for(const title of paletteTitles){
  title.addEventListener('dblclick',event=>{
   if(event.target.closest('button,input,select'))return;
   const panel=title.closest('.cad-palette');if(!panel)return;
   if(panel.classList.contains('bl-focus-collapsed')){panel.classList.remove('bl-focus-collapsed');window.dispatchEvent(new Event('resize'))}
  });
 }
 const reset=document.getElementById('resetWorkspace');
 reset?.addEventListener('click',()=>{panels.forEach(p=>p.classList.remove('bl-focus-collapsed'))});
 // Reapply static labels created later by palette tools; only translated exact strings.
 const observer=new MutationObserver(records=>{
  if(current!=='es')return;
  let n=0;
  for(const record of records){
   for(const added of record.addedNodes){
    if(++n>100)return;
    if(added.nodeType===Node.TEXT_NODE){const key=added.nodeValue.trim();if(translations[key])added.nodeValue=added.nodeValue.replace(key,translations[key])}
   }
  }
 });
 observer.observe(document.body,{childList:true,subtree:true});
})();
