const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../cad3d-lab.js'),'utf8');
const start=source.indexOf('function cad3dParsePLY('),end=source.indexOf('function cad3dParseGLTFDocument',start);
function parse(buf){
 let result;
 const ctx={TextDecoder,Uint8Array,DataView,cad3dImportTriangles:(v,f,n)=>{result=JSON.parse(JSON.stringify({v,f,n}));}};
 vm.runInNewContext(source.slice(start,end),ctx);
 ctx.cad3dParsePLY(buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength),'test.ply');
 return result;
}
function make(format){
 const header=Buffer.from('ply\nformat '+format+' 1.0\ncomment test\nelement vertex 3\nproperty float z\nproperty uchar red\nproperty float x\nproperty float y\nelement face 1\nproperty list uchar int vertex_indices\nend_header\n');
 const v=[[0,255,0,0],[0,0,1,0],[0,0,0,1]];
 if(format==='ascii')return Buffer.concat([header,Buffer.from(v.map(x=>x.join(' ')).join('\n')+'\n3 0 1 2\n')]);
 const data=Buffer.alloc(3*13+13),le=format==='binary_little_endian';let p=0;
 for(const [z,c,x,y] of v){le?data.writeFloatLE(z,p):data.writeFloatBE(z,p);p+=4;data[p++]=c;for(const q of [x,y]){le?data.writeFloatLE(q,p):data.writeFloatBE(q,p);p+=4;}}
 data[p++]=3;for(const i of [0,1,2]){le?data.writeInt32LE(i,p):data.writeInt32BE(i,p);p+=4;}
 return Buffer.concat([header,data]);
}
for(const format of ['ascii','binary_little_endian','binary_big_endian'])test('PLY '+format+' handles reordered properties',()=>assert.deepEqual(parse(make(format)),{v:[[0,0,0],[1,0,0],[0,1,0]],f:[[0,1,2]],n:'test.ply'}));
test('truncated binary PLY fails before scene insertion',()=>assert.throws(()=>parse(make('binary_little_endian').subarray(0,-2)),/truncado/));
test('invalid face index is rejected',()=>{let b=make('binary_little_endian');b.writeInt32LE(8,b.length-4);assert.throws(()=>parse(b),/Cara PLY inválida/);});
