/* Exportación DXF con bloques nativos (BLOCK/INSERT) y caracteres no ASCII escapados.
 * Run: node --test tests/dxf-native-blocks.test.cjs */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const dxfParserSrc=require('node:fs').readFileSync(require('node:path').join(__dirname,'../cad-dxf-parser.js'),'utf8');
const i=html.indexOf('function buildDXFText('),f=html.slice(i,html.indexOf('function exportDXF(',i));
test('block references become INSERT of shared BLOCK definitions',()=>{
 assert.match(f,/'INSERT',r,lay\)(?:,insH=ins\[3\];\s*ents\.push\(\.\.\.ins)?,'100','AcDbBlockReference',(?:\.\.\.\(atts\.length\?\['66','1'\]:\[\]\),)?'2',d\.name/);
 assert.match(f,/blocks\.push\('0','BLOCK'/);
 assert.match(f,/BLOCK_RECORD','5',d\.br/);
 assert.match(f,/writeList\(entities\.filter\(e=>!refDef\.has\(e\)(?:&&!dimDefs\.has\(e\))?\)\)/);
});
test('non-ASCII characters are written as \\U+XXXX and decoded on import',()=>{
 assert.match(f,/'\\\\U\+'\+c\.charCodeAt\(0\)/);
 assert.match(html+dxfParserSrc,/\\\\U\\\+\(\[0-9A-Fa-f\]\{4\}\)/);
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
test('DXF POINT is read, drawn, selectable, snappable and written back',()=>{
 const parser=fs.readFileSync(path.join(__dirname,'../cad-dxf-parser.js'),'utf8');
 assert.match(parser,/if\(type==='POINT'\)/);assert.match(parser,/case 'point':out\.p=tp\(m,e\.p\)/);
 assert.doesNotMatch(parser,/const silent=new Set\(\['POINT'/);
 assert.match(f,/head\('POINT',e,lay\),'100','AcDbPoint'/);
 assert.match(html,/function hit\(e,p\)\{const tol=8\/state\.view\.scale;if\(e\.type==='point'\)/);
 assert.match(html,/e\.type==='blockRef'\|\|e\.type==='point'\?\[\[e\.p,'POINT'\]\]/);
});
test('INSERT with different X/Y scale stays a block (scaleX/scaleY) and exports 41/42',()=>{
 global.self=globalThis;new Function(fs.readFileSync(path.join(__dirname,'../cad-dxf-parser.js'),'utf8')).call(globalThis);
 const dxf=['0','SECTION','2','HEADER','9','$INSUNITS','70','6','0','ENDSEC','0','SECTION','2','BLOCKS','0','BLOCK','2','HOJA','10','0','20','0',
  '0','CIRCLE','8','0','10','0','20','0','40','1','0','ENDBLK','0','ENDSEC','0','SECTION','2','ENTITIES',
  '0','INSERT','8','0','2','HOJA','10','10','20','10','41','2','42','-0.5','50','30','0','ENDSEC','0','EOF'].join('\n');
 const p=globalThis.CAD2DDxfParser.parse(dxf,{},{textHeight:.2});
 const ref=p.entities.find(e=>e.type==='blockRef');
 assert.ok(ref,'kept as block');assert.equal(ref.scaleX,2);assert.equal(ref.scaleY,-0.5);assert.ok(Math.abs(ref.rotation-30)<1e-9);
 assert.match(html,/function cadNonUniformInsertion\(block,point,sx,sy,angle\)/);
 assert.match(f,/'41',dxfNum\(sc\*\(Number\.isFinite\(Number\(r\.scaleX\)\)/);
 assert.match(f,/const \{attrs,scaleX,scaleY,\.\.\.bare\}=r/);
});
test('DXF layouts become CAD2D sheets with viewports (position, model center, 1:N)',()=>{
 global.self=globalThis;new Function(fs.readFileSync(path.join(__dirname,'../cad-dxf-parser.js'),'utf8')).call(globalThis);
 const L=(...a)=>a.join('\n');
 const dxf=L('0','SECTION','2','HEADER','9','$INSUNITS','70','6','0','ENDSEC',
  '0','SECTION','2','TABLES','0','TABLE','2','BLOCK_RECORD','0','BLOCK_RECORD','5','1F','2','*Paper_Space','0','ENDTAB','0','ENDSEC',
  '0','SECTION','2','ENTITIES','0','LINE','8','0','10','600','20','600','11','610','21','600',
  '0','VIEWPORT','67','1','8','0','10','100','20','150','40','200','41','100','68','1','69','2','12','5','22','0','17','600','27','600','45','10',
  '0','ENDSEC','0','SECTION','2','OBJECTS','0','LAYOUT','330','1A','1','','44','420','45','297','72','1','1','A3 Planta','71','1','10','0','20','0','11','420','21','297','330','1F','0','ENDSEC','0','EOF');
 const p=globalThis.CAD2DDxfParser.parse(dxf,{},{textHeight:.2});
 assert.equal(p.layouts.length,1);const l=p.layouts[0];
 assert.equal(l.name,'A3 Planta');assert.equal(l.w,420);assert.equal(l.h,297);
 const v=l.viewports[0];assert.equal(v.x,0);assert.equal(v.y,97);assert.equal(v.w,200);assert.equal(v.h,100);
 assert.equal(v.cx,605);assert.equal(v.cy,600);assert.equal(v.viewHeight*1000/v.h,100,'1:100 in meters');
 assert.match(html,/function cadImportDXFLayouts\(list\)/);
});
