'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const {test}=require('node:test');

const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(match=>match[1]);
const keyboard=scripts.find(s=>s.includes('single global keyboard-to-command dispatcher'));
const main=scripts.find(s=>s.includes('const CAD2D_TYPED_ALIASES='));
assert.ok(keyboard,'Early keyboard dispatcher exists');
assert.ok(main,'CAD command engine exists');

test('typing PL in the model space fills COMMAND continuously without a click',()=>{
 class MockElement{closest(){return null}}
 const canvas=new MockElement(),events=[];
 const command={
  value:'',disabled:false,closest:()=>null,
  focus(){events.push('focus')},
  setSelectionRange(){},
  dispatchEvent(){events.push('input')}
 };
 const app={contains:element=>element===canvas};
 const listeners=[];
 const window={addEventListener:(event,listener,capture)=>{if(event==='keydown'&&capture)listeners.push(listener)}};
 const document={querySelector:selector=>selector==='.app'?app:null,
  getElementById:id=>id==='command'?command:null,body:{},documentElement:{}};
 vm.runInNewContext(keyboard,{window,document,Element:MockElement,Event:class Event{}});
 assert.equal(listeners.length,1);
 for(const key of ['P','L']){
  const e={key,target:canvas,isComposing:false,defaultPrevented:false,ctrlKey:false,metaKey:false,altKey:false,
   preventDefault(){this.defaultPrevented=true},stopImmediatePropagation(){}};
  listeners[0](e);
  assert.equal(e.defaultPrevented,true);
 }
 assert.equal(command.value,'PL');
 assert.equal(events.filter(v=>v==='input').length,2);
});

test('direct distance 5 + Enter computes an actual 5-unit segment for LINE, PLINE and WALL',()=>{
 const first=main.indexOf('// Direct distance entry: point + mouse direction + length + Enter.');
 const last=main.indexOf('}let aliases=',first);
 assert.ok(first>=0&&last>first,'real runCommand direct distance branch');
 const code=main.slice(first,last+1);
 const P=(x,y)=>({x,y}),sub=(a,b)=>P(a.x-b.x,a.y-b.y),add=(a,b)=>P(a.x+b.x,a.y+b.y),
  mul=(a,n)=>P(a.x*n,a.y*n);
 for(const tool of ['line','polyline','wall2d']){
  const state={tool,stage:[P(0,0)],mouse:P(10,0)};
  let placed=null;
  const execute=new Function('state','value','pointer','world','P','sub','add','mul','handlePoint','schedule','toast',code);
  execute(state,'5',P(10,0),p=>p,P,sub,add,mul,p=>{placed=p},()=>{},()=>{});
  assert.ok(placed,tool+' must place a second point');
  assert.ok(Math.abs(placed.x-5)<1e-9&&Math.abs(placed.y)<1e-9,tool+' should be exactly 5 units');
 }
});

test('visible Save, Save As and command equivalents are distinct',()=>{
 assert.match(html,/id="saveProjectBtn"[^>]*>Save<\/button>/);
 assert.match(html,/id="saveAsBtn"[^>]*>Save As<\/button>/);
 assert.match(main,/if\(cmd==='SAVE'\|\|cmd==='QSAVE'\)return saveJSON\(\)/);
 assert.match(main,/if\(cmd==='SAVEAS'\)return saveAsJSON\(\)/);
 assert.match(main,/function saveAsJSON\(\)\{return saveJSON\(true\)\}/);
});

test('the active command name is based on the engine tool, not a previous WALL selection',()=>{
 assert.match(main,/const key=cmd; \/\/ Report the actual engine command/);
 assert.match(main,/cad2dLastCommand=cadCommandName\(t\)/);
 assert.match(main,/state\.activeRibbonTool='select'/);
 assert.match(main,/Specify next point or distance \[Undo\/Close\]/);
 assert.match(main,/Specify next point or distance \[Justify\/Thickness\/Undo\]/);
});
