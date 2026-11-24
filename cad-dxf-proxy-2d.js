/* CAD2D3D: bounded 2D recovery from cached DXF proxy graphics. */
(function(root){
'use strict';
function decode(record){
 const start=record.findIndex(q=>q[0]===100&&q[1]==='AcDbProxyEntity');
 const i=record.findIndex((q,k)=>k>start&&(q[0]===92||q[0]===160));
 if(i<0)return [];
 const size=Number(record[i][1]);
 if(!Number.isSafeInteger(size)||size<8||size>16*1024*1024)return [];
 const data=new Uint8Array(size);let off=0;
 for(let k=i+1;k<record.length&&record[k][0]===310;k++){
  const hex=record[k][1];
  if(hex.length%2||!/^[0-9a-f]+$/i.test(hex)||off+hex.length/2>size)return [];
  for(let j=0;j<hex.length;j+=2)data[off++]=parseInt(hex.slice(j,j+2),16);
 }
 if(off!==size)return [];
 const v=new DataView(data.buffer),end=v.getUint32(0,true),out=[];
 if(end<8||end>size)return [];
 // Size-prefixed commands. Refuse transformed metafiles rather than inventing coordinates.
 const commands=[];let p=8;
 while(p<end){
  if(p+8>end||commands.length>=100000)return [];
  const len=v.getUint32(p,true),type=v.getUint32(p+4,true);
  if(len<8||p+len>end)return [];
  if([25,26,27,28,29,30,31,32,33,34,35].includes(type))return [];
  commands.push({type,at:p+8,end:p+len});p+=len;
 }
 if(p!==end)return [];
 for(const cmd of commands){
  if(cmd.type!==6&&cmd.type!==7)continue;
  if(cmd.at+4>cmd.end)continue;
  const n=v.getUint32(cmd.at,true);
  if(n<2||n>100000||cmd.at+4+n*24>cmd.end)continue;
  const pts=[];let valid=true;
  for(let j=0;j<n;j++){const a=cmd.at+4+j*24,x=v.getFloat64(a,true),y=v.getFloat64(a+8,true),z=v.getFloat64(a+16,true);if(![x,y,z].every(Number.isFinite)){valid=false;break}pts.push({x,y})}
  if(!valid)continue;
  const closed=cmd.type===7|| (n>2&&pts[0].x===pts[n-1].x&&pts[0].y===pts[n-1].y);
  if(closed&&pts[0].x===pts.at(-1).x&&pts[0].y===pts.at(-1).y)pts.pop();
  if(pts.length>=2)out.push({type:'polyline',pts,closed});
 }
 return out;
}
root.CAD2DProxy2D={decode};
})(globalThis);
