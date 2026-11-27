/* Regression (auditoría 2026-11-27): la depuración visual de galerías (cad2d-quality-curation)
 * oculta inodoros, camas, heladeras, etc. CALCOPY debe seguir ofreciéndolos, porque sus alias
 * escritos ("inodoro", "cama"…) y la lectura semántica apuntan a esas definiciones nativas. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../assets/cad-pdf-import.js'),'utf8');
const m=src.match(/const candidates=catalog\.filter\((i=>[^;]*)\);/);
assert.ok(m,'CALCOPY candidate filter must exist');
const filter=new Function('return ('+m[1]+')')();
test('CALCOPY keeps blocks hidden only by gallery curation',()=>{
 const curated={id:'san-wc',w:.4,d:.7,hideFromGallery:true,galleryCuration:'esquemático — excluido de las galerías, definición preservada'};
 assert.ok(filter(curated));
});
test('CALCOPY still excludes archived, Pro, paid and DXF-plan blocks',()=>{
 assert.ok(!filter({id:'san-x',w:1,d:1,hideFromGallery:true,reviewArchive:true}));
 assert.ok(!filter({id:'san-y',w:1,d:1,pro:true}));
 assert.ok(!filter({id:'san-z',w:1,d:1,paidOnly:true}));
 assert.ok(!filter({id:'dor-p',w:1,d:1,dxfPlan:'x.dxf'}));
 assert.ok(!filter({id:'cv-auto-lat',w:1,d:1}));
});
test('every CALCOPY typed alias target is a curated or visible native block',()=>{
 const al=src.match(/const aliases=(\{[^}]*\})/);assert.ok(al);
 const ids=new Set(Object.values(new Function('return '+al[1])()));
 const gen=fs.readFileSync(path.join(__dirname,'../assets/cad2d-arq-generators.js'),'utf8');
 for(const id of ids)assert.ok(gen.includes("'"+id+"'"),'alias target defined: '+id);
});
