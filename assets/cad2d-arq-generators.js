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

/* ===== CORTES Y VISTAS (alzado lateral y frontal; piso en y=0, dibujo propio) ===== */
const CV='Cortes y vistas';
const piso=(b,W)=>b.line(-.10,0,W+.10,0);
// Sanitarios
one('cv-inodoro-lat','Inodoro · vista lateral',CV,.70,.80,(b,W,D)=>{piso(b,W);b.poly([[.06,0],[.36,0],[.40,.30],[.66,.34],[.68,.40],[.02,.40],[0,.36]],true);b.rrect(.02,.40,.18,.36,.03);b.line(0,.42,.66,.42);b.line(.20,.60,.28,.60)},{wMin:.6,wMax:.8,dMin:.7,dMax:.9,family:'cv-inodoro'});
one('cv-inodoro-fre','Inodoro · vista frontal',CV,.40,.80,(b,W,D)=>{piso(b,W);b.poly([[W*.25,0],[W*.75,0],[W*.85,.32],[W*.15,.32]],true);b.rect(0,.32,W,.08);b.rrect(W*.08,.40,W*.84,.36,.03);b.circle(W*.5,.66,.02)},{wMin:.36,wMax:.45,dMin:.7,dMax:.9,family:'cv-inodoro'});
one('cv-inodoro-susp-lat','Inodoro suspendido · vista lateral',CV,.60,1.10,(b,W,D)=>{piso(b,W);b.rect(0,0,.12,D);b.poly([[.12,.22],[.40,.24],[.58,.36],[.58,.42],[.12,.42]],true);b.line(.12,.44,.56,.44);b.rect(.02,.90,.08,.12)},{family:'cv-inodoro'});
one('cv-bidet-lat','Bidet · vista lateral',CV,.60,.42,(b,W,D)=>{piso(b,W);b.poly([[.04,0],[.30,0],[.36,.32],[.58,.36],[.58,.40],[0,.40]],true);b.circle(.06,.44,.025)},{family:'cv-bidet'});
one('cv-lav-pie-fre','Lavatorio con pie · vista frontal',CV,.55,.90,(b,W,D)=>{piso(b,W);b.poly([[W*.4,0],[W*.6,0],[W*.62,.66],[W*.38,.66]],true);b.poly([[0,.84],[W,.84],[W*.92,.68],[W*.08,.68]],true);b.line(W/2,.84,W/2,.98);b.line(W/2,.98,W/2+.08,.98);b.rect(0,1.05,W,.75)},{wMin:.45,wMax:.70,family:'cv-lav'});
one('cv-lav-lat','Lavatorio · vista lateral',CV,.50,.90,(b,W,D)=>{piso(b,W);b.rect(0,0,.04,1.9);b.poly([[.04,.84],[.48,.84],[.44,.70],[.04,.68]],true);b.poly([[.04,.66],[.12,.66],[.10,0],[.04,0]],true);b.line(.10,.84,.10,.96);b.line(.10,.96,.18,.96)},{family:'cv-lav'});
one('cv-vanitory-fre','Vanitory con espejo · vista frontal',CV,1.00,.90,(b,W,D)=>{piso(b,W);b.rect(0,.10,W,.75);b.rect(0,.85,W,.04);b.line(W/2,.10,W/2,.85);b.circle(W/2-.06,.48,.015);b.circle(W/2+.06,.48,.015);b.rect(W*.25,.89,W*.5,.06);b.line(W/2,.95,W/2,1.05);b.rect(.05,1.10,W-.10,.80)},{wMin:.6,wMax:1.8,family:'cv-lav'});
one('cv-banera-corte','Bañera · corte longitudinal',CV,1.70,.55,(b,W,D)=>{piso(b,W);b.rect(0,0,W,D);b.poly([[.08,.55],[.20,.06],[W-.30,.06],[W-.08,.55]],false);b.line(W-.25,D,W-.25,D+.30);b.line(W-.25,D+.30,W-.12,D+.30)},{wMin:1.4,wMax:2,family:'cv-banera'});
one('cv-ducha-fre','Ducha con mampara · vista frontal',CV,.90,2.10,(b,W,D)=>{piso(b,W);b.rect(0,0,W,.05);b.line(0,.05,0,2.0);b.line(W,.05,W,2.0);b.line(0,2.0,W,2.0);b.line(W*.5,.05,W*.5,2.0,{dashed:true});b.line(W*.3,1.0,W*.3,1.95);b.circle(W*.3,1.98,.06);b.circle(W*.3,1.0,.03)},{wMin:.7,wMax:1.4,family:'cv-ducha'});
one('cv-mingitorio-lat','Mingitorio · vista lateral',CV,.40,1.10,(b,W,D)=>{piso(b,W);b.rect(0,0,.04,1.6);b.poly([[.04,.45],[.36,.52],[.38,.70],[.30,1.05],[.04,1.08]],true)},{family:'cv-ming'});
// Cocina
one('cv-cocina-fre','Mesada con bajo mesada y alacena · vista frontal',CV,2.40,2.20,(b,W,D)=>{piso(b,W);b.rect(0,0,W,.10);b.rect(0,.10,W,.76);b.rect(-.02,.86,W+.04,.04);const n=Math.max(2,Math.round(W/.6));for(let i=1;i<n;i++)b.line(i*W/n,.10,i*W/n,.86);for(let i=0;i<n;i++){b.line(i*W/n+.04,.80,i*W/n+.14,.80)}b.rect(0,1.45,W,.70);for(let i=1;i<n;i++)b.line(i*W/n,1.45,i*W/n,2.15);b.rect(W*.45,.86,W*.22,.04)},{wMin:1.2,wMax:4.8,dMin:2,dMax:2.6,family:'cv-cocina'});
one('cv-cocina-lat','Mesada · corte transversal',CV,.65,2.20,(b,W,D)=>{piso(b,W);b.rect(0,0,.04,2.4);b.rect(.04,.10,.56,.76);b.rect(.04,.86,.60,.04);b.rect(.08,0,.50,.10);b.rect(.04,1.45,.34,.70);b.line(.38,1.45,.38,2.15)},{family:'cv-cocina'});
one('cv-heladera-fre','Heladera · vista frontal',CV,.70,1.80,(b,W,D)=>{piso(b,W);b.rrect(0,.02,W,D-.02,.03);b.line(0,D*.68,W,D*.68);b.line(W-.08,D*.72,W-.08,D*.90);b.line(W-.08,D*.40,W-.08,D*.62)},{wMin:.55,wMax:.95,dMin:1.4,dMax:2,family:'cv-heladera'});
one('cv-cocina-art-fre','Cocina con horno · vista frontal',CV,.60,.90,(b,W,D)=>{piso(b,W);b.rect(0,0,W,.86);b.rect(0,.86,W,.04);b.rect(.06,.12,W-.12,.48);b.rect(.10,.18,W-.20,.34);b.line(.10,.64,W-.10,.64);for(let i=0;i<4;i++)b.circle(.10+i*(W-.20)/3,.76,.025)},{wMin:.5,wMax:.9,family:'cv-cocina'});
// Mobiliario
one('cv-cama-lat','Cama · vista lateral',CV,2.00,.95,(b,W,D)=>{piso(b,W);b.rect(0,0,.06,.95);b.rect(.06,.15,W-.06,.30);b.rect(.06,.45,W-.08,.18);b.rrect(.10,.63,.55,.14,.05);b.line(W-.04,0,W-.04,.15);b.line(.10,0,.10,.15)},{wMin:1.8,wMax:2.2,family:'cv-cama'});
one('cv-sofa-fre','Sofá · vista frontal',CV,2.00,.85,(b,W,D)=>{piso(b,W);b.rrect(0,.10,.20,.55,.05);b.rrect(W-.20,.10,.20,.55,.05);b.rect(.20,.10,W-.40,.32);b.rrect(.20,.42,W-.40,.40,.05);b.line(W/2,.10,W/2,.42);b.line(.08,0,.08,.10);b.line(W-.08,0,W-.08,.10)},{wMin:1.4,wMax:3.2,family:'cv-sofa'});
one('cv-silla-lat','Silla · vista lateral',CV,.48,.90,(b,W,D)=>{piso(b,W);b.line(.04,0,.04,.90);b.line(.42,0,.42,.45);b.rect(.02,.43,.44,.04);b.line(.04,.55,.04,.85);b.rect(.02,.60,.05,.28)},{family:'cv-silla'});
one('cv-mesa-fre','Mesa con sillas · vista frontal',CV,1.80,.90,(b,W,D)=>{piso(b,W);b.rect(0,.72,W,.04);b.line(.08,0,.08,.72);b.line(W-.08,0,W-.08,.72);for(const x of [W*.25,W*.75]){b.rect(x-.22,.43,.44,.04);b.line(x-.18,0,x-.18,.43);b.line(x+.18,0,x+.18,.43);b.rect(x-.22,.47,.44,.43,{dashed:true})}},{wMin:.9,wMax:3,family:'cv-mesa'});
one('cv-escritorio-fre','Escritorio con monitor · vista frontal',CV,1.40,1.20,(b,W,D)=>{piso(b,W);b.rect(0,.72,W,.04);b.rect(W-.45,0,.45,.72);for(let i=1;i<3;i++)b.line(W-.45,i*.24,W,i*.24);b.line(.04,0,.04,.72);b.rect(W*.25,.80,.55,.34);b.line(W*.25+.275,.76,W*.25+.275,.80)},{wMin:1,wMax:2,family:'cv-escritorio'});
one('cv-placard-fre','Placard · vista frontal',CV,1.80,2.40,(b,W,D)=>{piso(b,W);b.rect(0,0,W,D);b.line(0,D-.45,W,D-.45);const n=Math.max(2,Math.round(W/.6));for(let i=1;i<n;i++)b.line(i*W/n,0,i*W/n,D);for(let i=0;i<n;i++)b.line(i*W/n+(i%2?.05:W/n-.05),D*.42,i*W/n+(i%2?.05:W/n-.05),D*.55)},{wMin:.8,wMax:4,dMin:2,dMax:2.8,family:'cv-placard'});
// Vehículos en vista
one('cv-auto-lat','Auto · vista lateral',CV,4.40,1.45,(b,W,D)=>{piso(b,W);b.poly([[.10,.30],[.15,.65],[.90,.75],[1.40,1.38],[3.00,1.40],[3.55,.80],[4.30,.70],[4.38,.30]],true);b.line(1.55,1.30,1.75,.82);b.line(1.75,.82,3.40,.82);b.line(2.45,.82,2.45,1.34);for(const x of [.95,3.55]){b.circle(x,.32,.32);b.circle(x,.32,.18)}},{wMin:3.6,wMax:5.2,family:'cv-auto'});
one('cv-auto-fre','Auto · vista frontal',CV,1.80,1.45,(b,W,D)=>{piso(b,W);b.poly([[.05,.25],[.05,.75],[.30,.85],[.40,1.40],[W-.40,1.40],[W-.30,.85],[W-.05,.75],[W-.05,.25]],true);b.line(.42,1.30,.50,.92);b.line(.50,.92,W-.50,.92);b.line(W-.50,.92,W-.42,1.30);b.rect(.15,.55,.30,.12);b.rect(W-.45,.55,.30,.12);b.rect(W/2-.30,.40,.60,.20);b.rect(.10,0,.20,.25);b.rect(W-.30,0,.20,.25)},{wMin:1.6,wMax:2.1,family:'cv-auto'});
one('cv-camioneta-lat','Camioneta · vista lateral',CV,5.30,1.85,(b,W,D)=>{piso(b,W);b.poly([[.10,.40],[.10,.95],[1.00,1.00],[1.45,1.80],[2.90,1.82],[2.95,1.05],[W-.10,1.05],[W-.05,.40]],true);b.line(1.55,1.70,1.75,1.10);b.line(1.75,1.10,2.85,1.10);for(const x of [1.05,4.20]){b.circle(x,.38,.38);b.circle(x,.38,.22)}},{family:'cv-auto'});
// Símbolos de documentación
one('sim-eje-letra','Banderín de eje (letra)',SIM,.80,3.00,(b,W,D)=>{const r=W/2;b.circle(r,D-r,r);b.line(r,0,r,D-2*r,{dashed:true});b.text(r-r*.30,D-r-r*.32,'A',r*.9)},{wMin:.4,wMax:1.4,dMin:1,dMax:12,family:'sim-eje'});
one('sim-eje-numero','Banderín de eje (número)',SIM,.80,3.00,(b,W,D)=>{const r=W/2;b.circle(r,D-r,r);b.line(r,0,r,D-2*r,{dashed:true});b.text(r-r*.30,D-r-r*.32,'1',r*.9)},{wMin:.4,wMax:1.4,dMin:1,dMax:12,family:'sim-eje'});
one('sim-eje-replanteo','Eje de replanteo con cota',SIM,4.00,.80,(b,W,D)=>{const r=D/2;b.circle(r,r,r);b.circle(W-r,r,r);b.line(2*r,r,W-2*r,r,{dashed:true});b.text(r-r*.3,r-r*.32,'A',r*.9);b.text(W-r-r*.3,r-r*.32,'B',r*.9)},{wMin:1.5,wMax:20,dMin:.4,dMax:1.4,family:'sim-eje'});
one('sim-norte-rosa','Norte · rosa de los vientos',SIM,1.40,1.40,(b,W)=>{const r=W/2;b.circle(r,r,r*.75);for(const [dx,dy] of [[0,1],[1,0],[0,-1],[-1,0]]){b.poly([[r+dx*r*.95,r+dy*r*.95],[r+dy*r*.15,r-dx*r*.15],[r-dy*r*.15,r+dx*r*.15]],true)}b.text(r-r*.12,r+r*1.0,'N',r*.28)},{wMin:.5,wMax:4,lockAspect:true,family:'norte'});
one('sim-norte-simple','Norte · flecha simple',SIM,.60,1.20,(b,W,D)=>{b.poly([[W/2,D*.85],[W*.15,D*.15],[W/2,D*.35],[W*.85,D*.15]],true);b.text(W/2-W*.12,D*.88,'N',W*.4)},{wMin:.3,wMax:2,dMin:.6,dMax:4,family:'norte'});
one('sim-nivel-corte','Cota de nivel (corte)',SIM,1.20,.40,(b,W,D)=>{b.poly([[.20,0],[.05,.18],[.35,.18]],true);b.line(0,0,W,0);b.line(.20,.18,.20,.30);b.line(.20,.30,W,.30);b.text(.40,.33,'+0.00',.12)},{family:'sim-nivel'});
one('sim-nivel-planta','Cota de nivel (planta)',SIM,.80,.80,(b,W,D)=>{const r=W/2;b.circle(r,r,r*.6);b.line(r,r,r,r+r*.6);b.line(r,r,r+r*.6,r);b.text(r+r*.65,r+r*.65,'+0.00',r*.3)},{family:'sim-nivel'});
one('sim-corte-flecha','Indicación de corte A-A',SIM,4.00,.80,(b,W,D)=>{b.line(0,D/2,W,D/2,{dashed:true});for(const x of [0,W]){b.line(x,D/2,x,D);b.poly([[x,D],[x-.12*(x?1:-1),D-.2],[x+.0,D-.2]],true);b.text(x-(x?.25:-.05),.05,'A',.25)}},{wMin:1,wMax:30,family:'sim-corte'});
one('sim-detalle','Llamada de detalle',SIM,1.00,1.00,(b,W,D)=>{const r=W/2;b.circle(r,r,r);b.line(0,r,W,r);b.text(r-r*.25,r+r*.15,'1',r*.5);b.text(r-r*.4,r*.25,'A-01',r*.3)},{wMin:.4,wMax:2,lockAspect:true,family:'sim-detalle'});
one('sim-puerta-num','Número de puerta / local',SIM,.60,.60,(b,W,D)=>{b.rrect(0,0,W,D,W*.2);b.text(W*.2,D*.3,'P1',W*.4)},{wMin:.3,wMax:1.5,lockAspect:true,family:'sim-etiqueta'});

