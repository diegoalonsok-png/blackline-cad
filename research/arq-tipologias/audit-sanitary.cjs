'use strict';
// Audit existing native layouts without changing walls, openings, or catalogue membership.
// Default dry-run; --apply saves only complete, geometrically accepted layouts.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),dir=path.join(root,'assets/arq-tipologias/v1');
const src=fs.readFileSync(path.join(root,'cad-arq-pro.js'),'utf8');
const start=src.indexOf('function arqCheckSanitary('),end=src.indexOf('async function insertCataloguePlanById',start);
assert(start>=0&&end>start,'Sanitary validator not found');
const check=new Function(src.slice(start,end)+';return arqCheckSanitary')();
const w={};new Function('window',fs.readFileSync(path.join(root,'assets/cad2d-arq-generators.js'),'utf8'))(w);
const lib=w.CAD2D_ARQ_LIBRARY.library,apply=process.argv.includes('--apply');
const index=JSON.parse(fs.readFileSync(path.join(dir,'index.json'),'utf8'));
const report={total:index.length,accepted:0,changed:0,review:0,errors:0,rows:[]};
const pair=b=>/^san-(?:wc(?:-compact|-susp)?|bidet)$/.test(b.catalogId);
for(const row of index){
 const code=row.code;
 if(!/^T-[A-Z0-9-]{1,8}-\d{3}[a-z]$/.test(code)){report.errors++;report.rows.push({code,error:'Invalid identifier'});continue}
 const file=path.join(dir,code+'.json');
 try{
  const original=JSON.parse(fs.readFileSync(file,'utf8')),result=check(original,lib);
  if(result.issues.length){report.review++;report.rows.push({code,status:'review',issues:result.issues});continue}
  assert.deepEqual(result.plan.walls,original.walls);
  assert.deepEqual(result.plan.openings,original.openings);
  assert.equal(result.plan.blocks.length,original.blocks.length);
  assert.deepEqual(result.plan.blocks.map(b=>b.catalogId),original.blocks.map(b=>b.catalogId));
  assert.deepEqual(result.plan.rooms,original.rooms);
  const second=check(result.plan,lib);
  if(second.issues.length){report.review++;report.rows.push({code,status:'review',issues:second.issues});continue}
  const changed=result.moved.length>0;
  report.accepted++;if(changed){report.changed++;if(apply)fs.writeFileSync(file,JSON.stringify(result.plan)+'\n');}
  report.rows.push({code,status:changed?'corrected':'accepted',moved:result.moved.length,sanitaryCount:original.blocks.filter(pair).length});
 }catch(e){report.errors++;report.rows.push({code,status:'error',error:String(e.message||e)})}
}
const output=path.join(root,'research/arq-tipologias/sanitary-audit-report.json');
if(apply)fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,rows:undefined}));
if(report.errors)process.exitCode=1;
