/* Imported DXF symbol collections, organized without replacing native blocks.
   Import remains browser-local; the user's source drawing is not uploaded. */
(() => {
"use strict";
const $ = id => document.getElementById(id);
const sourceUnits = {1:.0254,2:.3048,4:.001,5:.01,6:1,7:1000,8:2.54e-8,9:.0000254,10:.9144};
const cad=()=>window.BlacklineBlockAPI;
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
const categoryFor = name => {
 const n=String(name).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
 if(/camion|truck|volquete|cisterna|tractor/.test(n))return "Camiones";
 if(/colectivo|bus|omnibus|autobus/.test(n))return "Colectivos";
 if(/auto|vehicul|coche|carro|sedan|suv/.test(n))return "Automóviles";
 if(/arbol|tree|palmera|pino|arbusto/.test(n))return "Árboles";
 if(/ventana|window/.test(n))return "Ventanas";
 if(/puerta|door/.test(n))return "Puertas";
 if(/cocina|kitchen/.test(n))return "Cocinas";
 if(/sanitario|inodoro|bidet|lavatorio|bañera|ducha/.test(n))return "Sanitarios";
 if(/persona|people|human/.test(n))return "Personas";
 if(/mesa|sillon|sofa|silla|cama|armario|mueble/.test(n))return "Mobiliario";
 return categories.find(([re]) => re.test(name))?.[1] || "Otros";
};
function labelCategory(c){return ({Automóviles:"Auto",Camiones:"Camión",Colectivos:"Colectivo",Árboles:"Árbol",Puertas:"Puerta",Ventanas:"Ventana",Cocinas:"Cocina",Sanitarios:"Sanitario",Personas:"Persona",Mobiliario:"Mobiliario"})[c]||"Bloque"}
function fingerprint(b){
 // Conservative exact-match fingerprint: only eliminates byte-equivalent DXF geometry, not similar silhouettes.
 return JSON.stringify(b.items.map(e=>[e.type,Object.keys(e.g).sort().filter(k=>!["5","8","62","330","100"].includes(k)).map(k=>[k,e.g[k]]),e.vertices]));
}
function organizeBlocks(parsed){
 const seen=new Set(),numbers=new Map(),unique=new Map();let duplicates=0;
 for(const b of parsed.blocks.values()){
  if(!b.items.length)continue;
  const hash=fingerprint(b);
  if(seen.has(hash)){duplicates++;continue}
  seen.add(hash);
  const cat=categoryFor(b.name),i=(numbers.get(cat)||0)+1;numbers.set(cat,i);
  b.displayName=labelCategory(cat)+" "+i;b.category=cat;
  unique.set(b.name,b);
 }
 // Keep raw lookup intact: nested INSERT references may refer to blocks omitted from the visible catalog.
 parsed.visible=[...unique.values()];parsed.duplicates=duplicates;return parsed;
}
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
function blockPreview(block){
 const ns="http://www.w3.org/2000/svg",svg=document.createElementNS(ns,"svg");
 svg.setAttribute("viewBox","0 0 120 95");svg.setAttribute("role","img");svg.setAttribute("aria-label","Vista previa de "+block.name);
 svg.style.cssText="display:block;width:100%;height:90px;min-height:90px;background:#0f1b23;border-radius:4px";
 const primitives=[],xs=[],ys=[];
 const point=(x,y)=>{if(Number.isFinite(x)&&Number.isFinite(y)){xs.push(x);ys.push(y);}};
 for(const e of block.items){
  if(primitives.length>=220)break;
  const type=e.type;
  if(type==="LINE"){const x=num(e,"10"),y=num(e,"20"),xx=num(e,"11"),yy=num(e,"21");primitives.push({type,x,y,xx,yy});point(x,y);point(xx,yy);}
  else if(type==="LWPOLYLINE"&&e.vertices.length>=2){const pts=e.vertices.slice(0,220).map(p=>[p.x,p.y]);primitives.push({type,pts});pts.forEach(p=>point(...p));}
  else if(type==="CIRCLE"||type==="ARC"){const x=num(e,"10"),y=num(e,"20"),r=num(e,"40");if(r>0){primitives.push({type,x,y,r});point(x-r,y-r);point(x+r,y+r);}}
 }
 if(!xs.length){const text=document.createElementNS(ns,"text");text.setAttribute("x","60");text.setAttribute("y","49");text.setAttribute("fill","#91a2ac");text.setAttribute("font-size","10");text.setAttribute("text-anchor","middle");text.textContent="Vista 2D no disponible";svg.append(text);return svg;}
 const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 const scale=Math.min(108/Math.max(maxX-minX,1e-8),83/Math.max(maxY-minY,1e-8));
 const group=document.createElementNS(ns,"g");
 group.setAttribute("transform","translate("+(60-(maxX+minX)*scale/2)+" "+(47.5+(maxY+minY)*scale/2)+") scale("+scale+" "+(-scale)+")");
 group.setAttribute("fill","none");group.setAttribute("stroke","#9bd5ed");group.setAttribute("stroke-width",String(Math.max(.0001,1.2/scale)));
 for(const p of primitives){let shape;
  if(p.type==="LINE"){shape=document.createElementNS(ns,"line");shape.setAttribute("x1",p.x);shape.setAttribute("y1",p.y);shape.setAttribute("x2",p.xx);shape.setAttribute("y2",p.yy);}
  else if(p.type==="LWPOLYLINE"){shape=document.createElementNS(ns,"polyline");shape.setAttribute("points",p.pts.map(x=>x.join(",")).join(" "));}
  else{shape=document.createElementNS(ns,"circle");shape.setAttribute("cx",p.x);shape.setAttribute("cy",p.y);shape.setAttribute("r",p.r);}
  group.append(shape);
 }
 svg.append(group);return svg;
}
function categoryPanel(){
 const parent=$("blBody");if(!parent)return;
 const area=document.createElement("div");area.id="blDxfImportArea";
 area.style.cssText="border-top:1px solid #43535a;margin-top:12px;padding-top:10px";
 area.innerHTML='<label style="display:block;font-weight:600;margin-bottom:6px">Colecciones DXF · bloques originales</label><input type="file" id="blDxfLibraryFile" accept=".dxf" style="width:100%;font-size:11px"><p id="blDxfLibraryStatus" style="font-size:11px;line-height:1.5">Seleccioná tu archivo DXF para catalogar los bloques sin alterar el dibujo.</p><input type="search" id="blDxfBlockSearch" placeholder="Buscar nombre de bloque" aria-label="Buscar bloques DXF" style="width:100%;min-width:0;margin:5px 0" disabled><div id="blDxfCategories" style="display:flex;flex-wrap:wrap;gap:4px;margin:6px 0"></div><div id="blDxfCards" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;max-height:320px;overflow:auto"></div><button type="button" id="blDxfMore" class="btn slim" hidden>Mostrar más bloques</button>';
 parent.append(area);
 const input=$("blDxfLibraryFile"),status=$("blDxfLibraryStatus"),cats=$("blDxfCategories"),cards=$("blDxfCards"),search=$("blDxfBlockSearch"),more=$("blDxfMore");
 const all=()=>collection?collection.visible.filter(b=>(selectedCategory==="Todas"||b.category===selectedCategory)&&(b.displayName+" "+b.name).toLocaleLowerCase().includes(searchText)):[];
 function render(){
  if(!collection)return;cats.replaceChildren();cards.replaceChildren();
  const numbers=new Map([["Todas",collection.visible.length]]);for(const b of collection.visible){const c=b.category;numbers.set(c,(numbers.get(c)||0)+1)}
  for(const [c,count] of numbers){
   const btn=document.createElement("button");btn.type="button";btn.className="btn slim";btn.textContent=c+" ("+count+")";btn.style.cssText="font-size:10px;white-space:normal";
   if(c===selectedCategory)btn.setAttribute("aria-pressed","true");
   btn.onclick=()=>{selectedCategory=c;shown=60;render()};cats.append(btn);
  }
  const matches=all();for(const b of matches.slice(0,shown)){
   const card=document.createElement("div");card.className="bl-dxf-block-card";
   card.style.cssText="min-width:0;border:1px solid #3e5260;border-radius:5px;padding:5px;display:flex;flex-direction:column;gap:5px";
   card.append(blockPreview(b));
   const label=document.createElement("div");label.textContent=b.displayName;label.title="Original: "+b.name;label.style.cssText="font-size:11px;overflow-wrap:anywhere";card.append(label);
   const key="OLIMPIADAS · "+b.displayName,existing=Boolean(cad()?.hasBlock(key));
   const btn=document.createElement("button");btn.type="button";btn.className="btn slim";
   btn.textContent=existing?"Ya está en la paleta":"Añadir a paleta";
   btn.disabled=existing;btn.onclick=()=>addToPalette(b,btn);
   card.append(btn);
   if(existing){const pick=document.createElement("button");pick.type="button";pick.className="btn slim";pick.textContent="Insertar en el plano";pick.onclick=()=>cad().selectBlock(key);card.append(pick)}
   cards.append(card);
  }
  more.hidden=matches.length<=shown;more.textContent="Mostrar más ("+shown+" / "+matches.length+")";
 }
 function addToPalette(b,button){
  const api=cad();if(!api){status.textContent="El motor de bloques todavía no está disponible. Actualizá la página y volvé a intentar.";return}
  const unitMeters={mm:.001,cm:.01,m:1,in:.0254,ft:.3048};
  const factor=(sourceUnits[collection.units]||1)/(unitMeters[api.unit()]||1);
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
  const key="OLIMPIADAS · "+b.displayName;
  try{
   if(api.hasBlock(key)){status.textContent="Este bloque ya se encuentra en la paleta: "+b.name;return}
   const count=api.addBlock(key,output);
   button.textContent="Ya está en la paleta";button.disabled=true;
   const pick=document.createElement("button");pick.type="button";pick.className="btn slim";pick.textContent="Insertar en el plano";pick.onclick=()=>api.selectBlock(key);button.parentElement.append(pick);
   status.textContent="Añadido a la paleta: "+b.name+" · "+count+" entidades 2D"+(skipped.value?" · "+skipped.value+" entidades complejas omitidas":"")+". Usá Insertar en el plano cuando quieras colocarlo.";
  }catch(error){status.textContent="No se pudo convertir "+b.name+": "+error.message}
 }
 input.addEventListener("change",async()=>{
  const file=input.files?.[0];if(!file)return;if(!/\.dxf$/i.test(file.name)){status.textContent="Seleccioná un archivo DXF ASCII.";return}
  input.disabled=true;status.textContent="Leyendo bloques del DXF…";try{
   const parsed=await readDXF(file,pct=>status.textContent="Organizando biblioteca: "+pct+" %");
   collection=organizeBlocks(parsed);shown=60;searchText="";search.value="";search.disabled=false;
   selectedCategory="Todas";
   status.textContent=collection.visible.length+" bloques únicos catalogados de "+collection.blocks.size+" definiciones en "+file.name+"; "+collection.duplicates+" duplicados exactos omitidos. Los originales siguen intactos. Elegí una categoría y pulsá Añadir a paleta.";
   render();
  }catch(e){status.textContent="Error al importar la biblioteca: "+e.message}finally{input.disabled=false}
 });
 search.addEventListener("input",()=>{searchText=search.value.trim().toLocaleLowerCase();shown=60;render()});
 more.addEventListener("click",()=>{shown+=60;render()});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",categoryPanel,{once:true});else categoryPanel();
})();
