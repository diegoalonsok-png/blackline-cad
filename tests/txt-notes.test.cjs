const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
const start=html.indexOf('function exportCADTextNotes(){');
const end=html.indexOf('function initTypographyPalette(){',start);
assert.ok(start>0&&end>start);
const code=html.slice(start,end);
function harness(entities=[]){
 const state={entities,file:'Proyecto Arquitectura'};
 const inputs={textValue:{value:''}};
 const messages=[],downloads=[];
 const f=new Function('state','inputs','messages','downloads',`
 const $=id=>inputs[id],toast=s=>messages.push(s),download=(name,data,mime)=>downloads.push({name,data,mime});
 const updateFontPreview=()=>{};
 ${code}
 return {exportCADTextNotes,importCADTextNotes};
 `)(state,inputs,messages,downloads);
 return {state,inputs,messages,downloads,...f};
}
test('TXT imports into palette without modifying existing CAD objects',()=>{
 const entries=[{id:1,type:'line',a:{x:0,y:0},b:{x:5,y:0}}];
 const v=harness(entries);v.importCADTextNotes('Nota A\r\nNota B','notas.txt');
 assert.equal(v.inputs.textValue.value,'Nota A\nNota B');
 assert.equal(v.state.entities.length,1);
 assert.equal(v.state.entities[0].type,'line');
});
test('TXT export contains only text annotations, not drawing geometry',()=>{
 const v=harness([{type:'line',a:{x:0,y:0},b:{x:2,y:2}},{type:'text',text:'Puerta 0,90'},{type:'text',text:'Ventana 1,50'}]);
 v.exportCADTextNotes();
 assert.equal(v.downloads.length,1);
 assert.equal(v.downloads[0].name,'Proyecto Arquitectura-notas.txt');
 assert.equal(v.downloads[0].data,'Puerta 0,90\nVentana 1,50\n');
});
test('No empty TXT export',()=>{
 const v=harness([{type:'circle'}]);v.exportCADTextNotes();
 assert.equal(v.downloads.length,0);
});
test('TXT controls are present',()=>{
 assert.match(html,/id="importTextNotes"/);
 assert.match(html,/id="exportTextNotes"/);
 assert.match(html,/id="txtNotesInput"[^>]*accept="\.txt,text\/plain"/);
});
test('DOCX not misrepresented as implemented',()=>assert.doesNotMatch(html,/id="importDocx"/));