// ---------- Ampliación nov 2026: más cortes, vistas y plantas ----------
// Cortes constructivos y vistas
one('cv-escalera-corte','Escalera · corte',CV,3.00,2.70,(b,W,D)=>{piso(b,W);const n=Math.max(3,Math.round(D/.175)),h=D/n,g=W/n;const pts=[[0,0]];for(let i=0;i<n;i++){pts.push([i*g,(i+1)*h]);pts.push([(i+1)*g,(i+1)*h])}b.poly(pts,false);b.line(0,0,W-.15,D-.15-h*.6);b.line(W-.15,D-.15-h*.6,W,D);b.line(0,.9+h,W,D+.9,{dashed:true})},{wMin:1.5,wMax:6,dMin:1,dMax:4.5,family:'cv-escalera'});
one('cv-muro-corte','Muro de ladrillo · corte',CV,.30,2.80,(b,W,D)=>{b.rect(-.20,-.40,W+.40,.40);b.rect(0,0,W,D);b.line(.015,0,.015,D);b.line(W-.015,0,W-.015,D);for(let y=.06;y<D;y+=.12)b.line(.03,y,W-.03,y);b.rect(-.10,D,W+.20,.12)},{wMin:.10,wMax:.60,dMin:1,dMax:6,family:'cv-muro'});
one('cv-losa-corte','Losa con viga · corte',CV,4.00,.45,(b,W,D)=>{b.rect(0,D-.12,W,.12);b.rect(W*.5-.10,0,.20,D-.12);for(let x=.1;x<W;x+=.2)b.circle(x,D-.09,.008);b.circle(W*.5-.06,.05,.01);b.circle(W*.5+.06,.05,.01)},{wMin:1,wMax:10,dMin:.25,dMax:1,family:'cv-losa'});
one('cv-techo-2aguas','Techo a dos aguas · corte',CV,8.00,2.40,(b,W,D)=>{b.line(0,0,W,0);b.poly([[-.40,-.10],[W/2,D],[W+.40,-.10]],false);b.poly([[-.40,-.25],[W/2,D-.15],[W+.40,-.25]],false);b.line(W/2,0,W/2,D-.15);b.line(W/4,0,W/2,D-.15);b.line(W*3/4,0,W/2,D-.15)},{wMin:3,wMax:20,dMin:.8,dMax:6,family:'cv-techo'});
one('cv-cercha','Cercha de madera · vista',CV,6.00,1.50,(b,W,D)=>{b.line(0,0,W,0);b.line(0,0,W/2,D);b.line(W/2,D,W,0);b.line(W/2,0,W/2,D);b.line(W/4,0,W/2,D);b.line(W*3/4,0,W/2,D);b.line(W/4,0,W/4,D/2);b.line(W*3/4,0,W*3/4,D/2)},{wMin:2,wMax:16,dMin:.5,dMax:5,family:'cv-cercha'});
one('cv-baranda-fre','Baranda · vista frontal',CV,2.00,1.00,(b,W,D)=>{piso(b,W);b.rect(0,D-.05,W,.05);b.line(0,.05,W,.05);const n=Math.max(2,Math.round(W/.12));for(let i=0;i<=n;i++)b.line(i*W/n,.05,i*W/n,D-.05)},{wMin:.6,wMax:8,dMin:.8,dMax:1.4,family:'cv-baranda'});
one('cv-ventana-corte','Ventana · corte por antepecho',CV,.30,1.60,(b,W,D)=>{b.rect(0,0,W,.90);b.poly([[-.05,.90],[W+.05,.90],[W+.05,.93],[-.05,.95]],true);b.rect(W*.35,.95,.06,D-1.05);b.rect(W*.35,D-.10,.06,.10);b.line(W*.38,.95,W*.38,D-.10);b.rect(0,D,W,.25)},{wMin:.15,wMax:.45,dMin:1,dMax:2.6,family:'cv-ventana'});
one('cv-lavarropas-fre','Lavarropas · vista frontal',CV,.60,.85,(b,W,D)=>{piso(b,W);b.rrect(0,0,W,D,.02);b.line(0,D-.12,W,D-.12);b.circle(W/2,D*.42,W*.28);b.circle(W/2,D*.42,W*.20);b.circle(W*.8,D-.06,.02)},{family:'cv-lavarropas'});
one('cv-termotanque-fre','Termotanque · vista frontal',CV,.50,1.30,(b,W,D)=>{piso(b,W);b.rrect(0,.15,W,D-.15,.08);b.line(W*.2,0,W*.2,.15);b.line(W*.8,0,W*.8,.15);b.line(W*.3,D,W*.3,D+.2);b.line(W*.7,D,W*.7,D+.2);b.rect(W*.35,.3,W*.3,.1)},{family:'cv-termo'});
one('cv-split-fre','Aire acondicionado split · vista frontal',CV,.90,.30,(b,W,D)=>{b.rrect(0,0,W,D,.04);b.line(.04,.06,W-.04,.06);b.line(.04,.10,W-.04,.10);b.rect(W-.12,D-.08,.06,.03)},{wMin:.7,wMax:1.2,family:'cv-split'});
one('cv-biblioteca-fre','Biblioteca · vista frontal',CV,1.20,2.00,(b,W,D)=>{piso(b,W);b.rect(0,0,W,D);const n=Math.max(3,Math.round(D/.36));for(let i=1;i<n;i++)b.line(0,i*D/n,W,i*D/n);b.line(W/2,0,W/2,D);for(let i=0;i<n-1;i++)for(let k=0;k<5;k++){const x=.04+k*.05;b.rect(x,i*D/n+.01,.03,D/n*.7)}},{wMin:.6,wMax:3,dMin:1,dMax:2.6,family:'cv-bibl'});
one('cv-mueble-tv-fre','Mueble TV con televisor · vista frontal',CV,1.80,1.40,(b,W,D)=>{piso(b,W);b.rect(0,.05,W,.45);b.line(W/3,.05,W/3,.50);b.line(W*2/3,.05,W*2/3,.50);b.rect(W*.15,.70,W*.70,W*.70*.56);b.rect(W*.17,.72,W*.66,W*.70*.56-.04)},{wMin:1.2,wMax:3,family:'cv-tv'});
one('cv-cama-fre','Cama · vista frontal',CV,1.60,1.00,(b,W,D)=>{piso(b,W);b.rect(0,.15,W,.30);b.rect(.02,.45,W-.04,.18);b.rect(0,0,.05,1.0);b.rect(W-.05,0,.05,1.0);b.line(0,.95,W,.95);b.rrect(.10,.63,W*.4,.14,.05);b.rrect(W*.55,.63,W*.35,.14,.05)},{wMin:.9,wMax:2.0,family:'cv-cama'});
one('cv-sillon-lat','Sillón · vista lateral',CV,.90,.85,(b,W,D)=>{piso(b,W);b.rect(.05,.10,W-.10,.30);b.rrect(0,.10,.20,.75,.05);b.rrect(.20,.40,W-.25,.15,.05);b.line(.08,0,.08,.10);b.line(W-.10,0,W-.10,.10)},{family:'cv-sillon'});
one('cv-moto-lat','Moto · vista lateral',CV,2.00,1.10,(b,W,D)=>{piso(b,W);b.circle(.35,.33,.33);b.circle(W-.35,.33,.33);b.poly([[.35,.33],[.80,.65],[1.30,.65],[W-.35,.33]],false);b.poly([[.70,.75],[1.25,.75],[1.30,.65]],false);b.line(W-.45,.33,W-.60,1.0);b.line(W-.70,1.0,W-.45,1.0)},{family:'cv-moto'});
one('cv-bici-lat','Bicicleta · vista lateral',CV,1.75,1.00,(b,W,D)=>{piso(b,W);b.circle(.35,.35,.34);b.circle(W-.35,.35,.34);b.poly([[.35,.35],[.80,.35],[1.15,.75],[.65,.75],[.35,.35]],false);b.line(.80,.35,.62,.85);b.line(.52,.85,.75,.85);b.line(1.15,.75,W-.35,.35);b.line(1.15,.75,1.10,.95);b.line(1.0,.95,1.22,.95)},{family:'cv-bici'});
one('cv-persona-sentada','Persona sentada · vista lateral',CV,.70,1.30,(b,W,D)=>{piso(b,W);b.circle(.25,1.18,.11);b.poly([[.22,1.06],[.18,.62],[.55,.58],[.58,.10],[.68,.06]],false);b.poly([[.22,1.0],[.40,.80],[.55,.80]],false);b.rect(.05,.42,.45,.04);b.line(.08,0,.08,.42);b.line(.45,0,.45,.42);b.line(.05,.46,.05,.95)},{family:'cv-persona'});
one('cv-escalon-detalle','Escalón · detalle de huella y contrahuella',CV,.60,.40,(b,W,D)=>{b.poly([[0,0],[0,D/2],[W/2,D/2],[W/2,D],[W,D]],false);b.line(-.02,D/2+.02,W/2+.02,D/2+.02);b.line(W/2-.02,D+.02,W+.02,D+.02);b.text(W*.55,D*.15,'h 0.175',.04);b.text(.02,D*.55,'p 0.28',.04)},{family:'cv-escalon'});
one('cv-pileta-corte','Piscina · corte longitudinal',CV,8.00,1.80,(b,W,D)=>{b.line(-.5,D,0,D);b.line(W,D,W+.5,D);b.poly([[0,D],[0,D-1.0],[W*.55,D-1.0],[W*.75,0],[W,0],[W,D]],false);b.poly([[-.15,D],[-.15,D-1.15],[W*.55,D-1.15],[W*.75,-.15],[W+.15,-.15],[W+.15,D]],false);b.line(0,D-.15,W,D-.15,{dashed:true})},{wMin:3,wMax:20,dMin:1,dMax:3,family:'cv-pileta'});
// Plantas
one('ext-pergola','Pérgola (planta)',EXT,4.00,3.00,(b,W,D)=>{for(const [x,y] of [[0,0],[W-.12,0],[0,D-.12],[W-.12,D-.12]])b.rect(x,y,.12,.12);b.rect(-.10,0,.10,D);b.rect(W,0,.10,D);const n=Math.max(3,Math.round(W/.5));for(let i=0;i<=n;i++)b.line(i*W/n,-.10,i*W/n,D+.10,{dashed:true})},{wMin:2,wMax:8,dMin:2,dMax:6,family:'ext-pergola'});
one('ext-deck','Deck de madera (planta)',EXT,3.00,2.00,(b,W,D)=>{b.rect(0,0,W,D);for(let y=.14;y<D;y+=.14)b.line(0,y,W,y)},{wMin:1,wMax:10,dMin:1,dMax:8,family:'ext-deck'});
one('ext-mesa-sombrilla','Mesa de jardín con sombrilla',EXT,2.20,2.20,(b,W,D)=>{const c=W/2;b.circle(c,c,c,{dashed:true});b.circle(c,c,.45);for(let i=0;i<4;i++)b.at(c,c,i*90,bb=>bb.rect(-.22,.55,.44,.40));b.circle(c,c,.03)},{wMin:1.6,wMax:3,lockAspect:true,family:'ext-mesa'});
one('ext-cesped','Cantero con césped (planta)',EXT,3.00,2.00,(b,W,D)=>{b.rrect(0,0,W,D,.15);for(let x=.15;x<W-.1;x+=.3)for(let y=.15;y<D-.1;y+=.3){b.line(x,y,x+.04,y+.08);b.line(x+.06,y,x+.08,y+.08)}},{wMin:1,wMax:10,dMin:1,dMax:10,family:'ext-cesped'});
one('eq-caldera','Caldera mural',EQ,.45,.35,(b,W,D)=>{b.rect(0,0,W,D);b.circle(W/2,D/2,.08);b.line(.08,0,.08,-.10);b.line(W-.08,0,W-.08,-.10)},{family:'eq-caldera'});
one('eq-radiador','Radiador (planta)',EQ,.80,.12,(b,W,D)=>{b.rect(0,0,W,D);const n=Math.max(3,Math.round(W/.08));for(let i=1;i<n;i++)b.line(i*W/n,0,i*W/n,D)},{wMin:.4,wMax:2,family:'eq-radiador'});
one('eq-calefactor','Calefactor tiro balanceado',EQ,.60,.25,(b,W,D)=>{b.rect(0,0,W,D);b.rect(W*.2,D,W*.15,.12);for(let x=.08;x<W-.05;x+=.06)b.line(x,.05,x,D-.05)},{family:'eq-calefactor'});
one('mob-escritorio-L','Escritorio en L con silla',MOB,1.60,1.40,(b,W,D)=>{b.poly([[0,0],[W,0],[W,.70],[.70,.70],[.70,D],[0,D]],true);b.circle(1.05,1.05,.25);b.rect(.15,.08,.40,.05)},{wMin:1.2,wMax:2.4,dMin:1.2,dMax:2.2,family:'mob-escritorio'});
one('mob-estanteria','Estantería abierta',MOB,1.20,.35,(b,W,D)=>{b.rect(0,0,W,D);const n=Math.max(2,Math.round(W/.4));for(let i=1;i<n;i++)b.line(i*W/n,0,i*W/n,D);b.line(0,D/2,W,D/2,{dashed:true})},{wMin:.6,wMax:4,dMin:.25,dMax:.6,family:'mob-estanteria'});
one('mob-puff','Puff redondo',MOB,.50,.50,(b,W)=>{b.circle(W/2,W/2,W/2);b.circle(W/2,W/2,W*.12)},{wMin:.35,wMax:.9,lockAspect:true,family:'mob-puff'});
one('mob-recibidor','Banco recibidor con perchero',MOB,1.00,.40,(b,W,D)=>{b.rect(0,0,W,D);b.line(0,D*.5,W,D*.5);for(let x=.15;x<W;x+=.25)b.circle(x,D+.06,.03)},{wMin:.6,wMax:2,family:'mob-recibidor'});
one('dor-cama-nido','Cama nido 1 plaza',DOR,.90,2.00,(b,W,D)=>{b.rect(0,0,W,D);b.rect(.03,D-.40,W-.06,.32);b.rect(0,0,W,D*.5,{dashed:true});b.line(0,.25,W,.25)},{family:'dor-nido'});
one('dor-escritorio-juvenil','Escritorio juvenil con estante',DOR,1.20,.55,(b,W,D)=>{b.rect(0,0,W,D);b.rect(0,D-.25,W,.25,{dashed:true});b.circle(W/2,-.25,.22)},{wMin:.9,wMax:1.8,family:'dor-escritorio'});
one('san-hidromasaje','Bañera de hidromasaje',SAN,1.80,.90,(b,W,D)=>{b.rrect(0,0,W,D,.08);b.ellipse(W/2,D/2,W/2-.12,D/2-.12);for(const [x,y] of [[.35,.25],[.35,D-.25],[W-.35,.25],[W-.35,D-.25]])b.circle(x,y,.03);b.circle(W-.22,D/2,.03)},{wMin:1.5,wMax:2.2,dMin:.8,dMax:1.6,family:'san-hidro'});
one('san-ducha-doble','Ducha doble con mampara',SAN,1.60,.90,(b,W,D)=>{b.rect(0,0,W,D);b.line(.05,.05,W-.05,D-.05,{dashed:true});b.line(.05,D-.05,W-.05,.05,{dashed:true});b.circle(W*.3,D-.12,.04);b.circle(W*.7,D-.12,.04);b.line(0,-.02,W*.55,-.02)},{wMin:1.2,wMax:2.2,dMin:.8,dMax:1.2,family:'san-ducha'});
// ---------- Bloques en corte/vista de mayor detalle (dibujo propio, nov 2026) ----------
// Curva Bézier cuadrática/cúbica muestreada para perfiles suaves.
const bz=(pts,n=14)=>{const out=[];for(let i=0;i<=n;i++){const t=i/n;let q=pts.map(p=>p.slice());while(q.length>1){q=q.slice(1).map((p,k)=>[q[k][0]+(p[0]-q[k][0])*t,q[k][1]+(p[1]-q[k][1])*t])}out.push(q[0])}return out};
const rueda=(b,x,r)=>{b.circle(x,r,r);b.circle(x,r,r*.62);b.circle(x,r,r*.16);for(let i=0;i<5;i++){const a=i*72*Math.PI/180;b.line(x+Math.cos(a)*r*.2,r+Math.sin(a)*r*.2,x+Math.cos(a)*r*.58,r+Math.sin(a)*r*.58)}};
// Inodoros
one('cv-inodoro-lat-det','Inodoro con mochila · vista lateral (detalle)',CV,.70,.80,(b,W,D)=>{piso(b,W);
 b.poly([...bz([[.22,0],[.20,.16],[.24,.30]]),...bz([[.24,.30],[.46,.30],[.66,.36]]),[.68,.40],[.20,.40]],false);
 b.line(.22,0,.48,0);b.poly(bz([[.48,0],[.50,.16],[.66,.36]]),false);
 b.poly(bz([[.26,.06],[.24,.20],[.34,.27],[.50,.28]],10),false,{dashed:true});
 b.rrect(.18,.40,.52,.025,.01);b.rrect(.18,.425,.50,.03,.012);
 b.rrect(.02,.42,.17,.36,.02);b.rect(.0,.78,.20,.025);b.rect(.08,.805,.04,.015);b.line(.02,.46,.19,.46);
 b.rect(.04,.18,.03,.24)},{family:'cv-inodoro'});
