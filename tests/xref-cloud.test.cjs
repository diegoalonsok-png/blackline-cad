const test=require('node:test'),assert=require('node:assert'),fs=require('fs'),path=require('path');
const R=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
test('Worker: XREF en la nube, solo lectura y limitado al equipo',()=>{
 const w=R('billing/worker.js');
 assert.match(w,/path\.startsWith\('\/api\/xref\/'\)&&req\.method==='GET'/,'solo GET: nunca modifica');
 assert.match(w,/\/api\/xref\/stamps/);assert.match(w,/user_id IN \(\$\{marks\}\)/,'filtra por equipo');
});
test('Cliente: vincular de la nube, aviso de cambios y recarga',()=>{
 const h=R('index.html');
 for(const k of ['REFXNUBE','XREFCLOUD'])assert.ok(h.includes("'"+k+"'"));
 assert.match(h,/function cadXrefLoadCloud\(/);assert.match(h,/cadXrefBanner/);assert.match(h,/def\.xref\?\.cloudId/);
});
