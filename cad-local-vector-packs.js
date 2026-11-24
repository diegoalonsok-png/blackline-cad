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
 typeof hash!=='string'||!(/^[a-f0-9]{24}$/.test(hash))||(!Number.isInteger(omitted)||omitted<0||omitted>7))return null;
 try{const n=atob(data).length;if(n%8||n<64||n>80000)return null;}catch(e){return null;}
 return [id,safe(source).toLowerCase(),safe(name)||'Bloque DXF',safe(cat)||'Otros',w,d,data,hash,omitted];
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
 for(const [id,source,name,cat,w,d,data,hash,flags] of fresh){
 L.library.push({id,source,name:name+(flags&1?' · escala estimada':'')+(flags&6?' · parcial':''),cat,w,d,family:'DXF importado localmente',sourceHash:hash,
  originalDXF:true,nominalDimensions:true,importFlags:flags,hideFromGallery:false,pro:false,paidOnly:false,
  wMin:flags&1?Math.max(.001,w*.05):w,wMax:flags&1?Math.min(100,w*20):w,dMin:flags&1?Math.max(.001,d*.05):d,dMax:flags&1?Math.min(100,d*20):d,lockAspect:true,
  author:'Archivo CAD aportado por el usuario · verificar escala'+(flags&6?' · geometría recuperada parcialmente':''),
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

const METRES={1:.0254,2:.3048,4:.001,5:.01,6:1,7:1000,8:2.54e-8,9:2.54e-5,10:.9144,11:1e-10,12:1e-9,13:1e-6,14:.1};
function categoryFor(file){
 const s=(file.webkitRelativePath||file.name).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 const groups=[[/abertura|puerta|ventana|carpinter/,'Aberturas'],[/bano|bacha|bidet|inodoro|sanitari|lavatorio|ducha|banera/,'Sanitarios'],[/cocina|anafe|horno|heladera/,'Cocinas'],[/ascensor/,'Ascensores'],[/arbol|vegetacion|planta vegetal/,'Vegetación'],[/animal/,'Animales'],[/gym|deport/,'Deportes'],[/avion|barco|auto|camion|vehicul/,'Vehículos'],[/escalera/,'Escaleras'],[/mueble|silla|mesa|sofa/,'Mobiliario']];
 return groups.find(x=>x[0].test(s))?.[1]||'Importados';
}
function vectorize(entities,recover=false){
 let skipped=0;
 const lines=[],add=(a,b)=>{
  if(!a||!b||![a.x,a.y,b.x,b.y].every(Number.isFinite))throw Error('Coordenadas inválidas');
  if(a.x===b.x&&a.y===b.y)return;
  if(lines.length>=10000)throw Error('Más de 10.000 segmentos');
  lines.push([a.x,a.y,b.x,b.y]);
 };
 const poly=(p,closed)=>{for(let i=1;i<p.length;i++)add(p[i-1],p[i]);if(closed&&p.length>2)add(p.at(-1),p[0])};
 for(const e of entities){
  const before=lines.length;
  try{
  if(e.type==='line')add(e.a,e.b);
  else if(e.type==='polyline')poly(e.pts,e.closed);
  else if(recover&&e.type==='hatch'&&Array.isArray(e.pts)&&e.pts.length>=3){poly(e.pts,true);skipped++;}
  else if(e.type==='rect')poly([e.a,{x:e.b.x,y:e.a.y},e.b,{x:e.a.x,y:e.b.y}],true);
  else if(['circle','arc','ellipse'].includes(e.type)){
   const tau=2*Math.PI, a=e.type==='arc'?e.a0:0;
   const span=e.type==='arc'?((e.a1-a)%tau+tau)%tau||tau:tau;
   const rx=e.rx||e.r,ry=e.ry||e.r,rot=e.rotation||0;
   if(!(rx>0&&ry>0&&Number.isFinite(span)))throw Error('Curva inválida');
   const n=Math.max(8,Math.ceil(96*span/tau)),pts=[];
   for(let i=0;i<=n;i++){const t=a+span*i/n,x=rx*Math.cos(t),y=ry*Math.sin(t);pts.push({x:e.c.x+x*Math.cos(rot)-y*Math.sin(rot),y:e.c.y+x*Math.sin(rot)+y*Math.cos(rot)})}
   poly(pts,false);
  }else throw Error('Geometría no compatible: '+e.type);
  }catch(err){lines.length=before;if(!recover||String(err.message).includes('10.000 segmentos'))throw err;skipped++}
 }
 if(lines.length<8)throw Error('Bloque demasiado simple (menos de 8 segmentos)');
 let x=Infinity,y=Infinity,X=-Infinity,Y=-Infinity;
 for(const [a,b,c,d] of lines){x=Math.min(x,a,c);y=Math.min(y,b,d);X=Math.max(X,a,c);Y=Math.max(Y,b,d)}
 if(!(X>x&&Y>y))throw Error('Bloque sin superficie 2D');
 return {lines,x,y,dx:X-x,dy:Y-y,skipped};
}
async function hexHash(bytes){
 const digest=await crypto.subtle.digest('SHA-256',bytes);
 return Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
}
function estimatedScale(g,cat){
 const target={'Aberturas':1.2,'Sanitarios':.8,'Cocinas':2.4,'Ascensores':2,'Vegetación':5,'Animales':1,'Deportes':2,'Vehículos':5,'Escaleras':4,'Mobiliario':1.5,'Importados':2}[cat]||2;
 const major=Math.max(g.dx,g.dy);
 // Provisional only: choose a plausible conventional unit, never claim source units.
 const candidates=[1,.01,.001,.0254,.3048].filter(f=>g.dx*f>=.001&&g.dy*f>=.001&&major*f<=100);
 if(!candidates.length)return 0;
 return candidates.sort((a,b)=>Math.abs(Math.log(major*a/target))-Math.abs(Math.log(major*b/target)))[0];
}
async function fileRow(file,unknownUnit,recover=true){
 let bytes=await file.arrayBuffer(),flags=0;
 if(/\.dwg$/i.test(file.name)){
  const convert=(input,allowPartial)=>new Promise((resolve,reject)=>{
   const worker=new Worker(new URL('cad-dwg-local-worker.js?v=20261123-wasm-v4',document.baseURI),{type:'module'});
   const timer=setTimeout(()=>finish('Tiempo límite DWG'),180000);
   let done=false;
   function finish(err,out){if(done)return;done=true;clearTimeout(timer);worker.terminate();err?reject(Error(err)):resolve(out)}
   worker.onmessage=e=>finish(e.data.error,e.data.output);
   worker.onerror=e=>finish(e.message||'Error del motor DWG');
   try{worker.postMessage({bytes:input,direction:'dwg-dxf',allowPartial},[input])}catch(e){finish(e.message)}
  });
  try{bytes=await convert(bytes,false)}
  catch(e){if(!recover||!String(e.message).startsWith('AEC_OMISSIONS:'))throw e;bytes=await convert(await file.arrayBuffer(),true);flags|=4}
 }
 if(!(bytes instanceof ArrayBuffer)||!bytes.byteLength)throw Error('Archivo vacío');
 const parser=globalThis.CAD2DDxfParser;if(!parser)throw Error('Motor DXF no disponible');
 const parsed=parser.parse(new TextDecoder('windows-1252').decode(bytes),{explodeInserts:true});
 if(parsed.warnings?.length){if(!recover)throw Error('DXF incompleto: '+parsed.warnings.join(', ').slice(0,200));flags|=2}
 const g=vectorize(parsed.entities||[],recover),cat=categoryFor(file);
 if(g.skipped)flags|=2;
 let scale=METRES[parsed.unitCode]||(!parsed.unitCode&&unknownUnit>0?unknownUnit:0);
 if(!scale&&unknownUnit===-1&&!parsed.unitCode){scale=estimatedScale(g,cat);flags|=1}
 if(!scale)throw Error('Unidad no reconocida; seleccionar unidad para DXF sin escala');
 const w=+(g.dx*scale).toPrecision(7),d=+(g.dy*scale).toPrecision(7);
 if(!(w>=.001&&d>=.001&&w<=100&&d<=100))throw Error('Dimensiones fuera de rango: '+w+' × '+d+' m');
 const q=(v,o,l)=>Math.max(0,Math.min(65535,Math.round((v-o)/l*65535)));
 const normalized=g.lines.map(([a,b,c,d])=>{
  const p=[q(a,g.x,g.dx),q(b,g.y,g.dy)],r=[q(c,g.x,g.dx),q(d,g.y,g.dy)];
  return p[0]>r[0]||(p[0]===r[0]&&p[1]>r[1])?[...r,...p]:[...p,...r];
 }).filter(a=>a[0]!==a[2]||a[1]!==a[3]);
 normalized.sort((a,b)=>a[0]-b[0]||a[1]-b[1]||a[2]-b[2]||a[3]-b[3]);
 const unique=normalized.filter((a,i)=>!i||a.some((v,j)=>v!==normalized[i-1][j]));
 if(unique.length<8)throw Error('Bloque demasiado simple después de quitar duplicados');
 const raw=new Uint8Array(unique.length*8),view=new DataView(raw.buffer);
 unique.forEach((a,i)=>a.forEach((v,j)=>view.setUint16(i*8+j*2,v,true)));
 let binary='';for(let i=0;i<raw.length;i+=8192)binary+=String.fromCharCode(...raw.subarray(i,i+8192));
 const hash=(await hexHash(new TextEncoder().encode(w+'|'+d+'|'+btoa(binary)))).slice(0,24);
 const name=safe(file.name.replace(/\.(dwg|dxf)$/i,'').replace(/__[a-f0-9]{12}$/i,'').replace(/_/g,' '))||'Bloque';
 return ['userdx4-'+hash.slice(0,20),'archivo-'+hash,name,categoryFor(file),w,d,btoa(binary),hash,flags];
}

// ZIP classic (stored/deflate), parsed locally. No extraction to disk or network.
const ZIP_MAX=256*1024*1024, ZIP_ENTRY=64*1024*1024, ZIP_TOTAL=1024*1024*1024, ZIP_COUNT=20000;
const crcTable=Uint32Array.from({length:256},(_,i)=>{let v=i;for(let j=0;j<8;j++)v=(v&1)?(0xedb88320^(v>>>1)):(v>>>1);return v>>>0});
function zipCRC(bytes){let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0}
function zipDirectory(buffer){
 const bytes=new Uint8Array(buffer),v=new DataView(buffer),u16=i=>v.getUint16(i,true),u32=i=>v.getUint32(i,true);
 if(bytes.length<22||bytes.length>ZIP_MAX)throw Error('ZIP vacío o mayor a 256 MiB');
 let end=-1;
 for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(u32(i)===0x06054b50&&i+22+u16(i+20)===bytes.length){end=i;break}
 if(end<0)throw Error('Directorio ZIP no encontrado');
 const count=u16(end+10),size=u32(end+12),offset=u32(end+16);
 if(u16(end+4)||u16(end+6)||u16(end+8)!==count||count===65535||size===0xffffffff||offset===0xffffffff)throw Error('ZIP64 o ZIP multidisco no compatible');
 if(count>ZIP_COUNT||offset+size>end)throw Error('Directorio ZIP inválido o demasiado grande');
 const rows=[];let p=offset;
 for(let n=0;n<count;n++){
  if(p+46>offset+size||u32(p)!==0x02014b50)throw Error('Entrada ZIP inválida');
  const flags=u16(p+8),method=u16(p+10),crc=u32(p+16),compressed=u32(p+20),length=u32(p+24),nl=u16(p+28),xl=u16(p+30),cl=u16(p+32),local=u32(p+42);
  if(p+46+nl+xl+cl>offset+size)throw Error('Nombre ZIP truncado');
  const name=new TextDecoder(flags&2048?'utf-8':'windows-1252').decode(bytes.subarray(p+46,p+46+nl)).replace(/\\/g,'/');
  p+=46+nl+xl+cl;
  if(!/\.(dwg|dxf|zip)$/i.test(name)||name.startsWith('__MACOSX/')||name.split('/').some(x=>x==='..'||x.startsWith('._'))||name.startsWith('/')||/^[A-Za-z]:/.test(name))continue;
  rows.push({name,flags,method,crc,compressed,length,local});
 }
 return {bytes,v,rows,offset};
}
async function zipExtract(z,r){
 if(r.flags&1)throw Error('Entrada ZIP cifrada');
 if(r.length>ZIP_ENTRY||r.compressed>ZIP_ENTRY||r.length===0xffffffff||r.local===0xffffffff)throw Error('Entrada ZIP mayor a 64 MiB o ZIP64');
 if(r.local+30>z.offset||z.v.getUint32(r.local,true)!==0x04034b50)throw Error('Cabecera local ZIP inválida');
 if(z.v.getUint16(r.local+8,true)!==r.method||(z.v.getUint16(r.local+6,true)&1))throw Error('Cabecera ZIP inconsistente');
 const begin=r.local+30+z.v.getUint16(r.local+26,true)+z.v.getUint16(r.local+28,true);
 if(begin+r.compressed>z.offset)throw Error('Datos ZIP truncados');
 const src=z.bytes.subarray(begin,begin+r.compressed);let out;
 if(r.method===0){if(src.length!==r.length)throw Error('Longitud ZIP inválida');out=src.slice()}
 else if(r.method===8){
  if(typeof DecompressionStream!=='function')throw Error('El navegador no dispone de descompresión ZIP');
  const reader=new Blob([src]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
  out=new Uint8Array(r.length);let pos=0;
  try{while(true){const {value,done}=await reader.read();if(done)break;if(pos+value.length>out.length)throw Error('ZIP excede longitud declarada');out.set(value,pos);pos+=value.length}}
  finally{await reader.cancel().catch(()=>{});reader.releaseLock()}
  if(pos!==out.length)throw Error('Longitud ZIP descomprimida inválida');
 }else throw Error('Compresión ZIP no compatible: '+r.method);
 if(zipCRC(out)!==r.crc)throw Error('CRC ZIP incorrecto');
 return out.buffer;
}
async function collectZip(buffer,prefix,state,depth=0){
 if(depth>4)throw Error('Máximo cuatro niveles de ZIP internos');
 const z=zipDirectory(buffer);
 for(const r of z.rows){
  if(state.shouldStop())return;
  if(++state.count>ZIP_COUNT)throw Error('Máximo 20.000 entradas CAD/ZIP por lote');
  const full=prefix+'/'+r.name;
  try{
   if(r.length>ZIP_ENTRY)throw Error('Entrada mayor a 64 MiB');
   if(state.bytes+r.length>ZIP_TOTAL)throw Error('Límite de 1 GiB descomprimido por lote');
   state.bytes+=r.length;
   if(/\.zip$/i.test(r.name))await collectZip(await zipExtract(z,r),full,state,depth+1);
   else{
    const name=r.name.split('/').at(-1);
    state.files.push({name,webkitRelativePath:full,size:r.length,arrayBuffer:()=>zipExtract(z,r)});
   }
  }catch(e){state.failed.push({file:full,error:String(e.message||e)})}
 }
}
async function expandArchives(files,onProgress,shouldStop){
 const state={files:[],failed:[],bytes:0,count:0,shouldStop};
 for(const f of files){
  if(shouldStop())break;
  if(!/\.zip$/i.test(f.name)){state.files.push(f);continue}
  onProgress({scanning:true,file:f.name});
  try{if(f.size>ZIP_MAX)throw Error('ZIP mayor a 256 MiB');await collectZip(await f.arrayBuffer(),f.name,state)}
  catch(e){state.failed.push({file:f.name,error:String(e.message||e)})}
 }
 return state;
}

async function importDrawings(files,unknownUnit=-1,onProgress=()=>{},shouldStop=()=>false,recover=true){
 if(busy)throw Error('Ya hay una importación en curso');
 busy=true;let added=0,duplicates=0,failed=[],processed=0,total=0,estimated=0,partial=0,lastError='';
 try{
  const expanded=await expandArchives(files,onProgress,shouldStop);files=expanded.files;failed=expanded.failed;total=files.length;
  await restore();await loadExisting();
  for(const file of files){
   if(shouldStop())break;
   try{
    if(!/\.(dwg|dxf)$/i.test(file.name)||!file.size||file.size>64*1024*1024)throw Error('Archivo no compatible o mayor a 64 MiB');
    const row=validate(await fileRow(file,unknownUnit,recover));
    if(!row)throw Error('Bloque vectorial no válido');
    const fresh=filterNew([row]);
    if(fresh.length){await persist(fresh);added+=register(fresh);if(row[8]&1)estimated++;if(row[8]&6)partial++;}else duplicates++;
   }catch(e){lastError=String(e.message||e);failed.push({file:file.webkitRelativePath||file.name,error:lastError})}
   processed++;onProgress({processed,total:files.length,added,duplicates,estimated,partial,failed:failed.length,file:file.name,lastError});
  }
  return {processed,total,added,duplicates,estimated,partial,failed};
 }finally{busy=false;refresh()}
}
function openDrawingImport(){
 if(busy)return;
 const pane=document.createElement('dialog');
 pane.style.cssText='background:#23313b;color:#f2f5f6;border:1px solid #657985;border-radius:10px;padding:16px;width:min(480px,90vw)';
 pane.innerHTML='<strong>Importar bloques ZIP / DWG / DXF</strong><p>Seleccioná ZIP completos o dibujos sueltos. Se leen las carpetas y ZIP internos sin descomprimir manualmente. Los dibujos se convierten localmente. La recuperación opcional conserva geometría compatible y marca los bloques parciales. Las curvas se aproximan con segmentos. Verificá las medidas.</p><label>Archivos <input type="file" multiple accept=".zip,.dwg,.dxf,.json,application/zip"></label><p><label>Unidad si el dibujo no la declara: <select><option value="-1">Estimar escala · revisar</option><option value="0">Omitir sin unidad</option><option value="1">Metros</option><option value=".01">Centímetros</option><option value=".001">Milímetros</option><option value=".0254">Pulgadas</option></select></label></p><p><label><input type="checkbox" data-recover checked> Recuperar geometría compatible aunque falten entidades</label></p><div role="status" style="white-space:pre-wrap;max-height:200px;overflow:auto"></div><p><button type="button" class="btn slim" data-start>Importar</button> <button type="button" class="btn slim" data-close>Cerrar</button></p>';
 document.body.appendChild(pane);
 const status=pane.querySelector('[role=status]'),start=pane.querySelector('[data-start]'),close=pane.querySelector('[data-close]'),input=pane.querySelector('input[type=file]'),unit=pane.querySelector('select'),recovery=pane.querySelector('[data-recover]');
 let active=false,stop=false;
 close.onclick=()=>{if(active){stop=true;close.disabled=true;status.textContent+='\nDeteniendo después del archivo actual…'}else pane.close()};
 pane.addEventListener('cancel',e=>{if(active){e.preventDefault();stop=true}});
 pane.addEventListener('close',()=>pane.remove(),{once:true});
 start.onclick=async()=>{
  const files=Array.from(input.files||[]);if(!files.length)return;
  active=true;stop=false;start.disabled=input.disabled=unit.disabled=recovery.disabled=true;close.textContent='Detener';
  try{
   if(files.length===1&&/\.json$/i.test(files[0].name)){const r=await importFile(files[0]);status.textContent=r?JSON.stringify(r):'Importación no iniciada';return}
   if(files.some(f=>/\.json$/i.test(f.name)))throw Error('Importá cada paquete JSON por separado');
   const r=await importDrawings(files,Number(unit.value),p=>{status.textContent=p.scanning?'Leyendo ZIP: '+p.file:p.processed+'/'+p.total+' · '+p.added+' nuevos · '+p.duplicates+' duplicados · '+p.failed+' rechazados\n'+p.estimated+' escala estimada · '+p.partial+' parciales\n'+p.file+(p.lastError?'\nÚltimo rechazo: '+p.lastError:'')},()=>stop,recovery.checked);
   status.textContent=r.processed+'/'+r.total+' dibujos procesados · '+r.added+' nuevos · '+r.duplicates+' duplicados · '+r.failed.length+' rechazados\n'+r.estimated+' escala estimada · '+r.partial+' parciales\n'+r.failed.slice(0,20).map(x=>x.file+': '+x.error).join('\n')+(r.failed.length>20?'\nSe muestran los primeros 20 errores.':'');
   if(r.failed.length){const report=document.createElement('button');report.type='button';report.className='btn slim';report.textContent='Descargar informe de rechazos';report.onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(r,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='cad2d3d-rechazos.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};status.append(document.createElement('br'),report)}
  }catch(e){status.textContent=String(e.message||e)}
  finally{active=false;start.disabled=input.disabled=unit.disabled=recovery.disabled=close.disabled=false;close.textContent='Cerrar'}
 };
 pane.showModal();
}

function choose(){openDrawingImport()}
window.CAD2D_LOCAL_VECTOR_PACKS=Object.freeze({choose,importFile,restore,importDrawings});
const ext=window.CAD2D_EXTENSIONS;if(ext?.commands)ext.commands.IMPORTBLOCKPACK=choose;
restore();
})();