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
 const flush=keep=>{if(keep)for(const p of pending)if(p.pts.length>1){p.layer=curLayer();paths.push(p)}pending=[]};
 for(let i=0;i<ops.fnArray.length;i++){
  const fn=ops.fnArray[i],a=ops.argsArray[i];
  if(fn===OPS.beginMarkedContentProps){const id=a?.[0]==='OC'?(a[1]?.id||(typeof a[1]==='string'?a[1]:null)):null;mc.push(id)}
  else if(fn===OPS.beginMarkedContent)mc.push(null);
  else if(fn===OPS.endMarkedContent)mc.pop();
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
  if(!l){l={id:'pdf_'+Date.now().toString(36)+'_'+made.size,name,color:palette[made.size%palette.length],visible:true,locked:false};S.layers.push(l)}
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
window.CAD2D_PDF_IMPORT=importPdf;
})();
