const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const src = fs.readFileSync('cad3d-lab.js', 'utf8');
function between(start, end) {
 const a = src.indexOf(start), b = src.indexOf(end, a + start.length);
 assert(a >= 0 && b > a, 'Missing CAD3D source segment: ' + start);
 return src.slice(a, b);
}
const joins = between('function wallJoinOffsets(wall){', 'function applyWallMiter(');
const boundary = between('var cad3dPlanBoundaryCache=', 'function cad3dRenderPlanWalls(){');
function wall(id, x, y, w, d, rot, openings = []) {
 return {id, type:'wall', x, y, z:0, w, d, h:2.8, rot, openings};
}
function outlines(records) {
 const ctx = {records, visibleRecord:() => true, Math, Number};
 vm.runInNewContext(joins + '\n' + boundary, ctx);
 const edges = ctx.cad3dPlanBoundarySegments();
 assert.strictEqual(ctx.cad3dPlanBoundarySegments(), edges, 'Plan cache should reuse unchanged outlines');
 return edges;
}
const near = (a, b) => Math.abs(a - b) < 1e-7;

test('CAD3D 3D walls keep editable records while the plan draws joined outlines', () => {
 assert.doesNotThrow(() => new vm.Script(src));
 const records = [wall(1, 2, 0, 4, .2, 0), wall(2, 4, 2, 4, .2, 90)];
 const before = JSON.stringify(records);
 const edges = outlines(records);
 assert.equal(JSON.stringify(records), before, 'Presentation must never alter parametric 3D walls');
 assert.equal(edges.length, 6, 'Mitred L corner must have one unified outer contour');
});
test('A pair of collinear walls has no internal end cap in plan', () => {
 const edges = outlines([wall(1,2,0,4,.2,0), wall(2,6,0,4,.2,0)]);
 assert(!edges.some(e => near(e.a.x, 4) && near(e.b.x, 4)), 'Internal cap is visible');
 assert.equal(edges.length, 6);
});
test('T joint joins the branch to the host face without drawing a false seam', () => {
 const edges = outlines([wall(1,0,0,8,.2,0), wall(2,0,-2,4,.2,90)]);
 assert.equal(edges.length, 8);
 const seam = edges.filter(e => near(e.a.y,-.1) && near(e.b.y,-.1));
 assert(seam.every(e => e.a.x <= -.1 || e.b.x >= .1), 'Branch connector must be removed from host outline');
});
test('A door opening remains a genuine gap in wall plan geometry', () => {
 const edges = outlines([wall(1,2,0,4,.2,0,[{kind:'door',offset:0,w:1,sill:0}])]);
 assert.equal(edges.length, 8, 'Door must split the wall footprint in two');
});
test('Top-plan overlay retains door, window and style wiring', () => {
 const overlay = between('function cad3dRenderPlanWalls(){', 'function renderRulers(){');
 for (const phrase of ['cad3dPlanBoundarySegments()', "o.kind==='window'", "v.o.kind==='door'",
  "'wire2d','wire3d','hidden','shaded','shaded-edges','monochrome'"]) {
  assert(overlay.includes(phrase), phrase);
 }
});
test('CAD3D palettes share CAD2D theme and support floating/resizable operation', () => {
 for (const phrase of ['background:var(--cad-ui-base', 'background:var(--cad-ui-raised',
  'function cad3dBindSidebarPalettes()', 'function cad3dWatchPaletteResize(name,panel)',
  'cad3dWatchPaletteResize(\'architecture\',palette)', 'cad3dWatchPaletteResize(\'sun\',panel)',
  'resize:both!important', 'cad3dPaletteRemember(name,panel)']) {
  assert(src.includes(phrase), phrase);
 }
});
test('M shortcut directly OPENS Materials without accidentally toggling it closed', () => {
 assert(src.includes("if(key==='m'&&!ev.repeat){ev.preventDefault();ev.stopImmediatePropagation();cad3dShowMaterials(true);return;}"));
 assert(src.includes("if(key==='M')cad3dShowMaterials(true)"));
});

