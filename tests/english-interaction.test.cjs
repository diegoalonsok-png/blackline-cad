const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const script=fs.readFileSync('assets/cad-ui-language.js','utf8');
test('CAD commands and interface default to English until user explicitly changes them',()=>{
 assert.match(html,/<html lang="en">/);
 assert.match(html,/<option value="en" selected>EN<\/option>/);
 assert.match(html,/let cad2dAliasLanguage='en'/);
 assert.match(html,/localStorage\.getItem\('cad2d-alias-language'\)==='es'\?'es':'en'/);
 assert.match(html,/BlacklineUILanguage\?\.setLanguage\(cad2dAliasLanguage\)/);
 assert.match(html,/assets\/cad-ui-language\.js/);
});
test('Desktop-CAD-style right click uses Enter, editing context, and one-time OSNAP',()=>{
 assert.match(html,/if\(ev\.shiftKey\)\{openCadSnapOverrideMenu/);
 assert.match(html,/if\(ev\.ctrlKey\)\{openCadContextMenu/);
 assert.match(html,/if\(target\|\|state\.selected\.length\)\{openCadContextMenu/);
 assert.match(html,/cadRightClickEnter\(\);/);
 assert.match(html,/cadOneShotOsnap=kind/);
 assert.match(html,/cadOsnapEnabled\(kind\)\{return cadOneShotOsnap\?kind===cadOneShotOsnap:cadActiveOsnaps\.has\(kind\)/);
 assert.match(html,/if\(state\.osnapOn\|\|cadOneShotOsnap\)/);
 assert.match(html,/if\(cadOneShotOsnap\)\{cadOneShotOsnap=null/);
 for(const kind of ['END','MID','CENTER','INT','PERP','NEAREST','TAN','QUAD'])assert(html.includes("['"+kind+"',"),'Missing one-time snap '+kind);
});
test('Escape in command field cancels provisional polylines instead of creating geometry',()=>{
 assert.match(html,/if\(ev\.key==='Escape'\).*?cancelCadCommand\(\)/s);
 assert.doesNotMatch(html,/if\(state\.tool==='polyline'&&state\.stage\.length>=2\)finishStage\(\)/);
});
test('UI bilingual glossary changes known interface terms without external translation',()=>{
 const ctx={window:{},document:{readyState:'loading',addEventListener(){}}};
 vm.runInNewContext(script,ctx);
 const api=ctx.window.BlacklineUILanguage;
 assert.equal(api.translate('Izquierda','en'),'Left');
 assert.equal(api.translate('Derecha · R','en'),'Right · R');
 assert.equal(api.translate('Right · R','es'),'Derecha · R');
 assert.equal(api.translate('Manual de comandos','en'),'Manual de comandos');
 assert.equal(api.translate('Architectural drawing user data','en'),'Architectural drawing user data');
});

test('English CAD typing and classic repeat shortcut do not have a special HATCH trap',()=>{
 assert.doesNotMatch(html,/ev\.key\.toUpperCase\(\)==='H'&&/);
 assert.match(html,/ev\.key\.toLowerCase\(\)==='j'/);
 assert.match(html,/if\(cad2dLastCommand\)\{\$\('command'\)\.value=cad2dLastCommand;runCommand\(\)\}/);
});
