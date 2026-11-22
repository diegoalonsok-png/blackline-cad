/* Original accessible ViewCube UI for Blackline CAD3D. No CAD geometry changes. */
(function(global){
'use strict';
if(global.BlacklineCAD3DViewCube)return;
var mounted=false;
var css=[
'#cad3dLab .viewNav{width:207px}',
'#cad3dLab .viewNavTop{height:128px;gap:4px;align-items:flex-start}',
'#cad3dLab .viewCube{width:134px;height:125px;flex:none;position:relative;margin:0;transform:none;transform-origin:center;filter:drop-shadow(0 5px 6px #0007)}',
'#cad3dLab .viewCube svg.viewCubeArt{width:132px;height:124px;display:block;overflow:visible}',
'#cad3dLab .viewCube .cubeFace,#cad3dLab .viewCube .cubeFace[data-view-preset]{position:static;display:inline;width:auto;height:auto;left:auto;top:auto;border:0;background:none;transform:none;padding:0;cursor:pointer;color:inherit;font:inherit}',
'#cad3dLab .viewCube .cubeFace polygon{stroke:#93b0c3;stroke-width:1.4}',
'#cad3dLab .viewCube [data-cube-face=top] polygon{fill:#617a89}',
'#cad3dLab .viewCube [data-cube-face=front] polygon{fill:#3e5b6e}',
'#cad3dLab .viewCube [data-cube-face=right] polygon{fill:#293f50}',
'#cad3dLab .viewCube .cubeFace:hover polygon,#cad3dLab .viewCube .cubeFace:focus-visible polygon,#cad3dLab .viewCube .cubeFace[aria-pressed=true] polygon{fill:#5b8da7;stroke:#c7efff;stroke-width:2}',
'#cad3dLab .viewCube .cubeFace text{fill:#f1f8ff;font:700 9px Inter,Arial,sans-serif;text-anchor:middle;pointer-events:none;paint-order:stroke;stroke:#203442;stroke-width:.5px}',
'#cad3dLab .viewCube .cubeCorner{cursor:pointer;outline:0}',
'#cad3dLab .viewCube .cubeCorner circle{fill:#819aaa;stroke:#c7e6f7;stroke-width:1}',
'#cad3dLab .viewCube .cubeCorner:hover circle,#cad3dLab .viewCube .cubeCorner:focus-visible circle{fill:#d4f2ff;stroke:#fff;stroke-width:2}',
'#cad3dLab .viewCube .cubeCompass{font:700 8px Inter,Arial,sans-serif;fill:#adcadb;text-anchor:middle;pointer-events:none}',
'#cad3dLab .viewCube .cubeArrow{position:absolute;top:55px;width:18px;height:23px;border:1px solid #638399;border-radius:6px;background:#203c4ddd;color:#e5f6ff;display:grid;place-items:center;padding:0;font-size:18px;cursor:pointer}',
'#cad3dLab .viewCube .cubeArrow[data-cube-spin="-1"]{left:0}',
'#cad3dLab .viewCube .cubeArrow[data-cube-spin="1"]{right:0}',
'#cad3dLab .viewCube .cubeHome{position:absolute;left:56px;bottom:0;width:22px;height:21px;border:1px solid #6c8ba0;border-radius:6px;background:#203c4ddd;color:#e5f6ff;display:grid;place-items:center;padding:0;font-size:15px;cursor:pointer}',
'#cad3dLab .viewCube .cubeArrow:hover,#cad3dLab .viewCube .cubeHome:hover{background:#426b82}',
'#cad3dLab .viewNavTop .orbitBall{width:45px;height:45px;margin-top:32px}',
'#cad3dLab .viewNavTop .orbitBall svg{width:32px;height:32px;left:5px;top:5px}',
'#cad3dLab .viewNavTop .orbitBall .orbitBallDot{left:20px;top:20px}',
'#cad3dLab .view.planRulers .viewNav{top:23px;left:26px}'
].join('\n');
var markup=[
'<svg class="viewCubeArt" viewBox="0 0 132 124" role="group" aria-label="Cubo 3D con caras y vértices seleccionables">',
'<circle cx="66" cy="59" r="51" fill="#192b38" stroke="#5a7b92" stroke-width="1.2"/>',
'<path d="M16 59H116 M66 8V109" stroke="#385668" stroke-width=".8" fill="none"/>',
'<text class="cubeCompass" x="66" y="14">N</text><text class="cubeCompass" x="119" y="62">E</text>',
'<text class="cubeCompass" x="66" y="114">S</text><text class="cubeCompass" x="13" y="62">W</text>',
'<g class="cubeFace" data-cube-face="top" data-view-preset="top" role="button" tabindex="0" aria-label="Planta"><polygon points="66,23 103,45 66,66 29,45"/><text x="66" y="47">TOP</text></g>',
'<g class="cubeFace" data-cube-face="front" data-view-preset="front" role="button" tabindex="0" aria-label="Frontal"><polygon points="29,45 66,66 66,100 29,79"/><text x="47" y="76">FRONT</text></g>',
'<g class="cubeFace" data-cube-face="right" data-view-preset="right" role="button" tabindex="0" aria-label="Derecha"><polygon points="66,66 103,45 103,79 66,100"/><text x="85" y="76">RIGHT</text></g>',
'<g class="cubeCorner" data-view-preset="iso" role="button" tabindex="0" aria-label="Vista isométrica"><circle cx="66" cy="23" r="5"/></g>',
'<g class="cubeCorner" data-view-preset="nw" role="button" tabindex="0" aria-label="Axonométrica noroeste"><circle cx="29" cy="45" r="5"/></g>',
'<g class="cubeCorner" data-view-preset="ne" role="button" tabindex="0" aria-label="Axonométrica noreste"><circle cx="103" cy="45" r="5"/></g>',
'<g class="cubeCorner" data-view-preset="sw" role="button" tabindex="0" aria-label="Axonométrica suroeste"><circle cx="66" cy="100" r="5"/></g>',
'</svg>',
'<button class="cubeArrow" type="button" data-cube-spin="-1" aria-label="Rotar vista a la izquierda" title="Girar 90 grados a la izquierda">‹</button>',
'<button class="cubeArrow" type="button" data-cube-spin="1" aria-label="Rotar vista a la derecha" title="Girar 90 grados a la derecha">›</button>',
'<button class="cubeHome" type="button" data-view-preset="iso" aria-label="Vista isométrica" title="Vista isométrica">⌂</button>'
].join('');
function mount(root,control){
 var cube=root&&root.querySelector('.viewCube');if(!cube)return false;
 if(cube.dataset.cubeModern==='yes')return true;
 if(!mounted){var style=document.createElement('style');style.id='cad3dModernViewCube';style.textContent=css;document.head.appendChild(style);mounted=true;}
 cube.dataset.cubeModern='yes';cube.setAttribute('role','group');cube.setAttribute('aria-label','Cubo de navegación 3D');
 cube.innerHTML=markup;
 cube.addEventListener('click',function(ev){
  var button=ev.target.closest('[data-cube-spin]');
  if(button){ev.stopPropagation();control.rotate(Number(button.dataset.cubeSpin));}
 });
 cube.addEventListener('keydown',function(ev){
  if(!['Enter',' '].includes(ev.key))return;
  var item=ev.target.closest('.cubeFace[data-view-preset],.cubeCorner[data-view-preset]');
  if(item){ev.preventDefault();ev.stopPropagation();control.setPreset(item.dataset.viewPreset);}
 });
 return true;
}
function sync(root,state){
 var cube=root&&root.querySelector('.viewCube[data-cube-modern=yes]');if(!cube||!state)return;
 var az=Number(state.az)||0,sector=((Math.floor((az+Math.PI/2)/(Math.PI/2))%4)+4)%4;
 var cfg=[['FRONT','RIGHT','front','right'],['RIGHT','BACK','right','back'],
          ['BACK','LEFT','back','left'],['LEFT','FRONT','left','front']][sector];
 var first=cube.querySelector('[data-cube-face=front]'),second=cube.querySelector('[data-cube-face=right]'),top=cube.querySelector('[data-cube-face=top]');
 if(!first||!second||!top)return;
 first.dataset.viewPreset=cfg[2];first.querySelector('text').textContent=cfg[0];first.setAttribute('aria-label',cfg[0]);
 second.dataset.viewPreset=cfg[3];second.querySelector('text').textContent=cfg[1];second.setAttribute('aria-label',cfg[1]);
 top.dataset.viewPreset=state.activeView==='bottom'?'bottom':'top';
 top.querySelector('text').textContent=state.activeView==='bottom'?'BOTTOM':'TOP';
 top.setAttribute('aria-label',state.activeView==='bottom'?'Inferior':'Planta');
 cube.querySelectorAll('[data-view-preset]').forEach(function(el){el.setAttribute('aria-pressed',String(el.dataset.viewPreset===state.activeView));});
}
var api=Object.freeze({mount:mount,sync:sync});
global.BlacklineCAD3DViewCube=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
