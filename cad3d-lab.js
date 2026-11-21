/* Blackline CAD3D Lab, isolated from the CAD2D drafting engine. Experimental module. */
(function(){
'use strict';
if(window.BlacklineCAD3D)return;
var T=null, root=null, renderer=null, scene=null, camera=null, modelRoot=null, raycaster=null;
var records=[], selected=[], serial=1, orbit={az:-.85,el:.55,dist:17}, target=null, frame=0, dragging=null, winDrag=null, observer=null;
var DISABLE_KEY='blackline-cad3d-disabled';
var icons={
 cube:'<path d="m12 2 9 5-9 5-9-5 9-5ZM3 7v10l9 5V12M21 7v10l-9 5"/>',
 sphere:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
 cylinder:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5"/>',
 cone:'<path d="m12 2-9 17m9-17 9 17"/><ellipse cx="12" cy="19" rx="9" ry="3"/>',
 wall:'<path d="M3 20V7l18-4v13L3 20ZM3 12l18-4"/>',
 door:'<path d="M4 21V3h16v18M8 21V6h8v15M14 13h.1"/>',
 window:'<rect x="3" y="3" width="18" height="18"/><path d="M12 3v18M3 12h18"/>',
 union:'<rect x="2" y="8" width="12" height="12"/><rect x="10" y="3" width="12" height="12"/>',
 subtract:'<rect x="2" y="7" width="16" height="14"/><path d="M10 3h12v11h-7" stroke-dasharray="3 2"/>',
 intersect:'<rect x="2" y="8" width="14" height="12"/><rect x="9" y="3" width="13" height="12"/><path d="M9 8h7v7H9z" fill="currentColor" fill-opacity=".2"/>',
 export:'<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>',
 folder:'<path d="M3 7V4h7l3 3h8v13H3z"/>',
 view:'<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/>'
};
var css=[
'.cad3d-launch{margin:2px 7px;padding:4px 10px;border:1px solid #506777;border-radius:5px 5px 0 0;background:#19242e;color:#d9e6ee;font:600 11px Inter,Arial;letter-spacing:.7px;cursor:pointer}',
'.cad3d-launch:hover{background:#344653}',
'#cad3dLab{position:fixed;left:9vw;top:9vh;width:min(1140px,82vw);height:min(730px,80vh);min-width:490px;min-height:350px;resize:both;overflow:hidden;z-index:3000;background:#10161c;color:#e0e8ef;border:1px solid #71808b;border-radius:10px;box-shadow:0 22px 85px #000c;display:flex;flex-direction:column;font:12px Inter,Segoe UI,Arial,sans-serif}',
'#cad3dLab[hidden]{display:none!important}',
'#cad3dLab *{box-sizing:border-box}',
'#cad3dLab .head{height:36px;flex:0 0 36px;background:#0a0e12;display:flex;align-items:center;gap:9px;padding:0 10px;border-bottom:1px solid #354452;cursor:grab;touch-action:none;user-select:none}',
'#cad3dLab .head strong{letter-spacing:1px;white-space:nowrap}',
'#cad3dLab .head small{color:#a2b2bf}',
'#cad3dLab .head .stretch{flex:1}',
'#cad3dLab .head button{background:#1d2933;color:#e3ebf1;border:1px solid #41515d;border-radius:5px;cursor:pointer;min-height:25px}',
'#cad3dLab .tools{display:flex;align-items:center;gap:3px;padding:5px 7px;min-height:44px;background:#17212b;border-bottom:1px solid #3a4b59;overflow-x:auto;scrollbar-width:thin}',
'#cad3dLab .tools button{display:inline-flex;align-items:center;gap:5px;flex:0 0 auto;padding:5px 7px;min-height:30px;white-space:nowrap;background:#0c1116;border:1px solid #354650;border-radius:5px;color:#e3eaf0;cursor:pointer;font:11px Inter,Arial}',
'#cad3dLab .tools button:hover{background:#293a47;border-color:#9bb3c2}',
'#cad3dLab .tools button svg{width:17px;height:17px}',
'#cad3dLab .tools .divider{height:28px;border-left:1px solid #52606d;margin:0 4px}',
'#cad3dLab .body{flex:1;min-height:0;display:flex}',
'#cad3dLab .view{position:relative;flex:1;min-width:110px;overflow:hidden;background:#0d1218}',
'#cad3dLab .view canvas{display:block;width:100%;height:100%;touch-action:none;cursor:grab}',
'#cad3dLab .hint{position:absolute;top:9px;left:9px;padding:6px 8px;background:#111923cf;border:1px solid #364b59;border-radius:5px;color:#aec2d0;pointer-events:none;font-size:10px}',
'#cad3dLab .side{width:227px;max-width:44%;flex:0 0 227px;background:#151f28;border-left:1px solid #344553;padding:10px;overflow:auto}',
'#cad3dLab .side h3{font-size:12px;margin:0 0 10px}',
'#cad3dLab .side p{line-height:1.4;color:#a8b9c5;font-size:11px}',
'#cad3dLab .side label{display:flex;align-items:center;justify-content:space-between;gap:6px;margin:7px 0;font-size:11px}',
'#cad3dLab .side input{background:#0a1117;color:#e4edf2;border:1px solid #4c5e6d;border-radius:4px;width:84px;padding:4px 5px;font:11px Inter,Arial}',
'#cad3dLab .side .detail{padding:8px 0;margin-top:8px;border-top:1px solid #364a59}',
'#cad3dLab .side button{border:1px solid #526b7c;background:#233544;color:#e6eef4;border-radius:5px;padding:5px 7px;margin-top:3px;cursor:pointer}',
'#cad3dLab footer{height:26px;flex:0 0 26px;background:#0b1218;border-top:1px solid #354857;padding:5px 9px;color:#9fb5c5;display:flex;justify-content:space-between;gap:8px}',
'@media(max-width:700px){#cad3dLab{left:2vw;top:8vh;width:96vw;height:83vh;min-width:0}#cad3dLab .side{width:155px;flex-basis:155px;padding:6px}#cad3dLab .tools button span{display:none}#cad3dLab .head small{display:none}}'
].join('\n');
var cssNode=document.createElement('style');cssNode.id='cad3dLabCSS';cssNode.textContent=css;document.head.appendChild(cssNode);
function escapeHtml(a){return String(a).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function finite(a,f){var n=Number(a);return Number.isFinite(n)?n:f;}
function clamp(a,min,max){return Math.max(min,Math.min(max,a));}
function text(s){if(root)root.querySelector('.status').textContent=s;}
function ico(name){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(icons[name]||icons.cube)+'</svg>';}
function tool(id,name,shape){return '<button type="button" data-action="'+id+'" title="'+name+'">'+ico(shape||id)+'<span>'+name+'</span></button>';}
function launch(){
 if(document.getElementById('cad3dOpen'))return;
 var bar=document.querySelector('#tabs.tabbar')||document.querySelector('.tabbar');
 if(!bar)return;
 var b=document.createElement('button');b.type='button';b.className='cad3d-launch';b.id='cad3dOpen';b.textContent='3D LAB';b.title='Abrir ventana CAD3D experimental sin modificar CAD2D';
 var toolStatus=bar.querySelector('#blToolStatus');bar.insertBefore(b,toolStatus||null);
 b.addEventListener('click',open);
}
function build(){
 if(root)return;
 root=document.createElement('section');root.id='cad3dLab';root.hidden=true;root.setAttribute('role','dialog');root.setAttribute('aria-label','Blackline CAD 3D LAB');
 root.innerHTML='<div class="head"><strong>▣ BLACKLINE · CAD3D</strong><small>EXPERIMENTAL · MODEL SPACE</small><div class="stretch"></div><button type="button" data-close title="Cerrar 3D sin afectar el plano 2D">×</button></div>'+
 '<div class="tools" role="toolbar" aria-label="Herramientas tridimensionales">'+
 tool('box','Box','cube')+tool('sphere','Sphere')+tool('cylinder','Cylinder')+tool('cone','Cone')+
 '<div class="divider"></div>'+tool('wall','WALL 3D')+tool('door','Door')+tool('window','Window')+
 '<div class="divider"></div>'+tool('union','Union')+tool('subtract','Subtract')+tool('intersect','Intersect')+
 '<div class="divider"></div>'+tool('view','Views')+
 '<div class="divider"></div>'+tool('obj','OBJ','export')+tool('dxf','DXF 3D','export')+tool('json','.3DJSON','export')+tool('open','Open','folder')+'</div>'+
 '<div class="body"><div class="view"><div class="hint">Orbit: arrastrar · Zoom: rueda · Seleccionar: clic · Dos sólidos: Shift + clic</div></div>'+
 '<aside class="side"><h3>3D PROPERTIES</h3><div class="props"><p>Agregá un objeto o seleccioná una figura. Unidades: metros.</p></div></aside></div>'+
 '<footer><span class="status" role="status">Módulo separado · CAD2D intacto</span><span>BLACKLINE · 3D LAB</span></footer>'+
 '<input type="file" class="fileInput" accept=".3djson,.json" hidden>';
 document.body.appendChild(root);
 root.querySelector('[data-close]').addEventListener('click',close);
 root.querySelector('.head').addEventListener('pointerdown',moveWindow);
 root.querySelector('.tools').addEventListener('click',function(e){var b=e.target.closest('[data-action]');if(b)action(b.dataset.action);});
 root.querySelector('.props').addEventListener('change',change);
 root.querySelector('.props').addEventListener('click',clickProps);
 root.querySelector('.fileInput').addEventListener('change',readJSON);
 observer=new ResizeObserver(function(){resize();});
 observer.observe(root.querySelector('.view'));
}
function moveWindow(e){
 if(e.button!==0||e.target.closest('button'))return;
 e.preventDefault();var head=root.querySelector('.head'),r=root.getBoundingClientRect();
 winDrag={id:e.pointerId,dx:e.clientX-r.left,dy:e.clientY-r.top};head.setPointerCapture(e.pointerId);
 function move(ev){if(!winDrag||ev.pointerId!==winDrag.id)return;root.style.left=clamp(ev.clientX-winDrag.dx,0,window.innerWidth-80)+'px';root.style.top=clamp(ev.clientY-winDrag.dy,0,window.innerHeight-50)+'px';}
 function done(ev){if(!winDrag||ev.pointerId!==winDrag.id)return;winDrag=null;head.removeEventListener('pointermove',move);head.removeEventListener('pointerup',done);head.removeEventListener('pointercancel',done);}
 head.addEventListener('pointermove',move);head.addEventListener('pointerup',done);head.addEventListener('pointercancel',done);
}
async function open(){
 build();root.hidden=false;document.getElementById('cad3dOpen').setAttribute('aria-pressed','true');
 if(renderer){resize();loop();return;}
 text('Cargando motor 3D bajo demanda…');
 try{
  if(!T){try{T=await import('https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.module.js');}
   catch(e){T=await import('https://unpkg.com/three@0.182.0/build/three.module.js');}}
  if(root.hidden)return;
  init();redraw();renderProps();loop();text('3D listo · '+records.length+' sólidos');
 }catch(e){text('Error al iniciar 3D: '+String(e&&e.message||e));console.error('Blackline CAD3D',e);}
}
function close(){
 if(!root)return;root.hidden=true;document.getElementById('cad3dOpen').setAttribute('aria-pressed','false');
 if(frame)cancelAnimationFrame(frame);frame=0;
}
function init(){
 scene=new T.Scene();scene.background=new T.Color(0x0b1117);
 camera=new T.PerspectiveCamera(50,1,.02,2000);camera.up.set(0,0,1);
 target=new T.Vector3(0,0,1);updateCamera();
 renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
 root.querySelector('.view').appendChild(renderer.domElement);
 scene.add(new T.AmbientLight(0xffffff,1.3));
 var light=new T.DirectionalLight(0xffffff,2.1);light.position.set(-8,-6,16);scene.add(light);
 var fill=new T.DirectionalLight(0x8bc0ef,.7);fill.position.set(7,9,7);scene.add(fill);
 var grid=new T.GridHelper(60,60,0x526575,0x253440);grid.rotation.x=Math.PI/2;scene.add(grid);
 scene.add(new T.AxesHelper(2));
 modelRoot=new T.Group();scene.add(modelRoot);raycaster=new T.Raycaster();
 bindCanvas(renderer.domElement);resize();
}
function updateCamera(){
 if(!camera)return;
 camera.position.set(target.x+orbit.dist*Math.cos(orbit.el)*Math.cos(orbit.az),
 target.y+orbit.dist*Math.cos(orbit.el)*Math.sin(orbit.az),target.z+orbit.dist*Math.sin(orbit.el));
 camera.lookAt(target);
}
function resize(){
 if(!renderer||!root||root.hidden)return;
 var v=root.querySelector('.view');if(v.clientWidth<2||v.clientHeight<2)return;
 renderer.setSize(v.clientWidth,v.clientHeight,false);camera.aspect=v.clientWidth/v.clientHeight;camera.updateProjectionMatrix();
}
function loop(){
 if(frame)return;
 function tick(){frame=0;if(!renderer||root.hidden)return;renderer.render(scene,camera);frame=requestAnimationFrame(tick);}
 frame=requestAnimationFrame(tick);
}
function bindCanvas(el){
 el.addEventListener('contextmenu',function(e){e.preventDefault();});
 el.addEventListener('pointerdown',function(e){dragging={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false,pan:e.button===2};el.setPointerCapture(e.pointerId);});
 el.addEventListener('pointermove',function(e){
  if(!dragging||dragging.id!==e.pointerId)return;
  var dx=e.clientX-dragging.lastX,dy=e.clientY-dragging.lastY;
  dragging.lastX=e.clientX;dragging.lastY=e.clientY;
  if(Math.hypot(e.clientX-dragging.x,e.clientY-dragging.y)>4)dragging.moved=true;
  if(!dragging.moved)return;
  if(dragging.pan){
   var f=orbit.dist/400;target.x+=f*(-dx*Math.sin(orbit.az)-dy*Math.cos(orbit.az));
   target.y+=f*(dx*Math.cos(orbit.az)-dy*Math.sin(orbit.az));
  }else{orbit.az-=dx*.007;orbit.el=clamp(orbit.el+dy*.007,-1.45,1.45);}
  updateCamera();
 });
 el.addEventListener('pointerup',function(e){if(!dragging||dragging.id!==e.pointerId)return;var select=!dragging.moved;dragging=null;if(select&&e.button===0)selectAt(e);});
 el.addEventListener('pointercancel',function(){dragging=null;});
 el.addEventListener('wheel',function(e){e.preventDefault();orbit.dist=clamp(orbit.dist*Math.exp(e.deltaY*.001),1.4,300);updateCamera();},{passive:false});
}
function selectAt(e){
 var box=renderer.domElement.getBoundingClientRect();
 var p=new T.Vector2(2*(e.clientX-box.left)/box.width-1,-2*(e.clientY-box.top)/box.height+1);
 raycaster.setFromCamera(p,camera);
 var hits=[];modelRoot.traverse(function(o){if(o.isMesh)hits.push(o);});
 var intersects=raycaster.intersectObjects(hits,false);
 var id=intersects.length?intersects[0].object.userData.owner:null;
 if(id===null){if(!e.shiftKey)selected=[];}else if(e.shiftKey){selected=selected.includes(id)?selected.filter(function(n){return n!==id;}):selected.concat(id);}else selected=[id];
 renderProps();highlight();text(selected.length+' seleccionados · '+records.length+' objetos');
}
function boxGeom(w,d,h){var g=new T.BoxGeometry(w,d,h);g.translate(0,0,h/2);return g;}
function addMesh(g,color,id,parent,x,y,z){
 var m=new T.Mesh(g,new T.MeshStandardMaterial({color:color,roughness:.8,metalness:.04,side:T.DoubleSide}));
 m.userData.owner=id;if(x!==undefined)m.position.set(x,y,z);parent.add(m);
}
function wallGeo(r,parent){
 var length=clamp(r.w,.1,1000),thickness=clamp(r.d,.05,50),height=clamp(r.h,.1,1000);
 var cutouts=(r.openings||[]).map(function(o){
  return {source:o,l:clamp(o.offset-o.w/2,-length/2,length/2),right:clamp(o.offset+o.w/2,-length/2,length/2),
  bottom:clamp(o.sill,0,height),top:clamp(o.sill+o.h,0,height)};
 }).filter(function(o){return o.right-o.l>.02&&o.top-o.bottom>.02;});
 var xs=[-length/2,length/2],zs=[0,height];
 cutouts.forEach(function(o){xs.push(o.l,o.right);zs.push(o.bottom,o.top);});
 var unique=function(a){return a.sort(function(a,b){return a-b;}).filter(function(v,i,arr){return !i||Math.abs(v-arr[i-1])>1e-8;});};
 xs=unique(xs);zs=unique(zs);
 for(var i=0;i<xs.length-1;i++)for(var j=0;j<zs.length-1;j++){
  var x0=xs[i],x1=xs[i+1],z0=zs[j],z1=zs[j+1],mid=(x0+x1)/2,zm=(z0+z1)/2;
  if(cutouts.some(function(o){return mid>o.l&&mid<o.right&&zm>o.bottom&&zm<o.top;}))continue;
  addMesh(boxGeom(x1-x0,thickness,z1-z0),0xaab0b5,r.id,parent,(x0+x1)/2,0,z0);
 }
 cutouts.forEach(function(o){
  var mid=(o.l+o.right)/2,w=o.right-o.l,h=o.top-o.bottom,z=o.bottom,frame=.055;
  if(o.source.kind==='door'){
   addMesh(boxGeom(Math.max(.02,w-.09),.048,Math.max(.05,h-.055)),0x8b725e,r.id,parent,mid,0,z);
   addMesh(boxGeom(w,thickness+.02,frame),0x7d8791,r.id,parent,mid,0,z+h-frame);
  }else{
   var d=thickness+.03;
   addMesh(boxGeom(w,d,frame),0xb5c4cc,r.id,parent,mid,0,z);
   addMesh(boxGeom(w,d,frame),0xb5c4cc,r.id,parent,mid,0,z+h-frame);
   addMesh(boxGeom(frame,d,h),0xb5c4cc,r.id,parent,o.l+frame/2,0,z);
   addMesh(boxGeom(frame,d,h),0xb5c4cc,r.id,parent,o.right-frame/2,0,z);
   addMesh(boxGeom(Math.max(.02,w-2*frame),.019,Math.max(.03,h-2*frame)),0x54889d,r.id,parent,mid,0,z+frame);
  }
 });
}
function buildObject(r){
 var group=new T.Group();group.userData.owner=r.id;group.position.set(r.x||0,r.y||0,r.z||0);group.rotation.z=(r.rot||0)*Math.PI/180;
 if(r.type==='box')addMesh(boxGeom(r.w,r.d,r.h),0x9ea9b4,r.id,group);
 if(r.type==='wall')wallGeo(r,group);
 if(r.type==='sphere'){var sphere=new T.SphereGeometry(r.radius,28,18);sphere.translate(0,0,r.radius);addMesh(sphere,0xb0b7c0,r.id,group);}
 if(r.type==='cylinder'||r.type==='cone'){
  var cone=new T.CylinderGeometry(r.type==='cone'?0:r.radius,r.radius,r.h,32);
  cone.rotateX(Math.PI/2);cone.translate(0,0,r.h/2);addMesh(cone,0x8fa9bc,r.id,group);
 }
 if(r.type==='boolean'&&Array.isArray(r.triangles)){var geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(r.triangles,3));geometry.computeVertexNormals();addMesh(geometry,0x8fa8bc,r.id,group);}
 modelRoot.add(group);
}
function redraw(){
 if(!modelRoot)return;
 modelRoot.traverse(function(o){if(o.isMesh){o.geometry.dispose();o.material.dispose();}});
 modelRoot.clear();records.forEach(buildObject);highlight();
}
function highlight(){
 if(!modelRoot)return;
 modelRoot.children.forEach(function(g){
  var active=selected.includes(g.userData.owner);
  g.traverse(function(o){if(o.isMesh)o.material.emissive.setHex(active?0x183848:0x000000);});
 });
}
function newRecord(type){
 var n=records.length;
 return {id:serial++,type:type,x:(n%4)*1.65-2.5,y:Math.floor(n/4)*2.6-1,z:0,
 rot:0,w:type==='wall'?4:2,d:type==='wall'?.22:2,h:type==='wall'?2.8:2,radius:1,openings:[]};
}
function create(type){
 if(type==='door'||type==='window'){
  var wall=records.find(function(r){return selected.includes(r.id)&&r.type==='wall';});
  if(!wall){text('Seleccioná primero un muro 3D; Door/Window se vinculan al muro seleccionado');return;}
  var opening={id:serial++,kind:type,offset:0,w:type==='door'?.9:1.2,h:type==='door'?2.1:1.25,sill:type==='door'?0:.9};
  wall.openings.push(opening);selected=[wall.id];redraw();renderProps();
  text(type.toUpperCase()+' paramétrica vinculada al muro · vano regenerado');return;
 }
 var rec=newRecord(type);records.push(rec);selected=[rec.id];redraw();renderProps();
 text(type.toUpperCase()+' creado · editable en Properties');
}
function renderProps(){
 if(!root)return;var p=root.querySelector('.props');
 if(!selected.length){p.innerHTML='<p>Seleccioná un objeto. WALL 3D: longitud, espesor y altura. Door/Window: seleccioná primero el muro. Los vanos se regeneran al editar.</p>';return;}
 if(selected.length!==1){p.innerHTML='<p>'+selected.length+' sólidos seleccionados. Booleanas: elegí exactamente dos BOX sin rotación (prototipo).</p>';return;}
 var r=records.find(function(v){return v.id===selected[0];});if(!r){p.innerHTML='';return;}
 var html='<strong>'+escapeHtml(r.type.toUpperCase()+' #'+r.id)+'</strong>';
 var keys=['x','y','z'];
 if(r.type!=='boolean')keys.push('rot');
 if(r.type==='box'||r.type==='wall')keys.push('w','d','h');
 if(r.type==='sphere')keys.push('radius');
 if(r.type==='cone'||r.type==='cylinder')keys.push('radius','h');
 var labels={x:'X (m)',y:'Y (m)',z:'Z (m)',rot:'Rotation (°)',w:r.type==='wall'?'Length (m)':'Width (m)',d:r.type==='wall'?'Thickness (m)':'Depth (m)',h:'Height (m)',radius:'Radius (m)'};
 keys.forEach(function(k){html+='<label>'+labels[k]+'<input type="number" step="any" data-key="'+k+'" value="'+escapeHtml(r[k]||0)+'"></label>';});
 if(r.type==='wall'){
  html+='<div class="detail"><strong>OPENINGS · PARAMETRIC</strong><p>Una puerta o ventana permanece ligada a su muro. Editá la posición, ancho, alto y antepecho: se reconstruye el vano.</p>';
  (r.openings||[]).forEach(function(o,i){
   html+='<div class="detail"><strong>'+escapeHtml(o.kind.toUpperCase())+' '+(i+1)+'</strong>';
   [['offset','Offset X'],['w','Width'],['h','Height'],['sill','Sill']].forEach(function(k){html+='<label>'+k[1]+'<input type="number" step="any" data-opening="'+o.id+'" data-attr="'+k[0]+'" value="'+escapeHtml(o[k[0]])+'"></label>';});
   html+='<button type="button" data-remove-opening="'+o.id+'">Remove opening</button></div>';
  });html+='</div>';
 }
 html+='<div class="detail"><button type="button" data-remove-object="'+r.id+'">Delete object</button></div>';
 p.innerHTML=html;
}
function change(e){
 var input=e.target;if(!input.matches('input[data-key],input[data-opening]'))return;
 var r=records.find(function(v){return selected.includes(v.id);});if(!r)return;
 var val=Number(input.value);if(!Number.isFinite(val))return text('Valor inválido');
 if(input.dataset.opening){
  var o=(r.openings||[]).find(function(v){return v.id===Number(input.dataset.opening);});if(!o)return;
  var key=input.dataset.attr;
  if(key==='w'||key==='h')val=clamp(val,.05,1000);
  else if(key==='sill')val=clamp(val,0,1000);
  else val=clamp(val,-10000,10000);
  o[key]=val;
 }else{
  var name=input.dataset.key;
  if(['w','d','h','radius'].includes(name))val=clamp(val,.01,1000);
  else if(name==='rot')val=clamp(val,-3600,3600);
  else val=clamp(val,-10000,10000);
  r[name]=val;
 }
 redraw();renderProps();text('Parámetros actualizados · geometría 3D regenerada');
}
function clickProps(e){
 var o=e.target.closest('[data-remove-opening]');if(o){
  var wall=records.find(function(r){return selected.includes(r.id)&&r.type==='wall';});if(!wall)return;
  wall.openings=wall.openings.filter(function(x){return x.id!==Number(o.dataset.removeOpening);});
  redraw();renderProps();text('Abertura desvinculada y vano cerrado');return;
 }
 var del=e.target.closest('[data-remove-object]');if(del){
  records=records.filter(function(r){return r.id!==Number(del.dataset.removeObject);});
  selected=[];redraw();renderProps();text('Objeto eliminado');
 }
}
/* Exact axis-aligned box boolean prototype: partition at all six cutting planes.
   It is intentionally limited to two unrotated boxes, not a general CSG solver. */
function booleanBox(kind){
 if(selected.length!==2){text('Booleanas: seleccioná dos BOX con Shift + clic');return;}
 var a=records.find(function(r){return r.id===selected[0];}),b=records.find(function(r){return r.id===selected[1];});
 if(!a||!b||a.type!=='box'||b.type!=='box'||a.rot||b.rot){text('Booleanas experimentales: solo dos BOX sin rotación');return;}
 var bounds=function(r){return [r.x-r.w/2,r.x+r.w/2,r.y-r.d/2,r.y+r.d/2,r.z,r.z+r.h];};
 var A=bounds(a),B=bounds(b),sortUnique=function(v){return v.sort(function(a,b){return a-b;}).filter(function(x,i,s){return !i||Math.abs(x-s[i-1])>1e-9;});};
 var X=sortUnique([A[0],A[1],B[0],B[1]]),Y=sortUnique([A[2],A[3],B[2],B[3]]),Z=sortUnique([A[4],A[5],B[4],B[5]]),occupied={};
 var inside=function(b,x,y,z){return x>b[0]&&x<b[1]&&y>b[2]&&y<b[3]&&z>b[4]&&z<b[5];};
 var key=function(i,j,k){return i+','+j+','+k;};
 for(var i=0;i<X.length-1;i++)for(var j=0;j<Y.length-1;j++)for(var k=0;k<Z.length-1;k++){
  var x=(X[i]+X[i+1])/2,y=(Y[j]+Y[j+1])/2,z=(Z[k]+Z[k+1])/2;
  var ia=inside(A,x,y,z),ib=inside(B,x,y,z);
  if(kind==='union'?(ia||ib):kind==='subtract'?(ia&&!ib):(ia&&ib))occupied[key(i,j,k)]=true;
 }
 var triangles=[];
 var face=function(v0,v1,v2,v3){triangles.push.apply(triangles,v0.concat(v1,v2,v0,v2,v3));};
 for(i=0;i<X.length-1;i++)for(j=0;j<Y.length-1;j++)for(k=0;k<Z.length-1;k++){
  if(!occupied[key(i,j,k)])continue;
  var x0=X[i],x1=X[i+1],y0=Y[j],y1=Y[j+1],z0=Z[k],z1=Z[k+1];
  if(!occupied[key(i-1,j,k)])face([x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0]);
  if(!occupied[key(i+1,j,k)])face([x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1]);
  if(!occupied[key(i,j-1,k)])face([x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1]);
  if(!occupied[key(i,j+1,k)])face([x0,y1,z0],[x0,y1,z1],[x1,y1,z1],[x1,y1,z0]);
  if(!occupied[key(i,j,k-1)])face([x0,y0,z0],[x0,y1,z0],[x1,y1,z0],[x1,y0,z0]);
  if(!occupied[key(i,j,k+1)])face([x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]);
 }
 if(!triangles.length){text('Operación booleana sin volumen resultante');return;}
 records=records.filter(function(r){return r.id!==a.id&&r.id!==b.id;});
 var result={id:serial++,type:'boolean',x:0,y:0,z:0,rot:0,triangles:triangles};
 records.push(result);selected=[result.id];redraw();renderProps();text('BOOLEAN '+kind.toUpperCase()+' · resultado 3D generado');
}
function orientation(){
 var views=[[-.8,.6],[0,Math.PI/2-1e-3],[0,.001],[Math.PI/2,.001]];
 var n=finite(root.dataset.view,0)%views.length,angles=views[n];root.dataset.view=String(n+1);
 orbit.az=angles[0];orbit.el=angles[1];updateCamera();text(['Isometric','Top','Front','Right'][n]+' view');
}
function action(a){
 if(['box','sphere','cylinder','cone','wall','door','window'].includes(a))return create(a);
 if(['union','subtract','intersect'].includes(a))return booleanBox(a);
 if(a==='view')return orientation();
 if(a==='obj')return exportOBJ();
 if(a==='dxf')return exportDXF();
 if(a==='json')return exportJSON();
 if(a==='open')root.querySelector('.fileInput').click();
}
function download(filename,content,type){
 var blob=new Blob([content],{type:type||'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob);
 var a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},1200);
}
function trianglesWorld(fn){
 if(!modelRoot)return;
 modelRoot.updateMatrixWorld(true);var p=new T.Vector3();
 modelRoot.traverse(function(m){
  if(!m.isMesh)return;
  var g=m.geometry,attr=g.getAttribute('position'),index=g.index;
  var n=index?index.count:attr.count;
  for(var i=0;i+2<n;i+=3){
   var points=[];
   for(var j=0;j<3;j++){var at=index?index.getX(i+j):i+j;p.fromBufferAttribute(attr,at).applyMatrix4(m.matrixWorld);points.push([p.x,p.y,p.z]);}
   fn(points,m.userData.owner);
  }
 });
}
function exportOBJ(){
 if(!modelRoot||!records.length)return text('No hay objetos 3D para exportar');
 var result=['# BLACKLINE CAD3D OBJ · triangulated surface · meters','# CAD3D parametric metadata is preserved only in .3djson'];var index=1,previous=null;
 trianglesWorld(function(points,owner){
  if(previous!==owner){result.push('o CAD3D_'+owner);previous=owner;}
  points.forEach(function(v){result.push('v '+v.map(function(x){return x.toFixed(6);}).join(' '));});
  result.push('f '+index+' '+(index+1)+' '+(index+2));index+=3;
 });
 download('blackline-cad3d.obj',result.join('\n')+'\n');text('OBJ exportado · '+(index-1)+' vértices');
}
function exportDXF(){
 if(!modelRoot||!records.length)return text('No hay geometría 3D');
 var lines=['0','SECTION','2','HEADER','9','$ACADVER','1','AC1015','9','$INSUNITS','70','6','0','ENDSEC','0','SECTION','2','ENTITIES'],count=0;
 trianglesWorld(function(points){
  lines.push('0','3DFACE','8','CAD3D');
  [10,11,12,13].forEach(function(code,n){
   var p=points[Math.min(n,2)];
   lines.push(String(code),String(p[0]),String(code+10),String(p[1]),String(code+20),String(p[2]));
  });count++;
 });
 lines.push('0','ENDSEC','0','EOF');download('blackline-cad3d.dxf',lines.join('\n')+'\n');text('DXF 3D exportado · '+count+' caras · unidades m');
}
function exportJSON(){
 var data={format:'BLACKLINE-CAD3D-1',units:'m',records:records,serial:serial};
 download('blackline-cad3d.3djson',JSON.stringify(data,null,2),'application/json');text('Modelo editable .3DJSON exportado');
}
async function readJSON(e){
 var file=e.target.files&&e.target.files[0];e.target.value='';if(!file)return;
 try{
  var data=JSON.parse(await file.text());
  if(data.format!=='BLACKLINE-CAD3D-1'||!Array.isArray(data.records)||data.records.length>1000)throw Error('Formato o contenido inválido');
  var accepted=['box','sphere','cone','cylinder','wall','boolean'];
  var sanitized=data.records.filter(function(r){return r&&accepted.includes(r.type);}).map(function(r){
   var o={id:finite(r.id,0),type:r.type,x:finite(r.x,0),y:finite(r.y,0),z:finite(r.z,0),rot:finite(r.rot,0),
    w:clamp(finite(r.w,2),.01,1000),d:clamp(finite(r.d,2),.01,1000),h:clamp(finite(r.h,2),.01,1000),
    radius:clamp(finite(r.radius,1),.01,1000),openings:[]};
   if(r.type==='wall')o.openings=(Array.isArray(r.openings)?r.openings:[]).slice(0,150).filter(function(v){return v&&['door','window'].includes(v.kind);}).map(function(v){return {id:finite(v.id,0),kind:v.kind,offset:finite(v.offset,0),w:clamp(finite(v.w,1),.05,500),h:clamp(finite(v.h,1),.05,500),sill:clamp(finite(v.sill,0),0,500)};});
   if(r.type==='boolean')o.triangles=Array.isArray(r.triangles)?r.triangles.slice(0,120000).filter(function(v){return Number.isFinite(v);}):[];
   return o;
  });
  records=sanitized;var ids=records.flatMap(function(r){return [r.id].concat((r.openings||[]).map(function(o){return o.id;}));});
  serial=Math.max(1,finite(data.serial,0),...ids)+1;selected=[];redraw();renderProps();text(records.length+' objetos 3D cargados (sin alterar CAD2D)');
 }catch(err){text('No se pudo abrir .3DJSON: '+String(err.message||err));}
}
window.BlacklineCAD3D=Object.freeze({open:open,close:close,get enabled(){return !root||!root.hidden;},get experimental(){return true;}});
/* Only install a launcher. Three.js is not requested until the explicit user click. */
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',launch,{once:true});else launch();
})();
