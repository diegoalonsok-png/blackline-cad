'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const engine=require('../architecture/blackline-engine.js');
const cases=[
 ['habitaciones x 3 de 4 x 5 m',3,4,5,'bedroom'],
 ['habitaciones x 5 de 3,5 x 4 m',5,3.5,4,'bedroom'],
 ['baños en set x 5 de 2,5 x 3 m',5,2.5,3,'bathroom'],
 ['baños en tándem de 3 de 2.5 x 3 m',3,2.5,3,'bathroom'],
 ['set de 3 baños de 2,5 x 3 m',3,2.5,3,'bathroom'],
 ['bedrooms x 5 of 4 by 5 m',5,4,5,'bedroom'],
 ['3 habitaciones en tándem de 4 x 5 m',3,4,5,'bedroom'],
 ['baños x 3 de 250 x 300 cm',3,2.5,3,'bathroom']
];
for(const [raw,n,w,d,kind] of cases)test('ARQASSIST room set: '+raw,()=>{
 const plan=engine.run(raw);
 assert.equal(plan.rooms.length,n);
 assert.equal(plan.walls.length,3*n+1);
 assert.equal(plan.openings.filter(o=>o.kind==='swing-door').length,n);
 assert.equal(plan.openings.filter(o=>o.kind==='framed-window').length,n);
 assert.equal(new Set(plan.walls.map(x=>x.id)).size,plan.walls.length);
 for(const room of plan.rooms){assert.equal(room.kind,kind);assert.deepEqual(room.clearBounds.slice(2),[w,d]);}
 for(let i=1;i<n;i++)assert.ok(Math.abs(plan.rooms[i].clearBounds[0]-plan.rooms[i-1].clearBounds[0]-w-plan.brief.wall)<1e-8);
 assert.ok(plan.blocks.length>=2*n);
});
test('invalid room quantities and ambiguous shorthand fail rather than draw the wrong plan',()=>{
 for(const raw of ['habitaciones x 0 de 4 x 5','baños x 31 de 2.5 x 3','habitaciones x 2.5 de 4 x 5','habitaciones x 3 x 5'])assert.throws(()=>engine.run(raw),/Cantidad|cantidad/);
});
test('room set bar routing takes priority without hijacking the gallery',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../cad-arq-pro.js'),'utf8');
 const a=source.indexOf('function arqRoomSetRequest(raw)'),b=source.indexOf('function arqRouteOf(raw)',a);
 assert.ok(a>=0&&b>a);
 const match=new Function(source.slice(a,b)+';return arqRoomSetRequest;')();
 for(const [raw] of cases)assert.equal(match(raw),true,raw);
 for(const raw of ['baños','buscar baños','baños jpg','dormitorio de 3 por 4 con puerta'])assert.equal(match(raw),false,raw);
 assert.match(source,/if\(arqRoomSetRequest\(raw\)\)return \{kind:'draw'\}/);
 assert.match(source,/EXT\.drawArchitectureCommand=async raw=>\{\s*if\(!arqRoomSetRequest\(raw\)\)/);
});
