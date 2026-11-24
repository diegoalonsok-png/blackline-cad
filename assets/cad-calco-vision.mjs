// Optional local vision experiment. No image is sent to an inference service.
let loading;
async function init(progress){
 if(!loading)loading=(async()=>{
  const {env,Florence2ForConditionalGeneration,AutoProcessor,RawImage}=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2/+esm');
  env.allowLocalModels=false;env.useBrowserCache=true;
  const id='onnx-community/Florence-2-base-ft';
  const model=await Florence2ForConditionalGeneration.from_pretrained(id,{device:'wasm',dtype:'q8',progress_callback:progress});
  const processor=await AutoProcessor.from_pretrained(id,{progress_callback:progress});
  return {model,processor,RawImage};
 })().catch(e=>{loading=null;throw e});
 return loading;
}
export async function detect(canvas,progress){
 const {model,processor,RawImage}=await init(progress);
 const image=await RawImage.fromURL(canvas.toDataURL('image/png'));
 const task='<OD>',prompts=processor.construct_prompts(task);
 const inputs=await processor(image,prompts);
 const ids=await model.generate({...inputs,max_new_tokens:512,do_sample:false,num_beams:1});
 const decoded=processor.batch_decode(ids,{skip_special_tokens:false})[0];
 const result=processor.post_process_generation(decoded,task,image.size)[task];
 if(!result||!Array.isArray(result.bboxes)||!Array.isArray(result.labels))return [];
 return result.bboxes.map((box,i)=>({box,label:String(result.labels[i]||'')})).filter(x=>Array.isArray(x.box)&&x.box.length===4&&x.box.every(Number.isFinite));
}
export function catalogId(label){
 const s=label.toLowerCase().trim();
 if(/\b(?:bidet)\b/.test(s))return 'san-bidet';
 if(/\b(?:toilet|toilet bowl|wc)\b/.test(s))return 'san-wc';
 if(/\b(?:bathtub|bath tub|bath-tub)\b/.test(s))return 'san-banera';
 if(/\b(?:sink|washbasin|wash basin|basin|vanity)\b/.test(s))return 'san-lav';
 if(/\b(?:bed|double bed)\b/.test(s)&&!/bedroom|bedside|bunk|single/.test(s))return 'dor-queen';
 return null;
}
