/* Blackline CAD GA4 opt-in adapter.
 * Dormant until a distinct Blackline CAD measurement ID is supplied below.
 * No Google request or consent UI appears while the ID is empty.
 * Never transmit CAD contents, drawings, emails, payment events or file names.
 */
(function(){
  'use strict';
  const MEASUREMENT_ID = ''; // Pending: GA4 web data stream for blackline-cad.org (G-XXXXXXXXXX)
  if(!/^G-[A-Z0-9]{6,}$/.test(MEASUREMENT_ID)) return;
  if(location.hostname!=='blackline-cad.org' && location.hostname!=='www.blackline-cad.org') return;

  const key='blackline-ga4-consent-v1';
  function activate(){
    if(window.__blacklineGA4Loaded) return;
    window.__blacklineGA4Loaded=true;
    window.dataLayer=window.dataLayer||[];
    window.gtag=window.gtag||function(){window.dataLayer.push(arguments);};
    window.gtag('js',new Date());
    window.gtag('config',MEASUREMENT_ID,{
      'send_page_view':true,
      'allow_google_signals':false,
      'allow_ad_personalization_signals':false
    });
    const tag=document.createElement('script');
    tag.async=true;
    tag.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(MEASUREMENT_ID);
    document.head.appendChild(tag);
  }
  function choice(value,banner){
    try{localStorage.setItem(key,value);}catch(_){}
    if(banner)banner.remove();
    if(value==='accepted') activate();
  }
  function setup(){
    let previous='';
    try{previous=localStorage.getItem(key)||'';}catch(_){}
    if(previous==='accepted'){activate();return;}
    if(previous==='rejected')return;

    const banner=document.createElement('section');
    banner.setAttribute('role','dialog');
    banner.setAttribute('aria-label','Preferencias de estadísticas');
    banner.style.cssText='position:fixed;z-index:2147483000;bottom:14px;left:14px;right:14px;max-width:600px;margin:auto;padding:16px;border:1px solid #52616d;border-radius:9px;background:#19232b;color:#e5edf2;font:14px/1.5 system-ui,sans-serif;box-shadow:0 8px 24px #0009';
    const text=document.createElement('p');
    text.style.cssText='margin:0 0 12px';
    text.textContent='¿Aceptás estadísticas anónimas de uso mediante Google Analytics? Es opcional y no se envían dibujos ni archivos CAD.';
    const buttons=document.createElement('div');
    buttons.style.cssText='display:flex;gap:10px;flex-wrap:wrap';
    for(const [label,value] of [['Rechazar','rejected'],['Aceptar estadísticas','accepted']]){
      const b=document.createElement('button');
      b.type='button';
      b.textContent=label;
      b.style.cssText='padding:7px 13px;border:1px solid #839bab;border-radius:5px;background:#273a46;color:#fff;cursor:pointer';
      b.addEventListener('click',()=>choice(value,banner));
      buttons.appendChild(b);
    }
    banner.append(text,buttons);
    document.body.appendChild(banner);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});
  else setup();
})();
