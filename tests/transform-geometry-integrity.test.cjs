const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const ctx=vm.createContext({clone:x=>JSON.parse(JSON.stringify(x)),P:(x,y)=>({x,y}),mul:(p,k)=>({x:p.x*k,y:p.y*k}),window:{BlacklineScaleMath:require('../cad-scale-math.js')},BlacklineScaleMath:require('../cad-scale-math.js')});
for(const [a,b] of [['function transformEntity(','\nfunction doTransform('],['function cadScaleLengthFields(','\nfunction openCadUnitsDialog(']]){
 const i=html.indexOf(a),j=html.indexOf(b,i);assert.ok(i>=0&&j>i);vm.runInContext(html.slice(i,j),ctx);
}
const plain=x=>JSON.parse(JSON.stringify(x));
test('MOVE/COPY transformations keep hatch islands with the outer boundary',()=>{
 const h={type:'hatch',pts:[{x:0,y:0},{x:4,y:0},{x:4,y:4}],holes:[[{x:1,y:1},{x:2,y:1},{x:2,y:2}]]};
 const out=ctx.transformEntity(h,p=>({x:p.x+10,y:p.y-3}));
 assert.deepEqual(plain(out.holes[0]),[{x:11,y:-2},{x:12,y:-2},{x:12,y:-1}]);
 assert.deepEqual(h.holes[0][0],{x:1,y:1});
});
test('wall face and its guide points receive the same displacement',()=>{
 const e={type:'line',a:{x:0,y:0},b:{x:2,y:0},wall2d:{thickness:.2,guideA:{x:0,y:.1},guideB:{x:2,y:.1}}};
 const out=ctx.transformEntity(e,p=>({x:p.x+5,y:p.y}));
 assert.equal(out.a.x,5);assert.equal(out.wall2d.guideA.x,5);assert.equal(out.wall2d.guideB.x,7);assert.equal(out.wall2d.thickness,.2);
});
test('unit conversion scales widths, islands and wall metadata once',()=>{
 const e={type:'polyline',pts:[{x:0,y:0},{x:2,y:0}],pwidth:.2,wall2d:{thickness:.2,guideA:{x:0,y:0},guideB:{x:2,y:0}}};
 const out=ctx.scaleDrawingEntity(e,1000);assert.equal(out.pwidth,200);assert.equal(out.wall2d.thickness,200);assert.equal(out.wall2d.guideB.x,2000);
 const round=ctx.scaleDrawingEntity(out,.001);assert.deepEqual(plain(round),e);
 const hatch={type:'hatch',pts:[{x:0,y:0}],holes:[[{x:1,y:1}]],hatchSpacing:.25};
 const h=ctx.scaleDrawingEntity(hatch,1000);assert.equal(h.hatchSpacing,250);assert.equal(h.holes[0][0].x,1000);
});
test('MOVE/COPY skip locked and invisible entities',()=>{
 const i=html.indexOf('function doTransform('),j=html.indexOf('function cadRotateExact(',i);
 assert.match(html.slice(i,j),/if\(lay\.locked\|\|!lay\.visible\|\|original\.cadHidden\)continue/);
});
