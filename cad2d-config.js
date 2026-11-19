/* CAD2D · configuración de despliegue (se carga antes que todo).
 * Nunca poner claves secretas aquí: este archivo es público.
 *
 * - DOMINIO: dominio propio en Cloudflare Pages. En GitHub Pages este archivo no activa nada.
 * - DWG_ACTIVO: true solo cuando el conversor (dwg-converter/) esté publicado. Puede ser el
 *   contenedor de Cloudflare (plan Workers Paid) u otro servidor con el mismo Dockerfile.
 * - DWG_ENDPOINT: dirección del conversor si NO está en api.DOMINIO (otro proveedor).
 * - CUENTAS_ACTIVAS: true cuando billing/ esté publicado.
 * - COBRO_ACTIVO: false = beta abierta para todos; true = 90 días de prueba por persona y después Pro.
 */
(function(){
 'use strict';
 var DOMINIO='blackline-cad.org';
 var DWG_ACTIVO=false;
 var DWG_ENDPOINT='';
 var CUENTAS_ACTIVAS=true;
 // Cada persona tiene 90 días con todo habilitado desde su primer uso (con o sin cuenta).
 // Después, las funciones Pro piden suscripción; el dibujo básico nunca se bloquea.
 var COBRO_ACTIVO=true;

 var host=location.hostname;
 if(!(host===DOMINIO||host==='www.'+DOMINIO))return;
 if(DWG_ACTIVO)window.CAD2D_DWG_ENDPOINT=DWG_ENDPOINT||('https://api.'+DOMINIO+'/api/convert/dwg');
 if(CUENTAS_ACTIVAS)window.CAD2D_AUTH_CONFIG={
  loginUrl:'https://api.'+DOMINIO+'/auth/login',
  statusUrl:'https://api.'+DOMINIO+'/api/status',
  checkoutUrl:'https://api.'+DOMINIO+'/api/checkout',
  portalUrl:'https://api.'+DOMINIO+'/api/portal',
  enforce:COBRO_ACTIVO
 };
})();
