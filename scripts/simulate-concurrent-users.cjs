#!/usr/bin/env node
/* OFFLINE CAPACITY MODEL — intentionally only localhost.
 * Run: node scripts/simulate-concurrent-users.cjs --users=100
 *      node scripts/simulate-concurrent-users.cjs --users=1000
 * Each virtual visitor downloads the same assets as a fresh session.
 * This is NOT a benchmark of GitHub Pages' globally distributed CDN.
 */
'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {performance}=require('node:perf_hooks');
const root=path.resolve(__dirname,'..');
const arg=(name,defaultValue)=>{
 const value=process.argv.find(x=>x.startsWith('--'+name+'='));
 return value?Number(value.split('=')[1]):defaultValue;
};
const users=arg('users',100),concurrency=arg('concurrency',50);
if(!Number.isInteger(users)||users<1||users>1000||!Number.isInteger(concurrency)||concurrency<1||concurrency>1000){
 console.error('Use 1–1000 virtual sessions and concurrency between 1 and 1000');
 process.exit(2);
}
const names=[
 'index.html','workspace-upgrade.js','blackline-modern.js',
 'assets/dxf-block-collection.js','assets/dxf-featured-blocks.js',
 'assets/blackline-parametric-blocks.js','assets/cad2d-curated-library.js',
 'cad-osnap-math.js','cad-scale-math.js','cad-performance.js'
];
const files=new Map(names.map(name=>{
 const filename=path.join(root,name);
 if(!fs.existsSync(filename))throw Error('Missing referenced asset '+name);
 return ['/'+name,fs.readFileSync(filename)];
}));
const server=http.createServer((req,res)=>{
 const data=files.get(new URL(req.url,'http://localhost').pathname);
 if(!data){res.writeHead(404);res.end();return}
 res.writeHead(200,{'Content-Type':req.url.startsWith('/index.html')?'text/html':'application/javascript',
  'Content-Length':data.length,'Cache-Control':'public,max-age=31536000,immutable'});
 res.end(data);
});
const percentile=(values,p)=>values.slice().sort((a,b)=>a-b)[Math.min(values.length-1,Math.max(0,Math.ceil(p*values.length)-1))];
function fetchLocal(url,agent){
 return new Promise((resolve,reject)=>{
  const started=performance.now();
  const request=http.get(url,{agent},response=>{
   let bytes=0;
   response.on('data',chunk=>{bytes+=chunk.length});
   response.on('end',()=>response.statusCode===200
    ?resolve({ms:performance.now()-started,bytes})
    :reject(Error('HTTP '+response.statusCode)));
  });
  request.on('error',reject);
 });
}
server.listen(0,'127.0.0.1',async()=>{
 const agent=new http.Agent({keepAlive:true,maxSockets:concurrency});
 const address='http://127.0.0.1:'+server.address().port;
 const started=performance.now(),latencies=[],sessionTimes=[];
 let bytes=0,failures=0,issued=0;
 async function worker(){
  while(issued<users){
   issued++;
   const t0=performance.now();
   try{
    // Separate sessions, but assets are served from the same local static host.
    // Limit active sessions so the test cannot harm public endpoints.
    for(const name of names){
     const result=await fetchLocal(address+'/'+name,agent);
     latencies.push(result.ms);bytes+=result.bytes;
    }
    sessionTimes.push(performance.now()-t0);
   }catch(e){failures++;console.error('Virtual session failed:',e.message)}
  }
 }
 try{
  await Promise.all(Array.from({length:Math.min(users,concurrency)},worker));
  const ms=performance.now()-started;
  console.log(JSON.stringify({
   test:'local static file model (NOT live CDN)',users,maxParallelSessions:concurrency,
   assetsPerUser:names.length,requests:users*names.length,failedSessions:failures,
   totalMiB:Number((bytes/1048576).toFixed(2)),
   durationSeconds:Number((ms/1000).toFixed(2)),
   requestsPerSecond:Number((latencies.length/(ms/1000)).toFixed(1)),
   p50RequestMs:Number(percentile(latencies,.50).toFixed(2)),
   p95RequestMs:Number(percentile(latencies,.95).toFixed(2)),
   p95SessionMs:Number(percentile(sessionTimes,.95).toFixed(2))
  },null,2));
 }catch(e){console.error(e);process.exitCode=1}
 finally{agent.destroy();server.close()}
});
