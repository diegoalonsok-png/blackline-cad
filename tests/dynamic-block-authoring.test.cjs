/* Espacio de edición de bloques dinámicos. Run: node --test tests/dynamic-block-authoring.test.cjs */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'../cad-bloques-dinamicos.js'),'utf8'),html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function load(){
 const noop=()=>{},window={CAD2D_CORE:{canvas:{addEventListener:noop},state:{entities:[],selected:[],blocks:{}},blockEdit:()=>null},CAD2D_EXTENSIONS:{overlays:[],commands:{}},CAD2D_PLUS:{pick:noop}};
 vm.runInNewContext(src,{window,document:{documentElement:{lang:'es'},addEventListener:noop,getElementById:()=>null},setTimeout,console});
 return window.CAD2D_DYNBLOCK;
}
const D0=load(),J=o=>JSON.parse(JSON.stringify(o)),D={apply:(d,r)=>J(D0.apply(d,r)),toWorld:(r,p)=>J(D0.toWorld(r,p)),toBlock:(r,p)=>J(D0.toBlock(r,p))};
const def={entities:[{type:'rect',a:{x:0,y:0},b:{x:1.2,y:.7},dk:'r'},{type:'circle',c:{x:.6,y:1},r:.2,dk:'c'},{type:'line',a:{x:.1,y:.35},b:{x:.3,y:.35},dk:'l'}],
 dyn:{params:[{id:'w',kind:'linear',action:'stretch',a:{x:0,y:.35},b:{x:1.2,y:.35},frame:{minX:1,maxX:1.4,minY:-.2,maxY:.9},keys:['r'],min:.6,max:2.4,inc:.05},
  {id:'f',kind:'flip',a:{x:.6,y:0},b:{x:.6,y:.7},keys:['l']},
  {id:'g',kind:'rotation',c:{x:.6,y:1},r:.3,base:0,keys:['c']}],
  vis:{states:['Completo','Sin silla'],hidden:{'Completo':[],'Sin silla':['c']}}}};
test('without values the block keeps its drawn geometry',()=>{
 const out=D.apply(def,{});assert.equal(out.length,3);assert.deepEqual(out[0].b,{x:1.2,y:.7});
});
test('linear stretch moves only the vertices inside the frame, with limits and increment',()=>{
 const xs=r=>D.apply(def,{dyn:{w:r}})[0].pts.map(p=>+p.x.toFixed(6)).sort((a,b)=>a-b);
 assert.deepEqual(xs(2),[0,0,2,2]);
 assert.deepEqual(xs(9),[0,0,2.4,2.4],'max');assert.deepEqual(xs(.1),[0,0,.6,.6],'min');assert.deepEqual(xs(1.62),[0,0,1.6,1.6],'increment .05');
});
test('flip reflects only its objects; visibility hides by state',()=>{
 const out=D.apply(def,{dyn:{f:true,__vis:'Sin silla'}});
 assert.equal(out.length,2);const l=out.find(e=>e.type==='line');assert.deepEqual([+l.a.x.toFixed(6),+l.b.x.toFixed(6)],[1.1,.9]);
});
test('rotation turns its objects around the center',()=>{
 const def2={entities:[{type:'line',a:{x:1,y:0},b:{x:2,y:0},dk:'x'}],dyn:{params:[{id:'g',kind:'rotation',c:{x:0,y:0},r:1,base:0,keys:['x']}]}};
 const l=D.apply(def2,{dyn:{g:90}})[0];assert.ok(Math.abs(l.a.x)<1e-9&&Math.abs(l.a.y-1)<1e-9&&Math.abs(l.b.y-2)<1e-9);
});
test('world ↔ block coordinates honor insertion, rotation, scale and mirror',()=>{
 const ref={p:{x:10,y:5},rotation:30,scale:2,flipBlockX:true};const q={x:.4,y:-.3},w=D.toWorld(ref,q),b=D.toBlock(ref,w);
 assert.ok(Math.abs(b.x-q.x)<1e-9&&Math.abs(b.y-q.y)<1e-9);
});
test('the program wires the editor space: geometry hook, save/close hooks, cache signature, palette',()=>{
 assert.match(html,/if\(definition\?\.dyn&&window\.CAD2D_DYNBLOCK\)return CAD2D_DYNBLOCK\.apply\(definition,ref\)/);
 assert.match(html,/dynOut=window\.CAD2D_DYNBLOCK\?\.onSave\(job\.newBase\)/);assert.match(html,/window\.CAD2D_DYNBLOCK\?\.onClose\(\)/);
 assert.match(html,/def\.dynamic2d,def\.dyn,def\.libraryLayer0/);assert.match(html,/cad-bloques-dinamicos\.js\?v=/);
 assert.match(src,/id='cadBlockPalette'/);assert.match(src,/'BLOQUENUEVO','NEWBLOCK'/);assert.match(src,/data-no-cad-translate/);
});
