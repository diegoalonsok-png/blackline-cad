/* Blackline CAD3D Lab, isolated from the CAD2D drafting engine. Experimental module. */
(function(){
'use strict';
if(window.BlacklineCAD3D)return;
var T=null, root=null, renderer=null, scene=null, camera=null, modelRoot=null, raycaster=null;
var records=[], selected=[], serial=1, orbit={az:-.85,el:.55,dist:17}, target=null, frame=0, dragging=null, winDrag=null, observer=null, placing=null, wallStart=null, underlay=null, underlayGroup=null;
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
'#cad3dLab{position:fixed;left:9vw;top:9vh;width:min(1140px,82vw);height:min(730px,80vh);min-width:490px;min-height:350px;resize:none;overflow:hidden;z-index:3000;background:#10161c;color:#e0e8ef;border:1px solid #71808b;border-radius:10px;box-shadow:0 22px 85px #000c;display:flex;flex-direction:column;font:12px Inter,Segoe UI,Arial,sans-serif}',
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
'#cad3dLab .resizeGrip{position:absolute;right:0;bottom:0;width:23px;height:23px;background:linear-gradient(135deg,transparent 60%,#7f9db0 62%,transparent 66%,transparent 74%,#7f9db0 76%,transparent 80%);cursor:nwse-resize;touch-action:none;z-index:6}',
'#cad3dLab .tools button.armed{border-color:#b4cde0;background:#345369;color:#ffffff}',
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
 '<div class="divider"></div>'+tool('obj','OBJ','export')+tool('dxf','DXF 3D','export')+tool('json','.3DJSON','export')+tool('open','Open','folder')+tool('cad','Import DWG / DXF','folder')+tool('plan','Use CAD2D plan','view')+'</div>'+
 '<div class="body"><div class="view"><div class="hint">Botón de sólido → clic para colocarlo · WALL: dos puntos · Shift + clic: seleccionar</div></div>'+
 '<aside class="side"><h3>3D PROPERTIES</h3><div class="props"><p>Agregá un objeto o seleccioná una figura. Unidades: metros.</p></div></aside></div>'+
 '<footer><span class="status" role="status">Módulo separado · CAD2D intacto</span><span>BLACKLINE · 3D LAB</span></footer><div class="resizeGrip" role="button" title="Arrastrá para cambiar el tamaño de la ventana 3D" aria-label="Redimensionar ventana 3D"></div>'+
 '<input type="file" class="fileInput" accept=".3djson,.json" hidden><input type="file" class="cadInput" accept=".dwg,.dxf" hidden>';
 document.body.appendChild(root);
 root.querySelector('[data-close]').addEventListener('click',close);
 root.querySelector('.head').addEventListener('pointerdown',moveWindow);
 root.querySelector('.resizeGrip').addEventListener('pointerdown',beginResize);
 root.querySelector('.tools').addEventListener('click',function(e){var b=e.target.closest('[data-action]');if(b)action(b.dataset.action);});
 root.querySelector('.props').addEventListener('change',change);
 root.querySelector('.props').addEventListener('click',clickProps);
 root.querySelector('.fileInput').addEventListener('change',readJSON);
 root.querySelector('.cadInput').addEventListener('change',importCADFile);
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

function beginResize(e){
 if(e.button!==0)return;
 e.preventDefault();e.stopPropagation();
 var grip=e.currentTarget,rect=root.getBoundingClientRect();
 var start={id:e.pointerId,x:e.clientX,y:e.clientY,w:rect.width,h:rect.height};
 grip.setPointerCapture(e.pointerId);
 var move=function(ev){
  if(ev.pointerId!==start.id)return;
  root.style.width=clamp(start.w+ev.clientX-start.x,Math.min(490,window.innerWidth-30),window.innerWidth-root.offsetLeft-4)+'px';
  root.style.height=clamp(start.h+ev.clientY-start.y,300,window.innerHeight-root.offsetTop-4)+'px';
  resize();
 };
 var end=function(ev){if(ev.pointerId!==start.id)return;grip.removeEventListener('pointermove',move);grip.removeEventListener('pointerup',end);grip.removeEventListener('pointercancel',end);resize();};
 grip.addEventListener('pointermove',move);
 grip.addEventListener('pointerup',end);
 grip.addEventListener('pointercancel',end);
}
function setPlacement(which){
 placing=which;wallStart=null;
 if(!root)return;
 root.querySelectorAll('.tools button[data-action]').forEach(function(b){b.classList.toggle('armed',b.dataset.action===which);});
 if(which)text(''+which.toUpperCase()+': clic en el suelo para ubicar'+(which==='wall'?' el primer punto y después el segundo':which==='door'||which==='window'?' la abertura sobre un muro':' el sólido')+' · Esc cancela');
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
 underlayGroup=new T.Group();scene.add(underlayGroup);if(underlay)drawUnderlay();
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
 el.addEventListener('pointerup',function(e){if(!dragging||dragging.id!==e.pointerId)return;var select=!dragging.moved;dragging=null;if(select&&e.button===0){if(placing)placeAt(e);else selectAt(e);}});
 el.addEventListener('pointercancel',function(){dragging=null;});
 el.addEventListener('wheel',function(e){e.preventDefault();orbit.dist=clamp(orbit.dist*Math.exp(e.deltaY*.001),1.4,300);updateCamera();},{passive:false});
}

function rayAt(e){
 var rect=renderer.domElement.getBoundingClientRect();
 raycaster.setFromCamera(new T.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);
}
function groundAt(e){
 rayAt(e);var p=new T.Vector3();
 if(!raycaster.ray.intersectPlane(new T.Plane(new T.Vector3(0,0,1),0),p))return null;
 return p;
}
function wallHitAt(e){
 rayAt(e);var meshes=[];modelRoot.traverse(function(o){if(o.isMesh)meshes.push(o);});
 var hits=raycaster.intersectObjects(meshes,false);
 for(var i=0;i<hits.length;i++){
  var rec=records.find(function(r){return r.id===hits[i].object.userData.owner&&r.type==='wall';});
  if(rec)return {wall:rec,point:hits[i].point};
 }
 return null;
}
function placeAt(e){
 if(!renderer||!modelRoot)return;
 if(placing==='door'||placing==='window'){
  var hit=wallHitAt(e);
  if(!hit){text('Hacé clic sobre un muro 3D para vincular la abertura');return;}
  var rec=hit.wall;
  var dx=hit.point.x-rec.x,dy=hit.point.y-rec.y,rot=(rec.rot||0)*Math.PI/180;
  var offset=clamp(dx*Math.cos(rot)+dy*Math.sin(rot),-rec.w/2+.15,rec.w/2-.15);
  var kind=placing,op={id:serial++,kind:kind,offset:offset,w:kind==='door'?.9:1.2,h:kind==='door'?2.1:1.25,sill:kind==='door'?0:.9};
  rec.openings.push(op);selected=[rec.id];redraw();renderProps();text(kind.toUpperCase()+' vinculada: posición '+offset.toFixed(2)+' m, vano regenerado');
  setPlacement(null);return;
 }
 var pt=groundAt(e);if(!pt){text('No se pudo intersectar el plano de trabajo Z=0');return;}
 if(placing==='wall'){
  if(!wallStart){wallStart=pt.clone();text('WALL 3D: elegí el punto final');return;}
  var dx=pt.x-wallStart.x,dy=pt.y-wallStart.y;
  if(Math.hypot(dx,dy)<.05){text('WALL 3D: elegí un segundo punto distinto');return;}
  var wall=newRecord('wall');wall.x=(wallStart.x+pt.x)/2;wall.y=(wallStart.y+pt.y)/2;wall.w=Math.hypot(dx,dy);wall.rot=Math.atan2(dy,dx)*180/Math.PI;wall.z=0;
  records.push(wall);selected=[wall.id];redraw();renderProps();setPlacement(null);text('WALL 3D: muro paramétrico dibujado; longitud '+wall.w.toFixed(2)+' m');return;
 }
 var kind=placing;
 if(!['box','sphere','cylinder','cone'].includes(kind))return;
 var created=newRecord(kind);created.x=pt.x;created.y=pt.y;created.z=0;records.push(created);selected=[created.id];
 redraw();renderProps();setPlacement(null);text(kind.toUpperCase()+' ubicado en X '+pt.x.toFixed(2)+' Y '+pt.y.toFixed(2));
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
 if(['box','sphere','cylinder','cone','wall','door','window'].includes(a)){if(!renderer)return text('Primero debe cargarse el visor 3D');setPlacement(a);return;}
 if(['union','subtract','intersect'].includes(a))return booleanBox(a);
 if(a==='view')return orientation();
 if(a==='obj')return exportOBJ();
 if(a==='dxf')return exportDXF();
 if(a==='json')return exportJSON();
 if(a==='open')root.querySelector('.fileInput').click();
 if(a==='cad')root.querySelector('.cadInput').click();
 if(a==='plan')useOpenCAD2D();
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

/* Independent 2D underlay: reference geometry only, never part of the 3D solid model. */
function segmentsFromEntities(list,multiplier){
 var segments=[];
 var add=function(a,b){if(segments.length<30000)segments.push([a[0]*multiplier,a[1]*multiplier,b[0]*multiplier,b[1]*multiplier]);};
 var line=function(a,b){if(a&&b&&Number.isFinite(a.x)&&Number.isFinite(a.y)&&Number.isFinite(b.x)&&Number.isFinite(b.y))add([a.x,a.y],[b.x,b.y]);};
 var arc=function(cx,cy,rx,ry,start,end,rotation){
  if(!Number.isFinite(cx)||!Number.isFinite(cy)||!(rx>0)||!(ry>0))return;
  var span=end-start,count=Math.max(12,Math.ceil(Math.abs(span)*20)),prev=null;
  for(var i=0;i<=count;i++){
   var t=start+span*i/count,px=rx*Math.cos(t),py=ry*Math.sin(t),c=Math.cos(rotation||0),sn=Math.sin(rotation||0);
   var p={x:cx+px*c-py*sn,y:cy+px*sn+py*c};
   if(prev)line(prev,p);prev=p;
  }
 };
 (list||[]).forEach(function(e){
  if(!e)return;
  if(e.type==='line')line(e.a,e.b);
  if(e.type==='polyline'||e.type==='hatch'){
   var pts=e.pts||[];
   for(var i=1;i<pts.length;i++)line(pts[i-1],pts[i]);
   if(e.closed&&pts.length>2)line(pts[pts.length-1],pts[0]);
  }
  if(e.type==='rect'&&e.a&&e.b){
   var p=[e.a,{x:e.b.x,y:e.a.y},e.b,{x:e.a.x,y:e.b.y}];
   for(var i=0;i<4;i++)line(p[i],p[(i+1)%4]);
  }
  if(e.type==='circle'&&e.c)arc(e.c.x,e.c.y,e.r,e.r,0,Math.PI*2,0);
  if(e.type==='arc'&&e.c){
   var span=(e.a1-e.a0)%(2*Math.PI);if(span<=0)span+=2*Math.PI;
   arc(e.c.x,e.c.y,e.r,e.r,e.a0,e.a0+span,0);
  }
  if(e.type==='ellipse'&&e.c)arc(e.c.x,e.c.y,e.rx,e.ry,0,Math.PI*2,e.rotation||0);
 });
 return segments;
}
function dxfToUnderlay(raw,filename){
 if(raw.length>25000000)throw Error('DXF demasiado grande para referencia 3D');
 var lines=raw.replace(/\r/g,'').split('\n'),pairs=[];
 for(var i=0;i+1<lines.length;i+=2){var code=Number(lines[i].trim());if(Number.isInteger(code))pairs.push([code,lines[i+1].trim()]);}
 if(!pairs.length||!pairs.some(function(p){return p[1]==='SECTION';}))throw Error('Se necesita un archivo DXF ASCII reconocido');
 var insunits=0;
 for(var i=0;i<pairs.length-1;i++)if(pairs[i][0]===9&&pairs[i][1]==='$INSUNITS'){insunits=Number(pairs[i+1][1])||0;break;}
 var factor={1:.0254,2:.3048,4:.001,5:.01,6:1,14:.1}[insunits]||1;
 var entities=[],inside=false,pending=null,poly=null;
 var emit=function(item){if(item)entities.push(item);};
 var finish=function(){
  if(!pending)return;
  var a=pending;
  if(a.type==='LINE')emit({type:'line',a:{x:a.aX||0,y:a.aY||0},b:{x:a.bX||0,y:a.bY||0}});
  if(a.type==='LWPOLYLINE'&&a.pts?.length>1)emit({type:'polyline',pts:a.pts,closed:!!(a.flag&1)});
  if(a.type==='CIRCLE')emit({type:'circle',c:{x:a.cx||0,y:a.cy||0},r:a.r});
  if(a.type==='ARC')emit({type:'arc',c:{x:a.cx||0,y:a.cy||0},r:a.r,a0:(a.a0||0)*Math.PI/180,a1:(a.a1||0)*Math.PI/180});
  if(a.type==='VERTEX'&&poly)poly.pts.push({x:a.cx||0,y:a.cy||0});
  if(a.type==='3DFACE'&&a.pts?.length>2)emit({type:'polyline',pts:a.pts,closed:true});
  pending=null;
 };
 for(var i=0;i<pairs.length;i++){
  var code=pairs[i][0],val=pairs[i][1];
  if(code===0){
   finish();
   if(val==='SECTION'){inside=pairs[i+1]?.[1]==='ENTITIES';continue;}
   if(val==='ENDSEC'){inside=false;continue;}
   if(!inside)continue;
   if(val==='SEQEND'){if(poly&&poly.pts.length>1)emit(poly);poly=null;continue;}
   if(val==='POLYLINE'){poly={type:'polyline',pts:[],closed:false};pending={type:'POLYLINE'};continue;}
   pending={type:val,pts:[]};continue;
  }
  if(!inside||!pending)continue;
  var n=Number(val);
  if(code===10){if(pending.type==='LWPOLYLINE'||pending.type==='3DFACE')pending.pts.push({x:n,y:0});else if(pending.type==='LINE')pending.aX=n;else pending.cx=n;}
  if(code===20){if(pending.type==='LWPOLYLINE'||pending.type==='3DFACE'){if(pending.pts.length)pending.pts[pending.pts.length-1].y=n;}else if(pending.type==='LINE')pending.aY=n;else pending.cy=n;}
  if(code===11&&pending.type==='LINE')pending.bX=n;
  if(code===21&&pending.type==='LINE')pending.bY=n;
  if(code===40)pending.r=n;
  if(code===50)pending.a0=n;
  if(code===51)pending.a1=n;
  if(code===70){pending.flag=n;if(pending.type==='POLYLINE'&&poly)poly.closed=!!(n&1);}
 }
 finish();
 if(poly&&poly.pts.length>1)emit(poly);
 var segments=segmentsFromEntities(entities,factor);
 if(!segments.length)throw Error('El DXF no contiene líneas, arcos o polilíneas 2D compatibles para la base 3D');
 return {name:filename,segments:segments};
}
function drawUnderlay(){
 if(!underlayGroup||!T)return;
 underlayGroup.children.forEach(function(o){if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});underlayGroup.clear();
 if(!underlay||!underlay.segments.length)return;
 var data=[];
 underlay.segments.forEach(function(seg){data.push(seg[0],seg[1],.006,seg[2],seg[3],.006);});
 var geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(data,3));
 var line=new T.LineSegments(geo,new T.LineBasicMaterial({color:0x86aabc,transparent:true,opacity:.86,depthTest:false}));
 line.renderOrder=2;underlayGroup.add(line);
 var xs=[],ys=[];underlay.segments.forEach(function(s){xs.push(s[0],s[2]);ys.push(s[1],s[3]);});
 var minX=Math.min.apply(null,xs),maxX=Math.max.apply(null,xs),minY=Math.min.apply(null,ys),maxY=Math.max.apply(null,ys);
 if(camera){target.set((minX+maxX)/2,(minY+maxY)/2,.7);orbit.dist=clamp(Math.max(maxX-minX,maxY-minY)*1.6,3,450);updateCamera();}
}
function useOpenCAD2D(){
 var bridge=window.BlacklineCAD3DBridge;
 if(!bridge||typeof bridge.snapshot!=='function')return text('Puente con CAD2D no disponible: recargá la página');
 try{
  var data=bridge.snapshot();
  var factor={mm:.001,cm:.01,m:1,in:.0254,ft:.3048}[data.unit]||1;
  var visible=new Set((data.layers||[]).filter(function(l){return l.visible!==false&&!l.frozen;}).map(function(l){return l.id;}));
  var entities=(data.entities||[]).filter(function(e){return visible.has(e.layer)&&!e.cadHidden;});
  var segments=segmentsFromEntities(entities,factor);
  if(!segments.length)return text('El dibujo 2D abierto no contiene líneas o polilíneas para mostrar');
  underlay={name:'Plano CAD2D abierto',segments:segments};drawUnderlay();
  text('Referencia CAD2D visible: '+segments.length+' segmentos · se modela encima sin cambiar el 2D');
 }catch(e){text('No se pudo leer el plano 2D: '+(e.message||e));}
}
async function importCADFile(ev){
 var file=ev.target.files&&ev.target.files[0];ev.target.value='';if(!file)return;
 try{
  var raw;
  if(/\.dwg$/i.test(file.name)){
   var bridge=window.BlacklineCAD3DBridge;
   if(!bridge||typeof bridge.convertDWG!=='function')throw Error('El servicio DWG del CAD2D no está disponible');
   text('Convirtiendo DWG mediante el servicio existente de CAD2D…');
   raw=await bridge.convertDWG(file);
   if(!raw){text('Importación DWG cancelada');return;}
  }else if(/\.dxf$/i.test(file.name)){
   var bridge=window.BlacklineCAD3DBridge;
   raw=bridge?.decodeDXF?await bridge.decodeDXF(file):await file.text();
  }else throw Error('Solo DWG y DXF');
  underlay=dxfToUnderlay(raw,file.name);drawUnderlay();
  text('Plano '+file.name+' importado como referencia: '+underlay.segments.length+' segmentos · CAD2D intacto');
 }catch(e){text('Error importando plano: '+(e.message||e));console.warn('CAD3D import',e);}
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
  serial=ids.reduce(function(max,id){return Math.max(max,finite(id,0));},Math.max(1,finite(data.serial,0)))+1;selected=[];redraw();renderProps();text(records.length+' objetos 3D cargados (sin alterar CAD2D)');
 }catch(err){text('No se pudo abrir .3DJSON: '+String(err.message||err));}
}
document.addEventListener('keydown',function(e){
 if(e.key==='Escape'&&root&&!root.hidden&&placing){setPlacement(null);text('Colocación 3D cancelada');}
});
window.BlacklineCAD3D=Object.freeze({open:open,close:close,get enabled(){return !!root&&!root.hidden;},get experimental(){return true;}});
/* Only install a launcher. Three.js is not requested until the explicit user click. */
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',launch,{once:true});else launch();
})();
