/* Blackline CAD · Navegación táctil para celular y tablet.
 * Dos dedos: zoom (pellizco) y desplazamiento. Un dedo con la herramienta de
 * selección: desplazar el plano. Doble toque: zoom a la extensión del dibujo.
 * Con una herramienta de dibujo activa, un dedo sigue dibujando como el mouse. */
(()=>{'use strict';
const core=window.CAD2D_CORE;if(!core||!core.canvas)return;
const cv=core.canvas;cv.style.touchAction='none';
let pinch=null,pan=null,lastTap=0;const touchIds=new Set();
// Con selección activa, el dedo navega: no abre ventanas de selección. Con dos dedos nunca se dibuja.
['pointerdown','pointermove','pointerup','pointercancel'].forEach(t=>cv.addEventListener(t,e=>{
 if(e.pointerType!=='touch')return;
 if(t==='pointerdown')touchIds.add(e.pointerId);
 const block=core.state.tool==='select'||touchIds.size>1||pinch;
 if(t==='pointerup'||t==='pointercancel')touchIds.delete(e.pointerId);
 if(block)e.stopImmediatePropagation();
},true));
const rel=t=>{const r=cv.getBoundingClientRect();return{x:t.clientX-r.left,y:t.clientY-r.top}};
const mid=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
const dst=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const v=()=>core.state.view;
const startPinch=ts=>{const a=rel(ts[0]),b=rel(ts[1]),m=mid(a,b),w=core.world(m);pinch={d0:Math.max(dst(a,b),1),s0:v().scale,wx:w.x,wy:w.y};pan=null};
cv.addEventListener('touchstart',e=>{
 if(e.touches.length>=2){e.preventDefault();startPinch(e.touches);return}
 if(e.touches.length===1&&core.state.tool==='select'){
  const now=performance.now();
  if(now-lastTap<300){e.preventDefault();lastTap=0;core.zoomExtents();return}
  lastTap=now;const p=rel(e.touches[0]);pan={x:p.x,y:p.y,moved:false};
 }
},{passive:false});
cv.addEventListener('touchmove',e=>{
 if(pinch&&e.touches.length>=2){e.preventDefault();
  const a=rel(e.touches[0]),b=rel(e.touches[1]),m=mid(a,b);
  const s=Math.min(Math.max(pinch.s0*dst(a,b)/pinch.d0,1e-6),1e6);
  const V=v();V.scale=s;V.ox=m.x-pinch.wx*s;V.oy=m.y+pinch.wy*s;core.schedule();return}
 if(pan&&e.touches.length===1){
  const p=rel(e.touches[0]),dx=p.x-pan.x,dy=p.y-pan.y;
  if(!pan.moved&&Math.hypot(dx,dy)<6)return;
  e.preventDefault();pan.moved=true;const V=v();V.ox+=dx;V.oy+=dy;pan.x=p.x;pan.y=p.y;core.schedule()}
},{passive:false});
const end=e=>{if(e.touches.length<2)pinch=null;if(e.touches.length===0){if(pan&&pan.moved)e.preventDefault();pan=null}
 else if(e.touches.length>=2)startPinch(e.touches)};
cv.addEventListener('touchend',end,{passive:false});cv.addEventListener('touchcancel',end,{passive:false});
})();
