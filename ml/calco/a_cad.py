"""Calco IA · paso 4: de la máscara de clases (salida de CalcoNet) a un plano CAD editable.

Entrada: máscara H×W con 0 fondo · 1 muro · 2 puerta · 3 ventana · 4 mueble/artefacto · 5 texto/cota.
Salida: plano `blackline.architecture.review.v1` (metros, eje Y hacia arriba) que el programa inserta con
muros nativos, aberturas en su muro y bloques del catálogo en su lugar, ángulo y tamaño.

Escala sin cotas: el ancho de las puertas de los locales (hoja típica 0,80 m) y, si no hay puertas,
el largo de los inodoros (0,70 m); en último caso el espesor de muro (0,15 m). Corre en Python con
NumPy y OpenCV, también dentro del navegador (Pyodide).
"""
import json, math
import cv2
import numpy as np

MURO, PUERTA, VENTANA, MUEBLE, TEXTO = 1, 2, 3, 4, 5
PUERTA_M, INODORO_M, MURO_M = 0.90, 0.70, 0.15  # vano de puerta de local (hoja 0,80 + marcos)


# ------------------------------------------------------------------ utilidades
def _espesor(mask):
    """Espesor típico de muro en px: 2 × mediana del máximo local de la distancia al borde."""
    if mask.sum() < 20:
        return 0
    d = cv2.distanceTransform(mask.astype(np.uint8), cv2.DIST_L2, 3)
    dil = cv2.dilate(d, np.ones((3, 3), np.uint8))
    ridge = d[(d == dil) & (d >= 1)]
    return float(2 * np.median(ridge)) if ridge.size else 0


def _segmentos(mask, T):
    """Muros ortogonales: tramos horizontales y verticales (eje, desde, hasta, espesor) en px."""
    segs = []
    L = max(3, int(round(T * 2.2)))
    for vertical in (False, True):
        k = np.ones((L, 1) if vertical else (1, L), np.uint8)
        m = cv2.morphologyEx(mask.astype(np.uint8), cv2.MORPH_OPEN, k)
        n, lab, st, _ = cv2.connectedComponentsWithStats(m, 8)
        for i in range(1, n):
            x, y, w, h, a = st[i]
            largo, ancho = (h, w) if vertical else (w, h)
            if largo < 2 * T or ancho < 0.5 * T or ancho > 3.2 * T:
                continue
            ys, xs = np.where(lab[y:y + h, x:x + w] == i)
            c = float(np.median(xs + x)) if vertical else float(np.median(ys + y))
            lo, hi = (y, y + h - 1) if vertical else (x, x + w - 1)
            segs.append({"v": vertical, "c": c, "lo": float(lo), "hi": float(hi), "t": float(min(ancho, 2.5 * T))})
    return _unir_colineales(segs, T)


def _unir_colineales(segs, T, hueco=0):
    out = []
    for v in (False, True):
        g = sorted([s for s in segs if s["v"] == v], key=lambda s: (round(s["c"] / max(1, T * 0.6)), s["lo"]))
        for s in g:
            p = next((q for q in out if q["v"] == v and abs(q["c"] - s["c"]) < T * 0.6 and s["lo"] <= q["hi"] + hueco + 1 and s["hi"] >= q["lo"] - hueco - 1), None)
            if p:
                p["lo"], p["hi"] = min(p["lo"], s["lo"]), max(p["hi"], s["hi"]); p["t"] = max(p["t"], s["t"])
            else:
                out.append(dict(s))
    return out


def _encajar(segs, T):
    """Prolonga extremos hasta el eje del muro perpendicular más cercano (esquinas y encuentros en T)."""
    for s in segs:
        for lado in ("lo", "hi"):
            mejor = None
            for o in segs:
                if o["v"] == s["v"] or not (o["lo"] - T <= s["c"] <= o["hi"] + T):
                    continue
                d = o["c"] - s[lado]
                if abs(d) <= 1.6 * T and (mejor is None or abs(d) < abs(mejor)):
                    mejor = d
            if mejor is not None:
                s[lado] += mejor
    return segs


def _componentes(mask, minimo):
    n, lab, st, cen = cv2.connectedComponentsWithStats(mask.astype(np.uint8), 8)
    return [(lab == i, st[i], cen[i]) for i in range(1, n) if st[i][4] >= minimo]


