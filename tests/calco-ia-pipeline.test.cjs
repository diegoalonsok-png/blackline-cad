/* Calco con IA propia: generador de datos, entrenamiento y cuaderno de Colab. Run: node --test tests/calco-ia-pipeline.test.cjs */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const dir=path.join(__dirname,'../ml/calco');
test('engine plans generator writes connected-plan JSON lines from our own engine',()=>{
 const out=path.join(require('node:os').tmpdir(),'calco-test.jsonl');execFileSync('node',[path.join(dir,'generar_plantas.cjs'),'5',out,'3']);
 const L=fs.readFileSync(out,'utf8').trim().split('\n').map(JSON.parse);assert.equal(L.length,5);
 for(const p of L){assert.ok(p.walls.length>=4);assert.ok(Array.isArray(p.openings))}
});
test('renderer, trainer and Colab notebook are consistent (classes, ONNX export, own data only)',()=>{
 const r=fs.readFileSync(path.join(dir,'dibujar_dataset.py'),'utf8'),t=fs.readFileSync(path.join(dir,'entrenar.py'),'utf8');
 assert.match(r,/CLASES = \{"fondo": 0, "muro": 1, "puerta": 2, "ventana": 3, "mueble": 4, "texto": 5\}/);
 assert.match(t,/NOMBRES = \["fondo", "muro", "puerta", "ventana", "mueble", "texto"\]/);
 assert.match(t,/torch\.onnx\.export\(/);assert.ok(!/pretrained|torchvision\.models|timm\.create_model/.test(t),'no third-party weights');
 const nb=JSON.parse(fs.readFileSync(path.join(dir,'Calco_entrenamiento.ipynb'),'utf8'));const src=nb.cells.map(c=>[].concat(c.source).join('')).join('\n');
 assert.match(src,/dibujar_dataset\.py --motor plantas_motor\.jsonl/);assert.match(src,/entrenar\.py --datos \/content\/dataset/);assert.match(src,/files\.download\('\/content\/calco\.onnx'\)/);
 assert.ok(fs.statSync(path.join(dir,'plantas_motor.jsonl')).size>1000);
});
