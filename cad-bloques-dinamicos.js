/* CAD2D3D · Espacio de edición de bloques dinámicos (Nov 2026). Implementación propia.
 *
 * Al entrar al editor de bloques (EDITARBLOQUE / BEDIT, o BLOQUENUEVO) el dibujo pasa a un espacio
 * propio con su paleta de autoría:
 *   Parámetros + acciones: LINEAL·ESTIRAR, LINEAL·MOVER, SIMETRÍA, ROTACIÓN.
 *   Estados de visibilidad: crear, renombrar, borrar, ocultar / mostrar la selección.
 *   Probar el bloque sin salir del editor, guardar y cerrar.
 * En el dibujo, cada inserción muestra pinzamientos propios (flecha, simetría, giro, visibilidad)
 * y sus valores se editan también en Propiedades. Los valores viven en la referencia (ref.dyn);
 * la definición guarda los parámetros (def.dyn). Las coordenadas son las del bloque (base = 0,0).
 */
(function(){
'use strict';
const CORE=window.CAD2D_CORE,EXT=window.CAD2D_EXTENSIONS,PLUS=window.CAD2D_PLUS;
if(!CORE||!EXT||!PLUS||!PLUS.pick)return;
const P=(x,y)=>({x,y}),S=()=>CORE.state,$=id=>document.getElementById(id);
const clone=o=>JSON.parse(JSON.stringify(o));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const job=()=>CORE.blockEdit?.()||null;
const uid=p=>p+Math.random().toString(36).slice(2,8)+Date.now().toString(36).slice(-3);
const L=(es,en)=>document.documentElement.lang==='en'?en:es;
const fmt=v=>String(+Number(v).toFixed(4)).replace('.',',');

/* ---------------- Geometría ---------------- */
function mapPoints(e,fn){
 for(const k of ['a','b','c','p'])if(e[k]&&Number.isFinite(e[k].x))e[k]=fn(e[k]);
 if(Array.isArray(e.pts))e.pts=e.pts.map(fn);
 if(Array.isArray(e.holes))e.holes=e.holes.map(h=>h.map(fn));
 return e;
}
function inFrame(p,f){return p.x>=f.minX-1e-9&&p.x<=f.maxX+1e-9&&p.y>=f.minY-1e-9&&p.y<=f.maxY+1e-9}
function unitOf(par){const dx=par.b.x-par.a.x,dy=par.b.y-par.a.y,L=Math.hypot(dx,dy)||1;return {u:P(dx/L,dy/L),L}}
function valueOf(par,ref){
 const v=ref?.dyn?.[par.id];
 if(par.kind==='linear'){const L=unitOf(par).L,n=Number(v);return Number.isFinite(n)&&n>0?n:L}
 if(par.kind==='flip')return !!v;
 if(par.kind==='rotation'){const n=Number(v);return Number.isFinite(n)?n:0}
 return v;
}
function clampLinear(par,v){
 let x=Number(v);if(!Number.isFinite(x))return unitOf(par).L;
 if(par.inc>0)x=Math.round(x/par.inc)*par.inc;
 if(par.min>0)x=Math.max(par.min,x);if(par.max>0)x=Math.min(par.max,x);
 return Math.max(1e-6,x);
}
function reflectAcross(a,b){
 const {u}=unitOf({a,b});
 return p=>{const d=P(p.x-a.x,p.y-a.y),t=d.x*u.x+d.y*u.y;return P(a.x+2*t*u.x-d.x,a.y+2*t*u.y-d.y)};
}
function rotateAbout(c,deg){
 const t=deg*Math.PI/180,co=Math.cos(t),si=Math.sin(t);
 return p=>P(c.x+(p.x-c.x)*co-(p.y-c.y)*si,c.y+(p.x-c.x)*si+(p.y-c.y)*co);
}
/* Aplica la visibilidad y las acciones de la definición a una referencia. Devuelve geometría en coordenadas del bloque. */
function apply(def,ref){
 const dyn=def.dyn;let list=clone(def.entities||[]);
 if(!dyn)return list;
 const vis=dyn.vis;
 if(vis?.states?.length){
  const st=vis.states.includes(ref?.dyn?.__vis)?ref.dyn.__vis:vis.states[0],hidden=new Set(vis.hidden?.[st]||[]);
  list=list.filter(e=>!hidden.has(e.dk));
 }
 for(const par of dyn.params||[]){
  const keys=new Set(par.keys||[]),targets=list.filter(e=>keys.has(e.dk));if(!targets.length)continue;
  if(par.kind==='linear'){
   const {u,L}=unitOf(par),v=clampLinear(par,valueOf(par,ref)),dx=(v-L)*u.x,dy=(v-L)*u.y;
   if(Math.abs(v-L)<1e-12)continue;
   const move=p=>P(p.x+dx,p.y+dy);
   for(const e of targets){
    if(par.action==='move'){mapPoints(e,move);continue}
    const f=par.frame;if(!f)continue;
    if(e.type==='rect'){
     // Un rectángulo se estira como polilínea cerrada para mover sólo las esquinas dentro del marco.
     const a=e.a,b=e.b;e.type='polyline';e.pts=[P(a.x,a.y),P(b.x,a.y),P(b.x,b.y),P(a.x,b.y)];e.closed=true;delete e.a;delete e.b;
    }
    if(e.type==='circle'||e.type==='arc'||e.type==='ellipse'||e.type==='text'||e.type==='point'){const k=e.c?'c':'p';if(e[k]&&inFrame(e[k],f))e[k]=move(e[k]);continue}
    mapPoints(e,p=>inFrame(p,f)?move(p):p);
   }
  }else if(par.kind==='flip'){
   if(!valueOf(par,ref))continue;
   const R=reflectAcross(par.a,par.b),th=Math.atan2(par.b.y-par.a.y,par.b.x-par.a.x);
   for(const e of targets){
    mapPoints(e,R);
    if(e.type==='arc'){const a0=e.a0,a1=e.a1;e.a0=2*th-a1;e.a1=2*th-a0}
    if(e.type==='ellipse')e.rotation=2*th-(Number(e.rotation)||0);
    // Los textos no se espejan: quedan legibles, como es habitual.
   }
  }else if(par.kind==='rotation'){
   const d=valueOf(par,ref);if(!d)continue;
   const R=rotateAbout(par.c,d),rad=d*Math.PI/180;
   for(const e of targets){
    mapPoints(e,R);
    if(e.type==='arc'){e.a0+=rad;e.a1+=rad}
    if(e.type==='ellipse')e.rotation=(Number(e.rotation)||0)+rad;
    if(e.type==='text')e.rotation=(Number(e.rotation)||0)+d;
    if(e.type==='rect'){const a=e.a,b=e.b;e.type='polyline';e.pts=[P(a.x,a.y),P(b.x,a.y),P(b.x,b.y),P(a.x,b.y)].map(R);e.closed=true;delete e.a;delete e.b}
   }
  }
 }
 return list;
}

/* ---------------- Referencia ↔ mundo ---------------- */
function refScale(ref){const k=Number(ref.scale)||1;return {x:k*(Number.isFinite(Number(ref.scaleX))?Number(ref.scaleX):1)*(ref.flipBlockX?-1:1),y:k*(Number.isFinite(Number(ref.scaleY))?Number(ref.scaleY):1)}}
function toWorld(ref,p){const s=refScale(ref),t=(Number(ref.rotation)||0)*Math.PI/180,x=p.x*s.x,y=p.y*s.y;return P(ref.p.x+x*Math.cos(t)-y*Math.sin(t),ref.p.y+x*Math.sin(t)+y*Math.cos(t))}
function toBlock(ref,w){const s=refScale(ref),t=(Number(ref.rotation)||0)*Math.PI/180,dx=w.x-ref.p.x,dy=w.y-ref.p.y,x=dx*Math.cos(t)+dy*Math.sin(t),y=-dx*Math.sin(t)+dy*Math.cos(t);return P(x/s.x,y/s.y)}

/* ---------------- Pinzamientos en el dibujo ---------------- */
function dynRef(){
 const st=S();if((job()&&!A?.testing)||st.selected.length!==1)return null;
 const ref=st.entities.find(e=>e.id===st.selected[0]);
 if(!ref||ref.type!=='blockRef'||ref.cadHidden)return null;
 const def=st.blocks?.[ref.blockName];if(!def?.dyn)return null;
 if(CORE.layerFor(ref).locked||!CORE.layerFor(ref).visible)return null;
 return {ref,def};
}
function grips(ref,def){
 const out=[];
 for(const par of def.dyn.params||[]){
  if(par.kind==='linear'){const {u}=unitOf(par),v=clampLinear(par,valueOf(par,ref));out.push({par,kind:'linear',w:toWorld(ref,P(par.a.x+u.x*v,par.a.y+u.y*v)),dir:u})}
  else if(par.kind==='flip')out.push({par,kind:'flip',w:toWorld(ref,P((par.a.x+par.b.x)/2,(par.a.y+par.b.y)/2))});
  else if(par.kind==='rotation'){const t=((par.base||0)+valueOf(par,ref))*Math.PI/180;out.push({par,kind:'rotation',w:toWorld(ref,P(par.c.x+par.r*Math.cos(t),par.c.y+par.r*Math.sin(t)))})}
 }
 if(def.dyn.vis?.states?.length>1){const g=def.dyn.vis.grip||P(0,0);out.push({kind:'visibility',w:toWorld(ref,g)})}
 return out;
}
const GRIP='#35c8ff';
EXT.overlays.push(ctx=>{
 const d=dynRef();if(!d)return;
 ctx.save();ctx.setLineDash([]);ctx.fillStyle=GRIP;ctx.strokeStyle='#08202c';ctx.lineWidth=1.2;
 for(const g of grips(d.ref,d.def)){
  const s=CORE.screen(g.w);ctx.beginPath();
  if(g.kind==='linear'){
   const a=Math.atan2(-(toWorld(d.ref,P(g.dir.x,g.dir.y)).y-toWorld(d.ref,P(0,0)).y),toWorld(d.ref,P(g.dir.x,g.dir.y)).x-toWorld(d.ref,P(0,0)).x);
   const r=8,pt=(t,k)=>P(s.x+k*Math.cos(a+t),s.y+k*Math.sin(a+t));
   const A=pt(0,r),B=pt(2.4,r),C=pt(-2.4,r);ctx.moveTo(A.x,A.y);ctx.lineTo(B.x,B.y);ctx.lineTo(C.x,C.y);ctx.closePath();
  }else if(g.kind==='flip'){ctx.moveTo(s.x-9,s.y);ctx.lineTo(s.x-3,s.y-6);ctx.lineTo(s.x-3,s.y+6);ctx.closePath();ctx.moveTo(s.x+9,s.y);ctx.lineTo(s.x+3,s.y-6);ctx.lineTo(s.x+3,s.y+6);ctx.closePath()}
  else if(g.kind==='rotation'){ctx.arc(s.x,s.y,6,0,Math.PI*2)}
  else{ctx.moveTo(s.x-7,s.y-4);ctx.lineTo(s.x+7,s.y-4);ctx.lineTo(s.x,s.y+6);ctx.closePath()}
  ctx.fill();ctx.stroke();
 }
 ctx.restore();
});
let drag=null;
function hitGrip(ev){
 const d=dynRef();if(!d)return null;const m=P(ev.offsetX,ev.offsetY);let best=null,lim=10;
 for(const g of grips(d.ref,d.def)){const s=CORE.screen(g.w),k=Math.hypot(s.x-m.x,s.y-m.y);if(k<lim){lim=k;best=g}}
 return best?{...best,ref:d.ref,def:d.def}:null;
}
function visMenu(ref,def,x,y){
 document.getElementById('cadDynVisMenu')?.remove();
 const m=document.createElement('div');m.id='cadDynVisMenu';m.setAttribute('data-no-cad-translate','');m.setAttribute('role','menu');
 m.style.cssText='position:fixed;z-index:9999;left:'+x+'px;top:'+y+'px;background:#13202a;border:1px solid #35c8ff;border-radius:6px;padding:4px;min-width:150px;box-shadow:0 6px 18px #0009';
 const cur=def.dyn.vis.states.includes(ref.dyn?.__vis)?ref.dyn.__vis:def.dyn.vis.states[0];
 for(const st of def.dyn.vis.states){const b=document.createElement('button');b.type='button';b.setAttribute('role','menuitemradio');b.setAttribute('aria-checked',String(st===cur));
  b.textContent=(st===cur?'✓ ':'   ')+st;b.style.cssText='display:block;width:100%;text-align:left;background:none;border:0;color:#e8f7ff;padding:5px 8px;cursor:pointer;font:12px system-ui';
  b.onclick=()=>{CORE.saveHistory();ref.dyn={...(ref.dyn||{}),__vis:st};m.remove();CORE.updateAll();refreshProps(true)};m.append(b)}
 document.body.append(m);setTimeout(()=>document.addEventListener('pointerdown',function off(e){if(!m.contains(e.target)){m.remove();document.removeEventListener('pointerdown',off,true)}},true),0);
}
CORE.canvas.addEventListener('pointerdown',ev=>{
 if(ev.button!==0)return;const g=hitGrip(ev);if(!g)return;
 ev.preventDefault();ev.stopImmediatePropagation();
 if(g.kind==='flip'){CORE.saveHistory();g.ref.dyn={...(g.ref.dyn||{}),[g.par.id]:!valueOf(g.par,g.ref)};CORE.updateAll();refreshProps(true);return}
 if(g.kind==='visibility'){visMenu(g.ref,g.def,ev.clientX+8,ev.clientY+8);return}
 drag={g,moved:false,before:clone(g.ref.dyn||{})};
},true);
CORE.canvas.addEventListener('pointermove',ev=>{
 if(!drag)return;ev.stopImmediatePropagation();
 const {g}=drag,par=g.par,ref=g.ref,w=CORE.snapPoint(CORE.world(P(ev.offsetX,ev.offsetY))),q=toBlock(ref,w);
 if(!drag.moved){CORE.saveHistory();drag.moved=true}
 let v;
 if(g.kind==='linear'){const {u}=unitOf(par);v=clampLinear(par,(q.x-par.a.x)*u.x+(q.y-par.a.y)*u.y)}
 else if(g.kind==='rotation'){v=Math.atan2(q.y-par.c.y,q.x-par.c.x)*180/Math.PI-(par.base||0);if(par.inc>0)v=Math.round(v/par.inc)*par.inc;v=((v%360)+360)%360}
 ref.dyn={...(ref.dyn||{}),[par.id]:v};CORE.updateAll();
 CORE.toast((par.name||par.kind)+' = '+(g.kind==='rotation'?fmt(v)+'°':fmt(v)));
},true);
CORE.canvas.addEventListener('pointerup',ev=>{if(!drag)return;ev.stopImmediatePropagation();drag=null;refreshProps(true)},true);

/* ---------------- Propiedades de la inserción ---------------- */
let propsKey='';
function refreshProps(force){
 const host=$('blSelectedBlockEditor');if(!host)return;
 let box=$('cadDynParams');const d=dynRef();
 const key=d?d.ref.id+'|'+JSON.stringify(d.ref.dyn||{})+'|'+JSON.stringify(d.def.dyn):'';
 if(!force&&key===propsKey)return;propsKey=key;
 if(!d){if(box)box.hidden=true;return}
 if(!box){box=document.createElement('section');box.id='cadDynParams';box.setAttribute('data-no-cad-translate','');box.style.cssText='margin:9px 0;padding:8px;border:1px solid #35c8ff;border-radius:6px';host.prepend(box)}
 box.hidden=false;
 const {ref,def}=d;let h='<b style="font-size:11px">'+L('PARÁMETROS DEL BLOQUE','BLOCK PARAMETERS')+'</b>';
 if(def.dyn.vis?.states?.length>1){const cur=def.dyn.vis.states.includes(ref.dyn?.__vis)?ref.dyn.__vis:def.dyn.vis.states[0];
  h+='<label style="display:block;margin:6px 0">'+L('Visibilidad','Visibility')+' <select data-dyn="__vis">'+def.dyn.vis.states.map(s=>'<option'+(s===cur?' selected':'')+'>'+esc(s)+'</option>').join('')+'</select></label>'}
 for(const par of def.dyn.params||[]){
  const v=valueOf(par,ref),n=esc(par.name||par.kind);
  if(par.kind==='flip')h+='<label style="display:block;margin:6px 0"><input type="checkbox" data-dyn="'+esc(par.id)+'"'+(v?' checked':'')+'> '+n+'</label>';
  else h+='<label style="display:block;margin:6px 0">'+n+(par.kind==='rotation'?' (°)':'')+' <input type="number" step="any" style="width:90px" data-dyn="'+esc(par.id)+'" value="'+(+Number(v).toFixed(5))+'"></label>';
 }
 h+='<button type="button" class="btn slim" data-dyn-reset>'+L('Restablecer valores','Reset values')+'</button>';
 box.innerHTML=h;
 box.querySelectorAll('[data-dyn]').forEach(inp=>inp.addEventListener('change',()=>{
  const id=inp.dataset.dyn,par=(def.dyn.params||[]).find(p=>p.id===id);let v;
  if(id==='__vis')v=inp.value;else if(par.kind==='flip')v=inp.checked;else if(par.kind==='linear')v=clampLinear(par,Number(String(inp.value).replace(',','.')));else{v=Number(String(inp.value).replace(',','.'));if(!Number.isFinite(v))return}
  CORE.saveHistory();ref.dyn={...(ref.dyn||{}),[id]:v};CORE.updateAll();refreshProps(true);
 }));
 box.querySelector('[data-dyn-reset]').onclick=()=>{CORE.saveHistory();delete ref.dyn;CORE.updateAll();refreshProps(true)};
}
EXT.overlays.push(()=>{try{refreshProps(false)}catch(e){}});

/* ---------------- Espacio del editor de bloques ---------------- */
let A=null; // autoría en curso: {params, vis:{states,current,hidden}}
function keyOf(e){if(!e.dk)e.dk=uid('k');return e.dk}
function selection(){const st=S();return st.entities.filter(e=>st.selected.includes(e.id))}
function editorEntities(){return S().entities}
function ensureAuthoring(){
 const j=job();if(!j)return null;
 if(!A||A.name!==j.name){
  const def=S().blocks?.[j.name];const d=clone(def?.dyn||{});
  A={name:j.name,params:d.params||[],vis:{states:d.vis?.states?.length?d.vis.states:[],hidden:d.vis?.hidden||{},grip:d.vis?.grip||null,current:null}};
  A.vis.current=A.vis.states[0]||null;
  for(const e of editorEntities())keyOf(e);
  applyVisInEditor();
 }
 return A;
}
function applyVisInEditor(){
 if(!A)return;const hidden=new Set(A.vis.current?(A.vis.hidden[A.vis.current]||[]):[]);
 for(const e of editorEntities())e.cadHidden=hidden.has(e.dk)||undefined;
 CORE.updateAll();
}
function addParam(par){ensureAuthoring();A.params.push(par);renderPalette();CORE.updateAll();CORE.toast('Parámetro «'+par.name+'» agregado · probalo con «Probar bloque»')}
function nextName(base){const n=A.params.filter(p=>p.name.startsWith(base)).length+1;return base+(n>1?' '+n:'')}
function targetsOrAll(){const s=selection();return (s.length?s:editorEntities().filter(e=>!e.cadHidden)).map(keyOf)}
const tools={
 linear(action){
  ensureAuthoring();const pre=selection().map(keyOf);
  PLUS.pick({mode:'points',need:2,label:(action==='move'?'LINEAL·MOVER':'LINEAL·ESTIRAR')+' · punto inicial y punto final de la medida',
   preview:(pts,m)=>pts.length?[pts[0],m]:null,
   done:([a,b])=>{
    if(Math.hypot(b.x-a.x,b.y-a.y)<1e-9)return CORE.toast('Los dos puntos tienen que ser distintos');
    const name=nextName(action==='move'?L('Desplazamiento','Offset'):L('Distancia','Distance'));
    if(action==='move'){
     const keys=pre;if(!keys.length)return CORE.toast(L('LINEAL·MOVER: seleccioná antes los objetos que se mueven','LINEAR·MOVE: select the objects to move first'));
     return addParam({id:uid('p'),kind:'linear',action:'move',name,a,b,keys,min:0,max:0,inc:0});
    }
    PLUS.pick({mode:'points',need:2,label:'ESTIRAR · marcá el marco de estiramiento (dos esquinas): se mueven los vértices de adentro',
     preview:(pts,m)=>pts.length?[pts[0],P(m.x,pts[0].y),m,P(pts[0].x,m.y),pts[0]]:null,
     done:([p,q])=>{
      const frame={minX:Math.min(p.x,q.x),maxX:Math.max(p.x,q.x),minY:Math.min(p.y,q.y),maxY:Math.max(p.y,q.y)};
      const keys=pre.length?pre:editorEntities().filter(e=>!e.cadHidden&&(e.type==='rect'?[e.a,e.b,P(e.a.x,e.b.y),P(e.b.x,e.a.y)]:(CORE.getVertices(e)||[])).some(v=>v&&inFrame(v,frame))).map(keyOf);
      addParam({id:uid('p'),kind:'linear',action:'stretch',name,a,b,frame,keys,min:0,max:0,inc:0});
     }});
   }});
 },
 flip(){
  ensureAuthoring();const keys=targetsOrAll();
  PLUS.pick({mode:'points',need:2,label:'SIMETRÍA · dos puntos del eje de reflexión (se reflejan los objetos seleccionados, o todos)',preview:(pts,m)=>pts.length?[pts[0],m]:null,
   done:([a,b])=>{if(Math.hypot(b.x-a.x,b.y-a.y)<1e-9)return CORE.toast('Los dos puntos tienen que ser distintos');addParam({id:uid('p'),kind:'flip',name:nextName(L('Simetría','Flip')),a,b,keys})}});
 },
 rotation(){
  ensureAuthoring();const keys=targetsOrAll();
  PLUS.pick({mode:'points',need:2,label:'ROTACIÓN · centro de giro y un punto para el pinzamiento (se giran los seleccionados, o todos)',preview:(pts,m)=>pts.length?[pts[0],m]:null,
   done:([c,g])=>{const r=Math.hypot(g.x-c.x,g.y-c.y);if(r<1e-9)return CORE.toast('Indicá un punto distinto del centro');
    addParam({id:uid('p'),kind:'rotation',name:nextName(L('Giro','Rotation')),c,r,base:Math.atan2(g.y-c.y,g.x-c.x)*180/Math.PI,inc:0,keys})}});
 },
 visNew(){
  ensureAuthoring();const name=(window.prompt('Nombre del nuevo estado de visibilidad',A.vis.states.length?'Estado '+(A.vis.states.length+1):'Completo')||'').trim();
  if(!name)return;if(A.vis.states.includes(name))return CORE.toast('Ya existe ese estado');
  // El primer estado se crea junto con uno base que muestra todo.
  if(!A.vis.states.length&&name!=='Completo'){A.vis.states.push('Completo');A.vis.hidden.Completo=[]}
  A.vis.states.push(name);A.vis.hidden[name]=[...(A.vis.current?A.vis.hidden[A.vis.current]||[]:[])];A.vis.current=name;applyVisInEditor();renderPalette();
 },
 visRename(){ensureAuthoring();const c=A.vis.current;if(!c)return;const n=(window.prompt('Nuevo nombre',c)||'').trim();if(!n||n===c)return;if(A.vis.states.includes(n))return CORE.toast('Ya existe ese estado');
  A.vis.states=A.vis.states.map(s=>s===c?n:s);A.vis.hidden[n]=A.vis.hidden[c];delete A.vis.hidden[c];A.vis.current=n;renderPalette()},
 visDelete(){ensureAuthoring();const c=A.vis.current;if(!c)return;A.vis.states=A.vis.states.filter(s=>s!==c);delete A.vis.hidden[c];A.vis.current=A.vis.states[0]||null;if(A.vis.states.length<2&&A.vis.states.length){/* un solo estado no tiene sentido */}applyVisInEditor();renderPalette()},
 visHide(){ensureAuthoring();const c=A.vis.current;if(!c)return CORE.toast('Primero creá un estado de visibilidad');const keys=selection().map(keyOf);if(!keys.length)return CORE.toast('Seleccioná los objetos a ocultar en «'+c+'»');
  A.vis.hidden[c]=[...new Set([...(A.vis.hidden[c]||[]),...keys])];S().selected=[];applyVisInEditor();renderPalette()},
 visShowAll(){ensureAuthoring();const c=A.vis.current;if(!c)return;A.vis.hidden[c]=[];applyVisInEditor();renderPalette()},
 visGrip(){ensureAuthoring();PLUS.pick({mode:'points',need:1,label:'Ubicación del pinzamiento de visibilidad',done:([p])=>{A.vis.grip=p;renderPalette()}})},
 test(){
  const j=job();if(!j)return;ensureAuthoring();
  const ents=editorEntities().filter(e=>['line','polyline','rect','circle','arc','ellipse','text','dimension'].includes(e.type)).map(e=>{const c=clone(e);delete c.id;delete c.cadHidden;return c});
  if(!ents.length)return CORE.toast('El bloque está vacío');
  const st=S(),tmp='__PRUEBA_'+j.name;st.blocks[tmp]={name:tmp,base:P(0,0),entities:ents,dyn:collectDyn()};
  A.testing={entities:st.entities,selected:st.selected.slice()};
  const ref={id:CORE.nextId(),type:'blockRef',blockName:tmp,p:P(0,0),scale:1,rotation:0,layer:st.layerId};
  st.entities=[ref];st.selected=[ref.id];CORE.updateAll();renderPalette();
  CORE.toast('PROBAR BLOQUE · usá los pinzamientos celestes · «Volver al editor» para seguir');
 },
 endTest(){
  if(!A?.testing)return;const st=S(),j=job();st.entities=A.testing.entities;st.selected=A.testing.selected;delete st.blocks['__PRUEBA_'+(j?.name||A.name)];A.testing=null;CORE.updateAll();renderPalette();
 },
};
function collectDyn(){
 if(!A)return null;
 const live=new Set(editorEntities().map(e=>e.dk).filter(Boolean));
 const params=A.params.map(p=>({...clone(p),keys:(p.keys||[]).filter(k=>live.has(k))})).filter(p=>p.keys.length);
 const vis=A.vis.states.length>1?{states:A.vis.states.slice(),hidden:Object.fromEntries(A.vis.states.map(s=>[s,(A.vis.hidden[s]||[]).filter(k=>live.has(k))])),...(A.vis.grip?{grip:A.vis.grip}:{})}:null;
 return params.length||vis?{params,...(vis?{vis}:{})}:null;
}
/* Llamado por el programa al guardar el bloque: devuelve def.dyn (o null) ya trasladado al nuevo punto base. */
function onSave(base){
 if(A?.testing)tools.endTest();
 if(!A)return undefined;
 for(const e of editorEntities()){keyOf(e);delete e.cadHidden}
 let dyn=collectDyn();
 if(dyn&&base){const sh=p=>p&&Number.isFinite(p.x)?P(p.x-base.x,p.y-base.y):p;
  for(const p of dyn.params){for(const k of ['a','b','c'])if(p[k])p[k]=sh(p[k]);if(p.frame)p.frame={minX:p.frame.minX-base.x,maxX:p.frame.maxX-base.x,minY:p.frame.minY-base.y,maxY:p.frame.maxY-base.y}}
  if(dyn.vis?.grip)dyn.vis.grip=sh(dyn.vis.grip)}
 return dyn;
}
function onClose(){if(A?.testing)tools.endTest();A=null;document.getElementById('cadBlockPalette')?.remove();document.getElementById('cadBlockEditBar')?.classList.remove('dyn')}
function onOpen(){A=null;ensureAuthoring();renderPalette()}

function renderPalette(){
 const j=job();let pal=$('cadBlockPalette');
 if(!j){pal?.remove();return}
 if(!pal){
  pal=document.createElement('aside');pal.id='cadBlockPalette';pal.setAttribute('aria-label',L('Paleta de autoría de bloques','Block authoring palette'));pal.setAttribute('data-no-cad-translate','');
  pal.style.cssText='position:absolute;top:64px;left:72px;z-index:46;width:236px;max-height:calc(100% - 90px);overflow:auto;padding:10px;border-radius:10px;background:#1c1810ee;border:1.5px solid #d4a748;color:#f3e3bf;font:12px system-ui;box-shadow:0 10px 26px #0008';
  for(const ev of ['pointerdown','wheel'])pal.addEventListener(ev,e=>e.stopPropagation());
  pal.addEventListener('click',e=>{const t=e.target.closest('[data-t]');if(!t)return;const [fn,arg]=t.dataset.t.split(':');
   if(fn==='del'){A.params=A.params.filter(p=>p.id!==arg);renderPalette();CORE.updateAll();return}
   if(fn==='ren'){const p=A.params.find(x=>x.id===arg);const n=(window.prompt('Nombre del parámetro',p.name)||'').trim();if(n){p.name=n;renderPalette()}return}
   if(fn==='lim'){const p=A.params.find(x=>x.id===arg);const r=window.prompt('Mínimo, máximo e incremento (0 = sin límite), separados por ;',[p.min||0,p.max||0,p.inc||0].join(' ; '));if(r===null)return;
    const [mn,mx,inc]=r.split(';').map(s=>Number(s.trim().replace(',','.')));if(![mn,mx,inc].every(n=>Number.isFinite(n)&&n>=0))return CORE.toast('Valores inválidos');if(mx>0&&mn>mx)return CORE.toast('El mínimo supera al máximo');Object.assign(p,{min:mn,max:mx,inc});renderPalette();return}
   if(fn==='state'){A.vis.current=arg;applyVisInEditor();renderPalette();return}
   if(tools[fn])tools[fn](arg);
  });
  const host=document.querySelector('.cad-block-editing')||CORE.canvas.parentElement;host.append(pal);
 }
 const b=(t,label,title)=>'<button type="button" class="btn slim" data-t="'+t+'" title="'+esc(title||label)+'" style="margin:2px 2px 2px 0">'+label+'</button>';
 const sec=t=>'<div style="margin:10px 0 4px;font-weight:700;letter-spacing:.4px;color:#d4a748">'+t+'</div>';
 let h='<div style="font-weight:800;font-size:13px">'+L('AUTORÍA DE BLOQUES','BLOCK AUTHORING')+'</div><div style="opacity:.8;margin-top:2px">'+esc(j.name)+'</div>';
 if(A?.testing){pal.innerHTML=h+sec(L('PRUEBA','TEST'))+'<p style="margin:4px 0">'+L('Mové los pinzamientos celestes o cambiá valores en Propiedades.','Drag the cyan grips or change values in Properties.')+'</p>'+b('endTest',L('← Volver al editor','← Back to editor'));return}
 h+=sec(L('PARÁMETRO + ACCIÓN','PARAMETER + ACTION'))+b('linear:stretch',L('Lineal · estirar','Linear · stretch'),L('Una medida y un marco: los vértices dentro del marco siguen a la flecha','A distance and a frame: vertices inside the frame follow the arrow'))+b('linear:move',L('Lineal · mover','Linear · move'),L('Una medida: los objetos seleccionados se desplazan con la flecha','A distance: selected objects move with the arrow'))
  +b('flip',L('Simetría','Flip'),L('Eje de reflexión: los objetos se reflejan con un clic','Reflection axis: objects flip with one click'))+b('rotation',L('Rotación','Rotation'),L('Centro y pinzamiento de giro','Center and rotation grip'));
 h+=sec(L('PARÁMETROS DEL BLOQUE','BLOCK PARAMETERS'));
 if(!A?.params.length)h+='<div style="opacity:.7">'+L('Todavía no hay parámetros.','No parameters yet.')+'</div>';
 for(const p of A?.params||[]){const lab={linear:p.action==='move'?L('mover','move'):L('estirar','stretch'),flip:L('simetría','flip'),rotation:L('giro','rotation')}[p.kind];
  h+='<div style="display:flex;align-items:center;gap:4px;margin:3px 0"><span style="flex:1;overflow:hidden;text-overflow:ellipsis" title="'+esc(p.name)+'">'+esc(p.name)+' <i style="opacity:.65">· '+lab+' · '+(p.keys?.length||0)+' obj.</i></span>'
   +(p.kind!=='flip'?b('lim:'+p.id,'↕',L('Mínimo, máximo e incremento','Minimum, maximum and increment')):'')+b('ren:'+p.id,'✎',L('Renombrar','Rename'))+b('del:'+p.id,'✕',L('Quitar','Remove'))+'</div>'}
 h+=sec(L('ESTADOS DE VISIBILIDAD','VISIBILITY STATES'));
 if(A?.vis.states.length){for(const s of A.vis.states)h+='<button type="button" class="btn slim" data-t="state:'+esc(s)+'" style="margin:2px;'+(s===A.vis.current?'border-color:#d4a748;color:#fff':'')+'">'+(s===A.vis.current?'● ':'')+esc(s)+'</button>';
  h+='<div>'+b('visHide',L('Ocultar selección','Hide selection'),L('Oculta en este estado los objetos seleccionados','Hide the selected objects in this state'))+b('visShowAll',L('Mostrar todo','Show all'))+b('visRename',L('Renombrar','Rename'))+b('visDelete',L('Borrar estado','Delete state'))+b('visGrip',L('Ubicar pinzamiento','Place grip'))+'</div>'}
 h+=b('visNew',L('+ Nuevo estado','+ New state'),L('Crear un estado de visibilidad','Create a visibility state'));
 h+=sec(L('BLOQUE','BLOCK'))+b('test',L('▶ Probar bloque','▶ Test block'),L('Prueba los parámetros sin salir del editor','Try the parameters without leaving the editor'));
 h+='<div style="opacity:.65;margin-top:8px;line-height:1.35">'+L('Dibujá y modificá con las herramientas de siempre. Guardá con «✓» en la barra superior.','Draw and modify with the usual tools. Save with “✓” in the top bar.')+'</div>';
 pal.innerHTML=h;
}

/* ---------------- Órdenes ---------------- */
const C={};const reg=(n,f)=>{for(const k of n)C[k]=f};
const need=f=>()=>{if(!job())return CORE.toast('Primero abrí el editor de bloques (EDITARBLOQUE o BLOQUENUEVO)');f()};
reg(['BPARAMLINEAL','PARAMLINEAL','BPARAMETER'],need(()=>tools.linear('stretch')));
reg(['BPARAMMOVER','PARAMMOVER'],need(()=>tools.linear('move')));
reg(['BPARAMSIMETRIA','PARAMSIMETRIA','BFLIP'],need(()=>tools.flip()));
reg(['BPARAMROTACION','PARAMROTACION','BROTATE'],need(()=>tools.rotation()));
reg(['BVSTATE','ESTADOVISIBILIDAD'],need(()=>tools.visNew()));
reg(['BTESTBLOCK','PROBARBLOQUE'],need(()=>tools.test()));
reg(['BLOQUENUEVO','NEWBLOCK','BNEW','BLOQUEDINAMICO'],()=>{
 if(job())return CORE.toast('Ya estás en el editor de bloques');
 const st=S(),name=(window.prompt('Nombre del bloque nuevo (o uno existente para editarlo)','BLOQUE-'+(Object.keys(st.blocks||{}).length+1))||'').trim();if(!name)return;
 if(!/^[^<>/\\":;?*|=`]{1,120}$/.test(name))return CORE.toast('Nombre de bloque inválido');
 if(!st.blocks[name])st.blocks[name]={name,base:P(0,0),entities:[],__new:true};
 CORE.editBlock(name);
});
Object.assign(EXT.commands,C);
window.CAD2D_DYNBLOCK=Object.freeze({apply,onOpen,onSave,onClose,toWorld,toBlock,commands:Object.keys(C)});
})();
