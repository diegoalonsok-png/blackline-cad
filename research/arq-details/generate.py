"""Detalles constructivos CAD2D3D (originales, en metros) -> DXF editable + miniatura SVG.
Cortes esquemáticos habituales de la construcción tradicional argentina (Construcciones I):
espesores de referencia; verificar siempre con el proyecto, el cálculo estructural y la normativa.
Uso: python3 research/arq-details/generate.py
"""
import json, math, os

OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'arq-details', 'v1')
os.makedirs(OUT, exist_ok=True)

# material -> (DXF pattern, pattern scale, preview fill)
MAT = {
    'ladrillo': ('BRICK', 0.004, '#d8a487'),
    'hueco': ('ANSI31', 0.006, '#e3b9a0'),
    'hormigon': ('AR-CONC', 0.002, '#c9c9c4'),
    'tierra': ('EARTH', 0.006, '#cbb592'),
    'revoque': ('AR-SAND', 0.0015, '#efe6d2'),
    'contrapiso': ('AR-SAND', 0.003, '#dcd6c6'),
    'aislacion': ('HONEY', 0.004, '#f4e98c'),
    'acero': ('STEEL', 0.002, '#9fb3c4'),
    'madera': ('ANSI31', 0.004, '#d9b77e'),
    'yeso': ('AR-SAND', 0.001, '#f7f5ef'),
    'membrana': ('SOLID', 1, '#3d3f44'),
    'piso': ('ANSI31', 0.0025, '#b9c6cf'),
    'vidrio': ('SOLID', 1, '#bfe3ee'),
}
LAYERS = [('A-DET-CORTE', 7, 50), ('A-DET-SOMBREADO', 8, 13), ('A-DET-TEXTO', 7, 18), ('A-DET-EJES', 1, 13)]


