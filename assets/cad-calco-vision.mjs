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

/* Compare both orthogonal axes against the native block's dimensions.
   CAD rotation is counterclockwise; raster Y points down. */
export function orthogonalFit(box,item,sx,sy){
 const [x0,y0,x1,y1]=box,w=item.w,d=item.d;
 if(![x0,y0,x1,y1,w,d,sx,sy].every(Number.isFinite)||Math.min(x1-x0,y1-y0,w,d,sx,sy)<=0)return null;
 const bw=(x1-x0)*sx,bd=(y1-y0)*sy;
 const fits=[0,90].map(angle=>{
  const aw=angle?bd:bw,ad=angle?bw:bd;
  return {angle,aw,ad,error:Math.abs(Math.log(aw/w))+Math.abs(Math.log(ad/d)),
          valid:aw>=w*.45&&aw<=w*2&&ad>=d*.45&&ad<=d*2};
 }).sort((a,b)=>Number(b.valid)-Number(a.valid)||a.error-b.error||a.angle-b.angle);
 if(!fits[0].valid)return null;
 const a=fits[0],cx=(x0+x1)/2,cy=(y0+y1)/2;
 return {rotation:a.angle,x:cx+(a.angle?d:-w)/2/sx,y:cy+(a.angle?w:d)/2/sy,
         uncertain:fits[1].valid&&Math.abs(fits[1].error-a.error)<.22};
}
