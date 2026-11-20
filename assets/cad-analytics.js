/* Blackline CAD · Google Analytics 4 (gtag) con Consent Mode v2.
 * GA_ID: el "ID de medición" de GA4 (formato G-XXXXXXXXXX). Vacío = Analytics apagado.
 * Solo mide en el dominio público (no en localhost ni en vistas previas).
 * En Europa (EEE, Reino Unido, Suiza) las cookies de analítica quedan denegadas
 * hasta que la persona acepta en el aviso; en el resto del mundo se miden por defecto. */
(function(){
 'use strict';
 var GA_ID='';
 var DOMINIO='blackline-cad.org';
 var host=location.hostname;
 if(!GA_ID||!(host===DOMINIO||host==='www.'+DOMINIO))return;
 var EEA=['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO','GB','CH'];
 window.dataLayer=window.dataLayer||[];
 function gtag(){dataLayer.push(arguments)}
 window.gtag=gtag;
 var KEY='cad2d-analytics-consent',saved=null;
 try{saved=localStorage.getItem(KEY)}catch(e){}
 gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'granted'});
 gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',region:EEA,wait_for_update:500});
 if(saved==='granted'||saved==='denied')gtag('consent','update',{analytics_storage:saved});
 var s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(GA_ID);
 document.head.appendChild(s);
 gtag('js',new Date());
 gtag('config',GA_ID,{anonymize_ip:true});
 // Eventos útiles para entender el uso del CAD (sin contenido del dibujo).
 window.cad2dTrack=function(name,params){try{gtag('event',name,params||{})}catch(e){}};
 // Aviso breve solo para zonas horarias europeas y si aún no eligió.
 var tz='';try{tz=Intl.DateTimeFormat().resolvedOptions().timeZone||''}catch(e){}
 if(saved||!/^Europe\//.test(tz))return;
 function banner(){
  var es=/^es/i.test(navigator.language||'');
  var d=document.createElement('div');d.id='cad2dConsent';
  d.setAttribute('role','dialog');d.setAttribute('aria-label',es?'Cookies de analítica':'Analytics cookies');
  d.style.cssText='position:fixed;left:16px;bottom:16px;z-index:99999;max-width:360px;background:#11181d;color:#e6edf1;border:1px solid #d3b47a;border-radius:10px;padding:12px 14px;font:13px/1.4 Inter,Arial,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.45)';
  d.innerHTML=(es?'Usamos Google Analytics para saber cómo se usa Blackline CAD. Tus dibujos nunca se envían. ':'We use Google Analytics to learn how Blackline CAD is used. Your drawings are never sent. ')+
   '<div style="display:flex;gap:8px;margin-top:10px;justify-content:flex-end"><button data-c="denied" style="background:transparent;color:#c9d4da;border:1px solid #496071;border-radius:6px;padding:6px 10px;cursor:pointer">'+(es?'Rechazar':'Decline')+'</button><button data-c="granted" style="background:#d3b47a;color:#11181d;border:0;border-radius:6px;padding:6px 12px;font-weight:700;cursor:pointer">'+(es?'Aceptar':'Accept')+'</button></div>';
  d.addEventListener('click',function(ev){var v=ev.target&&ev.target.getAttribute('data-c');if(!v)return;try{localStorage.setItem(KEY,v)}catch(e){}gtag('consent','update',{analytics_storage:v});d.remove()});
  document.body.appendChild(d);
 }
 if(document.body)banner();else document.addEventListener('DOMContentLoaded',banner);
})();
