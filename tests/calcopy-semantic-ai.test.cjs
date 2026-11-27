'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('semantic architectural JSON accepts only supported objects and bounded coordinates',async()=>{
 const {parseArchitecturalReading}=await import('../assets/cad-calcopy-semantic.mjs');
 const data={objects:[{label:'toilet',box:[100,100,140,170]},{label:'invented',box:[0,0,10,10]},{label:'sofa',box:[-1,0,100,100]},{label:'car',box:[100,100,80,200]}],wallHints:[{box:[10,20,500,30]},{box:[10,10,100,100]}],rooms:[{type:'bathroom',box:[0,0,400,400]},{type:'invented',box:[0,0,200,200]}]};
 const o=parseArchitecturalReading(JSON.stringify(data),1000,800);
 assert.deepEqual(o.objects,[{label:'toilet',box:[100,80,140,136]}]);assert.equal(o.wallHints.length,1);assert.equal(o.rooms.length,1);
 assert.throws(()=>parseArchitecturalReading('not JSON',1000,800));assert.throws(()=>parseArchitecturalReading('{"objects":[]}',1000,800));
});
test('vision runtime CSP allows model weights while retaining security directives',()=>{
 const h=fs.readFileSync(path.join(__dirname,'../_headers'),'utf8');assert.match(h,/script-src[^;]*https:\/\/cdn\.jsdelivr\.net\/npm\//);assert.match(h,/connect-src[^;]*https:\/\/huggingface\.co/);assert.match(h,/object-src 'none'/);assert.doesNotMatch(h,/'unsafe-eval'/);
});
