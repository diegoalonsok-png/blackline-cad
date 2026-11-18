/* CAD2D · Lote adicional de 28 símbolos arquitectónicos originales.
 * Carga optativa y a demanda: el panel sólo presenta miniaturas ligeras;
 * la definición se añade al dibujo únicamente al pulsar Insertar.
 * No modifica las paletas previas ni los bloques existentes.
 */
(()=>{
"use strict";
const NS="http://www.w3.org/2000/svg";
const FILE="assets/cad2d-architecture-pack-28.json";
const FACTOR={m:1,cm:100,mm:1000,in:39.37007874015748,ft:3.28083989501312};
const PREFIX="CAD2D Arquitectura 2026 · ";
const $=id=>document.getElementById(id);
let catalog=null,selected="Todos",filter="";
function safePack(pack){
 if(pack?.schema!=="cad2d-architecture-blocks-v1"||pack.units!=="m"||pack.blocks?.length!==28)
  throw Error("El catálogo de bloques no coincide con su versión verificada");
 const ids=new Set();
 for(const item of pack.blocks){
  if(!item.id||ids.has(item.id)||!Array.isArray(item.parts)||!item.parts.length||item.parts.length>100||
    !(item.width>0&&item.depth>0&&item.width<20&&item.depth<20))throw Error("Bloque inválido");
  ids.add(item.id);
  for(const part of item.parts){
   if(!Array.isArray(part)||!["line","rect","circle","ellipse"].includes(part[0])||
    part.slice(1).some(n=>!Number.isFinite(n)))throw Error("Geometría inválida");
  }
 }
 return pack;
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
 const svg=document.createElementNS(NS,"svg");
 svg.setAttribute("viewBox",[-.08,-item.depth-.08,item.width+.16,item.depth+.16].join(" "));
 svg.setAttribute("role","img");svg.setAttribute("aria-label","Planta de "+item.id);
 svg.style.cssText="display:block;width:100%;height:96px;background:#111923;border-radius:6px";
 const group=document.createElementNS(NS,"g");
 group.setAttribute("transform","scale(1 -1)");
 group.setAttribute("fill","none");group.setAttribute("stroke","#e6f1f7");
 group.setAttribute("stroke-width",String(Math.max(.006,Math.min(item.width,item.depth)/125)));
 for(const part of item.parts){
  let el;
  if(part[0]==="line"){
   el=document.createElementNS(NS,"line");
   [["x1",part[1]],["y1",part[2]],["x2",part[3]],["y2",part[4]]].forEach(([k,v])=>el.setAttribute(k,v));
  }else if(part[0]==="rect"){
   el=document.createElementNS(NS,"rect");
   [["x",part[1]],["y",part[2]],["width",part[3]],["height",part[4]]].forEach(([k,v])=>el.setAttribute(k,v));
  }else if(part[0]==="circle"||part[0]==="ellipse"){
   el=document.createElementNS(NS,part[0]);
   el.setAttribute("cx",part[1]);el.setAttribute("cy",part[2]);
   if(part[0]==="circle")el.setAttribute("r",part[3]);
   else {el.setAttribute("rx",part[3]);el.setAttribute("ry",part[4]);}
  }
  if(el)group.append(el);
 }
 svg.append(group);return svg;
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
   button.addEventListener("click",()=>{
    const key=PREFIX+item.id;
    try{
     if(!api.hasBlock(key))api.addBlock(key,geometry(item,api.unit()));
     api.selectBlock(key);
     status.textContent=item.id+" · seleccionado. Un clic en el plano para insertar. Podés escalar, girar o espejar la referencia.";
     button.textContent="Seleccionado · clic en plano";
    }catch(err){status.textContent="No se pudo preparar el bloque: "+err.message}
   });
   cell.append(thumbnail(item),label,measure,button);cards.append(cell);
  }
  status.textContent=visible.length+" bloques visibles de "+catalog.blocks.length+" disponibles. Los 28 se cargan en la paleta solamente cuando los elegís.";
 }
 search.addEventListener("input",()=>{filter=search.value.toLocaleLowerCase().trim();show()});
 fetch(FILE,{cache:"no-cache"}).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()})
  .then(safePack).then(pack=>{catalog=pack;show()})
  .catch(err=>{status.textContent="No se pudo abrir el catálogo adicional: "+err.message});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
else init();
})();
