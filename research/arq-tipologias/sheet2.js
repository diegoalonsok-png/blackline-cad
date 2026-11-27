const C=require('./catalog.js');const {render}=require('./render.js');const fs=require('fs');const {execSync}=require('child_process');
const items=C.generate(5);fs.rmSync('/tmp/sheet',{recursive:true,force:true});fs.mkdirSync('/tmp/sheet',{recursive:true});
const keys=process.argv.slice(2);const pick=items.filter(i=>keys.includes(i.prog.key)).filter((_,n)=>n%2===0).slice(0,24);
pick.forEach((it,n)=>{fs.writeFileSync(`/tmp/sheet/${n}.svg`,render(it.r.house,{title:it.prog.key+' '+it.area+' #'+it.i,subtitle:'',code:''},{ppm:30,style:['color','linea','gris'][n%3]}));execSync(`rsvg-convert -w 360 /tmp/sheet/${n}.svg -o /tmp/sheet/${String(n).padStart(3,'0')}.png`)});
execSync(`montage /tmp/sheet/0*.png -tile 6x -geometry +4+4 /tmp/sheet2.png`);console.log(pick.length);
