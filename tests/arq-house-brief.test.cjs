const test=require('node:test'),assert=require('node:assert'),path=require('path'),fs=require('fs');
const A=require(path.join(__dirname,'../architecture/blackline-engine.js'));
test('ARQ Assist: programa de vivienda escrito como arquitecto, con superficie objetivo',()=>{
 const p=A.run('necesito una planta de casa sin limite de terreno de 75 mts 2 hab + 2 baños  + cocina + living');
 const kinds=p.rooms.map(r=>r.kind);
 assert.strictEqual(kinds.filter(k=>k==='bedroom').length,2);assert.strictEqual(kinds.filter(k=>k==='bathroom').length,2);
 assert.ok(kinds.includes('kitchen')&&kinds.includes('living'));assert.ok(p.walls.length>10&&p.openings.length>6&&p.blocks.length>6);
 const m=p.assumptions.join(' ').match(/≈ (\d+) m²/);assert.ok(m&&Math.abs(Number(m[1])-75)<=8,'superficie cercana a 75');
 const q=A.run('casa de 120 m2 3 dormitorios 2 baños cocina living');assert.strictEqual(q.rooms.filter(r=>r.kind==='bedroom').length,3);
});
test('la ruta de ARQ Assist dibuja el programa de vivienda en lugar de abrir catálogos',()=>{
 const s=fs.readFileSync(path.join(__dirname,'../cad-arq-pro.js'),'utf8');
 assert.match(s,/if\(arqHouseDesignRequest\(raw\)\)return \{kind:'draw'\};/);assert.match(s,/if\(!arqRoomSetRequest\(raw\)&&!arqHouseDesignRequest\(raw\)\)\{/);
});