one('cv-inodoro-fre-det','Inodoro con mochila · vista frontal (detalle)',CV,.40,.80,(b,W,D)=>{piso(b,W);const c=W/2;
 b.poly([...bz([[c-.11,0],[c-.12,.18],[c-.19,.36]]),[c+.19,.36],...bz([[c+.19,.36],[c+.12,.18],[c+.11,0]])],false);b.line(c-.11,0,c+.11,0);
 b.rrect(c-.20,.36,.40,.03,.012);b.rrect(c-.19,.39,.38,.03,.012);
 b.rrect(c-.19,.42,.38,.36,.025);b.rect(c-.20,.78,.40,.025);b.circle(c,.79,.012);
 b.line(c-.15,.47,c+.15,.47)},{family:'cv-inodoro'});
one('cv-inodoro-susp-fre','Inodoro suspendido · vista frontal',CV,.36,1.10,(b,W,D)=>{piso(b,W);const c=W/2;
 b.rect(c-.25,0,.50,1.10,{dashed:true});b.rrect(c-.12,.95,.24,.12,.015);b.rect(c-.10,.97,.09,.08);b.rect(c+.01,.97,.09,.08);
 b.poly([...bz([[c-.17,.32],[c-.18,.26],[c-.10,.22]]),[c+.10,.22],...bz([[c+.10,.22],[c+.18,.26],[c+.17,.32]])],false);
 b.rrect(c-.18,.32,.36,.06,.02);b.rrect(c-.17,.38,.34,.03,.012)},{family:'cv-inodoro'});