class Detail:
    def __init__(self, id, es, en, tags, scale='1:10'):
        self.id, self.es, self.en, self.tags, self.scale = id, es, en, tags, scale
        self.polys, self.hatches, self.lines, self.texts = [], [], [], []

    def rect(self, x, y, w, h, mat=None, outline=True):
        pts = [(x, y), (x + w, y), (x + w, y + h), (x, y + h)]
        return self.poly(pts, mat, outline)

    def poly(self, pts, mat=None, outline=True, closed=True):
        if mat:
            self.hatches.append((pts, mat))
        if outline:
            self.polys.append((pts, closed))
        return pts

    def line(self, a, b, layer='A-DET-CORTE'):
        self.lines.append((a, b, layer))

    def note(self, at, text_at, text, h=0.012):
        """Leader from `at` to `text_at` plus a short shoulder and the label."""
        self.lines.append((at, text_at, 'A-DET-TEXTO'))
        right = text_at[0] >= at[0]
        sh = (text_at[0] + (0.03 if right else -0.03), text_at[1])
        self.lines.append((text_at, sh, 'A-DET-TEXTO'))
        self.texts.append((sh[0] + (0.008 if right else -0.008 - len(text) * h * 0.62), sh[1] - h / 2, h, text))

    def label(self, x, y, text, h=0.018):
        self.texts.append((x, y, h, text))

    def breakline(self, x0, x1, y):
        m = (x0 + x1) / 2
        d = (x1 - x0)
        self.poly([(x0 - 0.02, y), (m - d * 0.06, y), (m - d * 0.02, y + 0.03), (m + d * 0.02, y - 0.03), (m + d * 0.06, y), (x1 + 0.02, y)], closed=False)

    def level(self, x, y, text, w=0.25):
        self.lines.append(((x, y), (x + w, y), 'A-DET-EJES'))
        self.poly([(x + 0.03, y), (x + 0.05, y + 0.025), (x + 0.01, y + 0.025)], closed=True)
        self.texts.append((x + 0.06, y + 0.008, 0.012, text))

    # ---------------- DXF ----------------
    def bounds(self):
        xs, ys = [], []
        for pts, _ in self.polys:
            for x, y in pts:
                xs.append(x); ys.append(y)
        for pts, _ in self.hatches:
            for x, y in pts:
                xs.append(x); ys.append(y)
        for a, b, _ in self.lines:
            xs += [a[0], b[0]]; ys += [a[1], b[1]]
        for x, y, h, t in self.texts:
            xs += [x, x + len(t) * h * 0.62]; ys += [y, y + h]
        return min(xs), min(ys), max(xs), max(ys)

    def dxf(self):
        o = []
        def g(c, v): o.append(str(c)); o.append(str(v))
        g(0, 'SECTION'); g(2, 'HEADER'); g(9, '$ACADVER'); g(1, 'AC1015'); g(9, '$INSUNITS'); g(70, 6); g(0, 'ENDSEC')
        g(0, 'SECTION'); g(2, 'TABLES'); g(0, 'TABLE'); g(2, 'LAYER'); g(70, len(LAYERS))
        for n, c, lw in LAYERS:
            g(0, 'LAYER'); g(2, n); g(70, 0); g(62, c); g(6, 'CONTINUOUS'); g(370, lw)
        g(0, 'ENDTAB'); g(0, 'ENDSEC')
        g(0, 'SECTION'); g(2, 'ENTITIES')
        for pts, mat in self.hatches:
            pat, sc, _ = MAT[mat]
            g(0, 'HATCH'); g(8, 'A-DET-SOMBREADO'); g(10, 0); g(20, 0); g(30, 0); g(210, 0); g(220, 0); g(230, 1)
            g(2, pat); g(70, 1 if pat == 'SOLID' else 0); g(71, 0); g(91, 1)
            g(92, 3); g(72, 0); g(73, 1); g(93, len(pts))
            for x, y in pts:
                g(10, round(x, 5)); g(20, round(y, 5))
            g(97, 0); g(75, 0); g(76, 1)
            if pat != 'SOLID':
                g(52, 0); g(41, sc); g(77, 0); g(78, 0)
            g(98, 0)
        for pts, closed in self.polys:
            g(0, 'LWPOLYLINE'); g(8, 'A-DET-CORTE'); g(90, len(pts)); g(70, 1 if closed else 0)
            for x, y in pts:
                g(10, round(x, 5)); g(20, round(y, 5))
        for a, b, layer in self.lines:
            g(0, 'LINE'); g(8, layer); g(10, round(a[0], 5)); g(20, round(a[1], 5)); g(30, 0); g(11, round(b[0], 5)); g(21, round(b[1], 5)); g(31, 0)
        for x, y, h, t in self.texts:
            g(0, 'TEXT'); g(8, 'A-DET-TEXTO'); g(10, round(x, 5)); g(20, round(y, 5)); g(30, 0); g(40, h); g(1, t)
        g(0, 'ENDSEC'); g(0, 'EOF')
        return '\n'.join(o) + '\n'

    def svg(self):
        x0, y0, x1, y1 = self.bounds()
        pad = 0.04
        W, H = x1 - x0 + 2 * pad, y1 - y0 + 2 * pad
        sw = max(W, H) / 400
        tr = lambda p: f'{p[0]:.4f},{-p[1]:.4f}'
        s = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0 - pad:.4f} {-y1 - pad:.4f} {W:.4f} {H:.4f}" style="width:100%;height:142px;display:block;background:#fbf8f1" role="img" aria-label="{self.es}">']
        for pts, mat in self.hatches:
            s.append(f'<polygon points="{" ".join(map(tr, pts))}" fill="{MAT[mat][2]}" stroke="none"/>')
        for pts, closed in self.polys:
            tag = 'polygon' if closed else 'polyline'
            s.append(f'<{tag} points="{" ".join(map(tr, pts))}" fill="none" stroke="#2c3035" stroke-width="{sw * 1.6:.4f}"/>')
        for a, b, layer in self.lines:
            col = '#6b6f75' if layer == 'A-DET-TEXTO' else '#b04646' if layer == 'A-DET-EJES' else '#2c3035'
            s.append(f'<line x1="{a[0]:.4f}" y1="{-a[1]:.4f}" x2="{b[0]:.4f}" y2="{-b[1]:.4f}" stroke="{col}" stroke-width="{sw:.4f}"/>')
        for x, y, h, t in self.texts:
            s.append(f'<text x="{x:.4f}" y="{-y:.4f}" font-size="{h:.4f}" font-family="Arial" fill="#30343a">{t.replace("&", "&amp;").replace("<", "&lt;")}</text>')
        s.append('</svg>')
        return ''.join(s)


