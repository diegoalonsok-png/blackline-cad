/* CAD2D interchange for simple planar geometry. No network, CRS, or DWG conversion.
 * These formats supplement (never replace) CADJSON and DXF round trips. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.BlacklineInterchange=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const finite=n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=1e9;
 const pt=p=>Array.isArray(p)&&p.length>=2&&finite(p[0])&&finite(p[1])?{x:p[0],y:p[1]}:null;
 const arr=p=>[p.x,p.y];
 const valid=p=>p&&finite(p.x)&&finite(p.y);
 const safeLayer=x=>typeof x==='string'&&x.length>0&&x.length<=100&&!/[\x00-\x1f]/.test(x)?x:'0';
 const same=(a,b)=>Math.abs(a.x-b.x)<1e-9&&Math.abs(a.y-b.y)<1e-9;
 function exportGeoJSON(entities,unit='m'){
  const features=[];const skipped={};
  const ignore=type=>{skipped[type]=(skipped[type]||0)+1};
  for(const e of entities){
   let geometry=null;
   if(e.type==='line'&&valid(e.a)&&valid(e.b)){
    geometry={type:'LineString',coordinates:[arr(e.a),arr(e.b)]};
   }else if(e.type==='polyline'&&Array.isArray(e.pts)&&e.pts.length>=2&&e.pts.every(valid)){
    const points=e.pts.map(arr);
    if(e.closed&&e.pts.length>=3){if(!same(e.pts[0],e.pts.at(-1)))points.push(arr(e.pts[0]));geometry={type:'Polygon',coordinates:[points]}}
    else geometry={type:'LineString',coordinates:points};
   }else if(e.type==='rect'&&valid(e.a)&&valid(e.b)){
    geometry={type:'Polygon',coordinates:[[
     arr(e.a),[e.b.x,e.a.y],arr(e.b),[e.a.x,e.b.y],arr(e.a)
    ]]};
   }else{ignore(e.type||'unknown');continue}
   features.push({type:'Feature',properties:{cad2dType:e.type,layer:safeLayer(e.layer),id:e.id??null},geometry});
  }
  return {document:{type:'FeatureCollection',cad2d:{planar:true,unit,note:'Local CAD coordinates. Not longitude/latitude; no CRS provided.'},features},skipped};
 }
 function importGeoJSON(value){
  if(!value||value.type!=='FeatureCollection'||!Array.isArray(value.features))throw Error('GeoJSON FeatureCollection required');
  if(value.features.length>100000)throw Error('Too many GeoJSON features');
  const entities=[],skipped={};
  const ignore=type=>{skipped[type]=(skipped[type]||0)+1};
  for(const feature of value.features){
   const g=feature?.geometry,layer=safeLayer(feature?.properties?.layer);
   if(!g){ignore('null geometry');continue}
   const props=feature.properties||{};
   if(g.type==='LineString'){
    const points=Array.isArray(g.coordinates)?g.coordinates.map(pt):[];
    if(points.length<2||points.length>100000||points.some(p=>!p)){ignore('invalid LineString');continue}
    if(props.cad2dType==='line'&&points.length===2)entities.push({type:'line',a:points[0],b:points[1],layer});
    else entities.push({type:'polyline',pts:points,closed:false,layer});
   }else if(g.type==='Polygon'){
    if(!Array.isArray(g.coordinates)||g.coordinates.length!==1){ignore('polygon holes');continue}
    let points=Array.isArray(g.coordinates[0])?g.coordinates[0].map(pt):[];
    if(points.length<4||points.length>100000||points.some(p=>!p)||!same(points[0],points.at(-1))){ignore('invalid Polygon');continue}
    points=points.slice(0,-1);
    if(props.cad2dType==='rect'&&points.length===4){
     const xs=[...new Set(points.map(p=>p.x))],ys=[...new Set(points.map(p=>p.y))];
     if(xs.length===2&&ys.length===2){entities.push({type:'rect',a:points[0],b:points[2],layer});continue}
    }
    entities.push({type:'polyline',pts:points,closed:true,layer});
   }else ignore(g.type||'unknown');
  }
  return {entities,skipped,unit:value.cad2d?.unit||null,markedPlanar:value.cad2d?.planar===true};
 }
 function escapeCell(v){
  const s=String(v??'');
  return /[,"\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;
 }
 function exportCSV(entities,unit='m'){
  const rows=[['entity_id','type','layer','vertex','x','y','closed','unit']];
  const skipped={};
  const ignore=type=>{skipped[type]=(skipped[type]||0)+1};
  for(const e of entities){
   let points=null;
   if(e.type==='line'&&valid(e.a)&&valid(e.b))points=[e.a,e.b];
   else if(e.type==='polyline'&&Array.isArray(e.pts)&&e.pts.length>=2&&e.pts.every(valid))points=e.pts;
   else if(e.type==='rect'&&valid(e.a)&&valid(e.b))points=[e.a,{x:e.b.x,y:e.a.y},e.b,{x:e.a.x,y:e.b.y}];
   else{ignore(e.type||'unknown');continue}
   points.forEach((p,i)=>rows.push([e.id??'entity_'+rows.length,e.type,safeLayer(e.layer),i,p.x,p.y,Boolean(e.closed||e.type==='rect'),unit]));
  }
  return {content:rows.map(r=>r.map(escapeCell).join(',')).join('\r\n')+'\r\n',skipped,rows:rows.length-1};
 }
 function parseCSV(text){
  if(typeof text!=='string'||text.length>20*1024*1024)throw Error('CSV missing or too large (max 20 MB)');
  const rows=[],row=[];let cell='',quoted=false;
  for(let i=0;i<text.length;i++){
   const c=text[i];
   if(quoted){
    if(c==='"'&&text[i+1]==='"'){cell+='"';i++}
    else if(c==='"')quoted=false;
    else cell+=c;
   }else if(c==='"'&&cell==='')quoted=true;
   else if(c===','){row.push(cell);cell=''}
   else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(Boolean))rows.push(row.slice());row.length=0;cell=''}
   else cell+=c;
  }
  if(quoted)throw Error('Unclosed quoted CSV field');
  if(cell||row.length){row.push(cell);rows.push(row.slice())}
  return rows;
 }
 function importCSV(text){
  const rows=parseCSV(text);
  if(rows.length<2||rows.length>100001)throw Error('CSV requires 1–100000 vertex rows');
  const cols=rows[0].map(h=>h.trim().toLowerCase()),required=['entity_id','type','layer','vertex','x','y','closed','unit'];
  if(required.some(h=>!cols.includes(h)))throw Error('CSV must use CAD2D coordinate headers: '+required.join(', '));
  const value=(row,name)=>row[cols.indexOf(name)]??'';
  const groups=new Map(),units=new Set();
  for(let i=1;i<rows.length;i++){
   const row=rows[i],id=value(row,'entity_id'),type=value(row,'type').trim();
   const index=Number(value(row,'vertex')),x=Number(value(row,'x')),y=Number(value(row,'y'));
   if(!id||!['line','polyline','rect'].includes(type)||!Number.isInteger(index)||index<0||!finite(x)||!finite(y))throw Error('Invalid coordinate at CSV row '+(i+1));
   if(!groups.has(id))groups.set(id,{type,layer:safeLayer(value(row,'layer')),points:new Map(),closed:value(row,'closed')==='true'});
   const group=groups.get(id);
   if(group.type!==type||group.points.has(index)||group.points.size>100000)throw Error('Duplicate or inconsistent CSV row '+(i+1));
   group.points.set(index,{x,y});
   const unit=value(row,'unit').trim();
   if(unit)units.add(unit);
  }
  if(units.size>1)throw Error('Mixed CSV model units not supported');
  const entities=[];
  for(const group of groups.values()){
   const indices=[...group.points.keys()].sort((a,b)=>a-b);
   if(indices.length<2||indices.some((n,i)=>n!==i))throw Error('CSV vertices must start at 0 and be consecutive');
   const points=indices.map(i=>group.points.get(i));
   if(group.type==='line'){
    if(points.length!==2)throw Error('LINE needs two CSV vertices');
    entities.push({type:'line',a:points[0],b:points[1],layer:group.layer});
   }else if(group.type==='rect'){
    if(points.length!==4)throw Error('RECT needs four CSV vertices');
    const xs=[...new Set(points.map(p=>p.x))],ys=[...new Set(points.map(p=>p.y))];
    if(xs.length!==2||ys.length!==2)throw Error('CSV rectangle is not axis-aligned');
    entities.push({type:'rect',a:points[0],b:points[2],layer:group.layer});
   }else entities.push({type:'polyline',pts:points,closed:group.closed,layer:group.layer});
  }
  return {entities,unit:[...units][0]||null};
 }
 return Object.freeze({exportGeoJSON,importGeoJSON,exportCSV,importCSV,parseCSV});
});
