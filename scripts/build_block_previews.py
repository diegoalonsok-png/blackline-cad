#!/usr/bin/env python3
"""Build static SVG thumbnails from the existing, approved CAD vector packs.
No dependencies, no network, no changes to original source geometry.
Run from repository root: python3 scripts/build_block_previews.py
Output: assets/block-previews/v1 (previews), assets/block-library/v1 (catalog and individual geometry).
"""
import base64
import json
import math
import re
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets/block-previews/v1"
LIB = ROOT / "assets/block-library/v1"

def rows_from_pack(path):
    text = path.read_text(encoding="utf-8")
    marker = "const rows="
    start = text.index(marker) + len(marker)
    rows, _ = json.JSONDecoder().raw_decode(text[start:].lstrip())
    return rows

def thumbnail(row):
    block_id, source, name, cat, w, h, data, hash_ = row[:8]
    if not re.fullmatch(r"olymp3-[a-zA-Z0-9_-]+", block_id):
        raise ValueError("Invalid id")
    if not all(math.isfinite(v) and v > 0 for v in (w,h)):
        raise ValueError("Invalid dimensions")
    raw = base64.b64decode(data, validate=True)
    if not raw or len(raw) % 8:
        raise ValueError("Invalid vector data")
    scale = 224/max(w,h)
    sx, sy = w*scale/65535, h*scale/65535
    ox, oy = (256-w*scale)/2, (256-h*scale)/2
    def pt(x,y):
        return f"{ox+x*sx:.2f},{oy+(65535-y)*sy:.2f}"
    path = "".join(f"M{pt(a,b)}L{pt(c,d)}" for a,b,c,d in struct.iter_unpack("<HHHH", raw))
    svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><path fill="none" stroke="#293238" stroke-width="0.85" stroke-linecap="round" d="'+path+'"/></svg>\n'
    return svg, {"id":block_id,"name":name,"category":cat,"width":w,"depth":h,"sourceHash":hash_,"segments":len(raw)//8}

def main():
    files = sorted((ROOT/"assets").glob("cad2d-olimpiadas3-[0-9][0-9].js"))
    if len(files) != 16:
        raise SystemExit("Expected all 16 source packs; incomplete library not published")
    catalog, seen = [], set()
    OUT.mkdir(parents=True, exist_ok=True)
    LIB.mkdir(parents=True, exist_ok=True)
    library = []
    for path in files:
        for row in rows_from_pack(path):
            svg, meta = thumbnail(row)
            if meta["id"] in seen:
                continue
            seen.add(meta["id"])
            target = OUT / (meta["id"]+".svg")
            if not target.exists() or target.read_text(encoding="utf-8") != svg:
                target.write_text(svg,encoding="utf-8")
            catalog.append(meta)
            # Keep exact original encoded geometry, including its source identity.
            block_id, source, name, cat, w, h, data, hash_ = row[:8]
            payload = {"id":block_id,"source":source,"sourceHash":hash_,"data":data}
            geometry = LIB / (block_id+".json")
            geometry.write_text(json.dumps(payload,separators=(",",":"))+"\n",encoding="utf-8")
            library.append({**meta,"source":source})
    output = {"version":1,"blocks":catalog}
    (OUT/"catalog.json").write_text(json.dumps(output,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")
    (LIB/"catalog.json").write_text(json.dumps({"version":1,"parts":len(files),"blocks":library},ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")
    print(f"{len(catalog)} thumbnails and independent CAD geometry files")

if __name__ == "__main__":
    main()
