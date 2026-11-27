/* Pegar texto/tablas y planillas de aberturas. Run: node --test tests/paste-and-schedules.test.cjs */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'../cad-tablas.js'),'utf8'),html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),lab=fs.readFileSync(path.join(__dirname,'../cad3d-lab.js'),'utf8');
const noop=()=>{},window={addEventListener:noop,CAD2D_CORE:{state:{unit:'m',layers:[],entities:[],selected:[],layerId:'0'},U:{m:1000}},CAD2D_EXTENSIONS:{commands:{}}};
vm.runInNewContext(src,{window,document:{documentElement:{lang:'es'},addEventListener:noop,getElementById:()=>null},navigator:{},setTimeout,Date,console});
const T=window.CAD2D_TABLES,J=o=>JSON.parse(JSON.stringify(o));
test('spreadsheet cells (tab separated) become rows; plain text does not',()=>{
 assert.deepEqual(J(T.parseTSV('Local\tSup.\r\nLiving\t24,5\r\n')),[['Local','Sup.'],['Living','24,5']]);
 assert.equal(T.parseTSV('Una nota\nde dos renglones'),null);
});
test('grid table: one line per row and column border, texts in cells, numbers right-aligned',()=>{
 const out=J(T.gridTable({x:0,y:0},[['A','Valor'],['x','12,5']],{h:.25}));
 assert.equal(out.filter(e=>e.type==='line').length,3+3);
 const texts=out.filter(e=>e.type==='text');assert.deepEqual(texts.map(t=>t.text),['A','Valor','x','12,5']);
 assert.ok(texts[0].bold&&!texts[2].bold,'header row is bold');
 const col=out.filter(e=>e.type==='line'&&e.a.x===e.b.x).map(e=>e.a.x).sort((a,b)=>a-b);
 const num=texts[3],end=num.p.x+num.text.length*.25*.62;assert.ok(Math.abs(end-(col[2]-.25*.6))<1e-9,'number ends against the right edge of its column');
});
test('opening schedule groups by type and width, numbers P1/V1 and totals',()=>{
 const {rows}=J(T.scheduleRows([{t:'P',w:.8,desc:'Puerta'},{t:'P',w:.8,desc:'Puerta'},{t:'P',w:.9,desc:'Puerta'},{t:'V',w:1.5,h:1.2,sill:.9,desc:'Ventana'}],true));
 assert.deepEqual(rows[1],['P1','Puerta','Puerta','0,80','—','—','2']);assert.deepEqual(rows[2].slice(0,4),['P2','Puerta','Puerta','0,90']);
 assert.deepEqual(rows[3],['V1','Ventana','Ventana','1,50','1,20','0,90','1']);assert.equal(rows.at(-1).at(-1),'4');
});
test('wiring: Ctrl+V decides between internal objects, text and tables; 3D sends its schedule',()=>{
 assert.match(html,/if\(cadClipboard\.length&&!window\.CAD2D_TABLES\)/);assert.match(html,/window\.CAD2D_TABLES\?\.noteInternalCopy\(\)/);
 assert.match(html,/addSchedule:p=>window\.CAD2D_TABLES\?\.addSchedule\(p\)/);assert.match(html,/cad-tablas\.js\?v=/);
 assert.match(src,/document\.addEventListener\('paste'/);assert.match(src,/'PLANILLAABERTURAS'/);
 assert.match(lab,/function cad3dScheduleTo2D\(\)/);assert.match(lab,/'planillaaberturas','tablaaberturas','doorschedule'/);
});
