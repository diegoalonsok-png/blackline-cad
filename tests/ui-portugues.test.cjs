const test=require('node:test');const assert=require('node:assert');const fs=require('fs');const vm=require('vm');const path=require('path');
const root=path.join(__dirname,'..');
function load(){const ctx={window:{},console};ctx.window.window=ctx.window;vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'assets/cad-ui-pt.js'),'utf8'),ctx);return ctx.window.CAD2D_UI_PT}
test('diccionario pt-BR cargado y con reglas de galería',()=>{const T=load();assert.ok(T.size>1500);
 assert.strictEqual(T.translate('Layers'),'Camadas');
 assert.strictEqual(T.translate('Bathrooms (6)'),'Banheiros (6)');
 assert.match(T.translate('Door swing 070 · left · width 0.7 m · frame parametric 0,05 m · click to insert'),/^Porta de abrir 070 · esquerda · largura .* clique para inserir$/);
 assert.strictEqual(T.reverse('Camadas'),'Layers');});
test('selector con PT y alias de órdenes en inglés',()=>{const h=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.match(h,/<option value="pt">PT<\/option>/);assert.match(h,/assets\/cad-ui-pt\.js/);
 assert.match(h,/cad2dAliasLanguage=ui==='es'\?'es':'en'/);
 const l=fs.readFileSync(path.join(root,'assets/cad-ui-language.js'),'utf8');assert.match(l,/language==='pt'/);assert.match(l,/'pt-BR'/);});
