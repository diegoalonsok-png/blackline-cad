const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../cad3d-lab.js'),'utf8');
const section=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end));
const ctx={TextEncoder,TextDecoder,ArrayBuffer,DataView,Uint8Array,Float32Array,cad3dImportTriangles:(v,f)=>{ctx.result={v,f}}};
vm.createContext(ctx);
vm.runInContext(section('function cad3dEncodeMesh(','function exportMeshExchange(')+section('function cad3dParsePLY(','function cad3dParseGLTFDocument('),ctx);
const tri=[[[0,0,0],[2,0,0],[0,1,3]]];
test('ASCII PLY export and import preserve coordinates',()=>{
 const ply=ctx.cad3dEncodeMesh(tri,'ply');
 ctx.cad3dParsePLY(new TextEncoder().encode(ply).buffer,'model.ply');
 assert.equal(JSON.stringify(ctx.result.v),JSON.stringify(tri[0]));
 assert.equal(JSON.stringify(ctx.result.f),'[[0,1,2]]');
});
test('binary PLY little and big endian',()=>{
 for(const little of [true,false]){
 const hdr=new TextEncoder().encode('ply\nformat binary_'+(little?'little':'big')+'_endian 1.0\nelement vertex 3\nproperty float x\nproperty float y\nproperty float z\nelement face 1\nproperty list uchar int vertex_indices\nend_header\n');
 const buf=new ArrayBuffer(hdr.length+49),u=new Uint8Array(buf),d=new DataView(buf);u.set(hdr);
 let o=hdr.length;for(const v of tri[0].flat()){d.setFloat32(o,v,little);o+=4;}d.setUint8(o++,3);for(let i=0;i<3;i++){d.setInt32(o,i,little);o+=4;}
 ctx.cad3dParsePLY(buf,'model.ply');assert.equal(JSON.stringify(ctx.result.v),JSON.stringify(tri[0]));
 assert.equal(JSON.stringify(ctx.result.f),'[[0,1,2]]');
 assert.throws(()=>ctx.cad3dParsePLY(buf.slice(0,-1),'bad.ply'));
 }
});
test('GLB 2 header, accessors and Y-up coordinates',()=>{
 const b=ctx.cad3dEncodeMesh(tri,'glb'),d=new DataView(b);
 assert.equal(d.getUint32(0,true),0x46546c67);assert.equal(d.getUint32(4,true),2);assert.equal(d.getUint32(8,true),b.byteLength);
 const n=d.getUint32(12,true),j=JSON.parse(new TextDecoder().decode(new Uint8Array(b,20,n)));
 assert.equal(j.accessors[0].count,3);assert.equal(d.getUint32(24+n,true),0x004e4942);
 assert.equal(d.getFloat32(28+n+7*4,true),3);assert.equal(d.getFloat32(28+n+8*4,true),-1);
});
test('OFF and invalid coordinates',()=>{
 assert.ok(ctx.cad3dEncodeMesh(tri,'off').startsWith('OFF\n3 1 0\n'));
 assert.throws(()=>ctx.cad3dEncodeMesh([],'off'));
 assert.throws(()=>ctx.cad3dEncodeMesh([[[NaN,0,0],[0,0,0],[0,1,0]]],'glb'));
});
