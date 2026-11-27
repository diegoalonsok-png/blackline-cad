/* CAD2D3D · CALCOIA: calcar una planta (JPG/PNG de internet, escaneo o foto) con la IA propia.
 * - Imagen seleccionada en el dibujo o archivo nuevo.
 * - Escala automática: puertas de locales (vano ≈ 0,90 m) o inodoros (≈ 0,70 m); o ancho real indicado.
 * - Muros nativos, puertas y ventanas en su muro con giro y lado, bloques del catálogo en su lugar y ángulo.
 * - La imagen queda debajo, a la misma escala, para comparar; todo se deshace con Ctrl+Z. */
(function(){
'use strict';
const CORE=window.CAD2D_CORE,EXT=window.CAD2D_EXTENSIONS;if(!CORE||!EXT)return;
const L=(es,en)=>document.documentElement.lang==='es'?es:en;
const S=()=>CORE.state;
let worker=null,busy=false;
const SCRIPT=document.currentScript?.src||new URL('assets/cad-calco-ia.js',document.baseURI).href;
function getWorker(){if(!worker)worker=new Worker(new URL('cad-calco-ia-worker.js?v=20261127-calcoia1',SCRIPT));return worker}
function analizar(bitmap,realWidth){
 return new Promise((resolve,reject)=>{
  const w=getWorker();
  w.onmessage=({data})=>{if(data.type==='progress')CORE.toast('CALCO IA · '+data.message);else if(data.type==='result')resolve(data);else if(data.type==='error')reject(Error(data.message))};
  w.onerror=e=>{worker=null;reject(Error(e.message||L('No se pudo iniciar la IA de calco','Could not start the trace AI')))};
  w.postMessage({bitmap,realWidth},[bitmap]);
 });
}
const selectedImage=()=>{const ids=new Set(S().selected);return S().entities.find(e=>ids.has(e.id)&&e.type==='image'&&e.src)};
async function bitmapFrom(src){const im=new Image();im.decoding='async';im.src=src;await im.decode();return createImageBitmap(im)}
function elegirArchivo(){return new Promise(res=>{const i=document.createElement('input');i.type='file';i.accept='image/png,image/jpeg,image/webp';i.onchange=()=>res(i.files?.[0]||null);i.click()})}
async function calcar(){
 if(busy)return CORE.toast(L('CALCO IA ya está trabajando…','TRACE AI is already working…'));
 if(!EXT.applyTracePlan)return CORE.toast(L('Actualizá la página para usar CALCO IA.','Reload the page to use TRACE AI.'));
 let img=selectedImage(),src=img?.src,file=null;
 if(!img){file=await elegirArchivo();if(!file)return;src=URL.createObjectURL(file)}
 const realTxt=window.prompt(L('Ancho real de la planta en metros (vacío = escala automática por puertas e inodoros):','Real plan width in metres (empty = automatic scale from doors and toilets):'),'');
 if(realTxt===null)return;
 const real=Number(String(realTxt).replace(',','.'))||0;
 busy=true;
 try{
  const bitmap=await bitmapFrom(src),bw=bitmap.width,bh=bitmap.height;
  const r=await analizar(bitmap,real);
  const plan=r.plan,ppm=plan.scale.pixelsPerUnit,k=1000/CORE.U[S().unit];
  if(!plan.walls.length)throw Error(L('No se reconocieron muros en esta imagen.','No walls were recognised in this image.'));
  // Tamaño real de la imagen según la escala detectada (en metros) y origen del plano alineado con ella.
  const Wm=bw*r.k/ppm,Hm=bh*r.k/ppm,padM=(r.h-bh*r.k)/ppm;
  const msg=L('Escala: ','Scale: ')+plan.scale.source+' · '+plan.summary.muros+L(' muros · ',' walls · ')+plan.summary.puertas+L(' puertas · ',' doors · ')+plan.summary.ventanas+L(' ventanas · ',' windows · ')+plan.summary.bloques+L(' piezas',' pieces');
  if(!window.confirm('CALCO IA\n'+msg+'\n'+L('Planta de ','Plan of ')+Wm.toFixed(2)+' × '+Hm.toFixed(2)+' m.\n\n'+L('¿Insertar el dibujo CAD? (Ctrl+Z deshace)','Insert the CAD drawing? (Ctrl+Z undoes)')))return;
  CORE.saveHistory();
  let origin;
  if(img){
   // La imagen seleccionada se reescala a la escala detectada, manteniendo su esquina inferior izquierda.
   const a={x:Math.min(img.a.x,img.b.x),y:Math.min(img.a.y,img.b.y)};
   img.a={x:a.x,y:a.y};img.b={x:a.x+Wm*k,y:a.y+Hm*k};
   origin={x:a.x,y:a.y-padM*k};
  }else{
   const v=S().view,cv=CORE.canvas,c=CORE.world({x:cv.clientWidth/2,y:cv.clientHeight/2});
   origin={x:c.x-Wm*k/2,y:c.y-Hm*k/2-padM*k};
   S().entities.push({id:S().nextId++,type:'image',src,a:{x:origin.x,y:origin.y+padM*k},b:{x:origin.x+Wm*k,y:origin.y+(padM+Hm)*k},layer:S().layerId,name:file?.name||'calco',opacity:.45,calcoIA:true});
  }
  const n=EXT.applyTracePlan(plan,origin);
  CORE.updateAll();CORE.zoomExtents?.();CORE.queueLocalBackup?.();
  CORE.toast('CALCO IA · '+n+L(' entidades CAD · ',' CAD entities · ')+msg);CORE.log('CALCO IA · '+msg);
 }catch(e){CORE.toast('CALCO IA · '+e.message);CORE.log('CALCO IA: '+e.message)}
 finally{busy=false}
}
EXT.commands=EXT.commands||{};
for(const c of ['CALCOIA','CALCARIA','CALCO-IA','TRACEAI','AITRACE'])EXT.commands[c]=calcar;
EXT.context=EXT.context||[];
EXT.context.push(({item,active})=>active||!selectedImage()?[]:[item('✦ '+L('Calcar con IA (muros, aberturas y bloques)','Trace with AI (walls, openings and blocks)'),calcar)]);
window.CAD2D_CALCO_IA=Object.freeze({calcar});
})();
