/* MTEXT: renglones por salto de línea y por ancho de caja.
 * Run: node --test tests/mtext.test.cjs */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const a=html.indexOf('/* MTEXT: texto de varias líneas'),b=html.indexOf('function cadCircularTextGlyphs(e){',a);
assert.ok(a>=0&&b>a,'MTEXT helpers present');
const api=new Function(`const P=(x,y)=>({x,y}),fontCSS=()=>'10px Arial';${html.slice(a,b)};return {cadIsMText,cadMTextLines,cadMTextWrap};`)();

test('single-line text is untouched',()=>{
 const e={type:'text',p:{x:0,y:0},h:.25,text:'HOLA'};
 assert.equal(api.cadIsMText(e),false);
 assert.deepEqual(api.cadMTextLines(e),[e]);
});
test('line breaks become rows below the first baseline',()=>{
 const rows=api.cadMTextLines({type:'text',p:{x:1,y:5},h:.2,text:'A\nB\nC'});
 assert.equal(rows.length,3);
 assert.deepEqual(rows.map(r=>r.text),['A','B','C']);
 assert.ok(Math.abs(rows[1].p.y-(5-.3))<1e-9&&Math.abs(rows[2].p.y-(5-.6))<1e-9);
 assert.equal(rows[2].p.x,1);
});
test('box width wraps long paragraphs by words',()=>{
 const rows=api.cadMTextWrap({type:'text',h:1,mtextWidth:10,text:'uno dos tres cuatro cinco seis'});
 assert.ok(rows.length>1);
 for(const r of rows)assert.ok(r.length*.6<=10+1e-9||!r.includes(' '));
 assert.equal(rows.join(' '),'uno dos tres cuatro cinco seis');
});
test('rotated text stacks rows along the rotated axis',()=>{
 const rows=api.cadMTextLines({type:'text',p:{x:0,y:0},h:1,rotation:90,text:'A\nB'});
 assert.ok(Math.abs(rows[1].p.x-1.5)<1e-9&&Math.abs(rows[1].p.y)<1e-9);
});
test('DXF export writes MTEXT and import keeps line breaks',()=>{
 assert.match(html,/head\('MTEXT',e,lay,color\),'100','AcDbMText'/);
 assert.match(html,/const cleanMText=s=>s\.replace\(\/\\\\P\/g,'\\n'\)/);
});
