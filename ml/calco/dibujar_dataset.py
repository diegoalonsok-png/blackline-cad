"""Calco IA · paso 2: dibuja plantas sintéticas en estilos variados, con su máscara exacta.

Fuentes (todas propias, sin datos de terceros):
  * plantas del motor de ARQ Assist (generar_plantas.cjs → .jsonl), y
  * un generador procedimental de plantas (subdivisión de terreno en locales).

Salida por muestra: imagen RGB (JPEG), máscara de clases (PNG, 1 canal) y JSON vectorial en píxeles.
Clases: 0 fondo · 1 muro · 2 puerta · 3 ventana · 4 mueble/artefacto · 5 texto/cota.

Uso:  python3 dibujar_dataset.py --salida dataset --cantidad 2000 [--motor plantas.jsonl] [--semilla 1]
      python3 dibujar_dataset.py --muestra muestra.png        (lámina de control con 6 ejemplos)
"""
import argparse, io, json, math, os, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

INGLES = {"DORMITORIO": "Bedroom", "DORM.": "Bedroom", "HABITACIÓN": "Bedroom", "BAÑO": "Bath", "COCINA": "Kitchen", "LIVING": "Great Room",
          "ESTAR": "Living", "LIVING COMEDOR": "Great Room", "COMEDOR": "Dining", "LAVADERO": "Utility", "OFICINA": "Office", "DESPACHO": "Den",
          "ESTUDIO": "Den", "HALL": "Entry", "PASO": "Hall", "CIRC.": "Hall", "GARAGE": "Garage", "COCHERA": "Garage", "DEPÓSITO": "Storage", "DEP.": "Storage"}
CLASES = {"fondo": 0, "muro": 1, "puerta": 2, "ventana": 3, "mueble": 4, "texto": 5}
COLOR_MASCARA = [(0, 0, 0), (230, 57, 70), (69, 123, 157), (42, 157, 143), (244, 162, 97), (160, 160, 160)]
NOMBRES = {"bedroom": ["DORMITORIO", "DORM.", "HABITACIÓN"], "bath": ["BAÑO"], "kitchen": ["COCINA"],
           "living": ["LIVING", "ESTAR", "LIVING COMEDOR"], "dining": ["COMEDOR"], "laundry": ["LAVADERO"],
           "office": ["OFICINA", "DESPACHO", "ESTUDIO"], "hall": ["HALL", "PASO", "CIRC."], "garage": ["GARAGE", "COCHERA"],
           "storage": ["DEPÓSITO", "DEP."], "meeting": ["SALA DE REUNIONES"], "reception": ["RECEPCIÓN"]}


# ---------------------------------------------------------------- plantas (metros, eje Y hacia arriba)
class Planta:
    def __init__(self):
        self.muros = []      # (ax, ay, bx, by, espesor)
        self.aberturas = []  # (indice_muro, desde, hasta, tipo 'puerta'|'ventana', lado_giro)
        self.muebles = []    # (tipo, x, y, ancho, alto, rotación grados)
        self.locales = []    # (nombre, x0, y0, x1, y1)


