const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('cad3d-lab.js','utf8');
test('CAD3D block catalog parses and retains wall drawing',()=>{
 assert.doesNotThrow(()=>new vm.Script(source));
 assert(source.includes('Drawing takes precedence over navigation'));
 assert(source.includes("tool('wall','Wall'"));
 assert(source.includes("tool('slab','Slab'"));
});
test('3D block library uses geometric boxes, not images',()=>{
 assert(source.includes('function buildCAD3DBlock(record,group)'));
 assert(source.includes('def.parts.forEach(function(p)'));
 assert(source.includes('addMesh(g,p[6],record.id,group'));
 assert(source.includes("if(r.type==='block3d')buildCAD3DBlock(r,group)"));
 assert(!source.includes('data-3d-block-image'));
});
test('3D blocks persist, edit and use existing move and copy commands',()=>{
 assert(source.includes("rec=newRecord('block3d')"));
 assert(/var accepted=\['box','sphere','cone','cylinder','wall','slab','boolean','block3d'[,\]]/.test(source));
 assert(source.includes("if(r.type==='block3d'){if(r.cutoutSpec)"));
 assert(source.includes("else o.blockId=CAD3D_COMPONENTS[r.blockId]?r.blockId:'chair'"));
 // Bloques 3D: ancho y profundidad editables (h según el tipo), dentro del listado general.
 assert(/\[[^\]]*'block3d'[^\]]*\]\.includes\(r\.type\)\)\{[^}]*keys\.push\('w'\);keys\.push\('d'\)/.test(source));
 assert(source.includes("if(kind==='move'||kind==='copy')"));
});

test('R2 gallery downloads geometry only at placement, not selection or opening',()=>{
 const select=source.slice(source.indexOf("var button=e.target.closest('[data-3d-block]')"),source.indexOf('// The gallery renders previews only'));
 assert(!select.includes('cad3dFetchRemoteModel'));
 assert(select.includes("setPlacement('block3d')"));
 const place=source.slice(source.indexOf('function placePoint(pt)'),source.indexOf('function placePoint(pt)')+20000);
 assert(place.includes('cad3dFetchRemoteModel(spec).then'));
 assert(place.includes('epoch!==cad3dRemoteEpoch'));
 assert(place.includes('detailSpec:mesh.detail'));
 const routes=JSON.parse(fs.readFileSync('_routes.json','utf8'));
 assert(routes.include.includes('/assets/3d-object-library/v1/*'));
 assert(fs.readFileSync('functions/assets/_middleware.js','utf8').includes('3d-object-library'));
});

test('realism status requires explicit review and redistributable license',()=>{
 const start=source.indexOf('function cad3dGalleryQualityFromManifest');
 const end=source.indexOf('function cad3dBlockKind',start);
 const ctx={window:{},cad3dShowProvisional:false};vm.createContext(ctx);vm.runInContext(source.slice(start,end),ctx);
 const q=ctx.cad3dGalleryQualityFromManifest;
 const valid={quality:'realistic',source:'https://polyhaven.com/a/example',license:'CC0-1.0',review:{approved:true,date:'2026-11-27',reviewer:'Blackline'}};
 assert.equal(q(valid),'realistic');
 assert.equal(q({...valid,review:undefined}),'provisional');
 assert.equal(q({...valid,license:'unknown'}),'provisional');
 assert.equal(q({...valid,source:''}),'provisional');
 assert.equal(ctx.cad3dGalleryVisible({}),false);
 assert.equal(ctx.cad3dGalleryVisible({detail:true}),true);
 assert.equal(ctx.cad3dGalleryVisible({quality:'realistic'}),true);
 ctx.cad3dShowProvisional=true;assert.equal(ctx.cad3dGalleryVisible({}),true);
 assert.equal(ctx.cad3dGalleryVisible({superseded:true}),false);
});
test('photographic cutout validates bounded embedded image and mount',()=>{
 const start=source.indexOf('function cad3dValidatePhotoCutout');
 const end=source.indexOf('async function cad3dFetchRemoteModel',start);
 const ctx={};vm.createContext(ctx);vm.runInContext(source.slice(start,end),ctx);
 const valid={version:3,w:1,d:.05,h:1.8,mount:'face',image:'data:image/png;base64,AAAA'};
 assert.equal(ctx.cad3dValidatePhotoCutout(valid).cutout,'photo');
 assert.throws(()=>ctx.cad3dValidatePhotoCutout({...valid,image:'https://example.org/foo.png'}));
 assert.throws(()=>ctx.cad3dValidatePhotoCutout({...valid,mount:'invalid'}));
 assert.throws(()=>ctx.cad3dValidatePhotoCutout({...valid,image:'data:image/svg+xml;base64,AAAA'}));
 assert(source.includes('cutoutSpec:mesh.cutout'));
 assert(source.includes('cad3dPhotoTexture(record.cutoutSpec.image)'));
});


