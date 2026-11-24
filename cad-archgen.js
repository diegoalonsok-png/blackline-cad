/* ARCHGEN: metre-based candidate layouts, independent from CAD UI.
 * Candidates are design studies, not building-code certifications.
 * Furniture IDs resolve through the existing architectural library.
 */
(function(root){
'use strict';
const overlap=(a,b)=>a.x<b.x+b.w-1e-8&&b.x<a.x+a.w-1e-8&&a.y<b.y+b.d-1e-8&&b.y<a.y+a.d-1e-8;
function generate({kind='bath',width=3,depth=3,wall=.2,count=25}={}){
 if(!['bath','accessible','bedroom'].includes(kind)||![width,depth,wall,count].every(Number.isFinite)||width<1.5||depth<1.5||width>20||depth>20||wall<.08||wall>.6||!Number.isInteger(count)||count<1||count>25)throw Error('Parámetros ARCHGEN inválidos');
 const out=[],seen=new Set(),accessible=kind==='accessible',doorWidth=accessible?1:.9;
 if(accessible&&(width<2.8||depth<2.8))return [];
 for(const mirror of [false,true])for(const style of [0,1,2])for(const variant of [0,1,2,3,4]){
  const items=[],add=(id,x,y,w,d,rotation=0)=>items.push({id,x,y,w,d,rotation});
  let turn=null,transfer=null;
  if(kind==='bedroom'){
   const bed=style===0?['dor-queen',2.6,2]:style===1?['dor-king',3,2]:['dor-cama2',2.4,1.9];
   add(bed[0],(width-bed[1])/2+(variant-2)*.12,depth-bed[2]-.08,bed[1],bed[2]);
   add('mob-placard',width-1.85,.15,1.8,.62);
  }else{
   add(style===1?'san-wc-susp':'san-wc',.12,depth-.82,.4,.7,180);
   add(accessible?'san-lav-acc':style===2?'san-lav-pie':'san-lav',width-.82,depth-.65,.70,.50,180);
   if(accessible){
    add('san-ducha-piso',width-1.12,.08,1,1);
    add('san-barra',.03,depth-.9,.035,.8,90);
    turn={x:width/2,y:depth/2,r:.75};
    transfer={x:.54,y:depth-.85,w:.8,d:.8};
   }else{
    add(style===2?'san-banera':'san-ducha',width-(style===2?1.8:1),.10,style===2?1.7:.9,style===2?.75:.9);
    if(style!==1)add('san-bidet',.12+(variant*.04),depth-1.5,.38,.58,180);
   }
  }
  const dx=.12+variant*.08;
  const door={x:dx,width:doorWidth,outward:accessible};
  const swing={x:dx,y:0,w:doorWidth,d:accessible?0:doorWidth};
  if(items.some((a,i)=>a.x<0||a.y<0||a.x+a.w>width+1e-8||a.y+a.d>depth+1e-8||items.slice(0,i).some(b=>overlap(a,b))||(!accessible&&overlap(a,swing))))continue;
  if(accessible&&(items.some(a=>overlap(a,transfer))||items.some(a=>Math.hypot(Math.max(a.x-turn.x,0,turn.x-a.x-a.w),Math.max(a.y-turn.y,0,turn.y-a.y-a.d))<turn.r-1e-8)))continue;
  if(mirror){for(const a of items){a.x=width-a.x-a.w;a.rotation=(360-a.rotation)%360}door.x=width-door.x-door.width;if(transfer)transfer.x=width-transfer.x-transfer.w}
  const signature=JSON.stringify({items,door});if(seen.has(signature))continue;seen.add(signature);
  out.push({kind,width,depth,wall,items,door,window:{x:(width-.9)/2,width:.9},turn,transfer,area:width*depth});
  if(out.length===count)return out;
 }
 return out;
}
root.CAD2D_ARCHGEN=Object.freeze({generate});
})(globalThis);
