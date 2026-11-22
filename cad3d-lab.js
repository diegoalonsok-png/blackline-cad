/* Blackline CAD3D Lab, isolated from the CAD2D drafting engine. Experimental module. */
(function(){
'use strict';
if(window.BlacklineCAD3D)return;
var T=null, root=null, renderer=null, scene=null, camera=null, modelRoot=null, raycaster=null;
var records=[], selected=[], serial=1, orbit={az:-.85,el:.55,dist:17}, target=null, frame=0, fallbackFrame=0, dragging=null, winDrag=null, observer=null, placing=null, firstPoint=null, cursorPoint=null, underlay=null, underlayGroup=null, restoredWindow=null, fallbackCanvas=null, fallbackCtx=null, cad3dLoading=false, activeCategory='wall', activePreset={wall:'exterior-20',door:'single-swing',window:'fixed',slab:'floor-20',opening:'wall-opening'};
var draftModes={ortho:true,osnap:true,grid:true,dyn:false};
var layers=[{id:'0',name:'0',visible:true,locked:false}],currentLayer='0';
var MODEL_BACKGROUND='#202a32', MODEL_GRID='#384b56';
var sunSettings={enabled:true,azimuth:135,elevation:45,softness:2.5,onGround:true,onFaces:true},sunLight=null,sunGround=null,sunAmbient=null,sunFill=null;
var viewMode='perspective',activeView='perspective',renderStyle='shaded-edges',perspectiveCamera=null,orthographicCamera=null,gridHelper=null,axesHelper=null;
var viewPresets=[
 ['perspective','Perspectiva libre','perspective',-.85,.55],
 ['iso','Isométrica','ortho',-Math.PI/4,Math.atan(1/Math.sqrt(2))],
 ['axo','Axonométrica','ortho',-Math.PI/3,.45],
 ['top','Planta','ortho',0,Math.PI/2],
 ['bottom','Inferior','ortho',0,-Math.PI/2],
 ['front','Frontal','ortho',-Math.PI/2,0],
 ['back','Posterior','ortho',Math.PI/2,0],
 ['left','Izquierda','ortho',Math.PI,0],
 ['right','Derecha','ortho',0,0],
 ['ne','Axonométrica NE','ortho',Math.PI/4,.56],
 ['nw','Axonométrica NO','ortho',3*Math.PI/4,.56],
 ['se','Axonométrica SE','ortho',-Math.PI/4,.56],
 ['sw','Axonométrica SO','ortho',-3*Math.PI/4,.56],
 ['walk','Peatonal 1,65 m','walk',-Math.PI/2,.02]
];
var icons={
 cube:'<path d="m12 2 9 5-9 5-9-5 9-5ZM3 7v10l9 5V12M21 7v10l-9 5"/>',
 sphere:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
 cylinder:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5"/>',
 cone:'<path d="m12 2-9 17m9-17 9 17"/><ellipse cx="12" cy="19" rx="9" ry="3"/>',
 wall:'<path d="M3 20V7l18-4v13L3 20ZM3 12l18-4"/>',
 door:'<path d="M4 21V3h16v18M8 21V6h8v15M14 13h.1"/>',
 opening:'<path d="M3 21V3h18v18M7 21V7h10v14" stroke-dasharray="3 2"/>',
 window:'<rect x="3" y="3" width="18" height="18"/><path d="M12 3v18M3 12h18"/>',
 slab:'<path d="M2 9 17 4l5 5-15 6-5-6ZM2 9v5l5 6v-5M7 15l15-6v5l-15 6"/>',
 floor:'<path d="M2 9 17 4l5 5-15 6-5-6M2 9v5l5 6v-5M7 15v5l15-6V9M7 20l15-6"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.5 1.5m11.2 11.2 1.5 1.5M19.1 4.9l-1.5 1.5M6.4 17.6l-1.5 1.5"/>',
 union:'<rect x="2" y="8" width="12" height="12"/><rect x="10" y="3" width="12" height="12"/>',
 subtract:'<rect x="2" y="7" width="16" height="14"/><path d="M10 3h12v11h-7" stroke-dasharray="3 2"/>',
 intersect:'<rect x="2" y="8" width="14" height="12"/><rect x="9" y="3" width="13" height="12"/><path d="M9 8h7v7H9z" fill="currentColor" fill-opacity=".2"/>',
 export:'<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>',
 folder:'<path d="M3 7V4h7l3 3h8v13H3z"/>',
 move:'<path d="M12 2v20M2 12h20m-7-7-3-3-3 3m0 14 3 3 3-3M5 9l-3 3 3 3m14 0 3-3-3-3"/>',
 copy:'<rect x="7" y="7" width="14" height="14" rx="2"/><path d="M17 3H5a2 2 0 0 0-2 2v12"/>',
 rotate:'<path d="M4 9a8 8 0 1 1 0 6m0-6V3m0 6h6"/>',
 erase:'<path d="M4 7h16M9 7V4h6v3m3 0-1 14H7L6 7M10 10v7m4-7v7"/>',
 dist:'<path d="M3 16 16 3l5 5L8 21zM8 11l2 2m1-5 2 2m1-5 2 2"/>',
 view:'<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/>'
};
var css=`
.app .tabbar #cad3dOpen {
 align-self:center; justify-content:center; flex:none; min-width:54px; height:24px!important;
 padding:0 15px!important; border:1px solid var(--cad-ui-edge)!important; border-radius:6px!important;
 background:var(--cad-ui-raised)!important; color:var(--cad-ui-text)!important;
 font-size:12px!important; font-weight:700;
}
.app .tabbar #cad3dOpen:hover { filter:brightness(1.14) }
.app .tabbar #cad3dOpen[aria-pressed=true] {
 outline:2px solid var(--bl-accent,#8bc7de)!important; outline-offset:-2px;
}
.app .tabbar #cad3dOpen:focus-visible { outline-offset:-2px }
#cad3dLab {
 position:fixed; left:9vw; top:9vh; width:min(1140px,82vw); height:min(730px,80vh); min-width:490px;
 min-height:350px; overflow:hidden; z-index:9050; background:var(--cad-ui-base); color:var(--cad-ui-text);
 border:1px solid var(--cad-ui-edge); border-radius:12px; box-shadow:0 22px 85px #0009;
 display:flex; flex-direction:column; font:12px Inter,Segoe UI,Arial,sans-serif;
}
#cad3dLab[hidden] { display:none!important }
#cad3dLab * { box-sizing:border-box }
#cad3dLab .head {
 height:36px; flex:0 0 36px; background:var(--cad-ui-toolbar); display:flex; align-items:center;
 gap:9px; padding:0 10px; border-bottom:1px solid var(--cad-ui-edge); cursor:grab;
 touch-action:none; user-select:none;
}
#cad3dLab .head strong { letter-spacing:.5px; white-space:nowrap }
#cad3dLab .head .stretch { flex:1 }
#cad3dLab .head .btn { width:26px; height:26px; padding:0; flex:none }
#cad3dLab .tools {
 display:flex; align-items:center; gap:5px; padding:5px 7px; min-height:43px;
 background:var(--cad-ui-toolbar); border-bottom:1px solid var(--cad-ui-edge);
 position:relative; z-index:2;
}
#cad3dLab .toolGroup { display:flex; align-items:center; gap:4px; flex:none }
#cad3dLab .toolGroup strong { color:var(--cad-ui-muted); font-size:10px; padding:0 3px }
#cad3dLab .solidTools {
 display:flex; align-items:center; gap:4px; flex:1; min-width:0; overflow-x:auto;
 scrollbar-width:thin; padding:2px;
}
#cad3dLab .tools .btn, #cad3dLab .ioMenu summary {
 display:inline-flex; align-items:center; gap:5px; flex:none; min-height:29px; padding:4px 7px;
 white-space:nowrap; cursor:pointer; font:11px Inter,Segoe UI,Arial,sans-serif;
}
#cad3dLab .tools svg { width:17px; height:17px; flex:none }
#cad3dLab .tools .divider { height:22px; border-left:1px solid var(--cad-ui-edge); margin:0 3px }
#cad3dLab .ioMenu { position:relative; flex:none }
#cad3dLab .ioMenu summary::-webkit-details-marker { display:none }
#cad3dLab .ioMenu summary::after { content:"▾"; color:var(--cad-ui-muted); font-size:10px }
#cad3dLab .ioMenu > div {
 position:absolute; top:calc(100% + 6px); right:0; display:grid; gap:3px;
 width:max-content; padding:5px; background:var(--cad-ui-base);
 border:1px solid var(--cad-ui-edge); border-radius:9px; box-shadow:0 8px 22px #0006;
}
#cad3dLab .ioMenu > div .btn { text-align:left }
#cad3dLab .body { position:relative; flex:1; min-height:0; display:flex }
#cad3dLab .archPalette {
 position:absolute; z-index:2; top:10px; right:10px; width:340px; height:340px;
 max-width:calc(100% - 16px); max-height:calc(100% - 16px); display:flex; flex-direction:column;
 background:#141c24; color:#e1ebf4; border:1px solid #7093a5; border-radius:16px;
 box-shadow:0 12px 35px #0008;
}
#cad3dLab .archPalette[hidden] { display:none }
.app.bl-light #cad3dLab .archPalette { background:var(--cad-ui-base); color:var(--cad-ui-text); border-color:var(--cad-ui-edge) }
#cad3dLab .archTitle {
 display:flex; flex-wrap:wrap; align-items:center; gap:6px; padding:12px 14px;
 border-bottom:1px solid var(--cad-ui-edge); cursor:move; user-select:none; touch-action:none;
}
#cad3dLab .archTitle h2 { flex:0 0 100%; font-size:14px; letter-spacing:.06em; margin:0 0 1px }
#cad3dLab .archSizes { display:flex; flex-wrap:wrap; gap:4px; flex:1 }
#cad3dLab .archTitle .btn { padding:3px 8px; min-height:25px; font-size:11px }
#cad3dLab .archTools { display:flex; flex-wrap:wrap; gap:4px; padding:10px 14px 8px }
#cad3dLab .archTools .btn { padding:3px 8px; font-size:11px; border-radius:12px!important }
#cad3dLab .archTools [aria-pressed=true], #cad3dLab .archLaunch[aria-expanded=true] {
 border-color:var(--bl-accent,#91bfd5)!important; outline:1px solid var(--bl-accent,#91bfd5); outline-offset:-1px;
}
#cad3dLab .catalogItems {
 display:grid; grid-template-columns:repeat(auto-fill,minmax(min(100%,120px),1fr)); align-content:start;
 gap:8px; padding:0 14px 12px; overflow:auto; flex:1; min-height:0;
}
#cad3dLab .catalogItems .btn {
 display:flex; flex-direction:column; align-items:stretch; gap:5px; min-width:0; padding:8px;
 text-align:left; white-space:normal; font-size:11px;
}
#cad3dLab .catalogItems svg { width:100%; height:54px; margin:1px 0 3px }
#cad3dLab .catalogSearch { display:block; width:calc(100% - 28px);margin:0 14px 9px;padding:7px 9px;border:1px solid var(--cad-ui-edge);border-radius:6px;background:var(--cad-ui-base,#101920);color:var(--cad-ui-text,#e4edf4) }
#cad3dLab .catalogItems .modelPreview {background:#d4e4e9;border-radius:5px;padding:4px;display:grid;place-items:center}
#cad3dLab .catalogItems .modelPreview svg {height:56px;margin:0;stroke:#314b59;stroke-width:2;fill:none}
#cad3dLab .catalogItems .btn[data-selected=true] {border-color:var(--bl-accent,#91bfd5);background:#2c4755}
#cad3dLab .catalogItems small { color:var(--cad-ui-muted); font-size:10px }
#cad3dLab .tools .armed, #cad3dLab .tools .sketchActive, #cad3dLab .archLaunch.armed {
 outline:2px solid var(--bl-accent,#8bc7de)!important; outline-offset:-2px;
}
#cad3dLab .archGrip { position:absolute; z-index:3; touch-action:none }
#cad3dLab .archGrip.e, #cad3dLab .archGrip.w { top:13px; bottom:13px; width:10px; cursor:ew-resize }
#cad3dLab .archGrip.n, #cad3dLab .archGrip.s { left:13px; right:13px; height:10px; cursor:ns-resize }
#cad3dLab .archGrip.e { right:-5px }
#cad3dLab .archGrip.w { left:-5px }
#cad3dLab .archGrip.n { top:-5px }
#cad3dLab .archGrip.s { bottom:-5px }
#cad3dLab .archGrip.ne, #cad3dLab .archGrip.nw, #cad3dLab .archGrip.se, #cad3dLab .archGrip.sw { width:18px; height:18px }
#cad3dLab .archGrip.ne { right:-5px; top:-5px; cursor:nesw-resize }
#cad3dLab .archGrip.nw { left:-5px; top:-5px; cursor:nwse-resize }
#cad3dLab .archGrip.se { right:-5px; bottom:-5px; cursor:nwse-resize }
#cad3dLab .archGrip.sw { left:-5px; bottom:-5px; cursor:nesw-resize }
#cad3dLab .archGrip.e:hover, #cad3dLab .archGrip.w:hover {
 background:linear-gradient(#9adff3aa,#9adff3aa) center / 2px 60% no-repeat;
}
#cad3dLab .archGrip.n:hover, #cad3dLab .archGrip.s:hover {
 background:linear-gradient(#9adff3aa,#9adff3aa) center / 60% 2px no-repeat;
}
#cad3dLab .archGrip.ne:hover, #cad3dLab .archGrip.nw:hover,
#cad3dLab .archGrip.se:hover, #cad3dLab .archGrip.sw:hover { background:#8bc7de22; border-radius:4px }
#cad3dLab .archGrip.se::after {
 content:""; position:absolute; right:5px; bottom:5px; width:10px; height:10px;
 border-right:1px solid #92afbe; border-bottom:1px solid #92afbe; border-radius:0 0 5px 0;
}
#cad3dLab .view { position:relative; flex:1; min-width:110px; overflow:hidden; background:#202a32 }
#cad3dLab .view canvas { display:block; width:100%; height:100%; touch-action:none; cursor:grab }
#cad3dLab .view canvas:active { cursor:grabbing }
#cad3dLab .view.placing canvas { cursor:crosshair }
#cad3dLab .styleControl {position:relative;flex:none}
#cad3dLab .stylePanel {position:absolute;right:0;top:calc(100% + 6px);z-index:32;width:360px;max-width:min(90vw,360px);padding:12px;border:1px solid #536779;border-radius:11px;background:#141e28;color:#e8f0f6;box-shadow:0 16px 40px #000b}
#cad3dLab .stylePanel[hidden]{display:none!important}
#cad3dLab .stylePanel header {font-size:12px;font-weight:700;letter-spacing:.06em;margin-bottom:10px}
#cad3dLab .styleGrid {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
#cad3dLab .styleGrid button {display:flex;align-items:center;gap:9px;text-align:left;min-width:0;padding:7px;background:#202d39;border:1px solid #435667;border-radius:8px;color:#dbe7ef;cursor:pointer}
#cad3dLab .styleGrid button[aria-pressed=true]{border-color:#9ccfe5;box-shadow:inset 0 0 0 1px #9ccfe5;background:#294252}
#cad3dLab .styleGrid button:hover{background:#354758}
#cad3dLab .styleGrid small{display:block;font-size:10px;color:#aabfcb}
#cad3dLab .styleThumb{flex:none;display:block;width:44px;height:38px;border:1px solid #687c8c;border-radius:5px;background:#edf1ed;position:relative;overflow:hidden}
#cad3dLab .styleThumb::before{content:"";position:absolute;left:13px;top:8px;width:20px;height:20px;transform:skewY(-18deg);background:#9baab6;border:1px solid #475a68}
#cad3dLab .styleThumb[data-kind="wire2d"]::before,#cad3dLab .styleThumb[data-kind="wire3d"]::before{background:transparent;border:2px solid #475a68;box-shadow:4px -4px 0 -2px #fff,4px -4px 0 0 #475a68}
#cad3dLab .styleThumb[data-kind="hidden"]::before{background:#f8f8f4;border-color:#29333c}
#cad3dLab .styleThumb[data-kind="shaded"]::before{background:#9aaeb5;border-color:transparent}
#cad3dLab .styleThumb[data-kind="shaded-edges"]::before{background:#9aaeb5;border-color:#27323a}
#cad3dLab .styleThumb[data-kind="realistic"]::before{background:linear-gradient(135deg,#d2b998,#8c7358);border-color:#654a38}
#cad3dLab .styleThumb[data-kind="monochrome"]::before{background:#e2e2e2;border-color:#777}
#cad3dLab .styleThumb[data-kind="xray"]::before{background:#96c6d477;border:1px dashed #547d90}
#cad3dLab .sunControl {position:relative;flex:none}
#cad3dLab .sunPanel {position:absolute;top:calc(100% + 6px);right:0;z-index:30;width:220px;padding:12px;display:grid;gap:9px;background:var(--cad-ui-base,#17212a);border:1px solid var(--cad-ui-edge,#526579);border-radius:10px;box-shadow:0 12px 35px #0009;color:var(--cad-ui-text,#e9eef4)}
#cad3dLab .sunPanel[hidden]{display:none!important}
#cad3dLab .sunPanel label{display:grid;gap:3px;font-size:11px}
#cad3dLab .sunPanel input[type=range]{width:100%}
#cad3dLab .sunPanel .sunToggle{display:flex;align-items:center;gap:7px}
#cad3dLab .sunPanel .sunPresetRow{display:flex;gap:5px}
#cad3dLab .sunPanel .sunPresetRow button{flex:1;min-width:0;font-size:10px}
#cad3dLab .tools [data-action] svg,#cad3dLab .sunLaunch svg{stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round}
#cad3dLab .viewShortcuts{position:absolute;bottom:12px;left:12px;z-index:3;display:flex;gap:5px}
#cad3dLab .viewShortcuts button{background:#15212bcc;color:#e4ecf3;border:1px solid #536779;border-radius:6px;padding:5px 9px;cursor:pointer;font:11px Inter,Arial,sans-serif}
#cad3dLab .viewShortcuts button:hover{background:#304354}
#cad3dLab .dynReadout {position:absolute;z-index:4;pointer-events:none;display:none;padding:5px 8px;border:1px solid #8abed3;border-radius:6px;background:#17242deb;color:#eaf5fa;font:11px ui-monospace,Consolas,monospace;white-space:nowrap;box-shadow:0 3px 12px #0006}
#cad3dLab .dynReadout[data-show="true"] {display:block}
#cad3dLab .solidCheck {font-size:11px;color:var(--cad-ui-muted);margin-top:8px}
#cad3dLab .placementGuide {
 position:absolute; z-index:1; height:0; border-top:1px dashed #f2ca79;
 transform-origin:0 0; pointer-events:none;
}
#cad3dLab .placementGuide::before {
 content:""; position:absolute; top:-4px; left:-3px; width:7px; height:7px;
 border:1px solid #ffe0a0; border-radius:50%; background:#26333d;
}
#cad3dLab .view.sketchView { background:#f0eee6 }
#cad3dLab .viewNav {
 position:absolute; top:8px; left:8px; z-index:1; width:101px;
 display:grid; justify-items:start; gap:4px; pointer-events:none;
}
#cad3dLab .viewNav button, #cad3dLab .viewNav select { pointer-events:auto }
#cad3dLab .viewCube { position:relative; width:83px; height:81px; transform:scale(.72); transform-origin:top left; margin-bottom:-23px;filter:drop-shadow(0 5px 5px #0b162a7c) }
#cad3dLab .viewNav {width:218px;gap:7px;padding:8px;border:1px solid #6d8b9e66;border-radius:15px;background:#182936ab;box-shadow:0 7px 20px #09131e40;backdrop-filter:blur(5px)}
#cad3dLab .viewNavTop {display:flex;gap:11px;align-items:flex-start;pointer-events:none;height:69px}
#cad3dLab .viewNavTop > * {pointer-events:auto}
#cad3dLab .orbitBall {width:52px;height:52px;margin-top:1px;border:1px solid #aecce0;border-radius:50%;color:#effaff;cursor:grab;touch-action:none;user-select:none;position:relative;flex:none;background:radial-gradient(circle at 27% 19%,#a9d8e7,#416e87 33%,#203f56 67%,#14202e 96%);box-shadow:inset -5px -7px 10px #07152188,0 3px 8px #0007,0 0 0 3px #6ca7c322;transition:border-color .15s,box-shadow .15s}
#cad3dLab .orbitBall:active,#cad3dLab .orbitBall[data-dragging=true]{cursor:grabbing;border-color:#bce6f5}
#cad3dLab .orbitBall svg{width:36px;height:36px;position:absolute;left:7px;top:7px;fill:none;stroke:currentColor;stroke-width:1.3;pointer-events:none}
#cad3dLab .orbitBall:focus-visible{outline:2px solid #a8def6;outline-offset:2px}
#cad3dLab .orbitBall .orbitBallDot{position:absolute;left:23px;top:23px;width:5px;height:5px;border-radius:50%;background:#d9f3ff;pointer-events:none}
#cad3dLab .view.planRulers .viewNav { top:23px; left:26px }
#cad3dLab .rulerX, #cad3dLab .rulerY {
 position:absolute; z-index:1; overflow:hidden; pointer-events:none;
 background:var(--cad-ui-toolbar); color:var(--cad-ui-muted); font:9px Inter,Arial,sans-serif;
}
#cad3dLab .rulerX { inset:0 0 auto 0; height:16px; border-bottom:1px solid var(--cad-ui-edge) }
#cad3dLab .rulerY { inset:16px auto 0 0; width:20px; border-right:1px solid var(--cad-ui-edge) }
#cad3dLab .rulerX span { position:absolute; bottom:0; height:13px; padding-left:3px; border-left:1px solid var(--cad-ui-edge) }
#cad3dLab .rulerY span { position:absolute; right:0; width:100%; padding-right:2px; border-top:1px solid var(--cad-ui-edge); text-align:right }
#cad3dLab .snapMarker { position:absolute; width:8px; height:8px; transform:translate(-50%,-50%); border:1px solid #f2d07e; z-index:2; pointer-events:none }
#cad3dLab .cubeFace {
 position:absolute; width:42px; height:42px; display:grid; place-items:center; padding:0;
 transform-origin:0 0; border:1px solid var(--cad-ui-edge); background:var(--cad-ui-raised);
 color:var(--cad-ui-text); cursor:pointer; font:700 10px Inter,Arial,sans-serif;
}
#cad3dLab .cubeFace[data-view-preset=top] { left:41px; top:0; transform:matrix(.905,.5,-.905,.5,0,0) }
#cad3dLab .cubeFace[data-view-preset=front] { left:3px; top:21px; transform:matrix(.905,.5,0,.875,0,0) }
#cad3dLab .cubeFace[data-view-preset=right] { left:41px; top:42px; transform:matrix(.905,-.5,0,.875,0,0) }
#cad3dLab .cubeFace:hover, #cad3dLab .cubeFace[aria-pressed=true] {
 background:#3e6075;
 border-color:#bee5f7;color:#fff;
}
#cad3dLab .cad3dViewSelect {
 width:100%; min-width:0; height:33px; padding:4px 9px;
 border:1px solid #8296a6; border-radius:10px;
 background:linear-gradient(180deg,#293746,#1c2834); color:#f1f6fa;
 font:500 12px Inter,Arial,sans-serif;cursor:pointer;
 box-shadow:0 3px 8px #0810183b;outline-offset:2px;
}
#cad3dLab .cad3dViewSelect:hover {border-color:#b4d5e5;background:#34485a}
#cad3dLab .viewZoomControls {display:flex;gap:5px;pointer-events:auto}
#cad3dLab .viewZoomControls button{
 min-width:35px;height:33px;border:1px solid #7c95a8;border-radius:9px;
 background:linear-gradient(180deg,#344b5c,#1b2b37);color:#eff9ff;
 font:700 18px Inter,Arial,sans-serif;cursor:pointer;
 box-shadow:0 2px 6px #10182255;transition:background .15s,border-color .15s;
}
#cad3dLab .viewZoomControls button:last-child{font-size:11px;letter-spacing:.03em}
#cad3dLab .viewZoomControls button:hover{background:#45647a;border-color:#c2e4f2}
#cad3dLab .viewZoomControls button:focus-visible {outline:2px solid #a9dffa;outline-offset:2px}
#cad3dLab .side { display:block; width:227px; min-width:0; max-width:54%; flex:0 0 auto; overflow:auto }
#cad3dLab .side p { line-height:1.4; color:var(--cad-ui-muted); font-size:11px }
#cad3dLab .side label { display:flex; align-items:center; justify-content:space-between; gap:4px; margin:7px 0; font-size:11px }
#cad3dLab .side select { max-width:66%; min-width:0 }
#cad3dLab .side input { width:84px; max-width:52%; padding:4px; font:11px Inter,Arial,sans-serif }
#cad3dLab .side .detail { padding:8px 0; margin-top:8px; border-top:1px solid var(--cad-ui-edge) }
#cad3dLab .side .detail button { white-space:normal; font-size:10px }
#cad3dLab .sideGrip { width:6px; flex:0 0 6px; cursor:col-resize; background:var(--cad-ui-toolbar); touch-action:none; position:relative }
#cad3dLab .sideGrip:hover, #cad3dLab .sideGrip:active { background:var(--cad-ui-edge) }
#cad3dLab .sideGrip::after { content:""; position:absolute; top:calc(50% - 17px); left:2px; height:34px; border-left:1px solid var(--cad-ui-muted); opacity:.5 }
#cad3dLab footer {
 min-height:26px; padding:5px 9px; background:var(--cad-ui-toolbar); border-top:1px solid var(--cad-ui-edge);
 color:var(--cad-ui-muted); font-size:11px; overflow-wrap:anywhere;
}
#cad3dLab .draftBar { display:flex; flex-wrap:wrap; align-items:center; gap:5px; padding:5px 7px; background:var(--cad-ui-toolbar); border-top:1px solid var(--cad-ui-edge) }
#cad3dLab .draftBar form { display:flex; flex:1 1 210px; min-width:0; align-items:center; gap:5px }
#cad3dLab .draftBar input { flex:1; min-width:0; padding:5px 7px; border:1px solid var(--cad-ui-edge); font:12px ui-monospace,monospace }
#cad3dLab .draftBar .btn { min-height:24px; padding:3px 6px; font-size:10px }
#cad3dLab .draftBar [aria-pressed=true] { outline:1px solid var(--bl-accent,#8bc7de); outline-offset:-2px }
#cad3dLab .draftBar output { color:var(--cad-ui-muted); min-width:90px; font:10px ui-monospace,monospace }
#cad3dLab .layerPanel select { width:100%; margin-bottom:5px; padding:4px }
#cad3dLab .layerPanel .btn { margin:2px 0; padding:4px 7px; font-size:10px }
#cad3dLab .resizeGrip { position:absolute; right:0; bottom:0; width:18px; height:18px; background:linear-gradient(135deg,transparent 57%,#7b8f9d 58%,#7b8f9d 60%,transparent 61%,transparent 72%,#7b8f9d 73%,#7b8f9d 75%,transparent 76%); opacity:.55; cursor:nwse-resize; touch-action:none; z-index:7 }
#cad3dLab .edgeResizeR { position:absolute; right:0; top:39px; bottom:18px; width:6px; cursor:ew-resize; touch-action:none; z-index:7 }
#cad3dLab .edgeResizeB { position:absolute; bottom:0; left:30px; right:18px; height:6px; cursor:ns-resize; touch-action:none; z-index:7 }
#cad3dLab .edgeResizeR:hover, #cad3dLab .edgeResizeB:hover { background:#6a849a45 }
#cad3dLab .resizeGrip:hover { opacity:1 }
@media(max-width:850px) {
 #cad3dLab .solidTools button span { display:none }
}
@media(max-width:700px) {
 #cad3dLab { left:2vw; top:8vh; width:96vw; height:83vh; min-width:0 }
 #cad3dLab .side > .panel { margin:2px 0!important }
 #cad3dLab .sketchButton span { display:none }
 #cad3dLab .side { width:155px; max-width:34% }
 #cad3dLab .viewNav { width:96px }
}
`;
var cssNode=document.createElement('style');cssNode.id='cad3dLabCSS';cssNode.textContent=css;document.head.appendChild(cssNode);
function escapeHtml(a){return String(a).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function finite(a,f){var n=Number(a);return Number.isFinite(n)?n:f;}
function clamp(a,min,max){return Math.max(min,Math.min(max,a));}
function text(s){if(root)root.querySelector('.cad3dStatus').textContent=s;}
function ico(name){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(icons[name]||icons.cube)+'</svg>';}
function tool(id,name,shape,title){
 return '<button type="button" class="btn'+(id==='sketch'?' sketchButton':'')+'" data-action="'+id+'" title="'+(title||name)+'" aria-label="'+name+'">'+ico(shape||id)+'<span>'+name+'</span></button>';
}

/* Independent, original architectural style definitions. No Autodesk assets. */
const ARCH_STYLES={
 wall:[
  {id:'exterior-20',name:'Exterior 20 cm',d:.20,h:2.80},
  {id:'partition-10',name:'Partition 10 cm',d:.10,h:2.70},
  {id:'masonry-30',name:'Masonry 30 cm',d:.30,h:3.00},
  {id:'light-15',name:'Light wall 15 cm',d:.15,h:2.60}
 ],
 door:[
  {id:'single-swing',name:'Single swing',w:.90,h:2.10,sill:0},
  {id:'double-swing',name:'Double swing',w:1.60,h:2.10,sill:0},
  {id:'sliding-door',name:'Sliding',w:1.80,h:2.10,sill:0},
  {id:'open-door',name:'Empty opening',w:1.00,h:2.10,sill:0},
  {id:'single-left-80',name:'Single hinged · 80 cm',w:.80,h:2.10,sill:0},
  {id:'single-right-100',name:'Single hinged · 100 cm',w:1.00,h:2.10,sill:0},
  {id:'interior-70',name:'Interior · 70 cm',w:.70,h:2.05,sill:0},
  {id:'double-wide',name:'Double hinged · 180 cm',w:1.80,h:2.20,sill:0},
  {id:'sliding-pocket',name:'Pocket sliding · 90 cm',w:.90,h:2.10,sill:0},
  {id:'sliding-double',name:'Double sliding · 240 cm',w:2.40,h:2.20,sill:0},
  {id:'pivot-door',name:'Pivot entrance · 120 cm',w:1.20,h:2.40,sill:0},
  {id:'french-door',name:'French glazed · 160 cm',w:1.60,h:2.20,sill:0},
  {id:'garage-door',name:'Garage sectional · 260 cm',w:2.60,h:2.40,sill:0},
  {id:'service-door',name:'Service · 80 cm',w:.80,h:2.00,sill:0},
  {id:'terrace-door',name:'Terrace sliding · 300 cm',w:3.00,h:2.40,sill:0},
  {id:'arched-entry',name:'Arched entrance',w:1.40,h:2.50,sill:0,shape:'arch'},
  {id:'industrial-double',name:'Industrial steel double',w:2,h:2.35,sill:0},
  {id:'folding-bifold',name:'Bifold folding door',w:2.8,h:2.3,sill:0},
  {id:'revolving-door',name:'Revolving entrance',w:2.2,h:2.4,sill:0},
  {id:'barn-sliding',name:'Barn sliding door',w:1.1,h:2.3,sill:0},
  {id:'fire-rated',name:'Fire-rated door',w:1,h:2.1,sill:0},
  {id:'pointed-door',name:'Pointed arch doorway',w:1.2,h:2.6,sill:0,shape:'pointed'}
 ],
 window:[
  {id:'fixed',name:'Fixed glazing',w:1.20,h:1.20,sill:.90},
  {id:'double-window',name:'Two-leaf',w:1.60,h:1.20,sill:.90},
  {id:'sliding-window',name:'Sliding',w:1.60,h:1.20,sill:.85},
  {id:'casement',name:'Casement',w:.90,h:1.30,sill:.90},
  {id:'fixed-narrow',name:'Fixed narrow · 60 cm',w:.60,h:1.40,sill:.80},
  {id:'fixed-wide',name:'Picture fixed · 240 cm',w:2.40,h:1.50,sill:.70},
  {id:'sliding-small',name:'Sliding · 120 cm',w:1.20,h:1.00,sill:1.00},
  {id:'sliding-large',name:'Sliding · 240 cm',w:2.40,h:1.50,sill:.70},
  {id:'double-casement',name:'Double casement · 140 cm',w:1.40,h:1.30,sill:.90},
  {id:'awning',name:'Awning · 100 cm',w:1.00,h:.80,sill:1.30},
  {id:'hopper',name:'Hopper · 80 cm',w:.80,h:.60,sill:1.50},
  {id:'clerestory',name:'Clerestory · 200 cm',w:2.00,h:.55,sill:2.05},
  {id:'floor-to-ceiling',name:'Full-height glazing · 180 cm',w:1.80,h:2.40,sill:0},
  {id:'corner-fixed',name:'Tall fixed · 100 cm',w:1.00,h:2.20,sill:.15},
  {id:'bathroom',name:'Bathroom · 60 cm',w:.60,h:.60,sill:1.70},
  {id:'ribbon-window',name:'Ribbon · 300 cm',w:3.00,h:.70,sill:1.40},
  {id:'round-window',name:'Circular porthole',w:.85,h:.85,sill:1.15,shape:'round'},
  {id:'oval-window',name:'Oval window',w:1.4,h:.9,sill:1.1,shape:'round'},
  {id:'arched-window',name:'Arched window',w:1.2,h:1.55,sill:.85,shape:'arch'},
  {id:'segmental-window',name:'Segmental arch',w:1.7,h:1.25,sill:.9,shape:'segment'},
  {id:'triangular-window',name:'Triangular window',w:1.4,h:1.1,sill:1.1,shape:'triangle'},
  {id:'pointed-window',name:'Pointed Gothic arch',w:1.1,h:1.55,sill:.8,shape:'pointed'},
  {id:'louvered-window',name:'Louvered window',w:1,h:1.2,sill:.95},
  {id:'bay-window',name:'Bay picture window',w:2.2,h:1.4,sill:.8},
  {id:'tilt-turn',name:'Tilt and turn',w:1,h:1.3,sill:.9},
  {id:'guillotine',name:'Vertical sash',w:.95,h:1.25,sill:.85},
  {id:'glass-block',name:'Glass block panel',w:1.2,h:1.4,sill:.8}
 ],
 slab:[
  {id:'floor-20',name:'Concrete 20 cm',h:.20,pitch:0,slabKind:'floor'},
  {id:'thin-12',name:'Thin 12 cm',h:.12,pitch:0,slabKind:'floor'},
  {id:'roof-flat',name:'Flat roof',h:.18,pitch:0,slabKind:'roof'},
  {id:'roof-pitch',name:'Pitched roof',h:.18,pitch:12,slabKind:'roof'}
 ],
 opening:[
  {id:'wall-opening',name:'Wall opening',host:'wall',w:.90,h:2.10,sill:0},
  {id:'round-opening',name:'Round opening',host:'wall',w:1.2,h:1.2,sill:.8,shape:'round'},
  {id:'arched-opening',name:'Arched passage',host:'wall',w:1.8,h:2.55,sill:0,shape:'arch'},
  {id:'segment-opening',name:'Segmental passage',host:'wall',w:1.7,h:2.45,sill:0,shape:'segment'},
  {id:'pointed-opening',name:'Pointed arch',host:'wall',w:1.4,h:2.7,sill:0,shape:'pointed'},
  {id:'triangle-opening',name:'Triangular opening',host:'wall',w:1.3,h:1.2,sill:1,shape:'triangle'},
  {id:'slab-opening',name:'Slab opening',host:'slab',w:1,d:1}
 ]
};
function archStyle(kind,id){
 return (ARCH_STYLES[kind]||[]).find(function(st){return st.id===id;})||(ARCH_STYLES[kind]||[])[0]||null;
}

var importSequence=0;
var archLabels={wall:'Walls',door:'Doors',window:'Windows',slab:'Slabs / roofs',opening:'Openings'};
function styleDimensions(kind,st){
 if(kind==='wall')return Math.round(st.d*100)+' cm · '+st.h.toFixed(2)+' m alto';
 if(kind==='slab')return Math.round(st.h*100)+' cm'+(st.pitch?' · '+st.pitch+'°':'');
 return st.w.toFixed(2)+' × '+(st.d||st.h).toFixed(2)+' m';
}
/* Local schematic elevation thumbnails (no downloaded assets). */
function archPreview(kind,st){
 if(!['door','window','opening'].includes(kind))return ico(kind);
 var id=st.id||'',shape=st.shape||'rect',open=kind==='opening';
 var frame=shape==='round'?'<ellipse cx="50" cy="29" rx="31" ry="22"/>':
  shape==='arch'?'<path d="M16 51V28a34 25 0 0 1 68 0v23Z"/>':
  shape==='pointed'?'<path d="M16 51V26L50 5l34 21v25Z"/>':
  shape==='triangle'?'<path d="M16 51 50 6 84 51Z"/>':
  shape==='segment'?'<path d="M16 51V22Q50 7 84 22V51Z"/>':
  '<rect x="16" y="7" width="68" height="44"/>';
 var inside='';
 if(!open){
  if(/louver|shutter|glass-block/.test(id)){
   for(var i=0;i<6;i++)inside+='<path d="M20 '+(12+i*6)+'H80"/>';
  }else if(/double|french|two-leaf|bifold|folding|sliding|garage|terrace|industrial/.test(id)){
   inside='<path d="M50 9V49"/>';
   if(/french|industrial|garage|glass|bifold/.test(id))inside+='<path d="M19 30H81M35 9V49M65 9V49"/>';
  }else if(/awning|hopper|tilt|casement|pivot/.test(id)){
   inside='<path d="M20 12 76 46M80 12 24 46"/>';
  }else if(/guillotine|sash|ribbon|clerestory/.test(id)){
   inside='<path d="M19 29H81"/>';
  }else if(shape==='round'){
   inside='<path d="M50 8V50M19 29H81"/>';
  }else if(shape==='rect')inside='<path d="M20 28H80"/>';
 }
 return '<span class="modelPreview"><svg viewBox="0 0 100 58" role="img" aria-label="'+escapeHtml(st.name)+'">'+frame+inside+'</svg></span>';
}
function renderArchPalette(){
 var palette=root.querySelector('.archPalette');
 palette.querySelectorAll('[data-arch-tool]').forEach(function(button){
  button.setAttribute('aria-pressed',String(button.dataset.archTool===activeCategory));
 });
 var needle=(palette.querySelector('.catalogSearch')?.value||'').trim().toLowerCase();
 var options=ARCH_STYLES[activeCategory].filter(function(st){
  return !needle||(st.name+' '+st.id+' '+styleDimensions(activeCategory,st)).toLowerCase().includes(needle);
 });
 palette.querySelector('.catalogItems').innerHTML=options.map(function(st){
  return '<button type="button" class="btn" data-style="'+st.id+'" data-selected="'+(activePreset[activeCategory]===st.id)+'">'+archPreview(activeCategory,st)+
   '<span>'+escapeHtml(st.name)+'</span><small>'+styleDimensions(activeCategory,st)+'</small></button>';
 }).join('')||'<p>No matching models.</p>';
}
function showArchPalette(show){
 var palette=root.querySelector('.archPalette'), launcher=root.querySelector('.archLaunch');
 palette.hidden=!show;launcher.setAttribute('aria-expanded',String(show));
 if(show){
  renderArchPalette();
  if(!palette.style.width)sizeArchPalette('small');
  else fitArchPalette();
  palette.querySelector('[aria-pressed=true]').focus({preventScroll:true});
 }else if(palette.contains(document.activeElement))launcher.focus({preventScroll:true});
}
function fitArchPalette(){
 var body=root.querySelector('.body'), palette=root.querySelector('.archPalette');
 if(palette.hidden||!palette.style.width)return;
 var w=Math.min(parseFloat(palette.style.width),body.clientWidth-16);
 var h=Math.min(parseFloat(palette.style.height),body.clientHeight-16);
 palette.style.width=w+'px';palette.style.height=h+'px';
 palette.style.left=clamp(parseFloat(palette.style.left),8,body.clientWidth-8-w)+'px';
 palette.style.top=clamp(parseFloat(palette.style.top),8,body.clientHeight-8-h)+'px';
}
function sizeArchPalette(size){
 var body=root.querySelector('.body'), palette=root.querySelector('.archPalette');
 var sizes={small:[340,340],medium:[body.clientWidth*.55,body.clientHeight*.78],large:[body.clientWidth-24,body.clientHeight-24]};
 var w=clamp(sizes[size][0],Math.min(240,body.clientWidth-16),body.clientWidth-16);
 var h=clamp(sizes[size][1],Math.min(220,body.clientHeight-16),body.clientHeight-16);
 var left=body.clientWidth-root.querySelector('.side').offsetWidth-w-12;
 Object.assign(palette.style,{width:w+'px',height:h+'px',left:Math.max(8,left)+'px',top:'8px'});
}
function beginArchGesture(e){
 var grip=e.target.closest('[data-arch-grip]'), header=e.target.closest('.archTitle');
 if(e.button!==0||(!grip&&(!header||e.target.closest('button'))))return;
 var handle=grip||header, direction=grip?.dataset.archGrip||'';
 var body=root.querySelector('.body'), palette=e.currentTarget;
 var bounds=body.getBoundingClientRect(), rect=palette.getBoundingClientRect();
 var left=rect.left-bounds.left, top=rect.top-bounds.top, right=left+rect.width, bottom=top+rect.height;
 var minW=Math.min(240,body.clientWidth-16), minH=Math.min(220,body.clientHeight-16);
 var x=e.clientX,y=e.clientY,id=e.pointerId;
 e.preventDefault();handle.setPointerCapture(id);
 function move(ev){
  if(ev.pointerId!==id)return;
  var dx=ev.clientX-x,dy=ev.clientY-y;
  if(!direction){
   palette.style.left=clamp(left+dx,8,body.clientWidth-8-rect.width)+'px';
   palette.style.top=clamp(top+dy,8,body.clientHeight-8-rect.height)+'px';
   return;
  }
  var l=direction.includes('w')?clamp(left+dx,8,right-minW):left;
  var t=direction.includes('n')?clamp(top+dy,8,bottom-minH):top;
  var r=direction.includes('e')?clamp(right+dx,left+minW,body.clientWidth-8):right;
  var b=direction.includes('s')?clamp(bottom+dy,top+minH,body.clientHeight-8):bottom;
  Object.assign(palette.style,{left:l+'px',top:t+'px',width:r-l+'px',height:b-t+'px'});
 }
 function done(ev){
  if(ev.pointerId!==id)return;
  handle.removeEventListener('pointermove',move);
  handle.removeEventListener('lostpointercapture',done);
 }
 handle.addEventListener('pointermove',move);
 handle.addEventListener('lostpointercapture',done);
}
function clickArchPalette(e){
 if(e.target.closest('[data-arch-close]')){showArchPalette(false);return;}
 var size=e.target.closest('[data-arch-size]');
 if(size){sizeArchPalette(size.dataset.archSize);return;}
 var category=e.target.closest('[data-arch-tool]');
 if(category){activeCategory=category.dataset.archTool;renderArchPalette();return;}
 var card=e.target.closest('[data-style]');
 if(!card)return;
 activePreset[activeCategory]=card.dataset.style;
 action(activeCategory);
 if(placing===activeCategory){
  showArchPalette(false);
  root.querySelector('.view canvas')?.focus({preventScroll:true});
 }
}

function launch(){
 if(document.getElementById('cad3dOpen'))return;
 var bar=document.querySelector('#tabs.tabbar')||document.querySelector('.tabbar');
 if(!bar)return;
 var b=document.createElement('button');b.type='button';b.className='tab cad3d-launch';b.id='cad3dOpen';b.textContent='3D';b.setAttribute('aria-pressed','false');b.title='Abrir CAD3D';
 var toolStatus=bar.querySelector('#blToolStatus');bar.insertBefore(b,toolStatus||null);
 b.addEventListener('click',open);
}
function build(){
 if(root)return;
 root=document.createElement('section');root.id='cad3dLab';root.hidden=true;root.setAttribute('role','dialog');root.setAttribute('aria-label','Blackline CAD 3D');
 root.innerHTML='<div class="head"><strong>BLACKLINE · CAD3D</strong><div class="stretch"></div>'+
 '<button type="button" class="btn" data-max title="Maximizar o restaurar ventana 3D">□</button>'+
 '<button type="button" class="btn" data-close title="Cerrar 3D">×</button></div>'+
 '<div class="tools"><button type="button" class="btn archLaunch" aria-controls="cad3dArchPalette" aria-expanded="false">Parametric 3D</button>'+
 '<div class="solidTools" role="toolbar" aria-label="Architectural modeling, Draw and Modify">'+
 '<div class="toolGroup" role="group" aria-label="Architectural 3D"><strong>Architecture</strong>'+
 tool('wall','Wall','wall')+tool('door','Door','door')+tool('window','Window','window')+
 tool('slab','Slab','slab')+tool('floor','Floor','floor','Flat floor platform · two corners')+tool('opening','Opening','opening')+'</div>'+
 '<div class="divider" aria-hidden="true"></div>'+
 '<div class="toolGroup" role="group" aria-label="Draw"><strong>Draw</strong>'+
 tool('box','Box','cube')+tool('sphere','Sphere')+tool('cylinder','Cylinder')+tool('cone','Cone')+'</div>'+
 '<div class="divider" aria-hidden="true"></div>'+
 '<div class="toolGroup" role="group" aria-label="Modify"><strong>Modify</strong>'+
 tool('move','Move')+tool('copy','Copy')+tool('rotate','Rotate')+tool('erase','Erase')+
 tool('union','Union','union','Unir dos cajas sin rotación')+
 tool('subtract','Subtract','subtract','Restar la segunda caja de la primera; sin rotación')+
 tool('intersect','Intersect','intersect','Intersectar dos cajas sin rotación')+'</div></div>'+
 '<div class="sunControl"><button type="button" class="btn sunLaunch" aria-controls="cad3dSunPanel" aria-expanded="false" title="Sun and shadows">'+ico('sun')+'<span>Sun</span></button>'+
 '<div class="sunPanel" id="cad3dSunPanel" hidden><label class="sunToggle"><input type="checkbox" data-sun-enabled> Sun / Shadows</label>'+
 '<label>Azimuth <output data-sun-azimuth>135°</output><input data-sun-setting="azimuth" type="range" min="0" max="360" step="5" value="135"></label>'+
 '<label>Elevation <output data-sun-elevation>45°</output><input data-sun-setting="elevation" type="range" min="5" max="85" step="5" value="45"></label>'+ 
  '<label>Shadow softness <output data-sun-softness>2.5</output><input data-sun-setting="softness" type="range" min="1" max="5" step="0.5" value="2.5" title="Soft shadow edges"></label>'+ 
 '<label class="sunToggle"><input type="checkbox" data-sun-ground checked> On ground</label>'+
 '<label class="sunToggle"><input type="checkbox" data-sun-faces checked> On faces</label>'+
 '<div class="sunPresetRow"><button type="button" class="btn" data-sun-preset="morning">Morning</button><button type="button" class="btn" data-sun-preset="noon">Noon</button><button type="button" class="btn" data-sun-preset="afternoon">Afternoon</button></div>'+
 '<button type="button" class="btn" data-check-shadows title="Compare render with shadows on and off">Check visible shadows</button>'+
 '<output class="shadowFeedback" role="status">Shadow check requires WebGL and visible objects.</output>'+
 '<small>Visual simulation only, not geolocated solar analysis.</small></div></div>'+
 tool('sketch','Croquis','view')+
 '<div class="styleControl"><button type="button" class="btn styleLaunch" aria-expanded="false" aria-controls="cad3dVisualStyles" title="Choose visual rendering style">Visual Style ▾</button>'+
 '<div class="stylePanel" id="cad3dVisualStyles" hidden><header>VISUAL STYLES · CAD3D</header><div class="styleGrid" role="group" aria-label="Visual styles">'+
 [['wire2d','2D Wireframe','Lines only'],['wire3d','3D Wireframe','All edges'],['hidden','Hidden','Visible edges'],['shaded','Shaded','Solid colors'],['shaded-edges','Solid + Edges','Architectural view'],['realistic','Realistic','Material preview'],['monochrome','Monochrome','Neutral white'],['xray','X-Ray','Transparent']].map(function(st){
 return '<button type="button" data-render-style="'+st[0]+'" aria-pressed="false"><span class="styleThumb" data-kind="'+st[0]+'"></span><span><strong>'+st[1]+'</strong><small>'+st[2]+'</small></span></button>';
 }).join('')+'</div><small>Changes the 3D view, not the drawing geometry.</small></div></div>'+
 '<details class="ioMenu"><summary class="btn">Import</summary><div>'+
 tool('open','Open .3DJSON','folder')+tool('cad','Import DWG / DXF','folder')+tool('plan','Use CAD2D plan','view')+'</div></details>'+
 '<details class="ioMenu"><summary class="btn">Export</summary><div>'+
 tool('json','Editable .3DJSON','export')+tool('obj','OBJ','export')+tool('dxf','DXF 3D','export')+
 tool('shot','PNG','export')+tool('sketchSvg','SVG Croquis','export')+'</div></details></div>'+
 '<div class="body">'+
 '<aside id="cad3dArchPalette" class="archPalette" aria-label="Galería paramétrica 3D" hidden>'+
 '<header class="archTitle"><h2>PARAMETRIC 3D GALLERY</h2>'+
 '<div class="archSizes" role="group" aria-label="Tamaño de la paleta">'+
 '<button type="button" class="btn" data-arch-size="small">▯ Chica</button>'+
 '<button type="button" class="btn" data-arch-size="medium">◧ Media</button>'+
 '<button type="button" class="btn" data-arch-size="large">▣ Grande</button></div>'+
 '<button type="button" class="btn" data-arch-close aria-label="Cerrar paleta">×</button></header>'+
 '<div class="archTools" role="group" aria-label="Tipos paramétricos">'+
 Object.keys(archLabels).map(function(kind){
  return '<button type="button" class="btn" data-arch-tool="'+kind+'">'+archLabels[kind]+'</button>';
 }).join('')+'</div><input class="catalogSearch" type="search" aria-label="Search architectural models" placeholder="Search doors, windows, openings…"><div class="catalogItems"></div>'+
 ['n','s','e','w','ne','nw','se','sw'].map(function(d){
  return '<div class="archGrip '+d+'" data-arch-grip="'+d+'" title="Arrastrá para cambiar el tamaño" aria-hidden="true"></div>';
 }).join('')+'</aside>'+
 '<div class="view"><div class="rulerX" hidden aria-hidden="true"></div><div class="rulerY" hidden aria-hidden="true"></div>'+
 '<div class="snapMarker" hidden aria-hidden="true"></div><nav class="viewNav" aria-label="Vistas 3D">'+
 '<div class="viewNavTop"><div class="viewCube">'+
 '<button type="button" class="cubeFace" data-view-preset="top" title="Planta" aria-label="Planta">TOP</button>'+
 '<button type="button" class="cubeFace" data-view-preset="front" title="Frontal" aria-label="Frontal">FRONT</button>'+
 '<button type="button" class="cubeFace" data-view-preset="right" title="Derecha" aria-label="Derecha">RIGHT</button>'+
 '</div><button type="button" class="orbitBall" aria-label="Orbitar modelo 3D: arrastrar esfera para girar la cámara. Flechas para ajuste fino" title="Orbit · Drag to rotate model"><svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="14"/><ellipse cx="18" cy="18" rx="6" ry="14"/><path d="M4 18h28M8 9Q18 15 28 9M8 27Q18 21 28 27"/></svg><span class="orbitBallDot"></span></button></div><select class="cad3dViewSelect" aria-label="Vista de cámara CAD3D"></select><div class="viewZoomControls" role="group" aria-label="Zoom 3D"><button type="button" data-zoom3d="in" aria-label="Zoom in" title="Zoom in">+</button><button type="button" data-zoom3d="out" aria-label="Zoom out" title="Zoom out">−</button><button type="button" data-zoom3d="extents" aria-label="Zoom extents" title="Fit model">Fit</button></div></nav>'+
 '<div class="placementGuide" hidden aria-hidden="true"></div><output class="dynReadout" aria-live="off"></output>'+
 '<div class="viewShortcuts" role="group" aria-label="3D view shortcuts"><button type="button" data-view-shortcut="top">Top</button><button type="button" data-view-shortcut="iso">Iso</button><button type="button" data-view-shortcut="perspective">3D</button><button type="button" data-view-shortcut="fit">Fit</button></div></div>'+
 '<div class="sideGrip" title="Arrastrar para cambiar el ancho de Properties"></div>'+
 '<aside class="side sidebar"><section class="panel"><header class="panel-title">Layers</header>'+
 '<div class="layerPanel panel-content"><select aria-label="Capa activa 3D"></select>'+
 '<button type="button" class="btn" data-layer-toggle="add">+ Layer</button> '+
 '<button type="button" class="btn" data-layer-toggle="visible"></button> '+
 '<button type="button" class="btn" data-layer-toggle="locked"></button></div></section>'+
 '<section class="panel"><header class="panel-title">Selection / Properties</header>'+
 '<div class="props panel-content"></div><div class="solidCheck" role="status"></div><button type="button" class="btn" data-verify-solids title="Check 3D geometry">Check 3D solids</button></section></aside></div>'+
 '<div class="draftBar"><form><label for="cad3dCommand">Command</label>'+
 '<input type="text" id="cad3dCommand" autocomplete="off" spellcheck="false" placeholder="WALL · X,Y · @ΔX,ΔY">'+
 '<button type="submit" class="btn" aria-label="Ejecutar comando 3D">↵</button></form>'+
 '<button type="button" class="btn" data-draft-mode="ortho" title="Ortogonalidad · F8">ORTHO</button>'+
 '<button type="button" class="btn" data-draft-mode="osnap" title="Extremos y puntos medios · F3">OSNAP</button>'+
 '<button type="button" class="btn" data-draft-mode="grid" title="Grilla · F7">GRID</button>'+ 
 '<button type="button" class="btn" data-draft-mode="dyn" title="Dynamic coordinate feedback · DYN">DYN</button>'+
 '<button type="button" class="btn" data-draft-action="dist" title="Medir dos puntos">DIST</button>'+
 '<output class="draftCoordinates">X 0 · Y 0 m</output></div>'+
 '<footer><span class="cad3dStatus" role="status"></span></footer>'+
 '<div class="edgeResizeR" data-resize="x" title="Arrastrar borde para ajustar ancho 3D"></div>'+
 '<div class="edgeResizeB" data-resize="y" title="Arrastrar borde para ajustar altura 3D"></div>'+
 '<div class="resizeGrip" data-resize="xy" title="Arrastrar la esquina para ajustar ancho y alto"></div>'+
 '<input type="file" class="fileInput" accept=".3djson,.json" hidden><input type="file" class="cadInput" accept=".dwg,.dxf" hidden>';
 (document.getElementById('cad3dOpen')?.closest('.app')||document.body).appendChild(root);
 root.querySelector('[data-close]').addEventListener('click',close);
 var viewSelect=root.querySelector('.cad3dViewSelect');
 viewSelect.innerHTML='<option value="orbit" hidden>Órbita libre</option>'+
  viewPresets.map(function(v){return '<option value="'+v[0]+'">'+v[1]+'</option>';}).join('');
 syncViewControls();
 viewSelect.addEventListener('change',function(){setViewPreset(this.value);});
 root.querySelector('.viewShortcuts').addEventListener('click',function(e){
  var key=e.target.closest('[data-view-shortcut]')?.dataset.viewShortcut;
  if(!key)return;
  if(key==='fit')fit3DModel();else setViewPreset(key);
 });
 bindOrbitBall(root.querySelector('.orbitBall'));
 root.querySelector('.viewZoomControls').addEventListener('click',function(e){
  var button=e.target.closest('[data-zoom3d]');if(!button)return;
  var op=button.dataset.zoom3d;
  if(op==='extents')fit3DModel();
  else zoom3D(op==='in'?.75:1.3333333333);
 });
 root.querySelector('.viewCube').addEventListener('click',function(e){
  var face=e.target.closest('[data-view-preset]');
  if(face)setViewPreset(face.dataset.viewPreset);
 });
 root.querySelector('[data-max]').addEventListener('click',toggleMaximize);
 root.querySelector('.sideGrip').addEventListener('pointerdown',beginSideResize);
 root.querySelector('.head').addEventListener('pointerdown',moveWindow);
 root.querySelector('.resizeGrip').addEventListener('pointerdown',beginResize);
 root.querySelector('.edgeResizeR').addEventListener('pointerdown',beginResize);
 root.querySelector('.edgeResizeB').addEventListener('pointerdown',beginResize);
 root.addEventListener('click',function(e){
  var button=e.target.closest('.tools [data-action]'), menu=e.target.closest('.ioMenu');
  root.querySelectorAll('.ioMenu[open]').forEach(function(openMenu){if(button||openMenu!==menu)openMenu.open=false;});
  if(button){if(menu)menu.querySelector('summary').focus();action(button.dataset.action);}
 });
 root.querySelector('[data-verify-solids]').addEventListener('click',verify3DSolids);
 root.querySelector('.styleLaunch').addEventListener('click',function(){
  var panel=root.querySelector('.stylePanel');panel.hidden=!panel.hidden;
  this.setAttribute('aria-expanded',String(!panel.hidden));
 });
 root.querySelector('.styleGrid').addEventListener('click',function(e){
  var button=e.target.closest('[data-render-style]');if(!button)return;
  setVisualStyle(button.dataset.renderStyle);root.querySelector('.stylePanel').hidden=true;
  root.querySelector('.styleLaunch').setAttribute('aria-expanded','false');
 });
 renderStyleControls();
 root.querySelector('.sunLaunch').addEventListener('click',function(){
  var p=root.querySelector('.sunPanel'),opening=p.hidden;
  p.hidden=!opening;this.setAttribute('aria-expanded',String(opening));
  if(opening&&!sunSettings.enabled){sunSettings.enabled=true;applySunSettings();}
  if(opening&&!renderer)text('Sun activo · Las sombras reales requieren WebGL; vista de compatibilidad sin sombras');
 });
 root.querySelector('[data-sun-enabled]').addEventListener('change',function(){sunSettings.enabled=this.checked;applySunSettings();});
 root.querySelector('[data-check-shadows]').addEventListener('click',checkVisibleShadows);
 root.querySelector('[data-sun-ground]').addEventListener('change',function(){sunSettings.onGround=this.checked;applySunSettings();});
 root.querySelector('[data-sun-faces]').addEventListener('change',function(){sunSettings.onFaces=this.checked;applySunSettings();});
 root.querySelectorAll('[data-sun-preset]').forEach(function(btn){btn.addEventListener('click',function(){
  var preset={morning:[80,28],noon:[135,70],afternoon:[245,28]}[this.dataset.sunPreset];
  if(!preset)return;sunSettings.azimuth=preset[0];sunSettings.elevation=preset[1];sunSettings.enabled=true;applySunSettings();
 });});
 root.querySelectorAll('[data-sun-setting]').forEach(function(input){input.addEventListener('input',function(){sunSettings[this.dataset.sunSetting]=Number(this.value);applySunSettings();});});
 root.querySelector('.draftBar form').addEventListener('submit',function(e){e.preventDefault();run3DCommand();});
 root.querySelector('.draftBar').addEventListener('click',function(e){
  var mode=e.target.closest('[data-draft-mode]');
  if(mode)toggleDraftMode(mode.dataset.draftMode);
  if(e.target.closest('[data-draft-action="dist"]'))action('dist');
 });
 root.querySelector('.layerPanel select').addEventListener('change',function(){currentLayer=this.value;renderLayerPanel();});
 root.querySelector('.layerPanel').addEventListener('click',function(e){
  var button=e.target.closest('[data-layer-toggle]');
  if(button)changeLayer(button.dataset.layerToggle);
 });
 renderDraftModes();renderLayerPanel();
 root.querySelector('.props').addEventListener('change',change);
 root.querySelector('.props').addEventListener('click',clickProps);
 var palette=root.querySelector('.archPalette');
 palette.addEventListener('click',clickArchPalette);
 palette.querySelector('.catalogSearch').addEventListener('input',renderArchPalette);
 palette.addEventListener('pointerdown',beginArchGesture);
 root.querySelector('.archLaunch').addEventListener('click',function(){showArchPalette(palette.hidden);});
 renderArchPalette();
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

function toggleMaximize(){
 if(!root)return;
 if(restoredWindow){
  root.style.left=restoredWindow.left;root.style.top=restoredWindow.top;root.style.width=restoredWindow.width;root.style.height=restoredWindow.height;
  restoredWindow=null;root.querySelector('[data-max]').textContent='□';
 }else{
  const r=root.getBoundingClientRect();
  restoredWindow={left:root.style.left||r.left+'px',top:root.style.top||r.top+'px',width:root.style.width||r.width+'px',height:root.style.height||r.height+'px'};
  root.style.left='10px';root.style.top='10px';root.style.width='calc(100vw - 20px)';root.style.height='calc(100vh - 20px)';
  root.querySelector('[data-max]').textContent='▣';
 }
 resize();
}
function beginSideResize(e){
 if(e.button!==0)return;
 e.preventDefault();e.stopPropagation();
 var handle=e.currentTarget,side=root.querySelector('.side'),w=side.getBoundingClientRect().width,x=e.clientX,id=e.pointerId;
 handle.setPointerCapture(id);
 function move(ev){if(ev.pointerId!==id)return;side.style.width=clamp(w+x-ev.clientX,155,Math.max(155,root.clientWidth*.65))+'px';resize();}
 function end(ev){if(ev.pointerId!==id)return;handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',end);handle.removeEventListener('pointercancel',end);}
 handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',end);handle.addEventListener('pointercancel',end);
}
function beginResize(e){
 if(e.button!==0)return;
 e.preventDefault();e.stopPropagation();
 if(restoredWindow)toggleMaximize();
 var grip=e.currentTarget,rect=root.getBoundingClientRect();
 var axis=grip.dataset.resize||'xy';
 var start={id:e.pointerId,x:e.clientX,y:e.clientY,w:rect.width,h:rect.height};
 grip.setPointerCapture(e.pointerId);
 var move=function(ev){
  if(ev.pointerId!==start.id)return;
  var minW=Math.min(360,window.innerWidth-16),maxW=Math.max(minW,window.innerWidth-root.getBoundingClientRect().left-4);
  var minH=Math.min(250,window.innerHeight-16),maxH=Math.max(minH,window.innerHeight-root.getBoundingClientRect().top-4);
  if(axis.includes('x'))root.style.width=clamp(start.w+ev.clientX-start.x,minW,maxW)+'px';
  if(axis.includes('y'))root.style.height=clamp(start.h+ev.clientY-start.y,minH,maxH)+'px';
  resize();
 };
 var end=function(ev){
  if(ev.pointerId!==start.id)return;
  grip.removeEventListener('pointermove',move);grip.removeEventListener('pointerup',end);grip.removeEventListener('pointercancel',end);
  resize();
 };
 grip.addEventListener('pointermove',move);
 grip.addEventListener('pointerup',end);
 grip.addEventListener('pointercancel',end);
}
function layerForRecord(r){return layers.find(function(l){return l.id===(r.layerId||'0');})||layers[0];}
function visibleRecord(r){return layerForRecord(r).visible;}
function editableRecord(r){var layer=layerForRecord(r);return layer.visible&&!layer.locked;}
function layerOptions(id){
 return layers.map(function(l){return '<option value="'+escapeHtml(l.id)+'"'+(l.id===id?' selected':'')+'>'+escapeHtml(l.name)+'</option>';}).join('');
}
function renderLayerPanel(){
 var panel=root.querySelector('.layerPanel'),layer=layerForRecord({layerId:currentLayer});
 panel.querySelector('select').innerHTML=layerOptions(layer.id);
 panel.querySelector('[data-layer-toggle=visible]').textContent=layer.visible?'Hide':'Show';
 panel.querySelector('[data-layer-toggle=locked]').textContent=layer.locked?'Unlock':'Lock';
}
function changeLayer(kind){
 if(kind==='add'){
  var name=window.prompt('Nombre de la capa 3D','Capa '+layers.length)?.trim();
  if(!name)return;
  if(layers.length>=100||layers.some(function(l){return l.name.toLowerCase()===name.toLowerCase();}))return text('Usá un nombre de capa único · máximo 100 capas');
  currentLayer='layer-'+serial++;
  layers.push({id:currentLayer,name:name.slice(0,60),visible:true,locked:false});
 }else{
  var layer=layerForRecord({layerId:currentLayer});layer[kind]=!layer[kind];
 }
 selected=selected.filter(function(id){return records.some(function(r){return r.id===id&&editableRecord(r);});});
 renderLayerPanel();redraw();renderProps();
}
function cad3dBounds(){
 var b={minX:Infinity,minY:Infinity,minZ:Infinity,maxX:-Infinity,maxY:-Infinity,maxZ:-Infinity};
 records.filter(visibleRecord).forEach(function(r){
  var halfW=(r.w||r.radius*2||2)/2,halfD=(r.d||r.radius*2||2)/2;
  if(r.type==='sphere'){halfW=halfD=r.radius||1;}
  var angle=(r.rot||0)*Math.PI/180;
  var ex=Math.abs(Math.cos(angle))*halfW+Math.abs(Math.sin(angle))*halfD;
  var ey=Math.abs(Math.sin(angle))*halfW+Math.abs(Math.cos(angle))*halfD;
  var height=r.type==='sphere'?(r.radius||1)*2:(r.h||2);
  b.minX=Math.min(b.minX,r.x-ex);b.maxX=Math.max(b.maxX,r.x+ex);
  b.minY=Math.min(b.minY,r.y-ey);b.maxY=Math.max(b.maxY,r.y+ey);
  b.minZ=Math.min(b.minZ,r.z||0);b.maxZ=Math.max(b.maxZ,(r.z||0)+height);
 });
 if(!Number.isFinite(b.minX))return {x:0,y:0,z:0,span:24};
 return {x:(b.minX+b.maxX)/2,y:(b.minY+b.maxY)/2,z:(b.minZ+b.maxZ)/2,
  span:Math.max(8,b.maxX-b.minX,b.maxY-b.minY,(b.maxZ-b.minZ)*2)};
}
function zoom3D(factor){
 if(!Number.isFinite(factor)||factor<=0)return;
 if(viewMode==='walk'){
  // Walking has a position rather than a target-distance zoom.
  var step=clamp(Math.abs(Math.log(factor))*3,.1,5);
  target.x+=(factor<1?-1:1)*Math.cos(orbit.az)*step;
  target.y+=(factor<1?-1:1)*Math.sin(orbit.az)*step;
 }else orbit.dist=clamp(orbit.dist*factor,.35,10000);
 applyViewCamera();
 text('Zoom 3D · '+(factor<1?'acercar':'alejar')+' · rueda, + / − o ZOOM E');
}
function fit3DModel(){
 var b=cad3dBounds();
 if(target){target.x=b.x;target.y=b.y;target.z=b.z;}
 else if(T)target=new T.Vector3(b.x,b.y,b.z);
 else target={x:b.x,y:b.y,z:b.z};
 orbit.dist=clamp(b.span*1.7,1.4,10000);applyViewCamera();
 text('Vista ajustada a los objetos 3D');
}
function applySunSettings(){
 if(root){
  root.querySelector('[data-sun-enabled]').checked=sunSettings.enabled;
  root.querySelector('[data-sun-ground]').checked=sunSettings.onGround;
  root.querySelector('[data-sun-faces]').checked=sunSettings.onFaces;
  ['azimuth','elevation'].forEach(function(key){
   root.querySelector('[data-sun-setting="'+key+'"]').value=String(sunSettings[key]);
   root.querySelector('[data-sun-'+key+']').textContent=sunSettings[key]+'°';
  });
  root.querySelector('[data-sun-setting="softness"]').value=String(sunSettings.softness);
   root.querySelector('[data-sun-softness]').textContent=String(sunSettings.softness);
   root.querySelector('.sunLaunch')?.setAttribute('aria-pressed',String(sunSettings.enabled));
 }
 if(sunGround)sunGround.visible=sunSettings.enabled&&sunSettings.onGround&&!['sketch','hidden','wire2d','wire3d'].includes(renderStyle);
 if(sunAmbient)sunAmbient.intensity=sunSettings.enabled?0.65:1.3;
 if(sunFill)sunFill.intensity=sunSettings.enabled?0.22:0.7;
 if(modelRoot)modelRoot.traverse(function(o){if(o.isMesh){o.receiveShadow=!o.userData.cadGlass&&sunSettings.enabled&&sunSettings.onFaces&&!['wire2d','wire3d','hidden'].includes(renderStyle);o.castShadow=!o.userData.cadGlass&&!['wire2d','wire3d','hidden'].includes(renderStyle);}});
 if(!sunLight||!T)return;
 var bounds=cad3dBounds(),az=sunSettings.azimuth*Math.PI/180,el=sunSettings.elevation*Math.PI/180;
 // Fit the directional shadow frustum to the current model. The previous 30-unit
  // minimum wasted most of the 2048px map on smaller architectural models.
  var radius=Math.max(25,bounds.span*2),range=Math.max(12,Math.min(450,bounds.span*1.75));
 sunLight.target.position.set(bounds.x,bounds.y,bounds.z);scene.add(sunLight.target);
 sunLight.position.set(bounds.x+radius*Math.cos(el)*Math.cos(az),
  bounds.y+radius*Math.cos(el)*Math.sin(az),bounds.z+radius*Math.sin(el));
 sunLight.target.updateMatrixWorld();
 sunLight.intensity=sunSettings.enabled?2.7:2.1;
 sunLight.castShadow=sunSettings.enabled;
 sunLight.shadow.mapSize.set(2048,2048);
 var shadowCamera=sunLight.shadow.camera;
 shadowCamera.left=-range;shadowCamera.right=range;
 shadowCamera.top=range;shadowCamera.bottom=-range;
 shadowCamera.near=.5;shadowCamera.far=radius*3.5;
 sunLight.shadow.bias=-.0002;sunLight.shadow.normalBias=.018;
  // VSM blurs the shadow map; PCFSoft ignores shadow.radius in Three.js r160.
  sunLight.shadow.radius=sunSettings.softness;
  sunLight.shadow.blurSamples=8;
 shadowCamera.updateProjectionMatrix();
 if(renderer)renderer.shadowMap.needsUpdate=true;
}
function renderDraftModes(){
 root.querySelectorAll('[data-draft-mode]').forEach(function(button){
  button.setAttribute('aria-pressed',String(draftModes[button.dataset.draftMode]));
 });
}
function toggleDraftMode(mode){
 draftModes[mode]=!draftModes[mode];renderDraftModes();
 if(mode==='grid'){if(gridHelper)gridHelper.visible=draftModes.grid&&renderStyle!=='sketch';fallbackDraw();}
 if(mode==='dyn'&&!draftModes.dyn)root?.querySelector('.dynReadout')?.removeAttribute('data-show');
 text(mode.toUpperCase()+(draftModes[mode]?' activado':' desactivado'));
}
function setPlacement(which){
 placing=which;firstPoint=null;cursorPoint=null;
 if(!root)return;
 root.querySelectorAll('.solidTools button').forEach(function(b){
  var armed=b.dataset.action===which;b.classList.toggle('armed',armed);
  if(!['union','subtract','intersect','erase'].includes(b.dataset.action))b.setAttribute('aria-pressed',String(armed));
 });
 root.querySelector('.archLaunch').classList.toggle('armed',!!ARCH_STYLES[which]);
 root.querySelector('.view').classList.toggle('placing',!!which);
 root.querySelector('.placementGuide').hidden=true;root.querySelector('.snapMarker').hidden=true;
 root.querySelector('.dynReadout').removeAttribute('data-show');
 if(!which)return;
 var openingHost=which==='opening'&&archStyle(which,activePreset.opening).host;
 var instructions={
  wall:'Muro continuo: clic en cada vértice para seguir dibujando · Enter finaliza · Esc cancela',
  slab:'Losa: clic en dos esquinas opuestas',floor:'Piso: dos esquinas de la plataforma, medidas editables en Properties',
  door:'Puertas continuas: clic sobre cada muro · Enter o Esc termina',
  window:'Ventanas continuas: clic sobre cada muro · Enter o Esc termina',
  opening:'Vanos continuos: clic sobre '+(openingHost==='slab'?'la losa':'el muro')+' · Enter o Esc termina',
  move:'Move: elegí punto base y destino',copy:'Copy: elegí punto base y destino',
  rotate:'Rotate: escribí los grados en Command y pulsá Enter',dist:'Distancia: elegí dos puntos'
 };
 text((instructions[which]||which.toUpperCase()+': clic en el plano de trabajo para colocar')+' · Esc cancela');
}

function viewAxes(){
 var az=orbit.az, el=viewMode==='walk'?-orbit.el:orbit.el;
 if(Math.abs(el)===Math.PI/2){
  var sign=Math.sign(el);
  return {right:[sign,0,0],up:[0,1,0],back:[0,0,sign]};
 }
 var ca=Math.cos(az),sa=Math.sin(az),ce=Math.cos(el),se=Math.sin(el);
 return {right:[-sa,ca,0],up:[-ca*se,-sa*se,ce],back:[ca*ce,sa*ce,se]};
}
function fallbackScale(w,h){return Math.max(1,Math.min(w,h))*1.25/orbit.dist;}
function fallbackProjector(){
 var w=fallbackCanvas.clientWidth,h=fallbackCanvas.clientHeight,scale=fallbackScale(w,h);
 var axes=viewAxes(),right=axes.right,up=axes.up;
 return function(x,y,z){
  var dx=x-target.x,dy=y-target.y,dz=z-target.z;
  return {x:w/2+(dx*right[0]+dy*right[1]+dz*right[2])*scale,
   y:h/2-(dx*up[0]+dy*up[1]+dz*up[2])*scale,scale:scale};
 };
}
function fallbackRayAt(e){
 var rect=fallbackCanvas.getBoundingClientRect(),scale=fallbackScale(rect.width,rect.height);
 var u=(e.clientX-rect.left-rect.width/2)/scale,v=(rect.top+rect.height/2-e.clientY)/scale;
 var axes=viewAxes();
 return {origin:[target.x,target.y,target.z].map(function(t,i){return t+u*axes.right[i]+v*axes.up[i]+orbit.dist*axes.back[i];}),
  dir:axes.back.map(function(v){return -v;})};
}
function fallbackGround(e){
 var ray=fallbackRayAt(e);
 if(Math.abs(ray.dir[2])<1e-8)return null;
 var t=-ray.origin[2]/ray.dir[2];
 if(t<0)return null;
 return {x:ray.origin[0]+ray.dir[0]*t,y:ray.origin[1]+ray.dir[1]*t,z:0};
}
function pointOnScreen(point,view){
 if(fallbackCanvas)return fallbackProjector()(point.x,point.y,point.z);
 var q=new T.Vector3(point.x,point.y,point.z).project(camera);
 return {x:(q.x+1)*view.clientWidth/2,y:(1-q.y)*view.clientHeight/2};
}
function worldPerPixel(view){
 return !camera?1/fallbackScale(view.clientWidth,view.clientHeight):viewMode==='ortho'?
  (camera.top-camera.bottom)/Math.max(1,view.clientHeight):
  2*orbit.dist*Math.tan(camera.fov*Math.PI/360)/Math.max(1,view.clientHeight);
}
function renderRulers(){
 var view=root.querySelector('.view'),xRuler=view.querySelector('.rulerX'),yRuler=view.querySelector('.rulerY');
 var visible=activeView==='top'&&view.clientWidth>0&&!!target;
 xRuler.hidden=yRuler.hidden=!visible;view.classList.toggle('planRulers',visible);
 if(!visible)return;
 var unit=worldPerPixel(view),base=Math.pow(10,Math.floor(Math.log10(unit*72))),step=[base,base*2,base*5,base*10].find(function(s){return s>=unit*72;});
 var digits=Math.max(0,-Math.floor(Math.log10(step))),left=target.x-view.clientWidth*unit/2,top=target.y+view.clientHeight*unit/2,markup='';
 for(var x=Math.ceil(left/step)*step;x<left+view.clientWidth*unit;x+=step){
  if((x-left)/unit>24)markup+='<span style="left:'+((x-left)/unit).toFixed(2)+'px">'+x.toFixed(digits)+'</span>';
 }
 xRuler.innerHTML=markup;markup='';
 for(var y=Math.floor(top/step)*step;y>top-view.clientHeight*unit;y-=step){
  var px=(top-y)/unit-16;
  if(px>=0)markup+='<span style="top:'+px.toFixed(2)+'px">'+y.toFixed(digits)+'</span>';
 }
 yRuler.innerHTML=markup;
}
function assistedPoint(p,view){
 var x=p.x,y=p.y,snapped=false,tol=worldPerPixel(view)*9,nearest=tol*tol;
 var axis=draftModes.ortho&&firstPoint&&['wall','move','copy'].includes(placing)?
  Math.abs(x-firstPoint.x)>=Math.abs(y-firstPoint.y)?'x':'y':null;
 function consider(sx,sy){
  if(axis==='x'&&Math.abs(sy-firstPoint.y)>1e-7||axis==='y'&&Math.abs(sx-firstPoint.x)>1e-7)return;
  var dx=sx-p.x,dy=sy-p.y,d=dx*dx+dy*dy;
  if(d<nearest){nearest=d;x=sx;y=sy;snapped=true;}
 }
 if(draftModes.osnap){
  (underlay?.segments||[]).forEach(function(s){consider(s[0],s[1]);consider(s[2],s[3]);consider((s[0]+s[2])/2,(s[1]+s[3])/2);});
  records.forEach(function(r){
   if(!visibleRecord(r))return;
   if(r.type==='wall'){
    var a=(r.rot||0)*Math.PI/180,dx=Math.cos(a)*r.w/2,dy=Math.sin(a)*r.w/2;
    consider(r.x-dx,r.y-dy);consider(r.x+dx,r.y+dy);
    // Snap to any point on the host wall axis for reliable T junctions.
    // Only active during WALL, respecting the existing OSNAP and ORTHO modes.
    if(placing==='wall'&&r.w>.001){
     var ux=Math.cos(a),uy=Math.sin(a);
     var along=clamp((p.x-r.x)*ux+(p.y-r.y)*uy,-r.w/2,r.w/2);
     consider(r.x+ux*along,r.y+uy*along);
    }
   }
   consider(r.x,r.y);
  });
 }
 if(axis==='x')y=firstPoint.y;
 if(axis==='y')x=firstPoint.x;
 return {x:x,y:y,z:0,snapped:snapped};
}
function updatePlacementGuide(e){
 var view=root.querySelector('.view'),marker=view.querySelector('.snapMarker'),guide=view.querySelector('.placementGuide');
 var raw=groundAt(e);
 if(!raw){marker.hidden=true;guide.hidden=true;return;}
 cursorPoint=placing?assistedPoint(raw,view):raw;
 root.querySelector('.draftCoordinates').textContent='X '+cursorPoint.x.toFixed(2)+' · Y '+cursorPoint.y.toFixed(2)+' m';
 if(!placing)return;
 var p=pointOnScreen(cursorPoint,view);
 Object.assign(marker.style,{left:p.x+'px',top:p.y+'px'});marker.hidden=!cursorPoint.snapped;
 if(!firstPoint)return;
 var start=pointOnScreen(firstPoint,view),dx=p.x-start.x,dy=p.y-start.y;
 Object.assign(guide.style,{left:start.x+'px',top:start.y+'px',width:Math.hypot(dx,dy)+'px',transform:'rotate('+Math.atan2(dy,dx)+'rad)'});
 guide.hidden=false;
}
function fallbackPolygon(points,fill,stroke,width){
 var g=fallbackCtx;if(!points.length)return;
 g.beginPath();g.moveTo(points[0].x,points[0].y);for(var i=1;i<points.length;i++)g.lineTo(points[i].x,points[i].y);g.closePath();
 var wire=['wire2d','wire3d'].includes(renderStyle);
 g.fillStyle=renderStyle==='sketch'||renderStyle==='hidden'?'#f8f6ef':
  renderStyle==='monochrome'?'#e1e3e4':renderStyle==='realistic'?'#aa9b86':fill;
 if(!wire){g.globalAlpha=renderStyle==='xray'?.26:1;g.fill();g.globalAlpha=1;}
 g.strokeStyle=['sketch','hidden','wire2d','wire3d'].includes(renderStyle)?'#303537':stroke;
 g.lineWidth=['sketch','wire2d','wire3d'].includes(renderStyle)?1.2:(width||1);g.stroke();
}
function fallbackBox(project,rec,w,d,h,x,y,z,color,slope){
 var a=(rec.rot||0)*Math.PI/180,c=Math.cos(a),ss=Math.sin(a);
 var pts=[];
 for(var iz=0;iz<=1;iz++)for(var iy=0;iy<=1;iy++)for(var ix=0;ix<=1;ix++){
  var lx=x+(ix-.5)*w,ly=y+(iy-.5)*d;
  pts.push(project(rec.x+lx*c-ly*ss,rec.y+lx*ss+ly*c,rec.z+z+iz*h+lx*(slope||0)));
 }
 var selectedObject=selected.includes(rec.id);
 var stroke=selectedObject?'#efc978':'#5a7585';
 var faces=[
  {v:[0,1,3,2],fill:'#243440'},{v:[4,6,7,5],fill:color||'#617788'},
  {v:[0,4,5,1],fill:'#2e4554'},{v:[2,3,7,6],fill:'#395569'},
  {v:[0,2,6,4],fill:'#425a68'},{v:[1,5,7,3],fill:'#4e6a7b'}
 ];
 faces.sort(function(a,b){return b.v.reduce(function(n,i){return n+pts[i].y;},0)-a.v.reduce(function(n,i){return n+pts[i].y;},0);});
 faces.forEach(function(face){fallbackPolygon(face.v.map(function(i){return pts[i];}),face.fill,stroke,selectedObject?1.8:.85);});
}
function fallbackDraw(){
 if(!fallbackCanvas||!fallbackCtx||root?.hidden)return;
 var ctx=fallbackCtx,w=fallbackCanvas.clientWidth,h=fallbackCanvas.clientHeight;
 if(w<=0||h<=0)return;
 var projection=fallbackProjector();
 ctx.clearRect(0,0,w,h);ctx.fillStyle=['sketch','hidden','monochrome','wire2d'].includes(renderStyle)?'#f4f1e8':MODEL_BACKGROUND;ctx.fillRect(0,0,w,h);
 ctx.lineWidth=.65;ctx.strokeStyle=MODEL_GRID;
 if(draftModes.grid&&!['sketch','hidden','wire2d'].includes(renderStyle))for(var i=-20;i<=20;i++){
  var a=projection(i,-20,0),b=projection(i,20,0),c=projection(-20,i,0),d=projection(20,i,0);
  ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.moveTo(c.x,c.y);ctx.lineTo(d.x,d.y);ctx.stroke();
 }
 var origin=projection(0,0,0);
 ctx.strokeStyle=renderStyle==='sketch'?'#8d918e':'#7191a2';ctx.lineWidth=1;
 ctx.beginPath();ctx.moveTo(origin.x-4,origin.y);ctx.lineTo(origin.x+4,origin.y);ctx.moveTo(origin.x,origin.y-4);ctx.lineTo(origin.x,origin.y+4);ctx.stroke();
 if(underlay?.segments?.length){
  ctx.strokeStyle='#83a9c4';ctx.lineWidth=1.1;ctx.setLineDash([]);
  ctx.beginPath();
  underlay.segments.forEach(function(p){
   var a=projection(p[0],p[1],0),b=projection(p[2],p[3],0);
   if((a.x<0&&b.x<0)||(a.x>w&&b.x>w)||(a.y<0&&b.y<0)||(a.y>h&&b.y>h))return;
   ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);
  });
  ctx.stroke();
 }
 records.filter(visibleRecord).forEach(function(rec){
  if(rec.type==='wall'||rec.type==='slab'){
   architectureParts(rec,function(w,d,h,x,y,z,color,slope){
    fallbackBox(projection,rec,w,d,h,x,y,z,'#'+color.toString(16).padStart(6,'0'),slope);
   });
  }else if(rec.type==='box'){
   fallbackBox(projection,rec,rec.w,rec.d,rec.h,0,0,0,'#648b9f');
  }else if(rec.type==='sphere'){
   var p=projection(rec.x,rec.y,rec.z+rec.radius),radius=Math.max(4,rec.radius*p.scale);
   var grad=ctx.createRadialGradient(p.x-radius*.25,p.y-radius*.25,1,p.x,p.y,radius);grad.addColorStop(0,'#b2cad7');grad.addColorStop(1,'#435b6d');
   ctx.fillStyle=renderStyle==='sketch'?'#f7f5ee':grad;ctx.strokeStyle=renderStyle==='sketch'?'#2e3334':selected.includes(rec.id)?'#efc978':'#5e8399';ctx.beginPath();ctx.arc(p.x,p.y,radius,0,Math.PI*2);ctx.fill();ctx.stroke();
  }else if(rec.type==='cylinder'||rec.type==='cone'){
   var low=projection(rec.x,rec.y,rec.z),high=projection(rec.x,rec.y,rec.z+rec.h),rad=Math.max(4,rec.radius*low.scale);
   ctx.fillStyle=renderStyle==='sketch'?'#f7f5ee':'#547b91';ctx.strokeStyle=renderStyle==='sketch'?'#2e3334':selected.includes(rec.id)?'#efc978':'#789aaa';ctx.lineWidth=1.4;
   ctx.beginPath();ctx.moveTo(low.x-rad,low.y);ctx.lineTo(rec.type==='cone'?high.x:high.x-rad,high.y);ctx.lineTo(rec.type==='cone'?high.x:high.x+rad,rec.type==='cone'?high.y:high.y);ctx.lineTo(low.x+rad,low.y);ctx.closePath();ctx.fill();ctx.stroke();
   ctx.beginPath();ctx.ellipse(low.x,low.y,rad,rad*.22,0,0,Math.PI*2);ctx.stroke();
  }else if(rec.type==='boolean'&&rec.triangles?.length){
   var p=rec.triangles,angle=(rec.rot||0)*Math.PI/180,cos=Math.cos(angle),sin=Math.sin(angle);
   var vertex=function(i){return projection(rec.x+p[i]*cos-p[i+1]*sin,rec.y+p[i]*sin+p[i+1]*cos,rec.z+p[i+2]);};
   ctx.strokeStyle=renderStyle==='sketch'?'#2e3334':'#789ab3';ctx.lineWidth=1;
   for(var i=0;i+8<p.length;i+=9){
    var a=vertex(i),b=vertex(i+3),c=vertex(i+6);
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.closePath();ctx.stroke();
   }
  }
 });
}
function scheduleFallbackDraw(){
 if(fallbackFrame||!fallbackCanvas||root.hidden)return;
 fallbackFrame=requestAnimationFrame(function(){
  fallbackFrame=0;fallbackDraw();renderRulers();
 });
}
function beginFallback(){
 if(!root||fallbackCanvas)return;
 var holder=root.querySelector('.view');
 fallbackCanvas=document.createElement('canvas');fallbackCanvas.className='cad3dFallback';
 fallbackCanvas.setAttribute('aria-label','3D editing viewport compatibility renderer');
 fallbackCtx=fallbackCanvas.getContext('2d',{alpha:false});
 if(!fallbackCtx){text('No se pudo iniciar el visor 3D (Canvas2D no disponible)');return;}
 holder.appendChild(fallbackCanvas);
 if(!target)target={x:0,y:0,z:1};
 camera=null;renderer=null;modelRoot=null;raycaster=null;underlayGroup=null;
 bindCanvas(fallbackCanvas);resize();renderProps();fallbackDraw();

}

async function open(){
 var firstOpen=!root;
 build();root.hidden=false;document.getElementById('cad3dOpen').setAttribute('aria-pressed','true');
 if(firstOpen)showArchPalette(true);
 if(renderer){resize();loop();return;}
 if(!fallbackCanvas)beginFallback();
 resize();
 if(cad3dLoading){text('Visor de compatibilidad operativo · motor 3D completo cargándose');return;}
 if(T&&renderer)return;
 cad3dLoading=true;
 text('Podés dibujar ahora · intentando activar el visor WebGL completo…');
 try{
  if(!T){try{T=await import('./assets/three-cad3d-r160.module.js');}
   catch(localError){console.warn('Local THREE module unavailable; trying CDN',localError);
    try{T=await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');}
    catch(e){T=await import('https://unpkg.com/three@0.160.0/build/three.module.js');}}}
  if(root.hidden)return;
  var previous=target;
  if(fallbackCanvas){fallbackCanvas.remove();fallbackCanvas=null;fallbackCtx=null;dragging=null;}
  target=new T.Vector3(previous.x,previous.y,previous.z);
  init();redraw();renderProps();loop();
  if(!placing)text('Botón central: paneo · Mayús + central: órbita');
 }catch(e){
  console.warn('Blackline CAD3D: WebGL fallback',e);
  renderer?.domElement?.remove();renderer?.dispose();renderer=null;modelRoot=null;camera=null;perspectiveCamera=null;orthographicCamera=null;
  if(!fallbackCanvas)beginFallback();
  if(!placing)text('Vista compatible · botón central: paneo · Mayús + central: órbita');
 }finally{cad3dLoading=false;}
}
function close(){
 if(!root)return;
 var launcher=document.getElementById('cad3dOpen');
 var focused=root.contains(document.activeElement);
 root.hidden=true;launcher.setAttribute('aria-pressed','false');dragging=null;
 if(focused)launcher.focus({preventScroll:true});
 if(frame)cancelAnimationFrame(frame);frame=0;
 if(fallbackFrame)cancelAnimationFrame(fallbackFrame);fallbackFrame=0;
}
function init(){
 scene=new T.Scene();scene.background=new T.Color(MODEL_BACKGROUND);
 perspectiveCamera=new T.PerspectiveCamera(50,1,.02,2000);perspectiveCamera.up.set(0,0,1);
 orthographicCamera=new T.OrthographicCamera(-7,7,7,-7,.02,2500);orthographicCamera.up.set(0,0,1);
 camera=viewMode==='ortho'?orthographicCamera:perspectiveCamera;camera.up.set(0,0,1);
 var initialTarget=target||{x:0,y:0,z:1};target=new T.Vector3(initialTarget.x,initialTarget.y,initialTarget.z);updateCamera();
 renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.VSMShadowMap;
 root.querySelector('.view').appendChild(renderer.domElement);
 sunAmbient=new T.AmbientLight(0xffffff,1.3);scene.add(sunAmbient);
 sunLight=new T.DirectionalLight(0xffffff,2.1);sunLight.position.set(-8,-6,16);scene.add(sunLight);
 sunFill=new T.DirectionalLight(0x8bc0ef,.7);sunFill.position.set(7,9,7);scene.add(sunFill);
 // The grid is lines, not a shadow receiver. Keep visual ground separate from editable model.
 sunGround=new T.Mesh(new T.PlaneGeometry(2000,2000),
  new T.MeshStandardMaterial({color:0x9ba5a8,roughness:1,metalness:0,side:T.DoubleSide}));
 sunGround.position.z=-.03;sunGround.receiveShadow=true;sunGround.castShadow=false;
 sunGround.renderOrder=0;scene.add(sunGround);
 gridHelper=new T.GridHelper(60,60,0x6e8391,new T.Color(MODEL_GRID));gridHelper.rotation.x=Math.PI/2;scene.add(gridHelper);
 axesHelper=new T.AxesHelper(2);scene.add(axesHelper);
 modelRoot=new T.Group();scene.add(modelRoot);raycaster=new T.Raycaster();
 underlayGroup=new T.Group();scene.add(underlayGroup);if(underlay)drawUnderlay();
 bindCanvas(renderer.domElement);resize();applyViewCamera();applyRenderStyle();applySunSettings();
}
function updateCamera(){
 if(!camera){scheduleFallbackDraw();return;}
 camera.up.set(0,0,1);
 if(Math.abs(orbit.el)===Math.PI/2)camera.up.set(0,1,0);
 if(viewMode==='walk'){
  camera.position.set(target.x,target.y,1.65);
  camera.lookAt(new T.Vector3(target.x-Math.cos(orbit.az)*8,target.y-Math.sin(orbit.az)*8,1.65+8*Math.tan(orbit.el)));
 }else{
  camera.position.set(target.x+orbit.dist*Math.cos(orbit.el)*Math.cos(orbit.az),
   target.y+orbit.dist*Math.cos(orbit.el)*Math.sin(orbit.az),target.z+orbit.dist*Math.sin(orbit.el));
  camera.lookAt(target);
 }
 camera.updateMatrixWorld();renderRulers();
 if(fallbackCanvas)fallbackDraw();
}
function applyViewCamera(){
 if(!perspectiveCamera||!orthographicCamera){updateCamera();return;}
 camera=viewMode==='ortho'?orthographicCamera:perspectiveCamera;
 var rect=root.querySelector('.view'),aspect=rect.clientWidth/Math.max(1,rect.clientHeight);
 if(viewMode==='ortho'){
  var half=Math.max(.15,orbit.dist*.38);
  camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;
 }else camera.aspect=aspect;
 camera.updateProjectionMatrix();updateCamera();
}
function resize(){
 if(root&&!root.hidden)fitArchPalette();
 if(fallbackCanvas&&root&&!root.hidden){
  var rect=root.querySelector('.view'),scale=Math.min(2,window.devicePixelRatio||1);
  fallbackCanvas.width=Math.max(1,Math.round(rect.clientWidth*scale));
  fallbackCanvas.height=Math.max(1,Math.round(rect.clientHeight*scale));
  fallbackCtx.setTransform(scale,0,0,scale,0,0);
  fallbackDraw();renderRulers();
 }
 if(!renderer||!root||root.hidden)return;
 var v=root.querySelector('.view');if(v.clientWidth<2||v.clientHeight<2)return;
 renderer.setSize(v.clientWidth,v.clientHeight,false);applyViewCamera();
}
function loop(){
 if(!renderer){if(fallbackCanvas)fallbackDraw();return;}
 if(frame)return;
 function tick(){frame=0;if(!renderer||root.hidden)return;renderer.render(scene,camera);frame=requestAnimationFrame(tick);}
 frame=requestAnimationFrame(tick);
}
function panView(dx,dy,canvas){
 var axes=viewAxes(),height=Math.max(1,canvas.clientHeight);
 var scale=!camera?1/fallbackScale(canvas.clientWidth,height):viewMode==='ortho'?
  (camera.top-camera.bottom)/height:2*orbit.dist*Math.tan(camera.fov*Math.PI/360)/height;
 if(viewMode==='walk'){
  target.x+=scale*(-dx*axes.right[0]-dy*Math.cos(orbit.az));
  target.y+=scale*(-dx*axes.right[1]-dy*Math.sin(orbit.az));
 }else{
  target.x+=scale*(-dx*axes.right[0]+dy*axes.up[0]);
  target.y+=scale*(-dx*axes.right[1]+dy*axes.up[1]);
  target.z+=scale*(-dx*axes.right[2]+dy*axes.up[2]);
 }
}
function bindCanvas(el){
 el.tabIndex=0;
 el.addEventListener('contextmenu',function(e){e.preventDefault();});
 el.addEventListener('pointerdown',function(e){
  if(dragging||e.button>2)return;
  e.preventDefault();el.focus({preventScroll:true});
  var pan=e.button===2||(e.button===1&&!e.shiftKey)||(e.button===0&&viewMode==='ortho'&&!placing);
  dragging={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false,pan:pan};
  el.setPointerCapture(e.pointerId);
 });
 el.addEventListener('pointermove',function(e){
  if(dragging&&dragging.id===e.pointerId){
   var dx=e.clientX-dragging.lastX,dy=e.clientY-dragging.lastY;
   if(dragging.moved||Math.hypot(e.clientX-dragging.x,e.clientY-dragging.y)>5){
    dragging.moved=true;dragging.lastX=e.clientX;dragging.lastY=e.clientY;
    if(dragging.pan)panView(dx,dy,el);
    else{
     orbit.az-=dx*.007;orbit.el=clamp(orbit.el+dy*.007,-1.45,1.45);
     if(viewMode==='ortho')activeView='orbit';
     syncViewControls();
    }
    updateCamera();
   }
  }
  if(!dragging?.moved){updatePlacementGuide(e);updateDynamicReadout(e);}
 });
 el.addEventListener('pointerup',function(e){
  if(!dragging||dragging.id!==e.pointerId)return;
  var click=!dragging.moved&&Math.hypot(e.clientX-dragging.x,e.clientY-dragging.y)<=5;
  dragging=null;
  if(click&&e.button===0){if(placing)placeAt(e);else selectAt(e);}
  if(draftModes.dyn)updateDynamicReadout(e);
 });
 el.addEventListener('lostpointercapture',function(e){if(dragging?.id===e.pointerId)dragging=null;});
 el.addEventListener('wheel',function(e){
  e.preventDefault();
  if(viewMode==='walk'){
   var step=clamp(Math.abs(e.deltaY)*.004,.08,1.4)*(e.deltaY>0?1:-1);
   target.x+=Math.cos(orbit.az)*step;target.y+=Math.sin(orbit.az)*step;
  }else{
   // Normalize pixels, wheel-lines and wheel-pages: wheel works in perspective
   // and orthographic cameras without swallowing tiny trackpad deltas.
   var delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?el.clientHeight:1);
   orbit.dist=clamp(orbit.dist*Math.exp(clamp(delta,-600,600)*.0015),.35,10000);
  }
  applyViewCamera();updatePlacementGuide(e);
 },{passive:false});
}

function rayAt(e){
 var rect=renderer.domElement.getBoundingClientRect();
 raycaster.setFromCamera(new T.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);
}
function groundAt(e){
 if(fallbackCanvas)return fallbackGround(e);
 rayAt(e);var p=new T.Vector3();
 if(Math.abs(raycaster.ray.direction.z)<1e-8)return null;
 if(!raycaster.ray.intersectPlane(new T.Plane(new T.Vector3(0,0,1),0),p))return null;
 return p;
}
function fallbackHostHit(e,type){
 var ray=fallbackRayAt(e),nearest=null,near=Infinity;
 records.forEach(function(r){
  if(r.type!==type||!editableRecord(r))return;
  var a=(r.rot||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
  var x=ray.origin[0]-r.x,y=ray.origin[1]-r.y;
  var origin=[x*c+y*s,-x*s+y*c,ray.origin[2]-r.z];
  var direction=[ray.dir[0]*c+ray.dir[1]*s,-ray.dir[0]*s+ray.dir[1]*c,ray.dir[2]];
  var slope=Math.tan((r.pitch||0)*Math.PI/180);
  origin[2]-=origin[0]*slope;direction[2]-=direction[0]*slope;
  var low=[-r.w/2,-r.d/2,0],high=[r.w/2,r.d/2,r.h],entry=0,exit=near;
  for(var i=0;i<3;i++){
   if(Math.abs(direction[i])<1e-8){
    if(origin[i]<low[i]||origin[i]>high[i])return;
   }else{
    var t1=(low[i]-origin[i])/direction[i],t2=(high[i]-origin[i])/direction[i];
    entry=Math.max(entry,Math.min(t1,t2));exit=Math.min(exit,Math.max(t1,t2));
    if(exit<entry)return;
   }
  }
  near=entry;nearest={host:r,point:{x:ray.origin[0]+entry*ray.dir[0],y:ray.origin[1]+entry*ray.dir[1]}};
 });
 return nearest;
}
function hostHitAt(e,type){
 if(fallbackCanvas)return fallbackHostHit(e,type);
 rayAt(e);var meshes=[];
 modelRoot.children.forEach(function(group){
  if(records.some(function(r){return r.id===group.userData.owner&&r.type===type&&editableRecord(r);})){
   group.traverse(function(o){if(o.isMesh)meshes.push(o);});
  }
 });
 var hit=raycaster.intersectObjects(meshes,false)[0];
 if(!hit)return null;
 return {host:records.find(function(r){return r.id===hit.object.userData.owner;}),point:hit.point};
}
function placeOpening(e){
 var kind=placing,style=archStyle(kind,activePreset[kind]),type=style.host||'wall';
 var hit=hostHitAt(e,type);
 if(!hit){text('Hacé clic sobre '+(type==='slab'?'una losa':'un muro')+' para colocar el vano');return;}
 var rec=hit.host,slab=type==='slab';
 var span=slab?style.d:style.h;
 if(style.w>rec.w||span>(slab?rec.d:rec.h)){
  text('El vano es más grande que el elemento. Elegí otro estilo o ajustá el tamaño del elemento.');return;
 }
 if(rec.openings.length>=150){text('Este elemento ya alcanzó el límite de 150 vanos');return;}
 var dx=hit.point.x-rec.x,dy=hit.point.y-rec.y,rot=(rec.rot||0)*Math.PI/180,c=Math.cos(rot),s=Math.sin(rot);
 var maxX=(rec.w-style.w)/2;
 var op={id:serial++,kind:kind,styleId:style.id,shape:style.shape||'rect',offset:clamp(dx*c+dy*s,-maxX,maxX),w:style.w};
 if(slab){
  var maxY=(rec.d-span)/2;
  op.offsetY=clamp(-dx*s+dy*c,-maxY,maxY);op.d=span;
 }else{
  op.h=span;op.sill=Math.min(style.sill,rec.h-span);
 }
 var overlaps=(rec.openings||[]).some(function(other){
  var left=Math.abs(other.offset-op.offset)<(other.w+op.w)/2+.015;
  if(!left)return false;
  if(slab)return Math.abs((other.offsetY||0)-(op.offsetY||0))<((other.d||0)+(op.d||0))/2+.015;
  return Math.max(other.sill||0,op.sill||0)<Math.min((other.sill||0)+(other.h||0),(op.sill||0)+op.h)+.015;
 });
 if(overlaps){text('La abertura se superpone a otra existente. Elegí otro lugar del muro.');return;}
 rec.openings.push(op);selected=[rec.id];redraw();renderProps();
 // Remain armed for another opening on this wall or a different wall.
 text((kind==='door'?'Puerta colocada':kind==='window'?'Ventana colocada':'Vano colocado')+
  ' · '+rec.openings.length+' abertura(s) en este elemento · clic para colocar otra · Enter / Esc termina');
}
function placeAt(e){
 if(!renderer&&!fallbackCanvas)return;
 if(['door','window','opening'].includes(placing)){placeOpening(e);return;}
 if(placing==='rotate'){root.querySelector('#cad3dCommand').focus();return;}
 var pt=groundAt(e);if(!pt){text('Elegí Planta o Isométrica para trabajar sobre Z=0');return;}
 placePoint(assistedPoint(pt,root.querySelector('.view')));updatePlacementGuide(e);
}
function placePoint(pt){
 var kind=placing;
 if(['wall','slab','floor','move','copy','dist'].includes(kind)&&!firstPoint){
  firstPoint=pt;
  text(kind==='wall'?'Muro: indicá el extremo final':kind==='slab'||kind==='floor'?'Piso: indicá la esquina opuesta':'Indicá el segundo punto o escribí sus coordenadas');return;
 }
 if(kind==='dist'){
  var length=Math.hypot(pt.x-firstPoint.x,pt.y-firstPoint.y);
  setPlacement(null);text('Distancia: '+length.toFixed(4)+' m');return;
 }
 if(kind==='move'||kind==='copy'){
  var ids=new Set(selected),dx=pt.x-firstPoint.x,dy=pt.y-firstPoint.y,moved=[];
  records.filter(function(r){return ids.has(r.id)&&editableRecord(r);}).forEach(function(r){
   var dest=kind==='copy'?JSON.parse(JSON.stringify(r)):r;
   if(kind==='copy'){
    dest.id=serial++;dest.openings?.forEach(function(o){o.id=serial++;});dest.attachments?.forEach(function(a){a.id=serial++;});records.push(dest);
   }
   dest.x+=dx;dest.y+=dy;moved.push(dest.id);
  });
  selected=moved;redraw();renderProps();setPlacement(null);text(moved.length+' objeto(s) '+(kind==='copy'?'copiados':'movidos'));return;
 }
 if(!editableRecord({layerId:currentLayer}))return text('Activá una capa visible y desbloqueada para dibujar');
 var rec;
 if(kind==='wall'){
  var dx=pt.x-firstPoint.x,dy=pt.y-firstPoint.y;
  if(Math.hypot(dx,dy)<.05){text('Muro: elegí un segundo punto distinto');return;}
  var wallStyle=archStyle('wall',activePreset.wall);rec=newRecord('wall');
  Object.assign(rec,{styleId:wallStyle.id,d:wallStyle.d,h:wallStyle.h,x:(firstPoint.x+pt.x)/2,y:(firstPoint.y+pt.y)/2,
   w:Math.hypot(dx,dy),rot:Math.atan2(dy,dx)*180/Math.PI,z:0});
 }else if(kind==='slab'||kind==='floor'){
  var slabStyle=archStyle('slab',kind==='floor'?'floor-20':activePreset.slab);rec=newRecord('slab');
  Object.assign(rec,{styleId:slabStyle.id,slabKind:slabStyle.slabKind,pitch:slabStyle.pitch,h:slabStyle.h,
   w:Math.max(.05,Math.abs(pt.x-firstPoint.x)),d:Math.max(.05,Math.abs(pt.y-firstPoint.y)),
   x:(pt.x+firstPoint.x)/2,y:(pt.y+firstPoint.y)/2,z:slabStyle.slabKind==='roof'?2.8:0});
 }else if(['box','sphere','cylinder','cone'].includes(kind)){
  rec=newRecord(kind);rec.x=pt.x;rec.y=pt.y;
 }
 if(!rec)return;
 records.push(rec);selected=[rec.id];redraw();renderProps();
 if(kind==='wall'){
  // Continue exactly from the last vertex, like LINE / PLINE.
  // Keep each wall as an editable 3D solid so doors/windows remain parametric.
  firstPoint={x:pt.x,y:pt.y,z:pt.z||0};
  cursorPoint=null;
  text('Muro '+rec.w.toFixed(2)+' m creado · próximo tramo desde este vértice · Enter finaliza / Esc cancela');
  return;
 }
 setPlacement(null);
 text(kind==='wall'?'Muro dibujado · '+rec.w.toFixed(2)+' m':kind==='slab'||kind==='floor'?'Losa / Piso dibujado · '+rec.w.toFixed(2)+' × '+rec.d.toFixed(2)+' m':kind.toUpperCase()+' colocado');
}
function selectAt(e){
 if(fallbackCanvas){
  var r=fallbackCanvas.getBoundingClientRect(),best=null,limit=34,projection=fallbackProjector();
  var wallOrSlab=fallbackHostHit(e,'wall')||fallbackHostHit(e,'slab');
  records.filter(editableRecord).forEach(function(rec){
   var p=projection(rec.x,rec.y,rec.z+(rec.h||rec.radius||1)*.5);
   var distance=Math.hypot((e.clientX-r.left)-p.x,(e.clientY-r.top)-p.y);
   if(distance<limit&&(!best||distance<best.distance))best={id:rec.id,distance:distance};
  });
  var id=wallOrSlab?.host.id??best?.id;
  if(id==null){if(!e.shiftKey)selected=[];}
  else if(e.shiftKey)selected=selected.includes(id)?selected.filter(function(v){return v!==id;}):selected.concat(id);
  else selected=[id];
  renderProps();highlight();text(selected.length+' objetos seleccionados');
  return;
 }
 var box=renderer.domElement.getBoundingClientRect();
 var p=new T.Vector2(2*(e.clientX-box.left)/box.width-1,-2*(e.clientY-box.top)/box.height+1);
 raycaster.setFromCamera(p,camera);
 var hits=[];modelRoot.traverse(function(o){if(o.isMesh)hits.push(o);});
 var intersects=raycaster.intersectObjects(hits,false);
 var hit=intersects.find(function(item){return records.some(function(r){return r.id===item.object.userData.owner&&editableRecord(r);});});
 var id=hit?hit.object.userData.owner:null;
 if(id===null){if(!e.shiftKey)selected=[];}else if(e.shiftKey){selected=selected.includes(id)?selected.filter(function(n){return n!==id;}):selected.concat(id);}else selected=[id];
 renderProps();highlight();text(selected.length+' seleccionados · '+records.length+' objetos');
}
function boxGeom(w,d,h){var g=new T.BoxGeometry(w,d,h);g.translate(0,0,h/2);return g;}
function addMesh(g,color,id,parent,x,y,z,glass){
 var clear=glass===true;
 var mat=new T.MeshStandardMaterial({color:color,roughness:clear?.12:.8,metalness:clear?.05:.04,side:T.DoubleSide,transparent:clear,opacity:clear?.24:1,depthWrite:!clear});
 var m=new T.Mesh(g,mat);m.userData.owner=id;m.userData.cadGlass=clear;
 if(x!==undefined)m.position.set(x,y,z);
 m.castShadow=!clear;m.receiveShadow=!clear&&sunSettings.onFaces;parent.add(m);
}
/* Shared wall-local void silhouette for walls and wall-mounted extrusions. */
function openingSpanAtX(o,x){
 var half=o.w/2,dx=Math.abs(x-o.offset);
 if(dx>=half||!Number.isFinite(dx))return null;
 var shape=o.shape||'rect',bottom=o.sill||0,top=bottom+o.h;
 if(shape==='round'){
  var f=Math.sqrt(Math.max(0,1-(dx/half)*(dx/half)));
  return [bottom+o.h*(1-f)/2,bottom+o.h*(1+f)/2];
 }
 if(shape==='triangle')return [bottom,bottom+o.h*(1-dx/half)];
 if(['arch','segment','pointed'].includes(shape)){
  var cap=Math.min(o.h*(shape==='segment'?.22:.42),half),base=top-cap;
  var rise=shape==='pointed'?1-dx/half:Math.sqrt(Math.max(0,1-(dx/half)*(dx/half)));
  return [bottom,base+cap*rise];
 }
 return [bottom,top];
}
function profileSpansAtX(att,x){
 var local=x-(att.offset||0),w=att.w,h=att.h,z=att.sill||0;
 if(Math.abs(local)>=w/2)return [];
 if(att.shape==='circle'){
  var rad=Math.min(w,h)/2;
  if(Math.abs(local)>=rad)return [];
  var rise=Math.sqrt(Math.max(0,rad*rad-local*local));
  return [[z+rad-rise,z+rad+rise]];
 }
 if(att.shape==='polyline'){
  var pts=att.points||[],hits=[];
  for(var i=0;i<pts.length;i++){
   var a=pts[i],b=pts[(i+1)%pts.length],x0=a[0]*w,x1=b[0]*w;
   if((x0<=local&&local<x1)||(x1<=local&&local<x0))
    hits.push(z+(a[1]+(local-x0)/(x1-x0)*(b[1]-a[1]))*h);
  }
  hits.sort(function(a,b){return a-b;});
  var spans=[];
  for(var j=0;j+1<hits.length;j+=2)if(hits[j+1]-hits[j]>.0001)spans.push([hits[j],hits[j+1]]);
  return spans;
 }
 return [[z,z+h]];
}
function subtractVerticalSpans(spans,cuts){
 cuts.forEach(function(cut){
  spans=spans.flatMap(function(s){
   if(cut[1]<=s[0]||cut[0]>=s[1])return [s];
   var out=[];
   if(s[0]<cut[0])out.push([s[0],cut[0]]);
   if(cut[1]<s[1])out.push([cut[1],s[1]]);
   return out;
  });
 });
 return spans;
}
/* Partition the wall elevation or slab plan at the edges of its rectangular openings. */
function architectureParts(r,part){
 var wall=r.type==='wall',length=r.w,span=wall?r.h:r.d,base=wall?0:-span/2,top=base+span;
 var thickness=wall?r.d:r.h,slope=wall?0:Math.tan((r.pitch||0)*Math.PI/180);
 var cuts=(r.openings||[]).map(function(o){
  var bottom=wall?o.sill:o.offsetY-o.d/2,upper=wall?o.sill+o.h:o.offsetY+o.d/2;
  return {source:o,left:clamp(o.offset-o.w/2,-length/2,length/2),right:clamp(o.offset+o.w/2,-length/2,length/2),
   bottom:clamp(bottom,base,top),top:clamp(upper,base,top)};
 }).filter(function(o){return o.right-o.left>.01&&o.top-o.bottom>.01;});
 var xs=[-length/2,length/2],ys=[base,top];
 cuts.forEach(function(o){
  xs.push(o.left,o.right);ys.push(o.bottom,o.top);
  if(wall&&(o.source.shape||'rect')!=='rect'){
   var steps=Math.max(12,Math.min(96,Math.ceil((o.right-o.left)/.025)));
   for(var step=1;step<steps;step++)xs.push(o.left+(o.right-o.left)*step/steps);
  }
 });
 xs=[...new Set(xs)].sort(function(a,b){return a-b;});ys=[...new Set(ys)].sort(function(a,b){return a-b;});
 var color=wall?0xaab0b5:r.slabKind==='roof'?0x89939a:0xb5bdc3;
 for(var i=0;i<xs.length-1;i++){
  var midX=(xs[i]+xs[i+1])/2,localY=ys.slice();
  if(wall)cuts.forEach(function(o){
   var span=openingSpanAtX(o.source,midX);
   if(span){localY.push(clamp(span[0],base,top),clamp(span[1],base,top));}
  });
  localY=[...new Set(localY)].sort(function(a,b){return a-b;});
  for(var j=0;j<localY.length-1;j++){
  var x0=xs[i],x1=xs[i+1],y0=localY[j],y1=localY[j+1],x=(x0+x1)/2,y=(y0+y1)/2;
  if(cuts.some(function(o){
   if(x<=o.left||x>=o.right)return false;
   var span=wall?openingSpanAtX(o.source,x):[o.bottom,o.top];
   return span&&y>span[0]&&y<span[1];
  }))continue;
  if(wall)part(x1-x0,thickness,y1-y0,x,0,y0,color,0);
  else part(x1-x0,y1-y0,thickness,x,y,0,color,slope);
  }
 }
 if(!wall)return;
 cuts.forEach(function(o){
  var opening=o.source;
  if(opening.kind==='opening'||opening.styleId==='open-door'||(opening.shape||'rect')!=='rect')return;
  var x=(o.left+o.right)/2,w=o.right-o.left,h=o.top-o.bottom,z=o.bottom;
  var frame=Math.min(.055,w/4,h/4);
  if(opening.kind==='door'){
   var id=opening.styleId||'',frameDepth=thickness+.03;
   var doubleLeaf=/double|french|terrace|bifold|folding|industrial|revolving/.test(id);
   var panels=/garage/.test(id)?1:/bifold|folding/.test(id)?4:doubleLeaf?2:1;
   var sliding=/sliding|pocket|barn|terrace/.test(id);
   var glazed=/french|terrace|industrial/.test(id);
   var frameW=Math.min(.065,w/10),usable=Math.max(.05,w-2*frameW);
   var leafColor=glazed?0x598fa4:/fire-rated|industrial/.test(id)?0x8296a0:0x997a63;
   // Perimeter frame, head and both jambs, remain attached to the host.
   part(w,frameDepth,frameW,x,0,z+h-frameW,0x73848d,0);
   part(frameW,frameDepth,h,o.left+frameW/2,0,z,0x73848d,0);
   part(frameW,frameDepth,h,o.right-frameW/2,0,z,0x73848d,0);
   var leafW=usable/panels;
   for(var leaf=0;leaf<panels;leaf++){
    var cx=o.left+frameW+leafW*(leaf+.5);
    var inset=Math.min(.022,leafW/10),height=Math.max(.1,h-2*frameW);
    if(glazed){
     // The central glazed area must not be backed by an opaque door slab.
     part(Math.max(.04,leafW-2*inset),.035,Math.max(.10,height*.20),cx,sliding&&leaf%2?.028:-.015,z+frameW,leafColor,0);
     part(.025,.05,height,cx-leafW/2+inset,0,z+frameW,0x607783,0);
     part(.025,.05,height,cx+leafW/2-inset,0,z+frameW,0x607783,0);
     part(Math.max(.04,leafW-.02),.05,.028,cx,0,z+frameW+height-.028,0x607783,0);
    }else part(Math.max(.04,leafW-2*inset),.035,height,cx,sliding&&leaf%2?.028:-.015,z+frameW,leafColor,0);
    if(glazed){
     part(Math.max(.03,leafW-.1),.041,Math.max(.08,height*.66),cx,sliding&&leaf%2?.028:-.015,z+frameW+height*.20,0x4b8999,0,true);
     part(Math.max(.03,leafW-.08),.055,.025,cx,0,z+frameW+height*.52,0xa5b5be,0);
    }
    // Door leaf side rails / panel divisions.
    part(Math.min(.035,leafW/8),.051,height,o.left+frameW+leafW*leaf+.022,0,z+frameW,0x607783,0);
   }
   if(sliding){
    part(w,.075,.018,x,-frameDepth/2,z+.005,0x697b85,0);
    part(w,.075,.018,x,-frameDepth/2,z+h-.028,0x697b85,0);
   }
   if(/garage/.test(id))for(var rail=1;rail<6;rail++)part(usable,.055,.018,x,0,z+h*rail/6,0x596d7b,0);
   if(/barn/.test(id))part(w+.14,.1,.035,x,0,z+h+.065,0x394b55,0);
  }else{
   var id=opening.styleId||'',d=thickness+.035;
   var frameW=Math.min(.055,w/10,h/10),innerW=Math.max(.04,w-2*frameW),innerH=Math.max(.04,h-2*frameW);
   var sliding=/sliding/.test(id),n=/double|two-leaf|sliding|bay/.test(id)?2:/ribbon/.test(id)?3:1;
   var glazingColor=/glass-block/.test(id)?0x9ec8d3:0x548b9e;
   // Full perimeter with clear glazing to distinguish windows from solid doors.
   part(w,d,frameW,x,0,z,0x9babb5,0);
   part(w,d,frameW,x,0,z+h-frameW,0x9babb5,0);
   part(frameW,d,h,o.left+frameW/2,0,z,0x9babb5,0);
   part(frameW,d,h,o.right-frameW/2,0,z,0x9babb5,0);
   part(innerW,.016,innerH,x,0,z+frameW,glazingColor,0,true);
   for(var pane=1;pane<n;pane++)
    part(Math.min(.048,innerW/16),d+.025,innerH,o.left+frameW+innerW*pane/n,0,z+frameW,0xd1dae0,0);
   if(/french|glass-block/.test(id)){
    for(var grid=1;grid<4;grid++)
     part(innerW,.038,.018,x,0,z+frameW+innerH*grid/4,0xb9c7cd,0);
    for(var col=1;col<4;col++)
     part(.020,.038,innerH,o.left+frameW+innerW*col/4,0,z+frameW,0xb9c7cd,0);
   }
   if(/awning|hopper|tilt-turn|clerestory|ribbon|guillotine/.test(id))
    part(innerW,d+.024,.022,x,0,z+frameW+innerH*(/awning|clerestory|ribbon/.test(id)?.67:.5),0xd6e0e5,0);
   if(/louver/.test(id))for(var blade=1;blade<9;blade++)
    part(innerW,d+.06,.026,x,0,z+frameW+innerH*blade/9,0x809ba9,0);
   if(sliding){
    part(w,.08,.02,x,0,z+.01,0x718694,0);
    part(w,.08,.02,x,0,z+h-.03,0x718694,0);
   }
   if(/bay/.test(id)){
    part(.048,.16,innerH,o.left+frameW,0,z+frameW,0x9aadb7,0);
    part(.048,.16,innerH,o.right-frameW,0,z+frameW,0x9aadb7,0);
   }
  }
 });
}
/* Build a true miter at two-wall L corners rather than overlapping capped boxes.
   Join is derived at render time: original parametric endpoints, spans and
   door/window opening offsets remain editable and unchanged. */
function wallJoinOffsets(wall){
 if(wall.type!=='wall')return {start:null,end:null};
 var theta=(wall.rot||0)*Math.PI/180,u={x:Math.cos(theta),y:Math.sin(theta)};
 var normal={x:-u.y,y:u.x},half=(wall.w||0)/2;
 var ends=[
  {key:'start',point:{x:wall.x-u.x*half,y:wall.y-u.y*half}},
  {key:'end',point:{x:wall.x+u.x*half,y:wall.y+u.y*half}}
 ];
 var result={start:null,end:null};
 ends.forEach(function(end){
  var matches=[];
  records.forEach(function(other){
   if(other===wall||other.type!=='wall'||other.id===wall.id||Math.abs((other.z||0)-(wall.z||0))>.025)return;
   var a=(other.rot||0)*Math.PI/180,d={x:Math.cos(a),y:Math.sin(a)},h=(other.w||0)/2;
   [{key:'start',point:{x:other.x-d.x*h,y:other.y-d.y*h}},
    {key:'end',point:{x:other.x+d.x*h,y:other.y+d.y*h}}].forEach(function(p){
    if(Math.hypot(end.point.x-p.point.x,end.point.y-p.point.y)<.025)
     matches.push({other:other,at:p.key,dir:d});
   });
  });
  // If an endpoint hits the middle of a continuous wall, trim the branch
  // against the host's near face rather than allowing its cap to protrude.
  // The host stays continuous (T junction, no alteration to its openings).
  if(matches.length===0){
   var branch=[];
   records.forEach(function(host){
    if(host===wall||host.type!=='wall'||host.id===wall.id||Math.abs((host.z||0)-(wall.z||0))>.025)return;
    var a=(host.rot||0)*Math.PI/180,hu={x:Math.cos(a),y:Math.sin(a)},hn={x:-hu.y,y:hu.x};
    var dx=end.point.x-host.x,dy=end.point.y-host.y;
    var along=dx*hu.x+dy*hu.y,dist=dx*hn.x+dy*hn.y;
    if(Math.abs(along)>host.w/2-Math.max(host.d,wall.d)*.6||Math.abs(dist)>.025)return;
    var toward=end.key==='end'?{x:-u.x,y:-u.y}:u;
    var side=toward.x*hn.x+toward.y*hn.y,incidence=u.x*hn.x+u.y*hn.y;
    if(Math.abs(incidence)<.25||Math.abs(side)<.25)return;
    var trim=Math.sign(side)*(host.d/2)/incidence;
    if(Math.abs(trim)>wall.w*.4)return;
    branch.push({minus:trim,plus:trim});
   });
   if(branch.length===1)result[end.key]=branch[0];
   return;
  }
  // Only unambiguous two-wall endpoint connections receive an L miter.
  if(matches.length!==1)return;
  var next=matches[0],v=next.dir;
  // For the connected path the other wall must run away from an end point,
  // or toward a start point; flip its travel direction when needed.
  if((end.key==='end'&&next.at==='end')||(end.key==='start'&&next.at==='start'))
   v={x:-v.x,y:-v.y};
  var cross=u.x*v.y-u.y*v.x;
  if(Math.abs(cross)<.15)return; // collinear: no visible miter required
  var otherNormal={x:-v.y,y:v.x},ratio=next.other.d/wall.d;
  if(!Number.isFinite(ratio)||ratio<=0)return;
  // Solve intersection of equal-side offset lines in world XY.
  var compute=function(localY){
   var nx=otherNormal.x*localY*ratio-normal.x*localY;
   var ny=otherNormal.y*localY*ratio-normal.y*localY;
   return (nx*v.y-ny*v.x)/cross;
  };
  var lo=compute(-wall.d/2),hi=compute(wall.d/2);
  if(!Number.isFinite(lo+hi)||Math.max(Math.abs(lo),Math.abs(hi))>Math.max(wall.d,next.other.d)*2.5)return;
  result[end.key]={minus:lo,plus:hi};
 });
 return result;
}
function applyWallMiter(g,r,partWidth,partCenter,join){
 var start=join.start&&Math.abs(partCenter-partWidth/2+r.w/2)<.0001;
 var end=join.end&&Math.abs(partCenter+partWidth/2-r.w/2)<.0001;
 if(!start&&!end)return;
 var positions=g.getAttribute('position');
 for(var i=0;i<positions.count;i++){
  var px=positions.getX(i),py=positions.getY(i);
  var v=start&&Math.abs(px+partWidth/2)<.00001?join.start:
   end&&Math.abs(px-partWidth/2)<.00001?join.end:null;
  if(v)positions.setX(i,px+(py<0?v.minus:v.plus));
 }
 positions.needsUpdate=true;g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();
}
function addWallAttachments(wall,group){
 (wall.attachments||[]).forEach(function(att){
  if(!['rect','circle','polyline'].includes(att.shape))return;
  var w=clamp(finite(att.w,.6),.03,100),h=clamp(finite(att.h,.6),.03,100);
  var profile=new T.Shape();
  if(att.shape==='circle')profile.absarc(0,Math.min(w,h)/2,Math.min(w,h)/2,0,Math.PI*2,false);
  else if(att.shape==='polyline'){
   if(!Array.isArray(att.points)||att.points.length<3||att.points.length>64)return;
   att.points.forEach(function(p,i){if(i)profile.lineTo(p[0]*w,p[1]*h);else profile.moveTo(p[0]*w,p[1]*h);});
   profile.closePath();
  }else{
   profile.moveTo(-w/2,0);profile.lineTo(w/2,0);profile.lineTo(w/2,h);profile.lineTo(-w/2,h);profile.closePath();
  }
  var dep=clamp(finite(att.depth,.12),.01,3),side=att.side===1?1:-1;
  var candidates=(wall.openings||[]).filter(function(o){
   return o.offset+o.w/2>att.offset-w/2&&o.offset-o.w/2<att.offset+w/2&&
    (o.sill||0)+o.h>att.sill-h&&o.sill<att.sill+h;
  });
  var material=new T.MeshStandardMaterial({color:0xaab0b5,roughness:.82,side:T.DoubleSide});
  var mesh;
  if(!candidates.length){
   // Preserve the smooth original circle and polygon when no opening cuts it.
   mesh=new T.Mesh(new T.ExtrudeGeometry(profile,{depth:dep,bevelEnabled:false,curveSegments:24}),material);
   mesh.rotation.x=Math.PI/2;
   mesh.position.set(att.offset,side*wall.d/2+(side===1?dep:0),att.sill);
  }else{
   // Cut the addition with the same wall-local openings as the host wall.
   // Vertical sectioning supports partial intersections and concave polylines.
   var verts=[],left=att.offset-w/2,right=att.offset+w/2;
   var width=right-left,steps=Math.max(24,Math.min(180,Math.ceil(width/.018)));
   var y0=side*wall.d/2+(side===-1?-dep:0),y1=y0+dep;
   function quad(a,b,d,e){
    verts.push.apply(verts,a.concat(b,d,a,d,e));
   }
   function prism(x0,x1,z0,z1){
    if(x1-x0<.00001||z1-z0<.00001)return;
    var A=[x0,y0,z0],B=[x1,y0,z0],C=[x1,y0,z1],D=[x0,y0,z1];
    var E=[x0,y1,z0],F=[x1,y1,z0],G=[x1,y1,z1],H=[x0,y1,z1];
    quad(A,D,C,B);quad(E,F,G,H);quad(A,E,H,D);
    quad(B,C,G,F);quad(A,B,F,E);quad(D,H,G,C);
   }
   for(var i=0;i<steps;i++){
    var x0=left+width*i/steps,x1=left+width*(i+1)/steps,mid=(x0+x1)/2;
    var spans=profileSpansAtX(att,mid);
    var cuts=candidates.map(function(o){return openingSpanAtX(o,mid);}).filter(Boolean);
    subtractVerticalSpans(spans,cuts).forEach(function(span){prism(x0,x1,span[0],span[1]);});
   }
   var geometry=new T.BufferGeometry();
   geometry.setAttribute('position',new T.Float32BufferAttribute(verts,3));
   geometry.computeVertexNormals();mesh=new T.Mesh(geometry,material);
  }
  mesh.userData.owner=wall.id;mesh.castShadow=true;mesh.receiveShadow=sunSettings.onFaces;group.add(mesh);
 });
}
/* Schematic frames and infill for non-rectangular openings.
   The host and its attached extrusions remain genuinely cut, while doors and
   glazed windows retain a readable architectural appearance. */
function addShapedOpenings(wall,group){
 (wall.openings||[]).forEach(function(o){
  if(!o||!['round','arch','segment','triangle','pointed'].includes(o.shape))return;
  var points=[],n=48,left=o.offset-o.w/2,right=o.offset+o.w/2;
  for(var i=0;i<=n;i++){
   var x=left+(right-left)*i/n,span=openingSpanAtX(o,x+(i===0?1e-7:i===n?-1e-7:0));
   if(span)points.push([x,span[1]]);
  }
  for(var j=n;j>=0;j--){
   var bx=left+(right-left)*j/n,lower=openingSpanAtX(o,bx+(j===0?1e-7:j===n?-1e-7:0));
   if(lower)points.push([bx,lower[0]]);
  }
  if(points.length<4)return;
  var outline=new T.Shape();
  points.forEach(function(p,i){if(i)outline.lineTo(p[0],p[1]);else outline.moveTo(p[0],p[1]);});
  outline.closePath();
  if(o.kind!=='opening'&&o.styleId!=='open-door'){
   var mesh=new T.Mesh(new T.ExtrudeGeometry(outline,{depth:.025,bevelEnabled:false,steps:1}),new T.MeshStandardMaterial({
    color:o.kind==='window'?0x5794a8:0x987e66,
    transparent:o.kind==='window',opacity:o.kind==='window'?.24:1,roughness:o.kind==='window'?.18:.7,side:T.DoubleSide
   }));
   mesh.rotation.x=Math.PI/2;mesh.position.y=.0125;mesh.userData.owner=wall.id;
   mesh.userData.cadGlass=o.kind==='window';mesh.castShadow=!mesh.userData.cadGlass;
   mesh.receiveShadow=sunSettings.onFaces&&!mesh.userData.cadGlass;
   mesh.material.depthWrite=!mesh.userData.cadGlass;group.add(mesh);
  }
  for(var side of [-1,1]){
   var path=points.map(function(p){return new T.Vector3(p[0],side*(wall.d/2+.012),p[1]);});
   var line=new T.LineLoop(new T.BufferGeometry().setFromPoints(path),
    new T.LineBasicMaterial({color:0x788993}));
   line.userData.owner=wall.id;group.add(line);
  }
 });
}
function buildObject(r){
 var group=new T.Group();group.userData.owner=r.id;group.position.set(r.x||0,r.y||0,r.z||0);group.rotation.z=(r.rot||0)*Math.PI/180;
 if(r.type==='box')addMesh(boxGeom(r.w,r.d,r.h),0x9ea9b4,r.id,group);
 var wallJoin=r.type==='wall'?wallJoinOffsets(r):null;
 if(r.type==='wall'||r.type==='slab')architectureParts(r,function(w,d,h,x,y,z,color,slope,glass){
  var g=boxGeom(w,d,h);
  if(wallJoin)applyWallMiter(g,r,w,x,wallJoin);
  if(slope){
   var p=g.getAttribute('position');
   for(var i=0;i<p.count;i++)p.setZ(i,p.getZ(i)+(p.getX(i)+x)*slope);
   g.computeVertexNormals();
  }
  addMesh(g,color,r.id,group,x,y,z,glass);
 });
 if(r.type==='wall')addWallAttachments(r,group);
 if(r.type==='wall')addShapedOpenings(r,group);
 if(r.type==='sphere'){var sphere=new T.SphereGeometry(r.radius,28,18);sphere.translate(0,0,r.radius);addMesh(sphere,0xb0b7c0,r.id,group);}
 if(r.type==='cylinder'||r.type==='cone'){
  var cone=new T.CylinderGeometry(r.type==='cone'?0:r.radius,r.radius,r.h,32);
  cone.rotateX(Math.PI/2);cone.translate(0,0,r.h/2);addMesh(cone,0x8fa9bc,r.id,group);
 }
 if(r.type==='boolean'&&Array.isArray(r.triangles)){var geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(r.triangles,3));geometry.computeVertexNormals();addMesh(geometry,0x8fa8bc,r.id,group);}
 return group;
}
function disposeMeshes(group){
 group.traverse(function(o){if(o.isMesh||o.isLine||o.userData?.cadSketch){o.geometry.dispose();o.material.dispose();}});
}
function visitMeshes(visitor){
 var group=modelRoot||new T.Group();
 if(!modelRoot)records.filter(visibleRecord).forEach(function(record){group.add(buildObject(record));});
 group.updateMatrixWorld(true);
 try{group.traverse(function(mesh){if(mesh.isMesh)visitor(mesh);});}
 finally{if(!modelRoot)disposeMeshes(group);}
}
function redraw(){
 if(fallbackCanvas){fallbackDraw();return;}
 if(!modelRoot)return;
 disposeMeshes(modelRoot);
 modelRoot.clear();records.filter(visibleRecord).forEach(function(record){modelRoot.add(buildObject(record));});
 modelRoot.updateMatrixWorld(true);applyRenderStyle();highlight();applySunSettings();
}
function highlight(){
 if(fallbackCanvas){fallbackDraw();return;}
 if(!modelRoot)return;
 modelRoot.children.forEach(function(g){
  var active=selected.includes(g.userData.owner);
  g.traverse(function(o){if(o.isMesh)o.material.emissive.setHex(active?0x183848:0x000000);});
 });
}
function newRecord(type){
 var n=records.length;
 return {id:serial++,type:type,layerId:currentLayer,x:(n%4)*1.65-2.5,y:Math.floor(n/4)*2.6-1,z:0,
 rot:0,w:type==='wall'?4:2,d:type==='wall'?.22:2,h:type==='wall'?2.8:type==='slab'?.20:2,radius:1,pitch:0,slabKind:'floor',openings:[]};
}
function styleOptions(kind,id){
 return '<option value=""'+(!ARCH_STYLES[kind].some(function(st){return st.id===id;})?' selected':'')+'>Custom</option>'+
  ARCH_STYLES[kind].map(function(st){return '<option value="'+st.id+'"'+(st.id===id?' selected':'')+'>'+st.name+'</option>';}).join('');
}
function renderProps(){
 if(!root)return;var p=root.querySelector('.props');
 if(!selected.length){p.innerHTML='<p>Seleccioná un objeto para editar sus medidas en metros.</p>';return;}
 if(selected.length!==1){p.innerHTML='<p>'+selected.length+' sólidos seleccionados. Booleanas: elegí exactamente dos BOX sin rotación (prototipo).</p>';return;}
 var r=records.find(function(v){return v.id===selected[0];});if(!r){p.innerHTML='';return;}
 var html='<strong>'+escapeHtml(r.type.toUpperCase()+' #'+r.id)+'</strong>'+
  '<label>Layer <select data-object-layer>'+layerOptions(r.layerId||'0')+'</select></label>';
 var host=r.type==='wall'||r.type==='slab';
 if(host)html+='<label>Style <select data-object-style>'+styleOptions(r.type,r.styleId)+'</select></label>';
 var keys=['x','y','z'];
 if(r.type!=='boolean')keys.push('rot');
 if(r.type==='box'||r.type==='wall'||r.type==='slab')keys.push('w','d','h');
 if(r.type==='slab')keys.push('pitch');
 if(r.type==='sphere')keys.push('radius');
 if(r.type==='cone'||r.type==='cylinder')keys.push('radius','h');
 var labels={x:'X (m)',y:'Y (m)',z:'Z (m)',rot:'Rotation (°)',w:r.type==='wall'?'Length (m)':'Width (m)',d:r.type==='wall'?'Thickness (m)':'Depth (m)',h:r.type==='slab'?'Thickness (m)':'Height (m)',pitch:'Roof slope (°)',radius:'Radius (m)'};
 keys.forEach(function(k){html+='<label>'+labels[k]+'<input type="number" step="any" data-key="'+k+'" value="'+escapeHtml(r[k]||0)+'"></label>';});
 if(r.type==='wall'){
  html+='<div class="detail"><strong>WALL EXTRUSIONS</strong> '+
   '<button class="btn" type="button" data-add-extrusion="rect">+ Rectangle</button> '+
   '<button class="btn" type="button" data-add-extrusion="circle">+ Circle</button> '+
   '<button class="btn" type="button" data-add-extrusion="polyline">+ Polyline</button>';
  (r.attachments||[]).forEach(function(a){
   html+='<div class="detail"><strong>'+escapeHtml(a.shape)+' #'+a.id+'</strong>';
   [['offset','Offset X'],['sill','Base Z'],['w','Width'],['h','Height'],['depth','Extrusion']].forEach(function(pair){
    html+='<label>'+pair[1]+' (m)<input type="number" step="any" data-att-id="'+a.id+'" data-att-key="'+pair[0]+'" value="'+a[pair[0]]+'"></label>';
   });
   html+='<label>Face <select data-att-id="'+a.id+'" data-att-key="side"><option value="-1"'+(a.side===-1?' selected':'')+'>Front</option><option value="1"'+(a.side===1?' selected':'')+'>Back</option></select></label>'+
    '<button class="btn" type="button" data-del-extrusion="'+a.id+'">Detach</button></div>';
  });
  html+='</div>';
 }
 if(host&&r.openings.length){
  html+='<div class="detail"><strong>PARAMETRIC OPENINGS</strong>';
  r.openings.forEach(function(o,i){
   html+='<div class="detail"><strong>'+escapeHtml(o.kind.toUpperCase())+' '+(i+1)+'</strong>';
   var fields=r.type==='wall'?[['offset','Offset X'],['w','Width'],['h','Height'],['sill','Sill']]:
    [['offset','Offset X'],['offsetY','Offset Y'],['w','Width'],['d','Depth']];
   fields.forEach(function(k){
    html+='<label>'+k[1]+'<input type="number" step="any" data-opening="'+o.id+'" data-attr="'+k[0]+'" value="'+escapeHtml(o[k[0]])+'"></label>';
   });
   if(r.type==='wall'){
    var kinds=o.kind==='opening'?ARCH_STYLES.opening.filter(function(st){return st.host==='wall';}):ARCH_STYLES[o.kind];
    if(kinds)html+='<label>Model <select data-opening-style="'+o.id+'">'+kinds.map(function(st){
     return '<option value="'+st.id+'"'+(st.id===o.styleId?' selected':'')+'>'+escapeHtml(st.name)+'</option>';
    }).join('')+'</select></label>';
   }
   if(r.type==='wall')html+='<label>Void shape <select data-opening-shape="'+o.id+'">'+
     ['rect','round','arch','segment','triangle','pointed'].map(function(s){return '<option value="'+s+'"'+((o.shape||'rect')===s?' selected':'')+'>'+s+'</option>';}).join('')+'</select></label>';
    html+='<button class="btn" type="button" data-remove-opening="'+o.id+'">Remove opening</button></div>';
  });html+='</div>';
 }
 html+='<div class="detail"><button class="btn" type="button" data-remove-object="'+r.id+'">Delete object</button></div>';
 p.innerHTML=html;
}
function change(e){
 var input=e.target;
 if(!input.matches('input[data-key],input[data-opening],select[data-object-style],select[data-object-layer],input[data-att-id],select[data-att-id],select[data-opening-shape],select[data-opening-style]'))return;
 var r=records.find(function(v){return selected.includes(v.id);});if(!r||!editableRecord(r))return;
 if(input.matches('select[data-object-layer]')){
  if(layers.some(function(l){return l.id===input.value;}))r.layerId=input.value;
  if(!editableRecord(r))selected=[];
  redraw();renderProps();text('Capa del objeto actualizada');return;
 }
 if(input.matches('select[data-object-style]')){
  var st=ARCH_STYLES[r.type].find(function(s){return s.id===input.value;});
  r.styleId=st?.id||'';
  if(st){
   r.h=st.h;
   if(r.type==='wall')r.d=st.d;
   else{r.pitch=st.pitch;r.slabKind=st.slabKind;}
  }
  redraw();renderProps();text('Estilo actualizado · geometría regenerada');return;
 }
 if(input.dataset.openingStyle){
  var item=(r.openings||[]).find(function(o){return o.id===Number(input.dataset.openingStyle);});
  if(!item)return;
  var variants=item.kind==='opening'?ARCH_STYLES.opening.filter(function(st){return st.host==='wall';}):ARCH_STYLES[item.kind];
  var preset=variants.find(function(st){return st.id===input.value;});
  if(!preset)return;
  if(preset.w>r.w||preset.h>r.h){renderProps();text('El modelo no entra en este muro');return;}
  var nextSill=Math.max(0,Math.min(preset.sill||0,r.h-preset.h));
  var nextOffset=clamp(item.offset,-(r.w-preset.w)/2,(r.w-preset.w)/2);
  var collision=(r.openings||[]).some(function(other){
   return other!==item&&Math.abs(other.offset-nextOffset)<(other.w+preset.w)/2+.015&&
    Math.max(other.sill||0,nextSill)<Math.min((other.sill||0)+(other.h||0),nextSill+preset.h)+.015;
  });
  if(collision){renderProps();text('La carpintería se superpone a otro vano');return;}
  Object.assign(item,{styleId:preset.id,w:preset.w,h:preset.h,sill:nextSill,offset:nextOffset,shape:preset.shape||'rect'});
  redraw();renderProps();text('Modelo actualizado y vano regenerado');return;
 }
 if(input.dataset.openingShape){
  var cut=(r.openings||[]).find(function(o){return o.id===Number(input.dataset.openingShape);});
  if(cut&&['rect','round','arch','segment','triangle','pointed'].includes(input.value)){cut.shape=input.value;redraw();renderProps();text('Forma del vano actualizada');}
  return;
 }
 var val=Number(input.value);if(!Number.isFinite(val))return text('Valor inválido');
 if(input.dataset.attId){
  var att=(r.attachments||[]).find(function(a){return a.id===Number(input.dataset.attId);});
  if(!att)return;
  var key=input.dataset.attKey;
  att[key]=key==='side'?(val===1?1:-1):['w','h'].includes(key)?clamp(val,.03,100):key==='depth'?clamp(val,.01,3):clamp(val,-10000,10000);
  redraw();renderProps();text('Extrusión actualizada');return;
 }
 if(input.dataset.opening){
  var o=(r.openings||[]).find(function(v){return v.id===Number(input.dataset.opening);});if(!o)return;
  var key=input.dataset.attr;
  if(key==='w'||key==='h'||key==='d')val=clamp(val,.05,1000);
  else if(key==='sill')val=clamp(val,0,1000);
  else val=clamp(val,-10000,10000);
  o[key]=val;
 }else{
  var name=input.dataset.key;
  if(['w','d','h','radius'].includes(name))val=clamp(val,.01,1000);
  else if(name==='rot')val=clamp(val,-3600,3600);
  else if(name==='pitch')val=clamp(val,-45,45);
  else val=clamp(val,-10000,10000);
  r[name]=val;
 }
 redraw();renderProps();text('Parámetros actualizados · geometría 3D regenerada');
}
function addWallExtrusion(btn){
 var wall=records.find(function(r){return selected.includes(r.id)&&r.type==='wall'&&editableRecord(r);});
 if(!wall)return;
 var kind=btn.dataset.addExtrusion,pts=null;
 if(kind==='polyline'){
  var raw=window.prompt('Closed polyline X,Z coordinates separated by semicolons', '-0.5,0; 0.5,0; 0.3,1; -0.3,1');
  if(raw===null)return;
  pts=raw.split(';').map(function(p){return p.trim().split(/[ ,]+/).map(Number);});
  if(pts.length<3||pts.length>64||pts.some(function(p){return p.length!==2||p.some(function(v){return !Number.isFinite(v)||Math.abs(v)>10;});})){text('Invalid polyline');return;}
  var area=0;pts.forEach(function(p,i){var q=pts[(i+1)%pts.length];area+=p[0]*q[1]-p[1]*q[0];});
  if(Math.abs(area)<.00001){text('Polyline has zero area');return;}
  if(area<0)pts.reverse();
 }
 wall.attachments=wall.attachments||[];
 if(wall.attachments.length>=100){text('Attachment limit reached');return;}
 wall.attachments.push({id:serial++,shape:kind,points:pts,offset:0,sill:.5,w:.6,h:.6,depth:.12,side:-1});
 redraw();renderProps();text('Extruded profile attached to wall');
}
function clickProps(e){
 var add=e.target.closest('[data-add-extrusion]');
 if(add){addWallExtrusion(add);return;}
 var delAttachment=e.target.closest('[data-del-extrusion]');
 if(delAttachment){
  var wall=records.find(function(r){return selected.includes(r.id)&&r.type==='wall';});
  if(!wall)return;
  wall.attachments=(wall.attachments||[]).filter(function(a){return a.id!==Number(delAttachment.dataset.delExtrusion);});
  redraw();renderProps();text('Attachment removed');return;
 }
 var o=e.target.closest('[data-remove-opening]');if(o){
  var host=records.find(function(r){return selected.includes(r.id)&&(r.type==='wall'||r.type==='slab');});if(!host)return;
  host.openings=host.openings.filter(function(x){return x.id!==Number(o.dataset.removeOpening);});
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
 var result={id:serial++,type:'boolean',layerId:a.layerId||'0',x:0,y:0,z:0,rot:0,triangles:triangles};
 records.push(result);selected=[result.id];redraw();renderProps();text('BOOLEAN '+kind.toUpperCase()+' · resultado 3D generado');
}

/* View-only sketch presentation: mesh geometry and parameters are never changed.
   PNG reflects WebGL's occlusion. Vector SVG is a projected edge drawing and
   may include obscured edges, intentionally disclosed in the toolbar status. */
const CAD3D_VISUAL_STYLES={
 wire2d:'2D Wireframe',wire3d:'3D Wireframe',hidden:'Hidden',
 shaded:'Shaded','shaded-edges':'Solid + Edges',realistic:'Realistic',
 monochrome:'Monochrome',xray:'X-Ray',sketch:'Croquis'
};
function renderStyleControls(){
 if(!root)return;
 root.querySelectorAll('[data-render-style]').forEach(function(button){
  button.setAttribute('aria-pressed',String(button.dataset.renderStyle===renderStyle));
 });
 var launcher=root.querySelector('.styleLaunch');
 if(launcher)launcher.textContent='Visual Style · '+(CAD3D_VISUAL_STYLES[renderStyle]||'Shaded')+' ▾';
 var sketchButton=root.querySelector('[data-action="sketch"]');
 if(sketchButton)sketchButton.classList.toggle('sketchActive',renderStyle==='sketch');
 root.querySelector('.view')?.classList.toggle('sketchView',renderStyle==='sketch');
}
function applyRenderStyle(){
 renderStyleControls();
 if(!T)return;
 var lightPaper=['sketch','hidden','monochrome','wire2d'].includes(renderStyle);
 if(scene)scene.background=new T.Color(lightPaper?0xf3f1e8:MODEL_BACKGROUND);
 if(gridHelper)gridHelper.visible=draftModes.grid&&!['sketch','hidden','wire2d'].includes(renderStyle);
 if(axesHelper)axesHelper.visible=!['sketch','hidden','wire2d'].includes(renderStyle);
 if(sunGround)sunGround.visible=sunSettings.enabled&&sunSettings.onGround&&!['sketch','hidden','wire2d','wire3d'].includes(renderStyle);
 if(!modelRoot)return;
 var plainLines=['wire2d','wire3d','hidden'].includes(renderStyle);
 var withEdges=['wire2d','wire3d','hidden','shaded-edges','monochrome','sketch'].includes(renderStyle);
 modelRoot.traverse(function(m){
  if(!m.isMesh||!m.material||!m.geometry)return;
  if(m.userData.cadBaseColor===undefined)m.userData.cadBaseColor=m.material.color.getHex();
  m.children.filter(function(ch){return ch.userData?.cadSketch;}).forEach(function(ch){
   m.remove(ch);ch.geometry.dispose();ch.material.dispose();
  });
  var mat=m.material,base=m.userData.cadBaseColor;
  var color=renderStyle==='monochrome'?0xe8e8e3:renderStyle==='sketch'?0xf7f4eb:
   renderStyle==='realistic'?(base===0xaab0b5?0xb9b7af:base===0x8b725e?0xa07852:base):base;
  mat.color.setHex(color);
  mat.colorWrite=!plainLines;
  mat.depthWrite=!m.userData.cadGlass&&(renderStyle==='hidden'||(!plainLines&&renderStyle!=='xray'));
  mat.depthTest=true;
  var isGlass=m.userData.cadGlass===true;
  mat.transparent=isGlass||renderStyle==='xray';
  mat.opacity=renderStyle==='xray'?.16:isGlass?.24:1;
  mat.roughness=isGlass?.12:renderStyle==='realistic'?.54:.8;
  mat.metalness=isGlass?.05:renderStyle==='realistic'?.10:.04;
  m.castShadow=!plainLines&&!isGlass;
  m.receiveShadow=sunSettings.enabled&&sunSettings.onFaces&&!plainLines&&!isGlass;
  if(withEdges){
   var edge=new T.EdgesGeometry(m.geometry,22);
   var colorEdge=renderStyle==='sketch'?0x22282c:renderStyle==='shaded-edges'?0x394954:0x43535e;
   var depthTest=!['wire2d','wire3d'].includes(renderStyle);
   var line=new T.LineSegments(edge,new T.LineBasicMaterial({
    color:colorEdge,depthTest:depthTest,depthWrite:false,
    transparent:renderStyle==='shaded-edges',opacity:renderStyle==='shaded-edges'?.68:1
   }));
   line.userData.cadSketch=true;line.renderOrder=5;m.add(line);
  }
 });
}
function setVisualStyle(mode){
 if(!Object.prototype.hasOwnProperty.call(CAD3D_VISUAL_STYLES,mode))return false;
 renderStyle=mode;
 if(renderer)applyRenderStyle();
 else renderStyleControls();
 if(sunGround)sunGround.visible=sunSettings.enabled&&sunSettings.onGround&&
  !['sketch','hidden','wire2d','wire3d'].includes(renderStyle);
 if(fallbackCanvas)fallbackDraw();
 text('Visual Style: '+CAD3D_VISUAL_STYLES[mode]+' · cámara y geometría conservadas');
 return true;
}
function setSketchStyle(mode){
 setVisualStyle(mode==='sketch'?'sketch':'shaded-edges');
}
function exportViewPNG(){
 var canvas=renderer?.domElement||fallbackCanvas;
 if(!canvas)return text('Primero abrí el visor 3D');
 try{
  if(renderer)renderer.render(scene,camera);
  else fallbackDraw();
  var url=canvas.toDataURL('image/png');
  if(!url||url==='data:,')throw Error('El navegador no pudo capturar el visor');
  var a=document.createElement('a');a.href=url;a.download='blackline-cad3d-'+(root.querySelector('.cad3dViewSelect')?.value||'vista')+(renderStyle==='sketch'?'-croquis':'')+'.png';
  document.body.appendChild(a);a.click();a.remove();
  text('Vista '+(renderStyle==='sketch'?'tipo croquis ':'')+'exportada a PNG');
 }catch(e){text('No se pudo exportar PNG: '+(e.message||e));}
}
function exportSketchSVG(){
 if(!T)return text('El motor de geometría 3D todavía no está disponible');
 if(!records.length&&!underlay?.segments?.length)return text('No hay geometría para crear el croquis');
 var rect=(renderer?.domElement||fallbackCanvas).getBoundingClientRect();
 var w=Math.max(300,Math.round(rect.width)),h=Math.max(220,Math.round(rect.height));
 var fallbackProject=fallbackCanvas&&fallbackProjector();
 camera?.updateMatrixWorld();
 var lines=[],limit=28000;
 var proj=function(p){
  if(fallbackProject){
   var q=fallbackProject(p.x,p.y,p.z);
   return {x:q.x*w/rect.width,y:q.y*h/rect.height,z:0};
  }
  var v=p.clone().project(camera);return {x:(v.x+1)*.5*w,y:(1-v.y)*.5*h,z:v.z};
 };
 var add=function(a,b){
  if(lines.length>=limit)return;
  if(a.z<-1||a.z>1||b.z<-1||b.z>1)return;
  if(!Number.isFinite(a.x+a.y+b.x+b.y))return;
  lines.push('<path d="M'+a.x.toFixed(2)+' '+a.y.toFixed(2)+' L'+b.x.toFixed(2)+' '+b.y.toFixed(2)+'"/>');
 };
 var work=new T.Vector3();
 visitMeshes(function(mesh){
  if(lines.length>=limit)return;
  var g=new T.EdgesGeometry(mesh.geometry,25),pos=g.getAttribute('position');
  for(var i=0;i+1<pos.count&&lines.length<limit;i+=2){
   var a=work.fromBufferAttribute(pos,i).clone().applyMatrix4(mesh.matrixWorld),b=work.fromBufferAttribute(pos,i+1).clone().applyMatrix4(mesh.matrixWorld);
   add(proj(a),proj(b));
  }
  g.dispose();
 });
 if(underlay?.segments){
  var point=new T.Vector3();
  underlay.segments.forEach(function(v){
   if(lines.length>=limit)return;
   add(proj(point.set(v[0],v[1],0).clone()),proj(point.set(v[2],v[3],0).clone()));
  });
 }
 if(!lines.length)return text('La vista actual no contiene líneas visibles para SVG');
 var svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'">'+
 '<rect width="100%" height="100%" fill="#f8f6ee"/>'+
 '<g fill="none" stroke="#282e30" stroke-width="1.15" stroke-linejoin="round" stroke-linecap="round">'+lines.join('')+'</g></svg>';
 download('blackline-cad3d-'+(root.querySelector('.cad3dViewSelect')?.value||'vista')+'-croquis.svg',svg,'image/svg+xml;charset=utf-8');
 text('Croquis SVG vectorial exportado · proyección de aristas, puede incluir líneas ocultas');
}
function orbitCameraBy(dx,dy){
 if(!Number.isFinite(dx)||!Number.isFinite(dy))return;
 if(viewMode!=='perspective')viewMode='perspective';
 orbit.az-=dx*.010;
 orbit.el=clamp(orbit.el+dy*.010,-1.49,1.49);
 activeView='perspective';
 syncViewControls();
 applyViewCamera();
}
function bindOrbitBall(ball){
 if(!ball)return;
 var drag=null;
 ball.addEventListener('pointerdown',function(e){
  if(e.button!==0||drag)return;
  e.preventDefault();e.stopPropagation();
  drag={id:e.pointerId,x:e.clientX,y:e.clientY};
  ball.dataset.dragging='true';ball.setPointerCapture(e.pointerId);
 });
 ball.addEventListener('pointermove',function(e){
  if(!drag||drag.id!==e.pointerId)return;
  e.preventDefault();e.stopPropagation();
  var dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  drag.x=e.clientX;drag.y=e.clientY;
  orbitCameraBy(dx,dy);
 });
 function finish(e){
  if(!drag||drag.id!==e.pointerId)return;
  drag=null;delete ball.dataset.dragging;
 }
 ball.addEventListener('pointerup',finish);
 ball.addEventListener('pointercancel',finish);
 ball.addEventListener('lostpointercapture',function(){drag=null;delete ball.dataset.dragging;});
 ball.addEventListener('keydown',function(e){
  var vectors={ArrowLeft:[-12,0],ArrowRight:[12,0],ArrowUp:[0,-12],ArrowDown:[0,12]};
  if(!vectors[e.key])return;
  e.preventDefault();e.stopPropagation();orbitCameraBy(...vectors[e.key]);
 });
}
function syncViewControls(){
 root.querySelector('.cad3dViewSelect').value=activeView;
 root.querySelectorAll('[data-view-preset]').forEach(function(button){
  button.setAttribute('aria-pressed',String(button.dataset.viewPreset===activeView));
 });
}
function setViewPreset(key){
 var v=viewPresets.find(function(p){return p[0]===key;});
 if(!v)return;
 activeView=v[0];viewMode=v[2];orbit.az=v[3];orbit.el=v[4];
 if(viewMode==='walk')target.z=1.65;
 syncViewControls();applyViewCamera();
 root.querySelector('.placementGuide').hidden=true;
 text(v[1]+' · '+(viewMode==='walk'?'W/A/S/D caminar · rueda avanzar / retroceder':'Botón central: paneo · Mayús + central: órbita'));
}
function checkVisibleShadows(){
 var output=root.querySelector('.shadowFeedback');
 function report(message){output.textContent=message;text(message);}
 if(!renderer||!sunLight||!modelRoot)return report('WebGL unavailable: cannot verify actual cast shadows in compatibility preview.');
 if(!records.some(visibleRecord))return report('Add a Wall or Box before checking shadows.');
 if(!sunSettings.enabled){sunSettings.enabled=true;applySunSettings();}
 var lightWasCasting=sunLight.castShadow;
 try{
  var source=renderer.domElement;
  var testCanvas=document.createElement('canvas'),w=160,h=100;
  testCanvas.width=w;testCanvas.height=h;
  var ctx=testCanvas.getContext('2d',{willReadFrequently:true});
  if(!ctx)throw Error('2D sample canvas unavailable');
  function capture(){
   renderer.shadowMap.needsUpdate=true;
   renderer.render(scene,camera);
   ctx.clearRect(0,0,w,h);ctx.drawImage(source,0,0,w,h);
   return ctx.getImageData(0,0,w,h).data;
  }
  sunLight.castShadow=false;
  var without=capture();
  sunLight.castShadow=true;
  var withShadows=capture();
  var changed=0,difference=0;
  for(var i=0;i<without.length;i+=4){
   var d=Math.abs(without[i]-withShadows[i])+Math.abs(without[i+1]-withShadows[i+1])+Math.abs(without[i+2]-withShadows[i+2]);
   if(d>24)changed++;
   difference+=d;
  }
  report(changed>25?'Visible cast shadows confirmed: '+changed+' changed pixels in sample.':
   'No visible cast shadow detected. Use Iso/3D view, turn On ground and On faces, and select Morning.');
 }catch(err){report('Shadow image comparison unavailable: '+String(err?.message||err));}
 finally{sunLight.castShadow=lightWasCasting;renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);}
}
function verify3DSolids(){
 var supported=new Set(['box','sphere','cylinder','cone','wall','slab','boolean']);
 var invalid=records.filter(function(r){
  if(!supported.has(r.type))return true;
  var dims=r.type==='sphere'?[r.radius]:r.type==='cylinder'||r.type==='cone'?[r.radius,r.h]:r.type==='boolean'?[]:[r.w,r.d,r.h];
  return dims.some(function(v){return !Number.isFinite(v)||v<=0;});
 });
 var meshCount=0,geometryValid=true;
 if(T&&modelRoot)modelRoot.traverse(function(o){if(o.isMesh){meshCount++;var p=o.geometry?.getAttribute('position');if(!p||p.count<3)geometryValid=false;}});
 var ok=!invalid.length&&geometryValid&&(records.length===0||!T||!modelRoot||meshCount>0);
 var message=records.length===0?'No 3D objects yet. Create a Box, Wall or Sphere.':
 (ok?'3D geometry OK: '+records.length+' object(s)'+(T&&modelRoot?' · '+meshCount+' mesh(es)':' · compatibility preview mode'):
 '3D geometry warning: '+invalid.length+' invalid record(s), '+meshCount+' mesh(es).');
 root.querySelector('.solidCheck').textContent=message;text(message);return ok;
}
function updateDynamicReadout(e){
 var el=root?.querySelector('.dynReadout');if(!el)return;
 if(!draftModes.dyn||!placing||root.hidden){el.removeAttribute('data-show');return;}
 var point=groundAt(e);if(!point){el.removeAttribute('data-show');return;}
 var length=firstPoint?' · L '+Math.hypot(point.x-firstPoint.x,point.y-firstPoint.y).toFixed(2)+' m':'';
 el.textContent='X '+point.x.toFixed(2)+' · Y '+point.y.toFixed(2)+' m'+length;
 var rect=root.querySelector('.view').getBoundingClientRect();
 el.style.left=clamp(e.clientX-rect.left+16,8,Math.max(8,rect.width-el.offsetWidth-12))+'px';
 el.style.top=clamp(e.clientY-rect.top+16,8,Math.max(8,rect.height-34))+'px';
 el.dataset.show='true';
}
function run3DCommand(){
 var input=root.querySelector('#cad3dCommand'),raw=input.value.trim();input.value='';
 if(!raw){
  if(['wall','door','window','opening'].includes(placing)){
   var finished=placing;setPlacement(null);text(finished.toUpperCase()+' finalizado');
  }
  return;
 }
 var upper=raw.toUpperCase(),number=/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;
 if(placing==='rotate'&&number.test(raw)){
  var angle=Number(raw);
  if(!Number.isFinite(angle))return text('Ingresá un ángulo válido');
  records.filter(function(r){return selected.includes(r.id)&&editableRecord(r);}).forEach(function(r){r.rot=((r.rot||0)+angle)%360;});
  redraw();renderProps();setPlacement(null);text('Rotación aplicada · '+angle+'°');return;
 }
 var relative=raw.startsWith('@'),xy=raw.replace(/^@/,'').split(',').map(function(v){return v.trim();});
 if(placing&&xy.length===2&&xy.every(function(v){return number.test(v);})&&!['door','window','opening','rotate'].includes(placing)){
  var x=Number(xy[0]),y=Number(xy[1]);
  if(!Number.isFinite(x)||!Number.isFinite(y))return text('Ingresá coordenadas válidas');
  if(relative&&!firstPoint)return text('Indicá primero un punto base para usar coordenadas relativas');
  if(relative){x+=firstPoint.x;y+=firstPoint.y;}
  placePoint({x:x,y:y,z:0});return;
 }
 if(firstPoint&&number.test(raw)&&['wall','move','copy','dist'].includes(placing)){
  var distance=Number(raw),p=cursorPoint||firstPoint,dx=p.x-firstPoint.x,dy=p.y-firstPoint.y,len=Math.hypot(dx,dy);
  if(!Number.isFinite(distance)||distance<=0)return text('Ingresá una distancia positiva');
  placePoint({x:firstPoint.x+(len?dx/len:1)*distance,y:firstPoint.y+(len?dy/len:0)*distance,z:0});return;
 }
 var aliases={MURO:'wall',LOSA:'slab',PISO:'floor',PLATFORM:'floor',SOL:'sun',PUERTA:'door',VENTANA:'window',VANO:'opening',M:'move',CO:'copy',RO:'rotate',E:'erase',DI:'dist'};
 var command=Object.prototype.hasOwnProperty.call(aliases,upper)?aliases[upper]:upper.toLowerCase();
 if(Object.prototype.hasOwnProperty.call(draftModes,command)){toggleDraftMode(command);return;}
 if(command==='check3d'||command==='verify3d'){verify3DSolids();return;}
 if(viewPresets.some(function(v){return v[0]===command;})){setViewPreset(command);return;}
 if(command==='layer'||command==='capas'){root.querySelector('.layerPanel select').focus();return;}
 if(command==='select'||command==='cancel'){setPlacement(null);text('Selección activa');return;}
 if(command==='pan'){text('Paneo: arrastrá con el botón central o derecho');return;}
 // Native CAD commands: ZOOM, Z, ZOOM E, ZOOM EXTENTS and ZOOM numeric factors.
 if(/^(?:zoom|z)(?:\s+.*)?$/i.test(raw)){
  var arg=raw.replace(/^(?:zoom|z)\s*/i,'').trim().toLowerCase();
  if(!arg||arg==='e'||arg==='extents'||arg==='all'||arg==='a'){fit3DModel();return;}
  if(arg==='in'||arg==='+'){zoom3D(.75);return;}
  if(arg==='out'||arg==='-'){zoom3D(1.3333333333);return;}
  var factorMatch=/^([0-9]+(?:\.[0-9]+)?)x?$/.exec(arg);
  if(factorMatch&&Number(factorMatch[1])>0){zoom3D(1/Number(factorMatch[1]));return;}
  text('ZOOM: usá E / Extents, In, Out o un factor (ej. ZOOM 2X)');return;
 }
 if(!action(command))text('Comando 3D desconocido: '+raw);
}
function action(a){
 if(['box','sphere','cylinder','cone','dist','floor'].includes(a)||Object.prototype.hasOwnProperty.call(ARCH_STYLES,a)){
  if(!renderer&&!fallbackCanvas)text('Todavía se está iniciando el visor 3D');
  else{setPlacement(a);if(!root.querySelector('.archPalette').hidden)showArchPalette(false);}
  return true;
 }
 if(['move','copy','rotate','erase'].includes(a)){
  if(!selected.some(function(id){return records.some(function(r){return r.id===id&&editableRecord(r);});})){text('Seleccioná los objetos que querés modificar');return true;}
  if(a==='erase'){
   records=records.filter(function(r){return !selected.includes(r.id)||!editableRecord(r);});
   selected=[];setPlacement(null);redraw();renderProps();text('Objetos eliminados');
  }else{
   setPlacement(a);
   if(a==='rotate')root.querySelector('#cad3dCommand').focus();
  }
  return true;
 }
 if(['union','subtract','intersect'].includes(a)){setPlacement(null);booleanBox(a);return true;}
 if(a==='sun'){sunSettings.enabled=!sunSettings.enabled;applySunSettings();text('Sun / Shadows '+(sunSettings.enabled?'ON':'OFF'));return true;}
 if(a==='sketch')setSketchStyle(renderStyle==='sketch'?'shaded-edges':'sketch');
 else if(a==='shot')exportViewPNG();
 else if(a==='sketchSvg')exportSketchSVG();
 else if(a==='obj')exportOBJ();
 else if(a==='dxf')exportDXF();
 else if(a==='json')exportJSON();
 else if(a==='open')root.querySelector('.fileInput').click();
 else if(a==='cad')root.querySelector('.cadInput').click();
 else if(a==='plan')useOpenCAD2D();
 else return false;
 return true;
}
function download(filename,content,type){
 var blob=new Blob([content],{type:type||'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob);
 var a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},1200);
}
function trianglesWorld(fn){
 var p=new T.Vector3();
 visitMeshes(function(m){
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
 if(!records.some(visibleRecord))return text('No hay objetos 3D visibles para exportar');
 if(!T)return text('El motor de geometría 3D todavía no está disponible');
 var result=['# BLACKLINE CAD3D OBJ · triangulated surface · meters','# CAD3D parametric metadata is preserved only in .3djson'];var index=1,previous=null;
 trianglesWorld(function(points,owner){
  if(previous!==owner){result.push('o CAD3D_'+owner);previous=owner;}
  points.forEach(function(v){result.push('v '+v.map(function(x){return x.toFixed(6);}).join(' '));});
  result.push('f '+index+' '+(index+1)+' '+(index+2));index+=3;
 });
 download('blackline-cad3d.obj',result.join('\n')+'\n');text('OBJ exportado · '+(index-1)+' vértices');
}
function exportDXF(){
 if(!records.some(visibleRecord))return text('No hay geometría 3D visible');
 if(!T)return text('El motor de geometría 3D todavía no está disponible');
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
 if(!/^[ \t]*0[ \t]*\r?\n[ \t]*SECTION[ \t]*\r?$/im.test(raw))throw Error('No se reconoció el DXF');
 var bridge=window.BlacklineCAD3DBridge;
 if(!bridge?.parseDXF)throw Error('El lector CAD2D no está disponible');
 var plan=bridge.parseDXF(raw,filename);
 var factor={1:.0254,2:.3048,4:.001,5:.01,6:1,14:.1}[plan.unitCode];
 if(!factor){
  var unit=window.prompt('Confirmá las unidades del plano para conservar la escala: mm, cm, m, in o ft.','mm');
  if(unit===null)return null;
  factor={mm:.001,cm:.01,m:1,in:.0254,ft:.3048}[unit.trim().toLowerCase()];
  if(!factor)throw Error('Unidad inválida. Usá mm, cm, m, in o ft.');
 }
 var hidden=new Set(plan.layers.filter(function(l){return !l.visible||l.frozen;}).map(function(l){return l.id;}));
 var segments=segmentsFromEntities(plan.entities.filter(function(e){return !hidden.has(e.layer);}),factor);
 if(!segments.length)throw Error('El plano no contiene geometría 2D visible compatible con el visor');
 return {name:filename,segments:segments};
}
function drawUnderlay(){
 if(fallbackCanvas){fallbackDraw();return;}
 if(!underlayGroup||!T)return;
 underlayGroup.children.forEach(function(o){o.geometry.dispose();o.material.dispose();});underlayGroup.clear();
 if(!underlay?.segments.length)return;
 var data=[];
 underlay.segments.forEach(function(seg){data.push(seg[0],seg[1],.006,seg[2],seg[3],.006);});
 var geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(data,3));
 var line=new T.LineSegments(geo,new T.LineBasicMaterial({color:0x86aabc,transparent:true,opacity:.86}));
 underlayGroup.add(line);
}
function fitUnderlay(){
 var minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
 underlay.segments.forEach(function(v){
  minX=Math.min(minX,v[0],v[2]);maxX=Math.max(maxX,v[0],v[2]);
  minY=Math.min(minY,v[1],v[3]);maxY=Math.max(maxY,v[1],v[3]);
 });
 var view=root.querySelector('.view'),aspect=view.clientWidth/Math.max(1,view.clientHeight);
 target.x=(minX+maxX)/2;target.y=(minY+maxY)/2;target.z=1;
 orbit.dist=clamp(Math.max((maxX-minX)/Math.max(aspect,.1),maxY-minY)*1.55,1.4,450);
 setViewPreset('top');drawUnderlay();
}
function setPlanReference(plan){
 setPlacement(null);showArchPalette(false);
 underlay=plan;fitUnderlay();
 text(plan.name+' · '+plan.segments.length+' segmentos · elegí Parametric 3D para calcar el plano');
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
  importSequence++;setPlanReference({name:'Plano CAD2D abierto',segments:segments});
 }catch(e){text('No se pudo leer el plano 2D: '+(e.message||e));}
}
async function importCADFile(ev){
 var file=ev.target.files&&ev.target.files[0];ev.target.value='';if(!file)return;
 var request=++importSequence;
 try{
  var raw;
  if(/\.dwg$/i.test(file.name)){
   var bridge=window.BlacklineCAD3DBridge;
   if(!bridge||typeof bridge.convertDWG!=='function')throw Error('El servicio DWG del CAD2D no está disponible');
   text('Convirtiendo DWG mediante el servicio existente de CAD2D…');
   raw=await bridge.convertDWG(file);
   if(request!==importSequence)return;
   if(!raw){text('Importación DWG cancelada');return;}
  }else if(/\.dxf$/i.test(file.name)){
   var bridge=window.BlacklineCAD3DBridge;
   raw=bridge?.decodeDXF?await bridge.decodeDXF(file):await file.text();
  }else throw Error('Solo DWG y DXF');
  if(request!==importSequence)return;
  var plan=dxfToUnderlay(raw,file.name);
  if(!plan){text('Importación cancelada');return;}
  setPlanReference(plan);
 }catch(e){if(request===importSequence)text('Error importando plano: '+(e.message||e));}
}
function exportJSON(){
 var data={format:'BLACKLINE-CAD3D-1',units:'m',records:records,serial:serial,underlay:underlay,layers:layers,currentLayer:currentLayer};
 download('blackline-cad3d.3djson',JSON.stringify(data,null,2),'application/json');text('Modelo editable .3DJSON exportado');
}
async function readJSON(e){
 var file=e.target.files&&e.target.files[0];e.target.value='';if(!file)return;
 var request=++importSequence;
 try{
  var data=JSON.parse(await file.text());
  if(request!==importSequence)return;
  if(data.format!=='BLACKLINE-CAD3D-1'||!Array.isArray(data.records)||data.records.length>1000)throw Error('Formato o contenido inválido');
  var importedLayers=[{id:'0',name:'0',visible:true,locked:false}];
  if(Array.isArray(data.layers))data.layers.slice(0,100).forEach(function(l){
   if(!l||typeof l.id!=='string'||!l.id||l.id.length>60)return;
   var layer={id:l.id,name:String(l.name||l.id).slice(0,60),visible:l.visible!==false,locked:l.locked===true};
   if(l.id==='0')importedLayers[0]=layer;
   else if(importedLayers.length<100&&!importedLayers.some(function(x){return x.id===l.id;}))importedLayers.push(layer);
  });
  var accepted=['box','sphere','cone','cylinder','wall','slab','boolean'];
  var sanitized=data.records.filter(function(r){return r&&accepted.includes(r.type);}).map(function(r){
   var o={id:finite(r.id,0),type:r.type,layerId:importedLayers.some(function(l){return l.id===r.layerId;})?r.layerId:'0',x:finite(r.x,0),y:finite(r.y,0),z:finite(r.z,0),rot:finite(r.rot,0),
    w:clamp(finite(r.w,2),.01,1000),d:clamp(finite(r.d,2),.01,1000),h:clamp(finite(r.h,2),.01,1000),
    styleId:String(r.styleId||'').slice(0,60),pitch:clamp(finite(r.pitch,0),-45,45),slabKind:r.slabKind==='roof'?'roof':'floor',
    radius:clamp(finite(r.radius,1),.01,1000),openings:[]};
   if((r.type==='wall'||r.type==='slab')&&Array.isArray(r.openings)){
    var kinds=r.type==='wall'?['door','window','opening']:['opening'];
    o.openings=r.openings.slice(0,150).filter(function(v){return v&&kinds.includes(v.kind);}).map(function(v){
     var op={id:finite(v.id,0),kind:v.kind,styleId:String(v.styleId||'').slice(0,60),
       shape:['rect','round','arch','segment','triangle','pointed'].includes(v.shape)?v.shape:'rect',
      offset:finite(v.offset,0),w:clamp(finite(v.w,1),.05,1000)};
     if(r.type==='wall'){op.h=clamp(finite(v.h,1),.05,1000);op.sill=clamp(finite(v.sill,0),0,1000);}
     else{op.offsetY=finite(v.offsetY,0);op.d=clamp(finite(v.d,1),.05,1000);}
     return op;
    });
   }
   if(r.type==='wall'&&Array.isArray(r.attachments)){
    o.attachments=r.attachments.slice(0,100).filter(function(a){return a&&['rect','circle','polyline'].includes(a.shape);}).map(function(a){
     var pts=null;
     if(a.shape==='polyline'){
      if(!Array.isArray(a.points))return null;
      pts=a.points.slice(0,64).filter(function(p){return Array.isArray(p)&&p.length===2&&p.every(function(v){return typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=10;});});
      if(pts.length<3)return null;
     }
     return {id:finite(a.id,0),shape:a.shape,points:pts,offset:clamp(finite(a.offset,0),-10000,10000),
      sill:clamp(finite(a.sill,.5),-10000,10000),w:clamp(finite(a.w,.6),.03,100),h:clamp(finite(a.h,.6),.03,100),
      depth:clamp(finite(a.depth,.12),.01,3),side:a.side===1?1:-1};
    }).filter(Boolean);
   }
   if(r.type==='boolean')o.triangles=Array.isArray(r.triangles)?r.triangles.slice(0,120000).filter(function(v){return Number.isFinite(v);}):[];
   return o;
  });
  records=sanitized;layers=importedLayers;
  currentLayer=layers.some(function(l){return l.id===data.currentLayer;})?data.currentLayer:'0';
  renderLayerPanel();underlay=null;
  if(data.underlay&&Array.isArray(data.underlay.segments)&&data.underlay.segments.length<=30000){
   var valid=data.underlay.segments.filter(function(v){return Array.isArray(v)&&v.length===4&&v.every(function(n){return typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<1000000;});});
   underlay={name:String(data.underlay.name||'Imported reference').slice(0,150),segments:valid};
  }
  setPlacement(null);showArchPalette(false);
  if(underlay?.segments.length)fitUnderlay();
  else drawUnderlay();
  var ids=layers.map(function(l){return Number(l.id.split('-')[1])||0;}).concat(records.flatMap(function(r){return [r.id].concat((r.openings||[]).map(function(o){return o.id;})).concat((r.attachments||[]).map(function(a){return a.id;}));}));
  serial=ids.reduce(function(max,id){return Math.max(max,finite(id,0));},Math.max(1,finite(data.serial,0)))+1;selected=[];redraw();renderProps();text(records.length+' objetos 3D cargados (sin alterar CAD2D)');
 }catch(err){if(request===importSequence)text('No se pudo abrir .3DJSON: '+String(err.message||err));}
}
window.addEventListener('keydown',function(ev){
 if(!root||root.hidden||!root.contains(document.activeElement))return;
 var mode={F3:'osnap',F7:'grid',F8:'ortho'}[ev.key];
 if(mode){ev.preventDefault();ev.stopImmediatePropagation();toggleDraftMode(mode);return;}
 if(ev.key==='Enter'&&['wall','door','window','opening'].includes(placing)&&!ev.target?.closest?.('input,textarea,select,[contenteditable=true]')){
  ev.preventDefault();ev.stopImmediatePropagation();
  var finished=placing;setPlacement(null);text(finished.toUpperCase()+' finalizado');
  return;
 }
 if(ev.key==='Escape'){
  if(placing){ev.preventDefault();ev.stopImmediatePropagation();setPlacement(null);text('Comando 3D cancelado');}
  else if(!root.querySelector('.archPalette').hidden){ev.preventDefault();ev.stopImmediatePropagation();showArchPalette(false);}
  return;
 }
 if(ev.ctrlKey||ev.metaKey||ev.altKey||ev.target?.closest?.('input,textarea,select,[contenteditable=true]'))return;
 var key=ev.key.toLowerCase();
 if(viewMode==='walk'&&['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(key)){
  ev.preventDefault();ev.stopImmediatePropagation();
  var step=ev.shiftKey?1:.25;
  var fwd=(key==='w'||key==='arrowup')?1:(key==='s'||key==='arrowdown')?-1:0;
  var side=(key==='a'||key==='arrowleft')?-1:(key==='d'||key==='arrowright')?1:0;
  target.x+=(-Math.cos(orbit.az)*fwd+Math.sin(orbit.az)*side)*step;
  target.y+=(-Math.sin(orbit.az)*fwd-Math.cos(orbit.az)*side)*step;
  applyViewCamera();return;
 }
 if(key==='delete'||key==='backspace'){
  ev.preventDefault();ev.stopImmediatePropagation();action('erase');return;
 }
 if(key==='+'||key==='-'){
  ev.preventDefault();ev.stopImmediatePropagation();zoom3D(key==='+'?.8:1.25);return;
 }
 if(/^[a-z0-9@.,-]$/i.test(ev.key)){
  ev.preventDefault();ev.stopImmediatePropagation();
  var input=root.querySelector('#cad3dCommand');input.focus({preventScroll:true});input.value+=ev.key;
 }
},true);

window.BlacklineCAD3D=Object.freeze({open:open,close:close,get enabled(){return !!root&&!root.hidden;},get experimental(){return true;}});
/* Only install a launcher. Three.js is not requested until the explicit user click. */
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',launch,{once:true});else launch();
})();
