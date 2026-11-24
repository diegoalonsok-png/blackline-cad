/* Local semantic AI for ARQASSIST. Qwen 2.5 Instruct (Apache-2.0).
 * WebLLM runtime: https://github.com/mlc-ai/web-llm (Apache-2.0).
 * No API keys, no prompts sent to a server. Models are downloaded on demand.
 */
import { CreateMLCEngine, prebuiltAppConfig } from 'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.84/lib/index.js';
let enginePromise;
const MODEL='Qwen2.5-1.5B-Instruct-q4f16_1-MLC';
const fixtures=['toilet','bidet','basin','shower','bathtub','bed','wardrobe','sink','range','fridge','island','sofa','table6'];
const nullable=t=>({type:[t,'null']});
const list={type:['array','null'],items:{type:'string',enum:fixtures}};
const schema={type:'object',additionalProperties:false,properties:{
 kind:{type:'string',enum:['bedroom','bathroom','kitchen','living','suite_row','unsupported']},
 count:{type:'integer'},alternatives:{type:'integer'},
 width:nullable('number'),depth:nullable('number'),wall:nullable('number'),door:nullable('number'),window:nullable('number'),
 bathWidth:nullable('number'),bathDepth:nullable('number'),fixtures:list,bathFixtures:list,
 assumptions:{type:'array',items:{type:'string'}},unsupported:{type:'array',items:{type:'string'}}
}};
schema.required=Object.keys(schema.properties);
const system=`You are an architectural brief interpreter for a CAD geometry engine. Understand natural language in any language, spelling errors and colloquial phrases. Output JSON only, following the schema. No coordinates or code. All lengths are METRES: 90 cm = 0.9; 2 mts = 2. Width x depth means clear interior dimensions. Support rectangular bedroom, bathroom, kitchen, living; adjacent identical rooms; and suite_row (bedrooms each with a full-width private bathroom behind). A single bedroom with bathroom is suite_row count 1. For N alternative designs set alternatives=N and count=1; for N adjacent rooms set count=N and alternatives=1. Default count/alternatives=1. Use null for unspecified dimensions, wall, doors, windows or fixtures. Fixtures IDs: toilet, bidet, basin, shower, bathtub, bed (double with nightstands), wardrobe, sink, range, fridge, island, sofa, table6. Include every explicitly requested supported fixture; use reasonable additional standard items for complete rooms. A bath with a bathtub typically includes toilet, bidet, basin, bathtub unless excluded. Do not drop requirements. Report genuinely unsupported constraints in unsupported (including mixed unrelated rooms, irregular geometry, non-full-width suite bathrooms, custom suite openings, bedroom fixture customization in suites). Do not report supported informal wording as unsupported. Return assumptions in user language. No claims of regulation compliance.`;
function getEngine(id){
 if(!enginePromise)enginePromise=(async()=>{
  if(!navigator.gpu)throw Error('WebGPU no disponible en este navegador.');
  const model=prebuiltAppConfig.model_list.find(m=>m.model_id===MODEL);
  if(!model)throw Error('El modelo local no está en esta versión de WebLLM.');
  return CreateMLCEngine(MODEL,{initProgressCallback:r=>self.postMessage({id,progress:r.progress,message:r.text})},{context_window_size:2048});
 })().catch(e=>{enginePromise=null;throw e});
 return enginePromise;
}
self.onmessage=async({data})=>{
 const {id,text}=data||{};
 try{
  if(typeof text!=='string'||!text.trim()||text.length>4000)throw Error('Invalid instruction');
  const engine=await getEngine(id);
  self.postMessage({id,progress:1,message:'Interpretando arquitectura con Qwen…'});
  const r=await engine.chat.completions.create({messages:[{role:'system',content:system},{role:'user',content:text}],temperature:0,max_tokens:600,response_format:{type:'json_object',schema:JSON.stringify(schema)}});
  const content=r.choices?.[0]?.message?.content;
  if(!content)throw Error('La IA no devolvió una instrucción estructurada.');
  self.postMessage({id,brief:JSON.parse(content)});
 }catch(e){self.postMessage({id,error:String(e.message||e)})}
};