# ------------------------------------------------------------------ aberturas
def _huecos(segs, T):
    """Pares de tramos colineales separados por un hueco: candidatos a abertura (px)."""
    out = []
    for v in (False, True):
        g = sorted([s for s in segs if s["v"] == v], key=lambda s: s["lo"])
        for i, a in enumerate(g):
            for b in g:
                if b is a or abs(a["c"] - b["c"]) > T * 0.6 or b["lo"] <= a["hi"]:
                    continue
                gap = b["lo"] - a["hi"]
                if 0.25 * T * 4 <= gap <= T * 22:
                    out.append({"v": v, "c": (a["c"] + b["c"]) / 2, "lo": a["hi"], "hi": b["lo"], "a": a, "b": b, "t": max(a["t"], b["t"])})
    # Puerta junto a una esquina o encuentro: el hueco va del extremo de un tramo a la cara del muro perpendicular.
    for s in segs:
        for o in segs:
            if o["v"] == s["v"] or not (o["lo"] - T <= s["c"] <= o["hi"] + T):
                continue
            for lado in ("hi", "lo"):
                d = (o["c"] - o["t"] / 2 - s["hi"]) if lado == "hi" else (s["lo"] - (o["c"] + o["t"] / 2))
                if not (T * 1.0 <= d <= T * 22):
                    continue
                if lado == "hi" and o["c"] <= s["hi"] or lado == "lo" and o["c"] >= s["lo"]:
                    continue
                lo, hi = (s["hi"], o["c"] - o["t"] / 2) if lado == "hi" else (o["c"] + o["t"] / 2, s["lo"])
                if any(q is not s and q["v"] == s["v"] and abs(q["c"] - s["c"]) < T * .6 and q["lo"] < hi and q["hi"] > lo for q in segs):
                    continue
                out.append({"v": s["v"], "c": s["c"], "lo": lo, "hi": hi, "a": s, "b": None, "o": o, "lado_o": lado, "t": s["t"]})
    return out


def _puertas(mask, segs, T):
    door = (mask == PUERTA).astype(np.uint8)
    res = []
    for comp, st, cen in _componentes(door, max(6, int(T * T))):
        x, y, w, h, _ = st
        mejor = None
        for g in _huecos(segs, T):
            # el hueco debe caer sobre la puerta: eje del muro dentro de la caja y solapamiento a lo largo
            if g["v"]:
                ok = x - T <= g["c"] <= x + w + T and min(g["hi"], y + h) - max(g["lo"], y) > 0.5 * (g["hi"] - g["lo"])
            else:
                ok = y - T <= g["c"] <= y + h + T and min(g["hi"], x + w) - max(g["lo"], x) > 0.5 * (g["hi"] - g["lo"])
            if ok and (mejor is None or g["hi"] - g["lo"] < mejor["hi"] - mejor["lo"]):
                mejor = g
        if not mejor:
            continue
        ys, xs = np.where(comp)
        # Lado de giro: de qué lado del muro está la mayor parte del barrido; bisagra: extremo más cercano al centroide.
        if mejor["v"]:
            lado = 1 if xs.mean() > mejor["c"] else -1; t_c = ys.mean()
        else:
            lado = 1 if ys.mean() > mejor["c"] else -1; t_c = xs.mean()
        bisagra = "lo" if abs(t_c - mejor["lo"]) < abs(t_c - mejor["hi"]) else "hi"
        res.append({**mejor, "lado": lado, "bisagra": bisagra, "ancho_px": mejor["hi"] - mejor["lo"]})
    return res


def _ventanas(mask, segs, T):
    win = (mask == VENTANA).astype(np.uint8)
    res = []
    for comp, st, cen in _componentes(win, max(4, int(T * T * 0.5))):
        x, y, w, h, _ = st
        v = h > w
        lo, hi = (y, y + h) if v else (x, x + w)
        c = x + w / 2 if v else y + h / 2
        host = min((s for s in segs if s["v"] == v and abs(s["c"] - c) < 1.5 * T and s["lo"] - T <= lo and hi <= s["hi"] + T),
                   key=lambda s: abs(s["c"] - c), default=None)
        if host and hi - lo > 1.5 * T:
            res.append({"host": host, "lo": float(lo), "hi": float(hi)})
    return res


