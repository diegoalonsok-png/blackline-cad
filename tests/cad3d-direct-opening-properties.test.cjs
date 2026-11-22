const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('cad3d-lab.js','utf8');
function extract(from,to){
 const a=source.indexOf(from),b=source.indexOf(to,a+from.length);
 assert(a>=0&&b>a,'Section not found: '+from);
 return source.slice(a,b);
}
test('Door and window geometry carries a distinct opening ID',()=>{
 const code=extract('function architectureParts(', '/* Build a true miter');
 const ctx={clamp:(x,a,b)=>Math.min(b,Math.max(a,x)),cadOpeningActive:()=>false,cadGlassOpacity:()=>.24};
 vm.runInNewContext(code,ctx);
 for(const kind of ['door','window']){
  const parts=[];
  ctx.architectureParts({type:'wall',w:5,d:.2,h:3,openings:[
   {id:7,kind,styleId:kind==='door'?'single-swing':'fixed',offset:0,w:1,h:1.6,sill:.5}
  ]},(...args)=>parts.push(args));
  assert(parts.some(p=>p[8]===7),'Tagged carpentry required for '+kind);
  assert(parts.some(p=>p[8]===undefined),'Wall stays independently selectable');
 }
});
test('Clicking a window selects its Properties even if a wall face is slightly in front',()=>{
 const code=extract('function selectAt(e){','function boxGeom(');
 const wall={isMesh:true,userData:{owner:12}},glass={isMesh:true,userData:{owner:12,openingId:91}};
 const ctx={
  fallbackCanvas:null,records:[{id:12,type:'wall',d:.2,openings:[{id:91,kind:'window'}]}],
  selected:[],selectedOpeningId:null,renderer:{domElement:{getBoundingClientRect(){return {left:0,top:0,width:200,height:200}}}},
  raycaster:{setFromCamera(){},intersectObjects(){return [{object:wall,distance:2},{object:glass,distance:2.08}]}},
  modelRoot:{traverse(fn){fn(wall);fn(glass)}},T:{Vector2:class{constructor(x,y){this.x=x;this.y=y}}},camera:{},
  editableRecord:()=>true,renderProps(){},highlight(){},text(){}
 };
 vm.runInNewContext(code,ctx);ctx.selectAt({clientX:100,clientY:100,shiftKey:false});
 assert.equal(ctx.selectedOpeningId,91);assert.deepEqual(Array.from(ctx.selected),[12]);
});
test('Ray does not select a window behind a different wall',()=>{
 const code=extract('function selectAt(e){','function boxGeom(');
 const wall={isMesh:true,userData:{owner:12}},glass={isMesh:true,userData:{owner:13,openingId:91}};
 const ctx={
  fallbackCanvas:null,records:[{id:12,type:'wall',d:.2},{id:13,type:'wall',d:.2,openings:[{id:91,kind:'window'}]}],
  selected:[],selectedOpeningId:null,renderer:{domElement:{getBoundingClientRect(){return {left:0,top:0,width:200,height:200}}}},
  raycaster:{setFromCamera(){},intersectObjects(){return [{object:wall,distance:2},{object:glass,distance:4}]}},
  modelRoot:{traverse(fn){fn(wall);fn(glass)}},T:{Vector2:class{constructor(x,y){this.x=x;this.y=y}}},camera:{},
  editableRecord:()=>true,renderProps(){},highlight(){},text(){}
 };
 vm.runInNewContext(code,ctx);ctx.selectAt({clientX:100,clientY:100,shiftKey:false});
 assert.equal(ctx.selectedOpeningId,null);assert.deepEqual(Array.from(ctx.selected),[12]);
});
test('Selected window shows Model, Width, Height and Sill but not wall dimensions',()=>{
 const code=extract('function renderProps(){','function change(e){');
 const panel={innerHTML:''},wall={id:12,type:'wall',layerId:'0',
  openings:[{id:91,kind:'window',styleId:'fixed',offset:0,w:1.2,h:1.4,sill:.8}]};
 const ctx={root:{querySelector(){return panel}},records:[wall],selected:[12],selectedOpeningId:91,
  escapeHtml:s=>String(s),cadOpeningMotion:()=> 'fixed',cadOpeningIsGlass:()=>true,cadGlassOpacity:()=>.24,clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),finite:(v,d)=>Number.isFinite(Number(v))?Number(v):d,ARCH_STYLES:{window:[{id:'fixed',name:'Fixed'},{id:'sliding-window',name:'Sliding'}],opening:[]}};
 vm.runInNewContext(code,ctx);ctx.renderProps();
 assert.match(panel.innerHTML,/WINDOW #91/);
 assert.match(panel.innerHTML,/data-opening-style="91"/);
 for(const attr of ['w','h','sill'])assert.match(panel.innerHTML,new RegExp('data-opening="91" data-attr="'+attr+'"'));
 assert.doesNotMatch(panel.innerHTML,/data-key="h"/);
});
test('Changing a carpentry dimension cannot make its opening exceed the host wall',()=>{
 const code=extract('function openingFitsCADHost(', 'function placeOpening(e){');
 const ctx={};
 vm.runInNewContext(code,ctx);
 const wall={type:'wall',w:5,h:3,openings:[
  {id:1,kind:'door',offset:0,w:.9,h:2.1,sill:0}
 ]};
 assert.equal(ctx.openingFitsCADHost(wall,{...wall.openings[0],h:2.5},1),true);
 assert.equal(ctx.openingFitsCADHost(wall,{...wall.openings[0],h:3.5},1),false);
 assert.equal(ctx.openingFitsCADHost(wall,{...wall.openings[0],w:6},1),false);
});
