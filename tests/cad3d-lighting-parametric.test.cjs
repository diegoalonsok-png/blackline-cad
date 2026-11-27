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
