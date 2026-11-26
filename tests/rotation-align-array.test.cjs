const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
function fixture(entities,answers=[]){
 const state={entities,stage:[],selected:entities.map(e=>e.id),nextId:100,tool:'align2p'};
 const messages=[];const ctx=vm.createContext({state,clone:x=>JSON.parse(JSON.stringify(x)),P:(x,y)=>({x,y}),sub:(a,b)=>({x:a.x-b.x,y:a.y-b.y}),add:(a,b)=>({x:a.x+b.x,y:a.y+b.y}),validEditSelection:()=>state.entities.filter(e=>state.selected.includes(e.id)),window:{prompt:()=>answers.shift()},toast:m=>messages.push(m),prompt:()=>{},schedule:()=>{},saveHistory:()=>{},updateAll:()=>{},log:()=>{}});
 for(const [a,b] of [['function transformEntity(','\nfunction doTransform('],['function cadRotateExact(','\nfunction cadApplyRotation('],['function cadAlignTwoPoints(','\nfunction cadSelectSimilar('],['function cadPolarArray(','\n// Arco tangente']]){
  const i=html.indexOf(a),j=html.indexOf(b,i);assert.ok(i>=0&&j>i);vm.runInContext(html.slice(i,j),ctx);
 }
 return {ctx,state,messages};
}
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,a+' != '+b);
test('ALIGN rotates all four rectangle corners, preserving area and side lengths',()=>{
 const f=fixture([{id:1,type:'rect',a:{x:0,y:0},b:{x:2,y:1}}]);
 for(const p of [{x:0,y:0},{x:5,y:6},{x:1,y:0},{x:6,y:7}])f.ctx.cadAlignTwoPoints(p);
 const e=f.state.entities[0];assert.equal(e.type,'polyline');assert.equal(e.closed,true);assert.equal(e.pts.length,4);near(e.pts[0].x,5);near(e.pts[0].y,6);
 for(let i=0;i<4;i++){const a=e.pts[i],b=e.pts[(i+1)%4];near(Math.hypot(b.x-a.x,b.y-a.y),i%2===0?2:1)}
});
test('ARRAYPOLAR rotates block insertion position and orientation',()=>{
 const f=fixture([{id:1,type:'blockRef',p:{x:2,y:0},rotation:30,scale:1,blockName:'CHAIR'}],['4','0,0','360']);
 f.ctx.cadPolarArray();assert.equal(f.state.entities.length,4);const e=f.state.entities[1];near(e.p.x,0);near(e.p.y,2);near(e.rotation,120);assert.equal(e.blockName,'CHAIR');assert.equal(f.state.entities[0].rotation,30);
});
test('ARRAYPOLAR rejects a linked opening rather than duplicating its host references',()=>{
 const f=fixture([{id:1,type:'line',a:{x:0,y:0},b:{x:1,y:0},autoOpeningRef:10}],['4','0,0','360']);
 f.ctx.cadPolarArray();assert.equal(f.state.entities.length,1);assert.match(f.messages[0],/vanos vinculados/);
});
