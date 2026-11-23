/* Cloudflare Pages Function POST /croquis/render.
   Private pilot: fail closed without explicit enable, server secret and dedicated atomic D1 quota.
   This protects inference calls from this deployment only, not account-wide billing. */
const STYLES={
 watercolor:'Fine professional architectural watercolor on cotton paper; exquisite fine ink contours, subtle translucent mineral pigments, realistic light, elegant soft shadows.',
 pencil:'High-quality hand-drawn architectural perspective in precise graphite and pencil, light and dark varied line weight, refined crosshatching, tactile sketchbook paper.',
 ink:'Expert architectural technical pen-and-ink illustration, delicate nib strokes, fine spatial hatching, carefully rendered daylight and contrast, warm white paper.',
 marker:'Professional architectural illustrator marker rendering, delicate outlines, tasteful hand-marker blocks of color and shadow, warm architectural presentation paper.',
 pastel:'Sophisticated architectural soft-pastel rendering with fine linework, subtle paper grain, softly colored sunlit facades and rich spatial depth.'
};
function reply(error,status){
 return new Response(JSON.stringify({error:error}),{status:status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
const DAILY_CAP=5;
const MODEL='@cf/black-forest-labs/flux-2-klein-4b';
const POLICY_VERSION='private-pilot-v1';
function secretConfigured(env){return typeof env.CROQUIS_PILOT_KEY==='string'&&env.CROQUIS_PILOT_KEY.length>=32;}
function quotaConfigured(env){return !!env.CROQUIS_QUOTA&&typeof env.CROQUIS_QUOTA.prepare==='function';}
async function authorized(request,env){
 var header=request.headers.get('Authorization')||'';
 if(!header.startsWith('Bearer ')||header.length>512)return false;
 var enc=new TextEncoder();
 var a=new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(header.slice(7))));
 var b=new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(env.CROQUIS_PILOT_KEY)));
 var diff=0;for(var i=0;i<a.length;i++)diff|=a[i]^b[i];
 return diff===0;
}
async function reserve(env){
 // A single atomic SQLite UPSERT serializes reservations across all edge locations.
 // Never refund a failed request: its inference may still have been billed.
 var day=new Date().toISOString().slice(0,10);
 return await env.CROQUIS_QUOTA.prepare(
 'INSERT INTO croquis_daily(day,attempts) VALUES(?,1) ON CONFLICT(day) DO UPDATE SET attempts=attempts+1 WHERE attempts<? RETURNING attempts'
 ).bind(day,DAILY_CAP).first();
}
export async function onRequestPost({request,env}){
 try{
  var expected=new URL(request.url).origin;
  if(request.headers.get('Origin')!==expected)return reply('La solicitud debe provenir del mismo CAD2D3D.',403);
  var site=request.headers.get('Sec-Fetch-Site');
  if(site&&site!=='same-origin')return reply('Solicitud de otro origen rechazada.',403);
  if(!env.AI)return reply('Falta agregar el binding Workers AI con el nombre AI en Cloudflare Pages, entorno Production, y volver a desplegar.',503);
  if(env.CROQUIS_ENABLED!=='true')return reply('Generación IA desactivada por protección de consumo.',503);
  if(!secretConfigured(env)||!quotaConfigured(env))return reply('Piloto bloqueado: faltan la autorización privada o el contador persistente de consumo.',503);
  if(!await authorized(request,env))return reply('Acceso privado: ingresá la clave del piloto de croquis.',401);
  if(env.CROQUIS_RATE_LIMIT){
   var allowed=await env.CROQUIS_RATE_LIMIT.limit({key:request.headers.get('CF-Connecting-IP')||'unknown'});
   if(!allowed.success)return reply('Límite de renders alcanzado.',429);
  }
  if(Number(request.headers.get('Content-Length')||0)>1600000)return reply('La imagen es demasiado grande.',413);
  var input=await request.formData(),image=input.get('image'),style=String(input.get('style')||'watercolor');
  if(!image||typeof image.arrayBuffer!=='function'||image.type!=='image/png'||
   image.size<100||image.size>1400000)return reply('Enviá una foto PNG de menos de 1,4 MB.',400);
  if(!Object.prototype.hasOwnProperty.call(STYLES,style))return reply('Estilo de croquis inválido.',400);
  // Verify actual PNG signature and IHDR dimensions, not just user-supplied MIME/size.
  var head=new Uint8Array(await image.slice(0,24).arrayBuffer());
  if(head.length!==24||![137,80,78,71,13,10,26,10].every((v,i)=>head[i]===v)||
     head[12]!==73||head[13]!==72||head[14]!==68||head[15]!==82)
   return reply('PNG de referencia inválido.',400);
  var dims=new DataView(head.buffer),iw=dims.getUint32(16),ih=dims.getUint32(20);
  if(iw<1||ih<1||iw>512||ih>512)return reply('Referencia máxima: 512 × 512 píxeles.',400);
  // Ignore requested quality and dimensions: fixed low-cost model and bounded image.
  var ratio=iw/ih;
  var width=ratio>=1?768:Math.max(256,Math.round(768*ratio/16)*16);
  var height=ratio>=1?Math.max(256,Math.round(768/ratio/16)*16):768;
  var model=MODEL;
  var prompt='Reference image 0 is a screenshot of the exact 3D building to preserve. Reinterpret that architectural perspective into a museum-quality croquis. '+
    'Preserve exact massing, number of floors, roof profile, facade composition, window and door counts and locations, building proportions, camera angle, and vanishing points. '+
    'Do not invent or remove major structural parts; this is an illustrated version of the SAME architecture, not a redesign. '+
    STYLES[style]+' Compositionally faithful to the reference, professional architectural competition illustration, high refinement, no lettering, no text, no watermark.';
  var form=new FormData();
  form.append('input_image_0',image,'perspectiva-cad3d.png');
  form.append('prompt',prompt);
  form.append('width',String(width));form.append('height',String(height));
  // No premium model, additional reference, repeated inference or automatic retry.
  var reservation;
  try{reservation=await reserve(env);}catch(e){
   console.error('Croquis quota unavailable',e&&e.message);
   return reply('Contador de consumo no disponible. No se ejecutó la IA.',503);
  }
  if(!reservation)return reply('Cupo privado agotado: máximo 5 intentos diarios (UTC).',429);
  var transport=new Response(form);
  var result=await env.AI.run(model,{multipart:{
   body:transport.body,contentType:transport.headers.get('content-type')
  }});
  if(!result||typeof result.image!=='string'||!result.image)
   return reply('El modelo no devolvió una imagen.',502);
  var base64=atob(result.image),bytes=new Uint8Array(base64.length);
  for(var i=0;i<base64.length;i++)bytes[i]=base64.charCodeAt(i);
  return new Response(bytes,{status:200,headers:{
   'Content-Type':'image/png','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'
  }});
 }catch(error){
  console.error('CAD2D3D croquis IA:',error&&error.message);
  return reply('No se pudo producir el croquis con Cloudflare AI. Revisá binding, permisos, cuota e inferencias.',502);
 }
}
export async function onRequestGet({env}){
 // Read-only health check. Never disclose keys, model costs or account data.
 var bound=!!env.AI,enabled=env.CROQUIS_ENABLED==='true',quota=quotaConfigured(env),auth=secretConfigured(env),ready=bound&&enabled&&quota&&auth;
 var error=!bound
  ?'Falta configurar Workers AI → binding AI (Production) en Cloudflare Pages y volver a desplegar.'
  :!enabled
   ?'Generación temporalmente desactivada por protección de consumo.'
   :!quota||!auth?'Piloto bloqueado: falta configurar el contador persistente y la clave privada.':null;
 return new Response(JSON.stringify({ready:ready,aiBinding:bound,enabled:enabled,quotaConfigured:quota,privateAccessConfigured:auth,dailyAttemptCap:DAILY_CAP,maxOutputSide:768,policy:POLICY_VERSION,error:error}),{
  status:200,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}
 });
}