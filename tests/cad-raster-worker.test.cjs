'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../cad-raster-import-worker.js'),'utf8');
const {cadRasterPreflight,cadRasterPreviewSize}=new Function('self',src+';return {cadRasterPreflight,cadRasterPreviewSize};')({});
function png(w,h){const b=Buffer.alloc(24);b.writeUInt32BE(0x89504e47);b.writeUInt32BE(0x0d0a1a0a,4);b.write('IHDR',12);b.writeUInt32BE(w,16);b.writeUInt32BE(h,20);return b;}
function tracked(blob){let total=0;return {get total(){return total},size:blob.size,slice(a,b,type){const v=blob.slice(a,b,type);return {arrayBuffer:async()=>{total+=v.size;return v.arrayBuffer()}}},arrayBuffer:async()=>{total+=blob.size;return blob.arrayBuffer()}}}
test('PNG header preflight reads at most 64 KiB instead of copying the entire file',async()=>{
 const f=tracked(new Blob([png(3000,3000),Buffer.alloc(4*1024*1024)]));
 assert.deepEqual(await cadRasterPreflight(f),{w:3000,h:3000,type:'image/png'});
 assert.equal(f.total,65536);
});
test('oversized dimensions are rejected before decode',async()=>{
 const f=tracked(new Blob([png(9000,9000)]));await assert.rejects(cadRasterPreflight(f),/12 megapixels/);
 assert.throws(()=>cadRasterPreviewSize(8192,8192));
});
test('JPEG with long application metadata falls back to bounded full inspection',async()=>{
 const segment=Buffer.alloc(65535);segment[0]=255;segment[1]=225;segment.writeUInt16BE(65533,2);
 const sof=Buffer.from([255,192,0,7,8,0,100,0,200]);
 const f=tracked(new Blob([Buffer.from([255,216]),segment,sof]));
 assert.deepEqual(await cadRasterPreflight(f),{w:200,h:100,type:'image/jpeg'});
 assert.equal(f.total,65536+f.size);
});
test('preview preserves orientation and proportions, never enlarges images',()=>{
 assert.deepEqual(cadRasterPreviewSize(3000,4000),{w:1200,h:1600});
 assert.deepEqual(cadRasterPreviewSize(4000,3000),{w:1600,h:1200});
 assert.deepEqual(cadRasterPreviewSize(600,800),{w:600,h:800});
});