def procedimental(r: random.Random) -> Planta:
    p = Planta()
    W, H = r.uniform(7, 19), r.uniform(6, 14)
    te, ti = r.choice([0.2, 0.3, 0.3]), r.choice([0.1, 0.15, 0.15])
    rects = [(0.0, 0.0, W, H)]
    # Subdivisión: parte siempre el local más grande mientras se pueda.
    objetivo = r.randint(3, 9)
    while len(rects) < objetivo:
        rects.sort(key=lambda q: (q[2] - q[0]) * (q[3] - q[1]))
        x0, y0, x1, y1 = rects.pop()
        w, h = x1 - x0, y1 - y0
        if max(w, h) < 4.8:
            rects.append((x0, y0, x1, y1)); break
        if w >= h:
            c = round(r.uniform(x0 + 2.4, x1 - 2.4) * 20) / 20; rects += [(x0, y0, c, y1), (c, y0, x1, y1)]
        else:
            c = round(r.uniform(y0 + 2.4, y1 - 2.4) * 20) / 20; rects += [(x0, y0, x1, c), (x0, c, x1, y1)]
    # Planta en L: a veces se quita un local de esquina.
    if len(rects) > 4 and r.random() < 0.35:
        esquinas = [q for q in rects if (q[0] == 0 or q[2] == W) and (q[1] == 0 or q[3] == H)]
        if esquinas:
            rects.remove(r.choice(esquinas))
    # Bordes: exteriores si no los comparte otro local.
    def comparte(x0, y0, x1, y1, otro):
        a0, b0, a1, b1 = otro
        if abs(x0 - x1) < 1e-9:  # vertical
            if (abs(a0 - x0) < 1e-9 or abs(a1 - x0) < 1e-9):
                lo, hi = max(y0, b0), min(y1, b1)
                return hi - lo if hi - lo > 1e-6 else 0
            return 0
        if (abs(b0 - y0) < 1e-9 or abs(b1 - y0) < 1e-9):
            lo, hi = max(x0, a0), min(x1, a1)
            return hi - lo if hi - lo > 1e-6 else 0
        return 0
    vistos = {}
    for i, (x0, y0, x1, y1) in enumerate(rects):
        for e in [(x0, y0, x1, y0), (x1, y0, x1, y1), (x0, y1, x1, y1), (x0, y0, x0, y1)]:
            otros = [j for j, q in enumerate(rects) if j != i and comparte(*e, q) > 0]
            clave = tuple(round(v, 4) for v in e)
            if clave in vistos and not otros:
                continue
            vistos[clave] = 1
            p.muros.append((*e, te if not otros else ti, i, otros))
    # Aberturas: árbol de puertas que conecta todos los locales + una puerta de entrada + ventanas exteriores.
    conectados, pendientes = {0}, set(range(1, len(rects)))
    interiores = [k for k, m in enumerate(p.muros) if m[6]]
    r.shuffle(interiores)
    while pendientes:
        avance = False
        for k in interiores:
            ax, ay, bx, by, t, i, otros = p.muros[k]
            for j in otros:
                if (i in conectados) != (j in conectados):
                    L = math.hypot(bx - ax, by - ay); ancho = r.choice([0.7, 0.8, 0.8, 0.9])
                    if L >= ancho + 0.3:
                        d = r.uniform(0.15, L - ancho - 0.15); p.aberturas.append((k, d, d + ancho, "puerta", r.choice([1, -1])))
                        conectados |= {i, j}; pendientes -= {i, j}; avance = True; break
            if not pendientes:
                break
        if not avance:
            break
    exteriores = [k for k, m in enumerate(p.muros) if not m[6]]
    if exteriores:
        k = r.choice(exteriores); ax, ay, bx, by = p.muros[k][:4]; L = math.hypot(bx - ax, by - ay)
        if L > 1.4:
            d = r.uniform(0.2, L - 1.1); p.aberturas.append((k, d, d + 0.9, "puerta", r.choice([1, -1])))
    for k in exteriores:
        ax, ay, bx, by = p.muros[k][:4]; L = math.hypot(bx - ax, by - ay)
        if L > 2 and r.random() < 0.7:
            ancho = min(L - 0.8, r.choice([0.8, 1.0, 1.2, 1.5, 1.8, 2.0]))
            d = r.uniform(0.4, L - ancho - 0.4)
            if not any(a[0] == k and not (d + ancho < a[1] - 0.2 or d > a[2] + 0.2) for a in p.aberturas):
                p.aberturas.append((k, d, d + ancho, "ventana", 1))
    # Locales: nombre por tamaño y muebles simples.
    for (x0, y0, x1, y1) in rects:
        area = (x1 - x0) * (y1 - y0)
        tipo = "bath" if area < 6 else r.choice(["bedroom", "bedroom", "office"]) if area < 14 else r.choice(["living", "kitchen", "dining", "living"])
        p.locales.append((r.choice(NOMBRES[tipo]), x0, y0, x1, y1))
        cx, cy, w, h = (x0 + x1) / 2, (y0 + y1) / 2, x1 - x0, y1 - y0
        if tipo == "bath":
            p.muebles += [("inodoro", x0 + 0.5, y0 + 0.45, 0.4, 0.6, 0), ("lavatorio", x1 - 0.5, y0 + 0.35, 0.5, 0.4, 0)]
            if area > 3.5:
                p.muebles.append(("ducha", x1 - 0.55, y1 - 0.55, 0.9, 0.9, 0))
        elif tipo == "bedroom":
            p.muebles += [("cama", cx, y1 - 1.15, 1.4 if w > 3 else 0.9, 1.9, 0), ("placard", x0 + 0.35, cy, 0.6, min(h - 0.8, 1.8), 0)]
        elif tipo in ("living",):
            p.muebles += [("sofa", cx, y0 + 0.6, min(w - 1, 2.2), 0.85, 0), ("mesa", cx, cy + 0.6, 1.2, 0.7, 0)]
        elif tipo in ("dining", "kitchen"):
            p.muebles += [("mesa", cx, cy, min(w - 1.2, 1.6), 0.9, 0)]
            if tipo == "kitchen":
                p.muebles += [("mesada", cx, y1 - 0.35, min(w - 0.4, 3.0), 0.6, 0)]
        elif tipo == "office":
            p.muebles += [("escritorio", cx, y1 - 0.5, 1.4, 0.7, 0)]
    return p


