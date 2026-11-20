/* Atributos de bloque: ATTDEF en la definición, valores por referencia, DXF ATTRIB.
 * Run: node --test tests/block-attributes.test.cjs */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const a=html.indexOf('/* Atributos de bloque (ATTDEF / ATTEDIT). */'),b=html.indexOf('function cadEditBlockAttributes(',a);
assert.ok(a>=0&&b>a,'attribute helpers present');
const state={blocks:{TAG:{name:'TAG',entities:[
 {type:'rect',a:{x:0,y:0},b:{x:2,y:1}},
 {type:'text',p:{x:.1,y:.5},h:.2,text:'P-00',attdef:{tag:'CODIGO',prompt:'Código'}},
 {type:'text',p:{x:.1,y:.2},h:.2,text:'',attdef:{tag:'NOTA',prompt:'Nota',invisible:true}}
]}}};
const api=new Function('state',`${html.slice(a,b)};return {cadBlockAttDefs,cadAttrValue};`)(state);

test('attribute definitions are listed once per tag, with defaults',()=>{
 const defs=api.cadBlockAttDefs('TAG');
 assert.deepEqual(defs.map(d=>d.tag),['CODIGO','NOTA']);
 assert.equal(defs[0].def,'P-00');assert.equal(defs[1].invisible,true);
 assert.deepEqual(api.cadBlockAttDefs('NOPE'),[]);
});
test('reference values override defaults',()=>{
 const [codigo]=api.cadBlockAttDefs('TAG');
 assert.equal(api.cadAttrValue({attrs:{}},codigo),'P-00');
 assert.equal(api.cadAttrValue({attrs:{CODIGO:'P-07'}},codigo),'P-07');
 assert.equal(api.cadAttrValue({attrs:{CODIGO:''}},codigo),'');
});
test('block children substitute values and hide invisible attributes',()=>{
 assert.match(html,/if\(e\.attdef\.invisible\)return \[\];/);
 assert.match(html,/ref\.attrs&&Object\.prototype\.hasOwnProperty\.call\(ref\.attrs,tag\)/);
});
test('DXF import reads ATTDEF and the ATTRIB values after an INSERT',()=>{
 assert.match(html,/type==='ATTDEF'\)\{/);
 assert.match(html,/recs\[j\]\[0\]==='ATTRIB'/);
 assert.ok(!/const silent=new Set\(\[[^\]]*'ATTDEF'/.test(html),'ATTDEF is no longer ignored');
});
test('commands are registered',()=>{
 for(const k of ['ATTDEF','ATTEDIT','ATTEXT'])assert.ok(html.includes("'"+k+"'"),k);
});
