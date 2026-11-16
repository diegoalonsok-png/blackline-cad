/* Grip appearance is a local UI preference, never drawing geometry. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.BlacklineGripSettings=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const defaults=Object.freeze({size:10,blockColor:'#8fe3fc',wallColor:'#ffcb69'});
 const validColor=v=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v);
 function normalize(raw){
  const value=raw&&typeof raw==='object'?raw:{};
  const size=Number(value.size);
  return {size:Number.isFinite(size)?Math.max(6,Math.min(22,Math.round(size))):defaults.size,
   blockColor:validColor(value.blockColor)?value.blockColor:defaults.blockColor,
   wallColor:validColor(value.wallColor)?value.wallColor:defaults.wallColor};
 }
 function hitRadius(settings){
  return Math.max(10,Math.ceil(normalize(settings).size/2)+4);
 }
 return Object.freeze({defaults,normalize,hitRadius});
});
