'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const A=require('../assets/cad-calcopy-assist.js');
function raster(){const w=100,h=80,g=new Uint8Array(w*h).fill(255);return {w,h,g,thr:180,rect(x,y,W,H){for(let j=y;j<y+H;j++)for(let i=x;i<x+W;i++)g[j*w+i]=0;}}}
test('dark wall perimeter has closed outside and inside contours; thin ink is excluded',()=>{
 const G=raster();G.rect(10,10,70,8);G.rect(10,52,70,8);G.rect(10,18,8,34);G.rect(72,18,8,34);G.rect(20,35,50,1);
 const rings=A.darkWallContours(G,.02);assert.equal(rings.length,2);assert.equal(rings.filter(x=>x.hole).length,1);assert.deepEqual(rings[0].pts,[[10,10],[80,10],[80,60],[10,60]]);assert.equal(rings[1].areaPx,-1836);
});
test('L and T wall junctions are fused and door gaps are not bridged',()=>{
 const G=raster();G.rect(10,10,70,8);G.rect(10,18,8,45);G.rect(35,18,8,28);G.rect(10,55,8,8);G.rect(28,55,52,8);
 const rings=A.darkWallContours(G,.02);assert.equal(rings.length,2);assert.ok(rings.every(q=>!q.hole));assert.ok(rings.some(q=>q.pts.length>4));assert.ok(rings.every(q=>q.pts.every(p=>p.length===2&&p.every(Number.isFinite))));
});
test('closed polyline insertion preserves image coordinates and one undo transaction',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../assets/cad-pdf-import.js'),'utf8'),i=src.indexOf('function insertDarkContourPolylines'),j=src.indexOf('async function traceDarkContours',i);
 let undo=0,id=0;const C={state:{layers:[],entities:[],selected:[]},P:(x,y)=>({x,y}),saveHistory:()=>undo++,nextId:()=>++id,updateAll:()=>{}};
 const insert=new Function('C',src.slice(i,j)+'return insertDarkContourPolylines;')(C);
 const source={a:{x:2,y:3},b:{x:12,y:11}};
 assert.equal(insert(source,[{pts:[[10,10],[80,10],[80,20],[10,20]]}],100,80),1);
 assert.equal(undo,1);assert.equal(C.state.entities[0].closed,true);assert.deepEqual(C.state.entities[0].pts,[{x:3,y:10},{x:10,y:10},{x:10,y:9},{x:3,y:9}]);
 assert.equal(C.state.layers[0].name,'WALL-CONTOURS');
 C.state.layers[0].locked=true;assert.throws(()=>insert(source,[{pts:[[10,10],[80,10],[80,20],[10,20]]}],100,80));assert.equal(undo,1);
});
