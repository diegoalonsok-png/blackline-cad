/* CAD2D · Órdenes 2D adicionales con la lógica habitual de un CAD de escritorio (Nov 2026).
 * Implementación propia; los nombres de comandos son términos genéricos de dibujo.
 * Capas: CAPAISO/LAYISO, CAPAUNISO/LAYUNISO, CAPADES/LAYOFF, CAPAACT/LAYON, CAPABLOQ/LAYLCK,
 *        CAPADESBLOQ/LAYULK, CAPAACTUAL/LAYMCUR, CAPACAMBIAR/LAYMCH, CAPAFUSION/LAYMRG, CAPABORRAR/LAYDEL, PORCAPA/SETBYLAYER
 * Cotas: ACOCONT/DIMCONTINUE, ACOLINEABASE/DIMBASELINE, ACOARCO/DIMARC, ESPACIOCOTA/DIMSPACE, QLEADER/MLD
 * Texto: ESCALATEXTO/SCALETEXT
 * Dibujo: SPLINE, ARANDELA/DONUT, MARCACENTRO/CENTERMARK, LINEACENTRO/CENTERLINE, MATRIZCAMINO/ARRAYPATH
 * Vista/consulta: ZOOMOBJETO/ZO, CALC/CAL, BUSCAR/FIND, ESTADO/STATUS, AUDITAR/AUDIT
 * Shift + clic derecho: menú de referencias a objetos (OSNAP).
 */
