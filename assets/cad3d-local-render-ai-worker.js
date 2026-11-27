/* Optional local inference. Only library/model files are fetched; pixels remain in worker memory. */
self.onmessage=async function(e){
 try{
  const {width:w,height:h,pixels}=e.data;
  if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w>640||h>640||!(pixels instanceof ArrayBuffer)||pixels.byteLength!==w*h*4)throw Error('Entrada de imagen inválida');
  const {pipeline,RawImage,env}=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1');
  env.allowLocalModels=false;env.useBrowserCache=true;
  if(env.backends?.onnx?.wasm)env.backends.onnx.wasm.numThreads=1;
  self.postMessage({status:'IA local · descargando pesos si no están en caché…'});
  const upscaler=await pipeline('image-to-image','Xenova/swin2SR-classical-sr-x2-64',{device:'wasm',dtype:'q8'});
  const rgba=new Uint8ClampedArray(pixels),rgb=new Uint8ClampedArray(w*h*3);
  for(let i=0,j=0;i<rgba.length;i+=4){rgb[j++]=rgba[i];rgb[j++]=rgba[i+1];rgb[j++]=rgba[i+2];}
  self.postMessage({status:'IA local · procesando imagen en tu equipo…'});
  const out=await upscaler(new RawImage(rgb,w,h,3));
  if(out.width!==w*2||out.height!==h*2||![3,4].includes(out.channels))throw Error('Dimensiones de salida inesperadas');
  const result=new Uint8ClampedArray(out.width*out.height*4);
  for(let i=0,j=0;j<result.length;i+=out.channels,j+=4){result[j]=out.data[i];result[j+1]=out.data[i+1];result[j+2]=out.data[i+2];result[j+3]=255;}
  self.postMessage({width:out.width,height:out.height,pixels:result.buffer},[result.buffer]);
 }catch(error){self.postMessage({error:error.message||String(error)});}
};
