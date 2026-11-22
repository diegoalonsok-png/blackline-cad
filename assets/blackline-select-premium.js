/* Blackline Select 2026 · original independent 2D premium gallery.
 * Additive, not based on third-party geometry or metadata.
 * Numerically labeled symbols have no third-party attribution or source drawing names.
 * Insertion requires an authenticated PRO/STUDIO subscription verified by CAD2D billing.
 * Static SVG previews are drawn from the same vector generators that make the blocks.
 */
(function(){
'use strict';
const LIB=window.CAD2D_ARQ_LIBRARY;
if(!LIB?.library||!LIB?.Builder)return;
const TEMPLATES=[["sofa",1.8,0.9,0.26,0.025,3],["chaise",2.4,1.5,0.18,0.07,3],["chair",0.72,0.78,0.09,0.045,1],["table-oval",1.55,0.8,0.22,0.04,6],["table-rect",1.45,0.8,0.24,0.05,6],["table-round",0.75,0.75,0.115,0.115,4],["bed",1,2,0.19,0.04,2],["desk",1.18,0.6,0.17,0.043,1],["desk-double",2.15,1.1,0.18,0.065,2],["meeting",2.1,1.08,0.32,0.055,8],["island",1.65,0.85,0.27,0.055,2],["counter",1.7,0.62,0.24,0.007,3],["vanity",0.7,0.44,0.17,0.02,2],["tub",1.5,0.72,0.083,0.018,1],["shower",0.8,0.8,0.11,0.043,1],["bench",1.15,0.45,0.2,0.02,5],["lounger",1.72,0.64,0.1,0.038,1],["pergola",2.5,2.5,0.35,0.22,6],["planter",0.75,0.75,0.14,0.14,1],["vehicle",1.66,3.75,0.073,0.18,1]];
const cats='Blackline Select';
let ordinal=1;
const items=[];
for(const [kind,w0,d0,ws,ds,n] of TEMPLATES)for(let variant=0;variant<8;variant++){
 const w=Number((w0+ws*variant).toFixed(3));
 const d=Number((d0+ds*variant).toFixed(3));
 const label=String(ordinal).padStart(3,'0');
 items.push({id:'bl-select-'+label,name:'BL Select '+label,cat:cats,
  family:'bl-select-'+kind,kind,variant,n,w,d,
  wMin:w*.85,wMax:w*1.20,dMin:d*.85,dMax:d*1.20,
  pro:true,paidOnly:true,author:'Blackline CAD',
  gen(b,W,D){geometry(b,kind,W,D,n);if(kind==='desk'||kind==='desk-double')b.line(W*.44,D*.15,W*.44,D*.65,{dashed:true})}
 });
 ordinal++;
}

function geometry(b,kind,W,D,n){
 const cx=W/2,cy=D/2,small=Math.min(W,D),m=.025;
 if(kind==='sofa'||kind==='chaise'){
  const base=kind==='chaise'?D*.56:D;
  b.rrect(m,m,W-2*m,base-2*m,.10);
  b.rrect(.12,.16,W-.24,base-.30,.07);
  for(let i=1;i<n;i++){const x=.12+(W-.24)*i/n;b.line(x,.18,x,base-.17)}
  b.rrect(.03,.06,.13,base-.12,.05);b.rrect(W-.16,.06,.13,base-.12,.05);
  b.rect(.10,.03,W-.20,.11);
  if(kind==='chaise'){b.rrect(.12,.12,W*.33,D-.15,.10);b.rrect(.21,base-.06,W*.25,D-base-.11,.08)}
 }else if(kind==='chair'){
  b.rrect(.02,.02,W-.04,D-.04,Math.min(.15,small*.22));
  b.rrect(W*.16,D*.15,W*.68,D*.64,.07);
  b.rrect(W*.07,D*.08,W*.12,D*.76,.04);b.rrect(W*.81,D*.08,W*.12,D*.76,.04);
  b.line(W*.15,D*.84,W*.85,D*.84);
 }else if(kind==='table-round'||kind==='table-oval'||kind==='table-rect'||kind==='meeting'){
  if(kind==='table-round')b.circle(cx,cy,Math.min(W,D)*.48);
  else if(kind==='table-oval'||kind==='meeting')b.ellipse(cx,cy,W*.48,D*.46);
  else b.rrect(.04,.04,W-.08,D-.08,.09);
  if(kind==='meeting')for(let i=1;i<Math.min(5,n/2);i++)b.line(W*i/Math.min(5,n/2),D*.10,W*i/Math.min(5,n/2),D*.90,{dashed:true});
  b.line(W*.18,cy,W*.82,cy);
 }else if(kind==='bed'){
  b.rrect(.02,.02,W-.04,D-.04,.07);
  b.rrect(.08,.09,W-.16,D-.18,.05);
  const pillows=Math.max(1,n),pw=(W-.20)/pillows;
  for(let i=0;i<pillows;i++)b.rrect(.10+i*pw,.15,pw-.03,D*.20,.04);
  b.line(.10,D*.42,W-.10,D*.42);
  b.line(.10,D*.86,W-.10,D*.86);
  b.rect(0,0,W,.065);
 }else if(kind==='desk'||kind==='desk-double'){
  b.rrect(.02,.03,W-.04,D-.06,.045);
  b.rect(.10,.10,W*.28,Math.min(.18,D*.25));
  b.rect(W*.57,D*.20,W*.25,D*.40);b.line(W*.20,D*.60,W*.78,D*.60);
  if(kind==='desk-double'){b.line(cx,.05,cx,D-.05);b.rect(W*.63,D*.65,W*.22,D*.14)}
  b.circle(W*.44,D*.42,Math.min(.06,D*.09));
 }else if(kind==='island'||kind==='counter'){
  b.rrect(.01,.01,W-.02,D-.02,.045);
  b.rect(.09,.10,W*.32,Math.max(.20,D-.20));
  b.rrect(.14,.14,W*.22,Math.max(.16,D-.28),.045);
  if(n>=2){
   for(const [x,y] of [[.68,.35],[.80,.35],[.68,.66],[.80,.66]])b.circle(W*x,D*y,Math.min(.09,D*.11));
  }else{
   b.circle(W*.70,D*.35,.065);b.circle(W*.81,D*.62,.065);
  }
  if(kind==='counter')for(let i=1;i<n;i++)b.line(W*i/n,.05,W*i/n,D-.05,{dashed:true});
 }else if(kind==='vanity'){
  b.rrect(.01,.01,W-.02,D-.02,.045);
  for(let i=0;i<n;i++){const x=W*(i+.5)/n;b.ellipse(x,D*.54,Math.min(.22,W/(n*2.5)),D*.30);b.circle(x,D*.08,.020)}
 }else if(kind==='tub'){
  b.rrect(0,0,W,D,Math.min(.40,D*.46));
  b.rrect(.10,.08,W-.20,D-.16,Math.min(.34,D*.42));
  b.circle(W*.80,cy,.034);b.circle(W*.91,cy,.025);
 }else if(kind==='shower'){
  b.rect(.01,.01,W-.02,D-.02);b.rect(.055,.055,W-.11,D-.11);
  b.line(.06,.06,W-.06,D-.06,{dashed:true});b.line(.06,D-.06,W-.06,.06,{dashed:true});
  b.circle(cx,cy,.04);b.line(0,D-.025,W,D-.025,{width:.15});
 }else if(kind==='bench'){
  b.rrect(.02,.02,W-.04,D-.04,.04);
  for(let i=1;i<n;i++)b.line(W*i/n,.08,W*i/n,D-.08);
  b.rect(.03,.04,.09,D-.08);b.rect(W-.12,.04,.09,D-.08);
 }else if(kind==='lounger'){
  b.rrect(.02,.02,W-.04,D-.04,.08);
  b.line(W*.48,.04,W*.48,D-.04);b.line(W*.54,.06,W*.84,D-.06);
  b.rrect(.10,.11,W*.24,D-.22,.07);
 }else if(kind==='pergola'){
  b.rect(.02,.02,W-.04,D-.04);b.rect(.15,.15,W-.30,D-.30);
  for(let i=1;i<n;i++)b.line(W*i/n,.15,W*i/n,D-.15);
  for(const x of [.08,W-.16])for(const y of [.08,D-.16])b.rect(x,y,.08,.08);
 }else if(kind==='planter'){
  b.circle(cx,cy,small*.48);b.circle(cx,cy,small*.40);
  for(let i=0;i<6;i++){const a=i*Math.PI/3;b.line(cx,cy,cx+Math.cos(a)*small*.33,cy+Math.sin(a)*small*.33)}
  b.circle(cx,cy,small*.12);
 }else if(kind==='vehicle'){
  b.rrect(W*.07,.02,W*.86,D-.04,Math.min(.33,W*.22));
  b.rrect(W*.17,D*.25,W*.66,D*.50,.14);
  b.line(W*.17,D*.46,W*.83,D*.46);
  b.line(W*.20,D*.72,W*.80,D*.72);
  for(const x of [W*.015,W*.885])for(const y of [D*.19,D*.70])b.rrect(x,y,W*.10,D*.10,.025);
  b.line(W*.23,D*.12,W*.77,D*.12);
 }else throw Error('Unknown modern PRO type: '+kind);
}

const known=new Set(LIB.library.map(x=>x.id));
for(const item of items)if(!known.has(item.id)){LIB.library.push(item);known.add(item.id)}
if(!LIB.categories.includes(cats))LIB.categories.push(cats);
window.CAD2D_BLACKLINE_SELECT=Object.freeze({label:cats,count:items.length,requiresPaidPlan:true});
})();