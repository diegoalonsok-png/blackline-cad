/* Drag blocks from existing Blackline libraries into the drawing.
   Uses the core insertion routine and preserves project/history semantics. */
(()=>{
 'use strict';
 const canvas=document.getElementById('cadCanvas')||document.querySelector('.canvas-wrap canvas');
 if(!canvas)return;
 const palette=document.getElementById('blacklineBlockGallery');
 const select=document.getElementById('blockLibrary');
 const api=()=>window.BlacklineBlockAPI;
 let pending=null;
 function installedNameFor(button){
   const text=button.getAttribute('aria-label')||'';
   const raw=text.replace(/^Insert\s+/i,'').replace(/\s+at\s+1:1$/i,'').trim();
   const name=button.dataset.dynamic==='true'?'CAD2D Abertura v2 · '+raw:'BL '+raw;
   return {name,raw};
 }
 function installDrag(button){
   if(button.dataset.blDragReady)return;
   button.dataset.blDragReady='1';
   button.draggable=true;
   button.setAttribute('aria-description','Arrastrá al plano para insertar o hacé clic y luego elegí un punto.');
   button.addEventListener('dragstart',ev=>{
     // First use the existing library installation logic.
     button.click();
     const {name}=installedNameFor(button);
     const picked=api()?.hasBlock(name)?name:select?.value;
     if(!picked||!api()?.hasBlock(picked)){ev.preventDefault();return}
     pending=picked;
     ev.dataTransfer?.setData('text/plain','blackline:block:'+picked);
     if(ev.dataTransfer)ev.dataTransfer.effectAllowed='copy';
   });
   button.addEventListener('dragend',()=>{pending=null;canvas.classList.remove('bl-block-drop')});
 }
 function refresh(){
   document.querySelectorAll('#blCards button[aria-label^="Insert "]').forEach(installDrag);
   document.querySelectorAll('#blImportedBlocks button').forEach(button=>{
     if(button.dataset.blDragReady)return;
     button.dataset.blDragReady='1';button.draggable=true;
     button.addEventListener('dragstart',ev=>{
       const name=button.textContent.trim();
       if(!api()?.hasBlock(name)){ev.preventDefault();return}
       pending=name;ev.dataTransfer?.setData('text/plain','blackline:block:'+name);
       if(ev.dataTransfer)ev.dataTransfer.effectAllowed='copy';
     });
     button.addEventListener('dragend',()=>{pending=null;canvas.classList.remove('bl-block-drop')});
   });
 }
 const css=document.createElement('style');css.textContent=`
 #blCards button[draggable=true],#blImportedBlocks button[draggable=true]{cursor:grab}
 #blCards button[draggable=true]:active,#blImportedBlocks button[draggable=true]:active{cursor:grabbing}
 .canvas-wrap:has(.bl-block-drop){outline:2px dashed #9dd9f1;outline-offset:-3px}
 `;document.head.append(css);
 canvas.addEventListener('dragover',ev=>{
   const data=ev.dataTransfer?.types||[];
   if(!pending&&!Array.from(data).includes('text/plain'))return;
   ev.preventDefault();if(ev.dataTransfer)ev.dataTransfer.dropEffect='copy';
   canvas.classList.add('bl-block-drop');
 });
 canvas.addEventListener('dragleave',()=>canvas.classList.remove('bl-block-drop'));
 canvas.addEventListener('drop',ev=>{
   const raw=ev.dataTransfer?.getData('text/plain')||'';
   if(!raw.startsWith('blackline:block:')&&!pending)return;
   ev.preventDefault();
   canvas.classList.remove('bl-block-drop');
   const name=raw.startsWith('blackline:block:')?raw.slice('blackline:block:'.length):pending;
   pending=null;
   try{
     if(!api()?.hasBlock(name))throw Error('El bloque no está en la biblioteca');
     const point=api().insertAtScreen(name,ev.clientX,ev.clientY);
     canvas.focus({preventScroll:true});
   }catch(err){window.alert('No se pudo insertar el bloque: '+err.message)}
 });
 palette?.addEventListener('click',()=>requestAnimationFrame(refresh));
 select&&new MutationObserver(refresh).observe(select,{childList:true});
 const cards=document.getElementById('blCards');
 cards&&new MutationObserver(refresh).observe(cards,{childList:true});
 const imported=document.getElementById('blImportedBlocks');
 imported&&new MutationObserver(refresh).observe(imported,{childList:true});
 refresh();
})();
