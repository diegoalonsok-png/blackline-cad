'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const engine=require('../architecture/blackline-engine.js');
const cases=[
 ['baños públicos de 6 x 5 m con 4 inodoros y 3 lavatorios',1,{toilet:4,basin:3}],
 ['batería de baños de 7 x 6 con 4 inodoros y 4 lavamanos, cabinas de 1,2 x 1,8 m y circulación de 1,5 m',1,{toilet:4,basin:4}],
 ['vestuarios deportivos de 8 x 7 con 4 duchas y 4 lockers y 2 bancos',1,{shower:4,locker:4,changingBench:2}],
 ['baños en batería x 2 de 6 x 5 m con 3 inodoros y 2 lavatorios',2,{toilet:6,basin:4}],
 ['public restrooms 6 by 5 m with 4 toilets and 2 basins',1,{toilet:4,basin:2}]
];
for(const [raw,n,counts] of cases)test('sanitary battery: '+raw,()=>{
 const p=engine.run(raw);assert.equal(p.rooms.length,n);
 assert.equal(p.blocks.length,Object.values(counts).reduce((a,b)=>a+b,0));
 for(const [role,count] of Object.entries(counts))assert.equal(p.blocks.filter(b=>b.role===role).length,count);
 assert.equal(p.openings.filter(o=>o.kind==='swing-door').length,n+(counts.toilet||0)+(counts.shower||0));
 const ids=new Set(p.walls.map(w=>w.id));assert.equal(ids.size,p.walls.length);assert.ok(p.openings.every(o=>ids.has(o.host)));
 for(let i=0;i<p.blocks.length;i++)for(let j=i+1;j<p.blocks.length;j++){
  const [x,y,w,d]=p.blocks[i].envelope,[a,b,c,e]=p.blocks[j].envelope;
  assert.ok(x+w<=a+1e-8||a+c<=x+1e-8||y+d<=b+1e-8||b+e<=y+1e-8);
 }
});
test('sanitary batteries reject impossible layouts rather than omit equipment',()=>{
 for(const q of ['baños públicos de 2 x 2 con 4 inodoros','baños públicos de 6 x 5 con 4 inodoros y circulación de 0,8 m','baños públicos de 6 x 5 con 4 duchas y cabinas de 1 x 1,5 m'])assert.throws(()=>engine.run(q));
});
test('sanitary battery routing bypasses gallery',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../cad-arq-pro.js'),'utf8');
 const a=src.indexOf('function arqSanitaryBatteryRequest(raw)'),b=src.indexOf('function arqParkingRequest(raw)',a);
 const match=new Function(src.slice(a,b)+'return arqSanitaryBatteryRequest;')();
 for(const [q] of cases)assert.ok(match(q));
 assert.equal(match('buscar baños públicos'),false);
 assert.match(src,/if\(arqSanitaryBatteryRequest\(raw\)\)return \{kind:'draw'\}/);
});
