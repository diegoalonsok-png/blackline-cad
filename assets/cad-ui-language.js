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
 const G=root.CAD2D_UI_GLOSSARY||{phrases:[],words:{}};
 for(const pr of G.phrases)pairs.push(pr);
 const toEn=new Map(pairs.map(([es,en])=>[es,en])),toEs=new Map(pairs.map(([es,en])=>[en,es]));
 const WORDS=G.words||{},SPANISH=/[áéíóúñÁÉÍÓÚÑ¿¡]|\b(de|del|con|para|por|sin|y|la|las|el|los|una?)\b/i;
 const prefixes=G.phrases.filter(([es])=>/ $/.test(es));
 // Fallback: palabra por palabra solo si el texto parece español (nombres de bloques, categorías…).
 function wordwise(text){
  // Solo textos cortos (nombres, etiquetas): una oración traducida palabra por palabra queda mal.
  if(text.trim().split(/\s+/).length>7)return text;
  // Nunca tocar tokens sueltos cortos (EN, Y, X, A…): son siglas, ejes o idiomas.
  if(!/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{3,}/.test(text))return text;
  if(!/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+/.test(text)||!text.split(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+/).some(w=>WORDS[w.toLowerCase()]))return text;
  for(const [es,en] of prefixes)if(text.startsWith(es))text=en+text.slice(es.length);
  return text.replace(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+/g,w=>{if(w.length<3&&w===w.toUpperCase())return w;const t=WORDS[w.toLowerCase()];if(!t)return w;return w[0]===w[0].toUpperCase()&&w[0]!==w[0].toLowerCase()?(w===w.toUpperCase()&&w.length>1?t.toUpperCase():t[0].toUpperCase()+t.slice(1)):t});
 }
 let current='en';
 const PT=root.CAD2D_UI_PT||null;
 function translate(value,language=current){
  const input=String(value||'');
  if(language==='pt'){
   // Portugués: todo pasa por su forma en inglés (el español ya tiene par inglés) y de ahí a pt-BR.
   if(!PT)return translate(input,'en');
   const sp=input.match(/^(\s*)([\s\S]*?)(\s*)$/);if(!sp||!sp[2])return input;
   if(PT.reverse(sp[2]))return input;
   const en=translate(sp[2],'en');const out=PT.translate(en);
   return sp[1]+(out||en)+sp[3];
  }
  const table=language==='es'?toEs:toEn;
  const space=input.match(/^(\s*)([\s\S]*?)(\s*)$/);
  if(!space)return input;
  let [,a,core,b]=space;
  // Volviendo del portugués: primero a inglés.
  if(PT&&PT.reverse(core)){core=PT.reverse(core);if(language==='en')return a+core+b}
  if(table.has(core))return a+table.get(core)+b;
  // Compound menu rows preserve shortcut notation and counts.
  const match=/^(.+?)(\s·\s.+)$/.exec(core);
  if(match&&table.has(match[1])&&language==='es')return a+table.get(match[1])+match[2]+b;
  const start=/^(.+?)(\s·\s)(.+)$/.exec(core);
  if(start&&table.has(start[1])&&table.has(start[3]))
    return a+table.get(start[1])+start[2]+table.get(start[3])+b;
  // "Baños completos (13)" y similares: traducir sin el contador.
  const count=/^(.+?)(\s*\(\d+\))$/.exec(core);
  if(count&&table.has(count[1]))return a+table.get(count[1])+count[2]+b;
  if(language!=='es'){const g=/^GALERÍA ARQUITECTÓNICA · (\d+) BLOQUES DINÁMICOS$/.exec(core);if(g)return a+'ARCHITECTURAL GALLERY · '+g[1]+' DYNAMIC BLOCKS'+b;const rs=/^(\d+) resultados$/.exec(core);if(rs)return a+rs[1]+' results'+b;const md=/^(\d+) modelos$/.exec(core);if(md)return a+md[1]+' models'+b;const bv=/^(\d+) bloques visibles de (\d+) disponibles\. La geometría se descarga solamente al elegir un bloque\.$/.exec(core);if(bv)return a+bv[1]+' of '+bv[2]+' blocks shown. Geometry downloads only when you choose a block.'+b}
  if(language!=='es'){const wrap=/^(Insert |Move )(.+?)( at 1:1| command group)$/.exec(core);if(wrap){const inner=table.get(wrap[2])||wordwise(wrap[2]);if(inner!==wrap[2])return a+wrap[1]+inner+wrap[3]+b}}
  if(language!=='es'){const w=core.split(/(\s·\s)/).map(part=>/^\s·\s$/.test(part)?part:(table.get(part)||wordwise(part))).join('');if(w!==core)return a+w+b}
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
  for(const el of [rootNode,...rootNode.querySelectorAll('[title],[aria-label],[placeholder],optgroup[label]')]){
   for(const name of (el.matches('optgroup')?['title','aria-label','placeholder','label']:['title','aria-label','placeholder'])){
    const old=el.getAttribute(name);
    if(old){const next=translate(old);if(next!==old)el.setAttribute(name,next)}
   }
  }
 }
 function setLanguage(value){
  current=value==='es'?'es':value==='pt'?'pt':'en';
  document.documentElement.lang=current;
  const selector=document.getElementById('cadAliasLanguage');
  if(selector)selector.value=current;
  document.documentElement.lang=current==='pt'?'pt-BR':current;
  walk(document.body);
 }
 function init(){
  let value='en';
  try{value=localStorage.getItem('cad2d-ui-language')==='pt'?'pt':localStorage.getItem('cad2d-alias-language')==='es'?'es':'en'}catch(_){}
  setLanguage(value);
  if(typeof MutationObserver==='function'){
   // Both directions (EN<->ES). Added subtrees are batched and walked once; a node that keeps
   // being rewritten by its own component (ping-pong) stops being translated after 3 rounds.
   let busy=false,timer=0;const queue=new Set(),hits=new WeakMap();
   const tooMany=(n,k='text')=>{let m=hits.get(n);if(!m)hits.set(n,m={});m[k]=(m[k]||0)+1;return m[k]>4;};
   const flush=()=>{timer=0;busy=true;
    try{const roots=[...queue].filter(n=>n.isConnected);queue.clear();
     for(const n of roots){if(roots.some(o=>o!==n&&o.contains(n)))continue;if(n.nodeType===1)walk(n);else if(n.nodeType===3&&!skipped(n)&&!tooMany(n)){const next=translate(n.nodeValue);if(next!==n.nodeValue)n.nodeValue=next}}
    }finally{busy=false}};
   const observer=new MutationObserver(changes=>{
    if(busy)return;
    for(const change of changes){
     if(change.type==='characterData')queue.add(change.target);
     else if(change.type==='attributes'){const el=change.target;if(tooMany(el,change.attributeName))continue;const old=el.getAttribute(change.attributeName);if(old&&!el.closest('[data-no-cad-translate],#cadCanvas')){const next=translate(old);if(next!==old){busy=true;try{el.setAttribute(change.attributeName,next)}finally{busy=false}}}}
     else for(const node of change.addedNodes)queue.add(node);
    }
    if(queue.size&&!timer)timer=setTimeout(flush,40);
   });
   observer.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['title','aria-label','placeholder']});
  }
 }
 root.BlacklineUILanguage=Object.freeze({setLanguage,translate,getLanguage:()=>current});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})(window);
