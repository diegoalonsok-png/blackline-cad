/* Blackline CAD2D | Independent original DWG review viewers.
 * Source drawings remain on the user's device; no DWG bytes are published to GitHub.
 * A file is sent to Blackline's existing DWG converter only after explicit preview consent.
 */
(function(){
'use strict';
if(window.BLACKLINE_ORIGINAL_VIEWERS)return;
const CATS=[
 ['openings','Puertas y ventanas',105],['animals','Animales',27],
 ['kitchen','Cocinas completas',4],['appliances','Equipos de cocina',112],
 ['fridges','Heladeras',9],['gym','Aparatos de gimnasio',12],
 ['elevators','Ascensores',91],['planes','Aviones',39],
 ['ships','Barcos',36],['trucks','Camiones',13],
 ['stairs','Escaleras',51],['accessible-baths','Baños accesibles',7],
 ['accessible-parking','Estacionamiento accesible',6],
 ['accessible-furniture','Mobiliario accesible',10]
];
const CATLABEL=Object.fromEntries(CATS.map(c=>[c[0],c[1]]));
const FILES=new Map(),APPROVED_KEY='blackline-original-review-decisions-v1';
let decisions={};try{decisions=JSON.parse(localStorage.getItem(APPROVED_KEY)||'{}')||{}}catch(e){}
let current='kitchen',filter='',overlay=null,consent=false,loaded=0;
function catFor(path,archive){
 const s=(path||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 const a=(archive||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 if(/(?:anafes.cocinas.y.hornos|14_equipos_de_cocina|aparatos.de.cocina)/.test(s))return 'appliances';
 if(/(?:01_puertas_y_ventanas|abertura|carpinteria)/.test(s)||/abertur/.test(a))return 'openings';
 if(/(?:02_animales|animales)/.test(s)||/animales/.test(a))return 'animals';
 if(/(?:03_gimnasio|aparatos.gym)/.test(s)||/gym/.test(a))return 'gym';
 if(/(?:04_ascensores|ascensores)/.test(s)||/ascensores/.test(a))return 'elevators';
 if(/(?:05_aviones|aviones)/.test(s)||/aviones/.test(a))return 'planes';
 if(/(?:06_banos_accesibles|banos.discap|banos.accesib)/.test(s)||/banos.discap/.test(a))return 'accessible-baths';
 if(/(?:07_embarcaciones|barcos)/.test(s)||/barcos/.test(a))return 'ships';
 if(/(?:08_camiones|camiones)/.test(s)||/camiones/.test(a))return 'trucks';
 if(/(?:09_cocinas_completas|cocinas.completas)/.test(s)||/cocinas.completas/.test(a))return 'kitchen';
 if(/(?:10_escaleras|escaleras)/.test(s)||/escaleras/.test(a))return 'stairs';
 if(/(?:11_estacionamiento_accesible|estacionamiento.discap)/.test(s)||/estacionamiento.discap/.test(a))return 'accessible-parking';
 if(/(?:12_refrigeradores|heladeras)/.test(s)||/heladeras/.test(a))return 'fridges';
 if(/(?:13_mobiliario_accesible|mobiliario.discap)/.test(s)||/mobiliario.discap/.test(a))return 'accessible-furniture';
 return null;
}
function text(el,value){el.textContent=String(value);return el}
function make(tag,cls,content){const e=document.createElement(tag);if(cls)e.className=cls;if(content!==undefined)text(e,content);return e}
function save(){try{localStorage.setItem(APPROVED_KEY,JSON.stringify(decisions))}catch(e){}}
function css(){
 if(document.getElementById('blrvStyle'))return;
 const style=make('style');style.id='blrvStyle';style.textContent=[
 '#blrvRoot{position:fixed;inset:0;z-index:9499;background:#080e15eb;color:#e3ecf5;font:12px/1.5 system-ui,Arial,sans-serif;display:flex;justify-content:center;align-items:center}',
 '#blrvRoot[hidden]{display:none}',
 '#blrvRoot .blrv-shell{width:min(1600px,98vw);height:min(920px,94vh);background:#111b25;border:1px solid #3e596c;border-radius:14px;display:flex;flex-direction:column;overflow:hidden}',
 '#blrvRoot button,#blrvRoot input{font:inherit}',
 '#blrvRoot button{cursor:pointer;color:#e8f2fa;background:#182939;border:1px solid #456076;border-radius:7px;padding:7px 11px}',
 '#blrvRoot button:hover{border-color:#aed7ef}',
 '#blrvRoot .blrv-head{display:flex;gap:12px;align-items:center;padding:13px 17px;border-bottom:1px solid #34495a;flex-wrap:wrap}',
 '#blrvRoot .blrv-head h2{font-size:15px;margin:0;flex:1;letter-spacing:.05em}',
 '#blrvRoot .blrv-head small{color:#a6bdcc}',
 '#blrvRoot .blrv-main{display:flex;flex:1;min-height:0}',
 '#blrvRoot .blrv-nav{width:238px;min-width:170px;overflow:auto;padding:9px;border-right:1px solid #32475a}',
 '#blrvRoot .blrv-nav button{display:flex;justify-content:space-between;gap:8px;text-align:left;width:100%;margin-bottom:5px}',
 '#blrvRoot .blrv-nav button[aria-pressed=true]{border-color:#d9ae55;background:#403722}',
 '#blrvRoot .blrv-content{flex:1;min-width:0;display:flex;flex-direction:column}',
 '#blrvRoot .blrv-tools{padding:11px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;border-bottom:1px solid #2d4252}',
 '#blrvRoot .blrv-tools input[type=search]{padding:7px;background:#0a131b;border:1px solid #3d5465;color:#fff;border-radius:7px;min-width:160px;flex:1}',
 '#blrvRoot .blrv-grid{overflow:auto;padding:12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(226px,1fr));gap:10px;align-content:start}',
 '#blrvRoot .blrv-tile{min-width:0;border:1px solid #31485b;padding:9px;background:#18232e;border-radius:10px}',
 '#blrvRoot .blrv-art{height:170px;display:grid;place-items:center;background:#0c141c;border-radius:7px;overflow:hidden;color:#9cb5c5;text-align:center}',
 '#blrvRoot .blrv-art svg{width:100%;height:100%}',
 '#blrvRoot .blrv-title{font-weight:600;margin:7px 0 3px;overflow-wrap:anywhere}',
 '#blrvRoot .blrv-meta{font-size:10px;color:#a5c2d3;overflow-wrap:anywhere;margin-bottom:6px}',
 '#blrvRoot .blrv-acts{display:flex;flex-wrap:wrap;gap:5px}',
 '#blrvRoot .blrv-acts button{padding:5px 7px;font-size:11px}',
 '#blrvRoot .blrv-pass{border-color:#5b9b82!important;color:#a8e2c6!important}',
 '#blrvRoot .blrv-drop{border-color:#be7777!important;color:#e9a6a6!important}',
 '#blrvRoot .blrv-note{padding:10px 13px;background:#242822;color:#e8d5a6;border-bottom:1px solid #57503c}',
 '#blrvRoot .blrv-foot{padding:8px 12px;color:#9fb7ca;border-top:1px solid #31485b}',
 '@media(max-width:650px){#blrvRoot .blrv-nav{width:145px;min-width:128px}#blrvRoot .blrv-head h2{font-size:12px}#blrvRoot .blrv-grid{grid-template-columns:1fr}}'
 ].join('\n');document.head.append(style)
}
function ensure(){
 if(overlay)return overlay;
 css();overlay=make('div');overlay.id='blrvRoot';overlay.hidden=true;
 const shell=make('section','blrv-shell');overlay.append(shell);
 const head=make('div','blrv-head');
 head.append(make('h2','','CARPETAS · ORIGINALES PARA REVISIÓN'));
 head.append(make('small','','522 DWG catalogados · 14 visores separados'));
 const openFile=make('button','','Cargar ZIP o DWG');
 const files=make('input');files.type='file';files.accept='.zip,.dwg,.dxf';files.multiple=true;files.hidden=true;
 files.onchange=async()=>{await ingest([...files.files]);files.value=''};
 openFile.onclick=()=>files.click();head.append(openFile,files);
 const close=make('button','','✕ Cerrar');close.onclick=()=>overlay.hidden=true;head.append(close);
 shell.append(head);
 shell.append(make('p','blrv-note','Revisión de dibujos originales. Ninguna miniatura se inventa: elegí un ZIP local y pulsá «Ver dibujo» para convertir un DWG real. No se guarda ni publica automáticamente ningún archivo.'));
 const main=make('div','blrv-main'),nav=make('nav','blrv-nav'),content=make('div','blrv-content');
 const tools=make('div','blrv-tools');
 const search=make('input');search.type='search';search.placeholder='Buscar por nombre...';
 search.oninput=()=>{filter=search.value.toLowerCase();draw()};
 const count=make('span');count.id='blrvCount';tools.append(search,count);
 const grid=make('div','blrv-grid');grid.id='blrvGrid';
 content.append(tools,grid);main.append(nav,content);shell.append(main);
 const foot=make('div','blrv-foot');foot.id='blrvStatus';
 foot.textContent='Los originales permanecen en el disco o ZIP hasta que solicites una conversión individual.';
 shell.append(foot);document.body.append(overlay);
 for(const [id,name,n] of CATS){
  const b=make('button','',name+' · '+n);b.dataset.cat=id;b.onclick=()=>{current=id;draw()};
  nav.append(b);
 }
 return overlay;
}
function report(s){const el=document.getElementById('blrvStatus');if(el)el.textContent=s}
function keyFor(name,zip,crc){return [zip,name,String(crc)].join('|')}
async function ingest(inputs){
 if(!inputs.length)return;
 let added=0,issues=[];
 for(const f of inputs){
  try{
   if(/\.zip$/i.test(f.name)){added+=await unpackZip(f)}
   else if(/\.(?:dwg|dxf)$/i.test(f.name)){
    const cat=catFor(f.webkitRelativePath||f.name,f.name)||current;
    const k=keyFor(f.name,f.name,f.size);
    if(!FILES.has(k)){FILES.set(k,{key:k,cat,label:f.name.replace(/\.(?:dwg|dxf)$/i,''),zip:f.name,file:f,format:f.name.toLowerCase().endsWith('.dxf')?'dxf':'dwg',state:'local'});added++}
   }
  }catch(e){issues.push(f.name+': '+e.message)}
 }
 loaded+=added;draw();report(added+' archivos agregados para revisar'+(issues.length?' · errores: '+issues.join('; ').slice(0,300):'')+'. No se cargaron a servidores.');
}
async function unpackZip(file){
 const b=await file.arrayBuffer(),view=new DataView(b),bytes=new Uint8Array(b);
 let eocd=-1;
 for(let p=b.byteLength-22;p>=Math.max(0,b.byteLength-65557);p--)if(view.getUint32(p,true)===0x06054b50){eocd=p;break}
 if(eocd<0)throw Error('ZIP sin directorio central válido');
 const total=view.getUint16(eocd+10,true),cd=view.getUint32(eocd+16,true);
 if(total>3000)throw Error('Demasiados archivos para esta revisión');
 let p=cd,added=0;
 for(let i=0;i<total;i++){
  if(view.getUint32(p,true)!==0x02014b50)throw Error('Entrada ZIP inválida');
  const flag=view.getUint16(p+8,true),method=view.getUint16(p+10,true),crc=view.getUint32(p+16,true);
  const csize=view.getUint32(p+20,true),usize=view.getUint32(p+24,true),nlen=view.getUint16(p+28,true),elen=view.getUint16(p+30,true),clen=view.getUint16(p+32,true),offset=view.getUint32(p+42,true);
  const name=new TextDecoder(flag&2048?'utf-8':'windows-1252').decode(bytes.slice(p+46,p+46+nlen));p+=46+nlen+elen+clen;
  if(!/\.(dwg|dxf)$/i.test(name)||name.startsWith('__MACOSX/')||usize>12*1024*1024||csize>12*1024*1024)continue;
  const cat=catFor(name,file.name);if(!cat)continue;
  if(view.getUint32(offset,true)!==0x04034b50)continue;
  const dataStart=offset+30+view.getUint16(offset+26,true)+view.getUint16(offset+28,true);
  if(dataStart+csize>b.byteLength)continue;
  const k=keyFor(name,file.name,crc);if(FILES.has(k))continue;
  const cleaned=name.split('/').pop().replace(/__[a-f0-9]{10}(?=\.dwg$)/i,'').replace(/\.(dwg|dxf)$/i,'');
  FILES.set(k,{key:k,cat,label:cleaned,zip:file.name,format:/\.dxf$/i.test(name)?'dxf':'dwg',
   packed:bytes.slice(dataStart,dataStart+csize),method,size:usize,crc,state:'local'});
  added++;
 }
 return added;
}
async function payload(item){
 if(item.file)return item.file;
 let buffer;
 if(item.method===0)buffer=item.packed;
 else if(item.method===8){
  if(typeof DecompressionStream!=='function')throw Error('Este navegador no permite descomprimir ZIP. Extraé el DWG y subilo directamente.');
  const stream=new Blob([item.packed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  const ab=await new Response(stream).arrayBuffer();buffer=new Uint8Array(ab);
 }else throw Error('Compresión ZIP no compatible');
 if(buffer.length!==item.size)throw Error('Tamaño descomprimido incorrecto');
 return new File([buffer],item.label+'.'+item.format,{type:'application/octet-stream'});
}
const svgNS='http://www.w3.org/2000/svg';
function primitive(doc,type,values){
 const get=(code,def=0)=>{const v=values.find(x=>x[0]===code);return v?Number(v[1]):def};
 const num=(n)=>Number.isFinite(n)&&Math.abs(n)<1e9;
 const node=(tag)=>doc.createElementNS(svgNS,tag),set=(el,k,v)=>el.setAttribute(k,String(v));
 let el=null;
 if(type==='LINE'){
  const [x,y,X,Y]=[get(10),get(20),get(11),get(21)];if(![x,y,X,Y].every(num))return null;
  el=node('line');[['x1',x],['y1',y],['x2',X],['y2',Y]].forEach(z=>set(el,...z));
 }else if(type==='CIRCLE'){
  const [x,y,r]=[get(10),get(20),get(40)];if(![x,y,r].every(num)||r<=0)return null;
  el=node('circle');[['cx',x],['cy',y],['r',r]].forEach(z=>set(el,...z));
 }else if(type==='ARC'){
  const [x,y,r,start,end]=[get(10),get(20),get(40),get(50),get(51)];if(![x,y,r,start,end].every(num)||r<=0)return null;
  const a=start*Math.PI/180,b=end*Math.PI/180,sweep=((b-a)%(Math.PI*2)+Math.PI*2)%(Math.PI*2);
  const large=sweep>Math.PI?1:0;
  el=node('path');set(el,'d','M '+(x+r*Math.cos(a))+' '+(y+r*Math.sin(a))+' A '+r+' '+r+' 0 '+large+' 1 '+(x+r*Math.cos(b))+' '+(y+r*Math.sin(b)));
 }else if(type==='LWPOLYLINE'){
  const pts=[],bulges=[];let px=null;for(const v of values){if(v[0]===10)px=Number(v[1]);else if(v[0]===20&&px!==null){pts.push([px,Number(v[1])]);px=null}else if(v[0]===42)bulges.push(Number(v[1]))}
  if(pts.length<2||pts.length>10000||pts.some(p=>!p.every(num))||bulges.some(b=>Math.abs(b)>1e-10))return null;
  const closed=(Math.round(get(70))&1)!==0;
  el=node(closed?'polygon':'polyline');set(el,'points',pts.map(q=>q.join(',')).join(' '));
 }else if(type==='ELLIPSE'){
  const [x,y,vx,vy,ratio]=[get(10),get(20),get(11),get(21),get(40,1)];
  const r=Math.hypot(vx,vy);if(![x,y,vx,vy,ratio].every(num)||r<=0||ratio<=0)return null;
  el=node('ellipse');[['cx',x],['cy',y],['rx',r],['ry',r*ratio],['transform','rotate('+(Math.atan2(vy,vx)*180/Math.PI)+' '+x+' '+y+')']].forEach(z=>set(el,...z));
 }
 return el;
}
function dxfGeometry(dxf){
 const rows=dxf.replace(/\r/g,'').split('\n'),pairs=[];for(let i=0;i+1<rows.length;i+=2){const k=Number(rows[i].trim());if(Number.isInteger(k))pairs.push([k,rows[i+1].trim()])}
 const blocks=new Map(),entities=[];let section='',block=null,unsupported=0,total=0;
 const value=(values,k,d='')=>values.find(q=>q[0]===k)?.[1]??d;
 for(let p=0;p<pairs.length;){
  const [code,word]=pairs[p];if(code===0&&word==='SECTION'){section=pairs[p+1]?.[1]||'';p+=2;continue}
  if(code===0&&word==='ENDSEC'){section='';p++;continue}
  if(code!==0){p++;continue}
  const type=word,a=[];p++;while(p<pairs.length&&pairs[p][0]!==0)a.push(pairs[p++]);
  if(section==='BLOCKS'&&type==='BLOCK'){block={name:value(a,2),x:Number(value(a,10,'0')),y:Number(value(a,20,'0')),records:[]};continue}
  if(section==='BLOCKS'&&type==='ENDBLK'){if(block?.name)blocks.set(block.name,block);block=null;continue}
  if(section==='ENTITIES'||section==='BLOCKS'&&block){
   if(type==='SEQEND'||type==='VERTEX')continue;
   const rec={type,vals:a};(block?block.records:entities).push(rec);
  }
 }
 const svg=document.createElementNS(svgNS,'svg');svg.setAttribute('xmlns',svgNS);svg.setAttribute('aria-label','Vista previa vectorial DXF');
 const g=document.createElementNS(svgNS,'g');g.setAttribute('transform','scale(1 -1)');g.setAttribute('fill','none');
 g.setAttribute('stroke','#d8e9f5');g.setAttribute('stroke-width','1');g.setAttribute('vector-effect','non-scaling-stroke');svg.append(g);
 function addRecord(r,into,depth,visited){
  if(depth>12||total>12000)return;
  if(r.type==='INSERT'){
   const name=value(r.vals,2),def=blocks.get(name);if(!def||visited.has(name)){unsupported++;return}
   const n=k=>Number(value(r.vals,k, k===41||k===42?'1':'0'));
   const [x,y,sx,sy,rot]=[n(10),n(20),n(41),n(42),n(50)];if(![x,y,sx,sy,rot].every(Number.isFinite))return;
   const subgroup=document.createElementNS(svgNS,'g');
   subgroup.setAttribute('transform','translate('+x+' '+y+') rotate('+rot+') scale('+sx+' '+sy+') translate('+(-def.x)+' '+(-def.y)+')');
   into.append(subgroup);const seen=new Set(visited);seen.add(name);
   for(const child of def.records)addRecord(child,subgroup,depth+1,seen);return;
  }
  const e=primitive(document,r.type,r.vals);
  if(e){into.append(e);total++}else unsupported++;
 }
 for(const e of entities)addRecord(e,g,0,new Set());
 if(!total)throw Error('DXF sin geometría 2D compatible; no se mostrará una vista ficticia.');
 // The SVG must be in the DOM to obtain exact dimensions after nested INSERT transforms.
 svg.style.cssText='position:absolute;visibility:hidden;width:600px;height:400px';
 document.body.append(svg);
 let box;try{box=g.getBBox()}finally{svg.remove()}
 if(!box||!(box.width>0||box.height>0))throw Error('No se pudieron calcular los límites del dibujo.');
 const size=Math.max(box.width,box.height,1),pad=size*.06;
 // The vector group flips Y for CAD coordinates; viewBox must use the flipped bounds.
 svg.setAttribute('viewBox',[box.x-pad,-(box.y+box.height)-pad,Math.max(box.width+pad*2,size*.15),Math.max(box.height+pad*2,size*.15)].join(' '));
 svg.style.cssText='height:100%;width:100%';
 return {svg,objects:total,unsupported};
}
async function preview(item,art,btn){
 if(item.cached){art.replaceChildren(item.cached.svg.cloneNode(true));return}
 if(item.busy)return;
 item.busy=true;btn.disabled=true;report('Leyendo '+item.label+'…');
 try{
  const file=await payload(item);let dxf;
  if(item.format==='dxf')dxf=await file.text();
  else {
   const endpoint=window.CAD2D_DWG_ENDPOINT;
   if(!endpoint||!/^https:\/\/[^/]+\/api\/convert\/dwg/.test(endpoint))throw Error('No hay conversor DWG publicado en CAD2D');
   if(!consent){
    const ok=window.confirm('Para visualizar este DWG, Blackline enviará únicamente este archivo al servicio de conversión. Se procesa y elimina allí. ¿Continuar?');
    if(!ok){report('Conversión cancelada por el usuario');return}consent=true;
   }
   const body=new FormData();body.set('file',file,file.name);
   const response=await fetch(endpoint,{method:'POST',body,credentials:'omit'});
   if(!response.ok)throw Error('Error del conversor DWG ('+response.status+')');
   dxf=await response.text();
   if(dxf.length>15*1024*1024)throw Error('DXF demasiado grande para la vista previa');
  }
  const rendered=dxfGeometry(dxf);
  item.cached=rendered;art.replaceChildren(rendered.svg);
  item.state='preview';report('Vista real: '+item.label+' · '+rendered.objects+' entidades representadas'+(rendered.unsupported?' · '+rendered.unsupported+' no representadas: revisar antes de aprobar':''));
  drawCounters();
 }catch(e){art.textContent='No se pudo previsualizar: '+e.message;report(e.message)}
 finally{item.busy=false;btn.disabled=false}
}
function drawCounters(){
 if(!overlay)return;
 for(const button of overlay.querySelectorAll('[data-cat]')){
  const id=button.dataset.cat;button.setAttribute('aria-pressed',String(id===current));
  const qty=[...FILES.values()].filter(x=>x.cat===id).length;
  const base=CATS.find(x=>x[0]===id);
  button.textContent=base[1]+' · '+(qty?qty+' cargados':base[2]+' pendientes');
 }
 const count=document.getElementById('blrvCount');if(count)count.textContent=[...FILES.values()].filter(x=>x.cat===current).length+' archivos cargados';
}
function draw(){
 if(!overlay)return;drawCounters();
 const grid=document.getElementById('blrvGrid');grid.replaceChildren();
 const shown=[...FILES.values()].filter(x=>x.cat===current&&(!filter||x.label.toLowerCase().includes(filter)));
 if(!shown.length){
  const empty=make('div','blrv-tile','Carpeta '+CATLABEL[current]+': sin archivos locales cargados. Importá tus ZIP para habilitar las vistas reales.');
  grid.append(empty);return;
 }
 const fragment=document.createDocumentFragment();
 for(const it of shown){
  const card=make('article','blrv-tile'),art=make('div','blrv-art','DWG original · sin vista previa');
  if(it.cached)art.replaceChildren(it.cached.svg.cloneNode(true));
  card.append(art,make('div','blrv-title',it.label));
  const meta=make('div','blrv-meta',it.zip+' · '+(decisions[it.key]||'pendiente'));card.append(meta);
  const acts=make('div','blrv-acts'),view=make('button','','Ver dibujo');
  view.onclick=()=>preview(it,art,view);
  const yes=make('button','blrv-pass','Aprobar'),no=make('button','blrv-drop','Descartar');
  const change=v=>{if(v==='aprobado'&&!it.cached){report('Primero comprobá la geometría: Ver dibujo');return}if(v==='aprobado'&&it.cached.unsupported){if(!confirm('La conversión tiene entidades no representadas. ¿Aprobar para revisión igualmente?'))return}
   decisions[it.key]=v;save();meta.textContent=it.zip+' · '+v;report(it.label+': '+v+'. Decisión guardada en este navegador; el original no fue borrado.')};
  yes.onclick=()=>change('aprobado');no.onclick=()=>change('descartado');
  acts.append(view,yes,no);card.append(acts);fragment.append(card);
 }
 grid.append(fragment);
}
function launch(){ensure();overlay.hidden=false;draw()}
function addButton(){
 if(document.getElementById('blrvOpen'))return;
 const header=document.querySelector('#arqModal .arq-box > header');
 if(!header)return;
 const b=make('button','','CARPETAS · ORIGINALES');
 b.id='blrvOpen';b.type='button';b.title='Abrir los 14 visores independientes de originales DWG';
 b.style.cssText='border-color:#9bb8c9;color:#dcecf5;font-size:11px;white-space:nowrap';
 b.onclick=launch;header.insertBefore(b,header.querySelector('.arq-sizes')||null);
}
window.BLACKLINE_ORIGINAL_VIEWERS=Object.freeze({open:launch,categories:CATS.map(x=>({id:x[0],name:x[1],expected:x[2]}))});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addButton,{once:true});else addButton();
})();