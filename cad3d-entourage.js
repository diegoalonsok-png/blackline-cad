/* Blackline CAD3D · Biblioteca Blackline de entorno 2.5D.
   Original procedural drawings (no third-party images): people and European /
   Mediterranean vegetation drawn in ink and wash on transparent canvases.
   Used as cut-out images on crossed planes (vegetation) or camera-facing
   planes (people), the classic SketchUp-style 2.5D component. */
(function(global){
'use strict';

/* id, name, group, kind, width (m), height (m), mount: cross | face */
var LIBRARY=[
 ['ent-hombre-caminando','Hombre caminando · abrigo','2.5D Personas','person',.62,1.78,'face'],
 ['ent-mujer-bolso','Mujer con bolso','2.5D Personas','person',.58,1.68,'face'],
 ['ent-pareja','Pareja conversando','2.5D Personas','person',1.15,1.76,'face'],
 ['ent-hombre-maletin','Hombre con maletín','2.5D Personas','person',.6,1.82,'face'],
 ['ent-mujer-abrigo','Mujer caminando · abrigo largo','2.5D Personas','person',.6,1.7,'face'],
 ['ent-nino','Niño','2.5D Personas','person',.45,1.22,'face'],
 ['ent-grupo','Grupo de tres','2.5D Personas','person',1.7,1.8,'face'],
 ['ent-anciano','Persona mayor con bastón','2.5D Personas','person',.62,1.7,'face'],
 ['ent-platano','Plátano de sombra','2.5D Vegetación','tree',6.2,8.5,'cross'],
 ['ent-tilo','Tilo · copa oval','2.5D Vegetación','tree',4.6,7.2,'cross'],
 ['ent-cipres','Ciprés italiano','2.5D Vegetación','cypress',1.5,8,'cross'],
 ['ent-pino','Pino piñonero','2.5D Vegetación','pine',7,9,'cross'],
 ['ent-olivo','Olivo','2.5D Vegetación','olive',4.4,4.4,'cross'],
 ['ent-abedul','Abedul','2.5D Vegetación','birch',3.4,7.4,'cross'],
 ['ent-palmera','Palmera datilera','2.5D Vegetación','palm',4.4,7.5,'cross'],
 ['ent-boj','Arbusto de boj','2.5D Vegetación','bush',1.6,1.2,'cross'],
 ['ent-adelfa','Arbusto en flor','2.5D Vegetación','flowerbush',1.9,1.5,'cross'],
 ['ent-maceta','Planta en maceta','2.5D Vegetación','pot',.8,1.45,'cross'],
 ['ent-gramineas','Gramíneas ornamentales','2.5D Vegetación','grass',1.1,.85,'cross']
].map(function(a){return {id:a[0],name:a[1],group:a[2],kind:a[3],w:a[4],h:a[5],mount:a[6]};});

/* Legacy CAD3D cutouts (cutout1..cutout10) are redrawn with the new art. */
var LEGACY={cutout1:'ent-tilo',cutout2:'ent-platano',cutout3:'ent-olivo',cutout4:'ent-palmera',cutout5:'ent-palmera',
 cutout6:'ent-boj',cutout7:'ent-adelfa',cutout8:'ent-hombre-caminando',cutout9:'ent-mujer-bolso',cutout10:'ent-hombre-maletin'};

function rng(seed){var a=seed>>>0;return function(){a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function seedOf(s){var h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function shade(hex,f){
 var v=parseInt(hex.slice(1),16),r=v>>16,g=v>>8&255,b=v&255;
 if(f<0){r*=1+f;g*=1+f;b*=1+f*.85;}else{r+=(255-r)*f;g+=(255-g)*f;b+=(255-b)*f;}
 return 'rgb('+Math.round(r)+','+Math.round(g)+','+Math.round(b)+')';
}

function Pen(ctx,R,S){this.c=ctx;this.R=R;this.S=S;}
/* Hand-drawn polyline: slight wobble, variable pressure, optional double pass. */
Pen.prototype.line=function(pts,width,color,closed,passes){
 var c=this.c,R=this.R,S=this.S;
 c.save();c.strokeStyle=color||'#1c1f22';c.lineCap='round';c.lineJoin='round';
 for(var p=0;p<(passes||1);p++){
  c.lineWidth=(width||2.2)*S*(p?.55:1);c.globalAlpha=p?.45:.92;
  c.beginPath();
  var list=closed?pts.concat([pts[0]]):pts;
  for(var i=0;i<list.length;i++){
   var j=(R()-.5)*1.4*S*(p?1.6:1),k=(R()-.5)*1.4*S*(p?1.6:1);
   if(i===0)c.moveTo(list[i][0]+j,list[i][1]+k);else c.lineTo(list[i][0]+j,list[i][1]+k);
  }
  c.stroke();
 }
 c.restore();
};
Pen.prototype.fill=function(pts,color){
 var c=this.c;c.save();c.fillStyle=color;c.beginPath();
 pts.forEach(function(p,i){if(i)c.lineTo(p[0],p[1]);else c.moveTo(p[0],p[1]);});c.closePath();c.fill();c.restore();
};
/* Shading by hatching inside a polygon, light from the upper left. */
Pen.prototype.hatch=function(pts,color,spacing,angle,fromX,alpha){
 var c=this.c,S=this.S,R=this.R;
 var minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
 pts.forEach(function(p){minX=Math.min(minX,p[0]);maxX=Math.max(maxX,p[0]);minY=Math.min(minY,p[1]);maxY=Math.max(maxY,p[1]);});
 c.save();c.beginPath();pts.forEach(function(p,i){if(i)c.lineTo(p[0],p[1]);else c.moveTo(p[0],p[1]);});c.closePath();c.clip();
 if(fromX!=null){c.beginPath();c.rect(minX+(maxX-minX)*fromX,minY-5,maxX-minX,maxY-minY+10);c.clip();}
 c.strokeStyle=color;c.lineWidth=1.1*S;c.globalAlpha=alpha||.55;c.lineCap='round';
 var ca=Math.cos(angle),sa=Math.sin(angle),diag=Math.hypot(maxX-minX,maxY-minY),cx=(minX+maxX)/2,cy=(minY+maxY)/2;
 for(var d=-diag/2;d<diag/2;d+=spacing*S){
  var x0=cx+(-sa)*d-ca*diag/2,y0=cy+ca*d-sa*diag/2;
  c.beginPath();c.moveTo(x0+(R()-.5)*2*S,y0);c.lineTo(x0+ca*diag+(R()-.5)*2*S,y0+sa*diag);c.stroke();
 }
 c.restore();
};
function limb(a,b,ra,rb){
 var dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1,nx=-dy/l,ny=dx/l,pts=[];
 pts.push([a[0]+nx*ra,a[1]+ny*ra],[b[0]+nx*rb,b[1]+ny*rb]);
 for(var i=1;i<6;i++){var t=i/6*Math.PI;pts.push([b[0]+nx*rb*Math.cos(t)+dx/l*rb*Math.sin(t),b[1]+ny*rb*Math.cos(t)+dy/l*rb*Math.sin(t)]);}
 pts.push([b[0]-nx*rb,b[1]-ny*rb],[a[0]-nx*ra,a[1]-ny*ra]);
 for(i=1;i<6;i++){t=i/6*Math.PI;pts.push([a[0]-nx*ra*Math.cos(t)-dx/l*ra*Math.sin(t),a[1]-ny*ra*Math.cos(t)-dy/l*ra*Math.sin(t)]);}
 return pts;
}
function ellipsePts(x,y,rx,ry,n){var p=[];for(var i=0;i<(n||18);i++){var t=i/(n||18)*Math.PI*2;p.push([x+Math.cos(t)*rx,y+Math.sin(t)*ry]);}return p;}

/* ------------------------------------------------------------- people */
var PALETTES=[
 {coat:'#5f6b78',trouser:'#33393f',skin:'#d9b597',hair:'#3a2f28',shoe:'#26221f',accent:'#9a4b3c'},
 {coat:'#a4553f',trouser:'#3c3a40',skin:'#e0bea2',hair:'#6b4a33',shoe:'#2b2622',accent:'#d7c39a'},
 {coat:'#7d8a6a',trouser:'#4a4740',skin:'#c99a78',hair:'#1f1b19',shoe:'#2a2420',accent:'#c59a4e'},
 {coat:'#c9b79a',trouser:'#2f3540',skin:'#e4c3a8',hair:'#a77a4b',shoe:'#2c2621',accent:'#4f6d86'},
 {coat:'#3f4d63',trouser:'#7a6f62',skin:'#b98466',hair:'#2a221d',shoe:'#1f1c1a',accent:'#b5483a'},
 {coat:'#d1cfc7',trouser:'#5a6470',skin:'#ebcbb1',hair:'#8d8a86',shoe:'#3a332d',accent:'#6c7f5b'}
];
/* One figure. cx = centre x, ground = feet y, H = height in px.
   Elongated "architectural illustration" proportions (about 8 heads). */
function figure(pen,cx,ground,H,o){
 var p=o.palette,u=H/8.1,lean=(o.lean||0)*u,step=o.step||0,dir=o.facing||1,ink='#1b1d20';
 var sw=u*(o.female?.62:.74),hipW=u*(o.female?.6:.55);
 var headR=u*.43,headY=ground-H+headR*1.12,neckY=headY+headR*1.05,shY=neckY+u*.28;
 var hipY=ground-H*.47,waistY=hipY-u*.75,kneeY=ground-H*.255,ankleY=ground-u*.16;
 var sx=cx+lean,hx=cx+lean*.45;
 var stride=step*u*.95;
 function leg(side){
  var back=side<0,foot=cx+side*(stride*.5)+side*u*.12,knee=cx+side*(stride*.28)+side*u*.16;
  var top=hx+side*hipW*.45,r1=u*.27,r2=u*.2,r3=u*.13;
  var pts=[[top-r1,hipY],[knee-r2,kneeY],[foot-r3,ankleY],[foot+r3,ankleY],[knee+r2,kneeY],[top+r1,hipY]];
  var col=o.skirt?p.skin:p.trouser;
  pen.fill(pts,back?shade(col,-.2):col);pen.hatch(pts,ink,4.2,1.05,.5,.32);
  pen.line([pts[0],pts[1],pts[2]],1.6,ink);pen.line([pts[3],pts[4],pts[5]],1.6,ink);
  var shoe=[[foot-u*.17,ankleY-u*.02],[foot+u*.2+side*u*.06,ankleY+u*.02],[foot+u*.26+side*u*.06,ground],[foot-u*.2,ground]];
  pen.fill(shoe,p.shoe);pen.line(shoe,1.3,ink,true);
 }
 function arm(side,pose){
  var sh=[sx+side*sw*.92,shY+u*.18],sw2=-side*step*u*.55;
  var el=[sx+side*sw*1.02+sw2*.35,shY+u*1.35],wr=[sx+side*sw*.96+sw2,shY+u*2.55];
  if(pose==='bag'){el=[sx+side*sw*1.18,shY+u*1.3];wr=[sx+side*sw*1.08,shY+u*2.45];}
  if(pose==='talk'){el=[sx+side*sw*1.12,shY+u*1.25];wr=[sx+side*sw*1.75,shY+u*1.02];}
  if(pose==='cane'){el=[sx+side*sw*1.25,shY+u*1.25];wr=[sx+side*sw*1.5,shY+u*2.3];}
  if(pose==='pocket'){el=[sx+side*sw*1.2,shY+u*1.2];wr=[sx+side*sw*.72,shY+u*1.95];}
  var r1=u*.21,r2=u*.17,r3=u*.13;
  function n(a,b,r){var dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1;return [-dy/l*r,dx/l*r];}
  var a=n(sh,el,r1),b=n(el,wr,r2),c=n(el,wr,r3);
  var pts=[[sh[0]+a[0],sh[1]+a[1]],[el[0]+b[0],el[1]+b[1]],[wr[0]+c[0],wr[1]+c[1]],[wr[0]-c[0],wr[1]-c[1]],[el[0]-b[0],el[1]-b[1]],[sh[0]-a[0],sh[1]-a[1]]];
  var col=side<0&&dir>0?shade(p.coat,-.15):p.coat;
  pen.fill(pts,col);pen.hatch(pts,ink,4,1.1,.45,.32);pen.line(pts,1.6,ink,true);
  if(pose!=='pocket'){var hand=ellipsePts(wr[0],wr[1]+u*.13,u*.11,u*.16,10);pen.fill(hand,p.skin);pen.line(hand,1.1,ink,true);}
  return wr;
 }
 leg(-1);leg(1);
 var poses=o.armPose||'';
 var backSide=poses==='talk'?-dir:-1,frontSide=-backSide;
 var backWr=arm(backSide,poses==='pocket'?'pocket':'');
 /* torso: neck, sloping shoulders, waist, hips; coats and skirts flare below */
 var bottom=o.skirt?ground-H*.29:o.longCoat?ground-H*.22:hipY+u*.3,flare=o.skirt?u*.55:o.longCoat?u*.38:u*.05;
 var t=[[sx-u*.2,neckY],[sx+u*.2,neckY],[sx+sw*.78,shY+u*.02],[sx+sw,shY+u*.32],[sx+sw*.9,shY+u*1.05],
  [hx+sw*.7,waistY],[hx+hipW*.98+flare*.4,hipY],[hx+hipW+flare,bottom],[hx-hipW-flare,bottom],
  [hx-hipW*.98-flare*.4,hipY],[hx-sw*.7,waistY],[sx-sw*.9,shY+u*1.05],[sx-sw,shY+u*.32],[sx-sw*.78,shY+u*.02]];
 pen.fill(t,p.coat);pen.hatch(t,ink,4.4,1.15,.6,.4);
 if(!o.skirt)pen.line([[sx+u*.04,neckY+u*.2],[hx+u*.06,bottom-u*.05]],1.1,shade(p.coat,-.5));
 pen.line([[sx-u*.2,neckY],[sx,neckY+u*.55],[sx+u*.2,neckY]],1.2,shade(p.coat,-.5));
 if(o.belt)pen.line([[hx-sw*.72,waistY],[hx+sw*.72,waistY]],2.2,shade(p.coat,-.55));
 if(o.scarf){var sc=[[sx-u*.3,neckY-u*.05],[sx+u*.3,neckY-u*.05],[sx+u*.22,neckY+u*.42],[sx+u*.05,neckY+u*.95],[sx-u*.12,neckY+u*.9],[sx-u*.25,neckY+u*.35]];pen.fill(sc,p.accent);pen.line(sc,1.2,ink,true);}
 pen.line(t,2.1,ink,true,2);
 var wr=arm(frontSide,poses==='pocket'?'':poses);
 if(poses==='bag'){var bag=[[wr[0]-u*.36,wr[1]+u*.3],[wr[0]+u*.36,wr[1]+u*.3],[wr[0]+u*.44,wr[1]+u*1.05],[wr[0]-u*.44,wr[1]+u*1.05]];
  pen.fill(bag,p.accent);pen.hatch(bag,ink,3.6,1.2,.5,.4);pen.line(bag,1.6,ink,true);pen.line([[wr[0]-u*.22,wr[1]+u*.3],[wr[0],wr[1]+u*.05],[wr[0]+u*.22,wr[1]+u*.3]],1.3,ink);}
 if(o.briefcase){var bc=[[wr[0]-u*.5,wr[1]+u*.28],[wr[0]+u*.5,wr[1]+u*.28],[wr[0]+u*.5,wr[1]+u*1.02],[wr[0]-u*.5,wr[1]+u*1.02]];
  pen.fill(bc,'#4a3a2e');pen.hatch(bc,ink,3.4,1.2,.5,.4);pen.line(bc,1.6,ink,true);}
 if(poses==='cane')pen.line([[wr[0],wr[1]+u*.15],[wr[0]+u*.22,ground]],2.4,'#3b2d22');
 /* head, neck and hair */
 var hh=sx+lean*.15,neck=[[hh-u*.13,headY+headR*.6],[hh+u*.13,headY+headR*.6],[hh+u*.15,neckY+u*.05],[hh-u*.15,neckY+u*.05]];
 pen.fill(neck,shade(p.skin,-.15));
 var head=ellipsePts(hh,headY,headR*.84,headR,22);pen.fill(head,p.skin);pen.hatch(head,ink,3.2,1.2,.6,.3);
 var R=headR,hair;
 if(o.female)hair=[[hh-R*.98,headY+R*1.15],[hh-R*1.05,headY-R*.2],[hh-R*.55,headY-R*1.1],[hh+R*.5,headY-R*1.1],[hh+R*1.04,headY-R*.15],[hh+R*1.0,headY+R*1.2],[hh+R*.72,headY+R*.3],[hh+R*.2,headY-R*.55],[hh-R*.6,headY-R*.2],[hh-R*.7,headY+R*.6]];
 else if(o.bald)hair=[[hh-R*.86,headY+R*.15],[hh-R*.84,headY-R*.4],[hh-R*.6,headY-R*.1],[hh-R*.66,headY+R*.35]];
 else hair=[[hh-R*.88,headY+R*.1],[hh-R*.82,headY-R*.72],[hh-R*.15,headY-R*1.1],[hh+R*.6,headY-R*.95],[hh+R*.9,headY-R*.3],[hh+R*.84,headY+R*.05],[hh+R*.35,headY-R*.5],[hh-R*.45,headY-R*.48]];
 pen.fill(hair,o.grey?'#bdb8b0':p.hair);
 pen.line(head,1.6,ink,true);pen.line(hair,1.2,ink,true);
 if(o.hat){var hat=[[hh-R*1.3,headY-R*.42],[hh+R*1.3,headY-R*.42],[hh+R*.78,headY-R*.62],[hh+R*.72,headY-R*1.35],[hh-R*.72,headY-R*1.35],[hh-R*.78,headY-R*.62]];pen.fill(hat,'#2f2c2a');pen.line(hat,1.4,ink,true);}
}

/* ----------------------------------------------------------- vegetation */
function trunk(pen,x,y,len,ang,width,depth,o,tips){
 var R=pen.R,x2=x+Math.cos(ang)*len,y2=y+Math.sin(ang)*len;
 var bend=(R()-.5)*len*.18,mx=(x+x2)/2+Math.cos(ang+Math.PI/2)*bend,my=(y+y2)/2+Math.sin(ang+Math.PI/2)*bend;
 var w2=width*o.taper,nx=Math.cos(ang+Math.PI/2),ny=Math.sin(ang+Math.PI/2);
 var poly=[[x+nx*width/2,y+ny*width/2],[mx+nx*(width+w2)/4,my+ny*(width+w2)/4],[x2+nx*w2/2,y2+ny*w2/2],[x2-nx*w2/2,y2-ny*w2/2],[mx-nx*(width+w2)/4,my-ny*(width+w2)/4],[x-nx*width/2,y-ny*width/2]];
 pen.fill(poly,o.bark);
 if(width>4*pen.S){pen.hatch(poly,'#1d1a17',3.2,ang+1.3,.55,.4);}
 if(o.birch&&width>3*pen.S){for(var b=0;b<3;b++){var t=R();pen.line([[x+(x2-x)*t-nx*w2*.3,y+(y2-y)*t-ny*w2*.3],[x+(x2-x)*t+nx*w2*.1,y+(y2-y)*t+ny*w2*.1]],1.6,'#2a2623');}}
 pen.line([poly[0],poly[1],poly[2]],Math.max(.8,Math.min(1.6,width/(6*pen.S))),'#1d1a17');
 pen.line([poly[3],poly[4],poly[5]],Math.max(.8,Math.min(1.6,width/(6*pen.S))),'#1d1a17');
 if(depth<=0||len<6*pen.S){tips.push([x2,y2,width]);return;}
 var n=o.split||2;
 for(var i=0;i<n;i++){
  var spread=o.spread*(i/(n-1||1)-.5)*2+(R()-.5)*.35;
  trunk(pen,x2,y2,len*(o.decay+(R()-.5)*.12),ang+spread,w2*(.72+R()*.1),depth-1,o,tips);
 }
}
/* Foliage mass: overlapping scalloped clumps with three values, ink contour on the lit edge. */
function foliage(pen,masses,o){
 var c=pen.c,R=pen.R,S=pen.S;
 var light=o.leaf,mid=shade(o.leaf,-.18),dark=shade(o.leaf,-.42);
 function clump(x,y,r,col){
  var pts=[],n=10+Math.floor(r/(3*S));
  for(var i=0;i<n;i++){var t=i/n*Math.PI*2,rr=r*(.9+R()*.14+(i%2?.04:0));pts.push([x+Math.cos(t)*rr,y+Math.sin(t)*rr*.86]);}
  pen.fill(pts,col);return pts;
 }
 masses.forEach(function(m){clump(m[0]+m[2]*.12,m[1]+m[2]*.14,m[2],dark);});
 masses.forEach(function(m){clump(m[0],m[1],m[2]*.92,mid);});
 masses.forEach(function(m){var p=clump(m[0]-m[2]*.22,m[1]-m[2]*.25,m[2]*.6,light);
  /* leaf dabs */
  c.save();c.strokeStyle=shade(o.leaf,-.55);c.lineWidth=1*S;c.globalAlpha=.55;
  for(var k=0;k<m[2]/(2.2*S);k++){var a=R()*Math.PI*2,d=Math.sqrt(R())*m[2]*.95,x=m[0]+Math.cos(a)*d+m[2]*.1,y=m[1]+Math.sin(a)*d*.86+m[2]*.12;
   if(y<m[1]-m[2]*.2&&x<m[0])continue;
   c.beginPath();c.arc(x,y,(1.6+R()*2.2)*S,Math.PI*.1,Math.PI*.9);c.stroke();}
  c.restore();
 });
 /* contour scallops around each mass, lighter on the lit side */
 masses.forEach(function(m,mi){
  var n=18+Math.floor(m[2]/(3*S)),run=[];
  function flush(){if(run.length>2)pen.line(run,1.5,'#1c2219');run=[];}
  for(var i=0;i<=n;i++){
   var t=i/n*Math.PI*2,x=m[0]+Math.cos(t)*m[2]*.97,y=m[1]+Math.sin(t)*m[2]*.84,inside=false;
   for(var j=0;j<masses.length&&!inside;j++){if(j===mi)continue;var q=masses[j];var dx=(x-q[0])/(q[2]*.97),dy=(y-q[1])/(q[2]*.86);if(dx*dx+dy*dy<1)inside=true;}
   if(inside)flush();else run.push([x,y]);
  }
  flush();
 });
 if(o.flowers){masses.forEach(function(m){for(var k=0;k<m[2]/(1.6*S);k++){var a=R()*Math.PI*2,d=Math.sqrt(R())*m[2]*.85;
  var f=ellipsePts(m[0]+Math.cos(a)*d,m[1]+Math.sin(a)*d*.85,2.2*S,2.2*S,6);pen.fill(f,R()<.5?o.flowers:shade(o.flowers,.35));}});}
}
function crownMasses(R,cx,cy,rx,ry,count,size){
 var m=[];
 for(var i=0;i<count;i++){var a=i*2.39996+R()*.4,d=Math.sqrt((i+.5)/count);
  m.push([cx+Math.cos(a)*rx*d*.82,cy+Math.sin(a)*ry*d*.82,size*(.75+R()*.45)]);}
 m.sort(function(a,b){return a[1]-b[1];});
 return m;
}
function shadowBlob(pen,cx,ground,rx){
 var c=pen.c;c.save();c.fillStyle='rgba(30,34,30,.22)';c.beginPath();c.ellipse(cx,ground-rx*.06,rx,rx*.08,0,0,Math.PI*2);c.fill();c.restore();
}

function drawPlant(pen,spec,W,H){
 var R=pen.R,S=pen.S,cx=W/2,ground=H-6*S,k=spec.kind;
 var bark='#6e5a48',leaf='#6f8f5a';
 function tipMasses(tips,size,extra,cx,cy,rx,ry){
  var m=tips.map(function(t){return [t[0],t[1]-size*.25,size*(.8+R()*.4)];});
  var xs=tips.map(function(t){return t[0];}),ys=tips.map(function(t){return t[1];});
  if(tips.length){cx=(Math.min.apply(null,xs)+Math.max.apply(null,xs))/2;cy=(Math.min.apply(null,ys)+Math.max.apply(null,ys))/2+size*.35;
   rx=(Math.max.apply(null,xs)-Math.min.apply(null,xs))/2;ry=Math.max(size,(Math.max.apply(null,ys)-Math.min.apply(null,ys))/2+size*.3);extra=Math.max(extra,Math.round(rx*ry/(size*size)*1.3));}
  for(var i=0;i<extra;i++){var a=i*2.39996,d=Math.sqrt((i+.5)/extra);m.push([cx+Math.cos(a)*rx*d*.7,cy+Math.sin(a)*ry*d*.7,size*(.85+R()*.35)]);}
  m.sort(function(p,q){return p[1]-q[1];});return m;
 }
 if(k==='tree'){
  var oval=spec.id==='ent-tilo',tips=[];
  trunk(pen,cx,ground,H*(oval?.3:.3),-Math.PI/2,W*.07,oval?4:4,{taper:.68,split:oval?2:3,spread:oval?.28:.42,decay:.76,bark:bark},tips);
  var cy=oval?H*.4:H*.37;
  foliage(pen,tipMasses(tips,W*(oval?.15:.12),oval?10:12,cx,cy,W*.4,H*(oval?.3:.24)),{leaf:oval?'#728f55':'#7b9a5e'});
 }else if(k==='cypress'){
  var tt=[];trunk(pen,cx,ground,H*.07,-Math.PI/2,W*.12,0,{taper:.8,split:1,spread:0,decay:.7,bark:bark},tt);
  var m=[];for(var i=0;i<34;i++){var t=i/33,yy=ground-H*.05-t*H*.92,prof=Math.pow(1-t,.55)*Math.min(1,t*5+.45);
   m.push([cx+(R()-.5)*W*.12,yy,Math.max(6*S,W*.33*prof)]);}
  foliage(pen,m.reverse(),{leaf:'#4f6e45'});
 }else if(k==='pine'){
  var tp=[];trunk(pen,cx,ground,H*.5,-Math.PI/2+.03,W*.045,3,{taper:.64,split:3,spread:.8,decay:.62,bark:'#7a5d48'},tp);
  var mp=tipMasses(tp,W*.1,8,cx,H*.3,W*.3,H*.06);
    mp.sort(function(p,q){return p[1]-q[1];});foliage(pen,mp,{leaf:'#5f7d4f'});
 }else if(k==='olive'){
  var to=[];trunk(pen,cx,ground,H*.28,-Math.PI/2+.12,W*.1,3,{taper:.64,split:3,spread:.65,decay:.8,bark:'#7d7166'},to);
  foliage(pen,tipMasses(to,W*.11,10,cx,H*.36,W*.38,H*.2),{leaf:'#9aa486'});
 }else if(k==='birch'){
  var tb=[];trunk(pen,cx,ground,H*.34,-Math.PI/2,W*.05,4,{taper:.7,split:2,spread:.34,decay:.8,bark:'#e8e4da',birch:true},tb);
  foliage(pen,tipMasses(tb,W*.13,14,cx,H*.3,W*.32,H*.24),{leaf:'#93ad6a'});
 }else if(k==='palm'){
  var top=H*.25,sway=W*.06;
  var tr=[];for(i=0;i<=12;i++){var t2=i/12;tr.push([cx+Math.sin(t2*1.6)*sway,ground-(ground-top)*t2]);}
  var left=tr.map(function(p,i){return [p[0]-W*(.045-.012*i/12),p[1]];}),right=tr.map(function(p,i){return [p[0]+W*(.045-.012*i/12),p[1]];}).reverse();
  var poly=left.concat(right);pen.fill(poly,'#8a7462');pen.hatch(poly,'#2a231d',4,0,.5,.45);
  for(i=1;i<12;i++)pen.line([left[i],[right[11-i+1][0],left[i][1]+3*S]],1,'#2a231d');
  pen.line(left,1.5,'#1d1a17');pen.line(right,1.5,'#1d1a17');
  var tx=tr[12][0],ty=top;
  /* fronds: tapered, drooping pinnate leaves with serrated edges and a midrib */
  var fronds=[];
  for(i=0;i<16;i++){
   var a2=-Math.PI/2+(i/15-.5)*Math.PI*1.9+(R()-.5)*.15,len=W*(.36+R()*.12),droop=.75+R()*.55;
   fronds.push({a:a2,len:len,droop:droop,back:i%2===0});
  }
  fronds.sort(function(p,q){return (p.back?0:1)-(q.back?0:1);});
  fronds.forEach(function(f,fi){
   var mid=[];for(var s=0;s<=16;s++){var t3=s/16;mid.push([tx+Math.cos(f.a)*f.len*t3,ty+Math.sin(f.a)*f.len*t3+f.droop*f.len*t3*t3*.6]);}
   var up=[],dn=[];
   for(s=0;s<=16;s++){
    var si=Math.min(15,Math.max(1,s)),q=mid[s],ang2=Math.atan2(mid[si+1][1]-mid[si-1][1],mid[si+1][0]-mid[si-1][0]);
    var wd=W*.075*Math.sin(Math.PI*Math.min(1,s/16*1.05))*(1-s/16*.35),saw=(s%2?.55:1);
    up.push([q[0]+Math.cos(ang2-Math.PI/2)*wd*saw,q[1]+Math.sin(ang2-Math.PI/2)*wd*saw]);
    dn.push([q[0]+Math.cos(ang2+Math.PI/2)*wd*saw,q[1]+Math.sin(ang2+Math.PI/2)*wd*saw]);
   }
   var poly=up.concat(dn.reverse()),col=f.back?'#4d6b43':(fi%3?'#6a8a52':'#7d9b5f');
   pen.fill(poly,col);
   pen.hatch(poly,'#1f2a1c',3.4,f.a+1.4,null,f.back?.35:.18);
   pen.line(poly,1.3,'#1c2419',true);pen.line(mid,1.2,'#2c3a26');
  });
  var crown=ellipsePts(tx,ty+W*.02,W*.05,W*.04,12);pen.fill(crown,'#6e5a46');pen.line(crown,1.2,'#1d1a17',true);
 }else if(k==='bush'||k==='flowerbush'){
  var mbush=[];for(i=0;i<14;i++){var a3=i*2.4,d3=Math.sqrt((i+.5)/14);mbush.push([cx+Math.cos(a3)*W*.33*d3,ground-H*.45+Math.sin(a3)*H*.28*d3,Math.min(W,H)*.22*(.8+R()*.4)]);}
  mbush.sort(function(a,b){return a[1]-b[1];});
  foliage(pen,mbush,{leaf:k==='bush'?'#5e7f4c':'#6d8a55',flowers:k==='flowerbush'?'#d0687a':null});
  shadowBlob(pen,cx,ground,W*.4);
 }else if(k==='pot'){
  var pot=[[cx-W*.3,ground-H*.33],[cx+W*.3,ground-H*.33],[cx+W*.22,ground],[cx-W*.22,ground]];
  var stems=[];for(i=0;i<9;i++){var a4=-Math.PI/2+(i/8-.5)*1.6,l4=H*(.42+R()*.2);stems.push([a4,l4]);}
  stems.forEach(function(st){var x0=cx,y0=ground-H*.34,pts=[];for(var s=0;s<=8;s++){var t=s/8;pts.push([x0+Math.cos(st[0])*st[1]*t,y0+Math.sin(st[0])*st[1]*t+t*t*H*.08]);}
   pen.line(pts,1.4,'#40583a');
   for(s=2;s<=8;s+=2){var q=pts[s],lf=ellipsePts(q[0]+(st[0]<-Math.PI/2?-1:1)*W*.07,q[1],W*.09,H*.028,20);pen.fill(lf,s%4?'#6c8f56':'#55753f');pen.line(lf,1,'#1f2a1c',true);}});
  pen.fill(pot,'#b4694a');pen.hatch(pot,'#3b2018',3.6,1.1,.55,.45);pen.line(pot,1.8,'#1d1714',true);
  pen.line([[cx-W*.33,ground-H*.33],[cx+W*.33,ground-H*.33]],2.2,'#1d1714');
 }else if(k==='grass'){
  for(i=0;i<60;i++){var a5=-Math.PI/2+(R()-.5)*1.3,l5=H*(.55+R()*.4),x5=cx+(R()-.5)*W*.35,pts5=[];
   for(var s5=0;s5<=6;s5++){var t5=s5/6;pts5.push([x5+Math.cos(a5)*l5*t5+Math.sign(Math.cos(a5))*t5*t5*W*.12,ground+Math.sin(a5)*l5*t5+t5*t5*H*.1]);}
   pen.line(pts5,1.2,i%3?'#8a9a5c':'#b6a86d');}
  for(i=0;i<10;i++){var x6=cx+(R()-.5)*W*.6,y6=ground-H*(.7+R()*.25);pen.line([[x6,y6+H*.15],[x6+(R()-.5)*8*S,y6]],2.4,'#c9b783');}
 }
 if(k==='tree'||k==='olive'||k==='birch'||k==='pine'||k==='palm'||k==='cypress')shadowBlob(pen,cx,ground,W*.12);
}

function canvasFor(spec,res){
 var H=Math.round(res||1024),W=Math.max(64,Math.round(H*spec.w/spec.h));
 if(W>H*1.6){W=Math.round(H*1.6);}
 var canvas=(typeof document!=='undefined')?document.createElement('canvas'):null;
 if(!canvas)return null;canvas.width=W;canvas.height=H;return canvas;
}
function draw(id,res){
 var key=LEGACY[id]||id,spec=LIBRARY.find(function(s){return s.id===key;});
 if(!spec)return null;
 var canvas=canvasFor(spec,res),ctx=canvas&&canvas.getContext('2d');
 if(!ctx)return null;
 var W=canvas.width,H=canvas.height,S=H/1024,pen=new Pen(ctx,rng(seedOf(key)),S);
 ctx.clearRect(0,0,W,H);
 if(spec.kind==='person'){
  var ground=H-8*S,P=PALETTES,Hpx=H*.97;
  switch(key){
   case 'ent-hombre-caminando':figure(pen,W/2,ground,Hpx,{palette:P[0],step:.9,lean:.15,scarf:true});break;
   case 'ent-mujer-bolso':figure(pen,W/2-W*.04,ground,Hpx,{palette:P[1],female:true,skirt:true,step:.35,armPose:'bag'});break;
   case 'ent-hombre-maletin':figure(pen,W/2,ground,Hpx,{palette:P[4],step:.15,briefcase:true,longCoat:true});break;
   case 'ent-mujer-abrigo':figure(pen,W/2,ground,Hpx,{palette:P[3],female:true,longCoat:true,step:.8,lean:.1,scarf:true});break;
   case 'ent-nino':figure(pen,W/2,ground,Hpx,{palette:P[2],step:.7});break;
   case 'ent-anciano':figure(pen,W/2-W*.06,ground,Hpx*.97,{palette:P[5],grey:true,hat:true,step:.25,armPose:'cane',lean:.35,longCoat:true});break;
   case 'ent-pareja':
    figure(pen,W*.3,ground,Hpx*.95,{palette:P[1],female:true,skirt:true,armPose:'talk',facing:1,step:.1});
    figure(pen,W*.7,ground,Hpx,{palette:P[0],armPose:'talk',facing:-1,step:.1});break;
   case 'ent-grupo':
    figure(pen,W*.5,ground,Hpx*.92,{palette:P[2],step:.3,female:true,longCoat:true});
    figure(pen,W*.2,ground,Hpx*.97,{palette:P[4],step:.6,bald:true});
    figure(pen,W*.8,ground,Hpx,{palette:P[3],step:.5,armPose:'bag',female:true,skirt:true});break;
  }
 }else{
  /* Vegetation is grown on a larger sheet, then fitted: crowns are never clipped. */
  var big=document.createElement('canvas');big.width=Math.round(W*2.2);big.height=Math.round(H*1.6);
  var bctx=big.getContext('2d'),bpen=new Pen(bctx,rng(seedOf(key)),S);
  bctx.translate((big.width-W)/2,big.height-H);
  drawPlant(bpen,spec,W,H);
  var data=bctx.getImageData(0,0,big.width,big.height).data,x0=big.width,x1=0,y0=big.height,y1=0;
  for(var y=0;y<big.height;y+=2)for(var x=0;x<big.width;x+=2)if(data[(y*big.width+x)*4+3]>8){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
  if(x1>x0&&y1>y0){
   var bw=x1-x0+2,bh=y1-y0+2,f=Math.min(W/bw,H/bh);
   ctx.drawImage(big,x0,y0,bw,bh,(W-bw*f)/2,H-bh*f,bw*f,bh*f);
  }
 }
 return canvas;
}

var api={version:'1.0.0',LIBRARY:LIBRARY,LEGACY:LEGACY,draw:draw,
 spec:function(id){var k=LEGACY[id]||id;return LIBRARY.find(function(s){return s.id===k;})||null;}};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(global)global.BlacklineEntourage=Object.freeze(api);
})(typeof window!=='undefined'?window:(typeof globalThis!=='undefined'?globalThis:this));
