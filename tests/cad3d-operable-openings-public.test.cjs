const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('cad3d-lab.js','utf8');
function slice(from,to){
 const a=source.indexOf(from),b=source.indexOf(to,a+from.length);
 assert(a>=0&&b>a,'Missing source '+from);
 return source.slice(a,b);
}
const Three={
 Group:class{constructor(){this.children=[];this.rotation={x:0,z:0};this.position={set(x,y,z){this.x=x;this.y=y;this.z=z}};}add(x){this.children.push(x)}},
 Mesh:class{constructor(geo,mat){this.geometry=geo;this.material=mat;this.position={set(x,y,z){this.x=x;this.y=y;this.z=z}};this.userData={};}},
 MeshBasicMaterial:class{constructor(o){Object.assign(this,o)}},
 MeshStandardMaterial:class{constructor(o){Object.assign(this,o)}},
 DoubleSide:2
};
function context(){
 const ctx={T:Three,sunSettings:{onFaces:true},clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),
 finite:(x,d)=>Number.isFinite(Number(x))?Number(x):d,
 boxGeom:(w,d,h)=>({w,d,h})};
 vm.runInNewContext(slice('function cadOpeningMotion(', '/* Partition the wall elevation'),ctx);
 vm.runInNewContext(slice('function addCadOpeningLeaves(', 'function buildObject(r){'),ctx);
 return ctx;
}
function wall(type,style,settings={}){
 return {id:4,type:'wall',w:6,d:.2,h:3,
 openings:[Object.assign({id:12,kind:type,styleId:style,w:1.2,h:1,sill:.8,offset:0,hingeSide:'left',
 openDirection:1,openAngle:0,openFraction:0,glassOpacity:.24},settings)]};
}
function draw(ctx,r){
 const group=new Three.Group();ctx.addCadOpeningLeaves(r,group);
 return {proxies:group.children.filter(x=>x.userData?.cadPickProxy),sashes:group.children.filter(x=>x.children)};
}
test('Click proxies cover both faces for closed and opened windows and doors',()=>{
 const ctx=context();
 for(const r of [wall('door','single-swing'),wall('window','awning',{openAngle:45})]){
  const g=draw(ctx,r);
  assert.equal(g.proxies.length,2);
  assert(g.proxies.every(p=>p.userData.openingId===12&&p.userData.owner===4));
  assert(g.proxies.every(p=>!p.castShadow&&!p.receiveShadow&&p.material.colorWrite===false));
  assert(g.proxies[0].position.y<0 && g.proxies[1].position.y>0);
 }
});
test('Awning sash rotates about a horizontal top hinge and glass casts no shadow',()=>{
 const ctx=context(),g=draw(ctx,wall('window','awning',{openAngle:55}));
 assert.equal(g.sashes.length,1);
 assert(Math.abs(g.sashes[0].rotation.x)>0.1);
 assert.equal(g.sashes[0].rotation.z,0);
 assert(g.sashes[0].children.some(x=>x.userData.cadGlass&&!x.castShadow));
 assert(g.sashes[0].children.some(x=>!x.userData.cadGlass&&x.castShadow));
});
test('Hinged door rotates about vertical hinge, respecting side and direction',()=>{
 const ctx=context();
 const left=draw(ctx,wall('door','single-swing',{openAngle:90})).sashes[0];
 const right=draw(ctx,wall('door','single-swing',{openAngle:90,hingeSide:'right'})).sashes[0];
 const outward=draw(ctx,wall('door','single-swing',{openAngle:90,openDirection:-1})).sashes[0];
 assert(Math.abs(left.rotation.z-Math.PI/2)<1e-9);
 assert(Math.abs(right.rotation.z+Math.PI/2)<1e-9);
 assert(Math.abs(outward.rotation.z+Math.PI/2)<1e-9);
});
test('Sliding window moves one of two sash panels according to percentage',()=>{
 const ctx=context();
 const g=draw(ctx,wall('window','sliding-window',{openFraction:.8,w:2}));
 assert.equal(g.sashes.length,2);
 assert.equal(g.sashes[0].rotation.z,0);assert.equal(g.sashes[1].rotation.z,0);
 assert(g.sashes.every(x=>x.children.some(y=>y.userData.cadGlass&&!y.castShadow)));
 assert(g.sashes[1].children[0].position.x!==g.sashes[0].children[0].position.x);
});
test('Fixed glazing has pick faces but no moving sash or Open angle control',()=>{
 const ctx=context(),g=draw(ctx,wall('window','fixed',{openAngle:60}));
 assert.equal(ctx.cadOpeningMotion({kind:'window',styleId:'fixed'}),'fixed');
 assert.equal(g.sashes.length,0);assert.equal(g.proxies.length,2);
});
test('Glass material is transparent, depthWrite false, no shadow',()=>{
 const ctx=context(),group=new Three.Group();
 const glass=ctx.addMesh({},0x5794a8,4,group,0,0,0,true,.45);
 const frame=ctx.addMesh({},0x789aaa,4,group,0,0,0,false);
 assert.equal(glass.castShadow,false);assert.equal(glass.material.transparent,true);
 assert.equal(glass.material.opacity,.45);assert.equal(glass.material.depthWrite,false);
 assert.equal(frame.castShadow,true);assert.equal(frame.material.transparent,false);
});
test('Window Properties exposes opening angle or slide, hinge, direction and transparency',()=>{
 const code=slice('function renderProps(){','function change(e){');
 function html(style){
  const p={innerHTML:''},r=wall('window',style);
  const ctx={root:{querySelector(){return p}},selected:[4],selectedOpeningId:12,records:[r],
   escapeHtml:String,ARCH_STYLES:{window:[{id:style,name:style}],opening:[]},
   cadOpeningMotion:o=>/sliding/.test(o.styleId)?'slide':/awning/.test(o.styleId)?'tilt':'hinge',
   cadOpeningActive:()=>false,cadOpeningIsGlass:()=>true,cadGlassOpacity:()=>.24,
   clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),finite:(x,d)=>Number.isFinite(Number(x))?Number(x):d};
  vm.runInNewContext(code,ctx);ctx.renderProps();return p.innerHTML;
 }
 assert.match(html('awning'),/data-opening-angle="12"/);
 assert.match(html('sliding-window'),/data-opening-slide="12"/);
 assert.match(html('casement'),/data-opening-hinge="12"/);
 assert.match(html('awning'),/data-opening-direction="12"/);
 assert.match(html('awning'),/data-opening-glass="12"/);
});
test('3DJSON importer restores opening motion and transparency parameters',()=>{
 for(const key of ['openAngle','openFraction','hingeSide','openDirection','glassOpacity'])
  assert(source.includes('op.'+key+'='),'JSON import missing '+key);
 assert(source.includes("selectedOpeningId=null;"));
});
test('While placement remains armed, clicking an existing opening switches to selection',()=>{
 assert(source.includes("if(placing&&['door','window','opening'].includes(placing)&&cadHitExistingOpeningAt(e))"));
 assert(source.includes('setPlacement(null);selectAt(e);'));
});