test('CAD3D Undo/Redo icons match visible CAD2D SVGs and keep history bindings', () => {
 const html = fs.readFileSync('index.html','utf8');
 function svg(source, marker){
  const start = source.indexOf(marker);
  assert(start >= 0, 'Missing '+marker);
  const a=source.indexOf('<svg',start), b=source.indexOf('</svg>',a);
  assert(a >= 0 && b >= a, 'Missing SVG for '+marker);
  return source.slice(a,b+6);
 }
 assert.equal(svg(src,'data-history="undo"'),svg(html,'id="cadHeaderUndo"'));
 assert.equal(svg(src,'data-history="redo"'),svg(html,'id="cadHeaderRedo"'));
 assert(src.includes("if(button.dataset.history==='undo')cad3dUndo();"));
 assert(src.includes("if(button.dataset.history==='redo')cad3dRedo();"));
 assert(src.includes('.cad3dHistoryButton:disabled{'));
 assert(src.includes('.cad3dHistoryButton svg{'));
});

test('Giro palette preserves six circular reference controls without duplicating the old navigation bar',()=>{
 const markup=src.slice(src.indexOf('function cad3dGiroMarkup(){'),src.indexOf('function cad3dCenterModelWithoutZoom(){'));
 const indexOrder=['orbit','panorama','ring','hand','center','fit'];
 for(let i=0;i<indexOrder.length;i++){
  const needle="['"+indexOrder[i]+"',";
  const idx=markup.indexOf(needle);
  assert(idx>0,needle);
  if(i)assert(idx>markup.indexOf("['"+indexOrder[i-1]+"',"),'Order is preserved');
 }
 assert(markup.includes('Variantes de interacción (Botón Girar)'));
 assert(markup.includes('cad3dGiroDisk'));
 assert(markup.includes('zoomButton(1,\'Adelante\')'));
 assert(markup.includes('zoomButton(-1,\'Atrás\')'));
 assert(markup.includes('data-giro-zoom'));
 const nav=src.slice(src.indexOf('function cad3dCompact3DBar(){'),src.indexOf('function cad3dSyncCompactBars(){'));
 assert(nav.includes("var tools=[['select'"));
 assert(nav.includes('data-giro-open'));
 assert(!nav.includes("['orbit','Giro libre'"),'Remove the duplicate old orbit button');
});
test('Giro preserves dock/move and continuous hold zoom stopping on release',()=>{
 const code=src.slice(src.indexOf('function cad3dInitGiroPalette(){'),src.indexOf('function cad3dBasicBars(){'));
 for(const term of ['pointerdown','pointermove','pointerup','pointercancel',
   'lostpointercapture','requestAnimationFrame(step)','cancelAnimationFrame(zoom.frame)',
   'cad3dGiroZoomFrame(zoom.direction,dt)','cad3dGiroDocked',
   'blackline-cad3d-giro-palette-v1','aria-pressed'])assert(code.includes(term),term);
 assert(src.includes("cad3dInitGiroPalette();"));
 assert(src.includes("cad3dNavigationTool==='panorama'&&e.shiftKey"));
 assert(src.includes('function cad3dCenterModelWithoutZoom()'));
});

test('Compact 2D-scale Giro palette keeps eight controls on one row with visibility toggle',()=>{
 const start=src.indexOf('function cad3dGiroSvg(kind){'),end=src.indexOf('function cad3dCenterModelWithoutZoom(){',start);
 const markup=new Function(src.slice(start,end)+'return cad3dGiroMarkup();')();
 assert.equal((markup.match(/class="cad3dGiroChoice(?: |")/g)||[]).length,8);
 assert(markup.includes('data-giro-zoom="1"'));
 assert(markup.includes('data-giro-zoom="-1"'));
 assert(!markup.includes('cad3dGiroZoomStrip'));
 for(const prop of ['data-giro-minimize','data-giro-pin','data-giro-close'])assert(markup.includes(prop),prop);
 assert(src.includes('grid-template-columns:repeat(8,minmax(0,1fr))!important'));
 assert(src.includes('height:165px;min-height:48px'));
 assert(src.includes("launch.textContent=open?'⟳ Girar ▴':'⟳ Girar ▾'"));
 assert(src.includes('Math.min(initial.width,820,root.clientWidth-16)'));
 assert(src.includes('if(initial.collapsed)setCollapsed(true);'));
});

