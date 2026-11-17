/* CAD2D · Importación opcional de bibliotecas históricas en JSON
 * No external API, no Autodesk assets. All thumbnails use the exact entities
 * passed to the CAD block engine, and insertion preserves their relative pivot.
 * Metric dimensions in the pack are provisional normalized display sizes.
 */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const NS='http://www.w3.org/2000/svg';
const UNIT={m:1,cm:100,mm:1000,in:39.37007874015748,ft:3.28083989501312};
let entries=[],category='Todos',query='';
const safeNumber=n=>Number.isFinite(n)&&Math.abs(n)<1e9;
function unpack(record,factor=1){
 const entities=[],xy=(x,y)=>({x:x*factor,y:y*factor});
 for(const data of record[4]){
  if(!Array.isArray(data))throw Error('Geometría inválida');
  const [kind,...p]=data;
  if(p.some(v=>!safeNumber(v)))throw Error('Bloque con coordenadas inválidas');
  const base={layer:'0',width:.05};
  if(kind==='L'&&p.length===4)entities.push({...base,type:'line',a:xy(p[0],p[1]),b:xy(p[2],p[3])});
  else if(kind==='P'&&p.length>=5&&p.length%2===1){
   const pts=[];for(let i=1;i<p.length;i+=2)pts.push(xy(p[i],p[i+1]));
   entities.push({...base,type:'polyline',pts,closed:Boolean(p[0])});
  }else if(kind==='C'&&p.length===3&&p[2]>0)entities.push({...base,type:'circle',c:xy(p[0],p[1]),r:p[2]*factor});
  else if(kind==='A'&&p.length===5&&p[2]>0)entities.push({...base,type:'arc',c:xy(p[0],p[1]),r:p[2]*factor,a0:p[3],a1:p[4]});
  else if(kind==='R'&&p.length===4)entities.push({...base,type:'rect',a:xy(p[0],p[1]),b:xy(p[2],p[3])});
  else if(kind==='E'&&p.length===5&&p[2]>0&&p[3]>0)entities.push({...base,type:'ellipse',c:xy(p[0],p[1]),rx:p[2]*factor,ry:p[3]*factor,rotation:p[4]});
  else throw Error('Entidad '+kind+' no compatible');
 }
 if(!entities.length||entities.length>1000)throw Error('Bloque vacío o demasiado grande');
 return entities;
}
function preview(entities,name){
 const svg=document.createElementNS(NS,'svg');
 svg.setAttribute('role','img');svg.setAttribute('aria-label','Geometría real del bloque '+name);
 svg.style.cssText='display:block;width:100%;height:110px;background:#111923;border-radius:7px';
 const points=[];
 const track=p=>{if(p&&safeNumber(p.x)&&safeNumber(p.y))points.push(p)};
 for(const e of entities){
  if(e.type==='line'||e.type==='rect'){track(e.a);track(e.b)}
  else if(e.type==='polyline')e.pts.forEach(track);
  else if(e.type==='circle'||e.type==='arc'||e.type==='ellipse'){
   const rx=e.rx||e.r,ry=e.ry||e.r;track({x:e.c.x-rx,y:e.c.y-ry});track({x:e.c.x+rx,y:e.c.y+ry});
  }
 }
 if(!points.length)return svg;
 const minX=Math.min(...points.map(p=>p.x)),maxX=Math.max(...points.map(p=>p.x));
 const minY=Math.min(...points.map(p=>p.y)),maxY=Math.max(...points.map(p=>p.y));
 const width=Math.max(.001,maxX-minX),height=Math.max(.001,maxY-minY),pad=Math.max(width,height)*.10;
 svg.setAttribute('viewBox',[minX-pad,-maxY-pad,width+2*pad,height+2*pad].join(' '));
 const g=document.createElementNS(NS,'g');g.setAttribute('transform','scale(1 -1)');
 for(const e of entities){
  let node;
  if(e.type==='line'){
   node=document.createElementNS(NS,'line');
   for(const [k,v] of Object.entries({x1:e.a.x,y1:e.a.y,x2:e.b.x,y2:e.b.y}))node.setAttribute(k,String(v));
  }else if(e.type==='polyline'){
   node=document.createElementNS(NS,e.closed?'polygon':'polyline');
   node.setAttribute('points',e.pts.map(p=>p.x+','+p.y).join(' '));
  }else if(e.type==='rect'){
   node=document.createElementNS(NS,'rect');node.setAttribute('x',String(Math.min(e.a.x,e.b.x)));node.setAttribute('y',String(Math.min(e.a.y,e.b.y)));
   node.setAttribute('width',String(Math.abs(e.b.x-e.a.x)));node.setAttribute('height',String(Math.abs(e.b.y-e.a.y)));
  }else if(e.type==='circle'){
   node=document.createElementNS(NS,'circle');node.setAttribute('cx',String(e.c.x));node.setAttribute('cy',String(e.c.y));node.setAttribute('r',String(e.r));
  }else if(e.type==='ellipse'){
   node=document.createElementNS(NS,'ellipse');node.setAttribute('cx',String(e.c.x));node.setAttribute('cy',String(e.c.y));
   node.setAttribute('rx',String(e.rx));node.setAttribute('ry',String(e.ry));
   node.setAttribute('transform','rotate('+(e.rotation*180/Math.PI)+' '+e.c.x+' '+e.c.y+')');
  }else if(e.type==='arc'){
   const span=((e.a1-e.a0)%(Math.PI*2)+Math.PI*2)%(Math.PI*2);
   if(span<1e-7){node=document.createElementNS(NS,'circle');node.setAttribute('cx',String(e.c.x));node.setAttribute('cy',String(e.c.y));node.setAttribute('r',String(e.r))}
   else{
    node=document.createElementNS(NS,'path');
    const x1=e.c.x+e.r*Math.cos(e.a0),y1=e.c.y+e.r*Math.sin(e.a0);
    const x2=e.c.x+e.r*Math.cos(e.a0+span),y2=e.c.y+e.r*Math.sin(e.a0+span);
    node.setAttribute('d','M '+x1+' '+y1+' A '+e.r+' '+e.r+' 0 '+(span>Math.PI?1:0)+' 1 '+x2+' '+y2);
   }
  }
  if(node){node.setAttribute('stroke','#ecf7ff');node.setAttribute('stroke-width',String(Math.max(.001,Math.max(width,height)/260)));
   node.setAttribute('fill','none');node.setAttribute('stroke-linejoin','round');g.append(node)}
 }
 svg.append(g);
 return svg;
}
function init(){
 const host=$('blBody'),api=window.BlacklineBlockAPI;
 if(!host||!api||$('cad2dReal50'))return;
 const section=document.createElement('section');section.id='cad2dReal50';
 section.style.cssText='border:1px solid #536b7c;border-radius:11px;margin:10px 0;padding:9px';
 section.innerHTML='<div style="font-weight:750;font-size:12px;margin-bottom:7px">IMPORTAR MÁS BLOQUES · JSON</div><p style="font-size:10px;line-height:1.5;margin:4px 0 8px">Opcional: añadí una biblioteca de bloques desde un archivo JSON compatible. Los bloques básicos ya están disponibles arriba, sin cargar archivos. Verificá las medidas del material importado.</p><input type="file" id="cad2dReal50File" accept=".json,application/json" style="font-size:10px;width:100%"><div id="cad2dReal50Status" role="status" style="font-size:10px;margin:8px 0"></div><input id="cad2dReal50Search" type="search" placeholder="Buscar en 50 bloques…" style="width:100%;margin:5px 0" hidden><div id="cad2dReal50Tabs" style="display:flex;gap:4px;flex-wrap:wrap;margin:5px 0"></div><div id="cad2dReal50Grid" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;max-height:400px;overflow:auto"></div>';
 host.append(section);
 const status=$('cad2dReal50Status'),input=$('cad2dReal50File'),tabs=$('cad2dReal50Tabs'),grid=$('cad2dReal50Grid'),search=$('cad2dReal50Search');
 function show(){
  tabs.replaceChildren();grid.replaceChildren();
  const cats=['Todos',...new Set(entries.map(e=>e.record[1]))];
  for(const c of cats){const b=document.createElement('button');b.className='btn slim';b.type='button';b.textContent=c;b.setAttribute('aria-pressed',String(c===category));b.onclick=()=>{category=c;show()};tabs.append(b)}
  const matching=entries.filter(x=>(category==='Todos'||x.record[1]===category)&&x.record[0].toLocaleLowerCase().includes(query));
  status.textContent=entries.length+' bloques reales listos · '+matching.length+' visibles · escala orientativa';
  for(const item of matching){
   const card=document.createElement('div');card.style.cssText='border:1px solid #41586b;border-radius:9px;background:#2c3540;padding:6px;min-width:0';
   card.append(preview(item.geometry,item.record[0]));
   const name=document.createElement('div');name.textContent=item.record[0];name.style.cssText='font-size:10px;margin:5px 0;overflow-wrap:anywhere';
   const metrics=document.createElement('div');metrics.textContent='≈ '+item.record[2]+' × '+item.record[3]+' m';metrics.style.cssText='font-size:9px;color:#b3c6d1;margin-bottom:5px';
   const b=document.createElement('button');b.className='btn slim';b.type='button';b.textContent='Insertar bloque';b.style.width='100%';
   b.onclick=()=>{try{api.selectBlock(item.key);b.textContent='Listo · clic en plano'}catch(err){status.textContent='No se puede insertar: '+err.message}};
   card.append(name,metrics,b);grid.append(card);
  }
 }
 input.addEventListener('change',async()=>{
  const file=input.files?.[0];if(!file)return;
  if(file.size>3_000_000){status.textContent='El paquete seleccionado es demasiado grande. Usá la selección JSON de 50 bloques.';return}
  try{
   const pack=JSON.parse(await file.text());
   if(pack.format!=='CAD2D-OLIMPIADAS-50'||!Array.isArray(pack.records)||pack.records.length!==50)throw Error('Seleccioná un archivo de biblioteca JSON compatible con 50 registros');
   const prepared=pack.records.map(record=>{
    if(!Array.isArray(record)||typeof record[0]!=='string'||typeof record[1]!=='string'||!Array.isArray(record[4]))throw Error('Registro de bloque inválido');
    return {record,geometry:unpack(record),key:'Biblioteca importada · '+record[0]};
   });
   let added=0;const factor=UNIT[api.unit()]||1;
   for(const item of prepared){
    if(!api.hasBlock(item.key)){api.addBlock(item.key,unpack(item.record,factor));added++}
   }
   entries=prepared;category='Todos';query='';search.value='';search.hidden=false;
   show();status.textContent=entries.length+' bloques reales organizados; '+added+' incorporados al proyecto. Guardá tu proyecto CADJSON.';
  }catch(error){status.textContent='No se cargó la biblioteca: '+error.message}
 });
 search.addEventListener('input',()=>{query=search.value.toLocaleLowerCase().trim();show()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();