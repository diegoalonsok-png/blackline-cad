/* Detalles constructivos CAD2D3D. Fuente CC0: https://github.com/GSStnb/dxfBlocks */
(async function(){
'use strict';
const L=window.CAD2D_ARQ_LIBRARY;if(!L?.library)return;
const src='https://raw.githubusercontent.com/GSStnb/dxfBlocks/master/Architecture/Windows/Details/';
const files=[['Csmt-Head&Sill.dxf','Ventana batiente · dintel y umbral'],['Csmt-Jamb.dxf','Ventana batiente · jamba'],['Fixed-18.dxf','Ventana fija · detalle'],['FxdSldr-36.dxf','Ventana corrediza · detalle']];
function parse(raw){
const lines=raw.replace(/\r/g,'').split('\n'),entities=[];let section='',next=false,current=null;
function finish(){if(current&&section==='ENTITIES')entities.push(current);current=null}
for(let i=0;i+1<lines.length;i+=2){const k=lines[i].trim(),v=lines[i+1].trim();
if(k==='0'){finish();if(v==='SECTION')next=true;else if(v==='ENDSEC')section='';else if(section==='ENTITIES')current={kind:v,g:{}};continue}
if(next&&k==='2'){section=v;next=false;continue}
if(current)(current.g[k]??=[]).push(v)}
finish();const n=(g,k,i=0,d=0)=>Number(g[k]?.[i]??d),shapes=[],xs=[],ys=[];
function p(x,y){if(Number.isFinite(x)&&Number.isFinite(y)){xs.push(x);ys.push(y)}}
for(const {kind,g} of entities){
if(kind==='LINE'){const a=n(g,'10'),b=n(g,'20'),c=n(g,'11'),d=n(g,'21');p(a,b);p(c,d);shapes.push(['l',a,b,c,d])}
else if(kind==='CIRCLE'||kind==='ARC'){const x=n(g,'10'),y=n(g,'20'),r=n(g,'40');if(r<=0)continue;p(x-r,y-r);p(x+r,y+r);shapes.push(kind==='CIRCLE'?['c',x,y,r]:['a',x,y,r,n(g,'50'),n(g,'51')])}
else if(kind==='LWPOLYLINE'){const pts=(g['10']||[]).map((x,i)=>[Number(x),n(g,'20',i)]);if(pts.length<2)continue;pts.forEach(q=>p(...q));shapes.push(['p',pts,!!(n(g,'70')&1)])}
}
if(xs.length<6||shapes.length<10)return null;
const minX=Math.min(...xs),minY=Math.min(...ys),w=Math.max(...xs)-minX,h=Math.max(...ys)-minY;
if(!w||!h)return null;
return {shapes,minX,minY,w:w*.0254,d:h*.0254};
}
let ok=0;for(let i=0;i<files.length;i++){const [f,name]=files[i],id='cc0-detail-'+i;
if(L.library.some(x=>x.id===id))continue;
try{const response=await fetch(src+encodeURIComponent(f),{cache:'force-cache'});if(!response.ok)continue;
const parsed=parse(await response.text());if(!parsed)continue;
const {shapes,minX,minY,w,d}=parsed;
L.library.push({id,name,cat:'Detalles constructivos',family:'Detalles constructivos',mode:'Vistas',w,d,wMin:w,wMax:w,dMin:d,dMax:d,lockAspect:true,author:'GSStnb · CC0',gen(b){
const px=x=>(x-minX)*.0254,py=y=>(y-minY)*.0254;
for(const e of shapes){if(e[0]==='l')b.line(px(e[1]),py(e[2]),px(e[3]),py(e[4]));
else if(e[0]==='c')b.circle(px(e[1]),py(e[2]),e[3]*.0254);
else if(e[0]==='a')b.arc(px(e[1]),py(e[2]),e[3]*.0254,e[4],e[5]);
else if(e[0]==='p')b.poly(e[1].map(q=>[px(q[0]),py(q[1])]),e[2]);}}});ok++;
}catch(e){console.warn('Detalle CC0 no disponible',f,e)}
}
if(ok){if(Array.isArray(L.categories)&&!L.categories.includes('Detalles constructivos'))L.categories.push('Detalles constructivos');window.CAD2D_BLOCK_BROWSER?.refresh?.();window.CAD2D_ARQ_REFRESH?.()}
})();