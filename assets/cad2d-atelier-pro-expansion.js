/* BLACKLINE ATELIER PRO · second original design pack.
 * 96 native vector blocks in 12 parametric families. Metric plan geometry.
 * Width/depth controls regenerate panels, cushions, risers, fins and fixtures.
 * No raster, external fonts, third-party CAD definitions or copied models. */
(function(root){
 'use strict';
 const api=root.CAD2D_ARQ_LIBRARY;
 if(!api||!Array.isArray(api.library))return;
 const known=new Set(api.library.map(x=>x.id));
 const cats={
  storage:'Atelier PRO · Armarios y guardado',
  modular:'Atelier PRO · Sofás y composición',
  kitchen:'Atelier PRO · Cocinas premium',
  bath:'Atelier PRO · Baños de diseño',
  cowork:'Atelier PRO · Espacios de trabajo',
  retail:'Atelier PRO · Hotelería y comercio',
  glazing:'Atelier PRO · Fachadas vidriadas',
  carpentry:'Atelier PRO · Puertas especiales',
  exterior:'Atelier PRO · Terrazas y pérgolas',
  greenery:'Atelier PRO · Paisajismo',
  lighting:'Atelier PRO · Luminarias',
  civic:'Atelier PRO · Mobiliario urbano'
 };
 const count=(w,size,min=1,max=26)=>Math.max(min,Math.min(max,Math.round(w/size)));
 const L=(b,x,y,X,Y,opt)=>b.line(x,y,X,Y,opt);
 const B=(b,x,y,w,d,r=.03)=>b.rrect(x,y,w,d,Math.min(r,w*.48,d*.48));
 const E=(b,x,y,rx,ry)=>b.ellipse(x,y,Math.max(.005,rx),Math.max(.005,ry));
 const Q=(b,pts)=>b.poly(pts,true);
 const dsh={dashed:true};
 const panel=(b,W,D,n,vertical=true)=>{
  for(let j=1;j<n;j++)if(vertical)L(b,W*j/n,0,W*j/n,D);else L(b,0,D*j/n,W,D*j/n);
 };
 const dot=(b,x,y,r)=>b.circle(x,y,Math.max(.006,r));
 function drawStorage(b,W,D,v){
  B(b,0,0,W,D,.025);B(b,.035,.035,W-.07,D-.07,.02);
  const n=count(W,.48,2,14),drawers=(v===2||v===5||v===7);
  if(drawers){const rows=2+v%3;panel(b,W,D,rows,false)}
  else panel(b,W,D,n);
  if(v===1||v===4)panel(b,W,D,3,false);
  if(v===6){for(let j=1;j<n;j++){const x=W*j/n;L(b,x,D*.18,x,D*.82,dsh)}}
  for(let j=0;j<(drawers?2:n);j++){
   const x=W*(j+.5)/(drawers?2:n);
   B(b,x-Math.min(.06,W/n*.16),D*.47,Math.min(.12,W/n*.32),.028,.01);
  }
  if(v===3||v===7){L(b,.05,D*.18,W-.05,D*.18);L(b,.05,D*.82,W-.05,D*.82)}
 }
 function drawModular(b,W,D,v){
  const bx=Math.min(.19,W*.08),by=Math.min(.22,D*.20),base=D*(v===1||v===4?.58:.75);
  B(b,0,0,W,base,.09);B(b,bx,.08,W-2*bx,base-.13,.07);
  B(b,bx,base-by,W-2*bx,by-.035,.06);
  const n=count(W,.66,2,8);
  for(let j=1;j<n;j++)L(b,bx+(W-2*bx)*j/n,.09,bx+(W-2*bx)*j/n,base-by-.015);
  if(v===1||v===3||v===4||v===7){
   const ch=W*(v===4?.42:.32),start=v===7?W-ch:0;
   B(b,start,D*.37,ch,D*.58,.07);
   L(b,start+ch*.16,D*.80,start+ch*.84,D*.80,dsh);
  }
  if(v===2||v===5){E(b,W*.27,D*.77,W*.20,D*.14);E(b,W*.73,D*.77,W*.20,D*.14);}
  if(v===6){for(let j=1;j<n;j++)L(b,W*j/n,D*.10,W*j/n,base*.88,dsh);}
 }
 function drawKitchen(b,W,D,v){
  B(b,0,0,W,D,.04);B(b,.045,.045,W-.09,D-.09,.025);
  const n=count(W,.58,2,14);
  for(let j=1;j<n;j++)L(b,W*j/n,.05,W*j/n,D-.05);
  if(v===0||v===2||v===5||v===7){
   const sinks=v===5?2:1;
   for(let j=0;j<sinks;j++){const x=W*(j+.5)/(sinks+1);
    B(b,x-W*.12,D*.22,W*.24,D*.48,.05);dot(b,x,D*.49,.027);}
  }
  if(v===1||v===3||v===6){for(let j=0;j<4;j++){
   const x=W*(.66+(j%2)*.14),y=D*(.32+Math.floor(j/2)*.29);
   dot(b,x,y,Math.min(W,D)*.065);dot(b,x,y,Math.min(W,D)*.025);
  }}
  if(v===4){L(b,.06,D*.28,W-.06,D*.28);L(b,.06,D*.70,W-.06,D*.70);}
  if(v===7){for(let j=0;j<3;j++)E(b,W*(j+.5)/3,D*.91,W*.09,D*.06)}
 }
 function drawBath(b,W,D,v){
  B(b,.01,.01,W-.02,D-.02,.055);
  if(v===0||v===4){E(b,W*.5,D*.5,W*.43,D*.43);E(b,W*.5,D*.5,W*.31,D*.31);}
  if(v===1||v===5){const n=v===5?3:2;
   for(let j=0;j<n;j++){const x=W*(j+.5)/n;E(b,x,D*.53,Math.min(.24,W/n*.35),D*.27);dot(b,x,D*.52,.023)}}
  if(v===2||v===6){B(b,.05,.05,W-.10,D-.10,.06);
   L(b,.08,.08,W-.08,D-.08,dsh);L(b,.08,D-.08,W-.08,.08,dsh);dot(b,W*.15,D*.83,.04);}
  if(v===3||v===7){const n=count(W,.32,3,16);
   for(let j=1;j<n;j++)L(b,W*j/n,.04,W*j/n,D-.04);
   E(b,W*.5,D*.54,W*.18,D*.19);
  }
  L(b,W*.12,D*.14,W*.88,D*.14,dsh);
 }
 function drawCowork(b,W,D,v){
  B(b,0,0,W,D,.04);
  const n=count(W,v===2?.65:1.20,2,12);
  if(v===0||v===2||v===4||v===7){panel(b,W,D,n);
   for(let j=0;j<n;j++){B(b,W*(j+.23)/n,D*.18,W*.54/n,D*.24,.035);dot(b,W*(j+.5)/n,D*.80,.04);}}
  else if(v===1||v===5){panel(b,W,D,2,false);
   for(let j=1;j<=n;j++)E(b,W*(j-.5)/n,D*.13,Math.min(.2,W/n*.33),D*.09);}
  else if(v===3){for(let j=1;j<n;j++)L(b,W*j/n,D*.15,W*j/n,D*.85,dsh);
   B(b,W*.12,D*.2,W*.76,D*.60,.09)}
  else{E(b,W/2,D/2,W*.42,D*.42);for(let j=0;j<n;j++)dot(b,W*(j+.5)/n,D*.11,.045);}
 }
 function drawRetail(b,W,D,v){
  B(b,0,0,W,D,.035);
  if(v<=2||v===7){
   const n=count(W,.65,2,12);
   for(let j=1;j<n;j++)L(b,W*j/n,.04,W*j/n,D*.72);
   L(b,.04,D*.72,W-.04,D*.72);
   for(let j=0;j<n;j++)E(b,W*(j+.5)/n,D*.85,Math.min(W/n*.30,.22),D*.09);
  }else if(v===3||v===4){
   B(b,W*.08,D*.15,W*.84,D*.58,.08);
   const n=count(W,.52,2,10);for(let j=1;j<n;j++)L(b,W*j/n,D*.15,W*j/n,D*.73);
  }else{const n=count(W,.34,4,16);
   for(let j=1;j<n;j++)L(b,W*j/n,.06,W*j/n,D-.06);
   L(b,.05,D*.20,W-.05,D*.20);L(b,.05,D*.80,W-.05,D*.80);
  }
 }
 function drawGlazing(b,W,D,v){
  B(b,0,0,W,D,.01);B(b,.025,.025,W-.05,D-.05,.01);
  const n=count(W,v===0?1.2:v===4?.32:.66,2,26);
  for(let j=1;j<n;j++)L(b,W*j/n,.025,W*j/n,D-.025,{width:.16});
  if(v%2===0){L(b,.025,D*.32,W-.025,D*.32);
   L(b,.025,D*.68,W-.025,D*.68);}
  if(v===3||v===7){const slats=count(W,.24,4,28);
   for(let j=1;j<slats;j++)L(b,W*j/slats,D*.12,W*j/slats,D*.88,dsh);}
  if(v===2||v===5){for(let j=0;j<n;j++)L(b,W*(j+.15)/n,D*.18,W*(j+.85)/n,D*.82,dsh);}
 }
 function drawCarpentry(b,W,D,v){
  const thick=Math.min(.05,W*.045);
  b.rect(0,0,thick,D*.18);b.rect(W-thick,0,thick,D*.18);
  if(v===0||v===1||v===2){const h=v===1?W-thick:thick;
   dot(b,h,D*.10,.025);L(b,h,D*.10,h+(v===1?-W*.84:W*.84),D*.10);
   b.arc(h,D*.10,Math.min(W*.84,D*.77),v===1?90:0,v===1?179:88,dsh);}
  if(v===3||v===4||v===6){const n=v===3?2:v===4?3:4;
   for(let j=0;j<n;j++)L(b,W*j/n,D*(.25+(j%2)*.20),W*(j+1)/n,D*(.25+(j%2)*.20));
   L(b,0,D*.14,W,D*.14);L(b,0,D*.83,W,D*.83)}
  if(v===5){const n=count(W,.45,3,14);
   for(let j=0;j<n;j++){
    Q(b,[[W*j/n,D*.16],[W*(j+.5)/n,D*.77],[W*(j+1)/n,D*.16]])}}
  if(v===7){L(b,W*.2,D*.1,W*.2,D*.88);L(b,W*.8,D*.1,W*.8,D*.88);
   L(b,W*.2,D*.5,W*.8,D*.5);}
 }
 function drawExterior(b,W,D,v){
  B(b,0,0,W,D,.04);
  const n=count(v===1||v===5?D:W,.30,3,28);
  for(let j=1;j<n;j++){const t=j/n;
   if(v===1||v===5)L(b,.04,D*t,W-.04,D*t);
   else L(b,W*t,.04,W*t,D-.04);}
  if(v===2||v===6){B(b,W*.20,D*.18,W*.60,D*.64,.08);
   E(b,W*.5,D*.5,W*.21,D*.20);}
  if(v===3){for(let j=0;j<6;j++){const a=2*Math.PI*j/6;
   dot(b,W*(.5+.38*Math.cos(a)),D*(.5+.38*Math.sin(a)),Math.min(W,D)*.06);}
   dot(b,W*.5,D*.5,Math.min(W,D)*.19);}
  if(v===7){L(b,W*.05,D*.23,W*.95,D*.23,dsh);L(b,W*.05,D*.78,W*.95,D*.78,dsh);}
 }
 function drawGreenery(b,W,D,v){
  if(v===0||v===3||v===7){
   const n=44,pts=[];
   for(let j=0;j<n;j++){const a=Math.PI*2*j/n,r=.40+.03*Math.sin(j*2.9+v)+.025*Math.cos(j*5.7);
    pts.push([W*(.5+r*Math.cos(a)),D*(.5+r*Math.sin(a))]);}
   Q(b,pts);dot(b,W*.5,D*.5,Math.min(W,D)*.05);
   for(let j=0;j<8;j++){const a=j*Math.PI/4;
    L(b,W*.5,D*.5,W*(.5+.30*Math.cos(a)),D*(.5+.30*Math.sin(a)));}}
  else {B(b,0,0,W,D,.04);B(b,.04,.04,W-.08,D-.08,.04);
   const n=count(W,v===1?.24:.36,2,25);
   for(let j=0;j<n;j++){
    E(b,W*(j+.5)/n,D*(.46+.12*Math.sin(j*2.1+v)),Math.min(W/n*.37,D*.31),D*.25);
    if(v===5||v===6)dot(b,W*(j+.5)/n,D*.45,.018);}
  }
 }
 function drawLighting(b,W,D,v){
  if(v===0||v===5){dot(b,W*.5,D*.5,Math.min(W,D)*.44);dot(b,W*.5,D*.5,Math.min(W,D)*.32);}
  else if(v===2||v===7){E(b,W/2,D/2,W*.46,D*.44);E(b,W/2,D/2,W*.35,D*.30);}
  else{B(b,0,D*.24,W,D*.52,.04);
   const n=count(W,v===4?.24:.40,3,22);
   for(let j=0;j<n;j++)dot(b,W*(j+.5)/n,D*.5,Math.min(D*.15,W/n*.24));
   if(v===3||v===6)for(let j=1;j<n;j++)L(b,W*j/n,D*.28,W*j/n,D*.72,dsh);}
  if(v===1||v===6){L(b,.04,D*.12,W-.04,D*.12);L(b,.04,D*.88,W-.04,D*.88);}
 }
 function drawCivic(b,W,D,v){
  B(b,0,0,W,D,.04);
  const n=count(W,.42,2,20);
  if(v===0||v===4||v===7){
   for(let j=1;j<n;j++)L(b,W*j/n,.05,W*j/n,D-.05);
   if(v===4)L(b,.05,D*.65,W-.05,D*.65,dsh);}
  else if(v===1||v===5){
   for(let j=0;j<n;j++)E(b,W*(j+.5)/n,D*.5,Math.min(W/n*.38,D*.32),D*.30);
   L(b,.04,D*.15,W-.04,D*.15);}
  else if(v===2){B(b,W*.15,D*.15,W*.70,D*.70,.06);
   E(b,W*.5,D*.5,W*.20,D*.20);}
  else if(v===3){const slats=count(W,.20,5,26);
   for(let j=1;j<slats;j++)L(b,W*j/slats,D*.07,W*j/slats,D*.93,{width:.15});}
  else {dot(b,W*.5,D*.5,Math.min(W,D)*.23);L(b,.08,D*.1,W-.08,D*.9,dsh);}
 }
 const builders={storage:drawStorage,modular:drawModular,kitchen:drawKitchen,bath:drawBath,
  cowork:drawCowork,retail:drawRetail,glazing:drawGlazing,carpentry:drawCarpentry,
  exterior:drawExterior,greenery:drawGreenery,lighting:drawLighting,civic:drawCivic};
 const presets={
  storage:[
   ['Placard de paneles pivotantes',2.4,.66,1.6,4.8,.50,.9],
   ['Vestidor lineal premium',3.1,.72,2.0,6.0,.55,1.0],
   ['Cómoda de cajones ocultos',2.1,.52,1.2,4.0,.42,.72],
   ['Biblioteca modular de piso',3.0,.45,1.8,6.0,.30,.75],
   ['Armario vestidor iluminado',3.4,.75,2.1,7,.60,1.05],
   ['Mueble bajo de cajones',2.8,.56,1.8,6,.45,.80],
   ['Guardarropa modular con nichos',2.6,.65,1.5,5.0,.50,.88],
   ['Aparador premium de 6 cajones',2.25,.54,1.4,4.4,.45,.80]],
  modular:[
   ['Sofá profundo sección cinco',3.3,1.2,2.4,5.2,.95,1.65],
   ['Sofá doble con chaise',3.4,1.7,2.5,5.0,1.3,2.5],
   ['Sofá curvo para lobby',3.7,1.65,2.6,5.6,1.3,2.3],
   ['Sofá en L con chaise izquierda',3.5,2.1,2.6,5.6,1.5,3.0],
   ['Sofá profundo escuadra',4.0,2.2,3.0,6.0,1.6,3.0],
   ['Doble sillón modular',2.8,1.6,2.2,4.0,1.3,2.2],
   ['Sofá alto respaldo',2.7,1.2,1.8,4.7,.90,1.60],
   ['Sofá isla con chaise derecha',3.7,2.0,2.7,6.0,1.5,3.0]],
  kitchen:[
   ['Módulo bajo cajonero',2.8,.62,1.8,5.6,.52,.80],
   ['Isla gastronómica con anafe',3.2,1.35,2.0,5.4,1.1,1.9],
   ['Mesada isla bacha simple',2.7,1.25,1.9,4.8,1.0,1.8],
   ['Mueble de cocción premium',3.4,.70,2.2,6.0,.55,.88],
   ['Módulo de alacena con estantes',3.3,.56,2.1,6.5,.42,.74],
   ['Isla con dos bachas',3.2,1.38,2.0,5.5,1.1,1.9],
   ['Isla y dos fuegos',3.0,1.30,2.0,5.0,1.0,1.8],
   ['Barra de cocina con taburetes',3.1,1.40,2.1,5.5,1.10,2.0]],
  bath:[
   ['Bañera spa oval independiente',2.1,1.1,1.7,2.8,.9,1.4],
   ['Vanitory doble de piedra',1.9,.60,1.3,3.0,.48,.82],
   ['Ducha italiana panorámica',2.2,1.2,1.5,3.5,.9,1.7],
   ['Banco sauna de listones',2.9,.7,1.5,5.0,.55,1.0],
   ['Bañera circular centrada',1.8,1.8,1.3,2.6,1.3,2.6],
   ['Vanitory triple bacha',2.6,.62,1.9,4.2,.5,.86],
   ['Ducha doble sin marco',2.8,1.35,1.8,4.1,1.05,1.9],
   ['Banco y lavabo wellness',2.4,.75,1.5,3.8,.56,1.0]],
  cowork:[
   ['Estación operativa doble',2.2,1.35,1.5,4.3,1.05,2.0],
   ['Mesa colaborativa modular',3.2,1.55,2.0,6.5,1.2,2.2],
   ['Puesto de oficina múltiple',4.2,2.0,2.7,7.0,1.5,2.8],
   ['Mesa de reunión alta',3.5,1.2,2.2,6.0,.9,1.7],
   ['Bancada coworking premium',3.9,1.6,2.8,6.0,1.2,2.4],
   ['Sala de reunión dos frentes',4.5,2.2,3.0,8.0,1.6,3.0],
   ['Cabina acústica individual',1.6,1.45,1.25,2.3,1.1,2.1],
   ['Mesa de directorio modular',4.0,1.65,2.8,8.0,1.2,2.6]],
  retail:[
   ['Bar hotelero lineal',4.0,1.35,2.5,8.0,1.0,2.0],
   ['Bar isla con taburetes',3.4,1.8,2.4,6.5,1.4,2.5],
   ['Cafetería barra corrida',4.8,1.5,3.0,8.0,1.2,2.2],
   ['Mostrador recepción premium',3.2,1.25,2.0,5.5,.95,1.85],
   ['Banco tapizado restaurant',3.0,1.1,1.9,5.5,.9,1.55],
   ['Módulo booth enfrentado',3.8,1.7,2.5,6.0,1.3,2.5],
   ['Exhibidor comercial lineal',3.5,.65,2.0,6.5,.4,1.0],
   ['Bar restaurante circular',3.5,1.7,2.5,6.0,1.2,2.6]],
  glazing:[
   ['Muro cortina 3 paños',3.6,.25,2.0,7.0,.15,.50],
   ['Muro cortina 5 paños',5.1,.28,2.8,9.0,.15,.55],
   ['Fachada corrediza vidriada',4.4,.36,2.5,8.0,.25,.62],
   ['Paños plegables de vidrio',4.2,.34,2.5,8.0,.22,.60],
   ['Vidriera comercial modular',5.0,.42,2.8,10,.28,.75],
   ['Fachada de vidrio con aperturas',5.5,.38,3.0,10,.24,.65],
   ['Doble piel de lamas',5.0,.70,2.8,10,.48,1.0],
   ['Fachada ventilada panelizada',6.0,.72,3.2,12,.50,1.05]],
  carpentry:[
   ['Puerta pivotante asimétrica',1.3,1.3,1.05,2.3,1.05,2.0],
   ['Puerta abatible a derecha',1.05,1.12,.78,1.5,.85,1.7],
   ['Puerta de doble ala premium',2.0,1.95,1.4,3.2,1.3,3.0],
   ['Corredera vidrio de dos hojas',2.5,.32,1.5,5.0,.25,.6],
   ['Corredera triple guía',3.8,.36,2.2,7.0,.25,.7],
   ['Puerta plegable exterior',4.0,1.25,2.3,7.0,.92,2.0],
   ['Portón articulado de patio',4.2,.42,2.5,7.0,.3,.7],
   ['Puerta de acceso con fijo',2.0,.55,1.45,3.5,.35,.90]],
  exterior:[
   ['Pérgola tecnológica de lamas',5.0,3.3,3.0,11,2.0,7],
   ['Deck premium longitudinal',5.4,3.2,2.8,12,2.0,7],
   ['Gazebo minimalista',4.5,3.5,3.0,8,2.5,6],
   ['Comedor terraza con cubierta',4.0,3.0,2.7,9,2.0,6.5],
   ['Sombrilla rectangular',3.0,2.5,2.0,5.5,1.6,4.5],
   ['Pérgola lamas orientables',5.2,3.3,3.2,11,2.2,7],
   ['Conjunto circular exterior',3.7,3.7,2.6,6.5,2.6,6.5],
   ['Terraza con jardineras',5.0,3.8,3.2,10,2.3,6.8]],
  greenery:[
   ['Árbol urbano adulto',5.5,5.5,3.0,10,3.0,10],
   ['Seto frondoso ornamental',4.0,.85,1.6,10,.55,1.2],
   ['Jardín mediterráneo lineal',4.5,1.2,2.0,10,.8,2.0],
   ['Copa de árbol añoso',6.5,6.5,3.5,12,3.5,12],
   ['Cantero de flores múltiple',3.8,1.7,1.8,8,1.1,3.0],
   ['Jardinera de cubresuelos',3.4,.95,1.5,9,.6,1.5],
   ['Jardín seco arquitectónico',5.0,2.2,2.8,10,1.5,3.4],
   ['Arbusto gran follaje',2.3,2.3,1.4,4.5,1.4,4.5]],
  lighting:[
   ['Luminaria lineal suspendida',2.2,.18,1.0,7.0,.10,.3],
   ['Riel de spots pro',3.3,.25,1.5,9.0,.17,.45],
   ['Lámpara escultórica oval',.75,.56,.4,1.5,.34,.9],
   ['Perfiles de luz empotrados',2.5,.20,1.2,9.0,.12,.35],
   ['Iluminación decorativa de isla',3.0,.28,1.5,8.0,.18,.50],
   ['Empotrable circular premium',.25,.25,.12,.60,.12,.60],
   ['Luz radial arquitectónica',1.1,1.1,.55,2.2,.55,2.2],
   ['Módulo lineal múltiple',2.4,.42,1.2,8.0,.3,.75]],
  civic:[
   ['Banco urbano longitudinal',2.4,.65,1.4,5.5,.48,.95],
   ['Jardinera de ciudad modular',3.2,.85,1.5,8.0,.55,1.3],
   ['Mesa pública con parasol',2.0,2.0,1.5,4.5,1.5,4.5],
   ['Pérgola pública de listones',6.0,3.5,3.5,12,2.5,7],
   ['Banco público con respaldo',2.8,.72,1.6,6.0,.55,1.0],
   ['Macetero urbano lineal',3.5,.86,1.8,8.0,.55,1.25],
   ['Bicicletero compacto',2.0,.85,1.0,5.0,.62,1.4],
   ['Banco plaza de madera',3.0,.75,1.6,6.5,.55,1.15]]
 };
 let added=0;
 Object.keys(presets).forEach(function(key){
  presets[key].forEach(function(spec,i){
   const [name,w,d,wMin,wMax,dMin,dMax]=spec;
   const id='atelier-pro-'+key+'-'+String(i+1).padStart(2,'0');
   if(known.has(id))return;
   api.library.push({id,name,cat:cats[key],family:'atelier-pro-'+key,pro:true,
    w,d,wMin,wMax,dMin,dMax,dynamicActions:true,gen:function(b,W,D){builders[key](b,W,D,i);}});
   known.add(id);added++;
  });
  if(!api.categories.includes(cats[key]))api.categories.push(cats[key]);
 });
 root.CAD2D_ATELIER_PRO_EXPANSION={added,total:api.library.length,categories:Object.values(cats),pro:true};
})(typeof window!=='undefined'?window:globalThis);