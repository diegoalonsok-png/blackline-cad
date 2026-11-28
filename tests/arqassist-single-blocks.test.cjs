const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const s=fs.readFileSync('cad-arq-pro.js','utf8'),k=fs.readFileSync('cad-block-browser.js','utf8');
const sec=(a,z)=>s.slice(s.indexOf(a),s.indexOf(z,s.indexOf(a)));
const route=new Function('window',sec('function arqFurnishRequest(','function arqFurnishSpec(')+sec('function arqRoomCAD(','function arqOpenRoomCAD(')+sec('function arqCleanRequest(','function arqPlanThumbnail(')+sec('function arqRasterRoomQuery(','function arqOpenHouseGallery(')+sec('function arqWebReference(','const arqTypologyBase=')+sec('function arqSingleBlockRequest(','function arqOpenObjectSearch(')+sec('function arqWallRequest(','window.CAD2D_ARQ_ROUTE=')+';return arqRouteOf;')({CAD2D_BLOCK_BROWSER:{roomQuery:new Function(k.slice(k.indexOf('function roomQuery('),k.indexOf('// Bloques DWG/DXF subidos'))+';return roomQuery;')(),typology:new Function(k.slice(k.indexOf('const ARQ_TYPOLOGIES='),k.indexOf('function typologyMatch('))+';return arqTypology;')()}});
test('individual block requests in both languages open block gallery without hijacking house or room generation',()=>{
 for(const q of ['inodoro','toilet','poneme un inodoro','insertar bloque de bidet','colocar un sofá','poné una mesa','put a chair','puerta','ventana','cama','heladera','ducha','auto en planta','árbol'])assert.equal(route(q).kind,'object',q);
 for(const q of ['house','casa'])assert.equal(route(q).kind,'house',q);
 assert.equal(route('habitación 4x3 + baño').kind,'draw');
 for(const q of ['amueblar un living','colocar un sofá en el living'])assert.equal(route(q).kind,'furnish',q);
});
test('malformed optional catalogue cannot hide original local blocks',()=>{
 const lib=[{id:'san-wc',name:'Inodoro'}];
 const get=new Function('window','LIB',k.slice(k.indexOf('function galleryItems('),k.indexOf('// Quality gate:'))+';return galleryItems;')({CAD2D_OLYMPIADAS3:{catalog:{length:2}}},{library:lib});
 assert.deepEqual(get(),lib);
});
