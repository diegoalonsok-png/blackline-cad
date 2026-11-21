const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('cad3d-lab.js','utf8');
const block=source.slice(source.indexOf('function wallJoinOffsets(wall){'),source.indexOf('function buildObject(r){'));
assert(block.startsWith('function wallJoinOffsets(wall){'));
function joins(records){const ctx={records,Math,Number,isFinite};vm.runInNewContext(block,ctx);return ctx;}
function wall(id,x,y,w,d,rot){return {id,type:'wall',x,y,z:0,w,d,h:2.8,rot,openings:[]};}
const EPS=1e-8;
test('CAD3D miter code parses and is actually called when constructing wall meshes',()=>{
 assert.doesNotThrow(()=>new vm.Script(source));
 assert(source.includes("var wallJoin=r.type==='wall'?wallJoinOffsets(r):null"));
 assert(source.includes('if(wallJoin)applyWallMiter(g,r,w,x,wallJoin)'));
});
test('two 20 cm walls meeting at right angle share exact mitred endpoints',()=>{
 const a=wall(1,2,0,4,.2,0),b=wall(2,4,2,4,.2,90);
 const ctx=joins([a,b]);
 const ja=ctx.wallJoinOffsets(a).end,jb=ctx.wallJoinOffsets(b).start;
 assert(ja&&jb);
 assert(Math.abs(ja.minus-.1)<EPS);assert(Math.abs(ja.plus+.1)<EPS);
 assert(Math.abs(jb.minus+.1)<EPS);assert(Math.abs(jb.plus-.1)<EPS);
});
test('miter is computed for a continuous corner with non-equal wall thickness',()=>{
 const a=wall(1,2,0,4,.3,0),b=wall(2,4,2,4,.1,90),ctx=joins([a,b]);
 const ja=ctx.wallJoinOffsets(a).end,jb=ctx.wallJoinOffsets(b).start;
 assert(ja&&jb);
 assert(Math.abs(ja.plus+0.05)<EPS);
 assert(Math.abs(jb.minus+0.15)<EPS);
});
test('no spurious miter on isolated or collinear wall runs',()=>{
 const a=wall(1,2,0,4,.2,0);
 const solo=joins([a]).wallJoinOffsets(a);assert.equal(solo.end,null);assert.equal(solo.start,null);
 const b=wall(2,6,0,4,.2,0);
 assert.equal(joins([a,b]).wallJoinOffsets(a).end,null);
});
test('complex multi-way junction remains unmodified rather than creating an invalid corner',()=>{
 const a=wall(1,2,0,4,.2,0),b=wall(2,4,2,4,.2,90),c=wall(3,4,-2,4,.2,90);
 assert.equal(joins([a,b,c]).wallJoinOffsets(a).end,null);
});
test('miter changes mesh geometry without modifying original wall parameters or openings',()=>{
 const a=wall(1,2,0,4,.2,0),b=wall(2,4,2,4,.2,90);
 a.openings.push({id:3,kind:'door',offset:0,w:.9,h:2.1});
 const original=JSON.stringify([a,b]),ctx=joins([a,b]);
 const join=ctx.wallJoinOffsets(a);
 const coords=[[-2,-.1],[-2,.1],[2,-.1],[2,.1]].map(([x,y])=>({x,y}));
 const attr={count:coords.length,getX(i){return coords[i].x},getY(i){return coords[i].y},setX(i,v){coords[i].x=v}};
 const geo={getAttribute(){return attr},computeVertexNormals(){},computeBoundingBox(){},computeBoundingSphere(){}};
 ctx.applyWallMiter(geo,a,4,0,join);
 assert(Math.abs(coords[2].x-2.1)<EPS);assert(Math.abs(coords[3].x-1.9)<EPS);
 assert.equal(JSON.stringify([a,b]),original);
});
