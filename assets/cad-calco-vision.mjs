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
 [/\b(?:kitchen island|island counter)\b/,'kq-isla'],
 [/\b(?:kitchen counter|countertop|worktop|kitchen worktop)\b/,'kq-mesada'],
 [/\b(?:sink|washbasin|wash basin|vanity)\b/,'san-lav'],
 [/\b(?:refrigerator|fridge|freezer)\b/,'kq-heladera'],
 [/\b(?:washing machine|washer|laundry machine)\b/,'kq-lavarropas'],
 [/\b(?:dishwasher)\b/,'kq-lv'],
 [/\b(?:microwave)\b/,'kq-micro'],
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
 [/\b(?:dining table|dining set|kitchen table)\b/,'mob-mesa6'],
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
 [/\b(?:conifer|pine tree)\b/,'ext-conifera'],
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

/* Only compatible semantic families are considered; never substitute unrelated
   objects just because their bounding boxes have similar dimensions. */
const variantGroups=[
 ['san-wc','san-wc-susp'],['san-lav','san-lav2','san-lav-pie','san-lav-acc'],
 ['san-banera','san-banera-esq','san-hidromasaje'],['san-ducha','san-ducha-piso','san-ducha-doble'],
 ['kq-bacha','kq-bacha2'],['kq-heladera','kq-heladera2','kq-industrial-fridge'],
 ['kq-anafe2','kq-anafe4','kq-anafe5'],
 ['dor-cama1','dor-cama-nido'],['dor-cama2','dor-queen','dor-king'],
 ['mob-mesa4','mob-mesa6','mob-mesa8'],['mob-sofa2','mob-sofa3','mob-sofa-L'],
 ['mob-placard','mob-placard-bat'],['mob-escritorio','mob-escritorio-L'],
 ['esc-recta','esc-recta-descanso','esc-L','esc-U'],['esc-caracol','esc-caracol-inversa'],
 ['veh-auto','veh-camioneta','veh-pickup'],['veh-moto','veh-moto-calle','veh-scooter'],
 ['ext-arbol','ext-conifera'],['ext-arbusto','ext-maceta']
];
const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
export function rankCatalog(label,box,catalog,sx,sy){
 const preferred=catalogId(label);
 if(!preferred||!Array.isArray(box)||box.length!==4||!box.every(Number.isFinite)||!(sx>0&&sy>0))return [];
 const [x0,y0,x1,y1]=box,bw=(x1-x0)*sx,bd=(y1-y0)*sy;
 if(!(bw>0&&bd>0))return [];
 const group=variantGroups.find(g=>g.includes(preferred))||[preferred];
 const seed=catalog.find(q=>q.id===preferred),pool=catalog.filter(q=>
  !q.hideFromGallery&&!q.pro&&!q.paidOnly&&!q.dxfPlan&&!q.remoteDK&&
  (group.includes(q.id)||(seed?.family&&q.family===seed.family&&q.cat===seed.cat&&/^(san|kq|dor|mob|esc|veh|ext)-/.test(q.id))));
 const ranked=[];
 for(const item of pool){
  const {w,d}=item;if(!Number.isFinite(w)||!Number.isFinite(d)||Math.min(w,d)<=0)continue;
  const wl=item.wMin??w,wh=item.wMax??w,dl=item.dMin??d,dh=item.dMax??d;
  if(![wl,wh,dl,dh].every(Number.isFinite)||wl<=0||dl<=0||wl>wh||dl>dh)continue;
  for(const rotation of [0,90]){
   const aw=rotation?bd:bw,ad=rotation?bw:bd;
   let W=clamp(aw,wl,wh),D=clamp(ad,dl,dh);
   if(item.lockAspect){
    const ratio=d/w,lo=Math.max(wl,dl/ratio),hi=Math.min(wh,dh/ratio);
    if(lo>hi)continue;
    W=clamp(Math.sqrt(aw*ad/ratio),lo,hi);D=W*ratio;
   }
   // Reject grossly incompatible detections; modest crop error is expected.
   if(aw/W<.45||aw/W>2||ad/D<.45||ad/D>2)continue;
   const err=Math.abs(Math.log(aw/W))+Math.abs(Math.log(ad/D));
   const nominal=Math.abs(Math.log(W/w))+Math.abs(Math.log(D/d));
   const score=err+.16*nominal+(item.id===preferred?0:.07);
   const cx=(x0+x1)/2,cy=(y0+y1)/2;
   ranked.push({item,score,w:W,d:D,rotation,x:cx+(rotation?D:-W)/2/sx,y:cy+(rotation?W:D)/2/sy});
  }
 }
 return ranked.sort((a,b)=>a.score-b.score||a.item.id.localeCompare(b.item.id)||a.rotation-b.rotation);
}
export function bestCatalogMatch(label,box,catalog,sx,sy){
 const ranked=rankCatalog(label,box,catalog,sx,sy);
 if(!ranked.length)return null;
 const best=ranked[0],next=ranked[1];
 return {...best,uncertain:!!next&&next.score-best.score<.12};
}


/* Approximate scale from a whole toilet footprint, never a precision dimension.
   Use both axes; reject implausible proportions, truncated or duplicate boxes. */
export function toiletScale(detections,catalog,width,height){
 if(!Array.isArray(detections)||!Array.isArray(catalog)||![width,height].every(Number.isFinite)||width<=0||height<=0)return null;
 const candidates=catalog.filter(q=>['san-wc','san-wc-susp'].includes(q.id)&&Number.isFinite(q.w)&&Number.isFinite(q.d)&&q.w>=.3&&q.w<=.5&&q.d>=.5&&q.d<=.85&&!q.hideFromGallery);
 const samples=[];
 for(const det of detections){
  if(!det||!/^\s*(?:toilet|toilet bowl|wc|inodoro)(?:\s+(?:fixture|symbol))?\s*$/i.test(String(det.label||''))||!Array.isArray(det.box)||det.box.length!==4)continue;
  const [x,y,X,Y]=det.box,a=X-x,b=Y-y;
  if(!det.box.every(Number.isFinite)||x<=1||y<=1||X>=width-1||Y>=height-1||Math.min(a,b)<10)continue;
  const fits=candidates.flatMap(q=>[0,90].map(rotation=>{
   const sx=(rotation?q.d:q.w)/a,sy=(rotation?q.w:q.d)/b;
   return {scale:Math.sqrt(sx*sy),error:Math.abs(Math.log(sx/sy)),id:q.id,rotation};
  })).sort((a,b)=>a.error-b.error);
  if(!fits.length||fits[0].error>.20)continue;
  const cx=(x+X)/2,cy=(y+Y)/2;
  if(samples.some(s=>Math.hypot(cx-s.cx,cy-s.cy)<Math.min(a,b)*.5))continue;
  samples.push({...fits[0],cx,cy});
 }
 if(!samples.length)return null;
 const vals=samples.map(s=>s.scale).sort((a,b)=>a-b),mid=vals.length>>1;
 const median=vals.length%2?vals[mid]:(vals[mid-1]+vals[mid])/2;
 const consistent=vals.filter(v=>Math.abs(v/median-1)<=.18);
 if(consistent.length<Math.ceil(vals.length*.67))return null;
 const i=consistent.length>>1,scale=consistent.length%2?consistent[i]:(consistent[i-1]+consistent[i])/2;
 return {metersPerPixel:scale,widthM:width*scale,heightM:height*scale,samples:consistent.length,totalSamples:samples.length,confidence:consistent.length>=2?'corroborated':'single-reference',approximate:true};
}
