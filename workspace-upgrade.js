/* CAD2D workspace upgrades. Works without servers; account enforcement remains off until secure auth is deployed. */
(() => {
'use strict';
const doc=document, app=doc.querySelector('.app'), workspace=doc.querySelector('.workspace');
if(!app||!workspace) return;
const store=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const read=(k,fallback)=>{try{const v=localStorage.getItem(k);return v===null?fallback:JSON.parse(v)}catch(e){return fallback}};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const storageKey='cad2d-workspace-v3';
const original={left:true,right:false,ribbon:true,quick:false};
const prefs=Object.assign({},original,read(storageKey,{}));
const $=id=>doc.getElementById(id);
const side={left:doc.querySelector('.workspace>.sidebar:not(.rightside)'),right:doc.querySelector('.workspace>.sidebar.rightside')};
const palettes=Array.from(doc.querySelectorAll('.workspace .cad-palette'));
const resizeCAD=()=>{window.dispatchEvent(new Event('resize'));const c=$('cadCanvas');if(c)c.dispatchEvent(new Event('cad-workspace-resize'))};
function persist(){store(storageKey,prefs)}
function applyPrefs(){
 app.classList.toggle('cad-hide-left',!prefs.left);
 app.classList.toggle('cad-hide-right',!prefs.right);
 app.classList.toggle('cad-hide-ribbon',!prefs.ribbon);
 app.classList.toggle('cad-hide-quick',!prefs.quick);
 app.classList.toggle('cad-focus',!!prefs.focus);
 $('cadFocusButton')?.setAttribute('aria-pressed',String(!!prefs.focus));
 $('cadFocusButton').textContent=prefs.focus?'⤢ Exit focus':'⛶ Focus';
 doc.querySelectorAll('[data-cad-section]').forEach(ch=>{ch.checked=!!prefs[ch.dataset.cadSection]});
 persist();
 requestAnimationFrame(resizeCAD);
}
const controls=doc.createElement('div');
controls.className='cad-workspace-controls';
controls.innerHTML='<button type="button" class="btn slim cad-full-canvas" id="cadFocusButton" aria-pressed="false" title="Maximum drawing area (F11 within CAD2D)">⛶ Focus</button><button type="button" class="btn slim cad-workspace-toggle" id="cadWorkspaceButton" aria-expanded="false">☷ Workspace</button><button type="button" class="btn slim cad-account-btn" id="cadAccountButton" title="Guest trial and account information">Guest</button>';
const right=doc.querySelector('.brandbar>.right');
right?.parentElement.insertBefore(controls,right);
const menu=doc.createElement('section');
menu.className='cad-workspace-menu';
menu.id='cadWorkspaceMenu';
menu.hidden=true;
menu.setAttribute('aria-label','Configure workspace');
menu.innerHTML='<h2>Workspace configuration</h2><p>Make model space larger, move CAD toolbars, or show any palette. Your choices are saved in this browser.</p><div class="cad-workspace-actions"><button type="button" data-cad-action="focus">⛶ Toggle full canvas</button><button type="button" data-cad-action="reset">↺ Reset workspace</button></div><div class="cad-workspace-section">Display</div><div id="cadWorkspaceSections" class="cad-panel-options"></div><div class="cad-workspace-section">Palettes</div><div id="cadWorkspacePalettes" class="cad-panel-options"></div><p>Drag a palette title to float it, resize its bottom-right corner, or dock using ◀ and ▶. Drag the ⠿ ribbon grip to move the top toolbar; drag a group grip to reorder its commands.</p>';
doc.body.appendChild(menu);
const sections=$('cadWorkspaceSections');
[['left','Left palettes'],['right','Right palettes'],['ribbon','Top ribbon'],['quick','Quick tools']].forEach(([key,label])=>{
 const lab=doc.createElement('label');lab.className='cad-toggle-row';
 const check=doc.createElement('input');check.type='checkbox';check.dataset.cadSection=key;check.checked=!!prefs[key];
 lab.append(check,doc.createTextNode(label));
 check.addEventListener('change',()=>{prefs[key]=check.checked;applyPrefs()});
 sections.appendChild(lab);
});
const paletteList=$('cadWorkspacePalettes');
const paletteHiddenKey='cad2d-hidden-palettes-v1';
const hiddenPalettes=new Set(read(paletteHiddenKey,[]));
const paletteInputs=[];
function labelFor(p){return (p.querySelector('.panel-title')?.childNodes[0]?.textContent||'Palette').trim()}
palettes.forEach((panel,index)=>{
 const id=panel.dataset.palette||String(index);
 const lab=doc.createElement('label');lab.className='cad-toggle-row';
 const check=doc.createElement('input');check.type='checkbox';check.checked=!hiddenPalettes.has(id);
 const name=doc.createElement('span');name.textContent=labelFor(panel);name.title=name.textContent;
 lab.append(check,name);paletteList.appendChild(lab);paletteInputs.push([check,panel,id]);
 panel.hidden=hiddenPalettes.has(id);
 check.addEventListener('change',()=>{
  panel.hidden=!check.checked;
  if(check.checked)hiddenPalettes.delete(id);else hiddenPalettes.add(id);
  store(paletteHiddenKey,[...hiddenPalettes]);
  if(check.checked&&innerWidth<=620){
   panel.querySelector('[data-palette-act="float"]')?.click();
   panel.style.left='12px';panel.style.top='118px';
   panel.style.width=Math.min(310,innerWidth-24)+'px';
   panel.style.height=Math.min(340,innerHeight-150)+'px';
  }
  resizeCAD();
 });
});
function closeMenu(){menu.hidden=true;$('cadWorkspaceButton').setAttribute('aria-expanded','false')}
$('cadWorkspaceButton').addEventListener('click',()=>{menu.hidden=!menu.hidden;$('cadWorkspaceButton').setAttribute('aria-expanded',String(!menu.hidden))});
$('cadFocusButton').addEventListener('click',()=>{prefs.focus=!prefs.focus;applyPrefs()});
menu.addEventListener('click',event=>{
 const action=event.target.closest('[data-cad-action]')?.dataset.cadAction;
 if(action==='focus'){prefs.focus=!prefs.focus;applyPrefs();closeMenu()}
 if(action==='reset'){
  prefs.left=true;prefs.right=false;prefs.ribbon=true;prefs.quick=false;prefs.focus=false;
  $('resetWorkspace')?.click();
  hiddenPalettes.clear();store(paletteHiddenKey,[]);
  paletteInputs.forEach(([input,p])=>{input.checked=true;p.hidden=false});
  try{localStorage.removeItem('cad2d-palette-geometries-v1')}catch(e){}
  applyPrefs();closeMenu();
 }
});
doc.addEventListener('pointerdown',event=>{if(!menu.hidden&&!menu.contains(event.target)&&!controls.contains(event.target))closeMenu()});
doc.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&!menu.hidden)closeMenu();
 if(event.key==='F11'&&!(event.target instanceof HTMLInputElement)&&!(event.target instanceof HTMLTextAreaElement)){
  event.preventDefault();prefs.focus=!prefs.focus;applyPrefs();
 }
});
applyPrefs();

