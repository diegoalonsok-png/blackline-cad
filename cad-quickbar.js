/* Barra rápida flotante y horizontal (estilo paleta compacta): zoom +, zoom −, zoom extensión,
   texto, cotas, PDF, bloques y sombreado. Se arrastra desde el asa; la posición se recuerda. */
(function(){
 'use strict';
 const CORE=window.CAD2D_CORE;if(!CORE||document.getElementById('cadQuickBar'))return;
 const wrap=document.getElementById('canvasWrap');if(!wrap)return;
 const run=cmd=>()=>CORE.command(cmd);
 const click=id=>()=>document.getElementById(id)?.click();
 const svg=d=>`<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
 const items=[
  ['zoomIn','Zoom +','<circle cx="10" cy="10" r="6.5"/><path d="m15 15 6 6M10 7v6M7 10h6"/>',click('zoomIn')],
  ['zoomOut','Zoom −','<circle cx="10" cy="10" r="6.5"/><path d="m15 15 6 6M7 10h6"/>',click('zoomOut')],
  ['zoomExt','Zoom extents · ZE','<path d="M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5"/><rect x="8" y="8" width="8" height="8" rx="1"/>',run('ZOOMEXTENTS')],
  null,
  ['text','Text · T','<path d="M5 5h14M12 5v14M9 19h6"/>',run('TEXT')],
  ['dimension','Cota / Dimension · DIM','<path d="M4 5v14M20 5v14M4 12h16m-13-3-3 3 3 3m10-6 3 3-3 3"/>',run('DIM')],
  ['hatch','Hatch · H (patterns & gradient)','<rect x="3.5" y="3.5" width="17" height="17" rx="2"/><path d="M3.5 10 10 3.5M3.5 16.5 16.5 3.5M7 20.5 20.5 7M13.5 20.5l7-7"/>',run('HATCH')],
  ['blocks','Blocks · gallery','<rect x="3" y="3" width="7.5" height="7.5" rx="1"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1"/>',()=>{const b=document.querySelector('[data-tool="blockgallery"]');if(b)b.click();else window.CAD2D_ARQ?.openGallery?.()}],
  ['pdf','Plot / PDF · Ctrl+P','<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/><text x="7.3" y="17" font-size="5.4" font-weight="700" font-family="Arial" fill="currentColor" stroke="none">PDF</text>',run('PLOT')],
  null,
  ['arqassist','ARQASSIST · Show / hide architectural AI','<path d="M3 21V5h18v16H3zM3 13h8V5M11 13h10M11 13v4"/><path d="M15 21v-4h6"/>',()=>{const toggle=window.CAD2D_EXTENSIONS?.toggleArchitectureBar;if(toggle)toggle();else CORE.command('ARQASSIST')}]
 ];
 const css=document.createElement('style');
 css.textContent=`:is(#cadQuickBar,#cadArqInstructionBar){position:absolute;z-index:40;display:flex;align-items:center;gap:2px;padding:5px 8px 5px 4px;border-radius:999px;background:#202326;border:1.5px solid #7c838a;box-shadow:0 8px 22px #0008;user-select:none;touch-action:none}
:is(#cadQuickBar,#cadArqInstructionBar) button{all:unset;cursor:pointer;width:34px;height:34px;display:grid;place-items:center;border-radius:50%;color:#f2f5f7}
:is(#cadQuickBar,#cadArqInstructionBar) button:hover{background:#3a4046}
#cadQuickBar button.arq-toggle-active{background:#3a4046;color:#9adff3}
:is(#cadQuickBar,#cadArqInstructionBar) button:focus-visible{outline:2px solid #9adff3}
:is(#cadQuickBar,#cadArqInstructionBar) svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
:is(#cadQuickBar,#cadArqInstructionBar) .qb-handle{cursor:grab;width:22px;color:#c9d0d6;font-size:15px;letter-spacing:-2px}
:is(#cadQuickBar,#cadArqInstructionBar) .qb-handle:active{cursor:grabbing}
:is(#cadQuickBar,#cadArqInstructionBar) .qb-sep{width:1px;height:22px;background:#4e555c;margin:0 4px}
:is(#cadQuickBar,#cadArqInstructionBar).qb-min button:not(.qb-handle):not(.qb-toggle),:is(#cadQuickBar,#cadArqInstructionBar).qb-min .qb-sep{display:none}
.bl-light :is(#cadQuickBar,#cadArqInstructionBar){background:#ffffff;border-color:#9aa6ae}
.bl-light :is(#cadQuickBar,#cadArqInstructionBar) button{color:#18232b}
.bl-light :is(#cadQuickBar,#cadArqInstructionBar) button:hover{background:#e6edf2}`;
 document.head.append(css);
 const bar=document.createElement('div');bar.id='cadQuickBar';bar.setAttribute('role','toolbar');bar.setAttribute('aria-label','Quick CAD bar');
 const handle=document.createElement('button');handle.className='qb-handle';handle.type='button';handle.title='Drag to move · double-click to collapse';handle.textContent='⠿';bar.append(handle);
 for(const it of items){
  if(!it){const s=document.createElement('span');s.className='qb-sep';bar.append(s);continue}
  const [id,title,d,fn]=it,b=document.createElement('button');b.type='button';b.dataset.qb=id;b.title=title;b.setAttribute('aria-label',title);b.innerHTML=svg(d);
  b.addEventListener('click',e=>{e.stopPropagation();try{fn()}catch(err){CORE.toast(String(err?.message||err))}});bar.append(b);
 }
 wrap.append(bar);
 const KEY='cad2d-quickbar-pos';
 const place=(x,y)=>{const W=wrap.clientWidth,H=wrap.clientHeight,w=bar.offsetWidth,h=bar.offsetHeight;x=Math.max(4,Math.min(W-w-4,x));y=Math.max(4,Math.min(H-h-4,y));bar.style.left=x+'px';bar.style.top=y+'px';return [x,y]};
 let pos=null;try{pos=JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){}
 requestAnimationFrame(()=>{if(pos)place(pos[0],pos[1]);else place((wrap.clientWidth-bar.offsetWidth)/2,wrap.clientHeight-bar.offsetHeight-58)});
 window.addEventListener('resize',()=>{const r=[bar.offsetLeft,bar.offsetTop];place(r[0],r[1])});
 let drag=null;
 handle.addEventListener('pointerdown',e=>{drag={dx:e.clientX-bar.offsetLeft,dy:e.clientY-bar.offsetTop};handle.setPointerCapture(e.pointerId);e.preventDefault();e.stopPropagation()});
 handle.addEventListener('pointermove',e=>{if(drag)place(e.clientX-drag.dx,e.clientY-drag.dy)});
 handle.addEventListener('pointerup',()=>{if(!drag)return;drag=null;try{localStorage.setItem(KEY,JSON.stringify([bar.offsetLeft,bar.offsetTop]))}catch(e){}});
 handle.addEventListener('dblclick',()=>bar.classList.toggle('qb-min'));
 // Que los clics en la barra no lleguen al dibujo.
 for(const ev of ['pointerdown','mousedown','contextmenu','wheel'])bar.addEventListener(ev,e=>e.stopPropagation());
})();
