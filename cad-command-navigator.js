/* Blackline CAD — additive command navigator. No geometry state changes until a command is selected. */
(() => {
  'use strict';
  const commands = [
    ['LINE','Línea','Dibujo'],['PLINE','Polilínea','Dibujo'],['RECTANG','Rectángulo','Dibujo'],
    ['CIRCLE','Círculo','Dibujo'],['ARC','Arco','Dibujo'],['TEXT','Texto','Anotación'],
    ['DIM','Acotación','Anotación'],['TRIM','Recortar','Modificar'],['EXTEND','Extender','Modificar'],
    ['OFFSET','Equidistancia','Modificar'],['FILLET','Empalme','Modificar'],['CHAMFER','Chaflán','Modificar'],
    ['MOVE','Mover','Modificar'],['COPY','Copiar','Modificar'],['ROTATE','Girar','Modificar'],
    ['SCALE','Escalar','Modificar'],['MIRROR','Simetría','Modificar'],['STRETCH','Estirar','Modificar'],
    ['ARRAY','Matriz','Modificar'],['ARRAYPOLAR','Matriz polar','Modificar'],
    ['OVERKILL','Eliminar duplicados','Revisión'],['SELECTSIMILAR','Seleccionar similares','Revisión'],
    ['LIST','Información del objeto','Revisión'],['PURGE','Limpiar capas sin uso','Revisión'],
    ['LAYER','Capas','Organización'],['PROPERTIES','Propiedades','Organización'],
    ['BLOCK','Crear bloque','Bloques'],['INSERT','Insertar bloque','Bloques'],
    ['IMPORTBLOCK','Importar bloque','Bloques'],['EXPORTBLOCK','Exportar bloque','Bloques'],
    ['OSNAP','Referencias a objetos','Precisión'],['ORTHO','Modo ortogonal','Precisión'],
    ['POLAR','Rastreo polar','Precisión'],['GRID','Rejilla','Precisión'],
    ['SNAP','Forzar a rejilla','Precisión'],['UNITS','Unidades','Precisión'],
    ['SCALECHECK','Comprobar escala 1:1','Precisión'],
    ['ZE','Encuadrar extensión','Vista'],['ZOOM','Zoom ventana','Vista'],['PAN','Desplazar','Vista'],
    ['MODEL','Espacio modelo','Vista'],['LAYOUT','Espacio papel','Vista'],
    ['UNDO','Deshacer','Edición'],['REDO','Rehacer','Edición'],
    ['QSAVE','Guardar proyecto','Archivo'],['OPEN','Abrir archivo','Archivo'],
    ['DXF','Exportar DXF','Archivo'],['PDF','Imprimir a PDF','Archivo'],
    ['SVG','Exportar SVG','Archivo'],['PNG','Exportar PNG','Archivo'],
    ['MANUAL','Manual de comandos','Ayuda']
  ];
  const css=document.createElement('style');
  css.textContent=`
  .bl-cmd-toggle{border:1px solid #54616b;background:#242d35;color:#f0f2f3;border-radius:6px;padding:5px 9px;white-space:nowrap}
  .bl-cmd-toggle:hover{background:#354551}
  .bl-command-cover[hidden]{display:none!important}
  .bl-command-cover{position:fixed;inset:0;z-index:9999;background:#05090bcc;display:flex;align-items:flex-start;justify-content:center;padding:clamp(45px,12vh,130px) 15px 15px}
  .bl-command-dialog{width:min(620px,100%);max-height:75vh;background:#20282f;border:1px solid #667681;box-shadow:0 20px 65px #000c;border-radius:12px;display:flex;flex-direction:column;overflow:hidden;color:#f5f6f6}
  .bl-command-search{font:15px system-ui;background:#11191f;border:0;border-bottom:1px solid #45545d;color:#fff;padding:16px;outline:none}
  .bl-command-results{overflow:auto;padding:6px}
  .bl-command-result{display:flex;align-items:center;width:100%;justify-content:space-between;gap:12px;text-align:left;background:transparent;color:#e8eef2;border:0;border-radius:6px;padding:10px 12px}
  .bl-command-result:hover,.bl-command-result[aria-selected=true]{background:#3a4e5c}
  .bl-command-result small{color:#b2c4ce}.bl-command-result code{color:#e4c48f;font:12px ui-monospace,monospace}
  .bl-command-foot{font:11px system-ui;padding:9px 14px;color:#bdc9d0;border-top:1px solid #48565f}
  `;
  document.head.append(css);
  const commandInput=document.getElementById('command');
  const run=document.getElementById('runCommand');
  if(!commandInput||!run)return;
  const trigger=document.createElement('button');trigger.type='button';trigger.className='bl-cmd-toggle';
  trigger.title='Buscar un comando existente (Ctrl/Cmd + Shift + P)';trigger.textContent='⌕ Comandos';
  const row=commandInput.closest('.command-row');
  if(row)row.insertBefore(trigger,commandInput);
  const cover=document.createElement('div');cover.className='bl-command-cover';cover.hidden=true;
  cover.innerHTML='<section class="bl-command-dialog" role="dialog" aria-modal="true" aria-label="Buscar comandos CAD"><input class="bl-command-search" type="search" placeholder="Buscar: recortar, capas, offset, PDF…" aria-label="Buscar comando"><div class="bl-command-results" role="listbox"></div><div class="bl-command-foot">↑ ↓ navegar · Enter ejecutar · Esc cerrar · Ctrl/Cmd + Shift + P abrir</div></section>';
  document.body.append(cover);
  const search=cover.querySelector('input'), results=cover.querySelector('.bl-command-results');
  let matches=[],selected=0,previousFocus=null;
  const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  function close(){cover.hidden=true;previousFocus?.focus?.()}
  function launch(cmd){close();commandInput.value=cmd;run.click()}
  function render(){
    const q=normalize(search.value.trim());
    matches=commands.filter(c=>normalize(c.join(' ')).includes(q)).slice(0,40);
    selected=Math.min(selected,Math.max(0,matches.length-1));
    results.replaceChildren();
    for(let i=0;i<matches.length;i++){
      const c=matches[i],button=document.createElement('button');
      button.type='button';button.className='bl-command-result';button.setAttribute('role','option');
      button.setAttribute('aria-selected',String(i===selected));
      const name=document.createElement('span');name.textContent=c[1]+' · '+c[2];
      const code=document.createElement('code');code.textContent=c[0];
      button.append(name,code);button.onmouseenter=()=>{selected=i;results.querySelectorAll('button').forEach((b,j)=>b.setAttribute('aria-selected',String(j===i)))};
      button.onclick=()=>launch(c[0]);results.append(button);
    }
    if(!matches.length)results.textContent='No se encontró un comando en esta lista. Podés escribirlo en la barra inferior.';
  }
  function open(){previousFocus=document.activeElement;cover.hidden=false;search.value='';selected=0;render();search.focus()}
  trigger.onclick=open;
  cover.addEventListener('pointerdown',e=>{if(e.target===cover)close()});
  search.addEventListener('input',()=>{selected=0;render()});
  search.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();return}
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();e.stopPropagation();if(matches.length){selected=(selected+(e.key==='ArrowDown'?1:-1)+matches.length)%matches.length;render();results.children[selected]?.scrollIntoView({block:'nearest'})}}
    if(e.key==='Enter'){e.preventDefault();e.stopPropagation();if(matches[selected])launch(matches[selected][0])}
  });
  document.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.key.toLowerCase()==='p'){e.preventDefault();e.stopImmediatePropagation();cover.hidden?open():close()}
    else if(!cover.hidden&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close()}
  },true);
})();
