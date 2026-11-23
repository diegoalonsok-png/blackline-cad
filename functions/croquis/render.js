/* Cloudflare Pages Function POST /croquis/render.
   Requires Workers AI binding AI and CROQUIS_ENABLED=true. */
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
export async function onRequestPost({request,env}){
 try{
  var expected=new URL(request.url).origin;
  if(request.headers.get('Origin')!==expected)return reply('La solicitud debe provenir del mismo CAD2D3D.',403);
  var site=request.headers.get('Sec-Fetch-Site');
  if(site&&site!=='same-origin')return reply('Solicitud de otro origen rechazada.',403);
  if(env.CROQUIS_ENABLED!=='true'||!env.AI)
   return reply('Motor IA pendiente de activación en Cloudflare: configurar binding AI y variable CROQUIS_ENABLED=true.',503);
  if(env.CROQUIS_RATE_LIMIT){
   var allowed=await env.CROQUIS_RATE_LIMIT.limit({key:request.headers.get('CF-Connecting-IP')||'unknown'});
   if(!allowed.success)return reply('Límite de renders alcanzado.',429);
  }
  if(Number(request.headers.get('Content-Length')||0)>1600000)return reply('La imagen es demasiado grande.',413);
  var input=await request.formData(),image=input.get('image'),style=String(input.get('style')||'watercolor');
  if(!image||typeof image.arrayBuffer!=='function'||!['image/png','image/jpeg','image/webp'].includes(image.type)||
   image.size<100||image.size>1400000)return reply('Enviá una foto PNG/JPG/WebP de menos de 1,4 MB.',400);
  if(!Object.prototype.hasOwnProperty.call(STYLES,style))return reply('Estilo de croquis inválido.',400);
  function dimension(key,fallback){
   var n=Number(input.get(key));
   if(!Number.isFinite(n)||n<256||n>1920)return fallback;
   return Math.min(1920,Math.max(256,Math.round(n/16)*16));
  }
  var width=dimension('width',1152),height=dimension('height',768);
  var quality=input.get('quality')==='high'?'high':'fast';
  var model=quality==='high'?'@cf/black-forest-labs/flux-2-dev':'@cf/black-forest-labs/flux-2-klein-4b';
  var prompt='Reference image 0 is a screenshot of the exact 3D building to preserve. Reinterpret that architectural perspective into a museum-quality croquis. '+
    'Preserve exact massing, number of floors, roof profile, facade composition, window and door counts and locations, building proportions, camera angle, and vanishing points. '+
    'Do not invent or remove major structural parts; this is an illustrated version of the SAME architecture, not a redesign. '+
    STYLES[style]+' Compositionally faithful to the reference, professional architectural competition illustration, high refinement, no lettering, no text, no watermark.';
  var form=new FormData();
  form.append('input_image_0',image,'perspectiva-cad3d.png');
  form.append('prompt',prompt);
  form.append('width',String(width));form.append('height',String(height));
  if(quality==='high')form.append('steps','25');
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
export async function onRequestGet(){
 return reply('La generación de croquis requiere el botón dentro del módulo 3D.',405);
}