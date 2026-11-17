const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const begin=html.indexOf('function openCadContextMenu(x,y,worldPoint){');
const end=html.indexOf('menu.replaceChildren();',begin);
assert.ok(begin>=0&&end>begin,'the production context-menu builder is present');
const menu=html.slice(begin,end);
test('right-click offers command-specific suboptions',()=>{
 for(const label of [
  'Deshacer último vértice · U','Cerrar polilínea · C','Terminar muro · Enter',
  'Distancia de desfase…','Radio de empalme…','Distancia de chaflán…',
  'Recortar por barrido · TF','Tijera · TS','Estilo de cotas · D'
 ])assert.ok(menu.includes(label),label);
 assert.match(menu,/\.\.\.toolOptions\(\)/);
});
test('right-click remains state-sensitive and uses correct block alias',()=>{
 assert.match(menu,/const actions=active\?/);
 assert.match(menu,/const selectedDimension/);
 assert.ok(menu.includes("command('Crear bloque · BL','BLOCK')"));
 assert.ok(!menu.includes("command('Crear bloque · B','BLOCK')"));
});
test('suboptions do not silently rewrite drawing geometry',()=>{
 assert.match(menu,/if\(t==='offset'\)/);
 assert.match(menu,/if\(t==='fillet'\|\|t==='chamfer'\)/);
 assert.match(menu,/Number\.isFinite\(n\)/);
 assert.match(menu,/runCommand\(\)/);
});
