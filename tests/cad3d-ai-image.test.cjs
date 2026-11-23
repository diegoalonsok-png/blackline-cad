const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const crypto=require('node:crypto').webcrypto;
const cad=fs.readFileSync('cad3d-lab.js','utf8');
const ui=fs.readFileSync('cad3d-ai-render.js','utf8');
const workerSource=fs.readFileSync('ai-render/worker.js','utf8');
function workerContext(fetchMock){
 const transformed=workerSource.replace('export default {','const worker = {');
 assert.notEqual(transformed,workerSource,'Expected Cloudflare Worker ES module');
 return vm.runInNewContext(transformed+'\n({worker,sizeFromRatio,secureEqual})',{
  TextEncoder,TextDecoder,Uint8Array,URL,Response,crypto,AbortSignal,fetch:fetchMock||(()=>{throw Error('No upstream call expected');})
 });
}
const ENV={
 OPENAI_API_KEY:'mock-secret-key',RENDER_TEST_TOKEN:'mock-private-render-token',
 AI_RENDER_LIMITER:{limit:async()=>({success:true})}
};
function req(style='croquis',token=ENV.RENDER_TEST_TOKEN,origin='https://blackline-cad.org'){
 return new Request('https://ai.blackline-cad.org/render',{
  method:'POST',headers:{Origin:origin,'content-type':'application/json',Authorization:'Bearer '+token},
  body:JSON.stringify({image:'data:image/png;base64,aGVsbG8=',style,width:1280,height:720})
 });
}
test('Generative AI UI parses and does not enable the disabled local Croquis engine',()=>{
 assert.doesNotThrow(()=>new vm.Script(cad));
 assert.doesNotThrow(()=>new vm.Script(ui));
 assert(cad.includes('cad3dAIGenerateLaunch'));
 assert(cad.includes('function cad3dAICaptureFrame(){'));
 assert(cad.includes('CAD3DAIRender.open({root:root,capture:cad3dAICaptureFrame})'));
 assert(!cad.includes('cad3dInitSketchCapture();'));
 assert(!cad.includes('RENDER CROQUIS</button>'));
 assert(ui.includes('RENDER IA · nueva imagen'));
 assert(ui.includes('window.CAD3D_AI_RENDER_ENDPOINT'));
 assert(!ui.includes('OPENAI_API_KEY'));
});
test('Only the rendered viewport PNG is sent; documents and layers are not serialized',()=>{
 const start=cad.indexOf('function cad3dAICaptureFrame(){'),end=cad.indexOf('function build(){',start);
 assert(start>=0&&end>start);
 const cap=cad.slice(start,end);
 assert(cap.includes("out.toDataURL('image/png')"));
 assert(cap.includes('renderer.render(scene,camera)'));
 assert(cap.includes('ctx.drawImage(source,0,0,w,h)'));
 assert(cap.includes('hidden[i][0].visible=hidden[i][1]'));
 assert(!/JSON\.stringify\(records\)|records\.push\(|records\.splice\(/.test(cap));
});
test('Worker validates origin, missing secrets, access token and ready status',async()=>{
 const {worker}=workerContext();
 let r=await worker.fetch(req('croquis',ENV.RENDER_TEST_TOKEN,'https://evil.example'),ENV);
 assert.equal(r.status,403);
 r=await worker.fetch(req(),{...ENV,OPENAI_API_KEY:''});
 assert.equal(r.status,503);
 r=await worker.fetch(req('croquis','wrong-token'),ENV);
 assert.equal(r.status,401);
 r=await worker.fetch(new Request('https://ai.blackline-cad.org/health'),ENV);
 assert.equal(r.status,200);
 assert.equal((await r.json()).ready,true);
});
test('Worker calls Images edits with a reference image and returns newly generated PNG',async()=>{
 let captured;
 const {worker}=workerContext(async(url,options)=>{
  captured={url,options};
  return new Response(JSON.stringify({data:[{b64_json:'bmV3LWltYWdl'}]}),{
   status:200,headers:{'content-type':'application/json'}
  });
 });
 const r=await worker.fetch(req('croquis'),ENV);
 assert.equal(r.status,200);
 assert.equal((await r.json()).image,'data:image/png;base64,bmV3LWltYWdl');
 assert.equal(captured.url,'https://api.openai.com/v1/images/edits');
 const body=JSON.parse(captured.options.body);
 assert.equal(body.images.length,1);
 assert.equal(body.images[0].image_url,'data:image/png;base64,aGVsbG8=');
 assert.equal(body.size,'1536x864');
 assert.match(body.prompt,/Preserve the exact camera viewpoint/);
 assert.equal(body.output_format,'png');
 assert(!captured.options.body.includes('CAD_RECORDS'));
});
test('Worker rejects unapproved styles and obeys the limiter',async()=>{
 const {worker}=workerContext();
 let r=await worker.fetch(req('some-other-style'),ENV);
 assert.equal(r.status,400);
 r=await worker.fetch(req('croquis'),{...ENV,AI_RENDER_LIMITER:{limit:async()=>({success:false})}});
 assert.equal(r.status,429);
});
test('Render image size follows camera orientation',()=>{
 const {sizeFromRatio,secureEqual}=workerContext();
 assert.equal(sizeFromRatio(1600,900),'1536x864');
 assert.equal(sizeFromRatio(1200,800),'1536x1024');
 assert.equal(sizeFromRatio(800,1200),'1024x1536');
 assert.equal(sizeFromRatio(1000,1000),'1024x1024');
 assert.equal(secureEqual('test','test'),true);
 assert.equal(secureEqual('test','other'),false);
});
