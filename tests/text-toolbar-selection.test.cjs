'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
test('text toolbar has all essential editing controls',()=>{
 for(const id of ['cadTextBarFont','cadTextBarHeight','cadTextBarBold','cadTextBarItalic','cadTextBarUnderline','cadTextBarHighlight','cadTextBarHighlightColor','cadTextBarShadow','cadTextBarApply'])
  assert.match(html,new RegExp('id="'+id+'"'),id);
});
test('formatting is applied to selected text with undo snapshot',()=>{
 assert.match(html,/const applyTextFormatting=\(\)=>\{/);
 assert.match(html,/saveHistory\(\);for\(const entity of selected\)Object\.assign\(entity,style\)/);
 assert.match(html,/delete style\.text/);
 assert.match(html,/for\(const id of immediateFields\)\$\(id\)\?\.addEventListener\('change',applyTextFormatting\)/);
});
test('text properties sync on selection and content remains deliberate',()=>{
 assert.match(html,/updateProps=function\(\)\{/);
 assert.match(html,/if\(selected\.length===1\)\{syncTextPanel\(selected\[0\]\);syncFromPalette\(\)\}/);
 assert.match(html,/\$\('cadTextBarApply'\)\.addEventListener\('click'/);
});

test('highlight background is drawn behind glyphs and color enables it',()=>{
 assert.match(html,/ctx\.fillRect\(-pad,-size\*\.97,width\+pad\*2,size\*1\.25\)/);
 assert.match(html,/const setHighlight=\(on,color\)=>\{/);
 assert.match(html,/const colorHighlight=\(\)=>setHighlight\(true,\$\('cadTextBarHighlightColor'\)\.value\)/);
 assert.match(html,/e\.highlight=!!on;e\.highlightColor=hex/);
 assert.match(html,/\$\('cadTextBarHighlight'\)\.addEventListener\('click'/);
});
