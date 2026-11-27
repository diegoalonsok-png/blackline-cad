/* CAD2D3D · Calco con IA propia, en un proceso aparte (la imagen nunca sale de la computadora).
 * 1) CalcoNet (ONNX, ~2,6 MB) en onnxruntime-web: clase por píxel (muro, puerta, ventana, mueble, texto).
 * 2) Python + OpenCV (Pyodide) con a_cad.py: muros, aberturas con giro, escala por puertas/inodoros y bloques. */
'use strict';
const ORT='https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/';
const PYODIDE='https://cdn.jsdelivr.net/pyodide/v0.28.3/full/';
const VERSION='20261127-calcoia1';
let session=null,meta=null,py=null;
const report=message=>self.postMessage({type:'progress',message});
async function model(){
 if(session)return session;
 report('Cargando la IA de calco…');
 importScripts(ORT+'ort.min.js');
 ort.env.wasm.wasmPaths=ORT;ort.env.wasm.numThreads=1;
 const base=new URL('calco/',self.location.href);
 meta=await (await fetch(new URL('calco.onnx.json?v='+VERSION,base))).json();
 const buf=await (await fetch(new URL('calco.onnx?v='+VERSION,base))).arrayBuffer();
 session=await ort.InferenceSession.create(buf,{executionProviders:['wasm']});
 return session;
}
async function python(){
 if(py)return py;
 report('Cargando Python y OpenCV…');
 importScripts(PYODIDE+'pyodide.js');
 py=await loadPyodide({indexURL:PYODIDE});
 await py.loadPackage(['numpy','opencv-python']);
 const src=await (await fetch(new URL('../ml/calco/a_cad.py?v='+VERSION,self.location.href))).text();
 py.FS.writeFile('/a_cad.py',src);
 await py.runPythonAsync('import sys\nif "/" not in sys.path: sys.path.insert(0,"/")\nimport json, numpy as np\nfrom a_cad import a_plano');
 return py;
}
// Lado de trabajo: la planta ocupa ~640 px (como en el entrenamiento); múltiplo de 32 con margen blanco.
async function segmentar(bitmap){
 const s=await model();
 const lado=Math.min(1024,Math.max(512,Number(meta?.lado_inferencia)||640));
 const k=lado/Math.max(bitmap.width,bitmap.height);
 const w=Math.max(32,Math.ceil(bitmap.width*k/32)*32),h=Math.max(32,Math.ceil(bitmap.height*k/32)*32);
 const cv=new OffscreenCanvas(w,h),g=cv.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,w,h);
 g.drawImage(bitmap,0,0,Math.round(bitmap.width*k),Math.round(bitmap.height*k));
 const px=g.getImageData(0,0,w,h).data,n=w*h,x=new Float32Array(3*n);
 for(let i=0;i<n;i++){x[i]=(px[i*4]/255-.5)/.5;x[n+i]=(px[i*4+1]/255-.5)/.5;x[2*n+i]=(px[i*4+2]/255-.5)/.5}
 report('Reconociendo muros, aberturas y equipamiento…');
 const out=await s.run({[s.inputNames[0]]:new ort.Tensor('float32',x,[1,3,h,w])});
 const y=out[s.outputNames[0]].data,C=y.length/n,mask=new Uint8Array(n);
 for(let i=0;i<n;i++){let b=0,v=y[i];for(let c=1;c<C;c++){const q=y[c*n+i];if(q>v){v=q;b=c}}mask[i]=b}
 return {mask,w,h,k};
}
self.onmessage=async({data})=>{
 try{
  const {bitmap,realWidth}=data;
  if(!bitmap||!bitmap.width||!bitmap.height||bitmap.width*bitmap.height>40e6)throw Error('Imagen inválida');
  const {mask,w,h,k}=await segmentar(bitmap);
  const p=await python();
  report('Armando el plano CAD (escala, aberturas y bloques)…');
  p.FS.writeFile('/mask.bin',mask);
  p.globals.set('mw',w);p.globals.set('mh',h);p.globals.set('real',Number.isFinite(realWidth)&&realWidth>0?realWidth*w/Math.max(1,bitmap.width*k):0);
  const json=await p.runPythonAsync("m=np.frombuffer(open('/mask.bin','rb').read(),dtype=np.uint8).reshape(mh,mw)\njson.dumps(a_plano(m, real if real>0 else None), ensure_ascii=False)");
  const plan=JSON.parse(json);
  const counts=[0,0,0,0,0,0];for(const v of mask)counts[v]++;
  self.postMessage({type:'result',plan,mask:mask.buffer,w,h,k,counts},[mask.buffer]);
 }catch(e){self.postMessage({type:'error',message:String(e?.message||e).slice(0,600)})}
};
