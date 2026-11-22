'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const src=fs.readFileSync('cad3d-viewcube.js','utf8');
const cad=fs.readFileSync('cad3d-lab.js','utf8');
const page=fs.readFileSync('index.html','utf8');
const fakeFace=()=>({dataset:{},labels:[],setAttribute(name,val){this[name]=val;},querySelector(){return {set textContent(x){this.value=x;},get textContent(){return this.value;}};}});
function init(){
 const listeners={};const style=[];
 const faces={top:fakeFace(),front:fakeFace(),right:fakeFace()};
 const cube={dataset:{},setAttribute(name,v){this[name]=v;},addEventListener(name,cb){listeners[name]=cb;},querySelector(q){
  const found=q.match(/data-cube-face=(top|front|right)/);return found?faces[found[1]]:null;},
  querySelectorAll(){return Object.values(faces);}};
 const doc={createElement(){return {style:{}};},head:{appendChild(n){style.push(n);}}};
 const global={};const module={exports:{}};
 new Function('window','document','module',src)(global,doc,module);
 return {api:module.exports,global,cube,faces,listeners,style,root:{querySelector(q){
  return q==='.viewCube'||q==='.viewCube[data-cube-modern=yes]'?cube:null;}}};
}
test('ViewCube loads before CAD3D without modifying 3D geometry',()=>{
 assert.match(page,/src="cad3d-viewcube\.js/);
 assert.ok(page.indexOf('cad3d-viewcube.js')<page.indexOf('cad3d-lab.js'));
 assert.match(cad,/BlacklineCAD3DViewCube\?\.mount/);
 assert.match(cad,/BlacklineCAD3DViewCube\?\.sync/);
 assert.match(cad,/function rotateViewCube\(/);
 assert.match(cad,/activeView='orbit';syncViewControls\(\);applyViewCamera\(\)/);
});
test('SVG isometric ViewCube contains accessible planes, vertex views and orbit buttons',()=>{
 for(const k of ['data-cube-face="top"','data-cube-face="front"','data-cube-face="right"',
  'data-view-preset="ne"','data-view-preset="nw"','data-view-preset="sw"',
  'data-cube-spin="-1"','data-cube-spin="1"','role="button" tabindex="0"','cubeCompass'])
 assert.ok(src.includes(k),k);
});
test('mount is idempotent, keyboard and rotation interact with existing camera actions',()=>{
 const x=init();const activated=[],rotated=[];
 assert.equal(x.api.mount(x.root,{setPreset:v=>activated.push(v),rotate:s=>rotated.push(s)}),true);
 assert.equal(x.cube.dataset.cubeModern,'yes');assert.equal(x.style.length,1);
 assert.ok(x.cube.innerHTML.includes('viewCubeArt'));
 x.api.mount(x.root,{setPreset:v=>activated.push(v),rotate:s=>rotated.push(s)});
 assert.equal(x.style.length,1);
 const evt={target:{closest(q){return q==='[data-cube-spin]'?{dataset:{cubeSpin:'1'}}:null;}},stopPropagation(){}};
 x.listeners.click(evt);assert.deepEqual(rotated,[1]);
 x.listeners.keydown({key:'Enter',target:{closest(){return {dataset:{viewPreset:'top'}};}},preventDefault(){},stopPropagation(){}});
 assert.deepEqual(activated,['top']);
});
test('front/right faces reflect camera azimuth, top/bottom states persist',()=>{
 const x=init();x.api.mount(x.root,{setPreset(){},rotate(){}});
 x.api.sync(x.root,{az:-.8,activeView:'iso'});
 assert.equal(x.faces.front.dataset.viewPreset,'front');
 assert.equal(x.faces.right.dataset.viewPreset,'right');
 x.api.sync(x.root,{az:.8,activeView:'right'});
 assert.equal(x.faces.front.dataset.viewPreset,'right');
 assert.equal(x.faces.right.dataset.viewPreset,'back');
 x.api.sync(x.root,{az:2.4,activeView:'bottom'});
 assert.equal(x.faces.top.dataset.viewPreset,'bottom');
 assert.equal(x.faces.top['aria-pressed'],'true');
 x.api.sync(x.root,{az:-2.4,activeView:'top'});
 assert.equal(x.faces.top.dataset.viewPreset,'top');
});
