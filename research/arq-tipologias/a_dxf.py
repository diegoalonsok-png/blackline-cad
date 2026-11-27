"""Dibujo de tipología (JSON de primitivas) → DXF R2010 en metros, con capas, bloques, rellenos y cotas.
Uso: python3 a_dxf.py <carpeta_tmp> <carpeta_salida> códigos…  (o --all para jobs.json)"""
import json, sys, os, math
import ezdxf
from ezdxf.enums import TextEntityAlignment

CAPAS = {"MUROS": 7, "VENTANAS": 4, "PUERTAS": 3, "SANITARIOS": 5, "COCINA": 5, "EQUIPAMIENTO": 8, "LOCALES": 9, "TEXTOS": 7, "COTAS": 1, "ROTULO": 7}


def poly(msp, e, layer=None, attribs=None):
    a = dict(attribs or {}); a["layer"] = layer or e.get("layer", "0")
    pts = [tuple(p) for p in e["pts"]]
    if len(pts) < 2: return
    msp.add_lwpolyline(pts, close=bool(e.get("closed")), dxfattribs=a)
    if e.get("fill") and e.get("closed") and len(pts) >= 3:
        h = msp.add_hatch(color=256 if layer is None else 8, dxfattribs={"layer": a["layer"]})
        h.set_solid_fill(color=8 if a["layer"] != "MUROS" else 250)
        h.paths.add_polyline_path(pts, is_closed=True)


def convertir(tmp, out, code):
    d = json.load(open(os.path.join(tmp, code + ".draw.json"), encoding="utf8"))
    doc = ezdxf.new("R2010", setup=["linetypes", "styles", "dimstyles"])
    doc.units = ezdxf.units.M
    doc.header["$INSUNITS"] = 6
    doc.header["$MEASUREMENT"] = 1
    for n, c in CAPAS.items():
        if n not in doc.layers: doc.layers.add(n, color=c)
    doc.layers.get("LOCALES").off()  # contornos de locales para superficies; ocultos por defecto
    if "Arial" not in doc.styles: doc.styles.add("Arial", font="arial.ttf")
    for name, prims in d["blocks"].items():
        b = doc.blocks.new(name=name)
        for p in prims:
            if p["t"] == "poly":
                pts = [tuple(q) for q in p["pts"]]
                if len(pts) >= 2: b.add_lwpolyline(pts, close=p.get("closed", False), dxfattribs={"layer": "0"})
            else:
                b.add_circle(tuple(p["c"]), p["r"], dxfattribs={"layer": "0"})
    msp = doc.modelspace()
    dimstyle = doc.dimstyles.duplicate_entry("EZ_M_100_H25_CM", "CAD2D3D_M") if "EZ_M_100_H25_CM" in doc.dimstyles else None
    for e in d["ents"]:
        t = e["t"]; L = e.get("layer", "0")
        if t == "poly":
            pts = [tuple(p) for p in e["pts"]]
            msp.add_lwpolyline(pts, close=e.get("closed", False), dxfattribs={"layer": L})
            if e.get("fill"):
                h = msp.add_hatch(color=250, dxfattribs={"layer": L}); h.paths.add_polyline_path(pts, is_closed=True)
        elif t == "line":
            msp.add_line(tuple(e["a"]), tuple(e["b"]), dxfattribs={"layer": L})
        elif t == "arc":
            msp.add_arc(tuple(e["c"]), e["r"], e["a0"], e["a1"], dxfattribs={"layer": L})
        elif t == "insert":
            msp.add_blockref(e["name"], tuple(e["p"]), dxfattribs={"layer": L, "rotation": e["rot"]})
        elif t == "text":
            tx = msp.add_text(e["s"], height=e["h"], dxfattribs={"layer": L, "style": "Arial"})
            if e.get("center"): tx.set_placement(tuple(e["p"]), align=TextEntityAlignment.MIDDLE_CENTER)
            else: tx.set_placement(tuple(e["p"]))
        elif t == "dim":
            a, b = e["a"], e["b"]
            if e.get("vertical"):
                base = (a[0] + e["off"], a[1]); dim = msp.add_linear_dim(base=base, p1=tuple(a), p2=tuple(b), angle=90, dimstyle="EZ_M_100_H25_CM" if dimstyle else "Standard", override={"dimtxt": 0.18, "dimasz": 0.08, "dimtsz": 0.06, "dimdec": 2, "dimlfac": 1, "dimzin": 0, "dimdsep": 44, "dimclrt": 7, "dimclrd": 7, "dimclre": 7}, dxfattribs={"layer": L})
            else:
                base = (a[0], a[1] + e["off"]); dim = msp.add_linear_dim(base=base, p1=tuple(a), p2=tuple(b), dimstyle="EZ_M_100_H25_CM" if dimstyle else "Standard", override={"dimtxt": 0.18, "dimasz": 0.08, "dimtsz": 0.06, "dimdec": 2, "dimlfac": 1, "dimzin": 0, "dimdsep": 44, "dimclrt": 7, "dimclrd": 7, "dimclre": 7}, dxfattribs={"layer": L})
            dim.render()
    doc.set_modelspace_vport(height=40, center=(5, 5))
    doc.saveas(os.path.join(out, code + ".dxf"))


if __name__ == "__main__":
    tmp, out = sys.argv[1], sys.argv[2]
    codes = json.load(open(os.path.join(tmp, "jobs.json"))) if sys.argv[3] == "--all" else sys.argv[3:]
    for i, c in enumerate(codes):
        convertir(tmp, out, c)
    print(len(codes), "DXF")
