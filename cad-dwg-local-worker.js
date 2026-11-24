/* Local DWG/DXF converter. No model uploads. */
let kernel;
self.onmessage=async e=>{
 try{
  const {bytes,direction}=e.data;
  if(!(bytes instanceof ArrayBuffer)||!['dwg-dxf','dxf-dwg'].includes(direction))throw Error('Solicitud inválida');
  if(!kernel)kernel=import('./dwg-wasm/pkg/blackline_dwg.js').then(async m=>{await m.default();return m}).catch(()=>{kernel=null;throw Error('El motor WASM todavía no está publicado o no pudo cargarse')});
  const m=await kernel;
  const result=direction==='dwg-dxf'?m.dwg_to_dxf(new Uint8Array(bytes)):m.dxf_to_dwg(new Uint8Array(bytes));
  if(!(result instanceof Uint8Array)||!result.length)throw Error('Salida vacía');
  const output=result.slice().buffer;
  self.postMessage({output},[output]);
 }catch(e){self.postMessage({error:String(e?.message||e)})}
};
