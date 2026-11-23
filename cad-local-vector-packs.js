/* CAD2D3D: import selected original DXF line geometry locally. No network uploads. */
(function(){
'use strict';
const L=window.CAD2D_ARQ_LIBRARY,CORE=window.CAD2D_CORE;
if(!L||!CORE||window.CAD2D_LOCAL_VECTOR_PACKS)return;
const DB='cad2d3d-local-vector-packs-v1',STORE='blocks';
const safe=s=>String(s||'').replace(/[^\p{L}\p{N} _.,·()\-]/gu,' ').trim().slice(0,120);
const say=m=>CORE.toast(m);
const format='cad2d3d-vector-pack-v1';
let busy=false,restoring=null;
function db(){return new Promise((ok,fail)=>{
 const r=indexedDB.open(DB,1);
 r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE,{keyPath:'id'});};
 r.onsuccess=()=>ok(r.result);r.onerror=()=>fail(r.error);
});}
async function readAll(){const d=await db();return new Promise((ok,fail)=>{
 const tx=d.transaction(STORE,'readonly'),r=tx.objectStore(STORE).getAll();
 r.onsuccess=()=>ok(r.result);r.onerror=()=>fail(r.error);
 tx.oncomplete=()=>d.close();tx.onabort=()=>{d.close();fail(tx.error)};
});}
async function persist(rows){const d=await db();return new Promise((ok,fail)=>{
 const tx=d.transaction(STORE,'readwrite'),st=tx.objectStore(STORE);
 for(const row of rows){const r=st.get(row[0]);r.onsuccess=()=>{if(!r.result)st.add({id:row[0],row})};}
 tx.oncomplete=()=>{d.close();ok()};tx.onabort=()=>{d.close();fail(tx.error)};tx.onerror=()=>{d.close();fail(tx.error)};
});}
function validate(r){
 if(!Array.isArray(r)||r.length!==9)return null;
 const [id,source,name,cat,w,d,data,hash,omitted]=r;
 if(typeof id!=='string'||!/^userdx4-[a-f0-9]{20}$/.test(id)||
 typeof source!=='string'||source.length>250||!safe(source)||
 typeof data!=='string'||data.length>120000||data.length<80||!/^[A-Za-z0-9+/]+={0,2}$/.test(data)||
 !Number.isFinite(w)||!Number.isFinite(d)||w<.001||d<.001||w>100||d>100||
 typeof hash!=='string'||!(/^[a-f0-9]{24}$/.test(hash))||omitted!==0)return null;
 try{const n=atob(data).length;if(n%8||n<64||n>80000)return null;}catch(e){return null;}
 return [id,safe(source).toLowerCase(),safe(name)||'Bloque DXF',safe(cat)||'Otros',w,d,data,hash,0];
}
function known(){
 return {ids:new Set(L.library.map(x=>x.id)),sources:new Set(L.library.map(x=>String(x.source||'').trim().toLowerCase()).filter(Boolean)),hashes:new Set(L.library.map(x=>String(x.sourceHash||'')).filter(Boolean))};
}
function filterNew(rows){const k=known(),result=[];
 for(const row of rows){const [id,source,,,,,,hash]=row;
 if(k.ids.has(id)||k.sources.has(source)||k.hashes.has(hash))continue;
 k.ids.add(id);k.sources.add(source);k.hashes.add(hash);result.push(row);
 }return result;
}
function register(rows){
 const fresh=filterNew(rows);
 for(const [id,source,name,cat,w,d,data,hash] of fresh){
 L.library.push({id,source,name,cat,w,d,family:'DXF importado localmente',sourceHash:hash,
  originalDXF:true,nominalDimensions:true,hideFromGallery:false,pro:false,paidOnly:false,
  wMin:w,wMax:w,dMin:d,dMax:d,lockAspect:true,
  author:'Archivo DXF aportado por el usuario · verificar escala',
  gen(b,W,D){
   // Decode on demand; no expansion of all imported rows into objects.
   const s=atob(data);for(let i=0;i+7<s.length;i+=8){
    const u=j=>s.charCodeAt(i+j)|(s.charCodeAt(i+j+1)<<8);
    b.line(u(0)/65535*W,u(2)/65535*D,u(4)/65535*W,u(6)/65535*D);
   }
  }
 });
 if(!L.categories.includes(cat))L.categories.push(cat);
 }
 return fresh.length;
}
function refresh(){
 window.CAD2D_ARQ_REFRESH?.();
 window.CAD2D_BLOCK_BROWSER?.refresh?.();
}
async function loadExisting(){
 const p=window.CAD2D_OLYMPIADAS3;
 if(p&&p.loaded<p.total){const out=await p.load();if(out.loaded!==p.total)throw Error('No se completó la carga de la biblioteca existente. Reintentá antes de importar para evitar duplicados.');}
}
async function restore(){
 if(restoring)return restoring;
 restoring=(async()=>{
  const stored=await readAll();if(!stored.length)return 0;
  await loadExisting();
  const count=register(stored.map(x=>validate(x.row)).filter(Boolean));if(count)refresh();return count;
 })().catch(e=>{console.warn('DXF local',e);return 0});
 return restoring;
}
async function importFile(file){
 if(busy)return;
 if(!file||file.size>20000000)throw Error('Paquete demasiado grande (máximo 20 MB).');
 busy=true;
 try{
  say('Validando paquete DXF…');
  const pack=JSON.parse(await file.text());
  if(pack.format!==format||!Array.isArray(pack.rows)||pack.rows.length>3000)throw Error('Formato de biblioteca no válido.');
  const rows=pack.rows.map(validate).filter(Boolean);
  if(!rows.length)throw Error('No hay bloques vectoriales válidos.');
  await restore();await loadExisting();
  const fresh=filterNew(rows);
  if(fresh.length)await persist(fresh);
  const added=register(fresh);refresh();
  say('DXF local: '+added+' nuevos · '+(rows.length-added)+' duplicados · '+(pack.rows.length-rows.length)+' no válidos. Verificá escala.');
  return {added,duplicates:rows.length-added,invalid:pack.rows.length-rows.length};
 }finally{busy=false;}
}
function choose(){
 if(busy)return;
 const input=document.createElement('input');input.type='file';input.accept='.json,application/json';
 input.addEventListener('change',()=>{if(input.files?.[0])importFile(input.files[0]).catch(e=>say('Importación DXF: '+e.message));},{once:true});
 input.click();
}
window.CAD2D_LOCAL_VECTOR_PACKS=Object.freeze({choose,importFile,restore});
const ext=window.CAD2D_EXTENSIONS;if(ext?.commands)ext.commands.IMPORTBLOCKPACK=choose;
restore();
})();