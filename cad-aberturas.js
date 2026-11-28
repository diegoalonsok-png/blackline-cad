/* CAD2D3D · Cambiar puertas y ventanas con un clic.
 * Seleccioná una o varias aberturas ya dibujadas (puerta abatible, doble, ventana o vano) y elegí el tipo nuevo:
 * cada una se reemplaza en el mismo lugar, con el mismo ángulo, el mismo ancho de vano y el mismo muro
 * (el corte del muro no cambia porque la abertura conserva su identidad). Ctrl+Z deshace todo junto.
 * Comandos: CAMBIARABERTURA · REEMPLAZARABERTURA · SWAPOPENING · menú contextual · barra flotante. */
(function(){
'use strict';
const CORE=window.CAD2D_CORE,EXT=window.CAD2D_EXTENSIONS;if(!CORE||!EXT)return;
const S=()=>CORE.state;
const L=(es,en)=>document.documentElement.lang==='es'?es:en;
const KINDS=['swing-door','double-door','framed-window'];
const TYPES=[
 {id:'door-l',icon:'◜',es:'Puerta abatible',en:'Swing door',kind:'swing-door',set:{mirror:false}},
 {id:'door-r',icon:'◝',es:'Puerta abatible (otra mano)',en:'Swing door (other hand)',kind:'swing-door',set:{mirror:true}},
 {id:'double',icon:'◠',es:'Puerta doble',en:'Double door',kind:'double-door',set:{}},
 {id:'window',icon:'▭',es:'Ventana',en:'Window',kind:'framed-window',set:{mullion:false,vano:false}},
 {id:'mullion',icon:'◫',es:'Ventana con parteluz',en:'Window with mullion',kind:'framed-window',set:{mullion:true,vano:false}},
 {id:'vano',icon:'▯',es:'Vano libre',en:'Open bay',kind:'framed-window',set:{vano:true,mullion:false}},
];
const defOf=e=>S().blocks?.[e?.blockName];
const isOpening=e=>e?.type==='blockRef'&&KINDS.includes(defOf(e)?.parametric?.kind);
const selectedOpenings=()=>{const ids=new Set(S().selected);return S().entities.filter(e=>ids.has(e.id)&&isOpening(e)&&!CORE.layerFor(e).locked)};
const family=e=>defOf(e)?.parametric?.kind==='framed-window'?'window':'door';
const choices=refs=>TYPES.filter(t=>refs.every(r=>family(r)===(t.kind==='framed-window'?'window':'door')));
const k=()=>1000/CORE.U[S().unit]; // metros → unidades del modelo
function typeOf(e){
 const def=defOf(e),p={...def.parametric.defaults,...(e.params||{})},kind=def.parametric.kind;
 if(kind==='double-door')return 'double';
 if(kind==='swing-door')return p.mirror?'door-r':'door-l';
 return p.vano?'vano':p.mullion?'mullion':'window';
}
function definitionFor(type){
 const name='ABERTURA · '+type.kind+' · '+type.id;
 if(!S().blocks[name]){
  const defaults={width:.9*k(),frameWidth:.05*k(),frameDepth:(type.kind==='framed-window'?.12:.30)*k(),mirror:false,...type.set};
  S().blocks[name]={name,entities:[{type:'line',a:{x:0,y:0},b:{x:defaults.width,y:0},layer:'0'}],parametric:{kind:type.kind,defaults}};
 }
 return name;
}
// Reemplaza el tipo conservando lugar, rotación, ancho, espesor de muro y lado de apertura.
function swap(typeId,refs=selectedOpenings()){
 const type=TYPES.find(t=>t.id===typeId);if(!type)return 0;
 refs=refs.filter(r=>S().entities.includes(r)&&isOpening(r)&&!CORE.layerFor(r).locked);
 if(!refs.length){CORE.toast(L('Seleccioná una o más puertas o ventanas.','Select one or more doors or windows.'));return 0}
 if(!choices(refs).includes(type)){CORE.toast(L('Elegí una abertura de la misma familia.','Choose an opening of the same family.'));return 0;}
 const narrow=type.kind==='double-door'&&refs.some(r=>({...defOf(r).parametric.defaults,...r.params}).width<1.0*k());
 CORE.saveHistory();
 const name=definitionFor(type);let n=0;
 for(const ref of refs){
  const def=defOf(ref),old={...def.parametric.defaults,...(ref.params||{})};
  const params={...old,...type.set};
  // Profundidad del marco: ventana 12 cm, puerta 30 cm; nunca más que el muro.
  const wall=Number(ref.wallThickness)||old.frameDepth;
  params.frameDepth=Math.min(wall||Infinity,(type.kind==='framed-window'?.12:.30)*k());
  if(type.kind!=='framed-window'){delete params.mullion;delete params.vano}
  if(type.kind!=='swing-door')params.mirror=type.kind==='framed-window'?false:Boolean(old.mirror);
  ref.blockName=name;ref.params=params;n++;
 }
 CORE.updateAll();CORE.queueLocalBackup?.();CORE.schedule?.();
 CORE.toast((n===1?L('Abertura cambiada por ','Opening changed to '):n+L(' aberturas cambiadas por ',' openings changed to '))+L(type.es,type.en)+(narrow?L(' · ancho menor a 1 m para puerta doble',' · width under 1 m for a double door'):'')+' · Ctrl+Z');
 bar.refresh();return n;
}
function flipSide(){const refs=selectedOpenings();if(!refs.length)return;CORE.saveHistory();for(const r of refs)r.flipOpeningSide=!r.flipOpeningSide;CORE.updateAll();CORE.queueLocalBackup?.();CORE.schedule?.();CORE.toast(L('Sentido de apertura invertido · Ctrl+Z','Opening side flipped · Ctrl+Z'))}

/* ---------- Barra flotante: aparece al seleccionar aberturas ---------- */
const bar=(()=>{
 const el=document.createElement('div');el.id='cadOpeningSwap';el.hidden=true;el.setAttribute('role','dialog');el.setAttribute('aria-label',L('Cambiar abertura','Replace opening'));
 const css=document.createElement('style');css.textContent=`#cadOpeningSwap[hidden]{display:none!important}#cadOpeningSwap{position:fixed;left:50%;top:142px;transform:translateX(-50%);z-index:8500;display:flex;gap:4px;align-items:center;flex-wrap:wrap;width:min(420px,92vw);max-width:92vw;background:#16222b;color:#e6eef3;border:1px solid #d3b47a;border-radius:12px;padding:6px 8px;box-shadow:0 8px 24px rgba(0,0,0,.4);font:12px system-ui,sans-serif}
#cadOpeningSwap b{flex-basis:100%;margin:4px;white-space:normal}#cadOpeningSwap .options{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;width:100%}#cadOpeningSwap .options button{flex-direction:column;white-space:normal;text-align:center;justify-content:center;min-height:74px}#cadOpeningSwap svg{width:54px;height:44px}#cadOpeningSwap .meta{flex-basis:100%;opacity:.8;margin:4px}#cadOpeningSwap [data-close]{position:absolute;right:8px;top:5px}#cadOpeningSwap button{all:unset;cursor:pointer;padding:5px 8px;border:1px solid #3a4b57;border-radius:8px;display:flex;gap:5px;align-items:center;white-space:nowrap}
#cadOpeningSwap button:hover{border-color:#9adff3;background:#1d2c36}#cadOpeningSwap button.cur{border-color:#d3b47a;background:#2a2518}#cadOpeningSwap .i{font-size:15px;line-height:1}
.bl-light #cadOpeningSwap{background:#fff;color:#1e2a33}.bl-light #cadOpeningSwap button{border-color:#cfd8de}`;
 document.head.append(css);
 let sig='',dismissed='';
 const selectionKey=refs=>refs.map(r=>r.id).sort().join('|');
 function preview(t){
  const shapes={'door-l':'<path d="M9 35V5 M9 5 A30 30 0 0 1 39 35"/>','door-r':'<path d="M39 35V5 M39 5 A30 30 0 0 0 9 35"/>',double:'<path d="M9 35V19 M39 35V19 M9 19 A16 16 0 0 1 25 35 M39 19 A14 14 0 0 0 25 33"/>',window:'<rect x="5" y="15" width="38" height="14"/><path d="M8 19H40 M8 25H40"/>',mullion:'<rect x="5" y="15" width="38" height="14"/><path d="M8 19H40 M8 25H40 M24 15V29"/>',vano:'<path d="M5 12V32 M43 12V32 M5 12H10 M5 32H10 M38 12H43 M38 32H43"/>'};
  return '<svg viewBox="0 0 48 44" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round">'+shapes[t.id]+'</svg>';
 }
 function paint(refs){
  const cur=new Set(refs.map(typeOf)),types=choices(refs);
  const w=refs.length===1?Number({...defOf(refs[0]).parametric.defaults,...refs[0].params}.width)/k():null;
  el.innerHTML='<b>'+(refs.length===1?(family(refs[0])==='window'?L('Cambiar ventana','Replace window'):L('Cambiar puerta','Replace door')):refs.length+L(' aberturas seleccionadas',' selected openings'))+'</b><button type="button" data-close aria-label="'+L('Cerrar','Close')+'">×</button><span class="meta">'+(Number.isFinite(w)?L('Ancho: ','Width: ')+w.toFixed(2)+' m · ':'')+L('Conserva posición y hueco','Preserves position and wall opening')+'</span><div class="options">'+types.map(t=>'<button type="button" data-swap="'+t.id+'" class="'+(cur.size===1&&cur.has(t.id)?'cur':'')+'">'+preview(t)+L(t.es,t.en)+'</button>').join('')+'</div>'+
  (!types.length?'<span class="meta">'+L('Seleccioná solo puertas o solo ventanas.','Select only doors or only windows.')+'</span>':'')+
  (refs.every(r=>family(r)==='door')?'<button type="button" data-flip>⇅ '+L('Invertir apertura','Flip opening')+'</button>':'');
 }
 for(const ev of ['pointerdown','mousedown','wheel','contextmenu'])el.addEventListener(ev,e=>e.stopPropagation());
 el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;e.stopPropagation();if(b.hasAttribute('data-close')){dismissed=selectionKey(selectedOpenings());el.hidden=true;}else if(b.dataset.swap)swap(b.dataset.swap);else if(b.hasAttribute('data-flip'))flipSide();});
 const api={refresh(force=false){
  const refs=S().tool==='select'?selectedOpenings():[],key=selectionKey(refs);
  if(!refs.length){el.hidden=true;sig='';dismissed='';return}
  if(force||dismissed!==key)dismissed='';
  if(dismissed===key){el.hidden=true;return}
  const s=refs.map(r=>r.id+':'+r.blockName+':'+JSON.stringify(r.params||{})).join('|')+document.documentElement.lang;
  if(s!==sig){sig=s;paint(refs)}if(el.hidden)el.hidden=false;
 }};
 const mount=()=>{document.body.append(el)};if(document.body)mount();else addEventListener('DOMContentLoaded',mount);
 return api;
})();
// La selección cambia con cada clic: la barra se sincroniza al dibujar cada cuadro (sin costo si no cambió).
EXT.overlays=EXT.overlays||[];EXT.overlays.push(()=>{try{bar.refresh()}catch(e){}});

/* ---------- Menú contextual y comandos ---------- */
EXT.context=EXT.context||[];
EXT.context.push(({item,active})=>{
 if(active)return [];const refs=selectedOpenings();if(!refs.length)return [];
 return choices(refs).map(t=>item('⇄ '+L('Cambiar por ','Change to ')+L(t.es,t.en),()=>swap(t.id,refs)));
});
EXT.commands=EXT.commands||{};
const cmd=()=>{const refs=selectedOpenings();if(!refs.length)return CORE.toast(L('Seleccioná puertas o ventanas y repetí el comando (o usá la barra que aparece al seleccionarlas).','Select doors or windows and repeat the command (or use the bar that appears when they are selected).'));bar.refresh(true)};
for(const c of ['CAMBIARABERTURA','CAMBIARABERTURAS','REEMPLAZARABERTURA','CAMBIARPUERTA','CAMBIARVENTANA','SWAPOPENING','REPLACEOPENING'])EXT.commands[c]=cmd;
window.CAD2D_OPENINGS=Object.freeze({swap,types:TYPES.map(t=>t.id),selected:selectedOpenings});
})();
