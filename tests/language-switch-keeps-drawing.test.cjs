'use strict';
// Cambiar EN/ES recarga la página: el dibujo debe guardarse antes y recuperarse después.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
test('el cambio de idioma guarda la copia local antes de recargar',()=>{
 const start=html.indexOf("cad2dLanguageSelect.addEventListener('change'");
 assert.ok(start>0);
 const handler=html.slice(start,html.indexOf('\n });',start));
 const save=handler.indexOf('await persistLocalBackup()'),reload=handler.indexOf('location.reload()');
 assert.ok(save>0,'persistLocalBackup se espera en el handler');
 assert.ok(reload>save,'la recarga ocurre después de guardar');
 assert.ok(!/setTimeout\(\(\)=>location\.reload\(\)/.test(handler),'sin recarga diferida que cancele el guardado');
 assert.match(handler,/sessionStorage\.setItem\('cad2d-lang-restore','1'\)/);
});
test('al iniciar tras el cambio de idioma se restaura el dibujo sin confirmación',()=>{
 const init=html.slice(html.indexOf('async function initializeLocalBackup'),html.indexOf('async function restoreLocalBackup'));
 assert.match(init,/sessionStorage\.getItem\('cad2d-lang-restore'\)/);
 assert.match(init,/sessionStorage\.removeItem\('cad2d-lang-restore'\)/);
 assert.match(init,/restoreLocalBackup\(true\)/);
 assert.match(html,/if\(silent!==true&&!window\.confirm\(/);
 assert.match(html,/\$\('restoreLocalBackup'\)\.onclick=restoreLocalBackup;/,'el botón manual sigue pidiendo confirmación');
});
