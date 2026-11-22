'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const C=require('../cad3d-parametric-carpentry.js');
const cad=fs.readFileSync(path.join(__dirname,'../cad3d-lab.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const host={d:.20};
const mk=(kind,styleId,pct=0,w=1.50,h=1.40)=>({kind,styleId,openPct:pct,w,h,sill:.9});
test('original door/window mechanism classification, including fixed windows and empty openings',()=>{
 const data={
  'door:single-swing':'hinged','door:double-swing':'double','door:pivot-door':'pivot',
  'door:sliding-door':'sliding','door:sliding-pocket':'pocket','door:garage-door':'garage',
  'window:fixed':'fixed','window:casement':'hinged','window:double-window':'double',
  'window:sliding-window':'sliding','window:awning':'awning','window:hopper':'hopper',
  'window:floor-to-ceiling':'fixed','window:ribbon-window':'fixed','door:open-door':'none'
 };
 Object.entries(data).forEach(([name,expected])=>{const [kind,style]=name.split(':');assert.equal(C.mechanism(kind,style),expected,name);});
});
test('26 operable/fixed configurations produce finite mesh components and frames',()=>{
 const styles=[['door','single-swing'],['door','single-right-100'],['door','double-swing'],
  ['door','sliding-door'],['door','sliding-pocket'],['door','pivot-door'],['door','garage-door'],
  ['window','fixed'],['window','casement'],['window','double-window'],['window','sliding-window'],
  ['window','awning'],['window','hopper'],['window','clerestory']];
 let combinations=0;
 for(const [kind,style] of styles)for(const pct of [0,50,100]){
  const o=mk(kind,style,pct),d=C.layout(host,o);combinations++;
  assert.ok(d.frame.length>0&&d.leaves.length>0,style);
  for(const part of d.frame.concat(d.leaves.flatMap(l=>l.boxes)))for(const [k,v] of Object.entries(part))
   assert.ok(Number.isFinite(v),style+' '+k);
 }
 assert.equal(combinations,42);
});
test('opening transforms change with percent but never alter the aperture dimensions',()=>{
 for(const [kind,style] of [['door','single-swing'],['door','double-swing'],['door','sliding-door'],
  ['door','pivot-door'],['door','garage-door'],['window','casement'],['window','awning'],['window','hopper']]){
  const closed=C.layout(host,mk(kind,style,0)),open=C.layout(host,mk(kind,style,100));
  assert.notDeepEqual(closed.leaves,open.leaves,style);
  assert.deepEqual(closed.frame,open.frame,style+' frame should not move');
 }
 for(const s of ['fixed','floor-to-ceiling','clerestory']){
  const d=C.layout(host,mk('window',s,100));assert.equal(d.config.openPct,0);
  assert.equal(d.config.operable,false);
 }
});
test('right-handed sliding panels overlap their fixed panel in fully open position',()=>{
 const d=C.layout(host,{...mk('window','sliding-window',100),hinge:'right'});
 assert.ok(Math.abs(d.leaves[0].pivot.x-d.leaves[1].pivot.x)<1e-9);
});
test('width/height really change the regenerated door or window parts',()=>{
 for(const kind of ['door','window']){
  const style=kind==='door'?'single-swing':'casement';
  const a=C.layout(host,mk(kind,style,30,1,1)),b=C.layout(host,mk(kind,style,30,1.9,2.1));
  assert.notDeepEqual(a.frame,b.frame);
  assert.notDeepEqual(a.leaves,b.leaves);
 }
});
test('legacy opening data defaults closed, normalized valid percentage and handedness',()=>{
 assert.deepEqual(C.normalize({kind:'door',styleId:'single-swing'}),{mode:'hinged',openPct:0,hinge:'left',swing:'in',operable:true});
 assert.equal(C.normalize({...mk('door','single-swing',250)}).openPct,100);
 assert.equal(C.normalize({...mk('door','single-swing',-20)}).openPct,0);
 assert.equal(C.normalize({kind:'door',styleId:'single-right-100'}).hinge,'right');
});
test('UI uses articulated meshes, editable controls, double-click and JSON round-trip',()=>{
 assert.match(html,/src="cad3d-parametric-carpentry\.js/);
 assert.ok(html.indexOf('cad3d-parametric-carpentry.js')<html.indexOf('cad3d-lab.js'));
 for(const s of ['function buildParametricCarpentry(','buildParametricCarpentry(r,group)',
  'data-carpentry-action="open"','data-carpentry-action="close"',
  'data-attr="openPct"','select[data-carpentry]','op.openPct=clamp(finite(v.openPct,0),0,100)',
  "el.addEventListener('dblclick'",'openingFitsCADHost(r,proposal,o.id)'])assert.ok(cad.includes(s),s);
});
