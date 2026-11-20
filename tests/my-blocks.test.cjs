/* Mis bloques: el generador reproduce la geometría guardada, escalada.
 * Run: node --test tests/my-blocks.test.cjs */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../cad-my-blocks.js'),'utf8');
test('module registers commands and drop targets',()=>{
 for(const k of ['ADDTOMYBLOCKS','AGREGARBLOQUE','DIMSTYLEFROM','ESTILODECOTA'])assert.ok(src.includes("'"+k+"'"),k);
 assert.match(src,/#dimStyleLibrary/);assert.match(src,/#arqPanel,#cadBlockBrowser/);
});
test('saved block regenerates scaled lines, circles and arcs',()=>{
 const store={};
 const win={CAD2D_CORE:{state:{entities:[],selected:[]},P:(x,y)=>({x,y}),canvas:{addEventListener(){}},toast(){}},CAD2D_ARQ_LIBRARY:{library:[],categories:[]}};
 const rec={id:'mine-x',name:'X',w:2,d:1,ents:[{type:'line',a:{x:0,y:0},b:{x:2,y:1}},{type:'circle',c:{x:1,y:.5},r:.5},{type:'arc',c:{x:0,y:0},r:1,a0:0,a1:Math.PI/2}]};
 store['cad2d-my-blocks']=JSON.stringify([rec]);
 const ls={getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v}};
 const doc={createElement:()=>({style:{},append(){}}),head:{append(){}},querySelectorAll:()=>[]};
 new Function('window','localStorage','document',src)(win,ls,doc);
 const it=win.CAD2D_ARQ_LIBRARY.library.find(x=>x.id==='mine-x');
 assert.ok(it&&it.cat==='Mis bloques'&&it.lockAspect);
 const out=[];const b={line:(...a)=>out.push(['L',...a]),poly:(p,c)=>out.push(['P',p.length,c]),circle:(...a)=>out.push(['C',...a]),arc:(...a)=>out.push(['A',...a]),tp:(x,y)=>({x,y}),push:e=>out.push(['E',e.type])};
 it.gen(b,4,2);
 assert.deepEqual(out[0],['L',0,0,4,2]);
 assert.deepEqual(out[1],['C',2,1,1]);
 assert.deepEqual(out[2],['A',0,0,2,0,90]);
});