// Bidets
one('cv-bidet-fre','Bidet · vista frontal',CV,.38,.42,(b,W,D)=>{piso(b,W);const c=W/2;
 b.poly([...bz([[c-.10,0],[c-.11,.18],[c-.18,.34]]),[c+.18,.34],...bz([[c+.18,.34],[c+.11,.18],[c+.10,0]])],false);b.line(c-.10,0,c+.10,0);
 b.rrect(c-.19,.34,.38,.05,.02);b.rect(c-.015,.39,.03,.06);b.poly([[c-.015,.45],[c-.015,.50],[c+.06,.50],[c+.06,.47]],false);b.circle(c-.09,.41,.018);b.circle(c+.09,.41,.018)},{family:'cv-bidet'});
one('cv-bidet-lat-det','Bidet · vista lateral (detalle)',CV,.58,.42,(b,W,D)=>{piso(b,W);
 b.poly([...bz([[.06,0],[.04,.18],[.10,.32]]),...bz([[.10,.32],[.34,.32],[.56,.36]]),[.58,.40],[.02,.40],[.02,.36]],false);
 b.line(.06,0,.34,0);b.poly(bz([[.34,0],[.38,.18],[.56,.36]]),false);b.poly(bz([[.10,.08],[.12,.24],[.40,.28]],8),false,{dashed:true});
 b.rect(.06,.40,.03,.06);b.poly([[.075,.46],[.075,.50],[.16,.50],[.16,.47]],false)},{family:'cv-bidet'});
// Heladeras
one('cv-heladera-lat','Heladera · vista lateral',CV,.70,1.80,(b,W,D)=>{piso(b,W);b.rrect(0,.03,W-.05,D-.03,.03);b.rect(W-.05,.06,.05,D*.66);b.rect(W-.05,D*.68,.05,D*.30);b.line(W,D*.45,W+.03,D*.45);b.line(W+.03,D*.30,W+.03,D*.60);b.line(W,D*.75,W+.03,D*.75);b.line(W+.03,D*.72,W+.03,D*.92);for(let i=1;i<6;i++)b.line(.04,i*.06,.18,i*.06);b.circle(.10,.05,.025);b.circle(W-.15,.05,.025)},{wMin:.55,wMax:.85,dMin:1.4,dMax:2.1,family:'cv-heladera'});
one('cv-heladera-sbs-fre','Heladera side by side · vista frontal',CV,.92,1.80,(b,W,D)=>{piso(b,W);b.rrect(0,.03,W,D-.03,.03);b.line(W*.42,.08,W*.42,D-.02);b.line(W*.36,D*.30,W*.36,D*.72);b.line(W*.48,D*.30,W*.48,D*.72);b.rrect(W*.08,D*.58,W*.24,D*.14,.01);b.circle(W*.20,D*.62,.015);b.rect(.05,.03,W-.10,.05)},{wMin:.85,wMax:1.0,dMin:1.7,dMax:1.9,family:'cv-heladera'});
// Cocina
one('cv-cocina-isla-corte','Isla de cocina con banquetas · corte',CV,1.60,1.10,(b,W,D)=>{piso(b,W);
 b.rect(0,.10,.65,.76);b.rect(0,0,.60,.10);b.rect(-.02,.86,1.10,.04);b.line(.05,.48,.60,.48);
 for(const x of [.78,1.22]){b.line(x,0,x+.04,.62);b.line(x+.30,0,x+.26,.62);b.rrect(x-.02,.62,.34,.05,.02);b.line(x+.02,.25,x+.28,.25);b.line(x+.30,.67,x+.34,.95)}
 b.rrect(.10,.90,.35,.10,.03);b.line(.30,1.0,.30,1.10)},{family:'cv-isla'});
one('cv-cocina-corte-det','Cocina · corte con mesada, alacena y campana',CV,.65,2.40,(b,W,D)=>{piso(b,W);b.rect(0,0,.04,D);
 b.rect(.04,.10,.56,.76);b.rect(.08,0,.50,.10);b.rect(.04,.86,.60,.04);b.line(.08,.48,.56,.48);b.rect(.10,.16,.44,.28);
 b.rect(.04,1.50,.35,.72);b.line(.04,1.86,.39,1.86);b.poly([[.04,1.40],[.50,1.40],[.50,1.46],[.39,1.50]],false);
 b.rrect(.14,.90,.30,.02,.005);b.poly(bz([[.20,.92],[.24,.98],[.36,.98],[.40,.92]],8),false)},{wMin:.55,wMax:.75,dMin:2.1,dMax:2.6,family:'cv-cocina'});
// Autos
one('cv-auto-sedan-lat','Auto sedán · vista lateral (detalle)',CV,4.60,1.45,(b,W,D)=>{piso(b,W);const r=.32;
 b.poly([[.12,.42],...bz([[.12,.42],[.10,.68],[.40,.72]]),[1.15,.80],...bz([[1.15,.80],[1.55,1.38],[2.00,1.40]]),[3.05,1.40],...bz([[3.05,1.40],[3.45,1.38],[3.80,.86]]),[4.40,.80],...bz([[4.40,.80],[4.55,.72],[4.52,.42]])],false);
 b.poly([[.12,.42],[.62,.42]],false);b.arc(.95,r,r+.06,0,180);b.line(1.28,.42,3.20,.42);b.arc(3.55,r,r+.06,0,180);b.line(3.88,.42,4.52,.42);
 rueda(b,.95,r);rueda(b,3.55,r);
 b.poly([[1.30,.86],[1.68,1.30],[2.40,1.32],[2.42,.86]],true);b.poly([[2.50,.86],[2.50,1.32],[3.00,1.32],[3.40,.86]],true);
 b.line(2.46,.45,2.46,1.34);b.line(1.25,.50,1.25,.86);b.line(3.42,.50,3.42,.86);b.rect(2.05,.70,.16,.03);b.rect(3.05,.70,.16,.03);
 b.poly([[1.22,.92],[1.12,.98],[1.12,1.04],[1.24,1.02]],true);b.rect(.14,.55,.18,.08);b.rect(4.38,.58,.14,.10)},{wMin:4.0,wMax:5.2,dMin:1.35,dMax:1.6,family:'cv-auto'});
one('cv-auto-tras','Auto · vista trasera',CV,1.80,1.45,(b,W,D)=>{piso(b,W);
 b.poly([[.06,.20],[.04,.80],...bz([[.04,.80],[.10,.92],[.30,.95]]),...bz([[.30,.95],[.42,1.40],[.60,1.42]]),[W-.60,1.42],...bz([[W-.60,1.42],[W-.42,1.40],[W-.30,.95]]),...bz([[W-.30,.95],[W-.10,.92],[W-.04,.80]]),[W-.06,.20]],false);
 b.line(.06,.20,W-.06,.20);b.rect(.05,0,.24,.22);b.rect(W-.29,0,.24,.22);b.poly([[.40,1.00],[.50,1.34],[W-.50,1.34],[W-.40,1.00]],true);
 b.rect(.08,.66,.30,.14);b.rect(W-.38,.66,.30,.14);b.rect(W/2-.26,.36,.52,.14);b.line(.10,.28,W-.10,.28)},{family:'cv-auto'});
