"""Calco IA · paso 3: entrena el modelo de lectura de plantas y lo exporta para el navegador (ONNX).

Modelo propio («CalcoNet»): U-Net liviana de convoluciones separables, ~0,7 M de parámetros (≈2,6 MB en ONNX), sin pesos de terceros.
Entrada: imagen RGB (lado múltiplo de 32). Salida: 6 clases por píxel
  0 fondo · 1 muro · 2 puerta · 3 ventana · 4 mueble/artefacto · 5 texto/cota.

Uso (Colab con GPU o local):
  python3 entrenar.py --datos dataset --epocas 40 --salida calco.onnx
  python3 entrenar.py --datos dataset --epocas 1 --lado 256 --salida /tmp/prueba.onnx   (prueba rápida en CPU)
"""
import argparse, json, math, os, random, time
import numpy as np
import torch, torch.nn as nn, torch.nn.functional as F
from PIL import Image

NCLASES = 6
NOMBRES = ["fondo", "muro", "puerta", "ventana", "mueble", "texto"]


# ---------------------------------------------------------------- modelo
class Sep(nn.Module):
    """Convolución separable (profundidad + punto) con normalización y activación."""
    def __init__(self, cin, cout, stride=1):
        super().__init__()
        self.dw = nn.Conv2d(cin, cin, 3, stride, 1, groups=cin, bias=False); self.pw = nn.Conv2d(cin, cout, 1, bias=False)
        self.bn = nn.BatchNorm2d(cout); self.act = nn.ReLU6(inplace=True)
    def forward(self, x):
        return self.act(self.bn(self.pw(self.dw(x))))


class Bloque(nn.Module):
    def __init__(self, cin, cout, stride=1):
        super().__init__(); self.a = Sep(cin, cout, stride); self.b = Sep(cout, cout)
        self.res = (cin == cout and stride == 1)
    def forward(self, x):
        y = self.b(self.a(x)); return y + x if self.res else y


class CalcoNet(nn.Module):
    def __init__(self, n=NCLASES, w=(24, 48, 96, 160, 256)):
        super().__init__()
        self.stem = nn.Sequential(nn.Conv2d(3, w[0], 3, 2, 1, bias=False), nn.BatchNorm2d(w[0]), nn.ReLU6(inplace=True))  # 1/2
        self.e1 = nn.Sequential(Bloque(w[0], w[1], 2), Bloque(w[1], w[1]))            # 1/4
        self.e2 = nn.Sequential(Bloque(w[1], w[2], 2), Bloque(w[2], w[2]))            # 1/8
        self.e3 = nn.Sequential(Bloque(w[2], w[3], 2), Bloque(w[3], w[3]), Bloque(w[3], w[3]))  # 1/16
        self.e4 = nn.Sequential(Bloque(w[3], w[4], 2), Bloque(w[4], w[4]))            # 1/32
        # Contexto amplio (las plantas necesitan ver la habitación entera para decidir qué es muro).
        self.ctx = nn.Sequential(nn.AdaptiveAvgPool2d(1), nn.Conv2d(w[4], w[4], 1), nn.Sigmoid())
        self.d3 = Bloque(w[4] + w[3], w[3]); self.d2 = Bloque(w[3] + w[2], w[2]); self.d1 = Bloque(w[2] + w[1], w[1]); self.d0 = Bloque(w[1] + w[0], w[0])
        self.cab = nn.Sequential(Sep(w[0] + 3, w[0]), nn.Conv2d(w[0], n, 1))

    def forward(self, x):
        s0 = self.stem(x); s1 = self.e1(s0); s2 = self.e2(s1); s3 = self.e3(s2); s4 = self.e4(s3)
        s4 = s4 * self.ctx(s4)
        up = lambda a, b: F.interpolate(a, size=b.shape[-2:], mode="bilinear", align_corners=False)
        y = self.d3(torch.cat([up(s4, s3), s3], 1)); y = self.d2(torch.cat([up(y, s2), s2], 1))
        y = self.d1(torch.cat([up(y, s1), s1], 1)); y = self.d0(torch.cat([up(y, s0), s0], 1))
        y = F.interpolate(y, size=x.shape[-2:], mode="bilinear", align_corners=False)
        return self.cab(torch.cat([y, x], 1))


# ---------------------------------------------------------------- datos
class Planos(torch.utils.data.Dataset):
    def __init__(self, raiz, nombres, lado, aumentar):
        self.raiz, self.nombres, self.lado, self.aumentar = raiz, nombres, lado, aumentar
    def __len__(self):
        return len(self.nombres)
    def __getitem__(self, i):
        n = self.nombres[i]
        im = Image.open(os.path.join(self.raiz, "imagenes", n + ".jpg")).convert("RGB")
        mk = Image.open(os.path.join(self.raiz, "mascaras", n + ".png"))
        if self.aumentar:
            # Recorte con escala variable: el modelo tiene que leer plantas a distintos tamaños.
            W, H = im.size; s = random.uniform(0.55, 1.0); cw, ch = int(W * s), int(H * s)
            x0, y0 = random.randint(0, W - cw), random.randint(0, H - ch)
            im = im.crop((x0, y0, x0 + cw, y0 + ch)); mk = mk.crop((x0, y0, x0 + cw, y0 + ch))
        im = im.resize((self.lado, self.lado), Image.BILINEAR); mk = mk.resize((self.lado, self.lado), Image.NEAREST)
        x = np.asarray(im, dtype=np.float32) / 255.0; y = np.asarray(mk, dtype=np.int64)
        if self.aumentar:
            if random.random() < 0.5:
                x, y = x[:, ::-1], y[:, ::-1]
            if random.random() < 0.5:
                x, y = x[::-1], y[::-1]
            if random.random() < 0.5:  # plantas en negativo (líneas claras sobre fondo oscuro)
                x = 1.0 - x
            if random.random() < 0.3:  # escala de grises
                x = np.repeat(x.mean(2, keepdims=True), 3, 2)
            x = np.clip((x - 0.5) * random.uniform(0.7, 1.3) + 0.5 + random.uniform(-0.1, 0.1), 0, 1)
        x = torch.from_numpy(np.ascontiguousarray(x.transpose(2, 0, 1))); y = torch.from_numpy(np.ascontiguousarray(y))
        return (x - 0.5) / 0.5, y


