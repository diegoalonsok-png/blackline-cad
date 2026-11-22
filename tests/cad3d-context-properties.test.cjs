const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('cad3d-lab.js','utf8');
const a=source.indexOf('function hideObjectContextMenu(){'),b=source.indexOf('function bindCanvas(el){',a);
assert(a>=0&&b>a,'Context menu functions must exist');
const segment=source.slice(a,b);
test('Right click opens contextual Properties and identifies a selected window',()=>{
 const menu={hidden:true,innerHTML:'',offsetWidth:160,offsetHeight:100,style:{}};
 const view={getBoundingClientRect(){return {left:10,top:20,width:800,height:550}}};
 const root={querySelector(s){if(s==='.cad3dContextMenu')return menu;if(s==='.view')return view;}};
 const ctx={root,selected:[1],selectedOpeningId:21,records:[{id:1,type:'wall',openings:[{id:21,kind:'window'}]}],escapeHtml:String};
 vm.runInNewContext(segment,ctx);ctx.showObjectContextMenu({clientX:450,clientY:210});
 assert.equal(menu.hidden,false);assert.match(menu.innerHTML,/Window #21/);
 assert.match(menu.innerHTML,/data-context-action="properties"/);
 assert.match(menu.innerHTML,/data-context-action="wall"/);
 ctx.hideObjectContextMenu();assert.equal(menu.hidden,true);
});
test('Unselected right click does not display an object menu',()=>{
 const menu={hidden:false,innerHTML:'outdated'},root={querySelector(){return menu}};
 const ctx={root,selected:[],selectedOpeningId:null,records:[]};
 vm.runInNewContext(segment,ctx);ctx.showObjectContextMenu({clientX:10,clientY:10});
 assert.equal(menu.hidden,true);
});
test('Secondary click selects and opens Properties, right-drag still pans',()=>{
 const bind=source.slice(source.indexOf('function bindCanvas(el){'),source.indexOf('function rayAt(e){'));
 assert(bind.includes("if(click&&e.button===2){"),"Right-click selection works even after placing a door/window");
 assert(bind.includes("if(!placing){selectAt(e);showObjectContextMenu(e);}"));
 assert(bind.includes("if(dragging.pan)panView(dx,dy,el)"));
 assert(bind.includes('hideObjectContextMenu()'));
 assert(bind.includes("el.addEventListener('contextmenu'"));
});
test('Properties action focuses selected carpentry edit fields',()=>{
 assert(segment.includes('renderProps();highlight()'));
 assert(segment.includes('select[data-opening-style],input[data-opening]'));
 assert(source.includes('data-context-action="properties"'));
});
