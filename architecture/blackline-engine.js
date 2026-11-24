/* Blackline Architecture AI: own offline architectural grammar and constraint solver.
   No API, model weights, WebGPU or external runtime. Semantic rules, not an LLM.
   All measures in metres; emits native CAD plan schema. */
(function(root){
'use strict';
const C=Object.freeze({
 toilet:['san-wc',.40,.70],bidet:['san-bidet',.38,.58],basin:['san-lav',.60,.48],
 shower:['san-ducha',.90,.90],bathtub:['san-banera',1.70,.75],
 bed:['dor-queen',2.60,2],wardrobe:['mob-placard',1.80,.62],
 singlebed:['dor-cama1',1.40,2],doublebed:['dor-cama2',2.40,1.90],kingbed:['dor-king',3,2],
 sink:['kq-bacha',.80,.60],range:['kq-cocina',.60,.62],fridge:['kq-heladera',.70,.70],
 island:['kq-isla',2,.95],sofa:['mob-sofa3',2.30,.92],table6:['mob-mesa6',1.80,1.90],
 table4:['mob-mesa4',1.20,1.80],table8:['mob-mesa8',2.40,2],desk:['mob-escritorio',1.40,1.20],
 coffee:['mob-ratona',1.10,.60],tv:['mob-tv',1.80,.45]
});
const DEFAULT={bedroom:[4,5,['bed','wardrobe']],bathroom:[2.2,2.6,['toilet','bidet','basin','shower']],kitchen:[4,5,['sink','range','fridge']],living:[5,6,['sofa','table6']]};
const aliases={
 bedroom:'habitacion habitaciones dormitorio dormitorios cuarto cuartos pieza piezas recamara recamaras alcoba alcobas bedroom bedrooms chambre chambres schlafzimmer quarto quartos camera camere',
 bathroom:'bano banos toilette toilettes sanitario sanitarios bathroom bathrooms restroom restrooms badezimmer banheiro banheiros bagno bagni',
 kitchen:'cocina cocinas kitchen kitchens cuisine cuisines kuche kuchen cozinha cozinhas cucina cucine',
 living:'living livings salon salones lounge lounges wohnzimmer soggiorno soggiorni',
 wall:'muro muros pared paredes tabique tabiques wall walls mur murs wand wande parede paredes muro muri',
 door:'puerta puertas door doors porte portes tur turen porta portas',
 window:'ventana ventanas ventanal ventanales window windows fenetre fenetres fenster janela janelas finestra finestre',
 toilet:'inodoro inodoros retrete retretes toilet toilets wc',
 bidet:'bide bidet bidets bides',
 basin:'lavatorio lavatorios lavamanos lavabo lavabos vanitory washbasin',
 shower:'ducha duchas shower showers douche dusche chuveiro doccia',
 bathtub:'banadera banaderas banera baneras bathtub bathtubs baignoire badewanne banheira vasca',
 bed:'cama camas bed beds lit bett letto',
 wardrobe:'placard placares placards armario armarios ropero roperos wardrobe wardrobes armoire schrank armario armadi',
 sink:'bacha bachas fregadero sink sinks evier spule pia',
 range:'anafe anafes hornalla hornallas stove cooktop cooker',
 fridge:'heladera heladeras refrigerador refrigeradores fridge refrigerator refrigerateur kuhlschrank geladeira',
 island:'isla island ilot insel ilha isola',
 sofa:'sofa sofas sillon sillones couch canape divano',
 desk:'escritorio escritorios desk desks bureau',
 tv:'tv television televisor',
 alternative:'variante variantes version versiones alternativa alternativas variant variants alternative alternatives versionen varianten',
 row:'tandem fila pegado pegados pegada pegadas contiguo contiguos contigua contiguas adjacent adjoining nebeneinander affiancate',
 private:'privado privada privados privadas suite ensuite each cada jeweils chacun chacune ciascuno ciascuna',
};
const numberWords={un:1,una:1,uno:1,one:1,a:1,an:1,une:1,ein:1,eine:1,um:1,uma:1,dos:2,two:2,deux:2,zwei:2,dois:2,duas:2,due:2,tres:3,three:3,trois:3,drei:3,tre:3,cuatro:4,four:4,quatre:4,cinco:5,five:5,cinq:5,seis:6,six:6,siete:7,seven:7,ocho:8,eight:8,nueve:9,nine:9,diez:10,ten:10,veinte:20,twenty:20};
const lex=new Map();for(const [key,words] of Object.entries(aliases))for(const word of words.split(' '))if(!lex.has(word))lex.set(word,key);
const normalize=s=>String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
function distance(a,b){let row=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const next=[i];for(let j=1;j<=b.length;j++)next[j]=Math.min(row[j]+1,next[j-1]+1,row[j-1]+(a[i-1]!==b[j-1]));row=next}return row[b.length]}
function concept(t){if(lex.has(t))return lex.get(t);if(t.length<5)return null;let best=2,keys=new Set();for(const [word,key] of lex){if(Math.abs(word.length-t.length)>1)continue;const d=distance(word,t);if(d<best){best=d;keys=new Set([key])}else if(d===best)keys.add(key)}return best===1&&keys.size===1?[...keys][0]:null}
const num=s=>Number(String(s).replace(',','.'));
const unitScale=u=>/^(cm|centimet)/.test(u||'')?.01:/^(mm|milimet)/.test(u||'')?.001:/^(ft|feet|foot|pies|pie)$/.test(u||'')?.3048:1;
const N='(\\d+(?:[.,]\\d+)?)',U='(mm|cm|mts?|metros?|meters?|metres?|ft|feet|foot|pies|pie|centimetros?|milimetros?)?';
function measure(s){const m=s.match(new RegExp('^\\s*'+N+'\\s*'+U+'\\b','i'));return m?num(m[1])*unitScale(m[2]):null}
function dimensions(s){const m=s.match(new RegExp(N+'\\s*'+U+'\\s*(?:x|×|por|by|par|mal|per)\\s*'+N+'\\s*'+U,'i'));return m?[num(m[1])*unitScale(m[2]||m[4]),num(m[3])*unitScale(m[4]||m[2])]:null}
function interpret(raw){
 if(typeof raw!=='string'||!raw.trim()||raw.length>4000)throw Error('Escribí una instrucción arquitectónica.');
 let s=normalize(raw).replace(/\b(?:hav|hab)\s*itacion\b/g,'habitacion').replace(/\bsalles? de bains?\b/g,'bathroom').replace(/\b(?:sala de estar|living room|salas de estar)\b/g,'living').replace(/\b(?:al lado|side by side|cote a cote|lado a lado)\b/g,'tandem');
 if(/\b(?:agranda\w*|achica\w*|reduce\w*|amplia\w*|ensancha\w*|modifica\w*|desplaza\w*|corre(?:r|lo|la|los|las)?|mueve\w*|cambia\w*|resize|move|enlarge)\b/.test(s))throw Error('La edición por lenguaje natural de objetos existentes todavía no está disponible. Usá las cotas virtuales o los grips.');
 if(/\b(?:en corte|en seccion|section view)\b/.test(s))throw Error('El corte arquitectónico requiere un generador de sección; no se dibujará una planta.');
 const tokens=[...s.matchAll(/[a-z]+|\d+(?:[.,]\d+)?/g)].map(m=>({t:m[0],i:m.index,end:m.index+m[0].length,k:concept(m[0])}));
 const rooms=tokens.filter(x=>Object.hasOwn(DEFAULT,x.k));
 if(!rooms.length)throw Error('No reconozco un ambiente de arquitectura. Indicá qué querés dibujar.');
 const first=rooms[0],base=first.k,bath=rooms.find((r,i)=>i>0&&r.k==='bathroom'),suite=base==='bedroom'&&!!bath;
 if(rooms.some(r=>r.k!==base&&!(suite&&r.k==='bathroom')))throw Error('Todavía no puedo resolver conjuntos de ambientes diferentes.');
 if(/\b(?:pasillo|corredor|corridor|balcon|balcony|vestidor|walk-in closet|escalera|stairs|planta alta|second floor)\b/.test(s))throw Error('La geometría solicitada incluye elementos aún no soportados.');
 const qty=t=>t?(/^\d+$/.test(t.t)?+t.t:numberWords[t.t]):undefined;
 const at=tokens.indexOf(first),alt=tokens.find(x=>x.k==='alternative'),alternatives=alt?(qty(tokens[tokens.indexOf(alt)-1])||1):1;
 const row=tokens.some(t=>t.k==='row');
 const after=first&&s.slice(first.end).match(/^\s*:\s*(\d+)\b/);
 const beforeRow=tokens.findIndex(t=>t.k==='row');
 const explicit=qty(tokens[at-1])??(after?+after[1]:undefined)??(beforeRow>=0?qty(tokens[beforeRow-1]):undefined);
 const assumedCount=explicit===undefined&&row&&!alt;
 let count=explicit??(assumedCount?3:1);if(alt)count=1;
 if(count>1&&!tokens.some(t=>t.k==='row'))throw Error('Indicá cómo se relacionan los ambientes: contiguos o alternativas.');
 if(suite&&count>1&&!tokens.some(t=>t.k==='private'))throw Error('Indicá si cada habitación tiene su propio baño.');
 if(suite&&/\b(?:compartid[oa]s?|shared|comun)\b/.test(s))throw Error('Baño compartido: requiere una distribución conectada todavía no implementada.');
 if(/\b(?:frente a|enfrente de|a la izquierda|a la derecha|junto a|al fondo|centrad[oa]|esquina|opposite|next to)\b/.test(s))throw Error('La posición relativa solicitada todavía no está soportada; no se omitirá silenciosamente.');
 if(/\b(?:accesibles?|adaptad[oa]s?|sillas? de ruedas|wheelchair|discapacitados?)\b/.test(s))throw Error('Accesibilidad: falta implementar y verificar las áreas de maniobra y transferencia.');
 if(/\b(?:cocina en [ul]|kitchen in [ul]|integrada? (?:al|a la)|doble lavabo|doble bacha|doble lavatorio)\b/.test(s))throw Error('Esta configuración específica todavía no está soportada.');
 const assumptions=[],main=suite?s.slice(0,bath.i):s;
 if(assumedCount)assumptions.push('Cantidad no indicada: 3 ambientes en tándem como propuesta inicial.');
 let size=dimensions(main);
 if(!size){
  const named=(labels)=>{const m=main.match(new RegExp('(?:'+labels+')\\s*(?:de|:|=)?\\s*'+N+'\\s*'+U,'i'))||main.match(new RegExp(N+'\\s*'+U+'\\s*(?:de\\s+)?(?:'+labels+')\\b','i'));return m?num(m[1])*unitScale(m[2]):null};
  const width=named('ancho|anchura|width'),depth=named('largo|longitud|profundidad|depth|length');
  if(width!==null&&depth!==null)size=[width,depth];
  else if(width!==null||depth!==null){size=[width??DEFAULT[base][0],depth??DEFAULT[base][1]];assumptions.push('Dimensión no indicada: valor inicial');}
 }
 const areaMatch=main.match(/(\d+(?:[.,]\d+)?)\s*(?:m²|m2|m\^2|metros cuadrados|square meters)/);
 if(areaMatch){const area=num(areaMatch[1]);if(!(area>0&&area<=400))throw Error('Superficie fuera del rango.');
  if(size&&Math.abs(size[0]*size[1]-area)>.05)throw Error('La superficie y las dimensiones solicitadas no coinciden.');
  if(!size){const ratio=DEFAULT[base][0]/DEFAULT[base][1];const w=Math.round(Math.sqrt(area*ratio)*100)/100;size=[w,area/w];assumptions.push('Proporción inicial estimada para '+area+' m²');}
 }
 if(!size&&/\btoilettes?\b/.test(main)){size=[1.5,2];assumptions.push('Toilette: medidas iniciales 1.50 × 2.00 m');}
 if(!size){size=DEFAULT[base].slice(0,2);assumptions.push('Dimensiones iniciales: '+size.join(' × ')+' m')}
 const spec={kind:suite?'suite_row':base,count,alternatives,width:size[0],depth:size[1],wall:.15,door:.8,window:1.2,assumptions};
 for(const [key,def] of [['wall',.15],['door',.8],['window',1.2]]){
  const t=tokens.find(x=>x.k===key);if(!t){assumptions.push(key+': '+def+' m');continue}
  const tail=s.slice(t.end).replace(/^\s*(?:(?:de|of|von|da|di|com|con|ancho|width|espesor|thickness)\s+)*/,'');
  const v=measure(tail);
  if(/\b(?:sin|without|sans|sem|ohne|senza)\s+(?:un[ao]?\s+)?$/.test(s.slice(Math.max(0,t.i-24),t.i)))spec[key]=0;
  else if(v!==null)spec[key]=v;
  else assumptions.push(key+': '+def+' m');
 }
 const selected=(kind,part)=>{
  const ts=tokens.filter(t=>t.i>=part[0]&&t.i<part[1]),out=new Set(DEFAULT[kind][2]);
  const words=s.slice(...part);
  if(kind==='bathroom'&&/\btoilettes?\b/.test(words)){out.clear();out.add('toilet');out.add('basin');}
  const neg=t=>/\b(?:sin|without|sans|sem|ohne|senza)\s+(?:un[ao]?\s+|a\s+)?$/.test(s.slice(Math.max(part[0],t.i-24),t.i))||/\bni\s*$/.test(s.slice(Math.max(part[0],t.i-12),t.i));
  for(const t of ts){if(!C[t.k])continue;
   const q=qty(tokens[tokens.indexOf(t)-1]);if(q>1)throw Error('Equipamiento repetido: aún no se puede garantizar la cantidad solicitada.');
if(neg(t))out.delete(t.k);else out.add(t.k)}
  if(kind==='bathroom'&&out.has('bathtub')&&!ts.some(t=>t.k==='shower'&&!neg(t)))out.delete('shower');
  if(kind==='bedroom'){let k=/\b(?:cama\s+(?:individual|simple|de una plaza)|single bed|dormitorio individual|habitacion individual|dormitorio infantil|habitacion infantil)\b/.test(words)?'singlebed':/\b(?:cama\s+(?:doble|de dos plazas|matrimonial)|double bed|dormitorio matrimonial|habitacion matrimonial|cuarto matrimonial)\b/.test(words)?'doublebed':/\bking\b/.test(words)?'kingbed':null;if(k&&out.has('bed')){out.delete('bed');out.add(k)}}
  if(kind==='living'){const m=words.match(/\b(?:mesa|table)\s+(?:para|for)\s+(4|6|8|cuatro|seis|ocho|four|six|eight)\b/);if(m){out.delete('table6');out.add('table'+(numberWords[m[1]]||m[1]))}if(/\b(?:mesa ratona|coffee table)\b/.test(words))out.add('coffee')}
  if(/\b(?:sin muebles|sin mobiliario|without furniture|vaci[oa])\b/.test(words))out.clear();
  return [...out];
 };
 spec.fixtures=selected(base,[0,suite?bath.i:s.length]);
 if(suite){const bs=dimensions(s.slice(bath.i))||[spec.width,2.4];spec.bathWidth=bs[0];spec.bathDepth=bs[1];spec.bathFixtures=selected('bathroom',[bath.i,s.length]);if(!dimensions(s.slice(bath.i)))assumptions.push('Baño: '+bs.join(' × ')+' m (inicial)')}
 return spec;
}
const R=(x,y,w,d)=>({x,y,w,d});
const inside=(r,w,d)=>r.x>=-1e-7&&r.y>=-1e-7&&r.x+r.w<=w+1e-7&&r.y+r.d<=d+1e-7;
const overlap=(a,b,g=0)=>a.x<b.x+b.w+g-1e-7&&b.x<a.x+a.w+g-1e-7&&a.y<b.y+b.d+g-1e-7&&b.y<a.y+a.d+g-1e-7;
function arrange(w,d,fixtures,protectedZones,seed=0){
 let rng=seed+1;const rand=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296};
 const sorted=fixtures.slice().sort((a,b)=>C[b][1]*C[b][2]-C[a][1]*C[a][2]),placed=[],options=new Map();let nodes=0;
 for(const key of sorted){if(options.has(key))continue;const [,bw,bd]=C[key],opts=[];
  for(const rot of [0,90,180,270]){
   const fw=rot%180?bd:bw,fd=rot%180?bw:bd;if(fw>w||fd>d)continue;
   if(key==='island'){const r=R((w-fw)/2,(d-fd)/2,fw,fd),a=R(r.x-.9,r.y-.9,fw+1.8,fd+1.8);if(inside(a,w,d)&&!protectedZones.some(p=>overlap(r,p,.03)))opts.push({key,rot,r,a});continue}
   const horizontal=rot%180===0,edge=horizontal?w-fw:d-fd,step=.15;
   for(let j=0;j<=Math.ceil(edge/step);j++){
    const accessRot=['bed','singlebed','doublebed','kingbed'].includes(key)?(rot+180)%360:rot;
    const z=Math.min(edge,j*step),r=horizontal?R(z,accessRot===0?0:d-fd,fw,fd):R(accessRot===90?w-fw:0,z,fw,fd);
    const gap=['toilet','bidet','basin','shower','bathtub'].includes(key)?.60:.75;
    // Bed catalogue headboard is local +Y; place headboard at wall (rotation 180/90).
    // Beds have their headboard at local +Y; their access direction is reversed.
    const a=accessRot===0?R(r.x,r.y,r.w,r.d+gap):accessRot===90?R(r.x-gap,r.y,r.w+gap,r.d):accessRot===180?R(r.x,r.y-gap,r.w,r.d+gap):R(r.x,r.y,r.w+gap,r.d);
    if(inside(a,w,d)&&!protectedZones.some(p=>overlap(r,p,.03)))opts.push({key,rot,r,a});
   }
  }
  if(seed)for(let j=opts.length-1;j>0;j--){const i=Math.floor(rand()*(j+1));[opts[i],opts[j]]=[opts[j],opts[i]]}
  options.set(key,opts);
 }
 function dfs(i){if(i===sorted.length)return true;for(const o of options.get(sorted[i])){if(++nodes>35000)return false;if(placed.some(p=>overlap(p.r,o.r,.03)||overlap(p.a,o.r,.03)||overlap(p.r,o.a,.03)))continue;placed.push(o);if(dfs(i+1))return true;placed.pop()}return false}
 if(!dfs(0))throw Error('No encuentro una distribución sin interferencias con esas medidas. Aumentá el ambiente o reducí equipamiento.');
 return placed;
}
function solve(spec){
 const {width:w,depth:d,wall:t,door,window:win,count:n}=spec;
 const kind=spec.kind,suite=kind==='suite_row',base=suite?'bedroom':kind;
 if(!DEFAULT[base]||![w,d,t,door,win].every(Number.isFinite)||w<1.2||d<1.2||w>20||d>20||t<.08||t>.5||(door!==0&&door<.6)||door>Math.min(1.2,w-.3)||win<0||win>w-.3||!Number.isInteger(n)||n<1||n>30)throw Error('Dimensiones o cantidad fuera del rango del motor.');
 const bd=suite?spec.bathDepth:0;
 if(suite&&(Math.abs(spec.bathWidth-w)>1e-6||!Number.isFinite(bd)||bd<1.5||bd>20))throw Error('Por ahora el baño privado debe tener el mismo ancho que el dormitorio.');
 const amount=spec.alternatives||1;if(!Number.isInteger(amount)||amount<1||amount>20||amount>1&&n>1)throw Error('Hasta 20 alternativas individuales o 30 ambientes contiguos.');
 const items=spec.fixtures||DEFAULT[base][2],bathItems=spec.bathFixtures||DEFAULT.bathroom[2];if(!Array.isArray(items)||!Array.isArray(bathItems)||[...items,...bathItems].some(k=>!C[k])||items.length>12||bathItems.length>12)throw Error('Equipamiento no reconocido.');
 const out={schema:'blackline.architecture.v1',units:'m',walls:[],openings:[],blocks:[],rooms:[],virtualDimensions:[],connections:[],variants:[],brief:spec,assumptions:[...(spec.assumptions||[])]};
 const step=w+t,fullD=d+(suite?bd+t:0),cols=Math.ceil(Math.sqrt(amount)),seen=new Set();
 const doorZones=door?[R((w-door)/2,0,door,door)]:[],bathDoor=.8;
 for(let seed=0;seed<amount*6;seed++){
  let lay,blay;try{lay=arrange(w,d,items,[...doorZones,...(suite?[R((w-bathDoor)/2,d-bathDoor,bathDoor,bathDoor)]:[])],seed);
   if(suite)blay=arrange(w,bd,bathItems,[R((w-bathDoor)/2,0,bathDoor,bathDoor)],seed)}catch(e){if(amount===1)throw e;continue}
  const signature=JSON.stringify([lay,blay].filter(Boolean).map(l=>l.map(o=>[o.key,o.rot,Math.round(o.r.x/.3),Math.round(o.r.y/.3)])));if(seen.has(signature))continue;seen.add(signature);
  const v=out.variants.length,p='v'+v+'-',dx=(v%cols)*(n*step+t+1.5),dy=Math.floor(v/cols)*(fullD+2*t+1.5);
  const pt=(x,y)=>[x+dx,y+dy];
  const wall=(id,a,b)=>{out.walls.push({id:p+id,a:pt(...a),b:pt(...b),thickness:t,layer:'WALLS',join:'native'})};
  const opening=(host,kind,offset,width)=>{if(width>0)out.openings.push({host:p+host,kind,offset,width,layer:'OPENINGS'})};
  const room=(id,kind,x,y,h,front,back,i)=>{
   out.rooms.push({id:p+id,kind,clearBounds:[x+dx,y+dy,w,h]});
   out.virtualDimensions.push({room:p+id,axis:'width',value:w,between:[p+'side'+i,p+'side'+(i+1)],editable:true},{room:p+id,axis:'depth',value:h,between:[p+front,p+back],editable:true});
  };
  const blocks=(layout,x,y,kind)=>{for(const o of layout){const [id,bw,bd]=C[o.key],r=o.r,[ox,oy]=({0:[0,0],90:[r.w,0],180:[r.w,r.d],270:[0,r.d]})[o.rot];
   out.blocks.push({catalogId:id,role:o.key,point:pt(x+r.x+ox,y+r.y+oy),rotation:o.rot,scale:1,layer:kind==='bathroom'?'FIXTURES':kind==='kitchen'?'KITCHEN':'FURNITURE',envelope:[x+r.x+dx,y+r.y+dy,r.w,r.d],nominalSize:[bw,bd]})}};
  for(let i=0;i<=n;i++){const x=t/2+i*step;wall('side'+i,[x,t/2],[x,fullD+1.5*t])}
  for(let i=0;i<n;i++){
   const x=t+i*step,a=x-t/2,b=a+step,front='front'+i,back='back'+i,rear='rear'+i;
   wall(front,[a,t/2],[b,t/2]);wall(back,[a,d+1.5*t],[b,d+1.5*t]);opening(front,'swing-door',step/2,door);
   room('room'+i,base,x,t,d,front,back,i);blocks(lay,x,t,base);
   if(suite){
    const offset=step/2-door/2-win/2-.2;
    if(win&&offset-win/2<=t/2)throw Error('No hay espacio en fachada para la puerta y ventana solicitadas.');
    opening(front,'framed-window',offset,win);opening(back,'swing-door',step/2,bathDoor);
    wall(rear,[a,fullD+1.5*t],[b,fullD+1.5*t]);opening(rear,'framed-window',step/2,Math.min(.8,w-.3));
    room('bath'+i,'bathroom',x,d+2*t,bd,back,rear,i);blocks(blay,x,d+2*t,'bathroom');
    out.connections.push({from:p+'room'+i,to:p+'bath'+i,via:p+back,private:true});
   }else opening(back,'framed-window',step/2,win);
  }
  out.variants.push({id:p.slice(0,-1),number:v+1});if(out.variants.length===amount)break;
 }
 if(!out.variants.length)throw Error('No se encontró una solución.');
 if(amount>1)out.assumptions.push(out.variants.length+'/'+amount+' alternativas distintas');
 else delete out.brief.alternatives;
 return out;
}

