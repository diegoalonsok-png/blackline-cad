/* CAD2D · Importar PDF.
   PDF vectorial (ploteado desde AutoCAD u otro CAD): convierte los trazos en polilíneas editables y los
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

async function traceFile(file,source=null){
 const S=C.state;if(S.tool!=='select'||S.stage?.length)return C.toast('Terminá el comando actual antes de calcar.');
 let bitmap,doc;
 try{
  if(source){bitmap=new Image();bitmap.src=source.src;await bitmap.decode();}else if(/\.pdf$/i.test(file.name)){
   const L=await pdfjs();doc=await L.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
   const no=doc.numPages===1?1:Number(prompt('Página del PDF (1–'+doc.numPages+')','1'));
   if(!Number.isInteger(no)||no<1||no>doc.numPages)return;
   const page=await doc.getPage(no),g=await extract(page);
   // Semantic mode rasterizes vector PDFs as well, to recognize filled wall bands.
   const v=page.getViewport({scale:1}),vp=page.getViewport({scale:Math.min(2,1800/Math.max(v.width,v.height))}),cv=document.createElement('canvas');
   cv.width=Math.ceil(vp.width);cv.height=Math.ceil(vp.height);await page.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise;bitmap=cv;
  }else bitmap=await createImageBitmap(file);
  const ratio=Math.min(1,1800/Math.max(bitmap.width,bitmap.height)),w=Math.max(1,Math.round(bitmap.width*ratio)),h=Math.max(1,Math.round(bitmap.height*ratio));
  const cv=document.createElement('canvas');cv.width=w;cv.height=h;const ctx=cv.getContext('2d',{willReadFrequently:true});ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.drawImage(bitmap,0,0,w,h);
  const pix=ctx.getImageData(0,0,w,h).data,mask=new Uint8Array(w*h);
  for(let i=0;i<mask.length;i++)mask[i]=(.299*pix[i*4]+.587*pix[i*4+1]+.114*pix[i*4+2])<205?1:0;
  let walls=traceWallBands(mask,w,h),hatched=false;
  if(walls.length<3||walls.length>250){const other=traceHatchedWallBands(mask,w,h);if(other.length&&other.length<=250){walls=other;hatched=true;}}
  if(!walls.length||walls.length>250)return C.toast('CALCO: no se detectaron muros con suficiente evidencia (macizos o rayados). Revisá resolución y contraste. No se insertó geometría.');
  const real=source?Math.abs(source.b.x-source.a.x)*C.U[S.unit]/1000:Number(String(prompt('Ancho REAL de toda la imagen, incluido margen (metros). Verificá después con DIST.','')||'').replace(',','.'));
  if(!(real>0&&real<=10000))return C.toast('Calco cancelado: escala inválida.');
  // Preview uses the same line endpoints as insertion; nothing is modified until confirmed.
  const preview=document.createElement('canvas');preview.width=w;preview.height=h;const pc=preview.getContext('2d');pc.fillStyle='#f4efe3';pc.fillRect(0,0,w,h);pc.strokeStyle='#343e40';pc.lineWidth=1.5;pc.beginPath();
  for(const wall of walls){pc.beginPath();pc.lineWidth=wall.t;pc.moveTo(...wall.a);pc.lineTo(...wall.b);pc.stroke();}
  const placements=[];
  const accepted=await new Promise(resolve=>{
   const d=document.createElement('dialog');d.style.cssText='background:#25282d;color:#e5eef7;border:1px solid #777;border-radius:12px;padding:12px;width:min(720px,92vw);max-height:85vh;overflow:auto';
   const title=document.createElement('p');title.textContent='CALCO ARQUITECTÓNICO · '+walls.length+' tramos de muro candidatos'+(hatched?' (muros rayados)':'')+'. Revisá la vista previa. Aberturas aún no reconocidas.';
   preview.style.cssText='width:100%;max-height:55vh;object-fit:contain;display:block';
   const ok=document.createElement('button'),cancel=document.createElement('button');ok.className=cancel.className='btn';ok.textContent='Insertar muros y bloques marcados';cancel.textContent='Cancelar';ok.onclick=()=>d.close('ok');cancel.onclick=()=>d.close('cancel');
   const controls=document.createElement('div');controls.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin:8px 0';
   const picker=document.createElement('select'),rot=document.createElement('select'),undo=document.createElement('button');
   const catalog=window.CAD2D_ARQ_LIBRARY?.library||[];
   const candidates=catalog.filter(i=>!i.hideFromGallery&&!i.pro&&!i.paidOnly&&!i.dxfPlan&&/^(?:san-|dor-cama|dor-queen|dor-king|mob-placard|mob-escritorio|mob-sillon)/.test(i.id));
   picker.add(new Option('Marcar objeto sobre la imagen…',''));for(const i of candidates)picker.add(new Option(i.name,i.id));
   for(const angle of [0,90,180,270])rot.add(new Option(angle+'°',String(angle)));
   undo.textContent='Deshacer marca';undo.className='btn';
   const redraw=()=>{pc.clearRect(0,0,w,h);pc.drawImage(cv,0,0);for(const wall of walls){pc.strokeStyle=wall.skip?'#b86b60':'#008b99';pc.setLineDash(wall.skip?[4,4]:[]);pc.beginPath();pc.lineWidth=Math.max(2,wall.t*.25);pc.moveTo(...wall.a);pc.lineTo(...wall.b);pc.stroke();}pc.setLineDash([]);ok.disabled=!walls.some(w=>!w.skip);title.textContent='CALCO ARQUITECTÓNICO · '+walls.filter(w=>!w.skip).length+' de '+walls.length+' tramos activos'+(hatched?' · rayados':'')+'. Aberturas no reconocidas.';
    pc.fillStyle='#b64912';pc.font=Math.max(12,w/70)+'px sans-serif';for(const [i,b] of placements.entries()){pc.beginPath();pc.arc(b.x,b.y,Math.max(4,w/180),0,2*Math.PI);pc.fill();pc.fillText((i+1)+' '+b.name,b.x+6,b.y-6);if(b.aiBox){const [x0,y0,x1,y1]=b.aiBox;pc.strokeStyle='#b64912';pc.lineWidth=2;pc.strokeRect(x0,y0,x1-x0,y1-y0);}}};
   // Position click is the insertion origin, not the centre; source image is kept.
   preview.onclick=e=>{const it=candidates.find(i=>i.id===picker.value);const rect=preview.getBoundingClientRect(),scale=Math.min(rect.width/w,rect.height/h),x=(e.clientX-rect.left-(rect.width-w*scale)/2)/scale,y=(e.clientY-rect.top-(rect.height-h*scale)/2)/scale;if(x<0||x>w||y<0||y>h)return;if(!it){let hit=null,best=Infinity;for(const wall of walls){const dx=wall.b[0]-wall.a[0],dy=wall.b[1]-wall.a[1],l=dx*dx+dy*dy;if(!l)continue;const t=Math.max(0,Math.min(1,((x-wall.a[0])*dx+(y-wall.a[1])*dy)/l)),dist=Math.hypot(x-wall.a[0]-t*dx,y-wall.a[1]-t*dy);if(dist<=Math.max(wall.t*.7,8/scale)&&dist<best){hit=wall;best=dist;}}if(hit){hit.skip=!hit.skip;redraw();}return;}placements.push({x,y,id:it.id,name:it.name,w:it.w,d:it.d,rotation:Number(rot.value)});redraw();};
   undo.onclick=()=>{placements.pop();redraw();};
   const ai=document.createElement('button');ai.className='btn';ai.textContent='Reconocer con IA local (experimental)';
   const aiStatus=document.createElement('p');aiStatus.style.cssText='font-size:12px;color:#9fc3d6';
   ai.onclick=async()=>{if(!confirm('Primera ejecución: descarga de un modelo gratuito de visión (varios cientos de MB). El plano se procesa localmente. ¿Continuar?'))return;
    ai.disabled=true;ok.disabled=true;aiStatus.textContent='Cargando modelo local…';
    try{
     const module=await import(new URL('cad-calco-vision.mjs',BASE.replace(/vendor\/pdfjs\/$/,'' )).href);
     const found=await module.detect(cv,p=>{if(d.isConnected)aiStatus.textContent=p.status==='progress'?'Descargando '+(p.file||'modelo')+' '+Math.round(p.progress||0)+'%':'Preparando IA local…';});
     if(!d.isConnected)return;
     let n=0;const sx=real/w,sy=source?Math.abs(source.b.y-source.a.y)*C.U[S.unit]/1000/h:sx;
     for(const det of found){const id=module.catalogId(det.label),it=candidates.find(x=>x.id===id);if(!it)continue;
      const [x0,y0,x1,y1]=det.box.map((v,i)=>Math.max(0,Math.min(i%2?h:w,v)));if(x1<=x0||y1<=y0)continue;
      const bw=(x1-x0)*sx,bd=(y1-y0)*sy,ratio=bw/bd,normal=it.w/it.d,turn=Math.abs(Math.log(ratio/normal))>Math.abs(Math.log(ratio*normal));
      const aw=turn?bd:bw,ad=turn?bw:bd;
      if(aw<it.w*.45||aw>it.w*2||ad<it.d*.45||ad>it.d*2)continue;
      const cx=(x0+x1)/2,cy=(y0+y1)/2;
      if(placements.some(p=>p.id===id&&Math.hypot((p.x-cx)*sx,(p.y-cy)*sy)<Math.min(it.w,it.d)*.45))continue;
      // Infer axis only; facing direction needs visual review. Anchor at block corner.
      const angle=turn?90:0,x=cx+(turn?it.d:-it.w)/2/sx,y=cy+(turn?it.w:it.d)/2/sy;
      placements.push({x,y,id:it.id,name:it.name+' (IA)',w:it.w,d:it.d,rotation:angle,aiBox:[x0,y0,x1,y1]});n++;
     }
     redraw();aiStatus.textContent=n+' candidatos añadidos de '+found.length+' detecciones. Revisá posición y giro; usá Deshacer marca para rechazar.';
    }catch(e){if(d.isConnected)aiStatus.textContent='IA local no disponible: '+String(e.message||e).slice(0,180)+'. Podés seguir con el marcado manual.';}
    finally{ai.disabled=false;ok.disabled=false;}
   };
   controls.append(picker,rot,undo,ai);const hint=document.createElement('p');hint.textContent='Sin bloque elegido, hacé clic sobre un tramo para excluirlo o recuperarlo. Para marcar un objeto, elegí un bloque. Revisá los muros y los vanos antes de insertar.';
   redraw();d.append(title,hint,controls,aiStatus,preview,cancel,ok);d.addEventListener('close',()=>{const yes=d.returnValue==='ok';d.remove();resolve(yes)},{once:true});document.body.append(d);d.showModal();
  });
  if(!accepted||S.tool!=='select'||S.stage?.length)return;
  if(source&&!S.entities.some(e=>e.id===source.id&&e.type==='image'&&e.src===source.src&&e.a.x===source.a.x&&e.a.y===source.a.y&&e.b.x===source.b.x&&e.b.y===source.b.y))return C.toast('La imagen cambió; repetí CALCO.');
  const k=real/w*1000/C.U[S.unit];if(!Number.isFinite(k)||k<=0)return C.toast('Unidad inválida.');
  const center=C.world?C.world({x:C.canvas.clientWidth/2,y:C.canvas.clientHeight/2}):C.P(0,0);
  const Q=source?p=>C.P(Math.min(source.a.x,source.b.x)+p[0]/w*Math.abs(source.b.x-source.a.x),Math.max(source.a.y,source.b.y)-p[1]/h*Math.abs(source.b.y-source.a.y)):p=>C.P(center.x+(p[0]-w/2)*k,center.y+(h/2-p[1])*k);
  // Use the isolated architecture transaction and its native L/T/+ junction solver.
  if(typeof window.CAD2D_APPLY_TRACE_PLAN!=='function')throw Error('Motor ARQ no disponible; actualizá la página.');
  const origin=Q([0,h]),toM=1000/C.U[S.unit],local=p=>{const q=Q(p);return [(q.x-origin.x)/toM,(q.y-origin.y)/toM]};
  const native=walls.filter(w=>!w.skip).map((wall,i)=>{const a=local(wall.a),b=local(wall.b),vertical=wall.a[0]===wall.b[0],edge=local(vertical?[wall.a[0]+wall.t,wall.a[1]]:[wall.a[0],wall.a[1]+wall.t]);return {id:'trace-'+i,a,b,thickness:Math.hypot(edge[0]-a[0],edge[1]-a[1]),layer:'WALLS',join:'native'};}).filter(w=>w.thickness>=.08&&w.thickness<=.5&&Math.hypot(w.b[0]-w.a[0],w.b[1]-w.a[1])>.1);
  if(!native.length)throw Error('Ningún muro tiene espesor válido de 0,08 a 0,50 m. Calibrá la imagen.');
  const blocks=placements.map(b=>({catalogId:b.id,role:b.id,point:local([b.x,b.y]),rotation:b.rotation,scale:1,nominalSize:[b.w,b.d],layer:b.id.startsWith('san-')?'FIXTURES':'FURNITURE'}));
  window.CAD2D_APPLY_TRACE_PLAN({schema:'blackline.architecture.v1',units:'m',walls:native,openings:[],blocks,rooms:[],virtualDimensions:[],brief:{kind:'trace'}},origin);
  C.renderBlockLibrary?.();C.queueLocalBackup?.();C.toast('CALCO: '+native.length+' muros y '+blocks.length+' bloques marcados. Revisá uniones y aberturas.');
 }catch(e){C.toast('Calco: '+(e?.message||e));}finally{bitmap?.close?.();doc?.destroy?.();}
}
function pickTrace(){const S=C.state;const imgs=S.entities.filter(e=>e.type==='image'&&S.layers.find(l=>l.id===e.layer)?.visible!==false);const selected=imgs.filter(e=>S.selected.includes(e.id));const source=selected.length===1?selected[0]:selected.length===0&&imgs.length===1?imgs[0]:null;if(source){return traceFile(null,{...source,a:{...source.a},b:{...source.b}});}if(selected.length>1||imgs.length>1){C.toast('Seleccioná una sola imagen para CALCO.');return;}const i=document.createElement('input');i.type='file';i.accept='.jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf';i.onchange=()=>{if(i.files[0])traceFile(i.files[0])};i.click();}
for(const k of ['CALCO','CALCAR','TRACEPLAN'])EXT.commands[k]=()=>pickTrace();
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
