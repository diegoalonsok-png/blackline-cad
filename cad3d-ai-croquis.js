/* CAD2D3D AI CROQUIS — independent image-to-image client; no CAD model mutations. */
(function(){
'use strict';
function init(){
 function install(root){
  if(root.dataset.croquisAiInstalled)return;
  var bar=root.querySelector('.camera3DBar');if(!bar)return;
  root.dataset.croquisAiInstalled='1';
  var btn=document.createElement('button');
  btn.type='button';btn.className='btn cadCroquisAILaunch';btn.textContent='✦ CREAR CROQUIS IA';btn.hidden=true; // opened from RENDER ARTÍSTICO › ✦ Retocar con IA
  btn.title='Fotografiar la perspectiva 3D y generar croquis con Cloudflare AI';bar.appendChild(btn);
  var box=document.createElement('section');box.className='cadCroquisAIPanel';box.hidden=true;
  box.setAttribute('role','dialog');box.setAttribute('aria-label','Generador de croquis por IA');
  box.innerHTML='<header><strong>✦ CROQUIS IA · DESDE PERSPECTIVA</strong><button data-close title="Cerrar">×</button></header>'+
   '<div class="cadCroquisAIOptions"><label>Origen<select data-source><option value="art">Render artístico local (recomendado)</option><option value="view">Vista 3D sin estilo</option></select></label><label>Estilo<select data-style><option value="refine">Retocar el render artístico</option><option value="watercolor">Acuarela arquitectónica</option><option value="pencil">Lápiz y grafito</option><option value="ink">Tinta y plumilla</option><option value="marker">Marcadores</option><option value="pastel">Pastel</option></select></label>'+
   '<label>Motor<select data-quality><option value="fast">FLUX.2 Klein · piloto privado</option></select></label></div>'+
   '<div class="cadCroquisAIActions"><button data-photo>📷 Fotografiar perspectiva</button><button data-export-photo disabled>Guardar foto 3D</button><button data-check>Comprobar Cloudflare</button><button data-create disabled>✦ Generar croquis</button><button data-save disabled>Guardar croquis PNG</button></div>'+
   '<div class="cadCroquisAICompare"><figure><figcaption>Perspectiva original</figcaption><img data-original alt="Captura original del modelo CAD"></figure>'+
   '<figure><figcaption>Croquis generado</figcaption><img data-result alt="Croquis arquitectónico generado"></figure></div>'+
   '<output data-status role="status" aria-live="polite">Elegí una perspectiva y fotografiala.</output>'+
   '<small>La imagen se envía a Cloudflare solo cuando pulsás Generar. El modelo CAD permanece intacto. La IA puede alterar detalles: no usar como documentación de obra.</small>';
  root.appendChild(box);
  if(!document.getElementById('cadCroquisAIStyles')){
   var css=document.createElement('style');css.id='cadCroquisAIStyles';css.textContent=
    '#cad3dLab .cadCroquisAILaunch{margin-left:auto!important;background:#26576d!important;border:1px solid #81c3db!important;color:#fff!important;font-weight:700!important;white-space:nowrap}'+
    '#cad3dLab>.cadCroquisAIPanel{position:absolute;z-index:220;left:50%;top:7%;transform:translateX(-50%);width:min(930px,calc(100% - 24px));max-height:85%;overflow:auto;background:#152735;color:#eef6fa;box-shadow:0 22px 50px #000b;border:1px solid #75a2b7;border-radius:10px;padding:15px;box-sizing:border-box;font:12px Inter,Arial,sans-serif}'+
    '#cad3dLab>.cadCroquisAIPanel[hidden]{display:none!important}'+
    '#cad3dLab .cadCroquisAILaunch[hidden]{display:none!important}'+
    '#cad3dLab .cadCroquisAIPanel header{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #547589;margin-bottom:13px;padding-bottom:8px}'+
    '#cad3dLab .cadCroquisAIPanel header button{font-size:22px;background:none;color:white;border:0;cursor:pointer}'+
    '#cad3dLab .cadCroquisAIOptions,#cad3dLab .cadCroquisAIActions{display:flex;gap:10px;align-items:end;flex-wrap:wrap;margin-bottom:12px}'+
    '#cad3dLab .cadCroquisAIOptions label{display:grid;gap:4px;flex:1 1 180px}'+
    '#cad3dLab .cadCroquisAIOptions select{width:100%;background:#243d4d;color:white;border:1px solid #728da1;border-radius:5px;padding:8px}'+
    '#cad3dLab .cadCroquisAIActions button{background:#2b5872;color:white;padding:8px 11px;border:1px solid #78aecb;border-radius:5px;cursor:pointer}'+
    '#cad3dLab .cadCroquisAIActions button:disabled{opacity:.5;cursor:default}'+
    '#cad3dLab .cadCroquisAICompare{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px}'+
    '#cad3dLab .cadCroquisAICompare figure{min-width:0;margin:0}'+
    '#cad3dLab .cadCroquisAICompare figcaption{padding-bottom:6px;font-weight:700}'+
    '#cad3dLab .cadCroquisAICompare img{width:100%;height:260px;object-fit:contain;background:#ece8de;border:1px solid #58798b;border-radius:4px;box-sizing:border-box}'+
    '#cad3dLab .cadCroquisAIPanel output{display:block;color:#c9ebfb;min-height:22px;margin:12px 0 6px}'+
    '#cad3dLab .cadCroquisAIPanel small{display:block;color:#afc6d3;line-height:1.4}'+
    '@media(max-width:650px){#cad3dLab .cadCroquisAICompare{grid-template-columns:1fr}#cad3dLab .cadCroquisAICompare img{height:180px}}';
   document.head.appendChild(css);
  }
  var pic=box.querySelector('[data-original]'),art=box.querySelector('[data-result]'),save=box.querySelector('[data-save]'),
      create=box.querySelector('[data-create]'),status=box.querySelector('[data-status]');
  var exportPhoto=box.querySelector('[data-export-photo]'),check=box.querySelector('[data-check]');
  var state={source:null,photoURL:null,resultURL:null,busy:false,ready:false};
  function tell(s){status.textContent=s;}
  function saveURL(url,name){if(!url)return;var a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();}
  async function checkBackend(){
   if(state.busy)return;
   check.disabled=true;create.disabled=true;state.ready=false;
   try{
    var res=await fetch('/croquis/render',{method:'GET',headers:{Accept:'application/json'},credentials:'same-origin',cache:'no-store'});
    var type=res.headers.get('content-type')||'';
    if(!res.ok||!type.includes('application/json'))throw Error('El servicio de Cloudflare no responde en esta publicación. Abrí CAD2D3D desde Cloudflare Pages y comprobá el despliegue.');
    var body=await res.json();
    if(body.ready===true&&body.policy==='private-pilot-v1'&&body.quotaConfigured===true&&body.privateAccessConfigured===true){state.ready=true;create.disabled=false;tell('IA lista: máximo '+(body.dailyAttemptCap||20)+' retoques diarios dentro de la cuota gratuita de Cloudflare. Solo FLUX.2 Klein 4B.');}
    else{tell('Cloudflare pendiente: '+(body.error||'La protección del piloto todavía no está publicada. No se enviarán imágenes a IA.'));}
   }catch(e){tell('Sin conexión con el motor IA: '+(e.message||String(e))+' Podés guardar la foto y convertirla en ChatGPT.');}
   finally{check.disabled=false;}
  }
  function clearURL(key){if(state[key])URL.revokeObjectURL(state[key]);state[key]=null;}
  function sourceCanvas(){
   /* Prefer the local artistic render: the AI then only refines a drawing that
      already matches the model exactly, instead of reinventing a raw screenshot. */
   var mode=box.querySelector('[data-source]')?.value;
   if(mode==='art'){
    var art=root.querySelector('.cad3dSketchCapturePreview');
    var panel=root.querySelector('.cad3dSketchCapturePanel');
    if(art&&art.width>1&&art.height>1&&panel&&panel.dataset.engine==='studio')return art;
    throw Error('Primero abrí RENDER ARTÍSTICO y elegí un estilo; después volvé a «Fotografiar».');
   }
   return Array.from(root.querySelectorAll('.view > canvas')).find(function(c){
    return c.width>0&&c.height>0&&!c.classList.contains('cad3dDraftPreview')&&!c.classList.contains('cad3dPlanWallOverlay');
   });
  }
  function blobFrom(canvas){return new Promise(function(done){canvas.toBlob(done,'image/png');});}
  async function photo(){
   var src=sourceCanvas();
   if(!src)throw Error('Primero abrí el visor 3D y colocá una perspectiva.');
   var width=src.width,height=src.height;
   var preview=document.createElement('canvas'),factor=Math.min(1,1600/Math.max(width,height));
   preview.width=Math.max(1,Math.round(width*factor));preview.height=Math.max(1,Math.round(height*factor));
   preview.getContext('2d').drawImage(src,0,0,preview.width,preview.height);
   var input=document.createElement('canvas'),small=Math.min(1,500/Math.max(width,height));
   input.width=Math.max(1,Math.round(width*small));input.height=Math.max(1,Math.round(height*small));
   input.getContext('2d').drawImage(preview,0,0,input.width,input.height);
   var blobs=await Promise.all([blobFrom(input),blobFrom(preview)]);
   if(!blobs[0]||!blobs[0].size)throw Error('La perspectiva produjo una imagen vacía.');
   state.source=blobs[0];clearURL('photoURL');
   state.photoURL=URL.createObjectURL(blobs[1]||blobs[0]);pic.src=state.photoURL;exportPhoto.disabled=false;
   clearURL('resultURL');art.removeAttribute('src');save.disabled=true;
   tell('Foto tomada de la perspectiva ('+width+' × '+height+' píxeles).');
   return {width:width,height:height};
  }
  async function generate(){
   if(state.busy)return;
   if(!state.ready){await checkBackend();if(!state.ready)return;}
   var key=window.prompt('Clave privada del piloto de croquis (no se guarda):');
   if(!key){tell('Generación cancelada. No se llamó a la IA.');return;}
   state.busy=true;create.disabled=true;save.disabled=true;
   try{
    var size=await photo(),style=box.querySelector('[data-style]').value,quality=box.querySelector('[data-quality]').value;
    var ratio=size.width/size.height;
    var w=Math.round(Math.max(768,Math.min(1440,1056*ratio))/16)*16;
    var h=Math.round(Math.max(512,Math.min(1440,w/ratio))/16)*16;
    var form=new FormData();form.append('image',state.source,'cad3d-perspectiva.png');
    form.append('style',style);form.append('quality',quality);
    form.append('width',String(w));form.append('height',String(h));
    tell('Generando el croquis en Cloudflare Workers AI…');
    var res=await fetch('/croquis/render',{method:'POST',body:form,headers:{Authorization:'Bearer '+key},credentials:'same-origin',cache:'no-store',redirect:'error'});
    if(!res.ok){
     var error='HTTP '+res.status;try{var data=await res.json();error=data.error||error;}catch(_e){}
     throw Error(error);
    }
    var blob=await res.blob();
    if(!blob.type.startsWith('image/')||!blob.size)throw Error('El servicio no devolvió un PNG válido.');
    clearURL('resultURL');state.resultURL=URL.createObjectURL(blob);
    art.src=state.resultURL;save.disabled=false;tell('Croquis generado. Compará la foto y guardá el PNG.');
   }catch(e){tell('No se pudo generar: '+(e.message||String(e)));}
   finally{key=null;state.busy=false;create.disabled=!state.ready;}
  }
  btn.addEventListener('click',function(){
   box.hidden=false;
   if(!state.source)photo().then(checkBackend).catch(function(e){tell(e.message);});
   else checkBackend();
  });
  box.querySelector('[data-close]').addEventListener('click',function(){box.hidden=true;});
  box.querySelector('[data-photo]').addEventListener('click',function(){photo().then(checkBackend).catch(function(e){tell(e.message);});});
  exportPhoto.addEventListener('click',function(){saveURL(state.photoURL,'CAD2D3D-perspectiva-original.png');});
  check.addEventListener('click',checkBackend);
  create.addEventListener('click',generate);
  save.addEventListener('click',function(){saveURL(state.resultURL,'CAD2D3D-croquis-'+box.querySelector('[data-style]').value+'.png');});
 }
 var root=document.getElementById('cad3dLab');if(root)install(root);
 var obs=new MutationObserver(function(){
  var el=document.getElementById('cad3dLab');
  if(el&&el.querySelector('.camera3DBar')){install(el);obs.disconnect();}
 });
 if(!root||!root.querySelector('.camera3DBar'))obs.observe(document.body,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();