D = []

# 1 Muro de ladrillo común 0,30 con revoques
d = Detail('muro-ladrillo-comun-30', 'Muro de ladrillo común 0,30 con revoques', 'Solid brick wall 0.30 with plaster', 'muro pared ladrillo comun mamposteria revoque wall brick masonry plaster', '1:5')
H = 0.6
d.rect(0, 0, 0.005, H, 'revoque'); d.rect(0.005, 0, 0.015, H, 'revoque'); d.rect(0.02, 0, 0.005, H, 'membrana', False)
d.rect(0.025, 0, 0.255, H, 'ladrillo'); d.rect(0.28, 0, 0.015, H, 'revoque'); d.rect(0.295, 0, 0.005, H, 'revoque')
d.breakline(0, 0.3, H); d.breakline(0, 0.3, 0)
d.note((0.0025, 0.5), (-0.12, 0.62), 'Revoque fino a la cal 5 mm (exterior)')
d.note((0.012, 0.42), (-0.12, 0.47), 'Revoque grueso 15 mm')
d.note((0.0225, 0.32), (-0.12, 0.32), 'Azotado hidrófugo 5 mm')
d.note((0.15, 0.2), (0.42, 0.24), 'Mampostería de ladrillo común 0,25')
d.note((0.29, 0.1), (0.42, 0.1), 'Revoque grueso + fino interior 20 mm')
d.label(0.0, -0.1, 'MURO EXTERIOR DE LADRILLO COMÚN e = 0,30 m · esc. 1:5')
D.append(d)

# 2 Muro de ladrillo hueco 0,18
d = Detail('muro-ladrillo-hueco-18', 'Muro de ladrillo cerámico hueco 0,18 con revoques', 'Hollow ceramic brick wall 0.18', 'muro pared ladrillo hueco ceramico tabique revoque wall hollow brick', '1:5')
d.rect(0, 0, 0.02, H, 'revoque'); d.rect(0.02, 0, 0.18, H, 'hueco')
for i in range(3):
    for j in range(2):
        d.rect(0.035 + i * 0.055, 0.02 + j * 0.28, 0.04, 0.24)
d.rect(0.2, 0, 0.02, H, 'revoque'); d.breakline(0, 0.22, H); d.breakline(0, 0.22, 0)
d.note((0.01, 0.5), (-0.12, 0.55), 'Revoque completo exterior 20 mm')
d.note((0.11, 0.3), (0.35, 0.35), 'Ladrillo cerámico hueco 18 × 18 × 33')
d.note((0.21, 0.1), (0.35, 0.1), 'Revoque completo interior 20 mm')
d.label(0.0, -0.1, 'MURO DE LADRILLO HUECO e = 0,22 m terminado · esc. 1:5')
D.append(d)

# 3 Muro doble con cámara y aislación
d = Detail('muro-doble-camara-aislacion', 'Muro doble con cámara de aire y aislación térmica', 'Cavity wall with thermal insulation', 'muro doble camara aire aislacion termica ladrillo visto cavity wall insulation', '1:5')
d.rect(0, 0, 0.12, H, 'ladrillo'); d.rect(0.12, 0, 0.005, H, 'membrana', False); d.rect(0.125, 0, 0.03, H, 'aislacion'); d.rect(0.155, 0, 0.02, H)
d.rect(0.175, 0, 0.12, H, 'hueco'); d.rect(0.295, 0, 0.02, H, 'revoque')
for y in (0.15, 0.45):
    d.line((0.06, y), (0.235, y), 'A-DET-CORTE')
d.breakline(0, 0.315, H); d.breakline(0, 0.315, 0)
d.note((0.06, 0.52), (-0.12, 0.6), 'Ladrillo visto 0,12 (exterior)')
d.note((0.122, 0.38), (-0.12, 0.4), 'Azotado hidrófugo + pintura asfáltica')
d.note((0.14, 0.3), (-0.12, 0.27), 'Poliestireno expandido 30 mm')
d.note((0.165, 0.2), (0.45, 0.22), 'Cámara de aire 20 mm')
d.note((0.1, 0.45), (0.45, 0.5), 'Llaves de unión c/ 0,30 m (ventiladas)')
d.note((0.235, 0.08), (0.45, 0.08), 'Ladrillo hueco 0,12 + revoque interior')
d.label(0.0, -0.1, 'MURO DOBLE CON CÁMARA Y AISLACIÓN e = 0,32 m · esc. 1:5')
D.append(d)