one('cv-pickup-lat','Pickup · vista lateral',CV,5.30,1.80,(b,W,D)=>{piso(b,W);const r=.38;
 b.poly([[.10,.50],[.10,.95],[.95,1.02],[1.45,1.74],[2.75,1.76],[2.85,1.04],[W-.08,1.04],[W-.05,.50]],false);
 b.line(.10,.50,.62,.50);b.arc(1.00,r,r+.06,0,180);b.line(1.44,.50,3.80,.50);b.arc(4.20,r,r+.06,0,180);b.line(4.64,.50,W-.05,.50);
 rueda(b,1.00,r);rueda(b,4.20,r);b.poly([[1.08,1.06],[1.52,1.62],[2.05,1.62],[2.05,1.06]],true);b.poly([[2.15,1.06],[2.15,1.62],[2.70,1.62],[2.72,1.06]],true);
 b.line(2.90,1.04,2.90,.56);b.line(2.10,.58,2.10,1.64);b.rect(.12,.70,.16,.10);b.rect(W-.12,.72,.07,.16)},{wMin:4.8,wMax:6,dMin:1.6,dMax:2,family:'cv-pickup'});
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
  else if(e.type==='polyline'||e.type==='hatch')(e.pts||[]).forEach(t);
  else if(e.type==='text')t(e.p);
  else if(e.c){const rx=e.rx||e.r,ry=e.ry||e.r;t({x:e.c.x-rx,y:e.c.y-ry});t({x:e.c.x+rx,y:e.c.y+ry})}
 }
 return {minX,minY,maxX,maxY};
}
/* ---------- Mobiliario en vista (frente y costado) · dibujo original Blackline ---------- */
const VM='Mobiliario en vista';
const vmOpt=(f,wMin,wMax,dMin,dMax)=>({family:f,wMin,wMax,dMin,dMax});
const manija=(b,x,y,w)=>b.rrect(x,y,w,.018,.009);
// Mesas
one('vm-mesa-comedor-fre','Mesa de comedor · vista frontal',VM,1.60,.75,(b,W,D)=>{piso(b,W);const t=.035;b.rect(0,D-t,W,t);b.rect(.06,D-t-.08,W-.12,.08);for(const x of[.07,W-.13]){b.poly([[x,0],[x+.06,0],[x+.06,D-t-.08],[x,D-t-.08]],true)}},vmOpt('vm-mesa',.8,3.2,.6,1.1));
one('vm-mesa-comedor-lat','Mesa de comedor · vista lateral',VM,.90,.75,(b,W,D)=>{piso(b,W);const t=.035;b.rect(0,D-t,W,t);b.rect(.06,D-t-.08,W-.12,.08);for(const x of[.07,W-.13])b.rect(x,0,.06,D-t-.08)},vmOpt('vm-mesa',.6,1.4,.6,1.1));
one('vm-mesa-redonda-fre','Mesa redonda de pie central · vista frontal',VM,1.10,.75,(b,W,D)=>{piso(b,W);const t=.035;b.rect(0,D-t,W,t);b.rect(W/2-.05,.05,.10,D-t-.05);b.poly([[W/2-.30,0],[W/2+.30,0],[W/2+.12,.05],[W/2-.12,.05]],true);b.rect(W/2-.14,D-t-.04,.28,.04)},vmOpt('vm-mesa',.6,1.8,.6,1.1));
one('vm-mesa-ratona-fre','Mesa ratona · vista frontal',VM,1.10,.42,(b,W,D)=>{piso(b,W);b.rect(0,D-.04,W,.04);b.rect(.04,.12,W-.08,.03);for(const x of[.04,W-.08])b.rect(x,0,.04,D-.04)},vmOpt('vm-mesa',.6,1.8,.3,.6));
one('vm-mesa-luz-fre','Mesa de luz · vista frontal',VM,.50,.55,(b,W,D)=>{piso(b,W);b.rect(0,.06,W,D-.06);b.rect(.03,0,.04,.06);b.rect(W-.07,0,.04,.06);b.line(0,D*.62,W,D*.62);manija(b,W/2-.06,D*.80,.12);manija(b,W/2-.06,D*.38,.12)},vmOpt('vm-mesa-luz',.35,.8,.4,.8));
one('vm-escritorio-lat','Escritorio con silla · vista lateral',VM,1.25,.75,(b,W,D)=>{piso(b,W);b.rect(0,D-.03,.70,.03);b.rect(.02,0,.03,D-.03);b.rect(.65,0,.03,D-.03);b.rect(.18,D-.03,.03,.38);b.rect(.05,D+.35,.30,.22);
 // silla de oficina de costado
 const x=.95;b.rect(x-.22,.44,.44,.07);b.line(x+.18,.51,x+.22,.95);b.rect(x+.16,.62,.06,.36);b.line(x,.44,x,.12);b.line(x-.24,.06,x+.24,.06);b.circle(x-.24,.03,.03);b.circle(x+.24,.03,.03)},vmOpt('vm-escritorio',1,1.8,.7,.8));
// Sillas
one('vm-silla-fre','Silla · vista frontal',VM,.45,.90,(b,W,D)=>{piso(b,W);b.rect(0,.43,W,.04);b.rect(.02,0,.035,.43);b.rect(W-.055,0,.035,.43);b.rect(.02,.47,.035,D-.47);b.rect(W-.055,.47,.035,D-.47);b.rect(.02,D-.16,W-.04,.12);b.line(.055,.62,W-.055,.62)},vmOpt('vm-silla',.4,.6,.8,1.1));
one('vm-silla-brazos-fre','Silla con apoyabrazos · vista frontal',VM,.58,.85,(b,W,D)=>{piso(b,W);b.rect(.06,.42,W-.12,.06);b.rect(.07,0,.04,.42);b.rect(W-.11,0,.04,.42);b.rect(0,.62,.10,.04);b.rect(W-.10,.62,.10,.04);b.rect(.02,.48,.04,.14);b.rect(W-.06,.48,.04,.14);b.rrect(.09,.50,W-.18,D-.50,.04)},vmOpt('vm-silla-brazos',.5,.75,.75,1));
one('vm-silla-brazos-lat','Silla con apoyabrazos · vista lateral',VM,.55,.85,(b,W,D)=>{piso(b,W);b.rect(0,.42,W-.05,.06);b.rect(.02,0,.04,.42);b.rect(W-.12,0,.04,.42);b.poly([[W-.12,.48],[W-.02,D],[W-.07,D],[W-.16,.48]],true);b.rect(.04,.62,W-.12,.04);b.line(.06,.48,.06,.62)},vmOpt('vm-silla-brazos',.45,.7,.75,1));
one('vm-banqueta-fre','Banqueta alta · vista frontal',VM,.40,.75,(b,W,D)=>{piso(b,W);b.rrect(0,D-.06,W,.06,.02);b.line(.05,0,.10,D-.06);b.line(W-.05,0,W-.10,D-.06);b.line(.07,.28,W-.07,.28);b.rect(.03,0,.05,.02);b.rect(W-.08,0,.05,.02)},vmOpt('vm-banqueta',.32,.5,.6,.85));
one('vm-banqueta-lat','Banqueta alta con respaldo · vista lateral',VM,.42,1.00,(b,W,D)=>{piso(b,W);b.rrect(0,.72,W,.06,.02);b.line(.05,0,.10,.72);b.line(W-.05,0,W-.10,.72);b.line(.07,.28,W-.07,.28);b.line(W-.06,.78,W-.02,D);b.rect(W-.07,D-.20,.06,.20)},vmOpt('vm-banqueta',.35,.5,.8,1.1));
one('vm-silla-oficina-fre','Silla de oficina · vista frontal',VM,.62,1.05,(b,W,D)=>{piso(b,W);const c=W/2;b.rrect(c-.25,.45,.50,.08,.03);b.rrect(c-.22,.58,.44,D-.58,.08);b.rect(c-.02,.15,.04,.30);b.line(c-.30,.06,c+.30,.06);b.line(c,.15,c-.30,.06);b.line(c,.15,c+.30,.06);for(const x of[c-.30,c,c+.30])b.circle(x,.03,.03);b.rect(c-.31,.62,.05,.04);b.rect(c+.26,.62,.05,.04);b.line(c-.285,.53,c-.285,.62);b.line(c+.285,.53,c+.285,.62)},vmOpt('vm-silla-oficina',.55,.75,.95,1.25));
one('vm-silla-oficina-lat','Silla de oficina · vista lateral',VM,.62,1.05,(b,W,D)=>{piso(b,W);const c=W/2;b.rrect(c-.24,.45,.48,.08,.03);b.poly([[c+.18,.53],[c+.26,D],[c+.18,D],[c+.12,.56]],true);b.rect(c-.02,.15,.04,.30);b.line(c-.30,.06,c+.30,.06);b.line(c,.15,c-.30,.06);b.line(c,.15,c+.30,.06);b.circle(c-.30,.03,.03);b.circle(c+.30,.03,.03);b.rect(c-.16,.65,.30,.04);b.line(c-.10,.53,c-.10,.65)},vmOpt('vm-silla-oficina',.55,.75,.95,1.25));
one('vm-sillon-fre','Sillón individual · vista frontal',VM,.85,.85,(b,W,D)=>{piso(b,W);b.rect(.04,0,.05,.10);b.rect(W-.09,0,.05,.10);b.rrect(0,.10,.16,.55,.05);b.rrect(W-.16,.10,.16,.55,.05);b.rrect(.14,.10,W-.28,.30,.04);b.rrect(.16,.38,W-.32,.12,.04);b.rrect(.14,.50,W-.28,D-.50,.07)},vmOpt('vm-sillon',.7,1.1,.75,1));
one('vm-sofa-lat','Sofá · vista lateral',VM,.90,.85,(b,W,D)=>{piso(b,W);b.rect(.05,0,.05,.10);b.rect(W-.10,0,.05,.10);b.rrect(0,.10,W,.30,.04);b.rrect(.02,.40,W-.25,.12,.04);b.rrect(W-.25,.10,.25,D-.10,.08);b.rrect(0,.40,.16,.25,.05)},vmOpt('vm-sofa',.75,1.1,.75,1));
one('vm-reposera-lat','Reposera · vista lateral',VM,1.90,.80,(b,W,D)=>{piso(b,W);b.line(.10,0,.20,.30);b.line(W-.30,0,W-.40,.30);b.poly([[0,.30],[W-.65,.30],[W-.15,D],[W-.22,D],[W-.70,.36],[0,.36]],true);b.circle(W-.20,.06,.06)},vmOpt('vm-reposera',1.6,2.1,.6,1));
// Heladeras y electrodomésticos
one('vm-heladera-freezer-fre','Heladera con freezer superior · vista frontal',VM,.70,1.75,(b,W,D)=>{piso(b,W);b.rrect(0,.04,W,D-.04,.02);b.rect(.03,0,.06,.04);b.rect(W-.09,0,.06,.04);const f=D-.50;b.line(0,f,W,f);b.rect(.05,f+.06,.025,.30);b.rect(.05,f-.40,.025,.32);b.line(.03,.10,W-.03,.10)},vmOpt('vm-heladera',.55,.9,1.4,2));
one('vm-heladera-freezer-lat','Heladera con freezer superior · vista lateral',VM,.70,1.75,(b,W,D)=>{piso(b,W);b.rrect(0,.04,W-.04,D-.04,.02);b.rect(W-.04,.06,.04,D-.55);b.rect(W-.04,D-.48,.04,.44);b.rect(.06,0,.06,.04);b.rect(W-.16,0,.06,.04);b.rect(-.03,.20,.03,D-.40,{dashed:true})},vmOpt('vm-heladera',.6,.85,1.4,2));
one('vm-freezer-horizontal-fre','Freezer horizontal · vista frontal',VM,1.10,.85,(b,W,D)=>{piso(b,W);b.rrect(0,.03,W,D-.03,.02);b.line(0,D-.10,W,D-.10);b.rect(W/2-.12,D-.14,.24,.03);b.rect(.04,0,.06,.03);b.rect(W-.10,0,.06,.03);b.rect(W-.20,.12,.12,.06)},vmOpt('vm-freezer',.8,1.6,.8,.95));
one('vm-microondas-fre','Microondas · vista frontal',VM,.50,.30,(b,W,D)=>{b.rrect(0,0,W,D,.015);b.rect(.03,.03,W*.66,D-.06);b.rect(.05,.05,W*.62,D-.10);b.rect(W*.74,.18,W*.20,.07);for(let i=0;i<3;i++)b.circle(W*.84,.06+i*.035,.012)},vmOpt('vm-microondas',.4,.6,.25,.4));
one('vm-horno-empotrado-fre','Horno empotrado · vista frontal',VM,.60,.60,(b,W,D)=>{b.rect(0,0,W,D);b.rect(0,D-.10,W,.10);for(let i=0;i<4;i++)b.circle(.10+i*.08,D-.05,.018);b.rect(W-.16,D-.075,.10,.05);b.rect(.05,.05,W-.10,D-.22);b.rect(.10,.10,W-.20,D-.34);b.rrect(.08,D-.15,W-.16,.025,.012)},vmOpt('vm-horno',.5,.9,.45,.9));
one('vm-lavavajillas-fre','Lavavajillas · vista frontal',VM,.60,.82,(b,W,D)=>{piso(b,W);b.rect(0,.10,W,D-.10);b.rect(.02,0,W-.04,.10);b.rect(0,D-.10,W,.10);b.rrect(W/2-.15,D-.07,.30,.025,.012);for(let i=0;i<3;i++)b.circle(.07+i*.05,D-.05,.012)},vmOpt('vm-lavavajillas',.45,.6,.8,.9));
one('vm-campana-fre','Campana de cocina · vista frontal',VM,.60,.80,(b,W,D)=>{b.rect(W/2-.14,.20,.28,D-.20);b.poly([[0,0],[W,0],[W,.06],[W/2+.14,.20],[W/2-.14,.20],[0,.06]],true);b.line(0,.06,W,.06);for(let i=0;i<3;i++)b.rect(W*.22+i*.06,.015,.035,.025)},vmOpt('vm-campana',.6,1.2,.6,1.2));
// Guardado
one('vm-comoda-fre','Cómoda de 3 cajones · vista frontal',VM,1.00,.85,(b,W,D)=>{piso(b,W);b.rect(0,.08,W,D-.08);b.rect(-.01,D-.03,W+.02,.03);b.rect(.04,0,.05,.08);b.rect(W-.09,0,.05,.08);const h=(D-.11)/3;for(let i=0;i<3;i++){const y=.08+i*h;b.rect(.03,y+.02,W-.06,h-.04);manija(b,W/2-.08,y+h/2-.01,.16)}},vmOpt('vm-comoda',.6,1.6,.6,1.1));
one('vm-ropero-fre','Ropero de 2 puertas · vista frontal',VM,1.00,2.00,(b,W,D)=>{piso(b,W);b.rect(0,.08,W,D-.08);b.line(W/2,.08,W/2,D);b.rect(.02,0,W-.04,.08);b.rect(W/2-.04,D*.45,.015,.30);b.rect(W/2+.025,D*.45,.015,.30);b.line(0,D-.30,W,D-.30)},vmOpt('vm-ropero',.8,2.4,1.8,2.6));
one('vm-tv-pared-fre','Televisor de pared · vista frontal',VM,1.25,.75,(b,W,D)=>{b.rrect(0,0,W,D,.012);b.rect(.02,.03,W-.04,D-.05);b.rect(W/2-.06,-.02,.12,.02)},vmOpt('vm-tv',.8,2,.45,1.2));
// Accesorios
one('vm-lampara-pie','Lámpara de pie · vista frontal',VM,.40,1.60,(b,W,D)=>{piso(b,W);b.poly([[W/2-.15,0],[W/2+.15,0],[W/2+.12,.03],[W/2-.12,.03]],true);b.rect(W/2-.012,.03,.024,D-.33);b.poly([[0,D-.30],[W,D-.30],[W-.08,D],[.08,D]],true)},vmOpt('vm-lampara',.3,.6,1.3,1.9));
one('vm-planta-maceta','Planta en maceta · vista frontal',VM,.60,1.20,(b,W,D)=>{piso(b,W);const c=W/2;b.poly([[c-.17,0],[c+.17,0],[c+.21,.32],[c-.21,.32]],true);b.rect(c-.23,.32,.46,.04);
 for(const [dx,h,s] of [[-.05,D-.05,-1],[.04,D*.85,1],[0,D*.7,-1],[-.02,D*.6,1],[.03,D*.95,-1]]){b.line(c,.36,c+dx,h*.75);b.poly(bz([[c+dx,h*.75],[c+dx+s*.28,h*.82],[c+dx+s*.10,h]]),false);b.poly(bz([[c+dx,h*.75],[c+dx+s*.05,h*.92],[c+dx+s*.10,h]]),false)}},vmOpt('vm-planta',.4,1,0.8,2));
