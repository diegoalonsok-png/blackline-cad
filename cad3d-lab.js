/* Blackline CAD3D Lab, isolated from the CAD2D drafting engine. Experimental module. */
(function(){
'use strict';
if(window.BlacklineCAD3D)return;
var T=null, root=null, renderer=null, scene=null, camera=null, modelRoot=null, raycaster=null;
var selectedOpeningId=null;
var records=[], selected=[], serial=1, orbit={az:-.85,el:.55,dist:17}, target=null, frame=0, fallbackFrame=0, dragging=null, winDrag=null, observer=null, placing=null, firstPoint=null, cursorPoint=null, underlay=null, underlayGroup=null, restoredWindow=null, fallbackCanvas=null, fallbackCtx=null, cad3dLoading=false, activeCategory='wall', activePreset={wall:'exterior-20',door:'single-swing',window:'fixed',slab:'floor-20',opening:'wall-opening'};
var draftModes={ortho:true,osnap:true,grid:true,dyn:false};
var layers=[{id:'0',name:'0',visible:true,locked:false}],currentLayer='0';
var MODEL_BACKGROUND='#202a32', MODEL_GRID='#384b56';
var sunSettings={enabled:false,azimuth:135,elevation:45,onGround:true,onFaces:true},sunLight=null,sunGround=null,sunAmbient=null,sunFill=null;
var saved3DCameras=[],camera3DSequence=1;
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
 extrude:'<path d="M4 19 4 9 12 5 20 9 20 19 12 23zM4 9l8 5 8-5M12 14v9M12 1v5m-3-3 3-3 3 3"/>',
 extrudeface:'<path d="M4 15 12 19 20 15M4 15 12 11 20 15M12 11V3m-4 4 4-4 4 4M4 15v5l8 4 8-4v-5"/>',
 line:'<path d="M4 19 20 5"/><circle cx="4" cy="19" r="2" fill="currentColor" stroke="none"/><circle cx="20" cy="5" r="2" fill="currentColor" stroke="none"/>',
 polyline:'<path d="M3 19 9 8 15 14 21 4"/><circle cx="3" cy="19" r="1.5"/><circle cx="9" cy="8" r="1.5"/><circle cx="15" cy="14" r="1.5"/><circle cx="21" cy="4" r="1.5"/>',
 rectangle:'<rect x="4" y="6" width="16" height="12" rx=".3"/>',
 circle:'<circle cx="12" cy="12" r="8.5"/>',
 arc:'<path d="M4 18A10 10 0 0 1 20 18"/><circle cx="4" cy="18" r="1.2"/><circle cx="20" cy="18" r="1.2"/>',
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
/* Dockable/floating CAD3D toolbars. The canvas and commands remain untouched. */
#cad3dLab .cad3dToolbarGrip{display:inline-flex!important;align-items:center;justify-content:center;flex:0 0 22px!important;width:22px!important;min-width:22px!important;max-width:22px!important;height:28px!important;min-height:28px!important;margin:0 3px 0 0!important;padding:0!important;border:1px solid #557080!important;border-radius:5px!important;background:#253b49!important;color:#b8d2df!important;cursor:grab!important;touch-action:none;user-select:none}
#cad3dLab .cad3dToolbarGrip:active{cursor:grabbing!important}
#cad3dLab .cad3dToolbarGrip:focus-visible{outline:2px solid #a2d8ed}
#cad3dLab .cad3dToolbarGrip svg{width:15px!important;height:15px!important;flex:none!important}
#cad3dLab .cad3dBar{gap:4px}
#cad3dLab .cad3dBar.cad3dDockFloating,
#cad3dLab .cad3dProfileTools.cad3dDockFloating,
#cad3dLab .cad3dModelTools.cad3dDockFloating,
#cad3dLab .tools.cad3dDockFloating{
 position:absolute!important;z-index:125!important;left:0;top:0;display:flex!important;
 flex-wrap:nowrap!important;align-items:center!important;gap:5px!important;
 width:max-content!important;max-width:calc(100% - 12px)!important;
 min-height:42px!important;padding:5px 8px!important;margin:0!important;
 overflow-x:auto!important;overflow-y:hidden!important;
 border:1px solid #7ea6ba!important;border-radius:8px!important;
 background:#192c39!important;box-shadow:0 12px 30px #000a!important;
 transform:translate3d(0,0,0);pointer-events:auto;
}
#cad3dLab .cad3dBar.cad3dDockFloating .btn{padding:5px 7px;display:inline-flex;align-items:center;gap:4px;white-space:nowrap;min-height:28px;font-size:11px}
#cad3dLab .cad3dBar.cad3dDockFloating .btn svg{width:16px;height:16px;flex:none}
#cad3dLab .cad3dDockFloating .cad3dToolbarGrip{position:sticky;left:0;z-index:2}
#cad3dLab .cad3dToolbarGrip[data-floating="true"]{background:#34556b!important;color:white!important}

#cad3dLab .block3DMenu{position:relative;flex:none}
#cad3dLab .block3DMenu>summary{list-style:none}
#cad3dLab .block3DMenu>summary::-webkit-details-marker{display:none}
#cad3dLab .block3DPanel{position:absolute;top:calc(100% + 6px);left:0;z-index:90;display:flex;flex-direction:column;gap:9px;width:min(440px,86vw);height:min(600px,68vh);box-sizing:border-box;overflow:hidden;padding:12px;border:1px solid #628294;border-radius:12px;background:#172734;box-shadow:0 9px 27px #000a;color:#e8f4fb}
#cad3dLab .block3DPanel>strong{font-size:13px;letter-spacing:.05em}
#cad3dLab .block3DPanel>small{font-size:11px;color:#acc0cd}
#cad3dLab .block3DPanel .cad3dBlockTabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}
#cad3dLab .block3DPanel .cad3dBlockTab{border:1px solid #516b7d;border-radius:7px;padding:7px 3px;background:#2b3c4a;color:#dcebf3;cursor:pointer;font-size:11px;white-space:normal}
#cad3dLab .block3DPanel .cad3dBlockTab[aria-selected="true"]{border-color:#92d9f3;background:#2e5366;color:#fff}
#cad3dLab .block3DPanel .cad3dBlockSearch{box-sizing:border-box;width:100%;height:34px;padding:7px 9px;border:1px solid #576e7f;border-radius:7px;background:#0f202c;color:#f3faff}
#cad3dLab .block3DPanel .cad3dBlockFilters{display:flex;gap:5px;overflow-x:auto;flex:none;padding-bottom:3px}
#cad3dLab .block3DPanel .cad3dBlockFilter{flex:none;cursor:pointer;border:1px solid #425d70;border-radius:14px;background:#263744;color:#d3e0e8;padding:5px 9px;font-size:11px}
#cad3dLab .block3DPanel .cad3dBlockFilter[aria-pressed="true"]{border-color:#a2d9ed;color:#fff;background:#35566a}
#cad3dLab .block3DPanel .cad3dBlockResults{min-height:0;flex:1;overflow-y:auto;overscroll-behavior:contain;padding:3px 5px 5px 0}
#cad3dLab .block3DPanel .cad3dBlockGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
#cad3dLab .block3DPanel .cad3dBlockCard{min-width:0;display:flex;flex-direction:column;align-items:stretch;text-align:left;padding:8px;gap:6px;cursor:pointer;border:1px solid #455c6d;border-radius:9px;background:#253542;color:#e6f2fa}
#cad3dLab .block3DPanel .cad3dBlockCard:hover,#cad3dLab .block3DPanel .cad3dBlockCard:focus-visible{border-color:#9cdaee;background:#30485b}
#cad3dLab .block3DPanel .cad3dBlockPreview{display:grid;place-items:center;height:74px;background:#1b2b36;border-radius:6px}
#cad3dLab .block3DPanel .cad3dBlockPreview svg{width:88%;height:63px;stroke:#b5d5e5;fill:#486c80;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
#cad3dLab .block3DPanel .cad3dBlockName{font-size:12px;font-weight:600}
#cad3dLab .block3DPanel .cad3dBlockMeta{font-size:10px;color:#abc1ce}
#cad3dLab .block3DPanel .cad3dBlockEmpty{font-size:12px;color:#b6cbd7;line-height:1.5;padding:12px;border:1px dashed #536c7d;border-radius:9px}
#cad3dLab .block3DPanel .cad3dBlockCount{font-size:11px;color:#9db7c8}
#cad3dLab .block3DMenu:not([open]) .block3DPanel{display:none}

/* Native CAD3D view save dialog: preserves scene, camera and user project. */
#cad3dLab .viewSaveMenu{position:relative;display:inline-flex;align-items:center;flex:none}
#cad3dLab .viewSaveMenu>summary{list-style:none;cursor:pointer;white-space:nowrap}
#cad3dLab .viewSaveMenu>summary::-webkit-details-marker{display:none}
#cad3dLab .viewSavePanel{position:absolute;right:0;top:calc(100% + 8px);z-index:100;display:grid;gap:9px;width:min(326px,85vw);padding:14px;border:1px solid #688ba0;border-radius:10px;background:#152330;box-shadow:0 13px 35px #000b;color:#e7f1f6}
#cad3dLab .viewSavePanel label{font-size:11px;color:#bbccda;display:grid;gap:4px}
#cad3dLab .viewSavePanel input,#cad3dLab .viewSavePanel select{box-sizing:border-box;width:100%;min-height:31px;background:#23313d;color:#eff8ff;border:1px solid #566f7e;border-radius:5px;padding:5px 7px}
#cad3dLab .viewSavePanel .saveRow{display:grid;grid-template-columns:1fr 1fr;gap:9px}
#cad3dLab .viewSavePanel output{font-size:11px;color:#afc5d0}
#cad3dLab .viewSavePanel button{min-height:32px;cursor:pointer}

/* Classic drafting / refined CAD3D navigator, isolated from CAD2D. */
#cad3dLab .view.wire2dView{background:#fff!important}
#cad3dLab .viewCube{border-radius:19px;border:1px solid #86a9bd;background:linear-gradient(150deg,#344b5b,#203444 42%,#101c28);box-shadow:inset 0 1px 0 #d9f1ff88,inset 0 -2px 7px #08111ca0,0 5px 15px #0007}
#cad3dLab .viewCube:hover{border-color:#bce3f6;box-shadow:0 0 0 2px #8ad5f340,0 7px 20px #0009}
#cad3dLab .cubePlane{stroke:#bed2dc;stroke-width:1.1}
#cad3dLab .cubeFaceLabel{fill:#f7fbff;letter-spacing:.65px}
#cad3dLab .cubeCornerZone{fill:#c7d8e0;stroke:#233744}
#cad3dLab .orbitBall{border:1px solid #91b6c7;background:radial-gradient(circle at 36% 28%,#52778b,#203c4d 57%,#0a1825);box-shadow:inset 0 2px 1px #e4f9ff75,inset 0 -6px 10px #04121a9c,0 6px 18px #0008}
#cad3dLab .orbitBall:hover{border-color:#d0efff;box-shadow:inset 0 1px 0 #ecfbff9a,0 0 0 2px #8ecce93b,0 7px 19px #000a}
#cad3dLab .orbitBall svg{width:66px;height:66px;filter:drop-shadow(0 1px 1px #0007)}
#cad3dLab .orbitBall:focus-visible,#cad3dLab .viewCube:focus-visible{outline:2px solid #c4eeff;outline-offset:3px}
/* CAD3D own basic Draw + Modify ribbons, preserving CAD2D. */
#cad3dLab .cad3dBasicBars{display:flex;align-items:center;gap:8px;flex:none;overflow-x:auto;scrollbar-width:thin;padding:5px 9px;background:#172530;border-bottom:1px solid #4c6576;min-height:42px}
#cad3dLab .cad3dBasicBars .cad3dBar{display:flex;align-items:center;gap:3px;flex:none}
#cad3dLab .cad3dBasicBars .cad3dBar strong{font:700 10px Inter,Arial,sans-serif;color:#b9c8d3;margin:0 5px 0 2px}
#cad3dLab .cad3dBasicBars .btn{padding:5px 7px;display:inline-flex;align-items:center;gap:4px;white-space:nowrap;min-height:28px;font-size:11px}
#cad3dLab .cad3dBasicBars svg{width:16px;height:16px;flex:none}
#cad3dLab .cad3dBasicBars .armed{background:#31536a;outline:1px solid #98d9f1}
#cad3dLab .cad3dHeightProperty{display:grid;gap:4px;padding:9px!important;margin:5px 0 10px;border:1px solid #6594ad;border-radius:8px;background:#263b4a;font-weight:700}
#cad3dLab .cad3dHeightProperty input{min-height:34px;font-size:15px;font-weight:700}
#cad3dLab .cad3dProfileTools{display:flex;align-items:center;flex-wrap:nowrap;gap:6px;min-height:42px;overflow-x:auto;overflow-y:hidden;scrollbar-width:thin}
#cad3dLab .cad3dProfileTools>strong{flex:none;white-space:nowrap}
#cad3dLab .cad3dProfileTools .btn{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;gap:6px;flex:none;min-width:auto!important;width:auto!important;height:32px!important;min-height:32px!important;max-height:32px!important;padding:5px 10px!important;margin:0!important;white-space:nowrap;font:12px Inter,Arial,sans-serif!important;line-height:1!important}
#cad3dLab .cad3dProfileTools .btn svg{display:block;flex:0 0 18px;width:18px!important;height:18px!important;max-width:18px!important;max-height:18px!important;overflow:visible}
#cad3dLab .cad3dProfileTools .btn span{display:inline;white-space:nowrap;line-height:1;font:inherit}
#cad3dLab .cad3dProfileTools .btn.armed{background:#31536a;outline:1px solid #98d9f1}

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
#cad3dLab .view canvas { display:block; width:100%; height:100%; touch-action:none; cursor:crosshair }
#cad3dLab .view canvas[data-navigation-drag=true] { cursor:grabbing }
#cad3dLab .view canvas:focus-visible { outline:none }
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
#cad3dLab .styleThumb[data-kind^="sketch"]{background:#f6f1e8;border-color:#a4a3a0}
#cad3dLab .styleThumb[data-kind^="sketch"]::before{background:#ece8df;border:1.5px solid #404d54;box-shadow:4px 4px 0 #8c949347}
#cad3dLab .styleThumb[data-kind="sketch-pencil"]::before{border-style:dashed}
#cad3dLab .styleThumb[data-kind="sketch-ink"]::before{border:2px solid #242526}
#cad3dLab .styleThumb[data-kind="sketch-marker"]::before{background:#c8d0c7}
#cad3dLab .styleThumb[data-kind="sketch-watercolor"]::before{background:linear-gradient(130deg,#b5c9c3,#ebdfcb)}
#cad3dLab .styleThumb[data-kind="sketch-mono"]::before{background:#d7d7d5}
#cad3dLab .styleThumb[data-kind="sketch-blueprint"]{background:#30506a;border-color:#7798b3}
#cad3dLab .styleThumb[data-kind="sketch-blueprint"]::before{background:#456b82;border-color:#e3f3fa}
#cad3dLab .stylePanel{width:min(520px,90vw);max-height:min(75vh,670px);display:flex;flex-direction:column}
#cad3dLab .stylePanel[hidden]{display:none!important}
#cad3dLab .stylePanel header{display:flex;justify-content:space-between;align-items:center;gap:8px}
#cad3dLab .stylePanel header small{font-size:10px;font-weight:400;color:#9bb3c0;letter-spacing:0}
#cad3dLab .styleGalleryControls{display:flex;align-items:center;gap:10px;margin:8px 0}
#cad3dLab .styleGallerySearch{min-width:0;flex:1;border:1px solid #476075;border-radius:6px;background:#0e1922;color:#edf4f7;padding:9px;font-size:12px}
#cad3dLab .styleGalleryCount{font-size:10px;color:#a7c0cd;white-space:nowrap}
#cad3dLab .styleGalleryScroll{min-height:0;overflow:auto;overscroll-behavior:contain}
#cad3dLab .styleGrid [data-render-style][hidden]{display:none!important}
#cad3dLab .styleGrid button{min-height:58px}
#cad3dLab .styleGalleryNote{display:block;margin-top:8px;color:#96aab7;font-size:10px;line-height:1.5}
#cad3dLab .styleThumb[data-kind="sketch-blue-engraving"],#cad3dLab .styleThumb[data-kind="sketch-comic-teal"]{background:repeating-linear-gradient(135deg,#f6edda 0 3px,#92abbc 3px 4px)}
#cad3dLab .styleThumb[data-kind="sketch-red-ochre"],#cad3dLab .styleThumb[data-kind="sketch-technical-red"]{background:linear-gradient(125deg,#c65e43 0 38%,#f1dcb8 38% 100%)}
#cad3dLab .styleThumb[data-kind="sketch-vintage-print"],#cad3dLab .styleThumb[data-kind="sketch-engraving"]{background:repeating-linear-gradient(145deg,#f5ebd5 0 4px,#b1a895 4px 5px)}
#cad3dLab .styleThumb[data-kind="sketch-sunlit"],#cad3dLab .styleThumb[data-kind="sketch-sunset"]{background:linear-gradient(135deg,#fff9e7 0 48%,#dfc09a 48%)}
#cad3dLab .styleThumb[data-kind="sketch-watercolor-warm"]{background:linear-gradient(130deg,#e2bc99,#faf0d8)}
#cad3dLab .styleThumb[data-kind="sketch-watercolor-cool"]{background:linear-gradient(130deg,#a7cbc6,#f7f6e8)}
@media(max-width:640px){#cad3dLab .stylePanel{width:min(92vw,420px)}#cad3dLab .styleGrid{grid-template-columns:1fr}}
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
 position:absolute;top:11px;left:11px;z-index:6;width:198px;
 display:grid;justify-items:stretch;gap:6px;pointer-events:none;
 font-family:Inter,"Segoe UI",Arial,sans-serif;
}
#cad3dLab .viewNav button,#cad3dLab .viewNav select,#cad3dLab .viewCube{pointer-events:auto}
#cad3dLab .viewNavTop{display:flex;align-items:center;gap:12px;height:104px;pointer-events:none}
#cad3dLab .viewNavTop > *{pointer-events:auto}
#cad3dLab .viewCube{
 width:104px;height:104px;position:relative;flex:none;overflow:hidden;
 border:1px solid #506475;border-radius:17px;cursor:grab;touch-action:none;user-select:none;
 background:radial-gradient(circle at 32% 17%,#344b5e 0%,#1a2a36 56%,#111b25 100%);
 box-shadow:inset 0 1px 0 #b6ccd344,inset 0 -7px 12px #070e1690,0 5px 18px #0009;
 transition:border-color .16s,box-shadow .16s;
}
#cad3dLab .viewCube:hover{border-color:#8ab8cf;box-shadow:inset 0 1px 0 #d6e7f34d,0 6px 20px #000b}
#cad3dLab .viewCube {border-color:#7193a9;box-shadow:inset 0 2px 0 #d4eafa55,inset 0 -8px 14px #050f1ca8,0 5px 16px #0008}
#cad3dLab .cubeFaceLabel {paint-order:stroke fill;stroke:#152535;stroke-width:1.45px;stroke-linejoin:round;letter-spacing:.3px}
#cad3dLab .orbitBall {border-color:#7b9daf;box-shadow:inset 0 2px 0 #d5f0ff66,inset 0 -9px 15px #07101cbb,0 5px 17px #0009}
#cad3dLab .orbitBall:active {background:radial-gradient(circle at 38% 30%,#4d718a,#14293b 62%,#081722)}
#cad3dLab .viewCube[data-dragging=true]{cursor:grabbing}
#cad3dLab .viewCube:focus-visible{outline:2px solid #a8def6;outline-offset:2px}
#cad3dLab .cubeScene{display:block;width:100%;height:100%;overflow:visible}
#cad3dLab .cubePlane{stroke:#90a9b8;stroke-width:1.05;stroke-linejoin:round;fill:var(--cube-tint,#314454)}
#cad3dLab .cubeFaceZone{cursor:pointer}
#cad3dLab .cubeFaceZone:hover .cubePlane,#cad3dLab .cubeFaceZone[aria-pressed=true] .cubePlane{
 fill:#51778d;stroke:#d5eaf2;stroke-width:1.6;
}
#cad3dLab .cubeFaceLabel{
 fill:#f0f6f9;font:700 9px Inter,"Segoe UI",sans-serif;letter-spacing:.5px;
 text-anchor:middle;dominant-baseline:central;paint-order:stroke;
 stroke:#14202a;stroke-width:1.25;pointer-events:none;user-select:none;
}
#cad3dLab .cubeEdgeZone{stroke:transparent;stroke-width:9;stroke-linecap:round;cursor:pointer;pointer-events:stroke}
#cad3dLab .cubeEdgeZone:hover{stroke:#b5ddeb9e}
#cad3dLab .cubeCornerZone{fill:#98afbc;stroke:#142633;stroke-width:1;cursor:pointer}
#cad3dLab .cubeCornerZone:hover{fill:#e8faff;stroke:#80d4f3;stroke-width:2.5}
#cad3dLab .orbitBall{
 width:74px;height:74px;padding:0;flex:none;position:relative;overflow:hidden;
 display:grid;place-items:center;touch-action:none;user-select:none;cursor:grab;
 border:1px solid #628094;border-radius:50%;color:#e5f2f8;
 background:radial-gradient(circle at 32% 22%,#3a5265 0%,#192c3b 57%,#0c1823 100%);
 box-shadow:inset 0 1px 0 #d5edf24c,inset 0 -7px 12px #020b16c2,0 4px 15px #0009;
 transition:border-color .15s,box-shadow .15s;
}
#cad3dLab .orbitBall svg{display:block;width:70px;height:70px;pointer-events:none}
#cad3dLab .orbitBall:hover{border-color:#b0daee;box-shadow:inset 0 1px 0 #e4f8ff83,0 4px 18px #000c}
#cad3dLab .orbitBall[data-dragging=true]{cursor:grabbing}
#cad3dLab .orbitBall[data-drag-mode=pan] svg .orbitCore{fill:#64889d}
#cad3dLab .orbitBall:focus-visible{outline:2px solid #a8def6;outline-offset:2px}
#cad3dLab .view.planRulers .viewNav{top:23px;left:26px}

/* Parametric grip layer: anchored AEC elements and editable solids. */
#cad3dLab .cad3dGripLayer{position:absolute;inset:0;z-index:5;pointer-events:none;overflow:hidden}
#cad3dLab .cad3dGrip{
 position:absolute;transform:translate(-50%,-50%);width:14px;height:14px;min-width:0;
 padding:0;border:1.5px solid #1d3d4c;border-radius:3px;
 pointer-events:auto;cursor:move;touch-action:none;user-select:none;
 background:#8fdaf5;box-shadow:0 1px 5px #000e,inset 0 1px 0 #f9fdffb0;
}
#cad3dLab .cad3dGrip[data-kind^=opening]{border-radius:50%;background:#f1c36f;border-color:#684c21}
#cad3dLab .cad3dGrip[data-kind=move]{width:16px;height:16px;background:#c1a3ed;border-radius:50%}
#cad3dLab .cad3dGrip[data-kind=rotate]{background:#c0e6bd;border-radius:50%;cursor:crosshair}
#cad3dLab .cad3dGrip:hover,#cad3dLab .cad3dGrip:focus-visible,#cad3dLab .cad3dGrip[data-active=true]{
 width:18px;height:18px;outline:2px solid #f7f8fa;outline-offset:1px;
 box-shadow:0 2px 9px #000c,0 0 11px #83d5f7;
}
#cad3dLab .cad3dGripHint{
 position:absolute;z-index:1;max-width:230px;padding:5px 8px;transform:translate(0,-100%);
 color:#fff;font:600 11px Inter,Arial,sans-serif;white-space:nowrap;
 border:1px solid #678ba0;border-radius:6px;background:#162735e8;
 box-shadow:0 4px 14px #000a;pointer-events:none;
}
#cad3dLab .rulerX, #cad3dLab .rulerY {
 position:absolute; z-index:1; overflow:hidden; pointer-events:none;
 background:var(--cad-ui-toolbar); color:var(--cad-ui-muted); font:9px Inter,Arial,sans-serif;
}
#cad3dLab .rulerX { inset:0 0 auto 0; height:16px; border-bottom:1px solid var(--cad-ui-edge) }
#cad3dLab .rulerY { inset:16px auto 0 0; width:20px; border-right:1px solid var(--cad-ui-edge) }
#cad3dLab .rulerX span { position:absolute; bottom:0; height:13px; padding-left:3px; border-left:1px solid var(--cad-ui-edge) }
#cad3dLab .rulerY span { position:absolute; right:0; width:100%; padding-right:2px; border-top:1px solid var(--cad-ui-edge); text-align:right }
#cad3dLab .snapMarker { position:absolute; width:8px; height:8px; transform:translate(-50%,-50%); border:1px solid #f2d07e; z-index:2; pointer-events:none }
#cad3dLab .cad3dViewSelect {
 width:100%; min-width:0; height:26px; padding:1px 4px;
 border:1px solid var(--cad-ui-edge); font:11px Inter,Arial,sans-serif; cursor:pointer;
}
#cad3dLab .cad3dContextMenu{position:absolute;z-index:30;min-width:170px;max-width:250px;padding:5px;border:1px solid #7993a7;border-radius:9px;background:#1d2a35;color:#ebf4fb;box-shadow:0 10px 25px #0009;font:12px Inter,Arial,sans-serif}
#cad3dLab .cad3dContextMenu[hidden]{display:none!important}
#cad3dLab .cad3dContextMenu button{display:block;width:100%;text-align:left;padding:9px;border:0;border-radius:6px;background:transparent;color:inherit;cursor:pointer;font:inherit}
#cad3dLab .cad3dContextMenu button:hover{background:#3b566c}
#cad3dLab .cad3dContextMenu .contextObject{display:block;padding:5px 9px;color:#aac8d8;font-size:10px}
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

/* CAD3D toolbar appearance follows the original CAD2D ribbon and floating-tool palette.
   Scoped to toolbars only; viewport, property panels, and commands remain unchanged. */
#cad3dLab .cad3dBasicBars,
#cad3dLab .cad3dProfileTools,
#cad3dLab .cad3dModelTools,
#cad3dLab .tools{
 background:linear-gradient(180deg,#151b20,#101519)!important;
 color:#ccd8dd!important;
 border-bottom:1px solid #33404a!important;
 box-shadow:none!important;
 min-height:36px!important;
 padding:4px 7px!important;
 gap:5px!important;
}
#cad3dLab .cad3dBasicBars .cad3dBar{
 padding-right:8px!important;
 border-right:1px solid #34404a!important;
}
#cad3dLab .cad3dBasicBars .cad3dBar:last-child{border-right:none!important}
#cad3dLab .cad3dBar>strong,
#cad3dLab .cad3dProfileTools>strong,
#cad3dLab .cad3dModelTools>strong{
 color:#91a3ad!important;
 font:700 10px Segoe UI,Arial,sans-serif!important;
 letter-spacing:.45px!important;
 margin:0 7px 0 2px!important;
 white-space:nowrap!important;
}
#cad3dLab .cad3dBar button.btn,
#cad3dLab .cad3dProfileTools button.btn,
#cad3dLab .cad3dModelTools button.btn,
#cad3dLab .tools button.btn,
#cad3dLab .tools summary.btn,
#cad3dLab .tools label.btn{
 display:inline-flex!important;
 align-items:center!important;
 justify-content:center!important;
 flex:none!important;
 width:auto!important;
 min-width:29px!important;
 height:29px!important;
 min-height:29px!important;
 max-height:29px!important;
 padding:4px 7px!important;
 margin:0!important;
 gap:5px!important;
 background:#202b32!important;
 border:1px solid #44535e!important;
 border-radius:3px!important;
 color:#d4e0e7!important;
 font:11px Segoe UI,Arial,sans-serif!important;
 line-height:1.1!important;
 white-space:nowrap!important;
 box-shadow:none!important;
 cursor:pointer!important;
}
#cad3dLab .cad3dBar button.btn:hover,
#cad3dLab .cad3dProfileTools button.btn:hover,
#cad3dLab .cad3dModelTools button.btn:hover,
#cad3dLab .tools button.btn:hover,
#cad3dLab .tools summary.btn:hover,
#cad3dLab .tools label.btn:hover{
 background:#425563!important;
 border-color:#738996!important;
}
#cad3dLab .cad3dBar button.btn.armed,
#cad3dLab .cad3dProfileTools button.btn.armed,
#cad3dLab .cad3dModelTools button.btn.armed,
#cad3dLab .tools button.btn.armed{
 background:#344c59!important;
 border-color:#91bfce!important;
 color:#f3fbff!important;
 box-shadow:inset 0 -2px 0 #8dcce0!important;
}
#cad3dLab .cad3dBar button.btn svg,
#cad3dLab .cad3dProfileTools button.btn svg,
#cad3dLab .cad3dModelTools button.btn svg,
#cad3dLab .tools button.btn svg{
 width:17px!important;
 height:17px!important;
 max-width:17px!important;
 max-height:17px!important;
 flex:0 0 17px!important;
}
#cad3dLab .cad3dBar button.btn span,
#cad3dLab .cad3dProfileTools button.btn span{
 font:inherit!important;
 line-height:1.1!important;
}
#cad3dLab .cad3dModelTools label{
 color:#aebdc6!important;
 font:11px Segoe UI,Arial,sans-serif!important;
}
#cad3dLab .cad3dModelTools .cad3dExtrudeHeight{
 height:27px!important;
 width:68px!important;
 padding:3px 6px!important;
 background:#171f25!important;
 color:#e9f0f4!important;
 border:1px solid #44535e!important;
 border-radius:3px!important;
}
#cad3dLab .cad3dToolbarGrip,
#cad3dLab .cad3dToolbarGrip[data-floating="true"]{
 width:19px!important;
 min-width:19px!important;
 max-width:19px!important;
 height:26px!important;
 min-height:26px!important;
 flex:0 0 19px!important;
 background:#303c46!important;
 border:1px solid #52616c!important;
 border-radius:3px!important;
 color:#cbd5dd!important;
 box-shadow:none!important;
}
#cad3dLab .cad3dToolbarGrip:hover,
#cad3dLab .cad3dToolbarGrip[data-floating="true"]:hover{
 background:#425563!important;
 color:#f4fbff!important;
}
#cad3dLab .cad3dBar.cad3dDockFloating,
#cad3dLab .cad3dProfileTools.cad3dDockFloating,
#cad3dLab .cad3dModelTools.cad3dDockFloating,
#cad3dLab .tools.cad3dDockFloating{
 min-height:39px!important;
 padding:5px!important;
 gap:4px!important;
 border:1px solid #697b88!important;
 border-radius:5px!important;
 background:#1d252bf0!important;
 box-shadow:0 7px 22px #0009!important;
 backdrop-filter:blur(7px);
}

/* Same compact icon toolbar language as the CAD2D top bar.
 * Zone docking rather than loose floating absolute coordinates. */
