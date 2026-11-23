/* CAD2D3D · Generative render (opt-in service). No local NPR filters. */
(function(){
'use strict';
var panel=null,lastImage='',capture=null,busy=false;
var styles={croquis:'Croquis arquitectónico tinta y acuarela',realista:'Render fotorrealista',
 grafito:'Grafito arquitectónico',conceptual:'Marcadores de arquitectura'};
var css=document.createElement('style');
css.textContent=[
 '#cad3dLab .cad3dAIPanel{position:absolute;z-index:420;right:16px;top:140px;width:min(740px,calc(100% - 30px));max-height:calc(100% - 160px);overflow:auto;box-sizing:border-box;background:#182935;color:#e7f1f5;border:1px solid #799cb0;border-radius:9px;box-shadow:0 20px 46px #000b;padding:12px}',
 '#cad3dLab .cad3dAIPanel[hidden]{display:none!important}',
 '#cad3dLab .cad3dAIHead{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:9px}',
 '#cad3dLab .cad3dAIControls{display:flex;align-items:end;gap:9px;flex-wrap:wrap;margin-bottom:10px}',
 '#cad3dLab .cad3dAIControls label{font:600 11px Inter,Arial,sans-serif;display:grid;gap:3px}',
 '#cad3dLab .cad3dAIControls select,#cad3dLab .cad3dAIControls input{height:33px;min-width:160px;max-width:225px;background:#0d202d;color:#fff;border:1px solid #688a9d;border-radius:5px;padding:5px 7px}',
 '#cad3dLab .cad3dAIControls button{min-height:34px}',
 '#cad3dLab .cad3dAICompare{display:grid;grid-template-columns:1fr 1fr;gap:9px}',
 '#cad3dLab .cad3dAICompare>div{min-width:0}',
 '#cad3dLab .cad3dAICompare strong{font-size:11px;display:block;margin-bottom:5px}',
 '#cad3dLab .cad3dAICompare img{display:block;width:100%;height:auto;max-height:400px;object-fit:contain;background:#fcfaf4;border:1px solid #4d6b7d}',
 '#cad3dLab .cad3dAIStatus{font-size:11px;margin:9px 0;color:#c2d6e2;min-height:17px}',
 '#cad3dLab .cad3dAINote{color:#b4c8d4;display:block;font:11px/1.5 Inter,Arial,sans-serif}',
 '@media(max-width:620px){#cad3dLab .cad3dAICompare{grid-template-columns:1fr}}'
].join('\n');
document.head.appendChild(css);
function el(parent,tag,cls,text){
 var n=document.createElement(tag);if(cls)n.className=cls;
 if(text!==undefined)n.textContent=text;parent.appendChild(n);return n;
}
function build(root){
 panel=el(root,'section','cad3dAIPanel');panel.hidden=true;
 panel.setAttribute('aria-label','Generar una imagen nueva con inteligencia artificial');
 var header=el(panel,'header','cad3dAIHead');
 el(header,'strong','','RENDER IA · nueva imagen desde la vista 3D');
 var close=el(header,'button','btn','×');close.type='button';close.title='Cerrar';
 close.addEventListener('click',function(){if(!busy)panel.hidden=true;});
 var controls=el(panel,'div','cad3dAIControls');
 var label=el(controls,'label','','Estilo de imagen'),select=el(label,'select','cad3dAIStyle');
 for(var key in styles){var opt=el(select,'option','',styles[key]);opt.value=key;}
 var tl=el(controls,'label','','Token de prueba (solo esta sesión)');
 var token=el(tl,'input','cad3dAIToken');token.type='password';token.autocomplete='off';
 token.placeholder='Token del servicio IA';token.maxLength=256;
 var generate=el(controls,'button','btn cad3dAIRun','GENERAR IMAGEN IA');generate.type='button';
 var download=el(controls,'button','btn cad3dAIDownload','Guardar PNG');download.type='button';download.disabled=true;
 var status=el(panel,'p','cad3dAIStatus','');status.setAttribute('role','status');
 var compare=el(panel,'div','cad3dAICompare');
 var a=el(compare,'div');el(a,'strong','','Vista original CAD 3D');
 var original=el(a,'img','cad3dAIOriginal');original.alt='Vista original';original.hidden=true;
 var b=el(compare,'div');el(b,'strong','','Imagen NUEVA generada por IA');
 var image=el(b,'img','cad3dAIOutput');image.alt='Imagen generada';image.hidden=true;
 el(panel,'small','cad3dAINote','La IA crea otra imagen, no un objeto 3D editable. Puede cambiar proporciones o aberturas. Verificá la documentación antes de usarla en obra. Cada generación consume créditos de API.');
 generate.addEventListener('click',async function(){
  if(busy)return;
  var endpoint=String(window.CAD3D_AI_RENDER_ENDPOINT||'').trim(),url;
  if(!endpoint){status.textContent='Falta configurar el servicio de imágenes IA. El renderizador anterior permanece desactivado.';return;}
  try{url=new URL(endpoint);if(url.protocol!=='https:')throw Error('Se requiere HTTPS');}
  catch(_){status.textContent='URL del servicio IA inválida.';return;}
  if(!token.value.trim()){status.textContent='Ingresá el token privado de prueba del servicio IA.';return;}
  if(typeof capture!=='function'){status.textContent='El CAD 3D aún no está disponible.';return;}
  var frame;
  try{frame=capture();if(!frame?.dataURL?.startsWith('data:image/png;base64,'))throw Error('Captura no válida');}
  catch(err){status.textContent='No se pudo capturar: '+String(err.message||err);return;}
  original.src=frame.dataURL;original.hidden=false;
  image.hidden=true;lastImage='';download.disabled=true;busy=true;
  generate.disabled=true;select.disabled=true;status.textContent='Generando una imagen nueva desde esta perspectiva…';
  try{
   var res=await fetch(url.href,{method:'POST',mode:'cors',credentials:'omit',cache:'no-store',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+token.value.trim()},
    body:JSON.stringify({image:frame.dataURL,style:select.value,width:frame.width,height:frame.height})});
   var json=await res.json();
   if(!res.ok)throw Error(json.error||'Error '+res.status);
   if(typeof json.image!=='string'||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(json.image))throw Error('No se recibió una imagen PNG');
   lastImage=json.image;image.src=lastImage;image.hidden=false;download.disabled=false;
   status.textContent='Imagen IA creada. Podés descargarla, sin modificar el modelo 3D.';
  }catch(err){status.textContent='Error de generación: '+String(err?.message||err);}
  finally{busy=false;generate.disabled=false;select.disabled=false;}
 });
 download.addEventListener('click',function(){
  if(!lastImage)return;
  var link=document.createElement('a');link.href=lastImage;link.download='cad2d3d-render-ia-'+select.value+'.png';
  document.body.appendChild(link);link.click();link.remove();
 });
}
function open(options){
 if(!options?.root||typeof options.capture!=='function')return;
 capture=options.capture;
 if(!panel||!panel.isConnected)build(options.root);
 panel.hidden=false;
 if(!window.CAD3D_AI_RENDER_ENDPOINT)
  panel.querySelector('.cad3dAIStatus').textContent='Servicio IA pendiente de activar; el renderizador anterior sigue desactivado.';
}
window.CAD3DAIRender=Object.freeze({open:open});
})();
