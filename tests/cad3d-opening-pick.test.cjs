const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('cad3d-lab.js','utf8');
function extract(start,end){
 const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
 assert(a>=0&&b>a,'Missing CAD3D section: '+start);
 return source.slice(a,b);
}
test('Wall carpentry meshes are tagged with their own opening IDs',()=>{
 const code=extract('function openingSpanAtX(', '/* Build a true miter');
 const ctx={clamp:(n,a,b)=>Math.max(a,Math.min(n,b)),glazingOpacity:()=>.24,finite:(v,d)=>Number.isFinite(Number(v))?Number(v):d,openingMotionType:o=>/sliding/.test(o.styleId||'')?'sliding':'hinged'};
 vm.runInNewContext(code,ctx);
 for(const [kind,styleId] of [['door','single-swing'],['window','sliding-window'],['window','fixed']]){
  const objects=[];
  const wall={type:'wall',w:5,h:3,d:.2,openings:[{id:42,kind,styleId,w:1.4,h:1.8,sill:.5,offset:0,shape:'rect'}]};
  ctx.architectureParts(wall,(...args)=>objects.push(args));
  assert(objects.some(x=>x[10]===42),kind+': carpentry mesh must carry opening ID');
  assert(objects.some(x=>x[10]===undefined),'Wall solids must remain separately selectable');
 }
});
test('Clicking a window mesh chooses its opening and host wall',()=>{
 const code=extract('function selectAt(e){','function boxGeom(');
 const mesh={isMesh:true,userData:{owner:10,openingId:42}};
 const ctx={
  fallbackCanvas:null,activeView:'perspective',viewMode:'perspective',selected:[],selectedOpeningId:null,records:[{id:10,type:'wall',openings:[{id:42,kind:'window'}]}],
  renderer:{domElement:{getBoundingClientRect:()=>({left:0,top:0,width:200,height:200})}},
  T:{Vector2:class{constructor(x,y){this.x=x;this.y=y}}},
  modelRoot:{traverse(fn){fn(mesh)}},raycaster:{setFromCamera(){},intersectObjects(){return [{object:mesh}]}},camera:{},
  editableRecord:()=>true,renderProps(){this.rendered=true},highlight(){},text(){}
 };
 vm.runInNewContext(code,ctx);
 ctx.selectAt({clientX:100,clientY:100,shiftKey:false});
 assert.deepEqual(Array.from(ctx.selected),[10]);
 assert.equal(ctx.selectedOpeningId,42);
});
test('Direct opening Properties shows dimensions and not wall dimensions',()=>{
 const code=extract('function renderProps(){','function change(e){');
 const panel={innerHTML:''},wall={id:10,type:'wall',layerId:'0',openings:[{id:42,kind:'door',styleId:'single-swing',offset:0,w:.9,h:2.1,sill:0,openAngle:0}]};
 const ctx={
  root:{querySelector(){return panel}},selected:[10],selectedOpeningId:42,records:[wall],
  ARCH_STYLES:{door:[{id:'single-swing',name:'Single swing'}],opening:[]},
  escapeHtml:v=>String(v),openingMotionType:()=> 'hinged',openingIsGlass:()=>false,
  clamp:(n,a,b)=>Math.max(a,Math.min(n,b)),finite:(n,d)=>Number.isFinite(Number(n))?Number(n):d
 };
 vm.runInNewContext(code,ctx);ctx.renderProps();
 assert.match(panel.innerHTML,/DOOR #42/);
 assert.match(panel.innerHTML,/data-opening="42" data-attr="w"/);
 assert.match(panel.innerHTML,/data-opening-angle="42"/);
 assert.match(panel.innerHTML,/data-back-wall/);
 assert.doesNotMatch(panel.innerHTML,/data-key="w"/);
});
