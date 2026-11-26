/* Blackline CAD · Barra de comandos redimensionable.
   Un agarre aparece en el borde superior al pasar el mouse; arrastrándolo hacia arriba
   la barra crece y muestra más historial de comandos (como en los CAD de escritorio). Doble clic: vuelve al tamaño mínimo. */
(function(){
 'use strict';
 const cmd=document.querySelector('.app .cmd');
 if(!cmd||document.getElementById('cadCmdGrip'))return;
 const KEY='cad2d-cmd-history-height',MIN=0,MAX=()=>Math.max(120,Math.round(window.innerHeight*.55));
 let h=0;try{h=Math.max(0,Number(localStorage.getItem(KEY))||0)}catch(e){}
 const css=document.createElement('style');
 css.textContent=`
.app .cmd{position:relative;overflow:visible!important}
#cadCmdGrip{position:absolute;left:50%;top:-7px;transform:translateX(-50%);width:120px;height:12px;border-radius:7px;cursor:ns-resize;z-index:40;
 display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .15s;background:#1b252d;border:1px solid #3b4f5d;touch-action:none}
#cadCmdGrip::before{content:'';width:34px;height:3px;border-radius:2px;background:#8fa6b4;box-shadow:0 -4px 0 -1px transparent}
.app .cmd:hover #cadCmdGrip,#cadCmdGrip:focus-visible,#cadCmdGrip.drag,#cadCmdHistory:hover~#cadCmdGrip{opacity:1}
#cadCmdHistory{position:absolute;left:0;right:0;bottom:100%;margin-bottom:2px;z-index:60;overflow-y:auto;padding:6px 12px;
 background:#0d1418;border:1px solid #2f3c46;border-radius:8px 8px 0 0;font:12px/1.55 ui-monospace,Menlo,Consolas,monospace;color:#c7d3da;box-shadow:0 -6px 18px rgba(0,0,0,.25)}
#cadCmdHistory[hidden]{display:none}
#cadCmdHistory div{white-space:pre-wrap}
#cadCmdHistory div:last-child{color:#f0dcae}
.bl-light #cadCmdGrip{background:#ffffff;border-color:#c9d2d9}
.bl-light #cadCmdGrip::before{background:#7d8d98}
.bl-light #cadCmdHistory{background:#ffffff;border-color:#d5dbe0;color:#33424d;box-shadow:0 -6px 18px rgba(30,40,50,.12)}
.bl-light #cadCmdHistory div:last-child{color:#8a5d12}`;
 document.head.append(css);
 const grip=document.createElement('div');grip.id='cadCmdGrip';grip.setAttribute('role','separator');grip.setAttribute('aria-orientation','horizontal');
 grip.tabIndex=0;grip.title='Arrastrar para cambiar el alto de la barra de comandos · doble clic: mínimo';
 const hist=document.createElement('div');hist.id='cadCmdHistory';hist.setAttribute('aria-live','polite');
 cmd.prepend(hist);cmd.append(grip);
 const logs=()=>window.CAD2D_CORE?.state?.logs||[];
 const esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
 function paint(){
  hist.hidden=h<24;if(hist.hidden)return;
  hist.style.height=h+'px';
  hist.innerHTML=logs().map(x=>`<div>${esc(x)}</div>`).join('');
  hist.scrollTop=hist.scrollHeight;
 }
 function set(v,save){h=Math.max(MIN,Math.min(MAX(),Math.round(v)));if(h<24)h=0;paint();if(save)try{localStorage.setItem(KEY,String(h))}catch(e){}}
 let start=null;
 grip.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();start={y:e.clientY,h:h||0};grip.classList.add('drag');grip.setPointerCapture(e.pointerId)});
 grip.addEventListener('pointermove',e=>{if(!start)return;set(start.h+(start.y-e.clientY),false)});
 const end=e=>{if(!start)return;start=null;grip.classList.remove('drag');set(h,true)};
 grip.addEventListener('pointerup',end);grip.addEventListener('pointercancel',end);
 grip.addEventListener('dblclick',()=>set(h?0:180,true));
 grip.addEventListener('keydown',e=>{if(e.key==='ArrowUp'){set(h+24,true);e.preventDefault()}else if(e.key==='ArrowDown'){set(h-24,true);e.preventDefault()}});
 for(const ev of['pointerdown','wheel','contextmenu'])hist.addEventListener(ev,e=>e.stopPropagation());
 window.addEventListener('cad2d-log',paint);
 window.addEventListener('resize',()=>set(h,false));
 setTimeout(paint,0);
})();
