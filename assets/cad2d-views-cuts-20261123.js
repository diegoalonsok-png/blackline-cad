/* CAD2D · Cortes y vistas 2026-11-23. Original vector drafting inspired by the
 * supplied Olimpiadas reference, not a claim of exact DXF extraction.
 * Additive only: existing IDs, blocks, palettes, toolbar icons and 3D unchanged.
 * All model geometry is metric; CAD2D converts it to drawing units at insertion.
 */
(function(){
'use strict';
const A=window.CAD2D_ARQ_LIBRARY;
if(!A||!Array.isArray(A.library)||!A.Builder)return;
const ids=new Set(A.library.map(x=>x.id));
const C='Cortes y vistas',Z='Alzados',M='Mobiliario en vista',PI=Math.PI;
let total=0;
function reg(id,name,cat,w,h,fn,opt={}){
 if(ids.has(id))return;
 if(!(w>0&&h>0)||typeof fn!=='function')return;
 ids.add(id);
 A.library.push({id,name,cat,w,d:h,wMin:opt.open?w*.75:w,wMax:opt.open?w*1.6:w,
   dMin:opt.open?h*.88:h,dMax:opt.open?h*1.2:h,gen:fn,
   hideFromGallery:true, // superseded sketches remain readable in saved drawings
   family:opt.family||id,author:'Blackline CAD · trazado vectorial original',pro:false,
   hideFromGallery:true,experimental:true});
 total++;
}
const floor=(b,w)=>b.line(-w*.035,0,w*1.035,0);
const xline=(b,x,y,X,Y)=>b.line(x,y,X,Y);
const win=(b,x,y,w,h)=>{if(w>.08&&h>.08)b.rect(x,y,w,h)};
const circle=(b,x,y,r)=>b.circle(x,y,r);
const rounded=(b,x,y,w,h,r=.045)=>{if(w>0&&h>0)b.rrect(x,y,w,h,Math.min(r,w*.48,h*.48))};
const hatch=(b,x,y,w,h,n=5)=>{for(let i=0;i<n;i++){let t=(i+.5)/n;b.line(x+w*t,y,x+w*Math.max(0,t-.17),y+h*.75)}};

/* Carpinterías: alzados nuevos. Los modelos de planta existentes no se reemplazan. */
function door(b,W,H,t){
 floor(b,W);b.rect(0,0,W,H);rounded(b,.035,0,W-.07,H-.04,.017);
 const m=W*.09,lo=.10,hi=H-.12,iw=W-2*m,ih=hi-lo;
 const panel=(x,y,w,h)=>rounded(b,x,y,w,h,.018);
 if(t==='pivot'){panel(m,lo,iw,ih);b.circle(W*.78,H*.48,.028);b.line(W*.07,H*.03,W*.07,H*.97)}
 if(t==='french'){for(let k=0;k<2;k++){const x=m+k*iw/2;panel(x,lo,iw/2,ih);win(b,x+.04,lo+.42,iw/2-.08,ih-.50);
  for(let j=1;j<4;j++)b.line(x+.04,lo+.42+j*(ih-.50)/4,x+iw/2-.04,lo+.42+j*(ih-.50)/4)}
  b.circle(W*.48,H*.5,.015);b.circle(W*.52,H*.5,.015)}
 if(t==='accordion'){const n=6;for(let k=0;k<n;k++){let x=m+k*iw/n;
  b.line(x,lo,x,hi);if(k<n-1)b.line(x,lo+.08,x+iw/n,hi-.08)}}
 if(t==='industrial'){for(let j=1;j<=5;j++)b.line(m,lo+j*ih/6,W-m,lo+j*ih/6);
  for(let i=0;i<4;i++){win(b,m+.05+i*(iw-.10)/4,H*.62,(iw-.10)/4-.03,H*.13)}}
 if(t==='emergency'){panel(m,lo,iw,ih);b.line(W*.15,H*.45,W*.84,H*.45);b.rect(W*.15,H*.43,W*.68,.04);
  b.rect(W*.72,H*.47,.06,.11);b.circle(W*.25,H*.50,.018)}
 if(t==='louver'){panel(m,lo,iw,ih);for(let j=1;j<19;j++){let y=lo+j*ih/20;b.line(m+.04,y,W-m-.04,y+.025)}}
 if(t==='glass'){panel(m,lo,iw,ih);win(b,m+.06,H*.19,iw-.12,H*.70);b.line(W*.50,H*.19,W*.50,H*.89);
  b.line(W*.35,H*.46,W*.43,H*.46);b.line(W*.57,H*.46,W*.65,H*.46)}
 if(t==='barn'){panel(m,lo,iw,ih);b.line(m,H*.10,W-m,H*.87);b.line(W-m,H*.10,m,H*.87);
  for(let i=1;i<4;i++)b.line(m+i*iw/4,lo,m+i*iw/4,hi)}
}
const doors=[
 ['pivot','Puerta pivotante · alzado',1.10,2.35],
 ['french','Puerta francesa doble · alzado',1.60,2.20],
 ['accordion','Puerta plegadiza · alzado',2.40,2.15],
 ['industrial','Portón seccional · alzado',2.80,2.40],
 ['emergency','Puerta antipánico · alzado',.95,2.10],
 ['louver','Puerta de celosía · alzado',.85,2.10],
 ['glass','Puerta vidriada doble · alzado',1.70,2.25],
 ['barn','Portón de madera · alzado',2.40,2.30]
];
for(const [t,n,w,h] of doors)reg('views26-door-'+t,n,Z,w,h,(b,W,H)=>door(b,W,H,t),{open:true,family:'views26-doors'});

function windowElevation(b,W,H,t){
 b.rect(0,0,W,H);b.rect(.035,.035,W-.07,H-.07);
 const ix=.07,iy=.07,iw=W-.14,ih=H-.14;
 if(t==='guillotine'){b.line(ix,H*.50,W-ix,H*.50);b.line(ix,H*.48,W-ix,H*.48);b.rect(ix+.03,H*.53,iw-.06,H*.39)}
 if(t==='casement'){b.line(W/2,iy,W/2,H-iy);b.line(ix,iy,W/2,H-iy,{dashed:true});b.line(W-ix,iy,W/2,H-iy,{dashed:true});b.circle(W*.45,H*.48,.015);b.circle(W*.55,H*.48,.015)}
 if(t==='awning'){b.line(ix,H*.78,W-ix,H*.78);b.line(ix,H*.78,W*.5,iy,{dashed:true});b.line(W-ix,H*.78,W*.5,iy,{dashed:true})}
 if(t==='louver'){for(let j=0;j<9;j++){let y=iy+j*ih/9;b.line(ix+.02,y+.01,W-ix-.02,y+ih/18);b.line(ix+.02,y+ih/18,W-ix-.02,y+ih/18)}}
 if(t==='arch'){const y=H*.66;b.line(ix,iy,ix,y);b.line(W-ix,iy,W-ix,y);b.arc(W*.5,y,iw*.5,0,180);b.line(W*.50,iy,W*.50,H-.04)}
 if(t==='curtain'){for(let j=1;j<5;j++)b.line(j*W/5,0,j*W/5,H);for(let j=1;j<3;j++)b.line(0,j*H/3,W,j*H/3)}
 if(t==='corner'){b.line(W*.50,0,W*.50,H);b.line(W*.53,0,W*.53,H);b.line(ix,H*.5,W-ix,H*.5)}
 if(t==='tilt'){b.line(ix,H*.75,W-ix,H*.75);b.line(ix,H*.75,W*.5,iy,{dashed:true});b.line(W-ix,H*.75,W*.5,iy,{dashed:true});b.circle(W*.48,H*.45,.02)}
 if(t==='ribbon'){for(let j=1;j<4;j++){const x=W*j/4;b.line(x,0,x,H)}b.line(0,H*.12,W,H*.12)}
 if(t==='fixed-round'){b.ellipse(W*.5,H*.5,W*.43,H*.43);b.ellipse(W*.5,H*.5,W*.39,H*.39);b.line(W*.5,H*.12,W*.5,H*.88)}
}
const windows=[
 ['guillotine','Ventana guillotina · alzado',1.00,1.35],
 ['casement','Ventana batiente doble · alzado',1.30,1.30],
 ['awning','Ventana proyectante · alzado',1.20,.70],
 ['louver','Ventana de celosías · alzado',1.20,1.10],
 ['arch','Ventana de arco · alzado',1.00,1.75],
 ['curtain','Muro cortina modulado · alzado',3.00,3.00],
 ['corner','Ventana de esquina · alzado',2.00,1.40],
 ['tilt','Ventana oscilobatiente · alzado',.90,1.40],
 ['ribbon','Ventana corrida · alzado',3.60,.65],
 ['fixed-round','Ventana ojo de buey · alzado',.90,.90]
];
for(const [t,n,w,h] of windows)reg('views26-window-'+t,n,Z,w,h,(b,W,H)=>windowElevation(b,W,H,t),{open:true,family:'views26-windows'});

/* Cortes de carpintería: se ve el perfil de marco, cámara y hoja. */
function openingSection(b,W,H,t){
 const x=W*.22,y=H*.20,w=W*.56,h=H*.6;
 b.line(0,H*.25,x,H*.25);b.line(0,H*.75,x,H*.75);
 b.line(x+w,H*.25,W,H*.25);b.line(x+w,H*.75,W,H*.75);
 b.rect(x,y,w,h);
 if(t==='jamb'){b.rect(x+w*.16,y,w*.24,h);b.rect(x+w*.60,y,w*.24,h);
  b.line(x+w*.50,y,x+w*.50,y+h);hatch(b,x+.02,y+.04,w*.13,h*.90)}
 if(t==='double-glass'){b.rect(x+w*.17,y,w*.11,h);b.rect(x+w*.68,y,w*.11,h);
  b.line(x+w*.35,y,x+w*.35,y+h);b.line(x+w*.41,y,x+w*.41,y+h);b.line(x+w*.58,y,x+w*.58,y+h);b.line(x+w*.64,y,x+w*.64,y+h)}
 if(t==='sliding'){b.rect(x+w*.12,y,w*.12,h);b.rect(x+w*.45,y,w*.12,h);
  b.rect(x+w*.76,y,w*.12,h);b.line(x+w*.35,y,x+w*.35,y+h);b.line(x+w*.65,y,x+w*.65,y+h)}
 if(t==='door-threshold'){b.rect(x+w*.15,y,w*.18,h);b.rect(x+w*.60,y,w*.18,h);
  b.rect(x+w*.30,H*.44,w*.42,H*.12);b.line(x,H*.50,x+w,H*.50)}
 if(t==='blind'){b.rect(x+w*.12,y,w*.16,h);b.rect(x+w*.68,y,w*.16,h);for(let i=0;i<5;i++)b.line(x+w*.30,y+i*h/5,x+w*.64,y+(i+.5)*h/5)}
}
for(const [t,n,w,h] of [
 ['jamb','Ventana · corte de jamba',.34,.24],
 ['double-glass','DVH · sección del perfil',.26,.25],
 ['sliding','Ventana corrediza · sección horizontal',.34,.22],
 ['door-threshold','Puerta · corte de umbral',.38,.22],
 ['blind','Persiana · corte de guías',.32,.28]
])reg('views26-section-'+t,n,C,w,h,(b,W,H)=>openingSection(b,W,H,t));

/* Vehículos: tres cuartos NO: solamente verdaderas proyecciones ortogonales 2D. */
function wheel(b,x,y,r){b.circle(x,y,r);b.circle(x,y,r*.63);b.circle(x,y,r*.17)}
function vehicleSide(b,W,H,t){
 floor(b,W);const R=H*(t==='bus'||t==='truck'?.15:.19),cx1=W*.22,cx2=W*.78;
 if(t==='truck'||t==='bus'){
  b.rect(W*.04,R*.65,W*.90,H*.73);b.rect(W*.05,H*.77,W*.89,H*.15);
  if(t==='truck'){b.line(W*.65,R*.65,W*.65,H*.93);b.rect(W*.72,H*.62,W*.17,H*.22);
   b.rect(W*.07,H*.58,W*.54,H*.06)}
  else{for(let i=0;i<9;i++){let x=W*(.08+i*.095);b.rect(x,H*.53,W*.075,H*.30)}
   b.rect(W*.06,R*.65,W*.085,H*.36);b.line(W*.065,H*.51,W*.93,H*.51)}
 }else if(t==='van'){b.poly([[W*.04,R*.68],[W*.06,H*.81],[W*.23,H*.95],[W*.74,H*.95],[W*.94,H*.82],[W*.97,R*.68]],true);
  b.rect(W*.11,H*.55,W*.25,H*.28);b.rect(W*.40,H*.55,W*.34,H*.28);b.line(W*.76,H*.40,W*.76,H*.90)}
 else if(t==='tractor'){b.poly([[W*.02,H*.26],[W*.08,H*.60],[W*.40,H*.66],[W*.49,H*.90],[W*.78,H*.90],[W*.83,H*.56],[W*.96,H*.49],[W*.98,H*.22]],true);
  b.rect(W*.50,H*.57,W*.26,H*.24);b.line(W*.65,H*.57,W*.65,H*.85);wheel(b,cx1,H*.22,H*.19);wheel(b,cx2,H*.22,H*.12);return}
 else{const yTop=t==='coupe'?H*.85:H*.96;
  b.poly([[0,R*.86],[W*.06,H*.36],[W*.15,H*.48],[W*.29,yTop],[W*.63,yTop],[W*.81,H*.53],[W*.96,H*.42],[W,R*.83]],true);
  b.poly([[W*.30,H*.52],[W*.35,H*.83],[W*.61,H*.83],[W*.74,H*.52]],true);
  b.line(W*.52,H*.50,W*.52,H*.82);b.line(W*.72,H*.48,W*.72,H*.27);b.line(W*.49,H*.46,W*.49,H*.27)}
 wheel(b,cx1,R,R);wheel(b,cx2,R,R);
 if(t==='truck')wheel(b,W*.67,R,R);
 b.line(W*.07,H*.39,W*.17,H*.39);b.line(W*.85,H*.39,W*.95,H*.39);
}
function vehicleFace(b,W,H,t,rear=false){
 floor(b,W);
 b.poly([[W*.08,H*.21],[W*.02,H*.29],[W*.02,H*.78],[W*.14,H*.96],[W*.86,H*.96],[W*.98,H*.78],[W*.98,H*.29],[W*.92,H*.21]],true);
 const bus=t==='bus'||t==='truck',van=t==='van';
 b.rect(W*.12,H*(bus?.57:.50),W*.76,H*(bus?.33:.29));
 if(bus){b.line(W*.5,H*.57,W*.5,H*.9);b.rect(W*.10,H*.26,W*.80,H*.15)}
 if(van)b.line(W*.5,H*.50,W*.5,H*.79);
 if(rear){b.line(W*.10,H*.24,W*.90,H*.24);b.rect(W*.34,H*.17,W*.32,H*.075)}
 else{b.rect(W*.30,H*.24,W*.40,H*.12);for(let j=1;j<6;j++)b.line(W*(.3+j*.4/6),H*.24,W*(.3+j*.4/6),H*.36)}
 for(const x of[W*.08,W*.83]){
  rounded(b,x,H*.34,W*.09,H*.09,.03);
  rounded(b,x,H*.13,W*.09,H*.09,.03)
 }
}
function twoWheelerFace(b,W,H,t){
 floor(b,W);wheel(b,W*.50,H*.20,H*.18);
 b.line(W*.50,H*.40,W*.50,H*.78);
 b.line(W*.12,H*.75,W*.88,H*.75);
 b.line(W*.12,H*.75,W*.18,H*.63);b.line(W*.88,H*.75,W*.82,H*.63);
 if(t==='motorcycle'){b.ellipse(W*.50,H*.55,W*.22,H*.20);b.circle(W*.50,H*.90,H*.085);b.line(W*.30,H*.90,W*.70,H*.90)}
 else{b.line(W*.50,H*.48,W*.28,H*.70);b.line(W*.50,H*.48,W*.72,H*.70);b.rect(W*.40,H*.68,W*.20,H*.035)}
}
const vehicles=[
 ['suv-side','SUV · vista lateral',4.75,1.78,'suv','side'],
 ['suv-front','SUV · vista frontal',1.95,1.78,'suv','front'],
 ['suv-rear','SUV · vista posterior',1.95,1.78,'suv','rear'],
 ['pickup-front','Pickup · vista frontal',2.00,1.87,'pickup','front'],
 ['pickup-rear','Pickup · vista posterior',2.00,1.87,'pickup','rear'],
 ['van-side','Furgón · vista lateral',5.25,2.45,'van','side'],
 ['van-front','Furgón · vista frontal',2.05,2.45,'van','front'],
 ['truck-side','Camión rígido · vista lateral',8.20,3.15,'truck','side'],
 ['truck-front','Camión rígido · vista frontal',2.50,3.20,'truck','front'],
 ['bus-side','Colectivo urbano · vista lateral',11.50,3.20,'bus','side'],
 ['bus-front','Colectivo urbano · vista frontal',2.55,3.20,'bus','front'],
 ['tractor-side','Tractor agrícola · vista lateral',3.80,2.50,'tractor','side'],
 ['coupe-side','Auto coupé · vista lateral',4.40,1.45,'coupe','side'],
 ['motorcycle-front','Motocicleta · vista frontal',.84,1.32,'motorcycle','front'],
 ['bicycle-front','Bicicleta · vista frontal',.62,1.08,'bicycle','front']
];
for(const [t,n,w,h,model,proj] of vehicles)
 reg('views26-vehicle-'+t,n,C,w,h,(b,W,H)=>proj==='side'?vehicleSide(b,W,H,model):model==='bicycle'||model==='motorcycle'?twoWheelerFace(b,W,H,model):vehicleFace(b,W,H,model,proj==='rear'));

/* Electrodomésticos: puertas, paneles y controles en vistas distintas. */
function appliance(b,W,H,t){
 floor(b,W);
 if(t==='fridge-bottom'||t==='fridge-top'||t==='fridge-3door'||t==='freezer'||t==='wine'){
  rounded(b,.01,.04,W-.02,H-.06,.025);b.rect(.04,.07,W-.08,H-.12);
  if(t==='fridge-bottom')b.line(.04,H*.38,W-.04,H*.38);
  if(t==='fridge-top')b.line(.04,H*.74,W-.04,H*.74);
  if(t==='fridge-3door'){b.line(W*.5,H*.39,W*.5,H-.04);b.line(.04,H*.39,W-.04,H*.39)}
  if(t==='freezer')for(let i=1;i<=4;i++)b.line(.05,H*i/5,W-.05,H*i/5);
  if(t==='wine'){for(let i=1;i<=4;i++)b.line(.10,H*i/5,W-.10,H*i/5);for(let j=0;j<8;j++)b.circle(W*.25+(j%2)*W*.45,H*(.17+Math.floor(j/2)*.19),W*.045)}
  b.line(W*.80,H*.50,W*.80,H*.64);if(t==='fridge-3door')b.line(W*.22,H*.55,W*.22,H*.64);
  return;
 }
 if(t==='microwave'||t==='oven'||t==='coffee'||t==='toaster'){
  rounded(b,.01,.02,W-.02,H-.04,.015);
  if(t==='microwave'||t==='oven'){
   b.rect(.04,H*.15,W*.69,H*.62);b.rect(.05,H*.17,W*.67,H*.58);
   if(t==='microwave'){b.circle(W*.86,H*.65,W*.035);b.circle(W*.86,H*.37,W*.035)}
   else{for(let i=0;i<3;i++)b.circle(W*(.15+i*.20),H*.91,.025);b.line(.12,H*.23,W*.64,H*.23)}
  }else if(t==='coffee'){b.rect(W*.22,H*.25,W*.50,H*.45);b.circle(W*.50,H*.80,.05);b.rect(W*.30,H*.10,W*.42,H*.10)}
  else{for(const x of[W*.30,W*.70])rounded(b,x-W*.14,H*.48,W*.28,H*.33,.025);b.line(W*.86,H*.17,W*.86,H*.48)}
  return;
 }
 if(t==='hood-front'||t==='hood-side'){
  b.rect(W*.31,H*.58,W*.38,H*.40);
  b.poly(t==='hood-front'?[[0,H*.18],[W,H*.18],[W*.68,H*.60],[W*.32,H*.60]]:[[0,H*.2],[W,H*.2],[W*.67,H*.61],[W*.29,H*.61]],true);
  b.line(W*.05,H*.16,W*.95,H*.16);return;
 }
 if(t==='dishwasher'||t==='washing-side'||t==='dishwasher-side'||t==='dryer'){
  rounded(b,.01,.01,W-.02,H-.02,.022);
  b.line(0,H*.84,W,H*.84);
  if(t==='dryer'){b.circle(W*.5,H*.44,W*.29);b.circle(W*.5,H*.44,W*.22);for(let i=0;i<3;i++)b.circle(W*(.18+i*.16),H*.92,.016)}
  else if(t==='washing-side'){b.circle(W*.52,H*.43,W*.25);b.line(W*.13,H*.84,W*.13,H*.99)}
  else if(t==='dishwasher-side'){b.line(W*.15,H*.25,W*.95,H*.25);b.line(W*.20,H*.55,W*.93,H*.55);b.circle(W*.08,H*.91,.016)}
  else{b.line(W*.06,H*.26,W*.94,H*.26);b.rect(W*.22,H*.87,W*.56,H*.065);b.circle(W*.88,H*.91,.016)}
  return;
 }
 if(t==='oven-built-in'){b.rect(.02,0,W-.04,H);b.rect(W*.12,H*.16,W*.76,H*.52);b.rect(W*.12,H*.77,W*.76,H*.10);b.circle(W*.24,H*.88,.018);b.circle(W*.76,H*.88,.018);return}
 if(t==='induction'){b.rect(.03,H*.42,W-.06,H*.09);for(let j=0;j<4;j++)b.circle(W*(.2+(j%2)*.6),H*(.57+Math.floor(j/2)*.23),W*.12);b.rect(.05,0,W-.10,H*.42);return}
 if(t==='radiator'){b.rect(0,H*.10,W,H*.76);for(let i=1;i<=9;i++){let x=W*i/10;b.rect(x-.018,H*.14,.036,H*.66)}return}
}
const apps=[
 ['fridge-bottom','Heladera con freezer inferior · vista frontal',.72,1.82],
 ['fridge-top','Heladera freezer superior · vista frontal',.68,1.78],
 ['fridge-3door','Heladera tres puertas · vista frontal',.93,1.82],
 ['freezer','Freezer vertical · vista frontal',.60,1.72],
 ['wine','Vinoteca · vista frontal',.60,.84],
 ['microwave','Microondas · vista frontal',.54,.33],
 ['oven','Horno eléctrico · vista frontal',.60,.59],
 ['coffee','Cafetera · vista frontal',.34,.43],
 ['toaster','Tostadora · vista frontal',.32,.25],
 ['hood-front','Campana de cocina · vista frontal',.90,.72],
 ['hood-side','Campana de cocina · vista lateral',.54,.72],
 ['dishwasher','Lavavajillas · vista frontal',.60,.82],
 ['dishwasher-side','Lavavajillas · vista lateral',.60,.82],
 ['washing-side','Lavarropas · vista lateral',.63,.85],
 ['dryer','Secarropas · vista frontal',.60,.85],
 ['oven-built-in','Horno empotrado · vista frontal',.60,.64],
 ['induction','Cocina de inducción · corte lateral',.60,.90],
 ['radiator','Radiador de calefacción · vista frontal',1.20,.65]
];
for(const [t,n,w,h] of apps)reg('views26-appliance-'+t,n,C,w,h,(b,W,H)=>appliance(b,W,H,t));

/* Mobiliario: camas, cunas, placares, sillones y estanterías en alzado/corte. */
function furniture(b,W,H,t){
 floor(b,W);
 if(t.startsWith('bed-')||t.startsWith('crib-')||t.startsWith('bunk-')){
  const crib=t.startsWith('crib-'),bunk=t.startsWith('bunk-'),front=t.endsWith('-front');
  const base=crib?H*.30:H*.25,bb=front?W*.09:W*.04,bedH=bunk?H*.12:H*.17;
  if(bunk){for(let j=0;j<2;j++){let y=H*(.20+j*.45);b.rect(.06,y,W-.12,H*.10);b.rect(.09,y+H*.04,W-.18,H*.06)}
   for(const x of[W*.03,W*.93])b.rect(x,0,W*.04,H);
   for(let j=0;j<6;j++)b.line(W*.77,H*.05+j*H*.15,W*.93,H*.05+j*H*.15);return}
  b.rect(bb,base,W-2*bb,bedH);
  if(front){rounded(b,bb+.05,base+bedH*.25,W-2*bb-.1,H*.28,.035);
   b.rect(bb,H*.55,W-2*bb,H*.35);
   if(t==='bed-double-front')b.line(W*.50,H*.55,W*.50,H*.90)}
  else{b.rect(bb,base+bedH,W-2*bb,H*.11);b.rect(bb,base+bedH+H*.11,W*.25,H*.08);
   b.rect(bb,base,W*.055,bedH+H*.15)}
  for(const x of[bb+.03,W-bb-.06])b.rect(x,0,.03,base);
  if(crib){for(let j=0;j<10;j++)b.line(W*.08+j*W*.084,H*.35,W*.08+j*W*.084,H*.74);b.rect(0,H*.74,W,H*.045)}
  return;
 }
 if(t.startsWith('sofa-')||t==='recliner'){
  const side=t==='sofa-3-side'||t==='recliner';
  rounded(b,.03,H*.20,W-.06,H*.28,.06);
  rounded(b,.04,H*.43,W-.08,H*.42,.09);
  for(let j=1;j<(side?2:4);j++)b.line(W*j/(side?2:4),H*.23,W*j/(side?2:4),H*.44);
  b.rect(.02,H*.20,W*.08,H*.39);b.rect(W*.90,H*.20,W*.08,H*.39);
  for(const x of[W*.10,W*.85])b.rect(x,.02,W*.05,H*.17);
  if(t==='recliner')b.poly([[W*.15,H*.2],[W*.02,H*.05],[W*.24,H*.05],[W*.38,H*.19]],true);
  return;
 }
 if(t.startsWith('wardrobe-')||t.startsWith('dresser-')||t==='shelf'){
  b.rect(0,.02,W,H-.03);b.rect(.025,.05,W-.05,H-.09);
  if(t==='shelf'){for(let i=1;i<=5;i++){let y=H*i/6;b.line(.03,y,W-.03,y);
    for(let j=0;j<3;j++)b.rect(.06+j*W*.26,y+.02,W*.19,H*.10)}return}
  if(t==='wardrobe-slide'){b.line(W*.5,.04,W*.5,H-.04);b.line(W*.52,.04,W*.52,H-.04);
   b.rect(W*.43,H*.50,W*.025,H*.15);b.rect(W*.55,H*.5,W*.025,H*.15)}
  if(t==='wardrobe-mirror'){b.rect(W*.13,H*.10,W*.74,H*.80);b.line(W*.24,H*.22,W*.38,H*.66);b.line(W*.28,H*.18,W*.43,H*.60)}
  if(t==='wardrobe-open'){for(let j=1;j<4;j++)b.line(W*j/4,0,W*j/4,H);
   b.line(.05,H*.71,W*.95,H*.71);for(let i=1;i<=8;i++)b.line(W*i/9,H*.53,W*i/9,H*.71)}
  if(t==='dresser-4'){for(let j=1;j<5;j++){let y=H*j/5;b.line(.02,y,W-.02,y);b.line(W*.40,y-.03,W*.60,y-.03)}}
  return;
 }
 if(t==='desk-side'||t==='table-side'){
  b.rect(.01,H*.89,W-.02,H*.07);
  for(const x of[W*.06,W*.88])b.rect(x,.02,W*.055,H*.87);
  if(t==='desk-side'){b.rect(W*.18,H*.96,W*.30,H*.04);b.line(W*.32,H*.99,W*.32,H*1.15)}
  return;
 }
 if(t==='chair-front'){rounded(b,.07,H*.40,W-.14,H*.14,.035);rounded(b,.05,H*.62,W-.10,H*.37,.07);
  for(const x of[W*.12,W*.80])b.rect(x,0,W*.08,H*.42);b.rect(.01,H*.48,W*.09,H*.23);b.rect(W*.9,H*.48,W*.09,H*.23)}
 if(t==='bedside-front'){b.rect(.02,H*.10,W-.04,H*.75);b.line(0,H*.66,W,H*.66);b.line(0,H*.41,W,H*.41);
  b.line(W*.42,H*.55,W*.58,H*.55);b.line(W*.42,H*.29,W*.58,H*.29);for(const x of[W*.10,W*.84])b.rect(x,0,W*.06,H*.1)}
}
const furnishings=[
 ['bed-single-side','Cama de una plaza · vista lateral',2.05,.68],
 ['bed-double-front','Cama de dos plazas · vista frontal',1.60,1.02],
 ['bed-king-side','Cama king · vista lateral',2.12,.85],
 ['bunk-front','Cama cucheta · vista frontal',.96,1.80],
 ['bunk-side','Cama cucheta · vista lateral',2.00,1.80],
 ['crib-side','Cuna · vista lateral',1.35,1.08],
 ['crib-front','Cuna · vista frontal',.75,1.08],
 ['sofa-2-front','Sofá dos cuerpos · vista frontal',1.70,.90],
 ['sofa-3-side','Sofá tres cuerpos · vista lateral',.94,.90],
 ['sofa-l-front','Sofá modular · vista frontal',2.90,.92],
 ['recliner','Sillón reclinable · vista lateral',1.10,.92],
 ['wardrobe-slide','Placard corredizo · vista frontal',2.20,2.35],
 ['wardrobe-mirror','Placard espejado · vista frontal',1.80,2.40],
 ['wardrobe-open','Vestidor abierto · vista frontal',2.40,2.40],
 ['dresser-4','Cómoda cuatro cajones · vista frontal',1.15,.92],
 ['shelf','Biblioteca modular · vista frontal',1.80,2.20],
 ['desk-side','Escritorio · vista lateral',.75,.76],
 ['table-side','Mesa de comedor · corte lateral',.90,.76],
 ['chair-front','Silla comedor · vista frontal',.48,.92],
 ['bedside-front','Mesa de luz · vista frontal',.48,.55]
];
for(const [t,n,w,h] of furnishings)reg('views26-furniture-'+t,n,M,w,h,(b,W,H)=>furniture(b,W,H,t));

/* Sanitarios y baños: vistas complementarias a las piezas existentes. */
function bath(b,W,H,t){
 floor(b,W);
 if(t==='urinal-front'){b.poly([[W*.20,H*.85],[W*.80,H*.85],[W*.70,H*.15],[W*.30,H*.15]],true);
  b.ellipse(W*.5,H*.54,W*.20,H*.26);b.circle(W*.5,H*.30,.02);b.rect(W*.44,H*.89,W*.12,H*.09);return}
 if(t==='basin-section'||t==='basin-double'){b.rect(0,H*.80,W,H*.045);b.poly([[W*.09,H*.80],[W*.20,H*.62],[W*.78,H*.62],[W*.91,H*.80]],false);
  b.rect(W*.43,H*.06,W*.14,H*.54);b.line(W*.50,H*.84,W*.50,H*.97);b.line(W*.50,H*.97,W*.69,H*.97);return}
 if(t==='bath-front'||t==='bath-section'){b.poly([[W*.06,H*.15],[W*.18,H*.09],[W*.82,H*.09],[W*.94,H*.15],[W*.91,H*.72],[W*.09,H*.72]],true);
  b.line(W*.10,H*.68,W*.90,H*.68);b.line(W*.10,H*.78,W*.90,H*.78);
  if(t==='bath-section')b.poly([[W*.17,H*.7],[W*.23,H*.2],[W*.75,H*.2],[W*.83,H*.7]],false);
  b.line(W*.81,H*.77,W*.81,H*.98);b.line(W*.81,H*.98,W*.91,H*.98);return}
 if(t==='shower-side'){b.rect(.01,H*.02,W-.02,H*.04);b.line(W*.12,0,W*.12,H*.95);
  b.circle(W*.28,H*.89,W*.15);b.line(W*.28,H*.89,W*.41,H*.89);
  for(let j=0;j<6;j++)b.line(W*(.16+j*.05),H*.79,W*(.10+j*.05),H*.58);
  b.line(W*.90,0,W*.90,H);b.circle(W*.54,H*.51,.025);return}
 if(t==='vanity-side'){b.rect(W*.12,H*.19,W*.70,H*.61);b.rect(W*.06,H*.80,W*.86,H*.05);
  b.rect(W*.18,H*.92,W*.65,H*.06);b.line(W*.82,H*.80,W*.82,H*.19);b.rect(W*.32,H*.47,W*.04,H*.11);return}
 if(t==='accessible'){b.rect(W*.15,H*.55,W*.68,H*.12);b.line(W*.20,H*.55,W*.2,H*.92);b.line(W*.8,H*.55,W*.8,H*.92);
  b.circle(W*.5,H*.53,W*.25);b.rect(W*.05,H*.09,W*.08,H*.37);b.rect(W*.87,H*.09,W*.08,H*.37);return}
 if(t==='bath-screen'){b.rect(0,H*.04,W,H*.055);b.line(0,H*.09,0,H*.99);b.line(W,H*.09,W,H*.99);
  b.line(W*.5,H*.09,W*.5,H*.99);b.circle(W*.56,H*.47,.025);b.rect(0,H*.94,W,H*.05);return}
}
for(const [t,n,w,h] of [
 ['urinal-front','Mingitorio · vista frontal',.39,.68],
 ['basin-section','Lavatorio sobre mesada · corte',.62,.86],
 ['basin-double','Lavatorio con pedestal · corte',.58,.90],
 ['bath-front','Bañera · vista frontal',.78,.58],
 ['bath-section','Bañera · corte transversal',.80,.58],
 ['shower-side','Ducha fija · vista lateral',.90,2.10],
 ['vanity-side','Vanitory · vista lateral',.55,.90],
 ['accessible','Inodoro accesible con barras · vista frontal',.98,.98],
 ['bath-screen','Mampara de ducha · alzado',1.30,2.00]
])reg('views26-bath-'+t,n,C,w,h,(b,W,H)=>bath(b,W,H,t));

/* Expose only non-mutating inventory for smoke tests. */
window.CAD2D_VIEWS26=Object.freeze({count:total,ids:Object.freeze([...ids].filter(x=>x.startsWith('views26-')))});
})();