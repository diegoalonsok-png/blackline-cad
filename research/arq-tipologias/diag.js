const C=require('./catalog.js');const {build}=require('./build.js');
const [key,area]=[process.argv[2],+process.argv[3]];
const all=[...C.PROGRAMS,...C.B_PROGRAMS,...C.L_PROGRAMS,...C.H_PROGRAMS];const prog=all.find(p=>p.key===key);
const m=require('module');const src=require('fs').readFileSync(__dirname+'/catalog.js','utf8');
const mod={exports:{}};new Function('module','exports','require','__dirname',src+'\nmodule.exports.__v={variantsA,variantsB,variantsM,variantsL,variantsH};')(mod,mod.exports,require,__dirname);
const V=mod.exports.__v;const c=key==='M'?V.variantsM(area):key.endsWith('-B')?V.variantsB(prog,area):key.endsWith('-L')?V.variantsL(prog,area):key.endsWith('-H')?V.variantsH(prog,area):V.variantsA(prog,area);
const reasons={};console.log('candidatos',c.length);
for(const v of c){let r;try{r=build(v.scheme,v.p,{code:''})}catch(e){reasons['EXC '+e.message.slice(0,60)]=(reasons['EXC '+e.message.slice(0,60)]||0)+1;continue}
 const ks=[...r.errors.map(e=>'E '+e.replace(/[\d.]+/g,'#')),...r.warn.map(w=>'W '+w)];if(Math.abs(r.area-area)/area>.035)ks.push('area '+Math.round(r.area));for(const k of ks)reasons[k]=(reasons[k]||0)+1;if(!ks.length)reasons.OK=(reasons.OK||0)+1}
console.log(reasons);
