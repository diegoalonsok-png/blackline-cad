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
 const s=String(label||'').toLowerCase().trim();
 // Specific objects first; unknown labels remain unclassified rather than guessed.
 const rules=[
 [/\b(?:bidet)\b/,'san-bidet'],
 [/\b(?:urinal)\b/,'san-mingitorio'],
 [/\b(?:toilet|toilet bowl|wc)\b/,'san-wc'],
 [/\b(?:bathtub|bath tub|bath-tub)\b/,'san-banera'],
 [/\b(?:shower tray|shower stall|shower enclosure)\b/,'san-ducha'],
 [/\b(?:kitchen sink|double sink)\b/,'kq-bacha'],
 [/\b(?:sink|washbasin|wash basin|vanity)\b/,'san-lav'],
 [/\b(?:refrigerator|fridge|freezer)\b/,'kq-heladera'],
 [/\b(?:washing machine|washer|laundry machine)\b/,'kq-lavarropas'],
 [/\b(?:dishwasher)\b/,'kq-lv'],
 [/\b(?:cooktop|hob|burner)\b/,'kq-anafe4'],
 [/\b(?:stove|range cooker)\b/,'kq-cocina'],
 [/\b(?:oven)\b/,'kq-horno'],
 [/\b(?:bunk bed)\b/,'dor-cucheta'],
 [/\b(?:crib|cot)\b/,'dor-cuna'],
 [/\b(?:single bed|twin bed)\b/,'dor-cama1'],
 [/\b(?:king bed|king size bed)\b/,'dor-king'],
 [/\b(?:bed)\b/,'dor-queen'],
 [/\b(?:nightstand|bedside table)\b/,'dor-mesa-luz'],
 [/\b(?:wardrobe|closet)\b/,'mob-placard'],
 [/\b(?:dresser|chest of drawers)\b/,'dor-comoda'],
 [/\b(?:bookshelf|bookcase)\b/,'mob-biblioteca'],
 [/\b(?:desk|writing table)\b/,'mob-escritorio'],
 [/\b(?:coffee table)\b/,'mob-ratona'],
 [/\b(?:round dining table)\b/,'mob-mesa-red'],
 [/\b(?:dining table|dining set)\b/,'mob-mesa6'],
 [/\b(?:sectional sofa)\b/,'mob-sofa-L'],
 [/\b(?:armchair)\b/,'mob-sillon'],
 [/\b(?:sofa|couch)\b/,'mob-sofa3'],
 [/\b(?:spiral staircase|spiral stairs)\b/,'esc-caracol'],
 [/\b(?:staircase|stairs)\b/,'esc-recta'],
 [/\b(?:pickup truck|pickup)\b/,'veh-pickup'],
 [/\b(?:car|automobile)\b/,'veh-auto'],
 [/\b(?:motorcycle)\b/,'veh-moto'],
 [/\b(?:bicycle)\b/,'veh-bici'],
 [/\b(?:potted plant|plant pot)\b/,'ext-maceta'],
 [/\b(?:palm tree)\b/,'ext-palmera'],
 [/\b(?:tree)\b/,'ext-arbol'],
 [/\b(?:shrub|bush)\b/,'ext-arbusto']
 ];
 if(/bedroom|bedside/.test(s)&&!/(?:bedside table)/.test(s))return null;
 return rules.find(([re])=>re.test(s))?.[1]||null;
}
