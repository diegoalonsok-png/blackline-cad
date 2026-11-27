const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync('cad3d-lab.js','utf8');
const extract=(a,b)=>{
 const x=source.indexOf(a),y=source.indexOf(b,x+a.length);
 assert(x>=0&&y>x,'Missing source section '+a);return source.slice(x,y);
};
const ctx={clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),Math,Number,String};
vm.runInNewContext(extract('function cad3DOpeningDefaults','var importSequence=0;')+'\n'+
 extract('function cad3DGlazingPattern(','/* Build a true miter'),ctx);
function renderOpening(kind,styleId,opts={}){
 const wall={type:'wall',w:7,d:.22,h:3.6,openings:[
  {id:20,kind,styleId,offset:0,w:3,h:2.1,sill:0.4,...opts}
 ]};
 const parts=[];ctx.architectureParts(wall,(...p)=>parts.push(p));
 return parts.filter(p=>p[8]===20);
}
test('All of CAD3D parses with new opening operations',()=>assert.doesNotThrow(()=>new vm.Script(source)));
test('Left and right door hinge produce opposite 3D swing and stay hosted',()=>{
 const a=renderOpening('door','single-swing',{operation:'hinged',openAngle:80,leaves:1,hinge:'left'});
 const b=renderOpening('door','single-swing',{operation:'hinged',openAngle:80,leaves:1,hinge:'right'});
 assert(a.some(p=>p[9]?.axis==='z'&&Math.abs(p[9].angle)>1.3),'left hinged leaf');
 assert(b.some(p=>p[9]?.axis==='z'&&p[9].angle<0),'right hinged leaf');
 assert(a.some(p=>p[9]===undefined),'stationary door frame');
});
test('Three-leaf casement and sliding windows separate into editable leaves',()=>{
 const casement=renderOpening('window','triple-casement',{operation:'casement',openAngle:50,leaves:3});
 const sliding=renderOpening('window','triple-sliding-window',{operation:'sliding',openPercent:75,leaves:3});
 assert.equal(casement.filter(p=>p[9]?.axis==='z'&&Math.abs(p[9].angle)>.5&&p[5]!==undefined).length>=3,true);
 assert(sliding.filter(p=>p[9]&&Math.abs(p[9].shiftX)>.01).length>=3);
});
test('Awning and hopper pivot on horizontal hinge, closed angle is zero',()=>{
 for(const style of ['awning','hopper']){
  const open=renderOpening('window',style,{operation:style,openAngle:45});
  assert(open.some(p=>p[9]?.axis==='x'&&Math.abs(p[9].angle)>.7));
 }
 const closed=renderOpening('door','single-swing',{operation:'hinged',openAngle:0});
 assert(closed.some(p=>p[9]?.axis==='z'&&p[9].angle===0));
});
test('3D geometry rotates around each hinge; host wall is never rotated or modified',()=>{
 const mesh=extract('function buildObject(r){','function disposeMeshes(group){');
 assert(mesh.includes("g.rotateZ(motion.angle||0)"));
 assert(mesh.includes("g.rotateX(motion.angle||0)"));
 assert(mesh.includes("g.translate(motion.pivotX+(motion.shiftX||0)"));
 assert(mesh.includes("if(wallJoin&&openingId==null)"));
});
test('Right-side Properties has leaves, operation, hinge, swing, open and close controls',()=>{
 const code=extract('function renderProps(){','function change(e){');
 const panel={innerHTML:''};
 const wall={id:5,type:'wall',layerId:'0',openings:[
  {id:9,kind:'window',styleId:'casement',operation:'casement',offset:0,w:1.2,h:1.4,sill:.8}]};
 const vmCtx={root:{querySelector(){return panel;}},records:[wall],selected:[5],selectedOpeningId:9,
  escapeHtml:String,ARCH_STYLES:{window:[{id:'casement',name:'Casement'}],opening:[]},render3DGrips(){},
  cad3DOpeningConfig(){return {operation:'casement',leaves:1,hinge:'left',swing:'out',openAngle:0,openPercent:0};}};
 vm.runInNewContext(code,vmCtx);vmCtx.renderProps();
 for(const token of ['data-opening-param="9" data-param="operation"','data-param="leaves"','data-param="hinge"',
  'data-param="swing"','data-param="openAngle"','data-opening-motion="9" data-motion="open"',
  'data-opening="9" data-attr="w"','data-opening-style="9"'])
  assert(panel.innerHTML.includes(token),token);
});
test('Opening selections are saved and sanitized on import of 3DJSON',()=>{
 const importCode=source.slice(source.indexOf('async function readJSON(e){'));
 for(const field of ['op.openAngle=clamp','op.openPercent=clamp','op.leaves=clamp','op.hinge=','op.swing=','op.operation='])
  assert(importCode.includes(field),field);
});

test('four and six leaf presets retain the full parametric leaf count',()=>{
 for(const kind of ['door','window'])for(const [n,word] of [[4,'four'],[6,'six']]){
  const style=word+'-sliding-'+(kind==='door'?'glazed-door':'window');
  assert.equal(ctx.cad3DOpeningDefaults(kind,style).leaves,n);
  const parts=renderOpening(kind,style,{w:n,openPercent:100});
  const glass=parts.filter(p=>p[6]===0x4d8297);
  assert.equal(glass.length,n);
  const centers=glass.map(p=>p[3]+p[9].shiftX);
  assert(Math.abs(centers[0]-centers[n/2-1])<1e-8);
  assert(Math.abs(centers[n/2]-centers[n-1])<1e-8);
  assert(centers[n-1]-centers[0]>n*.6);
  for(let i=1;i<n/2;i++)assert(Math.abs(glass[i][9].shiftY-glass[i-1][9].shiftY)>=.05);
 }
});
test('glazed doors are framed around transparent glass, without an opaque full leaf',()=>{
 const parts=renderOpening('door','single-glazed-door',{w:1,h:2.2,openAngle:45});
 const glass=parts.find(p=>p[6]===0x4d8297);
 assert(glass&&glass[0]>.6&&glass[2]>1.5&&glass[1]<.02);
 assert(!parts.some(p=>p[6]===0x88745e&&p[0]>.7&&p[2]>1.5));
 assert(parts.filter(p=>p[6]===0x88745e).length>=4);
 assert(glass[9].angle>0);
});
test('fixed glass wall screen has six leaves and does not open',()=>{
 const parts=renderOpening('window','six-fixed-window',{w:6,h:2.6,openPercent:100,openAngle:90});
 const glass=parts.filter(p=>p[6]===0x4d8297);
 assert.equal(glass.length,6);
 assert(glass.every(p=>p[9].angle===0&&p[9].shiftX===0&&p[9].shiftY===0));
 assert.equal(ctx.cad3DOpeningDefaults('door','four-fixed-glazed-door').operation,'fixed');
});
test('two leaf sliding system opens a clear span instead of exchanging leaves',()=>{
 const cfg={operation:'sliding',hinge:'left',openPercent:100};
 const a=ctx.cad3DLeafMotion(cfg,0,2,0,1,0,2),b=ctx.cad3DLeafMotion(cfg,1,2,1,2,0,2);
 assert.equal(a.shiftX,0);assert.equal(b.shiftX,-1);
 assert(Math.abs(a.shiftY-b.shiftY)>=.05);
});
