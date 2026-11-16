const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {plan}=require('../cad-wall-join.js'),grip=require('../cad-wall-grip.js');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const line=(id,a,b,layer='walls')=>({id,type:'line',a,b,layer});
const p=(x,y)=>({x,y});
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('auto L join pulls close endpoint to exact intersection',()=>{
 const a=line(1,p(0,0),p(4.97,0)),b=line(2,p(4.95,0),p(4.95,3));
 const result=plan(b,[a],.08);
 assert.equal(result.updates.length,1);assert.equal(result.updates[0].id,1);
 close(result.updates[0].point.x,4.95);close(result.line.a.x,4.95);
});
test('T join extends new endpoint but preserves continuous existing wall',()=>{
 const result=plan(line(3,p(2,2),p(2,.04)),[line(1,p(0,0),p(5,0))],.08);
 assert.deepEqual(result.updates,[]);close(result.line.b.y,0);
});
test('X cross does not alter continuous existing wall',()=>{
 const result=plan(line(3,p(2,-2),p(2,2)),[line(1,p(0,0),p(5,0))],.08);
 assert.equal(result.updates.length,0);close(result.line.a.y,-2);
});
test('distant unconnected walls cannot auto join',()=>{
 const result=plan(line(3,p(2,2),p(2,1)),[line(1,p(0,0),p(5,0))],.08);
 close(result.line.b.y,1);assert.deepEqual(result.updates,[]);
});
test('middle grip moves horizontal wall only perpendicular',()=>{
 const wall=line(1,p(0,0),p(5,0));
 const shift=grip.projectShift(wall,p(0,0),p(3,2),0);
 close(shift.dx,0);close(shift.dy,2);
 const moved=grip.shifted(wall,shift);close(moved.a.y,2);close(moved.b.y,2);close(moved.b.x,5);
});
test('middle grip moves vertical wall only perpendicular',()=>{
 const wall=line(1,p(2,0),p(2,5));
 const shift=grip.projectShift(wall,p(0,0),p(2,4),0);
 close(shift.dx,2);close(shift.dy,0);
});
test('virtual measurement tracks distance to closest parallel wall',()=>{
 const wall=line(1,p(0,0),p(5,0));
 const distance=grip.nearestParallelWall(wall,[line(2,p(0,4),p(5,4)),line(3,p(0,8),p(5,8))]);
 close(distance.signed,4);assert.equal(distance.wallId,2);
});
test('non-overlapping walls do not generate misleading clearance',()=>{
 const wall=line(1,p(0,0),p(5,0));
 assert.equal(grip.nearestParallelWall(wall,[line(2,p(10,3),p(12,3))]),null);
});
test('wall join and grip are not exported as drawing entities',()=>{
 assert.match(html,/drawWallDragMeasurement\(\)/);
 assert.match(html,/if\(d\.type==='wallMiddleGrip'\)/);
 assert.match(html,/saveHistory\(\);object\.a=P\(d\.preview\.a\.x/);
 assert.match(html,/cad-wall-join\.js/);
 assert.match(html,/cad-wall-grip\.js/);
});
test('auto joins are only applied to editable wall lines',()=>{
 assert.match(html,/if\(!targetLayer\|\|!targetLayer\.visible\|\|targetLayer\.locked\|\|!explicitWallLayerName/);
 assert.match(html,/if\(e\.type!=='line'\|\|e\.autoOpeningRef!==undefined\)return false/);
});
test('opening preset is selectable and preserves block width as editable parameter',()=>{
 assert.match(html,/id="blOpeningWidth"/);
 assert.match(html,/ref\.params\.width=width/);
 assert.match(html,/blRefWidth/);
});
