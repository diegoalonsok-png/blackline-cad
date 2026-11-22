const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('cad3d-lab.js','utf8');

test('CAD3D JavaScript parses cleanly',()=>assert.doesNotThrow(()=>new vm.Script(source,{filename:'cad3d-lab.js'})));
test('Door, window and opening tools remain armed after a successful insertion',()=>{
 const section=source.slice(source.indexOf('function placeOpening(e){'),source.indexOf('function placeAt(e){'));
 assert(section.includes('rec.openings.push(op);selected=[rec.id];selectedOpeningId=op.id;redraw();renderProps();'));
 assert(!section.includes('setPlacement(null)'), 'An opening must not reset the active placement command');
 assert(section.includes('if(overlaps)'), 'Prevent overlapping architectural openings');
});
test('Door and window libraries include multiple sizes and styles',()=>{
 const section=source.slice(source.indexOf('const ARCH_STYLES='),source.indexOf('function archStyle('));
 const doors=section.slice(section.indexOf(' door:['),section.indexOf(' window:['));
 const windows=section.slice(section.indexOf(' window:['),section.indexOf(' slab:['));
 assert((doors.match(/id:/g)||[]).length>=12);
 assert((windows.match(/id:/g)||[]).length>=12);
});
test('CAD3D repeated insertion can be ended with Enter or Escape',()=>{
 assert(source.includes("['wall','door','window','opening'].includes(placing)"));
 assert(source.includes("if(ev.key==='Escape')"));
});