# ------------------------------------------------------------------ escala
def escala(mask, segs, T, puertas, real_width_m=None, ancho_px=None):
    """Píxeles por metro y de dónde salió."""
    if real_width_m and ancho_px:
        return ancho_px / real_width_m, "medida indicada"
    interiores = sorted(p["ancho_px"] for p in puertas)
    if len(interiores) >= 1:
        # La puerta más común de un local es de 0,80 m; la mediana evita puertas dobles o de entrada.
        return float(np.median(interiores)) / PUERTA_M, f"{len(interiores)} puerta(s) ≈ {PUERTA_M:.2f} m"
    largos = []
    for comp, st, cen in _componentes(mask == MUEBLE, 10):
        rect = cv2.minAreaRect(np.column_stack(np.where(comp))[:, ::-1].astype(np.float32))
        a, b = sorted(rect[1])
        if 1.3 < b / max(a, 1) < 2.2 and b < 12 * T:
            largos.append(b)
    if largos:
        return float(np.median(largos)) / INODORO_M, f"inodoro ≈ {INODORO_M:.2f} m"
    return T / MURO_M, f"espesor de muro ≈ {MURO_M:.2f} m"


# ------------------------------------------------------------------ bloques
# (catálogo, tamaño de la pieza en m: ancho × profundidad, respaldo en y=0 o y=D, junto a muro)
CATALOGO = [
    ("san-wc", 0.40, 0.70, 0, True), ("san-lav", 0.60, 0.48, 0, True), ("san-ducha", 0.90, 0.90, 0, True),
    ("san-banera", 1.70, 0.75, 0, True), ("dor-cama1", 0.90, 2.00, 1, True), ("dor-queen", 1.60, 2.00, 1, True),
    ("mob-sofa3", 2.30, 0.92, 1, True), ("mob-sofa2", 1.70, 0.90, 1, True), ("mob-mesa4", 1.20, 1.80, None, False),
    ("mob-mesa-red", 1.10, 1.10, None, False), ("kq-anafe4", 0.60, 0.60, 0, True), ("kq-heladera", 0.70, 0.70, 0, True),
    ("veh-auto", 1.80, 4.40, None, False), ("mob-placard", 1.80, 0.62, 0, True),
]


def clasificar(a, b, relleno):
    """a ≤ b en metros → id de catálogo, o None (queda como rectángulo propio, sin adivinar)."""
    def cerca(x, y, tx, ty, tol=0.18):
        return abs(x - tx) <= tol * tx + 0.06 and abs(y - ty) <= tol * ty + 0.06
    if cerca(a, b, 0.40, 0.70, .22) or cerca(a, b, 0.38, 0.60, .2): return "san-wc"
    if cerca(a, b, 0.45, 0.58, .25) and b < 0.75: return "san-lav"
    if 0.7 <= a <= 1.05 and 0.7 <= b <= 1.25 and b - a < 0.3 and relleno < 0.85: return "san-ducha"
    if 0.68 <= a <= 0.85 and 1.45 <= b <= 1.9: return "san-banera"
    if 0.52 <= a <= 0.68 and 1.2 <= b <= 3.2 and relleno > 0.6: return "mob-placard"
    if 1.6 <= a <= 2.1 and 3.8 <= b <= 5.2: return "veh-auto"
    if 1.3 <= a <= 2.1 and 1.8 <= b <= 2.3: return "dor-queen"
    if 0.8 <= a <= 1.15 and 1.8 <= b <= 2.2: return "dor-cama1"
    if 0.78 <= a <= 1.05 and 1.6 <= b <= 2.9: return "mob-sofa3" if b > 2.05 else "mob-sofa2"
    if 0.9 <= a <= 1.4 and 1.4 < b <= 2.6: return "mob-mesa4"
    if 0.9 <= a <= 1.4 and b <= 1.45 and b - a < .2: return "mob-mesa-red"
    if cerca(a, b, 0.58, 0.62, .18): return "kq-anafe4"
    return None


def locales(mask, puertas, T):
    """Etiquetas de locales: espacio libre cerrado por muros, con los vanos de puerta cerrados."""
    cerr = ((mask == MURO) | (mask == VENTANA)).astype(np.uint8)
    for p in puertas:
        a, b = int(p["lo"]), int(p["hi"]); c = int(round(p["c"])); t = max(1, int(p["t"] / 2))
        if p["v"]: cerr[a:b, max(0, c - t):c + t + 1] = 1
        else: cerr[max(0, c - t):c + t + 1, a:b] = 1
    cerr = cv2.dilate(cerr, np.ones((3, 3), np.uint8))
    n, lab = cv2.connectedComponents((1 - cerr).astype(np.uint8), connectivity=4)
    H, W = mask.shape; borde = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])))
    return lab, {i: int((lab == i).sum()) for i in range(1, n) if i not in borde}


SANITARIO = {"san-wc", "san-lav", "san-ducha", "san-banera"}


