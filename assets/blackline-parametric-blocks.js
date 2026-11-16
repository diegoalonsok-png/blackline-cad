/* Blackline CAD parametric-symbol pilot. Original implementation: no Autodesk dynamic-block code.
 * Creates editable 2D geometry at requested dimensions; inserts through the existing block API.
 * Model coordinates retain the drawing's physical units; source DXF blocks stay unchanged.
 */
(function(){
"use strict";
const init=()=>{
 const api=window.BlacklineBlockAPI,body=document.getElementById("blBody");
 if(!api||!body||document.getElementById("blParametricPanel"))return;
 const panel=document.createElement("section");panel.id="blParametricPanel";
 panel.style.cssText="margin-top:12px;padding:10px;border:1px solid #536675;border-radius:8px";
 panel.innerHTML=`<div style="font-weight:700;margin-bottom:7px">BLOQUES PARAMÉTRICOS · PILOTO</div>
 <p style="font-size:11px;line-height:1.45">Puertas y mesas de geometría propia. Modificá dimensiones y pulsá Crear; después hacé clic en el dibujo para colocarlos.</p>
 <label style="display:block;margin:6px 0">Tipo <select id="blParamType" style="width:100%"><option value="door">Puerta abatible, planta</option><option value="table">Mesa rectangular, planta</option></select></label>
 <label style="display:block;margin:6px 0">Ancho (m) <input type="number" id="blParamWidth" min=".3" max="6" step=".05" value=".9" style="width:100%"></label>
 <label id="blParamDepthRow" style="display:none;margin:6px 0">Profundidad (m) <input type="number" id="blParamDepth" min=".3" max="6" step=".05" value=".8" style="width:100%"></label>
 <label id="blParamSideRow" style="display:block;margin:6px 0">Bisagra <select id="blParamSide" style="width:100%"><option value="left">Izquierda</option><option value="right">Derecha</option></select></label>
 <button class="btn" id="blParamGenerate" type="button" style="width:100%;margin-top:7px">Crear e insertar bloque</button>
 <p id="blParamFeedback" role="status" style="font-size:10px;margin:7px 0 0;color:#c0d1dc">Las dimensiones se ingresan en metros; la conversión al modelo es automática.</p>`;
 body.append(panel);
 const $=id=>document.getElementById(id);
 const unitScale={m:1,cm:100,mm:1000,in:39.37007874015748,ft:3.28083989501312};
 const m2u=n=>n*(unitScale[api.unit()]||1);
 const P=(x,y)=>({x:m2u(x),y:m2u(y)});
 function updateType(){
  const door=$("blParamType").value==="door";
  $("blParamDepthRow").style.display=door?"none":"block";
  $("blParamSideRow").style.display=door?"block":"none";
  $("blParamWidth").value=door?".9":"1.8";
 }
 $("blParamType").addEventListener("change",updateType);
 $("blParamGenerate").addEventListener("click",()=>{
  const width=Number($("blParamWidth").value),depth=Number($("blParamDepth").value);
  const door=$("blParamType").value==="door",right=$("blParamSide").value==="right";
  const msg=$("blParamFeedback");
  if(!Number.isFinite(width)||width<.3||width>6||(!door&&(!Number.isFinite(depth)||depth<.3||depth>6))){
   msg.textContent="Ingresá dimensiones válidas entre 0,30 y 6,00 m.";return;
  }
  let elements,name;
  if(door){
   // Local schematic door: leaf length and swing radius track the actual width.
   elements=[
    {type:"line",a:P(0,0),b:P(width,0),layer:"openings"},
    {type:"line",a:P(right?width:0,0),b:P(right?width:0,width),layer:"openings"},
    {type:"arc",c:P(right?width:0,0),r:m2u(width),a0:right?Math.PI/2:0,a1:right?Math.PI:Math.PI/2,layer:"openings"}
   ];
   name="BL PARAM door "+width.toFixed(2)+"m "+(right?"R":"L");
  }else{
   elements=[
    {type:"rect",a:P(0,0),b:P(width,depth),layer:"0"},
    {type:"line",a:P(.06,depth/2),b:P(width-.06,depth/2),layer:"0"}
   ];
   name="BL PARAM table "+width.toFixed(2)+"x"+depth.toFixed(2)+"m";
  }
  try{
   if(!api.hasBlock(name))api.addBlock(name,elements);
   api.selectBlock(name);
   // The application's existing BLOCK INSERT command handles placement/rotation.
   msg.textContent=name+" · Seleccionado. Hacé clic en el dibujo para insertarlo. Rotación: campo Angle en Bloques.";
  }catch(error){msg.textContent="No se pudo crear: "+error.message}
 });
};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();