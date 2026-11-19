'use strict';
// Órdenes 2D adicionales (capas, cotas en serie, spline, calculadora, OSNAP con Shift+clic derecho).
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'..','cad-autocad-plus.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
// Extrae funciones puras sin navegador.
const grab=name=>{const i=src.indexOf('function '+name+'(');assert.ok(i>=0,name);let d=0,j=src.indexOf('{',i);for(let k=j;k<src.length;k++){if(src[k]==='{')d++;if(src[k]==='}'&&--d===0)return src.slice(i,k+1)}};
const P=(x,y)=>({x,y});
const calc=new Function(grab('calc')+';return calc')();
const catmull=new Function('P',grab('catmull')+';return catmull')(P);
test('CAL evalúa expresiones de obra con grados y rechaza código',()=>{
 assert.equal(+calc('2.40*3.15 + sqrt(16)').toFixed(4),11.56);
 assert.equal(+calc('sin(30)').toFixed(6),.5);
 assert.equal(calc('2^3'),8);
 assert.equal(calc('3,5*2'),7);
 for(const bad of ['alert(1)','window.x','constructor','this','1;fetch(1)','"a"'])assert.throws(()=>calc(bad));
});
test('SPLINE pasa por sus puntos de ajuste',()=>{
 const fit=[P(0,0),P(2,1),P(4,0),P(6,1)],out=catmull(fit);
 for(const p of fit)assert.ok(out.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<1e-9));
 assert.ok(out.length>fit.length*5);
});
test('comandos de capas, cotas y consulta registrados en español e inglés',()=>{
 for(const c of ['LAYISO','CAPAISO','LAYUNISO','LAYOFF','CAPADES','LAYON','LAYLCK','LAYULK','LAYMCUR','LAYMCH','LAYMRG','LAYDEL','SETBYLAYER','DIMCONTINUE','ACOCONT','DIMBASELINE','SPLINE','DONUT','ARANDELA','CENTERMARK','CENTERLINE','ARRAYPATH','ZOOMOBJECT','CAL','FIND','BUSCAR','STATUS','AUDIT','MLINE'])
  assert.ok(src.includes("'"+c+"'"),c);
});
test('Shift + clic derecho abre referencias a objetos sin pisar el menú normal',()=>{
 assert.match(src,/if\(!ev\.shiftKey&&!ev\.ctrlKey\)return;/);
 assert.match(fs.readFileSync(path.join(__dirname,'..','cad-arq-pro.js'),'utf8'),/if\(ev\.shiftKey\|\|ev\.ctrlKey\)return;/);
 assert.match(html,/osnap:Object\.freeze\(\{types:/);
});
test('borrar o fusionar capas protege la capa 0 y pide confirmación',()=>{
 assert.match(src,/La capa 0 no se puede borrar/);assert.match(src,/La capa 0 no se puede fusionar/);
 assert.match(src,/window\.confirm\('Se eliminará la capa/);
});
test('el cobro usa métodos de pago dinámicos (PayPal desde el Dashboard) y nunca claves en el cliente',()=>{
 const w=fs.readFileSync(path.join(__dirname,'..','billing','worker.js'),'utf8');
 assert.doesNotMatch(w,/payment_method_types/);assert.match(w,/locale:'es'/);
 for(const f of ['cad-plan.js','cad-arq-pro.js','cad-autocad-plus.js','index.html'])assert.doesNotMatch(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),/sk_(live|test)_[A-Za-z0-9]/);
});
