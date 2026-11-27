// DXF → DWG (núcleo propio blackline_dwg) y DXF comprimido para descarga.
import fs from 'fs'; import path from 'path'; import zlib from 'zlib';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const m = await import(path.join(ROOT, 'dwg-wasm/pkg/blackline_dwg.js'));
m.initSync({ module: fs.readFileSync(path.join(ROOT, 'dwg-wasm/pkg/blackline_dwg_bg.wasm')) });
const OUT = path.join(ROOT, 'assets/arq-tipologias/v1'); let n = 0;
for (const f of fs.readdirSync(OUT).filter((x) => x.endsWith('.dxf'))) {
  const dxf = fs.readFileSync(path.join(OUT, f));
  fs.writeFileSync(path.join(OUT, f.replace(/\.dxf$/, '.dwg')), m.dxf_to_dwg(new Uint8Array(dxf)));
  fs.writeFileSync(path.join(OUT, f + '.gz'), zlib.gzipSync(dxf, { level: 9 })); fs.unlinkSync(path.join(OUT, f)); n++;
}
console.log(n, 'DWG + DXF.gz');
