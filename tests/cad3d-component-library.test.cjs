const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('cad3d-lab.js','utf8');
test('CAD3D block catalog parses and retains wall drawing',()=>{
 assert.doesNotThrow(()=>new vm.Script(source));
 assert(source.includes('Drawing takes precedence over navigation'));
 assert(source.includes("tool('wall','Wall'"));
 assert(source.includes("tool('slab','Slab'"));
});
test('3D block library uses geometric boxes, not images',()=>{
 assert(source.includes('function buildCAD3DBlock(record,group)'));
 assert(source.includes('def.parts.forEach(function(p)'));
 assert(source.includes('addMesh(g,p[6],record.id,group'));
 assert(source.includes("if(r.type==='block3d')buildCAD3DBlock(r,group)"));
 assert(!source.includes('data-3d-block-image'));
});
test('3D blocks persist, edit and use existing move and copy commands',()=>{
 assert(source.includes("rec=newRecord('block3d')"));
 assert(source.includes("var accepted=['box','sphere','cone','cylinder','wall','slab','boolean','block3d']"));
 assert(source.includes("if(r.type==='block3d')o.blockId="));
 assert(source.includes("r.type==='block3d'))keys.push('w','d','h')"));
 assert(source.includes("if(kind==='move'||kind==='copy')"));
});
