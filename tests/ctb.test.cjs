/* Estilos de impresión por color (CTB).
 * Run: node --test tests/ctb.test.cjs */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const a=html.indexOf('/* Estilos de impresión por color (CTB)'),b=html.indexOf('function cadEditCtb(',a),c=html.indexOf('function colorOutput(e,o){',a),d=html.indexOf('\n',c);
assert.ok(a>=0&&b>a&&c>b,'CTB helpers present');
function make(state){
 const layerFor=e=>({color:'#ffffff',width:.25,visible:true});
 return new Function('state','layerFor','flattenCADEntities',`${html.slice(a,b)};${html.slice(c,d)};return {cadPlotWidth,cadValidCtb,cadCtbPreset,cadImportCtbFile,colorOutput,cadAci};`)(state,layerFor,x=>x);
}
test('CTB maps color and lineweight per source color; white object color prints black',()=>{
 const state={entities:[],ctb:{name:'t',map:{'#ff0000':{color:'#000000',lw:.5},'#ffffff':{color:'object',lw:0}}}},api=make(state),o={style:'ctb'};
 assert.equal(api.colorOutput({color:'#FF0000'},o),'#000000');
 assert.equal(api.cadPlotWidth({color:'#ff0000',width:.18},o),.5);
 assert.equal(api.colorOutput({color:'#ffffff'},o),'#161616');
 assert.equal(api.cadPlotWidth({color:'#ffffff',width:.18},o),.18);
 assert.equal(api.colorOutput({color:'#00ff00'},o),'#161616','colors not in the table print black');
 assert.equal(api.cadPlotWidth({color:'#ff0000',width:.18},{style:'color'}),.18,'other styles keep object lineweight');
});
test('presets and validation',()=>{
 const api=make({entities:[]});
 const mono=api.cadCtbPreset('mono');
 assert.deepEqual(mono.map['#ff0000'],{color:'#000000',lw:.18});
 assert.equal(api.cadCtbPreset('color').map['#0000ff'].color,'object');
 assert.equal(api.cadValidCtb({map:{'bad':{color:'x'},'#123456':{color:'javascript:',lw:99}}}).map['#123456'].lw,5);
 assert.equal(api.cadValidCtb(null),null);
});
test('AutoCAD .ctb import reads colors and lineweights',async()=>{
 let styles='';for(let i=0;i<255;i++)styles+=` ${i}{\n  name="Color_${i+1}\n  color=${i<3?-16777216:-1006632961}\n  lineweight=${i===0?5:i===1?13:255}\n }\n`;
 const text=`description="\nplot_style{\n${styles}}\ncustom_lineweight_table{\n 0=0.0 5=0.15 13=0.5\n}\n`,comp=zlib.deflateSync(Buffer.from(text,'latin1'));
 const head=Buffer.from('PIAFILEVERSION_2.0,CTBVER1,compress\r\npmzlibcodec','latin1'),sizes=Buffer.alloc(12);sizes.writeUInt32LE(0,0);sizes.writeUInt32LE(text.length,4);sizes.writeUInt32LE(comp.length,8);
 const buf=Buffer.concat([head,sizes,comp]);
 const api=make({entities:[]});
 const t=await api.cadImportCtbFile({name:'mono.ctb',arrayBuffer:async()=>buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.length)});
 assert.equal(t.name,'mono');
 assert.deepEqual(t.map['#ff0000'],{color:'#000000',lw:.15});
 assert.deepEqual(t.map['#ffff00'],{color:'#000000',lw:.5});
 assert.deepEqual(t.map['#0000ff'],{color:'object',lw:0});
});
