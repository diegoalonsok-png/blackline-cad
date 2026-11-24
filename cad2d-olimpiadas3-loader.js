/* CAD2D3D — non-destructive on-demand loading of Olimpiadas (3) 2D source drawings.
   The original CAD library, toolbars and CAD3D geometry are not changed.
   All blocks live as source-preserving independent definitions, never overwritten. */
(function(){
 'use strict';
 if(window.CAD2D_OLYMPIADAS3)return;
 const TOTAL=16,ready=new Set(),errors=new Set();
 let inFlight=null;
 let catalogPromise=null;
 const catalogRows=new Map(),pendingBlocks=new Map();
 const API={total:TOTAL,loaded:0,added:0,errors:[],loading:false,load,refresh,loadCatalog,ensureBlock,get catalog(){return Array.from(catalogRows.values())},get catalogReady(){return catalogRows.size>1000}};
 async function loadCatalog(){
  if(catalogPromise)return catalogPromise;
  catalogPromise=(async()=>{
   const response=await fetch('/assets/block-library/v1/catalog.json');
   if(!response.ok)throw Error('Catálogo CDN no disponible');
   const doc=await response.json();
   if(doc.version!==1||doc.parts!==TOTAL||!Array.isArray(doc.blocks)||doc.blocks.length<=1000||doc.blocks.length>20000)throw Error('Catálogo incompleto');
   const validated=new Map();
   for(const x of doc.blocks){
    if(!/^olymp3-[a-z0-9_-]+$/i.test(x.id)||typeof x.source!=='string'||typeof x.name!=='string'||typeof x.category!=='string'||[x.name,x.category,x.source].some(v=>v.length>250||/[<>"&]/.test(v))||!Number.isFinite(x.width)||x.width<=0||!Number.isFinite(x.depth)||x.depth<=0||!(/^[a-f0-9]{16,64}$/i.test(x.sourceHash))||!Number.isSafeInteger(x.segments)||x.segments<1||x.segments>100000||validated.has(x.id))throw Error('Registro inválido del catálogo');
    validated.set(x.id,{id:x.id,source:x.source,name:x.name,cat:x.category,w:x.width,d:x.depth,sourceHash:x.sourceHash,segments:x.segments,family:'Olimpiadas 3',originalDXF:true,nominalDimensions:true,hideFromGallery:false,pro:false,paidOnly:false,wMin:x.width,wMax:x.width,dMin:x.depth,dMax:x.depth,lockAspect:true,remoteCatalog:true});
   }
   // Publish metadata only once the complete catalog passes validation.
   for(const [id,row] of validated)catalogRows.set(id,row);
   return API.catalog;
  })().catch(err=>{catalogPromise=null;throw err});
  return catalogPromise;
 }
 async function ensureBlock(id){
  const L=window.CAD2D_ARQ_LIBRARY;if(!L)throw Error('Biblioteca CAD no disponible');
  const existing=L.library.find(x=>x.id===id);if(existing)return existing.id;
  if(pendingBlocks.has(id))return pendingBlocks.get(id);
  const job=(async()=>{
   await loadCatalog();
   const meta=catalogRows.get(id);if(!meta)throw Error('Bloque no encontrado');
   const response=await fetch('/assets/block-library/v1/'+encodeURIComponent(id)+'.json',{cache:'no-store'});
   if(!response.ok)throw Error('No se pudo descargar el bloque');
   const x=await response.json();
   if(x.id!==id||x.source!==meta.source||x.sourceHash!==meta.sourceHash||typeof x.data!=='string'||x.data.length>1100000)throw Error('Geometría incompatible');
   const raw=atob(x.data);if(raw.length!==meta.segments*8)throw Error('Geometría incompleta');
   const again=L.library.find(b=>b.id===id||String(b.source||'').toLowerCase()===meta.source.toLowerCase());
   if(again)return again.id;
   const item={...meta,remoteCatalog:false,author:'Colección Olimpiadas (3) · archivo aportado por el usuario',
    gen(b,W,D){for(let i=0;i+7<raw.length;i+=8){const u=j=>raw.charCodeAt(i+j)|(raw.charCodeAt(i+j+1)<<8);b.line(u(0)/65535*W,u(2)/65535*D,u(4)/65535*W,u(6)/65535*D)}}
   };
   L.library.push(item);if(!L.categories.includes(item.cat))L.categories.push(item.cat);
   upgradeOpenings();
   return item.id;
  })();
  pendingBlocks.set(id,job);try{return await job}finally{pendingBlocks.delete(id)}
 }
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
