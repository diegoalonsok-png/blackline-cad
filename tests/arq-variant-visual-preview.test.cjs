'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),LIB=require('../assets/cad2d-arq-generators.js');
const s=fs.readFileSync('cad-arq-pro.js','utf8');
function section(a,b){const i=s.indexOf(a),j=s.indexOf(b,i);assert(i>=0&&j>i);return s.slice(i,j);}
const ctx={LIB,NS:'http://www.w3.org/2000/svg',P:(x,y)=>({x,y}),esc:x=>String(x),dkNeeds:x=>!!x.remoteDK,thumb:()=>'<img src="thumb.svg">',cm:x=>Math.round(x*100)};
vm.createContext(ctx);
vm.runInContext(section('function svgFor(','const thumbCache=')+section('function variantSize(','function swapVariant(')+section('function variantPreview(','function variantMenu('),ctx);
test('bed replacements include actual bed catalogue variants without mixing projections',()=>{
 const bed=LIB.library.find(x=>x.id==='dor-cama2');
 const ids=ctx.replacementItems(bed).map(x=>x.id);
 for(const id of ['dor-cama1','dor-cama2','dor-queen','dor-king','dor-cama-nido'])assert(ids.includes(id),id);
 assert(!ids.includes('cv-cama-lat'));
 for(const id of ids){const it=LIB.library.find(x=>x.id===id);if(it.remoteDK)continue;const p=ctx.variantPreview(it,ctx.variantSize(it,{w:bed.w,d:bed.d}));assert(p.html.includes('<svg'));assert(!/Infinity|NaN/.test(p.html));}
});
test('preview uses exact compatible dimensions, remote thumbnails stay on demand',()=>{
 const item=LIB.library.find(x=>x.id==='dor-king'),size={w:3.1,d:item.d};
 assert.equal(ctx.variantPreview(item,size).html,ctx.svgFor(item,size.w,size.d,{height:96}));
 assert.equal(ctx.variantPreview({...item,remoteDK:true},size).nominal,true);
 assert(s.includes("preview.className='arq-variant-preview'"));
 assert(s.includes("img.addEventListener('error',unavailable"));
});
