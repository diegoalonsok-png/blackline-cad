/* CAD2D3D — non-destructive on-demand loading of Olimpiadas (3) 2D source drawings.
   The original CAD library, toolbars and CAD3D geometry are not changed.
   All blocks live as source-preserving independent definitions, never overwritten. */
(function(){
 'use strict';
 if(window.CAD2D_OLYMPIADAS3)return;
 const TOTAL=16,ready=new Set(),errors=new Set();
 let inFlight=null;
 const API={total:TOTAL,loaded:0,added:0,errors:[],loading:false,load,refresh};
 window.CAD2D_OLYMPIADAS3=API;
 function refresh(){
  const parts=window.CAD2D_OLYMPIADAS3_PROGRESS||[];
  API.loaded=ready.size;
  API.added=parts.reduce((sum,p)=>sum+(Number(p.added)||0),0);
  API.errors=Array.from(errors);
  window.CAD2D_ARQ_REFRESH?.();
  window.CAD2D_BLOCK_BROWSER?.refresh?.();
 }
 function script(part){
  if(ready.has(part))return Promise.resolve();
  return new Promise((resolve,reject)=>{
   const name=String(part).padStart(2,'0');
   const el=document.createElement('script');
   el.src='assets/cad2d-olimpiadas3-'+name+'.js?v=20261123-bloques1251';
   el.async=true;
   el.onload=()=>{ready.add(part);errors.delete(part);resolve();};
   el.onerror=()=>{el.remove();errors.add(part);reject(Error('No se pudo abrir el paquete '+name));};
   document.head.appendChild(el);
  });
 }
 function stretch(v,source,target,band){
  if(!(source>0&&target>0))return v;
  const b=Math.min(band,source*.19,target*.19);
  if(v<=b)return v;
  if(v>=source-b)return target-source+v;
  return b+(v-b)*(target-2*b)/(source-2*b);
 }
 function upgradeOpenings(){
  const L=window.CAD2D_ARQ_LIBRARY;
  if(!L)return;
  // Reuse the current CAD2D dynamic grips and block regeneration pipeline.
  window.CAD2D_DYNAMIC_OPENINGS?.enhance?.();
  for(const item of L.library){
   if(!/^olymp3-ca-puerta-elev/.test(item.id)||item.olymp3Parametric)continue;
   const original=item.gen,srcW=item.w,srcH=item.d;
   item.gen=function(builder,W,H){
    // Fixed-size frame borders: alter internal panel widths/heights without
    // deforming the hinges, outer frame or handle stroke bands.
    const mapped={line(x1,y1,x2,y2){
      return builder.line(stretch(x1,srcW,W,.045),stretch(y1,srcH,H,.06),
       stretch(x2,srcW,W,.045),stretch(y2,srcH,H,.06));
    }};
    return original(mapped,srcW,srcH);
   };
   item.wMin=srcW*.55;item.wMax=srcW*2.15;
   item.dMin=srcH*.72;item.dMax=srcH*1.40;item.lockAspect=false;
   item.olymp3Parametric=true;
  }
 }
 async function load(){
  if(inFlight)return inFlight;
  if(!window.CAD2D_ARQ_LIBRARY)return Promise.reject(Error('Debe cargarse antes la biblioteca CAD2D'));
  API.loading=true;
  inFlight=(async()=>{
   for(let first=1;first<=TOTAL;first+=4){
    const jobs=[];
    for(let k=first;k<Math.min(first+4,TOTAL+1);k++)
     if(!ready.has(k))jobs.push(script(k).catch(()=>null));
    if(jobs.length)await Promise.all(jobs);
    upgradeOpenings();refresh();
   }
   API.loading=false;
   if(errors.size)console.warn('Olimpiadas 3: quedaron paquetes pendientes',Array.from(errors));
   return {loaded:ready.size,added:API.added,errors:API.errors};
  })();
  try{return await inFlight;}finally{inFlight=null;}
 }
})();
