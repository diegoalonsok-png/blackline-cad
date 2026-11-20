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
 let ctm=[1,0,0,1,0,0];const stack=[],paths=[];let pending=[];
 const flush=keep=>{if(keep)for(const p of pending)if(p.pts.length>1)paths.push(p);pending=[]};
 for(let i=0;i<ops.fnArray.length;i++){
  const fn=ops.fnArray[i],a=ops.argsArray[i];
  if(fn===OPS.save)stack.push(ctm.slice());
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
async function importPdf(file){
 const S=C.state;C.toast('Leyendo PDF…');
 let doc;try{const L=await pdfjs();doc=await L.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise}catch(e){return C.toast('No se pudo leer el PDF: '+(e?.message||e))}
 const pageNo=doc.numPages>1?Math.min(doc.numPages,Math.max(1,parseInt(prompt('El PDF tiene '+doc.numPages+' páginas. ¿Cuál importo?','1'))||1)):1;
 const page=await doc.getPage(pageNo),g=await extract(page);
 const segs=g.paths.reduce((n,p)=>n+p.pts.length,0);
 if(segs<20){ // escaneado o sin dibujo vectorial → imagen de fondo
  const vp=page.getViewport({scale:2}),cv=document.createElement('canvas');cv.width=vp.width;cv.height=vp.height;
  await page.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise;
  const blob=await new Promise(r=>cv.toBlob(r,'image/png'));
  const f2=new File([blob],file.name.replace(/\.pdf$/i,'')+'-p'+pageNo+'.png',{type:'image/png'});
  window.CAD2D_IMPORT_FILE?.(f2);
  return C.toast('El PDF no tiene dibujo vectorial (parece escaneado): entró como imagen. Medí con DIST una cota conocida y usá CALIBRAR <medida>.');
 }
 const sc=Number(String(prompt('Escala de ploteo del PDF (1:…). Ej.: 100 para 1:100, 50 para 1:50. Dejá 1 para tamaño de hoja.','100')||'').replace(',','.'));
 if(!(sc>0))return C.toast('Importación cancelada');
 const k=0.0254/72*sc*1000/C.U[S.unit]; // puntos PDF → unidades del dibujo
 const c=C.state.view?C.world?C.world({x:C.canvas.clientWidth/2,y:C.canvas.clientHeight/2}):C.P(0,0):C.P(0,0);
 const ox=c.x-g.w*k/2,oy=c.y-g.h*k/2,Q=(x,y)=>C.P(ox+x*k,oy+y*k);
 C.saveHistory();const ids=[],layer=S.layerId;
 for(const p of g.paths){
  const pts=p.pts.filter((q,i,a)=>!i||Math.hypot(q[0]-a[i-1][0],q[1]-a[i-1][1])>1e-3).map(q=>Q(q[0],q[1]));
  if(pts.length<2)continue;const id=S.nextId++;
  S.entities.push(pts.length===2&&!p.closed?{id,type:'line',a:pts[0],b:pts[1],layer}:{id,type:'polyline',pts,closed:!!p.closed&&pts.length>2,layer});ids.push(id);
 }
 for(const t of g.texts){const id=S.nextId++;S.entities.push({id,type:'text',p:Q(t.x,t.y),text:t.str.slice(0,200),h:Math.max(1e-4,t.h*k),rotation:Math.round(t.rot*100)/100,fontFamily:'Arial',layer});ids.push(id)}
 S.selected=ids;C.updateAll();C.zoomExtents?.();C.log('PDFIMPORT '+file.name+' p'+pageNo+' 1:'+sc);
 C.toast('PDF importado: '+g.paths.length+' trazos y '+g.texts.length+' textos a escala 1:'+sc+'. Verificá con DIST una cota conocida; si no coincide, CALIBRAR <medida>.');
}
window.CAD2D_PDF_IMPORT=importPdf;
})();
