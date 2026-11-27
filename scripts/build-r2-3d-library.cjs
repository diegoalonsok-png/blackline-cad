/* Generate original furniture assets using the same geometry and preview renderer as CAD3D. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
(async()=>{
 const out=process.argv[2];if(!out)throw Error('Usage: node scripts/build-r2-3d-library.cjs OUTPUT');
 fs.mkdirSync(out,{recursive:true});
 const source=fs.readFileSync('cad3d-lab.js','utf8');
 const T=await import('data:text/javascript;base64,'+fs.readFileSync('assets/three-cad3d-r160.module.js').toString('base64'));
 const old=['bedSingle','bed','nightstand','dresser','wardrobe1','wardrobe2','sofa','sofa2','sofa3','armchair1','armchair2'];
 const C=Object.fromEntries(old.map(id=>[id,{}]));
 const start=source.indexOf('(function(){',source.indexOf('CAD3D_DETAIL_FURNITURE_V1'));
 const end=source.indexOf('var cad3dEntourageCache=',start);
 if(start<0||end<0)throw Error('Furniture generator missing');
 const sandbox={T,CAD3D_COMPONENTS:C,boxGeom(w,d,h){const g=new T.BoxGeometry(w,d,h);g.translate(0,0,h/2);return g;}};
 vm.createContext(sandbox);vm.runInContext(source.slice(start,end),sandbox);
 const items=[];
 for(const [local,spec] of Object.entries(C).filter(([id])=>id.startsWith('detail-'))){
  const id='cloud-'+local,model=id+'.json',thumb=id+'.png';
  for(const p of spec.parts){if(Math.abs(p[0])+p[3]/2>spec.w/2+.001||Math.abs(p[1])+p[4]/2>spec.d/2+.001||p[2]<0||p[2]+p[5]>spec.h+.001)throw Error('Out-of-bounds '+local);}
  fs.writeFileSync(path.join(out,model),JSON.stringify({version:2,w:spec.w,d:spec.d,h:spec.h,name:spec.name,parts:spec.parts}));
  let points=[],polygons=[];
  const c={save(){},restore(){},translate(){},scale(){},fillRect(){},createRadialGradient(){return {addColorStop(){}}},beginPath(){points=[]},moveTo(x,y){points.push([x,y])},lineTo(x,y){points.push([x,y])},closePath(){},stroke(){},fill(){if(points.length>2){const p=points.map(q=>q.map(n=>n.toFixed(2)).join(',')).join(' ');polygons.push('<polygon points="'+p+'" fill="'+this.fillStyle+'" stroke="'+this.fillStyle+'" stroke-width=".65"/>')}}};
  sandbox.cad3dDetailedPreview(c,spec);
  if(!polygons.length)throw Error('Empty preview '+local);
  fs.writeFileSync(path.join(out,id+'.svg'),'<svg xmlns="http://www.w3.org/2000/svg" width="560" height="320" viewBox="0 0 280 160"><ellipse cx="140" cy="139" rx="68" ry="9" fill="#b3a89a" opacity=".22"/>'+polygons.join('')+'</svg>');
  items.push({id,name:spec.name,group:spec.group,w:spec.w,d:spec.d,h:spec.h,model,thumb,replaces:local,license:'Blackline original'});
 }
 if(items.length!==13)throw Error('Expected 13 detailed models');
 fs.writeFileSync(path.join(out,'generated-catalog.json'),JSON.stringify({version:1,items},null,2));
 console.log('Generated '+items.length+' original furniture assets');
})().catch(e=>{console.error(e);process.exitCode=1;});