ROL_MUEBLE = {"bed": "cama", "wardrobe": "placard", "shower": "ducha", "basin": "lavatorio", "toilet": "inodoro", "bidet": "inodoro",
              "fridge": "mesada", "sink": "mesada", "range": "mesada", "table6": "mesa", "table4": "mesa", "sofa": "sofa", "desk": "escritorio"}


def desde_motor(d: dict, r: random.Random) -> Planta:
    p = Planta(); ids = {}
    # El motor propone variantes (v0, v1…) una al lado de la otra: se usa una sola.
    pref = lambda s: str(s).split("-")[0]
    var = r.choice(sorted({pref(w["id"]) for w in d["walls"]}))
    muros = [w for w in d["walls"] if pref(w["id"]) == var]
    xs = [v for w in muros for v in (w["a"][0], w["b"][0])]; ys = [v for w in muros for v in (w["a"][1], w["b"][1])]
    dentro = lambda x, y: min(xs) - .5 <= x <= max(xs) + .5 and min(ys) - .5 <= y <= max(ys) + .5
    d = {**d, "walls": muros, "openings": [o for o in d["openings"] if pref(o.get("host", "")) == var],
         "blocks": [b for b in d["blocks"] if b.get("envelope") and dentro(b["envelope"][0], b["envelope"][1])],
         "rooms": [m for m in d["rooms"] if pref(m.get("id", "")) == var]}
    for w in d["walls"]:
        ids[w["id"]] = len(p.muros)
        p.muros.append((w["a"][0], w["a"][1], w["b"][0], w["b"][1], float(w.get("thickness", 0.15)), 0, []))
    for o in d["openings"]:
        k = ids.get(o.get("host"))
        if k is None:
            continue
        w = float(o.get("width", 0.8)); c = float(o.get("offset", 0)); kind = o.get("kind", "")
        p.aberturas.append((k, c - w / 2, c + w / 2, "ventana" if "window" in kind else "puerta", r.choice([1, -1])))
    for b in d["blocks"]:
        e = b.get("envelope")
        if e:
            x, y, ww, hh = e
            p.muebles.append((ROL_MUEBLE.get(b.get("role"), "mesa"), x + ww / 2, y + hh / 2, ww * 0.9, hh * 0.9, 0))
    for rm in d["rooms"]:
        x0, y0, x1, y1 = rm["clearBounds"]
        p.locales.append((r.choice(NOMBRES.get(rm.get("kind"), ["LOCAL"])), x0, y0, x1, y1))
    return p


# ---------------------------------------------------------------- dibujo
def fuente(tam):
    for f in ["DejaVuSans.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"]:
        try:
            return ImageFont.truetype(f, int(tam))
        except OSError:
            pass
    return ImageFont.load_default()


