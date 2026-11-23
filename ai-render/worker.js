/* CAD2D3D Generative Render · Cloudflare Worker prototype.
 * Requires OPENAI_API_KEY, RENDER_TEST_TOKEN and AI_RENDER_LIMITER.
 * Not a public endpoint; no unauthenticated or unmetered generation.
 */
const ALLOWED_ORIGINS=new Set([
 'https://blackline-cad.org','https://www.blackline-cad.org',
 'https://diegoalonsok-png.github.io'
]);
const PROMPTS=Object.freeze({
 croquis:'Produce a NEW premium architectural illustration, fine expressive black ink, accurate perspective, hand-painted transparent watercolor washes, off-white paper, sophisticated hand-drawn façade outlines and natural daylight. Rich architectural detail, crisp windows and doors, no blur.',
 realista:'Produce a NEW high-quality photorealistic exterior architectural visualization with physically coherent daylight, accurate building volumes, natural glass reflections, sophisticated surfaces, landscaping and photographic composition.',
 grafito:'Produce a NEW professional graphite-pencil architectural presentation drawing, controlled line weight, sharp visible façade edges, tonal pencil shading, restrained crosshatching on warm fine-art paper, no blur.',
 conceptual:'Produce a NEW vivid concept-architecture illustration with colored architectural markers, controlled ink outlines, precise geometric perspective, layered marker shading and subtle paper texture.'
});
const PREFIX='Use the input image only as a reference view of an actual CAD architectural model. Preserve the exact camera viewpoint, overall building silhouette, wall positions, doors and windows, roof and slab outlines and relative proportions. Do not invent floors, openings or additional volumes. Do not add text, labels or watermarks. Maintain architectural legibility. ';
function secureEqual(a,b){
 const x=new TextEncoder().encode(a),y=new TextEncoder().encode(b);
 let diff=x.length^y.length;
 for(let i=0;i<Math.max(x.length,y.length);i++)diff|=(x[i]||0)^(y[i]||0);
 return diff===0;
}
function json(req,data,status){
 const origin=req.headers.get('Origin'),allowed=ALLOWED_ORIGINS.has(origin);
 return new Response(JSON.stringify(data),{status:status||200,headers:{
  'content-type':'application/json; charset=utf-8',
  'cache-control':'no-store','x-content-type-options':'nosniff',
  'vary':'Origin',...(allowed?{'access-control-allow-origin':origin}: {})
 }});
}
function sizeFromRatio(w,h){
 const ratio=w/h;
 if(ratio>1.58)return '1536x864';
 if(ratio>1.08)return '1536x1024';
 if(ratio<.64)return '864x1536';
 if(ratio<.91)return '1024x1536';
 return '1024x1024';
}
async function readLimited(req,maxBytes){
 const len=Number(req.headers.get('content-length')||0);
 if(len>maxBytes)throw Error('Tamaño de captura excesivo');
 if(!req.body)throw Error('Falta el contenido');
 const reader=req.body.getReader(),chunks=[];let total=0;
 while(true){
  const part=await reader.read();if(part.done)break;
  total+=part.value.byteLength;
  if(total>maxBytes){await reader.cancel();throw Error('Tamaño de captura excesivo');}
  chunks.push(part.value);
 }
 const body=new Uint8Array(total);let offset=0;
 for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.length;}
 return JSON.parse(new TextDecoder().decode(body));
}
async function safeId(ip){
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ip||'unknown'));
 return Array.from(new Uint8Array(digest).slice(0,16)).map(x=>x.toString(16).padStart(2,'0')).join('');
}
export default {
 async fetch(req,env){
  const path=new URL(req.url).pathname;
  if(path==='/health'&&req.method==='GET')
   return json(req,{service:'cad2d3d-ai-render',ready:!!(env.OPENAI_API_KEY&&env.RENDER_TEST_TOKEN&&env.AI_RENDER_LIMITER)});
  if(path!=='/render')return json(req,{error:'Ruta inexistente'},404);
  const origin=req.headers.get('Origin');
  if(!ALLOWED_ORIGINS.has(origin))return json(req,{error:'Origen no autorizado'},403);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{
   'access-control-allow-origin':origin,'access-control-allow-methods':'POST,OPTIONS',
   'access-control-allow-headers':'Content-Type,Authorization',
   'access-control-max-age':'600','vary':'Origin'
  }});
  if(req.method!=='POST')return json(req,{error:'Método no permitido'},405);
  if(!env.OPENAI_API_KEY||!env.RENDER_TEST_TOKEN||!env.AI_RENDER_LIMITER)
   return json(req,{error:'Servicio IA todavía no configurado'},503);
  const authorization=req.headers.get('Authorization')||'';
  if(!authorization.startsWith('Bearer ')||
    !secureEqual(authorization.slice(7),String(env.RENDER_TEST_TOKEN)))
   return json(req,{error:'Token de prueba incorrecto'},401);
  const client=await safeId(req.headers.get('CF-Connecting-IP')||'unknown');
  try{
   const rate=await env.AI_RENDER_LIMITER.limit({key:client});
   if(!rate.success)return json(req,{error:'Límite de renders de prueba alcanzado'},429);
  }catch(_){return json(req,{error:'Protección de cuota indisponible'},503);}
  let body;
  try{body=await readLimited(req,8*1024*1024);}
  catch(err){return json(req,{error:String(err?.message||'JSON inválido')},413);}
  const {image,style,width,height}=body||{};
  if(typeof image!=='string'||image.length>7*1024*1024||
   !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(image))
   return json(req,{error:'Se requiere una captura PNG válida de tamaño limitado'},400);
  const w=Number(width),h=Number(height);
  if(!Number.isInteger(w)||!Number.isInteger(h)||w<80||h<80||w>2500||h>2500)
   return json(req,{error:'Dimensiones de captura inválidas'},400);
  if(!Object.prototype.hasOwnProperty.call(PROMPTS,style))
   return json(req,{error:'Estilo de render desconocido'},400);
  const model=env.AI_IMAGE_MODEL||'gpt-image-2.6-sunburst';
  const payload={model,images:[{image_url:image}],prompt:PREFIX+PROMPTS[style],
   quality:'high',complexity:'high',size:sizeFromRatio(w,h),output_format:'png',n:1,
   safety_identifier:client};
  let response;
  try{
   response=await fetch('https://api.openai.com/v1/images/edits',{
    method:'POST',headers:{'Authorization':'Bearer '+env.OPENAI_API_KEY,
     'content-type':'application/json'},
    body:JSON.stringify(payload),signal:AbortSignal.timeout(120000)
   });
  }catch(_){return json(req,{error:'El servicio de generación no respondió'},502);}
  if(!response.ok){
   // Avoid returning upstream identifiers, credentials or customer details.
   return json(req,{error:response.status===429?'Servicio IA ocupado o sin cuota':
    response.status===400?'Parámetros de imagen rechazados':
    'Servicio IA no disponible',upstreamStatus:response.status},502);
  }
  let result;
  try{result=await response.json();}
  catch(_){return json(req,{error:'Respuesta IA inválida'},502);}
  const b64=result?.data?.[0]?.b64_json;
  if(typeof b64!=='string'||!b64.length)return json(req,{error:'El servicio no devolvió una imagen'},502);
  return json(req,{image:'data:image/png;base64,'+b64,model,style});
 }
};
