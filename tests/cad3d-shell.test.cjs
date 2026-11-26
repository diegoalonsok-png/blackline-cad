const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx=vm.createContext({});vm.runInContext(fs.readFileSync('cad3d-solid-ops.js','utf8'),ctx);const k=ctx.CAD3DSolidOps;
test('box shell has exact material volume and top opening',()=>{
 const w=4,d=3,h=2,t=.2,mesh=k.boxShell(w,d,h,t);
 assert.ok(Math.abs(k.volume(mesh)-(w*d*h-(w-2*t)*(d-2*t)*(h-t)))<1e-8);
 assert.equal(mesh.length,28*9);
 const edges=new Map();
 for(let i=0;i<mesh.length;i+=9){
  const v=[0,3,6].map(j=>mesh.slice(i+j,i+j+3).join(','));
  for(let j=0;j<3;j++){const a=v[j],b=v[(j+1)%3],key=[a,b].sort().join('|');const q=edges.get(key)||[0,0];q[0]++;q[1]+=a<b?1:-1;edges.set(key,q)}
 }
 for(const [n,orientation] of edges.values()){assert.equal(n,2);assert.equal(orientation,0)}
});
test('invalid thickness cannot collapse shell',()=>{
 for(const t of [0,-1,1.5,2,NaN,Infinity])assert.throws(()=>k.boxShell(4,3,2,t));
});
test('SHELL is dispatched and commits only a valid generated result',()=>{
 const s=fs.readFileSync('cad3d-lab.js','utf8');assert.match(s,/\['shell','vaciado','vaciar'\]\.includes\(a\)/);
 assert.match(s,/k\.boxShell\(r\.w,r\.d,r\.h,t\)/);
 assert.match(s,/cad3dCommitSolids\(\[r\.id\],\[cad3dMakeSolid\(mesh,r,/);
});