# 4 Fundación: zapata corrida + viga + capa aisladora
d = Detail('fundacion-zapata-corrida', 'Fundación de zapata corrida con viga de encadenado y capa aisladora', 'Strip footing with ground beam and damp-proof course', 'fundacion cimiento zapata corrida viga encadenado capa aisladora horizontal strip footing foundation', '1:20')
d.poly([(-0.55, -0.9), (0.85, -0.9), (0.85, 0.0), (0.3, 0.0), (0.3, -0.6), (0.0, -0.6), (0.0, -0.05), (-0.55, -0.05)], 'tierra', False)
d.rect(-0.15, -0.9, 0.6, 0.25, 'hormigon')
d.rect(0.0, -0.65, 0.3, 0.6, 'ladrillo')
d.rect(0.0, -0.05, 0.3, 0.25, 'hormigon')
d.rect(0.0, 0.2, 0.3, 0.02, 'membrana'); d.rect(-0.02, 0.2, 0.02, 0.15, 'membrana')
d.rect(0.0, 0.22, 0.3, 0.45, 'ladrillo'); d.breakline(0.0, 0.3, 0.67)
d.rect(0.3, 0.0, 0.55, 0.12, 'contrapiso'); d.rect(0.3, 0.12, 0.55, 0.03, 'revoque'); d.rect(0.3, 0.15, 0.55, 0.012, 'piso')
for x in (0.05, 0.25):
    for y in (-0.01, 0.16):
        d.poly([(x - 0.008, y - 0.008), (x + 0.008, y - 0.008), (x + 0.008, y + 0.008), (x - 0.008, y + 0.008)], 'membrana')
d.level(-0.55, -0.05, '±0,00 NTN'); d.level(0.6, 0.162, '+0,20 NPT', 0.2)
d.note((0.15, -0.8), (0.95, -0.8), 'Zapata corrida HºAº 0,60 × 0,25')
d.note((0.15, -0.35), (0.95, -0.4), 'Muro de cimiento ladrillo común 0,30')
d.note((0.2, 0.05), (0.95, -0.05), 'Viga de encadenado HºAº 0,30 × 0,25 (4 Ø 10)')
d.note((0.1, 0.21), (-0.6, 0.35), 'Capa aisladora horizontal doble + vertical')
d.note((0.6, 0.06), (0.95, 0.06), 'Contrapiso HºPº 12 cm')
d.note((0.7, 0.156), (0.95, 0.25), 'Carpeta 3 cm + piso')
d.label(-0.55, -1.05, 'FUNDACIÓN · ZAPATA CORRIDA Y CAPA AISLADORA · esc. 1:20')
D.append(d)

# 5 Platea de fundación
d = Detail('platea-fundacion', 'Platea de fundación con borde engrosado', 'Raft slab with thickened edge', 'platea fundacion losa radier borde engrosado raft slab foundation', '1:20')
d.poly([(-0.4, -0.6), (1.2, -0.6), (1.2, -0.15), (0.35, -0.15), (0.35, -0.4), (0.0, -0.4), (0.0, 0.0), (-0.4, 0.0)], 'tierra', False)
d.poly([(0.0, -0.4), (0.35, -0.4), (0.35, -0.15), (1.2, -0.15), (1.2, 0.0), (0.0, 0.0)], 'hormigon')
d.rect(0.0, -0.41, 1.2, 0.006, 'membrana', False)
d.rect(0.3, 0.0, 0.9, 0.03, 'revoque'); d.rect(0.3, 0.03, 0.9, 0.012, 'piso')
d.rect(0.0, 0.0, 0.3, 0.02, 'membrana'); d.rect(0.0, 0.02, 0.3, 0.5, 'ladrillo'); d.breakline(0, 0.3, 0.52)
d.level(-0.4, 0.0, '±0,00 NTN'); d.level(0.9, 0.042, '+0,04 NPT', 0.2)
d.note((0.15, -0.3), (-0.55, -0.3), 'Borde engrosado 0,35 × 0,40')
d.note((0.8, -0.08), (1.35, -0.05), 'Platea HºAº 15 cm · malla Ø 8 c/ 15')
d.note((0.8, -0.408), (1.35, -0.45), 'Film de polietileno 200 µ')
d.note((0.8, -0.5), (1.35, -0.6), 'Suelo compactado + tosca 15 cm')
d.note((0.15, 0.01), (-0.55, 0.15), 'Capa aisladora horizontal')
d.label(-0.4, -0.75, 'PLATEA DE FUNDACIÓN CON BORDE ENGROSADO · esc. 1:20')
D.append(d)

