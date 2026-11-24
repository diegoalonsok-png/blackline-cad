/* Blackline Architecture AI: own offline architectural grammar and constraint solver.
   No API, model weights, WebGPU or external runtime. Semantic rules, not an LLM.
   All measures in metres; emits native CAD plan schema. */
(function(root){
'use strict';
const C=Object.freeze({
 toilet:['san-wc',.40,.70],bidet:['san-bidet',.38,.58],basin:['san-lav',.60,.48],
 shower:['san-ducha',.90,.90],shower75:['san-ducha',.75,.75],basin45:['san-lav',.45,.40],toiletCompact:['san-wc-susp',.38,.60],bathtub:['san-banera',1.70,.75],bathtub150:['san-banera',1.50,.75],
 bed:['dor-queen',2.60,2],wardrobe:['mob-placard',1.80,.62],
 singlebed:['dor-cama1',1.40,2],doublebed:['dor-cama2',2.40,1.90],kingbed:['dor-king',3,2],
 sink:['kq-bacha',.80,.60],range:['kq-cocina',.60,.62],fridge:['kq-heladera',.70,.70],
 island:['kq-isla',2,.95],sofa:['mob-sofa3',2.30,.92],table6:['mob-mesa6',1.80,1.90],
 table4:['mob-mesa4',1.20,1.80],table8:['mob-mesa8',2.40,2],desk:['mob-escritorio',1.40,1.20],
 coffee:['mob-ratona',1.10,.60],tv:['mob-tv',1.80,.45],
 washer:['kq-lavarropas',.60,.60],dryer:['kq-secarropas',.60,.60],laundrySink:['kq-pileta',.60,.55],bookshelf:['mob-biblioteca',1.60,.35],shelving:['mob-estanteria',1.20,.35],meetingTable:['ofi-reuniones',3.20,2.20],workstations:['ofi-puestos-4',2.80,2.60],receptionDesk:['ofi-recepcion',2.40,1.60],entryBench:['mob-recibidor',1,.40],bunk:['dor-cucheta',.90,2],crib:['dor-cuna',.70,1.30],dishwasher:['kq-lv',.60,.60],oven:['kq-horno',.60,.60]
});
const DEFAULT={bedroom:[4,5,['bed','wardrobe']],bathroom:[2.2,2.6,['toilet','bidet','basin','shower']],kitchen:[4,5,['sink','range','fridge']],living:[5,6,['sofa','table6']],laundry:[2.2,2.5,['washer','laundrySink']],office:[3.5,4,['desk','bookshelf']],dining:[4,4,['table6']],storage:[2.4,3,['shelving']],meeting:[5,4.5,['meetingTable']],reception:[4,4,['receptionDesk','sofa']],closet:[2.4,2.4,['wardrobe']],nursery:[3,3.5,['crib','wardrobe']]};
const aliases={
 bedroom:'habitacion habitaciones dormitorio dormitorios cuarto cuartos pieza piezas recamara recamaras alcoba alcobas bedroom bedrooms chambre chambres schlafzimmer quarto quartos camera camere',
 bathroom:'bano banos toilette toilettes sanitario sanitarios bathroom bathrooms restroom restrooms badezimmer banheiro banheiros bagno bagni',
 kitchen:'cocina cocinas kitchen kitchens cuisine cuisines kuche kuchen cozinha cozinhas cucina cucine',
 living:'living livings salon salones lounge lounges wohnzimmer soggiorno soggiorni',
 laundry:'lavadero lavaderos lavanderia lavanderias laundry buanderie',
 office:'oficina oficinas despacho despachos office offices',
 dining:'comedor comedores dining',
 storage:'deposito depositos despensa despensas trastero trasteros storage',
 meeting:'reunion reuniones meeting',
 reception:'recepcion recepciones reception',
 closet:'vestidor vestidores dressing',
 nursery:'guarderia guarderias nursery',
 washer:'lavarropas lavadora lavadoras washer',dryer:'secarropas secadora dryer',laundrySink:'lavadero_pileta',bookshelf:'biblioteca bibliotecas librero libreros bookshelf',shelving:'estanteria estanterias estante estantes shelving',bunk:'cucheta cuchetas litera literas bunk',crib:'cuna cunas crib',dishwasher:'lavavajillas dishwasher',oven:'horno hornos oven',
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
 let s=normalize(raw).replace(/\bsala de reuniones\b/g,'reunion').replace(/\b(?:living comedor|living-comedor)\b/g,'living').replace(/\b(?:pileta de lavar|pileta de lavadero)\b/g,'laundry_sink').replace(/\b(?:hav|hab)\s*itacion\b/g,'habitacion').replace(/\bsalles? de bains?\b/g,'bathroom').replace(/\b(?:sala de estar|living room|salas de estar)\b/g,'living').replace(/\b(?:al lado|side by side|cote a cote|lado a lado)\b/g,'tandem');
 if(/\b(?:agranda\w*|achica\w*|reduce\w*|amplia\w*|ensancha\w*|modifica\w*|desplaza\w*|corre(?:r|lo|la|los|las)?|mueve\w*|cambia\w*|resize|move|enlarge)\b/.test(s))throw Error('La edición por lenguaje natural de objetos existentes todavía no está disponible. Usá las cotas virtuales o los grips.');
 if(/\b(?:en corte|en seccion|section view)\b/.test(s))throw Error('El corte arquitectónico requiere un generador de sección; no se dibujará una planta.');
 const tokens=[...s.matchAll(/[a-z]+|\d+(?:[.,]\d+)?/g)].map(m=>({t:m[0],i:m.index,end:m.index+m[0].length,k:concept(m[0])}));
 const rooms=tokens.filter(x=>Object.hasOwn(DEFAULT,x.k));
 if(!rooms.length)throw Error('No reconozco un ambiente de arquitectura. Indicá qué querés dibujar.');
 const first=rooms[0],base=first.k,bath=rooms.find((r,i)=>i>0&&r.k==='bathroom'),suite=base==='bedroom'&&!!bath,closet=base==='bedroom'?rooms.find((r,i)=>i>0&&r.k==='closet'):null;
 if(rooms.some(r=>r.k!==base&&!(suite&&r.k==='bathroom')&&!(closet&&r.k==='closet')))throw Error('Todavía no puedo resolver conjuntos de ambientes diferentes.');
 if(/\b(?:pasillo|corredor|corridor|balcon|balcony|walk-in closet|escalera|stairs|planta alta|second floor)\b/.test(s))throw Error('La geometría solicitada incluye elementos aún no soportados.');
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
 const assumptions=[],main=s.slice(0,Math.min(bath&&suite?bath.i:s.length,closet?closet.i:s.length));
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
  if(kind==='bedroom'){let k=/\b(?:cama\s+(?:individual|simple|de una plaza)|single bed|dormitorio individual|habitacion individual|dormitorio infantil|habitacion infantil)\b/.test(words)?'singlebed':/\b(?:cama\s+(?:doble|de dos plazas|matrimonial)|double bed|dormitorio matrimonial|habitacion matrimonial|cuarto matrimonial)\b/.test(words)?'doublebed':/\bking\b/.test(words)?'kingbed':null;if(k&&out.has('bed')){out.delete('bed');out.add(k)}if(out.has('bunk')||out.has('crib')){out.delete('bed');out.delete('singlebed');out.delete('doublebed');out.delete('kingbed')}}
  if(kind==='living'||kind==='dining'){const m=words.match(/\b(?:mesa|table)\s+(?:para|for)\s+(4|6|8|cuatro|seis|ocho|four|six|eight)\b/);if(m){out.delete('table6');out.add('table'+(numberWords[m[1]]||m[1]))}if(/\b(?:mesa ratona|coffee table)\b/.test(words))out.add('coffee')}
  if(/\b(?:sin muebles|sin mobiliario|without furniture|vaci[oa])\b/.test(words))out.clear();
  return [...out];
 };
 spec.fixtures=selected(base,[0,main.length]);
 if(base==='bathroom'&&spec.fixtures.includes('bathtub')){
  const requested=main.match(/\b(?:banadera|banera)\s+(?:de\s+)?(\d+(?:[.,]\d+)?)\s*(?:m\b|metros?\b)?/);
  if(requested){const length=num(requested[1]);if(Math.abs(length-1.5)<1e-6){spec.fixtures=spec.fixtures.map(k=>k==='bathtub'?'bathtub150':k);assumptions.push('Bañadera de catálogo regenerada a 1,50 × 0,75 m.');}else if(Math.abs(length-1.7)>1e-6)throw Error('Medida de bañadera aún no disponible en este generador: '+length);}
 }
 if(base==='bathroom'&&!tokens.some(t=>t.k==='window')&&spec.width<1.5){spec.window=Math.min(.6,spec.width-.3);assumptions.push('Ventana inicial ajustada al ancho del baño: '+spec.window+' m.');}
 if(base==='bathroom'&&!tokens.some(t=>t.k==='door')&&(spec.width<1.5||spec.depth<1.9)){spec.door=spec.width<1.2?Math.max(.6,Math.min(.65,spec.width-.3)):.70;assumptions.push('Puerta preliminar de '+spec.door.toFixed(2)+' m: verificar ancho libre y normativa.');}
 if(closet){const next=rooms.find(r=>r.i>closet.i),cs=dimensions(s.slice(closet.end,next?.i??s.length));if(cs&&Math.abs(cs[0]-spec.width)>1e-6)throw Error('Vestidor de paso: el ancho debe coincidir con el dormitorio en esta variante.');spec.closetDepth=cs?.[1]??2.4;spec.fixtures=spec.fixtures.filter(k=>k!=='wardrobe');assumptions.push('Vestidor posterior de paso: '+spec.width+' × '+spec.closetDepth+' m.');}
 if(suite){const bathEnd=rooms.find(r=>r.i>bath.i)?.i??s.length;const bs=dimensions(s.slice(bath.i,bathEnd))||[spec.width,2.4];spec.bathWidth=bs[0];spec.bathDepth=bs[1];spec.bathFixtures=selected('bathroom',[bath.i,bathEnd]);if(!dimensions(s.slice(bath.i,bathEnd)))assumptions.push('Baño: '+bs.join(' × ')+' m (inicial)')}
 return spec;
}
const R=(x,y,w,d)=>({x,y,w,d});
const inside=(r,w,d)=>r.x>=-1e-7&&r.y>=-1e-7&&r.x+r.w<=w+1e-7&&r.y+r.d<=d+1e-7;
const overlap=(a,b,g=0)=>a.x<b.x+b.w+g-1e-7&&b.x<a.x+a.w+g-1e-7&&a.y<b.y+b.d+g-1e-7&&b.y<a.y+a.d+g-1e-7;
/* Layout knowledge derived from our CAD library, assets/cad2d-arq-generators.js.
   Preferences only: all native block envelopes and access zones still go through
   the same collision solver. No scaling of sanitary fixtures. */
function bathroomPattern(w,d,fixtures,seed){
 const has=k=>fixtures.includes(k);
 if(!fixtures.length||fixtures.some(k=>!['toilet','bidet','basin','shower','bathtub','bathtub150','shower75','basin45','toiletCompact'].includes(k)))return null;
 const targets={};
 let id;
 if(has('bathtub')||has('bathtub150')||has('shower')){
  const wet=has('bathtub150')?'bathtub150':has('bathtub')?'bathtub':'shower',wetD=C[wet][2],wetW=C[wet][1];
  id=wet.startsWith('bathtub')?(has('bidet')?'bano-completo':'bano-banera'):(has('bidet')?'bano-ducha-bidet':'bano-minimo');
  targets[wet]={rot:180,x:0,y:d-wetD};
  if(has('toilet'))targets.toilet={rot:270,x:0,y:d-wetD-.12-C.toilet[1]};
  if(has('bidet'))targets.bidet={rot:270,x:0,y:d-wetD-.24-(has('toilet')?C.toilet[1]:0)-C.bidet[1]};
  if(has('basin'))targets.basin={rot:90,x:w-C.basin[2],y:.25};
  if(has('bathtub')&&has('shower')){id='bano-principal';targets.shower={rot:180,x:w-C.shower[1],y:d-C.shower[2]};}
 }else{
  id='bano-toilette';if(has('toilet'))targets.toilet={rot:180,x:(w-C.toilet[1])/2,y:d-C.toilet[2]};
  if(has('bidet'))targets.bidet={rot:270,x:0,y:.25};
  if(has('basin'))targets.basin={rot:90,x:w-C.basin[2],y:.12};
 }
 // Alternate between original and mirror layouts without changing the dimensions.
 if(seed%2)for(const [k,v] of Object.entries(targets)){const fw=v.rot%180?C[k][2]:C[k][1];v.x=w-v.x-fw;if(v.rot===90||v.rot===270)v.rot=(v.rot+180)%360;}
 return {id,targets};
}

function arrange(w,d,fixtures,protectedZones,seed=0,compact=false){
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
    const gap=['toilet','bidet','basin','shower','bathtub','bathtub150','shower75','basin45','toiletCompact'].includes(key)?(compact?.25:.60):.75;
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
 const pattern=bathroomPattern(w,d,fixtures,seed);
 if(pattern){
  const saved=new Map(options);
  for(const [key,opts] of options){const target=pattern.targets[key];if(!target)continue;
   const score=o=> (o.rot===target.rot?0:4)+Math.hypot(o.r.x-target.x,o.r.y-target.y);
   options.set(key,opts.slice().sort((a,b)=>score(a)-score(b)));
  }
  if(dfs(0))return placed;
  placed.length=0;nodes=0;for(const [k,v] of saved)options.set(k,v);
 }
 if(!dfs(0))throw Error('No encuentro una distribución sin interferencias con esas medidas. Aumentá el ambiente o reducí equipamiento.');
 return placed;
}
function solve(spec){
 const {width:w,depth:d,wall:t,door,window:win,count:n}=spec;
 const kind=spec.kind,suite=kind==='suite_row',base=suite?'bedroom':kind;
 if(!DEFAULT[base]||![w,d,t,door,win].every(Number.isFinite)||w<(base==='bathroom'?.9:1.2)||d<1.2||w>20||d>20||t<.08||t>.5||(door!==0&&door<.6)||door>Math.min(1.2,(spec.sideDoor?d:w)-.3+1e-9)||win<0||win>w-.3||!Number.isInteger(n)||n<1||n>30)throw Error('Dimensiones o cantidad fuera del rango del motor.');
 const bd=suite?spec.bathDepth:0;
 if(suite&&(Math.abs(spec.bathWidth-w)>1e-6||!Number.isFinite(bd)||bd<1.5||bd>20))throw Error('Por ahora el baño privado debe tener el mismo ancho que el dormitorio.');
 const amount=spec.alternatives||1;if(!Number.isInteger(amount)||amount<1||amount>20||amount>1&&n>1)throw Error('Hasta 20 alternativas individuales o 30 ambientes contiguos.');
 const items=spec.fixtures||DEFAULT[base][2],bathItems=spec.bathFixtures||DEFAULT.bathroom[2];if(!Array.isArray(items)||!Array.isArray(bathItems)||[...items,...bathItems].some(k=>!C[k])||items.length>12||bathItems.length>12)throw Error('Equipamiento no reconocido.');
 const out={schema:'blackline.architecture.v1',units:'m',walls:[],openings:[],blocks:[],rooms:[],virtualDimensions:[],connections:[],variants:[],brief:spec,assumptions:[...(spec.assumptions||[])]};
 const cd=spec.closetDepth||0;if(cd&&(!Number.isFinite(cd)||cd<1.5||cd>8))throw Error('Vestidor fuera de rango.');const shift=cd?cd+t:0;
 const step=w+t,fullD=d+shift+(suite?bd+t:0),cols=Math.ceil(Math.sqrt(amount)),seen=new Set();
 const side=spec.sideDoor||null;
 if(side&&(!['left','right'].includes(side)||base!=='bathroom'||n!==1||suite||cd||!door))throw Error('Puerta lateral: solo baño individual.');
 const edge=side?d:w,doorX=spec.doorX??(edge-door)/2;if(!Number.isFinite(doorX)||doorX<.03||doorX+door>edge-.03)throw Error('Posición de puerta inválida.');
 const doorZones=door?[side?R(side==='left'?0:w-door,doorX,door,door):R(doorX,0,door,door)]:[],bathDoor=.8;
 for(let seed=0;seed<amount*6;seed++){
  let lay,blay,clay;try{lay=(spec.compactTransverse?[{key:'bathtub150',rot:180,r:R(0,d-.75,1.5,.75)},{key:'toilet',rot:90,r:R(w-.70,d-.75-.10-.40,.70,.40)},{key:'bidet',rot:90,r:R(w-.58,d-.75-.10-.40-.10-.38,.58,.38)}]:null)||(spec.templateLayout?compactBathTemplate(spec)?.layout:null)||arrange(w,d,items,[...doorZones,...((suite||cd)?[R((w-bathDoor)/2,d-bathDoor,bathDoor,bathDoor)]:[])],seed,!!spec.compact);
   if(cd)clay=arrange(w,cd,['wardrobe'],[R((w-bathDoor)/2,0,bathDoor,bathDoor),...(suite?[R((w-bathDoor)/2,cd-bathDoor,bathDoor,bathDoor)]:[])],seed);
   if(suite)blay=arrange(w,bd,bathItems,[R((w-bathDoor)/2,0,bathDoor,bathDoor)],seed)}catch(e){if(amount===1)throw e;continue}
  const signature=JSON.stringify([lay,blay,clay].filter(Boolean).map(l=>l.map(o=>[o.key,o.rot,Math.round(o.r.x/.3),Math.round(o.r.y/.3)])));if(seen.has(signature))continue;seen.add(signature);
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
  for(let i=0;i<=n;i++){const x=t/2+i*step;const A=[x,t/2],B=[x,fullD+1.5*t];wall('side'+i,...(side==='left'&&i===0?[B,A]:[A,B]));}
  for(let i=0;i<n;i++){
   const x=t+i*step,a=x-t/2,b=a+step,front='front'+i,back='back'+i,rear='rear'+i;
   wall(front,[a,t/2],[b,t/2]);wall(back,[a,d+1.5*t],[b,d+1.5*t]);if(side){opening(side==='left'?'side0':'side1','swing-door',t/2+(side==='left'?d-doorX-door/2:doorX+door/2),door);}else opening(front,'swing-door',t/2+doorX+door/2,door);
   room('room'+i,base,x,t,d,front,back,i);blocks(lay,x,t,base);
   if(suite||cd){
    const offset=step/2-door/2-win/2-.2;
    if(win&&offset-win/2<=t/2)throw Error('No hay espacio en fachada para la puerta y ventana solicitadas.');
    opening(front,'framed-window',offset,win);opening(back,'swing-door',step/2,bathDoor);
    let prev=back,from='room'+i;
    if(cd){const closetBack='closetback'+i;wall(closetBack,[a,d+shift+1.5*t],[b,d+shift+1.5*t]);room('closet'+i,'closet',x,d+2*t,cd,back,closetBack,i);blocks(clay,x,d+2*t,'closet');out.connections.push({from:p+from,to:p+'closet'+i,via:p+back,private:true});prev=closetBack;from='closet'+i;if(suite)opening(prev,'swing-door',step/2,bathDoor);}
    if(suite){wall(rear,[a,fullD+1.5*t],[b,fullD+1.5*t]);opening(rear,'framed-window',step/2,Math.min(.8,w-.3));room('bath'+i,'bathroom',x,d+shift+2*t,bd,prev,rear,i);blocks(blay,x,d+shift+2*t,'bathroom');out.connections.push({from:p+from,to:p+'bath'+i,via:p+prev,private:true});}
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

/* Architectural spelling aliases: never touch numbers or units. */
const spelling={habtiacion:'habitacion',havitacion:'habitacion',abitacion:'habitacion',habitaicon:'habitacion',habitacoines:'habitaciones',dormiotrio:'dormitorio',dormtorio:'dormitorio',bnao:'bano',bnaos:'banos',baadera:'banadera',banadra:'banadera',inodro:'inodoro',bidte:'bidet',videt:'bidet',dcuha:'ducha',lavatirio:'lavatorio',cosina:'cocina',cocnia:'cocina',heladrea:'heladera',pueta:'puerta',pureta:'puerta',bentana:'ventana',ventnaa:'ventana',placrad:'placard',bestidor:'vestidor',vestidro:'vestidor',escalra:'escalera',escalear:'escalera',pasamnos:'pasamanos',discapasitados:'discapacitados',acesible:'accesible',acesibles:'accesibles',tandme:'tandem',tadem:'tandem',altua:'altura',ahnco:'ancho',lagro:'largo',escrtorio:'escritorio'};
function correctText(raw){const corrections=[];if(typeof raw!=='string'||raw.length>4000)return {text:raw,corrections};const text=normalize(raw).replace(/\b[a-z]+\b/g,w=>{if(!Object.hasOwn(spelling,w))return w;corrections.push(w+' → '+spelling[w]);return spelling[w]});return {text,corrections}}
/* Layout derived from the library's bano-completo: bath against rear wall,
   WC and bidet against a side. Rotate to exploit a wide, shallow room.
   Retain independent catalogue blocks, and validate envelope/door collisions. */
function compactBathTemplate(spec){
 const {width:w,depth:d,door}=spec;
 if(spec.kind!=='bathroom'||!spec.fixtures.includes('bathtub')||!spec.fixtures.includes('toilet')||!spec.fixtures.includes('bidet')||w<2.05||d<1.4||spec.alternatives>1)return null;
 const required=['bathtub','toilet','bidet'];
 if(spec.fixtures.some(k=>!required.includes(k)&&k!=='basin'))return null;
 const doorX=.08;
 if(doorX+door>w-.03)return null;
 const layout=[{key:'bathtub',rot:180,r:R(w-1.70,d-.75,1.70,.75)},{key:'toilet',rot:0,r:R(w-.90,0,.40,.70)},{key:'bidet',rot:0,r:R(w-.42,0,.38,.58)}];
 // A quarter-circle swing is more precise than its bounding rectangle.
 const hitsSwing=r=>{if(!door)return false;const x=Math.max(0,r.x-doorX),y=Math.max(0,r.y);return r.x+r.w>doorX&&x*x+y*y<(door+.03)**2};
 if(layout.some(o=>!inside(o.r,w,d)||hitsSwing(o.r)))return null;
 for(let i=0;i<layout.length;i++)for(let j=i+1;j<layout.length;j++)if(overlap(layout[i].r,layout[j].r,.01))return null;
 return {layout,doorX};
}

/* Multiple-room preliminary plans. Native centerlines, one wall per boundary. */
function compoundInstruction(text){
 const s=normalize(text).replace(/\bentreda\b/g,'entrada');
 const isHouse=/\b(?:casa|vivienda|house)\b/.test(s);
 // Explicit size groups, including elliptical references ("una más").
 if(!isHouse&&/\b(?:habitacion(?:es)?|dormitorios?)\b/.test(s)&&!/\b(?:banos?|cocinas?|vestidores?|living|comedor|oficina|corte|seccion|escalera|pasamanos|sin|con|mueve|modifica|achica|agranda|desplaza|elimina|borra|cambia|versiones|variantes|alternativas)\b/.test(s)){
  const clauses=s.split(/\s+(?:y\s+)+|\s*\+\s*|;\s*/).filter(x=>x.trim());
  const groups=[];
  for(let i=0;i<clauses.length;i++){
   const part=clauses[i],size=dimensions(part);
   const q=part.match(/\b(\d+|un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|veinte)\s+(?:(?:habitacion(?:es)?|dormitorios?)\b|mas\b|de\b)/);
   if(!size||!q||(!i&&!/\b(?:habitacion(?:es)?|dormitorios?)\b/.test(part)))break;
   const count=Number(numberWords[q[1]]||q[1]);
   if(!Number.isInteger(count)||count<1||count>30||!size.every(x=>x>=1.2&&x<=15))throw Error('Cantidad o dimensiones fuera de rango.');
   groups.push({count,size});
  }
  if(groups.length>1&&groups.length===clauses.length){
   if(groups.reduce((n,g)=>n+g.count,0)>30)throw Error('Hasta treinta habitaciones por conjunto.');
   return {kind:'compound_bedrooms',variants:1,groups};
  }
 }
 const hasBedroom=/\b(?:habitaciones?|dormitorios?)\b/.test(s),hasBath=/\bbanos?\b/.test(s),hasKitchen=/\bcocinas?\b/.test(s);
 if(!isHouse&&!(hasBath&&hasKitchen&&!hasBedroom))return null;
 if(/\b(?:mueve|modifica|achica|agranda|desplaza|elimina|borra|cambia)\w*\b/.test(s))return null;
 const v=s.match(/\b(\d+|dos|tres|cuatro|cinco)\s+(?:versiones|variantes|alternativas)\b/);
 const variants=v?Number(numberWords[v[1]]||v[1]):/\b(?:versiones|variantes|alternativas)\b/.test(s)?3:1;
 if(variants<1||variants>5)throw Error('Hasta cinco variantes de conjunto por pedido.');
 const matches=[...s.matchAll(/\b(?:habitaciones?|dormitorios?|banos?|cocinas?|living|salon|entrada)\b/g)];
 const sizeOf=(rx,def)=>{const i=matches.findIndex(m=>rx.test(m[0]));if(i<0)return def;const part=s.slice(matches[i].index+matches[i][0].length,matches[i+1]?.index??s.length);return dimensions(part)||def};
 const check=(a,min=1.2)=>{if(!a.every(x=>Number.isFinite(x)&&x>=min&&x<=15))throw Error('Medida de ambiente fuera del rango.');return a};
 const bathSize=check(sizeOf(/^bano/,[2.2,2.6])),kitchenSize=check(sizeOf(/^cocina/,[4,4]));
 if(!isHouse)return {kind:'compound_pair',variants,bathSize,kitchenSize};
 if(!hasBedroom||!hasBath||!hasKitchen||!/\b(?:living|salon)\b/.test(s))throw Error('Vivienda preliminar: indicá dormitorios, baño, living y cocina.');
 if(/\b(?:dos plantas|planta alta|garage|garaje|cochera|pileta|patio|jardin|vestidor|en suite|privad[oa]s?)\b/.test(s))throw Error('La vivienda solicitada requiere ambientes adicionales aún no soportados.');
 if(/\b(?:casa|vivienda)\s+de\s+\d/.test(s)&&dimensions(s.slice(s.search(/\b(?:casa|vivienda)\b/),matches[0]?.index??s.length)))throw Error('El ajuste a un perímetro total de vivienda aún no está implementado.');
 const q=s.match(/\b(\d+|un|una|dos|tres|cuatro|cinco|seis)\s+(?:habitaciones?|dormitorios?)\b/);
 const bedrooms=q?Number(numberWords[q[1]]||q[1]):2;
 if(bedrooms<1||bedrooms>6)throw Error('Hasta seis dormitorios en este prototipo.');
 const bedroomSize=check(sizeOf(/^(?:habitacion|dormitorio)/,[4,3.5]));
 const livingSize=check(sizeOf(/^(?:living|salon)/,[5,4.5]));
 const service=/\bbano\s+(?:de\s+)?servicio\b/.test(s);
 const serviceMatch=s.match(/\bbano\s+(?:de\s+)?servicio\b([^+]*)/);
 const serviceSize=check(serviceMatch&&dimensions(serviceMatch[1])||[1.5,2]);
 return {kind:'compound_house',variants,bedrooms,bedroomSize,bathSize,kitchenSize,livingSize,service,serviceSize,assumedBedrooms:!q};
}
function compoundPlan(spec){
 const t=.15,door=.8,passage=1.2;
 const out={schema:'blackline.architecture.v1',units:'m',walls:[],openings:[],blocks:[],rooms:[],virtualDimensions:[],connections:[],variants:[],brief:spec,assumptions:[],status:'approximate'};
 const notes=new Set(['Anteproyecto editable; no verifica estructura, terreno, ventilación ni normativa.']);
 if(spec.kind==='compound_house'){
  if(spec.assumedBedrooms)notes.add('Cantidad no indicada: se proponen dos dormitorios.');
  notes.add('Circulación común de 1,20 m; medidas de ambientes no indicadas adoptadas como propuesta.');
 }else if(spec.kind==='compound_bedrooms')notes.add('Habitaciones contiguas en fila, acceso independiente desde el exterior; muro de 0,15 m y aberturas iniciales.');else notes.add('Baño y cocina como ambientes independientes; medidas no indicadas adoptadas como propuesta.');
 let dx=0;
 for(let v=0;v<spec.variants;v++){
  const prefix='v'+v+'-',rects=[],requests=[],raw=[],roomSpecs=[];
  const makeRoom=(id,kind,x,y,w,d,side,fixtures)=>{
   const X=x+w+t,Y=y+d+t;
   const room={id:prefix+id,kind,clearBounds:[dx+x+t/2,y+t/2,w,d]};
   out.rooms.push(room);
   out.virtualDimensions.push({room:room.id,axis:'width',value:w,editable:false},{room:room.id,axis:'depth',value:d,editable:false});
   rects.push({x,y,X,Y});roomSpecs.push({room,x,y,X,Y,w,d,side,fixtures});
   return room;
  };
  const fixture=(id,kind,size,items=DEFAULT[kind][2])=>({id,kind,size,items});
  let total=0;
  if(spec.kind==='compound_bedrooms'){
   let index=0;for(const group of spec.groups)for(let n=0;n<group.count;n++){makeRoom('bed'+index++,'bedroom',total,0,...group.size,'S',DEFAULT.bedroom[2]);total+=group.size[0]+t;}
  }else if(spec.kind==='compound_pair'){
   const items=[fixture('bath','bathroom',spec.bathSize),fixture('kitchen','kitchen',spec.kitchenSize)];if(v%2)items.reverse();
   for(const item of items){makeRoom(item.id,item.kind,total,0,...item.size,'S',item.items);total+=item.size[0]+t+1.5;}
  }else{
   const bedrooms=Array.from({length:spec.bedrooms},(_,i)=>fixture('bed'+i,'bedroom',spec.bedroomSize));
   const bath=fixture('sharedbath','bathroom',spec.bathSize);
   const north=[...bedrooms];north.splice(v%3===0?north.length:v%3===1?0:Math.floor(north.length/2),0,bath);
   const south=[fixture('living','living',spec.livingSize),fixture('kitchen','kitchen',spec.kitchenSize)];
   if(spec.service)south.push(fixture('service','bathroom',spec.serviceSize,['toilet','basin']));
   if(v%2)south.reverse();
   const cy=passage+t;
   for(const [list,side] of [[north,'S'],[south,'N']]){
    let x=0;
    for(const item of list){const [w,d]=item.size;const room=makeRoom(item.id,item.kind,x,side==='S'?cy:-d-t,w,d,side,item.items);out.connections.push({from:prefix+'hall',to:room.id,private:false});x+=w+t;}
    total=Math.max(total,x);
   }
   rects.push({x:0,y:0,X:total,Y:cy});
   out.rooms.push({id:prefix+'hall',kind:'circulation',clearBounds:[dx+t/2,t/2,total-t,passage]});
   requests.push({kind:'swing-door',a:[0,cy],b:[0,0],center:[0,cy/2],width:.9,entry:true});
  }
  for(const {room,x,y,X,Y,w,d,side,fixtures} of roomSpecs){
   const reverse=side==='N',zone=R((w-door)/2,0,door,door);
   let layout=null;for(const items of [fixtures,fixtures.filter(k=>k!=='bidet'),fixtures.slice(0,1),[]]){
    try{layout=arrange(w,d,items,[zone],v);if(items.length!==fixtures.length)notes.add(room.kind+': equipamiento reducido; revisar '+fixtures.filter(k=>!items.includes(k)).join(', '));break}catch(e){}
   }
   if(!layout)throw Error('No se pudo preparar el ambiente.');
   const pt=(a,b)=>reverse?[dx+X-t/2-a,Y-t/2-b]:[dx+x+t/2+a,y+t/2+b];
   for(const o of layout){const [id,bw,bd]=C[o.key],r=o.r,[ox,oy]=({0:[0,0],90:[r.w,0],180:[r.w,r.d],270:[0,r.d]})[o.rot];
    const p=pt(r.x+ox,r.y+oy),env=reverse?pt(r.x+r.w,r.y+r.d):pt(r.x,r.y);
    out.blocks.push({catalogId:id,role:o.key,point:p,rotation:(o.rot+(reverse?180:0))%360,scale:1,layer:room.kind==='bathroom'?'FIXTURES':room.kind==='kitchen'?'KITCHEN':'FURNITURE',envelope:[...env,r.w,r.d],nominalSize:[bw,bd]});
   }
   const cy=reverse?Y:y,wy=reverse?y:Y;
   requests.push({kind:'swing-door',a:reverse?[X,cy]:[x,cy],b:reverse?[x,cy]:[X,cy],center:[(x+X)/2,cy],width:door});
   requests.push({kind:'framed-window',a:[x,wy],b:[X,wy],center:[(x+X)/2,wy],width:Math.min(room.kind==='bathroom'?.8:1.5,w-.35)});
  }
  for(const {x,y,X,Y} of rects)raw.push([[x,y],[X,y]],[[x,Y],[X,Y]],[[x,y],[x,Y]],[[X,y],[X,Y]]);
  // Split shared boundaries at every vertex; do not duplicate a wall.
  const round=x=>Math.round(x*1e7)/1e7,key=(x,y)=>round(x)+','+round(y),vertices=raw.flat(),segments=new Map();
  for(const [a,b] of raw){
   const horizontal=a[1]===b[1],i=horizontal?0:1,j=1-i;
   const cuts=[...new Set([a[i],b[i],...vertices.filter(p=>Math.abs(p[j]-a[j])<1e-7&&p[i]>a[i]+1e-7&&p[i]<b[i]-1e-7).map(p=>p[i])].map(round))].sort((a,b)=>a-b);
   for(let k=1;k<cuts.length;k++){const p=horizontal?[cuts[k-1],round(a[1])]:[round(a[0]),cuts[k-1]],q=horizontal?[cuts[k],round(a[1])]:[round(a[0]),cuts[k]];segments.set(key(...p)+'|'+key(...q),{a:p,b:q,requests:[]});}
  }
  for(const req of requests){
   const horizontal=req.a[1]===req.b[1],i=horizontal?0:1,j=1-i;
   const host=[...segments.values()].find(e=>Math.abs(e.a[j]-req.center[j])<1e-7&&Math.abs(e.b[j]-req.center[j])<1e-7&&req.center[i]-req.width/2>e.a[i]+t/2&&req.center[i]+req.width/2<e.b[i]-t/2);
   if(!host)throw Error('No hay tramo suficiente para una abertura del conjunto.');
   if(host.requests.length)throw Error('Aberturas superpuestas en el conjunto.');
   host.requests.push(req);
  }
  let idx=0;
  for(const seg of segments.values()){
   let {a,b}=seg;const req=seg.requests[0];
   if(req&&(req.b[0]-req.a[0])*(b[0]-a[0])+(req.b[1]-req.a[1])*(b[1]-a[1])<0)[a,b]=[b,a];
   const id=prefix+'wall'+idx++;
   out.walls.push({id,a:[a[0]+dx,a[1]],b:[b[0]+dx,b[1]],thickness:t,layer:'WALLS',join:'native'});
   if(req){const L=Math.hypot(b[0]-a[0],b[1]-a[1]);out.openings.push({host:id,kind:req.kind,width:req.width,offset:((req.center[0]-a[0])*(b[0]-a[0])+(req.center[1]-a[1])*(b[1]-a[1]))/L,layer:'OPENINGS'});}
  }
  out.variants.push({id:'v'+v,number:v+1});
  dx+=total+2;
 }
 out.warning='APROXIMACIÓN: '+[...notes].join(' ');
 out.assumptions=[...notes];return out;
}

/* Offline multilingual architectural vocabulary, not unrestricted translation. */
function internationalText(raw){
 if(typeof raw!=='string'||raw.length>4000)return raw;
 let s=normalize(raw.normalize('NFKC')).replace(/[٠-٩۰-۹]/g,x=>String('٠١٢٣٤٥٦٧٨٩'.includes(x)?'٠١٢٣٤٥٦٧٨٩'.indexOf(x):'۰۱۲۳۴۵۶۷۸۹'.indexOf(x))).replace(/٫/g,'.');
 const groups=[
 ['una mas de','one more of|one more|one additional|une autre de|une de|un altra di|una di|mais um de|mais uma de|ein weiteres mit|ein weiteres|eine weitere'],
 ['bano de servicio','service bathroom|bagno di servizio|banheiro de servico|gaste wc'],
 ['bano compartido','shared bathroom|salle de bains commune|bagno condiviso|banheiro compartilhado|gemeinschaftsbad'],
 ['habitaciones','bedrooms|chambres|camere|quartos|schlafzimmer'],
 ['habitacion','bedroom|chambre|camera|quarto'],
 ['bano','bathrooms?|salles? de bains|bagno|bagni|banheiros?|badezimmer'],
 ['cocina','kitchens?|cuisines?|cucina|cucine|cozinhas?|kuchen?'],
 ['living','living rooms?|sala de estar|soggiorno|wohnzimmer'],
 ['vestidor','walk-in closet|walk in closet|dressing room|cabina armadio|ankleidezimmer'],
 ['casa','house|maison|haus'],['entrada','entrance|entry|entree|ingresso|eingang'],
 ['lavadero','laundry room|buanderie|lavanderia|waschkuche'],['oficina','office|ufficio|buro'],
 ['ducha','shower|douche|doccia|chuveiro|dusche'],['banadera','bathtub|baignoire|vasca da bagno|banheira|badewanne'],
 ['inodoro','toilets?|wc|vaso sanitario'],['lavatorio','washbasin|wash basin|lavabo|waschbecken'],
 ['bidet','bide'],['puerta','doors?|portes?|portas?|tur|turen'],['ventana','windows?|fenetres?|finestr[ae]|janelas?|fenster'],
 ['cama doble','double bed|lit double|letto matrimoniale|cama de casal|doppelbett'],
 ['placard','wardrobe|armoire|guarda roupa|kleiderschrank'],
 ['tandem','in a row|side by side|cote a cote|affiancate|lado a lado|nebeneinander'],
 ['variantes','variants|versions|alternatives|varianti|alternativen'],
 ['sin','without|sans|senza|sem|ohne'],['con','with|avec|com|mit'],
 ['tres','three|trois|tre|drei'],['dos','two|deux|due|dois|duas|zwei'],
 ['cuatro','four|quatre|quattro|quatro|vier'],['cinco','five|cinq|cinque|funf'],['seis','six|sechs'],
 ['una','one|une|eine'],['y','and|et|und'],['de','of|di'],
 ['accesible','accessible|barrierefrei|accessibile|acessivel'],
 ['ultima','last|derniere|letzte'],['primera','first|premiere|erste']
 ];
 for(const [to,from] of groups)s=s.replace(new RegExp('\\b(?:'+from+')\\b','g'),to);
 s=s.replace(/\be\b(?=\s+(?:una|un|um|dos|tres|\d|bano|cocina|vestidor|ducha|bidet|lavatorio))/g,'y').replace(/\b(habitacion(?:es)?|bano|cocina)\s+con\s+(?=\d)/g,'$1 de ');
 const scripts=[
 ['habitacion','寝室|卧室|臥室|спальня|غرفة نوم|침실|शयनकक्ष'],
 ['bano','浴室|卫生间|衛生間|ванная комната|ванная|حمام|욕실|स्नानघर'],
 ['cocina','キッチン|台所|厨房|廚房|кухня|مطبخ|주방|रसोई'],
 ['living','リビング|客厅|客廳|гостиная|غرفة معيشة|거실|बैठक'],
 ['vestidor','ウォークインクローゼット|衣帽间|衣帽間|гардеробная|غرفة ملابس|드레스룸'],
 ['banadera','浴槽|浴缸|ванна|حوض استحمام|욕조'],['ducha','シャワー|淋浴|душ|دش|샤워'],
 ['inodoro','便器|马桶|馬桶|унитаз|مرحاض|변기'],['bidet','ビデ|坐浴盆|биде|بيديه|비데'],
 ['lavatorio','洗面台|洗手盆|раковина|مغسلة|세면대'],['puerta','ドア|门|門|дверь|باب|문'],
 ['ventana','窓|窗户|窗戶|окно|نافذة|창문'],
 ['sin','なし|没有|沒有|без|بدون|없이'],['con','付き|带有|帶有|مع|포함'],
 ['y','および|以及|和| и | و |및'],
 ['cm','センチ|厘米|см|سم'],['m','メートル|米|метров|метра|متر|미터']
 ];
 for(const [to,from] of scripts)s=s.replace(new RegExp(normalize(from),'gu'),' '+to+' ');
 return s.replace(/\s+/g,' ').trim();
}

function run(raw){
 const {text,corrections}=correctText(internationalText(raw));
 if(/\b(?:ultima|ultimo|primera|primero|anterior|existente|seleccionad[oa])\s+(?:habitacion(?:es)?|dormitorio|bano|cocina|puerta|ventana|muro)\b/.test(text))throw Error('Edición de un ambiente existente: todavía no hay contexto de selección en ARQASSIST. No se insertará otro ambiente por error.');
 const compound=compoundInstruction(text);if(compound){const p=compoundPlan(compound);if(corrections.length)p.assumptions.push('Correcciones: '+corrections.join(', '));return p;}
 const d=detailInstruction(text);if(d){const p=solveDetail(d);if(corrections.length)p.assumptions.push('Correcciones: '+corrections.join(', '));return p;}
 let spec,notes=[];
 try{spec=interpret(text)}catch(error){
  let clean=text;
  if(/Accesibilidad:/.test(error.message)&&/\bbanos?\b/.test(text)){
   clean=clean.replace(/\b(?:para\s+|con\s+)?(?:accesibles?|adaptad[oa]s?|sillas? de ruedas|wheelchair|discapacitados?)\b/g,'');
   spec=interpret(clean);if(spec.kind!=='bathroom')throw error;
   if(!dimensions(text)&&!/\b(?:ancho|largo|profundidad|m2|metros cuadrados)\b|m²/.test(text)){spec.width=2.6;spec.depth=2.6;spec.assumptions=spec.assumptions.filter(a=>!a.startsWith('Dimensiones iniciales'));spec.assumptions.push('Medidas iniciales propuestas: 2,60 × 2,60 m');}
   if(!/\bpuerta\b/.test(text))spec.door=.9;
   notes.push('Baño preliminar: accesibilidad NO verificada; faltan giro, transferencia y barras.');
  }else if(/\b(?:vestidor|walk-in closet)\b/.test(text)&&/\b(?:habitacion|dormitorio|pieza)\b/.test(text)&&/La geometría solicitada/.test(error.message)){
   spec=interpret(clean.replace(/\b(?:con\s+)?(?:vestidor|walk-in closet)\b/g,''));notes.push('Vestidor independiente no generado.');
  }else throw error;
 }
 if(corrections.length)spec.assumptions.push('Correcciones de tipeo: '+corrections.join(', '));
 const mark=p=>{if(notes.length){p.status='approximate';p.warning='APROXIMACIÓN: '+notes.join(' ');p.assumptions.push(p.warning)}return p};
 try{return mark(solve(spec))}catch(error){
 if(!error.message.includes('sin interferencias'))throw error;
 const s=normalize(text),explicit=new Set();
 for(const m of s.matchAll(/[a-z]+/g)){const k=concept(m[0]);if(C[k])explicit.add(k)}
 const requested=spec.fixtures.filter(k=>explicit.has(k)||(k==='bathtub150'&&explicit.has('bathtub')));
 const essential=requested.length?requested:spec.fixtures;
 const attempts=[spec.fixtures,essential];
 if(spec.kind==='bathroom'&&spec.fixtures.includes('bathtub150')&&spec.width>=1.5&&spec.depth>=2.1&&spec.door<=.8&&spec.fixtures.includes('toilet')&&spec.fixtures.includes('bidet')&&!explicit.has('basin')&&!spec.fixtures.includes('shower')){
  // Compact transverse bathtub and two fixtures along the same wall.
  const w=spec.width,d=spec.depth,doorX=.04;
  const layout=[{key:'bathtub150',rot:180,r:R(0,d-.75,1.5,.75)},{key:'toilet',rot:90,r:R(w-.70,d-.75-.10-.40,.70,.40)},{key:'bidet',rot:90,r:R(w-.58,d-.75-.10-.40-.10-.38,.58,.38)}];
  const swing=R(doorX,0,spec.door,spec.door);
  if(layout.every(o=>inside(o.r,w,d)&&!overlap(o.r,swing,.005))&&layout.every((o,i)=>layout.slice(i+1).every(q=>!overlap(o.r,q.r,.005)))){
   try{const p=solve({...spec,fixtures:['bathtub150','toilet','bidet'],doorX,compactTransverse:true});notes.push('Configuración compacta: bañadera transversal y sanitarios alineados; lavatorio automático omitido. Revisar holguras y acceso.');return mark(p)}catch(e){}
  }
 }
 const tpl=compactBathTemplate(spec);
 if(tpl){try{const p=solve({...spec,fixtures:['bathtub','toilet','bidet'],doorX:tpl.doorX,templateLayout:tpl.layout});notes.push('Modelo compacto basado en baño completo de biblioteca; lavatorio no colocado. Holguras y circulación no verificadas.');return mark(p)}catch(e){}}
 // Search subsets by maximum retained explicit equipment, then total equipment.
 // Compact catalogue alternatives are regenerated at real dimensions, not scaled.
 const all=spec.fixtures,labels={toilet:'inodoro',bidet:'bidet',basin:'lavatorio',bathtub:'bañadera',bathtub150:'bañadera de 1,50 m',shower:'ducha'};
 const subsets=[];
 if(all.length<=10){for(let mask=0;mask<(1<<all.length);mask++)subsets.push(all.filter((_,i)=>mask&(1<<i)));}
 else subsets.push(all,essential,...essential.map((_,i)=>essential.slice(0,essential.length-i-1)));
 subsets.sort((a,b)=>essential.filter(k=>b.includes(k)).length-essential.filter(k=>a.includes(k)).length||b.length-a.length);
 const doors=[(spec.width-spec.door)/2,.08,spec.width-spec.door-.08].map(doorX=>({doorX}));
 if(spec.kind==='bathroom'&&spec.count===1&&spec.door&&!spec.closetDepth)for(const sideDoor of ['right','left'])for(const doorX of [.08,(spec.depth-spec.door)/2,spec.depth-spec.door-.08])doors.push({sideDoor,doorX});
 const smaller={shower:'shower75',basin:'basin45',toilet:'toiletCompact'};
 const names={shower75:'ducha 0,75 × 0,75',basin45:'lavatorio 0,45 × 0,40',toiletCompact:'inodoro suspendido compacto'};
 let tries=0;
 for(const retained of subsets){
  const options=[retained];
  if(spec.kind==='bathroom'&&!/\b(?:ducha|lavatorio|inodoro)\s+(?:de\s+)?\d/.test(text)){
   const compact=retained.map(k=>smaller[k]||k);
   if(compact.some((k,i)=>k!==retained[i]))options.push(compact);
  }
  for(const fixtures of options)for(const position of doors){
   if(++tries>240)break;
   try{
    const omitted=all.filter(k=>!retained.includes(k)),missing=essential.filter(k=>!retained.includes(k));
    const substitutions=fixtures.filter(k=>names[k]).map(k=>names[k]);
    const warning='APROXIMACIÓN: distribución preliminar con holguras reducidas. Revisar circulación y normativa antes de construir.'+(missing.length?' No se pudieron colocar: '+missing.map(k=>labels[k]||k).join(', ')+'.':'')+(omitted.filter(k=>!missing.includes(k)).length?' Equipamiento automático omitido: '+omitted.filter(k=>!missing.includes(k)).map(k=>labels[k]||k).join(', ')+'.':'')+(substitutions.length?' Artefactos compactos: '+substitutions.join(', ')+'.':'')+(position.sideDoor?' Acceso lateral para liberar el frente.':'');
    const p=solve({...spec,fixtures,...position,compact:true,assumptions:[...spec.assumptions,warning]});
    if(!p.blocks.length&&retained.length)continue;
    p.status='approximate';p.warning=[...notes,warning].join(' ');return p;
   }catch(e){}
  }
  if(tries>240)break;
 }

 throw error;
 }
}
const api=Object.freeze({interpret,solve,detailInstruction,solveDetail,run,correctText,internationalText,bathroomPattern,catalog:C});
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BlacklineArchitectureAI=api;
})(typeof self!=='undefined'?self:globalThis);
