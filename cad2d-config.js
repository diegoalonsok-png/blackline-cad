/* CAD2D · configuración de despliegue (se carga antes que todo).
 * En GitHub Pages queda todo vacío: beta abierta y DWG desactivado (solo DXF).
 * En Cloudflare, completar con el dominio propio una vez publicados los servicios de billing/ y dwg-converter/.
 * Nunca poner claves secretas aquí: este archivo es público.
 */
(function(){
 'use strict';
 var host=location.hostname;
 // Dominio propio en Cloudflare (completar al comprarlo, p. ej. 'cad2d.org').
 var DOMINIO='';
 if(DOMINIO&&(host===DOMINIO||host==='www.'+DOMINIO)){
  // Conversor DWG → DXF (contenedor de Cloudflare con LibreDWG, ver dwg-converter/).
  window.CAD2D_DWG_ENDPOINT='https://api.'+DOMINIO+'/api/convert/dwg';
  // Cuentas y suscripciones (ver billing/). enforce:false = beta abierta aunque el servidor exista.
  window.CAD2D_AUTH_CONFIG={
   loginUrl:'https://api.'+DOMINIO+'/auth/login',
   statusUrl:'https://api.'+DOMINIO+'/api/status',
   checkoutUrl:'https://api.'+DOMINIO+'/api/checkout',
   portalUrl:'https://api.'+DOMINIO+'/api/portal',
   enforce:false
  };
 }
})();