def dividir(raiz, frac_val=0.08, semilla=0):
    ns = sorted(f[:-4] for f in os.listdir(os.path.join(raiz, "imagenes")) if f.endswith(".jpg"))
    random.Random(semilla).shuffle(ns); k = max(1, int(len(ns) * frac_val)); return ns[k:], ns[:k]


# ---------------------------------------------------------------- entrenamiento
def perdida(logits, y, pesos):
    ce = F.cross_entropy(logits, y, weight=pesos)
    p = logits.softmax(1); oh = F.one_hot(y, NCLASES).permute(0, 3, 1, 2).float()
    inter = (p * oh).sum((0, 2, 3)); union = p.sum((0, 2, 3)) + oh.sum((0, 2, 3))
    dice = 1 - ((2 * inter + 1) / (union + 1))[1:].mean()  # Dice sin el fondo
    return ce + dice


@torch.no_grad()
def evaluar(modelo, cargador, disp):
    modelo.eval(); inter = torch.zeros(NCLASES); union = torch.zeros(NCLASES)
    for x, y in cargador:
        x, y = x.to(disp), y.to(disp); p = modelo(x).argmax(1)
        for c in range(NCLASES):
            inter[c] += ((p == c) & (y == c)).sum().item(); union[c] += ((p == c) | (y == c)).sum().item()
    modelo.train(); iou = (inter / union.clamp(min=1)).tolist()
    return {NOMBRES[c]: round(iou[c], 4) for c in range(NCLASES)}


def exportar(modelo, ruta, lado):
    modelo.eval().cpu(); x = torch.zeros(1, 3, lado, lado)
    torch.onnx.export(modelo, x, ruta, input_names=["imagen"], output_names=["clases"], opset_version=17,
                      dynamic_axes={"imagen": {2: "alto", 3: "ancho"}, "clases": {2: "alto", 3: "ancho"}}, dynamo=False)
    return os.path.getsize(ruta)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--datos", required=True); ap.add_argument("--epocas", type=int, default=40); ap.add_argument("--lado", type=int, default=512)
    ap.add_argument("--lote", type=int, default=16); ap.add_argument("--salida", default="calco.onnx"); ap.add_argument("--minutos", type=float, default=0)
    a = ap.parse_args()
    disp = "cuda" if torch.cuda.is_available() else "cpu"; torch.manual_seed(0); random.seed(0)
    tr, va = dividir(a.datos)
    dl = torch.utils.data.DataLoader(Planos(a.datos, tr, a.lado, True), batch_size=a.lote, shuffle=True, num_workers=2 if disp == "cuda" else 0, drop_last=True)
    dv = torch.utils.data.DataLoader(Planos(a.datos, va, a.lado, False), batch_size=a.lote)
    modelo = CalcoNet().to(disp); print("parámetros:", sum(p.numel() for p in modelo.parameters()), "· dispositivo:", disp)
    # Pesos por clase: puertas, ventanas y muebles son pocos píxeles comparados con el fondo.
    pesos = torch.tensor([0.3, 1.0, 2.5, 2.5, 1.2, 1.0], device=disp)
    opt = torch.optim.AdamW(modelo.parameters(), lr=2e-3, weight_decay=1e-4)
    pasos = a.epocas * len(dl); sched = torch.optim.lr_scheduler.OneCycleLR(opt, max_lr=2e-3, total_steps=max(1, pasos))
    t0 = time.time(); paso = 0; mejor = -1
    for ep in range(a.epocas):
        suma = 0.0
        for x, y in dl:
            x, y = x.to(disp), y.to(disp); loss = perdida(modelo(x), y, pesos)
            opt.zero_grad(); loss.backward(); opt.step(); sched.step(); suma += loss.item(); paso += 1
            if a.minutos and time.time() - t0 > a.minutos * 60:
                break
        iou = evaluar(modelo, dv, disp); media = sum(list(iou.values())[1:]) / (NCLASES - 1)
        print(f"época {ep + 1}/{a.epocas} · pérdida {suma / max(1, len(dl)):.3f} · IoU {iou} · media {media:.3f} · {time.time() - t0:.0f} s", flush=True)
        if media > mejor:
            mejor = media; torch.save(modelo.state_dict(), a.salida + ".pt")
        if a.minutos and time.time() - t0 > a.minutos * 60:
            break
    modelo.load_state_dict(torch.load(a.salida + ".pt", map_location="cpu"))
    print("ONNX:", a.salida, exportar(modelo, a.salida, a.lado) // 1024, "KB · mejor IoU medio", round(mejor, 3))
    json.dump({"clases": NOMBRES, "lado": a.lado, "normalizacion": "(x/255-0.5)/0.5", "iou_medio": mejor}, open(a.salida + ".json", "w"), ensure_ascii=False)


if __name__ == "__main__":
    main()
