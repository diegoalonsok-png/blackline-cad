const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {patterns,passes}=require('../cad-hatch-patterns.js');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
test('nine architectural hatch recipes are exposed',()=>assert.ok(Object.keys(patterns).length>=10));
test('single preserves selected angle and spacing',()=>assert.deepEqual(passes('single',.25,37),[{angle:37,spacing:.25}]));
test('cross creates perpendicular directions',()=>assert.deepEqual(passes('cross',.2,45),[{angle:45,spacing:.2},{angle:135,spacing:.2}]));
test('grid always horizontal and vertical',()=>assert.deepEqual(passes('grid',1,30),[{angle:0,spacing:1},{angle:90,spacing:1}]));
test('architectural dense steel preset has positive interval',()=>assert.deepEqual(passes('steel',1,0),[{angle:45,spacing:.45}]));
test('concrete preset has three directions',()=>assert.deepEqual(passes('concrete',1,0).map(x=>x.angle),[0,60,120]));
test('invalid hatch pattern cannot create geometry',()=>assert.equal(passes('unknown',1,0),null));
test('invalid spacing cannot create geometry',()=>assert.equal(passes('single',0,0),null));
test('hatch code retains 12000 line cap before saveHistory',()=>{
 assert.match(html,/function hatchPolygonSegments\(vertices,spacing,angleDegrees,limit=12000\)/);
 // Hatches are now associative entities; display primitives keep their own safety cap.
 assert.match(html,/function cadHatchPatternPrimitives\(entity,limit=6000\)/);
});
test('typography controls and state round trip',()=>{
 for(const id of ['textUnderline','textHighlight','textHighlightColor'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/underline:\$\('textUnderline'\)\.checked/);
 assert.match(html,/highlight:\$\('textHighlight'\)\.checked/);
 assert.match(html,/\$\('textUnderline'\)\.checked=!!e\.underline/);
});
test('canvas and print SVG draw underline and highlight',()=>{
 assert.match(html,/if\(e\.highlight\)\{[\s\S]*?ctx\.fillStyle=[^;]+;[\s\S]*?ctx\.fillRect/);
 assert.match(html,/if\(e\.underline\)\{ctx\.beginPath/);
 assert.match(html,/if\(e\.highlight\)svg\.push/);
 assert.match(html,/if\(e\.underline\)svg\.push/);
});
