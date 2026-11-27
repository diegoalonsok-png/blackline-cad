/* Calco IA · paso 1: plantas sintéticas propias (motor de ARQ Assist de CAD2D3D).
 * Uso: node generar_plantas.cjs <cantidad> <salida.jsonl> [semilla]
 * Cada línea: {id, brief, walls, openings, blocks, rooms} en metros. Sin datos de terceros. */
const path=require('path'),fs=require('fs');
const A=require(path.join(__dirname,'../../architecture/blackline-engine.js'));
const n=Number(process.argv[2]||200),out=process.argv[3]||'plantas.jsonl';let seed=Number(process.argv[4]||1);
const rnd=()=>{seed=(seed*1664525+1013904223)%4294967296;return seed/4294967296},pick=a=>a[Math.floor(rnd()*a.length)],int=(a,b)=>a+Math.floor(rnd()*(b-a+1));
const tipos=[
 ()=>`casa de ${int(1,4)} dormitorios, ${int(1,3)} baños, cocina, living comedor${rnd()<.6?' y lavadero':''}${rnd()<.3?', garage':''}${rnd()<.25?', quincho':''}`,
 ()=>`departamento de ${int(1,3)} dormitorios, ${int(1,2)} baños, cocina integrada y living${rnd()<.4?' con balcón':''}`,
 ()=>`monoambiente con cocina y baño`,
 ()=>`oficina con ${int(1,4)} despachos, sala de reuniones, recepción, ${int(1,2)} baños y office`,
 ()=>`local comercial con depósito y baño`,
 ()=>`casa de ${int(2,5)} dormitorios en suite, cocina, comedor, living, estudio, lavadero y ${int(2,4)} baños`,
 ()=>`consultorio con sala de espera, ${int(1,3)} consultorios y baño`,
];
const fd=fs.openSync(out,'w');let ok=0,tries=0;
while(ok<n&&tries<n*5){tries++;
 const brief=pick(tipos)();let p;try{p=A.run(brief)}catch(e){continue}
 if(!p||!Array.isArray(p.walls)||p.walls.length<4)continue;
 fs.writeSync(fd,JSON.stringify({id:'p'+String(ok).padStart(6,'0'),brief,walls:p.walls,openings:p.openings||[],blocks:p.blocks||[],rooms:p.rooms||[]})+'\n');ok++;
}
fs.closeSync(fd);console.log(ok+' plantas → '+out);