/* Restore floating palette position and dimensions, including resizing; preserve original dock logic. */
const geometryKey='cad2d-palette-geometries-v1';
let positions=read(geometryKey,{});
let restoring=true;
function capturePalette(panel){
 if(restoring)return;
 const id=panel.dataset.palette;
 if(!id)return;
 const isFloating=panel.classList.contains('floating');
 const sideName=isFloating?'floating':side.right.contains(panel)?'right':'left';
 positions[id]=isFloating?{
  side:sideName,
  x:parseFloat(panel.style.left)||panel.getBoundingClientRect().left,
  y:parseFloat(panel.style.top)||panel.getBoundingClientRect().top,
  w:parseFloat(panel.style.width)||panel.getBoundingClientRect().width,
  h:parseFloat(panel.style.height)||panel.getBoundingClientRect().height,
  collapsed:panel.classList.contains('collapsed')
 }:{side:sideName,collapsed:panel.classList.contains('collapsed')};
 store(geometryKey,positions);
}
palettes.forEach(panel=>{
 const id=panel.dataset.palette, saved=positions[id];
 if(saved&&saved.side==='floating'){
  panel.querySelector('[data-palette-act="float"]')?.click();
  panel.style.left=clamp(Number(saved.x)||12,0,Math.max(0,innerWidth-160))+'px';
  panel.style.top=clamp(Number(saved.y)||75,0,Math.max(0,innerHeight-60))+'px';
  panel.style.width=clamp(Number(saved.w)||265,205,Math.max(205,innerWidth-16))+'px';
  panel.style.height=clamp(Number(saved.h)||300,115,Math.max(115,innerHeight-85))+'px';
 }
 if(saved&&saved.collapsed!==panel.classList.contains('collapsed'))
  panel.querySelector('[data-palette-act="collapse"]')?.click();
 panel.querySelector('.panel-title')?.addEventListener('pointerup',()=>requestAnimationFrame(()=>capturePalette(panel)));
 panel.querySelector('.palette-actions')?.addEventListener('click',()=>requestAnimationFrame(()=>capturePalette(panel)));
 if(typeof ResizeObserver!=='undefined'){
  let timer;
  new ResizeObserver(()=>{clearTimeout(timer);timer=setTimeout(()=>capturePalette(panel),220)}).observe(panel);
 }
});
restoring=false;

