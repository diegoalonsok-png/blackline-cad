/* Blackline CAD English-first UI labels; CAD drawings and user data are never translated.
 * Deterministic labels only. No automatic translation service or tracking.
 */
(function(root){
 'use strict';
 const pairs=[
 ['Inicio','Home'],['Arquitectura','Architecture'],['Dibujo','Draw'],['Modificar','Modify'],['Anotar','Annotate'],['Vista','View'],['Salida','Output'],
 ['MUROS PARAMÉTRICOS 2D','PARAMETRIC 2D WALLS'],['Espesor de muro (m)','Wall thickness (m)'],
 ['Justificación','Justification'],['Izquierda','Left'],['Centro','Center'],['Derecha','Right'],
 ['Dibujar muro · MURO','Draw wall · WALL'],['WALL · Muro','WALL · Wall'],['Espesor (m)','Thickness (m)'],
 ['Espesor personalizado (m)','Custom thickness (m)'],['Personalizado…','Custom…'],
 ['0,08 m · 8 cm','0.08 m · 8 cm'],['0,10 m · 10 cm','0.10 m · 10 cm'],
 ['0,12 m · 12 cm','0.12 m · 12 cm'],['0,15 m · 15 cm','0.15 m · 15 cm'],
 ['0,20 m · 20 cm','0.20 m · 20 cm'],['0,30 m · 30 cm','0.30 m · 30 cm'],
 ['Línea','Line'],['Polilínea','Polyline'],['Rectángulo','Rectangle'],['Círculo','Circle'],
 ['Arco','Arc'],['Elipse','Ellipse'],['Texto','Text'],['Cotas','Dimensions'],['Capas','Layers'],
 ['Propiedades','Properties'],['Deshacer','Undo'],['Rehacer','Redo'],['Borrar','Erase'],
 ['Mover','Move'],['Copiar','Copy'],['Girar','Rotate'],['Escalar','Scale'],['Simetría','Mirror'],
 ['Desfase','Offset'],['Recortar','Trim'],['Extender','Extend'],['Unir','Join'],
 ['Insertar bloque','Insert block'],['Editar bloque','Edit block'],['Crear bloque','Create block'],
 ['Seleccionar todo','Select all'],['Deseleccionar','Deselect'],['Seleccionar similares','Select similar'],
 ['Historial de comandos','Command history'],['Ayuda','Help'],['Cancelar','Cancel'],
 ['Terminar muro','Finish wall'],['Deshacer último vértice','Undo last vertex'],
 ['Cerrar polilínea','Close polyline'],['Distancia de desfase…','Offset distance…'],
 ['Radio de empalme…','Fillet radius…'],['Distancia de chaflán…','Chamfer distance…'],
 ['Recortar por barrido','Fence trim'],['Tijera','Scissors'],
 ['Estilo de cotas','Dimension style'],['Cambiar bloque','Choose block'],
 ['Selección','Selection'],['Espacio modelo','Model space'],['Comando activo','Active command'],
 ['Agregar texto','Add text'],['Zoom ventana','Zoom window'],['Zoom extensión','Zoom extents'],
 ['Encuadre','Pan'],['Pegar objetos','Paste objects'],['Copiar a otra capa','Copy to layer'],
 ['Cambiar de capa','Change layer'],['Igualar propiedades','Match properties'],
 ['Descomponer','Explode'],['Copiar al portapapeles','Copy to clipboard'],
 ['Cortar al portapapeles','Cut to clipboard'],['Pegar','Paste'],
 ['Borrar selección','Erase selection'],['Invertir selección','Invert selection'],
 ['Editar texto de cota','Edit dimension text'],['Editar texto','Edit text'],
 ['Pantalla limpia','Clean screen'],['Ortogonal','Ortho'],['Rastreo OSNAP','Object snap tracking'],
 ['Rejilla','Grid'],['Deshacer último paso','Undo last step'],
 ['Seleccioná un objeto','Select an object'],
 ['Primera esquina','First corner'],['Segunda esquina','Second corner'],
 ['Comando cancelado','Command cancelled'],
 ['Cuadro de herramientas','Tool palette'],['Nombre del dibujo: clic para renombrar','Drawing name: click to rename'],
 ['Idioma de alias CAD','CAD language and command aliases'],['Perfil de alias del teclado','CAD command language'],
 ['Opciones rápidas de muro','Quick wall options'],['Justificación del muro','Wall justification'],
 ['Espesor de muro en metros','Wall thickness in meters'],
 ['Comandos · LINE, TRIM, DIM…','Commands · LINE, TRIM, DIM…'],
 ['Guardar dibujo editable en DXF 1:1','Save editable DXF drawing at 1:1'],
 ['Exportar a formatos abiertos: DXF, SVG, PDF, PNG y CADJSON','Export to open formats: DXF, SVG, PDF, PNG and CADJSON'],
 ['Clic para cambiar el nombre del dibujo','Click to rename drawing'],
 ['MURO: primer punto','WALL: first point'],['MURO: siguiente punto','WALL: next point'],
 ['Enter finaliza','Enter to finish'],['espesor','thickness']
 ];
 const toEn=new Map(pairs.map(([es,en])=>[es,en])),toEs=new Map(pairs.map(([es,en])=>[en,es]));
 let current='en';
 function translate(value,language=current){
  const input=String(value||'');
  const table=language==='es'?toEs:toEn;
  const space=input.match(/^(\s*)([\s\S]*?)(\s*)$/);
  if(!space)return input;
  const [,a,core,b]=space;
  if(table.has(core))return a+table.get(core)+b;
  // Compound menu rows preserve shortcut notation and counts.
  const match=/^(.+?)(\s·\s.+)$/.exec(core);
  if(match&&table.has(match[1]))return a+table.get(match[1])+match[2]+b;
  const start=/^(.+?)(\s·\s)(.+)$/.exec(core);
  if(start&&table.has(start[1])&&table.has(start[3]))
    return a+table.get(start[1])+start[2]+table.get(start[3])+b;
  return input;
 }
 function skipped(node){
  const parent=node.parentElement;
  return !parent||!!parent.closest('script,style,textarea,input,pre,code,[contenteditable],[data-no-cad-translate],#cadCanvas,#cadDrawingNameEditor,#cadInlineTextEditor,#cadBlockDefEditor');
 }
 function walk(element){
  if(!element||element.nodeType!==1)return;
  const rootNode=element;
  if(rootNode.matches?.('script,style,textarea,input,pre,code,[contenteditable],[data-no-cad-translate]'))return;
  const walker=document.createTreeWalker(rootNode,NodeFilter.SHOW_TEXT);
  const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  for(const n of nodes){if(skipped(n))continue;const next=translate(n.nodeValue);if(next!==n.nodeValue)n.nodeValue=next}
  for(const el of [rootNode,...rootNode.querySelectorAll('[title],[aria-label],[placeholder]')]){
   for(const name of ['title','aria-label','placeholder']){
    const old=el.getAttribute(name);
    if(old){const next=translate(old);if(next!==old)el.setAttribute(name,next)}
   }
  }
 }
 function setLanguage(value){
  current=value==='es'?'es':'en';
  document.documentElement.lang=current;
  const selector=document.getElementById('cadAliasLanguage');
  if(selector)selector.value=current;
  const app=document.querySelector('.app');
  if(app)walk(app);
 }
 function init(){
  let value='en';
  try{value=localStorage.getItem('cad2d-alias-language')==='es'?'es':'en'}catch(_){}
  setLanguage(value);
  const app=document.querySelector('.app');
  if(app&&typeof MutationObserver==='function'){
   const observer=new MutationObserver(changes=>{
    for(const change of changes){
     for(const node of change.addedNodes)if(node.nodeType===1)walk(node);
    }
   });
   observer.observe(app,{childList:true,subtree:true});
  }
 }
 root.BlacklineUILanguage=Object.freeze({setLanguage,translate,getLanguage:()=>current});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})(window);
