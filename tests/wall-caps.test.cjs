/* Tapas automáticas en los extremos libres de los muros.
 * Run: node --test tests/wall-caps.test.cjs */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const a=html.indexOf('/* Tapas de muro:'),b=html.indexOf('function cadComputeWallCaps(',a),c=html.indexOf('\n}\n',b)+3;
assert.ok(a>=0&&b>a&&c>b,'wall cap helper present');
const caps=new Function('U','state','clone',`${html.slice(b,c)};return cadComputeWallCaps;`)({m:1000},{unit:'m'},o=>JSON.parse(JSON.stringify(o)));
const P=(x,y)=>({x,y});
const wall=(id,group,face,a,b)=>({id,type:'line',a,b,layer:'walls',width:.25,wall2d:{group,face,thickness:.2}});
test('a single straight wall gets a cap at each end',()=>{
 const r=caps([wall(1,'w1',0,P(0,0),P(4,0)),wall(2,'w1',1,P(0,.2),P(4,.2))]);
 assert.equal(r.length,2);
 assert.ok(r.every(c=>c.wallCap&&Math.abs(Math.hypot(c.b.x-c.a.x,c.b.y-c.a.y)-.2)<1e-9));
});
test('ends joined at a corner are not capped',()=>{
 const r=caps([wall(1,'w1',0,P(0,0),P(4,0)),wall(2,'w1',1,P(0,.2),P(3.8,.2)),wall(3,'w2',0,P(4,0),P(4,-3)),wall(4,'w2',1,P(3.8,.2),P(3.8,-3))]);
 assert.equal(r.length,2,'only the two far free ends');
 assert.ok(r.every(c=>c.a.x<.01||c.a.y<-2.9));
});
test('a T junction end that lands on another wall face is not capped',()=>{
 const r=caps([wall(1,'h',0,P(-3,0),P(3,0)),wall(2,'h',1,P(-3,.2),P(3,.2)),wall(3,'t',0,P(0,.2),P(0,3)),wall(4,'t',1,P(.2,.2),P(.2,3))]);
 assert.equal(r.filter(c=>c.a.y<1&&c.a.x>-.1&&c.a.x<.3&&c.b.y<1).length,0);
});
