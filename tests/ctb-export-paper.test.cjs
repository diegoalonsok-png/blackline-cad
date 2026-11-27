/* CTB: guardar .ctb, tablas prediseñadas y color de papel. Run: node --test tests/ctb-export-paper.test.cjs */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const fn=name=>{const a=html.indexOf('function '+name+'(');assert.ok(a>=0,name);let d=0,i=html.indexOf('{',a);for(;i<html.length;i++){if(html[i]==='{')d++;else if(html[i]==='}'&&--d===0)break}return html.slice(a,i+1)};
const aci=n=>({1:'#ff0000',2:'#ffff00',3:'#00ff00'})[n]||'#'+n.toString(16).padStart(6,'0');
const LW=html.match(/const CAD_CTB_LW=\[[^\]]+\];/)[0];
const ctbText=new Function('cadAci',LW+fn('cadCtbText')+';return cadCtbText')(aci);
test('.ctb text: 255 plot styles, object color/lineweight codes and real colors',()=>{
 const t=ctbText({name:'X',map:{'#ff0000':{color:'#000000',lw:.5},'#ffff00':{color:'#808080',lw:.25},'#00ff00':{color:'object',lw:0}}});
 assert.equal((t.match(/^ \d+\{$/gm)||[]).length,255);
 const st=i=>t.split('plot_style{')[1].split('\n '+i+'{')[1].split('\n }')[0];
 assert.match(st(0),/color=-1040187392\n/);assert.match(st(0),/lineweight=13\n/,'0.50 mm is index 13');
 assert.match(st(1),/color=-1031765888\n/);assert.match(st(1),/lineweight=8\n/,'0.25 mm is index 8');
 assert.match(st(2),/color=-1006632961\n/,'object color');assert.match(st(2),/lineweight=0\n/,'object lineweight is index 0');
 assert.match(t,/custom_lineweight_table\{\n 0=0\.00\n 1=0\.05/);
});
test('binary header, export command and button; presets; paper color in print dialog and raster export',()=>{
 assert.match(html,/'PIAFILEVERSION_2\.0,CTBVER1,compress\\r\\npmzlibcodec'/);assert.match(html,/CompressionStream\('deflate'\)/);
 assert.match(html,/\['CTBOUT','GUARDARCTB','EXPORTARCTB'\]/);assert.match(html,/mk\('Guardar como \.ctb…'\)/);
 for(const k of ['grayscale','screen25','screen50','screen75','monoobj','arq'])assert.ok(html.includes("'"+k+"'"),k);
 assert.match(html,/id="plotPaperColor" type="color"/);
 assert.equal((html.match(/cx\.fillStyle=o\.paperColor\|\|'#ffffff'/g)||[]).length,2,'PNG and JPG use the paper color');
});
test('active layout exports to DXF in paper millimetres, clipped like the printout',()=>{
 assert.match(html,/function cadSvgToPaperEntities\(svgText,o\)/);assert.match(html,/const clipPathRect=p=>/);assert.match(html,/const clipSeg=\(a,b,r\)=>/);
 assert.match(html,/state\.unit='mm';\n try\{return \{name,count:ents\.length/);
 assert.match(html,/option\('Lámina activa → \.DXF','Hoja tal como se imprime, en mm de papel'/);assert.match(html,/\['EXPORTLAYOUT','EXPORTARLAMINA','LAMINADXF'\]/);
});