function detailInstruction(raw){
 const s=normalize(raw);
 const stair=/\b(?:escaleras?|stairs?|staircase)\b/.test(s),rail=/\b(?:pasamanos|barandillas?|barandas?|handrail)\b/.test(s),section=/\b(?:en corte|en seccion|section view)\b/.test(s);
 if(!stair&&!rail&&!section)return null;
 if(/\b(?:agranda|achica|modifica|mueve|desplaza|cambia)\b/.test(s))throw Error('Edición de detalles existentes aún no soportada.');
 const read=(labels,def)=>{const m=s.match(new RegExp('(?:'+labels+')\\s*(?:de|:|=)?\\s*'+N+'\\s*'+U,'i'))||s.match(new RegExp(N+'\\s*'+U+'\\s*(?:de\\s+)?(?:'+labels+')\\b','i'));return m?num(m[1])*unitScale(m[2]):def};
 const generic=s.match(new RegExp('\\bde\\s+'+N+'\\s*'+U,'i'));
 const fallback=generic?num(generic[1])*unitScale(generic[2]):null;
 if(stair){
  if(/\b(?:en [lut]|caracol|curva|compensada|helicoidal|descanso)\b/.test(s))throw Error('Solo escalera recta de un tramo en este prototipo.');
  return {kind:'stair_detail',height:read('altura|desnivel|salvar',fallback??3),width:read('ancho|anchura',1.1),tread:read('huella',.28),rail,section};
 }
 if(rail){
  if(/\b(?:curvo|curva|inclinado|inclinada|vidrio|escalonado)\b/.test(s))throw Error('Solo pasamanos recto horizontal en este prototipo.');
  return {kind:'rail_detail',length:read('largo|longitud',fallback??3),height:read('altura|alto',.95)};
 }
 if(!/\b(?:habitacion|dormitorio|cuarto|pieza)\b/.test(s)||/\b(?:ventanas?|puertas?|muebles|camas?|vestidor|baño|bano)\b/.test(s))throw Error('Corte básico disponible solo para habitación sin aberturas ni mobiliario especificados.');
 return {kind:'room_section',width:dimensions(s)?.[0]??read('ancho|luz',fallback??4),height:read('altura|alto|altura libre',2.7),wall:read('espesor|muro',.15),slab:read('losa',.2)};
}
function solveDetail(spec){
 const entities=[],assumptions=['Detalle esquemático 2D; verificar normativa y estructura.'];
 const line=(a,b,layer)=>entities.push({type:'line',a,b,layer});
 const rect=(x,y,w,h,layer)=>{const p=[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];for(let i=0;i<4;i++)line(p[i],p[(i+1)%4],layer)};
 const finite=(v,a,b)=>Number.isFinite(v)&&v>=a&&v<=b;
 const {kind,height:h,width:w}=spec;
 if(kind==='stair_detail'){
  if(!finite(h,.5,6)||!finite(w,.7,3)||!finite(spec.tread,.22,.4))throw Error('Dimensiones de escalera fuera de rango.');
  const n=Math.ceil(h/.18),rise=h/n,tread=spec.tread,run=(n-1)*tread;
  if(n>18||2*rise+tread<.58||2*rise+tread>.66)throw Error('Escalera de un tramo no viable con los criterios preliminares; requiere descanso o ajuste.');
  if(spec.section){
   for(let i=0;i<n;i++){line([i*tread,i*rise],[i*tread,(i+1)*rise],'STAIRS');if(i<n-1)line([i*tread,(i+1)*rise],[(i+1)*tread,(i+1)*rise],'STAIRS')}
   if(spec.rail)line([0,rise+.95],[run,h+.95],'RAILS');
  }else{
   rect(0,0,w,run,'STAIRS');for(let i=1;i<n-1;i++)line([0,i*tread],[w,i*tread],'STAIRS');
   line([w/2,.1],[w/2,run-.1],'STAIRS');line([w/2,run-.1],[w/2-.12,run-.3],'STAIRS');line([w/2,run-.1],[w/2+.12,run-.3],'STAIRS');
   if(spec.rail){line([.05,0],[.05,run],'RAILS');line([w-.05,0],[w-.05,run],'RAILS')}
  }
  assumptions.push(n+' contrahuellas de '+(rise*100).toFixed(2)+' cm; huella '+(tread*100).toFixed(1)+' cm; desarrollo '+run.toFixed(2)+' m');
 }else if(kind==='rail_detail'){
  const l=spec.length;if(!finite(l,.3,30)||!finite(h,.7,1.3))throw Error('Dimensiones de pasamanos fuera de rango.');
  line([0,h],[l,h],'RAILS');line([0,h-.04],[l,h-.04],'RAILS');const n=Math.ceil(l/1.2);
  for(let i=0;i<=n;i++)rect(i*l/n-.02,0,.04,h-.04,'RAILS');
  assumptions.push('Separación preliminar entre postes ≤ 1,20 m; no implica resistencia ni cumplimiento.');
 }else if(kind==='room_section'){
  const t=spec.wall,b=spec.slab;if(!finite(w,1.2,20)||!finite(h,2,6)||!finite(t,.08,.5)||!finite(b,.1,.5))throw Error('Dimensiones de corte fuera de rango.');
  rect(-t,0,t,h,'SECTIONS');rect(w,0,t,h,'SECTIONS');rect(-t,-b,w+2*t,b,'SECTIONS');rect(-t,h,w+2*t,b,'SECTIONS');
  assumptions.push('Corte transversal esquemático; sin mobiliario, aberturas ni estructura calculada.');
 }else throw Error('Detalle no reconocido.');
 return {schema:'blackline.architecture.detail.v1',units:'m',entities,brief:spec,assumptions};
}

const api=Object.freeze({interpret,solve,detailInstruction,solveDetail,run:text=>{const d=detailInstruction(text);return d?solveDetail(d):solve(interpret(text))},catalog:C});
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BlacklineArchitectureAI=api;
})(typeof self!=='undefined'?self:globalThis);