one('vm-mesa-jardin-sombrilla','Mesa de jardín con sombrilla · vista frontal',VM,2.00,2.40,(b,W,D)=>{piso(b,W);const c=W/2;b.rect(c-.45,.70,.90,.03);b.line(c-.40,0,c-.35,.70);b.line(c+.40,0,c+.35,.70);b.rect(c-.02,0,.04,D-.25);b.poly([[0,D-.45],[c,D-.05],[W,D-.45]],true);b.poly(bz([[0,D-.45],[c*.5,D-.52],[c,D-.45]]),false);b.poly(bz([[c,D-.45],[c*1.5,D-.52],[W,D-.45]]),false);
 for(const x of[c-.75,c+.75]){const s=x<c?-1:1;b.rect(x-.20,.43,.40,.04);b.line(x-.16,0,x-.16,.43);b.line(x+.16,0,x+.16,.43);b.line(x+s*.18,.47,x+s*.20,.90)}},vmOpt('vm-jardin',1.6,2.6,2,2.8));
one('vm-perchero','Perchero de pie · vista frontal',VM,.45,1.80,(b,W,D)=>{piso(b,W);const c=W/2;b.line(c-.22,0,c,.12);b.line(c+.22,0,c,.12);b.rect(c-.015,.12,.03,D-.12);for(const s of[-1,1]){b.poly(bz([[c,D-.15],[c+s*.12,D-.10],[c+s*.18,D-.02]]),false);b.poly(bz([[c,D-.40],[c+s*.10,D-.36],[c+s*.15,D-.28]]),false)}},vmOpt('vm-perchero',.35,.6,1.5,2));
/* ---------- Personas en vista: siluetas originales (paradas, caminando, sentadas) ---------- */
// Figura por esqueleto: cada miembro es una cápsula rellena (siluetas limpias, sin líneas cruzadas).
const capsule=(A,B,ra,rb,n=6)=>{const dx=B[0]-A[0],dy=B[1]-A[1],L=Math.hypot(dx,dy)||1e-6,ux=dx/L,uy=dy/L,nx=-uy,ny=ux,pts=[];
 const a0=Math.atan2(ny,nx);for(let i=0;i<=n;i++){const a=a0-Math.PI*i/n;pts.push([B[0]+Math.cos(a)*rb,B[1]+Math.sin(a)*rb])}
 for(let i=0;i<=n;i++){const a=a0+Math.PI-Math.PI*i/n;pts.push([A[0]+Math.cos(a)*ra,A[1]+Math.sin(a)*ra])}return pts};