test('photo cache retains active textures, releases hidden or deleted images once',()=>{
 const start=source.indexOf('var cad3dPhotoTextures=new Map()');
 const end=source.indexOf("var activeCAD3DBlock=",start);
 assert(start>=0&&end>start);
 let loaded=0,disposed=0;
 const ctx={T:{SRGBColorSpace:'srgb',TextureLoader:class{load(){loaded++;return {dispose(){disposed++;}};}}}};
 vm.createContext(ctx);vm.runInContext(source.slice(start,end),ctx);
 const a=ctx.cad3dPhotoTexture('image-a'),b=ctx.cad3dPhotoTexture('image-b');
 assert.equal(ctx.cad3dPhotoTexture('image-a'),a);assert.equal(loaded,2);
 ctx.cad3dPrunePhotoTextures([{type:'block3d',cutoutSpec:{image:'image-a'}},{type:'block3d',cutoutSpec:{image:'image-a'}}]);
 assert.equal(disposed,1);assert.equal(ctx.cad3dPhotoTexture('image-a'),a);
 ctx.cad3dPrunePhotoTextures([]);ctx.cad3dPrunePhotoTextures([]);assert.equal(disposed,2);
 assert.notEqual(ctx.cad3dPhotoTexture('image-a'),a);assert.equal(loaded,3);
 assert(source.includes('cad3dPrunePhotoTextures(visible)'));
});
test('remote photographic models must agree with catalogue type and orientation',async()=>{
 const start=source.indexOf('function cad3dValidatePhotoCutout');
 const end=source.indexOf('var cad3dBlockView',start);
 assert(start>=0&&end>start);
 let payload={version:3,w:1,d:.05,h:1.8,mount:'face',image:'data:image/png;base64,AAAA'};
 const ctx={URL,AbortSignal,CAD3D_LIBRARY_ROOT:new URL('https://example.org/assets/'),fetch:async()=>({ok:true,headers:{get:()=>null},text:async()=>JSON.stringify(payload)})};
 vm.createContext(ctx);vm.runInContext(source.slice(start,end),ctx);
 const spec={model:'test.json',w:1,d:.05,h:1.8,mount:'face',cutout:'photo'};
 assert.equal((await ctx.cad3dFetchRemoteModel(spec)).cutout.mount,'face');
 await assert.rejects(ctx.cad3dFetchRemoteModel({...spec,mount:'cross'}),/inconsistentes/);
 await assert.rejects(ctx.cad3dFetchRemoteModel({...spec,cutout:undefined}),/inconsistentes/);
 payload={version:1,meshVertices:[0,0,0,1,0,0,0,1,0]};
 await assert.rejects(ctx.cad3dFetchRemoteModel(spec),/Expected photographic/);
 assert.equal((await ctx.cad3dFetchRemoteModel({...spec,cutout:undefined})).meshVertices.length,9);
});
