/* Blackline CAD3D: geometric rules for editable openings (meters).
 * Pure model: no WebGL required to test. No dependence on CAD2D. */
(function(root){
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function mechanism(kind,style){
 const id=String(style||'').toLowerCase();
 if(kind==='opening'||id==='open-door')return 'none';
 if(kind==='door'){
  if(id==='garage-door')return 'garage';
  if(id==='sliding-pocket')return 'pocket';
  if(/sliding|terrace/.test(id))return 'sliding';
  if(id==='pivot-door')return 'pivot';
  if(/double|french/.test(id))return 'double';
  return 'hinged';
 }
 if(kind==='window'){
  if(/fixed|clerestory|ribbon|floor-to-ceiling/.test(id))return 'fixed';
  if(/sliding/.test(id))return 'sliding';
  if(/double-window|double-casement/.test(id))return 'double';
  if(id==='awning')return 'awning';
  if(/hopper|bathroom/.test(id))return 'hopper';
  return 'hinged';
 }
 return 'none';
}
function normalize(o){
 const mode=mechanism(o.kind,o.styleId);
 const pct=mode==='none'||mode==='fixed'?0:clamp(Number.isFinite(Number(o.openPct))?Number(o.openPct):0,0,100);
 return {mode,openPct:pct,hinge:o.hinge==='right'||/right/.test(o.styleId||'')?'right':'left',
  swing:o.swing==='out'?'out':'in',operable:mode!=='fixed'&&mode!=='none'};
}
const part=(w,d,h,x,y,z,color)=>({w,d,h,x,y,z,color});
function layout(host,o){
 const config=normalize(o),mode=config.mode,w=Math.max(.06,Number(o.w)||.90),h=Math.max(.08,Number(o.h)||2.10);
 if(mode==='none')return {config,frame:[],leaves:[]};
 const isDoor=o.kind==='door',f=Math.min(.055,w*.11,h*.11),innerW=Math.max(.025,w-2*f),
  baseZ=isDoor?0:f,innerH=Math.max(.025,h-baseZ-f),depth=Math.min(.32,Math.max(.06,(Number(host.d)||.2)+.02)),
  glass=0x54899e,trim=0x96a7b3,panelColor=isDoor?(/french|terrace/.test(o.styleId||'')?glass:0x937965):glass,
  pct=config.openPct/100,angle=pct*Math.PI/2;
 const frame=[part(f,depth,h,-w/2+f/2,0,0,trim),part(f,depth,h,w/2-f/2,0,0,trim),
  part(w,depth,f,0,0,h-f,trim)];
 if(!isDoor)frame.push(part(w,depth,f,0,0,0,trim));
 const leaves=[];
 function leaf(px,py,pz,rx,rz,boxes){
  leaves.push({pivot:{x:px,y:py,z:pz},rotation:{x:rx,y:0,z:rz},boxes});
 }
 const panelD=isDoor?.045:.033;
 function face(width,height,cx,cy,cz){
  return [part(Math.max(.015,width),panelD,Math.max(.015,height),cx,cy,cz,panelColor)];
 }
 if(mode==='fixed'){
  leaf(0,0,0,0,0,face(innerW,innerH,0,0,baseZ));
 }else if(mode==='hinged'||mode==='pivot'||mode==='double'){
  const direction=config.swing==='out'?-1:1,hand=config.hinge==='right'?-1:1;
  if(mode==='double'){
   const panelW=innerW/2;
   leaf(-innerW/2,0,0,0,direction*angle,face(panelW,innerH,panelW/2,0,baseZ));
   leaf(innerW/2,0,0,0,-direction*angle,face(panelW,innerH,-panelW/2,0,baseZ));
  }else if(mode==='pivot'){
   const pivot=-innerW/2+innerW*.23;
   leaf(pivot,0,0,0,direction*hand*angle,face(innerW,innerH,-pivot,0,baseZ));
  }else{
   const hinge=config.hinge==='left'?-innerW/2:innerW/2;
   leaf(hinge,0,0,0,direction*hand*angle,face(innerW,innerH,-hinge,0,baseZ));
  }
 }else if(mode==='sliding'){
  const half=innerW/2,dir=config.hinge==='right'?1:-1;
  const fixedX=dir<0?-innerW/4:innerW/4;
  leaf(fixedX,-panelD/2,0,0,0,face(half,innerH,0,0,baseZ));
  leaf(-fixedX+dir*(half*pct),panelD/2,0,0,0,face(half,innerH,0,0,baseZ));
 }else if(mode==='pocket'){
  const hand=config.hinge==='right'?1:-1;
  leaf(hand*innerW*pct,0,0,0,0,face(innerW,innerH,0,0,baseZ));
 }else if(mode==='awning'||mode==='hopper'){
  const top=mode==='awning',hingeZ=top?h-f:baseZ;
  leaf(0,0,hingeZ,top?angle:-angle,0,face(innerW,innerH,0,0,top?-innerH/2:innerH/2));
 }else if(mode==='garage'){
  // Sectional door follows a simplified vertical-to-overhead track.
  const panels=5,sectionH=innerH/panels;
  for(let i=0;i<panels;i++){
   const pos=(i+.5)*sectionH+innerH*pct,over=Math.max(0,pos-innerH);
   if(over>0)leaf(0,-over,h-f,Math.PI/2,0,face(innerW,sectionH,0,0,0));
   else leaf(0,0,baseZ+pos,0,0,face(innerW,sectionH,0,0,0));
  }
 }
 return {config,frame,leaves};
}
const api=Object.freeze({mechanism,normalize,layout});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.BlacklineCAD3DCarpentry=api;
})(typeof window!=='undefined'?window:globalThis);
