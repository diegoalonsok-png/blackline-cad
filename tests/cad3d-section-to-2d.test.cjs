/* Corte 3D → dibujo 2D. Run: node --test tests/cad3d-section-to-2d.test.cjs */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../cad3d-lab.js'),'utf8'),html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const fn=name=>{const a=src.indexOf('\nfunction '+name+'(');assert.ok(a>=0,name);const b=src.indexOf('\nfunction ',a+1);return src.slice(a,b)};
const api=new Function(fn('cad3dChainSegments')+fn('cad3dPolyArea')+fn('cad3dPointInPoly')+';return {cad3dChainSegments,cad3dPolyArea,cad3dPointInPoly}')();
test('cut segments of a wall section chain into one clean closed rectangle',()=>{
 // Rectángulo 0.2 × 2.6 cuyo lado izquierdo llega partido en tres tramos (caras trianguladas).
 const segs=[[[0,0],[0.2,0]],[[0.2,0],[0.2,2.6]],[[0.2,2.6],[0,2.6]],[[0,2.6],[0,1.5]],[[0,1.5],[0,0.7]],[[0,0.7],[0,0]]];
 const c=api.cad3dChainSegments(segs);
 assert.equal(c.length,1);assert.equal(c[0].closed,true);assert.equal(c[0].pts.length,4,'collinear vertices removed');
 assert.ok(Math.abs(Math.abs(api.cad3dPolyArea(c[0].pts))-0.52)<1e-9);
});
test('open chains stay open',()=>{const c=api.cad3dChainSegments([[[0,0],[1,0]],[[1,0],[2,1]]]);assert.equal(c[0].closed,false);assert.equal(c[0].pts.length,3)});
test('section panel sends to 2D through the bridge; 2D receives plain editable entities with levels',()=>{
 assert.match(src,/data-section-to2d/);assert.match(src,/\['corte2d','seccion2d','section2d','sectionto2d','cortea2d'\]/);
 assert.match(html,/addSection:p=>cadAddSectionFrom3D\(p\)/);
 for(const l of ['A-CORTE','A-CORTE-RELLENO','A-CORTE-VIDRIO','A-CORTE-COTAS'])assert.ok(html.includes("'"+l+"'"),l);
 assert.match(html,/mode:'vertical',a:Q\(xr,levels\[i\]\)/);
});
test('openings are dimensioned on their own and never become building levels',()=>{
 assert.match(src,/openKey=String\(pa\.userData\.owner/);assert.match(src,/openings:cut\.axis==='z'\?\[\]:openings/);
 assert.match(src,/l\.kind!=='cut'\|\|!l\.closed\|\|l\.opening/);
 assert.match(html,/Aberturas: antepecho y altura de vano/);
});
test('beyond-the-cut view with hidden lines removed, one-step section to layout, schedule button',()=>{
 assert.match(src,/function cad3dSectionBeyond\(\)/);assert.match(src,/new T\.MeshDepthMaterial\(\{depthPacking:T\.RGBADepthPacking/);
 assert.match(src,/kind:'beyond',fill:false/);assert.match(html,/layer\('A-CORTE-VISTA','#9aa4ab',\.13\)/);
 assert.match(src,/data-section-tolayout/);assert.match(src,/data-schedule-to2d/);assert.match(src,/toLayout:!!\(opts&&opts\.toLayout\)/);
 assert.match(html,/function cadSectionToLayout\(bb,title\)/);assert.match(html,/const scales=\[10,20,25,50,75,100,125,200,250,500,1000\]/);
 assert.ok(!/Experimental \(se puede desactivar\)/.test(src),'stairs no longer labelled experimental');
});
