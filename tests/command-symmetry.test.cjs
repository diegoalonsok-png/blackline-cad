/* Órdenes y alias habituales de los CAD de escritorio. Run: node --test tests/command-symmetry.test.cjs */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),plus=fs.readFileSync(path.join(__dirname,'../cad-comandos-plus.js'),'utf8');
test('EXT and PAR object snaps exist, with acquisition and a dotted guide',()=>{
 assert.match(html,/CAD_OSNAP_TYPES=\[[^\]]*'EXT','PAR'\]/);
 assert.match(html,/cadExtAcquired\.push/);assert.match(html,/type='EXT';guideFrom=s\.end/);assert.match(html,/type='PAR';guideFrom=base/);
});
test('object snap typed in the middle of a command (FIN, MED, EXT, PAR…)',()=>{
 for(const k of ['FIN:\'END\'','MED:\'MID\'','EXT:\'EXT\'','PAR:\'PAR\'','CEN:\'CENTER\'','PER:\'PERP\'','NEA:\'NEAREST\''])assert.ok(html.includes(k),k);
 assert.match(html,/cadOneShotOsnap=kind;toast\('OSNAP '/);
});
test('previously unknown everyday commands are now answered',()=>{
 for(const n of ['POINT','PO','LAYCUR','TEXTEDIT','BE','XR','DOR','LINETYPE','COL','SN','MS','PS','PAGESETUP','DXFOUT','GRADIENT','DS','LW',
  'WALLADD','DOORADD','WINDOWADD','OPENINGADD','SPACEADD','STAIRADD','AECSCHEDULEADD','SLABADD','ROOFADD','REGION','WIPEOUT','LIMITS','OPTIONS'])
  assert.ok(new RegExp("'"+n+"'").test(plus),n);
});
