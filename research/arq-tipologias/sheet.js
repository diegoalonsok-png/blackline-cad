const C=require('./catalog.js');const {render}=require('./render.js');const fs=require('fs');const {execSync}=require('child_process');
const items=C.generate(4);fs.mkdirSync('/tmp/sheet',{recursive:true});
const pick=process.argv[2]?items.filter(i=>i.prog.key===process.argv[2]):items;
pick.forEach((it,n)=>{fs.writeFileSync(`/tmp/sheet/${n}.svg`,render(it.r.house,{title:it.prog.key+' '+it.area+' #'+it.i,subtitle:'',code:''},{ppm:30}));execSync(`rsvg-convert -w 380 /tmp/sheet/${n}.svg -o /tmp/sheet/${String(n).padStart(3,'0')}.png`)});
execSync(`montage /tmp/sheet/0*.png -tile 6x -geometry +4+4 /tmp/sheet_${process.argv[2]||'all'}.png`);console.log(pick.length);
