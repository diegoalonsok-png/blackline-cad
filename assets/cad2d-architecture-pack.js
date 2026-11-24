/* CAD2D · Lote adicional de 28 símbolos arquitectónicos originales.
 * Carga optativa y a demanda: el panel sólo presenta miniaturas ligeras;
 * la definición se añade al dibujo únicamente al pulsar Insertar.
 * No modifica las paletas previas ni los bloques existentes.
 */
(()=>{
"use strict";
const NS="http://www.w3.org/2000/svg";
const BASE="assets/architecture-demand-v1/",FILE=BASE+"catalog.json";
const FACTOR={m:1,cm:100,mm:1000,in:39.37007874015748,ft:3.28083989501312};
const PREFIX="CAD2D Arquitectura 2026 · ";
const $=id=>document.getElementById(id);
let catalog=null,selected="Todos",filter="";
function safePack(pack){
 if(pack?.schema!=="cad2d-architecture-metadata-v1"||pack.units!=="m"||pack.blocks?.length!==28)throw Error("Catálogo inválido");
 const ids=new Set(),keys=new Set();
 for(const item of pack.blocks){
  if(typeof item.id!=="string"||!item.id||ids.has(item.id)||!/^block-\d{2}$/.test(item.key)||keys.has(item.key)||!(item.width>0&&item.depth>0&&item.width<20&&item.depth<20)||"parts" in item)throw Error("Metadatos inválidos");
  ids.add(item.id);keys.add(item.key);
 }
 return pack;
}
function safeBlock(item,meta){
 if(item?.id!==meta.id||item.width!==meta.width||item.depth!==meta.depth||!Array.isArray(item.parts)||!item.parts.length||item.parts.length>100)throw Error("Bloque inválido");
 for(const p of item.parts){
  const size={line:5,rect:5,circle:4,ellipse:5}[p?.[0]];
  if(!Array.isArray(p)||p.length!==size||p.slice(1).some(n=>!Number.isFinite(n)))throw Error("Geometría inválida");
 }
 return item;
}
function geometry(item,unit){
 const mul=FACTOR[unit]||1,p=(x,y)=>({x:x*mul,y:y*mul});
 return item.parts.map(d=>{
  if(d[0]==="line")return {type:"line",a:p(d[1],d[2]),b:p(d[3],d[4]),layer:"0"};
  if(d[0]==="rect")return {type:"rect",a:p(d[1],d[2]),b:p(d[1]+d[3],d[2]+d[4]),layer:"0"};
  if(d[0]==="circle")return {type:"circle",c:p(d[1],d[2]),r:d[3]*mul,layer:"0"};
  return {type:"ellipse",c:p(d[1],d[2]),rx:d[3]*mul,ry:d[4]*mul,rotation:0,layer:"0"};
 });
}
function thumbnail(item){
 const img=document.createElement("img");
 img.src=BASE+item.key+".svg";img.alt="Planta de "+item.id;img.loading="lazy";img.decoding="async";
 img.style.cssText="display:block;width:100%;height:96px;object-fit:contain;background:#111923;border-radius:6px";
 return img;
}
function init(){
 const container=$("blBody"),api=window.BlacklineBlockAPI;
 if(!container||!api||$("cad2dAdditional28"))return;
 const pane=document.createElement("section");pane.id="cad2dAdditional28";
 pane.style.cssText="border:1px solid #526879;border-radius:9px;padding:8px;margin:12px 0";
 const heading=document.createElement("div");
 heading.textContent="28 BLOQUES ADICIONALES · ARQUITECTURA";
 heading.style.cssText="font-size:11px;font-weight:700;letter-spacing:.015em";
 const help=document.createElement("p");
 help.textContent="Geometría vectorial original a escala 1:1. Cada símbolo se agrega sólo cuando lo insertás; los bloques existentes se conservan.";
 help.style.cssText="font-size:10px;line-height:1.5;margin:5px 0";
 const search=document.createElement("input");search.type="search";
 search.placeholder="Buscar bloques nuevos";search.setAttribute("aria-label","Buscar entre 28 bloques de arquitectura");
 search.style.cssText="width:100%;font-size:11px;margin:4px 0";
 const tabs=document.createElement("div");tabs.style.cssText="display:flex;flex-wrap:wrap;gap:4px;margin:6px 0";
 const cards=document.createElement("div");
 cards.style.cssText="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;max-height:320px;overflow:auto";
 const status=document.createElement("p");status.setAttribute("role","status");
 status.style.cssText="font-size:10px;line-height:1.5;margin:6px 0 2px";
 status.textContent="Cargando catálogo vectorial…";
 pane.append(heading,help,search,tabs,cards,status);
 container.append(pane);
 function show(){
  if(!catalog)return;
  tabs.replaceChildren();cards.replaceChildren();
  const options=["Todos",...new Set(catalog.blocks.map(x=>x.category))];
  for(const category of options){
   const button=document.createElement("button");button.type="button";
   button.className="btn slim";button.style.cssText="font-size:10px";
   button.textContent=category;button.setAttribute("aria-pressed",String(category===selected));
   button.addEventListener("click",()=>{selected=category;show()});
   tabs.append(button);
  }
  const visible=catalog.blocks.filter(item=>
   (selected==="Todos"||item.category===selected)&&
   (item.id+" "+item.category).toLocaleLowerCase().includes(filter));
  for(const item of visible){
   const cell=document.createElement("div");
   cell.style.cssText="min-width:0;border:1px solid #465966;border-radius:7px;padding:5px";
   const label=document.createElement("div");label.textContent=item.id;
   label.style.cssText="font-size:10px;margin:5px 0;overflow-wrap:anywhere";
   const measure=document.createElement("div");
   measure.textContent=item.width.toFixed(2)+" × "+item.depth.toFixed(2)+" m";
   measure.style.cssText="font-size:9px;opacity:.85;margin-bottom:5px";
   const button=document.createElement("button");button.type="button";
   button.className="btn slim";button.style.cssText="font-size:10px;width:100%";
   button.textContent="Insertar bloque";
   button.addEventListener("click",async()=>{
    const key=PREFIX+item.id;button.disabled=true;
    try{
     if(!api.hasBlock(key)){
      const response=await fetch(BASE+item.key+".json",{cache:"no-store"});
      if(!response.ok)throw Error("HTTP "+response.status);
      const block=safeBlock(await response.json(),item);
      if(!api.hasBlock(key))api.addBlock(key,geometry(block,api.unit()));
     }
     api.selectBlock(key);
     status.textContent=item.id+" · seleccionado. Un clic en el plano para insertar. Podés escalar, girar o espejar la referencia.";
     button.textContent="Seleccionado · clic en plano";
    }catch(err){status.textContent="No se pudo preparar el bloque: "+err.message}finally{button.disabled=false}
   });
   cell.append(thumbnail(item),label,measure,button);cards.append(cell);
  }
  status.textContent=visible.length+" bloques visibles de "+catalog.blocks.length+" disponibles. La geometría se descarga solamente al elegir un bloque.";
 }
 search.addEventListener("input",()=>{filter=search.value.toLocaleLowerCase().trim();show()});
 fetch(FILE,{cache:"no-cache"}).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()})
  .then(safePack).then(pack=>{catalog=pack;show()})
  .catch(err=>{status.textContent="No se pudo abrir el catálogo adicional: "+err.message});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
else init();
})();
