/* Non-destructive geometry pattern recipes, in drawing units. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.BlacklineHatchPatterns=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const patterns=Object.freeze({
  single:'Líneas paralelas',cross:'Cruzado',horizontal:'Horizontal',vertical:'Vertical',
  diagonal:'Diagonal 45°',reverse:'Diagonal 135°',grid:'Cuadrícula',
  steel:'Acero · diagonal densa',concrete:'Hormigón · triple trazo',masonry:'Mampostería · ortogonal'
 });
 function passes(kind,spacing,angle){
  if(!Number.isFinite(spacing)||spacing<=0||!Number.isFinite(angle))return null;
  const one=(a,k=1)=>({angle:a,spacing:spacing*k});
  switch(kind){
   case 'single':return [one(angle)];
   case 'cross':return [one(angle),one(angle+90)];
   case 'horizontal':return [one(0)];
   case 'vertical':return [one(90)];
   case 'diagonal':return [one(45)];
   case 'reverse':return [one(135)];
   case 'grid':return [one(0),one(90)];
   case 'steel':return [one(45,.45)];
   case 'concrete':return [one(0,2),one(60,2),one(120,2)];
   case 'masonry':return [one(0),one(90,2)];
   default:return null;
  }
 }
 return Object.freeze({patterns,passes});
});
