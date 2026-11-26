/* Exportación DXF con bloques nativos (BLOCK/INSERT) y caracteres no ASCII escapados.
 * Run: node --test tests/dxf-native-blocks.test.cjs */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const i=html.indexOf('function buildDXFText('),f=html.slice(i,html.indexOf('function exportDXF(',i));
test('block references become INSERT of shared BLOCK definitions',()=>{
 assert.match(f,/'INSERT',r,lay\),'100','AcDbBlockReference','2',d\.name/);
 assert.match(f,/blocks\.push\('0','BLOCK'/);
 assert.match(f,/BLOCK_RECORD','5',d\.br/);
 assert.match(f,/writeList\(entities\.filter\(e=>!refDef\.has\(e\)(?:&&!dimDefs\.has\(e\))?\)\)/);
});
test('non-ASCII characters are written as \\U+XXXX and decoded on import',()=>{
 assert.match(f,/'\\\\U\+'\+c\.charCodeAt\(0\)/);
 assert.match(html,/text=String\(text\|\|''\)\.replace\(\/\\\\U\\\+\(\[0-9A-Fa-f\]\{4\}\)\/g/);
});
test('linear and aligned dimensions export as DIMENSION with an anonymous *D block',()=>{
 assert.match(f,/name:'\*D'\+\(\+\+dimN\)/);
 assert.match(f,/head\('DIMENSION',e,lay\),'100','AcDbDimension','2',d\.name/);
 assert.match(f,/'100','AcDbAlignedDimension','13'/);
 assert.match(f,/'100','AcDbRotatedDimension'/);
 assert.match(f,/'70','1','10','0','20','0','30','0','3',d\.name/,'anonymous block flag');
});
