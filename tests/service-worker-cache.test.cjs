'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../sw.js'),'utf8');
function setup(){
 const handlers={};
 const self={registration:{scope:'https://blackline-cad.org/'},location:{origin:'https://blackline-cad.org'},addEventListener:(name,fn)=>handlers[name]=fn};
 vm.runInNewContext(source,{self,URL,fetch:()=>Promise.resolve({ok:false})});
 return (url,{authorization=false,method='GET',cache='default'}={})=>{
  let intercepted=false;
  handlers.fetch({request:{url,method,cache,mode:'cors',headers:{has:n=>authorization&&n==='authorization'}},respondWith:()=>{intercepted=true},waitUntil:()=>{}});
  return intercepted;
 };
}
test('service worker never intercepts private user assets and account endpoints',()=>{
 const intercept=setup(),base='https://blackline-cad.org';
 for(const route of ['/assets/user-cad/v1/drawing.png','/assets/user-cad/v1/preview.svg','/auth/session.js','/api/export.png','/billing/private.js'])
  assert.equal(intercept(base+route),false,route);
 assert.equal(intercept(base+'/assets/icons/icon-192.png',{authorization:true}),false);
});
test('service worker still intercepts public static assets but not no-store or cross-origin requests',()=>{
 const intercept=setup(),url='https://blackline-cad.org/assets/icons/icon-192.png';
 assert.equal(intercept(url),true);
 assert.equal(intercept(url,{cache:'no-store'}),false);
 assert.equal(intercept(url,{method:'POST'}),false);
 assert.equal(intercept('https://example.com/public.png'),false);
});
