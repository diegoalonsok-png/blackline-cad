const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function extract(begin,end){const a=html.indexOf(begin),b=html.indexOf(end,a);assert.ok(a>=0&&b>a,begin+' present');return html.slice(a,b)}
const dimSource=extract('function dimensionPrimitives(e){','/* Block references are one model entity');
const glyphSource=extract('function cadCircularTextGlyphs(e){','function flattenCADEntities(entities)');
const fn=new Function('state',`
const P=(x,y)=>({x,y}),add=(a,b)=>P(a.x+b.x,a.y+b.y),sub=(a,b)=>P(a.x-b.x,a.y-b.y),mul=(a,n)=>P(a.x*n,a.y*n),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),U={m:1000,cm:10,mm:1},TAU=2*Math.PI;
${dimSource}
${glyphSource}
return {dimensionPrimitives,cadCircularTextGlyphs};
`)({precision:2,unit:'m'});
const dim={type:'dimension',a:{x:0,y:0},b:{x:5,y:0},p:{x:2.5,y:1},mode:'aligned',layer:'dimensions'};
const label=e=>fn.dimensionPrimitives(e).filter(x=>x.type==='text').map(x=>x.text)[0];
test('dimension uses measured value until user overrides it',()=>{
 assert.equal(label(dim),'5.00');
 assert.equal(label({...dim,textOverride:'2.35'}),'2.35');
 assert.equal(label({...dim,textOverride:'ANCHO <>'}),'ANCHO 5.00');
 assert.equal(label({...dim,textOverride:null}),'5.00');
});
test('dimension override never changes measurement geometry',()=>{
 const changed={...dim,textOverride:'NOTA DE OBRA'};
 assert.equal(label(changed),'NOTA DE OBRA');
 assert.deepEqual(fn.dimensionPrimitives(changed).filter(x=>x.type==='line'),fn.dimensionPrimitives(dim).filter(x=>x.type==='line'));
});
test('circular text keeps one editable source but computes oriented characters',()=>{
 const original={type:'text',p:{x:3,y:4},text:'MURO',h:.2,rotation:0,textPath:'circle',textRadius:2,textStartAngle:0,textDirection:'ccw'};
 const g=fn.cadCircularTextGlyphs(original);
 assert.equal(g.length,4);
 assert.equal(g.map(x=>x.text).join(''),'MURO');
 assert.ok(g.every(x=>Math.abs(Math.hypot(x.p.x-3,x.p.y-4)-2)<1e-7));
 assert.ok(g.every(x=>x.textPath==='straight'));
 assert.equal(original.text,'MURO');
});
test('clockwise circular text uses clockwise progression',()=>{
 const item={type:'text',p:{x:0,y:0},text:'AB',h:.25,textPath:'circle',textRadius:1,textDirection:'cw',textStartAngle:0};
 const [a,b]=fn.cadCircularTextGlyphs(item);
 assert.ok(b.p.y<a.p.y);
});
test('toolbar exposes shadow and circle controls without changing the drawing',()=>{
 for(const id of ['cadTextBarShadow','cadTextBarShadowColor','cadTextBarShadowOffset','cadTextBarPath','cadTextBarRadius','cadTextBarStartAngle','cadTextBarDirection'])assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(html,/textShadowOffset/);
 assert.match(html,/function editCadDimensionText/);
 assert.match(html,/editCadDimensionText\(entity\)/);
});
