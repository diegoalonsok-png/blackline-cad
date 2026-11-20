/* Guía "How to go Pro": presentación animada dentro de CAD2D que explica la compra paso a paso.
   Avanza sola como un video (Play/Pause) o con flechas ← →. Inglés por defecto; español si se eligió ES.
   Se abre desde el diálogo de planes ("How it works") o con el comando HOWTOBUY / COMOCOMPRAR. */
(function(){
 'use strict';
 if(window.CAD2D_BUY_GUIDE)return;
 const es=()=>{try{return /^es/i.test(localStorage.getItem('cad2d-alias-language')||'')}catch(e){return false}};
 const T=(en,sp)=>es()?sp:en;
 const css=document.createElement('style');
 css.textContent=`#cadBuyGuide{position:fixed;inset:0;z-index:9400;background:rgba(5,9,13,.72);display:flex;align-items:center;justify-content:center;font:14px/1.45 system-ui,-apple-system,Segoe UI,Arial,sans-serif}
#cadBuyGuide .g{width:min(860px,95vw);background:#121a21;border:1px solid #4d6676;border-radius:16px;color:#e8eef2;box-shadow:0 26px 70px #000b;overflow:hidden}
#cadBuyGuide .top{display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid #26343f;font-size:12px;letter-spacing:.08em;color:#9fc3d6}
#cadBuyGuide .x{all:unset;cursor:pointer;font-size:22px;color:#b9c9d4;padding:0 6px}
#cadBuyGuide .stage{display:grid;grid-template-columns:1fr 1.15fr;gap:22px;padding:22px 24px;min-height:330px;align-items:center}
#cadBuyGuide .k{font:600 11px/1 ui-monospace,Menlo,monospace;letter-spacing:.12em;color:#d4a748;text-transform:uppercase}
#cadBuyGuide h2{font-size:26px;line-height:1.15;margin:8px 0 10px}
#cadBuyGuide p{margin:0 0 8px;color:#b8c7d0}
#cadBuyGuide .art{background:#0b1015;border:1px solid #2c3d4a;border-radius:12px;min-height:280px;display:flex;align-items:center;justify-content:center;padding:18px;position:relative;overflow:hidden}
#cadBuyGuide .stage>*{animation:bgIn .45s ease-out both}#cadBuyGuide .art{animation-delay:.1s}
@keyframes bgIn{from{opacity:0;transform:translateY(10px)}}
#cadBuyGuide .opt{border:1px solid #4d6676;border-radius:10px;padding:12px;text-align:center;background:#111921;flex:1}
#cadBuyGuide .opt.best{border-color:#d4a748;box-shadow:0 0 0 4px #d4a74826}
#cadBuyGuide .opt b{display:block;font-size:24px}#cadBuyGuide .opt small{color:#9fb0bb}
#cadBuyGuide .pill{display:inline-block;border:1px solid #d4a748;color:#d4a748;border-radius:999px;padding:2px 10px;font:600 11px ui-monospace,monospace}
#cadBuyGuide .fld{background:#0f151b;border:1px solid #44596a;border-radius:8px;padding:9px 12px;color:#c9d6de;margin:6px 0}
#cadBuyGuide .btnx{background:#d4a748;color:#16120a;border-radius:8px;padding:9px 12px;text-align:center;font-weight:700}
#cadBuyGuide .mail{background:#f3f6f8;color:#1b252c;border-radius:10px;padding:14px;width:100%}
#cadBuyGuide .mail a{color:#1a5fb4;word-break:break-all}
#cadBuyGuide .cursor{position:absolute;width:18px;height:18px;border-radius:50%;background:#ffffffcc;box-shadow:0 0 0 6px #ffffff33;animation:bgTap 1.6s ease-in-out .6s both}
@keyframes bgTap{0%{transform:translate(60px,60px);opacity:0}40%{opacity:1}70%{transform:translate(0,0)}80%{transform:translate(0,0) scale(.7)}100%{transform:translate(0,0) scale(1)}}
#cadBuyGuide .foot{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 18px;border-top:1px solid #26343f}
#cadBuyGuide .dots{display:flex;gap:6px}#cadBuyGuide .dots i{width:8px;height:8px;border-radius:50%;background:#3a4b57;display:block;cursor:pointer}#cadBuyGuide .dots i.on{background:#d4a748;width:22px;border-radius:5px}
#cadBuyGuide .bt{all:unset;cursor:pointer;border:1px solid #4d6676;border-radius:8px;padding:7px 12px;color:#e8eef2}
#cadBuyGuide .bt:hover{background:#1c2832}#cadBuyGuide .bt.go{background:#d4a748;color:#16120a;border-color:#d4a748;font-weight:700}
#cadBuyGuide .bar{height:3px;background:#26343f}#cadBuyGuide .bar span{display:block;height:100%;width:0;background:#d4a748}
@media (max-width:640px){#cadBuyGuide .stage{grid-template-columns:1fr}#cadBuyGuide .art{min-height:200px}}
@media (prefers-reduced-motion:reduce){#cadBuyGuide *{animation:none!important}}`;
 document.head.append(css);

 const steps=()=>[
  {k:T('Step 1 · Free trial','Paso 1 · Prueba'),h:T('90 days with everything included','90 días con todo incluido'),
   p:[T('Use Blackline CAD for free. No sign-up and no card needed.','Usá Blackline CAD gratis. Sin registrarte y sin tarjeta.'),T('After 3 months you can keep drawing for free with the basics, or go Pro.','A los 3 meses podés seguir gratis con lo básico, o pasar a Pro.')],
   art:`<svg viewBox="0 0 300 180" width="100%" height="200" aria-label="Plan"><g fill="none" stroke="#ff4d4d" stroke-width="4"><rect x="40" y="25" width="220" height="130"/><rect x="50" y="35" width="200" height="110"/></g><path d="M110 25 A45 45 0 0 0 155 70 M155 25 V70" fill="none" stroke="#e0ba83" stroke-width="2.5"/><g stroke="#8dcce0" stroke-width="2" fill="none"><rect x="190" y="95" width="50" height="40"/><circle cx="215" cy="115" r="11"/></g><text x="150" y="176" fill="#d4a748" font-size="13" text-anchor="middle" font-family="monospace">${T('DAY 1 → DAY 90','DÍA 1 → DÍA 90')}</text></svg>`},
  {k:T('Step 2 · Choose','Paso 2 · Elegí'),h:T('Monthly or yearly','Mensual o anual'),
   p:[T('Open Plans (type PLAN, or use the Account button) and click the option you want.','Abrí Planes (escribí PLAN o usá el botón Cuenta) y tocá la opción que quieras.'),T('Yearly saves 37 %: about €2.50 a month.','El anual ahorra 37 %: unos 2,50 € por mes.')],
   art:`<div style="display:flex;gap:10px;width:100%"><div class="opt"><small>${T('MONTHLY','MENSUAL')}</small><b>3,99 €</b><small>${T('per month','por mes')}</small></div><div class="opt best"><span class="pill">${T('SAVE 37 %','AHORRÁS 37 %')}</span><small style="display:block;margin-top:6px">${T('YEARLY','ANUAL')}</small><b>29,99 €</b><small>${T('per year','por año')}</small></div></div><span class="cursor" style="right:70px;top:120px"></span>`},
  {k:T('Step 3 · Sign in','Paso 3 · Ingresá'),h:T('Enter your email. No password','Tu email, sin contraseña'),
   p:[T('Only the first time: we email you a secure sign-in link.','Solo la primera vez: te mandamos un enlace seguro por correo.'),T('Your choice from step 2 is remembered.','Se recuerda lo que elegiste en el paso 2.')],
   art:`<div style="width:86%"><b style="font-size:18px">CAD2D</b><p>${T('We will email you a sign-in link.','Te enviamos un enlace de acceso.')}</p><div class="fld">you@studio.com</div><div class="btnx">${T('Send link','Enviar enlace')}</div></div><span class="cursor" style="left:48%;top:66%"></span>`},
  {k:T('Step 4 · Email','Paso 4 · Correo'),h:T('Click the link in your inbox','Tocá el enlace del correo'),
   p:[T('It arrives in seconds and works once, for 15 minutes.','Llega en segundos y sirve una vez, por 15 minutos.'),T('Back in CAD2D, the checkout opens by itself.','Al volver a CAD2D, el pago se abre solo.')],
   art:`<div class="mail"><small style="color:#5b6b76;font-family:monospace">${T('Subject: Your CAD2D sign-in link','Asunto: Tu acceso a CAD2D')}</small><p style="color:#1b252c;margin:10px 0">${T('Sign in to CAD2D with this link (it expires in 15 minutes):','Ingresá a CAD2D con este enlace (vence en 15 minutos):')}</p><a>https://api.blackline-cad.org/auth/verify?token=…</a></div><span class="cursor" style="left:34%;top:58%"></span>`},
  {k:T('Step 5 · Pay','Paso 5 · Pagá'),h:T('Secure payment by Stripe','Pago seguro con Stripe'),
   p:[T('Pay with card, PayPal or other methods available in your country. Taxes are calculated for you.','Pagá con tarjeta, PayPal u otros medios de tu país. El impuesto se calcula solo.'),T('Blackline CAD never sees your card details.','Blackline CAD nunca ve los datos de tu tarjeta.')],
   art:`<div style="background:#f5f7f9;color:#1b252c;border-radius:10px;padding:14px;width:100%"><small style="color:#5b6b76">Blackline CAD</small><div style="font-size:24px;font-weight:700;margin:4px 0">29,99 € <small style="font-size:13px;color:#5b6b76">${T('per year','por año')}</small></div><div style="display:flex;gap:8px;margin:8px 0"><div class="fld" style="flex:1;background:#fff;color:#1b252c;border-color:#5a8dd6;text-align:center">${T('Card','Tarjeta')}</div><div class="fld" style="flex:1;background:#fff;color:#1b252c;text-align:center">PayPal</div></div><div class="btnx" style="background:#2f5fa7;color:#fff">${T('Subscribe','Suscribirse')}</div><small style="display:block;margin-top:6px;color:#8a969e">${T('Illustration · the real page is shown by Stripe','Ilustración · la página real la muestra Stripe')}</small></div>`},
  {k:T('Step 6 · Done','Paso 6 · Listo'),h:T('You are Pro','Ya sos Pro'),
   p:[T('All dynamic blocks, A0–A3 plotting and unlimited projects, right away.','Todos los bloques dinámicos, ploteo A0–A3 y proyectos ilimitados, al instante.'),T('Renews automatically. Cancel anytime: Plans → Manage subscription.','Se renueva solo. Cancelás cuando quieras: Planes → Administrar suscripción.')],
   art:`<div style="text-align:center"><div style="font-size:54px">✓</div><b style="font-size:20px;color:#7fd1a0">${T('Thank you! Your Pro plan is now active.','¡Gracias! Tu plan Pro ya está activo.')}</b><div style="margin-top:12px"><span class="pill" style="font-size:14px">PRO</span></div></div>`}
 ];

 let i=0,timer=null,playing=false,start=0;const DUR=6500;
 function close(){clearInterval(timer);timer=null;document.getElementById('cadBuyGuide')?.remove();document.removeEventListener('keydown',onKey,true)}
 function onKey(e){if(!document.getElementById('cadBuyGuide'))return;if(e.key==='Escape'){close();e.stopPropagation()}else if(e.key==='ArrowRight'){playing=false;paintPlay();show(i+1);e.preventDefault();e.stopPropagation()}else if(e.key==='ArrowLeft'){playing=false;paintPlay();show(i-1);e.preventDefault();e.stopPropagation()}else if(e.key===' '){toggle();e.preventDefault();e.stopPropagation()}}
 function toggle(){playing=!playing;start=Date.now();paintPlay()}
 function paintPlay(){const b=document.querySelector('#cadBuyGuide [data-a=play]');if(b)b.textContent=playing?T('❚❚ Pause','❚❚ Pausa'):T('▶ Play','▶ Reproducir')}
 function show(n){
  const S=steps(),root=document.getElementById('cadBuyGuide');if(!root)return;
  i=Math.max(0,Math.min(S.length-1,n));start=Date.now();const s=S[i];
  root.querySelector('.stage').innerHTML=`<div><div class="k">${s.k}</div><h2>${s.h}</h2>${s.p.map(x=>'<p>'+x+'</p>').join('')}</div><div class="art">${s.art}</div>`;
  root.querySelector('.dots').innerHTML=S.map((_,k)=>`<i class="${k===i?'on':''}" data-k="${k}" title="${k+1}"></i>`).join('');
  root.querySelector('[data-a=prev]').style.visibility=i?'visible':'hidden';
  const last=i===S.length-1,nx=root.querySelector('[data-a=next]');
  nx.textContent=last?T('Go Pro now','Pasar a Pro ahora'):T('Next →','Siguiente →');nx.classList.toggle('go',last);
  const bar=root.querySelector('.bar span');if(bar)bar.style.width=(i/S.length*100)+'%';
  if(last&&playing){playing=false;paintPlay()}
 }
 function open(){
  close();
  const d=document.createElement('div');d.id='cadBuyGuide';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');d.setAttribute('aria-label',T('How to go Pro','Cómo pasar a Pro'));
  d.innerHTML=`<div class="g"><div class="top"><b>BLACKLINE CAD · ${T('HOW TO GO PRO','CÓMO PASAR A PRO')}</b><button class="x" data-a="close" aria-label="Close">×</button></div><div class="bar"><span></span></div><div class="stage" aria-live="polite"></div><div class="foot"><div style="display:flex;gap:8px"><button class="bt" data-a="play"></button><button class="bt" data-a="prev">${T('← Back','← Atrás')}</button></div><div class="dots"></div><button class="bt" data-a="next"></button></div></div>`;
  document.body.append(d);playing=!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;paintPlay();show(0);
  d.addEventListener('click',e=>{
   if(e.target===d)return close();
   const a=e.target.closest('[data-a]')?.dataset.a,k=e.target.closest('[data-k]')?.dataset.k;
   if(k!==undefined){playing=false;paintPlay();return show(Number(k))}
   if(a==='close')return close();if(a==='play')return toggle();
   if(a==='prev'){playing=false;paintPlay();return show(i-1)}
   if(a==='next'){if(i===steps().length-1){close();return window.CAD2D_PLAN?.showPlans?.()}playing=false;paintPlay();return show(i+1)}
  });
  document.addEventListener('keydown',onKey,true);
  timer=setInterval(()=>{const bar=d.querySelector('.bar span');if(!playing){return}const t=(Date.now()-start)/DUR;if(bar)bar.style.width=Math.min(100,((i+Math.min(1,t))/steps().length)*100)+'%';if(t>=1)show(i+1)},120);
 }
 window.CAD2D_BUY_GUIDE=Object.freeze({open,close});
 const EXT=window.CAD2D_EXTENSIONS;
 if(EXT?.commands){for(const k of ['HOWTOBUY','HOWTOPRO','UPGRADEHELP','COMOCOMPRAR','COMOPAGAR'])EXT.commands[k]=open}
})();
