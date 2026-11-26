/* Exportación DXF con bloques nativos (BLOCK/INSERT) y caracteres no ASCII escapados.
 * Run: node --test tests/dxf-native-blocks.test.cjs */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const i=html.indexOf('function buildDXFText('),f=html.slice(i,html.indexOf('function exportDXF(',i));
test('block references become INSERT of shared BLOCK definitions',()=>{
 assert.match(f,/'INSERT',r,lay\)(?:,insH=ins\[3\];\s*ents\.push\(\.\.\.ins)?,'100','AcDbBlockReference',(?:\.\.\.\(atts\.length\?\['66','1'\]:\[\]\),)?'2',d\.name/);
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
test('pattern hatches export as editable HATCH with islands, and import keeps islands as holes',()=>{
 assert.match(f,/const patternHatch=e=>/);
 assert.match(f,/ansi\?'ANSI31':'CAD2D_'/);
 assert.match(f,/OUT\.push\('92',i\?'2':'19'/);
 const parser=fs.readFileSync(path.join(__dirname,'../cad-dxf-parser.js'),'utf8');
 assert.match(parser,/g\.holes\.push\(p\.pts\)/);
 assert.match(parser,/\^CAD2D_\(\[A-Z0-9\]\+\)\$/);
});
test('block attributes export as ATTDEF in the definition and ATTRIB per insertion',()=>{
 assert.match(html,/function blockChildren\(ref,keepAttDefs=false\)/);
 assert.match(f,/head\('ATTDEF',e,lay\)/);
 assert.match(f,/'100','AcDbAttributeDefinition','3'/);
 assert.match(f,/head\('ATTRIB',c,al\)/);
 assert.match(f,/'0','SEQEND','5',H\(\),'330',insH/);
});
test('radius, diameter, 3-point angular and ordinate dimensions export and import natively',()=>{
 for(const sub of ['AcDbRadialDimension','AcDbDiametricDimension','AcDb3PointAngularDimension','AcDbOrdinateDimension'])assert.ok(f.includes(sub),sub);
 const parser=fs.readFileSync(path.join(__dirname,'../cad-dxf-parser.js'),'utf8');
 assert.match(parser,/\[3,4,5,6\]\.includes\(dt\)/);
 assert.match(parser,/'ordinateX':'ordinateY'/);
});
test('original DXF hatch patterns are kept and written back unchanged; worker loads current parser and patterns',()=>{
 const parser=fs.readFileSync(path.join(__dirname,'../cad-dxf-parser.js'),'utf8');
 assert.match(parser,/dxfPattern=\{name:/);
 assert.match(f,/const op=e\.dxfPattern;/);
 const worker=fs.readFileSync(path.join(__dirname,'../cad-dxf-import-worker.js'),'utf8');
 const v=(worker.match(/cad-dxf-parser\.js\?v=([\w-]+)/)||[])[1];
 assert.ok(v&&html.includes('cad-dxf-parser.js?v='+v),'worker and page must load the same parser version');
 assert.match(worker,/cad-hatch-patterns\.js/);
});
