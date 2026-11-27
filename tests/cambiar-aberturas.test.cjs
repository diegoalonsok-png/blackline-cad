const test=require('node:test'),assert=require('node:assert'),fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'../cad-aberturas.js'),'utf8'),html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
test('cambiar puertas y ventanas: mismos lugar, ángulo y vano; comandos, barra y menú',()=>{
 assert.match(html,/<script src="cad-aberturas\.js\?v=[^"]+"><\/script>/);
 for(const t of ['door-l','door-r','double','window','mullion','vano'])assert.ok(src.includes("id:'"+t+"'"),t);
 assert.match(src,/ref\.blockName=name;ref\.params=params;/);assert.doesNotMatch(src,/ref\.p\s*=|ref\.rotation\s*=/,'no mueve ni gira');
 assert.match(src,/CORE\.saveHistory\(\)/);assert.match(src,/EXT\.context\.push/);
 for(const c of ['CAMBIARABERTURA','SWAPOPENING'])assert.ok(src.includes("'"+c+"'"));
});
