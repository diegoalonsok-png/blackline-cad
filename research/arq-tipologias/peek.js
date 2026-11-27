const {build}=require('./build.js');const {render}=require('./render.js');const fs=require('fs');
const src=fs.readFileSync(__dirname+'/catalog.js','utf8');const mod={exports:{}};new Function('module','exports','require','__dirname',src+'\nmodule.exports.__v={variantsA,variantsB,variantsM,variantsL,variantsH};')(mod,mod.exports,require,__dirname);
const C=require('./catalog.js');const [key,area,idx]=[process.argv[2],+process.argv[3],+process.argv[4]||0];
const prog=[...C.PROGRAMS,...C.B_PROGRAMS,...C.L_PROGRAMS,...C.H_PROGRAMS].find(p=>p.key===key);const V=mod.exports.__v;
const c=key==='M'?V.variantsM(area):key.endsWith('-B')?V.variantsB(prog,area):key.endsWith('-L')?V.variantsL(prog,area):key.endsWith('-H')?V.variantsH(prog,area):V.variantsA(prog,area);
const v=c[idx];const r=build(v.scheme,v.p,{code:''});console.log(JSON.stringify(v.p).slice(0,300),r.errors,r.warn);
fs.writeFileSync('/tmp/peek.svg',render(r.house,{title:key+' '+area,subtitle:'',code:'x'}));
