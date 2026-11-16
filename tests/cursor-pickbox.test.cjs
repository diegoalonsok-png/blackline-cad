const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const cursor=require('../cad-cursor-mode.js');
const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
test('adjustable pickbox is clamped to visible range',()=>{
 assert.equal(cursor.normalizeSize(undefined),9);
 assert.equal(cursor.normalizeSize(40),30);
 assert.equal(cursor.normalizeSize(1),5);
 assert.equal(cursor.normalizeSize(14.6),15);
});
test('drawing tools retain crosshair, editing tools show square selector',()=>{
 for(const tool of ['line','polyline','rect','circle','arc','dimension','insertBlock'])
  assert.equal(cursor.mode(tool,null,null),'drawing',tool);
 for(const tool of ['select','trim','erase','extend','breakLine','chamfer','fillet'])
  assert.equal(cursor.mode(tool,null,null),'selector',tool);
});
test('OFFSET changes cursor phase with selection',()=>{
 assert.equal(cursor.mode('offset',null,null),'selector');
 assert.equal(cursor.mode('offset',{id:42},null),'drawing');
});
test('grip and pan phases override editing cursor',()=>{
 assert.equal(cursor.mode('select',null,'blockGrip'),'grip');
 assert.equal(cursor.mode('select',null,'wallMiddleGrip'),'grip');
 assert.equal(cursor.mode('line',null,'pan'),'pan');
});
test('larger yellow selector increases picking radius',()=>{
 assert.ok(cursor.hitRadius(30)>cursor.hitRadius(5));
 assert.equal(cursor.hitRadius(9),9);
});
test('UI exposes pickbox size and persistence via display colors',()=>{
 assert.match(html,/id="cadPickboxSize"[^>]*min="5" max="30"/);
 assert.match(html,/id="cadPickboxSizeValue"/);
 assert.match(html,/cadPickboxSize:'pickboxSize'/);
 assert.match(html,/localStorage\.setItem\('cad2d-display-colors'/);
});
test('selector uses true pointer location while drawing uses snapped point',()=>{
 assert.match(html,/const q=selectingCursor\?pointer:screen\(state\.mouse\)/);
 assert.match(html,/if\(!selecting\)\{/);
});
test('pick uses enlarged hit radius only in selector mode',()=>{
 assert.match(html,/window\.BlacklineCursorMode\.hitRadius\(displayColors\.pickboxSize\|\|9\)/);
 assert.match(html,/const tol=\(window\.BlacklineCursorMode\?\.selectorMode/);
});
test('cursor script loads before CAD initialization',()=>{
 assert.ok(html.indexOf('src="cad-cursor-mode.js')<html.indexOf('<script>\n/* Diagnostic:'));
});
