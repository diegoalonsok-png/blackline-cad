/* Visual cursor profiles. Only drawing/editing mode changes; never model geometry. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.BlacklineCursorMode=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const DEFAULT_SIZE=9;
 const normalizeSize=n=>Number.isFinite(Number(n))?Math.max(5,Math.min(60,Math.round(Number(n)))):DEFAULT_SIZE;
 const selectorTools=new Set(['erase','trim','trimScissor','extend','breakLine','lengthen','peditMove','peditInsert','chamfer','fillet','matchprop','stretch']);
 const selectorMode=(tool,candidate)=>tool==='offset'?!candidate:selectorTools.has(tool);
 // CAD cursor: idle = crosshair + pickbox, point input = crosshair,
 // entity selection = pickbox only. Geometry and snaps are unaffected.
 const mode=(tool,candidate,drag)=>{
  if(drag==='pan')return 'pan';
  if(drag==='wallMiddleGrip'||drag==='blockGrip')return 'grip';
  if(tool==='select'||!tool)return 'idle';
  return selectorMode(tool,candidate)?'selector':'drawing';
 };
 const hitRadius=size=>Math.max(9,Math.ceil(normalizeSize(size)/2)+3);
 return Object.freeze({DEFAULT_SIZE,normalizeSize,selectorMode,mode,hitRadius});
});