/* Reorder ribbon groups by grabbing their individual handles. Per-tab order persists. */
const ribbon=$('ribbon'),tabbar=$('tabs');
const ribbonOrderKey='cad2d-ribbon-groups-v1',ribbonOrders=read(ribbonOrderKey,{});
function activeTab(){return tabbar?.querySelector('.tab.active')?.dataset.tab||'home'}
function groupName(group){return group.dataset.label||group.getAttribute('data-label')||''}
let syncing=false;
function decorateRibbon(){
 if(syncing||!ribbon)return;
 syncing=true;
 const groups=Array.from(ribbon.querySelectorAll(':scope > .group'));
 groups.forEach(g=>{
  if(g.querySelector('.cad-group-handle'))return;
  const grip=doc.createElement('button');
  grip.type='button';grip.className='cad-group-handle';grip.textContent='⠿';grip.title='Drag to reorder this group';grip.draggable=true;
  grip.setAttribute('aria-label','Move '+groupName(g)+' command group');
  grip.addEventListener('dragstart',ev=>{
   try{ev.dataTransfer.effectAllowed='move';ev.dataTransfer.setData('text/plain',groupName(g))}catch(e){}
   ribbon.dataset.cadDragging=groupName(g);
  });
  grip.addEventListener('dragend',()=>{delete ribbon.dataset.cadDragging;ribbon.querySelectorAll('.cad-group-drop').forEach(el=>el.classList.remove('cad-group-drop'))});
  g.addEventListener('dragover',ev=>{if(!ribbon.dataset.cadDragging)return;ev.preventDefault();g.classList.add('cad-group-drop')});
  g.addEventListener('dragleave',()=>g.classList.remove('cad-group-drop'));
  g.addEventListener('drop',ev=>{
   ev.preventDefault();g.classList.remove('cad-group-drop');
   const from=Array.from(ribbon.children).find(ch=>groupName(ch)===ribbon.dataset.cadDragging);
   if(from&&from!==g){
    const rect=g.getBoundingClientRect();
    ribbon.insertBefore(from,ev.clientX<rect.left+rect.width/2?g:g.nextSibling);
    ribbonOrders[activeTab()]=Array.from(ribbon.children).filter(ch=>ch.classList.contains('group')).map(groupName);
    store(ribbonOrderKey,ribbonOrders);
   }
   delete ribbon.dataset.cadDragging;
  });
  g.appendChild(grip);
 });
 const saved=ribbonOrders[activeTab()];
 if(Array.isArray(saved)&&saved.length){
  const ordered=Array.from(ribbon.children).filter(ch=>ch.classList.contains('group'));
  ordered.sort((a,b)=>{
   const ai=saved.indexOf(groupName(a)),bi=saved.indexOf(groupName(b));
   return (ai<0?999:ai)-(bi<0?999:bi);
  });
  if(ordered.some((g,i)=>g!==Array.from(ribbon.children).filter(ch=>ch.classList.contains('group'))[i])) ordered.forEach(g=>ribbon.appendChild(g));
 }
 syncing=false;
}
if(ribbon){
 const observer=new MutationObserver(()=>{if(!syncing)queueMicrotask(decorateRibbon)});
 observer.observe(ribbon,{childList:true});
 decorateRibbon();
}

