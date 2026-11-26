/* ARQ Assist: el motor entiende ambientes y medidas habituales; la derivación reconoce muros y obras.
 * Run: node --test tests/arq-assist-understanding.test.cjs */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const engine=require('../architecture/blackline-engine.js');
const cases=[['local comercial de 8 x 12',[8,12]],['cochera de 3 x 5',[3,5]],['quincho de 6x4 con parrilla',[6,4]],['galería de 3 x 8',[3,8]],
 ['room 4 by 3 m with a door and a window',[4,3]],['dining room 4x5',[4,5]],['garage 3 x 6',[3,6]],['habitacion 4x3,5',[4,3.5]],['dormitorio de 3 por 4 con puerta',[3,4]]];
for(const [q,[w,d]] of cases)test('engine draws: '+q,()=>{
 const plan=engine.run(q);
 assert.equal(plan.schema,'blackline.architecture.v1');
 assert.equal(plan.walls.length,4,'four walls');
 const xs=plan.walls.flatMap(x=>[x.a?.[0]??x.a?.x,x.b?.[0]??x.b?.x]).filter(Number.isFinite),ys=plan.walls.flatMap(x=>[x.a?.[1]??x.a?.y,x.b?.[1]??x.b?.y]).filter(Number.isFinite);
 const W=Math.max(...xs)-Math.min(...xs),D=Math.max(...ys)-Math.min(...ys);
 assert.ok(Math.abs(Math.max(W,D)-Math.max(w,d))<.6&&Math.abs(Math.min(W,D)-Math.min(w,d))<.6,q+' → '+W.toFixed(2)+'×'+D.toFixed(2));
});
test('"dining room" is one room, not dining + generic room',()=>{assert.equal(engine.interpret('dining room 4x5').rooms?.length??1,1)});
test('ARQ Assist routes walls and famous works',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../cad-arq-pro.js'),'utf8');
 assert.match(src,/function arqWallRequest\(raw\)/);assert.match(src,/kind:'wall',length:w/);
 assert.match(src,/villa savoye\|ville savoye\|casa curutchet/);assert.match(src,/b\.openClassics\(arqClassicExpand\(raw\)\)/);
 assert.match(src,/amobl\\w\*/);
});
