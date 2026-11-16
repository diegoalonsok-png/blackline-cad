/* Blackline CAD: architectural 2D adaptations for reliable block insertion.
 * Reference: user-provided BLOQUES OLIMPIADAS.dxf.
 * These are simplified, dimensioned replacements, NOT literal reproductions of original geometry.
 */
(()=>{
"use strict";
const defs=[
 {name:'Puerta simple 90 cm',cat:'Aberturas',key:'puerta90',parts:[['line',0,0,0,.9],['line',0,0,.9,0],['arc',0,0,.9,0,Math.PI/2]],pivot:[0,0]},
 {name:'Mesa circular Ø 120 cm',cat:'Mobiliario',key:'mesa120',parts:[['circle',.6,.6,.6],['line',.6,.6,.6,1.2]],pivot:[.6,.6]},
 {name:'Silla 50 × 50 cm',cat:'Mobiliario',key:'silla50',parts:[['rect',0,0,.5,.5],['line',.06,.39,.44,.39],['line',.06,.08,.06,.39],['line',.44,.08,.44,.39]],pivot:[.25,.25]},
 {name:'Sanitario · planta 40 × 70 cm',cat:'Sanitarios',key:'sanitario40',parts:[['rect',0,0,.4,.18],['ellipse',.2,.43,.18,.25],['circle',.2,.43,.07]],pivot:[.2,.35]}
];
const $=id=>document.getElementById(id);
const NS='http://www.w3.org/2000/svg';
function bounds(parts){const all=[];for(const p of parts){
 if(p[0]==='line')all.push([p[1],p[2]],[p[3],p[4]]);
 if(p[0]==='rect')all.push([p[1],p[2]],[p[1]+p[3],p[2]+p[4]]);
 if(p[0]==='circle'||p[0]==='arc')all.push([p[1]-p[3],p[2]-p[3]],[p[1]+p[3],p[2]+p[3]]);
 if(p[0]==='ellipse')all.push([p[1]-p[3],p[2]-p[4]],[p[1]+p[3],p[2]+p[4]]);
 }return {minX:Math.min(...all.map(p=>p[0])),maxX:Math.max(...all.map(p=>p[0])),minY:Math.min(...all.map(p=>p[1])),maxY:Math.max(...all.map(p=>p[1]))}}
function elements(d,unit){
 const factor=({m:1,cm:100,mm:1000,in:39.37007874,ft:3.280839895}[unit]||1);
 const pt=(x,y)=>({x:(x-d.pivot[0])*factor,y:(y-d.pivot[1])*factor}),v=[];
 for(const p of d.parts){
 if(p[0]==='line')v.push({type:'line',a:pt(p[1],p[2]),b:pt(p[3],p[4]),layer:'0'});
 else if(p[0]==='rect')v.push({type:'rect',a:pt(p[1],p[2]),b:pt(p[1]+p[3],p[2]+p[4]),layer:'0'});
 else if(p[0]==='circle')v.push({type:'circle',c:pt(p[1],p[2]),r:p[3]*factor,layer:'0'});
 else if(p[0]==='arc')v.push({type:'arc',c:pt(p[1],p[2]),r:p[3]*factor,a0:p[4],a1:p[5],layer:'0'});
 else if(p[0]==='ellipse')v.push({type:'ellipse',c:pt(p[1],p[2]),rx:p[3]*factor,ry:p[4]*factor,rotation:0,layer:'0'});
 }return v;
}
function preview(d){
 const svg=document.createElementNS(NS,'svg'),b=bounds(d.parts),pad=.12;
 svg.setAttribute('viewBox',[b.minX-pad,-b.maxY-pad,b.maxX-b.minX+2*pad,b.maxY-b.minY+2*pad].join(' '));
 svg.style.cssText='width:100%;height:105px;background:#101820;border-radius:5px';
 const g=document.createElementNS(NS,'g');g.setAttribute('transform','scale(1 -1)');
 for(const p of d.parts){
  let el;
  if(p[0]==='line'){el=document.createElementNS(NS,'line');[['x1',p[1]],['y1',p[2]],['x2',p[3]],['y2',p[4]]].forEach(([k,v])=>el.setAttribute(k,v))}
  else if(p[0]==='rect'){el=document.createElementNS(NS,'rect');[['x',p[1]],['y',p[2]],['width',p[3]],['height',p[4]]].forEach(([k,v])=>el.setAttribute(k,v))}
  else if(p[0]==='circle'||p[0]==='ellipse'){el=document.createElementNS(NS,p[0]);[['cx',p[1]],['cy',p[2]],['rx',p[3]],['ry',p[4]]].filter(([k])=>p[0]==='ellipse'||(k!=='rx'&&k!=='ry')).forEach(([k,v])=>el.setAttribute(k,v));if(p[0]==='circle')el.setAttribute('r',p[3])}
  else if(p[0]==='arc'){el=document.createElementNS(NS,'path');const [_,x,y,r,a,z]=p;const start=[x+r*Math.cos(a),y+r*Math.sin(a)],end=[x+r*Math.cos(z),y+r*Math.sin(z)];el.setAttribute('d','M '+start.join(' ')+' A '+r+' '+r+' 0 '+(Math.abs(z-a)>Math.PI?1:0)+' 1 '+end.join(' '))}
  if(!el)continue;el.setAttribute('fill','none');el.setAttribute('stroke','#d8f0fa');el.setAttribute('stroke-width','.013');g.append(el);
 }
 const pivot=document.createElementNS(NS,'circle');pivot.setAttribute('cx',d.pivot[0]);pivot.setAttribute('cy',d.pivot[1]);pivot.setAttribute('r','.024');pivot.setAttribute('fill','#f7ca5c');g.append(pivot);svg.append(g);return svg;
}
function init(){
 const body=$('blBody'),api=window.BlacklineBlockAPI;if(!body||!api||$('blDxfFeatured'))return;
 const panel=document.createElement('section');panel.id='blDxfFeatured';panel.innerHTML='<h3 style="font-size:12px;margin:8px 0">Bloques arquitectónicos · DXF adaptado</h3><p style="font-size:10px;line-height:1.5">Cuatro símbolos simplificados basados en categorías de BLOQUES OLIMPIADAS.dxf. No reproducen exactamente el original. Cuentan con pivote y dimensiones arquitectónicas definidas.</p><div id="blDxfFeaturedCards" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px"></div>';
 const importArea=$('blDxfImportArea');if(importArea)importArea.before(panel);else body.prepend(panel);
 const cards=$('blDxfFeaturedCards');
 for(const d of defs){
  const card=document.createElement('div');card.style.cssText='padding:6px;min-width:0;border:1px solid #4d6576;border-radius:8px;background:#1c252f';
  const name=document.createElement('div');name.textContent=d.name;name.style.cssText='font-size:11px;line-height:1.4;margin:5px 0';
  const btn=document.createElement('button');btn.className='btn';btn.type='button';btn.textContent='Insertar bloque';btn.style.cssText='width:100%;font-size:10px';
  btn.onclick=()=>{
   const key='BL Adaptado · '+d.key;
   try{if(!api.hasBlock(key)){
    const unitFactor=({m:1,cm:100,mm:1000,in:39.37007874,ft:3.280839895}[api.unit()]||1);
    const param=d.key==='puerta90'?{kind:'swing-door',defaults:{width:.9*unitFactor,mirror:false}}:
      d.key==='mesa120'?{kind:'round-table',defaults:{width:1.2*unitFactor}}:null;
    api.addBlock(key,elements(d,api.unit()),param);
   }api.selectBlock(key);btn.textContent='Listo · clic en plano'}catch(ex){btn.textContent='Error: '+ex.message}
  };
  card.append(preview(d),name,btn);cards.append(card);
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();