(function(){
'use strict';
const CORE=window.CAD2D_CORE,EXT=window.CAD2D_EXTENSIONS;if(!CORE||!EXT)return;
const P=(x,y)=>({x,y}),S=()=>CORE.state,$=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const f=()=>1000/CORE.U[S().unit];
const ask=(label,def='')=>{const r=window.prompt(label,def);return r===null?null:r.trim()};
const num=r=>Number(String(r).replace(',','.'));
const sel=()=>{const st=S();return st.entities.filter(e=>st.selected.includes(e.id)&&!e.cadHidden)};
const unlocked=list=>list.filter(e=>!CORE.layerFor(e).locked);
const layerById=id=>S().layers.find(l=>l.id===id);
const layerByName=name=>S().layers.find(l=>l.name.toUpperCase()===String(name||'').trim().toUpperCase());
function add(e){const st=S(),o={...e,id:CORE.nextId()};if(!o.layer)o.layer=st.layerId;st.entities.push(o);return o}
function hint(t){const h=$('statusHint');if(h)h.textContent=t}
const C={};const reg=(names,fn)=>{for(const n of names)C[n]=fn};

/* ---------- Selector de puntos / objetos (independiente) ---------- */
const pk={on:false,mode:'points',pts:[],need:0,label:'',done:null,mouse:null,preview:null};
function pick(opts){Object.assign(pk,{on:true,pts:[],mouse:null,preview:null,need:1,mode:'points',...opts});CORE.setTool('select');hint(pk.label+' · Esc cancela');CORE.toast(pk.label)}
function endPick(){pk.on=false;pk.pts=[];CORE.schedule()}
CORE.canvas.addEventListener('pointerdown',ev=>{
 if(!pk.on||ev.button!==0)return;ev.preventDefault();ev.stopImmediatePropagation();
 const w=CORE.world(P(ev.offsetX,ev.offsetY));
 if(pk.mode==='object'){const e=CORE.pick(w);if(!e)return CORE.toast('No hay objeto en ese punto');const done=pk.done;endPick();done(e,w);return}
 pk.pts.push(CORE.snapPoint(w));
 if(pk.mode==='multi'){hint(pk.label+' · '+pk.pts.length+' punto(s) · Enter termina');CORE.schedule();return}
 if(pk.pts.length>=pk.need){const pts=pk.pts.slice(),done=pk.done;if(pk.mode==='repeat'){pk.pts=[]}else endPick();done(pts)}
 CORE.schedule();
},true);
CORE.canvas.addEventListener('pointermove',ev=>{if(pk.on){pk.mouse=CORE.snapPoint(CORE.world(P(ev.offsetX,ev.offsetY)));CORE.schedule()}},true);
document.addEventListener('keydown',ev=>{
 if(!pk.on)return;
 if(ev.key==='Escape'){endPick();CORE.toast('Comando cancelado')}
 else if(ev.key==='Enter'&&!['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)){ev.preventDefault();ev.stopImmediatePropagation();const done=pk.done,pts=pk.pts.slice(),mode=pk.mode;endPick();if(mode==='multi'&&done)done(pts,true)}
},true);
EXT.overlays.push(ctx=>{
 if(!pk.on||!pk.mouse)return;
 ctx.setLineDash([5,4]);ctx.strokeStyle='#ffce78';ctx.lineWidth=1.2;
 if(pk.preview){const pts=pk.preview(pk.pts,pk.mouse);if(pts&&pts.length>1){ctx.beginPath();pts.forEach((p,i)=>{const s=CORE.screen(p);i?ctx.lineTo(s.x,s.y):ctx.moveTo(s.x,s.y)});ctx.stroke()}return}
 if(!pk.pts.length)return;const a=CORE.screen(pk.pts.at(-1)),b=CORE.screen(pk.mouse);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
});

/* ---------- CAPAS ---------- */
let layIsoBackup=null;
function layersOfSelection(){const ids=new Set(sel().map(e=>e.layer));return S().layers.filter(l=>ids.has(l.id))}
reg(['LAYISO','CAPAISO','AISLARCAPA'],()=>{
 const keep=layersOfSelection();if(!keep.length)return CORE.toast('CAPAISO: seleccioná objetos de las capas a aislar');
 const st=S();layIsoBackup=st.layers.map(l=>({id:l.id,visible:l.visible,locked:l.locked}));
 for(const l of st.layers)if(!keep.includes(l))l.visible=false;
 if(!keep.some(l=>l.id===st.layerId))st.layerId=keep[0].id;
 st.selected=[];CORE.updateAll();CORE.toast('Capas aisladas: '+keep.map(l=>l.name).join(', ')+' · CAPAUNISO restaura');
});
reg(['LAYUNISO','CAPAUNISO','RESTAURARCAPAS'],()=>{
 if(!layIsoBackup)return CORE.toast('CAPAUNISO: no hay aislamiento de capas activo');
 for(const b of layIsoBackup){const l=layerById(b.id);if(l){l.visible=b.visible;l.locked=b.locked}}
 layIsoBackup=null;CORE.updateAll();CORE.toast('Estado de capas restaurado');
});
reg(['LAYOFF','CAPADES','DESACTIVARCAPA','LAYFRZ','CAPACONG','INUTILIZARCAPA'],()=>{
 const ls=layersOfSelection();if(!ls.length)return pick({mode:'object',label:'CAPADES · elegí un objeto de la capa a desactivar',done:e=>{offLayers([layerById(e.layer)])}});
 offLayers(ls);
});
function offLayers(ls){const st=S();for(const l of ls)l.visible=false;if(ls.some(l=>l.id===st.layerId)){const other=st.layers.find(l=>l.visible);if(other)st.layerId=other.id}st.selected=[];CORE.updateAll();CORE.toast('Capa(s) desactivada(s): '+ls.map(l=>l.name).join(', ')+' · CAPAACT las enciende')}
reg(['LAYON','CAPAACT','ACTIVARCAPAS','LAYTHW','CAPADESCONG'],()=>{for(const l of S().layers)l.visible=true;CORE.updateAll();CORE.toast('Todas las capas visibles')});
reg(['LAYLCK','CAPABLOQ','BLOQUEARCAPA'],()=>{
 const run=ls=>{for(const l of ls)l.locked=true;S().selected=[];CORE.updateAll();CORE.toast('Capa(s) bloqueada(s): '+ls.map(l=>l.name).join(', '))};
 const ls=layersOfSelection();if(ls.length)return run(ls);pick({mode:'object',label:'CAPABLOQ · elegí un objeto de la capa a bloquear',done:e=>run([layerById(e.layer)])});
});
reg(['LAYULK','CAPADESBLOQ','DESBLOQUEARCAPA'],()=>{
 const name=ask('CAPADESBLOQ · nombre de capa a desbloquear (* = todas)\nBloqueadas: '+S().layers.filter(l=>l.locked).map(l=>l.name).join(', '),'*');if(name===null)return;
 const ls=name==='*'?S().layers:[layerByName(name)].filter(Boolean);if(!ls.length)return CORE.toast('Capa inexistente');
 for(const l of ls)l.locked=false;CORE.updateAll();CORE.toast('Desbloqueada(s): '+ls.map(l=>l.name).join(', '));
});
reg(['LAYMCUR','CAPAACTUAL','CAPAOBJ'],()=>{
 const run=e=>{const l=layerById(e.layer);if(!l)return;S().layerId=l.id;CORE.updateAll();CORE.toast('Capa actual: '+l.name)};
 const s=sel();if(s.length)return run(s[0]);pick({mode:'object',label:'CAPAACTUAL · elegí un objeto',done:run});
});
reg(['LAYMCH','CAPACAMBIAR','IGUALARCAPA'],()=>{
 const s=unlocked(sel());if(!s.length)return CORE.toast('CAPACAMBIAR: seleccioná los objetos a mover de capa');
 pick({mode:'object',label:'CAPACAMBIAR · elegí un objeto de la capa destino',done:t=>{CORE.saveHistory();for(const e of s)e.layer=t.layer;CORE.updateAll();CORE.toast(s.length+' objeto(s) → capa '+layerById(t.layer)?.name)}});
});
reg(['LAYMRG','CAPAFUSION','FUSIONARCAPAS'],()=>{
 const names=S().layers.map(l=>l.name).join(', ');
 const a=layerByName(ask('CAPAFUSION · capa a fusionar (desaparece)\nCapas: '+names));if(!a)return CORE.toast('Capa de origen inexistente');
 const b=layerByName(ask('CAPAFUSION · capa destino','0'));if(!b||b===a)return CORE.toast('Capa destino inválida');
 if(a.id==='0')return CORE.toast('La capa 0 no se puede fusionar');
 const st=S();CORE.saveHistory();let n=0;for(const e of st.entities)if(e.layer===a.id){e.layer=b.id;n++}
 if(st.layerId===a.id)st.layerId=b.id;st.layers.splice(st.layers.indexOf(a),1);CORE.updateAll();CORE.toast('Capa '+a.name+' fusionada en '+b.name+' · '+n+' objeto(s)');
});
reg(['LAYDEL','CAPABORRAR','BORRARCAPA'],()=>{
 const a=layerByName(ask('CAPABORRAR · capa a eliminar con TODOS sus objetos\nCapas: '+S().layers.map(l=>l.name).join(', ')));if(!a)return CORE.toast('Capa inexistente');
 if(a.id==='0')return CORE.toast('La capa 0 no se puede borrar');
 const st=S(),n=st.entities.filter(e=>e.layer===a.id).length;
 if(!window.confirm('Se eliminará la capa '+a.name+' y '+n+' objeto(s). Ctrl+Z deshace. ¿Continuar?'))return;
 CORE.saveHistory();st.entities=st.entities.filter(e=>e.layer!==a.id);if(st.layerId===a.id)st.layerId='0';st.layers.splice(st.layers.indexOf(a),1);
 st.selected=[];CORE.updateAll();CORE.toast('Capa '+a.name+' eliminada');
});
reg(['SETBYLAYER','PORCAPA'],()=>{
 const s=unlocked(sel());if(!s.length)return CORE.toast('PORCAPA: seleccioná objetos');
 CORE.saveHistory();for(const e of s){delete e.color;delete e.linetype}CORE.updateAll();CORE.toast('Color y tipo de línea por capa en '+s.length+' objeto(s)');
});

/* ---------- COTAS CONTINUAS Y DE LÍNEA BASE ---------- */
const LINEAR=new Set(['aligned','horizontal','vertical']);
function lastLinearDim(){
 const st=S(),s=sel().filter(e=>e.type==='dimension'&&LINEAR.has(e.mode));
 if(s.length)return s.at(-1);
 for(let i=st.entities.length-1;i>=0;i--){const e=st.entities[i];if(e.type==='dimension'&&LINEAR.has(e.mode)&&!e.cadHidden)return e}
 return null;
}
function dimFrom(base,a,b,offsetExtra=0){
 const o={type:'dimension',a:{...a},b:{...b},mode:base.mode,style:JSON.parse(JSON.stringify(base.style||{})),dimStyleName:base.dimStyleName||'',layer:base.layer};
 if(base.label!==undefined)o.label='';
 if(base.mode==='horizontal'){const sg=Math.sign(base.p.y-base.a.y)||1;o.p=P(b.x,base.p.y+sg*offsetExtra)}
 else if(base.mode==='vertical'){const sg=Math.sign(base.p.x-base.a.x)||1;o.p=P(base.p.x+sg*offsetExtra,b.y)}
 else{
  const dx=base.b.x-base.a.x,dy=base.b.y-base.a.y,L=Math.hypot(dx,dy)||1,n=P(-dy/L,dx/L);
  const off=(base.p.x-base.a.x)*n.x+(base.p.y-base.a.y)*n.y,sg=Math.sign(off)||1;
  o.p=P(b.x+n.x*(off+sg*offsetExtra),b.y+n.y*(off+sg*offsetExtra));
 }
 return o;
}
function dimSeries(kind){
 let base=lastLinearDim();if(!base)return CORE.toast(kind+': primero dibujá una cota alineada, horizontal o vertical');
 const step=Math.max(Number(base.style?.textHeight||base.style?.height||0)*3,.35*f());
 pick({mode:'repeat',need:1,label:(kind==='ACOCONT'?'ACOCONT · siguiente origen de línea de referencia':'ACOLINEABASE · siguiente punto')+' · Enter termina',
  done:([q])=>{
   CORE.saveHistory();
   const d=kind==='ACOCONT'?dimFrom(base,base.b,q,0):dimFrom(base,base.a,q,step);
   base=add(d);CORE.updateAll();
  }});
}
reg(['DIMCONTINUE','DCO','ACOCONT','COTACONTINUA'],()=>dimSeries('ACOCONT'));
reg(['DIMBASELINE','DBA','ACOLINEABASE','COTABASE'],()=>dimSeries('ACOLINEABASE'));

/* ---------- SPLINE (curva suave por puntos, guardada como polilínea editable) ---------- */
function catmull(pts,closed=false,seg=12){
 if(pts.length<3)return pts.slice();
 const out=[],n=pts.length,get=i=>closed?pts[(i+n)%n]:pts[Math.max(0,Math.min(n-1,i))];
 const last=closed?n:n-1;
 for(let i=0;i<last;i++){const p0=get(i-1),p1=get(i),p2=get(i+1),p3=get(i+2);
  for(let k=0;k<seg;k++){const t=k/seg,t2=t*t,t3=t2*t;
   out.push(P(.5*((2*p1.x)+(-p0.x+p2.x)*t+(2*p0.x-5*p1.x+4*p2.x-p3.x)*t2+(-p0.x+3*p1.x-3*p2.x+p3.x)*t3),
              .5*((2*p1.y)+(-p0.y+p2.y)*t+(2*p0.y-5*p1.y+4*p2.y-p3.y)*t2+(-p0.y+3*p1.y-3*p2.y+p3.y)*t3)))}}
 if(!closed)out.push(pts[n-1]);return out;
}
reg(['SPLINE','SPL','CURVA'],()=>pick({mode:'multi',label:'SPLINE · marcá puntos de ajuste',preview:(pts,m)=>pts.length?catmull([...pts,m]):null,
 done:pts=>{if(pts.length<2)return CORE.toast('SPLINE: al menos 2 puntos');CORE.saveHistory();add({type:'polyline',pts:catmull(pts),closed:false,splineFit:pts.map(p=>({...p}))});CORE.updateAll();CORE.toast('SPLINE creada con '+pts.length+' puntos de ajuste')}}));

/* ---------- ARANDELA ---------- */
reg(['DONUT','ARANDELA','DO'],()=>{
 const k=f(),di=num(ask('ARANDELA · diámetro interior ('+S().unit+')',String(+(0.05*k).toPrecision(3))));if(!(di>=0))return;
 const de=num(ask('ARANDELA · diámetro exterior ('+S().unit+')',String(+(0.10*k).toPrecision(3))));if(!(de>di))return CORE.toast('El exterior debe ser mayor que el interior');
 pick({mode:'repeat',need:1,label:'ARANDELA · centro (Enter termina)',done:([c])=>{
  const ring=[],N=48;for(let i=0;i<=N;i++){const t=i/N*Math.PI*2;ring.push(P(c.x+de/2*Math.cos(t),c.y+de/2*Math.sin(t)))}
  if(di>0)for(let i=N;i>=0;i--){const t=i/N*Math.PI*2;ring.push(P(c.x+di/2*Math.cos(t),c.y+di/2*Math.sin(t)))}
  CORE.saveHistory();add({type:'hatch',pts:ring,color:'#d9dde2',width:.05,hatchStyle:'solid',hatchSpacing:.25,hatchAngle:0});
  add({type:'circle',c,r:de/2});if(di>0)add({type:'circle',c,r:di/2});CORE.updateAll();
 }});
});

/* ---------- MARCAS Y LÍNEAS DE CENTRO ---------- */
reg(['CENTERMARK','CM','MARCACENTRO'],()=>{
 const s=unlocked(sel()).filter(e=>e.type==='circle'||e.type==='arc');if(!s.length)return CORE.toast('MARCACENTRO: seleccioná círculos o arcos');
 CORE.saveHistory();for(const e of s){const r=e.r*1.15;add({type:'line',a:P(e.c.x-r,e.c.y),b:P(e.c.x+r,e.c.y),linetype:'CENTER',layer:e.layer,width:.09});add({type:'line',a:P(e.c.x,e.c.y-r),b:P(e.c.x,e.c.y+r),linetype:'CENTER',layer:e.layer,width:.09})}
 CORE.updateAll();CORE.toast('Marcas de centro: '+s.length);
});
reg(['CENTERLINE','CL','LINEACENTRO','EJE'],()=>{
 const s=unlocked(sel()).filter(e=>e.type==='line');if(s.length!==2)return CORE.toast('LINEACENTRO: seleccioná exactamente 2 líneas');
 let [l1,l2]=s;let a2=l2.a,b2=l2.b;if(CORE.dist(l1.a,a2)+CORE.dist(l1.b,b2)>CORE.dist(l1.a,b2)+CORE.dist(l1.b,a2))[a2,b2]=[b2,a2];
 const a=P((l1.a.x+a2.x)/2,(l1.a.y+a2.y)/2),b=P((l1.b.x+b2.x)/2,(l1.b.y+b2.y)/2),dx=b.x-a.x,dy=b.y-a.y,L=Math.hypot(dx,dy)||1,ext=.10*f();
 CORE.saveHistory();add({type:'line',a:P(a.x-dx/L*ext,a.y-dy/L*ext),b:P(b.x+dx/L*ext,b.y+dy/L*ext),linetype:'CENTER',layer:l1.layer,width:.09});CORE.updateAll();CORE.toast('Línea de centro creada');
});

/* ---------- MATRIZ SOBRE CAMINO ---------- */
function samplePath(e){
 if(e.type==='line')return [e.a,e.b];if(e.type==='polyline')return e.closed?[...e.pts,e.pts[0]]:e.pts;
 if(e.type==='rect')return [P(e.a.x,e.a.y),P(e.b.x,e.a.y),P(e.b.x,e.b.y),P(e.a.x,e.b.y),P(e.a.x,e.a.y)];
 if(e.type==='circle'||e.type==='arc'){let a0=e.type==='arc'?e.a0:0,sw=e.type==='arc'?e.a1-e.a0:Math.PI*2;while(sw<=0)sw+=Math.PI*2;const o=[];for(let i=0;i<=128;i++){const t=a0+sw*i/128;o.push(P(e.c.x+e.r*Math.cos(t),e.c.y+e.r*Math.sin(t)))}return o}
 return null;
}
function along(pts,d){for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],l=CORE.dist(a,b);if(d<=l+1e-12){const t=l?d/l:0;return P(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t)}d-=l}return pts.at(-1)}
function moved(e,dx,dy){const o=JSON.parse(JSON.stringify(e));delete o.id;for(const k of Object.keys(o)){const v=o[k];if(v&&typeof v==='object'&&!Array.isArray(v)&&Number.isFinite(v.x)&&Number.isFinite(v.y))o[k]={x:v.x+dx,y:v.y+dy}}if(Array.isArray(o.pts))o.pts=o.pts.map(p=>({x:p.x+dx,y:p.y+dy}));return o}
reg(['ARRAYPATH','MATRIZCAMINO','MATRIZTRAYECTORIA'],()=>{
 const items=unlocked(sel());if(!items.length)return CORE.toast('MATRIZCAMINO: seleccioná los objetos a repetir');
 pick({mode:'object',label:'MATRIZCAMINO · elegí la línea, polilínea, arco o círculo guía',done:path=>{
  const pts=samplePath(path);if(!pts)return CORE.toast('Camino no compatible');
  const n=Math.round(num(ask('MATRIZCAMINO · cantidad total de elementos','6')));if(!(n>=2&&n<=500))return CORE.toast('Entre 2 y 500');
  let L=0;for(let i=1;i<pts.length;i++)L+=CORE.dist(pts[i-1],pts[i]);
  const b=CORE.getBounds(items),base=P((b.minX+b.maxX)/2,(b.minY+b.maxY)/2),closed=CORE.dist(pts[0],pts.at(-1))<1e-9;
  CORE.saveHistory();for(let i=0;i<n;i++){const q=along(pts,L*i/(closed?n:n-1));if(i===0&&CORE.dist(q,base)<1e-9)continue;for(const e of items)add(moved(e,q.x-base.x,q.y-base.y))}
  CORE.updateAll();CORE.toast('MATRIZCAMINO: '+n+' elementos sobre '+path.type);
 }});
});
reg(['ARRAYRECT','MATRIZRECT'],()=>CORE.command('ARRAY'));
reg(['MLINE','LINEAMULTIPLE','MULTILINEA'],()=>CORE.command('WALL'));
reg(['COPYM','COPIAMULTIPLE'],()=>CORE.command('COPY'));

/* ---------- VISTA Y CONSULTA ---------- */
reg(['ZOOMOBJECT','ZO','ZOOMOBJETO'],()=>{
 const s=sel();if(!s.length)return CORE.toast('ZOOMOBJETO: seleccioná objetos');
 const b=CORE.getBounds(s),c=CORE.canvas,w=c.clientWidth,h=c.clientHeight,dx=Math.max(b.maxX-b.minX,1e-6),dy=Math.max(b.maxY-b.minY,1e-6);
 const v=S().view,scale=Math.min(w*.8/dx,h*.8/dy);if(!(scale>0&&scale<1e8))return;
 v.scale=scale;v.ox=w/2-(b.minX+b.maxX)/2*scale;v.oy=h/2+(b.minY+b.maxY)/2*scale;CORE.schedule();CORE.toast('Zoom a '+s.length+' objeto(s)');
});
function calc(expr){
 const src=String(expr).toLowerCase().replace(/,/g,'.').replace(/\^/g,'**').replace(/π/g,'pi');
 if(!/^[0-9+\-*/().\s%a-z;]*$/.test(src))throw Error('caracteres no permitidos');
 const words=src.match(/[a-z]+/g)||[],okw=new Set(['sqrt','sin','cos','tan','asin','acos','atan','abs','pi','round','floor','ceil','log','ln','exp','min','max','deg','rad']);
 for(const w of words)if(!okw.has(w))throw Error('función desconocida: '+w);
 // Evaluador propio (sin eval / new Function): + - * / % **, paréntesis, funciones y pi.
 const D=Math.PI/180,F={sqrt:Math.sqrt,abs:Math.abs,round:Math.round,floor:Math.floor,ceil:Math.ceil,exp:Math.exp,log:Math.log10,ln:Math.log,
  sin:x=>Math.sin(x*D),cos:x=>Math.cos(x*D),tan:x=>Math.tan(x*D),asin:x=>Math.asin(x)/D,acos:x=>Math.acos(x)/D,atan:x=>Math.atan(x)/D,deg:x=>x/D,rad:x=>x*D,min:Math.min,max:Math.max};
 const tk=src.match(/\*\*|\d*\.?\d+(?:e[+-]?\d+)?|[a-z]+|[-+*/%(),;]/g)||[];let i=0;
 const peek=()=>tk[i],take=t=>{if(t&&tk[i]!==t)throw Error('se esperaba '+t);return tk[i++]};
 const prim=()=>{const t=take();if(t===undefined)throw Error('expresión incompleta');
  if(t==='(' ){const v=add();take(')');return v}
  if(t==='-')return -pw();if(t==='+')return pw();
  if(/^[\d.]/.test(t))return Number(t);
  if(t==='pi')return Math.PI;
  if(F[t]){take('(');const args=[add()];while(peek()===';'){take(';');args.push(add())}take(')');return F[t](...args)}
  throw Error('símbolo inesperado: '+t)};
 const pw=()=>{const b=prim();if(peek()==='**'){take();return b**unary()}return b};
 const unary=()=>{if(peek()==='-'){take();return -unary()}if(peek()==='+'){take();return unary()}return pw()};
 const mul=()=>{let v=unary();while(['*','/','%'].includes(peek())){const o=take(),r=unary();v=o==='*'?v*r:o==='/'?v/r:v%r}return v};
 const add=()=>{let v=mul();while(['+','-'].includes(peek())){const o=take(),r=mul();v=o==='+'?v+r:v-r}return v};
 const r=add();if(i<tk.length)throw Error('símbolo inesperado: '+tk[i]);
 if(!Number.isFinite(r))throw Error('resultado no numérico');return r;
}
reg(['CAL','CALC','QUICKCALC','QC','CALCULADORA'],()=>{
 const e=ask('CALCULADORA · expresión (ángulos en grados). Ej: 2.40*3.15 + sqrt(2) · (4+3)/2','');if(!e)return;
 try{const r=calc(e),t=+r.toPrecision(12);navigator.clipboard?.writeText(String(t)).catch(()=>{});const cmd=$('command');if(cmd){cmd.value=String(t)}
  CORE.log('CAL '+e+' = '+t);CORE.toast(e+' = '+t+' · copiado y listo en la línea de comandos')}catch(err){CORE.toast('CAL: '+err.message)}
});
reg(['FIND','BUSCAR','REEMPLAZAR'],()=>{
 const st=S(),texts=st.entities.filter(e=>e.type==='text'&&!e.cadHidden);if(!texts.length)return CORE.toast('BUSCAR: el dibujo no tiene textos');
 const q=ask('BUSCAR · texto a buscar');if(!q)return;const hits=texts.filter(e=>String(e.text).toLowerCase().includes(q.toLowerCase()));
 if(!hits.length)return CORE.toast('Sin coincidencias para «'+q+'»');
 const rep=ask(hits.length+' coincidencia(s). Reemplazar por (vacío = solo seleccionar):','');
 if(rep){const lk=hits.filter(e=>!CORE.layerFor(e).locked);CORE.saveHistory();const rx=new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi');for(const e of lk)e.text=String(e.text).replace(rx,rep);CORE.toast(lk.length+' texto(s) reemplazado(s)')}
 else CORE.toast(hits.length+' texto(s) seleccionado(s)');
 st.selected=hits.map(e=>e.id);CORE.updateAll();C.ZO();
});
function dialog(title,html){
 $('cadPlusDlg')?.remove();const d=document.createElement('div');d.id='cadPlusDlg';
 d.style.cssText='position:fixed;inset:0;z-index:9200;background:rgba(5,9,13,.6);display:flex;align-items:center;justify-content:center';
 d.innerHTML='<div style="background:#141c24;border:1px solid #4d6676;border-radius:10px;padding:14px;min-width:320px;max-width:560px;max-height:80vh;overflow:auto;color:#e5eef7;font-size:12px"><b>'+esc(title)+'</b>'+html+'<div style="text-align:right;margin-top:8px"><button class="btn" type="button">Cerrar</button></div></div>';
 document.body.append(d);d.querySelector('button').onclick=()=>d.remove();d.addEventListener('pointerdown',e=>{if(e.target===d)d.remove()});
 const k=e=>{if(e.key==='Escape'){d.remove();document.removeEventListener('keydown',k,true)}};document.addEventListener('keydown',k,true);
}
reg(['STATUS','ESTADO','TIME','TIEMPO'],()=>{
 const st=S(),by={};for(const e of st.entities)by[e.type]=(by[e.type]||0)+1;const b=CORE.getBounds(),u=st.unit;
 const rows=Object.entries(by).sort((a,b)=>b[1]-a[1]).map(([t,n])=>'<tr><td>'+esc(t)+'</td><td>'+n+'</td></tr>').join('');
 dialog('ESTADO DEL DIBUJO','<table style="width:100%;border-collapse:collapse;margin:8px 0">'+
  '<tr><td>Archivo</td><td>'+esc(st.file)+'</td></tr><tr><td>Unidades</td><td>'+u+'</td></tr>'+
  '<tr><td>Extensión</td><td>'+(b.maxX-b.minX).toFixed(2)+' × '+(b.maxY-b.minY).toFixed(2)+' '+u+'</td></tr>'+
  '<tr><td>Capas</td><td>'+st.layers.length+' ('+st.layers.filter(l=>!l.visible).length+' apagadas, '+st.layers.filter(l=>l.locked).length+' bloqueadas)</td></tr>'+
  '<tr><td>Capa actual</td><td>'+esc(layerById(st.layerId)?.name||st.layerId)+'</td></tr>'+
  '<tr><td>Bloques definidos</td><td>'+Object.keys(st.blocks||{}).length+'</td></tr><tr><td>Objetos ocultos</td><td>'+st.entities.filter(e=>e.cadHidden).length+'</td></tr>'+
  '<tr><td>Ahora</td><td>'+new Date().toLocaleString('es-AR')+'</td></tr><tr><th colspan=2 style="text-align:left;padding-top:8px">Objetos por tipo · '+st.entities.length+'</th></tr>'+rows+'</table>');
});
reg(['AUDIT','AUDITAR','REVISAR'],()=>{
 const st=S(),bad=[],fin=v=>v===undefined||(v&&Number.isFinite(v.x)&&Number.isFinite(v.y));
 for(const e of st.entities){
  let ok=fin(e.a)&&fin(e.b)&&fin(e.c)&&fin(e.p)&&(!e.pts||e.pts.every(p=>Number.isFinite(p?.x)&&Number.isFinite(p?.y)));
  if(['circle','arc'].includes(e.type)&&!(e.r>0))ok=false;
  if(e.type==='blockRef'&&!st.blocks?.[e.blockName])ok=false;
  if(e.type==='line'&&ok&&CORE.dist(e.a,e.b)===0)ok=false;
  if(!st.layers.some(l=>l.id===e.layer)){e.layer='0'}
  if(!ok)bad.push(e);
 }
 if(!bad.length)return CORE.toast('AUDITAR: '+st.entities.length+' objetos revisados · sin errores');
 if(!window.confirm('AUDITAR: '+bad.length+' objeto(s) dañados (coordenadas inválidas, líneas de largo cero o bloques sin definición). ¿Eliminarlos? Ctrl+Z deshace.'))return;
 CORE.saveHistory();const ids=new Set(bad.map(e=>e.id));st.entities=st.entities.filter(e=>!ids.has(e.id));CORE.updateAll();CORE.toast('AUDITAR: '+bad.length+' objeto(s) corregidos');
});
/* ---------- COTA DE LONGITUD DE ARCO (DIMARC) ---------- */
function dimTextH(){const st=S(),ds=st.dimStyles?.[st.activeDimStyle];const h=Number(ds?.textHeight||ds?.height||0);return h>0?h:.20*f()}
function fmtLen(v){const pr=Math.max(0,Math.min(6,Number(S().precision??2)));return v.toFixed(pr)}
reg(['DIMARC','DAR','ACOARCO','COTAARCO'],()=>{
 pick({mode:'object',label:'DIMARC · elegí un arco',done:arc=>{
  if(arc.type!=='arc')return CORE.toast('DIMARC: el objeto debe ser un arco');
  pick({need:1,label:'DIMARC · ubicación de la línea de cota',done:([q])=>{
   let sw=arc.a1-arc.a0;while(sw<=0)sw+=Math.PI*2;const L=arc.r*sw;
   const R=Math.max(CORE.dist(arc.c,q),1e-9),gap=.05*f(),ext=.08*f(),out=R>=arc.r?1:-1,h=dimTextH();
   const pt=(r,t)=>P(arc.c.x+r*Math.cos(t),arc.c.y+r*Math.sin(t)),group='dimarc-'+Date.now().toString(36);
   CORE.saveHistory();const lay=arc.layer;
   for(const t of [arc.a0,arc.a0+sw])add({type:'line',a:pt(arc.r+out*gap,t),b:pt(R+out*ext,t),layer:lay,width:.09,dimGroup:group});
   add({type:'arc',c:{...arc.c},r:R,a0:arc.a0,a1:arc.a0+sw,layer:lay,width:.09,dimGroup:group});
   const tm=arc.a0+sw/2,tp=pt(R+out*h*1.1,tm);let rot=(tm*180/Math.PI)-90;if(rot>90)rot-=180;if(rot<-90)rot+=180;
   const label='⌒'+fmtLen(L),w=label.length*h*.62,rr=rot*Math.PI/180,tx=P(Math.cos(rr),Math.sin(rr)),ny=P(-tx.y,tx.x);
   add({type:'text',text:label,p:P(tp.x-tx.x*w/2-ny.x*h/2,tp.y-tx.y*w/2-ny.y*h/2),h,rotation:rot,fontFamily:'Arial',layer:lay,dimGroup:group});
   CORE.updateAll();CORE.toast('DIMARC · longitud de arco '+fmtLen(L)+' '+S().unit);
  }});
 }});
});

/* ---------- ESPACIADO DE COTAS PARALELAS (DIMSPACE) ---------- */
function dimNormal(d){
 if(d.mode==='horizontal')return P(0,1);if(d.mode==='vertical')return P(1,0);
 if(d.mode==='aligned'||!d.mode){const dx=d.b.x-d.a.x,dy=d.b.y-d.a.y,L=Math.hypot(dx,dy);return L?P(-dy/L,dx/L):null}
 return null;
}
reg(['DIMSPACE','ESPACIOCOTA','ACOESPACIO'],()=>{
 const st=S(),dims=unlocked(sel()).filter(e=>e.type==='dimension'&&e.a&&e.b&&e.p&&dimNormal(e));
 if(dims.length<2)return CORE.toast('DIMSPACE: seleccioná 2 o más cotas lineales paralelas (la más cercana al objeto queda fija)');
 const n=dimNormal(dims[0]);
 const par=dims.filter(d=>{const m=dimNormal(d);return Math.abs(m.x*n.y-m.y*n.x)<1e-6});
 if(par.length<2)return CORE.toast('DIMSPACE: las cotas deben ser paralelas');
 const off=d=>{const m=dimNormal(d),s=Math.sign(m.x*n.x+m.y*n.y)||1;return ((d.p.x-d.a.x)*n.x+(d.p.y-d.a.y)*n.y)};
 const sign=Math.sign(par.reduce((t,d)=>t+off(d),0))||1;
 // posición absoluta de cada línea de cota sobre la normal común
 const pos=d=>d.p.x*n.x+d.p.y*n.y;par.sort((x,y)=>sign*(pos(x)-pos(y)));
 const auto=dimTextH()*2.2,r=ask('DIMSPACE · separación ('+st.unit+') · vacío = automático, 0 = alinear',String(+auto.toPrecision(3)));if(r===null)return;
 const gap=r===''?auto:num(r);if(!(gap>=0))return CORE.toast('Separación inválida');
 CORE.saveHistory();const p0=pos(par[0]);
 par.forEach((d,i)=>{const target=p0+sign*gap*i,delta=target-pos(d);d.p=P(d.p.x+n.x*delta,d.p.y+n.y*delta);if(CORE.cadAssociateDim)try{CORE.cadAssociateDim(d)}catch(e){}});
 CORE.updateAll();CORE.toast('DIMSPACE · '+par.length+' cotas a '+fmtLen(gap)+' '+st.unit);
});

/* ---------- DIRECTRIZ (alias de escritorio) ---------- */
reg(['QLEADER','QLE','MLD','DIRECTRIZRAPIDA'],()=>CORE.setTool('dimLeader'));

/* ---------- ESCALA DE TEXTO (SCALETEXT) ---------- */
reg(['SCALETEXT','ESCALATEXTO','TEXTSCALE'],()=>{
 const s=unlocked(sel()).filter(e=>e.type==='text');if(!s.length)return CORE.toast('SCALETEXT: seleccioná textos');
 const r=ask('SCALETEXT · nueva altura ('+S().unit+') o factor con x (ej. x0.5)',String(s[0].h||dimTextH()));if(!r)return;
 const factor=/^x/i.test(r)?num(r.slice(1)):null,h=factor?null:num(r);
 if(factor!==null?!(factor>0):!(h>0))return CORE.toast('Valor inválido');
 CORE.saveHistory();for(const e of s)e.h=factor!==null?(e.h||dimTextH())*factor:h;CORE.updateAll();CORE.toast('SCALETEXT · '+s.length+' texto(s)');
});

/* ---------- PUNTO ---------- */
reg(['POINT','PO','PUNTO','PUNTOS'],()=>pick({mode:'repeat',need:1,label:'PUNTO · indicá la ubicación (Enter termina)',done:([p])=>{CORE.saveHistory();add({type:'point',p:P(p.x,p.y)});CORE.updateAll()}}));
/* ---------- CAPA ACTUAL PARA LOS OBJETOS ---------- */
reg(['LAYCUR','CAPAAACTUAL','PASARACAPAACTUAL'],()=>{
 const s=unlocked(sel());if(!s.length)return CORE.toast('LAYCUR: seleccioná los objetos que pasan a la capa actual');
 const st=S(),l=layerById(st.layerId);CORE.saveHistory();for(const e of s)e.layer=st.layerId;CORE.updateAll();CORE.toast(s.length+' objeto(s) → capa actual '+(l?.name||''));
});
/* ---------- Equivalencias de órdenes de uso habitual ---------- */
const same=(names,target)=>reg(names,()=>CORE.command(target));
same(['TEXTEDIT'],'DDEDIT');same(['BE'],'BEDIT');same(['XR','ATTACH'],'XREF');same(['DOR'],'DIMORDINATE');
same(['LINETYPE'],'LTYPE');same(['COL'],'COLOR');same(['SN'],'SNAP');same(['MS'],'MSPACE');same(['PS'],'PSPACE');
same(['PAGESETUP'],'PLOT');same(['EXPORT'],'EXPORTMENU');same(['DXFOUT'],'SAVE');same(['PASTEBLOCK'],'PASTECLIP');
same(['GRADIENT'],'HATCH');same(['DS','DSETTINGS'],'OSNAP');same(['LW','LWEIGHT'],'PROPERTIES');
/* Órdenes de arquitectura con sus nombres habituales: llevan a la herramienta equivalente de CAD2D3D. */
same(['WALLADD'],'MURO');same(['OPENINGADD'],'VANO');same(['SPACEADD','SPACEAUTOGENERATE'],'LOCAL');
same(['AECSCHEDULEADD'],'SUPERFICIES');same(['STAIRADD'],'ESCALERA');same(['AECDIMADD'],'DIMCONTINUE');
reg(['DOORADD','WINDOWADD','PUERTA','PUERTAS','VENTANAS'],()=>{try{document.querySelector('[data-tool="blockgallery"]')?.click()}catch(e){}CORE.toast('Elegí una puerta o ventana en la paleta BLOQUES → Openings: se alinea y corta el muro sola')});
const in3D=(names,what)=>reg(names,()=>CORE.toast(what+' se modela en el 3D (botón 3D). Para llevarlo al plano: panel Sección → «Enviar corte a 2D».'));
in3D(['SLABADD','LOSA'],'La losa');in3D(['ROOFADD','TECHO'],'El techo');in3D(['RAILINGADD','BARANDA'],'La baranda');
in3D(['CURTAINWALLADD'],'El muro cortina');in3D(['COLUMNGRIDADD','COLUMNA'],'La columna');
in3D(['BLDGSECTIONLINEADD','BLDGELEVATIONLINEADD','CORTE','ALZADO'],'El corte o la vista');
/* Órdenes que CAD2D3D no tiene: en lugar de «desconocida», se indica la alternativa. */
const alt=(names,msg)=>reg(names,()=>{CORE.toast(msg);CORE.log?.(names[0]+': '+msg)});
alt(['REGION','REG'],'REGION no existe: las polilíneas cerradas ya funcionan como regiones (área, sombreado, contorno con BOUNDARY).');
/* ---------- COBERTURA: tapa lo que está debajo (sombreados, líneas) para que un texto o un bloque se lea limpio ---------- */
reg(['WIPEOUT','COBERTURA','WO'],()=>{
 const make=pts=>{if(pts.length<3)return CORE.toast('COBERTURA: al menos 3 puntos');CORE.saveHistory();
  const e=add({type:'hatch',pts:pts.map(p=>P(p.x,p.y)),hatchStyle:'solid',color:'#ffffff',wipeout:true,onTop:true});
  CORE.updateAll();CORE.toast('Cobertura creada · lo que dibujes después queda encima · ALFRENTE / ALFONDO para reordenar');return e};
 const poly=sel().filter(e=>e.type==='polyline'&&e.closed&&!e.bulges&&e.pts?.length>2);
 if(poly.length){CORE.saveHistory();let n=0;const st=S();for(const pl of poly){const i=st.entities.indexOf(pl),e={type:'hatch',pts:pl.pts.map(p=>P(p.x,p.y)),hatchStyle:'solid',color:'#ffffff',wipeout:true,onTop:true,layer:pl.layer,id:CORE.nextId()};st.entities.splice(i,0,e);n++}
  CORE.updateAll();return CORE.toast(n+' cobertura(s) desde polilíneas cerradas (quedan debajo de la polilínea)')}
 pick({mode:'multi',label:'COBERTURA · marcá el contorno (Enter cierra) · o seleccioná antes una polilínea cerrada',preview:(pts,m)=>pts.length?[...pts,m,pts[0]]:null,done:make});
});
reg(['WIPEOUTFRAME','MARCOCOBERTURA'],()=>{const st=S();st.wipeoutFrame=!st.wipeoutFrame;CORE.schedule();CORE.toast('Marco de coberturas '+(st.wipeoutFrame?'visible':'oculto')+' (no se imprime)')});
alt(['SKETCH','BOCETO'],'BOCETO no existe: usá SPLINE o POLILÍNEA.');
alt(['SPLINEDIT'],'Las splines se editan con pinzamientos en sus puntos de ajuste o con PEDIT.');
alt(['BLEND'],'BLEND no existe: usá EMPALME (FILLET) o SPLINE entre los extremos.');
alt(['JUSTIFYTEXT'],'La justificación del texto se cambia en PROPIEDADES.');
alt(['REFEDIT'],'Para editar un bloque usá BEDIT (EDITARBLOQUE).');
alt(['DIMBREAK','TOLERANCE'],'Esta variante de cota todavía no está disponible.');
alt(['LAYWALK'],'Para recorrer capas usá LAYISO / LAYUNISO o la paleta de capas.');
alt(['LIMITS'],'No hace falta definir límites: el dibujo es ilimitado y las láminas definen el papel.');
alt(['CLOSE'],'El dibujo se guarda solo; para empezar otro usá NEW.');
alt(['OPTIONS','OP'],'Las opciones están en el menú de cada barra de estado (▾) y en Workspace / Background.');
alt(['IMAGE','IMAGEATTACH'],'Para una imagen o un PDF de fondo usá IMPORTAR PDF o CALIBRAR.');
Object.assign(EXT.commands,C);

/* ---------- Shift + clic derecho: referencias a objetos ---------- */
const OSN={END:'Punto final',MID:'Punto medio',INT:'Intersección',CENTER:'Centro',QUAD:'Cuadrante',TAN:'Tangente',PERP:'Perpendicular',NEAREST:'Cercano',POINT:'Vértice / nodo',EXT:'Extensión',PAR:'Paralelo'};
function osnapMenu(x,y){
 $('cadOsnapMenu')?.remove();if(!CORE.osnap)return;
 const m=document.createElement('div');m.id='cadOsnapMenu';m.setAttribute('role','menu');
 m.style.cssText='position:fixed;z-index:9100;background:#141c24;border:1px solid #4d6676;border-radius:8px;padding:5px;display:grid;gap:2px;min-width:200px;box-shadow:0 10px 30px rgba(0,0,0,.45);font-size:12px';
 m.innerHTML='<div style="font-size:10px;color:#9cb1bc;padding:2px 6px">REFERENCIAS A OBJETOS · Shift + clic derecho</div>';
 const item=(label,fn,checked)=>{const b=document.createElement('button');b.type='button';b.className='btn';b.style.textAlign='left';b.setAttribute('role','menuitemcheckbox');b.setAttribute('aria-checked',String(!!checked));b.textContent=(checked?'✓ ':'   ')+label;b.onclick=()=>{fn();m.remove()};m.append(b)};
 for(const t of CORE.osnap.types())item(OSN[t]||t,()=>CORE.osnap.toggle(t),CORE.osnap.has(t));
 item('Todas',()=>CORE.osnap.set(CORE.osnap.types()));item('Ninguna',()=>CORE.osnap.set([]));
 document.body.append(m);m.style.left=Math.min(x,innerWidth-m.offsetWidth-8)+'px';m.style.top=Math.min(y,innerHeight-m.offsetHeight-8)+'px';
 const away=e=>{if(!m.contains(e.target)){m.remove();document.removeEventListener('pointerdown',away,true)}};setTimeout(()=>document.addEventListener('pointerdown',away,true),0);
}
CORE.canvas.addEventListener('contextmenu',ev=>{if(!ev.shiftKey)return;ev.preventDefault();ev.stopImmediatePropagation();osnapMenu(ev.clientX,ev.clientY)},true);
// Point-picking commands finish their own selection before the main canvas handler.
CORE.canvas.addEventListener('contextmenu',ev=>{
 if(ev.shiftKey||ev.ctrlKey||!pk.on)return;
 ev.preventDefault();ev.stopImmediatePropagation();
 const done=pk.done,pts=pk.pts.slice(),mode=pk.mode;endPick();
 if(mode==='multi'&&done)done(pts,true);
},true);

/* ---------- Menú contextual ---------- */
EXT.context.push(({item,active,count})=>{
 if(active){
  const t=S().tool,n=S().stage.length,opt=(label,key)=>item(label+' ['+key+']',()=>CORE.command(key));
  const OPTS={
   line:n?[opt('Undo','U'),opt('Close','C')]:[],polyline:n?[opt('Undo','U'),opt('Close','C')]:[],
   wall2d:[opt('Thickness','T'),opt('Justify','J'),...(n?[opt('Undo','U')]:[])],
   circle:n===1?[opt('Diameter','D'),opt('Radius','R')]:[],rect:n===1?[opt('Dimensions','D')]:[],
   arc:n?[]:[opt('Center','C')],fillet:[opt('Radius','R')],chamfer:[opt('Distance','D')],
   zoomWindow:[opt('Extents','E'),opt('Previous','P'),opt('Zoom out','-'),opt('Zoom in','+')]
  };
  const extra=OPTS[t]||[];
  const recent=[...new Set(CORE.commandHistory().slice().reverse())].filter(x=>!/^[0-9.,@<+\-]/.test(x)).slice(0,5);
  return {top:extra,bottom:[item('Referencias a objetos… · Shift+clic derecho',()=>{const r=CORE.canvas.getBoundingClientRect();osnapMenu(r.left+r.width/2,r.top+r.height/2)}),...recent.map(r=>item('↻ Entrada reciente: '+r,()=>CORE.command(r)))]};
 }
 const out=[],s=sel();
 if(count){
  out.push(item('Capa: aislar · CAPAISO',()=>C.CAPAISO()),item('Capa: desactivar · CAPADES',()=>C.CAPADES()),item('Capa: hacer actual · CAPAACTUAL',()=>C.CAPAACTUAL()),item('Zoom a objeto · ZO',()=>C.ZO()),item('Color y línea por capa · PORCAPA',()=>C.PORCAPA()));
  if(s.some(e=>e.type==='dimension'))out.push(item('Cota continua · ACOCONT',()=>C.ACOCONT()),item('Cota línea base · ACOLINEABASE',()=>C.ACOLINEABASE()));
  if(s.some(e=>e.type==='circle'||e.type==='arc'))out.push(item('Marca de centro · MARCACENTRO',()=>C.MARCACENTRO()));
  if(s.filter(e=>e.type==='line').length===2)out.push(item('Línea de centro · LINEACENTRO',()=>C.LINEACENTRO()));
  out.push(item('Matriz sobre camino · MATRIZCAMINO',()=>C.MATRIZCAMINO()));
 }else{
  if(layIsoBackup)out.push(item('Restaurar capas · CAPAUNISO',()=>C.CAPAUNISO()));
  if(S().layers.some(l=>!l.visible))out.push(item('Encender todas las capas · CAPAACT',()=>C.CAPAACT()));
  out.push(item('Calculadora · CAL',()=>C.CAL()),item('Buscar y reemplazar texto · BUSCAR',()=>C.BUSCAR()),item('Estado del dibujo · ESTADO',()=>C.ESTADO()));
 }
 return out;
});
window.CAD2D_PLUS=Object.freeze({calc,catmull,commands:Object.keys(C)});
})();
