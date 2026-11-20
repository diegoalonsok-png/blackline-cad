'use strict';
// Biblioteca arquitectónica paramétrica (baños, cocinas y bloques sueltos).
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const L=require('../assets/cad2d-arq-generators.js');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const ext=fs.readFileSync(path.join(__dirname,'..','cad-arq-pro.js'),'utf8');
const finite=e=>JSON.stringify(e).match(/-?\d+(\.\d+)?(e[-+]?\d+)?/g).every(n=>Number.isFinite(Number(n)));
const coreTypes=new Set(['hatch','line','polyline','rect','circle','arc','ellipse','text']);

test('galería grande: al menos 12 baños completos, 12 cocinas completas y 90 bloques',()=>{
 assert.ok(L.library.length>=90);
 assert.ok(L.library.filter(x=>x.cat==='Baños completos').length>=12);
 assert.ok(L.library.filter(x=>x.cat==='Cocinas completas').length>=12);
 assert.equal(new Set(L.library.map(x=>x.id)).size,L.library.length,'ids únicos');
});
test('cada bloque genera geometría válida en su tamaño mínimo, por defecto y máximo',()=>{
 for(const d of L.library)for(const [W,D] of [[d.wMin,d.dMin],[d.w,d.d],[d.wMax,d.dMax]]){
  const r=L.build(d.id,W,D);
  assert.ok(r.entities.length>0,d.id);
  for(const e of r.entities){assert.ok(coreTypes.has(e.type),d.id+' '+e.type);assert.ok(finite(e),d.id)}
 }
});
test('los ambientes completos quedan dentro de su contorno a cualquier tamaño permitido',()=>{
 const inside=(p,W,D)=>p.x>=-.011&&p.y>=-.011&&p.x<=W+.011&&p.y<=D+.011;
 for(const d of L.library.filter(x=>/completos|completas/.test(x.cat)))for(const [W,D] of [[d.wMin,d.dMin],[d.w,d.d],[d.wMax,d.dMax],[d.wMin,d.dMax],[d.wMax,d.dMin]]){
  const r=L.build(d.id,W,D);
  for(const e of r.entities){
   const pts=e.type==='polyline'?e.pts:e.type==='line'||e.type==='rect'?[e.a,e.b]:e.type==='text'?[e.p]:e.type==='circle'&&e.linetype!=='DASHED'?[{x:e.c.x-e.r,y:e.c.y-e.r},{x:e.c.x+e.r,y:e.c.y+e.r}]:[];
   for(const p of pts)assert.ok(inside(p,r.w,r.d),`${d.id} ${W}x${D} sale del local: ${JSON.stringify(p)}`);
  }
 }
});
test('el tamaño se limita al rango declarado (no se generan locales imposibles)',()=>{
 const d=L.library.find(x=>x.id==='bano-ducha-bidet');
 assert.equal(L.build(d.id,.5,.5).w,d.wMin);assert.equal(L.build(d.id,99,99).d,d.dMax);
});
test('estirar un baño reubica artefactos sin deformarlos (el inodoro conserva su elipse)',()=>{
 const a=L.build('bano-ducha-bidet',1.80,2.40).entities.filter(e=>e.type==='ellipse').map(e=>[e.rx,e.ry].map(n=>n.toFixed(3)).join()).sort();
 const b=L.build('bano-ducha-bidet',2.40,3.00).entities.filter(e=>e.type==='ellipse').map(e=>[e.rx,e.ry].map(n=>n.toFixed(3)).join()).sort();
 assert.deepEqual(a,b);
});
test('el texto de los bloques girados 180° queda legible',()=>{
 for(const t of L.build('kit-lineal').entities.filter(e=>e.type==='text'))assert.ok(t.rotation>-90&&t.rotation<=90,String(t.rotation));
});
test('el núcleo expone un puente acotado para extensiones',()=>{
 assert.match(html,/window\.CAD2D_CORE=Object\.freeze\(\{/);
 assert.match(html,/if\(cad2dRunExtensionCommand\(cmd,value\)\)return;log\(`Unknown command/);
 assert.match(html,/cad2dExtendContextMenu\(actions,/);
 assert.match(html,/previewEntity\(\);cad2dDrawExtensions\(\);/);
 assert.match(html,/src="cad-arq-pro\.js/);
});
test('los objetos ocultos (AISLAR/OCULTAR) no se dibujan ni se seleccionan',()=>{
 assert.match(html,/!layerFor\(e\)\.visible\|\|e\.cadHidden\)continue;/);
 assert.match(html,/if\(!l\.visible\|\|l\.locked\|\|e\.cadHidden\)continue;/);
});
test('comandos nuevos registrados con alias en español e inglés',()=>{
 for(const c of ['GALERIA','BANO','COCINA','AISLAR','ISOLATEOBJECTS','OCULTAR','MOSTRARTODO','GRUPO','DESAGRUPAR','CONTARBLOQUES','BCOUNT','DIVIDIR','DIVIDE','GRADUAR','NUBEREV','REVCLOUD','LINEACONST','XLINE','SEMIRRECTA','LOCAL','ALFRENTE','ALFONDO','PLAN'])
  assert.ok(ext.includes("'"+c+"'"),c);
});
test('los bloques ARQ regeneran en lugar de estirar: dynamic2d desactivado',()=>{
 assert.match(ext,/def\.dynamic2d=false;def\.dynamicActions=true;/);
});
test('el plan nunca bloquea el dibujo y falla abierto sin servidor',()=>{
 const plan=fs.readFileSync(path.join(__dirname,'..','cad-plan.js'),'utf8');
 assert.match(plan,/if\(!enforce\|\|status\.plan==='beta'\)return true;/);
 assert.match(plan,/free:\{label:'Gratis'[^}]*'draw','dxf'/);
 assert.doesNotMatch(plan,/sk_(live|test)_/);
});