# 6 Encuentro losa - muro con viga de encadenado
d = Detail('encuentro-losa-muro', 'Encuentro de losa con muro y viga de encadenado', 'Slab to wall junction with ring beam', 'losa entrepiso viga encadenado dintel encuentro muro slab ring beam junction', '1:10')
d.rect(0, 0, 0.3, 0.5, 'ladrillo'); d.rect(0.3, 0, 0.02, 0.5, 'revoque'); d.breakline(0, 0.32, 0)
d.rect(0, 0.5, 0.3, 0.25, 'hormigon'); d.rect(0.3, 0.63, 0.7, 0.12, 'hormigon')
d.rect(0.3, 0.615, 0.7, 0.015, 'yeso')
d.rect(0, 0.75, 1.0, 0.06, 'contrapiso'); d.rect(0, 0.81, 1.0, 0.02, 'revoque'); d.rect(0, 0.83, 1.0, 0.01, 'piso')
d.rect(0, 0.84, 0.3, 0.35, 'ladrillo'); d.breakline(0, 0.3, 1.19)
for x in (0.05, 0.25):
    for y in (0.53, 0.72):
        d.poly([(x - 0.006, y - 0.006), (x + 0.006, y - 0.006), (x + 0.006, y + 0.006), (x - 0.006, y + 0.006)], 'membrana')
d.line((0.3, 0.645), (1.0, 0.645)); d.breakline(1.0, 1.0, 0.7)
d.note((0.15, 0.6), (-0.15, 0.6), 'Viga de encadenado HºAº 0,30 × 0,25')
d.note((0.7, 0.69), (1.15, 0.69), 'Losa maciza HºAº 12 cm')
d.note((0.7, 0.62), (1.15, 0.56), 'Cielorraso aplicado de yeso 15 mm')
d.note((0.6, 0.78), (1.15, 0.8), 'Contrapiso 6 cm + carpeta 2 cm')
d.note((0.8, 0.835), (1.15, 0.9), 'Piso cerámico pegado')
d.label(0, -0.12, 'ENCUENTRO LOSA – MURO · VIGA DE ENCADENADO · esc. 1:10')
D.append(d)

# 7 Cubierta plana con parapeto
d = Detail('cubierta-plana-parapeto', 'Cubierta plana tradicional con parapeto y membrana', 'Flat roof with parapet and membrane', 'cubierta techo plano azotea losa membrana aislacion parapeto babeta flat roof parapet membrane', '1:10')
d.rect(0, 0, 0.3, 0.4, 'ladrillo'); d.breakline(0, 0.3, 0)
d.rect(0, 0.4, 0.3, 0.2, 'hormigon'); d.rect(0.3, 0.48, 1.0, 0.12, 'hormigon')
d.rect(0.3, 0.6, 1.0, 0.004, 'membrana', False)
d.rect(0.3, 0.604, 1.0, 0.05, 'aislacion')
d.poly([(0.3, 0.654), (1.3, 0.654), (1.3, 0.704), (0.3, 0.754)], 'contrapiso')
d.poly([(0.3, 0.754), (1.3, 0.704), (1.3, 0.724), (0.3, 0.774)], 'revoque')
d.poly([(0.3, 0.774), (1.3, 0.724), (1.3, 0.728), (0.3, 0.778)], 'membrana')
d.rect(0.15, 0.6, 0.15, 0.55, 'ladrillo')
d.poly([(0.3, 0.778), (0.3, 0.98), (0.31, 0.98), (0.31, 0.79)], 'membrana')
d.rect(0.13, 1.15, 0.2, 0.03, 'hormigon')
d.note((0.8, 0.54), (1.45, 0.5), 'Losa HºAº 12 cm')
d.note((0.8, 0.602), (1.45, 0.58), 'Barrera de vapor (pintura asfáltica)')
d.note((0.8, 0.63), (1.45, 0.65), 'Aislación térmica EPS 5 cm')
d.note((0.8, 0.7), (1.45, 0.72), 'Contrapiso alivianado con pendiente 2 %')
d.note((0.8, 0.745), (1.45, 0.79), 'Carpeta + membrana asfáltica 4 mm')
d.note((0.305, 0.9), (-0.2, 0.95), 'Babeta: membrana en canaleta 20 cm')
d.note((0.23, 1.165), (-0.2, 1.2), 'Cupertina HºAº con goterón')
d.label(0, -0.12, 'CUBIERTA PLANA CON PARAPETO · esc. 1:10')
D.append(d)

