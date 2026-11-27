const {test}=require('node:test');
const assert=require('node:assert/strict');
const bim=require('../cad-bim.js');
const wall=(id,face)=>({id,type:'line',wall2d:{group:'A',face,guideA:{x:0,y:0},guideB:{x:5000,y:0},thickness:200}});
const state=()=>({entities:[wall(1,0),wall(2,1),{id:3,type:'rect',a:{x:0,y:0},b:{x:4000,y:5000},bim:{class:'Space',name:'=BAD'}}],blocks:{},selected:[1]});
test('wall faces are grouped; metric gross quantities and room area',()=>{const s=state(),plan=bim.prepare(s,{class:'Wall',heightM:'2.7',material:'Brick',level:'Ground'},()=>false);assert.equal(plan.length,1);assert.equal(plan[0].items.length,2);for(const e of plan[0].items)e.bim=plan[0].value;const rows=bim.inventory(s,1);assert.equal(rows.length,2);assert.ok(Math.abs(rows[0].grossVolumeM3-2.7)<1e-8);assert.equal(rows[1].footprintM2,20);});
test('locked wall face prevents partial metadata mutation',()=>assert.throws(()=>bim.prepare(state(),{class:'Wall'},e=>e.id===2)));
test('incomplete wall has no claimed gross volume',()=>{const s=state();s.entities.splice(1,1);s.entities[0].bim={class:'Wall',heightM:2.7};const r=bim.inventory(s,1)[0];assert.equal(r.quality,'incomplete-wall');assert.equal(r.grossVolumeM3,null);});
test('CSV neutralizes formulas',()=>assert.ok(bim.csv(bim.inventory(state(),1)).includes("'=BAD")));
test('unit conversions agree',()=>{const s=state();const row=bim.inventory(s,1)[0];assert.equal(row.lengthM,5);assert.equal(row.thicknessM,.2);});

test('reject crossed and degenerate footprints; accept concave simple polygons',()=>{
 const make=(id,pts)=>({id,type:'polyline',closed:true,pts:pts.map(([x,y])=>({x,y})),bim:{class:'Space',level:'PB'}});
 const entities=[make(1,[[0,0],[4,4],[0,4],[3,0]]),make(2,[[0,0],[1,0],[2,0]]),make(3,[[0,0],[4,0],[4,2],[2,2],[2,4],[0,4],[0,0]])];
 const rows=bim.inventory({entities},1000);
 assert.equal(rows[0].footprintM2,null);assert.equal(rows[1].footprintM2,null);assert.equal(rows[2].footprintM2,12);
 assert.equal(bim.audit(rows).length,2);
});
test('summary separates levels and classes and does not substitute zero for missing measurements',()=>{
 const s=state();for(const e of s.entities.slice(0,2))e.bim={class:'Wall',heightM:2.7,level:'PB',material:'Brick'};
 s.entities[2].bim.level='PA';
 const rows=bim.inventory(s,1),summary=bim.summarize(rows);
 const w=summary.find(x=>x.class==='Wall'),room=summary.find(x=>x.class==='Space');
 assert.equal(w.count,1);assert.equal(w.totals.lengthM,5);assert.equal(room.totals.footprintM2,20);
 assert.equal(room.totals.grossVolumeM3,undefined);assert.equal(room.unmeasured.grossVolumeM3,1);assert.equal(bim.audit(rows).length,0);
});
test('reject nonfinite conversion factor and flag missing slab thickness',()=>{
 assert.throws(()=>bim.inventory(state(),Infinity));
 const s={entities:[{id:1,type:'rect',a:{x:0,y:0},b:{x:5,y:4},bim:{class:'Slab',level:'PB',material:'Concrete'}}]};
 const rows=bim.inventory(s,1000);assert.equal(rows[0].footprintM2,20);assert.equal(rows[0].grossVolumeM3,null);
 assert.deepEqual(bim.audit(rows)[0].issues,['missing-slab-thickness']);
});