def dibujar(p: Planta, r: random.Random, lado=768):
    """Devuelve (imagen RGB, máscara L, json vectorial en píxeles)."""
    xs = [v for m in p.muros for v in (m[0], m[2])]; ys = [v for m in p.muros for v in (m[1], m[3])]
    minx, maxx, miny, maxy = min(xs), max(xs), min(ys), max(ys)
    margen = r.uniform(1.2, 2.6)  # lugar para cotas
    esc = (lado * r.uniform(0.75, 0.97)) / max(maxx - minx + 2 * margen, maxy - miny + 2 * margen)
    ss = 2  # sobremuestreo para antialias
    S = lado * ss
    ox = (lado - (maxx - minx) * esc) / 2 - minx * esc
    oy = (lado - (maxy - miny) * esc) / 2 - miny * esc
    giro = r.choice([0, 0, 90, 180, 270]); espejo = r.random() < 0.3

    def T(x, y):
        X, Y = ox + x * esc, oy + y * esc
        X, Y = X - lado / 2, Y - lado / 2
        if espejo:
            X = -X
        for _ in range(giro // 90):
            X, Y = -Y, X
        return ((X + lado / 2) * ss, (lado - (Y + lado / 2)) * ss)

    estilo = {
        "fondo": r.choice([(255, 255, 255)] * 5 + [(250, 246, 236), (240, 240, 235), (28, 60, 110)]),
        "muro": r.choice(["lleno", "lleno", "rayado", "gris", "contorno", "contorno"]),
        "trazo": r.uniform(0.6, 2.2) * ss,
        "puerta": r.choice(["hoja_arco", "hoja_arco", "hoja", "arco_punteado"]),
        "ventana": r.choice([2, 3, 3]),
        "textos": r.random() < 0.85, "cotas": r.random() < 0.7, "muebles": r.random() < 0.9,
        # Elementos de plantas reales de internet: pisos con trama, vegetación, autos, solados, títulos.
        "pisos": r.random() < 0.45, "vegetacion": r.random() < 0.45, "autos": r.random() < 0.3,
        "solado": r.random() < 0.4, "titulo": r.random() < 0.45, "ingles": r.random() < 0.35,
    }
    azul = estilo["fondo"] == (28, 60, 110)
    tinta = (235, 240, 255) if azul else r.choice([(0, 0, 0), (20, 20, 20), (40, 40, 60)])
    img = Image.new("RGB", (S, S), estilo["fondo"]); mask = Image.new("L", (S, S), 0)
    di, dm = ImageDraw.Draw(img), ImageDraw.Draw(mask)
    lw = max(1, int(estilo["trazo"]))
    vec = {"muros": [], "aberturas": [], "muebles": [], "escala_px_m": esc, "giro": giro, "espejo": espejo}

    def poly_muro(ax, ay, bx, by, t, d0=None, d1=None):
        L = math.hypot(bx - ax, by - ay) or 1; ux, uy = (bx - ax) / L, (by - ay) / L; nx, ny = -uy * t / 2, ux * t / 2
        a0, a1 = (0 if d0 is None else d0), (L if d1 is None else d1)
        # Los muros se prolongan medio espesor en los extremos para cerrar las esquinas.
        e0 = -t / 2 if d0 is None or d0 <= 0 else 0; e1 = t / 2 if d1 is None or d1 >= L else 0
        P0 = (ax + ux * (a0 + e0), ay + uy * (a0 + e0)); P1 = (ax + ux * (a1 + e1), ay + uy * (a1 + e1))
        return [T(P0[0] + nx, P0[1] + ny), T(P1[0] + nx, P1[1] + ny), T(P1[0] - nx, P1[1] - ny), T(P0[0] - nx, P0[1] - ny)]

    gris_claro = (150, 170, 210) if azul else tuple(int(c * 0.72 + 255 * 0.28) for c in (r.choice([170, 185, 200]),) * 3)
    fino0 = max(1, lw // 3)
    bx0, by0 = T(minx, miny); bx1, by1 = T(maxx, maxy)
    caja = (min(bx0, bx1), min(by0, by1), max(bx0, bx1), max(by0, by1))  # edificio en píxeles (con sobremuestreo)
    # Solado exterior: rectángulos punteados con grilla de baldosas pegados al edificio (patios, galerías).
    if estilo["solado"]:
        for _ in range(r.randint(1, 3)):
            w_, h_ = r.uniform(0.15, 0.35) * S, r.uniform(0.1, 0.3) * S
            lado_ = r.choice(["izq", "der", "arr", "aba"])
            if lado_ == "izq": x0 = caja[0] - w_ * r.uniform(0.6, 1); y0 = r.uniform(caja[1], max(caja[1] + 1, caja[3] - h_))
            elif lado_ == "der": x0 = caja[2] - w_ * r.uniform(0, 0.4); y0 = r.uniform(caja[1], max(caja[1] + 1, caja[3] - h_))
            elif lado_ == "arr": x0 = r.uniform(caja[0], max(caja[0] + 1, caja[2] - w_)); y0 = caja[1] - h_ * r.uniform(0.6, 1)
            else: x0 = r.uniform(caja[0], max(caja[0] + 1, caja[2] - w_)); y0 = caja[3] - h_ * r.uniform(0, 0.4)
            x1, y1 = x0 + w_, y0 + h_; paso = r.uniform(10, 22) * ss
            for q in np.arange(x0, x1, paso): di.line([(q, y0), (q, y1)], fill=gris_claro, width=fino0)
            for q in np.arange(y0, y1, paso): di.line([(x0, q), (x1, q)], fill=gris_claro, width=fino0)
            for (a1, a2) in [((x0, y0), (x1, y0)), ((x1, y0), (x1, y1)), ((x1, y1), (x0, y1)), ((x0, y1), (x0, y0))]:
                n_ = int(math.hypot(a2[0] - a1[0], a2[1] - a1[1]) // (8 * ss)) or 1
                for q in range(0, n_, 2):
                    t0, t1 = q / n_, min(1, (q + 1) / n_)
                    di.line([(a1[0] + (a2[0] - a1[0]) * t0, a1[1] + (a2[1] - a1[1]) * t0), (a1[0] + (a2[0] - a1[0]) * t1, a1[1] + (a2[1] - a1[1]) * t1)], fill=tinta, width=fino0)
    # Pisos con trama dentro de los locales (baldosas, tablas o gris uniforme): siguen siendo fondo.
    if estilo["pisos"]:
        tipo_piso = r.choice(["grilla", "grilla", "tablas", "gris"])
        for (_, x0, y0, x1, y1) in p.locales:
            if r.random() < 0.25: continue
            a_, b_ = T(x0, y0), T(x1, y1); X0, X1 = sorted([a_[0], b_[0]]); Y0, Y1 = sorted([a_[1], b_[1]])
            if tipo_piso == "gris": di.rectangle([X0, Y0, X1, Y1], fill=tuple(min(255, c + 40) for c in gris_claro)); continue
            paso = r.uniform(7, 16) * ss
            for q in np.arange(X0, X1, paso): di.line([(q, Y0), (q, Y1)], fill=gris_claro, width=fino0)
            if tipo_piso == "grilla":
                for q in np.arange(Y0, Y1, paso): di.line([(X0, q), (X1, q)], fill=gris_claro, width=fino0)
    # Tramos de muro entre aberturas.
    for k, m in enumerate(p.muros):
        ax, ay, bx, by, t = m[:5]; L = math.hypot(bx - ax, by - ay)
        huecos = sorted((a[1], a[2]) for a in p.aberturas if a[0] == k)
        cortes, pos = [], 0.0
        for h0, h1 in huecos:
            if h0 > pos:
                cortes.append((pos, h0))
            pos = max(pos, h1)
        if pos < L:
            cortes.append((pos, L))
        for c0, c1 in cortes:
            pts = poly_muro(ax, ay, bx, by, t, c0 if c0 > 0 else None, c1 if c1 < L else None)
            dm.polygon(pts, fill=CLASES["muro"])
            if estilo["muro"] == "lleno":
                di.polygon(pts, fill=tinta)
            elif estilo["muro"] == "gris":
                g = (150, 150, 150) if not azul else (120, 150, 200); di.polygon(pts, fill=g, outline=tinta, width=lw)
            else:
                di.polygon(pts, outline=tinta, width=lw)
                if estilo["muro"] == "rayado":
                    capa = Image.new("L", (S, S), 0); dc = ImageDraw.Draw(capa); dc.polygon(pts, fill=255)
                    rayas = Image.new("L", (S, S), 0); dr = ImageDraw.Draw(rayas); paso = int(r.uniform(5, 10) * ss)
                    for q in range(-S, S, paso):
                        dr.line([(q, S), (q + S, 0)], fill=255, width=max(1, lw // 2))
                    hatch = Image.fromarray(np.minimum(np.array(capa), np.array(rayas)))
                    img.paste(Image.new("RGB", (S, S), tinta), (0, 0), hatch)
            vec["muros"].append([[v / ss for v in pts[0]], [v / ss for v in pts[1]], [v / ss for v in pts[2]], [v / ss for v in pts[3]]])

    # Aberturas.
    for (k, d0, d1, tipo, lado_giro) in p.aberturas:
        ax, ay, bx, by, t = p.muros[k][:5]; L = math.hypot(bx - ax, by - ay) or 1; ux, uy = (bx - ax) / L, (by - ay) / L; nx, ny = -uy, ux
        hueco = poly_muro(ax, ay, bx, by, t, d0, d1)
        A = (ax + ux * d0, ay + uy * d0); B = (ax + ux * d1, ay + uy * d1); ancho = d1 - d0
        if tipo == "ventana":
            dm.polygon(hueco, fill=CLASES["ventana"])
            for f in ([-0.5, 0.5] if estilo["ventana"] == 2 else [-0.5, 0, 0.5]):
                di.line([T(A[0] + nx * t * f, A[1] + ny * t * f), T(B[0] + nx * t * f, B[1] + ny * t * f)], fill=tinta, width=max(1, lw // 2 + 1))
            di.line([T(A[0] + nx * t / 2, A[1] + ny * t / 2), T(A[0] - nx * t / 2, A[1] - ny * t / 2)], fill=tinta, width=lw)
            di.line([T(B[0] + nx * t / 2, B[1] + ny * t / 2), T(B[0] - nx * t / 2, B[1] - ny * t / 2)], fill=tinta, width=lw)
        else:
            s = lado_giro; H = (A[0] + nx * s * ancho, A[1] + ny * s * ancho)
            hoja = [T(A[0] + nx * s * t / 2, A[1] + ny * s * t / 2), T(H[0], H[1])]
            # Máscara de puerta: el vano y el área de giro.
            arco = [T(A[0] + ancho * (math.cos(q) * ux + math.sin(q) * nx * s), A[1] + ancho * (math.cos(q) * uy + math.sin(q) * ny * s)) for q in np.linspace(0, math.pi / 2, 16)]
            dm.polygon(hueco, fill=CLASES["puerta"]); dm.polygon([T(*A)] + arco, fill=CLASES["puerta"])
            if estilo["puerta"] != "arco_punteado":
                di.line(hoja, fill=tinta, width=lw)
            if estilo["puerta"] != "hoja":
                if estilo["puerta"] == "arco_punteado":
                    for q in range(0, len(arco) - 1, 2):
                        di.line([arco[q], arco[q + 1]], fill=tinta, width=max(1, lw // 2))
                    di.line(hoja, fill=tinta, width=lw)
                else:
                    di.line(arco, fill=tinta, width=max(1, lw // 2))
        vec["aberturas"].append({"tipo": tipo, "vano": [[v / ss for v in q] for q in hueco]})

    # Muebles y artefactos.
    if estilo["muebles"]:
        for (tipo, cx, cy, w, h, rot) in p.muebles:
            pts = [T(cx - w / 2, cy - h / 2), T(cx + w / 2, cy - h / 2), T(cx + w / 2, cy + h / 2), T(cx - w / 2, cy + h / 2)]
            fino = max(1, lw // 2)
            if tipo in ("inodoro", "lavatorio"):
                bb = [min(q[0] for q in pts), min(q[1] for q in pts), max(q[0] for q in pts), max(q[1] for q in pts)]
                di.ellipse(bb, outline=tinta, width=fino); dm.ellipse(bb, fill=CLASES["mueble"])
            else:
                di.polygon(pts, outline=tinta, width=fino); dm.polygon(pts, fill=CLASES["mueble"])
                if tipo == "cama":
                    a, b = T(cx - w / 2 + 0.1, cy + h / 2 - 0.15), T(cx + w / 2 - 0.1, cy + h / 2 - 0.45)
                    di.rectangle([min(a[0], b[0]), min(a[1], b[1]), max(a[0], b[0]), max(a[1], b[1])], outline=tinta, width=fino)
                elif tipo == "ducha":
                    di.line([pts[0], pts[2]], fill=tinta, width=fino); di.line([pts[1], pts[3]], fill=tinta, width=fino)
            vec["muebles"].append({"tipo": tipo, "caja": [[v / ss for v in q] for q in pts]})

    # Mesadas de cocina: líneas paralelas a un muro con bachas (artefacto).
    if estilo["muebles"] and r.random() < 0.5 and p.locales:
        (_, x0, y0, x1, y1) = r.choice(p.locales)
        prof = 0.6; horiz = (x1 - x0) > (y1 - y0)
        q0, q1 = (T(x0 + 0.1, y1 - 0.1), T(x1 - 0.1, y1 - 0.1 - prof)) if horiz else (T(x0 + 0.1, y0 + 0.1), T(x0 + 0.1 + prof, y1 - 0.1))
        bb = [min(q0[0], q1[0]), min(q0[1], q1[1]), max(q0[0], q1[0]), max(q0[1], q1[1])]
        di.rectangle(bb, outline=tinta, width=max(1, lw // 2)); dm.rectangle(bb, fill=CLASES["mueble"])
        cx_, cy_ = (bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2; k_ = min(bb[2] - bb[0], bb[3] - bb[1]) * 0.3
        di.rectangle([cx_ - k_, cy_ - k_ * 0.8, cx_ + k_, cy_ + k_ * 0.8], outline=tinta, width=max(1, lw // 2))
    # Vegetación (árboles en planta: copa con trazos radiales) y autos fuera del edificio.
    def afuera(rad):
        for _ in range(30):
            x, y = r.uniform(rad, S - rad), r.uniform(rad, S - rad)
            if not (caja[0] - rad < x < caja[2] + rad and caja[1] - rad < y < caja[3] + rad): return x, y
        return None
    if estilo["vegetacion"]:
        for _ in range(r.randint(3, 12)):
            rad = r.uniform(8, 26) * ss; c_ = afuera(rad) if r.random() < 0.8 else (r.uniform(caja[0], caja[2]), r.uniform(caja[1], caja[3]))
            if not c_: continue
            x, y = c_; n_ = r.randint(7, 16)
            for q in range(n_):
                ang = 2 * math.pi * q / n_ + r.uniform(-0.2, 0.2); rr = rad * r.uniform(0.55, 1)
                di.line([(x, y), (x + rr * math.cos(ang), y + rr * math.sin(ang))], fill=tinta, width=max(1, lw // 2))
                if r.random() < 0.6: di.ellipse([x + rr * math.cos(ang) - 3 * ss, y + rr * math.sin(ang) - 3 * ss, x + rr * math.cos(ang) + 3 * ss, y + rr * math.sin(ang) + 3 * ss], outline=tinta, width=fino0)
            if r.random() < 0.5: di.ellipse([x - rad, y - rad, x + rad, y + rad], outline=tinta, width=fino0)
    if estilo["autos"]:
        for _ in range(r.randint(1, 2)):
            L_, W_ = r.uniform(55, 95) * ss, 0; W_ = L_ * 0.45
            vert = r.random() < 0.5; w_, h_ = (W_, L_) if vert else (L_, W_)
            c_ = afuera(max(w_, h_) / 2) if r.random() < 0.5 else (r.uniform(caja[0] + w_, max(caja[0] + w_ + 1, caja[2] - w_)), r.uniform(caja[1] + h_, max(caja[1] + h_ + 1, caja[3] - h_)))
            if not c_: continue
            x, y = c_; bb = [x - w_ / 2, y - h_ / 2, x + w_ / 2, y + h_ / 2]
            di.rounded_rectangle(bb, radius=int(min(w_, h_) * 0.3), outline=tinta, width=max(1, lw // 2))
            ins = [bb[0] + w_ * 0.15, bb[1] + h_ * 0.25, bb[2] - w_ * 0.15, bb[3] - h_ * 0.3] if vert else [bb[0] + w_ * 0.25, bb[1] + h_ * 0.15, bb[2] - w_ * 0.3, bb[3] - h_ * 0.15]
            di.rounded_rectangle(ins, radius=int(min(w_, h_) * 0.15), outline=tinta, width=fino0)
            dm.rounded_rectangle(bb, radius=int(min(w_, h_) * 0.3), fill=CLASES["mueble"])
    # Título, rótulo y logo fuera del dibujo (texto).
    if estilo["titulo"]:
        f4 = fuente(r.uniform(12, 20) * ss)
        txt = r.choice(["Planta baja", "PLANTA GENERAL", "Planta do Pav. terreo", "FLOOR PLAN", "First Floor", "PLANTA ARQUITECTURA ESC 1:100"])
        x, y = r.uniform(0.04, 0.4) * S, r.choice([r.uniform(0.9, 0.96), r.uniform(0.02, 0.06)]) * S
        bb = di.textbbox((x, y), txt, font=f4); di.text((x, y), txt, fill=tinta, font=f4); dm.rectangle(bb, fill=CLASES["texto"])
        if r.random() < 0.5:
            f5 = fuente(r.uniform(7, 10) * ss); t2 = r.choice(["AREA CONSTRUIDA TOTAL = 251.00 M2", "© 2026 Estudio de arquitectura", "SUP. CUBIERTA 148,50 m²"])
            bb = di.textbbox((x, y + 24 * ss), t2, font=f5); di.text((x, y + 24 * ss), t2, fill=tinta, font=f5); dm.rectangle(bb, fill=CLASES["texto"])
    # Textos de locales y superficies.
    if estilo["textos"]:
        f1 = fuente(r.uniform(9, 15) * ss); f2 = fuente(r.uniform(7, 11) * ss)
        for (nombre, x0, y0, x1, y1) in p.locales:
            cx, cy = T((x0 + x1) / 2, (y0 + y1) / 2)
            if estilo["ingles"]:
                pies = lambda m: f"{int(m * 3.2808)}'" + (f"{int(round((m * 3.2808 % 1) * 12))}\"" if r.random() < 0.5 else "")
                filas = [(INGLES.get(nombre, nombre.title()), f1, -8 * ss), (f"{pies(abs(x1 - x0))} x {pies(abs(y1 - y0))}", f2, 8 * ss)]
            else:
                filas = [(nombre, f1, -8 * ss), (f"{abs((x1 - x0) * (y1 - y0)):.2f} m²".replace(".", ","), f2, 8 * ss)]
            for txt, f, dy in filas:
                if r.random() < 0.15 and dy > 0:
                    continue
                bb = di.textbbox((cx, cy + dy), txt, font=f, anchor="mm")
                di.text((cx, cy + dy), txt, fill=tinta, font=f, anchor="mm"); dm.rectangle(bb, fill=CLASES["texto"])
    # Cotas exteriores (horizontal abajo y vertical a la izquierda).
    if estilo["cotas"]:
        f3 = fuente(r.uniform(8, 12) * ss)
        for (P0, P1, off) in [((minx, miny), (maxx, miny), (0, -margen * 0.55)), ((minx, miny), (minx, maxy), (-margen * 0.55, 0))]:
            a = T(P0[0] + off[0], P0[1] + off[1]); b = T(P1[0] + off[0], P1[1] + off[1])
            di.line([a, b], fill=tinta, width=max(1, lw // 2)); dm.line([a, b], fill=CLASES["texto"], width=max(3, lw))
            for q in (a, b):
                di.line([(q[0] - 6 * ss, q[1] + 6 * ss), (q[0] + 6 * ss, q[1] - 6 * ss)], fill=tinta, width=lw)
            val = f"{math.hypot(P1[0] - P0[0], P1[1] - P0[1]):.2f}".replace(".", ",")
            m_ = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
            bb = di.textbbox(m_, val, font=f3, anchor="mb"); di.text(m_, val, fill=tinta, font=f3, anchor="mb"); dm.rectangle(bb, fill=CLASES["texto"])

    img = img.resize((lado, lado), Image.LANCZOS); mask = mask.resize((lado, lado), Image.NEAREST)
    # Degradaciones: desenfoque, ruido, leve inclinación (foto/escaneo) y compresión JPEG.
    if r.random() < 0.35:
        img = img.filter(ImageFilter.GaussianBlur(r.uniform(0.3, 1.2)))
    arr = np.asarray(img).astype(np.float32)
    if r.random() < 0.5:
        arr += np.random.default_rng(r.randint(0, 2**31)).normal(0, r.uniform(2, 12), arr.shape)
    if r.random() < 0.3:  # sombra suave de foto
        g = np.linspace(r.uniform(0.75, 1), 1, lado)[None, :, None]
        arr *= g if r.random() < 0.5 else g.transpose(1, 0, 2)
    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    if r.random() < 0.25:
        ang = r.uniform(-3, 3); img = img.rotate(ang, resample=Image.BICUBIC, fillcolor=estilo["fondo"]); mask = mask.rotate(ang, resample=Image.NEAREST, fillcolor=0)
        vec["inclinacion"] = ang
    buf = io.BytesIO(); img.save(buf, "JPEG", quality=r.randint(55, 95)); img = Image.open(io.BytesIO(buf.getvalue())).convert("RGB")
    vec["estilo"] = {k: (list(v) if isinstance(v, tuple) else v) for k, v in estilo.items()}
    return img, mask, vec


def conexa(muros) -> bool:
    """True si los muros forman un solo edificio (se tocan entre sí); descarta locales sueltos."""
    cajas = [(min(w["a"][0], w["b"][0]) - .2, min(w["a"][1], w["b"][1]) - .2, max(w["a"][0], w["b"][0]) + .2, max(w["a"][1], w["b"][1]) + .2) for w in muros]
    if not cajas:
        return False
    grupo, cambio = {0}, True
    while cambio:
        cambio = False
        for i, c in enumerate(cajas):
            if i in grupo:
                continue
            if any(c[0] <= cajas[j][2] and cajas[j][0] <= c[2] and c[1] <= cajas[j][3] and cajas[j][1] <= c[3] for j in grupo):
                grupo.add(i); cambio = True
    return len(grupo) == len(cajas)


def color_mascara(mask: Image.Image) -> Image.Image:
    pal = np.array(COLOR_MASCARA, dtype=np.uint8); return Image.fromarray(pal[np.asarray(mask)])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--salida"); ap.add_argument("--cantidad", type=int, default=200); ap.add_argument("--motor")
    ap.add_argument("--semilla", type=int, default=1); ap.add_argument("--lado", type=int, default=768); ap.add_argument("--muestra")
    a = ap.parse_args(); r = random.Random(a.semilla)
    motor = [json.loads(l) for l in open(a.motor)] if a.motor and os.path.exists(a.motor) else []
    motor = [d for d in motor if conexa(d["walls"])]
    def planta():
        return desde_motor(r.choice(motor), r) if motor and r.random() < 0.1 else procedimental(r)
    if a.muestra:
        tiles = []
        for _ in range(6):
            im, mk, _ = dibujar(planta(), r, 384)
            tiles.append((im, color_mascara(mk)))
        hoja = Image.new("RGB", (384 * 4 + 30, 384 * 3 + 20), (255, 255, 255))
        for i, (im, mk) in enumerate(tiles):
            x, y = (i % 2) * (384 * 2 + 20), (i // 2) * (384 + 10)
            hoja.paste(im, (x, y)); hoja.paste(mk, (x + 384, y))
        hoja.save(a.muestra); print("muestra →", a.muestra); return
    os.makedirs(os.path.join(a.salida, "imagenes"), exist_ok=True); os.makedirs(os.path.join(a.salida, "mascaras"), exist_ok=True)
    os.makedirs(os.path.join(a.salida, "vectores"), exist_ok=True)
    for i in range(a.cantidad):
        im, mk, vec = dibujar(planta(), r, a.lado); n = f"{i:06d}"
        im.save(os.path.join(a.salida, "imagenes", n + ".jpg"), quality=92); mk.save(os.path.join(a.salida, "mascaras", n + ".png"))
        json.dump(vec, open(os.path.join(a.salida, "vectores", n + ".json"), "w"))
    json.dump({"clases": CLASES, "colores": COLOR_MASCARA, "cantidad": a.cantidad, "lado": a.lado}, open(os.path.join(a.salida, "dataset.json"), "w"), ensure_ascii=False, indent=1)
    print(a.cantidad, "muestras →", a.salida)


if __name__ == "__main__":
    main()
