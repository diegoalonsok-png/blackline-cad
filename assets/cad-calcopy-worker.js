/* CALCOPY: actual Python/OpenCV in a dedicated, cancellable worker. */
'use strict';
const runtime='https://cdn.jsdelivr.net/pyodide/v0.28.3/full/';
const modules=['calco_semantico.py','wall_solid_vision.py','wall_hatch_vision.py','wall_junctions.py','browser_bridge.py'];
let busy=false;
const report=message=>self.postMessage({type:'progress',message});
self.onmessage=async({data})=>{
 if(busy)return;busy=true;
 try{
  const {pixels,w,h,ppm}=data;
  if(!(pixels instanceof ArrayBuffer)||!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w>4096||h>4096||w*h>8000000||pixels.byteLength!==4*w*h||!Number.isFinite(ppm)||ppm<10||ppm>1000)throw Error('Imagen o escala inválida');
  report('Cargando Python…');importScripts(runtime+'pyodide.js');
  const py=await loadPyodide({indexURL:runtime});
  report('Cargando OpenCV, NumPy y Shapely…');await py.loadPackage(['opencv-python','numpy','shapely']);
  report('Recuperando módulos originales de CALCO…');
  py.FS.mkdirTree('/calco');
  for(const name of modules){
   const res=await fetch(new URL('../research/calco-python-20261125/'+name,self.location.href),{cache:'no-cache'});
   if(!res.ok)throw Error('Módulo no disponible: '+name);
   py.FS.writeFile('/calco/'+name,await res.text());
  }
  py.FS.writeFile('/calco/image.rgba',new Uint8Array(pixels));
  report('Reconociendo muros macizos y rayados y ajustando encuentros…');
  py.globals.set('calco_w',w);py.globals.set('calco_h',h);py.globals.set('calco_ppm',ppm);
  const raw=await py.runPythonAsync("import sys\nsys.path.insert(0, '/calco')\nfrom browser_bridge import analyze_rgba\nwith open('/calco/image.rgba','rb') as f: calco_pixels=f.read()\nanalyze_rgba(calco_pixels,calco_w,calco_h,calco_ppm)");
  self.postMessage({type:'result',walls:JSON.parse(raw)});
 }catch(e){self.postMessage({type:'error',message:String(e?.message||e).slice(0,1000)});}
 finally{busy=false;}
};
