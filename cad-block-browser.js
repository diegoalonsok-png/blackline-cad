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
 const VIEWS={
  all:{en:'All',es:'Todo',cats:null},
  dk:{en:'Blackline library',es:'Biblioteca Blackline',item:it=>/^dk-|^doc-/.test(it.id)},
  plan:{en:'Plans',es:'Plantas',cats:c=>!['Cortes y vistas','Alzados','Símbolos','Documentación'].includes(c)},
  section:{en:'Sections & elevations',es:'Cortes y vistas',cats:c=>c==='Cortes y vistas'||c==='Alzados'},
  symbol:{en:'Symbols',es:'Símbolos',cats:c=>c==='Símbolos'},
  doc:{en:'Documentation (levels, axes, sections…)',es:'Documentación (niveles, ejes, cortes…)',cats:c=>c==='Documentación'}
 };
 const KEY='cad2d-block-browser';
 let st={x:null,y:null,w:980,h:640,view:'all',cat:'',q:'',size:120};
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
#cadBlockBrowser .ft{padding:7px 14px;border-top:1px solid #26333d;color:#8ea2ae;font-size:12px}
#cadBlockBrowser .rz{position:absolute;z-index:2}#cadBlockBrowser .rz.e{right:0;top:0;bottom:0;width:7px;cursor:ew-resize}#cadBlockBrowser .rz.s{left:0;right:0;bottom:0;height:7px;cursor:ns-resize}
#cadBlockBrowser .rz.w{left:0;top:0;bottom:0;width:7px;cursor:ew-resize}#cadBlockBrowser .rz.n{left:0;right:0;top:0;height:5px;cursor:ns-resize}
#cadBlockBrowser .rz.se{right:0;bottom:0;width:18px;height:18px;cursor:nwse-resize;background:linear-gradient(135deg,transparent 55%,#6c8597 55%,#6c8597 62%,transparent 62%,transparent 72%,#6c8597 72%,#6c8597 79%,transparent 79%)}
#cadBlockBrowser.min .tabs,#cadBlockBrowser.min .tools,#cadBlockBrowser.min .main,#cadBlockBrowser.min .ft,#cadBlockBrowser.min .rz{display:none}
#cadBlockBrowser.min{min-height:0;height:auto!important}
@media (max-width:640px){#cadBlockBrowser .main{grid-template-columns:1fr}#cadBlockBrowser .cats{display:none}}
.bl-light #cadBlockBrowser{background:#f6f8fa;color:#16212a;border-color:#b8c5ce}
.bl-light #cadBlockBrowser .hd{background:#e6edf2;border-color:#cbd6dd}.bl-light #cadBlockBrowser .hd b{color:#2b5468}.bl-light #cadBlockBrowser .hd button{color:#2a3a44}
.bl-light #cadBlockBrowser .card{background:#fff;color:#1f2b33;border-color:#c8d3da}.bl-light #cadBlockBrowser .card .nm{color:#16212a}.bl-light #cadBlockBrowser .card .mt{color:#21708a}
.bl-light #cadBlockBrowser .cats button,.bl-light #cadBlockBrowser .tabs button{color:#22323c}.bl-light #cadBlockBrowser .cats button.on{background:#d5e6ef}
.bl-light #cadBlockBrowser input[type=search]{background:#fff;color:#16212a;border-color:#b8c5ce}`;
 document.head.append(css);

 let el=null,armedId=null;
 const items=()=>LIB.library;
 const inView=it=>{const v=VIEWS[st.view];if(v?.item)return v.item(it);const f=v?.cats;return !f||f(it.cat)};
 const cm=v=>Math.round(v*100);
 function filtered(){
  const q=st.q.trim().toLowerCase();
  return items().filter(it=>inView(it)&&(!st.cat||it.cat===st.cat)&&(!q||(it.name+' '+tr(it.name)+' '+it.cat+' '+tr(it.cat)+' '+it.id).toLowerCase().includes(q)));
 }
 function paint(){
  if(!el)return;
  el.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.v===st.view));
  const cats=[...new Set(items().filter(inView).map(i=>i.cat))];
  if(st.cat&&!cats.includes(st.cat))st.cat='';
  const count=c=>items().filter(i=>inView(i)&&(!c||i.cat===c)).length;
  el.querySelector('.cats').innerHTML=`<button data-c="" class="${st.cat?'':'on'}"><span>${T('All categories','Todas las categorías')}</span><small>${count('')}</small></button>`+
   cats.map(c=>`<button data-c="${c}" class="${st.cat===c?'on':''}"><span>${tr(c)}</span><small>${count(c)}</small></button>`).join('');
  const list=filtered(),grid=el.querySelector('.grid');
  grid.style.gridTemplateColumns=`repeat(auto-fill,minmax(${st.size}px,1fr))`;
  grid.innerHTML=list.map(it=>`<button class="card${it.id===armedId?' armed':''}" data-id="${it.id}" title="${tr(it.name)}">${ARQ.thumb(it.id,Math.round(st.size*.72))}${it.pro?'<span class="pro">PRO</span>':''}<span class="nm">${tr(it.name)}</span><span class="mt">${cm(it.w)}×${cm(it.d)} cm${it.wMax>it.wMin||it.dMax>it.dMin?' · ↔':''}</span></button>`).join('')||`<p style="color:#8ea2ae;padding:20px">${T('No blocks match.','No hay bloques que coincidan.')}</p>`;
  el.querySelector('.ft').textContent=T(`${list.length} of ${items().length} dynamic blocks · click a block, then click in the drawing · ↔ = resizable with grips`,`${list.length} de ${items().length} bloques dinámicos · clic en un bloque y luego en el dibujo · ↔ = se ajusta con pinzas`);
 }
 function place(){
  const W=innerWidth,H=innerHeight;st.w=Math.min(Math.max(420,st.w),W-16);st.h=Math.min(Math.max(300,st.h),H-16);
  if(st.x===null){st.x=Math.round((W-st.w)/2);st.y=Math.round(Math.max(60,(H-st.h)/2))}
  st.x=Math.max(8-st.w+120,Math.min(W-120,st.x));st.y=Math.max(4,Math.min(H-44,st.y));
  Object.assign(el.style,{left:st.x+'px',top:st.y+'px',width:st.w+'px',height:st.h+'px'});
 }
 function open(){
  if(el){el.classList.remove('min');el.style.display='flex';place();paint();el.querySelector('input').focus();return}
  el=document.createElement('div');el.id='cadBlockBrowser';el.setAttribute('role','dialog');el.setAttribute('aria-label','Block browser');
  el.innerHTML=`<div class="hd"><b>BLACKLINE CAD · ${T('BLOCK BROWSER','EXPLORADOR DE BLOQUES')}</b><button data-a="min" title="${T('Collapse','Plegar')}">▁</button><button data-a="max" title="${T('Maximize','Maximizar')}">▢</button><button data-a="close" title="${T('Close · Esc','Cerrar · Esc')}">×</button></div>
<div class="tabs">${Object.entries(VIEWS).map(([k,v])=>`<button data-v="${k}">${es()?v.es:v.en}</button>`).join('')}<button data-a="house" class="house" title="${T('Open the complete test house at 1:1','Abrir la casa de prueba completa a 1:1')}"><svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9v11h14V9"/><path d="M9 20v-6h6v6"/><path d="M15.5 5.2V3.5h2v3.3"/></svg>${T('Test house 1:1','Casa de prueba 1:1')}</button></div>
<div class="tools"><input type="search" placeholder="${T('Search: toilet, kitchen, car, section, north…','Buscar: inodoro, cocina, auto, corte, norte…')}" value=""><label>${T('Size','Tamaño')} <input type="range" min="84" max="220" step="4" value="${st.size}"></label></div>
<div class="main"><div class="cats"></div><div class="grid"></div></div><div class="ft"></div>
<span class="rz n" data-r="n"></span><span class="rz e" data-r="e"></span><span class="rz s" data-r="s"></span><span class="rz w" data-r="w"></span><span class="rz se" data-r="se"></span>`;
  document.body.append(el);place();
  const q=el.querySelector('input[type=search]');q.value=st.q;
  q.addEventListener('input',()=>{st.q=q.value;paint()});
  el.querySelector('input[type=range]').addEventListener('input',e=>{st.size=Number(e.target.value);save();paint()});
  el.addEventListener('click',e=>{
   const a=e.target.closest('[data-a]')?.dataset.a;
   if(a==='house'){el.style.display='none';window.cadOpenTestHouse?.();return}
   if(a==='close')return close();
   if(a==='min'){el.classList.toggle('min');return}
   if(a==='max'){const full=st.w>=innerWidth-30&&st.h>=innerHeight-30;if(full){Object.assign(st,st.prev||{w:980,h:640,x:null,y:null})}else{st.prev={x:st.x,y:st.y,w:st.w,h:st.h};Object.assign(st,{x:8,y:8,w:innerWidth-16,h:innerHeight-16})}place();save();return}
   const v=e.target.closest('[data-v]')?.dataset.v;if(v){st.view=v;st.cat='';save();paint();return}
   const c=e.target.closest('[data-c]');if(c){st.cat=c.dataset.c;save();paint();return}
   const card=e.target.closest('[data-id]');if(card){armedId=card.dataset.id;try{ARQ.insert(armedId)}catch(err){CORE.toast(String(err?.message||err))}el.querySelectorAll('.card').forEach(x=>x.classList.toggle('armed',x.dataset.id===armedId));CORE.toast(T('Click in the drawing to place it · Esc cancels','Hacé clic en el dibujo para ubicarlo · Esc cancela'))}
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
  paint();q.focus();
 }
 function close(){if(el)el.style.display='none';armedId=null}
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&el&&el.style.display!=='none'&&document.activeElement&&el.contains(document.activeElement)){close();e.stopPropagation()}},true);
 window.addEventListener('resize',()=>{if(el&&el.style.display!=='none')place()});
 window.CAD2D_BLOCK_BROWSER=Object.freeze({open,close});
 const EXT=window.CAD2D_EXTENSIONS;
 if(EXT?.commands)for(const k of ['BLOCKBROWSER','BB','GALERIA','GALLERY','EXPLORADORBLOQUES'])EXT.commands[k]=open;
 // Botón grande en la cinta (Inicio y Arquitectura) y en la barra rápida.
 const ico='<rect x="2" y="3" width="6" height="6" rx="1"/><rect x="9" y="3" width="6" height="6" rx="1"/><rect x="16" y="3" width="6" height="6" rx="1"/><rect x="2" y="11" width="6" height="6" rx="1"/><rect x="9" y="11" width="6" height="6" rx="1"/><rect x="16" y="11" width="6" height="6" rx="1"/><path d="M4 21h16"/>';
 try{CORE.ribbon.add('home','BLOCKS+',[{id:'blockBrowser',label:T('Block browser','Explorador'),icon:ico,run:open}]);CORE.ribbon.add('arq','BLOCKS+',[{id:'blockBrowser',label:T('Block browser','Explorador'),icon:ico,run:open}]);CORE.ribbon.rebuild()}catch(e){console.warn(e)}
 const qb=document.querySelector('#cadQuickBar [data-qb=blocks]');if(qb){const n=qb.cloneNode(true);n.title=T('Block browser · BB','Explorador de bloques · BB');n.addEventListener('click',e=>{e.stopPropagation();open()});qb.replaceWith(n)}
})();
