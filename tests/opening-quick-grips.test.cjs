'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const source=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('function cadOpeningQuickApply(grip)'));
test('opening actions use real parametric block references',()=>{
 assert.ok(source);
 for(const kind of ['swing-door','double-door','framed-window'])assert.ok(source.includes("'"+kind+"'"));
 for(const action of ['mirror','swing','rotate'])assert.ok(source.includes("action:'"+action+"'"));
 assert.match(source,/function cadOpeningQuickHit\(raw\)/);
 assert.match(source,/function cadOpeningQuickApply\(grip\)/);
 assert.match(source,/function drawBlockGrips\(ref\)/);
});
test('opening grip clicks retain edit history and geometry hierarchy',()=>{
 assert.match(source,/function cadOpeningQuickApply\(grip\)/);
 assert.match(source,/saveHistory\(\);\s*if\(grip\.action==='mirror'\)/);
 assert.match(source,/ref\.flipOpeningSide=!Boolean\(ref\.flipOpeningSide\)/);
 assert.match(source,/\+90\)%360/);
 assert.match(source,/cadOpeningMirrorGeometry\(blockInstanceGeometry\(definition,ref\),ref\)/);
});