const solid=(b,pts)=>b.push({type:'hatch',pts:pts.map(p=>b.tp(p[0],p[1])),hatchStyle:'solid'});
function figura(b,j,o={}){
 // j: puntos [x,y] — head, neck, sh (hombro), el, wr, el2, wr2, hip, kn, an, kn2, an2, toe, toe2
 const S=o.s||1,T=p=>[p[0]*S+(o.x||0),p[1]*S];
 const limb=(a,c,ra,rb)=>solid(b,capsule(T(a),T(c),ra*S,rb*S));
 // brazo y pierna del fondo primero
 if(j.kn2){limb(j.hip,j.kn2,.075,.058);limb(j.kn2,j.an2,.056,.04);if(j.toe2)limb(j.an2,j.toe2,.035,.03)}
 if(j.el2){limb(j.sh,j.el2,.045,.038);limb(j.el2,j.wr2,.036,.028)}
 // torso
 const tw=o.front?.18:.11,hw=o.front?.16:.12;
 solid(b,[[j.sh[0]-tw,j.sh[1]+.02],[j.sh[0]+tw,j.sh[1]+.02],[j.hip[0]+hw,j.hip[1]-.02],[j.hip[0]-hw,j.hip[1]-.02]].map(T));
 if(o.skirt)solid(b,[[j.hip[0]-hw,j.hip[1]+.05],[j.hip[0]+hw,j.hip[1]+.05],[j.hip[0]+hw+.10,j.hip[1]-.42],[j.hip[0]-hw-.10,j.hip[1]-.42]].map(T));
 limb(j.neck,j.sh,.05,.06);b.circle(...T(j.head),.105*S);solid(b,capsule(T([j.head[0],j.head[1]-.02]),T([j.head[0],j.head[1]+.02]),.1*S,.1*S,8));
 limb(j.hip,j.kn,.08,.06);limb(j.kn,j.an,.058,.042);if(j.toe)limb(j.an,j.toe,.037,.03);
 if(j.el){limb(j.sh,j.el,.048,.04);limb(j.el,j.wr,.038,.03)}
}
const PV='Personas';
const P_={
 paradoLat:{head:[.02,1.62],neck:[0,1.50],sh:[0,1.40],el:[.01,1.12],wr:[.04,.86],hip:[0,.95],kn:[.01,.50],an:[0,.08],toe:[.17,.03]},
 camina1:{head:[.05,1.61],neck:[.03,1.49],sh:[.02,1.40],el:[.12,1.15],wr:[.22,.95],el2:[-.10,1.16],wr2:[-.20,.95],hip:[0,.93],kn:[.17,.53],an:[.25,.09],toe:[.41,.06],kn2:[-.04,.52],an2:[-.25,.14],toe2:[-.12,.03]},
 camina2:{head:[.05,1.62],neck:[.03,1.50],sh:[.02,1.41],el:[.04,1.13],wr:[.09,.88],el2:[-.03,1.13],wr2:[-.05,.88],hip:[0,.95],kn:[.08,.51],an:[.02,.08],toe:[.19,.03],kn2:[-.02,.55],an2:[-.18,.22],toe2:[-.10,.10]},
 corre:{head:[.14,1.55],neck:[.11,1.44],sh:[.09,1.35],el:[.22,1.15],wr:[.36,1.25],el2:[-.10,1.18],wr2:[-.12,.98],hip:[0,.90],kn:[.30,.68],an:[.24,.28],toe:[.40,.24],kn2:[-.10,.50],an2:[-.36,.36],toe2:[-.42,.22]},
 sentadoLat:{head:[.04,1.27],neck:[.02,1.15],sh:[.01,1.06],el:[.06,.82],wr:[.30,.72],hip:[0,.50],kn:[.44,.52],an:[.44,.08],toe:[.60,.03]},
 sentadoRelax:{head:[-.12,1.20],neck:[-.10,1.09],sh:[-.08,1.00],el:[-.02,.78],wr:[.22,.70],hip:[0,.45],kn:[.45,.55],an:[.62,.12],toe:[.76,.12],kn2:[.42,.52],an2:[.50,.08],toe2:[.64,.03]},
 escritorio:{head:[.10,1.26],neck:[.07,1.15],sh:[.05,1.06],el:[.20,.86],wr:[.44,.76],hip:[0,.50],kn:[.44,.52],an:[.40,.08],toe:[.56,.03]}
};
const F_={
 paradoFre:{head:[0,1.63],neck:[0,1.51],sh:[0,1.42],hip:[0,.95]},
};
const persLat=(id,name,pose,w,d,extra={})=>one(id,name,PV,w,d,(b,W,D)=>{const s=D/1.75;const xs=Object.values(P_[pose]).map(p=>p[0]);const x0=-Math.min(...xs)*s+.12*s;figura(b,P_[pose],{s,x:x0});if(extra.chair){const c=extra.chair;b.rect(x0-.22*s,.43*s,.52*s,.04*s);b.line(x0-.20*s,0,x0-.20*s,.43*s);b.line(x0+.26*s,0,x0+.26*s,.43*s);if(c==='back'){b.line(x0-.21*s,.47*s,x0-.24*s,.92*s)}}if(extra.desk){b.rect(x0+.30*s,.72*s,.80*s,.03*s);b.line(x0+1.06*s,0,x0+1.06*s,.72*s)}},{family:'pers-vista',wMin:w*.5,wMax:w*1.4,dMin:d*.5,dMax:d*1.3});
persLat('pv-parado-lat','Persona parada · vista lateral','paradoLat',.50,1.75);
persLat('pv-camina-1','Persona caminando · paso largo','camina1',.80,1.75);
persLat('pv-camina-2','Persona caminando · paso corto','camina2',.55,1.75);
persLat('pv-corre','Persona corriendo','corre',1.00,1.70);
persLat('pv-sentado-silla','Persona sentada en silla · vista lateral','sentadoLat',.85,1.30,{chair:'back'});
persLat('pv-sentado-relax','Persona sentada relajada · vista lateral','sentadoRelax',1.05,1.25,{chair:'back'});
persLat('pv-sentado-escritorio','Persona trabajando en escritorio · vista lateral','escritorio',1.40,1.30,{chair:'back',desk:true});
// Vistas frontales (simétricas)
const frontal=(b,s,o)=>{const L=(a,c,ra,rb)=>solid(b,capsule([a[0]*s+o.x,a[1]*s],[c[0]*s+o.x,c[1]*s],ra*s,rb*s));
 const sit=o.sit;const hip=sit?.50:.95;
 // piernas
 for(const k of[-1,1]){if(sit){L([.09*k,hip],[.12*k,.50],.08,.065);L([.12*k,.48],[.12*k,.08],.06,.045)}else if(!o.skirt){L([.09*k,hip],[.10*k,.50],.085,.06);L([.10*k,.50],[.10*k,.08],.058,.042)}else{L([.07*k,.55],[.08*k,.08],.05,.04)}
  solid(b,capsule([.10*k*s+o.x+.02*k*s,.04*s],[.10*k*s+o.x+.05*k*s,.04*s],.035*s,.035*s))}
 const top=hip+.47;
 solid(b,[[-.20,top],[.20,top],[.16,hip-.02],[-.16,hip-.02]].map(p=>[p[0]*s+o.x,p[1]*s]));
 if(o.skirt)solid(b,[[-.16,hip+.05],[.16,hip+.05],[.25,hip-.42],[-.25,hip-.42]].map(p=>[p[0]*s+o.x,p[1]*s]));
 for(const k of[-1,1]){L([.20*k,top-.02],[.25*k,top-.30],.05,.042);if(o.armsIn)L([.25*k,top-.30],[.08*k,top-.38],.04,.03);else L([.25*k,top-.30],[.27*k,top-.56],.04,.03)}
 L([0,top],[0,top+.08],.05,.05);b.circle(o.x,(top+.20)*s,.105*s);solid(b,capsule([o.x,(top+.18)*s],[o.x,(top+.22)*s],.1*s,.1*s,8));
};
one('pv-parado-fre','Persona parada · vista frontal',PV,.60,1.75,(b,W,D)=>{const s=D/1.75;frontal(b,s,{x:W/2})},{family:'pers-vista',wMin:.4,wMax:.9,dMin:.9,dMax:2.1});
one('pv-parada-falda-fre','Persona con falda · vista frontal',PV,.60,1.70,(b,W,D)=>{const s=D/1.75;frontal(b,s,{x:W/2,skirt:true})},{family:'pers-vista',wMin:.4,wMax:.9,dMin:.9,dMax:2.1});
one('pv-brazos-cruzados-fre','Persona con manos adelante · vista frontal',PV,.60,1.75,(b,W,D)=>{const s=D/1.75;frontal(b,s,{x:W/2,armsIn:true})},{family:'pers-vista',wMin:.4,wMax:.9,dMin:.9,dMax:2.1});
one('pv-sentado-fre','Persona sentada · vista frontal',PV,.60,1.30,(b,W,D)=>{const s=D/1.30;frontal(b,s,{x:W/2,sit:true});b.rect(W/2-.24*s,.43*s,.48*s,.04*s)},{family:'pers-vista',wMin:.4,wMax:.9,dMin:.8,dMax:1.6});
one('pv-grupo-fre','Grupo de tres personas · vista frontal',PV,1.70,1.75,(b,W,D)=>{const s=D/1.75;frontal(b,s,{x:.32*s});frontal(b,s*.96,{x:.85*s,skirt:true});frontal(b,s*.62,{x:1.35*s})},{family:'pers-vista',wMin:1.2,wMax:2.4,dMin:1.2,dMax:2.1});

/* Diseño contemporáneo 2026: biblioteca original de equipamiento en planta.
 * Cada objeto se regenera al modificar W/D (pinzas ARQ), en metros y con detalles reales
 * de planta. No se incluyen bloques ni marcas de terceros. */