#cad3dLab.cad3dCompactMode .cad3dDockZone{
 display:flex;align-items:center;justify-content:flex-start;flex-wrap:wrap;
 flex:none;gap:3px;padding:3px 7px!important;
 background:#0b1117!important;color:#e8eff4!important;
 border-bottom:1px solid #34424d!important;overflow:visible!important;
 scrollbar-width:thin;box-sizing:border-box;
}
#cad3dLab.cad3dCompactMode .cad3dDockTop{min-height:44px!important}
#cad3dLab.cad3dCompactMode .cad3dDockBottom{
 min-height:0;max-height:120px;padding:0 7px!important;
}
#cad3dLab.cad3dCompactMode .cad3dDockBottom.cad3dDockEmpty:not(.cad3dDockCandidate){display:none!important}
#cad3dLab.cad3dCompactMode .cad3dDockZone>.cad3dDockBar{
 position:relative!important;left:auto!important;top:auto!important;
 width:max-content!important;height:auto!important;max-width:100%!important;
 flex:none!important;display:flex!important;flex-wrap:nowrap!important;
 align-items:center!important;gap:4px!important;padding:3px 5px 3px 3px!important;
 min-height:39px!important;margin:0!important;
 overflow:visible!important;border:0!important;
 border-right:1px solid #34424d!important;border-radius:0!important;
 background:transparent!important;box-shadow:none!important;
 z-index:auto!important;
}
#cad3dLab.cad3dCompactMode .cad3dDockZone>.cad3dDockBar:focus-within{z-index:60!important}
#cad3dLab.cad3dCompactMode .cad3dDockZone>.cad3dDockBar:has(details[open]),
#cad3dLab.cad3dCompactMode .cad3dDockZone>.cad3dDockBar:has([aria-expanded="true"]){z-index:70!important}
#cad3dLab.cad3dCompactMode .cad3dDockBar > strong{display:none!important}
#cad3dLab.cad3dCompactMode .cad3dDockBar > .cad3dToolbarGrip{
 display:grid!important;place-items:center!important;
 width:17px!important;min-width:17px!important;max-width:17px!important;
 height:31px!important;min-height:31px!important;max-height:31px!important;
 flex:0 0 17px!important;padding:0!important;margin:0 3px 0 0!important;
 border:1px solid #475461!important;border-radius:3px!important;
 color:#a2b1be!important;background:#222d37!important;cursor:grab!important;
}
#cad3dLab.cad3dCompactMode .cad3dDockBar > .cad3dToolbarGrip:active{cursor:grabbing!important}
#cad3dLab.cad3dCompactMode .cad3dDockBar > .cad3dToolbarGrip svg{width:12px!important;height:17px!important;flex:none!important}
#cad3dLab.cad3dCompactMode .cad3dBar > button.btn,
#cad3dLab.cad3dCompactMode .cad3dProfileTools > button.btn,
#cad3dLab.cad3dCompactMode .cad3dModelTools > button.btn,
#cad3dLab.cad3dCompactMode .tools > button.btn,
#cad3dLab.cad3dCompactMode .tools > label.btn,
#cad3dLab.cad3dCompactMode .tools > .block3DMenu > summary.btn,
#cad3dLab.cad3dCompactMode .tools > .ioMenu > summary.btn,
#cad3dLab.cad3dCompactMode .tools > .viewSaveMenu > summary.btn,
#cad3dLab.cad3dCompactMode .tools > .sunControl > button.btn,
#cad3dLab.cad3dCompactMode .tools > .styleControl > button.btn{
 display:inline-flex!important;justify-content:center!important;align-items:center!important;
 flex:0 0 36px!important;width:36px!important;min-width:36px!important;max-width:36px!important;
 height:36px!important;min-height:36px!important;max-height:36px!important;
 padding:5px!important;margin:0!important;gap:0!important;
 border:1px solid #25333e!important;border-radius:6px!important;
 background:#030609!important;color:#ebf2f6!important;
 font-size:0!important;line-height:0!important;box-shadow:none!important;
 overflow:hidden!important;white-space:nowrap!important;cursor:pointer!important;
}
#cad3dLab.cad3dCompactMode .cad3dBar > button.btn:hover,
#cad3dLab.cad3dCompactMode .cad3dProfileTools > button.btn:hover,
#cad3dLab.cad3dCompactMode .cad3dModelTools > button.btn:hover,
#cad3dLab.cad3dCompactMode .tools > button.btn:hover,
#cad3dLab.cad3dCompactMode .tools > label.btn:hover,
#cad3dLab.cad3dCompactMode .tools summary.btn:hover{
 background:#192b38!important;border-color:#88b0c6!important;
}
#cad3dLab.cad3dCompactMode .cad3dBar > button.btn.armed,
#cad3dLab.cad3dCompactMode .cad3dProfileTools > button.btn.armed,
#cad3dLab.cad3dCompactMode .cad3dModelTools > button.btn.armed{
 background:#1b4256!important;border-color:#a2d7ee!important;
 box-shadow:inset 0 -2px 0 #8dcce0!important;
}
#cad3dLab.cad3dCompactMode .cad3dBar > button.btn > span,
#cad3dLab.cad3dCompactMode .cad3dProfileTools > button.btn > span,
#cad3dLab.cad3dCompactMode .cad3dModelTools > button.btn > span,
#cad3dLab.cad3dCompactMode .tools > button.btn > span,
#cad3dLab.cad3dCompactMode .tools > label.btn > span,
#cad3dLab.cad3dCompactMode .tools > .sunControl > button.btn > span,
#cad3dLab.cad3dCompactMode .tools > .styleControl > button.btn > span,
#cad3dLab.cad3dCompactMode .tools > .block3DMenu > summary.btn > span,
#cad3dLab.cad3dCompactMode .tools > .ioMenu > summary.btn > span,
#cad3dLab.cad3dCompactMode .tools > .viewSaveMenu > summary.btn > span{display:none!important}
#cad3dLab.cad3dCompactMode .cad3dDockBar .btn > svg,
#cad3dLab.cad3dCompactMode .cad3dDockBar summary.btn > svg{
 width:21px!important;height:21px!important;max-width:21px!important;max-height:21px!important;
 flex:0 0 21px!important;display:block!important;
}
#cad3dLab.cad3dCompactMode .tools .ioMenu > summary::after,
#cad3dLab.cad3dCompactMode .tools .viewSaveMenu > summary::after{display:none!important}
#cad3dLab.cad3dCompactMode .cad3dModelTools >label{
 display:flex!important;align-items:center!important;gap:5px!important;
 font:0 Segoe UI,Arial,sans-serif!important;color:#b7c8d4!important;
 white-space:nowrap!important;margin:0 3px!important;
}
#cad3dLab.cad3dCompactMode .cad3dModelTools >label::before{
 content:"H";font:700 12px Segoe UI,Arial,sans-serif;color:#a9c4d3;
}
#cad3dLab.cad3dCompactMode .cad3dModelTools .cad3dExtrudeHeight{
 width:58px!important;height:30px!important;min-height:30px!important;
 background:#151e25!important;border:1px solid #556671!important;
 border-radius:4px!important;color:#eef5f9!important;
 font:12px Segoe UI,Arial,sans-serif!important;text-align:center!important;
 padding:3px!important;
}
#cad3dLab.cad3dCompactMode .cad3dDockSide{
 position:absolute!important;top:8px!important;bottom:8px!important;
 z-index:28!important;display:flex!important;flex-direction:column!important;
 align-items:stretch!important;justify-content:flex-start!important;
 flex-wrap:nowrap!important;gap:3px!important;
 width:max-content!important;min-width:8px!important;max-width:105px!important;
 height:auto!important;overflow:visible!important;
 padding:3px!important;border:1px solid #32434f!important;border-radius:5px!important;
 background:#0b1117e8!important;
}
#cad3dLab.cad3dCompactMode .cad3dDockLeft{left:4px!important}
#cad3dLab.cad3dCompactMode .cad3dDockRight{right:4px!important}
#cad3dLab.cad3dCompactMode .cad3dDockSide.cad3dDockEmpty:not(.cad3dDockCandidate){
 display:none!important;
}
#cad3dLab.cad3dCompactMode .cad3dDockSide > .cad3dDockBar{
 flex-direction:column!important;align-items:center!important;
 flex-wrap:nowrap!important;width:53px!important;max-width:105px!important;
 min-height:0!important;max-height:100%!important;overflow:visible!important;
 padding:4px!important;border-right:0!important;
 border-bottom:1px solid #34424d!important;
}
#cad3dLab.cad3dCompactMode .cad3dDockSide .cad3dModelTools >label{
 flex-direction:column!important;
}
#cad3dLab.cad3dCompactMode .cad3dDockSide .cad3dModelTools .cad3dExtrudeHeight{width:48px!important}
#cad3dLab.cad3dCompactMode.cad3dDraggingDock .cad3dDockZone{
 outline:1px dashed #4d6f82;outline-offset:-2px;
}
#cad3dLab.cad3dCompactMode.cad3dDraggingDock .cad3dDockSide.cad3dDockEmpty{
 display:flex!important;width:52px!important;min-height:120px!important;
}
#cad3dLab.cad3dCompactMode.cad3dDraggingDock .cad3dDockBottom.cad3dDockEmpty{
 display:flex!important;min-height:40px!important;
}
#cad3dLab.cad3dCompactMode .cad3dDockZone.cad3dDockCandidate{
 outline:2px solid #91c8e5!important;outline-offset:-2px;
 background:#173042!important;
}
#cad3dLab.cad3dCompactMode .cad3dDockPlaceholder{
 flex:0 0 auto;border:1px dashed #91c8e5!important;
 border-radius:5px;background:#26475b70!important;
}
#cad3dLab.cad3dCompactMode .cad3dDockDraggingBar{
 position:absolute!important;z-index:950!important;display:flex!important;
 flex-wrap:nowrap!important;align-items:center!important;gap:3px!important;
 height:45px!important;max-height:45px!important;
 width:max-content!important;max-width:calc(100% - 12px)!important;
 padding:4px!important;margin:0!important;
 background:#17252ff2!important;border:1px solid #8bbcd2!important;
 border-radius:6px!important;box-shadow:0 12px 30px #000a!important;
 pointer-events:none!important;
}
#cad3dLab.cad3dCompactMode .cad3dDockDraggingBar > strong{display:none!important}
#cad3dLab.cad3dCompactMode .cad3dDockLeft .stylePanel,
#cad3dLab.cad3dCompactMode .cad3dDockLeft .sunPanel,
#cad3dLab.cad3dCompactMode .cad3dDockLeft .viewSavePanel,
#cad3dLab.cad3dCompactMode .cad3dDockLeft .ioMenu > div{
 left:calc(100% + 5px)!important;right:auto!important;top:0!important;
}
#cad3dLab.cad3dCompactMode .cad3dDockLeft .block3DPanel{
 left:calc(100% + 5px)!important;right:auto!important;top:0!important;
}
#cad3dLab.cad3dCompactMode .cad3dDockRight .block3DPanel,
#cad3dLab.cad3dCompactMode .cad3dDockRight .stylePanel,
#cad3dLab.cad3dCompactMode .cad3dDockRight .sunPanel,
#cad3dLab.cad3dCompactMode .cad3dDockRight .viewSavePanel{
 right:calc(100% + 5px)!important;left:auto!important;top:0!important;
}
#cad3dLab.cad3dCompactMode .cad3dDockRight .ioMenu > div{
 right:calc(100% + 5px)!important;left:auto!important;top:0!important;
}
`;
css+=`
#cad3dLab .viewCube{background:linear-gradient(145deg,#f9f9f9,#bfc2c6)!important;border-color:#52565a!important;box-shadow:0 3px 10px #0007,inset 0 1px 2px #fff!important}
#cad3dLab .cubePlane{fill:#e5e5e5!important;stroke:#262626!important}
#cad3dLab .cubeFaceLabel{fill:#101010!important;stroke:#fff!important;stroke-width:.7px!important}
#cad3dLab .cubeCornerZone{fill:#f5f5f5!important;stroke:#222!important}
#cad3dLab .cubeFaceZone:hover .cubePlane{fill:#a7a7a7!important}
#cad3dLab .styleLaunch{display:flex;align-items:center;gap:7px}
#cad3dLab .styleColorCube{width:24px;height:24px;display:inline-block;flex:none;transform:rotate(-24deg) skewY(10deg);border:1px solid #222;border-radius:3px;background:conic-gradient(from 45deg,#ed5966 0 25%,#f4c64c 25% 50%,#55b9a3 50% 75%,#6388df 75% 100%);box-shadow:inset 0 0 0 2px #ffffff55,1px 2px 4px #0008}
#cad3dLab .camera3DBar{display:flex;align-items:center;gap:5px;flex-wrap:wrap;background:#18232c;border-bottom:1px solid #3a4b55;padding:5px 12px}
#cad3dLab .camera3DBar select{min-width:140px;max-width:210px;height:27px;background:#edf0f2;color:#1b252b;border-radius:4px}
#cad3dLab .camera3DBar button{padding:5px 9px}
`;
css+="\n#cad3dLab .catalogItems .cad3dCatalogPreview{display:block;width:100%;height:78px;margin:0 auto 2px;filter:drop-shadow(0 3px 3px #0005);overflow:visible}\n#cad3dLab .catalogItems .btn{justify-content:flex-start;min-height:126px}\n#cad3dLab .catalogItems .btn span{font-weight:500;line-height:1.2}\n#cad3dLab .catalogItems .btn:hover .cad3dCatalogPreview{filter:drop-shadow(0 3px 5px #0009) brightness(1.12)}\n";
css+="\n#cad3dLab .sketchButton .cad3dSketchCube{width:25px!important;height:25px!important;display:block!important;flex:0 0 25px;stroke:none!important;fill:none;overflow:visible;filter:drop-shadow(0 1px 2px #0008)}\n#cad3dLab .sketchButton:hover .cad3dSketchCube{filter:drop-shadow(0 0 3px #8de8ff77)}\n";
css+='\n#cad3dLab .sketchButton .cad3dSketchPhoto{width:28px!important;height:28px!important;object-fit:contain;display:block;border-radius:2px;flex:none;filter:drop-shadow(0 1px 2px #0008)}\n';
css+="\n#cad3dLab .tools .styleControl > .styleLaunch{display:none!important}\n#cad3dLab .tools .styleControl{width:0!important;min-width:0!important;flex-basis:0!important;margin:0!important;padding:0!important}\n#cad3dLab .tools .archLaunch svg{width:26px!important;height:26px!important}\n#cad3dLab .sunPanel{position:absolute!important;right:auto!important;bottom:auto!important;top:225px;left:28px;width:274px;max-width:calc(100% - 20px);max-height:calc(100% - 40px);overflow:auto;z-index:90!important;touch-action:auto;box-sizing:border-box}\n#cad3dLab .sunFloatingHeader{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:-12px -12px 6px;padding:9px 12px;background:#223443;border-bottom:1px solid #587081;border-radius:9px 9px 0 0;cursor:grab;user-select:none;touch-action:none;font-size:11px;letter-spacing:.5px}\n#cad3dLab .sunFloatingHeader:active{cursor:grabbing}\n#cad3dLab .sunFloatingClose{font:20px Arial,sans-serif;line-height:1;background:transparent;border:0;color:#e4edf3;cursor:pointer;padding:2px 5px}\n#cad3dLab .styleControl .stylePanel{right:auto;left:-30px;top:calc(100% + 8px)}\n";
css+="\n#cad3dLab > .archPalette{position:absolute!important;right:auto!important;bottom:auto!important;z-index:110;max-width:calc(100% - 16px)!important;max-height:calc(100% - 16px)!important}\n#cad3dLab > .sunPanel{z-index:110;max-width:calc(100% - 16px)!important;max-height:calc(100% - 16px)!important}\n#cad3dLab .archTitle,#cad3dLab .sunFloatingHeader{cursor:grab!important;touch-action:none!important}\n#cad3dLab .archTitle:active,#cad3dLab .sunFloatingHeader:active{cursor:grabbing!important}\n";
css+="\n#cad3dLab .viewCube{background:linear-gradient(140deg,#f9fbfd,#cfdae4)!important;border:2px solid #4f6e82!important;border-radius:19px!important;box-shadow:inset 0 1px 2px #fff,0 4px 11px #0006!important}\n#cad3dLab .viewCube .cubePlane{stroke:#132b39!important;stroke-width:1.8px!important}\n#cad3dLab .viewCube .cubeFaceZone[data-view-preset=\"top\"] .cubePlane{fill:#a6d3ff!important}\n#cad3dLab .viewCube .cubeFaceZone[data-view-preset=\"front\"] .cubePlane{fill:#a3e3a3!important}\n#cad3dLab .viewCube .cubeFaceZone[data-view-preset=\"right\"] .cubePlane{fill:#f4aaa9!important}\n#cad3dLab .viewCube .cubeFaceZone[data-view-preset=\"left\"] .cubePlane{fill:#d7b1f1!important}\n#cad3dLab .viewCube .cubeFaceZone[data-view-preset=\"back\"] .cubePlane{fill:#b9e5d6!important}\n#cad3dLab .viewCube .cubeFaceZone[data-view-preset=\"bottom\"] .cubePlane{fill:#d9dfe8!important}\n#cad3dLab .viewCube .cubeFaceLabel{font-weight:800!important;fill:#111a24!important;stroke:none!important;paint-order:normal!important;letter-spacing:.15px!important;font-size:9.5px!important;pointer-events:none!important}\n#cad3dLab .viewCube .cubeCornerZone{fill:#f5f8fb!important;stroke:#293b46!important;stroke-width:1.2!important}\n#cad3dLab .viewCube .cubeFaceZone:hover .cubePlane{filter:brightness(1.12)}\n#cad3dLab .orbitBall{background:linear-gradient(140deg,#edf5fb,#cbdbe8)!important;border:2px solid #284962!important;border-radius:50%!important;box-shadow:inset 0 1px 2px #fff,0 5px 12px #0007!important}\n#cad3dLab .orbitBall svg{width:100%!important;height:100%!important;filter:none!important}\n";
css+="\n#cad3dLab .cad3dNavToolbar,#cad3dLab .cad3dStyleToolbar,#cad3dLab .cad3dQuickViews{display:flex;align-items:center;flex:none;gap:3px;padding:4px 7px;background:#14212a;border-bottom:1px solid #415767;min-height:41px;white-space:nowrap}\n#cad3dLab .cad3dNavToolbar strong,#cad3dLab .cad3dStyleToolbar strong,#cad3dLab .cad3dQuickViews strong{font:700 9px Inter,Arial,sans-serif;letter-spacing:.9px;color:#b0c3cf;margin:0 5px 0 2px}\n#cad3dLab .cad3dQuickTool{min-width:30px;height:31px;border:1px solid #455968;border-radius:6px;background:#090f15;color:#ecf4f8;display:inline-grid;place-items:center;padding:0 5px;font:700 13px Inter,Arial,sans-serif;cursor:pointer;transition:background .15s,border-color .15s}\n#cad3dLab .cad3dQuickViews .cad3dQuickTool{font-size:10px;min-width:36px}\n#cad3dLab .cad3dQuickTool:hover{background:#2b4352;border-color:#a5cadd}\n#cad3dLab .cad3dQuickTool[aria-pressed=\"true\"]{background:#244e67;border:1px solid #9edff7;box-shadow:inset 0 -2px 0 #9edff7}\n#cad3dLab .viewNav.cad3dBIMNavigator .viewCube{outline:2px solid #8caec9;outline-offset:5px}\n#cad3dLab .viewNav.cad3dBIMNavigator .viewNavTop{position:relative}\n#cad3dLab .viewNav.cad3dBIMNavigator .viewCube:before{content:\"N\";position:absolute;left:45%;top:0;z-index:7;font-weight:800;color:#113957;pointer-events:none}\n#cad3dLab .viewNav.cad3dBIMNavigator .viewCube:after{content:\"O  ·  S  ·  E\";position:absolute;bottom:1px;left:0;right:0;text-align:center;z-index:7;font-size:9px;font-weight:800;color:#14354e;pointer-events:none}\n#cad3dLab.cad3dCompactMode .cad3dDockBar.cad3dNavToolbar,#cad3dLab.cad3dCompactMode .cad3dDockBar.cad3dStyleToolbar,#cad3dLab.cad3dCompactMode .cad3dDockBar.cad3dQuickViews{gap:3px!important;padding:4px 5px!important}\n#cad3dLab.cad3dCompactMode .cad3dDockBar .cad3dQuickTool{min-height:31px;flex:0 0 auto}\n";
css+="\n#cad3dLab .view .cad3dPlanWallOverlay{position:absolute;inset:0;width:100%;height:100%;z-index:2;pointer-events:none;overflow:hidden}\n#cad3dLab .view.wire2dView{background:#fff!important}\n";
css+="\n#cad3dLab .cad3dStyleToolbar{gap:4px!important;flex:none}\n#cad3dLab .cad3dStyleToolbar .cad3dQuickTool{width:42px!important;min-width:42px!important;max-width:42px!important;height:38px!important;min-height:38px!important;max-height:38px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;padding:2px!important;background:#081018!important;overflow:visible!important;border-radius:6px!important}\n#cad3dLab .cad3dStyleToolbar .cad3dApprovedCubeSvg{display:block!important;width:31px!important;height:31px!important;min-width:31px!important;min-height:31px!important;flex:none!important;overflow:visible}\n#cad3dLab .cad3dStyleToolbar .cad3dQuickTool[aria-pressed=\"true\"]{background:#24445a!important;border:2px solid #76cefb!important;box-shadow:0 0 0 1px #76cefb55,inset 0 -2px 0 #a9e8ff!important}\n#cad3dLab .cad3dStyleToolbar .cad3dQuickTool:hover{background:#253b4e!important}\n";
css+="\n/* Full Visual Style gallery and six fast style cubes are complementary, not alternatives. */\n#cad3dLab .tools .styleControl{display:flex!important;position:relative!important;width:auto!important;min-width:36px!important;flex:0 0 auto!important;flex-basis:auto!important;margin:0!important;padding:0!important}\n#cad3dLab .tools .styleControl > .styleLaunch{display:inline-flex!important;align-items:center!important;justify-content:center!important;min-width:36px!important;width:36px!important;height:36px!important;padding:3px!important}\n#cad3dLab .tools .styleControl > .styleLaunch .styleColorCube{display:block!important;width:24px!important;height:24px!important;flex:none!important}\n#cad3dLab > .stylePanel{position:absolute!important;top:185px;left:12px;right:auto!important;z-index:140!important;max-width:calc(100% - 16px)!important;max-height:calc(100% - 52px)!important;overflow:auto}\n#cad3dLab > .stylePanel[hidden]{display:none!important}\n";
css+="\n#cad3dLab .view.cad3dPanning canvas{cursor:grab!important;touch-action:none!important}\n#cad3dLab .view.cad3dPanning canvas:active{cursor:grabbing!important}\n";
css+="\n#cad3dLab .view .cad3dDraftPreview{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:12;overflow:hidden}\n#cad3dLab .view .cad3dDraftPreview[hidden]{display:none!important}\n";
var cssNode=document.createElement('style');cssNode.id='cad3dLabCSS';cssNode.textContent=css;document.head.appendChild(cssNode);
function escapeHtml(a){return String(a).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function finite(a,f){var n=Number(a);return Number.isFinite(n)?n:f;}
function clamp(a,min,max){return Math.max(min,Math.min(max,a));}
function text(s){if(root)root.querySelector('.cad3dStatus').textContent=s;}
function ico(name){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(icons[name]||icons.cube)+'</svg>';}
function tool(id,name,shape,title){
 var icon=id==='sketch'?'<img class="cad3dSketchPhoto" src="data:image/webp;base64,UklGRvAFAABXRUJQVlA4IOQFAABQGgCdASpIAEgAPlUijkSjoiGaOgcYOAVEswBA3Kc/ofOVrb+V4K4/ELL8171/zH+cB6Qv9z6VXU9bzHXrGNPbf9peYEtdxV6+H408YByf+df5vjR0u8zL/v+Yn6U/7H+M+AT+R/2f/kqSutnpL9+s9f/9edrl0X+zOv7lxO2eBw+lymjJu5sU8MBcxF8t+UZ+vk5s/9SOuK6HzL3VxCaaU1tcZLjEjpqxAaX3VeYuq2G+2JARxTqJX+v1BxNZA2qHXd+/3NrU3Q/xSBeAaMJ/tTXG08fnLk3QsYAA/v7NjHFYdUetSE6Ec/yrnwHjX4C97yIkIJcqnxzM/SAE2gWl5xt/OP/AOU5/iAzGoP/Med3ChghPrmekeF3ECvjnEMRo/Ah5PaGLti3NjwaX+La7SqSD/CfKVui2ig2lGuU6SVCwJ6W0FaVa9E9ibsTL1ChBOGLyDHpSWq1SGy2lHXkguluN2Toy2Nie/TIFmrtzNO2Af8xRuk6D01gWVpUFWGG1JFCXZODhPZRaEd5dnvukebKxp3uzkguu44oMCF+V9XV4S/QIYhjnKLeMiZFswHuQaAO6akLbg4DrfL443SLGpZqPpD/waJIdDFlhSpP42328ccqmnwagCHOcvcbTwXzXNs1Gv/HqqewwsWujJja8EUH9vpSle/f/9rdvhdu+MrvY8YfR+0hNcsMIoKabMdlqMC1lvEKOSN0H18K9Edpz1HhHZgnpxCp5nj3i9OXbQmWnJr+//p+5TXlP5/YX5/40RKj03/qxY8J9HEmw8m//H2hTMikvTNciUPHydd09S0S4IycYjXS37hEcwrbohKN3TSTKXJP+lFUMN86++iC8WNDYKhllTTHT6HWIht3p8Bb9v2fflVdmeh3i5Tvd/3q6w63/3FFDCrTPeZGEdkws6FG+tjf9Bj70UCKwG9tn/33xAJi4l02xXhnyX6J2ixI8bcmg1OpRFH8VtaSMqdD56jX8oE9QSOlyoxN1Ww1qEurFQ32sbH3FOw+mEC0d3m3QJbSKxwc42Mo/fmOFGbJAsXLKEV7oKErbfRQJaKDtlHQgyQppIrpUjKAtJntZbMintc2BRC3+TQ8/eCU8ZdC01hYPv+ZtOco/CO06WUykNnMkYn0JxkuTDADll1EIUweswlfBtZawde8e1WJz/8n7p/zoq8b6R34MSfnd6mMwRxhnd+P3TVDQvrFOrSembsqSEhQTuaphUfASE6ACsh+Qp+/kd7uGVg4Dfw71zcCymaWFzbajXRdL1OyCnPedJ93ai9I3MebBQeAt8Jxmo6F2XLFVnm0QhGrmB2wN3/GXJiAdUxN8oT/Y6+vtxBoSXurZ9LaHMDt3+XkLL3dKMKIivcjhzHs0EJ4QLsFM9Ewqv4NgP6LaLiElV1v4/jjWK5o9lXdXO5HexKYYOO4JkTf2crodyDOIC/zQ3dub/F/28cqoiGDgFRYdQp/76hA+O1ThVE2c72SK2J3G1CHvJVhzyqvLtcB7Y5ZTD4BOKqb7w3YL/JKh4LnB4BsrcSYgumFf/zvceTfsPYcq4m8JYcmn84nP9xYqN0ftSNZUb8VhzacCLkMFVYbbav1jsbOOaZN7OcU5m/CYv4XclAS0Hmb8lY7n5Wqv4RobwgtQXLOnIrUPBczx5sfNqB/AD3N6jTo4ggDFmT5tT/zTfs0sFeRude4CKKjmBOnlOEGR22uIBFLEVAB3DF7UrD0ZZ2e+x7x9qBXteLpxNw7ixUAdufM8XmOkb7a1fwE2qB7lFKyqrLzsFyn7RLt49nIHLikoBvdd5m08pzfbtPg6HFcXG7+rPNf4Z53/utd19h5GpAq2L9OMLo7iG42hiA2jh+RIXFldmbNb3JHSG+Er+F6aUAC7zfKrPnM+DuGUBG0DQ+gGGjD5EZW/+5mzopeqqzhlQLnmTabIi05ohnnbgZG7LKubv7+kBKo9B4SCtaZ9RQq6yVIOqZcdCYf3TXqOHpfqGbqO41ut5cVBbARcfUpTkMi42AAAAA==" alt="" aria-hidden="true">':ico(shape||id);
 return '<button type="button" class="btn'+(id==='sketch'?' sketchButton':'')+'" data-action="'+id+'" title="'+(title||name)+'" aria-label="'+name+'">'+icon+'<span>'+name+'</span></button>';
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
  {id:'triple-sliding-door',name:'Triple sliding · 360 cm',w:3.60,h:2.40,sill:0},
  {id:'triple-fold-door',name:'Triple folding · 270 cm',w:2.70,h:2.20,sill:0},
  {id:'classic-panel-door',name:'Classic raised-panel door · 90 cm',w:.90,h:2.20,sill:0},
  {id:'neoclassical-double-door',name:'Neoclassical double glazed · 180 cm',w:1.80,h:2.40,sill:0},
  {id:'french-12-pane-door',name:'French door · 12-pane glazing',w:1.60,h:2.20,sill:0},
  {id:'victorian-glazed-door',name:'Victorian glazed entrance',w:1.10,h:2.30,sill:0},
  {id:'gothic-tracery-door',name:'Gothic tracery entrance',w:1.20,h:2.50,sill:0},
  {id:'colonial-six-pane-door',name:'Colonial six-panel entrance',w:.95,h:2.20,sill:0},
  {id:'modern-steel-glass-door',name:'Modern steel glazed door',w:1.10,h:2.30,sill:0},
  {id:'art-deco-door',name:'Art Deco geometric door',w:1.00,h:2.25,sill:0},
  {id:'barn-sliding-door',name:'Barn sliding door',w:1.10,h:2.20,sill:0},
  {id:'arched-style-entrance',name:'Arched-style entrance · decorative glazing',w:1.20,h:2.50,sill:0}
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
  {id:'triple-sliding-window',name:'Three-leaf sliding · 300 cm',w:3.00,h:1.40,sill:.85},
  {id:'triple-casement',name:'Three-leaf casement · 270 cm',w:2.70,h:1.40,sill:.85},
  {id:'tilt-turn-window',name:'Tilt and turn · 100 cm',w:1.00,h:1.30,sill:.90},
  {id:'georgian-six-pane',name:'Georgian · six-pane sash',w:1.10,h:1.50,sill:.75},
  {id:'georgian-twelve-pane',name:'Georgian · twelve-pane sash',w:1.20,h:1.70,sill:.72},
  {id:'neoclassical-french-window',name:'Neoclassical · French mullions',w:1.50,h:1.80,sill:.55},
  {id:'victorian-bay-style',name:'Victorian · subdivided glazing',w:1.80,h:1.60,sill:.75},
  {id:'gothic-lancet-tracery',name:'Gothic lancet · pointed tracery',w:1.00,h:2.10,sill:.45},
  {id:'gothic-twin-lancet',name:'Gothic twin lancet · tracery',w:1.80,h:2.20,sill:.40},
  {id:'gothic-rose-tracery',name:'Gothic rose-inspired glazing',w:1.80,h:1.80,sill:.75},
  {id:'renaissance-cross-window',name:'Renaissance · cross mullion',w:1.40,h:1.75,sill:.70},
  {id:'colonial-nine-pane',name:'Colonial · nine-pane glazing',w:1.20,h:1.40,sill:.85},
  {id:'tudor-leaded-diamond',name:'Tudor · diamond leaded glass',w:1.10,h:1.50,sill:.85},
  {id:'art-deco-geometric',name:'Art Deco · geometric glazing',w:1.30,h:1.60,sill:.85},
  {id:'industrial-steel-grid',name:'Industrial steel · 4 × 4 grid',w:2.00,h:1.70,sill:.65},
  {id:'japanese-shoji-grid',name:'Japanese grid · 4 × 5',w:1.80,h:1.70,sill:.50},
  {id:'modern-ribbon-grid',name:'Contemporary horizontal mullions',w:2.60,h:.90,sill:1.15},
  {id:'mediterranean-arched-style',name:'Mediterranean · decorative arch tracery',w:1.20,h:1.65,sill:.85}
 ],
 slab:[
  {id:'floor-20',name:'Concrete 20 cm',h:.20,pitch:0,slabKind:'floor'},
  {id:'thin-12',name:'Thin 12 cm',h:.12,pitch:0,slabKind:'floor'},
  {id:'roof-flat',name:'Flat roof',h:.18,pitch:0,slabKind:'roof'},
  {id:'roof-pitch',name:'Pitched roof',h:.18,pitch:12,slabKind:'roof'}
 ],
 opening:[
  {id:'wall-opening',name:'Standard doorway · 90 × 210 cm',host:'wall',w:.90,h:2.10,sill:0},
  {id:'wide-opening',name:'Wide passage · 180 × 210 cm',host:'wall',w:1.80,h:2.10,sill:0},
  {id:'double-passage',name:'Double-width passage · 240 × 220 cm',host:'wall',w:2.40,h:2.20,sill:0},
  {id:'full-height-opening',name:'Full-height passage · 120 × 240 cm',host:'wall',w:1.20,h:2.40,sill:0},
  {id:'window-void',name:'Window void · 120 × 120 cm',host:'wall',w:1.20,h:1.20,sill:.90},
  {id:'panoramic-void',name:'Panoramic void · 240 × 150 cm',host:'wall',w:2.40,h:1.50,sill:.70},
  {id:'ventilation-void',name:'High ventilation void · 60 × 40 cm',host:'wall',w:.60,h:.40,sill:2.00},
  {id:'slab-opening',name:'Slab opening · 100 × 100 cm',host:'slab',w:1,d:1},
  {id:'stairwell-opening',name:'Stairwell · 200 × 400 cm',host:'slab',w:2,d:4},
  {id:'service-shaft',name:'Service shaft · 60 × 60 cm',host:'slab',w:.60,d:.60},
  {id:'neoclassical-passage',name:'Neoclassical passage · 180 × 250 cm',host:'wall',w:1.80,h:2.50,sill:0},
  {id:'gothic-passage',name:'Gothic-style passage · 140 × 270 cm',host:'wall',w:1.40,h:2.70,sill:0},
  {id:'arcade-bay',name:'Arcade bay · 240 × 280 cm',host:'wall',w:2.40,h:2.80,sill:0},
  {id:'circular-style-void',name:'Round-style opening · rectangular host void',host:'wall',w:1.20,h:1.20,sill:1.00}
 ]
};

/* Independent parametric leaf specification; dimensions and void remain hosted by a wall.
   Autocad Architecture / Revit interaction is a reference, not proprietary source code. */
function cad3DOpeningDefaults(kind,styleId){
 var id=String(styleId||'').toLowerCase(),triple=/triple|three|3-leaf/.test(id),
  double=/double|two-leaf|french|terrace/.test(id),leaves=triple?3:double?2:1;
 if(kind==='door'){
  return {operation:/garage/.test(id)?'sectional':/sliding|pocket/.test(id)?'sliding':
   /fold/.test(id)?'folding':/pivot/.test(id)?'pivot':'hinged',
   leaves:leaves,hinge:/right/.test(id)?'right':'left',swing:'in',openAngle:0,openPercent:0};
 }
 return {operation:/sliding/.test(id)?'sliding':/awning/.test(id)?'awning':
  /hopper/.test(id)?'hopper':/tilt-turn/.test(id)?'tilt-turn':
  /casement|two-leaf|double-window/.test(id)?'casement':'fixed',
  leaves:leaves,hinge:'left',swing:'out',openAngle:0,openPercent:0};
}
function cad3DOpeningConfig(o){
 var d=cad3DOpeningDefaults(o.kind,o.styleId);
 var permitted=o.kind==='door'?['hinged','sliding','folding','pivot','sectional']:
  ['fixed','casement','sliding','awning','hopper','tilt-turn'];
 var op=permitted.includes(o.operation)?o.operation:d.operation;
 return {operation:op,leaves:clamp(Math.round(Number(o.leaves)||d.leaves),1,3),
  hinge:['left','right'].includes(o.hinge)?o.hinge:d.hinge,
  swing:['in','out'].includes(o.swing)?o.swing:d.swing,
  openAngle:clamp(Number(o.openAngle)||0,0,120),
  openPercent:clamp(Number(o.openPercent)||0,0,100)};
}
/* Leaf transformation is resolved relative to the frame hinge, never to the model origin. */
function cad3DLeafMotion(config,i,count,x0,x1,z,h){
 var hinged=config.operation==='hinged'||config.operation==='casement'||
  config.operation==='pivot'||config.operation==='folding';
 var sliding=config.operation==='sliding',sectional=config.operation==='sectional';
 var right=(config.hinge==='right');
 if(count>1&&hinged&&config.operation!=='pivot')right=(i%2===0)?right:!right;
 var hingeX=config.operation==='pivot'?(x0+x1)/2+(right?-.16:.16)*(x1-x0):
  right?x1:x0;
 var sign=(right?-1:1)*(config.swing==='out'?-1:1);
 var m={axis:'z',angle:0,pivotX:hingeX,pivotY:0,pivotZ:z,
  shiftX:0,shiftY:0,shiftZ:0};
 if(hinged)m.angle=sign*config.openAngle*Math.PI/180;
 else if(['awning','hopper','tilt-turn'].includes(config.operation)){
  m.axis='x';m.pivotX=(x0+x1)/2;m.pivotZ=config.operation==='awning'?z+h:z;
  m.angle=(config.operation==='awning'?-1:1)*
   (config.swing==='out'?1:-1)*config.openAngle*Math.PI/180;
 }else if(sliding){
  // Each sliding leaf moves into the adjacent track, exposing part of the opening.
  m.shiftX=(i%2===0?1:-1)*config.openPercent/100*(x1-x0);
  m.shiftY=(i%2===0?1:-1)*.03;
 }else if(sectional){
  m.shiftZ=config.openPercent/100*h;
  m.shiftY=-config.openPercent/100*.08;
 }
 return m;
}

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


function cad3dDoorVoidThumbnail(kind,st){
 var id=String(st.id||'').toLowerCase(),isDoor=kind==='door',sill=Number(st.sill)||0;
 var n=/triple|three/.test(id)?3:/double|french/.test(id)?2:1;
 var slide=/sliding|pocket|barn|terrace/.test(id),fold=/fold/.test(id),garage=/garage/.test(id);
 var bare=/open-door/.test(id),glazed=/glass|glaz|french|terrace|steel|victorian/.test(id);
 var slab=kind==='opening'&&st.host==='slab',width=kind==='opening'&&Number(st.w)>1.4?84:70;
 if(isDoor&&n>1)width=92;
 var x=(160-width)/2,y=15,top=y-4,bottom=90;
 var p=function(d,fill,stroke,sw){return '<path d="'+d+'" fill="'+(fill||'none')+'" stroke="'+(stroke||'#e2ecf3')+'" stroke-width="'+(sw||1.4)+'" stroke-linejoin="round" stroke-linecap="round"/>';};
 var r=function(x,y,w,h,fill,stroke,sw){return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+sw+'"/>';};
 var body='';
 if(slab){
  body=p('M19 47 109 27 143 44 52 66Z','#9eb0bf','#f0f5f8',2)+
   p('M52 66v12l91-19V44','#546c7f','#d6e5ed',1.4)+
   p('M67 46 105 38 119 45 81 53Z','#111e29','#f6fbff',2)+
   p('M81 53v10l38-8V45','#263d4e','#b7d0de',1.3);
 }else{
  // Side piers and lintel surround a true dark opening. Doorways have NO bottom frame.
  var left=x-12,right=x+width+12;
  body=p('M'+left+' '+top+'H'+right+'V'+bottom+'h-12V'+y+'H'+x+'v'+(bottom-y)+'h-12Z','#8499a9','#eaf2f7',1.9);
  body+=p('M'+left+' '+top+'l7 -6h'+(width+24)+'l-7 6Z','#bdcad4','#ecf4f8',1.3);
  body+=p('M'+right+' '+top+'l7 -6v'+(bottom-top)+'l-7 6Z','#577082','#c9dbe5',1.2);
  body+=r(x,y,width,bottom-y,'#14212c','#d5e4ed',1.4);
  if(sill>0){
   // Only window openings have a lower wall/spandrel.
   body+=r(x,74,width,16,'#8fa3b1','#dce9f0',1.2);
  }
 }
 if(isDoor&&!bare){
  var lx=x+3,ly=y+3,lh=bottom-y-4,lw=width-6;
  if(slide||garage){
   var panelW=lw/n;
   for(var j=0;j<n;j++){
    var dx=lx+j*panelW+(j===0?7:-2);
    body+=r(Math.round(dx),ly,Math.round(panelW-4),lh,glazed?'#4e7188':'#9fb0bd','#eaf4fa',1.9);
    if(glazed)body+=r(Math.round(dx+4),ly+5,Math.max(3,Math.round(panelW-12)),lh-12,'#284a61','#b7d2df',1.1);
    if(garage)for(var k=1;k<5;k++)body+=p('M'+dx+' '+(ly+k*lh/5)+'h'+(panelW-4),'none','#dce5eb',1);
   }
   body+=p('M68 80h23m-5-4 5 4-5 4','none','#f0fcff',1.8);
  }else{
   var count=fold?3:n,space=lw/count;
   for(var i=0;i<count;i++){
    var pivot=lx+(i+0.5)*space;
    var direction=i%2===0?-1:1,depth=Math.min(22,Math.max(13,space*.46));
    var far=pivot+direction*depth;
    var edgeY=ly+10;
    body+=p('M'+pivot+' '+ly+'L'+far+' '+edgeY+'V'+(ly+lh-6)+'L'+pivot+' '+(ly+lh)+'Z',
      glazed?'#547d96':'#aebec9','#f1f7fc',2);
    body+=p('M'+pivot+' '+(ly+12)+'L'+far+' '+(edgeY+9)+'M'+pivot+' '+(ly+lh-13)+'L'+far+' '+(ly+lh-19),'none','#e8eff4',1.2);
    if(glazed)body+=p('M'+(pivot+direction*3)+' '+(ly+15)+'L'+(far-direction*3)+' '+(edgeY+12)+'V'+(ly+lh-21)+'L'+(pivot+direction*3)+' '+(ly+lh-16)+'Z','#2d5369','#b9d8e7',.9);
   }
   if(!fold)body+=p('M'+(x+7)+' '+(bottom-11)+'Q'+(x+width/2)+' '+(bottom-29)+' '+(x+width-7)+' '+(bottom-11),'none','#b9e2f5',1.2);
  }
 }
 return '<svg class="cad3dCatalogPreview" viewBox="0 0 160 108" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vista arquitectónica de '+escapeHtml(st.name)+'">'+
 '<ellipse cx="80" cy="101" rx="51" ry="4" fill="#000" opacity=".14"/>'+body+'</svg>';
}

function cad3dCatalogPreview(kind,st){
 if(kind==='door'||kind==='opening')return cad3dDoorVoidThumbnail(kind,st);
 var desc=(String(st.id||'')+' '+String(st.name||'')).toLowerCase();
 var has=function(k){return desc.includes(k);};
 var door=kind==='door',windowed=kind==='window';
 var n=has('triple')||has('three')?3:(has('double')||has('two')||has('french')||has('twin')?2:1);
 if(has('industrial')||has('shoji')||has('ribbon'))n=Math.max(3,n);
 var sliding=has('slid')||has('pocket')||has('barn'),fold=has('fold');
 var grid=has('georgian')||has('pane')||has('colonial')||has('shoji')||has('grid')||has('industrial')||has('mullion')||has('tudor')||has('victorian')||has('renaissance');
 var arch=has('gothic')||has('arched')||has('mediterranean');
 var glazing=windowed||(door&&(has('glass')||has('glaz')||has('french')||has('terrace')||has('modern steel')||has('victorian')));
 var opaque=door&&!glazing;
 var W=kind==='wall'?112:kind==='slab'?108:Math.max(45,Math.min(112,76*(Number(st.w)||1.2)/Math.max(.85,Number(st.h)||1.2)));
 var H=kind==='wall'?62:kind==='slab'?42:Math.max(42,Math.min(77,90*(Number(st.h)||1.2)/Math.max(1.2,Number(st.w)||1.2)));
 var x=(160-W)/2-5,y=(108-H)/2+4,off=8;
 var esc=function(v){return Math.round(v*10)/10;};
 var rect=function(x,y,w,h,fill,stroke,sw){return '<rect x="'+esc(x)+'" y="'+esc(y)+'" width="'+esc(Math.max(0,w))+'" height="'+esc(Math.max(0,h))+'" fill="'+fill+'" stroke="'+(stroke||'none')+'" stroke-width="'+(sw||0)+'"/>';};
 var path=function(d,stroke,sw,fill){return '<path d="'+d+'" stroke="'+(stroke||'#dbe8ef')+'" stroke-width="'+(sw||1.6)+'" fill="'+(fill||'none')+'" stroke-linecap="round" stroke-linejoin="round"/>';};
 var body='';
 if(kind==='wall'){
  body=path('M24 45 121 30 139 42 43 58Z','#e4edf3',2,'#aab9c6')+
   path('M43 58V88L139 72V42M24 45V75L43 88','#e4edf3',2,'#5e7180')+
   path('M24 75 121 59 139 72','#9aafbd',1.4);
  if(has('masonry'))body+=path('M50 58v13m27-17v13m28-17v13M45 72l88-15','#d8e2e9',.9);
 }else if(kind==='slab'){
  body=path('M20 51 120 34 142 48 42 67Z','#f1f4f7',2,'#aebcc8')+
   path('M42 67v15l100-19V48M20 51v15l22 16','#e4eef4',2,'#5b6e7f');
 }else if(kind==='opening'){
  body=path('M30 20H126V90H30Z','#e4ecf3',5)+rect(39,29,78,52,'#111d28','#b6c8d3',2);
 }else{
  // Extruded three-quarter-view frame: light front, darker inset and a visible right-hand side.
  body=path('M'+esc(x+W)+' '+esc(y)+'l'+off+' -5v'+esc(H)+'l-'+off+' 5Z','#d7e1ea',1,'#708496');
  body+=path('M'+esc(x)+' '+esc(y)+'l'+off+' -5h'+esc(W)+'l-'+off+' 5Z','#d9e5ed',1,'#dce8ef');
  body+=rect(x,y,W,H,'#dae6ee','#f3f6f8',2.2);
  body+=rect(x+5,y+5,W-10,H-10,glazing?'#324b60':opaque?'#778897':'#111b23','#91a9b9',1.3);
  var inset=6,usable=W-inset*2,leafW=usable/n;
  for(var i=0;i<n;i++){
   var lx=x+inset+i*leafW,ly=y+inset,lw=leafW,lh=H-inset*2;
   if(i)body+=path('M'+esc(lx)+' '+esc(ly)+'v'+esc(lh),'#e4ecf1',2.4);
   if(glazing){
    body+=rect(lx+2,ly+2,lw-4,lh-4,'#36566b','#9fb7c5',1);
    body+=path('M'+esc(lx+5)+' '+esc(ly+lh*.42)+'l'+esc(Math.max(5,lw*.38))+' -'+esc(Math.max(8,lh*.3)),'#95b8ce',1.6);
   }else if(opaque){
    body+=rect(lx+4,ly+4,lw-8,lh*.39,'#80909e','#aebec8',1);
    body+=rect(lx+4,ly+lh*.52,lw-8,lh*.36,'#6b7f8f','#aebec8',1);
   }
   if(grid){
    var rows=has('twelve')||has('12')||has('shoji')?4:has('six')||has('9')?3:has('industrial')?4:2;
    for(var r=1;r<rows;r++)body+=path('M'+esc(lx+2)+' '+esc(ly+lh*r/rows)+'h'+esc(lw-4),'#d6e4ed',1.2);
    if(has('diamond')||has('tudor'))body+=path('M'+esc(lx+3)+' '+esc(ly+lh*.5)+'l'+esc(lw*.4)+' -'+esc(lh*.4)+' '+esc(lw*.4)+' '+esc(lh*.4)+' -'+esc(lw*.4)+' '+esc(lh*.4)+'Z','#dbe6ec',1);
   }
   if(!sliding&&!has('fixed')&&!has('picture')&&!has('clerestory')&&!has('opening')&&!has('ribbon')&&!has('garage')){
    var hx=lx+(i%2===0?lw-5:5),hy=ly+lh*.56;
    body+=path('M'+esc(hx)+' '+esc(hy-4)+'v8','#fafcff',2.4);
   }
  }
  if(arch)body+=path('M'+esc(x+3)+' '+esc(y+15)+'Q'+esc(x+W/2)+' '+esc(y-11)+' '+esc(x+W-3)+' '+esc(y+15),'#eaf1f6',2.1);
  if(has('garage'))for(var gr=1;gr<5;gr++)body+=path('M'+esc(x+5)+' '+esc(y+H*gr/5)+'h'+esc(W-10),'#c2d1dc',1.5);
  if(sliding)body+=path('M'+esc(x+W*.34)+' '+esc(y+H*.83)+'h'+esc(W*.34)+'m-5-4 5 4-5 4','#eaf9ff',1.8);
  if(fold)body+=path('M'+esc(x+W*.15)+' '+esc(y+H*.83)+'l'+esc(W*.15)+' -10 '+esc(W*.15)+' 10','#eaf9ff',1.8);
  if(has('awning')||has('hopper')||has('casement')||has('swing'))body+=path('M'+esc(x+W*.35)+' '+esc(y+H*.65)+'q'+esc(W*.16)+' -9 '+esc(W*.3)+' -3','#ecf6fd',1.4);
  if(has('pivot'))body+=path('M'+esc(x+W*.75)+' '+esc(y+H*.2)+'v'+esc(H*.6),'#f8fbff',1.7);
 }
 return '<svg class="cad3dCatalogPreview" viewBox="0 0 160 108" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vista 3D de '+escapeHtml(st.name)+'">'+
 '<ellipse cx="82" cy="98" rx="53" ry="5" fill="#000" opacity=".14"/>'+body+'</svg>';
}

function renderArchPalette(){
 var palette=root.querySelector('.archPalette');
 palette.querySelectorAll('[data-arch-tool]').forEach(function(button){
  button.setAttribute('aria-pressed',String(button.dataset.archTool===activeCategory));
 });
 palette.querySelector('.catalogItems').innerHTML=ARCH_STYLES[activeCategory].map(function(st){
  return '<button type="button" class="btn" data-style="'+st.id+'">'+cad3dCatalogPreview(activeCategory,st)+
   '<span>'+st.name+'</span><small>'+styleDimensions(activeCategory,st)+'</small></button>';
 }).join('');
}
function cad3dPaletteRemember(name,panel){
 try{localStorage.setItem('blackline-cad3d-floating-'+name+'-v1',JSON.stringify({
  left:parseFloat(panel.style.left),top:parseFloat(panel.style.top),
  width:panel.offsetWidth,height:panel.offsetHeight
 }));}catch(_e){}
}
function cad3dPaletteRestore(name,panel){
 try{
  var d=JSON.parse(localStorage.getItem('blackline-cad3d-floating-'+name+'-v1')||'null');
  if(!d||!Number.isFinite(d.left)||!Number.isFinite(d.top))return false;
  if(Number.isFinite(d.width)&&Number.isFinite(d.height)){
   panel.style.width=Math.min(d.width,root.clientWidth-16)+'px';
   panel.style.height=Math.min(d.height,root.clientHeight-16)+'px';
  }
  panel.style.left=d.left+'px';panel.style.top=d.top+'px';
  panel.dataset.userPositioned='true';
  return true;
 }catch(_e){return false;}
}
function cad3dPaletteConstrain(panel){
 if(!panel||panel.hidden)return;
 var w=Math.min(panel.offsetWidth,root.clientWidth-16),h=Math.min(panel.offsetHeight,root.clientHeight-16);
 if(panel.offsetWidth>w)panel.style.width=w+'px';
 if(panel.offsetHeight>h)panel.style.height=h+'px';
 var x=Number.parseFloat(panel.style.left),y=Number.parseFloat(panel.style.top);
 if(!Number.isFinite(x))x=12;
 if(!Number.isFinite(y))y=44;
 panel.style.left=clamp(x,8,Math.max(8,root.clientWidth-w-8))+'px';
 panel.style.top=clamp(y,8,Math.max(8,root.clientHeight-h-8))+'px';
}
function cad3dBringPaletteFront(panel){
 root.querySelectorAll('.archPalette,.sunPanel').forEach(function(el){el.style.zIndex=el===panel?'130':'110';});
}
function showArchPalette(show){
 var palette=root.querySelector('.archPalette'),launcher=root.querySelector('.archLaunch');
 palette.hidden=!show;launcher.setAttribute('aria-expanded',String(show));
 if(show){
  renderArchPalette();
  if(!palette.style.width)sizeArchPalette('small');
  else fitArchPalette();
  cad3dBringPaletteFront(palette);
  palette.querySelector('[aria-pressed=true]')?.focus({preventScroll:true});
 }else if(palette.contains(document.activeElement))launcher.focus({preventScroll:true});
}
function fitArchPalette(){
 var palette=root.querySelector('.archPalette');
 if(palette.hidden||!palette.style.width)return;
 cad3dPaletteConstrain(palette);
}
function sizeArchPalette(size){
 var palette=root.querySelector('.archPalette');
 var sizes={small:[340,340],medium:[root.clientWidth*.55,root.clientHeight*.72],large:[root.clientWidth-24,root.clientHeight-55]};
 var d=sizes[size]||sizes.small;
 var w=clamp(d[0],Math.min(240,root.clientWidth-16),root.clientWidth-16);
 var h=clamp(d[1],Math.min(220,root.clientHeight-16),root.clientHeight-16);
 var wasPlaced=palette.dataset.userPositioned==='true';
 var left=wasPlaced?parseFloat(palette.style.left):root.clientWidth-w-22;
 var top=wasPlaced?parseFloat(palette.style.top):Math.min(210,Math.max(44,root.clientHeight-h-12));
 Object.assign(palette.style,{width:w+'px',height:h+'px',left:Math.max(8,left)+'px',top:Math.max(8,top)+'px'});
 cad3dPaletteConstrain(palette);cad3dPaletteRemember('architecture',palette);
}
function beginArchGesture(e){
 var grip=e.target.closest('[data-arch-grip]'),header=e.target.closest('.archTitle');
 if(e.button!==0||(!grip&&(!header||e.target.closest('button,input,select'))))return;
 var handle=grip||header,direction=grip?.dataset.archGrip||'',palette=e.currentTarget;
 var bounds=root.getBoundingClientRect(),rect=palette.getBoundingClientRect();
 var left=rect.left-bounds.left,top=rect.top-bounds.top,right=left+rect.width,bottom=top+rect.height;
 var minW=Math.min(240,root.clientWidth-16),minH=Math.min(220,root.clientHeight-16);
 var x=e.clientX,y=e.clientY,id=e.pointerId;
 e.preventDefault();e.stopPropagation();
 cad3dBringPaletteFront(palette);
 palette.dataset.userPositioned='true';
 handle.setPointerCapture(id);
 function move(ev){
  if(ev.pointerId!==id)return;
  var dx=ev.clientX-x,dy=ev.clientY-y;
  if(!direction){
   palette.style.left=clamp(left+dx,8,Math.max(8,root.clientWidth-8-rect.width))+'px';
   palette.style.top=clamp(top+dy,8,Math.max(8,root.clientHeight-8-rect.height))+'px';
   return;
  }
  var l=direction.includes('w')?clamp(left+dx,8,right-minW):left;
  var t=direction.includes('n')?clamp(top+dy,8,bottom-minH):top;
  var r=direction.includes('e')?clamp(right+dx,l+minW,root.clientWidth-8):right;
  var b=direction.includes('s')?clamp(bottom+dy,t+minH,root.clientHeight-8):bottom;
  Object.assign(palette.style,{left:l+'px',top:t+'px',width:Math.max(minW,r-l)+'px',height:Math.max(minH,b-t)+'px'});
 }
 function done(ev){
  if(ev.pointerId!==id)return;
  handle.removeEventListener('pointermove',move);
  handle.removeEventListener('pointerup',done);
  handle.removeEventListener('pointercancel',done);
  handle.removeEventListener('lostpointercapture',done);
  cad3dPaletteConstrain(palette);
  cad3dPaletteRemember('architecture',palette);
  try{if(handle.hasPointerCapture(id))handle.releasePointerCapture(id);}catch(_e){}
 }
 handle.addEventListener('pointermove',move);
 handle.addEventListener('pointerup',done);
 handle.addEventListener('pointercancel',done);
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

var CAD3D_COMPONENTS={
 chair:{name:'Silla 1',group:'Muebles',w:.55,d:.55,h:.95,parts:[
 [0,0,.43,.53,.53,.09,0xa0805e],[0,.23,.45,.53,.07,.50,0xa0805e],
 [-.21,-.20,0,.06,.06,.43,0x454f54],[.21,-.20,0,.06,.06,.43,0x454f54],
 [-.21,.20,0,.06,.06,.43,0x454f54],[.21,.20,0,.06,.06,.43,0x454f54]]},
 table:{name:'Mesa 1',group:'Muebles',w:1.6,d:.9,h:.76,parts:[
 [0,0,.7,1.6,.9,.06,0xad8c69],[-.68,-.32,0,.08,.08,.7,0x4e575c],
 [.68,-.32,0,.08,.08,.7,0x4e575c],[-.68,.32,0,.08,.08,.7,0x4e575c],
 [.68,.32,0,.08,.08,.7,0x4e575c]]},
 sofa:{name:'Sofá 1',group:'Muebles',w:2.1,d:.9,h:.9,parts:[
 [0,0,.17,2.1,.9,.33,0x8c9ba3],[0,.34,.47,2.1,.19,.43,0x627887],
 [-.97,0,.35,.16,.87,.43,0x627887],[.97,0,.35,.16,.87,.43,0x627887],
 [-.47,-.10,.52,.92,.54,.11,0xa8b5ba],[.47,-.10,.52,.92,.54,.11,0xa8b5ba]]},
 bed:{name:'Cama 1',group:'Muebles',w:2,d:2.1,h:1.04,parts:[
 [0,0,.15,2,2.1,.30,0x796655],[0,-.03,.44,1.93,1.93,.22,0xd3d5ce],
 [0,.99,.24,2,.12,.8,0x796655],[-.44,.65,.67,.8,.38,.13,0xf1eee8],[.44,.65,.67,.8,.38,.13,0xf1eee8]]},
 shelf:{name:'Estante 1',group:'Muebles',w:1.5,d:.38,h:2.1,parts:[
 [-.72,0,0,.06,.38,2.1,0x7b6956],[.72,0,0,.06,.38,2.1,0x7b6956],
 [0,0,0,1.5,.38,.07,0x7b6956],[0,0,.52,1.5,.38,.07,0x7b6956],
 [0,0,1.05,1.5,.38,.07,0x7b6956],[0,0,1.58,1.5,.38,.07,0x7b6956],
 [0,0,2.03,1.5,.38,.07,0x7b6956]]},
 desk:{name:'Escritorio 1',group:'Muebles',w:1.5,d:.75,h:.76,parts:[
 [0,0,.70,1.5,.75,.06,0xa78967],[-.66,0,0,.07,.65,.70,0x47535a],
 [.66,0,0,.07,.65,.70,0x47535a],[.36,.30,.56,.48,.15,.14,0x8d7862]]},
 planter:{name:'Maceta 1',group:'Exterior',w:.7,d:.7,h:1.35,parts:[
 [0,0,0,.62,.62,.55,0xb07c5b],[0,0,.55,.08,.08,.78,0x598261],
 [-.18,0,.83,.42,.32,.45,0x57845f],[.2,0,.88,.41,.36,.46,0x4d8057],
 [0,.13,1.02,.45,.39,.33,0x67936a]]},
 bollard:{name:'Bolardo 1',group:'Exterior',w:.28,d:.28,h:.88,parts:[
 [0,0,0,.2,.2,.83,0x515c63],[0,0,.81,.28,.28,.07,0xd1d5d4]]}
};

/* CAD3D_LIBRARY_PLUS_V1: lightweight native metric assets, no external downloads. */
(function(){
 const C=CAD3D_COMPONENTS;
 function b(x,y,z,w,d,h,c){return [x,y,z,w,d,h,c];}
 const wood=0x987456,steel=0x505d64,white=0xe5e4df,green=0x63885c,glass=0x8ca9bb,dark=0x30373e;
 function legs(w,d,h){return [-1,1].flatMap(x=>[-1,1].map(y=>b(x*(w/2-.06),y*(d/2-.06),0,.07,.07,h,steel)));}
 function table(w,d,h){return [b(0,0,h-.07,w,d,.07,wood),...legs(w,d,h-.07)];}
 function chair(w,d){return [b(0,0,.42,w,d,.1,wood),b(0,d/2-.06,.44,w,.1,.45,green),...legs(w,d,.42)];}
 function sofa(w,d){return [b(0,0,.16,w,d,.32,glass),b(0,d/2-.07,.42,w,.15,.45,green),b(-w/2+.1,0,.32,.2,d,.42,green),b(w/2-.1,0,.32,.2,d,.42,green)];}
 function cabinet(w,d,h){return [b(0,0,0,w,d,h,wood),b(0,-d/2-.016,.1,w-.08,.03,h-.2,white)];}
 function car(w,d,h,color){return [b(0,0,.24,w,d,.42,color),b(0,.06,.63,w*.65,d*.7,h-.63,color),b(0,-d*.34,.5,w*.55,.03,.35,glass),...[-1,1].flatMap(x=>[-1,1].map(y=>b(x*(w/2-.22),y*(d/2-.12),.08,.27,.2,.32,dark)))];}
 function tree(h,w){return [b(0,0,0,.2,.2,h*.58,wood),b(0,0,h*.40,w,w,h*.35,green),b(-w*.22,0,h*.6,w*.7,w*.7,h*.28,0x476c4b),b(w*.20,0,h*.65,w*.65,w*.65,h*.25,0x7c9769)];}
 const A=[
 ['chair2','Silla 2','Muebles',.56,.56,.95,chair(.56,.56)],
 ['chair3','Silla 3','Muebles',.65,.62,.95,chair(.65,.62)],
 ['armchair1','Sillón 1','Muebles',1,.95,.9,sofa(1,.95)],
 ['armchair2','Sillón 2','Muebles',1.1,.95,.9,sofa(1.1,.95)],
 ['sofa2','Sofá 2','Muebles',2.5,.95,.9,sofa(2.5,.95)],
 ['sofa3','Sofá 3','Muebles',3.1,1,.9,sofa(3.1,1)],
 ['table2','Mesa 2','Muebles',1.8,.9,.78,table(1.8,.9,.78)],
 ['table3','Mesa 3','Muebles',2.4,1,.78,table(2.4,1,.78)],
 ['coffee1','Mesa baja 1','Muebles',1.2,.65,.45,table(1.2,.65,.45)],
 ['stool1','Banqueta 1','Muebles',.45,.45,.77,table(.45,.45,.77)],
 ['desk2','Escritorio 2','Muebles',1.7,.8,.76,table(1.7,.8,.76)],
 ['wardrobe1','Placard 1','Muebles',2.4,.65,2.5,cabinet(2.4,.65,2.5)],
 ['wardrobe2','Placard 2','Muebles',3,.65,2.5,cabinet(3,.65,2.5)],
 ['kitchen1','Cocina 1','Cocinas',2.4,.65,.94,[...cabinet(2.4,.65,.9),b(0,0,.9,2.45,.7,.04,dark)]],
 ['kitchen2','Cocina 2','Cocinas',3,.65,.94,[...cabinet(3,.65,.9),b(0,0,.9,3.05,.7,.04,white)]],
 ['island1','Isla 1','Cocinas',2.1,1,.94,[b(0,0,0,1.95,.84,.9,white),b(0,0,.9,2.1,1,.04,wood)]],
 ['fridge1','Heladera 1','Cocinas',.75,.7,1.9,[b(0,0,0,.75,.7,1.9,white),b(0,-.36,1.1,.07,.03,.42,steel)]],
 ['basin1','Lavatorio 1','Baños',.7,.55,.88,[b(0,0,0,.7,.55,.88,white),b(0,0,.86,.55,.4,.02,glass)]],
 ['basin2','Lavatorio 2','Baños',1.1,.55,.88,[b(0,0,0,1.1,.55,.88,white),b(0,0,.86,.95,.4,.02,glass)]],
 ['toilet1','Inodoro 1','Baños',.42,.7,.78,[b(0,.22,0,.42,.2,.78,white),b(0,-.12,.12,.4,.55,.37,white)]],
 ['bath1','Bañera 1','Baños',1.75,.8,.6,[b(0,0,0,1.75,.8,.6,white),b(0,0,.57,1.55,.58,.02,glass)]],
 ['car1','Auto 1','Vehículos',4.2,1.8,1.5,car(4.2,1.8,1.5,0x8096a4)],
 ['car2','Auto 2','Vehículos',4.7,1.9,1.55,car(4.7,1.9,1.55,0x526a7f)],
 ['suv1','SUV 1','Vehículos',4.85,2,1.8,car(4.85,2,1.8,0x91958f)],
 ['van1','Camioneta 1','Vehículos',5.1,2,2.15,car(5.1,2,2.15,white)],
 ['truck1','Camión 1','Vehículos',7.5,2.5,3,[...car(3,2.4,2.8,steel),b(2,0,.45,4.25,2.4,2.3,white)]],
 ['tree1','Árbol 1','Vegetación',2.6,2.6,5.5,tree(5.5,2.6)],
 ['tree2','Árbol 2','Vegetación',3.4,3.4,7.5,tree(7.5,3.4)],
 ['tree3','Árbol 3','Vegetación',4,4,9,tree(9,4)],
 ['shrub1','Arbusto 1','Vegetación',1.2,1.2,1.3,tree(1.3,1.2)],
 ['shrub2','Arbusto 2','Vegetación',1.8,1.8,1.8,tree(1.8,1.8)],
 ['bench1','Banco 1','Exterior',1.8,.55,.9,chair(1.8,.55)],
 ['lamp1','Farola 1','Exterior',.4,.4,3.5,[b(0,0,0,.1,.1,3.2,dark),b(0,0,3.2,.4,.4,.3,white)]],
 ['pergola1','Pérgola 1','Exterior',4,3,2.8,[...[-1.85,1.85].flatMap(x=>[-1.35,1.35].map(y=>b(x,y,0,.13,.13,2.7,wood))),...[-1.2,-.6,0,.6,1.2].map(y=>b(0,y,2.7,4,.1,.1,wood))]]
 ];
 A.forEach(a=>C[a[0]]={name:a[1],group:a[2],w:a[3],d:a[4],h:a[5],parts:a[6]});
 [['tree',3.2,6],['tree',4,8],['tree',2.5,4.5],['palm',3.8,7],['palm',3,5.5],['bush',2.1,1.6],['bush',2.8,2],['person',.6,1.75],['person',.55,1.65],['person',.6,1.82]].forEach((a,i)=>{
  C['cutout'+(i+1)]={name:(a[0]==='person'?'Persona':a[0]==='palm'?'Palmera':a[0]==='bush'?'Arbusto':'Árbol')+' 2.5D '+(i+1),group:a[0]==='person'?'2.5D Personas':'2.5D Vegetación',w:a[1],d:.05,h:a[2],parts:[],cutout:a[0]};
 });
})();
function cad3dCutoutTexture(kind,id){
 var canvas=document.createElement('canvas');canvas.width=256;canvas.height=512;var ctx=canvas.getContext('2d');
 function ellipse(x,y,w,h,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,w,h,0,0,Math.PI*2);ctx.fill();}
 function line(x,y,X,Y,width,color){ctx.lineWidth=width;ctx.strokeStyle=color;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(X,Y);ctx.stroke();}
 if(kind==='person'){
  line(105,310,93,488,24,'#363f44');line(151,310,161,488,24,'#363f44');
  line(128,180,128,317,54,'#667e89');line(109,200,65,321,18,'#667e89');line(147,200,183,314,18,'#667e89');
  ellipse(128,112,35,45,'#c79c79');ellipse(128,83,38,22,'#51463f');
 }else{
  var bush=kind==='bush',palm=kind==='palm',top=bush?320:130;
  if(!bush)line(128,492,128,top+45,palm?17:28,'#80644d');
  for(var i=0;i<12;i++){var a=i*2.399,rad=bush?74:palm?92:64;
   ellipse(128+Math.cos(a)*rad,top+45+Math.sin(a)*rad*.75,palm?60:48,palm?15:49,['#426e4e','#648757','#829968','#527b55'][i%4]);}
 }
 var tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;return tex;
}


var activeCAD3DBlock='chair';
var cad3dBlockView='3d',cad3dBlockCategory='all';
function cad3dBlockKind(spec){return spec.cutout?'2.5d':'3d';}
function cad3dBlockPreview(spec){
 // Lightweight category-specific SVG previews, not false photographic thumbnails.
 var group=spec.group.toLowerCase(),cut=!!spec.cutout;
 var shape=cut?(spec.cutout==='person'?
 '<circle cx="50" cy="17" r="9"/><path d="M40 30h20l8 34H32zM41 64l-6 25m24-25 6 25"/>':
 '<path d="M50 85V39" fill="none"/><path d="M50 12 28 45l20 9 20-9z"/><path d="M25 37q25-42 50 0q-25 28-50 0z"/>'):
 group.includes('veh')?
 '<path d="M14 59h73l-10-26H31z"/><rect x="17" y="50" width="66" height="20" rx="4"/><circle cx="32" cy="72" r="9"/><circle cx="70" cy="72" r="9"/>':
 group.includes('veget')||group.includes('exterior')?
 '<path d="M49 90V39" fill="none"/><circle cx="49" cy="32" r="24"/><rect x="25" y="84" width="49" height="7" rx="2"/>':
 group.includes('bañ')?
 '<path d="M15 37h72v28q0 15-18 15H33Q15 80 15 65z"/><path d="M15 37v-8q0-9 10-9h10" fill="none"/>':
 group.includes('cocin')?
 '<rect x="17" y="27" width="66" height="54" rx="3"/><path d="M17 48h66M50 48v33"/><circle cx="31" cy="35" r="3"/><circle cx="69" cy="35" r="3"/>':
 '<path d="M18 47h64v17H18z"/><path d="M22 64v24m56-24v24M24 47V29h52v18"/><path d="M34 31v16m32-16v16"/>';
 return '<svg viewBox="0 0 100 100" aria-hidden="true">'+shape+'</svg>';
}
function cad3dBlockCatalogItems(){
 var ids=Object.keys(CAD3D_COMPONENTS).filter(function(id){
  var spec=CAD3D_COMPONENTS[id];
  return cad3dBlockKind(spec)===cad3dBlockView&&
    (cad3dBlockCategory==='all'||spec.group===cad3dBlockCategory);
 });
 var search=root.querySelector('.cad3dBlockSearch').value.toLocaleLowerCase().trim();
 ids=ids.filter(function(id){var d=CAD3D_COMPONENTS[id];return (d.name+' '+d.group).toLocaleLowerCase().includes(search);});
 var holder=root.querySelector('.cad3dBlockResults');
 if(!ids.length){holder.innerHTML='<div class="cad3dBlockEmpty">'+(cad3dBlockView==='photo'?'': 'No hay resultados para estos filtros.')+'</div>';return;}
 holder.innerHTML='<div class="cad3dBlockGrid">'+ids.map(function(id){
  var spec=CAD3D_COMPONENTS[id];
  return '<button type="button" class="cad3dBlockCard" data-3d-block="'+id+'" title="Insertar '+escapeHtml(spec.name)+'">'+
    '<span class="cad3dBlockPreview">'+cad3dBlockPreview(spec)+'</span>'+
    '<span class="cad3dBlockName">'+escapeHtml(spec.name)+'</span>'+
    '<span class="cad3dBlockMeta">'+escapeHtml(spec.group)+' · '+(spec.cutout?'2.5D':'3D')+'</span></button>';
 }).join('')+'</div>';
}
function cad3dRefreshBlockCatalog(){
 if(!root)return;
 var panel=root.querySelector('.block3DPanel');if(!panel)return;
 panel.querySelectorAll('[data-block-kind]').forEach(function(b){b.setAttribute('aria-selected',String(b.dataset.blockKind===cad3dBlockView));});
 var groups=[...new Set(Object.keys(CAD3D_COMPONENTS).filter(id=>cad3dBlockKind(CAD3D_COMPONENTS[id])===cad3dBlockView).map(id=>CAD3D_COMPONENTS[id].group))];
 if(cad3dBlockCategory!=='all'&&!groups.includes(cad3dBlockCategory))cad3dBlockCategory='all';
 panel.querySelector('.cad3dBlockFilters').innerHTML=[['all','Todas']].concat(groups.map(g=>[g,g.replace(/^2.5D /,'')])).map(function(g){
  return '<button type="button" class="cad3dBlockFilter" data-block-category="'+escapeHtml(g[0])+'" aria-pressed="'+String(g[0]===cad3dBlockCategory)+'">'+escapeHtml(g[1])+'</button>';
 }).join('');
 var count=Object.keys(CAD3D_COMPONENTS).filter(id=>cad3dBlockKind(CAD3D_COMPONENTS[id])===cad3dBlockView).length;
 var empty=panel.querySelector('.cad3dBlockEmptyNotice');
 empty.hidden=cad3dBlockView!=='photo';
 panel.querySelector('.cad3dBlockResults').hidden=cad3dBlockView==='photo';
 panel.querySelector('.cad3dBlockFilters').hidden=cad3dBlockView==='photo';
 panel.querySelector('.cad3dBlockSearch').hidden=cad3dBlockView==='photo';
 panel.querySelector('.cad3dBlockCount').textContent=cad3dBlockView==='photo'?
 'Fotografías reales: sin elementos cargados':
 count+' componentes disponibles · clic para insertar';
 if(cad3dBlockView!=='photo')cad3dBlockCatalogItems();
}
function cad3DBlockCatalog(){
 return '<details class="block3DMenu"><summary class="btn" aria-label="3D Blocks" title="3D Blocks">'+ico('cube')+'<span>3D Blocks</span></summary><div class="block3DPanel">'+
 '<strong>COMPONENT LIBRARY</strong><small>Elegí el tipo de objeto y después la categoría</small>'+
 '<div class="cad3dBlockTabs" role="tablist" aria-label="Tipo de componente">'+
 '<button type="button" class="cad3dBlockTab" role="tab" data-block-kind="3d" aria-selected="true">3D Models</button>'+
 '<button type="button" class="cad3dBlockTab" role="tab" data-block-kind="2.5d" aria-selected="false">2.5D Cutouts</button>'+
 '<button type="button" class="cad3dBlockTab" role="tab" data-block-kind="photo" aria-selected="false">Photo Cutouts</button></div>'+
 '<input class="cad3dBlockSearch" type="search" placeholder="Search components..." aria-label="Buscar componentes">'+
 '<div class="cad3dBlockFilters" role="group" aria-label="Categorías"></div>'+
 '<div class="cad3dBlockResults"></div>'+
 '<div class="cad3dBlockEmpty cad3dBlockEmptyNotice" hidden>Los recortes fotográficos son imágenes PNG/WebP con transparencia. Todavía no hay fotografías reales incorporadas en esta biblioteca; los recortes esquemáticos están en la pestaña 2.5D.</div>'+
 '<small class="cad3dBlockCount" aria-live="polite"></small></div></details>';
}

/* CAD3D_OBJ_IMPORT_V1 — local Wavefront OBJ triangle import (SketchUp: export 3D Model as OBJ).
   No remote uploading; imported geometry is stored in the document records. */

/* CAD3D_MESH_FORMATS_V2 — local mesh imports; no external upload or server dependency. */
function cad3dImportTriangles(vertices,faces,fileName){
 if(!faces.length||faces.length>120000)throw Error('No hay triángulos válidos o el modelo supera 120.000 caras');
 var min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity],triangles=[];
 faces.forEach(function(face){
  if(face.length<3||face.some(function(i){return !Number.isInteger(i)||i<0||i>=vertices.length;}))return;
  for(var j=1;j<face.length-1;j++)triangles.push(face[0],face[j],face[j+1]);
 });
 if(!triangles.length||triangles.length>360000)throw Error('Malla inválida o demasiado grande');
 triangles.forEach(function(idx){var v=vertices[idx];for(var k=0;k<3;k++){min[k]=Math.min(min[k],v[k]);max[k]=Math.max(max[k],v[k]);}});
 if(!min.every(Number.isFinite)||!max.every(Number.isFinite))throw Error('La malla contiene coordenadas inválidas');
 var size=max.map(function(v,k){return Math.max(.001,v-min[k]);});
 var coords=[];
 triangles.forEach(function(i){var v=vertices[i];for(var j=0;j<3;j++)coords.push((v[j]-(j===2?min[j]:(min[j]+max[j])/2))/size[j]);});
 var rec=newRecord('imported3d');
 Object.assign(rec,{name:fileName.replace(/\.[^.]+$/,''),meshVertices:coords,x:0,y:0,z:0,w:size[0],d:size[1],h:size[2]});
 records.push(rec);selected=[rec.id];redraw();renderProps();
 text(fileName+' importado · '+(triangles.length/3)+' triángulos · geometría editable por escala/posición');
}
function cad3dParseSTL(buffer,name){
 var view=new DataView(buffer),binary=buffer.byteLength>=84&&84+view.getUint32(80,true)*50===buffer.byteLength;
 var verts=[],faces=[];
 if(binary){
  var count=view.getUint32(80,true);if(count>120000)throw Error('STL demasiado grande');
  for(var i=0;i<count;i++){var at=84+i*50+12,start=verts.length;
   for(var j=0;j<3;j++)verts.push([view.getFloat32(at+j*12,true),view.getFloat32(at+j*12+4,true),view.getFloat32(at+j*12+8,true)]);
   faces.push([start,start+1,start+2]);
  }
 }else{
  var txt=new TextDecoder().decode(buffer),re=/vertex\s+([+-]?[\d.eE+-]+)\s+([+-]?[\d.eE+-]+)\s+([+-]?[\d.eE+-]+)/ig,m;
  while((m=re.exec(txt))!==null&&verts.length<=360000){verts.push([+m[1],+m[2],+m[3]]);if(verts.length%3===0)faces.push([verts.length-3,verts.length-2,verts.length-1]);}
 }
 cad3dImportTriangles(verts,faces,name);
}
function cad3dParseOFF(textContent,name){
 var lines=textContent.split(/\r?\n/).map(s=>s.replace(/#.*/,'').trim()).filter(Boolean);
 var first=lines.shift();if(first!=='OFF'&&!first.startsWith('OFF '))throw Error('Cabecera OFF inválida');
 var counts=(first==='OFF'?lines.shift():first.slice(3)).trim().split(/\s+/).map(Number);
 var nv=counts[0],nf=counts[1];if(!nv||!nf||nv>400000||nf>120000)throw Error('Cantidad de elementos OFF inválida');
 var verts=lines.splice(0,nv).map(l=>l.split(/\s+/).slice(0,3).map(Number));
 var faces=lines.slice(0,nf).map(l=>{var v=l.split(/\s+/).map(Number);return v.slice(1,1+v[0]);});
 cad3dImportTriangles(verts,faces,name);
}
function cad3dParsePLY(textContent,name){
 var lines=textContent.split(/\r?\n/),end=lines.indexOf('end_header');
 if(lines[0].trim()!=='ply'||end<0||end>200)throw Error('Cabecera PLY inválida');
 var hdr=lines.slice(0,end+1).join('\n');
 if(!/format\s+ascii\s+1\.0/.test(hdr))throw Error('Solo PLY ASCII; convertir PLY binario a OBJ o STL');
 var v=/element vertex (\d+)/.exec(hdr),f=/element face (\d+)/.exec(hdr);
 if(!v||!f||+v[1]>400000||+f[1]>120000)throw Error('Elementos PLY inválidos');
 var vStart=end+1,nv=+v[1],nf=+f[1];
 var verts=lines.slice(vStart,vStart+nv).map(l=>l.trim().split(/\s+/).slice(0,3).map(Number));
 var faces=lines.slice(vStart+nv,vStart+nv+nf).map(l=>{var a=l.trim().split(/\s+/).map(Number);return a.slice(1,a[0]+1);});
 cad3dImportTriangles(verts,faces,name);
}
function cad3dParseGLTFDocument(json,buffers,name){
 if(!json.meshes||!json.accessors||!json.bufferViews)throw Error('GLTF sin mallas');
 function access(index){
  var a=json.accessors[index];if(!a||a.bufferView==null||a.sparse)throw Error('Accessor GLTF no compatible');var v=json.bufferViews[a.bufferView];if(!v)throw Error('BufferView GLTF inválida');
  var bytes=buffers[v.buffer],count={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type],size={5121:1,5123:2,5125:4,5126:4}[a.componentType];
  if(!bytes||!count||!size)throw Error('Tipo GLTF no compatible');
  var dv=new DataView(bytes),start=(v.byteOffset||0)+(a.byteOffset||0),stride=v.byteStride||count*size,out=[];
  for(var i=0;i<a.count;i++){var row=[];for(var j=0;j<count;j++){var o=start+i*stride+j*size;if(o+size>dv.byteLength)throw Error('Datos GLTF incompletos');
   row.push(a.componentType===5126?dv.getFloat32(o,true):a.componentType===5125?dv.getUint32(o,true):a.componentType===5123?dv.getUint16(o,true):dv.getUint8(o));}out.push(row);}
  return out;
 }
 var verts=[],faces=[];
 json.meshes.forEach(function(mesh){(mesh.primitives||[]).forEach(function(prim){
  if(prim.mode!=null&&prim.mode!==4)return;
  if(prim.attributes.POSITION==null)return;
  var position=access(prim.attributes.POSITION),indices=prim.indices==null?position.map((v,i)=>[i]):access(prim.indices);
  if(verts.length+position.length>400000)throw Error('Modelo GLTF demasiado grande');
  var offset=verts.length;for(var pi=0;pi<position.length;pi++)verts.push(position[pi]);
  for(var i=0;i+2<indices.length;i+=3){if(faces.length>=120000)throw Error('GLTF demasiado grande');faces.push([offset+indices[i][0],offset+indices[i+1][0],offset+indices[i+2][0]]);}
 });});
 // glTF uses Y-up; CAD3D uses Z-up.
 verts=verts.map(v=>[v[0],-v[2],v[1]]);
 cad3dImportTriangles(verts,faces,name);
}
async function cad3dImportMeshFile(file){
 var name=file.name,ext=name.split('.').pop().toLowerCase();
 if(file.size>18000000)throw Error('Archivo mayor a 18 MB');
 if(ext==='obj')return cad3dImportOBJ(await file.text(),name);
 if(ext==='stl')return cad3dParseSTL(await file.arrayBuffer(),name);
 if(ext==='off')return cad3dParseOFF(await file.text(),name);
 if(ext==='ply')return cad3dParsePLY(await file.text(),name);
 if(ext==='glb'){
  var data=await file.arrayBuffer(),dv=new DataView(data),offset=12,json=null,bin=null;
  if(dv.getUint32(0,true)!==0x46546c67||dv.getUint32(4,true)!==2)throw Error('GLB inválido o versión no admitida');
  while(offset+8<=data.byteLength){
   var len=dv.getUint32(offset,true),kind=dv.getUint32(offset+4,true);offset+=8;
   if(offset+len>data.byteLength)throw Error('GLB truncado');
   var chunk=data.slice(offset,offset+len);if(kind===0x4e4f534a)json=JSON.parse(new TextDecoder().decode(chunk));if(kind===0x004e4942)bin=chunk;offset+=len;
  }
  if(!json||!bin)throw Error('GLB sin geometría integrada');
  return cad3dParseGLTFDocument(json,[bin],name);
 }
 if(ext==='gltf'){
  var j=JSON.parse(await file.text());
  if((j.buffers||[]).some(b=>!b.uri||!b.uri.startsWith('data:')))throw Error('GLTF externo: exportar como GLB para incluir sus archivos');
  var buffers=(j.buffers||[]).map(function(b){var uri=b.uri.split(','),str=atob(uri[1]),buf=new Uint8Array(str.length);for(var i=0;i<str.length;i++)buf[i]=str.charCodeAt(i);return buf.buffer;});
  return cad3dParseGLTFDocument(j,buffers,name);
 }
 throw Error('Formato no admitido directamente. Para SKP/DAE/FBX/3DS exportá GLB, OBJ o STL.');
}

function cad3dImportOBJ(content,fileName){
 var verts=[],tris=[],lines=content.split(/\r?\n/),limit=120000;
 lines.forEach(function(raw){
  var line=raw.trim();if(line.startsWith('v ')){
   var v=line.split(/\s+/).slice(1,4).map(Number);
   if(v.length===3&&v.every(Number.isFinite))verts.push(v);
  }else if(line.startsWith('f ')){
   var indices=line.split(/\s+/).slice(1).map(function(token){
    var n=parseInt(token.split('/')[0],10);
    return n<0?verts.length+n:n-1;
   });
   if(indices.length<3||indices.some(function(i){return i<0||i>=verts.length;}))return;
   for(var i=1;i<indices.length-1&&tris.length<limit;i++)tris.push(indices[0],indices[i],indices[i+1]);
  }
 });
 if(!tris.length)throw Error('El archivo OBJ no contiene caras válidas');
 if(tris.length>360000)throw Error('OBJ supera el límite de 120.000 triángulos');
 var bounds=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 tris.forEach(function(i){var v=verts[i];for(var a=0;a<3;a++){bounds[a]=Math.min(bounds[a],v[a]);max[a]=Math.max(max[a],v[a]);}});
 if(!bounds.every(Number.isFinite)||!max.every(Number.isFinite))throw Error('OBJ contiene coordenadas inválidas');
 var size=max.map(function(n,i){return Math.max(.001,n-bounds[i]);});
 // OBJ models from SketchUp normally use Z as vertical axis. Local coordinates are Z-up.
 var normalized=tris.map(function(i){var v=verts[i];return [(v[0]-(max[0]+bounds[0])/2)/size[0],(v[1]-(max[1]+bounds[1])/2)/size[1],(v[2]-bounds[2])/size[2]];}).flat();
 var r=newRecord('imported3d');
 Object.assign(r,{name:fileName.replace(/\.obj$/i,''),meshVertices:normalized,x:0,y:0,z:0,w:size[0],d:size[1],h:size[2]});
 records.push(r);selected=[r.id];redraw();renderProps();
 text('OBJ importado: '+r.name+' · '+(tris.length/3)+' triángulos · podés moverlo, rotarlo o escalarlo');
}
function cad3dBuildImportedMesh(r,group){
 if(!r.meshVertices||!r.meshVertices.length)return;
 var points=r.meshVertices,positions=new Float32Array(points.length);
 for(var i=0;i<points.length;i+=3){positions[i]=points[i]*r.w;positions[i+1]=points[i+1]*r.d;positions[i+2]=points[i+2]*r.h;}
 var g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(positions,3));g.computeVertexNormals();
 addMesh(g,r.materialColor||0xb6bdc0,r.id,group);
}

function buildCAD3DBlock(record,group){
 var def=CAD3D_COMPONENTS[record.blockId];if(!def)return;
 var sx=record.w/def.w,sy=record.d/def.d,sz=record.h/def.h;
 if(def.cutout){
  [0,Math.PI/2].forEach(function(angle){
   var material=new T.MeshBasicMaterial({map:cad3dCutoutTexture(def.cutout,record.blockId),transparent:true,alphaTest:.05,depthWrite:false,side:T.DoubleSide});
   var mesh=new T.Mesh(new T.PlaneGeometry(record.w,record.h),material);
   mesh.rotation.set(0,angle,0);mesh.position.z=record.h/2;mesh.userData.owner=record.id;
   mesh.castShadow=true;group.add(mesh);
  });return;
 }
 def.parts.forEach(function(p){
  var w=p[3]*sx,d=p[4]*sy,h=p[5]*sz,g=boxGeom(w,d,h);
  addMesh(g,p[6],record.id,group,p[0]*sx,p[1]*sy,p[2]*sz);
 });
}

/* CAD3D_PROFILE_DRAW_V1: native 2D profiles drawn on the XY workplane. */
var cad3dDraftProfile=[];
function cad3dProfileRecord(points,closed,label){
 if(!Array.isArray(points)||points.length<2)return;
 var minX=Math.min(...points.map(p=>p[0])),maxX=Math.max(...points.map(p=>p[0]));
 var minY=Math.min(...points.map(p=>p[1])),maxY=Math.max(...points.map(p=>p[1]));
 var cx=(minX+maxX)/2,cy=(minY+maxY)/2;
 var rec=newRecord('profile2d');
 Object.assign(rec,{x:cx,y:cy,z:0,w:Math.max(.01,maxX-minX),d:Math.max(.01,maxY-minY),h:0,
  profilePoints:points.map(p=>[p[0]-cx,p[1]-cy]),profileClosed:!!closed,name:label,extrudedHeight:0});
 records.push(rec);selected=[rec.id];selectedOpeningId=null;redraw();renderProps();
 return rec;
}
function cad3dFinishPolyline(){
 if(!['polyline','line'].includes(placing))return false;
 if(cad3dDraftProfile.length>=2){
  // A polyline is open by default; clicking near its first point closes it.
  cad3dProfileRecord(cad3dDraftProfile,!!cad3dDraftProfile.closed,placing==='line'?'Line':'Polyline');
 }
 cad3dDraftProfile=[];setPlacement(null);text('Dibujo 2D finalizado · perfiles cerrados pueden extrudarse');return true;
}
function cad3dPointOnCircle(center,r,angle){return [center.x+r*Math.cos(angle),center.y+r*Math.sin(angle)];}
function cad3dThreePointArc(a,b,c){
 var x1=a[0],y1=a[1],x2=b[0],y2=b[1],x3=c[0],y3=c[1];
 var den=2*(x1*(y2-y3)+x2*(y3-y1)+x3*(y1-y2));
 if(Math.abs(den)<1e-8)return null;
 var ux=((x1*x1+y1*y1)*(y2-y3)+(x2*x2+y2*y2)*(y3-y1)+(x3*x3+y3*y3)*(y1-y2))/den;
 var uy=((x1*x1+y1*y1)*(x3-x2)+(x2*x2+y2*y2)*(x1-x3)+(x3*x3+y3*y3)*(x2-x1))/den;
 var center={x:ux,y:uy},r=Math.hypot(x1-ux,y1-uy);
 var start=Math.atan2(y1-uy,x1-ux),mid=Math.atan2(y2-uy,x2-ux),end=Math.atan2(y3-uy,x3-ux);
 var tau=Math.PI*2,positive=(x)=>(x%tau+tau)%tau;
 var sweep=positive(end-start),middle=positive(mid-start);
 if(middle>sweep)sweep-=tau;
 var points=[];
 for(var i=0;i<=48;i++)points.push(cad3dPointOnCircle(center,r,start+sweep*i/48));
 return points;
}

function cad3dUpdateDraftPreview(point){
 if(!root)return;
 var view=root.querySelector('.view');
 if(!view)return;
 var overlay=view.querySelector('.cad3dDraftPreview');
 if(!overlay){
  overlay=document.createElementNS('http://www.w3.org/2000/svg','svg');
  overlay.classList.add('cad3dDraftPreview');
  overlay.setAttribute('aria-hidden','true');
  view.appendChild(overlay);
 }
 var kind=placing,points=cad3dDraftProfile;
 if(!['line','polyline','rectangle','circle','arc'].includes(kind)||!points.length){
  overlay.replaceChildren();overlay.style.display='none';return;
 }
 var w=view.clientWidth,h=view.clientHeight;
 if(!w||!h)return;
 overlay.style.display='block';
 overlay.setAttribute('viewBox','0 0 '+w+' '+h);
 var projected=function(p){return pointOnScreen({x:p[0],y:p[1],z:0},view);};
 var pts=points.slice();
 if(point&&Number.isFinite(point.x)&&Number.isFinite(point.y))pts.push([point.x,point.y]);
 if(pts.length<2){overlay.replaceChildren();return;}
 var shape=pts;
 if(kind==='rectangle'){
  var a=pts[0],b=pts[pts.length-1];
  shape=[a,[b[0],a[1]],b,[a[0],b[1]],a];
 }else if(kind==='circle'){
  var a=pts[0],b=pts[pts.length-1],r=Math.hypot(a[0]-b[0],a[1]-b[1]);
  shape=Array.from({length:65},(_,i)=>[a[0]+r*Math.cos(i*Math.PI/32),a[1]+r*Math.sin(i*Math.PI/32)]);
 }else if(kind==='arc'&&pts.length===3){
  shape=cad3dThreePointArc(pts[0],pts[1],pts[2])||pts;
 }
 var path=shape.map(function(p,i){var q=projected(p);return (i?'L':'M')+q.x.toFixed(2)+','+q.y.toFixed(2);}).join(' ');
 overlay.innerHTML='<path d="'+path+'" fill="none" stroke="'+(renderStyle==='wire2d'?'#0071b5':'#72ddff')+'" stroke-width="2.2" stroke-linejoin="round" stroke-dasharray="7 4"/>'+
  pts.map(function(p){var q=projected(p);return '<circle cx="'+q.x+'" cy="'+q.y+'" r="3.3" fill="#ffcd64" stroke="#23445d" stroke-width="1.3"/>';}).join('');
}

function cad3dDrawProfilePoint(pt){
 var kind=placing,p=[pt.x,pt.y];
 if(kind==='line'||kind==='polyline'){
  if(cad3dDraftProfile.length&&Math.hypot(p[0]-cad3dDraftProfile[0][0],p[1]-cad3dDraftProfile[0][1])<Math.max(.015,worldPerPixel(root.querySelector('.view'))*10)&&kind==='polyline'&&cad3dDraftProfile.length>=3){
   var closePoints=cad3dDraftProfile.slice();cad3dProfileRecord(closePoints,true,'Closed polyline');
   cad3dDraftProfile=[];setPlacement(null);text('Polilínea cerrada · seleccioná Extrude para crear un sólido');return;
  }
  if(kind==='line'&&cad3dDraftProfile.length){
   if(Math.hypot(p[0]-cad3dDraftProfile[0][0],p[1]-cad3dDraftProfile[0][1])<1e-6)return;
   cad3dProfileRecord([cad3dDraftProfile[0],p],false,'Line');
   cad3dDraftProfile=[p];cad3dUpdateDraftPreview();text('Línea creada · siguiente punto / Enter finaliza');return;
  }
  if(cad3dDraftProfile.length&&Math.hypot(p[0]-cad3dDraftProfile[cad3dDraftProfile.length-1][0],p[1]-cad3dDraftProfile[cad3dDraftProfile.length-1][1])<1e-6)return;
  cad3dDraftProfile.push(p);cad3dUpdateDraftPreview();text(kind==='polyline'?'Polilínea: siguiente vértice · clic cerca del inicio para cerrar · Enter termina':'Línea: siguiente punto · Enter termina');return;
 }
 if(!cad3dDraftProfile.length){cad3dDraftProfile=[p];cad3dUpdateDraftPreview();text(kind==='arc'?'Arco: indicá punto intermedio y final':'Indicá el segundo punto');return;}
 if(kind==='arc'&&cad3dDraftProfile.length===1){cad3dDraftProfile.push(p);cad3dUpdateDraftPreview();text('Arco: indicá punto final');return;}
 var start=cad3dDraftProfile[0],points,closed=true;
 if(kind==='rectangle'){
  if(Math.hypot(p[0]-start[0],p[1]-start[1])<.01)return;
  points=[start,[p[0],start[1]],p,[start[0],p[1]]];
 }else if(kind==='circle'){
  var radius=Math.hypot(p[0]-start[0],p[1]-start[1]);if(radius<.01)return;
  points=Array.from({length:64},(_,i)=>[start[0]+radius*Math.cos(i*Math.PI/32),start[1]+radius*Math.sin(i*Math.PI/32)]);
 }else if(kind==='arc'){
  points=cad3dThreePointArc(start,cad3dDraftProfile[1],p);closed=false;
  if(!points){text('Los tres puntos del arco no pueden ser colineales');return;}
 }
 if(points)cad3dProfileRecord(points,closed,kind);
 cad3dDraftProfile=[];setPlacement(null);text(kind+' creado'+(closed?' · listo para Extrude':''));
}
function cad3dBuildProfile(r,group){
 var pts=r.profilePoints||[];if(pts.length<2)return;
 var vertices=pts.map(p=>new T.Vector3(p[0],p[1],0));
 if(r.profileClosed)vertices.push(vertices[0].clone());
 var outline=new T.Line(new T.BufferGeometry().setFromPoints(vertices),
  new T.LineBasicMaterial({color:0x82c6df,depthTest:false,depthWrite:false}));
 outline.renderOrder=9;
 outline.userData.owner=r.id;outline.userData.cadProfileOutline=true;group.add(outline);
 if(r.profileClosed&&pts.length>=3){
  var shape2d=new T.Shape();shape2d.moveTo(pts[0][0],pts[0][1]);pts.slice(1).forEach(p=>shape2d.lineTo(p[0],p[1]));shape2d.closePath();
  // Transparent selectable surface: a rectangle is selectable by its interior, not only 1px edges.
  var hitFace=new T.Mesh(new T.ShapeGeometry(shape2d),
   new T.MeshBasicMaterial({color:0x78c7e8,transparent:true,opacity:.018,depthWrite:false,side:T.DoubleSide}));
  hitFace.position.z=.001;hitFace.userData.owner=r.id;hitFace.userData.cadProfileFace=true;
  hitFace.renderOrder=3;group.add(hitFace);
 }
 var handles=new T.Points(new T.BufferGeometry().setFromPoints(vertices.slice(0,r.profileClosed?-1:undefined)),
  new T.PointsMaterial({color:0xffce68,size:7,sizeAttenuation:false,depthTest:false,depthWrite:false}));
 handles.userData.cadProfileHandles=true;handles.visible=false;handles.renderOrder=8;group.add(handles);
 if(r.profileClosed&&r.extrudedHeight>0&&pts.length>=3){
  var shape=new T.Shape();shape.moveTo(pts[0][0],pts[0][1]);
  pts.slice(1).forEach(p=>shape.lineTo(p[0],p[1]));shape.closePath();
  var geom=new T.ExtrudeGeometry(shape,{depth:r.extrudedHeight,steps:1,bevelEnabled:false,curveSegments:24});
  addMesh(geom,0x9ea9b4,r.id,group);
 }
}


/* CAD3D_TOOLBARS_DOCKABLE_V1
 * Each group can float above the viewport; a double-click restores its original slot.
 * Positions persist in this browser without touching drawings or keyboard shortcuts.
 */
var cad3dToolbarLayout=null;
function cad3dEnableMovableToolbars(){
 // Docking model: the four zones own the real toolbar nodes. No loose floating bars
 // are left behind on pointer release. Track dragging on window so reparenting does
 // not discard pointer capture (the root cause of the old one-move-only behavior).
 const descriptors=[
  ['draw','.cad3dBasicBars .cad3dBar[aria-label="Draw"]'],
  ['modify','.cad3dBasicBars .cad3dBar[aria-label="Modify"]'],
  ['draw2d','.cad3dProfileTools'],
  ['model3d','.cad3dModelTools'],
  ['options','.tools'],
  ['navigation','.cad3dNavToolbar'],
  ['styles','.cad3dStyleToolbar'],
  ['quickviews','.cad3dQuickViews']
 ];
 const key='blackline-cad3d-dock-layout-v2';
 const top=root.querySelector('.cad3dBasicBars');
 const body=root.querySelector('.body');
 const bottom=document.createElement('div');
 bottom.className='cad3dDockZone cad3dDockBottom';
 bottom.dataset.dockZone='bottom';
 bottom.setAttribute('aria-label','Barras inferiores CAD3D');
 root.querySelector('.draftBar').before(bottom);
 const left=document.createElement('div'),right=document.createElement('div');
 left.className='cad3dDockZone cad3dDockSide cad3dDockLeft';left.dataset.dockZone='left';
 right.className='cad3dDockZone cad3dDockSide cad3dDockRight';right.dataset.dockZone='right';
 left.setAttribute('aria-label','Barras izquierda CAD3D');
 right.setAttribute('aria-label','Barras derecha CAD3D');
 body.append(left,right);
 top.classList.add('cad3dDockZone','cad3dDockTop');top.dataset.dockZone='top';
 const zones={top,bottom,left,right},states=[],byId=new Map();
 root.classList.add('cad3dCompactMode');
 for(const [id,selector] of descriptors){
  const el=root.querySelector(selector);if(!el)continue;
  const grip=document.createElement('button');grip.type='button';
  grip.className='cad3dToolbarGrip';grip.dataset.cad3dToolbar=id;
  grip.title='Arrastrar y acoplar arriba, abajo o a los lados. Doble clic: volver arriba.';
  grip.setAttribute('aria-label','Mover barra '+id);
  grip.innerHTML='<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><circle cx="5" cy="3" r="1"/><circle cx="11" cy="3" r="1"/><circle cx="5" cy="8" r="1"/><circle cx="11" cy="8" r="1"/><circle cx="5" cy="13" r="1"/><circle cx="11" cy="13" r="1"/></svg>';
  el.prepend(grip);el.classList.add('cad3dDockBar');top.appendChild(el);
  const state={id,el,grip};states.push(state);byId.set(id,state);
 }
 const refresh=()=>{
  for(const zone of Object.values(zones)){
   const count=zone.querySelectorAll(':scope > .cad3dDockBar').length;
   zone.classList.toggle('cad3dDockEmpty',count===0);
  }
 };
 const persist=()=>{
  const layout={};
  for(const [zoneName,zone] of Object.entries(zones)){
   [...zone.children].filter(el=>el.classList.contains('cad3dDockBar')).forEach((el,index)=>{
    const st=states.find(x=>x.el===el);if(st)layout[st.id]={zone:zoneName,index};
   });
  }
  try{localStorage.setItem(key,JSON.stringify(layout));}catch(_e){}
  refresh();
 };
 let saved={};
 try{const v=JSON.parse(localStorage.getItem(key)||'{}');if(v&&typeof v==='object')saved=v;}catch(_e){}
 const order=[...states].sort((a,b)=>{
  const pa=saved[a.id],pb=saved[b.id];
  return (Number(pa?.index)||0)-(Number(pb?.index)||0);
 });
 // Restore only explicitly known zones. Older version's detached coordinates
 // are deliberately ignored to avoid restoring the faulty loose layout.
 for(const st of order){
  const pref=saved[st.id],zone=zones[pref?.zone]||top;
  zone.appendChild(st.el);
 }
 refresh();
 const placeBefore=(zone,px,py,exclude)=>{
  const vertical=zone.classList.contains('cad3dDockSide');
  const items=[...zone.children].filter(el=>el!==exclude&&el.classList.contains('cad3dDockBar'));
  return items.find(el=>{
   const b=el.getBoundingClientRect();
   return vertical?py<(b.top+b.bottom)/2:px<(b.left+b.right)/2;
  })||null;
 };
 const zoneFor=(px,py)=>{
  const t=top.getBoundingClientRect(),bt=bottom.getBoundingClientRect(),bd=body.getBoundingClientRect();
  if(py<t.bottom+35)return top;
  if(py>bt.top-35)return bottom;
  if(px<bd.left+80)return left;
  if(px>bd.right-80)return right;
  // Release in canvas interior? Snap to nearest dock; never abandon a loose bar.
  const distances=[
   [Math.abs(py-t.bottom),top],
   [Math.abs(py-bt.top),bottom],
   [Math.abs(px-bd.left),left],
   [Math.abs(px-bd.right),right]
  ];
  distances.sort((a,b)=>a[0]-b[0]);return distances[0][1];
 };
 let drag=null;
 function cleanup(){
  window.removeEventListener('pointermove',onMove,true);
  window.removeEventListener('pointerup',onUp,true);
  window.removeEventListener('pointercancel',onCancel,true);
  window.removeEventListener('keydown',onEscape,true);
  root.classList.remove('cad3dDraggingDock');
  Object.values(zones).forEach(z=>z.classList.remove('cad3dDockCandidate'));
 }
 function finish(cancelled){
  if(!drag)return;
  const d=drag;drag=null;cleanup();
  if(d.active){
   d.el.classList.remove('cad3dDockDraggingBar');
   d.el.style.left='';d.el.style.top='';d.el.style.width='';
   const zone=cancelled?d.originZone:(d.placeholder.parentNode||d.originZone);
   const next=d.placeholder.parentNode===zone?d.placeholder:null;
   if(next)zone.insertBefore(d.el,next);
   else zone.insertBefore(d.el,zone.children[d.originIndex]||null);
   d.placeholder.remove();
   persist();
  }
 }
 function onMove(e){
  if(!drag||e.pointerId!==drag.pointer)return;
  const d=drag,dx=e.clientX-d.startX,dy=e.clientY-d.startY;
  if(!d.active){
   if(Math.hypot(dx,dy)<5)return;
   d.active=true;
   d.placeholder=document.createElement('div');
   d.placeholder.className='cad3dDockPlaceholder';
   d.placeholder.style.width=d.rect.width+'px';
   d.placeholder.style.height=d.rect.height+'px';
   d.el.before(d.placeholder);
   d.el.classList.add('cad3dDockDraggingBar');
   d.el.style.width=d.rect.width+'px';
   root.appendChild(d.el);
   root.classList.add('cad3dDraggingDock');
  }
  d.el.style.left=Math.round(d.rect.left-d.rootRect.left+dx)+'px';
  d.el.style.top=Math.round(d.rect.top-d.rootRect.top+dy)+'px';
  const zone=zoneFor(e.clientX,e.clientY);
  Object.values(zones).forEach(z=>z.classList.toggle('cad3dDockCandidate',z===zone));
  const before=placeBefore(zone,e.clientX,e.clientY,d.el);
  zone.insertBefore(d.placeholder,before);
  d.placeholder.style.width=zone.classList.contains('cad3dDockSide')?'43px':Math.min(d.rect.width,260)+'px';
  d.placeholder.style.height=zone.classList.contains('cad3dDockSide')?'44px':'36px';
  e.preventDefault();
 }
 function onUp(e){if(drag&&e.pointerId===drag.pointer)finish(false);}
 function onCancel(e){if(drag&&e.pointerId===drag.pointer)finish(true);}
 function onEscape(e){if(drag&&e.key==='Escape'){e.preventDefault();finish(true);}}
 for(const st of states){
  st.grip.addEventListener('pointerdown',e=>{
   if(e.button!==0||drag)return;
   e.preventDefault();e.stopPropagation();
   const el=st.el,zone=el.parentNode,rect=el.getBoundingClientRect();
   const rootRect=root.getBoundingClientRect();
   drag={el,originZone:zone,originIndex:[...zone.children].indexOf(el),
    startX:e.clientX,startY:e.clientY,pointer:e.pointerId,rect,rootRect,
    active:false,placeholder:null};
   window.addEventListener('pointermove',onMove,true);
   window.addEventListener('pointerup',onUp,true);
   window.addEventListener('pointercancel',onCancel,true);
   window.addEventListener('keydown',onEscape,true);
  });
  st.grip.addEventListener('dblclick',e=>{
   e.preventDefault();e.stopPropagation();if(drag)finish(true);
   top.appendChild(st.el);persist();
  });
 }
 root.addEventListener('click',e=>{if(e.target.closest('.cad3dToolbarGrip'))e.stopPropagation();},true);
 return {reset(){for(const st of states)top.appendChild(st.el);persist();},
  relayout(){refresh();}};
}

var cad3dNavigationTool='select',cad3dBIMCompass=false;

function cad3dApprovedStyleCube(mode){
 // Six original-layout cube pictograms, compact SVG rather than platform-dependent glyphs.
 var top='24,3 44,13 24,24 4,13',left='4,13 24,24 24,45 4,34',right='44,13 24,24 24,45 44,34';
 var line='#f3f8fc',dark='#23333e';
 var fill=mode==='shaded'?['#bcd0e0','#90a9bf','#738da3']:
   mode==='realistic'?['#91c7fd','#7fe67f','#ee7373']:
   mode==='sketch'?['#f3f4f4','#ededed','#dedede']:
   mode==='xray'?['#80c0e92f','#75acc83b','#a3dcff2c']:
   ['none','none','none'];
 var edge=mode==='sketch'?'#28333a':mode==='shaded'?'#e6f2fc':line;
 var widths=mode==='hidden'?'2.3':'1.9';
 var svg='<svg class="cad3dApprovedCubeSvg" viewBox="0 0 48 48" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">';
 if(mode==='xray')svg+='<polygon points="'+top+'" fill="#95c5ed1c"/><polygon points="'+left+'" fill="#95c5ed13"/><polygon points="'+right+'" fill="#95c5ed26"/>';
 svg+='<polygon points="'+top+'" fill="'+fill[0]+'" stroke="'+edge+'" stroke-width="'+widths+'" stroke-linejoin="round"/>'+
  '<polygon points="'+left+'" fill="'+fill[1]+'" stroke="'+edge+'" stroke-width="'+widths+'" stroke-linejoin="round"/>'+
  '<polygon points="'+right+'" fill="'+fill[2]+'" stroke="'+edge+'" stroke-width="'+widths+'" stroke-linejoin="round"/>';
 if(mode==='wire3d'||mode==='xray'||mode==='hidden')svg+='<path d="M24 24V45M4 13L24 3L44 13M4 34L24 45L44 34" fill="none" stroke="'+edge+'" stroke-width="1.45"/>';
 if(mode==='sketch')svg+='<path d="M18 10l7 3m7 8-1 7M11 25l6 4M27 32l6-2" fill="none" stroke="#7e868d" stroke-width="1.3" stroke-linecap="round"/>';
 if(mode==='shaded')svg+='<path d="M4 13L24 24L44 13" fill="none" stroke="#fff" stroke-opacity=".38"/>';
 return svg+'</svg>';
}

function cad3dCompact3DBar(){
 function b(group,key,label,display){return '<button type="button" class="cad3dQuickTool" data-'+group+'="'+key+'" title="'+label+'" aria-label="'+label+'" aria-pressed="false">'+display+'</button>';}
 var tools=[
 ['orbit','Giro libre','⟳'],['pan','Panorámica','✥'],['ring','Órbita con anillo','◎'],
 ['hand','Mano · desplazar','✋'],['center','Centrar modelo','⊙'],['fit','Ajustar todo','⛶']
 ];
 var styles=[
 ['shaded','Sólido'],['wire3d','Alámbrico'],['xray','Transparente'],
 ['realistic','Por colores'],['hidden','Contorno'],['sketch','Croquis']
 ];
 var views=['top','front','right','left','back','bottom'];
 return '<div class="cad3dNavToolbar" role="toolbar" aria-label="Navegación 3D">'+
  '<strong>NAVEGACIÓN</strong>'+tools.map(function(t){return b('nav-tool',t[0],t[1],t[2]);}).join('')+'</div>'+
  '<div class="cad3dStyleToolbar" role="toolbar" aria-label="Estilos visuales del modelo">'+
  '<strong>ESTILOS</strong>'+styles.map(function(t){return b('quick-style',t[0],t[1],cad3dApprovedStyleCube(t[0]));}).join('')+'</div>'+
  '<div class="cad3dQuickViews" role="toolbar" aria-label="Vistas y brújula BIM">'+
  '<strong>VISTAS</strong>'+views.map(function(key){return b('quick-view',key,key.toUpperCase(),key.toUpperCase());}).join('')+
  b('quick-view','iso','Isométrica','ISO')+b('quick-view','bim','Brújula BIM · alternar','N/E')+'</div>';
}
function cad3dSyncCompactBars(){
 if(!root)return;
 root.querySelectorAll('[data-nav-tool]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.navTool===cad3dNavigationTool||(b.dataset.navTool==='hand'&&cad3dNavigationTool==='pan')));});
 root.querySelectorAll('[data-quick-style]').forEach(function(b){
  b.setAttribute('aria-pressed',String(b.dataset.quickStyle==='sun'?sunSettings.enabled:b.dataset.quickStyle===renderStyle));
 });
 root.querySelector('[data-quick-view="bim"]')?.setAttribute('aria-pressed',String(cad3dBIMCompass));
 root.querySelector('.viewNav')?.classList.toggle('cad3dBIMNavigator',cad3dBIMCompass);
}
function cad3dBindCompactBars(){
 root.addEventListener('click',function(e){
  var nav=e.target.closest('[data-nav-tool]'),style=e.target.closest('[data-quick-style]'),view=e.target.closest('[data-quick-view]');
  if(nav){
   var kind=nav.dataset.navTool;
   if(kind==='center'||kind==='fit'){fit3DModel();return;}
   cad3dNavigationTool=kind==='hand'?'pan':kind;
   if(cad3dNavigationTool==='pan'){cad3dEndZoom();if(placing)setPlacement(null);}
   root.querySelector('.view')?.classList.toggle('cad3dPanning',cad3dNavigationTool==='pan');
   cad3dSyncCompactBars();
   if(kind==='ring'){root.querySelector('.orbitBall')?.focus({preventScroll:true});}
   else root.querySelector('.view canvas')?.focus({preventScroll:true});
   text(kind==='pan'||kind==='hand'?'Mover vista: arrastrá sobre el dibujo':'Girar vista: arrastrá sobre el dibujo');return;
  }
  if(style){
   var mode=style.dataset.quickStyle;
   if(mode==='sun'){sunSettings.enabled=!sunSettings.enabled;applySunSettings();}
   else {
    if(mode==='wire3d'&&activeView==='top')setViewPreset('iso');
    setVisualStyle(mode);
   }
   cad3dSyncCompactBars();return;
  }
  if(view){
   var key=view.dataset.quickView;
   if(key==='bim'){
    cad3dBIMCompass=!cad3dBIMCompass;
    if(cad3dBIMCompass)setViewPreset('iso');
    cad3dSyncCompactBars();
    text(cad3dBIMCompass?'Brújula BIM activada · vistas TOP/FRONT/RIGHT y orientación':'Brújula BIM desactivada');
   }else setViewPreset(key);
  }
 });
 cad3dSyncCompactBars();
}

function cad3dBasicBars(){
 return '<div class="cad3dBasicBars" role="group" aria-label="CAD3D Draw and Modify toolbars">'+
  '<div class="cad3dBar" role="toolbar" aria-label="Draw"><strong>DRAW</strong>'+
   tool('wall','Wall','wall')+tool('slab','Slab','slab')+tool('floor','Floor','floor')+
   tool('door','Door','door')+tool('window','Window','window')+tool('opening','Opening','opening')+
   tool('box','Box','cube')+tool('sphere','Sphere','sphere')+
   tool('cylinder','Cylinder','cylinder')+tool('cone','Cone','cone')+'</div>'+
  '<div class="cad3dBar" role="toolbar" aria-label="Modify"><strong>MODIFY</strong>'+
   tool('select','Select','cube')+tool('move','Move','move')+tool('copy','Copy','copy')+
   tool('rotate','Rotate','rotate')+tool('erase','Erase','erase')+'</div></div>';
}

function cad3dMakeSunPanelMovable(){
 var panel=root.querySelector('.sunPanel'),button=root.querySelector('.sunLaunch');
 var handle=panel?.querySelector('.sunFloatingHeader'),close=panel?.querySelector('.sunFloatingClose');
 if(!panel||!handle||!button)return;
 root.appendChild(panel);
 var drag=null,restored=cad3dPaletteRestore('sun',panel);
 function place(){
  if(panel.hidden)return;
  if(!panel.dataset.userPositioned){
   var rr=root.getBoundingClientRect(),br=button.getBoundingClientRect();
   var width=panel.offsetWidth||274,height=panel.offsetHeight||365;
   var x=br.left-rr.left,y=br.bottom-rr.top+8;
   if(x+width>rr.width-10)x=rr.width-width-10;
   if(y+height>rr.height-10)y=Math.max(44,br.top-rr.top-height-8);
   panel.style.left=Math.max(10,x)+'px';
   panel.style.top=Math.max(10,y)+'px';
  }
  cad3dPaletteConstrain(panel);
  cad3dBringPaletteFront(panel);
 }
 button.addEventListener('click',function(){queueMicrotask(place);});
 if(restored){
  var hidden=panel.hidden;panel.hidden=false;cad3dPaletteConstrain(panel);panel.hidden=hidden;
 }
 panel.addEventListener('pointerdown',function(){cad3dBringPaletteFront(panel);});
 close.addEventListener('click',function(e){
  e.stopPropagation();panel.hidden=true;button.setAttribute('aria-expanded','false');
 });
 handle.addEventListener('pointerdown',function(e){
  if(e.button!==0||e.target.closest('button,input'))return;
  e.preventDefault();e.stopPropagation();
  var pr=panel.getBoundingClientRect();
  drag={id:e.pointerId,dx:e.clientX-pr.left,dy:e.clientY-pr.top};
  handle.setPointerCapture(e.pointerId);panel.dataset.userPositioned='true';
  cad3dBringPaletteFront(panel);
 });
 handle.addEventListener('pointermove',function(e){
  if(!drag||e.pointerId!==drag.id)return;
  var rr=root.getBoundingClientRect();
  panel.style.left=clamp(e.clientX-rr.left-drag.dx,8,Math.max(8,root.clientWidth-panel.offsetWidth-8))+'px';
  panel.style.top=clamp(e.clientY-rr.top-drag.dy,8,Math.max(8,root.clientHeight-panel.offsetHeight-8))+'px';
 });
 function finish(e){
  if(!drag||drag.id!==e.pointerId)return;
  var id=drag.id;drag=null;cad3dPaletteConstrain(panel);cad3dPaletteRemember('sun',panel);
  try{if(handle.hasPointerCapture(id))handle.releasePointerCapture(id);}catch(_e){}
 }
 handle.addEventListener('pointerup',finish);
 handle.addEventListener('pointercancel',finish);
 handle.addEventListener('lostpointercapture',finish);
}

function build(){
 if(root)return;
 root=document.createElement('section');root.id='cad3dLab';root.hidden=true;root.setAttribute('role','dialog');root.setAttribute('aria-label','Blackline CAD 3D');
 root.innerHTML='<div class="head"><strong>BLACKLINE · CAD3D</strong><div class="stretch"></div>'+
 '<button type="button" class="btn" data-max title="Maximizar o restaurar ventana 3D">□</button>'+
 '<button type="button" class="btn" data-close title="Cerrar 3D">×</button></div>'+
 cad3dBasicBars()+cad3dCompact3DBar()+
 '<div class="camera3DBar" role="toolbar" aria-label="Cámaras 3D"><strong>C · CÁMARAS</strong><button type="button" class="btn" data-camera-create title="Guardar la cámara actual">＋ Crear cámara</button><select class="camera3DList" aria-label="Cámaras guardadas"><option value="">Seleccionar cámara…</option></select><button type="button" class="btn" data-camera-back title="Retroceder por el recorrido">◀ Atrás</button><button type="button" class="btn" data-camera-forward title="Avanzar por el recorrido">Adelante ▶</button></div>'+

 '<div class="cad3dProfileTools" role="toolbar" aria-label="2D drawing in 3D" style="display:flex;align-items:center;flex-wrap:wrap;gap:6px;padding:6px 12px;border-bottom:1px solid #354552;background:#14212c">'+
 '<strong style="font-size:11px;color:#aabecb;margin-right:5px">2D DRAW</strong>'+
 tool('line','Line','line')+tool('polyline','Polyline','polyline')+tool('rectangle','Rectangle','rectangle')+
 tool('circle','Circle','circle')+tool('arc','Arc','arc')+'</div>'+
 '<div class="cad3dModelTools" role="toolbar" aria-label="3D solid modeling" style="display:flex;align-items:center;flex-wrap:wrap;gap:6px;padding:7px 12px;border-bottom:1px solid #354552;background:#16232d">'+
 '<strong style="font-size:11px;margin-right:5px;color:#aabecb">3D MODEL</strong>'+
 '<label style="font-size:11px;color:#b9c9d3">Height (m) <input class="cad3dExtrudeHeight" type="number" min="-1000" max="1000" step="0.1" value="2.8" aria-label="Extrude height or signed face distance in meters" style="width:68px;padding:5px;background:#263641;color:white;border:1px solid #536876;border-radius:5px"></label>'+
 '<button type="button" class="btn" data-solid-command="extrude" title="Extrude · E + Enter" aria-label="Extrude">'+ico('extrude')+'<span>Extrude</span></button>'+
 '<button type="button" class="btn" data-solid-command="extrudeface" title="Extrude Face · empujar o tirar una cara" aria-label="Extrude Face">'+ico('extrudeface')+'<span>Extrude Face</span></button>'+
 '<button type="button" class="btn" data-solid-command="union" title="Union of two unrotated box solids">'+ico('union')+'<span>Union</span></button>'+
 '<button type="button" class="btn" data-solid-command="subtract" title="Subtract the second selected unrotated box from the first">'+ico('subtract')+'<span>Subtract</span></button>'+
 '<button type="button" class="btn" data-solid-command="intersect" title="Intersection of two unrotated box solids">'+ico('intersect')+'<span>Intersect</span></button>'+
 '</div>'+
 '<div class="tools"><label class="btn" style="cursor:pointer" title="Import 3D · OBJ, STL, OFF, PLY, GLB, glTF" aria-label="Import 3D">'+ico('folder')+'<span>Import 3D</span><input class="cad3dOBJInput" type="file" accept=".obj,.stl,.off,.ply,.glb,.gltf" hidden></label><button type="button" class="btn archLaunch" aria-controls="cad3dArchPalette" aria-expanded="false" title="Parametric 3D" aria-label="Parametric 3D">'+'<svg viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h12v22H3z" stroke="#e9f2f7" stroke-width="2"/><path d="M6 8h6v16H6z" stroke="#75b5d0" stroke-width="1.3"/><circle cx="12.7" cy="17" r="1" fill="#e9f2f7"/><path d="M18 5h11v22H18zM23.5 5v22M18 16h11" stroke="#e9f2f7" stroke-width="2"/><path d="M20 8h7v6h-7M20 18h7v7h-7" stroke="#83cfed" stroke-width="1.2"/></svg>'+'<span>Parametric 3D</span></button>'+cad3DBlockCatalog()+
 '<div class="sunControl"><button type="button" class="btn sunLaunch" aria-controls="cad3dSunPanel" aria-expanded="false" title="Sun and shadows">'+ico('sun')+'<span>Sun</span></button>'+
 '<div class="sunPanel" id="cad3dSunPanel" hidden>'+ 
 '<div class="sunFloatingHeader" title="Arrastrar para mover los controles de sol"><strong>☀ SOL / SHADOWS</strong><button type="button" class="sunFloatingClose" aria-label="Cerrar controles solares">×</button></div>'+
 '<label class="sunToggle"><input type="checkbox" data-sun-enabled> Sun / Shadows</label>'+
 '<label>Azimuth <output data-sun-azimuth>135°</output><input data-sun-setting="azimuth" type="range" min="0" max="360" step="5" value="135"></label>'+
 '<label>Elevation <output data-sun-elevation>45°</output><input data-sun-setting="elevation" type="range" min="5" max="85" step="5" value="45"></label>'+
 '<label class="sunToggle"><input type="checkbox" data-sun-ground checked> On ground</label>'+
 '<label class="sunToggle"><input type="checkbox" data-sun-faces checked> On faces</label>'+
 '<div class="sunPresetRow"><button type="button" class="btn" data-sun-preset="morning">Morning</button><button type="button" class="btn" data-sun-preset="noon">Noon</button><button type="button" class="btn" data-sun-preset="afternoon">Afternoon</button></div>'+
 '<button type="button" class="btn" data-check-shadows title="Compare render with shadows on and off">Check visible shadows</button>'+
 '<output class="shadowFeedback" role="status">Shadow check requires WebGL and visible objects.</output>'+
 '<small>Visual simulation only, not geolocated solar analysis.</small></div></div>'+
 tool('sketch','Croquis','view')+
 '<div class="styleControl"><button type="button" class="btn styleLaunch" aria-expanded="false" aria-controls="cad3dVisualStyles" title="Choose visual rendering style" aria-label="Visual Style">'+ico('view')+'<span>Visual Style</span></button>'+
 '<div class="stylePanel" id="cad3dVisualStyles" hidden><header>VISUAL STYLES · CAD3D <small>SketchUp-inspired workspace</small></header>'+
 '<div class="styleGalleryControls"><input class="styleGallerySearch" type="search" aria-label="Buscar estilo visual" placeholder="Buscar estilo…">'+
 '<span class="styleGalleryCount"></span></div>'+
 '<div class="styleGalleryScroll"><div class="styleGrid" role="group" aria-label="Galería de estilos visuales">'+
 [
 ['Técnico','wire2d','2D Wireframe','Líneas negras'],['Técnico','wire3d','3D Wireframe','Aristas'],['Técnico','hidden','Ocultas','Líneas visibles'],
 ['Técnico','shaded','Sombreado','Colores sólidos'],['Técnico','shaded-edges','Sólido + aristas','Arquitectura'],['Técnico','realistic','Realista','Materiales'],
 ['Técnico','monochrome','Monocromo','Blanco neutro'],['Técnico','xray','Rayos X','Transparencia'],
 ['Luz y presentación','sketch-sunlit','Interior soleado','Sol y sombras'],['Luz y presentación','sketch-sunset','Atardecer ilustrado','Luz cálida'],
 ['Luz y presentación','sketch-white-model','Maqueta blanca','Volumen y sombra'],['Luz y presentación','sketch-presentation','Presentación','Líneas y luz'],
 ['Luz y presentación','sketch-concept','Conceptual','Croquis de proyecto'],['Luz y presentación','sketch','Técnico ilustrado','Tinta y sol'],
 ['Lápiz y tinta','sketch-pencil','Lápiz','Grafito'],['Lápiz y tinta','sketch-pencil-soft','Lápiz suave','Trazo tenue'],
 ['Lápiz y tinta','sketch-pencil-bold','Grafito intenso','Sombreado tramado'],['Lápiz y tinta','sketch-charcoal','Carbón','Carboncillo'],
 ['Lápiz y tinta','sketch-ink','Tinta negra','Contornos definidos'],['Lápiz y tinta','sketch-ink-light','Tinta fina','Plumilla ligera'],
 ['Lápiz y tinta','sketch-sepia','Plumilla sepia','Papel cálido'],['Lápiz y tinta','sketch-mono','Gris suave','Dibujo monocromo'],
 ['Grabados y editorial','sketch-engraving','Grabado lineal','Tramas finas'],['Grabados y editorial','sketch-blue-engraving','Grabado azul','Tinta azul y tramas'],
 ['Grabados y editorial','sketch-monochrome-contrast','Grabado monocromo','Negro y blanco'],['Grabados y editorial','sketch-vintage-print','Impresión vintage','Tinta envejecida'],
 ['Grabados y editorial','sketch-comic','Historieta','Tinta editorial'],['Grabados y editorial','sketch-comic-teal','Historieta turquesa','Líneas azules'],
 ['Color y acuarela','sketch-marker','Marcadores','Colores suaves'],['Color y acuarela','sketch-watercolor','Acuarela','Lavado de color'],
 ['Color y acuarela','sketch-watercolor-warm','Acuarela cálida','Ocres'],['Color y acuarela','sketch-watercolor-cool','Acuarela fría','Tonos verdosos'],
 ['Color y acuarela','sketch-bluewash','Lavado azul','Tonos fríos'],['Color y acuarela','sketch-red-ochre','Rojo y ocre','Lámina cálida'],
 ['Color y acuarela','sketch-graphic','Rojo y azul','Ilustración gráfica'],['Color y acuarela','sketch-technical-red','Tinta roja','Plano ilustrado'],
 ['Urbano','sketch-urban','Urbano rápido','Líneas y tramas'],['Urbano','sketch-blueprint','Blueprint','Azul técnico']
 ].map(function(st){return '<button type="button" data-render-family="'+st[0]+'" data-render-style="'+st[1]+'" aria-pressed="false" title="'+st[2]+' · '+st[3]+'"><span class="styleThumb" data-kind="'+st[1]+'"></span><span><strong>'+st[2]+'</strong><small>'+st[3]+'</small></span></button>';}).join('')+
 '</div></div><small class="styleGalleryNote">Los croquis usan sol, luz y sombras cuando WebGL está disponible. Los estilos no cambian la geometría.</small></div></div>'+
 '<details class="ioMenu"><summary class="btn" title="Import" aria-label="Import">'+ico('folder')+'<span>Import</span></summary><div>'+
 tool('open','Open .3DJSON','folder')+tool('cad','Import DWG / DXF','folder')+tool('plan','Use CAD2D plan','view')+'</div></details>'+
 '<details class="viewSaveMenu"><summary class="btn" title="Guardar vista en PNG, JPG o PDF" aria-label="Save view">'+ico('export')+'<span>Save view</span></summary>'+
 '<div class="viewSavePanel" role="group" aria-label="Exportar vista 3D">'+
 '<label>Formato<select data-save-format><option value="png">PNG</option><option value="jpg">JPG</option><option value="pdf">PDF</option></select></label>'+
 '<label>Tamaño<select data-save-size><option value="viewport">Vista actual</option><option value="hd">1920 × 1080 px</option><option value="2k">2560 × 1440 px</option><option value="4k">3840 × 2160 px</option><option value="a4">A4 horizontal</option><option value="a3">A3 horizontal</option><option value="a2">A2 horizontal</option><option value="custom">Personalizado (píxeles)</option></select></label>'+
 '<div class="saveRow"><label>Ancho (px)<input data-save-width type="number" min="128" max="8192" step="1" value="1920"></label>'+
 '<label>Alto (px)<input data-save-height type="number" min="128" max="8192" step="1" value="1080"></label></div>'+
 '<label>Resolución de impresión (DPI)<select data-save-dpi><option value="96">96</option><option value="150">150</option><option value="300" selected>300</option></select></label>'+
 '<output class="saveViewInfo">1920 × 1080 píxeles</output>'+
 '<button type="button" class="btn" data-save-go>Guardar imagen / PDF</button>'+
 '</div></details>'+
 '<details class="ioMenu"><summary class="btn" title="Export" aria-label="Export">'+ico('export')+'<span>Export</span></summary><div>'+
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
 }).join('')+'</div><div class="catalogItems"></div>'+
 ['n','s','e','w','ne','nw','se','sw'].map(function(d){
  return '<div class="archGrip '+d+'" data-arch-grip="'+d+'" title="Arrastrá para cambiar el tamaño" aria-hidden="true"></div>';
 }).join('')+'</aside>'+
 '<div class="view"><div class="rulerX" hidden aria-hidden="true"></div><div class="rulerY" hidden aria-hidden="true"></div>'+
 '<div class="snapMarker" hidden aria-hidden="true"></div><div class="cad3dGripLayer" aria-label="Pinzamientos paramétricos 3D"></div><nav class="viewNav" aria-label="Vistas 3D">'+
 '<div class="viewNavTop"><div class="viewCube" tabindex="0" role="group" aria-label="Cubo de vistas 3D: clic en caras, aristas o esquinas; arrastrar para orbitar. Flechas para giro fino" title="ViewCube · Faces, edges, corners · Drag to orbit">'+
 '<svg class="cubeScene" viewBox="0 0 100 100" aria-hidden="true"></svg>'+
 '</div><button type="button" class="orbitBall" aria-label="Órbita: arrastrar el anillo para girar, arrastrar el centro para desplazar y rueda para zoom" title="Orbit ring · Center pan · Wheel zoom"><svg viewBox="0 0 72 72" aria-hidden="true">'+
  '<circle cx="36" cy="36" r="33" fill="#e9f1f8" stroke="#24415b" stroke-width="1.8"/>'+
 '<circle cx="36" cy="36" r="29.3" fill="none" stroke="#fafcff" stroke-width="1.3"/>'+
 '<path d="M14 29 A25 25 0 0 1 45 13" fill="none" stroke="#1679df" stroke-width="2.9" stroke-linecap="round"/>'+
 '<path d="M41 10l7 1-5 6" fill="none" stroke="#1679df" stroke-width="2.9" stroke-linejoin="round"/>'+
 '<path d="M49 15 A25 25 0 0 1 58 43" fill="none" stroke="#e53b39" stroke-width="2.9" stroke-linecap="round"/>'+
 '<path d="M53 40l6 6 2-8" fill="none" stroke="#e53b39" stroke-width="2.9" stroke-linejoin="round"/>'+
 '<path d="M54 49 A25 25 0 0 1 27 59" fill="none" stroke="#27a444" stroke-width="2.9" stroke-linecap="round"/>'+
 '<path d="M31 55l-7 5 9 3" fill="none" stroke="#27a444" stroke-width="2.9" stroke-linejoin="round"/>'+
 '<path d="M17 53 A25 25 0 0 1 13 33" fill="none" stroke="#27a444" stroke-width="2.9" stroke-linecap="round"/>'+
 '<path d="M9 36l3-7 5 6" fill="none" stroke="#27a444" stroke-width="2.9" stroke-linejoin="round"/>'+
 '<path d="M36 19v34M19 36h34" fill="none" stroke="#1b2835" stroke-width="3" stroke-linecap="round"/>'+
 '<path d="M36 19l-5 6m5-6 5 6M36 53l-5-6m5 6 5-6M19 36l6-5m-6 5 6 5M53 36l-6-5m6 5-6 5" fill="none" stroke="#1b2835" stroke-width="2.6" stroke-linejoin="round"/>'+
 '<circle cx="36" cy="36" r="3" fill="#1b2835"/></svg></button></div><select class="cad3dViewSelect" aria-label="Vista de cámara CAD3D"></select></nav>'+
 '<div class="placementGuide" hidden aria-hidden="true"></div><output class="dynReadout" aria-live="off"></output><div class="cad3dContextMenu" role="menu" aria-label="CAD3D context menu" hidden></div>'+
 '<div class="viewShortcuts" role="group" aria-label="3D view shortcuts"><button type="button" data-view-shortcut="top">Top</button><button type="button" data-view-shortcut="front">Front · F</button><button type="button" data-view-shortcut="left">Left · L</button><button type="button" data-view-shortcut="right">Right · R</button><button type="button" data-view-shortcut="iso">Iso</button><button type="button" data-view-shortcut="perspective">3D</button><button type="button" data-view-shortcut="fit">Fit</button><button type="button" data-view-shortcut="zoom-in" aria-label="Zoom in">+</button><button type="button" data-view-shortcut="zoom-out" aria-label="Zoom out">−</button><button type="button" data-view-shortcut="views">Views · V</button></div></div>'+
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
 syncViewControls();renderNavigationCube();
 viewSelect.addEventListener('change',function(){setViewPreset(this.value);});
 root.querySelector('[data-camera-create]').addEventListener('click',cad3dCreateCamera);
 root.querySelector('[data-camera-back]').addEventListener('click',function(){cad3dWalkStep(-1);});
 root.querySelector('[data-camera-forward]').addEventListener('click',function(){cad3dWalkStep(1);});
 root.querySelector('.camera3DList').addEventListener('change',function(){cad3dActivateCamera(this.value);});
 root.querySelector('.viewShortcuts').addEventListener('click',function(e){
  var key=e.target.closest('[data-view-shortcut]')?.dataset.viewShortcut;
  if(!key)return;
  if(key==='fit')fit3DModel();
  else if(key==='zoom-in')cad3dZoomStep(1);
  else if(key==='zoom-out')cad3dZoomStep(-1);
  else if(key==='views'){viewSelect.focus();viewSelect.click();}
  else setViewPreset(key);
 });
 bindOrbitBall(root.querySelector('.orbitBall'));
 bindNavigationCube(root.querySelector('.viewCube'));
 root.querySelector('[data-max]').addEventListener('click',toggleMaximize);
 root.querySelector('.sideGrip').addEventListener('pointerdown',beginSideResize);
 root.querySelector('.head').addEventListener('pointerdown',moveWindow);
 cad3dToolbarLayout=cad3dEnableMovableToolbars();
 cad3dBindCompactBars();
 root.querySelector('.resizeGrip').addEventListener('pointerdown',beginResize);
 root.querySelector('.edgeResizeR').addEventListener('pointerdown',beginResize);
 root.querySelector('.edgeResizeB').addEventListener('pointerdown',beginResize);
 root.addEventListener('click',function(e){
  var button=e.target.closest('.tools [data-action], .cad3dBar [data-action]'), menu=e.target.closest('.ioMenu');
  root.querySelectorAll('.ioMenu[open]').forEach(function(openMenu){if(button||openMenu!==menu)openMenu.open=false;});
  if(button){if(menu)menu.querySelector('summary').focus();if(button.dataset.action==='sketch'){
   var panel=root.querySelector('.stylePanel');panel.hidden=!panel.hidden;
   root.querySelector('.styleLaunch').setAttribute('aria-expanded',String(!panel.hidden));
  }else action(button.dataset.action);}
 });
 root.querySelector('.cad3dProfileTools').addEventListener('click',function(e){
  var button=e.target.closest('[data-action]');if(button)action(button.dataset.action);
 });
 root.querySelector('.cad3dModelTools').addEventListener('click',function(e){
  var button=e.target.closest('[data-solid-command]');if(!button)return;
  var command=button.dataset.solidCommand;
  if(command==='extrude')cad3dExtrudeSelection();
  else if(command==='extrudeface')action('extrudeface');
  else if(['union','subtract','intersect'].includes(command))action(command);
 });
 root.querySelector('.cad3dOBJInput').addEventListener('change',async function(e){
  var file=e.target.files&&e.target.files[0];if(!file)return;
  try{await cad3dImportMeshFile(file);}catch(err){text('Error al importar 3D: '+err.message);}
  this.value='';
 });
 root.querySelector('.cad3dBlockSearch').addEventListener('input',cad3dBlockCatalogItems);
 root.querySelector('.block3DPanel').addEventListener('click',function(e){
  var tab=e.target.closest('[data-block-kind]');
  if(tab){cad3dBlockView=tab.dataset.blockKind;cad3dBlockCategory='all';cad3dRefreshBlockCatalog();return;}
  var category=e.target.closest('[data-block-category]');
  if(category){cad3dBlockCategory=category.dataset.blockCategory;cad3dRefreshBlockCatalog();return;}
  var button=e.target.closest('[data-3d-block]');if(!button)return;
  var id=button.dataset['3dBlock'];if(!CAD3D_COMPONENTS[id])return;
  activeCAD3DBlock=id;setPlacement('block3d');root.querySelector('.block3DMenu').open=false;
  text('Bloque '+CAD3D_COMPONENTS[id].name+' · clic para colocarlo');
 });
 cad3dRefreshBlockCatalog();
 root.querySelector('[data-verify-solids]').addEventListener('click',verify3DSolids);
 // Keep the complete Visual Style gallery alongside the six quick-access cube buttons.
 // Float the gallery above dockable toolbars so it is not clipped by their overflow.
 var fullStylePanel=root.querySelector('.stylePanel');
 root.appendChild(fullStylePanel);
 root.querySelector('.styleLaunch').addEventListener('click',function(){
  var panel=root.querySelector('.stylePanel'),opening=panel.hidden;
  panel.hidden=!opening;
  this.setAttribute('aria-expanded',String(opening));
  if(opening){
   var rr=root.getBoundingClientRect(),br=this.getBoundingClientRect();
   var width=panel.offsetWidth||360,height=panel.offsetHeight||400;
   panel.style.left=Math.max(8,Math.min(rr.width-width-8,br.left-rr.left))+'px';
   panel.style.top=Math.max(45,Math.min(rr.height-height-8,br.bottom-rr.top+6))+'px';
  }
 });
 var gallerySearch=root.querySelector('.styleGallerySearch');
 gallerySearch.addEventListener('input',function(){
  var needle=this.value.toLocaleLowerCase().trim(),visible=0;
  root.querySelectorAll('.styleGrid [data-render-style]').forEach(function(b){
   var show=(b.textContent+' '+b.dataset.renderFamily).toLocaleLowerCase().includes(needle);
   b.hidden=!show;if(show)visible++;
  });
  root.querySelector('.styleGalleryCount').textContent=visible+' estilos';
 });
 gallerySearch.dispatchEvent(new Event('input'));
 root.querySelector('.styleGrid').addEventListener('click',function(e){
  var button=e.target.closest('[data-render-style]');if(!button)return;
  setVisualStyle(button.dataset.renderStyle);root.querySelector('.stylePanel').hidden=true;
  root.querySelector('.styleLaunch').setAttribute('aria-expanded','false');
 });
 renderStyleControls();
 cad3dMakeSunPanelMovable();
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
 root.querySelector('.viewSaveMenu').addEventListener('change',updateSaveViewSettings);
 root.querySelector('.viewSaveMenu').addEventListener('input',updateSaveViewSettings);
 root.querySelector('[data-save-go]').addEventListener('click',saveCAD3DView);
 updateSaveViewSettings();
 root.querySelector('.draftBar form').addEventListener('submit',function(e){e.preventDefault();run3DCommand();});
 root.querySelector('#cad3dCommand').addEventListener('keydown',function(ev){
  // Immediate view shortcuts even with the Command field focused.
  // Do not intercept numeric dimensions or modifier combinations.
  if(ev.isComposing||ev.ctrlKey||ev.metaKey||ev.altKey||ev.repeat)return;
  var key=ev.key.toUpperCase();
  if(this.value.trim()===''&&['T','F','L','R','B','Z','V','P','I','O','C','+','-'].includes(key)){
   ev.preventDefault();ev.stopPropagation();cad3dViewAlias(key);
  }
 });
 root.querySelector('#cad3dCommand').addEventListener('input',function(){
  var value=this.value.trim().toUpperCase();
  if(['T','F','L','R','B','Z','V','P','I','O','C','TOP','FRONT','LEFT','RIGHT','BACK','ZOOM','ZOOMEXTENTS'].includes(value)){
   this.value='';cad3dViewAlias(value);
  }
 });
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
 root.querySelector('.props').addEventListener('input',function(e){
  var field=e.target.closest('input[type="range"][data-opening-param]');
  if(!field)return;
  var host=records.find(function(r){return selected.length===1&&r.id===selected[0]&&editableRecord(r);});
  var op=(host?.openings||[]).find(function(o){return o.id===Number(field.dataset.openingParam);});
  if(!op||!['openAngle','openPercent'].includes(field.dataset.param))return;
  op[field.dataset.param]=Number(field.value);
  var output=root.querySelector('[data-opening-value="'+op.id+'"]');
  if(output)output.textContent=field.value+(field.dataset.param==='openPercent'?'%':'°');
  redraw();
 });
 root.querySelector('.props').addEventListener('change',change);
 root.querySelector('.props').addEventListener('click',clickProps);
 bind3DGripOverlay(root.querySelector('.cad3dGripLayer'));
 root.querySelector('.cad3dContextMenu').addEventListener('click',function(e){
  var cmd=e.target.closest('[data-context-action]')?.dataset.contextAction;
  if(!cmd)return;
  hideObjectContextMenu();
  if(cmd==='wall'){selectedOpeningId=null;renderProps();highlight();}
  else if(cmd==='properties')focus3DProperties();
 });
 root.addEventListener('pointerdown',function(e){
  if(!e.target.closest('.cad3dContextMenu'))hideObjectContextMenu();
 });
 var palette=root.querySelector('.archPalette');
 palette.addEventListener('click',clickArchPalette);
 palette.addEventListener('pointerdown',beginArchGesture);
 // Make the complete gallery a free floating workspace panel (not clipped by the viewport).
 root.appendChild(palette);
 if(cad3dPaletteRestore('architecture',palette)){
  var wasHidden=palette.hidden;palette.hidden=false;
  cad3dPaletteConstrain(palette);palette.hidden=wasHidden;
 }
 palette.addEventListener('pointerdown',function(){cad3dBringPaletteFront(palette);});

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
 function add(x,y,z){
  if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(z))return;
  b.minX=Math.min(b.minX,x);b.maxX=Math.max(b.maxX,x);
  b.minY=Math.min(b.minY,y);b.maxY=Math.max(b.maxY,y);
  b.minZ=Math.min(b.minZ,z);b.maxZ=Math.max(b.maxZ,z);
 }
 records.filter(visibleRecord).forEach(function(r){
  var halfW=(r.w||r.radius*2||2)/2,halfD=(r.d||r.radius*2||2)/2;
  if(r.type==='sphere')halfW=halfD=r.radius||1;
  var angle=(r.rot||0)*Math.PI/180;
  var ex=Math.abs(Math.cos(angle))*halfW+Math.abs(Math.sin(angle))*halfD;
  var ey=Math.abs(Math.sin(angle))*halfW+Math.abs(Math.cos(angle))*halfD;
  var height=r.type==='sphere'?(r.radius||1)*2:(r.h||2);
  add((r.x||0)-ex,(r.y||0)-ey,r.z||0);
  add((r.x||0)+ex,(r.y||0)+ey,(r.z||0)+height);
  if(r.type==='profile2d'&&Array.isArray(r.profilePoints)){
   var c=Math.cos(angle),sn=Math.sin(angle);
   r.profilePoints.forEach(function(p){add((r.x||0)+p[0]*c-p[1]*sn,(r.y||0)+p[0]*sn+p[1]*c,r.z||0);});
  }
 });
 if(underlay&&Array.isArray(underlay.segments)){
  underlay.segments.forEach(function(p){if(p.length>=4){add(p[0],p[1],0);add(p[2],p[3],0);}});
 }
 if(!Number.isFinite(b.minX))return {x:0,y:0,z:0,span:24,width:24,depth:24,height:4,empty:true};
 var width=Math.max(.1,b.maxX-b.minX),depth=Math.max(.1,b.maxY-b.minY),height=Math.max(.1,b.maxZ-b.minZ);
 return {x:(b.minX+b.maxX)/2,y:(b.minY+b.maxY)/2,z:(b.minZ+b.maxZ)/2,
  width:width,depth:depth,height:height,span:Math.max(2,width,depth,height*2),empty:false};
}
function fit3DModel(){
 var b=cad3dBounds(),view=root?.querySelector('.view');
 if(b.empty){text('No hay objetos visibles para centrar');return false;}
 if(!target)target=T?new T.Vector3(b.x,b.y,b.z):{x:b.x,y:b.y,z:b.z};
 else {target.x=b.x;target.y=b.y;target.z=b.z;}
 var aspect=view?Math.max(.25,view.clientWidth/Math.max(1,view.clientHeight)):1.5;
 if(viewMode==='ortho'){
  // OrthographicCamera half-height equals orbit.dist * .38.
  var top=activeView==='top'||activeView==='bottom';
  var spanX=top?b.width:b.span,spanY=top?b.depth:b.span;
  var half=Math.max(spanY/2,spanX/(2*aspect)) * 1.25;
  orbit.dist=clamp(half/.38,1.4,450);
 }else{
  var fov=50*Math.PI/180;
  orbit.dist=clamp(b.span*.75/Math.tan(fov/2),2,450);
 }
 applyViewCamera();
 text('Zoom Extents · objetos visibles centrados');
 return true;
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
  root.querySelector('.sunLaunch')?.setAttribute('aria-pressed',String(sunSettings.enabled));
 }
 if(sunGround)sunGround.visible=sunSettings.enabled&&sunSettings.onGround&&!['hidden','wire2d','wire3d'].includes(renderStyle);
 if(sunAmbient)sunAmbient.intensity=sunSettings.enabled?1.05:1.15;
 if(sunFill)sunFill.intensity=sunSettings.enabled?0.38:0.7;
 if(modelRoot)modelRoot.traverse(function(o){if(o.isMesh){
  o.receiveShadow=sunSettings.enabled&&sunSettings.onFaces&&!['wire2d','wire3d','hidden'].includes(renderStyle);
  o.castShadow=!['wire2d','wire3d','hidden'].includes(renderStyle);
  // Transparent glass must not block sunlight; all other meshes retain normal shadows.
  if(o.userData?.cadGlass){o.receiveShadow=false;o.castShadow=false;}
 }});
 if(scene&&scene.background&&typeof scene.background.setHex==='function'&&['shaded','shaded-edges','realistic'].includes(renderStyle))
  scene.background.setHex(sunSettings.enabled?0xc4d8e4:MODEL_BACKGROUND);
 if(sunGround&&sunGround.material&&sunGround.material.color&&typeof sunGround.material.color.setHex==='function')
  sunGround.material.color.setHex(sunSettings.enabled?0xd1cbc0:0x9ba5a8);
 if(!sunLight||!T)return;
 var bounds=cad3dBounds(),az=sunSettings.azimuth*Math.PI/180,el=sunSettings.elevation*Math.PI/180;
 var radius=Math.max(45,bounds.span*2),range=Math.max(7,Math.min(280,bounds.span*1.25));
 sunLight.target.position.set(bounds.x,bounds.y,bounds.z);scene.add(sunLight.target);
 sunLight.position.set(bounds.x+radius*Math.cos(el)*Math.cos(az),
  bounds.y+radius*Math.cos(el)*Math.sin(az),bounds.z+radius*Math.sin(el));
 sunLight.target.updateMatrixWorld();
 sunLight.intensity=sunSettings.enabled?2.35:2.1;
 sunLight.castShadow=sunSettings.enabled;
 sunLight.shadow.mapSize.set(2048,2048);
 var shadowCamera=sunLight.shadow.camera;
 shadowCamera.left=-range;shadowCamera.right=range;
 shadowCamera.top=range;shadowCamera.bottom=-range;
 shadowCamera.near=.5;shadowCamera.far=radius*3.5;
 sunLight.shadow.bias=-.00012;sunLight.shadow.normalBias=.014;sunLight.shadow.radius=2;
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
 if(which)cad3dEndZoom();
 placing=which;firstPoint=null;cursorPoint=null;cad3dDraftProfile=[];
 if(which&&['line','polyline','rectangle','circle','arc','wall','slab','floor','dist'].includes(which)){
  cad3dNavigationTool='select';cad3dSyncCompactBars();
 }
 cad3dUpdateDraftPreview();
 if(!root)return;
 root.querySelectorAll('.cad3dBar button[data-action],.cad3dProfileTools button[data-action]').forEach(function(b){
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
  rotate:'Rotate: escribí los grados en Command y pulsá Enter',dist:'Distancia: elegí dos puntos',
  extrudeface:'Extrude Face: indicá la distancia en Height (m) y hacé clic en una cara de BOX · Esc cancela'
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

/* Architectural plan presentation over the parametric 3D model.
   The overlay never replaces or edits actual wall/opening records. */
function cad3dRenderPlanWalls(){
 if(!root)return;
 var view=root.querySelector('.view');
 if(!view)return;
 var overlay=view.querySelector('.cad3dPlanWallOverlay');
 if(!overlay){
  overlay=document.createElementNS('http://www.w3.org/2000/svg','svg');
  overlay.classList.add('cad3dPlanWallOverlay');
  overlay.setAttribute('aria-hidden','true');
  view.appendChild(overlay);
 }
 var top=activeView==='top' || (viewMode==='ortho'&&orbit.el>1.555);
 var plan=renderStyle==='wire2d'&&top;
 overlay.style.display=plan?'block':'none';
 if(modelRoot){
  modelRoot.children.forEach(function(group){
   var isWall=records.some(function(r){return r.id===group.userData.owner&&r.type==='wall';});
   group.traverse(function(obj){
    if(obj.userData&&obj.userData.cadSketch) obj.visible=!(plan&&isWall);
   });
  });
 }
 if(!plan)return;
 var w=view.clientWidth,h=view.clientHeight;
 overlay.setAttribute('viewBox','0 0 '+w+' '+h);
 overlay.setAttribute('width',w);
 overlay.setAttribute('height',h);
 if(w<=0||h<=0)return;
 var xml=[],fmt=function(n){return Number(n).toFixed(2);};
 var project=function(rec,x,y,z){
  var a=(rec.rot||0)*Math.PI/180,c=Math.cos(a),sn=Math.sin(a);
  return pointOnScreen({x:(rec.x||0)+x*c-y*sn,y:(rec.y||0)+x*sn+y*c,z:(rec.z||0)+(z||0)},view);
 };
 var line=function(a,b,extra){
  xml.push('<line x1="'+fmt(a.x)+'" y1="'+fmt(a.y)+'" x2="'+fmt(b.x)+'" y2="'+fmt(b.y)+'" '+(extra||'')+'/>');
 };
 records.filter(function(r){return r.type==='wall'&&visibleRecord(r);}).forEach(function(r){
  var half=(r.w||0)/2,d=(r.d||.2)/2;
  // A doorway/open void must remain a gap on the architectural plan,
  // even when wall material is present above its lintel.
  var voids=(r.openings||[]).filter(function(o){
   return (o.kind==='door'||o.kind==='opening'||o.styleId==='open-door')&&(o.sill||0)<1.55;
  }).map(function(o){return {a:Math.max(-half,(o.offset||0)-(o.w||0)/2),
    b:Math.min(half,(o.offset||0)+(o.w||0)/2),o:o};}).filter(function(v){return v.b>v.a;})
    .sort(function(a,b){return a.a-b.a;});
  var start=-half,parts=[];
  voids.forEach(function(v){if(v.a>start+.0001)parts.push([start,v.a]);start=Math.max(start,v.b);});
  if(start<half-.0001)parts.push([start,half]);
  var selectedWall=selected.includes(r.id);
  xml.push('<g fill="none" stroke="'+(selectedWall?'#008ec4':'#171717')+'" stroke-width="'+(selectedWall?'2.5':'1.6')+'" stroke-linecap="square" stroke-linejoin="miter">');
  parts.forEach(function(p){
   var a=project(r,p[0],-d),b=project(r,p[1],-d),c=project(r,p[1],d),e=project(r,p[0],d);
   xml.push('<path d="M'+fmt(a.x)+' '+fmt(a.y)+'L'+fmt(b.x)+' '+fmt(b.y)+'L'+fmt(c.x)+' '+fmt(c.y)+'L'+fmt(e.x)+' '+fmt(e.y)+'Z"/>');
  });
  // Window openings: frame and glass represented as architectural plan lines.
  (r.openings||[]).filter(function(o){return o.kind==='window';}).forEach(function(o){
   var x=(o.offset||0),width=o.w||1;
   var a=project(r,x-width/2,-d),b=project(r,x+width/2,-d);
   var c=project(r,x-width/2,d),e=project(r,x+width/2,d);
   line(a,c,'stroke="#5e6872" stroke-width="1.4"');
   line(b,e,'stroke="#5e6872" stroke-width="1.4"');
   line(project(r,x-width/2,0),project(r,x+width/2,0),'stroke="#408da9" stroke-width="2"');
  });
  // Conventional door leaf and swing indication, without fake bottom frame.
  voids.filter(function(v){return v.o.kind==='door';}).forEach(function(v){
   var o=v.o,center=(v.a+v.b)/2,width=v.b-v.a;
   var hingeRight=/right/.test(String(o.styleId||'')),hx=hingeRight?v.b:v.a;
   var hinge=project(r,hx,0),tip=project(r,hx,hingeRight?width:-width);
   line(hinge,tip,'stroke="#687780" stroke-width="1.1"');
  });
  xml.push('</g>');
 });
 overlay.innerHTML=xml.join('');
}

function renderRulers(){
 cad3dRenderPlanWalls();
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
 // CAD2D-style drafting over the 3D XY workplane: ORTHO for lines and
 // polylines, OSNAP on true vertices and midpoints, never the visual grid alone.
 var x=p.x,y=p.y,snapped=false,tol=worldPerPixel(view)*9,nearest=tol*tol;
 var draftPoint=cad3dDraftProfile.length?cad3dDraftProfile[cad3dDraftProfile.length-1]:null;
 var base=draftPoint?{x:draftPoint[0],y:draftPoint[1]}:firstPoint;
 var useOrtho=draftModes.ortho&&base&&['wall','move','copy','line','polyline'].includes(placing);
 var axis=useOrtho?(Math.abs(p.x-base.x)>=Math.abs(p.y-base.y)?'x':'y'):null;
 function consider(sx,sy){
  if(!Number.isFinite(sx)||!Number.isFinite(sy))return;
  if(axis==='x'&&Math.abs(sy-base.y)>1e-7||axis==='y'&&Math.abs(sx-base.x)>1e-7)return;
  var dx=sx-p.x,dy=sy-p.y,d=dx*dx+dy*dy;
  if(d<nearest){nearest=d;x=sx;y=sy;snapped=true;}
 }
 if(draftModes.osnap){
  (underlay?.segments||[]).forEach(function(g){
   consider(g[0],g[1]);consider(g[2],g[3]);consider((g[0]+g[2])/2,(g[1]+g[3])/2);
  });
  records.forEach(function(r){
   if(!visibleRecord(r))return;
   if(r.type==='profile2d'&&Array.isArray(r.profilePoints)){
    var ang=(r.rot||0)*Math.PI/180,c=Math.cos(ang),sn=Math.sin(ang),pts=r.profilePoints;
    var world=pts.map(function(v){return [(r.x||0)+v[0]*c-v[1]*sn,(r.y||0)+v[0]*sn+v[1]*c];});
    world.forEach(function(v,i){
     consider(v[0],v[1]);
     if(i)consider((v[0]+world[i-1][0])/2,(v[1]+world[i-1][1])/2);
    });
    if(r.profileClosed&&world.length>2){
     var first=world[0],last=world[world.length-1];
     consider((first[0]+last[0])/2,(first[1]+last[1])/2);
    }
   }else if(r.type==='wall'){
    var a=(r.rot||0)*Math.PI/180,dx=Math.cos(a)*r.w/2,dy=Math.sin(a)*r.w/2;
    consider(r.x-dx,r.y-dy);consider(r.x+dx,r.y+dy);consider(r.x,r.y);
   }else consider(r.x,r.y);
  });
  cad3dDraftProfile.forEach(function(pt){consider(pt[0],pt[1]);});
 }
 if(axis==='x')y=base.y;
 if(axis==='y')x=base.x;
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
 g.fillStyle=isCad3DSketch(renderStyle)||renderStyle==='hidden'?'#f8f6ef':
  renderStyle==='monochrome'?'#e1e3e4':renderStyle==='realistic'?'#aa9b86':fill;
 if(!wire){g.globalAlpha=renderStyle==='xray'?.26:1;g.fill();g.globalAlpha=1;}
 g.strokeStyle=renderStyle==='wire2d'?'#000000':['sketch','hidden'].includes(renderStyle)?'#303537':renderStyle==='wire3d'?'#e6f3fb':stroke;
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
 var stroke=renderStyle==='wire2d'?'#111111':selectedObject?'#efc978':'#5a7585';
 var faces=[
  {v:[0,1,3,2],fill:'#243440'},{v:[4,6,7,5],fill:color||'#617788'},
  {v:[0,4,5,1],fill:'#2e4554'},{v:[2,3,7,6],fill:'#395569'},
  {v:[0,2,6,4],fill:'#425a68'},{v:[1,5,7,3],fill:'#4e6a7b'}
 ];
 faces.sort(function(a,b){return b.v.reduce(function(n,i){return n+pts[i].y;},0)-a.v.reduce(function(n,i){return n+pts[i].y;},0);});
 faces.forEach(function(face){fallbackPolygon(face.v.map(function(i){return pts[i];}),face.fill,stroke,selectedObject?1.8:.85);});
 if(renderStyle==='wire2d'){
  fallbackCtx.fillStyle='#000000';
  pts.forEach(function(p){fallbackCtx.beginPath();fallbackCtx.arc(p.x,p.y,2,0,Math.PI*2);fallbackCtx.fill();});
 }
}
function fallbackDraw(){
 if(!fallbackCanvas||!fallbackCtx||root?.hidden)return;
 var ctx=fallbackCtx,w=fallbackCanvas.clientWidth,h=fallbackCanvas.clientHeight;
 if(w<=0||h<=0)return;
 var projection=fallbackProjector();
 ctx.clearRect(0,0,w,h);ctx.fillStyle=renderStyle==='wire2d'?'#ffffff':
  CAD3D_SKETCH_PRESETS[renderStyle]?'#'+CAD3D_SKETCH_PRESETS[renderStyle].bg.toString(16).padStart(6,'0'):
  ['hidden','monochrome'].includes(renderStyle)?'#f4f1e8':MODEL_BACKGROUND;ctx.fillRect(0,0,w,h);
 ctx.lineWidth=.65;ctx.strokeStyle=MODEL_GRID;
 if(draftModes.grid&&!isCad3DSketch(renderStyle)&&!['hidden','wire2d'].includes(renderStyle))for(var i=-20;i<=20;i++){
  var a=projection(i,-20,0),b=projection(i,20,0),c=projection(-20,i,0),d=projection(20,i,0);
  ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.moveTo(c.x,c.y);ctx.lineTo(d.x,d.y);ctx.stroke();
 }
 var origin=projection(0,0,0);
 ctx.strokeStyle=renderStyle==='wire2d'?'#000000':isCad3DSketch(renderStyle)?'#8d918e':'#7191a2';ctx.lineWidth=1;
 ctx.beginPath();ctx.moveTo(origin.x-4,origin.y);ctx.lineTo(origin.x+4,origin.y);ctx.moveTo(origin.x,origin.y-4);ctx.lineTo(origin.x,origin.y+4);ctx.stroke();
 if(underlay?.segments?.length){
  ctx.strokeStyle=renderStyle==='wire2d'?'#000000':'#83a9c4';ctx.lineWidth=1.1;ctx.setLineDash([]);
  ctx.beginPath();
  underlay.segments.forEach(function(p){
   var a=projection(p[0],p[1],0),b=projection(p[2],p[3],0);
   if((a.x<0&&b.x<0)||(a.x>w&&b.x>w)||(a.y<0&&b.y<0)||(a.y>h&&b.y>h))return;
   ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);
  });
  ctx.stroke();
 }
 records.filter(visibleRecord).forEach(function(rec){
  if(rec.type==='profile2d'){
   var points=rec.profilePoints||[],angle=(rec.rot||0)*Math.PI/180,c=Math.cos(angle),sn=Math.sin(angle);
   ctx.beginPath();points.forEach(function(p,i){var x=rec.x+c*p[0]-sn*p[1],y=rec.y+sn*p[0]+c*p[1],v=projection(x,y,rec.z||0);if(i)ctx.lineTo(v.x,v.y);else ctx.moveTo(v.x,v.y);});
   if(rec.profileClosed)ctx.closePath();
   var active=selected.includes(rec.id);
   if(active&&rec.profileClosed){ctx.fillStyle='rgba(255,205,96,.19)';ctx.fill();}
   ctx.strokeStyle=active?'#ffcf60':'#82c6df';ctx.lineWidth=active?2.6:1.6;ctx.stroke();
   if(active)points.forEach(function(p){var x=rec.x+c*p[0]-sn*p[1],y=rec.y+sn*p[0]+c*p[1],v=projection(x,y,rec.z||0);ctx.fillStyle='#ffcf60';ctx.fillRect(v.x-3.5,v.y-3.5,7,7);});
  }else if(rec.type==='wall'||rec.type==='slab'){
   architectureParts(rec,function(w,d,h,x,y,z,color,slope){
    fallbackBox(projection,rec,w,d,h,x,y,z,'#'+color.toString(16).padStart(6,'0'),slope);
   });
  }else if(rec.type==='box'||rec.type==='block3d'){
   fallbackBox(projection,rec,rec.w,rec.d,rec.h,0,0,0,rec.type==='block3d'?'#a58a69':'#648b9f');
  }else if(rec.type==='sphere'){
   var p=projection(rec.x,rec.y,rec.z+rec.radius),radius=Math.max(4,rec.radius*p.scale);
   var grad=ctx.createRadialGradient(p.x-radius*.25,p.y-radius*.25,1,p.x,p.y,radius);grad.addColorStop(0,'#b2cad7');grad.addColorStop(1,'#435b6d');
   ctx.fillStyle=isCad3DSketch(renderStyle)?'#f7f5ee':grad;
   ctx.strokeStyle=renderStyle==='wire2d'?'#000000':isCad3DSketch(renderStyle)?'#2e3334':selected.includes(rec.id)?'#efc978':'#5e8399';
   ctx.beginPath();ctx.arc(p.x,p.y,radius,0,Math.PI*2);if(renderStyle!=='wire2d')ctx.fill();ctx.stroke();
  }else if(rec.type==='cylinder'||rec.type==='cone'){
   var low=projection(rec.x,rec.y,rec.z),high=projection(rec.x,rec.y,rec.z+rec.h),rad=Math.max(4,rec.radius*low.scale);
   ctx.fillStyle=isCad3DSketch(renderStyle)?'#f7f5ee':'#547b91';
   ctx.strokeStyle=renderStyle==='wire2d'?'#000000':isCad3DSketch(renderStyle)?'#2e3334':selected.includes(rec.id)?'#efc978':'#789aaa';ctx.lineWidth=1.4;
   ctx.beginPath();ctx.moveTo(low.x-rad,low.y);ctx.lineTo(rec.type==='cone'?high.x:high.x-rad,high.y);ctx.lineTo(rec.type==='cone'?high.x:high.x+rad,rec.type==='cone'?high.y:high.y);ctx.lineTo(low.x+rad,low.y);ctx.closePath();if(renderStyle!=='wire2d')ctx.fill();ctx.stroke();
   ctx.beginPath();ctx.ellipse(low.x,low.y,rad,rad*.22,0,0,Math.PI*2);ctx.stroke();
  }else if(rec.type==='boolean'&&rec.triangles?.length){
   var p=rec.triangles,angle=(rec.rot||0)*Math.PI/180,cos=Math.cos(angle),sin=Math.sin(angle);
   var vertex=function(i){return projection(rec.x+p[i]*cos-p[i+1]*sin,rec.y+p[i]*sin+p[i+1]*cos,rec.z+p[i+2]);};
   ctx.strokeStyle=renderStyle==='wire2d'?'#000000':isCad3DSketch(renderStyle)?'#2e3334':'#789ab3';ctx.lineWidth=1;
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
 hideObjectContextMenu();root.hidden=true;launcher.setAttribute('aria-pressed','false');dragging=null;
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
 renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
 root.querySelector('.view').appendChild(renderer.domElement);
 sunAmbient=new T.HemisphereLight(0xdceefb,0x918c83,1.15);scene.add(sunAmbient);
 sunLight=new T.DirectionalLight(0xffeed1,2.1);sunLight.position.set(-8,-6,16);scene.add(sunLight);
 sunFill=new T.DirectionalLight(0xc4e4fa,.7);sunFill.position.set(7,9,7);scene.add(sunFill);
 // The grid is lines, not a shadow receiver. Keep visual ground separate from editable model.
 sunGround=new T.Mesh(new T.PlaneGeometry(2000,2000),
  new T.MeshStandardMaterial({color:0xd1cbc0,roughness:.98,metalness:0,side:T.DoubleSide}));
 sunGround.position.z=-.03;sunGround.receiveShadow=true;sunGround.castShadow=false;
 sunGround.renderOrder=0;scene.add(sunGround);
 gridHelper=new T.GridHelper(60,60,0x6e8391,new T.Color(MODEL_GRID));gridHelper.rotation.x=Math.PI/2;scene.add(gridHelper);
 axesHelper=new T.AxesHelper(2);scene.add(axesHelper);
 modelRoot=new T.Group();scene.add(modelRoot);raycaster=new T.Raycaster();
 underlayGroup=new T.Group();scene.add(underlayGroup);if(underlay)drawUnderlay();
 bindCanvas(renderer.domElement);resize();applyViewCamera();applyRenderStyle();applySunSettings();
}
function updateCamera(){
 renderNavigationCube();
 if(!camera){scheduleFallbackDraw();render3DGrips();return;}
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
 camera.updateMatrixWorld();renderRulers();render3DGrips();
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
function hideObjectContextMenu(){
 if(!root)return;
 var menu=root.querySelector('.cad3dContextMenu');
 if(menu){menu.hidden=true;menu.innerHTML='';}
}
function focus3DProperties(){
 if(!root||!selected.length)return;
 renderProps();highlight();
 var props=root.querySelector('.props');
 var panel=props?.closest('.panel')||props;
 if(panel&&typeof panel.scrollIntoView==='function')panel.scrollIntoView({block:'nearest'});
 var control=props?.querySelector(selectedOpeningId!=null?'select[data-opening-style],input[data-opening]':'input[data-key],select[data-object-style]');
 if(control&&typeof control.focus==='function')control.focus({preventScroll:true});
}
function showObjectContextMenu(e){
 if(!root||!selected.length){hideObjectContextMenu();return;}
 var menu=root.querySelector('.cad3dContextMenu'),view=root.querySelector('.view');
 if(!menu||!view)return;
 var host=records.find(function(r){return selected.includes(r.id);});
 var opening=host?.openings?.find(function(o){return o.id===selectedOpeningId;});
 var label=opening?(opening.kind==='door'?'Door':opening.kind==='window'?'Window':'Opening')+' #'+opening.id:
  (host?.type||'Object').toUpperCase()+' #'+(host?.id||'?');
 menu.innerHTML='<span class="contextObject">'+escapeHtml(label)+'</span>'+
  '<button type="button" role="menuitem" data-context-action="properties">Properties</button>'+
  (opening?'<button type="button" role="menuitem" data-context-action="wall">Select host wall</button>':'');
 var rect=view.getBoundingClientRect();
 menu.hidden=false;
 var maxX=Math.max(4,rect.width-menu.offsetWidth-5),maxY=Math.max(4,rect.height-menu.offsetHeight-5);
 menu.style.left=Math.min(Math.max(4,e.clientX-rect.left),maxX)+'px';
 menu.style.top=Math.min(Math.max(4,e.clientY-rect.top),maxY)+'px';
}

// Max/3ds-style view aliases. These control camera only, never mutate CAD records.
// T=Top, L=Left, R=Right, B=Back, Z=Zoom.
var cad3dZoomActive=false;
function cad3dEndZoom(){
 cad3dZoomActive=false;
 if(root)root.querySelector('.view').style.cursor='';
}
function cad3dStartZoom(){
 setPlacement(null);
 cad3dZoomActive=true;
 root.querySelector('.view').style.cursor='zoom-in';
 text('ZOOM · clic para acercar · Shift+clic para alejar · arrastrar verticalmente para zoom · Esc para salir');
}
function cad3dZoomStep(direction){
 orbit.dist=clamp(orbit.dist*(direction>0?.8:1.25),1.4,450);
 if(viewMode==='walk'){
  target.x-=Math.cos(orbit.az)*(direction>0?.7:-.7);
  target.y-=Math.sin(orbit.az)*(direction>0?.7:-.7);
 }
 applyViewCamera();
 text('Zoom '+(direction>0?'+':'−')+' · '+(viewMode==='ortho'?'ortogonal':viewMode==='walk'?'peatonal':'perspectiva'));
}
function cad3dViewMenu(){
 var picker=root&&root.querySelector('.cad3dViewSelect');
 if(!picker)return false;
 picker.focus({preventScroll:true});
 if(typeof picker.showPicker==='function'){try{picker.showPicker();return true;}catch(_err){}}
 // Accessibility fallback: an expanded native select, restored on selection/blur.
 picker.size=viewPresets.length+1;picker.style.position='absolute';picker.style.zIndex='60';
 function closePicker(){picker.removeAttribute('size');picker.style.position='';picker.style.zIndex='';}
 picker.addEventListener('change',closePicker,{once:true});
 picker.addEventListener('blur',closePicker,{once:true});
 return true;
}
function cad3dSetProjection(mode){
 if(mode!=='ortho'&&mode!=='perspective')return false;
 if(viewMode==='walk')viewMode='perspective';
 viewMode=mode;activeView=mode==='perspective'?'perspective':'orbit';
 syncViewControls();applyViewCamera();
 text(mode==='ortho'?'Orthographic · proyección paralela con orientación conservada':'Perspective · proyección cónica con orientación conservada');
 return true;
}
function cad3dOrthographicView(){return cad3dSetProjection('ortho');}
function cad3dCreateCamera(){
 var entry={id:'camera-'+camera3DSequence,name:'Cámara '+camera3DSequence,position:{x:target.x,y:target.y,z:target.z},az:orbit.az,el:orbit.el,dist:orbit.dist,mode:viewMode};
 camera3DSequence++;saved3DCameras.push(entry);
 var list=root.querySelector('.camera3DList');
 list.add(new Option(entry.name,entry.id));list.value=entry.id;
 text(entry.name+' guardada · Utilizá Adelante/Atrás para recorrer');
 return true;
}
function cad3dActivateCamera(id){
 if(!id){cad3dViewMenu();return true;}
 var entry=saved3DCameras.find(function(c){return c.id===id;});
 if(!entry)return false;
 target.x=entry.position.x;target.y=entry.position.y;target.z=entry.position.z;
 orbit.az=entry.az;orbit.el=entry.el;orbit.dist=entry.dist;
 viewMode=entry.mode;activeView='orbit';
 syncViewControls();applyViewCamera();
 text(entry.name+' activada');return true;
}
function cad3dCameraMenu(){
 var list=root.querySelector('.camera3DList');
 if(!saved3DCameras.length){text('No hay cámaras guardadas · Crear cámara para guardar la perspectiva actual');root.querySelector('[data-camera-create]').focus();return true;}
 list.focus({preventScroll:true});
 if(typeof list.showPicker==='function'){try{list.showPicker();return true;}catch(_err){}}
 list.click();return true;
}
function cad3dWalkStep(direction){
 if(viewMode!=='walk'){
  viewMode='walk';activeView='walk';
  // The walk target is the actual eye position, not an orbit center.
  if(camera&&camera.position){target.x=camera.position.x;target.y=camera.position.y;}
  syncViewControls();
 }
 var step=.75*direction;
 target.x-=Math.cos(orbit.az)*step;
 target.y-=Math.sin(orbit.az)*step;
 applyViewCamera();
 text((direction>0?'Cámara adelante':'Cámara atrás')+' · 0,75 m');
 return true;
}
function cad3dViewAlias(word){
 var aliases={T:'top',TOP:'top',F:'front',FRONT:'front',L:'left',LEFT:'left',R:'right',RIGHT:'right',B:'back',BACK:'back',
  P:'perspective',PERSPECTIVE:'perspective',I:'iso',ISO:'iso'};
 var key=String(word||'').trim().toUpperCase();
 if(key==='C'||key==='CAMERA'||key==='CAMARAS'||key==='CÁMARAS')return cad3dCameraMenu();
 if(key==='Z'||key==='ZOOM'||key==='ZE'||key==='ZOOMEXTENTS'){cad3dEndZoom();fit3DModel();return true;}
 if(key==='ZI'||key==='ZOOMINTERACTIVE'){cad3dStartZoom();return true;}
 if(key==='V'||key==='VIEW'||key==='VIEWS'||key==='VISTA')return cad3dViewMenu();
 if(key==='O'||key==='ORTHO'||key==='ORTHOGRAPHIC')return cad3dOrthographicView();
 if(key==='P'||key==='PERSPECTIVE'||key==='PERSPECTIVA')return cad3dSetProjection('perspective');
 if(key==='+'||key==='PLUS'||key==='ZOOMIN'){cad3dZoomStep(1);return true;}
 if(key==='-'||key==='MINUS'||key==='ZOOMOUT'){cad3dZoomStep(-1);return true;}
 if(!Object.prototype.hasOwnProperty.call(aliases,key))return false;
 cad3dEndZoom();
 setViewPreset(aliases[key]);
 return true;
}
function bindCanvas(el){
 el.tabIndex=0;
 el.addEventListener('contextmenu',function(e){
  e.preventDefault();
  if(!dragging&&!placing){selectAt(e);showObjectContextMenu(e);}
 });
 el.addEventListener('pointerdown',function(e){
  if(dragging||e.button>2)return;
  e.preventDefault();el.focus({preventScroll:true});
  // Drawing takes precedence over navigation. Commit a point at pointerdown,
  // so a slight mouse movement or a lost pointerup cannot pan/orbit instead.
  // Alt+left, middle and right buttons remain available for navigation.
  if(e.button===0&&cad3dZoomActive&&cad3dNavigationTool!=='pan'&&!e.altKey&&!e.ctrlKey&&!e.metaKey){
   dragging={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false,zoom:true};
   el.setPointerCapture(e.pointerId);return;
  }
  if(e.button===0&&placing&&cad3dNavigationTool==='select'&&!e.altKey&&!e.ctrlKey&&!e.metaKey){
   hideObjectContextMenu();
   placeAt(e);
   return;
  }
  var pan=e.button===2||(e.button===1&&!e.shiftKey)||(e.button===0&&(cad3dNavigationTool==='pan'||(cad3dNavigationTool==='select'&&viewMode==='ortho')));
  dragging={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false,pan:pan};
  el.dataset.navigationDrag='false';
  el.setPointerCapture(e.pointerId);
 });
 el.addEventListener('pointermove',function(e){
  if(dragging&&dragging.id===e.pointerId){
   if(dragging.zoom){
    var delta=e.clientY-dragging.lastY;
    if(Math.hypot(e.clientX-dragging.x,e.clientY-dragging.y)>4)dragging.moved=true;
    if(dragging.moved&&Math.abs(delta)>.01){
     orbit.dist=clamp(orbit.dist*Math.exp(delta*.012),1.4,450);
     dragging.lastY=e.clientY;applyViewCamera();
    }
    return;
   }
   var dx=e.clientX-dragging.lastX,dy=e.clientY-dragging.lastY;
   if(dragging.moved||Math.hypot(e.clientX-dragging.x,e.clientY-dragging.y)>5){
    hideObjectContextMenu();
    dragging.moved=true;dragging.lastX=e.clientX;dragging.lastY=e.clientY;
    el.dataset.navigationDrag='true';
    if(dragging.pan)panView(dx,dy,el);
    else{
     orbit.az-=dx*.007;orbit.el=clamp(orbit.el+dy*.007,-1.45,1.45);
     if(viewMode==='ortho')activeView='orbit';
     syncViewControls();
    }
    updateCamera();
   }
  }
  if(!dragging?.moved){updatePlacementGuide(e);updateDynamicReadout(e);
   if(cad3dDraftProfile.length&&['line','polyline','rectangle','circle','arc'].includes(placing)){
    var gp=groundAt(e);if(gp)cad3dUpdateDraftPreview(assistedPoint(gp,root.querySelector('.view')));
   }
  }
 });
 el.addEventListener('pointerup',function(e){
  if(!dragging||dragging.id!==e.pointerId)return;
  if(dragging.zoom){
   var zoomClick=!dragging.moved;
   dragging=null;
   if(zoomClick){orbit.dist=clamp(orbit.dist*(e.shiftKey?1.25:.8),1.4,450);applyViewCamera();}
   return;
  }
  var click=!dragging.moved&&Math.hypot(e.clientX-dragging.x,e.clientY-dragging.y)<=5;
  dragging=null;delete el.dataset.navigationDrag;
  if(click&&e.button===0&&cad3dNavigationTool==='select'){hideObjectContextMenu();if(placing)placeAt(e);else selectAt(e);}
  if(click&&e.button===2&&!placing){selectAt(e);showObjectContextMenu(e);}
  if(draftModes.dyn)updateDynamicReadout(e);
 });
 el.addEventListener('lostpointercapture',function(e){if(dragging?.id===e.pointerId){dragging=null;delete el.dataset.navigationDrag;}});
 el.addEventListener('wheel',function(e){
  e.preventDefault();
  if(viewMode==='walk'){
   var step=clamp(Math.abs(e.deltaY)*.004,.08,1.4)*(e.deltaY>0?1:-1);
   target.x+=Math.cos(orbit.az)*step;target.y+=Math.sin(orbit.az)*step;
  }else orbit.dist=clamp(orbit.dist*Math.exp(e.deltaY*.001),1.4,450);
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
/* Validate architectural opening edits before changing the wall geometry. */
function openingFitsCADHost(host,item,excludeId){
 if(!host||!Number.isFinite(item.offset)||!Number.isFinite(item.w)||item.w<=0)return false;
 if(Math.abs(item.offset)+item.w/2>host.w/2+1e-6)return false;
 if(host.type==='wall'){
  if(!Number.isFinite(item.sill)||!Number.isFinite(item.h)||item.h<=0||item.sill<0||item.sill+item.h>host.h+1e-6)return false;
 }else if(host.type==='slab'){
  if(!Number.isFinite(item.offsetY)||!Number.isFinite(item.d)||item.d<=0||Math.abs(item.offsetY)+item.d/2>host.d/2+1e-6)return false;
 }
 return !(host.openings||[]).some(function(other){
  if(other.id===excludeId)return false;
  if(Math.abs(other.offset-item.offset)>=(other.w+item.w)/2+.015)return false;
  return host.type==='wall'?
   Math.max(other.sill,item.sill)<Math.min(other.sill+other.h,item.sill+item.h)+.015:
   Math.abs(other.offsetY-item.offsetY)<(other.d+item.d)/2+.015;
 });
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
 var op=Object.assign({id:serial++,kind:kind,styleId:style.id,offset:clamp(dx*c+dy*s,-maxX,maxX),w:style.w},
  kind==='door'||kind==='window'?cad3DOpeningDefaults(kind,style.id):{});
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
 rec.openings.push(op);selected=[rec.id];selectedOpeningId=op.id;redraw();renderProps();
 // Remain armed for another opening on this wall or a different wall.
 text((kind==='door'?'Puerta colocada':kind==='window'?'Ventana colocada':'Vano colocado')+
  ' · '+rec.openings.length+' abertura(s) en este elemento · clic para colocar otra · Enter / Esc termina');
}
function placeAt(e){
 if(!renderer&&!fallbackCanvas)return;
 if(['door','window','opening'].includes(placing)){placeOpening(e);return;}
 if(placing==='rotate'){root.querySelector('#cad3dCommand').focus();return;}
 if(placing==='extrudeface'){cad3dExtrudeFaceAt(e);return;}
 var pt=groundAt(e);if(!pt){text('Elegí Planta o Isométrica para trabajar sobre Z=0');return;}
 placePoint(assistedPoint(pt,root.querySelector('.view')));updatePlacementGuide(e);
}
function placePoint(pt){
 var kind=placing;
 if(['line','polyline','rectangle','circle','arc'].includes(kind)){cad3dDrawProfilePoint(pt);return;}
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
    dest.id=serial++;dest.openings?.forEach(function(o){o.id=serial++;});records.push(dest);
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
 }else if(kind==='block3d'){
  var spec=CAD3D_COMPONENTS[activeCAD3DBlock];if(!spec)return;
  rec=newRecord('block3d');
  Object.assign(rec,{blockId:activeCAD3DBlock,x:pt.x,y:pt.y,z:0,w:spec.w,d:spec.d,h:spec.h});
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

/* Hit-test the projected visible object area in the Canvas2D compatibility viewer. */
function cad3dFallbackPolyHit(points,x,y,tol){
 var inside=false;
 for(var i=0,j=points.length-1;i<points.length;j=i++){
  var a=points[i],b=points[j],dx=b.x-a.x,dy=b.y-a.y,dd=dx*dx+dy*dy;
  if(dd){var t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/dd));
   if(Math.hypot(x-a.x-t*dx,y-a.y-t*dy)<=tol)return true;}
  if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)inside=!inside;
 }
 return points.length>=3&&inside;
}
function cad3dFallbackSurfaceHit(rec,projection,x,y){
 var tol=renderStyle.startsWith('wire')?5:2;
 function box(w,d,h,ox,oy,oz,slope){
  var angle=(rec.rot||0)*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle),pts=[];
  for(var iz=0;iz<=1;iz++)for(var iy=0;iy<=1;iy++)for(var ix=0;ix<=1;ix++){
   var lx=ox+(ix-.5)*w,ly=oy+(iy-.5)*d;
   pts.push(projection(rec.x+lx*c-ly*s,rec.y+lx*s+ly*c,rec.z+oz+iz*h+lx*(slope||0)));
  }
  return [[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]].some(function(face){
   return cad3dFallbackPolyHit(face.map(function(i){return pts[i];}),x,y,tol);
  });
 }
 if(rec.type==='box'||rec.type==='block3d')return box(rec.w,rec.d,rec.h,0,0,0,0);
 if(rec.type==='wall'||rec.type==='slab'){
  var hit=false;architectureParts(rec,function(w,d,h,ox,oy,oz,color,slope){
   if(!hit)hit=box(w,d,h,ox,oy,oz,slope);
  });return hit;
 }
 if(rec.type==='sphere'){
  var p=projection(rec.x,rec.y,rec.z+rec.radius);
  return Math.hypot(x-p.x,y-p.y)<=Math.max(4,rec.radius*p.scale)+tol;
 }
 if(rec.type==='cylinder'||rec.type==='cone'){
  var low=projection(rec.x,rec.y,rec.z),high=projection(rec.x,rec.y,rec.z+rec.h),rad=Math.max(4,rec.radius*low.scale);
  return cad3dFallbackPolyHit([{x:low.x-rad,y:low.y},{x:rec.type==='cone'?high.x:high.x-rad,y:high.y},
   {x:rec.type==='cone'?high.x:high.x+rad,y:high.y},{x:low.x+rad,y:low.y}],x,y,tol)||
   Math.pow((x-low.x)/(rad+tol),2)+Math.pow((y-low.y)/(Math.max(3,rad*.22)+tol),2)<=1;
 }
 return false;
}
function selectAt(e){
 if(fallbackCanvas){
  var r=fallbackCanvas.getBoundingClientRect(),best=null,limit=34,projection=fallbackProjector();
  var wallOrSlab=fallbackHostHit(e,'wall')||fallbackHostHit(e,'slab');
  records.filter(editableRecord).forEach(function(rec){
   var p=projection(rec.x,rec.y,rec.type==='profile2d'?(rec.z||0):rec.z+(rec.h||rec.radius||1)*.5);
   var distance=Math.hypot((e.clientX-r.left)-p.x,(e.clientY-r.top)-p.y);
   if(rec.type==='profile2d'&&rec.profilePoints?.length){
    var pts=rec.profilePoints.map(function(v){var a=(rec.rot||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
     return projection(rec.x+c*v[0]-s*v[1],rec.y+s*v[0]+c*v[1],rec.z||0);});
    for(var j=0;j<pts.length-(rec.profileClosed?0:1);j++){
     var a=pts[j],b=pts[(j+1)%pts.length],dx=b.x-a.x,dy=b.y-a.y,dd=dx*dx+dy*dy;
     var t=dd?Math.max(0,Math.min(1,((e.clientX-r.left-a.x)*dx+(e.clientY-r.top-a.y)*dy)/dd)):0;
     distance=Math.min(distance,Math.hypot(e.clientX-r.left-a.x-t*dx,e.clientY-r.top-a.y-t*dy));
    }
   }
   if(distance<limit&&(!best||distance<best.distance))best={id:rec.id,distance:distance};
  });
  // Prefer the topmost projected solid surface, including off-centre face clicks.
  var px=e.clientX-r.left,py=e.clientY-r.top;
  var surface=records.filter(editableRecord).slice().reverse().find(function(rec){
   return cad3dFallbackSurfaceHit(rec,projection,px,py);
  });
  var id=surface?.id??wallOrSlab?.host.id??best?.id;
  selectedOpeningId=null;
  if(id==null){if(!e.shiftKey)selected=[];}
  else if(e.shiftKey)selected=selected.includes(id)?selected.filter(function(v){return v!==id;}):selected.concat(id);
  else selected=[id];
  renderProps();highlight();text(selected.length+' objetos seleccionados');
  return;
 }
 var box=renderer.domElement.getBoundingClientRect();
 var p=new T.Vector2(2*(e.clientX-box.left)/box.width-1,-2*(e.clientY-box.top)/box.height+1);
 raycaster.setFromCamera(p,camera);
 raycaster.params.Line.threshold=.16;
 var hits=[];modelRoot.traverse(function(o){if((o.isMesh||(o.isLine&&!o.userData.cadSketch))&&!o.userData.cadProfileHandles)hits.push(o);});
 var intersects=raycaster.intersectObjects(hits,false);
 var eligible=function(item){return records.some(function(r){return r.id===item.object.userData.owner&&editableRecord(r);});};
 var visibleHits=intersects.filter(eligible),front=visibleHits[0]||null;
 var tagged=front&&visibleHits.find(function(item){
  if(item.object.userData.openingId==null||item.object.userData.owner!==front.object.userData.owner)return false;
  var host=records.find(function(r){return r.id===item.object.userData.owner;});
  return item.distance<=front.distance+Math.max(.12,Math.min(.7,(host?.d||.2)*2+.2));
 });
 var hit=tagged||front,id=hit?hit.object.userData.owner:null;
 if(id===null){if(!e.shiftKey)selected=[];selectedOpeningId=null;}
 else if(e.shiftKey){
  var already=selected.includes(id);
  selected=already?selected.filter(function(n){return n!==id;}):selected.concat(id);
  selectedOpeningId=already?null:(hit.object.userData.openingId??null);
 }else{selected=[id];selectedOpeningId=hit.object.userData.openingId??null;}
 renderProps();highlight();text(selectedOpeningId!=null?'Carpintería seleccionada: Model, Width, Height y Sill en Properties':selected.length+' seleccionados · '+records.length+' objetos');
}

/* Parametric 3D grips: edit record dimensions, with hosted door/window voids preserved. */
var active3DGrip=null;
function grip3DWorldPoint(r,x,y,z){
 var a=(r.rot||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
 return {x:r.x+c*x-s*y,y:r.y+s*x+c*y,z:(r.z||0)+z};
}
function get3DGripDefinitions(r,openingId){
 var grips=[],opening=(r.openings||[]).find(function(o){return o.id===openingId;});
 function add(kind,label,x,y,z,axis){
  grips.push({kind:kind,label:label,point:grip3DWorldPoint(r,x,y,z),axis:axis});
 }
 if(opening&&(r.type==='wall'||r.type==='slab')){
  var o=opening,s=r.type==='slab',z=s?r.h:o.sill;
  add('opening-offset','Desplazar abertura',o.offset,s?o.offsetY:0,s?r.h:o.sill+o.h*.5,'x');
  add('opening-start','Jamba izquierda · ancho',o.offset-o.w/2,s?o.offsetY:0,s?r.h:o.sill+o.h*.5,'x');
  add('opening-end','Jamba derecha · ancho',o.offset+o.w/2,s?o.offsetY:0,s?r.h:o.sill+o.h*.5,'x');
  if(s){
   add('opening-depth-start','Profundidad inferior',o.offset,o.offsetY-o.d/2,r.h,'y');
   add('opening-depth-end','Profundidad superior',o.offset,o.offsetY+o.d/2,r.h,'y');
   add('opening-offset-y','Desplazar abertura en Y',o.offset,o.offsetY,r.h,'y');
  }else{
   add('opening-height','Altura de puerta o ventana',o.offset,0,o.sill+o.h,'z');
   add('opening-sill','Antepecho / solera',o.offset,0,o.sill,'z');
   if(['door','window'].includes(o.kind)&&
    (typeof cad3DOpeningConfig!=='function'||cad3DOpeningConfig(o).operation!=='fixed'))
    add('opening-motion','Abrir/cerrar hojas 3D',o.offset+o.w*.35,0,o.sill+o.h*.45,'motion');
  }
  return grips;
 }
 var height=r.type==='sphere'?(r.radius||1)*2:(r.h||1);
 add('move','Mover elemento',0,0,height*.5,'xy');
 if(r.type==='boolean')return grips;
 add('rotate','Girar elemento',(r.w||r.radius*2||2)/2+.55,(r.d||0)/2,height*.55,'rotate');
 if(['wall','slab','box'].includes(r.type)){
  add('length-start','Estirar extremo inicial',-r.w/2,0,height*.55,'x');
  add('length-end','Estirar extremo final',r.w/2,0,height*.55,'x');
  if(r.type==='wall')add('thickness','Espesor de muro',0,r.d/2,height*.55,'y');
  else {
   add('depth-start','Estirar profundidad inicial',0,-r.d/2,height*.55,'y');
   add('depth-end','Estirar profundidad final',0,r.d/2,height*.55,'y');
  }
  add('height','Altura / espesor',0,0,r.h,'z');
 }else if(r.type==='sphere'){
  add('radius','Radio de esfera',r.radius,0,r.radius,'x');
 }else if(r.type==='cone'||r.type==='cylinder'){
  add('radius','Radio de sólido',r.radius,0,r.h*.5,'x');
  add('height','Altura de sólido',0,0,r.h,'z');
 }
 return grips;
}
function valid3DGripCandidate(r){
 if(!Number.isFinite(r.x+r.y+r.z+(r.rot||0)))return false;
 var keys=['w','d','h','radius'];
 for(var k of keys)if(r[k]!=null&&(!Number.isFinite(r[k])||r[k]<.01||r[k]>1000))return false;
 if((r.type==='wall'||r.type==='slab')&&(r.openings||[]).some(function(o){
  return !openingFitsCADHost(r,o,o.id);
 }))return false;
 return true;
}
function apply3DGripCandidate(original,kind,delta,openingId){
 var r=JSON.parse(JSON.stringify(original));
 if(kind==='move'){
  if(!delta||!Number.isFinite(delta.x+delta.y))return null;
  r.x=original.x+delta.x;r.y=original.y+delta.y;
  return valid3DGripCandidate(r)?r:null;
 }
 if(!Number.isFinite(delta))return null;
 if(kind==='rotate'){r.rot=((original.rot||0)+delta)%360;return valid3DGripCandidate(r)?r:null;}
 var o=(r.openings||[]).find(function(v){return v.id===openingId;});
 if(kind.startsWith('opening-')){
  if(!o)return null;
  if(kind==='opening-offset')o.offset+=delta;
  else if(kind==='opening-start'){o.w-=delta;o.offset+=delta/2;}
  else if(kind==='opening-end'){o.w+=delta;o.offset+=delta/2;}
  else if(kind==='opening-height'&&r.type==='wall')o.h+=delta;
  else if(kind==='opening-sill'&&r.type==='wall')o.sill+=delta;
  else if(kind==='opening-depth-start'&&r.type==='slab'){o.d-=delta;o.offsetY+=delta/2;}
  else if(kind==='opening-depth-end'&&r.type==='slab'){o.d+=delta;o.offsetY+=delta/2;}
  else if(kind==='opening-offset-y'&&r.type==='slab')o.offsetY+=delta;
  else if(kind==='opening-motion'){
   var config=cad3DOpeningConfig(o),slide=['sliding','sectional'].includes(config.operation);
   var k=slide?'openPercent':'openAngle';o[k]=clamp(config[k]+delta,0,slide?100:120);
  }
  else return null;
  if(!Number.isFinite(o.w)||o.w<.05||o.w>1000)return null;
  if(r.type==='wall'&&(!Number.isFinite(o.h)||o.h<.05))return null;
  if(r.type==='slab'&&(!Number.isFinite(o.d)||o.d<.05))return null;
  return valid3DGripCandidate(r)?r:null;
 }
 var a=(original.rot||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
 if(kind==='length-start'||kind==='length-end'){
  var change=kind==='length-start'?-delta:delta,shift=delta/2;
  r.w=original.w+change;r.x=original.x+c*shift;r.y=original.y+s*shift;
  if(r.openings)r.openings.forEach(function(op){op.offset-=shift;});
 }else if(kind==='depth-start'||kind==='depth-end'){
  var diff=kind==='depth-start'?-delta:delta,advance=delta/2;
  r.d=original.d+diff;r.x=original.x-s*advance;r.y=original.y+c*advance;
  if(r.openings)r.openings.forEach(function(op){if(op.offsetY!=null)op.offsetY-=advance;});
 }else if(kind==='thickness'&&r.type==='wall')r.d=original.d+2*delta;
 else if(kind==='height')r.h=original.h+delta;
 else if(kind==='radius')r.radius=original.radius+delta;
 else return null;
 if(!valid3DGripCandidate(r))return null;
 return r;
}
function grip3DAxisVector(r,axis){
 var a=(r.rot||0)*Math.PI/180;
 if(axis==='z')return {x:0,y:0,z:1};
 if(axis==='y')return {x:-Math.sin(a),y:Math.cos(a),z:0};
 return {x:Math.cos(a),y:Math.sin(a),z:0};
}
function grip3DDragMeters(source,def,dx,dy){
 var view=root.querySelector('.view'),screen=pointOnScreen(def.point,view);
 if(def.axis==='xy'){
  var px=pointOnScreen({x:def.point.x+1,y:def.point.y,z:def.point.z},view),
      py=pointOnScreen({x:def.point.x,y:def.point.y+1,z:def.point.z},view);
  var ax=px.x-screen.x,ay=px.y-screen.y,bx=py.x-screen.x,by=py.y-screen.y;
  var det=ax*by-ay*bx;
  if(Math.abs(det)>5)return {x:clamp((dx*by-dy*bx)/det,-1000,1000),y:clamp((dy*ax-dx*ay)/det,-1000,1000)};
  var xa=ax*ax+ay*ay,ya=bx*bx+by*by;
  if(xa>ya&&xa>.001)return {x:clamp((dx*ax+dy*ay)/xa,-1000,1000),y:0};
  if(ya>.001)return {x:0,y:clamp((dx*bx+dy*by)/ya,-1000,1000)};
  return null;
 }
 var axis=grip3DAxisVector(source,def.axis);
 var projected=pointOnScreen({x:def.point.x+axis.x,y:def.point.y+axis.y,z:def.point.z+axis.z},view);
 var ux=projected.x-screen.x,uy=projected.y-screen.y,length2=ux*ux+uy*uy;
 if(length2<3)return null;
 return clamp((dx*ux+dy*uy)/length2,-1000,1000);
}
function grip3DValue(r,kind,openingId){
 var o=(r.openings||[]).find(function(v){return v.id===openingId;});
 var obj=kind.startsWith('opening-')?o:r;if(!obj)return '';
 var field=kind.startsWith('opening-')?
  ({'opening-offset':'offset','opening-start':'w','opening-end':'w','opening-height':'h','opening-sill':'sill',
   'opening-depth-start':'d','opening-depth-end':'d','opening-offset-y':'offsetY'})[kind]:
  ({'length-start':'w','length-end':'w','depth-start':'d','depth-end':'d','thickness':'d',
   'height':'h','radius':'radius','rotate':'rot'})[kind];
 if(kind==='move')return 'X '+r.x.toFixed(3)+' · Y '+r.y.toFixed(3);
 return field?Number(obj[field]).toFixed(3)+(field==='rot'?'°':' m'):'';
}
function render3DGrips(){
 if(!root)return;
 var layer=root.querySelector('.cad3dGripLayer');
 if(!layer||active3DGrip)return;
 if(!camera&&!fallbackCanvas||selected.length!==1||placing){layer.replaceChildren();return;}
 var r=records.find(function(v){return v.id===selected[0]&&editableRecord(v);});
 if(!r){layer.replaceChildren();return;}
 var view=root.querySelector('.view');
 var html='';
 get3DGripDefinitions(r,selectedOpeningId).forEach(function(def){
  var p=pointOnScreen(def.point,view);
  if(!Number.isFinite(p.x+p.y)||p.x<6||p.x>view.clientWidth-6||p.y<6||p.y>view.clientHeight-6)return;
  html+='<button type="button" class="cad3dGrip" style="left:'+p.x.toFixed(1)+'px;top:'+p.y.toFixed(1)+'px" data-kind="'+def.kind+
   '" title="'+escapeHtml(def.label)+' · Arrastrá o clic para ingresar valor" aria-label="'+escapeHtml(def.label)+'" ></button>';
 });
 layer.innerHTML=html;
}
function numeric3DGripAdjustment(r,kind,openingId){
 if(kind==='move')return null;
 var o=(r.openings||[]).find(function(x){return x.id===openingId;});
 var current=kind.startsWith('opening-')?o:r;
 if(!current)return null;
 var field=kind.startsWith('opening-')?({'opening-offset':'offset','opening-start':'w','opening-end':'w','opening-height':'h','opening-sill':'sill',
 'opening-depth-start':'d','opening-depth-end':'d','opening-offset-y':'offsetY'})[kind]:
 ({'length-start':'w','length-end':'w','depth-start':'d','depth-end':'d','thickness':'d','height':'h','radius':'radius','rotate':'rot'})[kind];
 if(!field)return null;
 var response=window.prompt('Nuevo valor '+field+(field==='rot'?' (grados)':' (metros)'),String(current[field]));
 if(response===null||response.trim()==='')return null;
 var value=Number(response);
 if(!Number.isFinite(value))return null;
 var d=value-current[field];
 if(kind==='length-start'||kind==='depth-start'||kind==='opening-start'||kind==='opening-depth-start')d=-d;
 if(kind==='thickness')d/=2;
 return d;
}
function bind3DGripOverlay(layer){
 if(!layer)return;
 var hint=null,drag=null;
 function show(def,r,p){
  if(!hint){hint=document.createElement('output');hint.className='cad3dGripHint';layer.appendChild(hint);}
  hint.textContent=def.label+' · '+grip3DValue(r,def.kind,drag?.openingId);
  hint.style.left=clamp(p.x+13,4,Math.max(4,layer.clientWidth-160))+'px';
  hint.style.top=clamp(p.y-10,20,Math.max(20,layer.clientHeight-20))+'px';
 }
 function cleanup(){active3DGrip=null;drag=null;hint?.remove();hint=null;render3DGrips();}
 layer.addEventListener('pointerdown',function(e){
  var btn=e.target.closest('.cad3dGrip');
  if(!btn||e.button!==0||drag)return;
  var r=records.find(function(v){return selected.length===1&&v.id===selected[0]&&editableRecord(v);});
  if(!r||placing)return;
  var def=get3DGripDefinitions(r,selectedOpeningId).find(function(g){return g.kind===btn.dataset.kind;});
  if(!def)return;
  e.preventDefault();e.stopPropagation();btn.focus({preventScroll:true});
  var original=JSON.parse(JSON.stringify(r));
  var center=pointOnScreen(grip3DWorldPoint(r,0,0,(r.h||r.radius*2||2)/2),root.querySelector('.view'));
  var centerPage=root.querySelector('.view').getBoundingClientRect();
  drag={id:e.pointerId,r:r,original:original,def:def,openingId:selectedOpeningId,x:e.clientX,y:e.clientY,moved:false,
   centerX:centerPage.left+center.x,centerY:centerPage.top+center.y,
   angle:Math.atan2(e.clientY-centerPage.top-center.y,e.clientX-centerPage.left-center.x)};
  active3DGrip=drag;
  btn.dataset.active='true';layer.setPointerCapture(e.pointerId);
  show(def,r,pointOnScreen(def.point,root.querySelector('.view')));
 });
 layer.addEventListener('pointermove',function(e){
  if(!drag||drag.id!==e.pointerId)return;
  var dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  if(Math.hypot(dx,dy)<3&&!drag.moved)return;
  e.preventDefault();e.stopPropagation();drag.moved=true;
  var delta=drag.def.kind==='rotate'?
   (Math.atan2(e.clientY-drag.centerY,e.clientX-drag.centerX)-drag.angle)*180/Math.PI:
   drag.def.kind==='opening-motion'?-dy*.85:
   grip3DDragMeters(drag.original,drag.def,dx,dy);
  if(delta==null)return;
  var next=apply3DGripCandidate(drag.original,drag.def.kind,delta,drag.openingId);
  if(!next){if(hint)hint.textContent='Límite paramétrico · sin cambios';return;}
  Object.assign(drag.r,next);
  redraw();
  var p=pointOnScreen(drag.def.point,root.querySelector('.view'));
  show(drag.def,drag.r,p);
 });
 function finish(e){
  if(!drag||drag.id!==e.pointerId)return;
  var state=drag;hint?.remove();hint=null;
  if(layer.hasPointerCapture(e.pointerId))layer.releasePointerCapture(e.pointerId);
  if(e.type==='pointercancel'){
   Object.assign(state.r,state.original);
  }else if(!state.moved){
   var delta=numeric3DGripAdjustment(state.original,state.def.kind,state.openingId);
   if(delta!=null){
    var next=apply3DGripCandidate(state.original,state.def.kind,delta,state.openingId);
    if(next)Object.assign(state.r,next);
    else text('Valor rechazado: la pieza o el vano no cabe en su elemento anfitrión');
   }
  }
  cleanup();redraw();renderProps();
  if(e.type==='pointerup')text('Bloque 3D paramétrico actualizado · geometría y vano regenerados');
  e.preventDefault();e.stopPropagation();
 }
 layer.addEventListener('pointerup',finish);
 layer.addEventListener('pointercancel',finish);
 layer.addEventListener('lostpointercapture',function(){if(drag){drag=null;active3DGrip=null;hint?.remove();hint=null;render3DGrips();}});
 root.addEventListener('keydown',function(e){
  if(!drag||e.key!=='Escape')return;
  e.preventDefault();e.stopPropagation();
  Object.assign(drag.r,drag.original);
  var id=drag.id;cleanup();if(layer.hasPointerCapture(id))layer.releasePointerCapture(id);
  redraw();renderProps();text('Edición con pinzamiento cancelada');
 },true);
}

function boxGeom(w,d,h){var g=new T.BoxGeometry(w,d,h);g.translate(0,0,h/2);return g;}
function addMesh(g,color,id,parent,x,y,z){
 var m=new T.Mesh(g,new T.MeshStandardMaterial({color:color,roughness:.8,metalness:.04,side:T.DoubleSide}));
 m.userData.owner=id;if(x!==undefined)m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=sunSettings.onFaces;parent.add(m);return m;
}
/* Partition the wall elevation or slab plan at the edges of its rectangular openings. */
/* Render-time ornamental glazing: pane divisions are local to each movable leaf.
   Geometry is not baked into the record; resizing and opening motion regenerate it. */
function cad3DGlazingPattern(opening,door){
 var id=String(opening.styleId||'').toLowerCase();
 if(/gothic|lancet|rose|arched-style|mediterranean/.test(id))return {cols:/twin/.test(id)?2:1,rows:2,pointed:true};
 if(/tudor|diamond/.test(id))return {cols:4,rows:5,diamond:true};
 if(/georgian-twelve|twelve-pane|french-12/.test(id))return {cols:2,rows:6};
 if(/georgian-six|six-pane|colonial-six/.test(id))return {cols:2,rows:3};
 if(/colonial-nine/.test(id))return {cols:3,rows:3};
 if(/industrial-steel|japanese-shoji/.test(id))return {cols:4,rows:/shoji/.test(id)?5:4};
 if(/art-deco/.test(id))return {cols:3,rows:3,diamond:true};
 if(/neoclassical|renaissance|victorian|classic|french/.test(id))return {cols:2,rows:3};
 if(/modern-ribbon/.test(id))return {cols:1,rows:3};
 return null;
}
function cad3DPaneBars(carpPart,opening,door,x,leafW,z,leafH,motion){
 var p=cad3DGlazingPattern(opening,door);
 if(!p)return;
 var half=Math.max(.025,leafW-.11)/2,innerH=Math.max(.06,leafH-.14);
 var cols=Math.max(1,p.cols),rows=Math.max(1,p.rows),bar=Math.min(.022,leafW/35);
 var base=z+.07,depth=.073,tint=/industrial|steel|tudor/.test(opening.styleId||'')?0x384651:0xc8bdb0;
 for(var col=1;col<cols;col++){
  carpPart(bar,depth,innerH,x-half+col*(2*half)/cols,0,base,tint,0,motion);
 }
 for(var row=1;row<rows;row++){
  carpPart(2*half,depth,bar,x,0,base+row*innerH/rows,tint,0,motion);
 }
 if(p.pointed){
  // Raised, stepped lancet tracery in the top glazing zone. The host void remains rectangular.
  var steps=7,peak=base+innerH*.96,shoulder=base+innerH*.63;
  for(var side=-1;side<=1;side+=2)for(var j=0;j<steps;j++){
   var a=j/steps,b=(j+1)/steps;
   var xc=x+side*half*(a+b)/2;
   var height=shoulder+(peak-shoulder)*(1-(a+b)/2);
   carpPart(Math.max(bar,half/steps+.004),depth,bar,xc,0,height,tint,0,motion);
  }
 }
 if(p.diamond){
  var rings=Math.min(3,cols),cx=x;
  for(var k=0;k<rings;k++){
   var rad=Math.min(half*.35,innerH*.12);
   var offset=(k-(rings-1)/2)*half*.65;
   carpPart(bar,depth,rad*2,cx+offset,0,base+innerH*.55,tint,0,motion);
  }
 }
}
function architectureParts(r,part){
 var wall=r.type==='wall',length=r.w,span=wall?r.h:r.d,base=wall?0:-span/2,top=base+span;
 var thickness=wall?r.d:r.h,slope=wall?0:Math.tan((r.pitch||0)*Math.PI/180);
 var cuts=(r.openings||[]).map(function(o){
  var bottom=wall?o.sill:o.offsetY-o.d/2,upper=wall?o.sill+o.h:o.offsetY+o.d/2;
  return {source:o,left:clamp(o.offset-o.w/2,-length/2,length/2),right:clamp(o.offset+o.w/2,-length/2,length/2),
   bottom:clamp(bottom,base,top),top:clamp(upper,base,top)};
 }).filter(function(o){return o.right-o.left>.01&&o.top-o.bottom>.01;});
 var xs=[-length/2,length/2],ys=[base,top];
 cuts.forEach(function(o){xs.push(o.left,o.right);ys.push(o.bottom,o.top);});
 xs=[...new Set(xs)].sort(function(a,b){return a-b;});ys=[...new Set(ys)].sort(function(a,b){return a-b;});
 var color=wall?0xaab0b5:r.slabKind==='roof'?0x89939a:0xb5bdc3;
 for(var i=0;i<xs.length-1;i++)for(var j=0;j<ys.length-1;j++){
  var x0=xs[i],x1=xs[i+1],y0=ys[j],y1=ys[j+1],x=(x0+x1)/2,y=(y0+y1)/2;
  if(cuts.some(function(o){return x>o.left&&x<o.right&&y>o.bottom&&y<o.top;}))continue;
  if(wall)part(x1-x0,thickness,y1-y0,x,0,y0,color,0);
  else part(x1-x0,y1-y0,thickness,x,y,0,color,slope);
 }
 if(!wall)return;
 cuts.forEach(function(o){
  var opening=o.source;
  function carpPart(w,d,h,x,y,z,color,slope,motion){part(w,d,h,x,y,z,color,slope,opening.id,motion);}
  if(opening.kind==='opening'||opening.styleId==='open-door')return;
  var x=(o.left+o.right)/2,w=o.right-o.left,h=o.top-o.bottom,z=o.bottom;
  var frame=Math.min(.055,w/4,h/4);
  var cfg=typeof cad3DOpeningConfig==='function'?cad3DOpeningConfig(opening):
   {operation:'fixed',leaves:1,hinge:'left',swing:'in',openAngle:0,openPercent:0};
  var leaves=Math.max(1,Math.min(3,cfg.leaves||1));
  var innerW=Math.max(.06,w-2*frame),leafW=innerW/leaves,leafH=Math.max(.06,h-2*frame);
  var left=o.left+frame,door=opening.kind==='door';
  var color=door?0x88745e:0x528a9b;
  // The fixed perimeter frame belongs to both doors and windows.
  // Keep it separate from leaf motion so opening/closing never removes the jambs.
  var frameColor=door?0xb4bec5:0xa9bec7;
  var frameDepth=thickness+.04;
  carpPart(w,frameDepth,frame,x,0,z+h-frame,frameColor,0);
  if(!door)carpPart(w,frameDepth,frame,x,0,z,frameColor,0);
  // Full-height side jambs are intentionally present on doors, too.
  carpPart(frame,frameDepth,h-frame,o.left+frame/2,0,z,frameColor,0);
  carpPart(frame,frameDepth,h-frame,o.right-frame/2,0,z,frameColor,0);
  for(var leaf=0;leaf<leaves;leaf++){
   var x0=left+leaf*leafW,x1=x0+leafW,leafCenter=(x0+x1)/2;
   var motion=typeof cad3DLeafMotion==='function'?
    cad3DLeafMotion(cfg,leaf,leaves,x0,x1,z+frame,leafH):null;
   if(door){
    carpPart(Math.max(.03,leafW-.013),.047,leafH,leafCenter,0,z+frame,color,0,motion);
    if(/french|terrace|neoclassical|victorian|gothic|colonial|art-deco|glazed|arched-style/.test(opening.styleId||'')){
     carpPart(Math.max(.04,leafW-.12),.052,leafH*.72,leafCenter,0,z+leafH*.19,0x568ea4,0,motion);
    }
    cad3DPaneBars(carpPart,opening,true,leafCenter,leafW,z+frame,leafH,motion);
    // A bar on each leaf makes its angle and opening direction legible in 3D.
    carpPart(.024,.065,.08,leafCenter+(cfg.hinge==='left'?leafW*.30:-leafW*.30),
     -.045,z+leafH*.52,0xc5ccd1,0,motion);
   }else{
    // Per-leaf sash and glazing all inherit the same hinge/sliding transformation.
    // Window sash is an actual perimeter frame, not an opaque solid sheet.
    // Transparent glass is a separate mesh that does not cast an opaque shadow.
    var sashWidth=Math.max(.04,leafW-.018),sashBar=Math.min(.055,leafW*.16),sashHeight=leafH;
    carpPart(sashBar,.075,sashHeight,leafCenter-sashWidth/2+sashBar/2,0,z+frame,0xa0b7c1,0,motion);
    carpPart(sashBar,.075,sashHeight,leafCenter+sashWidth/2-sashBar/2,0,z+frame,0xa0b7c1,0,motion);
    carpPart(sashWidth,.075,sashBar,leafCenter,0,z+frame,0xa0b7c1,0,motion);
    carpPart(sashWidth,.075,sashBar,leafCenter,0,z+frame+sashHeight-sashBar,0xa0b7c1,0,motion);
    carpPart(Math.max(.02,sashWidth-2*sashBar),.014,Math.max(.04,leafH-2*sashBar),
     leafCenter,0,z+frame+sashBar,0x4d8297,0,motion);
    cad3DPaneBars(carpPart,opening,false,leafCenter,leafW,z+frame,leafH,motion);
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
function buildObject(r){
 var group=new T.Group();group.userData.owner=r.id;group.position.set(r.x||0,r.y||0,r.z||0);group.rotation.z=(r.rot||0)*Math.PI/180;
 if(r.type==='box')addMesh(boxGeom(r.w,r.d,r.h),0x9ea9b4,r.id,group);
 if(r.type==='block3d')buildCAD3DBlock(r,group);
 if(r.type==='imported3d')cad3dBuildImportedMesh(r,group);
 if(r.type==='profile2d')cad3dBuildProfile(r,group);
 var wallJoin=r.type==='wall'?wallJoinOffsets(r):null;
 if(r.type==='wall'||r.type==='slab')architectureParts(r,function(w,d,h,x,y,z,color,slope,openingId,motion){
  var g=boxGeom(w,d,h);
  if(wallJoin&&openingId==null)applyWallMiter(g,r,w,x,wallJoin);
  if(slope){
   var p=g.getAttribute('position');
   for(var i=0;i<p.count;i++)p.setZ(i,p.getZ(i)+(p.getX(i)+x)*slope);
   g.computeVertexNormals();
  }
  // Rotate around the actual hinge/pivot. The host wall and void stay fixed.
  if(motion){
   g.translate(x-motion.pivotX,y-motion.pivotY,z-motion.pivotZ);
   if(motion.axis==='x')g.rotateX(motion.angle||0);else g.rotateZ(motion.angle||0);
   g.translate(motion.pivotX+(motion.shiftX||0),motion.pivotY+(motion.shiftY||0),motion.pivotZ+(motion.shiftZ||0));
   x=y=z=0;
  }
  var component=addMesh(g,color,r.id,group,x,y,z);
  if(openingId!=null)component.userData.openingId=openingId;
  if(openingId!=null&&color===0x4d8297){
   component.userData.cadGlass=true;
   component.material.transparent=true;component.material.opacity=.28;
   component.material.depthWrite=false;component.material.metalness=.05;
   component.material.roughness=.12;
   component.castShadow=false;component.receiveShadow=false;
  }
 });
 if(r.type==='sphere'){var sphere=new T.SphereGeometry(r.radius,28,18);sphere.translate(0,0,r.radius);addMesh(sphere,0xb0b7c0,r.id,group);}
 if(r.type==='cylinder'||r.type==='cone'){
  var cone=new T.CylinderGeometry(r.type==='cone'?0:r.radius,r.radius,r.h,32);
  cone.rotateX(Math.PI/2);cone.translate(0,0,r.h/2);addMesh(cone,0x8fa9bc,r.id,group);
 }
 if(r.type==='boolean'&&Array.isArray(r.triangles)){var geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(r.triangles,3));geometry.computeVertexNormals();addMesh(geometry,0x8fa8bc,r.id,group);}
 return group;
}
function disposeMeshes(group){
 group.traverse(function(o){if(o.isMesh||o.isLine||o.isPoints||o.userData?.cadSketch){
  if(o.geometry)o.geometry.dispose();
  var materials=Array.isArray(o.material)?o.material:[o.material];
  materials.forEach(function(m){if(!m)return;if(m.map&&m.map.isCanvasTexture)m.map.dispose();m.dispose();});
 }});
}
function visitMeshes(visitor){
 var group=modelRoot||new T.Group();
 if(!modelRoot)records.filter(visibleRecord).forEach(function(record){group.add(buildObject(record));});
 group.updateMatrixWorld(true);
 try{group.traverse(function(mesh){if(mesh.isMesh)visitor(mesh);});}
 finally{if(!modelRoot)disposeMeshes(group);}
}
function redraw(){
 if(fallbackCanvas){fallbackDraw();render3DGrips();cad3dRenderPlanWalls();return;}
 if(!modelRoot)return;
 disposeMeshes(modelRoot);
 modelRoot.clear();records.filter(visibleRecord).forEach(function(record){modelRoot.add(buildObject(record));});
 modelRoot.updateMatrixWorld(true);applyRenderStyle();highlight();applySunSettings();render3DGrips();cad3dRenderPlanWalls();
}
function highlight(){
 if(fallbackCanvas){fallbackDraw();return;}
 if(!modelRoot)return;
 modelRoot.children.forEach(function(g){
  var active=selected.includes(g.userData.owner);
  g.traverse(function(o){
   if(o.isMesh&&o.material.emissive)o.material.emissive.setHex(active&&(selectedOpeningId==null||o.userData.openingId===selectedOpeningId)?0x183848:0x000000);
   if(o.userData.cadProfileOutline)o.material.color.setHex(active?0xffcb52:renderStyle==='wire2d'?0x111111:0x82c6df);
   if(o.userData.cadProfileFace){o.material.opacity=active?.18:.018;o.material.color.setHex(active?0xffce68:0x78c7e8);}
   if(o.userData.cadProfileHandles)o.visible=active;
  });
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
 if(typeof render3DGrips==='function')render3DGrips();
 if(!selected.length){p.innerHTML='<p>Seleccioná un objeto para editar sus medidas en metros.</p>';return;}
 if(selected.length!==1){p.innerHTML='<p>'+selected.length+' sólidos seleccionados. Booleanas: elegí exactamente dos BOX sin rotación (prototipo).</p>';return;}
 var r=records.find(function(v){return v.id===selected[0];});if(!r){p.innerHTML='';return;}
 var focus=(r.openings||[]).find(function(o){return o.id===selectedOpeningId;});
 var html=focus?'<strong>'+escapeHtml(focus.kind.toUpperCase()+' #'+focus.id)+'</strong><button type="button" class="btn" data-back-wall="1">← Wall properties</button>':
 '<strong>'+escapeHtml(r.type.toUpperCase()+' #'+r.id)+'</strong>'+
  '<label>Layer <select data-object-layer>'+layerOptions(r.layerId||'0')+'</select></label>';
 var host=r.type==='wall'||r.type==='slab';
 if(host&&!focus)html+='<label>Style <select data-object-style>'+styleOptions(r.type,r.styleId)+'</select></label>';
 if(!focus&&r.type==='profile2d')html+='<div class="detail">2D PROFILE: '+escapeHtml(r.name||'Profile')+
  ' · '+(r.profileClosed?'Closed':'Open')+' · '+(r.profilePoints||[]).length+' vertices'+
  (r.extrudedHeight?' · extruded '+r.extrudedHeight+' m':'')+'</div>';
 if(!focus&&r.type==='block3d')html+='<div class="detail">3D Block: '+escapeHtml(CAD3D_COMPONENTS[r.blockId]?.name||r.blockId)+'</div>';
 if(!focus&&r.type==='imported3d')html+='<div class="detail"><strong>Imported model:</strong> '+escapeHtml(r.name||'3D mesh')+
 ' · '+Math.floor((r.meshVertices||[]).length/9)+' triangles</div>'+
 '<label>Model color <input type="color" data-object-color value="'+(r.materialColor||'#b6bdc0')+'"></label>';
 // Height appears FIRST in Properties, where it is immediately visible for editing.
 var heightEditable=['wall','slab','box','block3d','imported3d','profile2d','cylinder','cone'].includes(r.type);
 var keys=focus?[]:(heightEditable?['h']:[]);
 if(!focus)keys.push('x','y','z');
 if(!focus&&r.type!=='boolean')keys.push('rot');
 if(!focus&&['box','wall','slab','block3d','imported3d'].includes(r.type))keys.push('w','d');
 if(!focus&&r.type==='slab')keys.push('pitch');
 if(!focus&&['sphere','cone','cylinder'].includes(r.type))keys.push('radius');
 var labels={x:'X (m)',y:'Y (m)',z:'Z (m)',rot:'Rotation (°)',w:r.type==='wall'?'Length (m)':'Width (m)',d:r.type==='wall'?'Thickness (m)':'Depth (m)',h:r.type==='slab'?'Slab thickness (m)':r.type==='profile2d'?'Extrusion height (m)':'Height (m)',pitch:'Roof slope (°)',radius:'Radius (m)'};
 keys.forEach(function(k){
  var primary=k==='h';
  html+='<label'+(primary?' class="cad3dHeightProperty"':'')+'>'+labels[k]+
   '<input type="number" step="any"'+(primary?' min="'+(r.type==='profile2d'?0:.01)+'"':'')+
   ' data-key="'+k+'" value="'+escapeHtml(r[k]??0)+'"></label>';
 });
 if(host&&r.openings.length){
  html+='<div class="detail"><strong>PARAMETRIC OPENINGS</strong>';
  r.openings.filter(function(o){return !focus||o.id===focus.id;}).forEach(function(o,i){
   html+='<div class="detail"><button type="button" class="btn" data-select-opening-id="'+o.id+'">'+escapeHtml(o.kind.toUpperCase())+' '+(i+1)+' · Edit</button>';
   var fields=r.type==='wall'?[['offset','Offset X'],['w','Width'],['h','Height'],['sill','Sill']]:
    [['offset','Offset X'],['offsetY','Offset Y'],['w','Width'],['d','Depth']];
   fields.forEach(function(k){
    html+='<label>'+k[1]+'<input type="number" step="any" data-opening="'+o.id+'" data-attr="'+k[0]+'" value="'+escapeHtml(o[k[0]])+'"></label>';
   });
   {
    var available=o.kind==='opening'?ARCH_STYLES.opening.filter(function(st){return st.host===r.type;}):r.type==='wall'?ARCH_STYLES[o.kind]:[];
    if(available.length)html+='<label>'+(o.kind==='opening'?'Opening style':'Model')+' <select data-opening-style="'+o.id+'">'+available.map(function(st){return '<option value="'+st.id+'"'+(st.id===o.styleId?' selected':'')+'>'+escapeHtml(st.name)+'</option>';}).join('')+'</select></label>';
   }
   if(r.type==='wall'&&o.kind!=='opening'){
    var fallback={operation:'fixed',leaves:1,hinge:'left',swing:'in',openAngle:0,openPercent:0};
    var cfg=typeof cad3DOpeningConfig==='function'?cad3DOpeningConfig(o):fallback;
    var operations=o.kind==='door'?
     [['hinged','Batiente / hinged'],['sliding','Corrediza / sliding'],['folding','Plegadiza / folding'],['pivot','Pivotante / pivot'],['sectional','Seccional / garage']]:
     [['fixed','Fija / fixed'],['casement','Batiente / casement'],['sliding','Corrediza / sliding'],['awning','Basculante superior / awning'],
      ['hopper','Basculante inferior / hopper'],['tilt-turn','Oscilobatiente / tilt-turn']];
    function optValue(key,v){return String(cfg[key])===String(v)?' selected':'';}
    html+='<div class="detail"><strong>3D DYNAMIC OPENING</strong>'+
     '<label>Opening system <select data-opening-param="'+o.id+'" data-param="operation">'+
     operations.map(function(a){return '<option value="'+a[0]+'"'+optValue('operation',a[0])+'>'+a[1]+'</option>';}).join('')+'</select></label>'+
     '<label>Leaves <select data-opening-param="'+o.id+'" data-param="leaves">'+
     [1,2,3].map(function(n){return '<option value="'+n+'"'+optValue('leaves',n)+'>'+n+' leaf'+(n===1?'':'s')+'</option>';}).join('')+'</select></label>'+
     '<label>Hinge side <select data-opening-param="'+o.id+'" data-param="hinge">'+
     [['left','Left'],['right','Right']].map(function(a){return '<option value="'+a[0]+'"'+optValue('hinge',a[0])+'>'+a[1]+'</option>';}).join('')+'</select></label>'+
     '<label>Opening direction <select data-opening-param="'+o.id+'" data-param="swing">'+
     [['in','Inward'],['out','Outward']].map(function(a){return '<option value="'+a[0]+'"'+optValue('swing',a[0])+'>'+a[1]+'</option>';}).join('')+'</select></label>';
    var horizontal=cfg.operation==='sliding'||cfg.operation==='sectional';
    if(cfg.operation==='fixed')html+='<small>Fixed glazing · choose an operable system to open this sash.</small></div>';
    else{
     var prop=horizontal?'openPercent':'openAngle',max=horizontal?100:120;
     html+='<label>'+(horizontal?'Opening (%)':'Opening angle (°)')+
      '<input type="range" min="0" max="'+max+'" step="1" data-opening-param="'+o.id+'" data-param="'+prop+
      '" value="'+cfg[prop]+'"><output data-opening-value="'+o.id+'">'+cfg[prop]+(horizontal?'%':'°')+'</output></label>'+
      '<div class="detail"><button class="btn" type="button" data-opening-motion="'+o.id+'" data-motion="open">Open</button> '+
      '<button class="btn" type="button" data-opening-motion="'+o.id+'" data-motion="close">Close</button></div></div>';
    }
   }
   html+='<button class="btn" type="button" data-remove-opening="'+o.id+'">Remove opening</button></div>';
  });html+='</div>';
 }
 if(!focus)html+='<div class="detail"><button class="btn" type="button" data-focus-object="'+r.id+'">Zoom to object</button> '+
 '<button class="btn" type="button" data-duplicate-object="'+r.id+'">Duplicate</button> '+
 '<button class="btn" type="button" data-remove-object="'+r.id+'">Delete object</button></div>';
 p.innerHTML=html;
}
function change(e){
 var input=e.target;
 if(!input.matches('input[data-key],input[data-opening],select[data-object-style],select[data-object-layer],select[data-opening-style],[data-opening-param],input[data-object-color]'))return;
 var r=records.find(function(v){return selected.includes(v.id);});if(!r||!editableRecord(r))return;
 if(input.matches('[data-object-color]')){
  if(r.type!=='imported3d'||!/^#[0-9a-f]{6}$/i.test(input.value))return;
  r.materialColor=input.value;redraw();renderProps();text('Color del modelo actualizado');return;
 }
 if(input.matches('[data-opening-param]')){
  var op=(r.openings||[]).find(function(v){return v.id===Number(input.dataset.openingParam);});
  if(!op||!['door','window'].includes(op.kind))return;
  var key=input.dataset.param,allowed=['operation','leaves','hinge','swing','openAngle','openPercent'];
  if(!allowed.includes(key))return;
  var v=(key==='leaves'||key==='openAngle'||key==='openPercent')?Number(input.value):input.value;
  if(key==='leaves')v=clamp(Math.round(v),1,3);
  if(key==='openAngle')v=clamp(v,0,120);
  if(key==='openPercent')v=clamp(v,0,100);
  if(key==='operation'){
   var permitted=op.kind==='door'?['hinged','sliding','folding','pivot','sectional']:
    ['fixed','casement','sliding','awning','hopper','tilt-turn'];
   if(!permitted.includes(v))return;
  }
  if(key==='hinge'&&!['left','right'].includes(v))return;
  if(key==='swing'&&!['in','out'].includes(v))return;
  op[key]=v;
  redraw();renderProps();text('Apertura 3D paramétrica actualizada');return;
 }
 if(input.matches('select[data-opening-style]')){
  var opening=(r.openings||[]).find(function(o){return o.id===Number(input.dataset.openingStyle);});
  var style=opening&&(ARCH_STYLES[opening.kind]||[]).find(function(st){return st.id===input.value;});
  if(!opening||!style)return;
  var candidate=Object.assign({},opening,{styleId:style.id,w:style.w});
  if(r.type==='wall'){candidate.h=style.h;candidate.sill=Math.min(style.sill,Math.max(0,r.h-style.h));}
  else {candidate.w=style.w;candidate.d=style.d;}
  if(!openingFitsCADHost(r,candidate,opening.id)){renderProps();text('El modelo elegido no entra en el muro o se superpone a otro vano');return;}
  if(opening.kind==='door'||opening.kind==='window')Object.assign(candidate,cad3DOpeningDefaults(opening.kind,style.id));
  Object.assign(opening,candidate);selectedOpeningId=opening.id;redraw();renderProps();text('Modelo de carpintería actualizado');return;
 }
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
 var val=Number(input.value);if(!Number.isFinite(val))return text('Valor inválido');
 if(input.dataset.opening){
  var o=(r.openings||[]).find(function(v){return v.id===Number(input.dataset.opening);});if(!o)return;
  var key=input.dataset.attr;
  if(key==='w'||key==='h'||key==='d')val=clamp(val,.05,1000);
  else if(key==='sill')val=clamp(val,0,1000);
  else val=clamp(val,-10000,10000);
  var proposal=Object.assign({},o,{[key]:val});
  if(!openingFitsCADHost(r,proposal,o.id)){renderProps();text('La abertura no entra en el muro o se superpone a otra');return;}
  o[key]=val;
 }else{
  var name=input.dataset.key;
  if(['w','d','radius'].includes(name))val=clamp(val,.01,1000);
  if(name==='h'){
   val=clamp(val,r.type==='profile2d'?0:.01,1000);
   if(r.type==='profile2d'){
    if(val>0&&(!r.profileClosed||!Array.isArray(r.profilePoints)||r.profilePoints.length<3)){
     text('Solo podés dar altura a un perfil 2D cerrado');renderProps();return;
    }
    r.extrudedHeight=val;
   }
   if(r.type==='wall'&&Array.isArray(r.openings)&&r.openings.some(function(o){
    return (o.sill||0)+(o.h||0)>val+1e-6;
   })){
    text('Altura insuficiente: una puerta o ventana supera la nueva altura del muro');renderProps();return;
   }
   if((r.type==='wall'||r.type==='slab')&&r.styleId)r.styleId='';
  }
  else if(name==='rot')val=clamp(val,-3600,3600);
  else if(name==='pitch')val=clamp(val,-45,45);
  else val=clamp(val,-10000,10000);
  r[name]=val;
 }
 redraw();renderProps();text('Parámetros actualizados · geometría 3D regenerada');
}
/* CAD3D_EDIT_ENHANCEMENTS_V1: duplicate, locate and recolor imported geometry. */
function cad3dCloneObject(id){
 var source=records.find(function(r){return r.id===id&&editableRecord(r);});if(!source)return;
 var copy=JSON.parse(JSON.stringify(source));copy.id=serial++;copy.x=(source.x||0)+.65;copy.y=(source.y||0)+.65;
 // Ensure architectural openings receive unique object-local identifiers.
 if(copy.openings)copy.openings.forEach(function(o){o.id=serial++;});
 records.push(copy);selected=[copy.id];selectedOpeningId=null;
 redraw();renderProps();text('Objeto duplicado · podés moverlo y editarlo de forma independiente');
}
function cad3dFocusObject(id){
 var r=records.find(function(item){return item.id===id;});if(!r)return;
 if(!target){text('La cámara 3D todavía no está lista');return;}
 target.set(r.x||0,r.y||0,(r.z||0)+(r.h||1)*.5);
 orbit.dist=Math.max(2.5,Math.hypot(r.w||1,r.d||1,r.h||1)*2.8);
 if(viewMode==='walk')viewMode='perspective';
 applyViewCamera();text('Cámara centrada en '+(r.name||r.type));
}
function clickProps(e){
 var duplicate=e.target.closest('[data-duplicate-object]');
 if(duplicate){cad3dCloneObject(Number(duplicate.dataset.duplicateObject));return;}
 var focusObject=e.target.closest('[data-focus-object]');
 if(focusObject){cad3dFocusObject(Number(focusObject.dataset.focusObject));return;}
 var motion=e.target.closest('[data-opening-motion]');
 if(motion){
  var host=records.find(function(r){return selected.length===1&&r.id===selected[0]&&editableRecord(r);});
  var op=(host?.openings||[]).find(function(o){return o.id===Number(motion.dataset.openingMotion);});
  if(!op)return;
  var cfg=cad3DOpeningConfig(op),horizontal=['sliding','sectional'].includes(cfg.operation);
  if(cfg.operation==='fixed')return text('Paño fijo: elegí batiente, corrediza o basculante para abrirlo');
  op[horizontal?'openPercent':'openAngle']=motion.dataset.motion==='close'?0:horizontal?100:90;
  redraw();renderProps();text('Carpintería '+(motion.dataset.motion==='close'?'cerrada':'abierta')+' en 3D');return;
 }
 var chosen=e.target.closest('[data-select-opening-id]');
 if(chosen){selectedOpeningId=Number(chosen.dataset.selectOpeningId);renderProps();highlight();return;}
 if(e.target.closest('[data-back-wall]')){selectedOpeningId=null;renderProps();highlight();return;}
 var o=e.target.closest('[data-remove-opening]');if(o){
  var host=records.find(function(r){return selected.includes(r.id)&&(r.type==='wall'||r.type==='slab');});if(!host)return;
  host.openings=host.openings.filter(function(x){return x.id!==Number(o.dataset.removeOpening);});selectedOpeningId=null;
  redraw();renderProps();text('Abertura desvinculada y vano cerrado');return;
 }
 var del=e.target.closest('[data-remove-object]');if(del){
  records=records.filter(function(r){return r.id!==Number(del.dataset.removeObject);});
  selected=[];selectedOpeningId=null;redraw();renderProps();text('Objeto eliminado');
 }
}
/* Exact axis-aligned box boolean prototype: partition at all six cutting planes.
   It is intentionally limited to two unrotated boxes, not a general CSG solver. */
/* Extrusion of native solid footprints. Free-form profile extrusion requires a dedicated profile engine. */
/* Native BOX face push/pull: dimension changes keep the opposite face stationary.
   The signed distance is measured along the clicked outward normal in metres. */
function cad3dPushPullBoxFace(rec,normal,distance){
 if(!rec||rec.type!=='box'||!Number.isFinite(distance)||!normal)return false;
 var axis=Math.abs(normal.x)>.9?'x':Math.abs(normal.y)>.9?'y':Math.abs(normal.z)>.9?'z':null;
 if(!axis)return false;
 var sign=Math.sign(normal[axis]);if(!sign)return false;
 var key=axis==='x'?'w':axis==='y'?'d':'h',newSize=rec[key]+distance;
 if(newSize<.01||newSize>1000)return false;
 if(axis==='z'){if(sign<0)rec.z-=distance;}
 else{
  var angle=(rec.rot||0)*Math.PI/180,shift=sign*distance*.5;
  rec.x+=shift*(axis==='x'?Math.cos(angle):-Math.sin(angle));
  rec.y+=shift*(axis==='x'?Math.sin(angle):Math.cos(angle));
 }
 rec[key]=newSize;return true;
}
function cad3dExtrudeFaceAt(e){
 if(!renderer||!modelRoot||!T)return text('Extrude Face requiere WebGL activo');
 var input=root.querySelector('.cad3dExtrudeHeight'),distance=Number(input&&input.value);
 if(!Number.isFinite(distance)||distance===0||Math.abs(distance)>1000)return text('Ingresá distancia distinta de 0 en Height (m), entre -1000 y 1000');
 var bounds=renderer.domElement.getBoundingClientRect();
 var cursor=new T.Vector2((e.clientX-bounds.left)/bounds.width*2-1,-(e.clientY-bounds.top)/bounds.height*2+1);
 raycaster.setFromCamera(cursor,camera);
 var meshes=[];
 modelRoot.traverse(function(o){if(o.isMesh&&o.userData.owner!=null)meshes.push(o);});
 var hits=raycaster.intersectObjects(meshes,false);
 for(var i=0;i<hits.length;i++){
  var hit=hits[i],rec=records.find(r=>r.id===hit.object.userData.owner);
  if(!rec||!editableRecord(rec))continue;
  if(rec.type!=='box'){text('Extrude Face: solamente caras de BOX; seleccioná otra cara');return;}
  if(!cad3dPushPullBoxFace(rec,hit.face&&hit.face.normal,distance)){
   text('No se puede extruir esa cara con esta distancia');return;
  }
  selected=[rec.id];selectedOpeningId=null;redraw();renderProps();
  text('Extrude Face aplicado · '+(distance>0?'+':'')+distance.toFixed(2)+' m');return;
 }
 text('Extrude Face: hacé clic sobre una cara de un BOX');
}
function cad3dExtrudeSelection(){
 if(selected.length!==1){text('Extrude: seleccioná un perfil cerrado, BOX o losa 3D');return false;}
 var rec=records.find(function(r){return r.id===selected[0]&&editableRecord(r);});
 if(!rec||!['box','slab','profile2d'].includes(rec.type)){text('Extrude: seleccioná un BOX, SLAB o perfil cerrado');return false;}
 var input=root.querySelector('.cad3dExtrudeHeight');
 var height=Number(input&&input.value);
 if(!Number.isFinite(height)||height<.01||height>1000){text('Ingresá una altura entre 0,01 y 1000 metros');return false;}
 if(rec.type==='profile2d'){
  if(!rec.profileClosed||!Array.isArray(rec.profilePoints)||rec.profilePoints.length<3){text('Extrude requiere un perfil cerrado con al menos 3 vértices');return false;}
  rec.extrudedHeight=height;rec.h=height;redraw();renderProps();text('Perfil extrudado · '+height.toFixed(2)+' m');return true;
 }
 if(rec.type==='slab'){
  if((rec.openings||[]).length){text('La losa tiene aberturas: extrusión directa no disponible');return false;}
  rec.type='box';rec.pitch=0;rec.styleId='';
 }
 rec.h=height;
 redraw();renderProps();text('Extrude aplicado · altura '+height.toFixed(2)+' m');
 return true;
}
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
 monochrome:'Monochrome',xray:'X-Ray',sketch:'Croquis técnico',
 'sketch-pencil':'Croquis lápiz','sketch-ink':'Croquis tinta','sketch-marker':'Croquis marcador',
 'sketch-watercolor':'Croquis acuarela','sketch-mono':'Croquis monocromo','sketch-blueprint':'Croquis blueprint',
 'sketch-charcoal':'Carbón arquitectónico','sketch-sepia':'Plumilla sepia','sketch-bluewash':'Lavado azul','sketch-presentation':'Croquis presentación',
 'sketch-engraving':'Grabado lineal','sketch-urban':'Croquis urbano rápido','sketch-graphic':'Lámina gráfica roja y azul','sketch-comic':'Tinta de historieta',
 'sketch-sunlit':'Interior soleado','sketch-pencil-soft':'Lápiz suave','sketch-pencil-bold':'Grafito intenso','sketch-blue-engraving':'Grabado azul','sketch-red-ochre':'Rojo y ocre',
 'sketch-comic-teal':'Historieta turquesa','sketch-ink-light':'Tinta fina','sketch-concept':'Croquis conceptual','sketch-watercolor-warm':'Acuarela cálida','sketch-watercolor-cool':'Acuarela fría',
 'sketch-monochrome-contrast':'Grabado monocromo','sketch-technical-red':'Plano tinta roja','sketch-vintage-print':'Impresión vintage','sketch-sunset':'Atardecer ilustrado','sketch-white-model':'Maqueta blanca'
};
const CAD3D_SKETCH_PRESETS={
 sketch:{bg:0xf3f1e8,ground:0xe6e4da,fill:0xf7f4eb,edge:0x333b3c,alpha:.9},
 'sketch-pencil':{bg:0xf2f0e7,ground:0xe3e1da,fill:0xf2efe8,edge:0x64696b,alpha:.78},
 'sketch-ink':{bg:0xfaf9f3,ground:0xf0eee8,fill:0xfaf9f4,edge:0x202629,alpha:1},
 'sketch-marker':{bg:0xf0eee5,ground:0xe5e1d7,fill:0xd2d2cb,edge:0x4e6269,alpha:.76},
 'sketch-watercolor':{bg:0xf5f1e9,ground:0xe5e3de,fill:0xdadcd7,edge:0x667a7f,alpha:.66},
 'sketch-mono':{bg:0xf2f2f0,ground:0xe5e5e1,fill:0xe9e9e5,edge:0x424546,alpha:.88},
 'sketch-blueprint':{bg:0x344e66,ground:0x647f92,fill:0x8ca6b5,edge:0xe4f2fa,alpha:.92},
 'sketch-charcoal':{bg:0xe9e7df,ground:0xdad7cd,fill:0xcac9c3,edge:0x303235,alpha:.90},
 'sketch-sepia':{bg:0xf5ead3,ground:0xe7dac2,fill:0xf0e4cb,edge:0x70553d,alpha:.95},
 'sketch-bluewash':{bg:0xf0f5f6,ground:0xd9e5e8,fill:0xc2d7df,edge:0x455b70,alpha:.82},
 'sketch-presentation':{bg:0xfcfaf3,ground:0xe8e7de,fill:0xd7ddd5,edge:0x344953,alpha:.80},
 'sketch-engraving':{bg:0xfff8e5,ground:0xeee5cf,fill:0xf5e9d5,edge:0x233c57,alpha:.98,hatch:true,hatchColor:0x31455e,hatchDensity:1.7},
 'sketch-urban':{bg:0xfffdf8,ground:0xf5f0e7,fill:0xfaf7ef,edge:0x323838,alpha:.79,hatch:true,hatchColor:0x697075,hatchDensity:.75},
 'sketch-graphic':{bg:0xfff8e9,ground:0xf4e6cf,fill:0xf3c4aa,edge:0x1f4b78,alpha:.95,hatch:true,hatchColor:0x1a557f,hatchDensity:1},
 'sketch-comic':{bg:0xfff9ed,ground:0xe6e0d3,fill:0xbed5d3,edge:0x25323a,alpha:1,hatch:true,hatchColor:0x48565d,hatchDensity:1.25},
 'sketch-sunlit':{bg:0xfffbef,ground:0xece4d4,fill:0xe7e6db,edge:0x3d4b54,alpha:.78},
 'sketch-pencil-soft':{bg:0xf9f8f2,ground:0xeceae4,fill:0xf2f0e8,edge:0x969490,alpha:.58},
 'sketch-pencil-bold':{bg:0xf4f1e8,ground:0xe5e1d9,fill:0xe8e5db,edge:0x39383a,alpha:1,hatch:true,hatchColor:0x55545a,hatchDensity:.7},
 'sketch-blue-engraving':{bg:0xfff4da,ground:0xeee0be,fill:0xf6ecd1,edge:0x153d64,alpha:1,hatch:true,hatchColor:0x244a6f,hatchDensity:2.15},
 'sketch-red-ochre':{bg:0xfff7e4,ground:0xf2dfc7,fill:0xda7454,edge:0x392d35,alpha:.94,hatch:true,hatchColor:0x883b35,hatchDensity:.85},
 'sketch-comic-teal':{bg:0xf5edd9,ground:0xe5decb,fill:0x8fb7b7,edge:0x1f303c,alpha:1,hatch:true,hatchColor:0x213d49,hatchDensity:1.6},
 'sketch-ink-light':{bg:0xfffefa,ground:0xf4f1ed,fill:0xfaf9f3,edge:0x525b62,alpha:.62},
 'sketch-concept':{bg:0xfaf7f2,ground:0xe9e6e0,fill:0xe9ebe7,edge:0x4e6373,alpha:.82},
 'sketch-watercolor-warm':{bg:0xfff8e9,ground:0xe9dfc8,fill:0xe1cdb3,edge:0x856758,alpha:.62},
 'sketch-watercolor-cool':{bg:0xf4f9f5,ground:0xdce9e5,fill:0xb5cdcb,edge:0x46767c,alpha:.64},
 'sketch-monochrome-contrast':{bg:0xffffff,ground:0xddddda,fill:0xb2b2af,edge:0x1a1a1a,alpha:1,hatch:true,hatchColor:0x4e4e4e,hatchDensity:1.2},
 'sketch-technical-red':{bg:0xfffaf3,ground:0xf2eae3,fill:0xf4d4ce,edge:0x983d45,alpha:.92},
 'sketch-vintage-print':{bg:0xf1e7cc,ground:0xe7d8b9,fill:0xb8bdab,edge:0x353f36,alpha:.92,hatch:true,hatchColor:0x565c4f,hatchDensity:1.2},
 'sketch-sunset':{bg:0xfce9d0,ground:0xeacdad,fill:0xc5b0a5,edge:0x594a58,alpha:.78},
 'sketch-white-model':{bg:0xfcfcfc,ground:0xeeeeee,fill:0xf9f9f8,edge:0x7b838a,alpha:.7}
};
function isCad3DSketch(mode){return Object.prototype.hasOwnProperty.call(CAD3D_SKETCH_PRESETS,mode);}

function renderStyleControls(){
 if(!root)return;
 cad3dSyncCompactBars();
 root.querySelectorAll('[data-render-style]').forEach(function(button){
  button.setAttribute('aria-pressed',String(button.dataset.renderStyle===renderStyle));
 });
 var launcher=root.querySelector('.styleLaunch');
 if(launcher){launcher.innerHTML='<span class="styleColorCube" aria-hidden="true"></span><span>Visual Style</span>';
  launcher.title='Visual Style · '+(CAD3D_VISUAL_STYLES[renderStyle]||'Shaded');
  launcher.setAttribute('aria-label',launcher.title);
 }
 var sketchButton=root.querySelector('[data-action="sketch"]');
 if(sketchButton)sketchButton.classList.toggle('sketchActive',isCad3DSketch(renderStyle));
 root.querySelector('.view')?.classList.toggle('sketchView',isCad3DSketch(renderStyle));
 root.querySelector('.view')?.classList.toggle('wire2dView',renderStyle==='wire2d');
}
/* Lightweight, deterministic hatch strokes drawn on visible box faces.
   Presentation-only THREE.LineSegments. CAD model geometry and opening records remain untouched. */
function cad3DSketchHatch(mesh,preset){
 if(!preset?.hatch||!mesh.geometry?.isBufferGeometry)return;
 var base=mesh.userData.cadBaseColor;
 // Avoid a dense crosshatch on glass, mullions, handles and tiny mechanical details.
 if(![0xaab0b5,0xb5bdc3,0x89939a,0x9ea9b4,0x8fa9bc].includes(base))return;
 var g=mesh.geometry;
 if(!g.boundingBox)g.computeBoundingBox();
 var box=g.boundingBox,min=box.min,max=box.max;
 var dx=max.x-min.x,dy=max.y-min.y,dz=max.z-min.z;
 if(dx<.15||dz<.14||dy<.045)return;
 var spacing=.20/Math.max(.4,preset.hatchDensity||1);
 var pairs=[],limit=90,eps=.0025;
 function stroke(ax,ay,az,bx,by,bz){
  if(pairs.length/6>=limit)return;
  pairs.push(ax,ay,az,bx,by,bz);
 }
 // The two Y-facing elevations: diagonal segments clipped to the face rectangle.
 // Reuse identical strokes in local mesh coordinates for stable orbiting and export.
 var rise=.19,slope=.46;
 for(var side=0;side<2;side++){
  var yy=side?max.y+eps:min.y-eps;
  for(var x=min.x-dz/slope;x<max.x;x+=spacing){
   var xa=Math.max(min.x,x),xb=Math.min(max.x,x+dz/slope);
   if(xb<=xa)continue;
   var za=min.z+(xa-x)*slope,zb=min.z+(xb-x)*slope;
   if(zb<min.z||za>max.z)continue;
   stroke(xa,yy,Math.min(max.z,Math.max(min.z,za)),xb,yy,Math.min(max.z,Math.max(min.z,zb)));
  }
 }
 // A light secondary hatch on the short returns improves legibility of wall thickness.
 if(dy>.12&&dz>.4){
  for(var sideX=0;sideX<2;sideX++){
   var xx=sideX?max.x+eps:min.x-eps;
   for(var z=min.z+spacing;z<max.z&&pairs.length/6<limit;z+=spacing){
    stroke(xx,min.y-eps,z,xx,max.y+eps,Math.min(max.z,z+dy*.22));
   }
  }
 }
 if(!pairs.length)return;
 var linesGeom=new T.BufferGeometry();
 linesGeom.setAttribute('position',new T.Float32BufferAttribute(pairs,3));
 var lines=new T.LineSegments(linesGeom,new T.LineBasicMaterial({
  color:preset.hatchColor||preset.edge,transparent:true,opacity:.35,
  depthTest:true,depthWrite:false
 }));
 lines.userData.cadSketch=true;lines.renderOrder=6;
 mesh.add(lines);
}
function applyRenderStyle(){
 renderStyleControls();
 if(!T)return;
 var sketch=CAD3D_SKETCH_PRESETS[renderStyle]||null;
 var lightPaper=!!sketch||['hidden','monochrome','wire2d'].includes(renderStyle);
 if(scene)scene.background=new T.Color(renderStyle==='wire2d'?0xffffff:sketch?sketch.bg:lightPaper?0xf6f5f1:
  sunSettings.enabled&&['shaded','shaded-edges','realistic'].includes(renderStyle)?0xc4d8e4:MODEL_BACKGROUND);
 if(sunGround)sunGround.material.color.setHex(sketch?sketch.ground:sunSettings.enabled?0xd1cbc0:0x9ba5a8);
 if(gridHelper)gridHelper.visible=draftModes.grid&&!isCad3DSketch(renderStyle)&&!['hidden','wire2d'].includes(renderStyle);
 if(axesHelper)axesHelper.visible=!isCad3DSketch(renderStyle)&&!['hidden','wire2d'].includes(renderStyle);
 if(sunGround)sunGround.visible=sunSettings.enabled&&sunSettings.onGround&&!['hidden','wire2d','wire3d'].includes(renderStyle);
 if(!modelRoot)return;
 var plainLines=['wire2d','wire3d','hidden'].includes(renderStyle);
 var withEdges=!!sketch||['wire2d','wire3d','hidden','shaded-edges','monochrome'].includes(renderStyle);
 modelRoot.traverse(function(m){
  if(!m.isMesh||!m.material||!m.geometry||m.userData.cadProfileFace)return;
  if(m.userData.cadBaseColor===undefined)m.userData.cadBaseColor=m.material.color.getHex();
  m.children.filter(function(ch){return ch.userData?.cadSketch;}).forEach(function(ch){
   m.remove(ch);ch.geometry.dispose();ch.material.dispose();
  });
  var mat=m.material,base=m.userData.cadBaseColor;
  // Preserve immutable original material properties across all style transitions.
  // Transparent 2.5D people/trees must never turn into opaque rectangles.
  if(!m.userData.cadOriginalMaterial){
   m.userData.cadOriginalMaterial={
    transparent:!!mat.transparent,opacity:mat.opacity,depthWrite:mat.depthWrite,
    alphaTest:mat.alphaTest||0,roughness:mat.roughness,metalness:mat.metalness,
    isCutout:!!(mat.map&&mat.map.isCanvasTexture)
   };
  }
  var original=m.userData.cadOriginalMaterial;
  var cutout=original.isCutout,glass=!!m.userData.cadGlass;
  var color=sketch?sketch.fill:renderStyle==='monochrome'?0xe8e8e3:
   renderStyle==='realistic'?(base===0xaab0b5?0xb9b7af:base===0x8b725e?0xa07852:base):base;
  // Cutout imagery retains its intended colors even in sketch and monochrome modes.
  mat.color.setHex(cutout?base:color);
  mat.colorWrite=!plainLines;
  mat.depthTest=true;
  mat.transparent=cutout||glass||renderStyle==='xray'||original.transparent;
  mat.opacity=renderStyle==='xray'?(cutout?.5:.23):glass?.28:original.opacity;
  mat.alphaTest=cutout?Math.max(.05,original.alphaTest):original.alphaTest;
  // Hidden-line mode uses an invisible depth prepass for proper edge occlusion.
  mat.depthWrite=plainLines?renderStyle==='hidden'&&!glass&&!cutout:
   !glass&&!cutout&&renderStyle!=='xray'&&original.depthWrite;
  if('roughness' in mat)mat.roughness=renderStyle==='realistic'?.54:original.roughness;
  if('metalness' in mat)mat.metalness=renderStyle==='realistic'?.10:original.metalness;
  m.castShadow=!glass&&!plainLines;
  m.receiveShadow=!glass&&sunSettings.enabled&&sunSettings.onFaces&&!plainLines;
  mat.needsUpdate=true;
  if(withEdges&&!cutout){
   var edge=new T.EdgesGeometry(m.geometry,22);
   var colorEdge=sketch?sketch.edge:renderStyle==='wire2d'?0x111111:
    renderStyle==='wire3d'?0xe6f3fb:renderStyle==='shaded-edges'?0x394954:0x43535e;
   var depthTest=!['wire2d','wire3d'].includes(renderStyle);
   var line=new T.LineSegments(edge,new T.LineBasicMaterial({
    color:colorEdge,depthTest:depthTest,depthWrite:false,
    transparent:!!sketch||renderStyle==='shaded-edges',opacity:sketch?sketch.alpha:renderStyle==='shaded-edges'?.68:1
   }));
   line.userData.cadSketch=true;line.renderOrder=5;m.add(line);
   if(sketch?.hatch)cad3DSketchHatch(m,sketch);
   // 2D Wireframe: crisp black edge lines with visible geometric vertices.
   // These points are presentation-only, never editable drawing records.
   if(renderStyle==='wire2d'){
    var positions=edge.getAttribute('position'),coords=[],seen=new Set();
    for(var vi=0;vi<positions.count&&seen.size<1200;vi++){
     var vx=positions.getX(vi),vy=positions.getY(vi),vz=positions.getZ(vi);
     var k=Math.round(vx*10000)+','+Math.round(vy*10000)+','+Math.round(vz*10000);
     if(seen.has(k))continue;
     seen.add(k);coords.push(vx,vy,vz);
    }
    if(coords.length){
     var dots=new T.BufferGeometry();
     dots.setAttribute('position',new T.Float32BufferAttribute(coords,3));
     var points=new T.Points(dots,new T.PointsMaterial({
      color:0x000000,size:3.2,sizeAttenuation:false,depthTest:false,depthWrite:false
     }));
     points.userData.cadSketch=true;points.renderOrder=6;m.add(points);
    }
   }
  }
 });
}
function setVisualStyle(mode){
 if(!Object.prototype.hasOwnProperty.call(CAD3D_VISUAL_STYLES,mode))return false;
 var savedView={mode:viewMode,active:activeView,az:orbit.az,el:orbit.el,dist:orbit.dist,
  target:target?{x:target.x,y:target.y,z:target.z}:null};
 renderStyle=mode;
 if(isCad3DSketch(mode)){sunSettings.enabled=true;sunSettings.onGround=true;sunSettings.onFaces=true;}
 if(renderer){applyRenderStyle();highlight();}
 else renderStyleControls();
 if(isCad3DSketch(mode))applySunSettings();
 // A visual style is a material operation, never a camera preset.
 viewMode=savedView.mode;activeView=savedView.active;
 orbit.az=savedView.az;orbit.el=savedView.el;orbit.dist=savedView.dist;
 if(target&&savedView.target)target.set(savedView.target.x,savedView.target.y,savedView.target.z);
 if(renderer){applyViewCamera();renderer.shadowMap.needsUpdate=true;}
 syncViewControls();
 if(sunGround)sunGround.visible=sunSettings.enabled&&sunSettings.onGround&&
  !['hidden','wire2d','wire3d'].includes(renderStyle);
 if(fallbackCanvas)fallbackDraw();
 text('Visual Style: '+CAD3D_VISUAL_STYLES[mode]+' · cámara y geometría conservadas');
 return true;
}
function setSketchStyle(mode){
 setVisualStyle(isCad3DSketch(mode)?mode:'shaded-edges');
}

function saveViewSettings(){
 var menu=root.querySelector('.viewSaveMenu');
 var size=menu.querySelector('[data-save-size]').value;
 var dpi=Number(menu.querySelector('[data-save-dpi]').value)||300;
 var dims={hd:[1920,1080],'2k':[2560,1440],'4k':[3840,2160],
  a4:[297,210],a3:[420,297],a2:[594,420]};
 var w,h;
 if(size==='viewport'){
  var source=renderer?.domElement||fallbackCanvas;
  w=source?.width||1280;h=source?.height||720;
 }else if(['a4','a3','a2'].includes(size)){
  w=Math.round(dims[size][0]*dpi/25.4);
  h=Math.round(dims[size][1]*dpi/25.4);
 }else if(dims[size]){w=dims[size][0];h=dims[size][1];}
 else{w=Number(menu.querySelector('[data-save-width]').value);h=Number(menu.querySelector('[data-save-height]').value);}
 return {size:size,dpi:dpi,w:Math.round(w),h:Math.round(h),
  format:menu.querySelector('[data-save-format]').value};
}
function updateSaveViewSettings(){
 var menu=root.querySelector('.viewSaveMenu'),settings=saveViewSettings();
 if(settings.size!=='custom'&&Number.isFinite(settings.w)&&Number.isFinite(settings.h)){
  menu.querySelector('[data-save-width]').value=settings.w;
  menu.querySelector('[data-save-height]').value=settings.h;
 }
 var pixels=settings.w*settings.h,valid=Number.isInteger(settings.w)&&Number.isInteger(settings.h)&&
  settings.w>=128&&settings.h>=128&&settings.w<=8192&&settings.h<=8192&&pixels<=24000000;
 menu.querySelector('.saveViewInfo').textContent=valid?
  settings.w+' × '+settings.h+' px · '+(pixels/1000000).toFixed(2)+' MP · '+settings.dpi+' DPI':
  'Resolución inválida: máximo 8192 px por lado y 24 megapíxeles';
 menu.querySelector('[data-save-go]').disabled=!valid;
}
function cad3dPDFfromJPEG(jpegDataUrl,w,h,dpi){
 var binary=atob(jpegDataUrl.split(',')[1]);
 var jpg=new Uint8Array(binary.length);for(var k=0;k<binary.length;k++)jpg[k]=binary.charCodeAt(k);
 var enc=new TextEncoder(),chunks=[],offset=0,xref=[0];
 function append(value){var bytes=typeof value==='string'?enc.encode(value):value;chunks.push(bytes);offset+=bytes.length;}
 function object(n,header,stream){
  xref[n]=offset;append(n+' 0 obj\n'+header);
  if(stream){append('\nstream\n');append(stream);append('\nendstream');}
  append('\nendobj\n');
 }
 var pw=(w*72/dpi).toFixed(3),ph=(h*72/dpi).toFixed(3);
 append('%PDF-1.4\n');
 object(1,'<< /Type /Catalog /Pages 2 0 R >>');
 object(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
 object(3,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+pw+' '+ph+
  '] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>');
 object(4,'<< /Type /XObject /Subtype /Image /Width '+w+' /Height '+h+
  ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+jpg.length+' >>',jpg);
 var cmds=enc.encode('q\n'+pw+' 0 0 '+ph+' 0 0 cm\n/Im0 Do\nQ\n');
 object(5,'<< /Length '+cmds.length+' >>',cmds);
 var xrefAt=offset;append('xref\n0 6\n0000000000 65535 f \n');
 for(var n=1;n<=5;n++)append(String(xref[n]).padStart(10,'0')+' 00000 n \n');
 append('trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+xrefAt+'\n%%EOF');
 return new Blob(chunks,{type:'application/pdf'});
}
async function saveCAD3DView(){
 var o=saveViewSettings(),pixels=o.w*o.h;
 if(!Number.isInteger(o.w)||!Number.isInteger(o.h)||o.w<128||o.h<128||o.w>8192||o.h>8192||pixels>24000000){
  text('Elegí un tamaño entre 128 y 8192 píxeles por lado (máximo 24 MP)');return;
 }
 if(!renderer&&!fallbackCanvas)return text('El visor 3D aún no está disponible');
 var view=root.querySelector('.view'),filename='blackline-cad3d-'+(activeView||'vista')+'-'+o.w+'x'+o.h;
 var out=document.createElement('canvas');out.width=o.w;out.height=o.h;
 var ctx=out.getContext('2d');if(!ctx)return text('No se pudo preparar la exportación');
 var source=renderer?.domElement||fallbackCanvas;
 var oldW=source.width,oldH=source.height,oldPixelRatio=renderer?.getPixelRatio();
 var oldAspect=camera?.aspect,oldLeft=camera?.left,oldRight=camera?.right,oldTop=camera?.top,oldBottom=camera?.bottom;
 try{
  if(renderer){
   // Temporarily render at requested pixel size, restore in finally.
   var max=renderer.capabilities.maxTextureSize;
   if(o.w>max||o.h>max)throw Error('La GPU admite como máximo '+max+' px por lado');
   renderer.setPixelRatio(1);renderer.setSize(o.w,o.h,false);
   if(camera.isPerspectiveCamera)camera.aspect=o.w/o.h;
   else if(camera.isOrthographicCamera){
    var centerX=(oldLeft+oldRight)/2,halfHeight=(oldTop-oldBottom)/2;
    var halfWidth=halfHeight*o.w/o.h;
    camera.left=centerX-halfWidth;camera.right=centerX+halfWidth;
   }
   camera.updateProjectionMatrix();renderer.render(scene,camera);
   ctx.drawImage(renderer.domElement,0,0,o.w,o.h);
  }else{
   // Compatibility renderer is raster; upscaling cannot add detail.
   fallbackDraw();ctx.drawImage(fallbackCanvas,0,0,o.w,o.h);
  }
  if(o.format==='pdf'){
   var pdf=cad3dPDFfromJPEG(out.toDataURL('image/jpeg',.93),o.w,o.h,o.dpi);
   var pdfUrl=URL.createObjectURL(pdf),pdfLink=document.createElement('a');
   pdfLink.href=pdfUrl;pdfLink.download=filename+'.pdf';
   document.body.appendChild(pdfLink);pdfLink.click();pdfLink.remove();
   setTimeout(function(){URL.revokeObjectURL(pdfUrl);},1200);
  }else{
   var type=o.format==='jpg'?'image/jpeg':'image/png';
   var url=out.toDataURL(type,.94),a=document.createElement('a');
   if(url==='data:,')throw Error('No se pudo generar la imagen');
   a.href=url;a.download=filename+'.'+o.format;document.body.appendChild(a);a.click();a.remove();
  }
  text('Vista exportada '+o.w+' × '+o.h+' px · '+o.format.toUpperCase()+
   (renderer?'':' · Vista de compatibilidad ampliada'));
  root.querySelector('.viewSaveMenu').open=false;
 }catch(err){text('No se pudo guardar la vista: '+(err.message||err));}
 finally{
  if(renderer){
   renderer.setPixelRatio(oldPixelRatio);renderer.setSize(view.clientWidth,view.clientHeight,false);
   camera.aspect=oldAspect;
   if(camera.isOrthographicCamera){camera.left=oldLeft;camera.right=oldRight;camera.top=oldTop;camera.bottom=oldBottom;}
   camera.updateProjectionMatrix();renderer.render(scene,camera);
  }
 }
}
function exportViewPNG(){
 var canvas=renderer?.domElement||fallbackCanvas;
 if(!canvas)return text('Primero abrí el visor 3D');
 try{
  if(renderer)renderer.render(scene,camera);
  else fallbackDraw();
  var url=canvas.toDataURL('image/png');
  if(!url||url==='data:,')throw Error('El navegador no pudo capturar el visor');
  var a=document.createElement('a');a.href=url;a.download='blackline-cad3d-'+(root.querySelector('.cad3dViewSelect')?.value||'vista')+(isCad3DSketch(renderStyle)?'-croquis':'')+'.png';
  document.body.appendChild(a);a.click();a.remove();
  text('Vista '+(isCad3DSketch(renderStyle)?'tipo croquis ':'')+'exportada a PNG');
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

/* Native 3D navigation: responsive orientation cube, no external graphics or model mutations. */
var cubeNavigationFaces=[
 {key:'right',label:'RIGHT',normal:[1,0,0],tone:'#36576d',v:[[1,-1,-1],[1,1,-1],[1,1,1],[1,-1,1]]},
 {key:'left',label:'LEFT',normal:[-1,0,0],tone:'#304b5e',v:[[-1,-1,-1],[-1,-1,1],[-1,1,1],[-1,1,-1]]},
 {key:'front',label:'FRONT',normal:[0,-1,0],tone:'#435f71',v:[[-1,-1,-1],[1,-1,-1],[1,-1,1],[-1,-1,1]]},
 {key:'back',label:'BACK',normal:[0,1,0],tone:'#324d60',v:[[-1,1,-1],[-1,1,1],[1,1,1],[1,1,-1]]},
 {key:'top',label:'TOP',normal:[0,0,1],tone:'#617b8d',v:[[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]]},
 {key:'bottom',label:'BOTTOM',normal:[0,0,-1],tone:'#263c4d',v:[[-1,-1,-1],[-1,1,-1],[1,1,-1],[1,-1,-1]]}
];
function renderNavigationCube(){
 if(!root)return;
 var svg=root.querySelector('.cubeScene');
 if(!svg)return;
 var az=orbit.az,el=orbit.el,ca=Math.cos(az),sa=Math.sin(az),ce=Math.cos(el),se=Math.sin(el);
 function project(v){
  return {x:50+26*(-sa*v[0]+ca*v[1]),y:50-26*(-se*ca*v[0]-se*sa*v[1]+ce*v[2])};
 }
 function xy(v){var p=project(v);return p.x.toFixed(2)+','+p.y.toFixed(2);}
 function vector(v){return v.join(',');}
 var toward=[ce*ca,ce*sa,se];
 var faces=cubeNavigationFaces.map(function(f){
  return Object.assign({},f,{depth:f.normal[0]*toward[0]+f.normal[1]*toward[1]+f.normal[2]*toward[2]});
 }).filter(function(f){return f.depth>.025;}).sort(function(a,b){return a.depth-b.depth;});
 var markup='',edges=new Map(),corners=new Map();
 faces.forEach(function(f){
  var c=[0,0,0];
  f.v.forEach(function(v){c[0]+=v[0]/4;c[1]+=v[1]/4;c[2]+=v[2]/4;});
  var center=project(c);
  markup+='<g class="cubeFaceZone" data-view-preset="'+f.key+'" aria-pressed="'+String(activeView===f.key)+'" role="button">'+
   '<title>'+f.label+' view</title><polygon class="cubePlane" style="--cube-tint:'+f.tone+'" points="'+f.v.map(xy).join(' ')+'"/>'+
   '<text class="cubeFaceLabel" x="'+center.x.toFixed(2)+'" y="'+center.y.toFixed(2)+'">'+f.label+'</text></g>';
  f.v.forEach(function(v,i){
   var other=f.v[(i+1)%4],vs=[vector(v),vector(other)].sort(),key=vs.join('|');
   edges.set(key,{a:v,b:other,mid:[(v[0]+other[0])/2,(v[1]+other[1])/2,(v[2]+other[2])/2]});
   corners.set(vector(v),v);
  });
 });
 edges.forEach(function(e){
  var a=project(e.a),b=project(e.b);
  markup+='<line class="cubeEdgeZone" x1="'+a.x.toFixed(2)+'" y1="'+a.y.toFixed(2)+'" x2="'+b.x.toFixed(2)+'" y2="'+b.y.toFixed(2)+'" data-view-vector="'+vector(e.mid)+'"><title>Diagonal edge view</title></line>';
 });
 corners.forEach(function(v){
  var p=project(v);
  markup+='<circle class="cubeCornerZone" cx="'+p.x.toFixed(2)+'" cy="'+p.y.toFixed(2)+'" r="3.4" data-view-vector="'+vector(v)+'"><title>Isometric corner view</title></circle>';
 });
 svg.innerHTML=markup;
}
function orientToCubeVector(value){
 var v=String(value).split(',').map(Number);
 if(v.length!==3||v.some(function(n){return !Number.isFinite(n);}))return;
 var horizontal=Math.hypot(v[0],v[1]);
 if(!horizontal&&!v[2])return;
 orbit.az=horizontal<1e-5?0:Math.atan2(v[1],v[0]);
 orbit.el=Math.atan2(v[2],horizontal);
 viewMode='ortho';activeView='orbit';
 syncViewControls();applyViewCamera();
 root.querySelector('.placementGuide').hidden=true;
 text('Vista axonométrica · Cubo 3D');
}
function bindNavigationCube(cube){
 if(!cube)return;
 var drag=null;
 cube.addEventListener('pointerdown',function(e){
  if(e.button!==0||drag)return;
  var hit=e.target.closest('[data-view-preset],[data-view-vector]');
  e.preventDefault();e.stopPropagation();
  cube.focus({preventScroll:true});
  drag={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,
   moved:false,preset:hit?.dataset.viewPreset||null,vector:hit?.dataset.viewVector||null};
  cube.setPointerCapture(e.pointerId);
 });
 cube.addEventListener('pointermove',function(e){
  if(!drag||drag.id!==e.pointerId)return;
  var dx=e.clientX-drag.lastX,dy=e.clientY-drag.lastY;
  if(!drag.moved&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>5)drag.moved=true;
  drag.lastX=e.clientX;drag.lastY=e.clientY;
  if(drag.moved){
   e.preventDefault();e.stopPropagation();
   cube.dataset.dragging='true';orbitCameraBy(dx,dy);
  }
 });
 function end(e){
  if(!drag||drag.id!==e.pointerId)return;
  var d=drag;drag=null;delete cube.dataset.dragging;
  if(cube.hasPointerCapture(e.pointerId))cube.releasePointerCapture(e.pointerId);
  if(e.type==='pointerup'&&!d.moved){
   if(d.preset)setViewPreset(d.preset);
   else if(d.vector)orientToCubeVector(d.vector);
  }
 }
 cube.addEventListener('pointerup',end);
 cube.addEventListener('pointercancel',end);
 cube.addEventListener('lostpointercapture',function(){drag=null;delete cube.dataset.dragging;});
 cube.addEventListener('keydown',function(e){
  var arrows={ArrowLeft:[-12,0],ArrowRight:[12,0],ArrowUp:[0,-12],ArrowDown:[0,12]};
  if(arrows[e.key]){e.preventDefault();e.stopPropagation();orbitCameraBy(arrows[e.key][0],arrows[e.key][1]);}
  else if(e.key==='Home'){e.preventDefault();setViewPreset('iso');}
 });
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
  var rect=ball.getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
  var mode=Math.hypot(e.clientX-cx,e.clientY-cy)<17?'pan':'orbit';
  drag={id:e.pointerId,x:e.clientX,y:e.clientY,mode:mode};
  ball.dataset.dragging='true';ball.dataset.dragMode=mode;ball.setPointerCapture(e.pointerId);
 });
 ball.addEventListener('pointermove',function(e){
  if(!drag||drag.id!==e.pointerId)return;
  e.preventDefault();e.stopPropagation();
  var dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  drag.x=e.clientX;drag.y=e.clientY;
  if(drag.mode==='pan'){panView(dx,dy,root.querySelector('.view'));applyViewCamera();}
  else orbitCameraBy(dx,dy);
 });
 function finish(e){
  if(!drag||drag.id!==e.pointerId)return;
  drag=null;delete ball.dataset.dragging;delete ball.dataset.dragMode;
 }
 ball.addEventListener('pointerup',finish);
 ball.addEventListener('pointercancel',finish);
 ball.addEventListener('lostpointercapture',function(){drag=null;delete ball.dataset.dragging;delete ball.dataset.dragMode;});
 ball.addEventListener('wheel',function(e){
  if(viewMode==='walk')return;
  e.preventDefault();e.stopPropagation();
  orbit.dist=clamp(orbit.dist*Math.exp(e.deltaY*.001),1.4,450);applyViewCamera();
 },{passive:false});
 ball.addEventListener('keydown',function(e){
  var vectors={ArrowLeft:[-12,0],ArrowRight:[12,0],ArrowUp:[0,-12],ArrowDown:[0,12]};
  if(!vectors[e.key])return;
  e.preventDefault();e.stopPropagation();orbitCameraBy(...vectors[e.key]);
 });
}
function syncViewControls(){
 var selector=root.querySelector('.cad3dViewSelect');
 if(selector)selector.value=activeView;
 root.querySelectorAll('[data-view-preset]').forEach(function(button){
  button.setAttribute('aria-pressed',String(button.dataset.viewPreset===activeView));
 });
}
function setViewPreset(key){
 var v=viewPresets.find(function(p){return p[0]===key;});
 if(!v)return;
 activeView=v[0];viewMode=v[2];orbit.az=v[3];orbit.el=v[4];
 if(key==='top'&&renderStyle==='wire3d')setVisualStyle('wire2d');
 if(viewMode==='walk')target.z=1.65;
 syncViewControls();applyViewCamera();
 if(key==='top')fit3DModel();
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
 if(cad3dViewAlias(raw))return;
 if(!raw){
  if(['line','polyline'].includes(placing)){cad3dFinishPolyline();return;}
  if(['wall','door','window','opening'].includes(placing)){
   if(['line','polyline'].includes(placing)){cad3dFinishPolyline();return;}
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
  var lastDraft=cad3dDraftProfile.length?cad3dDraftProfile[cad3dDraftProfile.length-1]:null;
  var base=lastDraft?{x:lastDraft[0],y:lastDraft[1]}:firstPoint;
  if(relative&&!base)return text('Indicá primero un punto base para usar coordenadas relativas');
  if(relative){x+=base.x;y+=base.y;}
  placePoint({x:x,y:y,z:0});return;
 }
 if(firstPoint&&number.test(raw)&&['wall','move','copy','dist'].includes(placing)){
  var distance=Number(raw),p=cursorPoint||firstPoint,dx=p.x-firstPoint.x,dy=p.y-firstPoint.y,len=Math.hypot(dx,dy);
  if(!Number.isFinite(distance)||distance<=0)return text('Ingresá una distancia positiva');
  placePoint({x:firstPoint.x+(len?dx/len:1)*distance,y:firstPoint.y+(len?dy/len:0)*distance,z:0});return;
 }
 var aliases={L:'line',PL:'polyline',POLI:'polyline',POLILINEA:'polyline',RECT:'rectangle',REC:'rectangle',C:'circle',CIRCULO:'circle',ARC:'arc',ARCO:'arc',MURO:'wall',LOSA:'slab',PISO:'floor',PLATFORM:'floor',SOL:'sun',PUERTA:'door',VENTANA:'window',VANO:'opening',M:'move',CO:'copy',RO:'rotate',E:'extrude',EXTRUDE:'extrude',EXTRUIR:'extrude',EF:'extrudeface',EXTRUDEFACE:'extrudeface',ER:'erase',BORRAR:'erase',DI:'dist'};
 var command=Object.prototype.hasOwnProperty.call(aliases,upper)?aliases[upper]:upper.toLowerCase();
 if(Object.prototype.hasOwnProperty.call(draftModes,command)){toggleDraftMode(command);return;}
 if(command==='check3d'||command==='verify3d'){verify3DSolids();return;}
 if(viewPresets.some(function(v){return v[0]===command;})){setViewPreset(command);return;}
 if(command==='layer'||command==='capas'){root.querySelector('.layerPanel select').focus();return;}
 if(command==='select'||command==='cancel'){setPlacement(null);text('Selección activa');return;}
 if(command==='pan'){text('Paneo: arrastrá con el botón central o derecho');return;}
 if(!action(command))text('Comando 3D desconocido: '+raw);
}
function action(a){
 if(a==='select'){cad3dNavigationTool='select';root.querySelector('.view')?.classList.remove('cad3dPanning');cad3dSyncCompactBars();setPlacement(null);text('Select · elegí un objeto 3D');return true;}
 if(a==='extrude'){cad3dExtrudeSelection();return true;}
 if(a==='extrudeface'){setPlacement('extrudeface');return true;}
 if(['box','sphere','cylinder','cone','dist','floor','line','polyline','rectangle','circle','arc'].includes(a)||Object.prototype.hasOwnProperty.call(ARCH_STYLES,a)){
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
 if(a==='sketch')setSketchStyle(isCad3DSketch(renderStyle)?'shaded-edges':'sketch');
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
  var accepted=['box','sphere','cone','cylinder','wall','slab','boolean','block3d','profile2d'];
  var sanitized=data.records.filter(function(r){return r&&accepted.includes(r.type);}).map(function(r){
   var o={id:finite(r.id,0),type:r.type,layerId:importedLayers.some(function(l){return l.id===r.layerId;})?r.layerId:'0',x:finite(r.x,0),y:finite(r.y,0),z:finite(r.z,0),rot:finite(r.rot,0),
    w:clamp(finite(r.w,2),.01,1000),d:clamp(finite(r.d,2),.01,1000),h:clamp(finite(r.h,2),.01,1000),
    styleId:String(r.styleId||'').slice(0,60),pitch:clamp(finite(r.pitch,0),-45,45),slabKind:r.slabKind==='roof'?'roof':'floor',
    radius:clamp(finite(r.radius,1),.01,1000),openings:[]};
   if(r.type==='profile2d'){
    o.profilePoints=Array.isArray(r.profilePoints)?r.profilePoints.slice(0,512).filter(p=>Array.isArray(p)&&p.length===2&&p.every(v=>Number.isFinite(v)&&Math.abs(v)<10000)):[];
    o.profileClosed=!!r.profileClosed;
    o.extrudedHeight=o.profileClosed?clamp(finite(r.extrudedHeight,0),0,1000):0;
    o.h=o.extrudedHeight;o.name=String(r.name||'2D profile').slice(0,80);
   }
   if(r.type==='block3d')o.blockId=CAD3D_COMPONENTS[r.blockId]?r.blockId:'chair';
   if((r.type==='wall'||r.type==='slab')&&Array.isArray(r.openings)){
    var kinds=r.type==='wall'?['door','window','opening']:['opening'];
    o.openings=r.openings.slice(0,150).filter(function(v){return v&&kinds.includes(v.kind);}).map(function(v){
     var op={id:finite(v.id,0),kind:v.kind,styleId:String(v.styleId||'').slice(0,60),
      offset:finite(v.offset,0),w:clamp(finite(v.w,1),.05,1000)};
     if(v.kind==='door'||v.kind==='window'){
      var defs=cad3DOpeningDefaults(v.kind,v.styleId);
      Object.assign(op,defs);
      op.operation=(v.kind==='door'?['hinged','sliding','folding','pivot','sectional']:
       ['fixed','casement','sliding','awning','hopper','tilt-turn']).includes(v.operation)?v.operation:defs.operation;
      op.leaves=clamp(Math.round(finite(v.leaves,defs.leaves)),1,3);
      op.hinge=v.hinge==='right'?'right':'left';
      op.swing=v.swing==='out'?'out':'in';
      op.openAngle=clamp(finite(v.openAngle,0),0,120);
      op.openPercent=clamp(finite(v.openPercent,0),0,100);
     }
     if(r.type==='wall'){op.h=clamp(finite(v.h,1),.05,1000);op.sill=clamp(finite(v.sill,0),0,1000);}
     else{op.offsetY=finite(v.offsetY,0);op.d=clamp(finite(v.d,1),.05,1000);}
     return op;
    });
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
  var ids=layers.map(function(l){return Number(l.id.split('-')[1])||0;}).concat(records.flatMap(function(r){return [r.id].concat((r.openings||[]).map(function(o){return o.id;}));}));
  serial=ids.reduce(function(max,id){return Math.max(max,finite(id,0));},Math.max(1,finite(data.serial,0)))+1;selected=[];redraw();renderProps();text(records.length+' objetos 3D cargados (sin alterar CAD2D)');
 }catch(err){if(request===importSequence)text('No se pudo abrir .3DJSON: '+String(err.message||err));}
}
window.addEventListener('keydown',function(ev){
 if(!root||root.hidden)return;
 // 3ds Max-like shortcuts: F3 = 3D wireframe, F4 = shaded solids.
 // Only intercept within CAD3D, never while a text input is being edited.
 if((ev.key==='F3'||ev.key==='F4')&&!ev.isComposing&&!ev.altKey&&!ev.ctrlKey&&!ev.metaKey){
  ev.preventDefault();ev.stopImmediatePropagation();
  setVisualStyle(ev.key==='F3'?'wire3d':'shaded');return;
 }
 var mode={F7:'grid',F8:'ortho'}[ev.key];
 if(mode){ev.preventDefault();ev.stopImmediatePropagation();toggleDraftMode(mode);return;}
 if(ev.key==='Enter'&&['wall','door','window','opening','line','polyline'].includes(placing)&&!ev.target?.closest?.('input,textarea,select,[contenteditable=true]')){
  ev.preventDefault();ev.stopImmediatePropagation();
  if(['line','polyline'].includes(placing)){cad3dFinishPolyline();return;}
  var finished=placing;setPlacement(null);text(finished.toUpperCase()+' finalizado');
  return;
 }
 if(ev.key==='Escape'){
  ev.preventDefault();ev.stopImmediatePropagation();
  cad3dEndZoom();
  if(dragging){
   var canvas=renderer?.domElement||fallbackCanvas;
   if(canvas){delete canvas.dataset.navigationDrag;try{if(canvas.hasPointerCapture(dragging.id))canvas.releasePointerCapture(dragging.id);}catch(_e){}}
   dragging=null;
  }
  setPlacement(null);
  hideObjectContextMenu();
  if(!root.querySelector('.archPalette').hidden)showArchPalette(false);
  var guide=root.querySelector('.placementGuide');if(guide)guide.hidden=true;
  text('Comando cancelado · Selection ready');
  return;
 }
 if(ev.ctrlKey||ev.metaKey||ev.altKey||ev.isComposing||ev.target?.closest?.('input,textarea,select,[contenteditable=true]'))return;
 var key=ev.key.toLowerCase();
 if(['t','l','r','v','p','o','c','z'].includes(key)&&!ev.repeat){
  ev.preventDefault();ev.stopImmediatePropagation();cad3dViewAlias(key);return;
 }
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
 if(key==='+'||key==='='||key==='add'||key==='numpadadd'||key==='-'||key==='subtract'||key==='numpadsubtract'){
  ev.preventDefault();ev.stopImmediatePropagation();cad3dZoomStep(['+','=','add','numpadadd'].includes(key)?1:-1);return;
 }
 if(/^[a-z0-9@.,-]$/i.test(ev.key)){
  ev.preventDefault();ev.stopImmediatePropagation();
  if(['T','F','L','R','Z','B','V','P','I','O'].includes(ev.key.toUpperCase())){
   cad3dViewAlias(ev.key);return;
  }
  var input=root.querySelector('#cad3dCommand');input.focus({preventScroll:true});input.value+=ev.key;
 }
},true);

window.BlacklineCAD3D=Object.freeze({open:open,close:close,get enabled(){return !!root&&!root.hidden;},get experimental(){return true;}});
/* Only install a launcher. Three.js is not requested until the explicit user click. */
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',launch,{once:true});else launch();
})();