# 8 Cubierta de chapa sobre correas
d = Detail('cubierta-chapa-correas', 'Cubierta liviana de chapa sobre correas con aislación', 'Metal sheet roof on purlins with insulation', 'cubierta techo chapa sinusoidal correa perfil c aislacion lana vidrio cielorraso metal roof purlin', '1:10')
for x in (0.1, 0.9):
    d.poly([(x, 0.0), (x + 0.05, 0.0), (x + 0.05, 0.012), (x + 0.012, 0.012), (x + 0.012, 0.108), (x + 0.05, 0.108), (x + 0.05, 0.12), (x, 0.12)], 'acero')
d.rect(0.0, 0.12, 1.2, 0.005, 'membrana', False)
d.rect(0.0, 0.125, 1.2, 0.05, 'aislacion')
wave = [(0.0 + i * 0.019, 0.175 + 0.009 * (1 + math.sin(i * math.pi / 2))) for i in range(64)]
d.poly(wave, None, True, False)
d.rect(0.0, -0.3, 1.2, 0.0125, 'yeso')
for x in (0.2, 0.6, 1.0):
    d.line((x, 0.0), (x, -0.2875))
d.note((0.125, 0.06), (1.35, 0.05), 'Correa perfil C 120 × 50 × 2')
d.note((0.5, 0.122), (1.35, 0.13), 'Barrera de vapor / film')
d.note((0.6, 0.15), (1.35, 0.2), 'Lana de vidrio 50 mm c/ foil')
d.note((0.7, 0.19), (1.35, 0.27), 'Chapa sinusoidal galv. Nº 25')
d.note((0.6, -0.15), (1.35, -0.15), 'Velas rígidas c/ 1,00 m')
d.note((0.8, -0.294), (1.35, -0.3), 'Cielorraso de placa de yeso 12,5 mm')
d.label(0, -0.42, 'CUBIERTA DE CHAPA SOBRE CORREAS · esc. 1:10')
D.append(d)

# 9 Contrapiso sobre terreno
d = Detail('contrapiso-sobre-terreno', 'Contrapiso sobre terreno con carpeta y piso cerámico', 'Ground floor build-up', 'contrapiso piso ceramico carpeta terreno solado ground floor slab tiles', '1:5')
d.rect(0, -0.25, 1.0, 0.25, 'tierra', False); d.rect(0, 0, 1.0, 0.1, 'tierra'); d.rect(0, 0.1, 1.0, 0.004, 'membrana', False)
d.rect(0, 0.104, 1.0, 0.12, 'contrapiso'); d.rect(0, 0.224, 1.0, 0.025, 'revoque'); d.rect(0, 0.249, 1.0, 0.005, 'membrana', False); d.rect(0, 0.254, 1.0, 0.01, 'piso')
for x in (0.3, 0.6):
    d.line((x, 0.254), (x, 0.264))
d.note((0.5, -0.1), (1.15, -0.12), 'Suelo natural compactado')
d.note((0.5, 0.05), (1.15, 0.03), 'Relleno de tosca compactada 10 cm')
d.note((0.5, 0.102), (1.15, 0.1), 'Film de polietileno 200 µ')
d.note((0.5, 0.16), (1.15, 0.17), 'Contrapiso HºPº 12 cm')
d.note((0.5, 0.235), (1.15, 0.24), 'Carpeta cementicia 2,5 cm')
d.note((0.5, 0.259), (1.15, 0.31), 'Piso cerámico + adhesivo 5 mm')
d.label(0, -0.38, 'CONTRAPISO SOBRE TERRENO · esc. 1:5')
D.append(d)

