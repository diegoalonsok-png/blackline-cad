// Entidades del catálogo de bloques → primitivas (líneas/polilíneas/círculos/arcos/elipses/texto) transformadas.
global.window=global;require(require('path').join(__dirname,'../../assets/cad2d-arq-generators.js'));
const L=window.CAD2D_ARQ_LIBRARY;
const item=id=>{const it=L.library.find(q=>q.id===id);if(!it)throw Error('bloque '+id);return it};
function blockPrims(id,w,d,pt,rotDeg){
 const it=item(id),r=L.build(id,w??it.w,d??it.d),c=Math.cos(rotDeg*Math.PI/180),s=Math.sin(rotDeg*Math.PI/180);
 const T=p=>({x:pt[0]+p.x*c-p.y*s,y:pt[1]+p.x*s+p.y*c});const out=[];
 for(const e of r.entities){
  if(e.type==='line')out.push({t:'pl',pts:[T(e.a),T(e.b)]});
  else if(e.type==='rect'){const a=e.a,b=e.b;out.push({t:'pl',closed:1,pts:[T(a),T({x:b.x,y:a.y}),T(b),T({x:a.x,y:b.y})]})}
  else if(e.type==='polyline')out.push({t:'pl',closed:e.closed?1:0,pts:e.pts.map(T)});
  else if(e.type==='hatch')out.push({t:'pl',closed:1,fill:1,pts:e.pts.map(T)});
  else if(e.type==='circle')out.push({t:'c',c:T(e.c),r:e.r});
  else if(e.type==='ellipse'){const n=28,pts=[];for(let i=0;i<n;i++){const a=i/n*2*Math.PI,ca=Math.cos(e.rotation||0),sa=Math.sin(e.rotation||0),x=e.rx*Math.cos(a),y=e.ry*Math.sin(a);pts.push(T({x:e.c.x+x*ca-y*sa,y:e.c.y+x*sa+y*ca}))}out.push({t:'pl',closed:1,pts})}
  else if(e.type==='arc'){let a0=e.a0,a1=e.a1;if(a1<a0)a1+=2*Math.PI;const n=Math.max(6,Math.ceil((a1-a0)/0.15)),pts=[];for(let i=0;i<=n;i++){const a=a0+(a1-a0)*i/n;pts.push(T({x:e.c.x+e.r*Math.cos(a),y:e.c.y+e.r*Math.sin(a)}))}out.push({t:'pl',pts,dash:e.linetype==='DASHED'})}
 }
 return {prims:out,w:r.w,d:r.d};
}
module.exports={L,item,blockPrims};
if(require.main===module){
 const ids=process.argv.slice(2);let x=0,svg=[];
 for(const id of ids){const it=item(id),{prims}=blockPrims(id,null,null,[x,0],0);
  svg.push(`<rect x="${x}" y="${-it.d}" width="${it.w}" height="${it.d}" fill="none" stroke="red" stroke-width="0.01"/>`);
  for(const p of prims){if(p.t==='pl')svg.push(`<polyline fill="${p.fill?'#000':'none'}" points="${p.pts.map(q=>q.x+','+(-q.y)).join(' ')}${p.closed?' '+p.pts[0].x+','+(-p.pts[0].y):''}"/>`);else svg.push(`<circle fill="none" cx="${p.c.x}" cy="${-p.c.y}" r="${p.r}"/>`)}
  svg.push(`<text x="${x}" y="0.25" font-size="0.13" stroke="none">${id}</text>`);x+=it.w+0.5}
 console.log(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-0.2 -3.2 ${x} 3.6" width="${x*110}" height="400" style="background:#fff"><g stroke="#000" stroke-width="0.012">${svg.join('')}</g></svg>`);
}
