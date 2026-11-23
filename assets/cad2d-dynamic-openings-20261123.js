/* Blackline CAD2D — unified dynamic doors/windows, 2026-11-23.
   Updates metadata only. Keeps each author's linework and IDs unchanged.
   Never imports unlicensed manufacturer files, and leaves hidden QA blocks hidden.
   Grips, regeneration, variants and Ctrl+Z are handled by existing CAD2D systems. */
(function(){
'use strict';
const A=window.CAD2D_ARQ_LIBRARY;
if(!A||!Array.isArray(A.library))return;
const rxOpen=/puerta|port[oó]n|ventana|ventanal|muro cortina|carpinter(?:ía|ia)|abertura|paño fijo|pano fijo|banderola|corrediz|persiana|door|window|dvh/i;
const rxDoor=/puerta|portón|porton|door/i;
const rxSection=/corte|secci[oó]n|section|umbral|jamba|perfil/i;
const rxElevation=/alzado|elevaci[oó]n|vista (?:frontal|posterior|lateral)|view|frente|elevation/i;
let changed=0,doors=0,windows=0,sections=0;
function enhance(){
for(const it of A.library){
 if(it?.dynamicOpening)continue;
 if(!it||!it.id||!it.name||!(it.w>0&&it.d>0)||typeof it.gen!=='function')continue;
 if(/\b(?:roca|ferrum)\b/i.test([it.name,it.author,it.source].join(' ')))continue;
 const name=String(it.name),cat=String(it.cat||'');
 // Avoid furniture such as wardrobes with doors and drawing symbols that
 // merely say "number of door", not an architectural opening.
 const knownCat=cat==='Carpinterías'||cat==='Aberturas'||cat==='Puertas y ventanas';
 const marked=/^(?:alz-(?:puerta|ventana)|views26-(?:door|window|section)|dk-(?:puerta|ventana|pano|corrediza)|cv-ventana)/.test(it.id);
 if(!knownCat&&!marked&&!(rxOpen.test(name)&&/^(?:puerta|ventana|ventanal|paño fijo|pano fijo|portón|porton|carpintería|carpinteria)/i.test(name)))continue;
 if(!rxOpen.test(name)&&!knownCat)continue;
 const kind=rxDoor.test(name)?'door':'window';
 const projection=rxSection.test(name)?'section':(rxElevation.test(name)||cat==='Alzados')?'elevation':'plan';
 // CAD-plan drawings carry swing arcs and rails: keep isotropic proportions.
 // In elevations, width and height can be edited separately.
 const proportional=projection==='plan';
 const axis=proportional&&it.d>it.w*1.15?'d':'w';
 it.dynamicOpening={kind,projection,axis,sourceW:it.w,sourceD:it.d};
 it.dynamicAxis=axis;
 if(proportional){
  it.lockAspect=true;
  it.wMin=it.w*.5;it.wMax=it.w*2.5;
  it.dMin=it.d*.5;it.dMax=it.d*2.5;
 }else if(projection==='elevation'){
  it.lockAspect=false;
  if(!(it.wMax>it.wMin)){it.wMin=it.w*.5;it.wMax=it.w*2.5}
  if(!(it.dMax>it.dMin)){it.dMin=it.d*.65;it.dMax=it.d*1.6}
 }else{
  // Section details stay drawn at their author's scale; dimensional grips only
  // where the author already provided parametrically supported ranges.
  it.lockAspect=false;
 }
 // Group compatible opening drawings, but leave hidden draft definitions and
 // authored grouped families untouched.
 if(cat==='Carpinterías'&&(it.family===it.id||!it.family))
  it.family='blackline-opening-'+kind+'-plan';
 changed++;if(kind==='door')doors++;else windows++;if(projection==='section')sections++;
}
 return changed;
}
enhance();
window.CAD2D_DYNAMIC_OPENINGS=Object.freeze({version:20261123,enhance,
 get count(){return changed},get doors(){return doors},
 get windows(){return windows},get sections(){return sections}
});
})();