const MOD='Diseño contemporáneo',MOD_ARQ='Carpintería contemporánea',MOD_EXT='Paisajismo contemporáneo';
const modRange=(family,wMin,wMax,dMin,dMax)=>({family,wMin,wMax,dMin,dMax,pro:true});
const ellipseSeat=(b,x,y,rx,ry)=>{b.ellipse(x,y,rx,ry);b.ellipse(x,y,rx*.86,ry*.82)};
const barLine=(b,x,y,w,h)=>b.rrect(x,y,w,h,Math.min(.03,h/2,w/2));
one('modern-sofa-3','Sofá modular de 3 cuerpos',MOD,2.70,1.05,(b,W,D)=>{
 b.rrect(0,0,W,D,.09);b.rrect(.09,.10,W-.18,D-.29,.07);
 b.rrect(.02,.10,.17,D-.18,.04);b.rrect(W-.19,.10,.17,D-.18,.04);
 b.rrect(.16,D-.25,W-.32,.20,.07);
 for(let i=1;i<3;i++)b.line(.17+(W-.34)*i/3,.14,.17+(W-.34)*i/3,D-.26);
},modRange('modern-sofa',2.00,3.50,.88,1.20));
one('modern-sofa-chaise','Sofá con chaise longue',MOD,3.00,1.70,(b,W,D)=>{
 const ch=Math.min(1.02,W*.34),base=Math.min(1.02,D*.65);
 b.rrect(0,0,W,base,.075);b.rrect(0,base-.09,ch,D-base+.09,.06);
 b.rrect(.07,.09,W-.14,base-.28,.05);b.rrect(.08,base+.03,ch-.16,D-base-.12,.06);
 b.rrect(.08,.02,.13,base-.04,.035);b.rrect(W-.21,.02,.13,base-.04,.035);
 b.rrect(.18,base-.18,W-.36,.12,.035);
 for(let i=1;i<=2;i++){const x=ch+(W-ch)*i/3;b.line(x,.15,x,base-.19)}
},modRange('modern-sofa',2.50,3.80,1.35,2.00));
one('modern-sofa-curvo','Sofá curvo de diseño',MOD,2.50,1.15,(b,W,D)=>{
 const n=24,outer=[],inner=[];for(let i=0;i<=n;i++){
  const t=Math.PI*i/n,x=.12+(W-.24)*i/n,y=D*.37+Math.sin(t)*D*.53;
  outer.push([x,y]);inner.push([x,D*.19+Math.sin(t)*D*.32]);
 }
 b.poly(outer.concat(inner.reverse()),true);b.poly(outer,false);b.line(.12,D*.20,W-.12,D*.20);
 for(let i=1;i<=3;i++){const x=.12+(W-.24)*i/4;b.line(x,D*.25,x,D*.35+Math.sin(Math.PI*i/4)*D*.35)}
},modRange('modern-sofa',2.10,3.30,.95,1.45));
one('modern-sillon-organico','Sillón lounge orgánico',MOD,.90,.90,(b,W,D)=>{
 ellipseSeat(b,W/2,D*.50,W*.43,D*.43);b.arc(W/2,D*.57,Math.min(W,D)*.34,18,162);
 b.ellipse(W*.11,D*.49,W*.08,D*.20);b.ellipse(W*.89,D*.49,W*.08,D*.20);
},modRange('modern-lounge',.75,1.20,.75,1.15));
one('modern-silla-carcasa','Silla de carcasa curvada',MOD,.56,.54,(b,W,D)=>{
 b.rrect(.04,.04,W-.08,D-.08,.08);b.rrect(.08,.09,W-.16,D*.55,.08);
 b.arc(W/2,D*.58,Math.min(W*.42,D*.38),5,175);
 b.line(.10,D-.06,W-.10,D-.06);
},modRange('modern-silla',.48,.70,.48,.70));
one('modern-silla-cantilever','Silla de diseño en voladizo',MOD,.55,.60,(b,W,D)=>{
 b.rrect(.06,.06,W-.12,D-.14,.07);b.rrect(.08,D*.68,W-.16,D*.20,.04);
 b.line(.10,.08,.10,D-.10);b.line(W-.10,.08,W-.10,D-.10);
 b.line(.10,.08,W-.10,.08);
},modRange('modern-silla',.49,.75,.55,.75));
one('modern-mesa-oval','Mesa comedor ovalada',MOD,2.20,1.00,(b,W,D)=>{
 b.ellipse(W/2,D/2,W/2-.02,D/2-.02);b.ellipse(W/2,D/2,W/2-.085,D/2-.085);
 b.circle(W/2,D/2,.08);b.line(W/2-.28,D/2,W/2+.28,D/2);
},modRange('modern-mesa-comedor',1.60,3.20,.80,1.30));
one('modern-mesa-pedestal','Mesa redonda con pedestal',MOD,1.30,1.30,(b,W,D)=>{
 const r=Math.min(W,D)/2-.025;b.circle(W/2,D/2,r);b.circle(W/2,D/2,r-.045);
 b.circle(W/2,D/2,Math.min(.22,r*.45));b.circle(W/2,D/2,.055);
},modRange('modern-mesa-comedor',.90,1.80,.90,1.80));
one('modern-banco','Banco tapizado contemporáneo',MOD,1.80,.52,(b,W,D)=>{
 b.rrect(0,0,W,D,.05);b.rrect(.06,.07,W-.12,D-.14,.05);
 for(let i=1;i<4;i++)b.line(W*i/4,.08,W*i/4,D-.08);
},modRange('modern-banco',1.10,2.80,.44,.70));
one('modern-mesas-nido','Mesas ratonas anidadas',MOD,1.30,.85,(b,W,D)=>{
 b.ellipse(W*.34,D*.49,W*.31,D*.44);b.ellipse(W*.73,D*.46,W*.24,D*.34);
 b.ellipse(W*.34,D*.49,W*.265,D*.37);b.ellipse(W*.73,D*.46,W*.195,D*.29);
},modRange('modern-mesas-nido',1.05,1.90,.70,1.20));
one('modern-buffet','Aparador bajo de diseño',MOD,2.10,.48,(b,W,D)=>{
 b.rrect(0,0,W,D,.025);b.rrect(.03,.04,W-.06,D-.08,.02);
 for(let i=1;i<4;i++)b.line(W*i/4,.04,W*i/4,D-.04);
 for(let i=0;i<4;i++)barLine(b,W*(i+.5)/4-.055,D*.70,.11,.018);
},modRange('modern-guardado',1.20,3.00,.40,.65));
one('modern-mueble-tv','Consola multimedia flotante',MOD,2.20,.45,(b,W,D)=>{
 b.rrect(0,0,W,D,.02);b.line(.06,D*.5,W-.06,D*.5);
 for(let i=1;i<3;i++)b.line(W*i/3,.03,W*i/3,D-.03);
 for(let i=0;i<3;i++)barLine(b,W*(i+.5)/3-.05,D*.65,.10,.016);
},modRange('modern-guardado',1.30,3.40,.36,.65));
one('modern-escritorio','Escritorio moderno con gestión de cables',MOD,1.60,.75,(b,W,D)=>{
 b.rrect(0,0,W,D,.035);b.rrect(.04,.04,W-.08,D-.08,.025);
 b.rect(W-.44,.08,.34,D-.16);b.circle(W*.55,D-.09,.032);
 for(let i=0;i<2;i++)barLine(b,W-.395,D*.30+i*.20,.22,.015);
},modRange('modern-escritorio',1.20,2.40,.65,1.00));
one('modern-puestos-4','Cowork · cuatro estaciones',MOD,3.20,1.75,(b,W,D)=>{
 b.rrect(.10,.10,W-.20,D-.20,.03);b.line(W/2,.10,W/2,D-.10);b.line(.10,D/2,W-.10,D/2);
 for(let j=0;j<2;j++)for(let i=0;i<2;i++){
  const cx=W*(i+.25)/2,cy=D*(j+.25)/2;
  b.rrect(cx-.18,cy-.08,.36,.16,.02);b.circle(cx,cy+.15,.035);
 }
},modRange('modern-cowork',2.80,4.60,1.50,2.20));
one('modern-cama-plataforma','Cama plataforma contemporánea',MOD,1.90,2.20,(b,W,D)=>{
 b.rrect(0,0,W,D,.035);b.rrect(.09,.12,W-.18,D-.26,.06);
 b.rrect(.06,D-.23,W-.12,.18,.045);b.line(W/2,.14,W/2,D-.24);
 for(let i=0;i<2;i++)b.rrect(.14+i*(W-.28)/2,D*.68,(W-.30)/2,D*.18,.07);
},modRange('modern-cama',1.55,2.40,2.05,2.55));
one('modern-placard','Placard contemporáneo de hojas corredizas',MOD,2.40,.65,(b,W,D)=>{
 b.rect(0,0,W,D);b.rect(.035,.035,W-.07,D-.07);
 b.line(W/2,.035,W/2,D-.035);b.line(.035,D*.28,W-.035,D*.28);
 b.line(.035,D*.72,W-.035,D*.72);
 barLine(b,W/2-.17,D*.35,.11,.018);barLine(b,W/2+.06,D*.59,.11,.018);
},modRange('modern-placard',1.40,4.00,.55,.80));
one('modern-isla-cocina','Isla de cocina con 3 banquetas',MOD,2.40,1.35,(b,W,D)=>{
 const dep=D*.68;b.rrect(.07,.06,W-.14,dep-.10,.04);
 b.rrect(.15,.13,W*.42,dep-.25,.07);b.circle(W*.36,dep*.43,.028);
 for(let j=0;j<4;j++){const x=W*.67+(j%2)*W*.10,y=dep*.30+Math.floor(j/2)*dep*.23;b.circle(x,y,.055);b.circle(x,y,.025)}
 for(let i=1;i<=3;i++)ellipseSeat(b,W*i/4,D*.83,.19,.17);
},modRange('modern-cocina',1.80,3.80,1.15,1.70));
one('modern-peninsula','Península de cocina con barra',MOD,2.40,1.00,(b,W,D)=>{
 b.rrect(0,0,W,D*.67,.035);b.rrect(.08,.08,W*.40,D*.67-.16,.05);
 for(let i=1;i<=3;i++)ellipseSeat(b,W*i/4,D*.84,.16,.12);
 b.line(.035,D*.61,W-.035,D*.61);
},modRange('modern-cocina',1.75,3.70,.85,1.40));
one('modern-vanitory','Vanitory suspendido de doble bacha',MOD,1.50,.53,(b,W,D)=>{
 b.rrect(0,0,W,D,.035);b.line(.05,.06,W-.05,.06);
 for(let i=0;i<2;i++){const x=W*(i+.5)/2;b.ellipse(x,D*.56,Math.min(.21,W*.17),D*.25);b.circle(x,D*.56,.02);b.circle(x,.08,.014)}
},modRange('modern-bano',1.10,2.40,.45,.62));
one('modern-ducha','Ducha walk-in con mampara',MOD,1.50,.95,(b,W,D)=>{
 b.rect(0,0,W,D);b.line(.04,.04,W-.04,D-.04,{dashed:true});b.line(.04,D-.04,W-.04,.04,{dashed:true});
 b.circle(W*.20,D*.80,.055);barLine(b,W*.70,.07,W*.20,.035);
 b.line(0,D,W*.72,D,{width:.20});
},modRange('modern-bano',1.10,2.10,.85,1.30));
one('modern-banera','Bañera exenta ovalada',MOD,1.80,.80,(b,W,D)=>{
 b.ellipse(W/2,D/2,W/2-.02,D/2-.02);b.ellipse(W/2,D/2,W/2-.10,D/2-.10);
 b.circle(W*.81,D/2,.035);b.circle(W*.88,D/2,.018);
},modRange('modern-bano',1.50,2.20,.70,1.00));
one('modern-macetero','Macetero lineal con vegetación',MOD_EXT,2.00,.60,(b,W,D)=>{
 b.rrect(0,0,W,D,.05);b.rrect(.04,.04,W-.08,D-.08,.045);
 const n=Math.max(2,Math.floor(W/.32));for(let i=0;i<n;i++){
  const x=W*(i+.5)/n; b.circle(x,D/2,Math.min(D*.28,W/n*.30));b.circle(x,D/2,.045)
 }
},modRange('modern-macetero',1.00,4.50,.45,.90));
one('modern-pergola','Pérgola contemporánea · lamas',MOD_EXT,4.00,2.80,(b,W,D)=>{
 b.rect(0,0,W,D);
 for(let i=0;i<4;i++)b.rect(.08+i*(W-.25)/3-.04,.08,.08,D-.16);
 for(let j=0;j<Math.max(3,Math.round(D/.35));j++){const y=D*(j+.5)/Math.max(3,Math.round(D/.35));b.line(.06,y,W-.06,y,{width:.12})}
 for(const x of[.10,W-.10])for(const y of[.10,D-.10])b.circle(x,y,.045);
},modRange('modern-pergola',2.40,8.00,2.00,5.00));
one('modern-arbol-irregular','Árbol frondoso · copa natural',MOD_EXT,3.80,3.80,(b,W,D)=>{
 const cx=W/2,cy=D/2,n=40,pts=[];for(let i=0;i<n;i++){const a=i/n*2*Math.PI,r=(.41+.035*Math.sin(i*2.7)+.025*Math.cos(i*4.1));pts.push([cx+W*r*Math.cos(a),cy+D*r*Math.sin(a)])}
 b.poly(pts,true);b.circle(cx,cy,.16);for(let i=0;i<8;i++){const a=i*Math.PI/4;b.line(cx,cy,cx+W*.31*Math.cos(a),cy+D*.31*Math.sin(a))}
},modRange('modern-arbol',2.50,6.50,2.50,6.50));
one('modern-puerta-pivot','Puerta pivotante de acceso · planta',MOD_ARQ,1.30,.98,(b,W,D)=>{
 b.rect(0,0,.06,.17);b.rect(W-.06,0,.06,.17);
 const pivot=.25;b.circle(pivot,.12,.025);b.line(pivot,.12,W-.08,.12);
 b.arc(pivot,.12,Math.min(W*.65,D*.75),0,86,{dashed:true});
},modRange('modern-puerta',1.10,1.80,.90,1.60));
one('modern-puerta-triple','Corredera triple · planta',MOD_ARQ,3.60,.26,(b,W,D)=>{
 b.rect(0,0,W,D);for(let j=0;j<3;j++){
  const y=D*(j+.5)/3;b.line(.06,y,W-.06,y);
  b.line(.06+(W-.12)*j/3,y,.06+(W-.12)*(j+1)/3,y,{width:.16});
 }
},modRange('modern-corredera',2.40,6.50,.20,.40));

const api={library:LIB,build,bounds,categories:[...new Set(LIB.map(x=>x.cat))],Builder,F};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.CAD2D_ARQ_LIBRARY=api;
})(typeof window!=='undefined'?window:globalThis);
