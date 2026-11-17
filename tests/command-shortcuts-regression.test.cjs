'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {test}=require('node:test');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function script(){const m=html.match(/<script>([\s\S]*?)<\/script>/);assert.ok(m,'script principal');return m[1]}
const main=script();
const aliasSection=main.match(/const CAD2D_TYPED_ALIASES=\{([\s\S]*?)\n\};/);
assert.ok(aliasSection,'registro de alias');
function typed(alias){const entries=[...aliasSection[1].matchAll(/([A-Z][A-Z0-9_]*):'([A-Z0-9_]+)'/g)];const item=entries.find(m=>m[1]===alias);return item?.[2]||alias}
test('H resuelve HATCH y no PLINE en el buscador y la barra',()=>{
 assert.equal(typed('H'),'HATCH');
 assert.match(main,/H:'hatch',HATCH:'hatch'/);
 assert.match(main,/let cmd=cad2dNormalizeCommand\(value\);if\(aliases\[cmd\]\)/);
});
test('H en el lienzo activa HATCH inmediatamente, sin insertar PLINE',()=>{
 assert.match(main,/ev\.key\.toUpperCase\(\)==='H'[^\n]*runCommand\(\)/);
 assert.match(main,/if\(t==='hatch'\&\&state\.selected\.length\)return hatchSelected\(\)/);
 assert.match(main,/if\(t==='hatch'\)return cadHatchAtPoint\(p\)/);
});
test('PL sigue siendo polilínea y L sigue siendo línea',()=>{
 assert.equal(typed('POL'),'PLINE');
 assert.equal(typed('LINEA'),'LINE');
 assert.match(main,/PL:'polyline'/);
 assert.match(main,/L:'line'/);
});
test('no hay alias repetidos con destinos contradictorios en registro',()=>{
 const seen=new Map();
 for(const match of aliasSection[1].matchAll(/([A-Z][A-Z0-9_]*):'([A-Z0-9_]+)'/g)){
  if(seen.has(match[1]))assert.equal(seen.get(match[1]),match[2],match[1]);
  seen.set(match[1],match[2]);
 }
});
test('teclas de función están cableadas sin pasar por órdenes geométricas',()=>{
 for(const key of ['F1','F2','F3','F7','F8','F9','F10','F11'])assert.ok(main.includes("ev.key==='"+key+"'"),key);
});

test('idioma de alias: colisiones intencionales B D LI AR',()=>{
 assert.match(main,/en:\{B:'BLOCK',E:'ERASE',D:'DIMSTYLE',LI:'LIST',AR:'ARRAY'/);
 assert.match(main,/es:\{B:'ERASE',BOR:'ERASE',D:'MOVE',DESPL:'MOVE',LI:'LINE',AR:'ARC'/);
 assert.match(main,/const profile=forceEnglish\?'en':cad2dAliasLanguage/);
 assert.match(main,/typed\.startsWith\('_'\)/);
});
test('selector de idioma visible y persistente',()=>{
 assert.match(html,/id="cadAliasLanguage"/);
 assert.match(main,/localStorage\.setItem\('cad2d-alias-language'/);
 assert.match(main,/cad2dAliasLanguage=cad2dLanguageSelect\.value==='en'\?'en':'es'/);
});
