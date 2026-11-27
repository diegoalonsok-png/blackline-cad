/* Low-priority local practice worker. No project upload, no self-generated labels. */
importScripts('../cad3d-croquis-studio.js');
const engine=self.BlacklineCroquisStudio,ai=engine.semantic;
function fixture(mode){
 const w=96,h=64,n=w*h;
 const gb={w,h,id:new Uint16Array(n),depth:new Float32Array(n),normal:new Int8Array(n*3),
 light:new Uint8Array(n),lightFree:new Uint8Array(n),cut:new Uint8Array(n*3),up:[0,0,1],
 materials:[null,{rgb:[209,203,192],ground:true},{rgb:[214,208,196]},{rgb:[180,211,222],glass:true},{rgb:[150,150,150],cutout:true}],
 camera:{pos:[20,-20,8],right:[.707,.707,0],up:[0,0,1],back:[.707,-.707,0],ortho:false,tanX:.42,tanY:.28},
 segments:[{a:[.3,.3],b:[.3,.8],runs:[[0,1]],profile:1,d:.2}]};
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=y*w+x;let id=y<20&&mode!==1?0:1,nz=[0,0,127],z=28+(h-y)*.4,l=230;
  if(x>=27&&x<60&&y>=16&&y<51){id=2;nz=[-90,-90,0];z=26-(x-27)*.04;l=mode===1?70:120;}
  if(x>=60&&x<80&&y>=16&&y<51){id=3;nz=[90,-90,0];z=27+(x-60)*.05;l=235;}
  if(mode===2&&x>=12&&x<18&&y>=35&&y<56){id=4;nz=[0,-127,0];z=22;l=220;gb.cut.set([60,120,65],i*3);}
  gb.id[i]=id;gb.depth[i]=id?z:1000;gb.normal.set(nz,i*3);gb.light[i]=id===1&&x>50&&y>51?140:l;gb.lightFree[i]=l;
 }
 return gb;
}
function check(gb,prompt,dataset,cal){
 if(!gb||gb.w*gb.h>16000||gb.id?.length!==gb.w*gb.h)throw Error('Invalid bounded practice buffer');
 const pred=ai.predict(prompt,ai.scene(gb),'estudio',dataset,cal);
 const opt={style:pred.style,...pred.settings,warp:0,vectorLines:true};
 const px=engine.paint(gb,opt);
 if(px.length!==gb.w*gb.h*4)throw Error('Incorrect render size');
 let min=255,max=0;for(let i=0;i<px.length;i+=4){
  if(px[i+3]!==255)throw Error('Invalid output alpha');
  const l=(px[i]+px[i+1]+px[i+2])/3;min=Math.min(min,l);max=Math.max(max,l);
 }
 if(max-min<8)throw Error('Blank or low-contrast practice render');
 const strokes=engine.strokePlan(gb,opt,gb.w,gb.h);
 for(const s of strokes)for(const p of s.points)if(!p.every(Number.isFinite))throw Error('Invalid contour');
 return {style:pred.style,pixels:gb.w*gb.h,contrast:Math.round(max-min),strokes:strokes.length};
}
self.onmessage=function(event){
 try{
  const {dataset,calibration,pass,scene,prompt}=event.data,ds=ai.validate(dataset);
  const result=ai.practice(ds,calibration,pass),checks=[];
  for(let m=0;m<3;m++)checks.push(check(fixture(m),['acuarela suave fachada','croquis monocromo interior','plumilla vegetacion'][m],ds,result.calibration));
  if(scene)checks.push(check(scene,prompt||'acuarela arquitectonica',ds,result.calibration));
  self.postMessage({ok:true,result,checks});
 }catch(e){self.postMessage({ok:false,error:String(e.message||e)});}
};
