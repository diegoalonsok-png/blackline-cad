/* CAD2D · Importar PDF.
   PDF vectorial (ploteado desde cualquier CAD): convierte los trazos en polilíneas editables y los
   textos en textos, a escala real según la escala de ploteo (1:100, 1:50…). PDF escaneado: entra como imagen
   de fondo (después CALIBRAR). Usa pdf.js (Mozilla, Apache-2.0), cargado solo al importar un PDF. */
(function(){
'use strict';
const C=window.CAD2D_CORE;if(!C||window.CAD2D_PDF_IMPORT)return;
const BASE=new URL('vendor/pdfjs/',document.currentScript?.src||location.href).href;
let lib=null;
async function pdfjs(){if(!lib){lib=await import(BASE+'pdf.min.mjs');lib.GlobalWorkerOptions.workerSrc=BASE+'pdf.worker.min.mjs'}return lib}
const mul=(m,n)=>[m[0]*n[0]+m[2]*n[1],m[1]*n[0]+m[3]*n[1],m[0]*n[2]+m[2]*n[3],m[1]*n[2]+m[3]*n[3],m[0]*n[4]+m[2]*n[5]+m[4],m[1]*n[4]+m[3]*n[5]+m[5]];
const apply=(m,x,y)=>[m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]];
/* Devuelve {paths:[{pts:[[x,y]...],closed}], texts:[{x,y,h,rot,str}], w,h} en puntos PDF (y hacia arriba). */
async function extract(page){
 const L=await pdfjs(),OPS=L.OPS,ops=await page.getOperatorList(),vp=page.getViewport({scale:1});
 let ctm=[1,0,0,1,0,0];const stack=[],paths=[],mc=[];let pending=[];
 const curLayer=()=>{for(let j=mc.length-1;j>=0;j--)if(mc[j])return mc[j];return null};
 let stroke='#ffffff';const hex=v=>{if(typeof v==='string')return v.startsWith('#')?v:'#'+v;const n=x=>Math.max(0,Math.min(255,Math.round(x<=1&&x>=0&&!Number.isInteger(x)?x*255:x))).toString(16).padStart(2,'0');return '#'+n(v[0])+n(v[1])+n(v[2])};
 const flush=keep=>{if(keep)for(const p of pending)if(p.pts.length>1){p.layer=curLayer();p.color=stroke;paths.push(p)}pending=[]};
 for(let i=0;i<ops.fnArray.length;i++){
  const fn=ops.fnArray[i],a=ops.argsArray[i];
  if(fn===OPS.beginMarkedContentProps){const v=a?.[1];const id=a?.[0]==='OC'?(v?.id||(Array.isArray(v?.ids)?v.ids[0]:null)||(typeof v==='string'?v:null)):null;mc.push(id)}
  else if(fn===OPS.beginMarkedContent)mc.push(null);
  else if(fn===OPS.endMarkedContent)mc.pop();
  else if(fn===OPS.setStrokeRGBColor){try{stroke=hex(a.length===1?a[0]:a)}catch(e){}}
  else if(fn===OPS.setStrokeGray){const g=Math.round((a[0]<=1?a[0]*255:a[0]));stroke=hex([g,g,g])}
  else if(fn===OPS.save)stack.push(ctm.slice());
  else if(fn===OPS.restore)ctm=stack.pop()||[1,0,0,1,0,0];
  else if(fn===OPS.transform)ctm=mul(ctm,a);
  else if(fn===OPS.constructPath){
   const [sub,args]=a;let k=0,cur=null;const T=(x,y)=>apply(ctm,x,y);
   for(const op of sub){
    if(op===OPS.moveTo){cur={pts:[T(args[k],args[k+1])],closed:false};pending.push(cur);k+=2}
    else if(op===OPS.lineTo){if(!cur){cur={pts:[],closed:false};pending.push(cur)}cur.pts.push(T(args[k],args[k+1]));k+=2}
    else if(op===OPS.curveTo||op===OPS.curveTo2||op===OPS.curveTo3){
     const n=op===OPS.curveTo?6:4,c=args.slice(k,k+n);k+=n;if(!cur)continue;
     const p0=cur.pts.at(-1);let p1,p2,p3;
     if(op===OPS.curveTo){p1=T(c[0],c[1]);p2=T(c[2],c[3]);p3=T(c[4],c[5])}
     else if(op===OPS.curveTo2){p1=p0;p2=T(c[0],c[1]);p3=T(c[2],c[3])}
     else{p1=T(c[0],c[1]);p2=T(c[2],c[3]);p3=p2}
     for(let s=1;s<=8;s++){const t=s/8,u=1-t;cur.pts.push([u*u*u*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t*t*t*p3[0],u*u*u*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t*t*t*p3[1]])}
    }
    else if(op===OPS.rectangle){const [x,y,w,h]=args.slice(k,k+4);k+=4;cur={pts:[T(x,y),T(x+w,y),T(x+w,y+h),T(x,y+h)],closed:true};pending.push(cur);cur=null}
    else if(op===OPS.closePath){if(cur)cur.closed=true}
   }
  }
  else if([OPS.stroke,OPS.closeStroke,OPS.fill,OPS.eoFill,OPS.fillStroke,OPS.eoFillStroke,OPS.closeFillStroke,OPS.closeEOFillStroke].includes(fn)){if(fn===OPS.closeStroke)for(const p of pending)p.closed=true;flush(true)}
  else if(fn===OPS.endPath)flush(false);
 }
 const tc=await page.getTextContent(),texts=[];
 for(const it of tc.items){const s=String(it.str||'').trim();if(!s)continue;const m=it.transform,h=Math.hypot(m[2],m[3])||Math.hypot(m[0],m[1]);texts.push({x:m[4],y:m[5],h,rot:Math.atan2(m[1],m[0])*180/Math.PI,str:s})}
 return {paths,texts,w:vp.width,h:vp.height};
}
function ask(info){
 return new Promise(res=>{
  document.getElementById('cadPdfDlg')?.remove();
  const d=document.createElement('div');d.id='cadPdfDlg';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');
  d.style.cssText='position:fixed;inset:0;z-index:9400;background:rgba(5,9,13,.6);display:flex;align-items:center;justify-content:center;font:13px/1.45 system-ui,sans-serif';
  const pages=[...Array(info.pages)].map((_,i)=>'<option value="'+(i+1)+'">'+(i+1)+'</option>').join('');
  const scales=[1,20,50,75,100,200,500].map(v=>'<option value="'+v+'"'+(v===100?' selected':'')+'>'+(v===1?'1:1 (tamaño de hoja)':'1:'+v)+'</option>').join('')+'<option value="x">Otra…</option>';
  d.innerHTML='<div style="background:#141c24;color:#e5eef7;border:1px solid #4d6676;border-radius:12px;padding:16px 18px;width:min(420px,92vw);box-shadow:0 24px 60px #000a">'+
   '<div style="display:flex;justify-content:space-between;align-items:center;letter-spacing:.06em;font-size:12px;color:#9fc3d6"><b>IMPORTAR PDF</b><button data-x style="all:unset;cursor:pointer;font-size:18px">×</button></div>'+
   '<p style="margin:8px 0 10px;color:#cfe3ef">'+info.name+'</p>'+
   (info.vector?'<p style="margin:0 0 10px;color:#9fd8a8">✓ Dibujo vectorial detectado ('+info.paths+' trazos'+(info.layers.length?', '+info.layers.length+' capas':'')+')</p>':'<p style="margin:0 0 10px;color:#ffd27f">Sin dibujo vectorial (parece escaneado): se inserta como imagen para calcar y luego CALIBRAR.</p>')+
   '<label style="display:flex;justify-content:space-between;margin:6px 0">Página <select data-k="page">'+pages+'</select></label>'+
   (info.vector?'<label style="display:flex;justify-content:space-between;margin:6px 0">Escala de ploteo <select data-k="scale">'+scales+'</select></label>'+
   '<label style="display:flex;justify-content:space-between;margin:6px 0">Escala personalizada 1: <input data-k="custom" type="number" min="0.001" step="any" value="100" style="width:90px" disabled></label>'+
   '<label style="display:block;margin:6px 0"><input type="checkbox" data-k="layers"'+(info.layers.length?' checked':' disabled')+'> Importar con capas'+(info.layers.length?' ('+info.layers.slice(0,4).join(', ')+(info.layers.length>4?'…':'')+')':' (el PDF no trae capas)')+'</label>'+
   '<label style="display:block;margin:6px 0"><input type="checkbox" data-k="text" checked> Importar textos</label>':'')+
   '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px"><button data-x class="btn">Cancelar</button><button data-ok class="btn" style="border-color:#c79a3a">Importar</button></div></div>';
  document.body.append(d);
  const q=k=>d.querySelector('[data-k="'+k+'"]'),done=v=>{d.remove();res(v)};
  q('scale')?.addEventListener('change',()=>{q('custom').disabled=q('scale').value!=='x'});
  q('page').addEventListener('change',()=>done({repage:Number(q('page').value)}));
  d.querySelector('[data-ok]').onclick=()=>{const sv=q('scale')?.value;done({page:Number(q('page').value),scale:sv==='x'?Number(q('custom').value):Number(sv||1),layers:!!q('layers')?.checked,text:q('text')?q('text').checked:true})};
  d.querySelectorAll('[data-x]').forEach(b=>b.onclick=()=>done(null));
  if(info.page)q('page').value=String(info.page);
 });
}
async function importPdf(file){
 const S=C.state;C.toast('Leyendo PDF…');
 let doc;try{const L=await pdfjs();doc=await L.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise}catch(e){return C.toast('No se pudo leer el PDF: '+(e?.message||e))}
 let occ=null;try{occ=await doc.getOptionalContentConfig()}catch(e){}
 const lname=id=>{try{return occ?.getGroup(id)?.name||null}catch(e){return null}};
 let pageNo=1,opt=null,page,g;
 for(;;){
  page=await doc.getPage(pageNo);g=await extract(page);
  const segs=g.paths.reduce((n,p)=>n+p.pts.length,0),layers=[...new Set(g.paths.map(p=>p.layer&&lname(p.layer)).filter(Boolean))];
  opt=await ask({name:file.name,pages:doc.numPages,page:pageNo,vector:segs>=20,paths:g.paths.length,layers});
  if(!opt)return C.toast('Importación de PDF cancelada');
  if(opt.repage){pageNo=opt.repage;continue}
  opt.vector=segs>=20;break;
 }
 if(!opt.vector){
  const vp=page.getViewport({scale:2}),cv=document.createElement('canvas');cv.width=vp.width;cv.height=vp.height;
  await page.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise;
  const blob=await new Promise(r=>cv.toBlob(r,'image/png'));
  window.CAD2D_IMPORT_FILE?.(new File([blob],file.name.replace(/\.pdf$/i,'')+'-p'+pageNo+'.png',{type:'image/png'}));
  return C.toast('PDF escaneado insertado como imagen. Medí con DIST una cota conocida y usá CALIBRAR <medida>.');
 }
 const sc=opt.scale;if(!(sc>0))return C.toast('Escala inválida');
 const k=0.0254/72*sc*1000/C.U[S.unit];
 const c=C.world?C.world({x:C.canvas.clientWidth/2,y:C.canvas.clientHeight/2}):C.P(0,0);
 const ox=c.x-g.w*k/2,oy=c.y-g.h*k/2,Q=(x,y)=>C.P(ox+x*k,oy+y*k);
 C.saveHistory();const ids=[],base=S.layerId,made=new Map(),palette=['#e5e5e5','#ff6b6b','#ffd166','#06d6a0','#4cc9f0','#b388ff','#f78c6b','#9ad1d4'];
 const layerOf=id=>{if(!opt.layers||!id)return base;const name=lname(id);if(!name)return base;if(made.has(name))return made.get(name);
  let l=S.layers.find(x=>x.name.toUpperCase()===name.toUpperCase());
  if(!l){const col=g.paths.find(q=>q.layer===id&&q.color)?.color;l={id:'pdf_'+Date.now().toString(36)+'_'+made.size,name,color:/^#[0-9a-f]{6}$/i.test(col||'')&&!/^#(000000|ffffff)$/i.test(col)?col:palette[made.size%palette.length],visible:true,locked:false};S.layers.push(l)}
  made.set(name,l.id);return l.id};
 for(const p of g.paths){
  const pts=p.pts.filter((q,i,a)=>!i||Math.hypot(q[0]-a[i-1][0],q[1]-a[i-1][1])>1e-3).map(q=>Q(q[0],q[1]));
  if(pts.length<2)continue;const id=S.nextId++,layer=layerOf(p.layer);
  S.entities.push(pts.length===2&&!p.closed?{id,type:'line',a:pts[0],b:pts[1],layer}:{id,type:'polyline',pts,closed:!!p.closed&&pts.length>2,layer});ids.push(id);
 }
 if(opt.text)for(const t of g.texts){const id=S.nextId++;S.entities.push({id,type:'text',p:Q(t.x,t.y),text:t.str.slice(0,200),h:Math.max(1e-4,t.h*k),rotation:Math.round(t.rot*100)/100,fontFamily:'Arial',layer:base});ids.push(id)}
 S.selected=ids;C.updateAll();C.zoomExtents?.();C.log('PDFIMPORT '+file.name+' p'+pageNo+' 1:'+sc);
 C.toast('PDF importado: '+g.paths.length+' trazos'+(opt.text?' y '+g.texts.length+' textos':'')+(made.size?' en '+made.size+' capas':'')+' a 1:'+sc+'. Verificá con DIST una cota conocida.');
}
function pick(){const i=document.createElement('input');i.type='file';i.accept='.pdf,application/pdf';i.onchange=()=>{if(i.files[0])importPdf(i.files[0])};i.click()}
const EXT=window.CAD2D_EXTENSIONS=window.CAD2D_EXTENSIONS||{commands:{},context:[],overlays:[],ribbon:{}};EXT.commands=EXT.commands||{};
for(const k of ['PDFIMPORT','IMPORTARPDF','PDFIMPORTAR','PDF'])EXT.commands[k]=()=>pick();
const ICON='<path d="M6 2h9l5 5v15H6z"/><path d="M15 2v5h5"/><text x="7.5" y="17" font-size="6" font-family="Arial" stroke="none" fill="currentColor">PDF</text>';
try{C.ribbon?.add('output','PDF',[{id:'outPdfImport',label:'Importar PDF · PDFIMPORT',icon:ICON,run:()=>pick()}]);C.ribbon?.rebuild()}catch(e){}

/* CALCO: local raster line extraction. First version, orthogonal plans only. */
function traceRuns(mask,w,h,min){
 const result=[];
 function scan(vertical){
  const rows=vertical?w:h,cols=vertical?h:w,groups=[];
  for(let y=0;y<rows;y++){
   let x=0;
   while(x<cols){
    const dark=i=>mask[vertical?i*w+y:y*w+i];
    while(x<cols&&!dark(x))x++;
    const a=x;while(x<cols&&dark(x))x++;
    if(x-a<min)continue;
    const b=x-1;
    const g=groups.findLast(g=>g.last===y-1&&Math.abs(g.a-a)<=3&&Math.abs(g.b-b)<=3);
    if(g){g.last=y;g.a=(g.a*g.n+a)/(g.n+1);g.b=(g.b*g.n+b)/(g.n+1);g.n++;}
    else groups.push({a,b,first:y,last:y,n:1});
   }
  }
  for(const g of groups){
   const cy=(g.first+g.last)/2;
   // Discard broad filled areas; retain the centre of thin strokes.
   if(g.last-g.first+1>Math.max(12,(g.b-g.a)*.25))continue;
   result.push(vertical?[[cy,g.a],[cy,g.b]]:[[g.a,cy],[g.b,cy]]);
  }
 }
 scan(false);scan(true);return result;
}

// Solid-band recognition: require substantial filled thickness, not individual drafting strokes.
// Coordinates are raster pixels; opposite faces are generated by the CAD wall engine.
function traceWallBands(mask,w,h){
 const minLen=Math.max(24,Math.round(Math.max(w,h)*.06)),minT=Math.max(3,Math.round(Math.max(w,h)*.006)),maxT=Math.max(minT+1,Math.round(Math.max(w,h)*.065)),out=[];
 for(const vertical of [false,true]){
  const rows=vertical?w:h,cols=vertical?h:w,active=[];
  for(let y=0;y<rows;y++){
   let x=0;const at=i=>mask[vertical?i*w+y:y*w+i];
   while(x<cols){while(x<cols&&!at(x))x++;const a=x;while(x<cols&&at(x))x++;const b=x;
    if(b-a<minLen)continue;
    let best=null,score=0;
    for(let j=active.length-1;j>=0;j--){const g=active[j];if(g.last<y-1)break;if(g.last!==y-1)continue;
     const overlap=Math.min(b,g.b)-Math.max(a,g.a),fraction=overlap/Math.max(b-a,g.b-g.a);
     if(fraction>.72&&fraction>score){best=g;score=fraction;}}
    if(best){best.last=y;best.a=Math.max(best.a,a);best.b=Math.min(best.b,b);}
    else active.push({first:y,last:y,a,b});
   }
   // Keep recently continued groups at the end for bounded matching.
   active.sort((a,b)=>a.last-b.last);
  }
  for(const g of active){const t=g.last-g.first+1,l=g.b-g.a;if(t<minT||t>maxT||l<Math.max(minLen,t*2.5))continue;
   const c=(g.first+g.last+1)/2;
   out.push({a:vertical?[c,g.a]:[g.a,c],b:vertical?[c,g.b]:[g.b,c],t});
  }
 }
 // Snap nearby perpendicular axes to their theoretical corner only if they reach it.
 for(const a of out)for(const b of out){if(a===b||a.a[0]===a.b[0]||b.a[1]===b.b[1])continue;
  const p=[b.a[0],a.a[1]],tol=Math.max(a.t,b.t)*.8;
  if(p[0]<Math.min(a.a[0],a.b[0])-tol||p[0]>Math.max(a.a[0],a.b[0])+tol||p[1]<Math.min(b.a[1],b.b[1])-tol||p[1]>Math.max(b.a[1],b.b[1])+tol)continue;
  for(const k of ['a','b']){if(Math.hypot(a[k][0]-p[0],a[k][1]-p[1])<=tol)a[k]=p.slice();if(Math.hypot(b[k][0]-p[0],b[k][1]-p[1])<=tol)b[k]=p.slice();}
 }
 return out;
}

// Conservative fallback for outlined, diagonally hatched orthogonal walls.
// Require two sustained parallel edges AND distributed ink between them.
// This is a candidate detector; the operator can reject any segment in preview.
function traceHatchedWallBands(mask,w,h){
 const M=Math.max(w,h),minLen=Math.max(12,Math.round(M*.045)),minT=Math.max(3,Math.round(M*.008)),maxT=Math.max(minT+1,Math.round(M*.035)),out=[];
 for(const v of [false,true]){
  const rows=v?w:h,cols=v?h:w,groups=[];
  const at=(y,x)=>mask[v?x*w+y:y*w+x];
  let previous=[];
  for(let y=0;y<rows;y++){
   let x=0;const current=[];
   while(x<cols){
    while(x<cols&&!at(y,x))x++;const a=x;
    while(x<cols&&at(y,x))x++;const b=x;
    if(b-a<minLen)continue;
    let g=previous.find(q=>Math.abs(q.a-a)<=4&&Math.abs(q.b-b)<=4&&!current.includes(q));
    if(g){g.last=y;g.a=Math.max(g.a,a);g.b=Math.min(g.b,b);}
    else{g={first:y,last:y,a,b};groups.push(g);}
    current.push(g);
   }
   previous=current;
  }
  const lines=groups.filter(g=>g.last-g.first+1<=Math.max(6,M*.006)&&g.b-g.a>=minLen).map(g=>({...g,c:(g.first+g.last)/2})).sort((a,b)=>a.c-b.c);
  if(lines.length>4000)continue;
  for(let i=0;i<lines.length;i++)for(let j=i+1;j<lines.length;j++){
   const A=lines[i],B=lines[j],t=B.c-A.c;if(t>maxT)break;if(t<minT)continue;
   const lo=Math.max(A.a,B.a),hi=Math.min(A.b,B.b),need=Math.max(minLen,2.2*t);
   if(hi-lo<need)continue;
   const y0=Math.ceil(A.c+t*.2),y1=Math.floor(B.c-t*.2)+1,step=Math.max(5,Math.round(t*.75));
   let start=null;
   for(let x=lo;x<=hi;x+=step){
    const end=Math.min(hi,x+step),nx=end-x,ny=y1-y0;let good=false;
    if(nx>0&&ny>0){
     const counts=new Uint16Array(nx);let ink=0,coveredRows=0;
     for(let y=y0;y<y1;y++){let n=0;for(let u=x;u<end;u++)if(at(y,u)){n++;counts[u-x]++;}ink+=n;if(n/nx>.07)coveredRows++;}
     let coveredCols=0;for(const n of counts)if(n/ny>.07)coveredCols++;
     const density=ink/(nx*ny);good=density>=.12&&density<=.78&&coveredRows/ny>.65&&coveredCols/nx>.65;
    }
    if(good){if(start===null)start=x;}
    else if(start!==null){if(x-start>=need){const c=(A.c+B.c)/2;out.push({v,c,lo:start,hi:x,t});}start=null;}
    if(end===hi&&start!==null){if(hi-start>=need){const c=(A.c+B.c)/2;out.push({v,c,lo:start,hi,t});}start=null;}
   }
  }
 }
 const kept=[];
 for(const q of out.sort((a,b)=>(b.hi-b.lo)-(a.hi-a.lo))){
  if(kept.some(p=>p.v===q.v&&Math.abs(p.c-q.c)<Math.max(p.t,q.t)*.7&&Math.min(p.hi,q.hi)-Math.max(p.lo,q.lo)>.25*Math.min(p.hi-p.lo,q.hi-q.lo)))continue;
  kept.push(q);
 }
 const walls=kept.map(q=>({a:q.v?[q.c,q.lo]:[q.lo,q.c],b:q.v?[q.c,q.hi]:[q.hi,q.c],t:q.t}));
 for(const a of walls)for(const b of walls){if(a===b||a.a[0]===a.b[0]||b.a[1]===b.b[1])continue;
  const p=[b.a[0],a.a[1]],tol=Math.max(a.t,b.t)*.8;
  if(p[0]<Math.min(a.a[0],a.b[0])-tol||p[0]>Math.max(a.a[0],a.b[0])+tol||p[1]<Math.min(b.a[1],b.b[1])-tol||p[1]>Math.max(b.a[1],b.b[1])+tol)continue;
  for(const k of ['a','b']){if(Math.hypot(a[k][0]-p[0],a[k][1]-p[1])<=tol)a[k]=p.slice();if(Math.hypot(b[k][0]-p[0],b[k][1]-p[1])<=tol)b[k]=p.slice();}
 }
 return walls;
}

// Fine hatching: tolerate short interruptions along the two faces, use the
// original ink for texture evidence, and never accept a single drafting line.
function traceFineWallBands(mask,w,h){
 const M=Math.max(w,h),minLen=Math.max(16,Math.round(M*.035)),minT=Math.max(4,M*.004),maxT=M*.04,out=[];
 for(const v of [false,true]){
  const rows=v?w:h,cols=v?h:w,groups=[];let previous=[];
  const at=(y,x)=>mask[v?x*w+y:y*w+x];
  for(let y=0;y<rows;y++){
   let x=0;const current=[],used=new Set();
   while(x<cols){
    while(x<cols&&!at(y,x))x++;const a=x;let b=x;
    while(x<cols){if(at(y,x)){b=x+1;x++;continue;}if(x-b>=4)break;x++;}
    if(b-a<minLen)continue;
    let g=previous.find(q=>!used.has(q)&&Math.abs(q.a-a)<=5&&Math.abs(q.b-b)<=5);
    if(g){g.last=y;g.a=Math.max(g.a,a);g.b=Math.min(g.b,b);}
    else{g={first:y,last:y,a,b};groups.push(g);}
    current.push(g);used.add(g);
   }
   previous=current;
   if(groups.length>12000)return [];
  }
  const lines=groups.filter(g=>g.last-g.first+1<=Math.max(6,M*.007)&&g.b-g.a>=minLen).map(g=>({...g,c:(g.first+g.last)/2})).sort((a,b)=>a.c-b.c);
  if(lines.length>4000)return [];
  let budget=18000000;
  for(let i=0;i<lines.length;i++)for(let j=i+1;j<lines.length;j++){
   const A=lines[i],B=lines[j],t=B.c-A.c;if(t>maxT)break;if(t<minT)continue;
   const lo=Math.max(A.a,B.a),hi=Math.min(A.b,B.b);
   if(hi-lo<Math.max(M*.04,3*t))continue;
   const y0=Math.ceil(A.c+t*.18),y1=Math.floor(B.c-t*.18)+1,ny=y1-y0,step=Math.max(6,Math.round(t));
   if(ny<=0)continue;
   budget-=(hi-lo)*ny;if(budget<0)break;
   let good=0,total=0;
   for(let x=lo;x<hi;x+=step){
    const nx=Math.min(step,hi-x),counts=new Uint16Array(nx);let ink=0,coveredRows=0;
    for(let y=y0;y<y1;y++){let n=0;for(let u=0;u<nx;u++)if(at(y,x+u)){n++;counts[u]++;}ink+=n;if(n/nx>.04)coveredRows++;}
    let coveredCols=0;for(const n of counts)if(n/ny>.04)coveredCols++;
    const density=ink/(nx*ny);if(density>=.06&&density<=.85&&coveredCols/nx>.43&&coveredRows/ny>.55)good++;total++;
   }
   if(good/total>=.65)out.push({v,c:(A.c+B.c)/2,lo,hi,t,score:good/total});
   if(out.length>6000)return [];
  }
 }
 const kept=[];
 for(const q of out.sort((a,b)=>(b.hi-b.lo)*b.score-(a.hi-a.lo)*a.score)){
  if(kept.some(p=>p.v===q.v&&Math.abs(p.c-q.c)<Math.max(p.t,q.t)*.75&&Math.min(p.hi,q.hi)-Math.max(p.lo,q.lo)>.25*Math.min(p.hi-p.lo,q.hi-q.lo)))continue;
  kept.push(q);if(kept.length>=250)break;
 }
 return kept.map(q=>({a:q.v?[q.c,q.lo]:[q.lo,q.c],b:q.v?[q.c,q.hi]:[q.hi,q.c],t:q.t}));
}

// Local, non-generative preprocessing. Preserve drawing coordinates.
function imageFilterPixels(data,w,h,mode,strength=.65){
 const n=w*h,gray=new Uint8Array(n),hist=new Uint32Array(256);
 for(let i=0;i<n;i++){const j=i*4,v=Math.round(.299*data[j]+.587*data[j+1]+.114*data[j+2]);gray[i]=v;hist[v]++;}
 let hi=255,lo=0,count=0;for(let k=255;k>=0;k--){count+=hist[k];if(count>=n*.18){hi=k;break;}}count=0;
 for(let k=0;k<256;k++){count+=hist[k];if(count>=n*.015){lo=k;break;}}
 const clamp=v=>Math.max(0,Math.min(255,Math.round(v)));
 const paper=Math.max(80,hi),dark=Math.min(paper-20,lo);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=y*w+x,j=i*4,v=gray[i];let z=v;
  if(mode==='light')z=clamp(v*255/paper);
  else if(mode==='contrast')z=clamp((v-dark)*255/(paper-dark));
  else if(mode==='binary')z=v<paper*(.48+.36*strength)?0:255;
  else if(mode==='walls')z=clamp(120+135*v/paper);
  else if(mode==='sharp'||mode==='up2'||mode==='up4'){
   const near=(gray[y*w+Math.max(0,x-1)]+gray[y*w+Math.min(w-1,x+1)]+gray[Math.max(0,y-1)*w+x]+gray[Math.min(h-1,y+1)*w+x])/4;
   const delta=clamp(v+(v-near)*strength*1.7)-v;
   for(let k=0;k<3;k++)data[j+k]=clamp(data[j+k]+delta);
   data[j+3]=255;continue;
  }
  data[j]=data[j+1]=data[j+2]=z;data[j+3]=255;
 }
 return {paper,gray};
}
function imageOutputSize(w,h,factor){
 const scale=Math.min(factor,4096/Math.max(w,h),Math.sqrt(8000000/(w*h)));
 return [Math.max(1,Math.floor(w*scale)),Math.max(1,Math.floor(h*scale))];
}

let imageProcessingBusy=false;
async function editCalcoImage(entity,action){
 const S=C.state,valid=()=>S.entities.find(e=>e.id===entity.id&&e.type==='image'&&e.src===entity.src);
 if(imageProcessingBusy)return C.toast('Ya hay una imagen en procesamiento.');
 if(action==='restore'){
  if(!entity.imageOriginalSrc)return C.toast('La imagen ya es la original.');
  C.saveHistory();entity.src=entity.imageOriginalSrc;delete entity.imageOriginalSrc;delete entity.calcoUseProcessed;C.updateAll();C.toast('Imagen original restaurada.');return;
 }
 imageProcessingBusy=true;let dlg;
 try{
  const source=entity.src,im=new Image();im.src=source;await im.decode();
  if(!im.naturalWidth||!im.naturalHeight)throw Error('Imagen inválida.');
  const modes=[['light','Aclarar fondo'],['contrast','Contraste'],['binary','Blanco y negro'],['walls','Muros negros · candidatos'],['sharp','Nitidez'],['up2','Resolución ×2'],['up4','Resolución ×4']];
  dlg=document.createElement('dialog');dlg.style.cssText='background:#25282d;color:#e5eef7;border:1px solid #777;border-radius:12px;padding:14px;width:min(850px,94vw);max-height:88vh;overflow:auto';
  const title=document.createElement('h3');title.textContent='Mejorar imagen para CALCO';
  const toolbar=document.createElement('div');toolbar.style.cssText='display:flex;gap:8px;align-items:center;flex-wrap:wrap';
  const select=document.createElement('select');for(const [id,name] of modes)select.add(new Option(name,id));select.value=action==='resolution'?'up2':action;
  const intensity=document.createElement('input');intensity.type='range';intensity.min='0';intensity.max='100';intensity.value='65';intensity.title='Intensidad';
  const run=document.createElement('button');run.className='btn';run.textContent='Actualizar vista previa';
  const msg=document.createElement('p');msg.textContent='La imagen original y las medidas CAD se conservan.';
  const previews=document.createElement('div');previews.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:10px';
  const original=document.createElement('img');original.src=source;original.alt='Imagen antes de procesar';original.style.cssText='width:100%;max-height:48vh;object-fit:contain;background:white';
  const cv=document.createElement('canvas');cv.style.cssText='width:100%;max-height:48vh;object-fit:contain;background:white';
  for(const [label,el] of [['Antes',original],['Procesada',cv]]){const col=document.createElement('div'),caption=document.createElement('p');caption.textContent=label;col.append(caption,el);previews.append(col);}
  const use=document.createElement('input');use.type='checkbox';use.checked=entity.calcoUseProcessed!==false;const label=document.createElement('label');label.append(use,document.createTextNode(' Usar imagen procesada para CALCO'));
  const apply=document.createElement('button'),cancel=document.createElement('button');apply.className=cancel.className='btn';apply.textContent='Aplicar';cancel.textContent=LX('Cancelar','Cancel');apply.disabled=true;
  const render=async()=>{run.disabled=true;apply.disabled=true;msg.textContent='Procesando localmente…';await new Promise(r=>setTimeout(r,25));
   try{
    const mode=select.value,factor=mode==='up4'?4:mode==='up2'?2:1;
    let [w,h]=imageOutputSize(im.naturalWidth,im.naturalHeight,factor);
    cv.width=w;cv.height=h;const ctx=cv.getContext('2d',{willReadFrequently:true});ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(im,0,0,w,h);
    const p=ctx.getImageData(0,0,w,h),str=Number(intensity.value)/100;
    const {paper,gray}=imageFilterPixels(p.data,w,h,mode,str);ctx.putImageData(p,0,0);
    let suffix='';
    if(mode==='walls'){
     // Detect at bounded resolution on original grayscale, then paint only candidate bands.
     const k=Math.min(1,1400/Math.max(w,h)),dw=Math.max(1,Math.round(w*k)),dh=Math.max(1,Math.round(h*k)),mask=new Uint8Array(dw*dh);
     for(let y=0;y<dh;y++)for(let x=0;x<dw;x++)mask[y*dw+x]=gray[Math.min(h-1,Math.floor(y*h/dh))*w+Math.min(w-1,Math.floor(x*w/dw))]<paper*(.60+.30*str)?1:0;
     const all=[...traceWallBands(mask,dw,dh),...traceHatchedWallBands(mask,dw,dh),...traceFineWallBands(mask,dw,dh)];
     const walls=[];for(const q of all){if(walls.length>=250)break;const v=q.a[0]===q.b[0],c=v?q.a[0]:q.a[1],lo=v?q.a[1]:q.a[0],hi=v?q.b[1]:q.b[0];if(walls.some(t=>t.v===v&&Math.abs(t.c-c)<Math.max(q.t,t.q.t)*.6&&Math.min(hi,t.hi)-Math.max(lo,t.lo)>.5*Math.min(hi-lo,t.hi-t.lo)))continue;walls.push({q,v,c,lo,hi});}
     ctx.save();ctx.scale(w/dw,h/dh);ctx.strokeStyle='#000';ctx.lineCap='butt';for(const {q} of walls){ctx.lineWidth=q.t;ctx.beginPath();ctx.moveTo(...q.a);ctx.lineTo(...q.b);ctx.stroke();}ctx.restore();
     suffix=' · '+walls.length+' candidatos. Revisá falsos positivos y vanos; no es reconocimiento definitivo.';
     if(!walls.length){msg.textContent='No se detectaron candidatos. Elegí otro filtro.';return;}
    }
    msg.textContent=im.naturalWidth+' × '+im.naturalHeight+' → '+w+' × '+h+' px'+suffix+(factor>1?' · Interpolación y nitidez; no recupera detalles inexistentes.':'');apply.disabled=false;
   }catch(e){msg.textContent='Error: '+e.message;}finally{run.disabled=false;}
  };
  select.onchange=()=>{apply.disabled=true;msg.textContent='Actualizá la vista previa.';};intensity.oninput=()=>{apply.disabled=true;msg.textContent='Actualizá la vista previa.';};run.onclick=render;
  cancel.onclick=()=>dlg.close();apply.onclick=()=>{
   try{const current=S.entities.find(e=>e.id===entity.id&&e.type==='image'&&e.src===source);if(!current||C.layerFor(current).locked)throw Error('La imagen cambió o está bloqueada.');
    const url=cv.toDataURL('image/png');if(url.length>12000000)throw Error('Imagen procesada demasiado pesada. Elegí una resolución menor.');
    C.saveHistory();current.imageOriginalSrc=current.imageOriginalSrc||current.src;current.src=url;current.calcoUseProcessed=use.checked;C.updateAll();C.toast('Imagen mejorada. Podés restaurar el original.');dlg.close();
   }catch(e){msg.textContent=e.message;}
  };
  toolbar.append(select,intensity,run);dlg.append(title,toolbar,msg,previews,label,document.createElement('hr'),cancel,apply);
  await new Promise(resolve=>{dlg.addEventListener('close',resolve,{once:true});document.body.append(dlg);dlg.showModal();render();});
 }catch(e){C.toast('IMG: '+e.message);}finally{dlg?.remove();imageProcessingBusy=false;}
}
window.CAD2D_IMAGE_FILTER=editCalcoImage;

// Opt-in mixed detector: preserve the solid detector and add distinct hatch candidates.
function combineTraceCandidates(groups){
 const result=[];
 const descriptor=q=>{const v=q.a[0]===q.b[0],axis=v?1:0;return {v,c:q.a[1-axis],lo:Math.min(q.a[axis],q.b[axis]),hi:Math.max(q.a[axis],q.b[axis]),t:q.t};};
 for(const group of groups){
  if(!group.length||group.length>250)continue;
  for(const q of group){
   if(!q?.a?.every(Number.isFinite)||!q?.b?.every(Number.isFinite)||!Number.isFinite(q.t)||q.t<=0)continue;
   if(q.a[0]!==q.b[0]&&q.a[1]!==q.b[1])continue;
   const a=descriptor(q);if(a.hi<=a.lo)continue;
   const duplicate=result.some(p=>{const b=descriptor(p);return a.v===b.v&&Math.abs(a.c-b.c)<=.55*Math.max(a.t,b.t)&&Math.min(a.hi,b.hi)-Math.max(a.lo,b.lo)>.2*Math.min(a.hi-a.lo,b.hi-b.lo);});
   if(!duplicate)result.push({a:q.a.slice(),b:q.b.slice(),t:q.t});
   if(result.length>=250)return result;
  }
 }
 return result;
}

function runPythonTrace(ctx,w,h,realWidth){
 return new Promise((resolve,reject)=>{
  let worker=null,done=false;
  const dialog=document.createElement('dialog');
  dialog.style.cssText='background:#25282d;color:#e5eef7;border:1px solid #777;border-radius:12px;padding:20px;width:min(420px,90vw)';
  const title=document.createElement('h3');title.textContent='CALCOPY · Python';
  const status=document.createElement('p');status.textContent='Preparando el motor…';
  const cancel=document.createElement('button');cancel.className='btn';cancel.textContent=LX('Cancelar','Cancel');
  const finish=(err,walls)=>{if(done)return;done=true;worker?.terminate();dialog.remove();if(err)reject(err);else resolve(walls);};
  cancel.onclick=()=>finish(new Error('Procesamiento cancelado.'));
  dialog.addEventListener('cancel',e=>{e.preventDefault();cancel.click();});
  dialog.append(title,status,cancel);document.body.append(dialog);dialog.showModal();
  try{
   worker=new Worker(new URL('../../cad-calcopy-worker.js?v=20261126-fallback1',BASE));
   worker.onerror=e=>finish(new Error(e.message||'No se pudo iniciar Python.'));
   worker.onmessage=({data})=>{
    if(data.type==='progress'){status.textContent=data.message;C.log('CALCOPY: '+data.message);}
    else if(data.type==='error')finish(new Error(data.message));
    else if(data.type==='result')finish(null,{best:data.best,readings:data.readings,regions:data.regions,validation:data.validation,floor_grids:data.floor_grids,doors:data.doors});
   };
   const pixels=ctx.getImageData(0,0,w,h).data.buffer;
   worker.postMessage({pixels,w,h,realWidth},[pixels]);
  }catch(e){finish(e);}
 });
}

const LX=(es,en)=>{try{return localStorage.getItem('cad2d-alias-language')==='es'?es:en}catch(e){return en}};
function syncWall(A){const S=window.CAD2D_CALCOPY_ASSIST.seg(A);A.a=S.a;A.b=S.b;return A;}
let calcoBusy=false;
async function traceFile(file,source=null,python=false,brush=false){
 const S=C.state;if(S.tool!=='select'||S.stage?.length)return C.toast('Terminá el comando actual antes de calcar.');
 if(calcoBusy)return C.toast('CALCO ya está procesando una imagen.');calcoBusy=true;
 let bitmap,doc;
 try{
  C.log('CALCO: analizando imagen…');C.toast('CALCO: analizando imagen…');await new Promise(resolve=>setTimeout(resolve,30));
  if(source){bitmap=new Image();bitmap.src=source.calcoUseProcessed===false&&source.imageOriginalSrc?source.imageOriginalSrc:source.src;await bitmap.decode();}else if(/\.pdf$/i.test(file.name)){
   const L=await pdfjs();doc=await L.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
   const no=doc.numPages===1?1:Number(prompt('Página del PDF (1–'+doc.numPages+')','1'));
   if(!Number.isInteger(no)||no<1||no>doc.numPages)return;
   const page=await doc.getPage(no),g=await extract(page);
   // Semantic mode rasterizes vector PDFs as well, to recognize filled wall bands.
   const v=page.getViewport({scale:1}),vp=page.getViewport({scale:Math.min(2,1800/Math.max(v.width,v.height))}),cv=document.createElement('canvas');
   cv.width=Math.ceil(vp.width);cv.height=Math.ceil(vp.height);await page.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise;bitmap=cv;
  }else bitmap=await createImageBitmap(file);
  const ratio=python?Math.min(1,4096/Math.max(bitmap.width,bitmap.height),Math.sqrt(8000000/(bitmap.width*bitmap.height))):Math.min(1,1800/Math.max(bitmap.width,bitmap.height)),w=Math.max(1,Math.round(bitmap.width*ratio)),h=Math.max(1,Math.round(bitmap.height*ratio));
  const cv=document.createElement('canvas');cv.width=w;cv.height=h;const ctx=cv.getContext('2d',{willReadFrequently:true});ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.drawImage(bitmap,0,0,w,h);
  const pix=ctx.getImageData(0,0,w,h).data,mask=new Uint8Array(w*h);
  const makeMask=threshold=>{for(let i=0;i<mask.length;i++)mask[i]=(.299*pix[i*4]+.587*pix[i*4+1]+.114*pix[i*4+2])<threshold?1:0;};
  let real=source?Math.abs(source.b.x-source.a.x)*C.U[S.unit]/1000:0,preDetected=null;
  if(!source){
   const raw=prompt(python?'Ancho REAL de toda la imagen (m), incluido margen. Si no lo conocés, dejá vacío para estimar con un inodoro.':'Ancho REAL de toda la imagen, incluido margen (metros).','');
   if(raw===null)return;
   real=Number(raw.replace(',','.'));
   if(!raw.trim()&&python&&!brush&&confirm('Estimar escala por inodoro con IA local. La primera descarga del modelo puede ocupar varios cientos de MB. ¿Continuar?')){
    try{
     C.toast('CALCOPY: buscando inodoros para estimar la escala…');
     const vision=await import(new URL('cad-calco-vision.mjs?v=20261126-floor-zones',BASE.replace(/vendor\/pdfjs\/$/,'' )).href);
     preDetected=await vision.detect(cv,()=>{});
     const estimate=vision.toiletScale(preDetected,window.CAD2D_ARQ_LIBRARY?.library||[],w,h);
     if(estimate){const v=prompt('Escala APROXIMADA por '+estimate.samples+' inodoro(s). Ancho total de imagen (m). Confirmá o corregí; verificá con una medida conocida.',estimate.widthM.toFixed(2));if(v===null)return;real=Number(v.replace(',','.'));}
     else C.toast('No se encontró un inodoro completo y proporcionado para estimar escala.');
    }catch(e){C.log('CALCOPY: escala por inodoro no disponible: '+String(e.message||e));}
   }
   if(!(real>0&&real<=10000)){const v=prompt('Indicá ancho real de imagen (m) para continuar.','');if(v===null)return;real=Number(v.replace(',','.'));}
  }
  if(!(real>0&&real<=10000))return C.toast('Calco cancelado: escala inválida.');
  let walls=[],hatched=false,mode='macizos',pyReadings=null,initialRegions=[],floorGrids=[],doorCandidates=[];const AS=window.CAD2D_CALCOPY_ASSIST,G=python&&AS?AS.gray(pix,w,h):null,openings=[],history=[],scalePts=[];let scaleF=1;
  const assistWalls=list=>list.slice(0,250).map(q=>{const A=AS.axis(q);Object.assign(A,{wall_role:q.wall_role,nominal_cm:q.nominal_cm,thickness_cm:q.thickness_cm,width_review:q.width_review});return syncWall(A);});
  if(python){
   const height=source?Math.abs(source.b.y-source.a.y)*C.U[S.unit]/1000:real*h/w;
   if(Math.abs((height/h)/(real/w)-1)>.03)throw Error('CALCOPY: la imagen tiene escalas X/Y distintas. Calibrala antes de continuar.');
   try{
    if(brush)throw Error('Interactive brush mode: local geometry');
    const res=await runPythonTrace(ctx,w,h,real);
    if(!res||!res.readings||!Array.isArray(res.readings.solid)||!Array.isArray(res.readings.lines))throw Error('Respuesta Python inválida');
    pyReadings=res.readings;initialRegions=Array.isArray(res.regions)?res.regions:[];floorGrids=Array.isArray(res.floor_grids)?res.floor_grids:[];doorCandidates=Array.isArray(res.doors)?res.doors:[];mode=res.best;
    if(!Array.isArray(pyReadings[mode])||!pyReadings[mode].length){mode=Object.keys(pyReadings).find(k=>Array.isArray(pyReadings[k])&&pyReadings[k].length>0)||'solid';}
    walls=assistWalls(pyReadings[mode]);
    if(!walls.length)throw Error('Python returned no wall candidates');
   }catch(e){
    if(!AS)throw e;
    C.log('CALCOPY: Python unavailable or empty; using local geometric fallback. '+String(e.message||e));
    const bounded=list=>Array.isArray(list)&&list.length<=250?list:[];
    makeMask(155);const solidDark=bounded(traceWallBands(mask,w,h));
    makeMask(205);const solidLight=bounded(traceWallBands(mask,w,h)),lines=bounded(traceHatchedWallBands(mask,w,h));
    makeMask(170);const fine=bounded(traceFineWallBands(mask,w,h));
    pyReadings={solid:solidDark.length>=3?solidDark:solidLight,lines:lines.length?lines:fine};
    mode=pyReadings.solid.length>=3?'solid':pyReadings.lines.length?'lines':'solid';
    walls=assistWalls(pyReadings[mode]);
    initialRegions=[];floorGrids=[];doorCandidates=[];
    if(!walls.length)C.toast(LX('No se detectaron muros; revisá contraste y escala.','No walls detected; check contrast and scale.'));
   }
  }else{
  makeMask(205);
  walls=traceWallBands(mask,w,h);
  if(walls.length<3||walls.length>250){const other=traceHatchedWallBands(mask,w,h);if(other.length&&other.length<=250){walls=other;hatched=true;mode='rayados';}}
  if(walls.length<3||walls.length>250){makeMask(170);const fine=traceFineWallBands(mask,w,h);if(fine.length&&fine.length<=250){walls=fine;hatched=true;mode='rayado fino';}}
  if(walls.length>250)walls=[];
  }
  if(brush){pyReadings={...pyReadings,brush:[]};mode='brush';walls=[];}
  C.log('CALCO: '+walls.length+LX(' candidatos · ',' candidates · ')+mode+LX('. Revisar antes de insertar.','. Review before inserting.'));
  // Preview uses the same line endpoints as insertion; nothing is modified until confirmed.
  const preview=document.createElement('canvas');preview.width=w;preview.height=h;const pc=preview.getContext('2d');pc.fillStyle='#f4efe3';pc.fillRect(0,0,w,h);pc.strokeStyle='#343e40';pc.lineWidth=1.5;pc.beginPath();
  for(const wall of walls){pc.beginPath();pc.lineWidth=wall.t;pc.moveTo(...wall.a);pc.lineTo(...wall.b);pc.stroke();}
  const placements=[];let blocksOnly=false,dimensionOverall=false;
  const accepted=await new Promise(resolve=>{
   const d=document.createElement('dialog');d.style.cssText='background:#25282d;color:#e5eef7;border:1px solid #777;border-radius:12px;padding:12px;width:min(720px,92vw);max-height:85vh;overflow:auto';
   const title=document.createElement('p');title.textContent='CALCO ARQUITECTÓNICO · '+walls.length+' tramos de muro candidatos'+(hatched?' (muros rayados)':'')+LX('. Revisá la vista previa. Aberturas aún no reconocidas.','. Check the preview. Openings not recognized yet.');
   preview.style.cssText='width:100%;max-height:55vh;object-fit:contain;display:block';
   if(brush){const bounds=C.canvas.getBoundingClientRect();d.style.cssText=`position:fixed;inset:auto;left:${Math.max(0,bounds.left)}px;top:${Math.max(0,bounds.top)}px;width:${Math.min(bounds.width,innerWidth)}px;height:${Math.min(bounds.height,innerHeight-bounds.top)}px;max-width:none;max-height:none;box-sizing:border-box;margin:0;padding:6px;background:#20252b;color:#e5eef7;border:1px solid #475569;overflow:hidden;z-index:10000;display:flex;flex-direction:column;`;preview.style.cssText='display:block;object-fit:contain;cursor:crosshair;flex:none;margin:auto';}
   const ok=document.createElement('button'),cancel=document.createElement('button');ok.className=cancel.className='btn';ok.textContent=LX('Insertar muros y bloques marcados','Insert walls and marked blocks');cancel.textContent=LX('Cancelar','Cancel');ok.onclick=()=>d.close('ok');cancel.onclick=()=>d.close('cancel');
   const onlyBlocks=document.createElement('button');onlyBlocks.className='btn';onlyBlocks.textContent=LX('Insertar solo bloques','Insert blocks only');onlyBlocks.disabled=true;onlyBlocks.onclick=()=>{blocksOnly=true;d.close('ok');};
   const controls=document.createElement('div');controls.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin:8px 0';
   const dimOption=document.createElement('label'),dimCheck=document.createElement('input');dimCheck.type='checkbox';dimCheck.checked=false;dimCheck.onchange=()=>{dimensionOverall=dimCheck.checked;};dimOption.append(dimCheck,document.createTextNode(LX(' Acotar al final (medidas generales)',' Dimension at end (overall measurements)')));
   const picker=document.createElement('select'),rot=document.createElement('select'),undo=document.createElement('button'),retry=document.createElement('button');retry.className='btn';retry.textContent=LX('Probar otro detector','Try another detector');
   const catalog=window.CAD2D_ARQ_LIBRARY?.library||[];
   const candidates=catalog.filter(i=>!i.hideFromGallery&&!i.pro&&!i.paidOnly&&!i.dxfPlan&&/^(?:san-|dor-|mob-|kq-|esc-|ext-|veh-|ofi-|per-)/.test(i.id)&&Number.isFinite(i.w)&&i.w>0&&Number.isFinite(i.d)&&i.d>0);
   picker.add(new Option(LX('Elegir bloque…','Choose block…'),''));for(const i of candidates)picker.add(new Option(i.name,i.id));
   for(const angle of [0,90,180,270])rot.add(new Option(angle+'°',String(angle)));
   undo.textContent=LX('Deshacer marca','Undo mark');undo.className='btn';
   let selectedBlock=null;
   const blockScale=()=>({sx:real*scaleF/w,sy:source?Math.abs(source.b.y-source.a.y)*C.U[S.unit]/1000/h*scaleF:real*scaleF/w});
   const blockCenter=b=>{const {sx,sy}=blockScale(),a=b.rotation*Math.PI/180;return [b.x+(b.w*Math.cos(a)-b.d*Math.sin(a))/2/sx,b.y-(b.w*Math.sin(a)+b.d*Math.cos(a))/2/sy];};
   const rotateBlock=(b,angle)=>{const [cx,cy]=blockCenter(b),{sx,sy}=blockScale(),a=angle*Math.PI/180;b.rotation=angle;b.x=cx-(b.w*Math.cos(a)-b.d*Math.sin(a))/2/sx;b.y=cy+(b.w*Math.sin(a)+b.d*Math.cos(a))/2/sy;};
   const rotateBtn=document.createElement('button');rotateBtn.className='btn';rotateBtn.textContent=LX('Girar bloque 90°','Rotate block 90°');rotateBtn.disabled=true;
   rotateBtn.onclick=()=>{if(!selectedBlock||!placements.includes(selectedBlock))return;const b=selectedBlock,old={x:b.x,y:b.y,rotation:b.rotation,uncertain:b.uncertain};rotateBlock(b,(b.rotation+90)%360);b.uncertain=false;if(python)history.push(()=>Object.assign(b,old));redraw();};
   const topologyInfo=document.createElement('p');topologyInfo.style.cssText='font-size:12px;opacity:.85';
   const maskView=document.createElement('input');maskView.type='checkbox';const maskLabel=document.createElement('label');maskLabel.append(maskView,document.createTextNode(LX(' Ver máscara negra de muros',' Show black wall mask')));maskView.onchange=()=>redraw();
   const zoneView=document.createElement('input');zoneView.type='checkbox';zoneView.checked=!!python;const zoneLabel=document.createElement('label');zoneLabel.append(zoneView,document.createTextNode(LX(' Ver zonas semánticas',' Show semantic zones')));zoneView.onchange=()=>redraw();
   let topologyCache=null,topologyKey='';const zoneCanvas=document.createElement('canvas');
   const redraw=()=>{const {sx,sy}=blockScale();let liveTopology=null,activeRegions=initialRegions,classified=[];if(python&&AS?.reviewSpaces){const key=JSON.stringify([sx,sy,walls.map(q=>[q.v,q.c,q.lo,q.hi,q.t,!!q.skip]),openings.map(q=>[q.v,q.c,q.g0,q.g1,q.t,q.kind,!!q.w?.skip])]);if(key!==topologyKey){topologyCache=AS.reviewSpaces(walls,openings,w,h,Math.sqrt(sx*sy));topologyKey=key;}liveTopology=topologyCache;activeRegions=liveTopology.regions;}const clearance=python&&AS?.doorClearance?AS.doorClearance(openings,placements,sx,sy):[];const kinds={room_candidate:LX('Recintos rectangulares','Rectangular spaces'),technical_void_candidate:LX('Posibles conductos','Possible shafts'),polygonal_room_candidate:LX('Recintos poligonales','Polygonal spaces')};const parts=Object.entries(kinds).map(([k,v])=>v+': '+activeRegions.filter(q=>q.kind===k).length);parts.push(LX('Obstrucciones de puertas: ','Door obstructions: ')+clearance.length);if(python&&AS?.bathroomBasinAlignment)parts.push(LX('Lavabos frente al acceso: ','Basins facing entrance: ')+AS.bathroomBasinAlignment(openings,placements,sx,sy).length);parts.push(LX('Puertas batientes detectadas: ','Detected swing doors: ')+doorCandidates.filter(q=>q.kind==='swing-door').length,LX('Posibles corredizas embutidas: ','Possible pocket doors: ')+doorCandidates.filter(q=>q.kind==='pocket-door-candidate').length);parts.push(LX('Posibles tramas de piso: ','Possible floor grids: ')+floorGrids.length);parts.push(LX('Posibles recintos contenidos: ','Possible nested spaces: ')+activeRegions.filter(q=>q.possible_parent).length);if(AS?.classifyRooms){const objects=placements.map(b=>{const [x,y]=blockCenter(b);return {id:b.id,x,y};});const diag=AS.layoutDiagnostics?AS.layoutDiagnostics(activeRegions,objects):null;const rooms=diag?diag.rooms:AS.classifyRooms(activeRegions,objects);classified=rooms;if(AS.bathroomEnclosure){const checks=AS.bathroomEnclosure(walls,openings,objects,w/(real*scaleF));parts.push(LX('Baños: perímetro y puerta comprobados: ','Bathrooms: perimeter and door checked: ')+checks.filter(q=>q.privacy_validated).length,LX('Baños: perímetro a revisar: ','Bathrooms: perimeter review: ')+checks.filter(q=>q.status!=='four_sides_supported').length,LX('Baños: puerta no reconocida: ','Bathrooms: door not recognized: ')+checks.filter(q=>!q.door_count).length);}if(diag){parts.push(LX('Cocinas integradas: ','Open-plan kitchens: ')+diag.openPlans.length,LX('Conflictos de cerramiento: ','Enclosure conflicts: ')+diag.conflicts.length,LX('Inodoros sin recinto: ','Toilets without enclosure: ')+diag.uncontainedWC.length);}parts.push(LX('Posibles baños: ','Possible bathrooms: ')+rooms.filter(q=>q.use==='bathroom_candidate').length,LX('Posibles suites: ','Possible suites: ')+rooms.filter(q=>q.possible_suite).length,LX('Baños dentro de otros ambientes: ','Bathrooms within other spaces: ')+rooms.filter(q=>q.possible_nested_bath&&!q.possible_suite).length,LX('Posibles toilettes: ','Possible powder rooms: ')+rooms.filter(q=>q.bathroom_type==='toilette_candidate').length,LX('Revisar proporciones: ','Review proportions: ')+rooms.filter(q=>q.area_review).length);}topologyInfo.textContent=python?LX('Revisión semántica: ','Semantic review: ')+parts.join(' · '):'';rotateBtn.disabled=!selectedBlock||!placements.includes(selectedBlock);pc.clearRect(0,0,w,h);if(maskView.checked){pc.fillStyle='#fff';pc.fillRect(0,0,w,h);pc.fillStyle='#000';for(const wall of walls){if(wall.skip)continue;const [ax,ay]=wall.a,[bx,by]=wall.b,t=wall.t;if(Math.abs(bx-ax)>=Math.abs(by-ay))pc.fillRect(Math.min(ax,bx),(ay+by-t)/2,Math.abs(bx-ax),t);else pc.fillRect((ax+bx-t)/2,Math.min(ay,by),t,Math.abs(by-ay));}}else pc.drawImage(cv,0,0);if(zoneView.checked&&liveTopology){const T=liveTopology,ctx=zoneCanvas.getContext('2d');zoneCanvas.width=T.width;zoneCanvas.height=T.height;const im=ctx.createImageData(T.width,T.height),colors=new Map();for(const q of classified){const col=q.layout_review||q.area_review?[224,55,48,120]:q.kind==='technical_void_candidate'?[122,122,122,120]:q.use==='bathroom_candidate'?[38,159,218,110]:q.use==='bedroom_candidate'?[60,173,101,105]:q.open_plan_candidate?[234,171,63,110]:q.use==='kitchen_candidate'?[235,202,44,105]:q.use==='living_candidate'?[240,144,45,105]:q.use==='dining_candidate'?[151,100,211,105]:[141,150,160,45];colors.set(q.label,col);}for(let i=0;i<T.labels.length;i++){const col=colors.get(T.labels[i]);if(col)im.data.set(col,i*4);}ctx.putImageData(im,0,0);pc.save();pc.imageSmoothingEnabled=false;pc.drawImage(zoneCanvas,0,0,w,h);pc.restore();}for(const wall of walls){if(maskView.checked)continue;pc.strokeStyle=wall.skip?'#b86b60':'#008b99';pc.setLineDash(wall.skip?[4,4]:[]);pc.beginPath();pc.lineWidth=Math.max(2,wall.t*.25);pc.moveTo(...wall.a);pc.lineTo(...wall.b);pc.stroke();}pc.setLineDash([]);ok.disabled=ai.disabled||(!walls.some(w=>!w.skip)&&!placements.length);onlyBlocks.disabled=ai.disabled||!placements.length;title.textContent='CALCO ARQUITECTÓNICO · '+walls.filter(w=>!w.skip).length+' de '+walls.length+' tramos activos · '+mode+'. '+(walls.length?LX('Aberturas no reconocidas.','Openings not recognized.'):LX('Sin muros candidatos; podés marcar e insertar bloques.','No wall candidates; you can mark and insert blocks.'));
    if(python){
     for(const q of doorCandidates){const p0=q.v?[q.c,q.g0]:[q.g0,q.c],p1=q.v?[q.c,q.g1]:[q.g1,q.c];pc.save();pc.strokeStyle=q.kind==='swing-door'?'#009d71':'#9656cf';pc.lineWidth=Math.max(2,w/500);pc.setLineDash([5,3]);pc.beginPath();pc.moveTo(...p0);pc.lineTo(...p1);pc.stroke();if(q.kind==='swing-door'){const u=q.hingeAtLo?q.g0:q.g1,r=q.g1-q.g0,hp=q.v?[q.c,u]:[u,q.c],tip=q.v?[q.c+q.side*r,u]:[u,q.c+q.side*r];pc.beginPath();pc.moveTo(...hp);pc.lineTo(...tip);pc.stroke();}pc.restore();}
     for(const o of openings){const p0=o.v?[o.c,o.g0]:[o.g0,o.c],p1=o.v?[o.c,o.g1]:[o.g1,o.c];pc.strokeStyle=o.kind==='framed-window'?'#2f7de1':'#e8590c';pc.lineWidth=Math.max(3,o.t);pc.beginPath();pc.moveTo(...p0);pc.lineTo(...p1);pc.stroke();
      if(o.kind!=='framed-window'){const W0=o.g1-o.g0,hu=o.hingeAtLo?o.g0:o.g1,hp=o.v?[o.c,hu]:[hu,o.c],tip=o.v?[o.c+o.side*W0,hu]:[hu,o.c+o.side*W0];pc.lineWidth=2;pc.beginPath();pc.moveTo(...hp);pc.lineTo(...tip);pc.stroke();}}
     pc.fillStyle='#7b2cbf';for(const q of scalePts){pc.beginPath();pc.arc(q[0],q[1],Math.max(4,w/160),0,2*Math.PI);pc.fill();}
     const ts=walls.filter(x=>!x.skip).map(x=>x.t).sort((a,b)=>a-b),tm=ts.length?ts[ts.length>>1]*real*scaleF/w:0;
     {const nw=walls.filter(x=>!x.skip).length,nd=openings.filter(o=>o.kind!=='framed-window').length,nv=openings.length-nd;title.textContent=LX('CALCOPY · '+nw+' muros, '+nd+' puertas, '+nv+' ventanas, '+placements.length+' bloques · lectura: '+(mode==='validated'?'máscara validada':mode==='mixed'?'mixta semántica':mode==='lines'?'doble línea':'muros llenos')+(tm?' · espesor típico '+Math.round(tm*100)+' cm':'')+(tm&&(tm<.07||tm>.45)?' ⚠ revisá la escala':''),'CALCOPY · '+nw+' walls, '+nd+' doors, '+nv+' windows, '+placements.length+' blocks · reading: '+(mode==='validated'?'validated mask':mode==='mixed'?'semantic mixed':mode==='lines'?'double line':'solid walls')+(tm?' · typical thickness '+Math.round(tm*100)+' cm':'')+(tm&&(tm<.07||tm>.45)?' ⚠ check the scale':''));}
    }
    for(const hit of clearance){pc.save();pc.fillStyle='rgba(220,45,45,.20)';pc.strokeStyle='#d92d2d';pc.lineWidth=Math.max(2,w/400);pc.beginPath();hit.footprint.forEach(([x,y],i)=>i?pc.lineTo(x,y):pc.moveTo(x,y));pc.closePath();pc.fill();pc.stroke();pc.restore();}
    pc.fillStyle='#b64912';pc.font=Math.max(12,w/70)+'px sans-serif';for(const [i,b] of placements.entries()){pc.beginPath();pc.arc(b.x,b.y,Math.max(4,w/180),0,2*Math.PI);pc.fill();pc.fillText((i+1)+' '+b.name+' · '+b.rotation+'°'+(b.uncertain?' ?':''),b.x+6,b.y-6);{const {sx,sy}=blockScale(),a=b.rotation*Math.PI/180;pc.save();pc.translate(b.x,b.y);pc.scale(1/sx,-1/sy);pc.rotate(a);pc.strokeStyle=b===selectedBlock?'#087f9c':'#b64912';pc.lineWidth=2*Math.min(sx,sy);pc.strokeRect(0,0,b.w,b.d);pc.beginPath();pc.moveTo(0,0);pc.lineTo(b.w*.65,0);pc.stroke();pc.restore();}if(b.aiBox){const [x0,y0,x1,y1]=b.aiBox;pc.strokeStyle='#b64912';pc.lineWidth=2;pc.strokeRect(x0,y0,x1-x0,y1-y0);}}};
   // Position click is the insertion origin, not the centre; source image is kept.
   const markAt=(x,y,scale)=>{const it=candidates.find(i=>i.id===picker.value);if(x<0||x>w||y<0||y>h)return;
    if(python&&tool.value==='rotate'){const {sx,sy}=blockScale();selectedBlock=placements.filter(b=>{const a=b.rotation*Math.PI/180,dx=(x-b.x)*sx,dy=-(y-b.y)*sy,u=dx*Math.cos(a)+dy*Math.sin(a),v=-dx*Math.sin(a)+dy*Math.cos(a);return u>=0&&v>=0&&u<=b.w&&v<=b.d;}).at(-1)||null;redraw();return;}
    if(python&&tool.value!=='toggle'&&!(tool.value==='block'&&it)){
     const pxPerM=w/(real*scaleF);
     if(tool.value==='wall'){const A=AS.measureWall(G,x,y);const tl=walls.filter(q=>!q.skip).map(q=>q.t).sort((a,b)=>a-b),tmed=tl.length>2?tl[tl.length>>1]:0;if(A&&tmed&&A.t>2.4*tmed)return void(hint.textContent=LX('Eso parece un relleno o un mueble, no un muro (demasiado ancho). Tocá sobre el muro.','That looks like a fill or furniture, not a wall (too wide). Click on the wall.'));if(!A){hint.textContent=LX('No encontré un muro en ese punto. Tocá justo sobre el muro de la imagen.','No wall found at that point. Click right on the wall in the image.');return;}AS.snapEnds(A,walls);syncWall(A);walls.push(A);history.push(()=>walls.splice(walls.indexOf(A),1));hint.textContent=LX('Muro agregado: ','Wall added: ')+Math.round(A.t/pxPerM*100)+' cm × '+((A.hi-A.lo)/pxPerM).toFixed(2)+' m.';}
     else if(tool.value==='door'||tool.value==='window'){const o=AS.openingAt(G,walls,x,y,tool.value,pxPerM);if(!o){hint.textContent=LX('Tocá dentro del hueco de la abertura, en la línea del muro, junto al extremo de un muro detectado.','Click inside the opening gap, on the wall line, next to the end of a detected wall.');return;}openings.push(o);history.push(()=>openings.splice(openings.indexOf(o),1));{const wm=((o.g1-o.g0)/pxPerM).toFixed(2)+' m';hint.textContent=o.kind==='framed-window'?LX('Ventana de ','Window ')+wm+'.':LX('Puerta de '+wm+'. Si gira para el otro lado, usá «Invertir última puerta».','Door '+wm+'. If it swings the other way, use «Flip last door».');}}
     else if(tool.value==='scale'){scalePts.push([x,y]);if(scalePts.length===2){const [p,q]=scalePts,px=Math.hypot(q[0]-p[0],q[1]-p[1]);const m=Number(String(prompt(LX('Medida real entre los dos puntos (metros):','Real distance between the two points (meters):'),'')||'').replace(',','.'));scalePts.length=0;if(m>0&&px>5){const old=scaleF;scaleF=m/(px*real/w);history.push(()=>{scaleF=old;});hint.textContent=LX('Escala ajustada: '+(scaleF*real).toFixed(2)+' m de ancho total de imagen.','Scale set: image is '+(scaleF*real).toFixed(2)+' m wide.');}}else hint.textContent=LX('Tocá el otro extremo de la medida.','Click the other end of the dimension.');}
     redraw();return;
    }if(!it){let hit=null,best=Infinity;for(const wall of walls){const dx=wall.b[0]-wall.a[0],dy=wall.b[1]-wall.a[1],l=dx*dx+dy*dy;if(!l)continue;const t=Math.max(0,Math.min(1,((x-wall.a[0])*dx+(y-wall.a[1])*dy)/l)),dist=Math.hypot(x-wall.a[0]-t*dx,y-wall.a[1]-t*dy);if(dist<=Math.max(wall.t*.7,8/scale)&&dist<best){hit=wall;best=dist;}}if(hit){hit.skip=!hit.skip;if(python)history.push(()=>{hit.skip=!hit.skip;});redraw();}return;}const rotation=Number(rot.value),a=rotation*Math.PI/180,{sx,sy}=blockScale();const pl={x:brush?x-(it.w*Math.cos(a)-it.d*Math.sin(a))/2/sx:x,y:brush?y+(it.w*Math.sin(a)+it.d*Math.cos(a))/2/sy:y,id:it.id,name:it.name,w:it.w,d:it.d,rotation};placements.push(pl);if(python)history.push(()=>placements.splice(placements.indexOf(pl),1));redraw();};
   preview.onclick=e=>{const rect=preview.getBoundingClientRect(),scale=Math.min(rect.width/w,rect.height/h);if(scale>0)markAt((e.clientX-rect.left-(rect.width-w*scale)/2)/scale,(e.clientY-rect.top-(rect.height-h*scale)/2)/scale,scale);};
   undo.onclick=()=>{if(python){const f=history.pop();if(f)f();}else placements.pop();redraw();};
   const ai=document.createElement('button');ai.className='btn';ai.textContent=LX('Reconocer con IA local (experimental)','Recognize with local AI (experimental)');
   const aiStatus=document.createElement('p');aiStatus.style.cssText='font-size:12px;color:#9fc3d6';
   ai.onclick=async()=>{if(!confirm(LX('Primera ejecución: descarga de un modelo gratuito de visión (varios cientos de MB). El plano se procesa localmente. ¿Continuar?','First run: downloads a free vision model (several hundred MB). The plan is processed locally. Continue?')))return;
    ai.disabled=true;ok.disabled=true;onlyBlocks.disabled=true;aiStatus.textContent=LX('Cargando modelo local…','Loading local model…');
    try{
     const module=await import(new URL('cad-calco-vision.mjs?v=20261126-floor-zones',BASE.replace(/vendor\/pdfjs\/$/,'' )).href);
     const found=preDetected||await module.detect(cv,p=>{if(d.isConnected)aiStatus.textContent=p.status==='progress'?LX('Descargando ','Downloading ')+(p.file||'modelo')+' '+Math.round(p.progress||0)+'%':LX('Preparando IA local…','Preparing local AI…');});
     if(!d.isConnected)return;
     let n=0;const sx=real*scaleF/w,sy=source?Math.abs(source.b.y-source.a.y)*C.U[S.unit]/1000/h*scaleF:sx;
     for(const det of found){
      const [x0,y0,x1,y1]=det.box.map((v,i)=>Math.max(0,Math.min(i%2?h:w,v)));if(x1<=x0||y1<=y0)continue;
      const fit=module.bestCatalogMatch(det.label,[x0,y0,x1,y1],candidates,sx,sy);if(!fit)continue;const it=fit.item,id=it.id;
      const cx=(x0+x1)/2,cy=(y0+y1)/2;
      if(placements.some(p=>{const a=p.rotation*Math.PI/180,pcx=p.aiBox?(p.aiBox[0]+p.aiBox[2])/2:p.x+(p.w*Math.cos(a)-p.d*Math.sin(a))/2/sx,pcy=p.aiBox?(p.aiBox[1]+p.aiBox[3])/2:p.y-(p.w*Math.sin(a)+p.d*Math.cos(a))/2/sy;return Math.hypot((pcx-cx)*sx,(pcy-cy)*sy)<Math.min(it.w,it.d)*.4;}))continue;
      // Preserve the detected center and choose the best orthogonal axis.
      const pl={x:fit.x,y:fit.y,rotation:fit.rotation,uncertain:fit.uncertain,id:it.id,name:it.name+' (IA)',w:fit.w,d:fit.d,aiBox:[x0,y0,x1,y1]};placements.push(pl);if(python)history.push(()=>{const i=placements.indexOf(pl);if(i>=0)placements.splice(i,1);});n++;
     }
     redraw();aiStatus.textContent=n+LX(' candidatos añadidos de ',' candidates added out of ')+found.length+LX(' detecciones. Revisá posición y giro; usá Deshacer marca para rechazar.',' detections. Check position and rotation; use Undo mark to reject.');
    }catch(e){if(d.isConnected)aiStatus.textContent=LX('IA local no disponible: ','Local AI unavailable: ')+String(e.message||e).slice(0,180)+LX('. Podés seguir con el marcado manual.','. You can continue marking manually.');}
    finally{ai.disabled=false;redraw();}
   };
   retry.onclick=async()=>{retry.disabled=true;ok.disabled=true;title.textContent=LX('CALCO: buscando otra interpretación…','CALCO: trying another reading…');await new Promise(resolve=>setTimeout(resolve,30));try{const modes=['macizos','rayados','rayado fino','rayado fino claro','mixto experimental'];mode=modes[(modes.indexOf(mode)+1)%modes.length];makeMask(mode==='rayado fino'?170:mode==='rayado fino claro'?205:205);if(mode==='mixto experimental'){makeMask(205);const solid=traceWallBands(mask,w,h),hatch=traceHatchedWallBands(mask,w,h),fineLight=traceFineWallBands(mask,w,h);makeMask(170);const fine=traceFineWallBands(mask,w,h);walls=combineTraceCandidates([solid,hatch,fineLight,fine]);}else{walls=mode==='macizos'?traceWallBands(mask,w,h):mode==='rayados'?traceHatchedWallBands(mask,w,h):traceFineWallBands(mask,w,h);}if(walls.length>250)walls=[];hatched=mode!=='macizos';C.log('CALCO: '+walls.length+LX(' candidatos · ',' candidates · ')+mode);redraw();}catch(e){title.textContent='CALCO: '+e.message;}finally{retry.disabled=false;}};
   const tool=document.createElement('select'),reading=document.createElement('select'),flip=document.createElement('button');
   if(python){
    for(const [v,t,e] of [['toggle','Quitar / recuperar muro','Remove / restore wall'],['wall','+ Muro (clic sobre el muro)','+ Wall (click on the wall)'],['door','+ Puerta (clic en el hueco)','+ Door (click in the gap)'],['window','+ Ventana (clic en el hueco)','+ Window (click in the gap)'],['scale','Escala (2 clics sobre una cota)','Scale (2 clicks on a dimension)'],['block','+ Mueble / artefacto','+ Furniture / fixture'],['rotate','Seleccionar bloque para girar','Select block to rotate']])tool.add(new Option(LX(t,e),v));
    reading.add(new Option(LX('Lectura: muros llenos','Reading: solid walls'),'solid'));reading.add(new Option(LX('Lectura: muros de doble línea','Reading: double-line walls'),'lines'));if(Array.isArray(pyReadings.mixed))reading.add(new Option(LX('Lectura: mixta semántica (experimental)','Reading: semantic mixed (experimental)'),'mixed'));if(Array.isArray(pyReadings.validated))reading.add(new Option(LX('Lectura: máscara negra validada (experimental)','Reading: validated black mask (experimental)'),'validated'));if(Array.isArray(pyReadings.metric))reading.add(new Option(LX('Lectura: espesores métricos (experimental)','Reading: metric widths (experimental)'),'metric'));if(brush)reading.add(new Option(LX('Pincel: empezar vacío','Brush: start empty'),'brush'));reading.value=mode;
    reading.onchange=()=>{mode=reading.value;maskView.checked=mode==='validated';walls=assistWalls(pyReadings[mode]);openings.length=0;history.length=0;redraw();};
    picker.onchange=()=>{if(picker.value)tool.value='block';};tool.onchange=()=>{if(tool.value!=='block')picker.value='';scalePts.length=0;};
    flip.className='btn';flip.textContent=LX('Invertir última puerta','Flip last door');flip.onclick=()=>{const o=[...openings].reverse().find(q=>q.kind!=='framed-window');if(!o)return;
     // Cycle through the four swing combinations.
     const prev=[o.side,o.hingeAtLo];if(o.hingeAtLo)o.hingeAtLo=false;else{o.hingeAtLo=true;o.side=-o.side;}history.push(()=>{[o.side,o.hingeAtLo]=prev;});redraw();};
    const useDetected=document.createElement('button');useDetected.className='btn';useDetected.textContent=LX('Aceptar batientes detectadas','Accept detected swing doors');useDetected.onclick=()=>{const pxPerM=w/(real*scaleF),added=[];for(const q of doorCandidates.filter(q=>q.kind==='swing-door')){const u=(q.g0+q.g1)/2,op=AS.openingAt(G,walls,q.v?q.c:u,q.v?u:q.c,'door',pxPerM);if(!op||!op.partner||!!op.v!==!!q.v||Math.abs(op.g0-q.g0)>Math.max(3,.06*pxPerM)||Math.abs(op.g1-q.g1)>Math.max(3,.06*pxPerM)||openings.some(o=>!!o.v===!!op.v&&Math.abs(o.c-op.c)<op.t&&Math.min(o.g1,op.g1)>Math.max(o.g0,op.g0)))continue;op.kind='swing-door';op.side=q.side;op.hingeAtLo=q.hingeAtLo;openings.push(op);added.push(op);}if(added.length)history.push(()=>{for(const o of added){const i=openings.indexOf(o);if(i>=0)openings.splice(i,1);}});hint.textContent=added.length+LX(' batientes añadidas; revisá giro y posición.',' swing doors added; review swing and position.');redraw();};useDetected.disabled=!doorCandidates.some(q=>q.kind==='swing-door');
    controls.append(reading,maskLabel,zoneLabel,tool,picker,rot,rotateBtn,undo,flip,useDetected,ai);
   }else controls.append(picker,rot,undo,ai);
   if(!python)controls.append(retry);const hint=document.createElement('p');if(python)hint.style.cssText='min-height:4.6em;margin:6px 0';hint.textContent=python?LX('1) Elegí la lectura que mejor siga los muros. 2) Con «+ Muro» tocá los muros que falten; con «Quitar» tocá los que sobren. 3) Con «+ Puerta» / «+ Ventana» tocá el hueco. 4) Ajustá la escala con dos clics sobre una cota. 5) Marcá muebles y artefactos. Deshacer revierte el último paso.','1) Pick the reading that best follows the walls. 2) With «+ Wall» click missing walls; with «Remove» click extra ones. 3) With «+ Door» / «+ Window» click the gap. 4) Set the scale with two clicks on a dimension. 5) Mark furniture and fixtures. Undo reverts the last step.'):'Sin bloque elegido, hacé clic sobre un tramo para excluirlo o recuperarlo. Para marcar un objeto, elegí un bloque. Revisá los muros y los vanos antes de insertar.';
   if(brush){
    tool.value='wall';tool.hidden=true;zoneView.checked=false;
    const bar=document.createElement('div');bar.style.cssText='display:flex;gap:5px;flex-wrap:wrap;align-items:center;padding:4px;flex:none';
    const buttons=[];const setTool=value=>{tool.value=value;tool.onchange();for(const [b,v] of buttons)b.setAttribute('aria-pressed',String(v===value));for(const [b,v] of buttons)b.style.background=v===value?'#176078':'';};
    for(const [v,es,en] of [['wall','✎ Muro','✎ Wall'],['door','Puerta','Door'],['window','Ventana','Window'],['scale','Escala','Scale'],['toggle','Quitar','Remove'],['rotate','Girar','Rotate']]){const b=document.createElement('button');b.className='btn';b.textContent=LX(es,en);b.onclick=()=>setTool(v);buttons.push([b,v]);bar.append(b);}
    const blockInput=document.createElement('input');blockInput.type='text';blockInput.autocomplete='off';blockInput.placeholder=LX('Escribir bloque…','Type block…');blockInput.title=LX('Escribí el nombre y presioná Enter','Type a block name and press Enter');blockInput.style.cssText='width:180px;min-width:120px;background:#14191e;color:#e5eef7;border:1px solid #697582;border-radius:8px;padding:6px 9px';
    const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
    const aliases={'inodoro':'san-wc','wc':'san-wc','toilet':'san-wc','cama':'dor-cama2','bed':'dor-cama2','cama doble':'dor-cama2','double bed':'dor-cama2','cama individual':'dor-cama1','single bed':'dor-cama1','heladera':'kq-heladera','fridge':'kq-heladera','refrigerador':'kq-heladera','lavabo':'san-lav','lavamanos':'san-lav','washbasin':'san-lav','bidet':'san-bidet','ducha':'san-ducha','shower':'san-ducha','banera':'san-banera','bathtub':'san-banera','cocina':'kq-cocina','stove':'kq-cocina','anafe':'kq-anafe4','lavarropas':'kq-lavarropas','sofa':'mob-sofa3','sillon':'mob-sillon','mesa':'mob-mesa6','table':'mob-mesa6','auto':'veh-auto','car':'veh-auto','arbol':'ext-arbol','tree':'ext-arbol'};
    const chooseBlock=()=>{const q=norm(blockInput.value);if(!q)return;const direct=aliases[q];let match=candidates.find(i=>i.id===direct)||candidates.find(i=>norm(i.id)===q||norm(i.name)===q);
     if(!match){const words=q.split(' ');const ranked=candidates.map(i=>{const names=[i.name,i.id,i.nameEs,i.nameEn,i.es,i.en].map(norm).join(' ');return {i,score:words.every(t=>names.includes(t))?100-Math.min(90,norm(i.name).length):0};}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);match=ranked[0]?.i;}
     if(!match){picker.value='';blockInput.setCustomValidity(LX('Bloque no encontrado','Block not found'));blockInput.reportValidity();return;}blockInput.setCustomValidity('');picker.value=match.id;setTool('block');blockInput.value=match.name;blockInput.blur();hint.textContent=LX('Bloque seleccionado: ','Selected block: ')+match.name+LX('. Tocá su centro en la planta.','. Click its center on the plan.');};
    blockInput.addEventListener('input',()=>{blockInput.setCustomValidity('');picker.value='';});blockInput.addEventListener('keydown',e=>{if(e.key==='Escape')return;e.stopPropagation();if(e.key==='Enter'){e.preventDefault();chooseBlock();}});blockInput.addEventListener('keyup',e=>e.stopPropagation());blockInput.addEventListener('keypress',e=>e.stopPropagation());
    // Keep the real CAD canvas, view transform, zoom and pan. Only the marks
    // are rendered in a pointer-transparent overlay, never a second plan viewer.
    d.style.cssText='position:fixed;inset:auto;top:0;left:0;width:max-content;max-width:calc(100vw - 24px);max-height:none;margin:0;padding:5px 9px;background:#20252b;color:#e5eef7;border:1px solid #697582;border-radius:24px;box-shadow:0 3px 12px #0005;z-index:10000;overflow:visible';
    bar.style.cssText='display:flex;gap:4px;align-items:center;flex-wrap:nowrap;max-width:calc(100vw - 48px);overflow-x:auto';
    const grip=document.createElement('span');grip.textContent='⠿';grip.style.cssText='cursor:move;padding:0 5px;touch-action:none';bar.prepend(grip);
    for(const [label,action] of [['−',()=>C.zoomShortcut?.('out')],['+',()=>C.zoomShortcut?.('in')],['Fit',()=>C.zoomExtents?.()]]){const b=document.createElement('button');b.className='btn';b.textContent=label;b.onclick=action;bar.append(b);}
    ok.textContent=LX('Finalizar','Finish');cancel.textContent='×';bar.append(blockInput,rot,undo,rotateBtn,flip,ok,cancel);
    for(const b of bar.querySelectorAll('button'))b.style.cssText='padding:4px 8px;min-height:30px;white-space:nowrap;border-radius:8px';
    const details=document.createElement('details');details.style.cssText='position:absolute;top:100%;right:0;background:#20252b;border-radius:8px;max-width:min(600px,85vw);padding:4px';const summary=document.createElement('summary');summary.textContent='⚙';summary.title=LX('Opciones','Options');details.append(summary,controls,aiStatus,topologyInfo,dimOption,onlyBlocks);bar.append(details);
    const status=document.createElement('span');status.style.cssText='font-size:11px;white-space:nowrap';bar.append(status);
    title.hidden=true;hint.hidden=true;
    const overlay=document.createElement('canvas');overlay.style.cssText='position:fixed;pointer-events:none;z-index:9999;background:transparent';document.body.append(overlay);
    const bounds=()=>C.canvas.getBoundingClientRect(), imageBounds=()=>{const a=C.screen(C.P(Math.min(source.a.x,source.b.x),Math.max(source.a.y,source.b.y))),b=C.screen(C.P(Math.max(source.a.x,source.b.x),Math.min(source.a.y,source.b.y)));return {a,b};};
    let frame=0,closed=false,drag=null,lastMessage='';
    const paint=()=>{if(closed)return;const r=bounds(),{a,b}=imageBounds(),dpr=Math.min(devicePixelRatio||1,2);overlay.style.left=r.left+'px';overlay.style.top=r.top+'px';overlay.style.width=r.width+'px';overlay.style.height=r.height+'px';const W=Math.max(1,Math.round(r.width*dpr)),H=Math.max(1,Math.round(r.height*dpr));if(overlay.width!==W)overlay.width=W;if(overlay.height!==H)overlay.height=H;const p=overlay.getContext('2d');p.setTransform(dpr,0,0,dpr,0,0);p.clearRect(0,0,r.width,r.height);p.save();p.translate(a.x,a.y);p.scale((b.x-a.x)/w,(b.y-a.y)/h);
     for(const wall of walls){if(wall.skip)continue;const q=AS.seg(wall);p.fillStyle='rgba(0,190,210,.36)';p.strokeStyle='#00d5e8';p.lineWidth=1/Math.max(.01,(b.x-a.x)/w);const x=Math.min(q.a[0],q.b[0]),y=Math.min(q.a[1],q.b[1]);if(wall.v){p.fillRect(x-wall.t/2,y,wall.t,Math.abs(q.b[1]-q.a[1]));p.strokeRect(x-wall.t/2,y,wall.t,Math.abs(q.b[1]-q.a[1]));}else{p.fillRect(x,y-wall.t/2,Math.abs(q.b[0]-q.a[0]),wall.t);p.strokeRect(x,y-wall.t/2,Math.abs(q.b[0]-q.a[0]),wall.t);}}
     for(const o of openings){p.strokeStyle=o.kind==='framed-window'?'#359bff':'#ff9a40';p.lineWidth=Math.max(2,o.t*.35);p.beginPath();p.moveTo(...(o.v?[o.c,o.g0]:[o.g0,o.c]));p.lineTo(...(o.v?[o.c,o.g1]:[o.g1,o.c]));p.stroke();}
     const {sx,sy}=blockScale();for(const q of placements){p.save();p.translate(q.x,q.y);p.scale(1/sx,-1/sy);p.rotate(q.rotation*Math.PI/180);p.strokeStyle='#ff9a40';p.lineWidth=2*Math.min(sx,sy);p.strokeRect(0,0,q.w,q.d);p.restore();}
     p.fillStyle='#d08cff';for(const q of scalePts){p.beginPath();p.arc(q[0],q[1],4,0,Math.PI*2);p.fill();}p.restore();status.textContent=walls.filter(q=>!q.skip).length+' WALL · '+placements.length+' BLK';if(hint.textContent!==lastMessage){lastMessage=hint.textContent;C.log('CALCOPY: '+lastMessage);}frame=requestAnimationFrame(paint);};
    const onPointer=e=>{if(e.button!==0||e.target!==C.canvas)return;const r=bounds(),{a,b}=imageBounds(),x=(e.clientX-r.left-a.x)*w/(b.x-a.x),y=(e.clientY-r.top-a.y)*h/(b.y-a.y);e.preventDefault();e.stopImmediatePropagation();if(e.type==='pointerdown')markAt(x,y,(b.x-a.x)/w);};
    const onKey=e=>{if(e.key==='Escape'&&!e.defaultPrevented){e.preventDefault();e.stopImmediatePropagation();d.close('cancel');}};
    const events=['pointerdown','pointerup','mousedown','mouseup','click'];for(const name of events)window.addEventListener(name,onPointer,true);window.addEventListener('keydown',onKey,true);
    grip.onpointerdown=e=>{const r=d.getBoundingClientRect();drag={x:e.clientX-r.left,y:e.clientY-r.top};grip.setPointerCapture(e.pointerId);};grip.onpointermove=e=>{if(!drag)return;d.style.left=Math.max(0,Math.min(innerWidth-d.offsetWidth,e.clientX-drag.x))+'px';d.style.top=Math.max(0,Math.min(innerHeight-d.offsetHeight,e.clientY-drag.y))+'px';};grip.onpointerup=grip.onpointercancel=()=>{drag=null;};
    d.append(bar,title,hint);setTool('wall');redraw();d.addEventListener('close',()=>{closed=true;cancelAnimationFrame(frame);overlay.remove();for(const name of events)window.removeEventListener(name,onPointer,true);window.removeEventListener('keydown',onKey,true);const yes=d.returnValue==='ok';d.remove();resolve(yes)},{once:true});document.body.append(d);d.show();const r=bounds();d.style.left=Math.max(8,r.left+12)+'px';d.style.top=Math.max(8,r.top+12)+'px';paint();
   }else{redraw();d.append(title,hint,controls,aiStatus,topologyInfo,preview,dimOption,cancel,onlyBlocks,ok);d.addEventListener('close',()=>{const yes=d.returnValue==='ok';d.remove();resolve(yes)},{once:true});document.body.append(d);d.showModal();}
  });
  if(!accepted||S.tool!=='select'||S.stage?.length)return;
  if(source&&!S.entities.some(e=>e.id===source.id&&e.type==='image'&&e.src===source.src&&e.a.x===source.a.x&&e.a.y===source.a.y&&e.b.x===source.b.x&&e.b.y===source.b.y))return C.toast('La imagen cambió; repetí CALCO.');
  if(python&&scaleF!==1){
   if(source){const ent=S.entities.find(e=>e.id===source.id);if(!ent)return C.toast('La imagen cambió; repetí CALCO.');C.saveHistory();const x0=Math.min(ent.a.x,ent.b.x),y1=Math.max(ent.a.y,ent.b.y),sc=p=>({...p,x:x0+(p.x-x0)*scaleF,y:y1+(p.y-y1)*scaleF});ent.a=sc(ent.a);ent.b=sc(ent.b);source.a={...ent.a};source.b={...ent.b};}
   real*=scaleF;
  }
  const k=real/w*1000/C.U[S.unit];if(!Number.isFinite(k)||k<=0)return C.toast('Unidad inválida.');
  const center=C.world?C.world({x:C.canvas.clientWidth/2,y:C.canvas.clientHeight/2}):C.P(0,0);
  const Q=source?p=>C.P(Math.min(source.a.x,source.b.x)+p[0]/w*Math.abs(source.b.x-source.a.x),Math.max(source.a.y,source.b.y)-p[1]/h*Math.abs(source.b.y-source.a.y)):p=>C.P(center.x+(p[0]-w/2)*k,center.y+(h/2-p[1])*k);
  // Use the isolated architecture transaction and its native L/T/+ junction solver.
  if(typeof window.CAD2D_APPLY_TRACE_PLAN!=='function')throw Error('Motor ARQ no disponible; actualizá la página.');
  const origin=Q([0,h]),toM=1000/C.U[S.unit],local=p=>{const q=Q(p);return [(q.x-origin.x)/toM,(q.y-origin.y)/toM]};
  const maxTraceThickness=.5;
  let tracePlan=null;
  if(python){tracePlan=blocksOnly?{walls:[],openings:[]}:AS.buildPlan(walls,openings,local,maxTraceThickness);}
  const native=blocksOnly?[]:python?tracePlan.walls:walls.filter(w=>!w.skip).map((wall,i)=>{const a=local(wall.a),b=local(wall.b),dx=wall.b[0]-wall.a[0],dy=wall.b[1]-wall.a[1],len=Math.hypot(dx,dy);if(!len)return null;const edge=local([wall.a[0]-dy/len*wall.t,wall.a[1]+dx/len*wall.t]);return {id:'trace-'+i,a,b,thickness:Math.hypot(edge[0]-a[0],edge[1]-a[1]),layer:'WALLS',join:'native'};}).filter(w=>w&&w.thickness>=.08&&w.thickness<=maxTraceThickness+1e-9&&Math.hypot(w.b[0]-w.a[0],w.b[1]-w.a[1])>.1);
  if(!native.length&&!placements.length)throw Error('No hay muros válidos ni bloques para insertar. Revisá la escala o marcá objetos.');
  const blocks=placements.map(b=>({catalogId:b.id,role:b.id,point:local([b.x,b.y]),rotation:b.rotation,scale:1,nominalSize:[b.w,b.d],layer:b.id.startsWith('san-')?'FIXTURES':b.id.startsWith('kq-')?'KITCHEN':b.id.startsWith('esc-')?'STAIRS':b.id.startsWith('veh-')?'VEHICLES':b.id.startsWith('ofi-')?'OFFICE':b.id.startsWith('per-')?'ACCESSIBILITY':/^ext-(?:arbol|conifera|palmera|arbusto|maceta|cesped)/.test(b.id)?'VEGETATION':b.id.startsWith('ext-')?'EXTERIOR':'FURNITURE'}));
  const planOpenings=python&&!blocksOnly&&native.length?tracePlan.openings:[];
  window.CAD2D_APPLY_TRACE_PLAN({schema:'blackline.architecture.v1',units:'m',walls:native,openings:planOpenings,blocks,rooms:[],virtualDimensions:[],brief:{kind:'trace',dimensionOverall:dimensionOverall&&!blocksOnly},traceReviewed:python},origin);
  C.renderBlockLibrary?.();C.queueLocalBackup?.();C.toast('CALCO: '+native.length+' muros, '+planOpenings.length+' aberturas y '+blocks.length+' bloques. Revisá uniones.');
 }catch(e){const msg='CALCO: '+(e?.message||e);C.log(msg);C.toast(msg);window.alert(msg);}finally{calcoBusy=false;bitmap?.close?.();doc?.destroy?.();}
}
function pickTrace(python=false,brush=false){const S=C.state;const imgs=S.entities.filter(e=>e.type==='image'&&S.layers.find(l=>l.id===e.layer)?.visible!==false);const selected=imgs.filter(e=>S.selected.includes(e.id));const source=selected.length===1?selected[0]:selected.length===0&&imgs.length===1?imgs[0]:null;if(source){return traceFile(null,{...source,a:{...source.a},b:{...source.b}},python,brush);}if(selected.length>1||imgs.length>1){C.toast('Seleccioná una sola imagen para CALCO.');return;}if(brush){C.toast(LX('Insertá primero una imagen en el CAD y seleccionála para CALCOPY.','Insert an image in CAD first and select it for CALCOPY.'));return;}const i=document.createElement('input');i.type='file';i.accept='.jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf';i.onchange=()=>{if(i.files[0])traceFile(i.files[0],null,python,brush)};i.click();}
for(const k of ['CALCO','CALCAR','TRACEPLAN'])EXT.commands[k]=()=>pickTrace();
EXT.commands.CALCOPY=()=>pickTrace(true,true);
EXT.commands.TRACEPYTHON=()=>pickTrace(true,false);
const TRACE_ICON='<path d="M3 4h18v16H3z M6 16V8h7v4h5v4z"/><path d="M6 19h12" stroke-dasharray="2 2"/>';
// CALCO toolbar button hidden; command retained for future development.
window.CAD2D_TRACE_PLAN=traceFile;
window.CAD2D_CALCO=pickTrace;

window.CAD2D_PDF_IMAGE=async function(file){
 let doc;
 try{
  const L=await pdfjs();doc=await L.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false}).promise;
  let n=1;if(doc.numPages>1){const raw=prompt('Página del PDF / PDF page (1–'+doc.numPages+')','1');if(raw===null)return false;n=Number(raw);if(!Number.isInteger(n)||n<1||n>doc.numPages)throw Error('Página inválida');}
  const page=await doc.getPage(n),v=page.getViewport({scale:1}),vp=page.getViewport({scale:Math.min(2,2400/Math.max(v.width,v.height))}),cv=document.createElement('canvas');cv.width=Math.ceil(vp.width);cv.height=Math.ceil(vp.height);
  await page.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise;
  const blob=await new Promise(resolve=>cv.toBlob(resolve,'image/png'));if(!blob)throw Error('No se pudo rasterizar el PDF');
  await window.CAD2D_IMPORT_FILE(new File([blob],file.name.replace(/\.pdf$/i,'')+'-p'+n+'.png',{type:'image/png'}));return true;
 }finally{if(doc)await doc.destroy();}
};
window.CAD2D_PDF_IMPORT=importPdf;
})();
