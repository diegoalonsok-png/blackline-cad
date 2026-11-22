const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('cad3d-lab.js','utf8');
function extract(from,to){
 const a=source.indexOf(from),b=source.indexOf(to,a+from.length);
 assert(a>=0&&b>a,'Cannot locate '+from);return source.slice(a,b);
}
function transferCase(target,position){
 const sourceWall={id:1,type:'wall',x:0,y:0,rot:0,w:4,h:3,
  openings:[{id:10,kind:'door',styleId:'single-swing',w:1,h:2,sill:0,offset:0,hingeSide:'right',openDirection:-1,openAngle:70}]};
 const ctx={selected:[1],selectedOpeningId:10,editableRecord:()=>true,redraw(){},renderProps(){},highlight(){},
  clamp:(n,a,b)=>Math.max(a,Math.min(n,b))};
 vm.runInNewContext(extract('function openingFitsHost(','function placeOpening(e){')+
  extract('function transferOpeningToWall(','function finishOpeningTransfer('),ctx);
 const ok=ctx.transferOpeningToWall(sourceWall,sourceWall.openings[0],target,position);
 return {ok,sourceWall,target,ctx};
}
test('Plan 2D opens orthographic TOP with CAD wireframe and OSNAP',()=>{
 const code=extract('function setPlan2D(){','function setViewPreset(key){');
 assert.match(code,/setViewPreset\('top'\)/);
 assert.match(code,/setVisualStyle\('wire2d'\)/);
 assert.match(code,/draftModes\.osnap/);
 assert(source.includes('data-view-shortcut="plan2d"'));
 assert(source.includes('function renderRulers(){'));
});
test('Moving a door to a new wall closes original cut and preserves parameters',()=>{
 const dest={id:2,type:'wall',x:5,y:0,rot:0,w:4,h:3,openings:[]};
 const out=transferCase(dest,{x:6,y:0});
 assert.equal(out.ok,true);
 assert.equal(out.sourceWall.openings.length,0);
 assert.equal(dest.openings.length,1);
 assert.equal(dest.openings[0].offset,1);
 assert.equal(dest.openings[0].hingeSide,'right');
 assert.equal(dest.openings[0].openAngle,70);
 assert.equal(out.ctx.selectedOpeningId,10);
});
test('Transfer computes offset along rotated destination wall',()=>{
 const dest={id:2,type:'wall',x:5,y:2,rot:90,w:4,h:3,openings:[]};
 const out=transferCase(dest,{x:5,y:3});
 assert.equal(out.ok,true);assert(Math.abs(dest.openings[0].offset-1)<1e-9);
});
test('Transfer refuses narrow, short or occupied destination without detaching',()=>{
 for(const dest of [
  {id:2,type:'wall',x:5,y:0,rot:0,w:.8,h:3,openings:[]},
  {id:2,type:'wall',x:5,y:0,rot:0,w:4,h:1.7,openings:[]},
  {id:2,type:'wall',x:5,y:0,rot:0,w:4,h:3,openings:[{id:11,offset:0,w:1.5,h:1.2,sill:.5}]}
 ]){
  const out=transferCase(dest,{x:5,y:0});
  assert.equal(out.ok,false);assert.equal(out.sourceWall.openings.length,1);
 }
});
test('Escape cancels destination-wall picking',()=>{
 assert(source.includes("if(openingTransfer){ev.preventDefault();ev.stopImmediatePropagation();openingTransfer=null"));
 assert(source.includes("if(click&&e.button===0){if(openingTransfer)finishOpeningTransfer(e)"));
});


test('Numeric MOVE, SCALE and COPY on a selected window never move the host wall',()=>{
 const code=extract('function openingFitsHost(','function placeOpening(e){')+
  extract('function cad3dSelectionTransform(','function run3DCommand(){');
 function run(command,values){
  const wall={id:1,type:'wall',x:2,y:3,z:0,rot:0,w:5,h:3,d:.2,layerId:'0',
   openings:[{id:10,kind:'window',offset:0,sill:1,w:1,h:1}]};
  const ctx={records:[wall],selected:[1],selectedOpeningId:10,serial:50,
   editableRecord:()=>true,clamp:(n,a,b)=>Math.max(a,Math.min(n,b)),
   redraw(){},renderProps(){},text(){}};
  vm.runInNewContext(code,ctx);
  ctx.cad3dSelectionTransform(command,values);
  return {wall,ctx};
 }
 const move=run('move',[1,0,0]);
 assert.equal(move.wall.x,2);assert.equal(move.wall.openings[0].offset,1);
 const scale=run('scale',[1.5]);
 assert.equal(scale.wall.w,5);assert.equal(scale.wall.openings[0].w,1.5);
 const copy=run('copy',[2,0,0]);
 assert.equal(copy.wall.openings.length,2);assert.equal(copy.wall.x,2);
 assert.equal(copy.wall.openings[1].offset,2);assert.notEqual(copy.wall.openings[0].id,copy.wall.openings[1].id);
 const collision=run('copy',[.15,0,0]);
 assert.equal(collision.wall.openings.length,1);
});
test('Measurement and MOVEOPENING commands are available in 3D',()=>{
 assert(source.includes("MEDIR:'dist',MEASURE:'dist'"));
 assert(source.includes("if(command==='moveopening'){action('move');return;}"));
});