/* Browser-local 90-day guest indication. Never mistake it for secure account enforcement. */
const TRIAL_DAYS=90;
const firstKey='cad2d-guest-first-use-v1';
let first=read(firstKey,null);
if(typeof first!=='number'||first>Date.now()||first<Date.UTC(2020,0,1)){first=Date.now();store(firstKey,first)}
const daysUsed=Math.max(0,Math.floor((Date.now()-first)/86400000));
const daysLeft=Math.max(0,TRIAL_DAYS-daysUsed);
const authConfig=window.CAD2D_AUTH_CONFIG||{};
const loginUrl=typeof authConfig.loginUrl==='string'&&/^https:\/\//.test(authConfig.loginUrl)?authConfig.loginUrl:'';
const authStatusUrl=typeof authConfig.statusUrl==='string'&&/^https:\/\//.test(authConfig.statusUrl)?authConfig.statusUrl:'';
const enforce=authConfig.enforce===true&&!!loginUrl&&!!authStatusUrl;
$('cadAccountButton').textContent=daysLeft>0?'Guest · '+daysLeft+'d':'Guest · Beta';
const authLayer=doc.createElement('div');authLayer.className='cad-auth-backdrop';authLayer.hidden=true;
authLayer.innerHTML='<div class="cad-auth-card" role="dialog" aria-modal="true" aria-labelledby="cadAuthTitle"><div class="cad-auth-overline">CAD2D · ACCOUNT</div><h2 id="cadAuthTitle">Work freely before registration</h2><p id="cadAuthDescription"></p><div class="cad-auth-status" id="cadAuthStatus" aria-live="polite"></div><div class="cad-auth-actions"><button type="button" class="primary" id="cadAuthRegister">Create account / Sign in</button><button type="button" id="cadAuthDismiss">Continue drawing</button></div><p class="cad-auth-note">Your drawings remain stored in your browser unless you export them. This prototype does not upload or synchronize projects.</p></div>';
doc.body.appendChild(authLayer);
const authDescription=$('cadAuthDescription'),authStatus=$('cadAuthStatus'),authRegister=$('cadAuthRegister'),authDismiss=$('cadAuthDismiss');
let locked=false;
function showAuth(isLocked=false){
 locked=isLocked;authLayer.hidden=false;
 const note=daysLeft>0?'Your 90-day guest period has '+daysLeft+' day'+(daysLeft!==1?'s':'')+' remaining. You can keep drawing without an account.':
  'Your 90-day guest period has elapsed.';
 authDescription.textContent=note+(isLocked?' Registration is now required to continue using the hosted service.':loginUrl?' You may create your account now.':' Account registration will be enabled once the secure service is deployed. Until then, CAD2D remains usable as a public beta.');
 authRegister.hidden=!loginUrl;
 authDismiss.hidden=isLocked;
 authStatus.textContent='';
 authDismiss.disabled=isLocked;
 authDismiss.focus();
}
authDismiss.addEventListener('click',()=>{if(!locked)authLayer.hidden=true});
authRegister.addEventListener('click',()=>{if(loginUrl)window.location.assign(loginUrl)});
$('cadAccountButton').addEventListener('click',()=>showAuth(false));
async function checkAuthentication(){
 if(!enforce||daysLeft>0)return;
 try{
  const response=await fetch(authStatusUrl,{method:'GET',credentials:'include',cache:'no-store',headers:{'Accept':'application/json'}});
  if(!response.ok)throw Error('auth-check-unavailable');
  const session=await response.json();
  if(session&&session.authenticated===true){
   $('cadAccountButton').textContent='My account';
   return;
  }
  showAuth(true);
 }catch(e){
  // Do not lock working drawings due to a down/unconfigured authentication server.
  $('cadAccountButton').textContent='Account service offline';
 }
}
/* Match original five-group Home ribbon; extra properties/export commands remain under Modify/Output and the status/header buttons. */
function restoreHomeRibbon(){
 const active=tabbar?.querySelector('.tab.active')?.dataset.tab||'home';
 app.classList.toggle('cad-classic-home-ribbon',active==='home');
}
restoreHomeRibbon();
tabbar?.addEventListener('click',()=>queueMicrotask(restoreHomeRibbon));
/* Reference-inspired dark taupe preset; respects users' previously chosen palette colors. */
function initializeTaupeWorkspace(){
 const picker=$('cadPaletteHue'),tone=$('cadPaletteTone'),background=$('modelBgColor');
 try{
  if(picker&&!localStorage.getItem('cad2d-palette-hue')){
   picker.value='#39312c';
   picker.dispatchEvent(new Event('input',{bubbles:true}));
  }
  const stored=localStorage.getItem('cad2d-palette-tone-v2');
  if(tone&&(stored===null||stored==='8'||stored==='19')){
   tone.value='11';
   tone.dispatchEvent(new Event('input',{bubbles:true}));
  }
  // Only change untouched default model backgrounds; retain drawings using custom backgrounds.
  const saved=JSON.parse(localStorage.getItem('cad2d-display-colors')||'null');
  const bg=saved?.background;
  if(background&&(!bg||bg==='#10171c')){
   background.value='#0b0d0e';
   background.dispatchEvent(new Event('input',{bubbles:true}));
  }
 }catch(e){/* Appearance preferences are optional. */}
}
/* Visual reference arrangement: layers and object properties at left, Spanish CAD navigation.
   This leaves CAD commands and original panel handlers untouched. */
