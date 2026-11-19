const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
test('WALL starts left aligned, including on reactivation',()=>{
 assert.match(html,/<option value="left" selected>Izquierda<\/option>/);
 assert.match(html,/if\(t==='wall2d'\)\$\('cadWallJustification'\)\.value='left'/);
 assert.match(html,/function cadWallJustify\(\).*:'left'/);
 assert.match(html,/justify==='left'\?\[0,width\]/);
});
test('WALL palette only appears during wall drawing and supports live controls',()=>{
 assert.match(html,/id="cadWallQuick"[^>]+hidden/);
 assert.match(html,/quick.hidden=state.tool!=='wall2d'/);
 for(const side of ['left','center','right'])assert(html.includes('data-wall-side="'+side+'"'));
 assert.match(html,/function cadWallQuickSetThickness/);
 assert.match(html,/metres>=\.04&&metres<=3/);
 assert.match(html,/\.replace\(',','\.'\)/);
 assert.match(html,/\$\('cadWallThickness'\)\.value='custom'/);
 assert.match(html,/function previewEntity/);
 assert.match(html,/cadWallFaces\(s\.at\(-1\),m,cadWallThickness\(\),cadWallJustify\(\)\)/);
});
