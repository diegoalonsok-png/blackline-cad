/* CALCOPY: Python/OpenCV in a dedicated, cancellable worker (v2 wall reader). */
'use strict';
const runtime='https://cdn.jsdelivr.net/pyodide/v0.28.3/full/';
const modules=['walls_v2.py','bridge_v2.py'];
let busy=false,py=null;
const report=message=>self.postMessage({type:'progress',message});
async function engine(){
 if(py)return py;
 report('Cargando Python…');importScripts(runtime+'pyodide.js');
 const p=await loadPyodide({indexURL:runtime});
 report('Cargando OpenCV y NumPy…');await p.loadPackage(['opencv-python','numpy']);
 p.FS.mkdirTree('/calco');
 for(const name of modules){
  const res=await fetch(new URL('../research/calcopy-v2/'+name+'?v=20261126-v3-mixed',self.location.href),{cache:'no-cache'});
  if(!res.ok)throw Error('Módulo no disponible: '+name);
  p.FS.writeFile('/calco/'+name,await res.text());
 }
 await p.runPythonAsync("import sys\nif '/calco' not in sys.path: sys.path.insert(0, '/calco')\nfrom bridge_v2 import analyze_v2");
 return py=p;
}
self.onmessage=async({data})=>{
 if(busy)return;busy=true;
 try{
  const {pixels,w,h}=data;
  if(!(pixels instanceof ArrayBuffer)||!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w>4096||h>4096||w*h>8000000||pixels.byteLength!==4*w*h)throw Error('Imagen inválida');
  const p=await engine();
  p.FS.writeFile('/calco/image.rgba',new Uint8Array(pixels));
  report('Reconociendo muros (macizos y de doble línea)…');
  p.globals.set('calco_w',w);p.globals.set('calco_h',h);
  const raw=await p.runPythonAsync("with open('/calco/image.rgba','rb') as f: calco_pixels=f.read()\nanalyze_v2(calco_pixels,calco_w,calco_h)");
  const result=JSON.parse(raw);
  self.postMessage({type:'result',best:result.best,readings:result.readings});
 }catch(e){self.postMessage({type:'error',message:String(e?.message||e).slice(0,1000)});}
 finally{busy=false;}
};
