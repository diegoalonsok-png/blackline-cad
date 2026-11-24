/* Lazy Python engine. Runs off the drawing thread and is terminated on idle. */
let runtime;
async function init(){
 if(!runtime)runtime=(async()=>{
  const base='https://cdn.jsdelivr.net/pyodide/v0.27.7/full/';
  importScripts(base+'pyodide.js');
  const py=await loadPyodide({indexURL:base});
  const r=await fetch(new URL('solver.py?v=20261124-semantic-v5',self.location.href),{cache:'no-cache'});
  if(!r.ok)throw Error('Architecture solver unavailable');
  py.FS.writeFile('/architecture_solver.py',await r.text());
  await py.runPythonAsync('import sys\nsys.path.insert(0,"/")\nimport architecture_solver, json');
  return py;
 })();
 return runtime;
}
self.onmessage=async({data})=>{
 const id=data?.id;
 try{
  if(!data.semantic){
   if(!self.BlacklineArchitectureAI)importScripts('blackline-engine.js?v=20261124-suite-v3');
   const plan=data.brief?self.BlacklineArchitectureAI.solve(data.brief):self.BlacklineArchitectureAI.run(data.text);
   self.postMessage({id,plan});return;
  }
  const py=await init();let output;
  if(data.brief){
   py.globals.set('_arq_spec_json',JSON.stringify(data.brief));
   output=await py.runPythonAsync('s=json.loads(_arq_spec_json)\np=architecture_solver.compile_semantic_brief(s)\njson.dumps(p, ensure_ascii=False)');
  }else{
   if(typeof data.text!=='string'||!data.text.trim()||data.text.length>4000)throw Error('Invalid instruction');
   py.globals.set('_arq_text',data.text);
   output=await py.runPythonAsync('json.dumps(architecture_solver.solve_instruction(_arq_text), ensure_ascii=False)');
  }
  self.postMessage({id,plan:JSON.parse(output)});
 }catch(e){self.postMessage({id,error:String(e.message||e).slice(-1200)})}
};