function useReferenceCadLayout(){
 const navLabels={home:'Inicio',draw:'Dibujo',modify:'Modificar',annotate:'Anotar',view:'Vista',output:'Salida'};
 doc.querySelectorAll('#tabs [data-tab]').forEach(button=>{
  if(navLabels[button.dataset.tab])button.textContent=navLabels[button.dataset.tab];
 });
 const brand=doc.querySelector('.brand small');
 if(brand)brand.textContent='DISEÑO Y DIBUJO ARQUITECTÓNICO · 2D';
 const left=side.left;
 if(left){
  const layerPanel=left.querySelector('#layers')?.closest('.panel')||doc.querySelector('#layers')?.closest('.panel');
  const propsPanel=doc.querySelector('#cadPropertiesPanel');
  const settingsPanel=doc.querySelector('#units')?.closest('.panel');
  if(layerPanel&&!layerPanel.classList.contains('floating'))left.prepend(layerPanel);
  if(propsPanel&&!propsPanel.classList.contains('floating')){
   if(layerPanel?.parentElement===left)layerPanel.after(propsPanel);
   else left.prepend(propsPanel);
  }
  if(settingsPanel&&!settingsPanel.classList.contains('floating')&&propsPanel?.parentElement===left){
   propsPanel.after(settingsPanel);
  }
  const nameMap={'Layer manager':'Capas','Object color / CAD properties':'Propiedades','Drawing properties':'Configuración de dibujo',
                 'Display / Cursor colors':'Apariencia y cursor','Blocks / Symbols':'Bloques y símbolos'};
  left.querySelectorAll('.panel-title').forEach(title=>{
   const child=title.querySelector('#layerCount');
   const heading=title.firstChild;
   if(heading?.nodeType===Node.TEXT_NODE){
    const original=heading.textContent.trim();
    if(nameMap[original])heading.textContent=nameMap[original]+' ';
   }
   if(child)child.style.marginLeft='4px';
  });
  const a=doc.getElementById('newLayer'),b=doc.getElementById('removeLayer');
  if(a)a.textContent='+ Añadir capa';if(b)b.textContent='Eliminar';
 }
 // Wider palette for architectural layer names, unless the user already resized it.
 const ws=doc.querySelector('.workspace');
 try{
  if(ws&&!localStorage.getItem('cad2d-left-width'))ws.style.setProperty('--left-width','278px');
 }catch(e){}
 const finder=$('cadCommandSearch');if(finder)finder.placeholder='Comandos (LÍNEA, RECORTAR, ACOTAR...)';
 const command=$('command');if(command)command.placeholder='Escribí un comando o una medida · LINE / LÍNEA · OFFSET 0.20';
 const commandLabel=doc.querySelector('.cmd .command-row b');if(commandLabel)commandLabel.textContent='COMANDO:';
 doc.querySelector('.brandbar')?.setAttribute('aria-label','Blackline CAD · Dibujo Arquitectónico 2D');
}
useReferenceCadLayout();
initializeTaupeWorkspace();
checkAuthentication();
})();