test('Existing Parametric Gallery launcher has an explicit visible GALERÍA 3D label',()=>{
 assert(src.includes('title="Abrir o cerrar Galería 3D paramétrica"'));
 assert(src.includes('<span>GALERÍA 3D</span>'));
 assert(src.includes('button.btn.archLaunch > span'));
 assert(src.includes('display:inline!important;font:700 10px/1.1 Arial,sans-serif!important'));
});
test('Gallery can dock alongside Layers and detach without duplicating objects',()=>{
 const script=between('var cad3dArchDockStorageKey=', 'function showArchPalette(show){');
 const classes=new Set();
 const button={textContent:'',title:'',setAttribute(){}};
 const palette={
  classList:{contains:x=>classes.has(x),add:x=>classes.add(x),remove:x=>classes.delete(x)},
  querySelector:x=>x==='[data-arch-dock]'?button:null,
  style:{left:'120px',top:'100px',width:'340px',height:'340px'},
  dataset:{},offsetWidth:340,offsetHeight:340,hidden:false,
  getBoundingClientRect(){return {left:120,top:100,width:340,height:340};}
 };
 const layers={nextSibling:{id:'properties'},querySelector(){return {textContent:'Layers'};}};
 const side={
  firstChild:layers,
  querySelectorAll(){return [layers];},
  insertBefore(p,next){p.parentNode=this;this.lastInsertion=next;},
  classList:{toggle(){}},
  getBoundingClientRect(){return {left:700,right:1000,top:100,bottom:750};}
 };
 const root={
  clientWidth:1100,clientHeight:820,
  querySelector(sel){return sel==='.archPalette'?palette:sel==='.side.sidebar'?side:null;},
  appendChild(p){p.parentNode=this;},
  getBoundingClientRect(){return {left:0,top:0};}
 };
 const store=new Map();
 const ctx={root,localStorage:{setItem:(k,v)=>store.set(k,v),getItem:k=>store.get(k)||null},
  cad3dPaletteRemember(){},cad3dPaletteRestore(){return true;},
  cad3dPaletteConstrain(){},cad3dBringPaletteFront(){},
  clamp:(n,min,max)=>Math.max(min,Math.min(max,n)),Math,Array};
 vm.runInNewContext(script,ctx);
 assert.equal(ctx.cad3dArchDockNear(692,300),true,'Near the Layers sidebar is magnetic');
 assert.equal(ctx.cad3dArchDockNear(400,300),false,'Far from Layers stays floating');
 assert.equal(ctx.cad3dArchSetDocked(true),true);
 assert.equal(palette.parentNode,side);
 assert.equal(side.lastInsertion,layers.nextSibling,'Stack gallery directly after Layers');
 assert.equal(classes.has('cad3dArchDocked'),true);
 assert.equal(button.textContent,'↗ Desacoplar');
 assert.equal(ctx.cad3dArchSetDocked(false),false);
 assert.equal(palette.parentNode,root);
 assert.equal(classes.has('cad3dArchDocked'),false);
 assert.equal(button.textContent,'⇥ Acoplar');
});
test('Gallery header drag can snap into sidebar and preserve Layers',()=>{
 const code=between('function beginArchGesture(e){', 'function clickArchPalette(e){');
 for(const token of ['cad3dArchDockNear(ev.clientX,ev.clientY)',
  'cad3dArchSetDocked(true)','cad3dArchSetDocked(false,{rect:b})',
  'window.addEventListener(\'pointermove\',move,true)',
  'window.removeEventListener(\'pointermove\',move,true)',
  'cad3dPaletteRemember(\'architecture\',palette)'])assert(code.includes(token),token);
 assert(src.includes('cad3dArchRestoreDocking();'));
 assert(src.includes('if(!palette.hidden)cad3dPaletteRemember(\'architecture\',palette)'));
});
