const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const pages=['index.html','manual-comandos.html','legal.html','guia-cad-2d-online.html','plano-casa-cad-2d-online.html'];
test('GA4 adapter remains dormant without dedicated property identifier',()=>{
 const src=fs.readFileSync('assets/ga4-consent.js','utf8');
 assert(src.includes("const MEASUREMENT_ID = '';"),'Do not borrow unrelated measurement ID');
 const ctx={location:{hostname:'blackline-cad.org'},document:{head:{appendChild(){throw Error('Google tag should not be added')}}},window:{}};
 vm.runInNewContext(src,ctx);
});
test('Analytics integration is consistently present but inactive until opted in',()=>{
 for(const path of pages){
  const html=fs.readFileSync(path,'utf8');
  assert(html.includes('<script defer src="assets/ga4-consent.js"></script>'),path+' adapter missing');
  assert(!/G-[A-Z0-9]{6,}/.test(html),path+' must not embed tracking ID');
 }
});