def _bloques(mask, segs, T, ppm, alto, lab=None, areas=None):
    piezas = []
    info = {c[0]: c for c in CATALOGO}
    for comp, st, cen in _componentes(mask == MUEBLE, max(8, int((0.25 * ppm) ** 2 * 0.3))):
        pts = np.column_stack(np.where(comp))[:, ::-1].astype(np.float32)
        (cx, cy), (w, h), ang = cv2.minAreaRect(pts)
        a, b = sorted((w / ppm, h / ppm))
        if b < 0.25 or b > 6:
            continue
        relleno = comp.sum() / max(1.0, w * h)
        cat = clasificar(a, b, relleno)
        # Contexto del local: sanitarios solo en locales chicos; camas solo en locales de dormitorio.
        if lab is not None:
            li = int(lab[int(min(max(cy, 0), lab.shape[0] - 1)), int(min(max(cx, 0), lab.shape[1] - 1))])
            area = areas.get(li, 0) / ppm ** 2 if areas else 0
            if area <= 0: pass  # local no cerrado: sin contexto, se confía en la medida
            elif cat in SANITARIO and not (1.2 <= area <= 9.5): cat = None
            elif cat and cat.startswith("dor-") and not (6 <= area <= 30): cat = None
            elif cat == "mob-placard" and not (5 <= area <= 30 and a <= 0.68): cat = None
            elif cat in ("mob-sofa3", "mob-sofa2", "mob-mesa4", "mob-mesa-red") and 0 < area < 6: cat = None
        # Muro más cercano (para que el respaldo quede contra el muro).
        mejor, dmin = None, 1e9
        for s in segs:
            if s["v"]:
                qx, qy = s["c"], min(max(cy, s["lo"]), s["hi"])
            else:
                qx, qy = min(max(cx, s["lo"]), s["hi"]), s["c"]
            d = math.hypot(cx - qx, cy - qy)
            if d < dmin:
                dmin, mejor = d, (qx, qy)
        X, Y = cx / ppm, (alto - cy) / ppm  # metros, Y hacia arriba
        if cat:
            _, W, D, respaldo, junto = info[cat]
            if junto and mejor and dmin / ppm < max(W, D) * 0.9 + 0.3:
                nx, ny = (cx - mejor[0]), -(cy - mejor[1])  # desde el muro hacia la pieza (Y arriba)
                L = math.hypot(nx, ny) or 1; nx, ny = nx / L, ny / L
                # Ejes ortogonales: se redondea la normal a la dirección dominante.
                if abs(nx) > abs(ny): nx, ny = math.copysign(1, nx), 0.0
                else: nx, ny = 0.0, math.copysign(1, ny)
                fx, fy = (nx, ny) if respaldo == 0 else (-nx, -ny)  # dirección del frente (+y local)
                rot = math.degrees(math.atan2(-fx, fy))
            else:
                largo_x = (w >= h) == (abs(((ang % 180) + 180) % 180) < 45)
                rot = 0.0 if (D >= W) != largo_x else 90.0
            # El importador centra el bloque del catálogo en la huella (caja alineada de la pieza en la imagen).
            bx, by, bw, bh, _ = st
            piezas.append({"catalogId": cat, "role": cat, "point": [round(bx / ppm, 3), round((alto - by - bh) / ppm, 3)], "rotation": round(rot % 360, 1), "scale": 1,
                           "layer": "FIXTURES" if cat.startswith("san") else "VEHICLES" if cat.startswith("veh") else "KITCHEN" if cat.startswith("kq") else "FURNITURE",
                           "sourceFootprintPx": [float(bx), float(by), float(bx + bw), float(by + bh)], "size_m": [round(a, 2), round(b, 2)]})
        else:
            bx, by, bw, bh, _ = st
            piezas.append({"catalogId": None, "role": "rect", "rect_m": [round(bx / ppm, 3), round((alto - by - bh) / ppm, 3), round(bw / ppm, 3), round(bh / ppm, 3)],
                           "angle": round(float(ang), 1), "size_m": [round(a, 2), round(b, 2)]})
    return piezas