# 10 Tabique de placa de yeso (planta)
d = Detail('tabique-placa-yeso', 'Tabique de placa de yeso con montantes de 70 mm (planta)', 'Drywall partition 70 mm studs (plan)', 'tabique placa yeso durlock steel frame montante solera lana mineral drywall partition stud', '1:5')
d.rect(0, 0, 0.6, 0.0125, 'yeso'); d.rect(0, 0.0125, 0.6, 0.0125, 'yeso')
d.rect(0, 0.025, 0.6, 0.07, 'aislacion')
d.rect(0, 0.095, 0.6, 0.0125, 'yeso'); d.rect(0, 0.1075, 0.6, 0.0125, 'yeso')
for x in (0.1, 0.5):
    d.poly([(x, 0.025), (x + 0.035, 0.025), (x + 0.035, 0.0285), (x + 0.0035, 0.0285), (x + 0.0035, 0.0915), (x + 0.035, 0.0915), (x + 0.035, 0.095), (x, 0.095)], 'acero')
d.breakline(0, 0, 0.06)
d.note((0.3, 0.006), (0.75, -0.04), 'Doble placa de yeso 12,5 mm')
d.note((0.12, 0.06), (0.75, 0.06), 'Montante 70 mm c/ 0,40 m')
d.note((0.3, 0.05), (0.75, 0.12), 'Lana mineral 70 mm (acústica)')
d.label(0, -0.12, 'TABIQUE DE PLACA DE YESO e = 0,12 m · planta · esc. 1:5')
D.append(d)

# 11 Antepecho y alféizar de ventana
d = Detail('antepecho-alfeizar-ventana', 'Ventana en muro: antepecho, alféizar y dintel (corte)', 'Window in wall: sill and lintel (section)', 'ventana carpinteria alfeizar antepecho dintel vano umbral window sill lintel opening', '1:10')
d.rect(0, 0, 0.3, 0.9, 'ladrillo'); d.breakline(0, 0.3, 0)
d.poly([(-0.04, 0.9), (0.3, 0.9), (0.3, 0.93), (-0.04, 0.95)], 'hormigon')
d.line((-0.03, 0.9), (-0.03, 0.91))
d.rect(0.12, 0.95, 0.06, 0.05, 'madera'); d.rect(0.12, 1.85, 0.06, 0.05, 'madera')
d.rect(0.145, 1.0, 0.01, 0.85, 'vidrio')
d.rect(0, 1.9, 0.3, 0.2, 'hormigon'); d.rect(0, 2.1, 0.3, 0.3, 'ladrillo'); d.breakline(0, 0.3, 2.4)
d.level(0.4, 0.0, '±0,00 NPT', 0.2)
d.note((0.1, 0.92), (-0.25, 1.0), 'Alféizar HºAº con pendiente y goterón')
d.note((0.15, 0.6), (0.5, 0.6), 'Antepecho ladrillo 0,90 m')
d.note((0.15, 0.975), (0.5, 1.05), 'Marco de carpintería')
d.note((0.15, 1.4), (0.5, 1.4), 'DVH 4/9/4')
d.note((0.15, 2.0), (0.5, 2.0), 'Dintel HºAº 0,30 × 0,20')
d.label(0, -0.12, 'VENTANA · ANTEPECHO, ALFÉIZAR Y DINTEL · esc. 1:10')
D.append(d)

index = []
for d in D:
    open(os.path.join(OUT, d.id + '.dxf'), 'w', encoding='utf-8').write(d.dxf())
    x0, y0, x1, y1 = d.bounds()
    index.append({'id': d.id, 'es': d.es, 'en': d.en, 'category': 'detail', 'drawingType': 'technical-detail', 'scale': d.scale, 'tags': d.tags, 'size': [round(x1 - x0, 3), round(y1 - y0, 3)], 'preview': d.svg()})
json.dump({'schema': 'blackline-details-v1', 'units': 'm', 'license': 'Original Blackline CAD · uso libre dentro de CAD2D3D', 'items': index}, open(os.path.join(OUT, 'index.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(len(index), 'detalles')
