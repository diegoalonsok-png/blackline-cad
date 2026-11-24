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
 const records=L.library.concat(window.CAD2D_OLYMPIADAS3?.catalog||[]);
 return {ids:new Set(records.map(x=>x.id)),sources:new Set(records.map(x=>String(x.source||'').trim().toLowerCase()).filter(Boolean)),hashes:new Set(records.map(x=>String(x.sourceHash||'')).filter(Boolean))};
}
function filterNew(rows){const k=known(),result=[];
 for(const row of rows){const [id,source,,,,,,hash]=row;
 if(k.ids.has(id)||k.sources.has(source)||k.hashes.has(hash))continue;
 k.ids.add(id);k.sources.add(source);k.hashes.add(hash);result.push(row);
 }return result;
}
function register(rows){
 const fresh=filterNew(rows);
 for(const [id,source,name,oldCat,w,d,data,hash,flags] of fresh){
 const cat=restoredCategory(name,oldCat);
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
 if(!p||p.catalogReady||p.loaded===p.total)return;
 try{await p.loadCatalog();return}catch(e){throw Error('Catálogo de bloques no disponible. Reintentá antes de importar para evitar duplicados.');}
}
async function verifyStored(){
 const saved=await readAll(),registered=new Map(L.library.filter(x=>/^userdx4-/.test(x.id)).map(x=>[x.id,x]));
 const categories=Object.create(null),missing=[],invalid=[],entries=[];
 for(const item of saved){const row=validate(item.row);if(!row){invalid.push(String(item.id||''));continue}const [id,,name,oldCat,w,d,,,,]=row,cat=restoredCategory(name,oldCat),block=registered.get(id);
  const entry={id,name,category:cat,width:w,depth:d,registered:Boolean(block),visible:Boolean(block&&!block.hideFromGallery)};entries.push(entry);
  categories[cat]??={stored:0,visible:0};categories[cat].stored++;if(entry.visible)categories[cat].visible++;if(!entry.visible)missing.push(id);
 }
 return {stored:saved.length,valid:entries.length,visible:entries.filter(x=>x.visible).length,categories,missing,invalid,entries};
}
function downloadReport(data,name){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function showVerification(status,info){
 const lines=['VERIFICACIÓN DE BIBLIOTECA LOCAL',info.stored+' guardados en el navegador · '+info.visible+' visibles en la biblioteca',...Object.entries(info.categories).sort(([a],[b])=>a.localeCompare(b)).map(([cat,n])=>cat+': '+n.visible+' visibles / '+n.stored+' guardados')];
 if(info.missing.length)lines.push(info.missing.length+' guardados pero no visibles');if(info.invalid.length)lines.push(info.invalid.length+' registros no válidos');
 status.append(document.createElement('br'),document.createTextNode(lines.join('\n')));
 const button=document.createElement('button');button.type='button';button.className='btn slim';button.textContent='Descargar inventario de bloques guardados';button.onclick=()=>downloadReport(info,'cad2d3d-inventario-bloques.json');status.append(document.createElement('br'),button);
}
async function restore(){
 if(restoring)return restoring;
 restoring=(async()=>{
  const stored=await readAll();if(!stored.length)return 0;
  await loadExisting();
  const count=register(stored.map(x=>validate(x.row)).filter(Boolean));if(count)refresh();return count;
 })().catch(e=>{console.warn('DXF local',e);restoring=null;return 0});
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
function classify(value){
 const s=String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[_-]/g,' ');
 // Botanical names take priority; "planta" alone can mean a floor plan.
 if(/arbol|vegetacion|arbusto|palmera|planta ornamental|planta en maceta|follaje|conifera|cactus|\b(?:tree|trees|shrub|shrubs|bush|bushes|foliage|potted plant)\b/.test(s))return 'Exterior';
 const groups=[
 [/abertura|puerta|ventana|carpinter|persiana|\bdoor\b|\bwindow\b|porton/,'Puertas y ventanas'],
 [/bano|bacha|bidet|inodoro|sanitari|lavatorio|ducha|banera|toilet|urinal|shower|bathtub|\bwc\b/,'Baños'],
 [/cocina|anafe|horno|heladera|kitchen|fridge|refriger|lavavajillas|microondas/,'Cocinas'],
 [/dormitorio|bedroom|\bcama\b|\bbed\b|colchon|cucheta|placard/,'Dormitorios'],
 [/ascensor|elevator|\blift\b/,'Ascensores'],
 [/arbol|vegetacion|arbusto|palmera|tree|shrub|jardin|outdoor/,'Exterior'],
 [/animal|fauna|perro|gato|caballo|\bdog\b|\bcat\b/,'Animales'],
 [/gym|gimnasio|deport|fitness|sport/,'Deportes'],
 [/avion|barco|\bauto(?:s|movil|moviles)?\b|camion|vehicul|truck|airplane|boat|bicycle|bicicleta|\bmoto(?:s|cicleta|cicletas)?\b|\b(?:car|cars|bus|buses|autobus|autobuses|omnibus)\b|aparcamiento|estacionamiento/,'Vehículos'],
 [/escalera|stair|pasamanos|baranda|railing/,'Escaleras'],
 [/ilumin|luminaria|lampara|lighting|light fixture/,'Iluminación'],
 [/oficina|office|escritorio/,'Oficina'],
 [/persona|people|human|figura humana/,'Personas'],
 [/detalle construct|construction detail|estructura|fundacion|cimientos/,'Obra'],
 [/simbolo|symbol|norte|north arrow/,'Símbolos'],
 [/cota|nivel|eje|documentacion/,'Documentación'],
 [/mueble|mobiliario|silla|mesa|sofa|sillon|furniture|chair|table|piano/,'Mobiliario']];
 return groups.find(([re])=>re.test(s))?.[1]||null;
}
function categoryFor(file,label){
 const name=file.name||'',path=file.webkitRelativePath||name;
 return classify(label)||classify(name)||path.split(/[\\/]/).slice(0,-1).reverse().map(classify).find(Boolean)||'Sin clasificar';
}
function restoredCategory(name,cat){
 const aliases={'Aberturas':'Puertas y ventanas','Sanitarios':'Baños','Vegetación':'Exterior','Importados':'Sin clasificar','Otros':'Sin clasificar'};
 return classify(name)||aliases[cat]||cat||'Sin clasificar';
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
 const target={'Aberturas':1.2,'Puertas y ventanas':1.2,'Sanitarios':.8,'Baños':.8,'Cocinas':2.4,'Ascensores':2,'Vegetación':5,'Exterior':5,'Animales':1,'Deportes':2,'Vehículos':5,'Escaleras':4,'Mobiliario':1.5,'Importados':2}[cat]||2;
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
 const text=new TextDecoder('windows-1252').decode(bytes);
 const parsed=parser.parse(text,{explodeInserts:true});
 if(parsed.warnings?.length){if(!recover)throw Error('DXF incompleto: '+parsed.warnings.join(', ').slice(0,200));flags|=2}
 const cat=categoryFor(file);
 async function encode(entities,label,baseFlags){
 let flags=baseFlags;
 const g=vectorize(entities,recover);
 if(g.skipped)flags|=2;
 let scale=METRES[parsed.unitCode]||(!parsed.unitCode&&unknownUnit>0?unknownUnit:0);
 if(!scale&&unknownUnit===-1&&!parsed.unitCode){scale=estimatedScale(g,categoryFor(file,label));flags|=1}
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
 const name=safe(label||file.name.replace(/\.(dwg|dxf)$/i,'').replace(/__[a-f0-9]{12}$/i,'').replace(/_/g,' '))||'Bloque';
 return ['userdx4-'+hash.slice(0,20),'archivo-'+hash,name,categoryFor(file,label),w,d,btoa(binary),hash,flags];
 }
 // A standalone drawing needs no INSERT: the lower-left bounds give the block's local origin.
 try{return [await encode(parsed.entities||[],null,flags)]}catch(modelError){
  const defs=parser.parse(text,{explodeInserts:true,collectDefinitions:true});
  if(defs.warnings?.length&&!recover)throw modelError;
  const rows=[],errors=[];
  for(const def of Object.values(defs.blocks||{})){
   try{rows.push(await encode(def.entities||[],def.name,flags|(defs.warnings?.length?2:0)))}catch(e){errors.push(def.name+': '+String(e.message||e))}
  }
  if(!rows.length)throw Error(String(modelError.message||modelError)+(errors.length?' · Definiciones: '+errors.slice(0,3).join('; '):' · Sin definiciones utilizables'));
  return rows;
 }
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
    const rows=(await fileRow(file,unknownUnit,recover)).map(validate).filter(Boolean);
    if(!rows.length)throw Error('Bloque vectorial no válido');
    const fresh=filterNew(rows);
    duplicates+=rows.length-fresh.length;
    if(fresh.length){await persist(fresh);added+=register(fresh);estimated+=fresh.filter(row=>row[8]&1).length;partial+=fresh.filter(row=>row[8]&6).length;}
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
 pane.innerHTML='<strong>Importar bloques ZIP / DWG / DXF</strong><p>Seleccioná ZIP completos o dibujos sueltos. Se leen las carpetas y ZIP internos sin descomprimir manualmente. Los dibujos se convierten localmente. Los bloques se organizan automáticamente por nombre y carpetas del ZIP. Se admiten dibujos sin punto de inserción y definiciones de bloques sin INSERT. La recuperación opcional conserva geometría compatible y marca los bloques parciales. Las curvas se aproximan con segmentos. Verificá las medidas.</p><label>Archivos <input type="file" multiple accept=".zip,.dwg,.dxf,.json,application/zip"></label><p><label>Unidad si el dibujo no la declara: <select><option value="-1">Estimar escala · revisar</option><option value="0">Omitir sin unidad</option><option value="1">Metros</option><option value=".01">Centímetros</option><option value=".001">Milímetros</option><option value=".0254">Pulgadas</option></select></label></p><p><label><input type="checkbox" data-recover checked> Recuperar geometría compatible aunque falten entidades</label></p><div role="status" style="white-space:pre-wrap;max-height:200px;overflow:auto"></div><p><button type="button" class="btn slim" data-start>Importar</button> <button type="button" class="btn slim" data-verify>Verificar bloques guardados</button> <button type="button" class="btn slim" data-show>Ver importados</button> <button type="button" class="btn slim" data-close>Cerrar</button></p>';
 document.body.appendChild(pane);
 const status=pane.querySelector('[role=status]'),start=pane.querySelector('[data-start]'),close=pane.querySelector('[data-close]'),input=pane.querySelector('input[type=file]'),unit=pane.querySelector('select'),recovery=pane.querySelector('[data-recover]'),verify=pane.querySelector('[data-verify]'),show=pane.querySelector('[data-show]');
 let active=false,stop=false;
 verify.onclick=async()=>{verify.disabled=true;try{await restore();const info=await verifyStored();status.textContent='';showVerification(status,info)}catch(e){status.textContent='No se pudo leer la biblioteca local: '+String(e.message||e)}finally{verify.disabled=active}};
 show.onclick=()=>{if(active)return;pane.close();window.CAD2D_BLOCK_BROWSER?.openImported?.()};
 close.onclick=()=>{if(active){stop=true;close.disabled=true;status.textContent+='\nDeteniendo después del archivo actual…'}else pane.close()};
 pane.addEventListener('cancel',e=>{if(active){e.preventDefault();stop=true}});
 pane.addEventListener('close',()=>pane.remove(),{once:true});
 start.onclick=async()=>{
  const files=Array.from(input.files||[]);if(!files.length)return;
  active=true;stop=false;start.disabled=input.disabled=unit.disabled=recovery.disabled=verify.disabled=show.disabled=true;close.textContent='Detener';
  try{
   if(files.length===1&&/\.json$/i.test(files[0].name)){const r=await importFile(files[0]);status.textContent=r?JSON.stringify(r):'Importación no iniciada';showVerification(status,await verifyStored());return}
   if(files.some(f=>/\.json$/i.test(f.name)))throw Error('Importá cada paquete JSON por separado');
   const r=await importDrawings(files,Number(unit.value),p=>{status.textContent=p.scanning?'Leyendo ZIP: '+p.file:p.processed+'/'+p.total+' · '+p.added+' nuevos · '+p.duplicates+' duplicados · '+p.failed+' rechazados\n'+p.estimated+' escala estimada · '+p.partial+' parciales\n'+p.file+(p.lastError?'\nÚltimo rechazo: '+p.lastError:'')},()=>stop,recovery.checked);
   status.textContent=r.processed+'/'+r.total+' dibujos procesados · '+r.added+' nuevos · '+r.duplicates+' duplicados · '+r.failed.length+' rechazados\n'+r.estimated+' escala estimada · '+r.partial+' parciales\n'+r.failed.slice(0,20).map(x=>x.file+': '+x.error).join('\n')+(r.failed.length>20?'\nSe muestran los primeros 20 errores.':'');
   if(r.failed.length){const report=document.createElement('button');report.type='button';report.className='btn slim';report.textContent='Descargar informe de rechazos';report.onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(r,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='cad2d3d-rechazos.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};status.append(document.createElement('br'),report)}
   showVerification(status,await verifyStored());
  }catch(e){status.textContent=String(e.message||e)}
  finally{active=false;start.disabled=input.disabled=unit.disabled=recovery.disabled=verify.disabled=show.disabled=close.disabled=false;close.textContent='Cerrar'}
 };
 pane.showModal();
}

function choose(){openDrawingImport()}
window.CAD2D_LOCAL_VECTOR_PACKS=Object.freeze({choose,importFile,restore,importDrawings,verifyStored});
const ext=window.CAD2D_EXTENSIONS;if(ext?.commands)ext.commands.IMPORTBLOCKPACK=choose;
restore();
})();