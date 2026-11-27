// Read-only, same-origin access to the architecture library stored in Cloudflare R2.
// Until the bucket is bound, Cloudflare Pages serves the same published assets.
export async function onRequest(context) {
 const {request,env,next}=context;
 const url=new URL(request.url),key=url.pathname.slice(1);
 if(!/^(?:assets\/3d-object-library\/v1\/(?:catalog\.json|cloud-[a-z0-9-]{1,80}\.(?:json|svg|png|webp|jpg))|assets\/user-cad\/v1\/(?:catalog\.json|[a-z0-9_-]+-[0-9a-f]{12}\.(?:dxf|dwg|webp))|assets\/arq-catalogue\/v1\/(?:index\.json|plan-\d+\.(?:svg|json))|assets\/architecture-references\/(?:(?:index|user-house-plans|drive-house-references|r2-house-plans)\.json|[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+\.(?:png|jpe?g|webp|pdf|dxf|dwg)))$/i.test(key))return next();
 if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{Allow:'GET, HEAD'}});
 const bucket=env.ARCHITECTURE_LIBRARY;
 const fallback=async()=>{const res=await next();if(!res.ok)return res;const headers=new Headers(res.headers);headers.set('X-CAD-Library-Storage','pages');return new Response(res.body,{status:res.status,headers});};
 if(!bucket)return fallback();
 // Discover new image pairs even if a contributor has not rebuilt the manifest.
 // Original and thumbnail must both exist before a new card becomes visible.
 if(key==='assets/architecture-references/user-house-plans.json'){
  try{
   const prefix='assets/architecture-references/',existing=await bucket.get(key);
   let manifest=[];if(existing){const rows=await existing.json();if(Array.isArray(rows))manifest=rows}
   else {const response=await next();if(response.ok){try{const rows=await response.json();if(Array.isArray(rows))manifest=rows}catch(e){}}}
   const byPath=new Map(manifest.filter(x=>x&&typeof x.original==='string').map(x=>[x.original,x]));
   const keys=new Set();let cursor;
   do{const page=await bucket.list({prefix:prefix+'house/',limit:1000,...(cursor?{cursor}:{})});for(const item of page.objects)keys.add(item.key.slice(prefix.length));cursor=page.truncated?page.cursor:null;}while(cursor);
   for(const original of keys){
    const m=original.match(/^house\/(\d+)\/(user-[\w-]+)\.(png|jpe?g)$/i);if(!m||/-thumb$/i.test(m[2])||byPath.has(original))continue;
    const [,area,id]=m,base='house/'+area+'/'+id;const thumb=[base+'-thumb.jpg',base+'-thumb.png',base+'-thumb.webp'].find(p=>keys.has(p));if(!thumb)continue;
    byPath.set(original,{id,title:id.replace(/^user-(?:\d{8}-)?/,'').replace(/-/g,' '),category:'house',area:Number(area),areaType:'approximate_category',license:'User supplied',original,thumb});
   }
   const rows=[...byPath.values()];return new Response(request.method==='HEAD'?null:JSON.stringify(rows),{headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-CAD-Library-Storage':'r2','X-Content-Type-Options':'nosniff'}});
  }catch(e){return fallback()}
 }

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
 headers.set('Cache-Control',/(?:catalog|index|user-house-plans|drive-house-references|r2-house-plans)\.json$/.test(key)?'no-cache':/\.(?:json|dxf|dwg|pdf)$/i.test(key)?'no-store':'public, max-age=3600, must-revalidate');
 if(request.headers.get('If-None-Match')===object.httpEtag)return new Response(null,{status:304,headers});
 return new Response(request.method==='HEAD'?null:object.body,{headers});
}
