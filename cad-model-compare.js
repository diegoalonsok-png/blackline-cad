/* Read-only comparison of CAD model records. Exact values, no rounding or coordinate alignment. */
(function(root){
'use strict';
function canonical(value,omitId=false){
 if(value===null||typeof value!=='object')return JSON.stringify(value);
 if(Array.isArray(value))return '['+value.map(v=>canonical(v)).join(',')+']';
 return '{'+Object.keys(value).filter(k=>!(omitId&&k==='id')&&value[k]!==undefined).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
}
function compare(current,previous){
 if(current.unit!==previous.unit)throw Error('Las unidades deben coincidir para comparar sin alterar la escala.');
 if(!Array.isArray(current.entities)||!Array.isArray(previous.entities))throw Error('Modelo inválido');
 if(current.entities.length+previous.entities.length>700000)throw Error('Comparación superior a 700.000 entidades; dividí el proyecto.');
 const rows=new Map(),removed=[],added=[],old=new Map(),changedBlocks=[],changedLayers=[];
 function row(e,kind){const layer=String(e.layer||'0'),type=String(e.type||'?'),key=JSON.stringify([layer,type]);if(!rows.has(key))rows.set(key,{layer,type,added:0,removed:0});rows.get(key)[kind]++;}
 for(const e of previous.entities){const key=canonical(e,true);let item=old.get(key);if(!item){item={list:[],cursor:0};old.set(key,item)}item.list.push(e);}
 let unchanged=0;
 for(const e of current.entities){const item=old.get(canonical(e,true));if(item&&item.cursor<item.list.length){item.cursor++;unchanged++;}else{added.push(e.id);row(e,'added');}}
 for(const item of old.values())for(let i=item.cursor;i<item.list.length;i++){const e=item.list[i];removed.push(e.id);row(e,'removed');}
 const diff=(a,b,out)=>{const names=new Set([...Object.keys(a||{}),...Object.keys(b||{})]);for(const name of names){const x=Object.prototype.hasOwnProperty.call(a||{},name),y=Object.prototype.hasOwnProperty.call(b||{},name);if(!x||!y||canonical(a[name])!==canonical(b[name]))out.push({name,kind:!x?'removed':!y?'added':'changed'});}};
 const defs=doc=>Object.fromEntries(Object.entries(doc.blocks||{}).map(([name,d])=>[name,{entities:d.entities||[],parametric:d.parametric||null,dynamic2d:d.dynamic2d||null}]));
 const layers=doc=>Object.fromEntries((doc.layers||[]).map(l=>[l.id||l.name,l]));
 diff(defs(current),defs(previous),changedBlocks);diff(layers(current),layers(previous),changedLayers);
 const blockNames=new Set(changedBlocks.map(x=>x.name)),layerNames=new Set(changedLayers.map(x=>x.name));
 const affected=current.entities.filter(e=>(e.type==='blockRef'&&blockNames.has(e.blockName))||layerNames.has(e.layer)).map(e=>e.id);
 return {unchanged,added,removed,affected,rows:[...rows.values()].sort((a,b)=>a.layer.localeCompare(b.layer)||a.type.localeCompare(b.type)),changedBlocks,changedLayers};
}
root.CAD2DCompare={compare};
})(globalThis);
