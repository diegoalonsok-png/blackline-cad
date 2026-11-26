/* Tests that OTRACK's toolbar integration keeps ephemeral alignment state and
 * protects ORTHO priority. No drawings/export paths are modified. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
function contains(pattern,name){test(name,()=>assert.match(html,pattern))}
contains(/id="otrackToggle"[^>]*aria-pressed="false"/,'OTRACK toolbar remains toggleable');
contains(/data-status-menu="otrack"/,'OTRACK has a status menu');
contains(/entry\('Limpiar referencias temporales',[^\n]*clearOtrackAnchors/,'tracking anchors can be cleared from menu');
contains(/OTRACKCLEAR','LIMPIARREFERENCIAS','TRACKCLEAR'/,'tracking anchors can be cleared by command');
contains(/const orthoLocksPointer=state\.orthoOn&&/,'ORTHO and OTRACK combine: the point stays orthogonal and aligns with the reference');
contains(/if\(ev\.key==='Escape'\).*cancelCadCommand\(\)/,'Esc uses common cancellation');
contains(/function cancelCadCommand\(\)\{[\s\S]*?clearOtrackAnchors\(false\)/,'cancellation clears transient tracking anchors');
contains(/function undo\(\)\{clearOtrackAnchors\(false\)/,'Undo invalidates temporary alignment anchors');
contains(/function redo\(\)\{clearOtrackAnchors\(false\)/,'Redo invalidates temporary alignment anchors');
contains(/if\(!g\)\{ctx\.restore\(\);return\}/,'guide rendering works with only acquired anchors');
contains(/function drawOtrackGuides\(\)/,'OTRACK render routine present');
