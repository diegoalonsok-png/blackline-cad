/* BLACKLINE CAD3D Artistic Snapshot v0.1 — isolated, opt-in, no CAD geometry mutations.
   Image-space NPR proof of concept; not a geometry-aware production renderer. */
(function(global){
 'use strict';
 if(global.BlacklineArtisticSnapshot)return;
 function clamp(x,a,b){return Math.max(a,Math.min(b,x));}
 function render(source,options){
  if(!source||!source.width||!source.height)throw Error('No 3D view available');
  options=options||{};
  var mode=['ink','engraving','redblue'].includes(options.mode)?options.mode:'ink';
  var scale=Math.min(1,1500/Math.max(source.width,source.height));
  var w=Math.max(2,Math.round(source.width*scale)),h=Math.max(2,Math.round(source.height*scale));
  var c=document.createElement('canvas');c.width=w;c.height=h;
  var ctx=c.getContext('2d',{willReadFrequently:true});if(!ctx)throw Error('Canvas unavailable');
  ctx.drawImage(source,0,0,w,h);
  var src=ctx.getImageData(0,0,w,h),p=src.data,luma=new Float32Array(w*h);
  for(var i=0;i<w*h;i++){
   var j=i*4;luma[i]=.2126*p[j]+.7152*p[j+1]+.0722*p[j+2];
  }
  var edge=new Float32Array(w*h);
  // Contrast-normalized Sobel edges follow the *rendered perspective* rather than a model-space hatch.
  for(var y=1;y<h-1;y++)for(var x=1;x<w-1;x++){
   var k=y*w+x,tl=luma[k-w-1],t=luma[k-w],tr=luma[k-w+1],
    l=luma[k-1],r=luma[k+1],bl=luma[k+w-1],b=luma[k+w],br=luma[k+w+1];
   var gx=-tl-2*l-bl+tr+2*r+br,gy=-tl-2*t-tr+bl+2*b+br;
   edge[k]=Math.sqrt(gx*gx+gy*gy);
  }
  var paper=mode==='redblue'?[250,245,231]:mode==='engraving'?[248,241,222]:[251,249,242];
  var ink=mode==='redblue'?[32,68,114]:mode==='engraving'?[29,62,94]:[29,32,33];
  var red=[193,61,46],out=ctx.createImageData(w,h),d=out.data;
  for(var yy=0;yy<h;yy++)for(var xx=0;xx<w;xx++){
   var k=yy*w+xx,j=k*4,v=luma[k],e=edge[k];
   // Source brightness supplies shade, while boundaries receive independent ink.
   var darkness=clamp((220-v)/175,0,1);
   var outline=clamp((e-20)/78,0,1);
   // Hatching is deterministic, directionally modulated and constrained to shaded regions.
   var hatch=0;
   if(mode==='engraving'){
    var density=darkness>.61?5:darkness>.35?9:14;
    hatch=((xx+Math.floor(yy*.40))%density===0)?darkness*.67:0;
    if(darkness>.58&&((xx-Math.floor(yy*.70))%8===0))hatch=Math.max(hatch,.38);
   }else if(mode==='ink'){
    hatch=darkness>.30&&((xx+Math.floor(yy*.55))%12===0)?darkness*.28:0;
   }
   var amount=clamp(Math.max(outline*.95,hatch),0,1);
   var base=mode==='redblue'?
    (darkness>.36&&((xx+Math.floor(yy*.36))%13<5)?red:paper):
    paper;
   // Subtle tone, ink contours, paper grain — no repetitive mesh-face overlay.
   var wash=mode==='redblue'?.02:clamp(darkness*.14,0,.19);
   var grain=((xx*73+yy*127+xx*yy*13)%17-8)*.3;
   for(var ch=0;ch<3;ch++)d[j+ch]=clamp(base[ch]*(1-amount-wash)+ink[ch]*amount+grain,0,255);
   d[j+3]=255;
  }
  ctx.putImageData(out,0,0);
  return c;
 }
 global.BlacklineArtisticSnapshot=Object.freeze({render:render,version:'0.1-experimental'});
})(window);
