const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function extract(a,b){
 const from=html.indexOf(a);
 const to=html.indexOf(b,from);
 assert.ok(from>=0&&to>from,'Cannot locate '+a);
 return html.slice(from,to);
}
const code=extract('function cancelCadCommand(){','function undoDrawingVertex(){');
function fixture(tool='polyline',pts=[{x:0,y:0},{x:5,y:0}]){
 const state={tool,stage:pts,drag:null,modifyCandidate:{mode:'tmp'},entities:[],selected:[],history:[],future:[]};
 const events=[],command={value:'partial'};
 const functions=new Function('state','events','command',`
 const $=id=>command;
 const clearOtrackAnchors=()=>events.push('clearTracking');
 const toast=message=>events.push('toast:'+message);
 const setTool=tool=>{state.tool=tool;state.stage=[];events.push('tool:'+tool)};
 const saveHistory=()=>events.push('saveHistory');
 const newEntity=entity=>{state.entities.push(entity);events.push('newEntity')};
 const log=msg=>events.push(msg);
 const clone=value=>JSON.parse(JSON.stringify(value));
 const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const buildRibbon=()=>{},prompt=()=>{},schedule=()=>{};
 const document={querySelector:()=>({dataset:{tab:'home'}})};
 ${code}
 return {cancelCadCommand,finishStage};
 `)(state,events,command);
 return {state,events,command,...functions};
}
test('ESC cancels PLINE without geometry or history',()=>{
 const v=fixture();v.cancelCadCommand();
 assert.equal(v.state.entities.length,0);
 assert.equal(v.state.history.length,0);
 assert.equal(v.state.tool,'select');
 assert.equal(v.state.stage.length,0);
 assert.equal(v.command.value,'');
 assert.ok(!v.events.includes('saveHistory'));
});
test('Enter commits PLINE once',()=>{
 const v=fixture();v.finishStage();
 assert.equal(v.state.entities.length,1);
 assert.equal(v.state.entities[0].type,'polyline');
 assert.deepEqual(v.state.entities[0].pts,[{x:0,y:0},{x:5,y:0}]);
 assert.equal(v.events.filter(x=>x==='saveHistory').length,1);
 assert.equal(v.state.tool,'select');
});
test('ESC cancels LINE without changing completed segments',()=>{
 const v=fixture('line',[{x:0,y:0},{x:1,y:0}]);
 v.state.entities.push({type:'line',a:{x:0,y:0},b:{x:1,y:0}});
 v.cancelCadCommand();
 assert.equal(v.state.entities.length,1);
 assert.equal(v.state.tool,'select');
});
test('Escape shortcut calls cancel and Space completes active lines',()=>{
 assert.match(html,/if\(ev.key==='Escape'\)\{[^\n]*cancelCadCommand\(\);return/);
 assert.match(html,/if\(\['line','polyline','wall2d'\]\.includes\(state\.tool\)&&state\.stage\.length\)\{finishStage\(\);return\}spaceDown=true/);
});
test('active command context menu uses same cancel path',()=>{
 assert.match(html,/item\('✕ Cancelar \/ Esc',\(\)=>cancelCadCommand\(\)\)/);
});
test('right click exposes OTRACK shortcut',()=>{
 assert.match(html,/item\('Rastreo OSNAP · F11'/);
});
