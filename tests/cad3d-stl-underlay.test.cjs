const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('cad3d-lab.js','utf8');
const ctx=vm.createContext({});
for(const [a,b] of [['function cad3dSTLFacet(','\nfunction exportSTL('],['function segmentsFromEntities(','\nfunction dxfToUnderlay(']]){
 const i=src.indexOf(a),j=src.indexOf(b,i);assert.ok(i>=0&&j>i);vm.runInContext(src.slice(i,j),ctx);
}
test('STL uses mm coordinates and unit normal for a metre-scale triangle',()=>{
 const facet=ctx.cad3dSTLFacet([[0,0,0],[1,0,0],[0,1,0]]);
 assert.match(facet,/facet normal 0 0 1/);assert.match(facet,/vertex 1000 0 0/);assert.match(facet,/vertex 0 1000 0/);
});
test('STL rejects degenerate and non-finite faces',()=>{
 assert.equal(ctx.cad3dSTLFacet([[0,0,0],[1,0,0],[2,0,0]]),null);
 assert.equal(ctx.cad3dSTLFacet([[0,0,0],[1,0,0],[NaN,1,0]]),null);
});
test('3D underlay closes hatch perimeter and islands, without closing open polylines',()=>{
 const hatch={type:'hatch',pts:[{x:0,y:0},{x:4,y:0},{x:4,y:4},{x:0,y:4}],holes:[[{x:1,y:1},{x:2,y:1},{x:2,y:2},{x:1,y:2}]]};
 const line={type:'polyline',pts:[{x:0,y:0},{x:1,y:0},{x:1,y:1}]};
 const s=JSON.parse(JSON.stringify(ctx.segmentsFromEntities([hatch,line],1)));
 assert.equal(s.length,10);assert.deepEqual(s[3],[0,4,0,0]);assert.deepEqual(s[7],[1,2,1,1]);
});
test('STL aliases dispatch actual export',()=>assert.match(src,/\['stl','stlout','exportstl'\]\.includes\(a\)\)exportSTL\(\)/));
