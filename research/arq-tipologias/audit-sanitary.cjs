'use strict';
// Native residential galleries: preserve membership and original files for unresolved designs.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),apply=process.argv.includes('--apply');
const src=fs.readFileSync(path.join(root,'cad-arq-pro.js'),'utf8');
const start=src.indexOf('function arqCheckSanitary('),end=src.indexOf('async function insertCataloguePlanById',start);
assert(start>=0&&end>start);
const check=new Function(src.slice(start,end)+';return arqCheckSanitary')();
const w={};new Function('window',fs.readFileSync(path.join(root,'assets/cad2d-arq-generators.js'),'utf8'))(w);
const lib=w.CAD2D_ARQ_LIBRARY.library;
function run(folder,typology){
 const dir=path.join(root,folder),index=JSON.parse(fs.readFileSync(path.join(dir,'index.json'),'utf8'));
 const rows=typology?index:index.filter(x=>['house','bathroom'].includes(x.category));
 const report={total:rows.length,accepted:0,changed:0,review:0,special:0,errors:0,rows:[]};
 for(const row of rows){
  const code=typology?row.code:row.id;
  if(!typology&&(/accesible|públic|vestuario|discapacit/i.test(row.name))){report.special++;report.rows.push({code,status:'special-review',issues:['Accesibilidad o sanitario colectivo: conservar distribución y revisar con criterios específicos']});continue;}
  try{
   const file=path.join(dir,code+'.json'),original=JSON.parse(fs.readFileSync(file,'utf8')),result=check(original,lib);
   if(result.issues.length){report.review++;report.rows.push({code,status:'review',issues:result.issues});continue}
   assert.deepEqual(result.plan.walls,original.walls);assert.deepEqual(result.plan.openings,original.openings);assert.deepEqual(result.plan.rooms,original.rooms);
   assert.deepEqual(result.plan.blocks.map(b=>b.catalogId),original.blocks.map(b=>b.catalogId));
   const second=check(result.plan,lib);
   if(second.issues.length){report.review++;report.rows.push({code,status:'review',issues:second.issues});continue}
   const changed=result.moved.length>0;report.accepted++;
   if(changed){report.changed++;if(apply)fs.writeFileSync(file,JSON.stringify(result.plan)+'\n');}
   report.rows.push({code,status:changed?'corrected':'accepted',moved:result.moved.length});
  }catch(e){report.errors++;report.rows.push({code,status:'error',error:String(e.message||e)})}
 }
 return report;
}
const house=run('assets/arq-tipologias/v1',true),catalogue=run('assets/arq-catalogue/v1',false);
const report={...house,catalogue};
if(apply)fs.writeFileSync(path.join(root,'research/arq-tipologias/sanitary-audit-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...house,rows:undefined,catalogue:{...catalogue,rows:undefined}}));
if(house.errors||catalogue.errors)process.exitCode=1;
