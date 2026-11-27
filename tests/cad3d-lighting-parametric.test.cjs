const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const s=fs.readFileSync('cad3d-lab.js','utf8'),a=s.indexOf('function cad3dLightNormalize'),b=s.indexOf('function cad3dLightCreate',a);
const ctx=vm.createContext({cad3dLights:[],cad3dLightSequence:1});vm.runInContext(s.slice(a,b),ctx);
test('cenital defaults to just below ceiling and points down',()=>{
 const v=ctx.cad3dLightDefault('ceiling',1,{x:2,y:3,z:1.5,height:3});
 assert.equal(v.z,2.95);assert.equal(v.elevation,-90);assert.equal(ctx.cad3dLightDirection(v)[2],-1);
});
test('horizontal direction remains horizontal and legacy radians migrate',()=>{
 const v=ctx.cad3dLightNormalize({id:1,type:'spot',x:0,y:0,z:0,elevation:0,angle:Math.PI/4,power:0});
 assert.equal(v.angleDeg,45);assert.equal(v.power,0);assert.equal(ctx.cad3dLightDirection(v)[2],0);
});
test('light restoration sanitizes invalid values and duplicate ids',()=>{
 const v={id:1,type:'panel',x:0,y:0,z:2,power:500,color:'invalid'};
 ctx.cad3dLightRestore([v,v,{...v,id:2,x:NaN}]);
 assert.equal(ctx.cad3dLights.length,1);assert.equal(ctx.cad3dLights[0].power,80);assert.equal(ctx.cad3dLights[0].color,'#fff2dd');assert.equal(ctx.cad3dLightSequence,2);
});
test('project export and import include lights and command access',()=>{
 assert.match(s,/materials:cad3dCustomMaterials,lights:cad3dLights/);
 assert.match(s,/cad3dLightRestore\(data\.lights\)/);
 for(const k of ['pointlight','spotlight','distantlight','downlight','luzglobular','panellight'])assert.ok(s.includes(k+':'));
});


test('rectangular panels preserve legacy square dimensions and default to 1.2 by 0.6',()=>{
 const legacy=ctx.cad3dLightNormalize({id:1,type:'panel',x:0,y:0,z:2,length:2});
 assert.equal(legacy.width,2);
 const v=ctx.cad3dLightDefault('panel',2,{x:0,y:0,z:1.5,height:3});
 assert.equal(v.length,1.2);assert.equal(v.width,.6);
});
test('four panel samples follow the emitting plane and retain centered rectangular dimensions',()=>{
 for(const [azimuth,elevation] of [[0,-90],[90,-90],[31,-45],[180,0],[22,90]]){
  const v=ctx.cad3dLightNormalize({id:1,type:'panel',x:0,y:0,z:0,length:4,width:2,azimuth,elevation});
  const p=ctx.cad3dPanelSampleOffsets(v),n=ctx.cad3dLightDirection(v);
  const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9);
  assert.equal(p.length,4);
  for(const point of p)near(point.reduce((a,x,i)=>a+x*n[i],0),0);
  for(let i=0;i<3;i++)near(p.reduce((a,q)=>a+q[i],0),0);
  const dist=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
  near(dist(p[0],p[1]),2);near(dist(p[0],p[2]),1);
 }
});
test('panel width is bounded and wired into the editor and scene',()=>{
 const v=ctx.cad3dLightNormalize({id:1,type:'panel',x:0,y:0,z:0,width:100});
 assert.equal(v.width,12);
 assert.ok(s.includes('data-light-field="width"'));
 assert.ok(s.includes('new T.Vector3(...offsets[j])'));
});
