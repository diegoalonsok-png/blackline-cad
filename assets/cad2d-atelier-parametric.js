/* BLACKLINE · ATELIER PARAMÉTRICO
 * 120 new original modern 2D CAD blocks; native metric geometry.
 * Deliberately regenerates functional elements on resize: sofa cushions, storage
 * sections, stair risers, glass mullions, table seating, cabinetry, planters etc.
 * Never inserts a raster or uniformly stretches pre-existing CAD lines.
 */
(function(root){
 'use strict';
 const api=root.CAD2D_ARQ_LIBRARY;
 if(!api||!Array.isArray(api.library))return;
 const available=new Set(api.library.map(x=>x.id));
 const C={
  living:'Atelier · Living contemporáneo',seating:'Atelier · Sillones y sillas',
  dining:'Atelier · Mesas de diseño',bedroom:'Atelier · Dormitorios',
  kitchen:'Atelier · Cocinas',bath:'Atelier · Baños y wellness',
  office:'Atelier · Oficina y coworking',doors:'Atelier · Puertas y accesos',
  windows:'Atelier · Ventanas y fachadas',outdoor:'Atelier · Exterior y terrazas',
  plants:'Atelier · Árboles y jardines',lighting:'Atelier · Iluminación',
  vehicles:'Atelier · Movilidad',people:'Atelier · Personas',
  stairs:'Atelier · Escaleras'
 };
 const R=(b,x,y,w,d,r=.06)=>b.rrect(x,y,w,d,Math.min(r,w*.48,d*.48));
 const L=(b,x1,y1,x2,y2,st)=>b.line(x1,y1,x2,y2,st);
 const E=(b,x,y,rx,ry)=>b.ellipse(x,y,Math.max(.008,rx),Math.max(.008,ry));
 const P=(b,pts,close=true)=>b.poly(pts,close);
 const N=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
 const dashed={dashed:true};
 const nBy=(size,span,min=1,max=24)=>N(Math.round(size/span),min,max);
 const rect=(b,x,y,w,d)=>b.rect(x,y,w,d);
 const centerCircle=(b,W,D,r=.055)=>b.circle(W*.5,D*.5,Math.min(W,D)*r);
 function sofa(b,W,D,v){
  const arm=Math.min(.17,D*.18),back=Math.min(.22,D*.21),x=arm,y=.045;
  R(b,0,0,W,D,.075);
  R(b,x,y,W-2*x,D-y-back,.065);
  R(b,x,D-back,W-2*x,back-.035,.045);
  if(v===2||v===3){const chaise=W*.32;R(b,v===2?x:W-x-chaise,.055,chaise,D-.11,.05);
    L(b,v===2?x+chaise:W-x-chaise,.1,v===2?x+chaise:W-x-chaise,D-.26);}
  if(v===5||v===6){E(b,W*.50,D*.49,W*.42,D*.39);E(b,W*.50,D*.55,W*.35,D*.29);}
  const count=nBy(W-2*x,.72,2,7);
  for(let j=1;j<count;j++)L(b,x+(W-2*x)*j/count,D*.10,x+(W-2*x)*j/count,D-back-.025);
  if(v===7){for(let j=1;j<4;j++)L(b,W*j/4,D*.10,W*j/4,D*.82,dashed)}
 }
 function chair(b,W,D,v){
  if(v===2||v===6){E(b,W/2,D/2,W*.46,D*.46);E(b,W/2,D*.48,W*.35,D*.32)}
  else{R(b,.035,.035,W-.07,D-.07,.08);R(b,W*.14,D*.12,W*.72,D*.62,.055);}
  if(v%3===0){R(b,W*.04,D*.19,W*.11,D*.54,.035);R(b,W*.85,D*.19,W*.11,D*.54,.035)}
  if(v%3===1){const n=nBy(W,.11,3,7);for(let j=1;j<n;j++)L(b,W*j/n,D*.79,W*j/n,D*.91)}
  L(b,W*.16,D*.88,W*.84,D*.88);
  if(v===7){L(b,W*.10,D*.18,W*.90,D*.18);centerCircle(b,W,D,.045)}
 }
 function dining(b,W,D,v){
  if([0,4,6].includes(v)){E(b,W/2,D/2,W*.48,D*.47);E(b,W/2,D/2,W*.44,D*.43)}
  else if(v===3){E(b,W*.36,D*.51,W*.33,D*.43);E(b,W*.73,D*.44,W*.24,D*.31)}
  else{R(b,.025,.025,W-.05,D-.05,Math.min(.15,D*.15));R(b,.085,.085,W-.17,D-.17,.08)}
  if(v===1||v===5){const n=nBy(W,.55,2,10);for(let j=0;j<n;j++){
    E(b,(j+.5)*W/n,D*.08,Math.min(.18,W/n*.32),D*.07);
    E(b,(j+.5)*W/n,D*.92,Math.min(.18,W/n*.32),D*.07);
  }}
  if(v===2||v===7){b.circle(W*.50,D*.50,Math.min(W,D)*.07);L(b,W*.22,D*.50,W*.78,D*.50)}
 }
 function bed(b,W,D,v){
  R(b,0,0,W,D,.06);R(b,W*.055,D*.09,W*.89,D*.83,.06);
  const pillows=v%3===1?1:2;
  for(let j=0;j<pillows;j++){const w=W*.77/pillows;
    R(b,W*.11+j*w,D*.73,w*.93,D*.14,.065)}
  if(v%2===0)L(b,W/2,D*.10,W/2,D*.70,dashed);
  if(v===2||v===6)for(let j=1;j<5;j++)L(b,W*.10,D*.13+j*D*.10,W*.90,D*.13+j*D*.10,dashed);
  if(v===4||v===7){rect(b,0,D*.91,W,D*.09);L(b,W*.05,D*.92,W*.95,D*.92)}
 }
 function kitchen(b,W,D,v){
  R(b,.025,.025,W-.05,D-.05,.04);
  if(v===0||v===1||v===5){
   R(b,W*.09,D*.10,W*.32,D*.55,.045);centerCircle(b,W*.50,D*.60,.02);
   for(let j=0;j<4;j++)b.circle(W*(.68+(j%2)*.14),D*(.22+Math.floor(j/2)*.22),Math.min(W,D)*.045);
   if(v===1||v===5)for(let j=1;j<=nBy(W,.60,2,6);j++){
    const x=W*j/(nBy(W,.60,2,6)+1);E(b,x,D*.90,Math.min(.19,W*.07),Math.min(.13,D*.08));
   }
  }else if(v===2||v===6){
   const n=nBy(W,.60,2,9);
   for(let j=1;j<n;j++)L(b,W*j/n,.035,W*j/n,D*.96);
   R(b,W*.05,D*.08,W*.30,D*.74,.04);
   if(v===6)for(let j=0;j<4;j++)b.circle(W*(.63+(j%2)*.17),D*(.28+Math.floor(j/2)*.29),Math.min(W,D)*.055);
  }else if(v===3){rect(b,.03,.03,W*.26,D*.94);rect(b,.03,.03,W*.94,D*.27);
   const n=nBy(W,.60,2,8);for(let j=1;j<n;j++)L(b,W*j/n,.03,W*j/n,D*.30);
  }else if(v===4){rect(b,.03,.03,W*.18,D*.94);rect(b,W*.79,.03,W*.18,D*.94);
   rect(b,.03,.03,W*.94,D*.23);R(b,W*.40,D*.055,W*.26,D*.14,.05);
  }else{R(b,W*.12,D*.15,W*.76,D*.67,.09);E(b,W*.50,D*.48,W*.21,D*.20);centerCircle(b,W,D,.025)}
 }
 function bathroom(b,W,D,v){
  if(v===0||v===5){E(b,W*.50,D*.50,W*.48,D*.47);E(b,W*.50,D*.50,W*.39,D*.35);b.circle(W*.81,D*.52,.025)}
  else if(v===1||v===7){R(b,.02,.02,W-.04,D-.04,.07);E(b,W/2,D*.55,W*.27,D*.28);b.circle(W/2,D*.55,.025);b.circle(W/2,D*.13,.023)}
  else if(v===2){rect(b,0,0,W,D);rect(b,.04,.04,W-.08,D-.08);
   L(b,.055,.055,W-.055,D-.055,dashed);L(b,.055,D-.055,W-.055,.055,dashed);b.circle(W*.85,D*.15,.04)}
  else if(v===3){R(b,.05,.05,W-.10,D-.10,.08);const n=nBy(W,.60,2,5);
   for(let j=0;j<n;j++){E(b,W*(j+.5)/n,D*.58,Math.min(W/n*.35,.23),D*.22);b.circle(W*(j+.5)/n,D*.58,.018)}}
  else if(v===4){R(b,.1,.02,W-.20,D-.04,.08);E(b,W*.50,D*.61,W*.35,D*.27);E(b,W*.50,D*.61,W*.25,D*.20)}
  else{rect(b,0,0,W,D);for(let j=1;j<6;j++)L(b,W*.055,D*j/6,W*.945,D*j/6);b.circle(W*.86,D*.86,.03)}
 }
 function office(b,W,D,v){
  if(v===0||v===1){R(b,.02,.03,W-.04,D-.06,.07);R(b,W*.16,D*.23,W*.42,D*.23,.03);b.circle(W*.68,D*.38,.028);
   if(v===1)R(b,W*.77,D*.38,W*.18,D*.54,.04);}
  else if(v===2||v===7){R(b,W*.18,D*.23,W*.64,D*.53,.09);const n=nBy(W,.58,3,8);
   for(let j=0;j<n;j++){E(b,W*(j+.5)/n,D*.09,Math.min(W/n*.34,.20),D*.08);E(b,W*(j+.5)/n,D*.92,Math.min(W/n*.34,.20),D*.08)}}
  else if(v===3){rect(b,0,0,W,D);const n=nBy(W,1.15,2,6);
   for(let j=1;j<n;j++)L(b,W*j/n,0,W*j/n,D);
   L(b,0,D*.5,W,D*.5);for(let j=0;j<n;j++){R(b,W*(j+.16)/n,D*.16,W*.60/n,D*.20,.03);
   R(b,W*(j+.16)/n,D*.64,W*.60/n,D*.20,.03)}}
  else if(v===4){R(b,.04,.04,W-.08,D*.46,.08);P(b,[[W*.15,D*.59],[W*.85,D*.59],[W*.70,D*.92],[W*.30,D*.92]])}
  else if(v===5){rect(b,0,0,W,D);R(b,W*.15,D*.17,W*.70,D*.30,.08);E(b,W*.50,D*.78,W*.17,D*.12)}
  else{R(b,.04,.04,W-.08,D-.08,.05);const n=nBy(W,.60,2,6);
   for(let j=1;j<n;j++)L(b,W*j/n,D*.04,W*j/n,D*.96);}
 }
 function door(b,W,D,v){
  // Accurate opening extent W and swing clearances tied to panel width.
  const jamb=Math.min(.05,W*.04,D*.11);
  rect(b,0,0,jamb,D*.16);rect(b,W-jamb,0,jamb,D*.16);
  if(v<=2||v===7){
   const hinge=v===1?W-jamb:W*.06,r=Math.min(W*.86,D*.82);
   b.circle(hinge,D*.12,.023);L(b,hinge,D*.12,hinge+(v===1?-r:r),D*.12);
   b.arc(hinge,D*.12,r,v===1?90:0,v===1?180:87,dashed);
   if(v===2){b.circle(W*.94,D*.12,.023);b.arc(W*.94,D*.12,r,94,180,dashed);}
  }else if(v<=5){
   const n=v===3?2:v===4?3:4;
   rect(b,0,D*.13,W,D*.09);rect(b,0,D*.78,W,D*.09);
   for(let j=0;j<n;j++){const x=W*j/n;L(b,x,D*(.20+(j%2)*.10),x+W/n,D*(.20+(j%2)*.10));}
  }else if(v===6){
   rect(b,0,D*.08,W,D*.10);
   for(let j=0;j<6;j++){const x=W*j/6;P(b,[[x,D*.18],[x+W/12,D*.62],[x+W/6,D*.18]],false)}
  }
 }
 function window(b,W,D,v){
  rect(b,0,0,W,D);rect(b,.035,.035,W-.07,D-.07);
  const n=v===0?1:v===1?2:v===2?3:v===3?4:nBy(W,.85,2,10);
  for(let j=1;j<n;j++)L(b,W*j/n,.035,W*j/n,D-.035);
  if(v===2||v===3){for(let j=0;j<n;j++)L(b,W*(j+.17)/n,D*.25,W*(j+.83)/n,D*.75,dashed)}
  if(v===4||v===5){L(b,.035,D/2,W-.035,D/2);L(b,W*.10,D*.20,W*.90,D*.80,dashed)}
  if(v===6){const fins=nBy(W,.25,4,20);
   for(let j=1;j<fins;j++)L(b,W*j/fins,D*.15,W*j/fins,D*.85)}
  if(v===7){for(let j=1;j<5;j++)L(b,.045,D*j/5,W-.045,D*j/5);}
 }
 function outdoor(b,W,D,v){
  if(v===0){rect(b,0,0,W,D);const n=nBy(W,.20,5,35);for(let j=1;j<n;j++)L(b,W*j/n,0,W*j/n,D)}
  else if(v===1){R(b,.12*W,.04*D,W*.76,D*.92,.07);R(b,W*.20,D*.61,W*.60,D*.30,.06);L(b,W*.20,D*.61,W*.80,D*.61)}
  else if(v===2){b.circle(W/2,D/2,Math.min(W,D)*.46);
   for(let j=0;j<8;j++){const a=j*Math.PI/4;L(b,W/2,D/2,W*(.5+.42*Math.cos(a)),D*(.5+.42*Math.sin(a)))}
   centerCircle(b,W,D,.03)}
  else if(v===3){rect(b,0,0,W,D);const n=nBy(W,.31,4,30);
   for(let j=1;j<n;j++)L(b,W*j/n,D*.04,W*j/n,D*.96,{width:.18});}
  else if(v===4){E(b,W/2,D/2,W*.32,D*.32);
   for(let j=0;j<6;j++){const a=j*Math.PI/3;E(b,W*(.5+.41*Math.cos(a)),D*(.5+.41*Math.sin(a)),W*.064,D*.068)}}
  else if(v===5){rect(b,0,0,W,D);R(b,W*.05,D*.07,W*.9,D*.86,.15);
   const n=nBy(W,.35,4,20);for(let j=1;j<n;j++)L(b,W*j/n,D*.22,W*j/n,D*.25)}
  else if(v===6){b.circle(W/2,D/2,Math.min(W,D)*.35);b.circle(W/2,D/2,Math.min(W,D)*.22);
   for(let j=0;j<8;j++){const a=j*Math.PI/4;E(b,W*(.5+.43*Math.cos(a)),D*(.5+.43*Math.sin(a)),W*.045,D*.045)}}
  else{R(b,0,0,W,D,.055);R(b,W*.08,D*.10,W*.84,D*.80,.08);
   for(let j=1;j<5;j++)L(b,W*.08,D*j/5,W*.92,D*j/5,dashed)}
 }
 function plants(b,W,D,v){
  if(v===0||v===2||v===5){
   const pts=[],n=48;for(let j=0;j<n;j++){const a=j/n*Math.PI*2,rad=.41+.031*Math.sin(j*3.9+v)+.018*Math.cos(j*6.3+v);
    pts.push([W*(.5+rad*Math.cos(a)),D*(.5+rad*Math.sin(a))]);}
   P(b,pts);centerCircle(b,W,D,.05);
   for(let j=0;j<8;j++){const a=j*Math.PI/4;L(b,W*.5,D*.5,W*(.5+.32*Math.cos(a)),D*(.5+.32*Math.sin(a)));}
  }else if(v===1||v===6){R(b,0,0,W,D,.04);R(b,.05,.05,W-.10,D-.10,.035);
   const n=nBy(W,.27,3,30);for(let j=0;j<n;j++)b.circle(W*(j+.5)/n,D*.50,Math.min(W/n*.35,D*.31));}
  else if(v===3){centerCircle(b,W,D,.07);
   for(let j=0;j<9;j++){const a=j*Math.PI*2/9;
    P(b,[[W*.5,D*.5],[W*(.5+.41*Math.cos(a-.15)),D*(.5+.30*Math.sin(a-.15))],
    [W*(.5+.45*Math.cos(a)),D*(.5+.45*Math.sin(a))],[W*(.5+.41*Math.cos(a+.15)),D*(.5+.30*Math.sin(a+.15))]]);
   }
  }else if(v===4){R(b,0,0,W,D,.05);const n=nBy(W,.50,2,15);
   for(let j=0;j<n;j++)E(b,W*(j+.5)/n,D*(.45+.10*Math.sin(j*3)),W*.34/n,D*.26);}
  else{R(b,0,0,W,D,.07);for(let j=0;j<6;j++){const x=W*(j+.5)/6;E(b,x,D*.51,W*.063,D*.31)}}
 }
 function lighting(b,W,D,v){
  if(v===0||v===4){centerCircle(b,W,D,.46);centerCircle(b,W,D,.32);centerCircle(b,W,D,.07);}
  else if(v===1||v===5){R(b,.02,D*.37,W*.96,D*.26,.025);const n=nBy(W,.30,3,16);
   for(let j=1;j<n;j++)L(b,W*j/n,D*.42,W*j/n,D*.58);}
  else if(v===2){E(b,W*.5,D*.5,W*.46,D*.35);E(b,W*.5,D*.5,W*.38,D*.27);centerCircle(b,W,D,.06)}
  else if(v===3){rect(b,0,0,W,D);const n=nBy(W,.40,2,10);for(let j=0;j<n;j++)b.circle(W*(j+.5)/n,D*.5,Math.min(D*.30,W/n*.28));}
  else if(v===6){b.circle(W/2,D/2,Math.min(W,D)*.44);
   for(let j=0;j<8;j++){const a=j*Math.PI/4;L(b,W*.5,D*.5,W*(.5+.40*Math.cos(a)),D*(.5+.40*Math.sin(a)))}}
  else {R(b,0,0,W,D,.05);const n=nBy(W,.25,3,16);for(let j=0;j<n;j++)b.circle(W*(j+.5)/n,D*.5,Math.min(W/n*.20,D*.23));}
 }
 function vehicle(b,W,D,v){
  if(v<=3){R(b,.025,0,W*.95,D,.13);R(b,W*.16,D*.16,W*.66,D*.68,.08);
   L(b,W*.13,D*.22,W*.88,D*.22);L(b,W*.13,D*.78,W*.88,D*.78);
   for(let j of[.11,.74]){rect(b,W*.01,D*j,W*.07,D*.15);rect(b,W*.92,D*j,W*.07,D*.15)}
   if(v===1)R(b,W*.24,D*.25,W*.52,D*.49,.09);
   if(v===3)L(b,W*.52,D*.15,W*.52,D*.85,dashed);
  }else if(v===4||v===5){const r=Math.min(W,D)*.2;
   b.circle(W*.22,D*.5,r);b.circle(W*.78,D*.5,r);
   P(b,[[W*.22,D*.5],[W*.45,D*.72],[W*.60,D*.5],[W*.22,D*.5]]);
   L(b,W*.60,D*.5,W*.78,D*.5);L(b,W*.60,D*.5,W*.69,D*.27);
  }else if(v===6){b.circle(W*.43,D*.50,Math.min(W,D)*.3);
   b.circle(W*.43,D*.50,Math.min(W,D)*.2);
   b.circle(W*.47,D*.89,Math.min(W,D)*.075);L(b,W*.47,D*.82,W*.47,D*.53);
   L(b,W*.47,D*.53,W*.80,D*.53);L(b,W*.80,D*.53,W*.86,D*.2);
  }else {R(b,0,0,W,D,.06);R(b,W*.20,D*.30,W*.60,D*.47,.05);centerCircle(b,W,D,.04);}
 }
 function people(b,W,D,v){
  // Scaled human figures in plan, no age/identity assumptions.
  E(b,W*.5,D*.74,W*.20,D*.16);
  E(b,W*.5,D*.45,W*.26,D*.23);
  if(v%2){E(b,W*.15,D*.47,W*.13,D*.09);E(b,W*.85,D*.47,W*.13,D*.09)}
  else {L(b,W*.28,D*.50,W*.09,D*.24);L(b,W*.72,D*.50,W*.91,D*.24);}
  if(v>=4){L(b,W*.42,D*.24,W*.28,D*.06);L(b,W*.58,D*.24,W*.72,D*.06);}
  else{E(b,W*.35,D*.19,W*.11,D*.15);E(b,W*.65,D*.19,W*.11,D*.15)}
  if(v===7)R(b,W*.15,D*.06,W*.70,D*.88,.08);
 }
 function stairs(b,W,D,v){
  rect(b,0,0,W,D);
  if(v<=3){const n=nBy(D,.175,3,36);
   for(let j=1;j<n;j++)L(b,.02,D*j/n,W-.02,D*j/n);
   if(v===1){L(b,W*.5,D*.05,W*.5,D*.95,dashed)}
   if(v===2){b.arc(W*.5,D*.50,Math.min(W,D)*.36,0,175)}
   if(v===3){L(b,W*.1,D*.86,W*.85,D*.86,{width:.2});}
  }else if(v===4||v===5){const n=nBy(D,.27,3,25);
   for(let j=1;j<n;j++)L(b,.02,D*j/n,W*.44,D*j/n);
   for(let j=1;j<n;j++)L(b,W*.56,D*j/n,W-.02,D*j/n);
   rect(b,W*.44,0,W*.12,D);
  }else if(v===6){const turns=14;
   for(let j=0;j<=turns;j++){const a=j/turns*2*Math.PI;
    L(b,W/2,D/2,W*(.5+.45*Math.cos(a)),D*(.5+.45*Math.sin(a)))}
   centerCircle(b,W,D,.10);
  }else{const n=nBy(W,.24,4,24);
   for(let j=1;j<n;j++)L(b,W*j/n,.04,W*j/n,D-.04)}
 }
 const DRAW={living:sofa,seating:chair,dining:dining,bedroom:bed,kitchen:kitchen,bath:bathroom,
 office:office,doors:door,windows:window,outdoor:outdoor,plants:plants,lighting:lighting,
 vehicles:vehicle,people:people,stairs:stairs};
 const presets={
 living:[
  ['Sofá de 3 módulos',2.55,1.00,1.75,3.7,.82,1.2],
  ['Sofá de 4 módulos',3.10,1.05,2.3,4.4,.9,1.25],
  ['Sofá chaise izquierda',2.95,1.75,2.4,4.0,1.4,2.05],
  ['Sofá chaise derecha',2.95,1.75,2.4,4.0,1.4,2.05],
  ['Sofá modular esquinero',3.20,1.9,2.7,4.5,1.45,2.4],
  ['Sofá curvo orgánico',2.75,1.25,2.0,3.7,1.05,1.55],
  ['Sofá boutique bajo',2.45,1.12,1.9,3.8,.95,1.50],
  ['Sofá de piezas acolchadas',2.85,1.18,2.0,4.0,.92,1.6]],
 seating:[
  ['Sillón lounge de madera',.81,.84,.68,1.18,.7,1.16],
  ['Silla comedor de respaldo fino',.54,.57,.46,.76,.48,.7],
  ['Butaca orgánica circular',.91,.87,.7,1.22,.72,1.16],
  ['Silla con brazos',.68,.72,.55,.92,.61,.92],
  ['Silla tapizada de diseño',.57,.59,.46,.78,.47,.78],
  ['Banco individual lounge',.8,.82,.65,1.14,.67,1.12],
  ['Puff redondo',.70,.70,.55,1.25,.55,1.25],
  ['Silla respaldo continuo',.55,.59,.45,.77,.48,.78]],
 dining:[
  ['Mesa oval de comedor',2.20,1.05,1.5,3.5,.78,1.40],
  ['Mesa madera noble',2.40,1.08,1.4,3.6,.80,1.4],
  ['Mesa de comedor rectangular',2.80,1.10,1.6,4.2,.85,1.5],
  ['Mesas ratonas anidadas',1.35,.88,.9,1.9,.65,1.2],
  ['Mesa circular pedestal',1.25,1.25,.8,1.85,.8,1.85],
  ['Mesa de reuniones pequeña',2.40,1.10,1.4,3.4,.8,1.40],
  ['Mesa elíptica de mármol',2.00,1.00,1.3,3.1,.8,1.45],
  ['Mesa baja de centro',1.30,.76,.75,2.1,.55,1.2]],
 bedroom:[
  ['Cama queen con cabecero',1.80,2.18,1.45,2.1,2.0,2.5],
  ['Cama king plataforma',2.10,2.30,1.9,2.6,2.1,2.7],
  ['Cama tapizada de diseño',2.00,2.30,1.6,2.55,2.1,2.75],
  ['Cama de una plaza',1.05,2.15,.86,1.3,1.95,2.4],
  ['Cama nido contemporánea',1.20,2.10,.95,1.65,1.9,2.4],
  ['Cama doble flotante',1.8,2.30,1.45,2.4,2.05,2.6],
  ['Cama con respaldo de tablillas',1.9,2.25,1.5,2.45,2.0,2.65],
  ['Cama con respaldo corrido',2.35,2.35,1.8,3.3,2.1,2.75]],
 kitchen:[
  ['Isla con anafe y bacha',2.70,1.24,2.0,4.2,1.1,1.7],
  ['Isla con barra de desayuno',2.60,1.40,1.9,4.2,1.2,1.75],
  ['Mueble bajo modular',3.00,.65,1.5,5.0,.55,.75],
  ['Cocina en L de diseño',3.2,2.15,2.4,5.0,1.5,3.1],
  ['Cocina en U de diseño',3.4,2.4,2.6,5.0,1.8,3.5],
  ['Isla de cocción profesional',3.0,1.35,2.2,4.8,1.1,1.7],
  ['Mueble de despensa',2.4,.72,1.3,4.5,.55,.88],
  ['Bacha doble bajo mesada',1.25,.65,1.0,2.2,.55,.85]],
 bath:[
  ['Bañera freestanding',1.8,.82,1.55,2.2,.72,1.02],
  ['Vanitory suspendido',1.25,.54,.65,2.5,.45,.75],
  ['Ducha italiana walk in',1.6,.92,1.1,2.7,.78,1.5],
  ['Vanitory doble bacha',1.65,.58,1.15,2.8,.5,.78],
  ['Sanitario suspendido',.49,.7,.43,.65,.58,.85],
  ['Bañera oval de piedra',1.85,.9,1.55,2.4,.78,1.1],
  ['Mueble de baño lineal',2.2,.58,1.3,3.8,.48,.75],
  ['Bacha de apoyo de diseño',.78,.51,.55,1.35,.42,.65]],
 office:[
  ['Escritorio elevable',1.60,.80,1.1,2.4,.66,1.05],
  ['Escritorio con retorno',2.00,1.55,1.5,3.0,1.25,2.0],
  ['Mesa de reuniones central',3.00,1.30,2.1,5.5,1.05,1.8],
  ['Coworking cuatro puestos',3.3,1.8,2.8,5.8,1.45,2.5],
  ['Mostrador de recepción',2.5,1.05,1.6,4.0,.85,1.55],
  ['Cabina de videollamada',1.45,1.6,1.2,2.2,1.25,2.4],
  ['Mesa operativa compartida',3.0,1.5,2.2,5.0,1.25,2.1],
  ['Mesa de conferencia grande',4.0,1.45,2.8,7.0,1.2,2.2]],
 doors:[
  ['Puerta abatible izquierda',.9,1.03,.70,1.2,.75,1.4],
  ['Puerta abatible derecha',.9,1.03,.70,1.2,.75,1.4],
  ['Puerta doble hoja',1.6,1.5,1.3,2.7,1.2,2.8],
  ['Corredera dos hojas',1.8,.30,1.2,3.5,.24,.55],
  ['Corredera triple hoja',3.0,.38,2.1,5.5,.3,.65],
  ['Corredera cuádruple',4.1,.40,2.8,7.0,.30,.65],
  ['Puerta plegadiza',2.65,1.1,1.5,5.0,.95,1.55],
  ['Puerta pivotante de acceso',1.3,1.3,1.05,1.9,1.02,1.8]],
 windows:[
  ['Paño fijo minimalista',1.3,.22,.70,3.4,.16,.42],
  ['Ventana corrediza 2 hojas',1.6,.24,1.1,3.6,.18,.42],
  ['Ventana corrediza 3 hojas',2.7,.30,1.7,5.0,.22,.48],
  ['Ventana corrediza 4 hojas',3.6,.32,2.4,6.0,.24,.52],
  ['Ventana batiente de diseño',1.05,.25,.65,2.0,.18,.45],
  ['Ventana proyectante',1.2,.26,.65,2.4,.20,.48],
  ['Fachada con parasoles',3.2,.48,2.1,7.0,.32,.75],
  ['Ventana apaisada corrida',4.0,.28,2.0,8.0,.19,.50]],
 outdoor:[
  ['Deck de listones',3.0,2.2,1.5,8.0,1.2,6.0],
  ['Reposera contemporánea',.78,2.0,.68,1.15,1.7,2.35],
  ['Sombrilla circular',2.5,2.5,1.8,4.5,1.8,4.5],
  ['Pérgola de lamas',4.0,3.2,2.5,10,2.0,6.0],
  ['Mesa exterior con sillas',2.5,2.4,1.9,4.2,1.8,4.0],
  ['Piscina rectangular de diseño',5,2.8,2.5,14,2.0,6.5],
  ['Fogón circular de terraza',1.9,1.9,1.2,3.4,1.2,3.4],
  ['Jacuzzi exterior',2.15,2.0,1.65,3.6,1.65,3.6]],
 plants:[
  ['Árbol frondoso 3 metros',3,3,2.2,6.0,2.2,6.0],
  ['Jardinera lineal',2.2,.55,1.0,7.0,.40,.95],
  ['Árbol de copa grande',5.0,5.0,3.2,8,3.2,8],
  ['Palmera en planta',3.3,3.3,2.0,6.0,2.0,6],
  ['Conjunto de arbustos',2.6,1.4,1.2,6.0,.95,2.7],
  ['Arbolado urbano',4.0,4.0,2.4,7.0,2.4,7],
  ['Seto bajo paramétrico',3.0,.68,1.1,8,.45,1.15],
  ['Cantero con gramíneas',2.2,.95,1.0,6,.6,1.55]],
 lighting:[
  ['Downlight circular',.14,.14,.10,.28,.10,.28],
  ['Línea de luz LED',1.8,.12,.60,6.0,.09,.28],
  ['Luminaria colgante orgánica',.58,.35,.35,1.1,.22,.65],
  ['Panel técnico lineal',1.20,.27,.60,4,.20,.45],
  ['Luz indirecta de foseado',.90,.80,.45,2,.45,2],
  ['Perfil LED superficial',2.0,.16,.75,8,.10,.28],
  ['Luminaria de diseño radial',.65,.65,.40,1.30,.40,1.30],
  ['Serie de spots direccionables',1.8,.30,.85,5,.20,.55]],
 vehicles:[
  ['Automóvil urbano',4.2,1.78,3.5,5.0,1.55,2.2],
  ['SUV compacto',4.5,1.90,4.0,5.5,1.75,2.30],
  ['SUV grande',5.1,2.0,4.5,5.9,1.85,2.4],
  ['Vehículo eléctrico',4.7,1.85,4.0,5.3,1.75,2.2],
  ['Bicicleta urbana',1.8,.65,1.5,2.1,.55,.85],
  ['Bicicleta de carga',2.2,.88,1.85,2.7,.75,1.1],
  ['Símbolo accesibilidad en planta',.85,.90,.60,1.35,.60,1.35],
  ['Estación de carga EV',.9,.65,.65,1.4,.50,.95]],
 people:[
  ['Persona caminando',.6,.82,.45,.85,.62,1.12],
  ['Persona sentada',.7,.76,.52,.95,.60,1.15],
  ['Persona de pie con brazos abiertos',.62,.86,.48,.90,.68,1.2],
  ['Persona apoyada',.65,.82,.5,.92,.64,1.1],
  ['Persona con mochila',.70,.9,.52,1.0,.70,1.25],
  ['Persona con equipaje',.75,1.0,.58,1.10,.80,1.35],
  ['Persona en espera',.62,.82,.48,.92,.65,1.20],
  ['Persona en sillón',.90,.9,.72,1.3,.72,1.30]],
 stairs:[
  ['Escalera recta',1.2,3.3,.85,2.2,2.1,6.6],
  ['Escalera recta con baranda',1.25,4.0,.88,2.4,2.4,7.0],
  ['Escalera de diseño flotante',1.50,4.4,1.0,2.5,2.8,7.8],
  ['Escalera de hormigón',1.15,3.1,.9,2.0,2.0,6.6],
  ['Escalera doble ida y vuelta',2.4,3.0,1.9,4.0,2.2,6.0],
  ['Escalera de dos tramos',2.8,3.5,2.2,5.0,2.3,6.6],
  ['Escalera caracol',2.2,2.2,1.55,3.5,1.55,3.5],
  ['Rampa accesible',1.4,6.5,1.1,2.5,3.0,12]]
 };
 let count=0;
 Object.keys(presets).forEach(function(key){
  presets[key].forEach(function(item,v){
   const [name,w,d,wMin,wMax,dMin,dMax]=item;
   const id='atelier-'+key+'-'+String(v+1).padStart(2,'0');
   if(available.has(id))return;
   const entry={id,name,cat:C[key],family:'atelier-'+key,
    w,d,wMin,wMax,dMin,dMax,dynamicActions:true,pro:true,
    gen:function(builder,W,D){DRAW[key](builder,W,D,v);}
   };
   api.library.push(entry);available.add(id);count++;
  });
  if(!api.categories.includes(C[key]))api.categories.push(C[key]);
 });
 root.CAD2D_ATELIER_PARAMETRIC={newBlocks:count,total:api.library.length,categories:Object.values(C),blockIds:[...available].filter(x=>x.startsWith('atelier-'))};
})(typeof window!=='undefined'?window:globalThis);
