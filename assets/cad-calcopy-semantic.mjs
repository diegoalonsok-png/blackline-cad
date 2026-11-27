// Experimental visual-language interpretation. Local WebGPU; never sends plan pixels to an API.
const MODEL='onnx-community/Qwen3-VL-2B-Instruct-ONNX';
let loading;
const labels=new Set(['toilet','bidet','washbasin','bathtub','shower tray','kitchen sink','kitchen counter','refrigerator','washing machine','dishwasher','cooktop','stove','oven','single bed','double bed','bunk bed','wardrobe','desk','dining table','coffee table','sofa','armchair','staircase','car','tree']);
const roomTypes=new Set(['bathroom','bedroom','kitchen','living','dining','garage','hallway','laundry','office','storage','unknown']);
const prompt='Analyze this top-down architectural floor plan, not a photograph. Identify only visible symbols and wall bands. Distinguish fixtures from walls, furniture from floor hatching, doors from furniture. Do not invent missing items. Return ONLY one JSON object, no commentary. Coordinates are integers 0..1000 normalized to the entire image, x right, y down. Schema: {"objects":[{"label":"toilet","box":[x0,y0,x1,y1]}],"wallHints":[{"box":[x0,y0,x1,y1]}],"rooms":[{"type":"bathroom","box":[x0,y0,x1,y1]}]}. Objects labels allowed: '+[...labels].join(', ')+'. Room types: '+[...roomTypes].join(', ')+'. Wall hints are narrow rectangles around visible solid or double-line wall runs, not room outlines. Do not include text or dimension lines. If uncertain omit the element. Maximum 60 objects, 60 wall hints, 30 rooms.';
export function parseArchitecturalReading(raw,w,h){
 if(typeof raw!=='string'||raw.length>100000||![w,h].every(Number.isFinite)||w<=0||h<=0)throw Error('Invalid semantic reading');
 const a=raw.indexOf('{'),b=raw.lastIndexOf('}');if(a<0||b<a)throw Error('Model did not return architectural JSON');
 const data=JSON.parse(raw.slice(a,b+1));
 if(!data||typeof data!=='object'||!['objects','wallHints','rooms'].every(k=>Array.isArray(data[k])))throw Error('Invalid architectural JSON schema');
 const box=v=>{if(!Array.isArray(v)||v.length!==4||!v.every(x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=1000)||v[2]<=v[0]||v[3]<=v[1])return null;return [v[0]*w/1000,v[1]*h/1000,v[2]*w/1000,v[3]*h/1000];};
 const out={objects:[],wallHints:[],rooms:[]};
 for(const q of data.objects.slice(0,60)){const p=box(q?.box),label=String(q?.label||'').toLowerCase().trim();if(p&&labels.has(label))out.objects.push({label,box:p});}
 for(const q of data.wallHints.slice(0,60)){const p=box(q?.box);if(p&&Math.max(p[2]-p[0],p[3]-p[1])>=2.5*Math.min(p[2]-p[0],p[3]-p[1]))out.wallHints.push({box:p});}
 for(const q of data.rooms.slice(0,30)){const p=box(q?.box),type=String(q?.type||'').toLowerCase().trim();if(p&&roomTypes.has(type))out.rooms.push({type,box:p});}
 return out;
}
async function init(progress){
 if(!globalThis.navigator?.gpu)throw Error('Qwen-VL requires WebGPU; use the lightweight model on this device.');
 if(!loading)loading=(async()=>{
  const {env,AutoProcessor,Qwen3VLForConditionalGeneration,RawImage}=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2');
  env.allowLocalModels=false;env.useBrowserCache=true;
  const processor=await AutoProcessor.from_pretrained(MODEL,{progress_callback:progress});
  const model=await Qwen3VLForConditionalGeneration.from_pretrained(MODEL,{device:'webgpu',dtype:{embed_tokens:'fp16',vision_encoder:'fp16',decoder_model_merged:'q4f16'},progress_callback:progress});
  return {processor,model,RawImage};
 })().catch(e=>{loading=null;throw e;});
 return loading;
}
export async function interpret(canvas,progress){
 const {processor,model,RawImage}=await init(progress);
 const image=await RawImage.read(canvas.toDataURL('image/png'));
 const text=processor.apply_chat_template([{role:'user',content:[{type:'image'},{type:'text',text:prompt}]}],{add_generation_prompt:true});
 const inputs=await processor(text,image);
 const output=await model.generate({...inputs,max_new_tokens:3072,do_sample:false});
 const decoded=processor.batch_decode(output.slice(null,[inputs.input_ids.dims.at(-1),null]),{skip_special_tokens:true})[0];
 return parseArchitecturalReading(decoded,canvas.width,canvas.height);
}
