const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('cad3d-lab.js','utf8');
const a=source.indexOf('function cadSketchPaperAndHatch('),b=source.indexOf('function exportViewPNG(){',a);
assert(a>0&&b>a);
const code=source.slice(a,b);
function makeScene(){
 const tracker={draw:0,restore:0,export:0};
 const props={value:'',clientWidth:640,clientHeight:420};
 const ctx={
  fillStyle:'',strokeStyle:'',lineWidth:1,save(){},restore(){},
  fillRect(){tracker.draw++},beginPath(){},moveTo(){},lineTo(){},
  stroke(){},drawImage(){tracker.draw++},
  getImageData(x,y,w,h){return {data:new Uint8ClampedArray(w*h*4).fill(40)}}
 };
 const canvas={width:1,height:1,getContext(){return ctx},
  toBlob(cb){tracker.export++;cb({type:'image/png'})}};
 const links=[];
 const doc={createElement(name){
  if(name==='canvas')return canvas;
  if(name==='a')return {click(){tracker.download=true},remove(){},set href(v){},set download(v){}};
  throw Error(name);
 },body:{appendChild(){}}};
 const root={querySelector(){return props}};
 const view={root,document:doc,renderer:{
  domElement:canvas,pixelRatio:2,
  getPixelRatio(){return this.pixelRatio},
  setPixelRatio(n){this.pixelRatio=n},
  getSize(){return {x:640,y:420}},
  setSize(w,h){this.width=w;this.height=h;tracker.maxWidth=Math.max(tracker.maxWidth||0,w);tracker.restore+=(w===640&&h===420)?1:0},
  render(){tracker.draw++}
 }};
 return {ctx,canvas,props,doc,tracker,view};
}
test('Export renders a true larger canvas locally and restores live WebGL viewport',()=>{
 const s=makeScene(),out=[];
 const env={T:{Vector2:class{}},renderer:s.view.renderer,root:s.view.root,document:s.doc,
  fallbackCanvas:null,renderStyle:'sketch-ink',cadSketchTuning:{paper:.3,roughness:.8},
  cadEffectiveSketch:()=>({stroke:'ink',edge:0x202020}),
  isCad3DSketch:n=>n.startsWith('sketch'),
  clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),
  scene:{},camera:{},text:t=>out.push(t),URL:{createObjectURL:()=>'/blob',revokeObjectURL(){}},
  setTimeout(fn){fn()},fallbackDraw(){}};
 vm.runInNewContext(code,env);env.exportSketchPresentation();
 assert(s.tracker.maxWidth>640,'The offscreen render must exceed viewport resolution');
 assert.equal(s.view.renderer.width,640,'The live view is restored after capture');
 assert.equal(s.view.renderer.pixelRatio,2);
 assert.equal(s.tracker.restore,1);
 assert.equal(s.tracker.export,1);
 assert(s.tracker.download);
 assert(out.some(t=>t.includes('generado en tu navegador')));
});
test('Rendering failure restores pixel ratio, dimensions and reports error',()=>{
 const s=makeScene(),out=[];
 s.view.renderer.render=function(){throw Error('GPU unavailable')};
 const env={T:{Vector2:class{}},renderer:s.view.renderer,root:s.view.root,document:s.doc,
  fallbackCanvas:null,renderStyle:'sketch-ink',cadSketchTuning:{paper:.4,roughness:1},
  cadEffectiveSketch:()=>({stroke:'ink',edge:0x222222}),
  isCad3DSketch:()=>true,clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),
  scene:{},camera:{},text:t=>out.push(t),URL:{},fallbackDraw(){}};
 vm.runInNewContext(code,env);
 // Render restoration itself may throw; the implementation must tolerate this.
 try{env.exportSketchPresentation()}catch(e){assert.fail('Failed render escaped cleanup: '+e)}
 assert.equal(s.view.renderer.pixelRatio,2);
 assert.equal(s.tracker.restore,1);
 assert(out.some(t=>t.includes('No se pudo renderizar')));
});
test('Paper and hatching are included in actual output pixels, not just CSS',()=>{
 const s=makeScene(),env={cadSketchTuning:{paper:.4,roughness:1},
 clamp:(x,a,b)=>Math.max(a,Math.min(b,x))};
 vm.runInNewContext(code,env);
 s.canvas.width=96;s.canvas.height=96;
 env.cadSketchPaperAndHatch(s.canvas,s.ctx,{stroke:'ink',edge:0x334455});
 assert(s.tracker.draw>0);
});
test('Render HQ action remains available without external service',()=>{
 assert(source.includes("tool('renderSketch','Render Croquis HQ'"));
 assert(source.includes("else if(a==='renderSketch')exportSketchPresentation()"));
 assert(!code.includes('fetch('));
 assert(!code.includes('XMLHttpRequest'));
});

test('Human rendering presets add density-dependent engraved crosshatching and selective two-color pigment',()=>{
 const s=makeScene(),segment=source.slice(source.indexOf('function cadSketchPaperAndHatch('),source.indexOf('function exportSketchPresentation(){'));
 assert(segment.includes("mode==='etching'"),'engraving style missing');
 assert(segment.includes("mode==='bluepen'"),'blue ink missing');
 assert(segment.includes("mode==='duotone'"),'selective marker color missing');
 assert(segment.includes("mode==='gesture'"),'human construction strokes missing');
 assert(segment.includes('density>.38'),'deep tones need second engraving angle');
 const colors=[],ctx=s.ctx;
 let strokes=0;
 ctx.getImageData=(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4).fill(0)});
 ctx.stroke=function(){strokes++};
 Object.defineProperty(ctx,'strokeStyle',{set(v){colors.push(v)},get(){return colors.at(-1)}});
 const env={cadSketchTuning:{paper:.0,roughness:1},clamp:(x,a,b)=>Math.max(a,Math.min(b,x))};
 vm.runInNewContext(segment,env);s.canvas.width=160;s.canvas.height=160;
 env.cadSketchPaperAndHatch(s.canvas,ctx,{stroke:'etching',edge:0x223344});
 assert(strokes>0,'Engraving generates strokes from dark regions');
 env.cadSketchPaperAndHatch(s.canvas,ctx,{stroke:'duotone',edge:0x255c9a});
 assert(colors.some(v=>v.includes('211,43,40')),'Red marker strokes rendered');
 assert(colors.some(v=>v.includes('37,92,154')),'Blue marker strokes rendered');
});
