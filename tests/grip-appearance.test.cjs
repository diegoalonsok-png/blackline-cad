const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const grip=require('../cad-grip-settings.js');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
test('default grip appearance has safe contrasting colors',()=>{
 assert.deepEqual(grip.normalize(),{size:10,blockColor:'#8fe3fc',wallColor:'#ffcb69'});
});
test('size is clamped to pixel range',()=>{
 assert.equal(grip.normalize({size:999}).size,22);
 assert.equal(grip.normalize({size:-100}).size,6);
 assert.equal(grip.normalize({size:12.7}).size,13);
 assert.equal(grip.normalize({size:'invalid'}).size,10);
});
test('invalid CSS color cannot be stored in grip settings',()=>{
 const settings=grip.normalize({blockColor:'transparent; bad',wallColor:'red'});
 assert.equal(settings.blockColor,grip.defaults.blockColor);
 assert.equal(settings.wallColor,grip.defaults.wallColor);
});
test('grips remain pickable at any configured display size',()=>{
 assert.ok(grip.hitRadius({size:6})>=10);
 assert.ok(grip.hitRadius({size:22})>=15);
});
test('UI contains size, separate block/wall colors, reset and persistence',()=>{
 for(const id of ['cadGripSize','cadGripSizeValue','cadBlockGripColor','cadWallGripColor','cadResetGrips'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/localStorage\.setItem\('cad2d-grip-settings'/);
 assert.match(html,/localStorage\.getItem\('cad2d-grip-settings'/);
});
test('both the drawn square and hit radius use one configuration',()=>{
 assert.match(html,/let best=null,limit=gripHitRadius\(\)/);
 assert.match(html,/ctx\.fillStyle=gripSettings\.blockColor/);
 assert.match(html,/ctx\.fillStyle=gripSettings\.wallColor/);
 assert.match(html,/ctx\.fillRect\(p\.x-half,p\.y-half,gripSettings\.size,gripSettings\.size\)/);
});
test('preferences module loads before main startup code',()=>{
 assert.ok(html.indexOf('src="cad-grip-settings.js')<html.indexOf('<script>\n/* Diagnostic:'));
});
test('preferences do not mutate CAD geometry or saved project payload',()=>{
 const begin=html.indexOf('function initGripSettings(){'),end=html.indexOf('function findWallMiddleGrip(',begin);
 const source=html.slice(begin,end);
 assert.doesNotMatch(source,/state\.entities\s*=|state\.entities\.push|saveHistory\(/);
 assert.doesNotMatch(source,/state\.layers\s*=/);
});
