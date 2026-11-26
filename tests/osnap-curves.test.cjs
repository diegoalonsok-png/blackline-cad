/* OSNAP: intersecciones con círculos/arcos y prioridad de CERCANO. Run: node --test tests/osnap-curves.test.cjs */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const a=html.indexOf('function cadOnCurveAngle('),b=html.indexOf('function cadSnapPointIndexed(',a);
const sweep=html.match(/function arcSweep\(a0,a1\)\{[^}]*\}/)[0];
const api=new Function('P','TAU',sweep+html.slice(a,b)+';return {cadSegCircleInts,cadCircleCircleInts,cadOnCurveAngle}')((x,y)=>({x,y}),Math.PI*2);
const near=(p,q)=>Math.hypot(p.x-q.x,p.y-q.y)<1e-9;
for(const O of [0,600,1e6]){
 test('segment × circle exact at offset '+O,()=>{
  const pts=api.cadSegCircleInts({x:O+15,y:O+1},{x:O+25,y:O+1},{type:'circle',c:{x:O+20,y:O},r:3});
  assert.equal(pts.length,2);assert.ok(pts.some(p=>near(p,{x:O+20+Math.sqrt(8),y:O+1})));
 });
 test('circle × circle exact at offset '+O,()=>{
  const pts=api.cadCircleCircleInts({type:'circle',c:{x:O+40,y:O},r:2},{type:'circle',c:{x:O+43,y:O},r:2});
  assert.equal(pts.length,2);assert.ok(pts.some(p=>near(p,{x:O+41.5,y:O+Math.sqrt(1.75)})));
 });
}
test('arc keeps only intersections inside its sweep',()=>{
 const arc={type:'arc',c:{x:0,y:0},r:2,a0:0,a1:Math.PI/2};
 const pts=api.cadSegCircleInts({x:-3,y:1},{x:3,y:1},arc);
 assert.equal(pts.length,1);assert.ok(near(pts[0],{x:Math.sqrt(3),y:1}));
});
test('NEAREST is only a fallback and arc END/MID exist',()=>{
 assert.match(html,/if\(kind==='NEAREST'\)\{if\(d<nearFallbackD\)/);
 assert.match(html,/if\(!nearest&&nearFallback\)\{nearest=nearFallback;type='NEAREST'\}/);
 assert.match(html,/candidates\.push\(\[at\(e\.a0\),'END'\],\[at\(e\.a0\+sw\),'END'\]\)/);
});
