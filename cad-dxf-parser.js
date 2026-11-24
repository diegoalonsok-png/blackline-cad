/* Shared DXF parser: runs identically in main thread and worker. */
(function(root){'use strict';
function parse(text,opts={},dimensionStyle={textHeight:.2,arrow:.12,precision:2}){
 const P=(x,y)=>({x,y}),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 // Bounds protect the main thread against malformed arrays, cyclic block references
 // and unexpected expansion. Exceeding them aborts before replacing the open drawing.
 const importStart=performance.now(),MAX_PAIRS=3500000,MAX_WALK=2000000,MAX_ENTITIES=350000,MAX_VERTICES=2500000;
 const activeRecords=new Set();let walkCount=0,entityCount=0,vertexCount=0;
 const abortImport=message=>{const err=Error('DXF: '+message+' · dibujo anterior conservado');err.cadImportFatal=true;throw err};
 const checkTime=()=>{if(performance.now()-importStart>20000)abortImport('procesamiento excedió el límite de 20 segundos')};
 const budgetEntity=e=>{entityCount++;vertexCount+=Array.isArray(e.pts)?e.pts.length:1;if(entityCount>MAX_ENTITIES||vertexCount>MAX_VERTICES)abortImport('expansión geométrica demasiado grande')};
 if(typeof text==='string'&&text.length>64*1024*1024)abortImport('DXF expandido superior a 64 MiB');
 text=String(text||'').replace(/\\U\+([0-9A-Fa-f]{4})/g,(m,h)=>String.fromCharCode(parseInt(h,16)));
 const raw=text.replace(/\r/g,'').split('\n'),pairs=[];
 if(raw.length>MAX_PAIRS*2+2)abortImport('demasiados registros DXF');
 for(let i=0;i<raw.length-1;i+=2){if((i&8191)===0)checkTime();const code=Number(raw[i].trim());if(Number.isFinite(code))pairs.push([code,raw[i+1].trim()])}
 let section='',table='',unitCode=0,entities=[],layers=new Map(),unsupported=new Map(),blockCount=0;
 const ACI_HEX='000000ff0000ffff0000ff0000ffff0000ffff00ffffffff808080c0c0c0ff0000ff7f7fa50000a552527f00007f3f3f4c00004c2626260000261313ff3f00ff9f7fa52900a567527f1f007f4f3f4c13004c2f26260900261713ff7f00ffbf7fa55200a57c527f3f007f5f3f4c26004c3926261300261c13ffbf00ffdf7fa57c00a591527f5f007f6f3f4c39004c4226261c00262113ffff00ffff7fa5a500a5a5527f7f007f7f3f4c4c004c4c26262600262613bfff00dfff7f7ca50091a5525f7f006f7f3f394c00424c261c26002126137fff00bfff7f52a5007ca5523f7f005f7f3f264c00394c261326001c26133fff009fff7f29a50067a5521f7f004f7f3f134c002f4c2609260017261300ff007fff7f00a50052a552007f003f7f3f004c00264c2600260013261300ff3f7fff9f00a52952a567007f1f3f7f4f004c13264c2f00260913581700ff7f7fffbf00a55252a57c007f3f3f7f5f004c26264c3900261313581c00ffbf7fffdf00a57c52a591007f5f3f7f6f004c39264c4200261c13585800ffff7fffff00a5a552a5a5007f7f3f7f7f004c4c264c4c00262613585800bfff7fdfff007ca55291a5005f7f3f6f7f00394c26427e001c26135858007fff7fbfff0052a5527ca5003f7f3f5f7f00264c26397e001326131c58003fff7f9fff0029a55267a5001f7f3f4f7f00134c262f7e0009261317580000ff7f7fff0000a55252a500007f3f3f7f00004c26267e0000261313583f00ff9f7fff2900a56752a51f007f4f3f7f13004c2f267e0900261713587f00ffbf7fff5200a57c52a53f007f5f3f7f26004c39267e1300261c1358bf00ffdf7fff7c00a59152a55f007f6f3f7f39004c42264c1c0026581358ff00ffff7fffa500a5a552a57f007f7f3f7f4c004c4c264c260026581358ff00bfff7fdfa5007ca552917f005f7f3f6f4c00394c264226001c581358ff007fff7fbfa50052a5527c7f003f7f3f5f4c00264c263926001358131cff003fff7f9fa50029a552677f001f7f3f4f4c00134c262f260009581317000000656565666666999999ccccccffffff';
 const aciHex=n=>{n=Math.abs(Math.round(n));return n>=1&&n<=255?'#'+ACI_HEX.substr(n*6,6):'#c7cbd0'};
 const toHex=v=>Number.isFinite(v)?'#'+(v&0xffffff).toString(16).padStart(6,'0'):'';
 const fields=record=>({
  get:(code,def=0)=>{let v=record.find(q=>q[0]===code);return v?Number(v[1]):def},
  str:(code,def='')=>record.find(q=>q[0]===code)?.[1]??def
 });
 const getLayer=(name)=>{if(!layers.has(name))layers.set(name,{id:name,name,color:'#c6cbd1',visible:true,locked:false,width:.25,linetype:'CONTINUOUS'});return layers.get(name)};
 // --- Parse sections: tables, block definitions and model-space records ---
 const blocksDef=new Map(),modelRecs=[];let curBlock=null;
 for(let i=0;i<pairs.length;){
  if((i&8191)===0)checkTime();const [code,val]=pairs[i];
  if(code===0&&val==='SECTION'){section=pairs[i+1]?.[0]===2?pairs[i+1][1]:'';table='';i+=2;continue}
  if(code===0&&val==='ENDSEC'){section='';table='';i++;continue}
  if(section==='HEADER'&&code===9&&val==='$INSUNITS'){unitCode=Number(pairs[i+1]?.[1]||0);i+=2;continue}
  if(section==='TABLES'&&code===0&&val==='TABLE'){table=pairs[i+1]?.[0]===2?pairs[i+1][1]:'';i+=2;continue}
  if(section==='TABLES'&&code===0&&val==='ENDTAB'){table='';i++;continue}
  if(code!==0){i++;continue}
  let record=[],type=val;i++;
  while(i<pairs.length&&pairs[i][0]!==0)record.push(pairs[i++]);
  const {get,str}=fields(record);
  if(section==='TABLES'&&table==='LAYER'&&type==='LAYER'){
   let name=str(2,'0'),flags=get(70),colorIndex=get(62,7),trueColor=get(420,NaN),weight=get(370,-1);
   let layer=getLayer(name);
   Object.assign(layer,{color:Number.isFinite(trueColor)?toHex(trueColor):aciHex(colorIndex),visible:colorIndex>=0,frozen:Boolean(flags&1),locked:Boolean(flags&4),width:weight>0?weight/100:.25,linetype:str(6,'CONTINUOUS')});
   continue;
  }
  if(section==='BLOCKS'){
   if(type==='BLOCK'){blockCount++;curBlock={name:str(2,''),base:P(get(10),get(20)),recs:[]};blocksDef.set(curBlock.name,curBlock);continue}
   if(type==='ENDBLK'){curBlock=null;continue}
   if(curBlock)curBlock.recs.push([type,record]);
   continue;
  }
  if(section==='ENTITIES')modelRecs.push([type,record]);
 }
 // --- Geometry helpers (affine matrix [a,b,c,d,e,f]: x'=a x+c y+e, y'=b x+d y+f) ---
 const ID=[1,0,0,1,0,0];
 const mul2=(m,n)=>[m[0]*n[0]+m[2]*n[1],m[1]*n[0]+m[3]*n[1],m[0]*n[2]+m[2]*n[3],m[1]*n[2]+m[3]*n[3],m[0]*n[4]+m[2]*n[5]+m[4],m[1]*n[4]+m[3]*n[5]+m[5]];
 const tp=(m,p)=>P(m[0]*p.x+m[2]*p.y+m[4],m[1]*p.x+m[3]*p.y+m[5]);
 const tv=(m,x,y)=>P(m[0]*x+m[2]*y,m[1]*x+m[3]*y);
 const isId=m=>m.every((v,k)=>Math.abs(v-ID[k])<1e-12);
 const arcPts=(c,r,a0,sweep)=>{if(![c.x,c.y,r,a0,sweep].every(Number.isFinite)||Math.abs(sweep)>Math.PI*2+1e-6)throw Error('Arco DXF inválido');const n=Math.max(6,Math.ceil(Math.abs(sweep)/(Math.PI/24)));return Array.from({length:n+1},(_,k)=>P(c.x+r*Math.cos(a0+sweep*k/n),c.y+r*Math.sin(a0+sweep*k/n)))};
 const bulgePts=(p1,p2,b)=>{const d=Math.hypot(p2.x-p1.x,p2.y-p1.y);if(d<1e-12||Math.abs(b)<1e-10)return[p2];const th=4*Math.atan(b),r=d*(1+b*b)/(4*Math.abs(b)),ux=(p2.x-p1.x)/d,uy=(p2.y-p1.y)/d,h=d/2*(1-b*b)/(2*b),c=P((p1.x+p2.x)/2-uy*h,(p1.y+p2.y)/2+ux*h);return arcPts(c,r,Math.atan2(p1.y-c.y,p1.x-c.x),th).slice(1)};
 const vertsToPts=(verts,closed)=>{const out=[verts[0].p];for(let k=0;k<verts.length-(closed?0:1);k++){const a=verts[k],b=verts[(k+1)%verts.length];out.push(...bulgePts(a.p,b.p,a.b||0))}if(closed&&out.length>2&&Math.hypot(out.at(-1).x-out[0].x,out.at(-1).y-out[0].y)<1e-9)out.pop();return out};
 const cleanMText=s=>s.replace(/\\P/g,'\n').replace(/\\[A-Za-z][^;\\{}]*;/g,'').replace(/\\[LlOoKk]/g,'').replace(/[{}]/g,'').replace(/%%[cC]/g,'Ø').replace(/%%[dD]/g,'°').replace(/%%[pP]/g,'±').trim();
 const patMap={SOLID:'solid','AR-SAND':'sand',SAND:'sand',EARTH:'earth','AR-CONC':'concrete',GRAVEL:'sand',LINE:'single',ANGLE:'steel',NET:'grid',NET3:'net3',HONEY:'honey',BRICK:'masonry','AR-B816':'masonry','AR-BRSTD':'masonry',STEEL:'steel',CROSS:'cross',DASH:'single'};
 const patFor=n=>{n=String(n||'').toUpperCase().split(',')[0].replace(/_O$/,'');if(patMap[n])return patMap[n];if(/^ANSI3[1-8]$/.test(n))return n.toLowerCase();return 'ansi31'};
 const silent=new Set(['POINT','VIEWPORT','SEQEND','VERTEX','3DSOLID','REGION','IMAGE','WIPEOUT','OLE2FRAME']);
 const note=t=>unsupported.set(t,(unsupported.get(t)||0)+1);
 // --- Read one record in block-local coordinates ---
 function readRecord(type,record,recs,idx){
  const {get,str}=fields(record);
  if(type==='ACAD_PROXY_ENTITY'){
   const recovered=root.CAD2DProxy2D?.decode(record)||[];
   note(recovered.length?'ACAD_PROXY_ENTITY (representación gráfica parcial, sin propiedades AEC)':'ACAD_PROXY_ENTITY (sin geometría recuperable)');
   return recovered.length?recovered:null;
  }
  if(type==='LINE')return{type:'line',a:P(get(10),get(20)),b:P(get(11),get(21))};
  if(type==='CIRCLE'&&get(40)>0)return{type:'circle',c:P(get(10),get(20)),r:get(40)};
  if(type==='ARC'&&get(40)>0)return{type:'arc',c:P(get(10),get(20)),r:get(40),a0:get(50)*Math.PI/180,a1:get(51)*Math.PI/180};
  if(type==='TEXT'||type==='MTEXT'||type==='ATTRIB'||type==='ATTDEF'){
   if(type==='ATTRIB'&&(get(70)&1))return null;
   const isDef=type==='ATTDEF',tagName=isDef?str(2,'').trim().toUpperCase():'';
   if(isDef&&!tagName)return null;
   const raw=isDef?str(1,''):record.filter(q=>q[0]===3).map(q=>q[1]).join('')+(str(1,''));
   const text=type==='MTEXT'?cleanMText(raw):raw.replace(/%%[cC]/g,'Ø').replace(/%%[dD]/g,'°').replace(/%%[pP]/g,'±').replace(/%%[uUoO]/g,'');
   if(!text&&!isDef)return null;
   let h=get(40,.25)||.25,p=P(get(10),get(20)),rot=get(50,0),mw=0,ls=0;
   if(type==='MTEXT'){const dx=get(11,NaN),dy=get(21,0);if(Number.isFinite(dx))rot=Math.atan2(dy,dx)*180/Math.PI;mw=get(41,0);ls=1.6667*(get(44,1)||1);const lines=text.split('\n'),n=lines.length,sp=h*ls,at=get(71,1),w=(mw>0?mw:Math.max(...lines.map(l=>l.length))*h*.62),cx=((at-1)%3)/2,cy=Math.floor((at-1)/3),r=rot*Math.PI/180;const ox=-w*cx,oy=cy===0?-h:cy===1?((n-1)*sp+h)/2-h:(n-1)*sp;p=P(p.x+ox*Math.cos(r)-oy*Math.sin(r),p.y+ox*Math.sin(r)+oy*Math.cos(r))}
   else{const hj=get(72,0),vj=get(73,0);if((hj||vj)&&hj!==5&&hj!==3){const q=P(get(11,p.x),get(21,p.y)),w=text.length*h*.62,f=hj===1||hj===4?.5:hj===2?1:0,r=rot*Math.PI/180,oy=vj===3?-h:vj===2?-h/2:0;p=P(q.x-w*f*Math.cos(r)-oy*Math.sin(r),q.y-w*f*Math.sin(r)+oy*Math.cos(r))}}
   const font=str(7,'').toUpperCase();
   return{type:'text',p,h,rotation:rot,fontFamily:font.includes('MONO')?'Courier New':font.includes('SERIF')?'Times New Roman':'Arial',text,...(mw>0?{mtextWidth:mw}:{}),...(ls>0?{lineSpacing:Math.round(ls*100)/100}:{}),...(isDef?{attdef:{tag:tagName,prompt:str(3,'').trim()||tagName,...(get(70,0)&1?{invisible:true}:{})}}:{})};
  }
  if(type==='LWPOLYLINE'){
   const verts=[];let lastX=null;
   for(const [c,v]of record){if(c===10)lastX=Number(v);else if(c===20&&lastX!==null){verts.push({p:P(lastX,Number(v)),b:0});lastX=null}else if(c===42&&verts.length)verts.at(-1).b=Number(v)}
   if(verts.length<2)return null;const closed=Boolean(get(70)&1),e={type:'polyline',pts:vertsToPts(verts,closed),closed};const pw=get(43,0);if(pw>0)e.pwidth=pw;return e;
  }
  if(type==='POLYLINE'){
   const verts=[];for(let k=idx+1;k<recs.length&&recs[k][0]==='VERTEX';k++){const f=fields(recs[k][1]);if(f.get(70)&16)continue;verts.push({p:P(f.get(10),f.get(20)),b:f.get(42,0)})}
   if(verts.length<2)return null;const closed=Boolean(get(70)&1);return{type:'polyline',pts:vertsToPts(verts,closed),closed};
  }
  if(type==='ELLIPSE'){const mx=get(11),my=get(21),rx=Math.hypot(mx,my);if(!(rx>0))return null;const s0=get(41,0),s1=get(42,Math.PI*2),c=P(get(10),get(20)),ry=rx*get(40,1),rot=Math.atan2(my,mx);
   if(Math.abs(s1-s0-Math.PI*2)<1e-6)return{type:'ellipse',c,rx,ry,rotation:rot};
   let sw=s1-s0;if(sw<=0)sw+=Math.PI*2;if(!Number.isFinite(sw)||sw<=0||sw>Math.PI*2+1e-6)throw Error('Elipse DXF inválida');const n=Math.max(8,Math.ceil(sw/(Math.PI/24)));return{type:'polyline',closed:false,pts:Array.from({length:n+1},(_,k)=>{const t=s0+sw*k/n,x=rx*Math.cos(t),y=ry*Math.sin(t);return P(c.x+x*Math.cos(rot)-y*Math.sin(rot),c.y+x*Math.sin(rot)+y*Math.cos(rot))})}}
  if(type==='SPLINE'){const fit=[],ctl=[];let lx=null,lc=0;for(const [c,v]of record){if(c===10||c===11){lx=Number(v);lc=c}else if((c===20&&lc===10)||(c===21&&lc===11)){(lc===11?fit:ctl).push(P(lx,Number(v)))}}const pts=fit.length>=2?fit:ctl;return pts.length>=2?{type:'polyline',pts,closed:Boolean(get(70)&1)}:null}
  if(type==='SOLID'||type==='TRACE'){const q=[P(get(10),get(20)),P(get(11),get(21)),P(get(13,get(12)),get(23,get(22))),P(get(12),get(22))];return{type:'hatch',pts:q,hatchStyle:'solid',width:.05}}
  if(type==='HATCH')return readHatch(record);
  return undefined;
 }
 function readHatch(record){
  const {get,str}=fields(record),solid=get(70)===1;
  let k=record.findIndex(q=>q[0]===91);if(k<0)return null;const nPaths=Number(record[k][1]);k++;
  const paths=[],num=()=>{if(!Number.isInteger(k)||k<0||k>=record.length)throw Error('HATCH truncado');const n=Number(record[k++][1]);if(!Number.isFinite(n))throw Error('HATCH valor inválido');return n},peek=()=>record[k]?.[0];
  const count=()=>{const n=num();if(!Number.isSafeInteger(n)||n<0||n>record.length-k)throw Error('HATCH cantidad inválida');return n};
  for(let pi=0;pi<nPaths&&k<record.length;pi++){
   while(k<record.length&&peek()!==92)k++;const flags=num(),pts=[];
   if(flags&2){const hasB=num();num();const nv=num();const verts=[];
    for(let v=0;v<nv&&k<record.length;v++){while(k<record.length&&peek()!==10)k++;const x=num(),y=num();let b=0;if(hasB&&peek()===42)b=num();verts.push({p:P(x,y),b})}
    if(verts.length>=3)paths.push({pts:vertsToPts(verts,true),outer:Boolean(flags&1)});
   }else{
    const ne=num();
    for(let ei=0;ei<ne&&k<record.length;ei++){
     while(k<record.length&&peek()!==72)k++;const et=num();
     if(et===1){const x1=num(),y1=num(),x2=num(),y2=num();if(!pts.length)pts.push(P(x1,y1));pts.push(P(x2,y2))}
     else if(et===2){const cx=num(),cy=num(),r=num(),a0=num()*Math.PI/180,a1=num()*Math.PI/180,ccw=num();let sw=a1-a0;if(sw<=0)sw+=Math.PI*2;const arc=ccw?arcPts(P(cx,cy),r,a0,sw):arcPts(P(cx,cy),r,-a0,-sw);pts.push(...(pts.length?arc.slice(1):arc))}
     else if(et===3){const cx=num(),cy=num(),mx=num(),my=num(),ra=num(),s0=num()*Math.PI/180,s1=num()*Math.PI/180,ccw=num();const rx=Math.hypot(mx,my),ry=rx*ra,rot=Math.atan2(my,mx);let sw=s1-s0;if(sw<=0)sw+=Math.PI*2;const n=24;for(let j=pts.length?1:0;j<=n;j++){let t=s0+sw*j/n;if(!ccw)t=-t;const x=rx*Math.cos(t),y=ry*Math.sin(t);pts.push(P(cx+x*Math.cos(rot)-y*Math.sin(rot),cy+x*Math.sin(rot)+y*Math.cos(rot)))}}
     else if(et===4){k++;k++;k++;const nk=count(),nc=count();k+=nk;for(let j=0;j<nc;j++){while(k<record.length&&peek()!==10)k++;const x=num(),y=num();if(peek()===42)k++;if(j||!pts.length)pts.push(P(x,y))}if(peek()===97){const nf=count();if(nf*2>record.length-k)throw Error('HATCH spline truncado');k+=nf*2;if(peek()===12)k+=4}}
    }
    if(pts.length>=3)paths.push({pts,outer:Boolean(flags&1)});
   }
   while(k<record.length&&peek()!==97)k++;if(peek()===97){const ns=count();k+=ns}
  }
  if(!paths.length)return null;
  const name=str(2,'SOLID'),style=solid?'solid':patFor(name);
  let angle=get(52,0),spacing=3.175*(get(41,1)||1);
  const li=record.findIndex(q=>q[0]===53);
  if(li>=0&&!solid){const la=Number(record[li][1])*Math.PI/180,o=record.slice(li),ox=Number(o.find(q=>q[0]===45)?.[1]||0),oy=Number(o.find(q=>q[0]===46)?.[1]||0),perp=Math.abs(-ox*Math.sin(la)+oy*Math.cos(la));if(perp>1e-9)spacing=perp;if(style==='single')angle=Number(record[li][1])}
  return paths.map(p=>({type:'hatch',pts:p.pts,hatchStyle:style,hatchSpacing:+spacing.toPrecision(4),hatchAngle:style==='single'?angle:angle,width:.05}));
 }
 // --- Transform one entity by matrix m ---
 function xform(e,m){
  if(isId(m))return e;
  const det=m[0]*m[3]-m[1]*m[2],sx=Math.hypot(m[0],m[1]),sy=Math.hypot(m[2],m[3]),uni=sx>0&&sy>0&&Math.abs(sx-sy)<1e-6*Math.max(sx,sy)&&Math.abs((m[0]/sx)*(m[2]/sy)+(m[1]/sx)*(m[3]/sy))<1e-6,s=Math.sqrt(Math.abs(det)),rotDeg=Math.atan2(m[1],m[0])*180/Math.PI;
  const out={...e};
  switch(e.type){
   case 'line':out.a=tp(m,e.a);out.b=tp(m,e.b);return out;
   case 'polyline':case 'hatch':out.pts=e.pts.map(p=>tp(m,p));if(e.pwidth)out.pwidth=e.pwidth*s;if(e.hatchSpacing)out.hatchSpacing=+(e.hatchSpacing*s).toPrecision(4);if(e.type==='hatch'&&e.hatchStyle!=='solid')out.hatchAngle=(e.hatchAngle||0)+rotDeg;return out;
   case 'circle':if(uni){out.c=tp(m,e.c);out.r=e.r*s;return out}return{...e,type:'polyline',closed:true,pts:arcPts(e.c,e.r,0,Math.PI*2).slice(1).map(p=>tp(m,p))};
   case 'arc':{let sw=e.a1-e.a0;if(!Number.isFinite(sw))throw Error('Arco DXF inválido');sw=((sw%(Math.PI*2))+(Math.PI*2))%(Math.PI*2)||Math.PI*2;if(uni){const c=tp(m,e.c),d0=tv(m,Math.cos(e.a0),Math.sin(e.a0)),d1=tv(m,Math.cos(e.a1),Math.sin(e.a1));let a0=Math.atan2(d0.y,d0.x),a1=Math.atan2(d1.y,d1.x);if(det<0)[a0,a1]=[a1,a0];return{...e,c,r:e.r*s,a0,a1}}return{...e,type:'polyline',closed:false,pts:arcPts(e.c,e.r,e.a0,sw).map(p=>tp(m,p))}}
   case 'ellipse':{
    // Recover principal axes of the affine-transformed ellipse.
    const co=Math.cos(e.rotation||0),si=Math.sin(e.rotation||0);
    const u=tv(m,e.rx*co,e.rx*si),v=tv(m,-e.ry*si,e.ry*co);
    const k=Math.max(Math.abs(u.x),Math.abs(u.y),Math.abs(v.x),Math.abs(v.y));
    if(!Number.isFinite(k)||k<=0)throw Error('Elipse DXF degenerada');
    const ux=u.x/k,uy=u.y/k,vx=v.x/k,vy=v.y/k;
    const xx=ux*ux+vx*vx,yy=uy*uy+vy*vy,xy=ux*uy+vx*vy;
    const major=Math.sqrt((xx+yy+Math.hypot(xx-yy,2*xy))/2);
    const minor=Math.abs(ux*vy-uy*vx)/major;
    const rx=k*major,ry=k*minor;
    if(!Number.isFinite(rx)||!Number.isFinite(ry)||ry<=0)throw Error('Elipse DXF degenerada');
    return {...e,c:tp(m,e.c),rx,ry,rotation:Math.atan2(2*xy,xx-yy)/2};
   }
   case 'text':return{...e,p:tp(m,e.p),h:e.h*sy,rotation:(e.rotation||0)+rotDeg};
  }
  return out;
 }

 // INSERT de primer nivel → referencia de bloque CAD2D (se mantiene como bloque, no se explota).
 const importedBlocks=Object.create(null),defName=n=>n.startsWith('*')?'ANON_'+n.slice(1):n;
 const importedDimStyles={};
 function cadDxfBlockRef(def,o,lname,common,sub){
  if(o.cols>1||o.rows>1)return null;
  let A=[Math.cos(o.rot)*o.sx,Math.sin(o.rot)*o.sx,-Math.sin(o.rot)*o.sy,Math.cos(o.rot)*o.sy],ix=o.ix,iy=o.iy;
  if(o.ext<0){A=[-A[0],A[1],-A[2],A[3]];ix=-ix}
  let flip=false;if(A[0]*A[3]-A[1]*A[2]<0){A=[-A[0],-A[1],A[2],A[3]];flip=true}
  const sc=Math.hypot(A[0],A[1]);if(!(sc>0)||Math.abs(A[0]-A[3])>1e-6*sc||Math.abs(A[1]+A[2])>1e-6*sc)return null;
  const name=defName(def.name);
  if(!importedBlocks[name]){const list=[];walk(def.recs,[1,0,0,1,-def.base.x,-def.base.y],{layer:lname,color:undefined,linetype:sub.linetype,width:sub.width},1,list);if(!list.length)return null;importedBlocks[name]={name,entities:list.map(e=>{const c={...e};delete c.id;delete c.layer;return c}),source:'dxf'}}
  const ref={type:'blockRef',blockName:name,p:P(ix,iy),scale:+sc.toPrecision(10),rotation:Math.atan2(A[1],A[0])*180/Math.PI,layer:lname,lineweight:common.width};
  if(flip)ref.flipBlockX=true;if(common.color)ref.color=common.color;
  return ref;
 }
 // --- Walk records, expanding INSERT and DIMENSION blocks ---
 let expanded=0;
 function walk(recs,m,ctx,depth,out){
  if(activeRecords.has(recs))abortImport('referencia circular de bloques');
  if(depth>24)abortImport('anidamiento de bloques excesivo');
  activeRecords.add(recs);try{
  for(let idx=0;idx<recs.length;idx++){
   if(++walkCount>MAX_WALK)abortImport('demasiadas referencias expandidas');if((walkCount&1023)===0)checkTime();
   const [type,record]=recs[idx];
   if(type==='VERTEX'||type==='SEQEND')continue;
   const {get,str}=fields(record);
   let lname=str(8,'0');if(lname==='0'&&ctx)lname=ctx.layer;
   const layer=getLayer(lname),objectWeight=get(370,-1),objectColor=get(420,NaN),indexColor=get(62,256);
   const common={layer:lname,width:objectWeight>0?objectWeight/100:(ctx&&objectWeight===-2?ctx.width:layer.width),linetype:str(6,'BYLAYER')};
   if(common.linetype==='BYBLOCK')common.linetype=ctx?.linetype||'BYLAYER';
   if(Number.isFinite(objectColor))common.color=toHex(objectColor);
   else if(indexColor>0&&indexColor<256)common.color=aciHex(indexColor);
   else if(indexColor===0&&ctx?.color)common.color=ctx.color;
   if(get(60,0)&1)continue;
   try{
    if(type==='INSERT'||type==='DIMENSION'){
     const def=blocksDef.get(str(2,''));if(!def){note(type);continue}
     if(depth>12)abortImport('anidamiento de bloques superior a 12 niveles');
     const sub={layer:lname,color:common.color||(indexColor===0?ctx?.color:undefined)||layer.color,linetype:common.linetype,width:common.width};
     if(type==='DIMENSION'){
      // Cota lineal o alineada de primer nivel → cota nativa de CAD2D (editable, asociable); las demás se dibujan con su bloque.
      const dt=get(70,0)&7;
      if(depth===0&&!out&&(dt===0||dt===1)&&!(opts&&opts.explodeInserts)){
       const a=tp(m,P(get(13),get(23))),b=tp(m,P(get(14),get(24))),p=tp(m,P(get(10),get(20)));
       if([a.x,a.y,b.x,b.y,p.x,p.y].every(Number.isFinite)&&dist(a,b)>1e-9){
        let mode='aligned';if(dt===0){const r=((get(50,0)%180)+180)%180;mode=Math.abs(r)<1e-3||Math.abs(r-180)<1e-3?'horizontal':Math.abs(r-90)<1e-3?'vertical':'aligned'}
        let th=0,solid=false,txt='';for(const [t2,r2] of def.recs){if((t2==='TEXT'||t2==='MTEXT')&&!th){const f=fields(r2);th=f.get(40,0);txt=f.str(1,'')}if(t2==='SOLID')solid=true}
        const base=dimensionStyle,h=th>0?th:base.textHeight,dec=(cleanMText(txt).match(/[.,](\d+)/)||[,''])[1].length;
        const style={...base,textHeight:h,arrow:h*.8,arrowType:solid?'arrow':'tick',precision:Math.min(4,dec),extOffset:h*.4,extBeyond:h*.5,color:common.color||layer.color||''};
        const ov=str(1,'');const dim={type:'dimension',a,b,p,mode,style,layer:lname,lineweight:common.width,id:entities.length+1};
        // Estilo de cota del archivo (DIMSTYLE, código 3) → modelo con nombre en la paleta, como en AutoCAD.
        const dsn=str(3,'').trim().slice(0,70);if(dsn&&/^[\p{L}\p{N} _.()+-]+$/u.test(dsn)){importedDimStyles[dsn]=importedDimStyles[dsn]||style;dim.dimStyleName=dsn}
        if(ov&&ov!=='<>'&&!/<>/.test(ov))dim.label=cleanMText(ov).slice(0,120);
        if(common.color)dim.color=common.color;
        budgetEntity(dim);entities.push(dim);expanded++;continue;
       }
      }
      walk(def.recs,m,sub,depth+1,out);expanded++;continue}
     const ix=get(10),iy=get(20),sx=get(41,1)||1,sy=get(42,1)||1,rot=get(50,0)*Math.PI/180,ext=get(230,1);
     if(depth===0&&!out&&!(opts&&opts.explodeInserts)){const ref=cadDxfBlockRef(def,{ix,iy,sx,sy,rot,ext,cols:get(70,1),rows:get(71,1)},lname,common,sub);if(ref){
      // ATTRIB que siguen al INSERT: valores de los atributos de esta referencia.
      if(get(66,0)===1&&importedBlocks[ref.blockName]?.entities.some(c=>c.attdef)){const attrs={};let j=idx+1;for(;j<recs.length&&recs[j][0]==='ATTRIB';j++){const f=fields(recs[j][1]),t=f.str(2,'').trim().toUpperCase();if(t)attrs[t]=cleanMText(f.str(1,''))}if(Object.keys(attrs).length){ref.attrs=attrs;idx=j-1}}
      budgetEntity(ref);entities.push({...ref,id:entities.length+1});expanded++;continue}}
     const cols=Math.max(1,get(70,1)),rows=Math.max(1,get(71,1)),cs=get(44,0),rs=get(45,0);
     if(!Number.isSafeInteger(cols)||!Number.isSafeInteger(rows)||cols*rows>MAX_ENTITIES||cols*rows*Math.max(1,def.recs.length)>MAX_WALK-walkCount)abortImport('matriz INSERT excesiva');
     for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
      if(((r*cols+c)&1023)===0)checkTime();
      const ox=c*cs,oy=r*rs,tx=ix+ox*Math.cos(rot)-oy*Math.sin(rot),ty=iy+ox*Math.sin(rot)+oy*Math.cos(rot);
      let L=[Math.cos(rot)*sx,Math.sin(rot)*sx,-Math.sin(rot)*sy,Math.cos(rot)*sy,tx,ty];
      L=mul2(L,[1,0,0,1,-def.base.x,-def.base.y]);
      if(ext<0)L=mul2([-1,0,0,1,0,0],L);
      walk(def.recs,mul2(m,L),sub,depth+1,out);
     }
     expanded++;continue;
    }
    let ent=readRecord(type,record,recs,idx);
    if(ent===undefined){if(!silent.has(type))note(type);continue}
    if(!ent)continue;
    for(const one of[].concat(ent)){const w=xform({...common,...one},m);budgetEntity(w);if(one.width&&one.type==='hatch')w.width=one.width;if(out){if(!w.color&&lname!==(ctx?.layer)&&layer.color)w.color=layer.color;out.push(w)}else entities.push({...w,id:entities.length+1})}
   }catch(error){if(error.cadImportFatal)throw error;note(type);if(unsupported.get(type)<=3)console.warn('Skipped DXF entity',type,error)}
  }
  }finally{activeRecords.delete(recs)}
 }
 walk(modelRecs,ID,null,0);
 // Preserve named definitions even when they have no INSERT in model space.
 if(!opts?.explodeInserts||opts?.collectDefinitions)for(const def of blocksDef.values()){
  if(!def.name||def.name.startsWith('*')||Object.prototype.hasOwnProperty.call(importedBlocks,defName(def.name)))continue;
  const list=[];walk(def.recs,[1,0,0,1,-def.base.x,-def.base.y],{layer:'0',color:undefined,linetype:'BYLAYER',width:.25},1,list);
  if(list.length)importedBlocks[defName(def.name)]={name:defName(def.name),entities:list.map(e=>{const c={...e};delete c.id;delete c.layer;return c}),source:'dxf'};
 }
 blockCount=0;
 return {entities,layers:[...layers.values()],blocks:importedBlocks,unitCode,dimStyles:importedDimStyles,warnings:[...unsupported].filter(([key])=>key!=='ENDSEC').map(([key,n])=>key+' ('+n+')')};
}
root.CAD2DDxfParser={parse};
})(globalThis);
