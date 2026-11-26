/* Blackline CAD parametric-symbol pilot. Original implementation: no third-party dynamic-block code.
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
 <label style="display:block;margin:6px 0">Tipo <select id="blParamType" style="width:100%"><option value="door">Puerta abatible con marco, planta</option><option value="window">Ventana con marco, planta</option><option value="table">Mesa rectangular, planta</option></select></label>
 <label style="display:block;margin:6px 0">Ancho (m) <input type="number" id="blParamWidth" min=".3" max="6" step=".05" value=".9" style="width:100%"></label>
 <label id="blParamDepthRow" style="display:none;margin:6px 0">Profundidad (m) <input type="number" id="blParamDepth" min=".3" max="6" step=".05" value=".8" style="width:100%"></label>
 <label id="blParamFrameRow" style="display:block;margin:6px 0">Espesor de marco (m) <input type="number" id="blParamFrame" min=".01" max=".2" step=".005" value=".05" style="width:100%"></label><label id="blParamJambRow" style="display:block;margin:6px 0">Profundidad de marco (m) <input type="number" id="blParamJamb" min=".03" max=".5" step=".01" value=".12" style="width:100%"></label><label id="blParamSideRow" style="display:block;margin:6px 0">Bisagra <select id="blParamSide" style="width:100%"><option value="left">Izquierda</option><option value="right">Derecha</option></select></label>
 <button class="btn" id="blParamGenerate" type="button" style="width:100%;margin-top:7px">Crear e insertar bloque</button>
 <p id="blParamFeedback" role="status" style="font-size:10px;margin:7px 0 0;color:#c0d1dc">Las dimensiones se ingresan en metros; la conversión al modelo es automática.</p>`;
 body.append(panel);
 const $=id=>document.getElementById(id);
 const unitScale={m:1,cm:100,mm:1000,in:39.37007874015748,ft:3.28083989501312};
 const m2u=n=>n*(unitScale[api.unit()]||1);
 const P=(x,y)=>({x:m2u(x),y:m2u(y)});
 function updateType(){
  const type=$("blParamType").value,door=type==="door",opening=type!=="table";
  $("blParamDepthRow").style.display=opening?"none":"block";
  $("blParamSideRow").style.display=door?"block":"none";
  $("blParamFrameRow").style.display=opening?"block":"none";
  $("blParamJambRow").style.display=opening?"block":"none";
  $("blParamWidth").value=door?".9":type==="window"?"1.2":"1.8";
 }
 $("blParamType").addEventListener("change",updateType);
 $("blParamGenerate").addEventListener("click",()=>{
  const width=Number($("blParamWidth").value),depth=Number($("blParamDepth").value);
  const type=$("blParamType").value,door=type==="door",windowType=type==="window",opening=door||windowType,right=$("blParamSide").value==="right";
  const frame=Number($("blParamFrame").value),jamb=Number($("blParamJamb").value);
  const msg=$("blParamFeedback");
  if(!Number.isFinite(width)||width<.3||width>6||(!opening&&(!Number.isFinite(depth)||depth<.3||depth>6))||
   (opening&&(!Number.isFinite(frame)||frame<=0||frame>=width*.2||!Number.isFinite(jamb)||jamb<=0||jamb>=width*.6))){
   msg.textContent="Ingresá dimensiones válidas entre 0,30 y 6,00 m.";return;
  }
  let elements,name;
  if(opening){
   // A named version is used so previous instances keep their former geometry.
   const e=(x0,y0,x1,y1)=>({type:"rect",a:P(x0,y0),b:P(x1,y1),layer:"0"});
   elements=[e(0,-jamb/2,frame,jamb/2),e(width-frame,-jamb/2,width,jamb/2)];
   if(door){
    const hinge=right?width-frame:frame,leaf=width-2*frame;
    elements.push({type:"line",a:P(hinge,0),b:P(hinge,leaf),layer:"0"});
    elements.push({type:"arc",c:P(hinge,0),r:m2u(leaf),a0:right?Math.PI/2:0,a1:right?Math.PI:Math.PI/2,layer:"0"});
   }else{
    for(const y of [-jamb/2,jamb/2,-frame*.28,frame*.28])
     elements.push({type:"line",a:P(frame,y),b:P(width-frame,y),layer:"0"});
   }
   name="BL FRAME v1 "+(door?"door ":"window ")+width.toFixed(2)+"m F"+frame.toFixed(3)+" D"+jamb.toFixed(3)+(door?(right?" R":" L"):"");
  }else{
   elements=[
    {type:"rect",a:P(0,0),b:P(width,depth),layer:"0"},
    {type:"line",a:P(.06,depth/2),b:P(width-.06,depth/2),layer:"0"}
   ];
   name="BL PARAM table "+width.toFixed(2)+"x"+depth.toFixed(2)+"m";
  }
  try{
   if(!api.hasBlock(name))api.addBlock(name,elements,opening
    ?{kind:door?'swing-door':'framed-window',defaults:{width:m2u(width),frameWidth:m2u(frame),frameDepth:m2u(jamb),...(door?{mirror:right}:{})}}
    :{kind:'rect-table',defaults:{width:m2u(width),depth:m2u(depth)}});
   api.selectBlock(name);
   // The application's existing BLOCK INSERT command handles placement/rotation.
   msg.textContent=name+" · Seleccionado. Hacé clic en el dibujo para insertarlo. Rotación: campo Angle en Bloques.";
  }catch(error){msg.textContent="No se pudo crear: "+error.message}
 });
};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();