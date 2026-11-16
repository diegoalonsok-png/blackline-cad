/* Imported DXF symbol collections, organized without replacing native blocks.
   Import remains browser-local; the user's source drawing is not uploaded. */
(() => {
"use strict";
const $ = id => document.getElementById(id);
const sourceUnits = {1:.0254,2:.3048,4:.001,5:.01,6:1,7:1000,8:2.54e-8,9:.0000254,10:.9144};
const categories = [
 [/^ca_arb|arbol|tree/i,"Árboles y vegetación"],
 [/^ca_puerta|abertura|window|door/i,"Puertas y aberturas"],
 [/^ca_v_|^ca_auto|automovil|auto/i,"Vehículos y transporte"],
 [/^ca_ba_|sanitario|inodoro|bidet|ducha|lavatorio|bañera|vanitory/i,"Baños y sanitarios"],
 [/^ca_co_|cocina|refriger/i,"Cocinas"],
 [/^ca_dorm|dormitorio|bed/i,"Dormitorios"],
 [/^ca_mueb|mueble|mesa|silla|sillon/i,"Mobiliario"],
 [/^ca_ofic|oficina/i,"Oficinas"],
 [/^ca_pers|persona/i,"Personas"],
 [/^ca_norte|norte/i,"Orientación y símbolos"]
];
const categoryFor = name => categories.find(([re]) => re.test(name))?.[1] || "Otros";
let collection = null, selectedCategory = "", searchText = "", shown = 60;
function parseFloatOr(v,fallback=0){const n=Number(v);return Number.isFinite(n)?n:fallback}
function parsePairsFromFile(file,onGroup,onProgress){
 return (async()=>{
  const reader=file.stream().getReader(),decoder=new TextDecoder("windows-1252");
  let buffer="", pending=null,bytes=0;
  function consume(s){buffer+=s;let pos;
   while((pos=buffer.indexOf("\n"))>=0){
    const line=buffer.slice(0,pos).replace(/\r$/,"");buffer=buffer.slice(pos+1);
    if(pending===null){pending=line.trim();continue}
    onGroup(pending,line);pending=null;
   }
  }
  while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;consume(decoder.decode(value,{stream:true}));onProgress(Math.round(bytes*100/file.size));}
  consume(decoder.decode());if(buffer&&pending!==null)onGroup(pending,buffer.replace(/\r$/,""));
 })();
}
async function readDXF(file,onProgress){
 const blocks=new Map();let section="",waitingSection=false,block=null,entity=null,units=0,awaitUnits=false;
 const supported=new Set(["LINE","CIRCLE","ARC","LWPOLYLINE","ELLIPSE","INSERT","TEXT","MTEXT","SPLINE"]);
 function finishEntity(){
  if(entity&&block&&supported.has(entity.type))block.items.push(entity);
  entity=null;
 }
 function accept(code,value){
  if(code==="0"){
   finishEntity();
   if(value==="SECTION"){waitingSection=true;return}
   if(value==="ENDSEC"){section="";block=null;return}
   if(section!=="BLOCKS")return;
   if(value==="BLOCK"){block={name:"",baseX:0,baseY:0,items:[]};return}
   if(value==="ENDBLK"){if(block?.name&&!block.name.startsWith("*"))blocks.set(block.name,block);block=null;return}
   if(block&&supported.has(value)){entity={type:value,g:{},vertices:[]};return}
   return;
  }
  if(waitingSection){if(code==="2"){section=value;waitingSection=false}return}
  if(section==="HEADER"){
   if(code==="9")awaitUnits=value==="$INSUNITS";
   else if(awaitUnits&&code==="70"){units=Number(value);awaitUnits=false}
  }
  if(section!=="BLOCKS"||!block)return;
  if(entity){
   const g=entity.g;if(!g[code])g[code]=[];g[code].push(value);
   if(entity.type==="LWPOLYLINE"&&code==="10")entity.vertices.push({x:parseFloatOr(value),y:0});
   if(entity.type==="LWPOLYLINE"&&code==="20"&&entity.vertices.length)entity.vertices[entity.vertices.length-1].y=parseFloatOr(value);
  }else{
   if(code==="2")block.name=value;
   if(code==="10")block.baseX=parseFloatOr(value);
   if(code==="20")block.baseY=parseFloatOr(value);
  }
 }
 await parsePairsFromFile(file,accept,onProgress);
 finishEntity();
 return {blocks,units};
}
const value=(e,c,n=0)=>e.g[c]?.[n];
const num=(e,c,n=0,def=0)=>parseFloatOr(value(e,c,n),def);
function transformPoint(x,y,t){return {x:t.x+t.a*x+t.b*y,y:t.y+t.c*x+t.d*y}}
function categoryPanel(){
 const parent=$("blBody");if(!parent)return;
 const area=document.createElement("div");area.id="blDxfImportArea";
 area.style.cssText="border-top:1px solid #43535a;margin-top:12px;padding-top:10px";
 area.innerHTML='<label style="display:block;font-weight:600;margin-bottom:6px">Colecciones DXF · bloques originales</label><input type="file" id="blDxfLibraryFile" accept=".dxf" style="width:100%;font-size:11px"><p id="blDxfLibraryStatus" style="font-size:11px;line-height:1.5">Seleccioná tu archivo DXF para catalogar los bloques sin alterar el dibujo.</p><input type="search" id="blDxfBlockSearch" placeholder="Buscar nombre de bloque" aria-label="Buscar bloques DXF" style="width:100%;min-width:0;margin:5px 0" disabled><div id="blDxfCategories" style="display:flex;flex-wrap:wrap;gap:4px;margin:6px 0"></div><div id="blDxfCards" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;max-height:320px;overflow:auto"></div><button type="button" id="blDxfMore" class="btn slim" hidden>Mostrar más bloques</button>';
 parent.append(area);
 const input=$("blDxfLibraryFile"),status=$("blDxfLibraryStatus"),cats=$("blDxfCategories"),cards=$("blDxfCards"),search=$("blDxfBlockSearch"),more=$("blDxfMore");
 const all=()=>collection?[...collection.blocks.values()].filter(b=>categoryFor(b.name)===selectedCategory&&b.name.toLocaleLowerCase().includes(searchText)):[];
 function render(){
  if(!collection)return;cats.replaceChildren();cards.replaceChildren();
  const numbers=new Map();for(const b of collection.blocks.values()){const c=categoryFor(b.name);numbers.set(c,(numbers.get(c)||0)+1)}
  for(const [c,count] of numbers){
   const btn=document.createElement("button");btn.type="button";btn.className="btn slim";btn.textContent=c+" ("+count+")";btn.style.cssText="font-size:10px;white-space:normal";
   if(c===selectedCategory)btn.setAttribute("aria-pressed","true");
   btn.onclick=()=>{selectedCategory=c;shown=60;render()};cats.append(btn);
  }
  const matches=all();for(const b of matches.slice(0,shown)){
   const btn=document.createElement("button");btn.type="button";btn.className="btn";btn.textContent=b.name;
   btn.title=b.items.length+" entidades de origen · insertar bloque";btn.style.cssText="font-size:11px;white-space:normal;overflow-wrap:anywhere;min-height:42px;text-align:left;padding:6px";
   btn.onclick=()=>insert(b);cards.append(btn);
  }
  more.hidden=matches.length<=shown;more.textContent="Mostrar más ("+shown+" / "+matches.length+")";
 }
 function insert(b){
  const unitMeters={mm:.001,cm:.01,m:1,in:.0254,ft:.3048};
  const factor=(sourceUnits[collection.units]||1)/(unitMeters[state.unit]||1);
  const output=[],stack=new Set(),skipped={value:0};
  function flatten(block,t,depth){
   if(depth>12||stack.has(block.name)||output.length>45000)return;
   stack.add(block.name);
   for(const e of block.items){
    if(output.length>45000)break;
    const type=e.type;
    if(type==="INSERT"){
     const nested=collection.blocks.get(value(e,"2"));if(!nested){skipped.value++;continue}
     const theta=num(e,"50")*Math.PI/180,sx=num(e,"41",0,1),sy=num(e,"42",0,1);
     const c=Math.cos(theta),s=Math.sin(theta),px=num(e,"10")-nested.baseX,py=num(e,"20")-nested.baseY;
     const origin=transformPoint(px,py,t);
     const nt={x:origin.x,y:origin.y,a:t.a*c*sx+t.b*s*sx,b:-t.a*s*sy+t.b*c*sy,c:t.c*c*sx+t.d*s*sx,d:-t.c*s*sy+t.d*c*sy};
     flatten(nested,nt,depth+1);continue;
    }
    const pt=(x,y)=>transformPoint(x,y,t);
    if(type==="LINE")output.push({type:"line",a:pt(num(e,"10"),num(e,"20")),b:pt(num(e,"11"),num(e,"21"))});
    else if(type==="LWPOLYLINE"){
     const vertices=e.vertices.map(p=>pt(p.x,p.y));
     if(vertices.length>1)output.push({type:"polyline",pts:vertices,closed:!!(num(e,"70")&1)});
    }else if(type==="CIRCLE"||type==="ARC"){
     const c=pt(num(e,"10"),num(e,"20"));const rx=Math.hypot(t.a,t.c)*num(e,"40"),ry=Math.hypot(t.b,t.d)*num(e,"40");
     if(Math.abs(rx-ry)>1e-6*Math.max(rx,ry)){skipped.value++;continue}
     if(type==="CIRCLE")output.push({type:"circle",c,r:rx});
     else{const rotation=Math.atan2(t.c,t.a);output.push({type:"arc",c,r:rx,a0:num(e,"50")*Math.PI/180+rotation,a1:num(e,"51")*Math.PI/180+rotation})}
    }else if(type==="ELLIPSE"){
     const center=pt(num(e,"10"),num(e,"20")),mx=num(e,"11"),my=num(e,"21"),m=pt(num(e,"10")+mx,num(e,"20")+my);
     const rx=Math.hypot(m.x-center.x,m.y-center.y),ry=rx*num(e,"40",0,1);
     if(rx&&ry)output.push({type:"ellipse",c:center,rx,ry,rotation:Math.atan2(m.y-center.y,m.x-center.x)});
    }else skipped.value++;
   }
   stack.delete(block.name);
  }
  flatten(b,{x:-b.baseX,y:-b.baseY,a:1,b:0,c:0,d:1},0);
  if(!output.length){status.textContent="El bloque "+b.name+" no contiene geometría 2D compatible; no se modificó el dibujo.";return}
  for(const e of output){for(const key of ["a","b","c"]){if(e[key]?.x!==undefined){e[key].x*=factor;e[key].y*=factor}}if(e.pts)e.pts.forEach(p=>{p.x*=factor;p.y*=factor});if(e.r)e.r*=factor;if(e.rx)e.rx*=factor;if(e.ry)e.ry*=factor}
  const key="OLIMPIADAS · "+b.name;
  try{
   const geometry=normalizeBlockEntities(output);
   if(state.blocks[key]&&!window.confirm("Ya existe "+key+". ¿Reemplazar su definición?"))return;
   saveHistory();state.blocks[key]={name:key,entities:geometry};renderBlockLibrary();
   $("blockLibrary").value=key;$("blockScale").value="1";$("blockRotation").value="0";
   state.galleryRepeatedInsert=true;setTool("insertBlock");
   status.textContent="Bloque preparado: "+b.name+" · "+geometry.length+" entidades 2D"+(skipped.value?" · "+skipped.value+" entidades complejas no convertidas":"")+". Hacé clic sobre el plano para insertarlo.";
  }catch(error){status.textContent="No se pudo convertir "+b.name+": "+error.message}
 }
 input.addEventListener("change",async()=>{
  const file=input.files?.[0];if(!file)return;if(!/\.dxf$/i.test(file.name)){status.textContent="Seleccioná un archivo DXF ASCII.";return}
  input.disabled=true;status.textContent="Leyendo bloques del DXF…";try{
   const parsed=await readDXF(file,pct=>status.textContent="Organizando biblioteca: "+pct+" %");
   collection=parsed;shown=60;searchText="";search.value="";search.disabled=false;
   selectedCategory=categoryFor([...collection.blocks.values()][0]?.name||"");
   status.textContent=collection.blocks.size+" bloques nombrados encontrados en "+file.name+". Elegí una categoría y un bloque para insertarlo.";
   render();
  }catch(e){status.textContent="Error al importar la biblioteca: "+e.message}finally{input.disabled=false}
 });
 search.addEventListener("input",()=>{searchText=search.value.trim().toLocaleLowerCase();shown=60;render()});
 more.addEventListener("click",()=>{shown+=60;render()});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",categoryPanel,{once:true});else categoryPanel();
})();
