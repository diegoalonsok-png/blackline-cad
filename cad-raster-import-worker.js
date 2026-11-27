/* Local raster processing. No uploads. */
function cadRasterHeader(bytes){
 const d=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),n=bytes.length;
 const tag=(p,s)=>p+s.length<=n&&[...s].every((v,i)=>bytes[p+i]===v.charCodeAt(0));
 if(n>=24&&d.getUint32(0)===0x89504e47&&d.getUint32(4)===0x0d0a1a0a&&tag(12,'IHDR'))return {w:d.getUint32(16),h:d.getUint32(20),type:'image/png'};
 if(n>=10&&(tag(0,'GIF87a')||tag(0,'GIF89a')))return {w:d.getUint16(6,true),h:d.getUint16(8,true),type:'image/gif'};
 if(n>=26&&tag(0,'BM')){const h=d.getUint32(14,true);if(h===12)return {w:d.getUint16(18,true),h:d.getUint16(20,true),type:'image/bmp'};if(h>=40)return {w:d.getInt32(18,true),h:Math.abs(d.getInt32(22,true)),type:'image/bmp'};}
 if(n>=30&&tag(0,'RIFF')&&tag(8,'WEBP')){
  if(tag(12,'VP8X'))return {w:1+bytes[24]+256*bytes[25]+65536*bytes[26],h:1+bytes[27]+256*bytes[28]+65536*bytes[29],type:'image/webp'};
  if(tag(12,'VP8L')&&bytes[20]===47){const b=d.getUint32(21,true);return {w:1+(b&16383),h:1+((b>>>14)&16383),type:'image/webp'};}
  if(tag(12,'VP8 ')&&bytes[23]===157&&bytes[24]===1&&bytes[25]===42)return {w:d.getUint16(26,true)&16383,h:d.getUint16(28,true)&16383,type:'image/webp'};
 }
 if(n>=4&&bytes[0]===255&&bytes[1]===216){let p=2;while(p+3<n){if(bytes[p++]!==255)break;while(p<n&&bytes[p]===255)p++;const m=bytes[p++];if(m===217||m===218)break;if(m===1||(m>=208&&m<=215))continue;if(p+2>n)break;const len=d.getUint16(p);if(len<2||p+len>n)break;if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(m)&&len>=7)return {w:d.getUint16(p+5),h:d.getUint16(p+3),type:'image/jpeg'};p+=len;}}
 throw Error('Imagen no reconocida o dañada. Usá PNG, JPG o WebP.');
}
function cadRasterSizeOK(w,h){return Number.isInteger(w)&&Number.isInteger(h)&&w>0&&h>0&&w<=8192&&h<=8192&&w*h<=12000000;}

self.onmessage=async({data})=>{let im,canvas;try{if(typeof createImageBitmap!=='function'||typeof OffscreenCanvas==='undefined'){self.postMessage({unsupported:true});return}const file=data.file;if(!file||!file.size||file.size>12*1024*1024)throw Error('Imagen rechazada: máximo 12 MB.');const h=cadRasterHeader(new Uint8Array(await file.arrayBuffer()));if(!cadRasterSizeOK(h.w,h.h))throw Error('Imagen rechazada: máximo 12 megapíxeles y 8192 px por lado.');im=await createImageBitmap(new Blob([file],{type:h.type}));if(!cadRasterSizeOK(im.width,im.height))throw Error('Resolución no admitida');const k=Math.min(1,1600/Math.max(im.width,im.height)),w=Math.max(1,Math.round(im.width*k)),height=Math.max(1,Math.round(im.height*k));canvas=new OffscreenCanvas(w,height);const g=canvas.getContext('2d');if(!g)throw Error('Memoria gráfica insuficiente');g.fillStyle='#fff';g.fillRect(0,0,w,height);g.drawImage(im,0,0,w,height);im.close();im=null;const blob=await canvas.convertToBlob({type:'image/jpeg',quality:.88});if(blob.size>1800000)throw Error('Imagen optimizada demasiado pesada');self.postMessage({blob,w,h:height});}catch(err){self.postMessage({error:String(err?.message||err)})}finally{im?.close();if(canvas){canvas.width=0;canvas.height=0}}};