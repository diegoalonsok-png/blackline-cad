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
 assert.doesNotMatch(w,/payment_method_types/);assert.match(w,/locale:'auto'/);
 for(const f of ['cad-plan.js','cad-arq-pro.js','cad-autocad-plus.js','index.html'])assert.doesNotMatch(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),/sk_(live|test)_[A-Za-z0-9]/);
});
test('unión en T: la cara del muro anfitrión se interrumpe entre las caras del tabique',()=>{
 const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 const a=html.indexOf('function cadComputeWallTGaps('),b=html.indexOf('let cadTGapCache=null;',a);
 const P=(x,y)=>({x,y});
 const api=new Function('P','U','state','layerFor',html.slice(a,b)+';return {cadComputeWallTGaps,cadLineWithoutGaps}')(P,{m:1000},{unit:'m'},()=>({visible:true}));
 const f=(id,g,face,x0,y0,x1,y1)=>({id,type:'line',a:P(x0,y0),b:P(x1,y1),wall2d:{group:g,face}});
 const ents=[f(1,'h',0,0,-.1,6,-.1),f(2,'h',1,0,.1,6,.1),f(3,'t',0,2.9,.1,2.9,4),f(4,'t',1,3.1,.1,3.1,4)];
 const gaps=api.cadComputeWallTGaps(ents);
 assert.ok(gaps.has(2)&&!gaps.has(1),'solo la cara interior se interrumpe');
 const parts=api.cadLineWithoutGaps(ents[1],gaps.get(2));
 assert.equal(parts.length,2);assert.ok(Math.abs(parts[0].b.x-2.9)<1e-9&&Math.abs(parts[1].a.x-3.1)<1e-9);
});
test('ventanas gráficas: Layout guarda las ventanas y SVG/PDF las recortan por separado',()=>{
 const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 assert.match(html,/viewports:clone\(cadLayoutViewports\)/);
 assert.match(html,/cadLayoutViewports=Array\.isArray\(v\.viewports\)/);
 assert.match(html,/if\(o\.viewports\?\.length&&!o\.__vp\)\{/);
 assert.match(html,/const cadPdfDrawEntities=\(\)=>\{/);
 assert.match(html,/re W n`\);cadPdfDrawEntities\(\);contents\.push\('Q'\)/);
});
test('cinta extensible: pestaña Arquitectura, tipos de línea y ningún botón sin icono',()=>{
 const t=fs.readFileSync(path.join(__dirname,'..','cad-arq-tools.js'),'utf8');
 assert.match(t,/b\.dataset\.tab='arq'/);
 for(const lt of ['DOTTED','DASHED','CENTER'])assert.ok(t.includes("setLinetype('"+lt+"')"),lt);
 const ids=[...t.matchAll(/\['([a-zA-Z]{4,})','[^']+','([a-z_]{2,})'/g)];const icons=new Set([...t.matchAll(/^ ([a-z_]+):'</gm)].map(m=>m[1]));
 assert.ok(ids.length>40);for(const [,id,icon] of ids)assert.ok(icons.has(icon),id+' sin icono '+icon);
 const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 for(const k of ['polygon','hatch','breakLine','lengthen','pedit','matchprop','pasteclip','copyclip','cutclip','units','properties','selectall','block','insert','purge','open','dxf','pdf','list','regen','layout','layers','exportmenu'])assert.match(html,new RegExp('\\n '+k+":'<"),k);
});
test('muros: cotas virtuales solo en pantalla y estiramiento que arrastra muros conectados',()=>{
 const t=fs.readFileSync(path.join(__dirname,'..','cad-arq-tools.js'),'utf8');
 assert.match(t,/EXT\.overlays\.push\(ctx=>\{\n wallHits=\[\]/);
 assert.doesNotMatch(t,/type:'dimension'/,'las cotas virtuales no crean entidades');
 assert.match(t,/Muros conectados en una esquina movida: su punta acompaña/);
 assert.match(t,/rejoinAll\(changed\)/);
});
test('DWG: conversión en servidor configurable, con consentimiento y sin LibreDWG en el navegador',()=>{
 const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 assert.match(html,/const DWG_CONVERTER_ENDPOINT=typeof window\.CAD2D_DWG_ENDPOINT==='string'/);
 assert.match(html,/lo convierte a DXF y lo borra inmediatamente/);
 assert.ok(html.indexOf('cad2d-config.js')<html.indexOf('const CAD2D_TYPED_ALIASES='),'la configuración se carga antes del núcleo CAD');
 assert.doesNotMatch(html,/libredwg/i,'LibreDWG no se distribuye en el frontend');
 const cfg=fs.readFileSync(path.join(__dirname,'..','cad2d-config.js'),'utf8');assert.match(cfg,/var DWG_ACTIVO=(true|false);/);assert.match(cfg,/dwg\.'\+DOMINIO/);assert.match(cfg,/var CUENTAS_ACTIVAS=true;/);assert.doesNotMatch(cfg,/sk_(live|test)_/);
 const srv=fs.readFileSync(path.join(__dirname,'..','dwg-converter','server.py'),'utf8');
 assert.match(srv,/TemporaryDirectory/);assert.match(srv,/b"AC10"/);assert.match(srv,/MAX_BYTES/);
});