# ------------------------------------------------------------------ plano completo
def a_plano(mask, real_width_m=None):
    H, W = mask.shape
    muros = (mask == MURO) | (mask == VENTANA)  # la ventana es parte del muro anfitrión
    muros = cv2.morphologyEx(muros.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8)).astype(bool)
    T = _espesor(muros) or 4
    segs = _encajar(_segmentos(muros, T), T)
    puertas = _puertas(mask, segs, T)
    ppm, fuente = escala(mask, segs, T, puertas, real_width_m, W if real_width_m else None)
    m = lambda px: px / ppm
    walls, openings, used = [], [], set()
    # Muros anfitriones: cada puerta une los dos tramos de su hueco en un solo muro con la abertura.
    hosts = []
    for p in puertas:
        a, b = p["a"], p["b"]
        if id(a) in used or (b is not None and id(b) in used):
            continue
        used.add(id(a))
        if b is not None:
            used.add(id(b)); lo, hi = min(a["lo"], b["lo"]), max(a["hi"], b["hi"])
        else:  # hasta el eje del muro perpendicular
            o = p["o"]; lo, hi = (a["lo"], o["c"]) if p["lado_o"] == "hi" else (o["c"], a["hi"])
            p = {**p, "lo": p["lo"] + (0 if p["lado_o"] == "hi" else 1), "hi": p["hi"] - (1 if p["lado_o"] == "hi" else 0)}
        hosts.append(({"v": p["v"], "c": p["c"], "lo": lo, "hi": hi, "t": p["t"]}, [("door", p)]))
    for s in segs:
        if id(s) not in used:
            hosts.append((s, []))
    for v in _ventanas(mask, segs, T):
        for h, ops in hosts:
            if h is v["host"] or (h["v"] == v["host"]["v"] and abs(h["c"] - v["host"]["c"]) < T and h["lo"] <= v["lo"] and v["hi"] <= h["hi"]):
                ops.append(("window", v)); break
    for i, (h, ops) in enumerate(hosts):
        t = min(0.45, max(0.08, m(h["t"])))
        if h["v"]:
            A, B = (h["c"], h["lo"]), (h["c"], h["hi"])
        else:
            A, B = (h["lo"], h["c"]), (h["hi"], h["c"])
        a = [round(m(A[0]), 3), round(m(H - A[1]), 3)]; b = [round(m(B[0]), 3), round(m(H - B[1]), 3)]
        L = math.hypot(b[0] - a[0], b[1] - a[1])
        if L < 0.3:
            continue
        wid = f"w{i}"
        walls.append({"id": wid, "a": a, "b": b, "thickness": round(t, 3)})
        for kind, o in ops:
            lo, hi = (o["lo"], o["hi"])
            width = m(hi - lo); off = m((lo + hi) / 2 - h["lo"])
            if not (0.3 <= width <= 5) or off - width / 2 <= t / 2 or off + width / 2 >= L - t / 2:
                continue
            item = {"host": wid, "kind": "framed-window" if kind == "window" else ("double-door" if width > 1.25 else "swing-door"),
                    "offset": round(off, 3), "width": round(width, 3), "nativeMarginOK": True}
            if kind == "door":
                # Bisagra en el extremo inicial del muro (A) salvo que esté del otro lado; el lado del barrido define el espejo.
                rev = o["bisagra"] == "hi"
                lado = o["lado"] if h["v"] else -o["lado"]  # Y de imagen hacia abajo → Y CAD hacia arriba
                item["orientation"] = {"reverseHostDirection": bool(rev), "mirror": bool((lado < 0) != rev)}
            openings.append(item)
    lab, areas = locales(mask, puertas, T)
    blocks = _bloques(mask, segs, T, ppm, H, lab, areas)
    custom = {}
    final_blocks = []
    for j, b in enumerate(blocks):
        if b["catalogId"]:
            final_blocks.append(b)
        else:
            x, y, w, h = b["rect_m"]
            if w < 0.2 or h < 0.2 or w * h > 12:
                continue
            cid = f"calco-rect-{j}"
            custom[cid] = {"primitives": [{"type": "rect", "a": [0, 0], "b": [round(w, 3), round(h, 3)]}]}
            final_blocks.append({"catalogId": cid, "role": "pieza", "point": [x, y], "rotation": 0, "scale": 1, "layer": "FURNITURE",
                                 "sourceFootprintPx": [x * ppm, (H / ppm - y - h) * ppm, (x + w) * ppm, (H / ppm - y) * ppm]})
    return {"schema": "blackline.architecture.review.v1", "units": "m", "walls": walls, "openings": openings, "blocks": final_blocks,
            "customBlockDefinitions": custom, "scale": {"pixelsPerUnit": round(ppm, 3), "source": fuente, "wallPx": round(T, 2)},
            "summary": {"muros": len(walls), "puertas": sum(1 for o in openings if o["kind"] != "framed-window"),
                        "ventanas": sum(1 for o in openings if o["kind"] == "framed-window"), "bloques": len(final_blocks)}}


if __name__ == "__main__":
    import sys
    from PIL import Image
    mk = np.array(Image.open(sys.argv[1]))
    print(json.dumps(a_plano(mk)["summary"], ensure_ascii=False))
