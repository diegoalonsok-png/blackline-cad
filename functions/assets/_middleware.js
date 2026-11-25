// Read-only, same-origin access to the architecture library stored in Cloudflare R2.
// Until the bucket is bound, Cloudflare Pages serves the same published assets.
export async function onRequest(context) {
 const {request,env,next}=context;
 const url=new URL(request.url),key=url.pathname.slice(1);
 if(!/^(?:assets\/arq-catalogue\/v1\/(?:index\.json|plan-\d+\.(?:svg|json))|assets\/architecture-references\/(?:(?:index|user-house-plans)\.json|[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+\.(?:png|jpe?g|webp|pdf|dxf|dwg)))$/i.test(key))return next();
 if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{Allow:'GET, HEAD'}});
 const bucket=env.ARCHITECTURE_LIBRARY;
 const fallback=async()=>{const res=await next();if(!res.ok)return res;const headers=new Headers(res.headers);headers.set('X-CAD-Library-Storage','pages');return new Response(res.body,{status:res.status,headers});};
 if(!bucket)return fallback();
 let object;
 try{object=request.method==='HEAD'?await bucket.head(key):await bucket.get(key);}catch(e){return fallback();}
 if(!object)return fallback();
 const headers=new Headers();object.writeHttpMetadata(headers);
 const ext=key.split('.').pop().toLowerCase();
 const mime={json:'application/json',svg:'image/svg+xml',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',pdf:'application/pdf',dxf:'application/octet-stream',dwg:'application/octet-stream'}[ext];
 if(mime)headers.set('Content-Type',mime);
 headers.set('ETag',object.httpEtag);
 headers.set('Content-Length',String(object.size));
 headers.set('X-Content-Type-Options','nosniff');
 headers.set('Cross-Origin-Resource-Policy','same-origin');
 headers.set('X-CAD-Library-Storage','r2');
 headers.set('Cache-Control',/(?:index|user-house-plans)\.json$/.test(key)?'no-cache':/\.(?:json|dxf|dwg|pdf)$/i.test(key)?'no-store':'public, max-age=3600, must-revalidate');
 if(request.headers.get('If-None-Match')===object.httpEtag)return new Response(null,{status:304,headers});
 return new Response(request.method==='HEAD'?null:object.body,{headers});
}
