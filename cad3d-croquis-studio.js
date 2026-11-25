/* Blackline CAD3D · Estudio de render artístico.
   Non-photorealistic renderer driven by real geometric passes (G-buffer):
   linear depth, world normals, material ids, Lambert light with and without
   cast shadows, plus visible model edges already tested against the depth
   buffer. It never mutates the model and never invents objects.
   Pure functions; usable in the browser (window.BlacklineCroquisStudio)
   and in Node tests (module.exports). */
(function(global){
'use strict';

var STYLES=[
 {id:'estudio',label:'Croquis de estudio · grafito (tipo SketchUp)'},
 {id:'acuarela',label:'Acuarela de arquitecto'},
 {id:'plumilla',label:'Plumilla densa · tinta'},
 {id:'grabado',label:'Grabado a dos tintas'},
 {id:'bicromia',label:'Bicromía de trama'},
 {id:'aguada',label:'Aguada de tinta · ilustración 60'},
 {id:'lineaclara',label:'Línea clara color'},
 {id:'riso',label:'Póster risográfico'},
 {id:'sucio',label:'Acuarela sucia · capas y deformación'}
];

/* Style defaults. Every numeric value can be overridden by the panel. */
var DEFAULTS={
 estudio:{ink:'#33363a',paper:'#f5f0e3',accent:'#c8643a',sky:'#b8cdd9',color:38,density:55,shadow:70,grain:55,
  line:{width:1,profile:2.3,alpha:.82,extension:7,jitter:.85,passes:2,gaps:0,bow:.6,depthCue:.45,raster:.32,blend:'multiply'}},
 acuarela:{ink:'#4a4b4e',paper:'#fbf9f3',accent:'#c8643a',sky:'#8fb6d6',color:72,density:50,shadow:75,grain:70,
  line:{width:.8,profile:1.9,alpha:.66,extension:6,jitter:.7,passes:1,gaps:.04,bow:.5,depthCue:.5,raster:.26,blend:'multiply'}},
 plumilla:{ink:'#141414',paper:'#fbfaf6',accent:'#c8643a',sky:'#ffffff',color:0,density:62,shadow:80,grain:30,
  line:{width:1.05,profile:2.2,alpha:.95,extension:2.5,jitter:.45,passes:1,gaps:0,bow:.25,depthCue:.35,raster:.7,blend:'source-over'}},
 grabado:{ink:'#1d3a78',paper:'#f1e6cc',accent:'#ef5a24',sky:'#f1e6cc',color:0,density:70,shadow:85,grain:35,
  line:{width:.95,profile:2,alpha:.95,extension:0,jitter:.2,passes:1,gaps:0,bow:.1,depthCue:.25,raster:.6,blend:'source-over'}},
 bicromia:{ink:'#1e2a2e',paper:'#f2d7a0',accent:'#7aa2a3',sky:'#8fb0ae',color:15,density:55,shadow:80,grain:45,
  line:{width:1.15,profile:1.9,alpha:.95,extension:1.5,jitter:.35,passes:1,gaps:0,bow:.2,depthCue:.2,raster:.8,blend:'source-over'}},
 aguada:{ink:'#161616',paper:'#fbfaf7',accent:'#c8643a',sky:'#fbfaf7',color:0,density:50,shadow:75,grain:40,
  line:{width:1.25,profile:2.4,alpha:.92,extension:3.5,jitter:1.1,passes:1,gaps:.13,bow:.9,depthCue:.3,raster:.42,blend:'source-over'}},
 lineaclara:{ink:'#1b1b1b',paper:'#fbf6ea',accent:'#c8643a',sky:'#d6e5e6',color:100,density:50,shadow:70,grain:25,
  line:{width:1.1,profile:1.5,alpha:1,extension:0,jitter:0,passes:1,gaps:0,bow:0,depthCue:0,raster:1,blend:'source-over'}},
 riso:{ink:'#2b2a33',paper:'#f4ecdc',accent:'#e5482b',sky:'#efc26a',color:100,density:50,shadow:70,grain:80,
  line:{width:.7,profile:1.6,alpha:.5,extension:0,jitter:.1,passes:1,gaps:0,bow:0,depthCue:.2,raster:.3,blend:'multiply'}},
 sucio:{ink:'#3b3430',paper:'#f6f1e6',accent:'#c8643a',sky:'#86aac4',color:85,density:55,shadow:80,grain:80,warp:55,dirt:60,
  line:{width:1.05,profile:2.1,alpha:.78,extension:10,jitter:1.5,passes:3,gaps:.08,bow:1.2,depthCue:.4,raster:.28,blend:'multiply'}}
};

function clamp01(v){return v<0?0:v>1?1:v;}
function clamp255(v){return v<0?0:v>255?255:v;}
function mix(a,b,t){return a+(b-a)*t;}
function smooth(a,b,v){var t=clamp01((v-a)/(b-a));return t*t*(3-2*t);}
function hex(h,fallback){
 var s=String(h||fallback||'#000000').replace('#','');
 if(s.length===3)s=s[0]+s[0]+s[1]+s[1]+s[2]+s[2];
 var v=[0,2,4].map(function(i){return parseInt(s.slice(i,i+2),16);});
 return v.some(function(n){return !Number.isFinite(n);})?hex(fallback||'#000000'):v;
}
function hash(x,y,seed){
 var n=(Math.imul((x|0)+0x9e37,374761393)^Math.imul((y|0)+0x7f4a,668265263)^Math.imul((seed|0)+1,0x27d4eb2d))>>>0;
 n=Math.imul(n^(n>>>13),1274126177)>>>0;
 return ((n^(n>>>16))>>>0)/4294967296;
}
function vnoise(x,y,seed){
 var xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi;
 var u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
 var a=hash(xi,yi,seed),b=hash(xi+1,yi,seed),c=hash(xi,yi+1,seed),d=hash(xi+1,yi+1,seed);
 return mix(mix(a,b,u),mix(c,d,u),v);
}
function fbm(x,y,seed,oct){
 var sum=0,amp=.5,norm=0;
 for(var o=0;o<(oct||3);o++){sum+=vnoise(x,y,seed+o*17)*amp;norm+=amp;x*=2.03;y*=2.03;amp*=.5;}
 return sum/norm;
}
function lum(c){return (.2126*c[0]+.7152*c[1]+.0722*c[2])/255;}
function saturate(c,amount){
 var g=(c[0]+c[1]+c[2])/3;
 return [clamp255(g+(c[0]-g)*amount),clamp255(g+(c[1]-g)*amount),clamp255(g+(c[2]-g)*amount)];
}
function cross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
function norm3(a){var l=Math.hypot(a[0],a[1],a[2]);return l>1e-9?[a[0]/l,a[1]/l,a[2]/l]:null;}

/* Options: style defaults merged with panel overrides. */
function resolveOptions(input){
 var o=input||{},style=DEFAULTS[o.style]?o.style:'estudio',d=DEFAULTS[style],line={};
 Object.keys(d.line).forEach(function(k){line[k]=d.line[k];});
 if(o.lineWeight!=null&&Number.isFinite(+o.lineWeight))line.width*=+o.lineWeight;
 if(o.extension!=null&&Number.isFinite(+o.extension))line.extension=+o.extension;
 if(o.jitter!=null&&Number.isFinite(+o.jitter))line.jitter=+o.jitter;
 if(o.depthCue!=null&&Number.isFinite(+o.depthCue))line.depthCue=clamp01(+o.depthCue/100);
 if(o.vectorLines===false)line.vector=false;else line.vector=true;
 var num=function(k){return o[k]!=null&&Number.isFinite(+o[k])?+o[k]:d[k];};
 return {style:style,ink:hex(o.ink,d.ink),paper:hex(o.paper,d.paper),accent:hex(o.accent,d.accent),
  sky:hex(o.sky,d.sky),color:clamp01(num('color')/100),density:clamp01(num('density')/100),
  shadow:clamp01(num('shadow')/100),grain:clamp01(num('grain')/100),
  warp:clamp01((o.warp!=null&&Number.isFinite(+o.warp)?+o.warp:(d.warp||0))/100),
  dirt:clamp01((o.dirt!=null&&Number.isFinite(+o.dirt)?+o.dirt:(d.dirt||0))/100),
  accentMode:o.accentMode||'auto',border:o.border===true||o.border==='true'||(o.border==null&&style==='riso'),
  seed:Number.isFinite(+o.seed)?+o.seed|0:7,line:line,inkHex:o.ink||d.ink};
}

/* ---------------------------------------------------------------- prepare */
function prepare(gb){
 if(gb._prep&&gb._prep.w===gb.w&&gb._prep.h===gb.h)return gb._prep;
 var w=gb.w,h=gb.h,n=w*h,i,x,y;
 var depth=gb.depth,id=gb.id,nrm=gb.normal,mats=gb.materials||[];
 var edge=new Uint8Array(n),kind=new Uint8Array(n);
 var light=new Float32Array(n),shadow=new Float32Array(n);
 /* light normalisation: 97th percentile of surface light */
 var hist=new Uint32Array(256),count=0;
 for(i=0;i<n;i++)if(id[i]){hist[gb.light[i]]++;count++;}
 var acc=0,ref=255;
 for(var b=255;b>=0;b--){acc+=hist[b];if(acc>=count*.03){ref=Math.max(40,b);break;}}
 for(i=0;i<n;i++){
  if(!id[i])continue;
  var l=gb.light[i],lf=gb.lightFree?gb.lightFree[i]:l;
  light[i]=clamp01(l/ref);
  shadow[i]=clamp01((lf-l)/Math.max(lf,12)*1.45);
 }
 function N(j,c){return nrm[j*3+c]/127;}
 var area=new Float64Array(mats.length+1);
 for(y=0;y<h;y++)for(x=0;x<w;x++){
  i=y*w+x;if(!id[i])continue;area[id[i]]++;
  var z=depth[i],ground=mats[id[i]]&&mats[id[i]].ground,cutout=mats[id[i]]&&mats[id[i]].cutout;
  if(x===0||y===0||x===w-1||y===h-1)continue;
  if(cutout){
   if(id[i-1]!==id[i]||id[i+1]!==id[i]||id[i-w]!==id[i]||id[i+w]!==id[i]){
    var front=true,nbs=[i-1,i+1,i-w,i+w];
    for(var f=0;f<4;f++)if(id[nbs[f]]&&depth[nbs[f]]<z*.995)front=false;
    if(front){edge[i]=120;kind[i]=1;}
   }
   continue;
  }
  var l1=i-1,r1=i+1,u1=i-w,d1=i+w;
  if(!id[l1]||!id[r1]||!id[u1]||!id[d1]){edge[i]=255;kind[i]=ground?4:3;continue;}
  var zl=depth[l1],zr=depth[r1],zu=depth[u1],zd=depth[d1];
  if(ground&&mats[id[l1]]&&mats[id[l1]].ground&&mats[id[r1]]&&mats[id[r1]].ground&&mats[id[u1]]&&mats[id[u1]].ground&&mats[id[d1]]&&mats[id[d1]].ground)continue;
  var lap=(Math.abs(zl+zr-2*z)+Math.abs(zu+zd-2*z))/Math.max(z,1e-6);
  var jump=Math.max(Math.abs(zr-z),Math.abs(zd-z),Math.abs(zl-z),Math.abs(zu-z))/Math.max(z,1e-6);
  if((lap>.022||jump>.045)&&z<=(zl+zr+zu+zd)/4+z*.002){
   edge[i]=Math.min(255,90+Math.max(lap,jump)*2400);kind[i]=3;continue;
  }
  var best=0;
  for(var s=0;s<2;s++){
   var j=s?r1:d1;
   var dn=1-(N(i,0)*N(j,0)+N(i,1)*N(j,1)+N(i,2)*N(j,2));
   if(dn>best)best=dn;
  }
  if(best>.1){edge[i]=Math.min(255,80+best*420);kind[i]=2;continue;}
  for(s=0;s<2;s++){
   j=s?r1:d1;
   if(id[j]!==id[i]){
    var a=mats[id[i]],c=mats[id[j]];
    if(a&&c&&Math.abs(a.rgb[0]-c.rgb[0])+Math.abs(a.rgb[1]-c.rgb[1])+Math.abs(a.rgb[2]-c.rgb[2])>36){
     edge[i]=150;kind[i]=1;break;
    }
   }
  }
 }
 /* drop isolated edge pixels (normal quantisation, vertex cracks) */
 for(y=1;y<h-1;y++)for(x=1;x<w-1;x++){
  i=y*w+x;if(!kind[i]||kind[i]===4)continue;
  var nbc=0;
  for(var oy=-1;oy<=1;oy++)for(var ox=-1;ox<=1;ox++)if((ox||oy)&&kind[i+oy*w+ox])nbc++;
  if(nbc<2){kind[i]=0;edge[i]=0;}
 }
 /* chamfer distance (px) to the nearest model edge, used by washes */
 var dist=new Uint8Array(n);
 for(i=0;i<n;i++)dist[i]=kind[i]&&kind[i]!==4?0:255;
 for(y=0;y<h;y++)for(x=0;x<w;x++){
  i=y*w+x;var v=dist[i];
  if(x>0&&dist[i-1]+3<v)v=dist[i-1]+3;
  if(y>0){if(dist[i-w]+3<v)v=dist[i-w]+3;if(x>0&&dist[i-w-1]+4<v)v=dist[i-w-1]+4;if(x<w-1&&dist[i-w+1]+4<v)v=dist[i-w+1]+4;}
  dist[i]=v;
 }
 for(y=h-1;y>=0;y--)for(x=w-1;x>=0;x--){
  i=y*w+x;v=dist[i];
  if(x<w-1&&dist[i+1]+3<v)v=dist[i+1]+3;
  if(y<h-1){if(dist[i+w]+3<v)v=dist[i+w]+3;if(x<w-1&&dist[i+w+1]+4<v)v=dist[i+w+1]+4;if(x>0&&dist[i+w-1]+4<v)v=dist[i+w-1]+4;}
  dist[i]=v;
 }
 /* planar regions: same material, same normal, continuous depth */
 var region=new Int32Array(n).fill(-1),stack=new Int32Array(n),zsum=[],zcount=[],rid=0;
 for(i=0;i<n;i++){
  if(!id[i]||region[i]>=0)continue;
  var top=0;stack[top++]=i;region[i]=rid;var sum=0,cnt=0;
  while(top){
   var p=stack[--top];sum+=Math.log(Math.max(depth[p],1e-6));cnt++;
   var px=p%w,nb=[px>0?p-1:-1,px<w-1?p+1:-1,p-w,p+w];
   for(var q=0;q<4;q++){
    var o=nb[q];if(o<0||o>=n||region[o]>=0||id[o]!==id[p])continue;
    if(Math.abs(depth[o]-depth[p])>depth[p]*.03)continue;
    if(N(o,0)*N(p,0)+N(o,1)*N(p,1)+N(o,2)*N(p,2)<.985)continue;
    region[o]=rid;stack[top++]=o;
   }
  }
  zsum.push(sum);zcount.push(cnt);rid++;
 }
 var regionZ=new Float32Array(rid),regionArea=new Uint32Array(rid);
 for(var r=0;r<rid;r++){regionZ[r]=Math.exp(zsum[r]/zcount[r]);regionArea[r]=zcount[r];}
 var accentId=0,bestScore=0;
 for(var m=1;m<mats.length;m++){
  if(!mats[m]||mats[m].ground||mats[m].glass||mats[m].cutout||area[m]<n*.012)continue;
  var c=mats[m].rgb,sat=(Math.max(c[0],c[1],c[2])-Math.min(c[0],c[1],c[2]))/255;
  var score=sat*Math.sqrt(area[m]);
  if(sat>.16&&score>bestScore){bestScore=score;accentId=m;}
 }
 /* proximity of every pixel to the model (8 px cells), used to fade the ground */
 var cs=8,gw=Math.ceil(w/cs),gh=Math.ceil(h/cs),prox=new Uint16Array(gw*gh).fill(65535);
 for(i=0;i<n;i++){var mm=mats[id[i]];if(id[i]&&mm&&!mm.ground)prox[Math.floor((i/w|0)/cs)*gw+Math.floor((i%w)/cs)]=0;}
 for(y=0;y<gh;y++)for(x=0;x<gw;x++){var g=y*gw+x,vv=prox[g];if(x>0&&prox[g-1]+3<vv)vv=prox[g-1]+3;if(y>0){if(prox[g-gw]+3<vv)vv=prox[g-gw]+3;if(x>0&&prox[g-gw-1]+4<vv)vv=prox[g-gw-1]+4;if(x<gw-1&&prox[g-gw+1]+4<vv)vv=prox[g-gw+1]+4;}prox[g]=vv;}
 for(y=gh-1;y>=0;y--)for(x=gw-1;x>=0;x--){g=y*gw+x;vv=prox[g];if(x<gw-1&&prox[g+1]+3<vv)vv=prox[g+1]+3;if(y<gh-1){if(prox[g+gw]+3<vv)vv=prox[g+gw]+3;if(x<gw-1&&prox[g+gw+1]+4<vv)vv=prox[g+gw+1]+4;if(x>0&&prox[g+gw-1]+4<vv)vv=prox[g+gw-1]+4;}prox[g]=vv;}
 var zmin=Infinity,zmax=0;
 for(i=0;i<n;i++)if(id[i]&&!(mats[id[i]]&&(mats[id[i]].ground||mats[id[i]].cutout))){if(depth[i]<zmin)zmin=depth[i];if(depth[i]>zmax)zmax=depth[i];}
 gb._prep={w:w,h:h,edge:edge,kind:kind,dist:dist,light:light,shadow:shadow,region:region,regionZ:regionZ,
  regionArea:regionArea,accentId:accentId,prox:prox,proxCell:8,proxW:gw,area:area,zmin:zmin===Infinity?1:zmin,zmax:zmax||1};
 return gb._prep;
}

/* ------------------------------------------------- camera reconstruction */
function makeCamera(gb){
 var c=gb.camera||{};
 return {pos:c.pos||[0,0,10],right:c.right||[1,0,0],up:c.up||[0,1,0],back:c.back||[0,0,1],
  ortho:!!c.ortho,tanX:c.tanX||.5,tanY:c.tanY||.35,halfW:c.halfW||5,halfH:c.halfH||3.5,offX:c.offX||0,offY:c.offY||0};
}
function rayAt(cam,w,h,fx,fy,out){
 var nx=fx/w*2-1,ny=1-fy/h*2;
 if(cam.ortho){
  var ox=cam.offX+nx*cam.halfW,oy=cam.offY+ny*cam.halfH;
  out.o[0]=cam.pos[0]+cam.right[0]*ox+cam.up[0]*oy;
  out.o[1]=cam.pos[1]+cam.right[1]*ox+cam.up[1]*oy;
  out.o[2]=cam.pos[2]+cam.right[2]*ox+cam.up[2]*oy;
  out.d[0]=-cam.back[0];out.d[1]=-cam.back[1];out.d[2]=-cam.back[2];
 }else{
  var ax=nx*cam.tanX,ay=ny*cam.tanY;
  out.o[0]=cam.pos[0];out.o[1]=cam.pos[1];out.o[2]=cam.pos[2];
  out.d[0]=cam.right[0]*ax+cam.up[0]*ay-cam.back[0];
  out.d[1]=cam.right[1]*ax+cam.up[1]*ay-cam.back[1];
  out.d[2]=cam.right[2]*ax+cam.up[2]*ay-cam.back[2];
 }
 return out;
}
/* view depth zp along -back for a ray hit: point = o + d*t, with d.back=-1 */
function pointAt(cam,w,h,fx,fy,zp,out,ray){
 rayAt(cam,w,h,fx,fy,ray);
 var t=cam.ortho?zp:zp; // d has unit component along -back in both cases
 out[0]=ray.o[0]+ray.d[0]*t;out[1]=ray.o[1]+ray.d[1]*t;out[2]=ray.o[2]+ray.d[2]*t;
 return out;
}
function planeHit(cam,w,h,fx,fy,P,N,out,ray){
 rayAt(cam,w,h,fx,fy,ray);
 var den=ray.d[0]*N[0]+ray.d[1]*N[1]+ray.d[2]*N[2];
 if(Math.abs(den)<1e-7)return false;
 var t=((P[0]-ray.o[0])*N[0]+(P[1]-ray.o[1])*N[1]+(P[2]-ray.o[2])*N[2])/den;
 out[0]=ray.o[0]+ray.d[0]*t;out[1]=ray.o[1]+ray.d[1]*t;out[2]=ray.o[2]+ray.d[2]*t;
 return true;
}

/* ------------------------------------------------------------------ paint */
function paint(gb,input){
 var opt=resolveOptions(input),pre=prepare(gb),w=gb.w,h=gb.h,n=w*h;
 var out=new Uint8ClampedArray(n*4),mats=gb.materials||[],cam=makeCamera(gb);
 var u=Math.max(.35,Math.max(w,h)/1400),seed=opt.seed,style=opt.style;
 var upW=gb.up||[0,0,1],accentId=opt.accentMode==='none'?0:pre.accentId;
 var paper=opt.paper,ink=opt.ink,accent=opt.accent,sky=opt.sky,dens=opt.density;
 var P=[0,0,0],Px=[0,0,0],Py=[0,0,0],ray={o:[0,0,0],d:[0,0,0]},Nv=[0,0,1];
 var col=[0,0,0],pixW=1,hasPlane=false,curved=false,cx=0,cy=0,cutRGB=[0,0,0];
 var fadeStyle=style==='sucio'||style==='estudio'||style==='acuarela'||style==='plumilla'||style==='grabado'||style==='aguada';
 var pixWorld=function(z){return cam.ortho?2*cam.halfH/h:2*cam.tanY*z/h;};
 function inkOver(c,a){if(a<=0)return;a=clamp01(a);col[0]=mix(col[0],c[0],a);col[1]=mix(col[1],c[1],a);col[2]=mix(col[2],c[2],a);}
 function multiply(c,a){a=clamp01(a);col[0]*=mix(1,c[0]/255,a);col[1]*=mix(1,c[1]/255,a);col[2]*=mix(1,c[2]/255,a);}
 /* World-space hatching: lines follow the real faces and converge in perspective. */
 function hatchWorld(D,spacingPx,width,wob){
  if(width<=0)return 0;
  if(curved||!hasPlane){
   var ang=D===B?(vertical?0:Math.PI/2):D===T?(vertical?Math.PI/2:0):D===Dg1?Math.PI/4:-Math.PI/4;
   return hatchScreen(ang,spacingPx,width,wob);
  }
  var Q=norm3(cross(Nv,D));if(!Q)return 0;
  var sW=spacingPx*u*pixW;if(!(sW>0))return 0;
  var ph=dot(P,Q)/sW,gx=(dot(Px,Q)-dot(P,Q))/sW,gy=(dot(Py,Q)-dot(P,Q))/sW;
  var cpp=Math.hypot(gx,gy);if(!(cpp>0))return 0;
  var per=1/cpp;width=clamp01(width);
  if(per<2.8)return width*.92;
  ph+=(vnoise(cx*.035/u,cy*.035/u,seed+31)-.5)*(wob==null?.16:wob);
  var f=ph-Math.floor(ph),d=Math.min(f,1-f)*per,half=Math.max(.32,width*per*.5);
  return clamp01(half+.5-d)*(width<.08?width/.08:1);
 }
 function hatchScreen(angle,spacingPx,width,wob){
  if(width<=0)return 0;
  var per=spacingPx*u,ph=(cx*Math.cos(angle)+cy*Math.sin(angle))/per;
  ph+=(vnoise(cx*.03/u,cy*.03/u,seed+47)-.5)*(wob==null?.22:wob);
  var f=ph-Math.floor(ph),d=Math.min(f,1-f)*per,half=Math.max(.32,clamp01(width)*per*.5);
  return clamp01(half+.5-d)*(width<.08?width/.08:1);
 }
 function halftone(cell,angle,dark){
  if(dark<=0)return 0;
  var c=cell*u,ca=Math.cos(angle),sa=Math.sin(angle);
  var xr=(cx*ca+cy*sa)/c,yr=(-cx*sa+cy*ca)/c;
  var fu=xr-Math.floor(xr)-.5,fv=yr-Math.floor(yr)-.5,dd=Math.hypot(fu,fv)*c;
  var r=c*Math.sqrt(clamp01(dark)/Math.PI)*1.06;
  return clamp01(r+.5-dd);
 }
 function stipple(cell,dark){
  if(dark<=0)return 0;
  var s=cell*u,gx=Math.floor(cx/s),gy=Math.floor(cy/s),best=0;
  for(var oy=-1;oy<=1;oy++)for(var ox=-1;ox<=1;ox++){
   var qx=gx+ox,qy=gy+oy;
   if(hash(qx,qy,seed+5)>dark*1.25)continue;
   var px=(qx+.15+.7*hash(qx,qy,seed+9))*s,py=(qy+.15+.7*hash(qx,qy,seed+13))*s;
   var r=(.55+.5*hash(qx,qy,seed+21))*u,dd=Math.hypot(cx-px,cy-py);
   best=Math.max(best,clamp01(r+.5-dd));
  }
  return best;
 }
 /* plane directions: T horizontal along the face, B second in-plane axis */
 var T=[1,0,0],B=[0,0,1],Dg1=[0,0,0],Dg2=[0,0,0],vertical=true;
 function frame(){
  var ndu=dot(Nv,upW);vertical=Math.abs(ndu)<.6;
  if(vertical){
   var t=norm3(cross(upW,Nv))||[1,0,0];T=t;B=norm3(cross(Nv,T))||upW;
  }else{
   var r=cam.right,k=dot(r,Nv),t2=norm3([r[0]-Nv[0]*k,r[1]-Nv[1]*k,r[2]-Nv[2]*k])||[1,0,0];
   T=t2;B=norm3(cross(Nv,T))||[0,1,0];
  }
  Dg1=norm3([T[0]+B[0],T[1]+B[1],T[2]+B[2]])||T;
  Dg2=norm3([T[0]-B[0],T[1]-B[1],T[2]-B[2]])||B;
 }
 var cool=[.74,.79,.9],lineInk=ink;

 for(var y=0;y<h;y++)for(var x=0;x<w;x++){
  var i=y*w+x,k=i*4,idv=gb.id[i],mat=mats[idv]||null,bg=!idv;
  cx=x+.5;cy=y+.5;
  var L=pre.light[i],S=(mats[idv]&&mats[idv].cutout)?0:pre.shadow[i]*opt.shadow,glass=!!(mat&&mat.glass),ground=!!(mat&&mat.ground);
  var cut=!!(mat&&mat.cutout&&gb.cut),alb=mat?mat.rgb:sky;
  if(cut){cutRGB[0]=gb.cut[i*3];cutRGB[1]=gb.cut[i*3+1];cutRGB[2]=gb.cut[i*3+2];alb=cutRGB;L=1;}
  var albL=mat?lum(alb):1;
  hasPlane=false;curved=false;
  if(!bg){
   Nv[0]=gb.normal[i*3]/127;Nv[1]=gb.normal[i*3+1]/127;Nv[2]=gb.normal[i*3+2]/127;
   var nn=Math.hypot(Nv[0],Nv[1],Nv[2])||1;Nv[0]/=nn;Nv[1]/=nn;Nv[2]/=nn;
   pointAt(cam,w,h,cx,cy,gb.depth[i],P,ray);
   hasPlane=planeHit(cam,w,h,cx+1,cy,P,Nv,Px,ray)&&planeHit(cam,w,h,cx,cy+1,P,Nv,Py,ray);
   var reg=pre.region[i];pixW=pixWorld(reg>=0?pre.regionZ[reg]:gb.depth[i]);
   curved=!ground&&!cut&&reg>=0&&pre.regionArea[reg]<n*.0006;
   frame();
  }
  var tone=bg?1:cut?clamp01(albL*(.55+.45*L)):clamp01((.08+.92*L)*(.74+.26*albL));
  if(glass)tone=clamp01(.3+.35*smooth(.35,.65,fbm((cx-cy*.55)/(70*u),0,seed+3,2))*(.6+.4*L));
  col[0]=paper[0];col[1]=paper[1];col[2]=paper[2];
  var glint=glass?smooth(.82,.9,vnoise((cx+cy*.9)/(26*u),0,seed+61)):0;

  if(cut&&(style==='estudio'||style==='plumilla'||style==='grabado')){
   var inkCol=style==='grabado'?lineInk:lineInk,dk=clamp01((.5-albL)/.28);
   if(style==='estudio')inkOver(saturate(alb,.55),opt.color*.45);
   var hz=hatchScreen(-.8,style==='grabado'?3:3.4,clamp01((.82-tone)/.5)*.5,.15);
   inkOver(inkCol,Math.max(dk*.9,hz*(style==='estudio'?.7:.85)));
  }else if(style==='estudio'){
   if(bg){
    var wash=clamp01((1-cy/(h*.62))*.55+(fbm(cx/(90*u),cy/(40*u),seed+2,3)-.5)*.5);
    inkOver(sky,wash*.45*opt.color/.38);
    inkOver(sky,hatchScreen(-.12,7,.25,.5)*wash*.35);
   }else{
    var tint=saturate(alb,.55);
    if(!ground)inkOver(tint,opt.color*.5);else inkOver(tint,opt.color*.22);
    var t2=ground?tone+.18:tone,g=.55+.45*hash(x,y,seed+77);
    var a=hatchScreen(-.78,4.6,(.8-t2)/.45*.55*(.6+dens*.8))*g;
    a=Math.max(a,hatchScreen(-.55,4.2,(.52-t2)/.35*.5*(.6+dens*.8))*g);
    a=Math.max(a,hatchScreen(.78,3.8,(.3-t2)/.3*.55*(.6+dens*.8))*g);
    if(S>.28)a=Math.max(a,hatchWorld(ground?B:Dg1,3.4,(.25+.35*S)*(.6+dens*.8),.1)*g);
    if(glass)a=Math.max(a,hatchWorld(B,3,.45*(1-glint),.05)*g);
    inkOver(lineInk,a*.8);
   }
  }else if(style==='acuarela'){
   if(bg){
    var sw=clamp01(1-cy/(h*.58)+(fbm(cx/(120*u),cy/(55*u),seed+4,4)-.5)*.55);
    var gran=1-(hash(x,y,seed+8)-.5)*.16*opt.grain;
    inkOver([sky[0]*gran,sky[1]*gran,sky[2]*gran],sw*.62*opt.color/.72);
   }else{
    var hue=(hash(pre.region[i],3,seed)-.5)*.07,base=saturate(alb,ground?.7:1.05);
    var wc=[clamp255(base[0]*(1+hue)),base[1],clamp255(base[2]*(1-hue))];
    var amt=(ground?.3:cut?.85:.66)*opt.color/.72;
    var bloom=fbm(cx/(60*u),cy/(60*u),seed+12,3);
    var rnz=fbm(cx/(24*u),cy/(24*u),seed+13,2),reserve=!glass&&!cut&&!ground&&vertical&&L>.9&&rnz>.7?.35*smooth(.7,.78,rnz):0;
    inkOver(wc,amt*(1-reserve));
    var m=.5+.5*L;multiply([255*m,255*m,255*m*1.04],.85);
    var de=pre.dist[i]/3;
    if(de<3*u)multiply([228,224,232],(1-de/(3*u))*.65);
    multiply([255*(1-(hash(x,y,seed+19)-.5)*.2*opt.grain*(1.2-L)),255,255],1);
    col[0]*=1+(bloom-.5)*.08;col[1]*=1+(bloom-.5)*.07;col[2]*=1+(bloom-.5)*.05;
    var sg=smooth(.25,.45,S+(fbm(cx/(30*u),cy/(30*u),seed+41,2)-.5)*.28);
    multiply([150,140,196],sg*.62);
    if(glass){inkOver([92,124,150],.55);inkOver(paper,glint*.8);}
   }
  }else if(style==='plumilla'){
   if(!bg){
    var d=.6+dens*.8,a2=0;
    if(ground){
     a2=stipple(3.2,clamp01((.74-tone)/.45)*.6*d);
     if(S>.25)a2=Math.max(a2,hatchWorld(Dg1,3.2,(.3+.45*S)*d,.08));
    }else{
     a2=hatchWorld(T,4.2,clamp01((.88-tone)/.3)*.34*d,.12);
     a2=Math.max(a2,hatchWorld(B,4.2,clamp01((.64-tone)/.25)*.42*d,.12));
     a2=Math.max(a2,hatchWorld(Dg1,3.9,clamp01((.42-tone)/.2)*.45*d,.1));
     a2=Math.max(a2,hatchWorld(Dg2,3.7,clamp01((.22-tone)/.15)*.5*d,.1));
     if(S>.25)a2=Math.max(a2,hatchWorld(Dg2,3.1,(.25+.45*S)*d,.08));
    }
    if(glass)a2=Math.max(a2*(1-glint),hatchWorld(B,2.6,.62*(1-glint),.03));
    inkOver(lineInk,a2);
   }
  }else if(style==='grabado'){
   var d3=.6+dens*.8;
   if(bg){
    var wsky=(.1+.22*clamp01(1-cy/h))*d3+(vnoise(cx/(160*u),cy/(18*u),seed+5)-.5)*.08;
    inkOver(lineInk,hatchScreen(Math.PI/2,3.4,wsky,.12)*.9);
   }else{
    var isAccent=accentId&&idv===accentId,base3=isAccent?accent:lineInk;
    if(isAccent)inkOver(accent,.88);
    var dir=ground?B:(vertical?B:T),wd=(.1+.72*(1-tone))*d3;
    var a3=hatchWorld(dir,3.4,wd,.06);
    if(tone<.38)a3=Math.max(a3,hatchWorld(vertical?T:Dg1,3.4,(.38-tone)/.38*.5*d3,.06));
    if(S>.25&&!isAccent)a3=Math.max(a3,hatchWorld(Dg2,3.2,(.2+.4*S)*d3,.05));
    if(glass)a3=Math.max(a3*(1-glint),hatchWorld(B,2.6,.55*(1-glint),.03));
    if(isAccent)inkOver([accent[0]*.62,accent[1]*.6,accent[2]*.62],a3*.9);
    else inkOver(base3,a3);
   }
  }else if(style==='bicromia'){
   var teal=accent,key=lineInk;
   if(bg){
    col[0]=sky[0];col[1]=sky[1];col[2]=sky[2];
    inkOver(key,halftone(4.4,.785,.06+.1*clamp01(1-cy/h)));
   }else{
    var lit=tone>.58&&S<.35;
    if(!lit)inkOver(teal,1);
    else{
     inkOver(saturate(alb,.4),opt.color*.6);
     inkOver(teal,halftone(4.2,.26,clamp01((.7-tone)/.12)*.55));
    }
    var dark=clamp01((.42-tone)/.38)*.82+(S>.35?S*.18:0);
    inkOver(key,halftone(4.2,.785,dark*(.6+dens*.8)));
    if(glass){inkOver(key,halftone(3.6,.785,.5*(1-glint)));inkOver(paper,glint*.9);}
   }
  }else if(style==='aguada'){
   var grays=[[220,220,217],[171,171,167],[108,109,108],[63,64,65]];
   if(!bg){
    var tn=tone+(fbm(cx/(55*u),cy/(55*u),seed+14,3)-.5)*.12;
    var lvl=tn<.2?3:tn<.42?2:tn<.66?1:0;
    if(ground&&lvl>1&&S<.3)lvl=1;
    if(S>.35&&lvl<2)lvl=2;
    if(glass)lvl=3;
    if(lvl){
     var gap=(1.6+2.6*vnoise(cx/(20*u),cy/(20*u),seed+23))*u;
     if(lvl===1&&pre.dist[i]/3<gap)lvl=0;
    }
    if(lvl){
     var dry=vnoise(cx/(2.4*u),cy/(60*u),seed+29),c4=grays[lvl-1];
     var am=.92-(dry>.74?(dry-.74)*2.2:0)+(hash(x,y,seed)-.5)*.05;
     inkOver(c4,am);
     if(glass)inkOver(paper,glint);
    }
   }
  }else if(style==='lineaclara'){
   if(bg){col[0]=sky[0];col[1]=sky[1];col[2]=sky[2];}
   else{
    var lc=saturate(alb,1.12),lv=lum(lc);
    if(lv<.3){var lift=(.3-lv)*255*.6;lc=[clamp255(lc[0]+lift),clamp255(lc[1]+lift),clamp255(lc[2]+lift)];}
    col[0]=mix(paper[0],lc[0],opt.color);col[1]=mix(paper[1],lc[1],opt.color);col[2]=mix(paper[2],lc[2],opt.color);
    var shadeL=L<.5||S>.35;
    if(shadeL)multiply([cool[0]*255,cool[1]*255,cool[2]*255],1);
    if(L<.2)multiply([200,205,220],.8);
    if(glass){col[0]=110;col[1]=154;col[2]=166;inkOver(paper,glint*.95);}
   }
  }else if(style==='sucio'){
   /* loose layered washes: warm ground, sky band, colour patches that do not
      respect the edges, cool shadow glaze and dry pigment granulation */
   var gr=hash(x,y,seed+19),blot=fbm(cx/(40*u),cy/(40*u),seed+12,4),drift=fbm(cx/(110*u),cy/(70*u),seed+33,3);
   if(bg){
    var band=clamp01(1-cy/(h*.5)+(drift-.5)*.9),streak=vnoise(cx/(160*u),cy/(6*u),seed+3);
    inkOver(sky,band*(.35+.4*streak)*opt.color);
   }else{
    var wc2=ground?[214,190,150]:saturate(alb,1.3);
    if(cut)wc2=saturate(alb,1.15);
    var cover=ground?.32*(1-smooth(.35,.7,drift)):.62;
    if(!cut&&!glass&&blot>.62&&L>.7)cover*=.25;
    inkOver(wc2,cover*opt.color*(.75+.5*blot));
    var steps=L>.72?1:L>.42?.8:.62;
    multiply([255*steps,255*steps,255*steps*1.05],.95);
    var sg2=smooth(.22,.4,S+(blot-.5)*.3);
    multiply([132,124,178],sg2*.7);
    multiply([255*(1-(gr-.5)*.32*opt.grain*(1.15-L)),255*(1-(gr-.5)*.28*opt.grain*(1.15-L)),255],1);
    var de2=pre.dist[i]/3;if(de2<4*u)multiply([215,205,200],(1-de2/(4*u))*.5*blot);
    if(glass){inkOver([70,104,134],.6);inkOver(paper,glint*.85);}
   }
  }else if(style==='riso'){
   if(bg){
    var gy=clamp01(cy/h);col[0]=mix(sky[0],paper[0],gy*.8);col[1]=mix(sky[1],paper[1],gy*.8);col[2]=mix(sky[2],paper[2],gy*.8);
   }else{
    var rc=saturate(alb,1.45),f=.58+.42*L;
    var bayer=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
    var bx=Math.floor(cx/(1.6*u))&3,by=Math.floor(cy/(1.6*u))&3,th=(bayer[by*4+bx]+.5)/16;
    var q=Math.floor(f*5+th)/5;
    col[0]=mix(paper[0],rc[0],opt.color)*q;col[1]=mix(paper[1],rc[1],opt.color)*q;col[2]=mix(paper[2],rc[2],opt.color)*q;
    if(S>.3)multiply([150,162,196],clamp01((S-.3)*2.4)*.9);
    if(glass){col[0]=34;col[1]=52;col[2]=64;inkOver([120,150,160],glint*.8);}
   }
  }
  if(ground&&fadeStyle){
   var pd=pre.prox[Math.floor(y/pre.proxCell)*pre.proxW+Math.floor(x/pre.proxCell)]/3*pre.proxCell,span=Math.max(w,h);
   var fz=1-smooth(span*.03,span*.15,pd+(fbm(cx/(70*u),cy/(40*u),seed+71,3)-.5)*span*.12);
   col[0]=mix(paper[0],col[0],fz);col[1]=mix(paper[1],col[1],fz);col[2]=mix(paper[2],col[2],fz);
  }
  out[k]=clamp255(col[0]);out[k+1]=clamp255(col[1]);out[k+2]=clamp255(col[2]);out[k+3]=255;
 }
 /* raster model edges: exact silhouettes, creases and material changes */
 var line=opt.line,rA=line.raster;
 if(rA>0){
  var kw=[0,.45,.8,1,.28],rad=Math.max(.5,line.width*u*.5),pr=Math.max(.5,line.width*line.profile*u*.5);
  var lc2=lineInk;
  for(var p=0;p<n;p++){
   var kd=pre.kind[p];if(!kd)continue;
   if(kd===4&&style!=='plumilla'&&style!=='grabado'&&style!=='lineaclara')continue;
   var alpha=rA*kw[kd]*Math.min(1,pre.edge[p]/170);
   var depthFade=1-line.depthCue*clamp01((gb.depth[p]-pre.zmin)/Math.max(1e-6,pre.zmax-pre.zmin));
   alpha*=depthFade;
   var rr=kd===3?pr:rad,px2=p%w,py2=(p/w)|0,R=Math.ceil(rr);
   for(var oy=-R;oy<=R;oy++)for(var ox=-R;ox<=R;ox++){
    var qx=px2+ox,qy=py2+oy;if(qx<0||qy<0||qx>=w||qy>=h)continue;
    var cov=clamp01(rr+.5-Math.hypot(ox,oy));if(cov<=0)continue;
    var kk=(qy*w+qx)*4,aa=alpha*cov;
    if(line.blend==='multiply'){
     out[kk]=out[kk]*mix(1,lc2[0]/255,aa);out[kk+1]=out[kk+1]*mix(1,lc2[1]/255,aa);out[kk+2]=out[kk+2]*mix(1,lc2[2]/255,aa);
    }else{
     out[kk]=mix(out[kk],lc2[0],aa);out[kk+1]=mix(out[kk+1],lc2[1],aa);out[kk+2]=mix(out[kk+2],lc2[2],aa);
    }
   }
  }
 }
 return out;
}

/* ------------------------------------------------------- vector strokes */
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function strokePlan(gb,input,W,H){
 var opt=resolveOptions(input),line=opt.line,u=Math.max(.35,Math.max(W,H)/1400),plan=[];
 if(!line.vector||!gb.segments)return plan;
 var rnd=mulberry(opt.seed*7919+13);
 gb.segments.forEach(function(seg,si){
  var x1=seg.a[0]*W,y1=seg.a[1]*H,x2=seg.b[0]*W,y2=seg.b[1]*H,dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy);
  if(len<1.5*u)return;
  var ux=dx/len,uy=dy/len,dc=1-line.depthCue*clamp01(seg.d||0);
  var lw=line.width*u*(seg.profile?line.profile:1)*(.7+.3*dc),alpha=line.alpha*dc;
  (seg.runs||[[0,1]]).forEach(function(run){
   var pieces=[[run[0],run[1]]];
   if(line.gaps>0&&(run[1]-run[0])*len>40*u){
    var out=[],from=run[0];
    while(from<run[1]){
     var step=(30+rnd()*90)*u/len,to=Math.min(run[1],from+step);
     out.push([from,to]);
     from=to+(rnd()<line.gaps*3?(3+rnd()*7)*u/len:0);
    }
    pieces=out;
   }
   pieces.forEach(function(pc){
    var startExt=pc[0]===0?line.extension*u*(.55+.9*rnd()):0;
    var endExt=pc[1]===1?line.extension*u*(.55+.9*rnd()):0;
    for(var pass=0;pass<Math.max(1,line.passes|0);pass++){
     var off=pass?(rnd()-.5)*Math.max(.6,line.jitter)*u*1.6:0,bow=(rnd()-.5)*2*line.bow*u;
     var segLen=(pc[1]-pc[0])*len+startExt+endExt,steps=Math.max(2,Math.min(60,Math.ceil(segLen/(10*u)))),pts=[];
     var phase=rnd()*100;
     for(var s=0;s<=steps;s++){
      var t=s/steps,along=-startExt+t*segLen,base=pc[0]*len+along;
      var wob=(Math.sin(phase+along/(14*u))*.6+Math.sin(phase*1.7+along/(5.3*u))*.4)*line.jitter*u*.55;
      var shift=off+wob*Math.sin(Math.PI*Math.min(1,t*1.15))+bow*Math.sin(Math.PI*t);
      var px=x1+ux*base-uy*shift,py=y1+uy*base+ux*shift;
      if(opt.warp>0){px+=(fbm(px/(55*u),py/(55*u),opt.seed+201,3)-.5)*2*opt.warp*9*u*.35;py+=(fbm(px/(55*u)+19.3,py/(55*u)-7.1,opt.seed+203,3)-.5)*1.4*opt.warp*9*u*.35;}
      pts.push([px,py]);
     }
     plan.push({points:pts,width:lw*(pass?.7:1),alpha:alpha*(pass?.42:1),profile:!!seg.profile,index:si});
    }
   });
  });
 });
 return plan;
}
function drawStrokes(ctx,gb,input,W,H){
 var opt=resolveOptions(input),plan=strokePlan(gb,input,W,H);
 if(!plan.length)return 0;
 ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
 ctx.globalCompositeOperation=opt.line.blend==='multiply'?'multiply':'source-over';
 ctx.strokeStyle='rgb('+opt.ink.join(',')+')';
 plan.forEach(function(s){
  ctx.globalAlpha=Math.max(0,Math.min(1,s.alpha));ctx.lineWidth=s.width;
  ctx.beginPath();ctx.moveTo(s.points[0][0],s.points[0][1]);
  for(var j=1;j<s.points.length;j++)ctx.lineTo(s.points[j][0],s.points[j][1]);
  ctx.stroke();
 });
 ctx.restore();
 return plan.length;
}

/* ------------------------------------------------------------- finishing */
function finish(data,w,h,input){
 var opt=resolveOptions(input),u=Math.max(.35,Math.max(w,h)/1400),g=opt.grain,seed=opt.seed,style=opt.style,paper=opt.paper;
 var shift=(style==='riso'||style==='bicromia')?Math.max(1,Math.round(1.2*u)):0,src=shift?new Uint8ClampedArray(data):null;
 for(var y=0;y<h;y++)for(var x=0;x<w;x++){
  var i=(y*w+x)*4;
  if(shift){var sx=Math.min(w-1,x+shift),sy=Math.min(h-1,y+(style==='riso'?shift:0));data[i]=src[(sy*w+sx)*4];}
  var fiber=fbm(x/(3.2*u),y/(9*u),seed+101,2)-.5,tooth=hash(x,y,seed+103)-.5;
  var f=1+(fiber*.09+tooth*(style==='riso'||style==='bicromia'?.16:.06))*g;
  data[i]=clamp255(data[i]*f);data[i+1]=clamp255(data[i+1]*f);data[i+2]=clamp255(data[i+2]*f);
 }
 if(opt.border){
  var m=Math.round(Math.min(w,h)*.035);
  for(y=0;y<h;y++)for(x=0;x<w;x++){
   if(x>=m&&y>=m&&x<w-m&&y<h-m)continue;
   i=(y*w+x)*4;var e=1+(hash(x,y,seed+111)-.5)*.04*g;
   data[i]=clamp255(paper[0]*e);data[i+1]=clamp255(paper[1]*e);data[i+2]=clamp255(paper[2]*e);
  }
 }
 return data;
}

/* --------------------------------------------------------- orchestration */
/* Image deformer: displaces the painted layer through a smooth noise field,
   so washes slide off the geometry like a loose hand-made drawing. */
function warp(data,w,h,input){
 var opt=resolveOptions(input),amt=opt.warp;
 if(amt<=0)return data;
 var u=Math.max(.35,Math.max(w,h)/1400),amp=amt*9*u,src=new Uint8ClampedArray(data),seed=opt.seed;
 for(var y=0;y<h;y++)for(var x=0;x<w;x++){
  var dx=(fbm(x/(55*u),y/(55*u),seed+201,3)-.5)*2*amp,dy=(fbm(x/(55*u)+19.3,y/(55*u)-7.1,seed+203,3)-.5)*2*amp*.7;
  var sx=Math.max(0,Math.min(w-1,Math.round(x+dx))),sy=Math.max(0,Math.min(h-1,Math.round(y+dy)));
  var i=(y*w+x)*4,j=(sy*w+sx)*4;
  data[i]=src[j];data[i+1]=src[j+1];data[i+2]=src[j+2];
 }
 return data;
}
/* Dirt layer: smudges, graphite rubbing, a tea stain and ink splatter. */
function dirt(data,w,h,input){
 var opt=resolveOptions(input),amt=opt.dirt;if(amt<=0)return data;
 var u=Math.max(.35,Math.max(w,h)/1400),seed=opt.seed,ink=opt.ink,R=mulberry(seed*31+7);
 var stains=[];for(var s=0;s<1+Math.round(amt*2);s++)stains.push([R()*w,R()*h,(35+R()*55)*u]);
 var spl=[];for(s=0;s<Math.round(amt*70);s++){var cx0=w*(.15+.7*R()),cy0=h*(.2+.6*R());spl.push([cx0,cy0,(.6+R()*R()*3.2)*u]);}
 for(var y=0;y<h;y++)for(var x=0;x<w;x++){
  var i=(y*w+x)*4,f=1;
  var smudge=fbm(x/(130*u),y/(90*u),seed+301,4);
  f*=1-amt*.12*smooth(.55,.85,smudge);
  var rub=vnoise((x+y*.8)/(3*u),(y-x*.3)/(140*u),seed+311);
  f*=1-amt*.06*smooth(.7,.95,rub)*smooth(.4,.7,smudge);
  for(var k=0;k<stains.length;k++){var st=stains[k],d=Math.hypot(x-st[0],y-st[1])/st[2];
   if(d<1.15){var ring=Math.exp(-Math.pow((d-1)/.04,2))*.1+(d<1?.02:0);f*=1-amt*ring*(.6+.4*vnoise(x/(9*u),y/(9*u),seed+k));}}
  data[i]*=f;data[i+1]*=f*.985;data[i+2]*=f*.95;
 }
 spl.forEach(function(p){
  var r=Math.ceil(p[2]+1);
  for(var oy=-r;oy<=r;oy++)for(var ox=-r;ox<=r;ox++){
   var x=Math.round(p[0])+ox,y=Math.round(p[1])+oy;if(x<0||y<0||x>=w||y>=h)continue;
   var a=clamp01(p[2]+.5-Math.hypot(ox,oy))*.75*amt,i=(y*w+x)*4;
   data[i]=mix(data[i],ink[0],a);data[i+1]=mix(data[i+1],ink[1],a);data[i+2]=mix(data[i+2],ink[2],a);
  }
 });
 return data;
}
function render(ctx,gb,input){
 var w=gb.w,h=gb.h,img=ctx.createImageData(w,h);
 img.data.set(warp(paint(gb,input),w,h,input));ctx.putImageData(img,0,0);
 var strokes=drawStrokes(ctx,gb,input,w,h);
 var done=ctx.getImageData(0,0,w,h);finish(done.data,w,h,input);dirt(done.data,w,h,input);ctx.putImageData(done,0,0);
 return {strokes:strokes,accentId:prepare(gb).accentId};
}

/* Nearest-neighbour resample for fast previews; segments are resolution-free. */
function resample(gb,W,H){
 if(W===gb.w&&H===gb.h)return gb;
 var n=W*H,o={w:W,h:H,id:new Uint16Array(n),depth:new Float32Array(n),normal:new Int8Array(n*3),
  light:new Uint8Array(n),lightFree:gb.lightFree?new Uint8Array(n):null,
  materials:gb.materials,camera:gb.camera,up:gb.up,segments:gb.segments,cut:gb.cut?new Uint8Array(n*3):null};
 for(var y=0;y<H;y++){
  var sy=Math.min(gb.h-1,Math.floor((y+.5)*gb.h/H));
  for(var x=0;x<W;x++){
   var sx=Math.min(gb.w-1,Math.floor((x+.5)*gb.w/W)),s=sy*gb.w+sx,d=y*W+x;
   o.id[d]=gb.id[s];o.depth[d]=gb.depth[s];o.light[d]=gb.light[s];
   if(o.lightFree)o.lightFree[d]=gb.lightFree[s];
   if(o.cut){o.cut[d*3]=gb.cut[s*3];o.cut[d*3+1]=gb.cut[s*3+1];o.cut[d*3+2]=gb.cut[s*3+2];}
   o.normal[d*3]=gb.normal[s*3];o.normal[d*3+1]=gb.normal[s*3+1];o.normal[d*3+2]=gb.normal[s*3+2];
  }
 }
 return o;
}

var api={version:'1.0.0',STYLES:STYLES,DEFAULTS:DEFAULTS,resolveOptions:resolveOptions,prepare:prepare,
 paint:paint,warp:warp,dirt:dirt,strokePlan:strokePlan,drawStrokes:drawStrokes,finish:finish,render:render,resample:resample};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(global)global.BlacklineCroquisStudio=Object.freeze(api);
})(typeof window!=='undefined'?window:(typeof globalThis!=='undefined'?globalThis:this));
