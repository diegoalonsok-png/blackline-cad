/* Trial UX: day counter is private until the final 24 h.
 * Run: node --test tests/cad-pro-trial-quiet-counter.test.cjs
 * Keeps trial duration, billing enforcement and feature entitlements unchanged.
 */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../cad-plan.js'),'utf8');
const START=Date.parse('2026-08-25T12:00:00Z'),DAY=86400000;
function setup(language='es',state='trial'){
 const clock={now:START+86*DAY};
 class FakeDate extends Date{static now(){return clock.now}}
 const values=new Map([['cad2d-guest-first-use-v1',String(START)],['cad2d-alias-language',language]]);
 const localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v)),
  removeItem:k=>values.delete(k)};
 const listeners=new Map(),intervals=[],elements=new Map(),brand={append(el){elements.set(el.id,el)}};
 const document={readyState:'loading',hidden:false,documentElement:{lang:language},
  head:{append(){}},body:{append(el){elements.set(el.id,el)}},
  createElement(tag){return {tag,id:'',style:{},hidden:false,setAttribute(k,v){this[k]=v},
   addEventListener(){},append(){},remove(){elements.delete(this.id)},
   querySelector(){return null},querySelectorAll(){return []}};},
  getElementById:id=>elements.get(id)||null,
  querySelector:q=>q==='.brand, header, .topbar'?brand:null,
  addEventListener:(name,fn)=>listeners.set(name,fn)};
 const expires=new Date(START+90*DAY).toISOString();
 const fetch=async()=>({ok:true,json:async()=>({plan:state,trialEndsAt:expires})});
 const ctx=vm.createContext({window:{CAD2D_AUTH_CONFIG:{enforce:true,statusUrl:'https://example.com/status'}},
  document,localStorage,Date:FakeDate,fetch,location:{search:'',pathname:'/',hash:''},
  URLSearchParams,history:{replaceState(){}},sessionStorage:{getItem(){return null}},
  setInterval:(fn,ms)=>intervals.push({fn,ms}),setTimeout:()=>{throw Error('Unexpected automatic sales popup')}});
 vm.runInContext(source,ctx,{filename:'cad-plan.js'});
 listeners.get('DOMContentLoaded')();
 const badge=()=>elements.get('cadPlanBadge');
 return {clock,DAY,START,document,intervals,listeners,badge,ctx};
}
test('no countdown during the trial; only the final day is displayed',()=>{
 const {clock,START,DAY,intervals,badge}=setup();
 assert.equal(badge().textContent,'PRO · prueba');
 clock.now=START+89*DAY-60*60*1000;intervals[0].fn();
 assert.equal(badge().textContent,'PRO · prueba','25 hours left should remain neutral');
 clock.now=START+89*DAY+60*60*1000;intervals[0].fn();
 assert.equal(badge().textContent,'PRO · 1 día','23 hours left: show last-day counter');
 assert.match(badge().title,/Último día/);
 clock.now=START+90*DAY+60*1000;intervals[0].fn();
 assert.equal(badge().textContent,'PLANES');
});
test('English trial wording and actual PRO subscription remain neutral',async()=>{
 const e=setup('en');assert.equal(e.badge().textContent,'PRO · trial');
 e.clock.now=e.START+89*e.DAY+1000;e.intervals[0].fn();
 assert.equal(e.badge().textContent,'PRO · 1 day');
 const p=setup('es','pro');
 await p.ctx.window.CAD2D_PLAN.refresh();
 assert.equal(p.badge().textContent,'PRO');
});
test('the UI never opens automatic plan dialogs or hides paid state changes',()=>{
 const {clock,START,DAY,intervals,badge,ctx}=setup();
 assert.equal(intervals[0].ms,60000);
 assert.equal(ctx.window.CAD2D_PLAN.enforced,true);
 assert.equal(ctx.window.CAD2D_PLAN.status.plan,'trial');
 clock.now=START+90*DAY+1000;intervals[0].fn();
 assert.equal(badge().textContent,'PLANES');
 assert.doesNotMatch(source,/maybeTrialEnded\s*\(/);
 assert.doesNotMatch(source,/prueba:\s*'\+days/);
 assert.doesNotMatch(source,/días<\/b> restantes/);
});
test('the loaded page uses the updated plan file, without changing other controls',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert.match(html,/cad-plan\.js\?v=[\w-]+/);
});
