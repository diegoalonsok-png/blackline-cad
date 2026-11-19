/* CAD2D · Generadores arquitectónicos paramétricos 2D (planta).
 * Geometría original de Blackline CAD / CAD2D: no contiene bloques, código ni dibujos de Autodesk.
 * Todas las medidas están en METROS; el módulo de inserción las convierte a la unidad del modelo.
 * Cada generador recibe (b, W, D) y dibuja dentro del rectángulo 0..W × 0..D.
 * Convención: muro "N" es y=D (fondo), "S" es y=0 (acceso), "W" x=0, "E" x=W.
 * Funciona en navegador (window.CAD2D_ARQ_LIBRARY) y en Node (module.exports) para pruebas.
 */
(function(root){
'use strict';
const DEG=Math.PI/180;

/* ---------- Constructor de geometría con pila de transformaciones ---------- */
function Builder(){
 this.out=[];this.stack=[{x:0,y:0,a:0}];
}
Builder.prototype.t=function(){return this.stack[this.stack.length-1]};
Builder.prototype.tp=function(x,y){
 const t=this.t(),c=Math.cos(t.a*DEG),s=Math.sin(t.a*DEG);
 return {x:t.x+x*c-y*s,y:t.y+x*s+y*c};
};
Builder.prototype.at=function(x,y,a,fn){
 const p=this.tp(x,y),t=this.t();
 this.stack.push({x:p.x,y:p.y,a:t.a+(a||0)});
 try{fn(this)}finally{this.stack.pop()}
 return this;
};
Builder.prototype.push=function(e,style){
 if(style&&style.dashed)e.linetype='DASHED';
 if(style&&style.width)e.width=style.width;
 this.out.push(e);return this;
};
Builder.prototype.line=function(x1,y1,x2,y2,st){return this.push({type:'line',a:this.tp(x1,y1),b:this.tp(x2,y2)},st)};
Builder.prototype.poly=function(pts,closed,st){return this.push({type:'polyline',pts:pts.map(p=>this.tp(p[0],p[1])),closed:!!closed},st)};
Builder.prototype.rect=function(x,y,w,h,st){
 if(!(w>0&&h>0))return this;
 const a=((this.t().a%360)+360)%360;
 if(a===0){const p=this.tp(x,y),q=this.tp(x+w,y+h);return this.push({type:'rect',a:{x:Math.min(p.x,q.x),y:Math.min(p.y,q.y)},b:{x:Math.max(p.x,q.x),y:Math.max(p.y,q.y)}},st)}
 return this.poly([[x,y],[x+w,y],[x+w,y+h],[x,y+h]],true,st);
};
Builder.prototype.circle=function(cx,cy,r,st){return r>0?this.push({type:'circle',c:this.tp(cx,cy),r},st):this};
Builder.prototype.arc=function(cx,cy,r,a0,a1,st){
 if(!(r>0))return this;const t=this.t().a;
 return this.push({type:'arc',c:this.tp(cx,cy),r,a0:(a0+t)*DEG,a1:(a1+t)*DEG},st);
};
Builder.prototype.ellipse=function(cx,cy,rx,ry,st){
 if(!(rx>0&&ry>0))return this;
 return this.push({type:'ellipse',c:this.tp(cx,cy),rx,ry,rotation:this.t().a*DEG},st);
};
Builder.prototype.text=function(x,y,text,h){
 // Texto siempre legible: si el bloque queda girado entre 90° y 270°, se gira 180° sobre su propio recuadro.
 h=h||.08;const len=String(text).length*h*.62;let r=((this.t().a%360)+360)%360;
 if(r>90&&r<=270)return this.push({type:'text',p:this.tp(x+len,y+h),text:String(text),h,fontFamily:'Arial',rotation:r-180});
 return this.push({type:'text',p:this.tp(x,y),text:String(text),h,fontFamily:'Arial',rotation:r});
};
/* Rectángulo de esquinas redondeadas como polilínea (bañeras, bachas). */
Builder.prototype.rrect=function(x,y,w,h,r,st,seg=5){
 r=Math.max(0,Math.min(r,w/2,h/2));if(!r)return this.rect(x,y,w,h,st);
 const pts=[],corner=(cx,cy,start)=>{for(let i=0;i<=seg;i++){const a=(start+90*i/seg)*DEG;pts.push([cx+r*Math.cos(a),cy+r*Math.sin(a)])}};
 corner(x+w-r,y+r,-90);corner(x+w-r,y+h-r,0);corner(x+r,y+h-r,90);corner(x+r,y+r,180);
 return this.poly(pts,true,st);
};

/* ---------- Artefactos (ancho u a lo largo del muro, profundidad v desde el muro) ---------- */
// Todos se dibujan con el muro en v=0 y el frente hacia +v.
const F={
 wc(b){ // inodoro con mochila 0.40 × 0.70
  b.rrect(.03,0,.34,.17,.03);b.ellipse(.20,.45,.18,.25);b.ellipse(.20,.47,.12,.18);b.line(.08,.20,.32,.20);
 },
 wcSuspendido(b){b.rect(.05,0,.30,.08);b.ellipse(.19,.37,.17,.22);b.ellipse(.19,.39,.11,.15)},
 bidet(b){b.rect(.05,0,.28,.06);b.ellipse(.19,.33,.17,.25);b.ellipse(.19,.34,.11,.17);b.circle(.19,.13,.02);b.circle(.19,.46,.018)},
 lavatorio(b,w=.60,d=.48){ // vanitory con bacha oval
  b.rect(0,0,w,d);b.ellipse(w/2,d*.55,Math.min(.21,w*.36),Math.min(.15,d*.32));b.circle(w/2,d*.55,.02);b.circle(w/2,.07,.022);b.line(w/2,.07,w/2,.13);
 },
 lavatorioDoble(b,w=1.40,d=.50){
  b.rect(0,0,w,d);for(const k of [.27,.73]){const cx=w*k;b.ellipse(cx,d*.55,.20,.14);b.circle(cx,d*.55,.02);b.circle(cx,.07,.022);b.line(cx,.07,cx,.13)}
 },
 lavatorioPie(b){b.rect(.20,0,.15,.06);b.ellipse(.275,.25,.26,.20);b.ellipse(.275,.26,.19,.13);b.circle(.275,.26,.02);b.circle(.275,.08,.02)},
 lavatorioChico(b){b.rect(0,0,.42,.32);b.ellipse(.21,.18,.14,.10);b.circle(.21,.18,.018);b.circle(.21,.05,.018)},
 lavatorioAccesible(b){b.rrect(0,0,.60,.50,.08);b.ellipse(.30,.27,.21,.15);b.circle(.30,.27,.02);b.circle(.30,.06,.022);b.rect(-.08,.05,.03,.40);b.rect(.65,.05,.03,.40)},
 ducha(b,w=.90,d=.90,screen=true){ // plato de ducha con desagüe y diagonales convencionales
  b.rect(0,0,w,d);b.rect(.04,.04,w-.08,d-.08);b.line(.04,.04,w-.04,d-.04,{dashed:true});b.line(.04,d-.04,w-.04,.04,{dashed:true});
  b.circle(w/2,d/2,.045);b.circle(w*.2,.07,.03);
  if(screen)b.line(0,d+.01,w,d+.01,{width:.18});
 },
 duchaPiso(b,w=1.00,d=1.00){b.rect(0,0,w,d,{dashed:true});b.rect(w/2-.35,d/2-.03,.70,.06);b.rect(w-.45,.05,.40,.35);b.circle(w*.2,.07,.03)},
 banera(b,w=1.70,d=.75){
  b.rect(0,0,w,d);b.rrect(.08,.08,w-.16,d-.16,.18);b.circle(w-.22,d/2,.035);b.circle(w-.06,d/2,.025);b.line(w-.06,d/2-.08,w-.06,d/2+.08);
 },
 baneraEsquinera(b,s=1.40){
  // contorno: dos lados contra muros y frente curvo
  const out=[[0,0],[s,0],[s,.45]];for(let i=0;i<=12;i++){const a=(0+90*i/12)*DEG;out.push([.45+(s-.45)*Math.cos(a),.45+(s-.45)*Math.sin(a)])}out.push([.45,s],[0,s]);
  b.poly(out.map(p=>[p[0],p[1]]),true);
  const inner=[];for(let i=0;i<=12;i++){const a=(0+90*i/12)*DEG;inner.push([.32+(s-.48)*Math.cos(a),.32+(s-.48)*Math.sin(a)])}inner.push([.32,.32]);
  b.poly(inner,true);b.circle(.45,.45,.035);
 },
 mingitorio(b){b.rect(0,0,.36,.07);b.arc(.18,.07,.18,0,180);b.arc(.18,.07,.12,0,180);b.line(0,.07,.36,.07);b.circle(.18,.13,.018)},
 // nota: arco dibujado hacia +v porque el builder usa ángulos antihorarios
 barra(b,l=.80){b.rect(0,0,l,.035)},
 bacha(b,w=.80,d=.60){ // bacha de cocina simple con escurridor
  b.rect(0,0,w,d);b.rrect(.06,.10,w*.55,d-.18,.04);b.circle(.06+w*.275,.10+(d-.18)/2,.03);
  for(let i=0;i<5;i++){const x=.12+w*.55+i*(w*.38-.06)/5;b.line(x,.14,x,d-.12)}b.circle(w*.3,.05,.025);
 },
 bachaDoble(b,w=1.20,d=.60){
  b.rect(0,0,w,d);const bw=(w*.62-.10)/2;
  for(let k=0;k<2;k++){const x=.06+k*(bw+.04);b.rrect(x,.10,bw,d-.18,.04);b.circle(x+bw/2,.10+(d-.18)/2,.03)}
  for(let i=0;i<5;i++){const x=w*.70+i*(w*.25)/5;b.line(x,.14,x,d-.12)}b.circle(.06+bw+.02,.05,.025);
 },
 anafe(b,w=.60,d=.60,n=4){
  b.rect(.03,.05,w-.06,d-.10);
  const pos=n===5?[[.22,.22,.09],[.22,.50,.07],[w-.22,.22,.07],[w-.22,.50,.09],[w/2,.36,.11]]:
   n===2?[[w/2,.20,.08],[w/2,.44,.07]]:[[.17,.19,.085],[.17,.43,.07],[w-.17,.19,.07],[w-.17,.43,.085]];
  for(const [x,y,r] of pos){b.circle(x,y,r);b.circle(x,y,r*.45)}
 },
 cocinaPie(b,w=.60,d=.62){b.rect(0,0,w,d);b.line(0,d-.06,w,d-.06);F.anafe(b,w,d-.06,4);for(let i=0;i<4;i++)b.circle(.10+i*(w-.20)/3,d-.03,.015)},
 horno(b,w=.60,d=.60){b.rect(0,0,w,d,{dashed:true});b.text(.12,d/2-.04,'HORNO',.07)},
 heladera(b,w=.70,d=.70){b.rect(0,0,w,d);b.rect(.03,.03,w-.06,d-.08);b.line(0,d-.05,w,d-.05);b.line(.03,.03,w-.03,d-.08,{dashed:true});b.text(.10,d/2,'HEL',.09)},
 heladeraDoble(b,w=.90,d=.72){b.rect(0,0,w,d);b.line(w/2,0,w/2,d-.05);b.line(0,d-.05,w,d-.05);b.text(.10,d/2,'HEL',.08);b.text(w/2+.08,d/2,'FRZ',.08)},
 lavavajillas(b,w=.60,d=.60){b.rect(0,0,w,d,{dashed:true});b.line(0,0,w,d,{dashed:true});b.text(.20,d/2+.04,'LV',.09)},
 microondas(b){b.rect(0,0,.50,.36);b.rect(.04,.04,.32,.28);b.circle(.43,.20,.02);b.circle(.43,.10,.02)},
 campana(b,w=.60,d=.50){b.rect(0,0,w,d,{dashed:true});b.line(0,0,w,d,{dashed:true});b.line(w,0,0,d,{dashed:true})},
 mesada(b,w,d=.60){b.rect(0,0,w,d);b.line(0,d-.04,w,d-.04)},
 alacena(b,w,d=.35){b.rect(0,0,w,d,{dashed:true})},
 columna(b,w=.60,d=.60){b.rect(0,0,w,d);b.line(0,0,w,d);b.line(w,0,0,d);b.text(.08,d/2+.02,'TORRE',.06)},
 lavarropas(b,w=.60,d=.60){b.rect(0,0,w,d);b.circle(w/2,d/2+.02,.22);b.circle(w/2,d/2+.02,.15);b.rect(.05,.03,.20,.06)},
 secarropas(b,w=.60,d=.60){b.rect(0,0,w,d);b.circle(w/2,d/2+.02,.22);b.text(w/2-.05,d/2-.02,'S',.10)},
 piletaLavar(b,w=.60,d=.55){b.rect(0,0,w,d);b.rrect(.05,.08,w-.10,d-.14,.05);for(let i=1;i<5;i++)b.line(.08,.08+i*(d-.14)/5,w-.08,.08+i*(d-.14)/5);b.circle(w/2,.05,.022)},
 termotanque(b){b.circle(.25,.25,.24);b.circle(.25,.25,.20);b.text(.15,.21,'TT',.08)},
 banqueta(b){b.circle(0,0,.19);b.circle(0,0,.13)},
 silla(b){b.rrect(-.22,-.22,.44,.44,.04);b.rect(-.22,.18,.44,.06)}, // respaldo hacia +v
 mesa(b,w,d,round=false){
  if(round){b.circle(w/2,d/2,Math.min(w,d)/2)}else b.rect(0,0,w,d);
 }
};

/* Mesa con sillas alrededor (local: 0..W × 0..D incluyendo sillas). */
function mesaConSillas(b,W,D,{round=false}={}){
 const ch=.50,td=D-2*ch;
 if(round){
  const r=Math.min(W,D)/2-ch;b.circle(W/2,D/2,r);
  const n=Math.max(3,Math.min(10,Math.round(2*Math.PI*r/.62)));
  for(let i=0;i<n;i++){const a=i*360/n;const cx=W/2+(r+.22)*Math.cos(a*DEG),cy=D/2+(r+.22)*Math.sin(a*DEG);b.at(cx,cy,a+90,bb=>F.silla(bb))}
  return;
 }
 const y0=ch,w=W,d=td;b.rect(0,y0,w,d);
 const per=Math.max(1,Math.floor((w-.10)/.60));
 for(let i=0;i<per;i++){const cx=(i+.5)*w/per;b.at(cx,y0-.24,180,bb=>F.silla(bb));b.at(cx,y0+d+.24,0,bb=>F.silla(bb))}
 if(d>=.80){b.at(-.24,y0+d/2,90,bb=>F.silla(bb));b.at(w+.24,y0+d/2,-90,bb=>F.silla(bb))}
}

/* ---------- Ubicación contra muros de un local W×D ---------- */
function wallPlacer(b,W,D){
 // s = posición sobre el muro medida desde la esquina con menor coordenada; fw = ancho del artefacto
 return (side,s,fw,fn)=>{
  if(side==='S')return b.at(s,0,0,fn);
  if(side==='N')return b.at(s+fw,D,180,fn);
  if(side==='W')return b.at(0,s+fw,-90,fn);
  if(side==='E')return b.at(W,s,90,fn);
 };
}
const perimeter=(b,W,D)=>b.rect(0,0,W,D,{width:.05});
const clamp=(n,a,z)=>Math.max(a,Math.min(z,n));
const turning=(b,cx,cy,r=.75)=>{b.circle(cx,cy,r,{dashed:true})};

/* ---------- Registro de bloques ---------- */
const LIB=[];
function def(o){
 o.wMin=o.wMin??o.w;o.wMax=o.wMax??o.w;o.dMin=o.dMin??o.d;o.dMax=o.dMax??o.d;
 o.family=o.family||o.cat;LIB.push(o);return o;
}

/* ===== BAÑOS COMPLETOS ===== */
const BATH='Baños completos';
def({id:'bano-toilette',name:'Toilette',cat:BATH,family:'bano',w:1.00,d:1.40,wMin:.90,wMax:1.60,dMin:1.20,dMax:2.00,
 gen(b,W,D){perimeter(b,W,D);const at=wallPlacer(b,W,D);
  at('N',(W-.40)/2,.40,F.wc);at('E',.12,.42,bb=>F.lavatorioChico(bb))}});
def({id:'bano-toilette-esquina',name:'Toilette esquinero',cat:BATH,family:'bano',w:1.20,d:1.20,wMin:1.10,wMax:1.60,dMin:1.10,dMax:1.60,
 gen(b,W,D){perimeter(b,W,D);const at=wallPlacer(b,W,D);at('W',D-.62,.40,F.wc);at('N',W-.50,.42,bb=>F.lavatorioChico(bb))}});
def({id:'bano-minimo',name:'Baño mínimo con ducha',cat:BATH,family:'bano',w:1.50,d:2.00,wMin:1.45,wMax:1.90,dMin:1.90,dMax:2.60,
 gen(b,W,D){perimeter(b,W,D);const at=wallPlacer(b,W,D),sw=.85;
  b.at(0,D-sw,0,bb=>F.ducha(bb,sw,sw,false));b.line(sw,D-sw,sw,D,{width:.18});
  at('N',sw+((W-sw)-.40)/2,.40,F.wc);at('E',.20,.55,bb=>F.lavatorio(bb,.55,.45))}});
def({id:'bano-ducha-bidet',name:'Baño con ducha y bidet',cat:BATH,family:'bano',w:1.80,d:2.40,wMin:1.75,wMax:2.40,dMin:2.20,dMax:3.00,
 gen(b,W,D){perimeter(b,W,D);const at=wallPlacer(b,W,D),sd=.90;
  b.at(0,D-sd,0,bb=>F.ducha(bb,W,sd,false));b.line(0,D-sd,W*.65,D-sd,{width:.18});
  const s=D-sd-.12-.40;at('W',s,.40,F.wc);at('W',s-.12-.38,.38,F.bidet);at('E',.25,.60,bb=>F.lavatorio(bb))}});
def({id:'bano-banera',name:'Baño con bañera',cat:BATH,family:'bano',w:1.70,d:2.30,wMin:1.55,wMax:2.20,dMin:2.00,dMax:2.80,
 gen(b,W,D){perimeter(b,W,D);const at=wallPlacer(b,W,D),tl=Math.min(W,1.80);
  b.at(0,D-.75,0,bb=>F.banera(bb,tl,.75));at('W',D-.75-.12-.40,.40,F.wc);at('E',.20,.60,bb=>F.lavatorio(bb))}});
def({id:'bano-completo',name:'Baño completo · bañera + bidet',cat:BATH,family:'bano',w:2.20,d:2.60,wMin:2.00,wMax:3.00,dMin:2.40,dMax:3.20,
 gen(b,W,D){perimeter(b,W,D);const at=wallPlacer(b,W,D),tl=Math.min(W,1.80);
  b.at(0,D-.75,0,bb=>F.banera(bb,tl,.75));const s=D-.75-.12-.40;at('W',s,.40,F.wc);at('W',s-.12-.38,.38,F.bidet);
  at('E',.20,Math.min(1.20,D-1.20)>=1.10?1.20:.60,bb=>Math.min(1.20,D-1.20)>=1.10?F.lavatorioDoble(bb,1.20,.50):F.lavatorio(bb))}});
def({id:'bano-suite',name:'Baño en suite · doble bacha + ducha',cat:BATH,family:'bano',w:2.60,d:2.40,wMin:2.40,wMax:3.40,dMin:2.20,dMax:3.00,
 gen(b,W,D){perimeter(b,W,D);const at=wallPlacer(b,W,D);
  b.at(W-1.00,D-.90,0,bb=>F.ducha(bb,1.00,.90,false));b.line(W-1.00,D-.90,W-1.00,D,{width:.18});
  at('N',W-1.00-.20-.40,.40,F.wc);const vw=Math.min(1.40,D-.40);at('W',(D-vw)/2,vw,bb=>vw>=1.20?F.lavatorioDoble(bb,vw,.50):F.lavatorio(bb,vw,.50))}});
def({id:'bano-principal',name:'Baño principal · bañera + ducha + doble bacha',cat:BATH,family:'bano',w:3.20,d:2.80,wMin:3.00,wMax:4.20,dMin:2.60,dMax:3.60,pro:true,
 gen(b,W,D){perimeter(b,W,D);const at=wallPlacer(b,W,D);
  b.at(0,D-.75,0,bb=>F.banera(bb,1.70,.75));b.at(W-.90,D-.90,0,bb=>F.ducha(bb,.90,.90,false));b.line(W-.90,D-.90,W-.90,D,{width:.18});b.line(W-.90,D-.90,W-.35,D-.90,{width:.18});
  const s=D-.75-.15-.40;at('W',s,.40,F.wc);at('W',s-.12-.38,.38,F.bidet);
  const vw=Math.min(1.60,D-1.20);at('E',.20,vw,bb=>F.lavatorioDoble(bb,vw,.52))}});
def({id:'bano-accesible',name:'Baño accesible · giro Ø1,50',cat:BATH,family:'bano',w:2.20,d:2.20,wMin:2.00,wMax:2.80,dMin:2.00,dMax:2.80,
 gen(b,W,D){perimeter(b,W,D);const at=wallPlacer(b,W,D);
  at('N',.25,.40,F.wc);b.rect(0,D-.90,.035,.75);b.at(.80,D-.85,0,bb=>bb.rect(0,0,.035,.70)); // barras fija y rebatible
  b.at(W-1.00,D-1.00,0,bb=>F.duchaPiso(bb,1.00,1.00));
  at('E',.25,.60,bb=>F.lavatorioAccesible(bb));turning(b,W/2,D/2-.05,.75);b.text(W/2-.12,D/2-.10,'Ø1,50',.08)}});
def({id:'bano-compartimentado',name:'Baño compartimentado',cat:BATH,family:'bano',w:2.40,d:2.40,wMin:2.30,wMax:3.20,dMin:2.20,dMax:3.00,
 gen(b,W,D){perimeter(b,W,D);const at=wallPlacer(b,W,D),px=1.00;
  at('N',.30,.40,F.wc);b.rect(px,D-1.25,.08,1.25);b.arc(px,D-1.25,.65,180,270,{dashed:true});
  b.at(px+.08,D-.90,0,bb=>F.ducha(bb,W-px-.08,.90,false));b.line(px+.08,D-.90,W,D-.90,{width:.18});
  const fw=Math.min(1.40,D-1.30);at('E',.20,fw,bb=>fw>=1.20?F.lavatorioDoble(bb,fw,.50):F.lavatorio(bb,fw,.50))}});
def({id:'bano-esquinera',name:'Baño con bañera esquinera',cat:BATH,family:'bano',w:2.40,d:2.40,wMin:2.20,wMax:3.00,dMin:2.20,dMax:3.00,pro:true,
 gen(b,W,D){perimeter(b,W,D);const at=wallPlacer(b,W,D);
  b.at(W,D,180,bb=>F.baneraEsquinera(bb,1.40));at('N',.25,.40,F.wc);at('W',D-.80-.38-.10,.38,F.bidet);at('E',.20,.60,bb=>F.lavatorio(bb))}});
def({id:'bano-servicio',name:'Baño de servicio',cat:BATH,family:'bano',w:1.20,d:1.80,wMin:1.15,wMax:1.60,dMin:1.70,dMax:2.40,
 gen(b,W,D){perimeter(b,W,D);const at=wallPlacer(b,W,D);
  b.at(0,D-.80,0,bb=>F.ducha(bb,W,.80,false));b.line(0,D-.80,W*.6,D-.80,{width:.18});
  at('W',D-.80-.10-.40,.40,F.wc);at('E',.15,.42,bb=>F.lavatorioChico(bb))}});
def({id:'bano-publico',name:'Sanitario público · cabinas + mingitorios',cat:BATH,family:'bano',w:3.60,d:3.00,wMin:3.00,wMax:5.40,dMin:2.90,dMax:4.00,pro:true,
 gen(b,W,D){perimeter(b,W,D);const at=wallPlacer(b,W,D);
  const cw=.95,n=clamp(Math.floor((W-1.0)/cw),2,5);
  for(let i=0;i<n;i++){const x=i*cw;at('N',x+(cw-.40)/2,.40,F.wc);b.rect(x+cw-.025,D-1.50,.025,1.50);b.line(x+.05,D-1.50,x+cw-.05,D-1.50);b.arc(x+.10,D-1.50,.65,0,90,{dashed:true})}
  const m=clamp(Math.floor((D-1.75)/.70),1,4);for(let i=0;i<m;i++){at('E',.25+i*.70,.36,F.mingitorio);if(i<m-1)b.rect(W-.45,.25+i*.70+.53,.45,.02)}
  const lw=Math.min(1.80,D-1.80);at('W',.20,lw,bb=>{F.mesada(bb,lw,.50);for(let k=0;k<Math.max(1,Math.floor(lw/.60));k++){const cx=.30+k*.60;bb.ellipse(cx,.28,.18,.13);bb.circle(cx,.07,.02)}})}});

/* ===== COCINAS COMPLETAS ===== */
const KIT='Cocinas completas';
def({id:'kit-kitchenette',name:'Kitchenette lineal',cat:KIT,family:'cocina',w:1.80,d:1.20,wMin:1.20,wMax:2.40,dMin:.90,dMax:1.80,
 gen(b,W,D){perimeter(b,W,D);const at=wallPlacer(b,W,D);
  at('N',0,W,bb=>{F.mesada(bb,W);bb.at(.10,0,0,x=>F.bacha(x,.70,.55));bb.at(W-.50,0,0,x=>F.anafe(x,.45,.55,2))});
  at('N',0,W,bb=>F.alacena(bb,W,.35))}});
def({id:'kit-lineal',name:'Cocina lineal con heladera',cat:KIT,family:'cocina',w:3.00,d:2.20,wMin:2.40,wMax:4.20,dMin:1.80,dMax:3.00,
 gen(b,W,D){perimeter(b,W,D);const at=wallPlacer(b,W,D),L=W-.72;
  at('N',W-.70,.70,bb=>F.heladera(bb));
  at('N',0,L,bb=>{F.mesada(bb,L);bb.at(L-.95,0,0,x=>F.bacha(x,.90,.58));if(L>=2.35)bb.at(L-1.58,0,0,x=>F.lavavajillas(x));bb.at(.10,0,0,x=>{F.anafe(x);F.campana(x,.60,.50)})})}});
def({id:'kit-paralela',name:'Cocina paralela (galley)',cat:KIT,family:'cocina',w:2.60,d:2.60,wMin:2.20,wMax:4.00,dMin:2.20,dMax:3.20,
 gen(b,W,D){perimeter(b,W,D);const at=wallPlacer(b,W,D);
  at('N',0,W,bb=>{F.mesada(bb,W);bb.at(W/2-.45,0,0,x=>F.bacha(x,.90,.58));bb.at(W/2+.50,0,0,x=>F.lavavajillas(x))});
  at('S',0,W-.72,bb=>{F.mesada(bb,W-.72);bb.at((W-.72)/2-.30,0,0,x=>F.anafe(x))});at('S',W-.70,.70,bb=>F.heladera(bb))}});
def({id:'kit-L',name:'Cocina en L',cat:KIT,family:'cocina',w:2.80,d:2.60,wMin:2.40,wMax:4.00,dMin:2.20,dMax:3.60,
 gen(b,W,D){perimeter(b,W,D);const at=wallPlacer(b,W,D),L=W-.72;
  at('N',W-.70,.70,bb=>F.heladera(bb));at('N',0,L,bb=>{F.mesada(bb,L);bb.at(L/2-.30,0,0,x=>F.bacha(x,.90,.58))});
  const leg=D-.60-.30;at('W',.30,leg,bb=>{F.mesada(bb,leg);bb.at(leg/2-.30,0,0,x=>F.anafe(x))})}});
def({id:'kit-L-desayunador',name:'Cocina en L con desayunador',cat:KIT,family:'cocina',w:3.40,d:3.00,wMin:3.00,wMax:4.40,dMin:2.80,dMax:3.80,
 gen(b,W,D){perimeter(b,W,D);const at=wallPlacer(b,W,D),L=W-.72;
  at('N',W-.70,.70,bb=>F.heladera(bb));at('N',0,L,bb=>{F.mesada(bb,L);bb.at(L/2-.10,0,0,x=>F.bacha(x,.90,.58));bb.at(L/2-.75,0,0,x=>F.lavavajillas(x))});
  const leg=D-.60-.30;at('W',.30,leg,bb=>{F.mesada(bb,leg);bb.at(leg/2-.30,0,0,x=>F.anafe(x))});
  b.at(W-1.70,.30,0,bb=>mesaConSillas(bb,1.20,1.80))}});
def({id:'kit-U',name:'Cocina en U',cat:KIT,family:'cocina',w:3.00,d:3.00,wMin:2.60,wMax:3.80,dMin:2.60,dMax:3.60,
 gen(b,W,D){perimeter(b,W,D);const at=wallPlacer(b,W,D);
  at('N',0,W,bb=>{F.mesada(bb,W);bb.at(W/2-.45,0,0,x=>F.bacha(x,.90,.58));bb.at(W/2+.50,0,0,x=>F.lavavajillas(x))});
  const leg=D-.60-.25;at('W',.25,leg,bb=>{F.mesada(bb,leg);bb.at(leg/2-.30,0,0,x=>F.anafe(x))});
  at('E',.15,.70,bb=>F.heladera(bb));const r=leg-.72;if(r>.5)at('E',.87,r,bb=>F.mesada(bb,r))}});
def({id:'kit-isla',name:'Cocina con isla',cat:KIT,family:'cocina',w:4.00,d:3.60,wMin:3.60,wMax:5.40,dMin:3.20,dMax:4.60,pro:true,
 gen(b,W,D){perimeter(b,W,D);const at=wallPlacer(b,W,D),L=W-1.40;
  at('N',W-.70,.70,bb=>F.heladera(bb));at('N',W-1.35,.60,bb=>F.columna(bb));
  at('N',0,L,bb=>{F.mesada(bb,L);bb.at(L/2-.45,0,0,x=>F.bacha(x,.90,.58));bb.at(L/2+.50,0,0,x=>F.lavavajillas(x));bb.at(L/2-.45,0,0,x=>F.alacena(x,.90,.35))});
  const iw=clamp(W*.5,1.60,2.60),id=.95,ix=(W-iw)/2,iy=D-.60-1.10-id;
  b.at(ix,iy,0,bb=>{bb.rect(0,0,iw,id);bb.at(iw/2-.30,.18,0,x=>F.anafe(x,.60,.60))});
  const n=Math.max(2,Math.floor(iw/.55));for(let i=0;i<n;i++)b.at(ix+(i+.5)*iw/n,iy-.25,0,F.banqueta)}});
def({id:'kit-peninsula',name:'Cocina con península',cat:KIT,family:'cocina',w:3.60,d:3.20,wMin:3.20,wMax:4.60,dMin:3.00,dMax:4.20,pro:true,
 gen(b,W,D){perimeter(b,W,D);const at=wallPlacer(b,W,D);
  at('N',0,.70,bb=>F.heladera(bb));at('N',.72,W-.72,bb=>{F.mesada(bb,W-.72);bb.at((W-.72)/2-.45,0,0,x=>F.bacha(x,.90,.58));bb.at((W-.72)/2+.50,0,0,x=>F.lavavajillas(x))});
  const leg=D-.60-1.45;at('E',1.45,leg,bb=>{F.mesada(bb,leg);bb.at(leg/2-.30,0,0,x=>F.anafe(x))});
  const pl=Math.min(2.20,W-1.20),py=.50;b.rect(W-pl,py,pl,.90);for(let i=0;i<Math.floor(pl/.60);i++)b.at(W-pl+.35+i*.60,py-.25,0,F.banqueta)}});
def({id:'kit-comedor',name:'Cocina-comedor',cat:KIT,family:'cocina',w:4.40,d:3.80,wMin:4.00,wMax:6.00,dMin:3.40,dMax:4.80,
 gen(b,W,D){perimeter(b,W,D);const at=wallPlacer(b,W,D),L=W-.72;
  at('N',W-.70,.70,bb=>F.heladera(bb));at('N',0,L,bb=>{F.mesada(bb,L);bb.at(L/2-.45,0,0,x=>F.bacha(x,.90,.58));bb.at(L/2+.50,0,0,x=>F.lavavajillas(x))});
  const leg=Math.min(2.40,D-.60-.30);at('W',D-.60-leg,leg,bb=>{F.mesada(bb,leg);bb.at(leg/2-.30,0,0,x=>F.anafe(x))});
  b.at(W-2.70,.30,0,bb=>mesaConSillas(bb,1.80,1.90))}});
def({id:'kit-integrada',name:'Cocina integrada · isla + banquetas',cat:KIT,family:'cocina',w:5.00,d:4.00,wMin:4.60,wMax:7.00,dMin:3.60,dMax:5.00,pro:true,
 gen(b,W,D){perimeter(b,W,D);const at=wallPlacer(b,W,D);
  at('N',0,.90,bb=>F.heladeraDoble(bb,.90,.72));at('N',.92,.60,bb=>F.columna(bb));const L=W-1.54;
  at('N',1.54,L,bb=>{F.mesada(bb,L);bb.at(L/2-.30,0,0,x=>F.anafe(x,.75,.60,5));bb.at(L/2-.45,0,0,x=>F.campana(x,.90,.50));bb.at(L-.60,0,0,x=>F.lavavajillas(x))});
  const iw=clamp(W*.5,2.0,3.2),ix=(W-iw)/2,iy=D-.60-1.20-1.00;
  b.at(ix,iy,0,bb=>{bb.rect(0,0,iw,1.00);bb.at(iw/2-.60,.35,0,x=>F.bachaDoble(x,1.20,.60))});
  for(let i=0;i<Math.floor(iw/.60);i++)b.at(ix+.35+i*.60,iy-.25,0,F.banqueta)}});
def({id:'kit-lavadero',name:'Lavadero',cat:KIT,family:'cocina',w:1.80,d:2.00,wMin:1.40,wMax:2.60,dMin:1.50,dMax:2.60,
 gen(b,W,D){perimeter(b,W,D);const at=wallPlacer(b,W,D);
  at('N',.05,.60,bb=>F.lavarropas(bb));at('N',.70,.60,bb=>F.piletaLavar(bb));if(W>=1.95)at('N',1.35,.60,bb=>F.secarropas(bb));
  at('E',.20,.50,bb=>F.termotanque(bb));for(let i=0;i<4;i++)b.line(.30,.35+i*.15,W-.70,.35+i*.15,{dashed:true})}});
def({id:'kit-con-lavadero',name:'Cocina en L + lavadero',cat:KIT,family:'cocina',w:3.60,d:3.40,wMin:3.40,wMax:4.60,dMin:3.00,dMax:4.00,pro:true,
 gen(b,W,D){perimeter(b,W,D);const at=wallPlacer(b,W,D),lx=W-1.40,ly=D-1.80;
  b.line(lx,ly,W,ly);b.line(lx,ly,lx,ly+.15);b.line(lx,ly+1.0,lx,D);b.arc(lx,ly+.15,.80,0,90,{dashed:true});
  at('N',lx+.10,.60,bb=>F.lavarropas(bb));at('N',lx+.75,.60,bb=>F.piletaLavar(bb));at('E',ly+.15,.50,bb=>F.termotanque(bb));
  const L=lx-.05-.72;at('N',.72,L,bb=>{F.mesada(bb,L);bb.at(L/2-.45,0,0,x=>F.bacha(x,.90,.58))});at('N',0,.70,bb=>F.heladera(bb));
  const leg=Math.max(1.0,D-1.95);at('W',.35,leg,bb=>{F.mesada(bb,leg);bb.at(.20,0,0,x=>F.anafe(x))})}});

/* ===== ARTEFACTOS SANITARIOS (bloques sueltos) ===== */
const SAN='Sanitarios';
const one=(id,name,cat,w,d,fn,extra={})=>def({id,name,cat,family:extra.family||id,w,d,...extra,gen(b,W,D){fn(b,W,D)}});
one('san-wc','Inodoro con mochila',SAN,.40,.70,b=>F.wc(b));
one('san-wc-susp','Inodoro suspendido',SAN,.38,.60,b=>F.wcSuspendido(b));
one('san-bidet','Bidet',SAN,.38,.58,b=>F.bidet(b));
one('san-lav','Vanitory 1 bacha',SAN,.60,.48,(b,W,D)=>F.lavatorio(b,W,D),{wMin:.45,wMax:1.10,dMin:.40,dMax:.60,family:'lav'});
one('san-lav2','Vanitory 2 bachas',SAN,1.40,.50,(b,W,D)=>F.lavatorioDoble(b,W,D),{wMin:1.10,wMax:2.20,dMin:.45,dMax:.60,family:'lav'});
one('san-lav-pie','Lavatorio de pie',SAN,.55,.45,b=>F.lavatorioPie(b),{family:'lav'});
one('san-lav-acc','Lavatorio accesible',SAN,.60,.50,b=>F.lavatorioAccesible(b),{family:'lav'});
one('san-ducha','Plato de ducha',SAN,.90,.90,(b,W,D)=>F.ducha(b,W,D,true),{wMin:.70,wMax:1.80,dMin:.70,dMax:1.20,family:'ducha'});
one('san-ducha-piso','Ducha a piso con banco',SAN,1.00,1.00,(b,W,D)=>F.duchaPiso(b,W,D),{wMin:.90,wMax:1.60,dMin:.90,dMax:1.60,family:'ducha'});
one('san-banera','Bañera',SAN,1.70,.75,(b,W,D)=>F.banera(b,W,D),{wMin:1.40,wMax:2.00,dMin:.70,dMax:.90,family:'banera'});
one('san-banera-esq','Bañera esquinera',SAN,1.40,1.40,(b,W)=>F.baneraEsquinera(b,W),{wMin:1.20,wMax:1.60,dMin:1.40,dMax:1.40,family:'banera',lockAspect:true});
one('san-mingitorio','Mingitorio',SAN,.36,.35,b=>F.mingitorio(b));
one('san-barra','Barra de apoyo',SAN,.80,.035,(b,W)=>F.barra(b,W),{wMin:.30,wMax:1.20});

/* ===== EQUIPAMIENTO DE COCINA ===== */
const KEQ='Cocina · equipos';
one('kq-mesada','Mesada (largo variable)',KEQ,2.40,.60,(b,W,D)=>F.mesada(b,W,D),{wMin:.60,wMax:6.00,dMin:.50,dMax:.90});
one('kq-bacha','Bacha simple + escurridor',KEQ,.80,.60,(b,W,D)=>F.bacha(b,W,D),{wMin:.70,wMax:1.20,family:'bacha'});
one('kq-bacha2','Bacha doble',KEQ,1.20,.60,(b,W,D)=>F.bachaDoble(b,W,D),{wMin:1.00,wMax:1.60,family:'bacha'});
one('kq-anafe2','Anafe 2 hornallas',KEQ,.45,.55,(b,W,D)=>F.anafe(b,W,D,2),{family:'anafe'});
one('kq-anafe4','Anafe 4 hornallas',KEQ,.60,.60,(b,W,D)=>F.anafe(b,W,D,4),{family:'anafe'});
one('kq-anafe5','Anafe 5 hornallas',KEQ,.75,.60,(b,W,D)=>F.anafe(b,W,D,5),{family:'anafe'});
one('kq-cocina','Cocina de pie',KEQ,.60,.62,(b,W,D)=>F.cocinaPie(b,W,D),{wMin:.50,wMax:.90,family:'anafe'});
one('kq-horno','Horno empotrado',KEQ,.60,.60,b=>F.horno(b));
one('kq-heladera','Heladera',KEQ,.70,.70,(b,W,D)=>F.heladera(b,W,D),{wMin:.55,wMax:.80,family:'heladera'});
one('kq-heladera2','Heladera side by side',KEQ,.90,.72,(b,W,D)=>F.heladeraDoble(b,W,D),{wMin:.85,wMax:1.00,family:'heladera'});
one('kq-lv','Lavavajillas',KEQ,.60,.60,b=>F.lavavajillas(b),{wMin:.45,wMax:.60});
one('kq-micro','Microondas',KEQ,.50,.36,b=>F.microondas(b));
one('kq-campana','Campana (proyección)',KEQ,.60,.50,(b,W,D)=>F.campana(b,W,D),{wMin:.60,wMax:1.20});
one('kq-alacena','Alacena (proyección)',KEQ,1.20,.35,(b,W,D)=>F.alacena(b,W,D),{wMin:.30,wMax:4.00});
one('kq-torre','Columna horno / torre',KEQ,.60,.60,b=>F.columna(b));
one('kq-lavarropas','Lavarropas',KEQ,.60,.60,b=>F.lavarropas(b));
one('kq-secarropas','Secarropas',KEQ,.60,.60,b=>F.secarropas(b));
one('kq-pileta','Pileta de lavar',KEQ,.60,.55,b=>F.piletaLavar(b));
one('kq-termo','Termotanque',KEQ,.50,.50,b=>F.termotanque(b));
one('kq-isla','Isla con anafe',KEQ,2.00,.95,(b,W,D)=>{b.rect(0,0,W,D);b.at(W/2-.30,(D-.60)/2,0,x=>F.anafe(x))},{wMin:1.20,wMax:3.20,dMin:.80,dMax:1.20});

/* ===== ESCALERAS ===== */
const ST='Escaleras';
function steps(b,x,y,w,len,n,dir='up'){ // tramo recto: huellas transversales
 b.rect(x,y,w,len);for(let i=1;i<n;i++){const yy=y+i*len/n;b.line(x,yy,x+w,yy)}
 b.line(x+w/2,y+.10,x+w/2,y+len-.15);b.line(x+w/2,y+len-.15,x+w/2-.07,y+len-.30);b.line(x+w/2,y+len-.15,x+w/2+.07,y+len-.30);
}
def({id:'esc-recta',name:'Escalera recta',cat:ST,family:'escalera',w:1.00,d:4.20,wMin:.80,wMax:1.80,dMin:2.00,dMax:6.00,
 gen(b,W,D){const n=Math.max(4,Math.round(D/.28));steps(b,0,0,W,D,n);b.text(.05,-.18,'SUBE · '+n+' huellas',.09)}});
def({id:'esc-L',name:'Escalera en L con descanso',cat:ST,family:'escalera',w:2.20,d:3.20,wMin:1.80,wMax:3.40,dMin:2.40,dMax:4.60,
 gen(b,W,D){const a=W/2.2;const w=clamp(a,.80,1.40);const l1=D-w,n1=Math.max(3,Math.round(l1/.28));steps(b,0,0,w,l1,n1);
  b.rect(0,l1,w,w);b.line(0,l1,w,l1+w,{dashed:true});const l2=W-w,n2=Math.max(3,Math.round(l2/.28));
  b.rect(w,l1,l2,w);for(let i=1;i<n2;i++){const xx=w+i*l2/n2;b.line(xx,l1,xx,l1+w)}b.line(w+.1,l1+w/2,W-.15,l1+w/2);b.line(W-.15,l1+w/2,W-.30,l1+w/2+.07);b.line(W-.15,l1+w/2,W-.30,l1+w/2-.07)}});
def({id:'esc-U',name:'Escalera en U (ida y vuelta)',cat:ST,family:'escalera',w:2.20,d:3.40,wMin:1.80,wMax:3.40,dMin:2.40,dMax:5.00,
 gen(b,W,D){const w=(W-.10)/2,l=D-w,n=Math.max(3,Math.round(l/.28));steps(b,0,0,w,l,n);b.rect(w,0,.10,l);
  b.rect(0,l,W,w);b.arc(W/2,l,w*.55,0,180,{dashed:true});
  b.rect(w+.10,0,w,l);for(let i=1;i<n;i++){const yy=i*l/n;b.line(w+.10,yy,W,yy)}b.line(w+.10+w/2,l-.15,w+.10+w/2,.15)}});
def({id:'esc-caracol',name:'Escalera caracol',cat:ST,family:'escalera',w:1.60,d:1.60,wMin:1.20,wMax:2.40,dMin:1.20,dMax:2.40,lockAspect:true,
 gen(b,W){const r=W/2,n=14;b.circle(r,r,r);b.circle(r,r,.10);for(let i=0;i<n;i++){const a=i*300/n*DEG;b.line(r+.10*Math.cos(a),r+.10*Math.sin(a),r+r*Math.cos(a),r+r*Math.sin(a))}b.arc(r,r,r*.62,0,300,{dashed:true})}});
def({id:'esc-rampa',name:'Rampa accesible 8%',cat:ST,family:'escalera',w:1.20,d:6.00,wMin:.90,wMax:2.00,dMin:2.00,dMax:9.00,
 gen(b,W,D){b.rect(0,0,W,D);b.rect(-.05,0,.05,D);b.rect(W,0,.05,D);b.line(W/2,.2,W/2,D-.2);b.line(W/2,D-.2,W/2-.08,D-.38);b.line(W/2,D-.2,W/2+.08,D-.38);b.text(.08,.08,'8%',.10)}});

/* ===== MOBILIARIO ===== */
const MOB='Mobiliario';
one('mob-mesa4','Mesa comedor 4 personas',MOB,1.20,1.80,(b,W,D)=>mesaConSillas(b,W,D),{wMin:.90,wMax:1.40,dMin:1.70,dMax:2.00,family:'mesa'});
one('mob-mesa6','Mesa comedor 6 personas',MOB,1.80,1.90,(b,W,D)=>mesaConSillas(b,W,D),{wMin:1.60,wMax:2.20,dMin:1.80,dMax:2.10,family:'mesa'});
one('mob-mesa8','Mesa comedor 8 personas',MOB,2.40,2.00,(b,W,D)=>mesaConSillas(b,W,D),{wMin:2.20,wMax:3.20,dMin:1.90,dMax:2.20,family:'mesa'});
one('mob-mesa-red','Mesa redonda con sillas',MOB,2.10,2.10,(b,W,D)=>mesaConSillas(b,W,D,{round:true}),{wMin:1.80,wMax:2.80,dMin:1.80,dMax:2.80,family:'mesa',lockAspect:true});
one('mob-sofa2','Sofá 2 cuerpos',MOB,1.70,.90,(b,W,D)=>{b.rrect(0,0,W,D,.06);b.rect(.15,.20,W-.30,D-.38);b.line(W/2,.20,W/2,D-.18);b.rect(0,D-.20,W,.20)},{wMin:1.40,wMax:2.00,family:'sofa'});
one('mob-sofa3','Sofá 3 cuerpos',MOB,2.30,.92,(b,W,D)=>{b.rrect(0,0,W,D,.06);b.rect(.16,.20,W-.32,D-.40);b.line(.16+(W-.32)/3,.20,.16+(W-.32)/3,D-.20);b.line(.16+2*(W-.32)/3,.20,.16+2*(W-.32)/3,D-.20);b.rect(0,D-.20,W,.20)},{wMin:2.00,wMax:2.80,family:'sofa'});
one('mob-sillon','Sillón individual',MOB,.85,.85,(b,W,D)=>{b.rrect(0,0,W,D,.06);b.rect(.15,.15,W-.30,D-.33);b.rect(0,D-.18,W,.18)},{family:'sofa'});
one('mob-ratona','Mesa ratona',MOB,1.10,.60,(b,W,D)=>{b.rect(0,0,W,D);b.rect(.05,.05,W-.10,D-.10)},{wMin:.60,wMax:1.60,dMin:.50,dMax:1.00});
one('mob-escritorio','Escritorio con silla',MOB,1.40,1.20,(b,W)=>{b.rect(0,.50,W,.70);b.at(W/2,.30,180,bb=>{bb.circle(0,0,.25);bb.rect(-.20,-.30,.40,.08)})},{wMin:1.00,wMax:2.00});
one('mob-placard','Placard corredizo',MOB,1.80,.62,(b,W,D)=>{b.rect(0,0,W,D);b.line(0,.10,W/2+.05,.10);b.line(W/2-.05,.18,W,.18);b.line(.05,D/2,W-.05,D/2,{dashed:true})},{wMin:.80,wMax:4.00,family:'placard'});
one('mob-placard-bat','Placard puertas batientes',MOB,1.20,.62,(b,W,D)=>{b.rect(0,0,W,D);const n=Math.max(2,Math.round(W/.45));for(let i=0;i<n;i++){const x=i*W/n,w=W/n;if(i%2)b.arc(x+w,0,w,180,270,{dashed:true});else b.arc(x,0,w,270,360,{dashed:true})}b.line(.05,D/2,W-.05,D/2,{dashed:true})},{wMin:.80,wMax:3.20,family:'placard'});
one('mob-biblioteca','Biblioteca',MOB,1.60,.35,(b,W,D)=>{b.rect(0,0,W,D);const n=Math.max(2,Math.round(W/.80));for(let i=1;i<n;i++)b.line(i*W/n,0,i*W/n,D)},{wMin:.80,wMax:4.00});
one('mob-tv','Mueble TV',MOB,1.80,.45,(b,W,D)=>{b.rect(0,0,W,D);b.rect(W*.15,D-.06,W*.7,.05)},{wMin:1.20,wMax:2.60});

/* ===== DORMITORIO ===== */
const DOR='Dormitorio';
function cama(b,W,D,{mesas=true}={}){
 const mw=mesas?.50:0,bw=W-2*mw;b.rect(mw,0,bw,D);b.line(mw,D-.55,mw+bw,D-.55);
 const n=bw>1.2?2:1;for(let i=0;i<n;i++)b.rrect(mw+.08+i*bw/n,D-.48,bw/n-.16,.38,.06);
 b.line(mw,D*.45,mw+bw,D*.30,{dashed:true});
 if(mesas){b.rect(0,D-.45,.45,.42);b.rect(W-.45,D-.45,.45,.42);b.circle(.225,D-.24,.09);b.circle(W-.225,D-.24,.09)}
}
one('dor-cama1','Cama 1 plaza + mesa de luz',DOR,1.40,2.00,(b,W,D)=>{b.rect(0,0,.90,D);b.line(0,D-.55,.90,D-.55);b.rrect(.10,D-.48,.70,.38,.06);b.line(0,D*.45,.90,D*.30,{dashed:true});b.rect(W-.45,D-.45,.45,.42);b.circle(W-.225,D-.24,.09)},{family:'cama'});
one('dor-cama2','Cama 2 plazas 1,40',DOR,2.40,1.90,(b,W,D)=>cama(b,W,D),{family:'cama'});
one('dor-queen','Cama Queen 1,60',DOR,2.60,2.00,(b,W,D)=>cama(b,W,D),{family:'cama'});
one('dor-king','Cama King 2,00',DOR,3.00,2.00,(b,W,D)=>cama(b,W,D),{wMin:2.80,wMax:3.20,family:'cama'});
one('dor-cucheta','Cucheta',DOR,.90,2.00,(b,W,D)=>{b.rect(0,0,W,D);b.rect(.05,.05,W-.10,D-.10,{dashed:true});b.rrect(.10,D-.45,W-.20,.36,.05);b.rect(W,.30,.06,.80)},{family:'cama'});
one('dor-cuna','Cuna',DOR,.70,1.30,(b,W,D)=>{b.rect(0,0,W,D);for(let i=1;i<8;i++)b.line(.03,i*D/8,W-.03,i*D/8,{dashed:true})},{family:'cama'});

/* ===== EXTERIOR Y VEGETACIÓN ===== */
const EXT='Exterior';
one('ext-arbol','Árbol caducifolio',EXT,3.00,3.00,(b,W)=>{const r=W/2,n=14,pts=[];for(let i=0;i<=n*2;i++){const a=i*180/n*DEG,rr=i%2?r*.86:r;pts.push([r+rr*Math.cos(a),r+rr*Math.sin(a)])}b.poly(pts,true);b.circle(r,r,r*.12);for(let i=0;i<6;i++){const a=i*60*DEG;b.line(r,r,r+r*.6*Math.cos(a),r+r*.6*Math.sin(a))}},{wMin:1.0,wMax:8.0,lockAspect:true,family:'arbol'});
one('ext-conifera','Conífera',EXT,2.00,2.00,(b,W)=>{const r=W/2;b.circle(r,r,r);for(let i=0;i<16;i++){const a=i*22.5*DEG;b.line(r+r*.15*Math.cos(a),r+r*.15*Math.sin(a),r+r*.95*Math.cos(a),r+r*.95*Math.sin(a))}},{wMin:.8,wMax:6,lockAspect:true,family:'arbol'});
one('ext-palmera','Palmera',EXT,3.00,3.00,(b,W)=>{const r=W/2;for(let i=0;i<9;i++){const a=i*40*DEG;b.line(r,r,r+r*Math.cos(a),r+r*Math.sin(a));b.arc(r+r*.55*Math.cos(a),r+r*.55*Math.sin(a),r*.42,(i*40)-30,(i*40)+30)}b.circle(r,r,.15)},{wMin:1.5,wMax:6,lockAspect:true,family:'arbol'});
one('ext-arbusto','Arbusto',EXT,1.00,1.00,(b,W)=>{const r=W/2;for(const [x,y,k] of [[.35,.4,.32],[.62,.45,.30],[.5,.66,.3]])b.circle(W*x,W*y,r*k*2)},{wMin:.4,wMax:3,lockAspect:true,family:'arbol'});
one('ext-maceta','Maceta con planta',EXT,.50,.50,(b,W)=>{const r=W/2;b.circle(r,r,r);b.circle(r,r,r*.8);for(let i=0;i<8;i++){const a=i*45*DEG;b.line(r,r,r+r*.75*Math.cos(a),r+r*.75*Math.sin(a))}},{wMin:.3,wMax:1.2,lockAspect:true});
one('ext-pileta','Piscina rectangular',EXT,8.00,4.00,(b,W,D)=>{b.rect(0,0,W,D);b.rect(.25,.25,W-.5,D-.5);b.line(.25,.25,W-.25,D-.25,{dashed:true});for(let i=0;i<4;i++){b.rect(.6+i*.25,.25,.20,.30)}},{wMin:3,wMax:15,dMin:2,dMax:8});
one('ext-parrilla','Parrilla / quincho',EXT,1.60,.80,(b,W,D)=>{b.rect(0,0,W,D);b.rect(.10,.10,W*.6,D-.20);for(let i=1;i<8;i++)b.line(.10+i*W*.6/8,.10,.10+i*W*.6/8,D-.10);b.rect(W*.72,.10,W*.22,D-.20)},{wMin:1,wMax:3});

/* ===== VEHÍCULOS ===== */
const VEH='Vehículos';
one('veh-auto','Auto mediano',VEH,1.80,4.40,(b,W,D)=>{b.rrect(0,0,W,D,.35);b.rrect(.15,D*.28,W-.30,D*.42,.20);b.line(.18,D*.36,W-.18,D*.36);b.line(.18,D*.62,W-.18,D*.62);for(const [x,y] of [[-.03,D*.16],[W-.07,D*.16],[-.03,D*.78],[W-.07,D*.78]])b.rect(x,y,.10,.40)},{wMin:1.6,wMax:2.1,dMin:3.6,dMax:5.2,family:'auto'});
one('veh-camioneta','Camioneta',VEH,1.95,5.30,(b,W,D)=>{b.rrect(0,0,W,D,.30);b.rrect(.15,D*.40,W-.30,D*.35,.18);b.rect(.12,.12,W-.24,D*.34);b.line(.18,D*.48,W-.18,D*.48)},{family:'auto'});
one('veh-moto','Moto',VEH,.80,2.10,(b,W,D)=>{b.ellipse(W/2,D/2,.22,D*.45);b.line(0,D*.80,W,D*.80);b.rect(W/2-.05,0,.10,.30);b.rect(W/2-.05,D-.30,.10,.30)});
one('veh-bici','Bicicleta',VEH,.60,1.80,(b,W,D)=>{b.rect(W/2-.02,0,.04,.65);b.rect(W/2-.02,D-.65,.04,.65);b.line(W/2,.65,W/2,D-.65);b.line(0,D*.78,W,D*.78)});
one('veh-estac','Cochera / estacionamiento',VEH,2.50,5.00,(b,W,D)=>{b.line(0,0,0,D);b.line(W,0,W,D);b.line(0,D,W,D);b.rrect(.35,.45,1.80,4.30,.35,{dashed:true})},{wMin:2.3,wMax:3.5,dMin:4.5,dMax:6});

/* ===== EQUIPOS / CIRCULACIÓN ===== */
const EQ='Equipos';
one('eq-ascensor','Ascensor (pasadizo)',EQ,1.60,1.80,(b,W,D)=>{b.rect(0,0,W,D);b.rect(.10,.25,W-.20,D-.35);b.line(.10,.25,W-.10,D-.10);b.line(W-.10,.25,.10,D-.10);b.rect(W/2-.45,0,.90,.06)},{wMin:1.4,wMax:2.6,dMin:1.5,dMax:2.6});
one('eq-split','Aire acondicionado split',EQ,.90,.25,(b,W,D)=>{b.rect(0,0,W,D);b.line(.05,D-.06,W-.05,D-.06);b.text(.05,.06,'A/A',.07)},{wMin:.7,wMax:1.2});
one('eq-condensadora','Condensadora exterior',EQ,.85,.35,(b,W,D)=>{b.rect(0,0,W,D);b.circle(W*.38,D/2,D*.38);b.circle(W*.38,D/2,D*.10)});
one('eq-tablero','Tablero eléctrico',EQ,.40,.12,(b,W,D)=>{b.rect(0,0,W,D);b.line(0,0,W,D)});
one('eq-chimenea','Hogar / chimenea',EQ,1.20,.60,(b,W,D)=>{b.rect(0,0,W,D);b.poly([[.20,D],[.30,.15],[W-.30,.15],[W-.20,D]],false);b.rect(-.10,-.15,W+.20,.15)},{wMin:.8,wMax:2.0});

/* ===== ALZADOS: PUERTAS, VENTANAS, ÁRBOLES Y PERSONAS (dibujo propio) ===== */
const ALZ='Alzados';
// Puertas en alzado: W = ancho de vano, D = altura (piso en y=0).
function puertaAlz(b,W,D,tipo){
 b.line(-.10,0,W+.10,0);b.rect(0,0,W,D);const m=.05;b.rect(m,0,W-2*m,D-m);
 if(tipo==='tablero'){const pw=W-2*m-.16,ph=(D-m-.30)/2;b.rect(m+.08,.12,pw,ph);b.rect(m+.08,.18+ph,pw,ph)}
 if(tipo==='vidrio'){b.rect(m+.10,D*.35,W-2*m-.20,D*.55);for(let i=1;i<4;i++)b.line(m+.10+i*.06,D*.35+D*.55-.02,m+.10+i*.06+.12,D*.35+D*.55-.14)}
 if(tipo==='doble'){b.line(W/2,0,W/2,D-m);b.circle(W/2-.08,D*.48,.025);b.circle(W/2+.08,D*.48,.025);return}
 if(tipo==='corrediza'){b.line(W/2,0,W/2,D-m);b.line(W*.2,D*.5,W*.35,D*.5);b.line(W*.35,D*.5,W*.31,D*.52);b.line(W*.35,D*.5,W*.31,D*.48);return}
 b.circle(W-m-.08,D*.48,.03);b.line(W-m-.08,D*.48,W-m-.20,D*.48);
 b.line(m,0,W-m,D-m,{dashed:true});b.line(W-m,0,m,D-m,{dashed:true}); // convención de abertura en alzado
}
one('alz-puerta-placa','Puerta placa (alzado)',ALZ,.80,2.05,(b,W,D)=>puertaAlz(b,W,D,'placa'),{wMin:.60,wMax:1.20,dMin:1.90,dMax:2.60,family:'alz-puerta'});
one('alz-puerta-tablero','Puerta de tableros (alzado)',ALZ,.85,2.05,(b,W,D)=>puertaAlz(b,W,D,'tablero'),{wMin:.70,wMax:1.10,dMin:1.90,dMax:2.60,family:'alz-puerta'});
one('alz-puerta-vidrio','Puerta con vidrio (alzado)',ALZ,.90,2.10,(b,W,D)=>puertaAlz(b,W,D,'vidrio'),{wMin:.70,wMax:1.20,dMin:1.90,dMax:2.60,family:'alz-puerta'});
one('alz-puerta-doble','Puerta doble (alzado)',ALZ,1.60,2.20,(b,W,D)=>puertaAlz(b,W,D,'doble'),{wMin:1.20,wMax:2.40,dMin:2.00,dMax:3.00,family:'alz-puerta'});
one('alz-puerta-corrediza','Puerta corrediza (alzado)',ALZ,1.80,2.10,(b,W,D)=>puertaAlz(b,W,D,'corrediza'),{wMin:1.20,wMax:3.60,dMin:2.00,dMax:2.80,family:'alz-puerta'});
function ventanaAlz(b,W,D,tipo){
 b.rect(0,0,W,D);const m=.05;b.rect(m,m,W-2*m,D-2*m);b.line(-.04,0,W+.04,0);b.line(-.04,-.03,W+.04,-.03);
 if(tipo==='corrediza'){b.line(W/2,m,W/2,D-m);b.line(W*.25-.08,D/2,W*.25+.08,D/2);b.line(W*.75-.08,D/2,W*.75+.08,D/2)}
 if(tipo==='banderola'){b.line(m,D*.72,W-m,D*.72);b.line(m,D-m,W/2,D*.72+.02,{dashed:true});b.line(W-m,D-m,W/2,D*.72+.02,{dashed:true})}
 if(tipo==='pano')for(let i=1;i<3;i++)b.line(m,m+i*(D-2*m)/3,W-m,m+i*(D-2*m)/3);
}
one('alz-ventana-corrediza','Ventana corrediza (alzado)',ALZ,1.50,1.10,(b,W,D)=>ventanaAlz(b,W,D,'corrediza'),{wMin:.80,wMax:3.00,dMin:.60,dMax:1.80,family:'alz-ventana'});
one('alz-ventana-banderola','Ventana con banderola (alzado)',ALZ,1.20,1.40,(b,W,D)=>ventanaAlz(b,W,D,'banderola'),{wMin:.60,wMax:2.40,dMin:.90,dMax:2.20,family:'alz-ventana'});
one('alz-ventana-pano','Paño fijo (alzado)',ALZ,1.00,1.50,(b,W,D)=>ventanaAlz(b,W,D,'pano'),{wMin:.40,wMax:3.00,dMin:.40,dMax:2.60,family:'alz-ventana'});
// Árboles en alzado: W = diámetro de copa, D = altura total.
one('alz-arbol-copa','Árbol de copa redonda (alzado)',ALZ,4.0,6.0,(b,W,D)=>{
 const tr=Math.max(.15,W*.05),ch=D*.62,cy=D-ch/2,pts=[],n=22;b.poly([[W/2-tr,0],[W/2-tr*.7,D-ch*.85],[W/2+tr*.7,D-ch*.85],[W/2+tr,0]],false);
 for(let i=0;i<=n;i++){const a=i/n*2*Math.PI,r=1+((i%2)?-.08:.06);pts.push([W/2+W/2*r*Math.cos(a),cy+ch/2*r*Math.sin(a)])}b.poly(pts,true);
 b.line(W/2,D-ch*.85,W/2-W*.18,cy);b.line(W/2,D-ch*.75,W/2+W*.2,cy+ch*.1);b.line(-.3,0,W+.3,0)},{wMin:1.5,wMax:12,dMin:2.5,dMax:20,family:'alz-arbol'});
one('alz-arbol-conico','Conífera (alzado)',ALZ,3.0,7.0,(b,W,D)=>{
 const tr=Math.max(.12,W*.05);b.rect(W/2-tr,0,2*tr,D*.18);const L=4;for(let i=0;i<L;i++){const y0=D*.15+i*(D*.8/L)*.9,w=W*(1-i*.2);b.poly([[W/2-w/2,y0],[W/2,y0+D*.85/L*1.5],[W/2+w/2,y0]],true)}b.line(-.3,0,W+.3,0)},{wMin:1,wMax:8,dMin:2,dMax:25,family:'alz-arbol'});
one('alz-palmera','Palmera (alzado)',ALZ,4.0,8.0,(b,W,D)=>{
 const top=D*.80,cx=W/2;b.poly([[cx-.16,0],[cx-.09,top],[cx+.09,top],[cx+.16,0]],false);for(let i=1;i<12;i++){const y=i*top/12;b.line(cx-.15+i*.005,y,cx+.15-i*.005,y+.04)}
 const frond=(ang,len)=>{const c=Math.cos(ang),sn=Math.sin(ang),pts=[];for(let t=0;t<=12;t++){const u=t/12;pts.push([cx+sn*len*u,top+len*((.25+.65*c)*u-(.85-.35*c)*u*u)])}return pts};
 for(let k=0;k<9;k++){const ang=(-84+k*21)*Math.PI/180,len=Math.min(W*.55,D*.35)*(k%2?.85:1),pts=frond(ang,len);b.poly(pts,false);for(let t=3;t<12;t+=2){const [x,y]=pts[t];b.line(x,y,x+Math.sin(ang)*.12,y-.20)}}
 b.line(-.3,0,W+.3,0)},{wMin:2,wMax:10,dMin:3,dMax:20,family:'alz-arbol'});
one('alz-arbusto','Arbusto (alzado)',ALZ,1.4,1.2,(b,W,D)=>{
 const n=Math.max(3,Math.round(W/.32)),pts=[[W,0],[0,0]];for(let i=0;i<n;i++)for(let t=0;t<=8;t++){const u=(i+t/8)/n,x=u*W,crown=D*(.55+.45*Math.sin(Math.PI*u)),bump=Math.sin(Math.PI*t/8)*W/n*.45;pts.push([x,Math.min(D,crown-W/n*.45+bump)])}
 b.poly(pts,true);b.line(W*.3,0,W*.38,D*.35);b.line(W*.6,0,W*.55,D*.4)},{wMin:.4,wMax:4,dMin:.4,dMax:3,family:'alz-arbol'});
function personaAlz(b,H,{falda=false,esc=1}={}){
 const k=H/1.75,head=.11*k;b.circle(0,H-head,head);
 const sh=.21*k,hip=.16*k,yS=H-2.1*head-.04*k,yH=H*.53;
 if(falda)b.poly([[-sh,yS],[sh,yS],[hip*.9,yH],[hip*1.6,H*.30],[-hip*1.6,H*.30],[-hip*.9,yH]],true);
 else b.poly([[-sh,yS],[sh,yS],[hip,yH],[-hip,yH]],true);
 b.line(-sh,yS,-sh-.06*k,H*.40);b.line(sh,yS,sh+.06*k,H*.40);
 b.line(-hip*.55,falda?H*.30:yH,-hip*.6,0);b.line(hip*.55,falda?H*.30:yH,hip*.6,0);
}
one('alz-persona-1','Persona de pie (alzado)',ALZ,.60,1.75,(b,W,D)=>b.at(W/2,0,0,x=>personaAlz(x,D)),{dMin:1.50,dMax:1.95,family:'persona',wMin:.6,wMax:.6});
one('alz-persona-2','Persona con falda (alzado)',ALZ,.60,1.68,(b,W,D)=>b.at(W/2,0,0,x=>personaAlz(x,D,{falda:true})),{dMin:1.50,dMax:1.90,family:'persona',wMin:.6,wMax:.6});
one('alz-persona-nino','Niño (alzado)',ALZ,.45,1.20,(b,W,D)=>b.at(W/2,0,0,x=>personaAlz(x,D)),{dMin:.90,dMax:1.45,family:'persona',wMin:.45,wMax:.45});

/* ===== PERSONAS EN PLANTA ===== */
const PER='Personas';
const perPlanta=(b,x,y,a=0)=>b.at(x,y,a,q=>{q.ellipse(0,0,.26,.13);q.circle(0,.02,.10);q.line(-.06,.13,0,.20);q.line(.06,.13,0,.20)});
one('per-planta','Persona (planta)',PER,.55,.40,(b,W,D)=>perPlanta(b,W/2,D/2),{family:'persona-pl'});
one('per-grupo','Grupo de personas (planta)',PER,1.60,1.20,(b)=>{perPlanta(b,.35,.35,20);perPlanta(b,1.15,.40,-30);perPlanta(b,.80,.90,180)},{family:'persona-pl'});
one('per-silla-ruedas','Silla de ruedas (planta)',PER,.70,1.10,(b,W,D)=>{b.rect(.12,.30,W-.24,.50);b.rect(0,.25,.06,.62);b.rect(W-.06,.25,.06,.62);b.rect(.15,.80,W-.30,.08);b.circle(.18,.12,.07);b.circle(W-.18,.12,.07);perPlanta(b,W/2,.62)},{family:'persona-pl'});

/* ===== OFICINA ===== */
const OFI='Oficina';
const puesto=(b,x,y,a)=>b.at(x,y,a,q=>{q.rect(0,0,1.40,.70);q.rect(.50,.45,.40,.05);q.at(.70,-.30,180,s=>{s.circle(0,0,.25);s.rect(-.20,-.30,.40,.08)})});
one('ofi-puesto','Puesto de trabajo',OFI,1.40,1.20,(b)=>puesto(b,0,.50,0),{family:'ofi-puesto'});
one('ofi-puestos-4','Bloque 4 puestos enfrentados',OFI,2.80,2.60,(b)=>{puesto(b,0,.60,0);puesto(b,1.40,.60,0);puesto(b,1.40,2.00,180);puesto(b,2.80,2.00,180);b.line(0,1.30,2.80,1.30)},{family:'ofi-puesto'});
one('ofi-reuniones','Sala de reuniones 8',OFI,3.20,2.20,(b,W,D)=>{b.rrect(.50,.55,W-1.0,D-1.10,.35);const n=Math.max(2,Math.floor((W-1.0)/.65));for(let i=0;i<n;i++){const x=.50+(i+.5)*(W-1.0)/n;b.at(x,.30,180,F.silla);b.at(x,D-.30,0,F.silla)}b.at(.25,D/2,90,F.silla);b.at(W-.25,D/2,-90,F.silla)},{wMin:2.4,wMax:6,dMin:2,dMax:3,family:'ofi-sala'});
one('ofi-recepcion','Mostrador de recepción',OFI,2.40,1.60,(b,W,D)=>{b.poly([[0,D],[0,D-.70],[W-.70,D-.70],[W-.70,0],[W,0],[W,D]],true);b.line(.05,D-.62,W-.78,D-.62,{dashed:true});b.at(W/2-.35,D-1.10,180,F.silla)},{wMin:1.6,wMax:4,dMin:1.2,dMax:2.4});
one('ofi-archivo','Archivero / biblioteca',OFI,.90,.50,(b,W,D)=>{b.rect(0,0,W,D);const n=Math.max(1,Math.round(W/.45));for(let i=1;i<n;i++)b.line(i*W/n,0,i*W/n,D);b.line(0,.06,W,.06)},{wMin:.45,wMax:3.6,dMin:.40,dMax:.60});

/* ===== SÍMBOLOS ===== */
const SIM='Símbolos';
one('sim-norte','Norte',SIM,1.20,1.20,(b,W)=>{const r=W/2;b.circle(r,r,r*.8);b.poly([[r,r+r*.95],[r-r*.28,r-r*.55],[r,r-r*.25],[r+r*.28,r-r*.55]],true);b.line(r,r-r*.25,r,r+r*.95);b.text(r-r*.13,r+r*.98,'N',r*.32)},{wMin:.4,wMax:4,lockAspect:true,family:'norte'});
one('sim-norte-flecha','Norte (flecha)',SIM,.60,1.20,(b,W,D)=>{b.poly([[W/2,D*.85],[0,D*.15],[W/2,D*.35],[W,D*.15]],true);b.line(W/2,D*.35,W/2,D*.85);b.text(W/2-W*.15,D*.88,'N',W*.4)},{wMin:.3,wMax:2,dMin:.6,dMax:4,family:'norte'});
one('sim-corte','Indicador de corte',SIM,.80,.80,(b,W)=>{const r=W/2;b.circle(r,r,r*.6);b.line(r-r*.6,r,r+r*.6,r);b.poly([[r+r*.6,r],[r,r+r*.95],[r-r*.6,r]],false);b.text(r-r*.15,r-r*.45,'A',r*.35)},{wMin:.3,wMax:2,lockAspect:true});
one('sim-nivel','Nivel de piso ±0,00',SIM,1.20,.40,(b,W,D)=>{b.poly([[0,0],[.20,D*.6],[-.20,D*.6]],true);b.line(-.30,0,W,0);b.text(.30,D*.2,'±0,00',D*.45)},{wMin:.8,wMax:3,dMin:.25,dMax:1});
one('sim-escala','Escala gráfica 0–5 m',SIM,5.0,.50,(b,W,D)=>{for(let i=0;i<5;i++){b.rect(i*W/5,0,W/5,D*.3);if(i%2===0)for(let k=1;k<4;k++)b.line(i*W/5+k*W/20,0,i*W/5+k*W/20,D*.3)}for(let i=0;i<=5;i++)b.text(i*W/5-.06,D*.45,String(Math.round(i*W/5)),D*.3)},{wMin:1,wMax:50,dMin:.3,dMax:2});

/* ===== MÁS VEHÍCULOS (planta) ===== */
one('veh-camion','Camión con caja (planta)',VEH,2.50,8.50,(b,W,D)=>{b.rrect(.05,D-2.20,W-.10,2.20,.20);b.rect(.25,D-1.60,W-.50,.80);b.rect(0,0,W,D-2.35);b.line(0,D-2.35,W,D-2.35);for(const y of [.6,1.9,D-1.7])for(const x of [-.06,W-.04])b.rect(x,y,.10,.60)},{wMin:2.2,wMax:2.6,dMin:6,dMax:12,family:'auto'});
one('veh-colectivo','Colectivo (planta)',VEH,2.55,12.0,(b,W,D)=>{b.rrect(0,0,W,D,.30);b.line(.10,D-1.6,W-.10,D-1.6);const rows=Math.floor((D-3)/.80);for(let i=0;i<rows;i++){const y=.6+i*.80;b.rect(.15,y,.45,.45);b.rect(.65,y,.45,.45);b.rect(W-1.10,y,.45,.45);b.rect(W-.60,y,.45,.45)}b.rect(.15,D-1.40,.60,.60)},{wMin:2.4,wMax:2.6,dMin:8,dMax:14,family:'auto'});
one('veh-pickup','Pickup (planta)',VEH,1.90,5.30,(b,W,D)=>{b.rrect(0,0,W,D,.25);b.rrect(.12,D*.40,W-.24,D*.30,.15);b.rect(.10,.12,W-.20,D*.36);b.line(.10,D*.48,W-.10,D*.48)},{wMin:1.8,wMax:2.1,dMin:4.8,dMax:5.8,family:'auto'});

/* ===== MOTOS Y MAQUINARIA DE OBRA (planta, dibujo propio) ===== */
const OBRA='Obra y maquinaria';
one('veh-moto-calle','Moto de calle (planta)',VEH,.80,2.05,(b,W,D)=>{b.rrect(W/2-.07,0,.14,.55,.06);b.rrect(W/2-.07,D-.55,.14,.55,.06);b.rrect(W/2-.18,.55,.36,D-1.1,.14);b.ellipse(W/2,D*.42,.16,.28);b.line(0,D*.78,W,D*.78);b.circle(0,D*.78,.04);b.circle(W,D*.78,.04);b.rect(W/2-.10,D*.62,.20,.10)},{wMin:.70,wMax:.95,dMin:1.8,dMax:2.3,family:'moto'});
one('veh-scooter','Scooter (planta)',VEH,.70,1.85,(b,W,D)=>{b.rrect(W/2-.06,0,.12,.40,.05);b.rrect(W/2-.06,D-.40,.12,.40,.05);b.rrect(W/2-.22,.35,.44,D*.55,.16);b.rect(W/2-.15,D*.62,.30,.12);b.line(.03,D*.82,W-.03,D*.82)},{family:'moto'});
one('obra-retro','Retroexcavadora (planta)',OBRA,2.40,7.20,(b,W,D)=>{b.rect(0,1.6,W,D-3.2);b.rect(.35,D*.45,1.0,1.1);b.rect(-.1,D-1.6,W+.2,.45);b.poly([[W/2-.15,1.6],[W/2-.15,.5],[W/2-.45,0],[W/2+.45,0],[W/2+.15,.5],[W/2+.15,1.6]],false);for(const y of [1.8,D-2.6])for(const x of [-.25,W-.05])b.rect(x,y,.30,.90)},{wMin:2.2,wMax:2.6,dMin:6,dMax:8.5,family:'maquina'});
one('obra-hormigonera','Camión hormigonero (planta)',OBRA,2.50,9.00,(b,W,D)=>{b.rrect(.05,D-2.2,W-.10,2.2,.2);b.ellipse(W/2,(D-2.4)/2,W/2-.1,(D-2.6)/2);for(let i=1;i<6;i++){const y=.3+i*(D-3)/6;b.line(.35,y,W-.35,y+.4)}for(const y of [.5,1.7,D-1.9])for(const x of [-.06,W-.04])b.rect(x,y,.10,.70)},{wMin:2.3,wMax:2.6,dMin:7,dMax:10.5,family:'maquina'});
one('obra-grua','Grúa torre (planta)',OBRA,2.00,40.0,(b,W,D)=>{b.rect(0,10,W,W);b.line(0,10,W,10+W);b.line(W,10,0,10+W);b.rect(W*.25,0,W*.5,D);for(let y=0;y<D;y+=1.5)b.line(W*.25,y,W*.75,y+1.5);b.rect(-.6,1.0,W+1.2,4.0);b.circle(W/2,10+W/2,D*.98,{dashed:true})},{wMin:1.6,wMax:2.4,dMin:20,dMax:70,family:'maquina'});
one('obra-contenedor','Volquete / contenedor',OBRA,1.80,3.80,(b,W,D)=>{b.rect(0,0,W,D);b.rect(.15,.25,W-.3,D-.5);b.line(.15,.25,W-.15,D-.25,{dashed:true});b.line(W-.15,.25,.15,D-.25,{dashed:true})},{wMin:1.4,wMax:2.4,dMin:2.5,dMax:6});
one('obra-andamio','Andamio (planta)',OBRA,3.00,1.10,(b,W,D)=>{const n=Math.max(1,Math.round(W/1.5));b.rect(0,0,W,D);for(let i=0;i<=n;i++){const x=i*W/n;b.rect(x-.03,-.03,.06,.06);b.rect(x-.03,D-.03,.06,.06)}for(let i=0;i<n;i++)b.line(i*W/n,0,(i+1)*W/n,D,{dashed:true})},{wMin:1.5,wMax:12,dMin:.7,dMax:1.5});
one('obra-obrador','Obrador / casilla',OBRA,2.40,6.00,(b,W,D)=>{b.rect(0,0,W,D);b.rect(.08,.08,W-.16,D-.16);b.line(.08,D*.55,W-.08,D*.55);b.arc(W-.08,D*.55-.90,.80,90,180,{dashed:true});b.rect(.3,D-.75,1.0,.55);b.text(.3,D*.25,'OBRADOR',.22)},{wMin:2,wMax:3,dMin:3,dMax:12});

/* ===== MÁS MOBILIARIO DE DORMITORIO Y ESTAR ===== */
one('dor-mesa-luz','Mesa de luz',DOR,.45,.40,(b,W,D)=>{b.rect(0,0,W,D);b.circle(W/2,D/2,Math.min(W,D)*.22);b.circle(W/2,D/2,Math.min(W,D)*.08)},{wMin:.35,wMax:.65,dMin:.30,dMax:.55});
one('dor-comoda','Cómoda',DOR,1.20,.50,(b,W,D)=>{b.rect(0,0,W,D);b.line(0,.06,W,.06);const n=Math.max(2,Math.round(W/.40));for(let i=1;i<n;i++)b.line(i*W/n,.06,i*W/n,D)},{wMin:.6,wMax:2.4,dMin:.4,dMax:.6});
one('dor-vestidor','Vestidor en L',DOR,2.40,1.80,(b,W,D)=>{b.rect(0,D-.60,W,.60);b.rect(0,0,.60,D-.60);b.line(.05,D-.30,W-.05,D-.30,{dashed:true});b.line(.30,.05,.30,D-.65,{dashed:true})},{wMin:1.6,wMax:4,dMin:1.2,dMax:3,family:'placard'});
one('mob-sofa-L','Sofá en L',MOB,2.80,2.00,(b,W,D)=>{b.poly([[0,0],[W,0],[W,.92],[.92,.92],[.92,D],[0,D]],true);b.rect(.18,.18,W-.36,.56);b.rect(.18,.74,.56,D-.92);b.rect(0,0,W,.18);b.rect(0,0,.18,D);b.line(.92+(W-.92)/2,.18,.92+(W-.92)/2,.74)},{wMin:2.2,wMax:4,dMin:1.6,dMax:3,family:'sofa'});
one('mob-mesa-cafe-red','Mesa de café redonda + 2 sillas',MOB,1.60,.80,(b,W,D)=>{b.circle(W/2,D/2,.35);b.at(.20,D/2,90,F.silla);b.at(W-.20,D/2,-90,F.silla)},{family:'mesa'});
one('mob-piano','Piano de pared',MOB,1.50,.60,(b,W,D)=>{b.rect(0,0,W,D);b.rect(.05,D-.25,W-.10,.20);for(let i=1;i<12;i++)b.line(.05+i*(W-.10)/12,D-.25,.05+i*(W-.10)/12,D-.05);b.rect(W/2-.30,-.45,.60,.35)},{wMin:1.4,wMax:1.6});
one('mob-mesa-ping','Mesa de ping-pong',MOB,1.53,2.74,(b,W,D)=>{b.rect(0,0,W,D);b.line(0,D/2,W,D/2,{width:.25});b.line(W/2,0,W/2,D)},{wMin:1.53,wMax:1.53,dMin:2.74,dMax:2.74});
one('mob-hamaca','Reposera / hamaca',EXT,.70,1.90,(b,W,D)=>{b.rrect(0,0,W,D,.08);b.rect(.06,D*.62,W-.12,D*.34);for(let i=1;i<6;i++)b.line(.06,i*D*.62/6,W-.06,i*D*.62/6)},{wMin:.6,wMax:.8,dMin:1.6,dMax:2.1});
one('mob-banco-plaza','Banco de plaza',EXT,1.80,.60,(b,W,D)=>{b.rect(0,0,W,D);for(let i=1;i<5;i++)b.line(0,i*D/5,W,i*D/5);b.rect(.10,-.05,.08,D+.10);b.rect(W-.18,-.05,.08,D+.10)},{wMin:1,wMax:3});

/* ---------- API ---------- */
function build(id,W,D){
 const d=LIB.find(x=>x.id===id);if(!d)throw Error('Bloque inexistente: '+id);
 const w=clamp(Number(W)||d.w,d.wMin,d.wMax),h=d.lockAspect?w:clamp(Number(D)||d.d,d.dMin,d.dMax);
 const b=new Builder();d.gen(b,w,h);
 const bad=b.out.find(e=>JSON.stringify(e).includes('null')||JSON.stringify(e).includes('NaN'));
 if(bad)throw Error('Geometría inválida en '+id);
 return {entities:b.out,w,d:h};
}
function bounds(entities){
 let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
 const t=p=>{if(!p)return;minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y)};
 for(const e of entities){
  if(e.type==='line'||e.type==='rect'){t(e.a);t(e.b)}
  else if(e.type==='polyline')e.pts.forEach(t);
  else if(e.type==='text')t(e.p);
  else if(e.c){const rx=e.rx||e.r,ry=e.ry||e.r;t({x:e.c.x-rx,y:e.c.y-ry});t({x:e.c.x+rx,y:e.c.y+ry})}
 }
 return {minX,minY,maxX,maxY};
}
const api={library:LIB,build,bounds,categories:[...new Set(LIB.map(x=>x.cat))],Builder,F};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.CAD2D_ARQ_LIBRARY=api;
})(typeof window!=='undefined'?window:globalThis);
