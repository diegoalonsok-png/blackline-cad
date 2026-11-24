/* Local DWG/DXF converter. No model uploads. */
let kernel;
self.onmessage=async e=>{
 try{
  const {bytes,direction,allowPartial=false,preview}=e.data;
  if(!(bytes instanceof ArrayBuffer)||!['dwg-dxf','dxf-dwg'].includes(direction))throw Error('Solicitud inválida');
  if(!kernel)kernel=import('./dwg-wasm/pkg/blackline_dwg.js?v=20261123-wasm-v4').then(async m=>{const url=new URL('./dwg-wasm/pkg/blackline_dwg_bg.wasm?v=20261123-wasm-v4',self.location.href);const res=await fetch(url,{cache:'no-cache'});if(!res.ok)throw Error('WASM HTTP '+res.status);const bytes=await res.arrayBuffer();if(new Uint8Array(bytes,0,4).join(',')!=='0,97,115,109')throw Error('El servidor no devolvió un binario WebAssembly válido');await m.default({module_or_path:bytes});return m}).catch(err=>{kernel=null;throw Error('No pudo iniciarse el motor DWG: '+String(err?.message||err))});
  const m=await kernel;
  if(allowPartial&&typeof m.dwg_to_dxf_partial!=='function')throw Error('La apertura parcial aún no está publicada');
  const result=direction==='dwg-dxf'?(allowPartial?m.dwg_to_dxf_partial(new Uint8Array(bytes)):m.dwg_to_dxf(new Uint8Array(bytes))):(preview instanceof ArrayBuffer&&typeof m.dxf_to_dwg_with_preview==='function'?m.dxf_to_dwg_with_preview(new Uint8Array(bytes),new Uint8Array(preview)):m.dxf_to_dwg(new Uint8Array(bytes)));
  if(!(result instanceof Uint8Array)||!result.length)throw Error('Salida vacía');
  const output=result.slice().buffer;
  self.postMessage({output,previewEmbedded:direction==='dxf-dwg'&&preview instanceof ArrayBuffer&&typeof m.dxf_to_dwg_with_preview==='function'},[output]);
 }catch(e){self.postMessage({error:String(e?.message||e)})}
};
