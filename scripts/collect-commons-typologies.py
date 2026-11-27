"""Discover freely licensed architectural floor plans on Wikimedia Commons, by typology.

Walks the floor-plan category tree, classifies each category by building type,
keeps only CC0 / CC BY / CC BY-SA / public-domain drawings, rejects photographs
with an image heuristic and writes JPG + WebP thumbnail pairs under
assets/architecture-references/{house,building}/unverified/.
Output catalogue: assets/architecture-references/commons-typologies.json
Incremental: ids already listed in r2-existing.json / commons-typologies.json are skipped.
Never commits image bytes to GitHub (the workflow uploads straight to R2)."""
import hashlib, io, json, os, pathlib, re, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor
from html import unescape
from urllib.parse import urlencode, urlparse
from PIL import Image, ImageOps

ROOT = pathlib.Path("assets/architecture-references")
OUT = ROOT / "commons-typologies.json"
UA = "BlacklineCADReferenceLibrary/1.1 (https://blackline-cad.org/; architecture reference catalogue)"
API = "https://commons.wikimedia.org/w/api.php"
MAX_NEW = int(os.environ.get("COMMONS_MAX_NEW", "900"))
MAX_CATS = int(os.environ.get("COMMONS_MAX_CATEGORIES", "2500"))
PER_CAT = int(os.environ.get("COMMONS_PER_CATEGORY", "30"))
PER_TYPE = int(os.environ.get("COMMONS_PER_TYPOLOGY", "160"))
WIDTH = 1280  # standard Wikimedia thumbnail step
LICENSE = re.compile(r"CC0(?: 1\.0)?|CC BY(?:-SA)? [\d.]+|Public domain", re.I)
ROOTS = [
    "Category:Floor plans",
    "Category:Floor plans of houses",
    "Category:Floor plans of churches",
    "Category:Floor plans of buildings",
    "Category:Architectural floor plans",
    "Category:Ground plans",
]
# (key, category folder, Spanish label, tags, regex on Commons category title). First match wins:
# specific building types before the generic "house" so "Opera houses" is a theatre.
TYPOLOGIES = [
    ("iglesia", "building", "Iglesia", "iglesia iglesias templo templos religioso church", r"church|cathedral|chapel|basilica|abbey|monaster|convent|minster|priory|baptister|kirche|dom\b|kathedral|église|eglise|iglesia|chiesa"),
    ("templo", "building", "Templo", "templo templos mezquita mezquitas sinagoga sinagogas religioso temple", r"temple|mosque|synagogue|shrine|pagoda|stupa|tempel|moschee"),
    ("teatro", "building", "Teatro", "teatro teatros auditorio auditorios opera cine theatre", r"theat(?:re|er)|opera|concert hall|cinema|auditori|amphitheat|odeon|stadium|arena"),
    ("termas", "building", "Termas", "termas baños publicos thermae", r"\bbaths?\b|bath ?houses?|thermae|bathhouse|hammam"),
    ("edificio-publico", "building", "Edificio público", "edificio publico edificios publicos ayuntamiento tribunal civic", r"town hall|city hall|rathaus|parliament|court ?house|courthouse|government|capitol|embass|police|fire station|post office|custom ?house"),
    ("estacion", "building", "Estación", "estacion estaciones aeropuerto transporte station", r"station|airport|terminal|bahnhof|depot"),
    ("palacio", "building", "Palacio o castillo", "palacio palacios castillo castillos fortaleza palace castle", r"palace|palais|palazzo|castle|château|chateau|schloss|burg\b|fortress|fortif|citadel|alcázar|alcazar"),
    ("hotel", "building", "Hotel", "hotel hoteles posada hotel", r"hotel|\binns?\b|hostel"),
    ("industrial", "building", "Industrial", "industrial industria fabrica fabricas deposito galpon factory", r"factor|\bmills?\b|warehouse|industrial|brewer|power station|workshop|barn"),
    ("comercial", "building", "Comercial", "comercial mercado mercados tienda tiendas market", r"market|\bshops?\b|\bstores?\b|shopping|arcade|bazaar|department store"),
    ("museo", "building", "Museo", "museo museos galeria museum", r"museum|museo|musée|musee"),
    ("escuela", "building", "Escuela o universidad", "escuela escuelas universidad universidades colegio educacion school", r"school|universit|college|academ|kindergarten|schule|lyc[ée]e|institute"),
    ("hospital", "building", "Hospital", "hospital hospitales clinica salud", r"hospital|clinic|sanatori|infirmar|asylum"),
    ("biblioteca", "building", "Biblioteca", "biblioteca bibliotecas library", r"librar|bibliot"),
    ("oficinas", "building", "Oficinas", "oficinas oficina banco bancos office", r"office|\bbanks?\b|headquarter|exchange"),
    ("vivienda-colectiva", "building", "Vivienda colectiva", "edificio edificios departamentos vivienda colectiva multifamiliar apartment", r"apartment|\bflats?\b|housing|residential building|tenement|insula|condominium|block of|mietshaus|wohnhaus|immeuble"),
    ("casa-patio", "house", "Casa con patio", "casa casas patio patios atrio courtyard", r"courtyard house|atrium house|patio house|\bdomus\b|siheyuan|peristyle|riad"),
    ("casa-hilera", "house", "Casa en hilera", "casa casas hilera adosada adosadas townhouse", r"row ?houses?|terraced|town ?houses?|semi-detached|reihenhaus|duplex"),
    ("villa", "house", "Villa", "casa casas villa villas quinta", r"\bvillas?\b"),
    ("casa", "house", "Casa", "casa casas vivienda viviendas house", r"houses?|cottage|bungalow|dwelling|farmhouse|homestead|mansion|manor|residence|cabin|hut|haus\b|maison|casa\b"),
]
TYPO = [(k, f, es, tags, re.compile(rx, re.I)) for k, f, es, tags, rx in TYPOLOGIES]
SKIP_FILE = re.compile(r"photo|foto|\bview\b|exterior|interior|aerial|panorama|facade|façade|elevation|ansicht|aufriss|alzado|perspective|perspectiva|logo|coat of arms|wappen|map of|stadtplan|street map|location", re.I)
SECTION = re.compile(r"\bsection\b|schnitt|coupe|\bcorte\b|sezione", re.I)

def classify(title):
    for k, f, es, tags, rx in TYPO:
        if rx.search(title):
            return k
    return None

def get(url, limit, tries=4):
    host = urlparse(url).hostname
    if host not in {"commons.wikimedia.org", "upload.wikimedia.org"}:
        raise ValueError("unexpected host " + str(host))
    for attempt in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=40) as r:
                if urlparse(r.geturl()).hostname not in {"commons.wikimedia.org", "upload.wikimedia.org"}:
                    raise ValueError("unexpected redirect")
                data = r.read(limit + 1)
            if len(data) > limit:
                raise ValueError("too large")
            return data
        except urllib.error.HTTPError as e:
            if e.code in (429, 503) and attempt < tries - 1:
                time.sleep(5 * (attempt + 1)); continue
            raise
        except (urllib.error.URLError, TimeoutError):
            if attempt < tries - 1:
                time.sleep(3); continue
            raise

def api(params):
    params = dict(params, format="json", formatversion=2)
    return json.loads(get(API + "?" + urlencode(params), 8_000_000))

def plain(v):
    return re.sub(r"\s+", " ", unescape(re.sub(r"<[^>]*>", " ", v or ""))).strip()

def members(cat, kind):
    out, cont = [], {}
    while True:
        p = {"action": "query", "list": "categorymembers", "cmtitle": cat, "cmtype": kind, "cmlimit": 500}
        p.update(cont)
        d = api(p)
        out += [m["title"] for m in d.get("query", {}).get("categorymembers", [])]
        if "continue" not in d or len(out) >= 1500:
            return out
        cont = d["continue"]

def files_info(cat):
    d = api({"action": "query", "generator": "categorymembers", "gcmtitle": cat, "gcmtype": "file", "gcmlimit": min(PER_CAT * 2, 100),
             "prop": "imageinfo", "iiprop": "url|mime|size|extmetadata", "iiurlwidth": WIDTH})
    return d.get("query", {}).get("pages", [])

def is_drawing(im):
    """Line drawings: mostly light background, few mid tones, low saturation. Rejects photographs."""
    g = ImageOps.exif_transpose(im).convert("RGB")
    g.thumbnail((256, 256))
    hsv = g.convert("HSV")
    gray = list(g.convert("L").getdata()) if not hasattr(g, "get_flattened_data") else list(g.convert("L").get_flattened_data())
    sat = [p[1] for p in (hsv.getdata() if not hasattr(hsv, "get_flattened_data") else hsv.get_flattened_data())]
    n = len(gray) or 1
    light = sum(v > 175 for v in gray) / n
    mid = sum(60 <= v <= 175 for v in gray) / n
    dark = sum(v < 60 for v in gray) / n
    s = sum(sat) / n / 255
    return light >= 0.40 and mid <= 0.42 and s <= 0.30 and dark <= 0.45

def main():
    known, counted, per_type = set(), set(), {}
    for name in ("r2-existing.json", "index.json", "drive-house-references.json", "commons-typologies.json"):
        p = ROOT / name
        if p.is_file():
            for row in json.loads(p.read_text()):
                known.add(row.get("id")); known.add(row.get("source"))
                if row.get("typology") and row.get("id") not in counted:
                    counted.add(row["id"]); per_type[row["typology"]] = per_type.get(row["typology"], 0) + 1
    rows = json.loads(OUT.read_text()) if OUT.is_file() else []

    # Breadth-first walk of the category tree; typology inherited from the nearest classified ancestor.
    queue = [(c, classify(c), 0) for c in ROOTS]
    seen, cats = set(), []
    while queue and len(cats) < MAX_CATS:
        cat, typ, depth = queue.pop(0)
        if cat in seen:
            continue
        seen.add(cat)
        typ = classify(cat) or typ
        cats.append((cat, typ))
        if depth < 4:
            try:
                for sub in members(cat, "subcat"):
                    if sub not in seen and not re.search(r"\bmaps?\b|logos?|coats? of arms|people|portraits", sub, re.I):
                        queue.append((sub, typ, depth + 1))
            except Exception as e:
                print("subcat failed", cat, e)
    print("categories visited:", len(cats))

    candidates = []
    for cat, typ in cats:
        if not typ or per_type.get(typ, 0) + sum(1 for c in candidates if c[1] == typ) >= PER_TYPE:
            continue
        try:
            pages = files_info(cat)
        except Exception as e:
            print("files failed", cat, e); continue
        taken = 0
        for pg in pages:
            if taken >= PER_CAT or len(candidates) >= MAX_NEW * 2:
                break
            title = pg.get("title", "")
            info = (pg.get("imageinfo") or [{}])[0]
            meta = info.get("extmetadata", {})
            lic = plain(meta.get("LicenseShortName", {}).get("value", ""))
            if not LICENSE.fullmatch(lic) or SKIP_FILE.search(title):
                continue
            if info.get("mime") not in ("image/jpeg", "image/png", "image/svg+xml", "image/tiff"):
                continue
            if (info.get("width") or 0) < 500 or (info.get("height") or 0) < 400:
                continue
            ident = "commons-" + hashlib.sha1(title.encode()).hexdigest()[:16]
            src = info.get("descriptionurl")
            if ident in known or src in known:
                continue
            known.add(ident); known.add(src)
            candidates.append((ident, typ, title, info, lic, plain(meta.get("Artist", {}).get("value", "")) or "Unknown author", meta.get("LicenseUrl", {}).get("value", "")))
            taken += 1
    print("candidates:", len(candidates))

    def fetch(c):
        ident, typ, title, info, lic, author, lic_url = c
        url = info.get("thumburl") or info.get("url")
        try:
            data = get(url, 15_000_000)
            with Image.open(io.BytesIO(data)) as im:
                if im.width * im.height > 40_000_000:
                    return None
                im.load()
                if not is_drawing(im):
                    return None
                pic = ImageOps.exif_transpose(im)
                if pic.mode in ("RGBA", "LA", "P"):
                    pic = pic.convert("RGBA"); bg = Image.new("RGB", pic.size, "white"); bg.paste(pic, mask=pic.split()[-1]); pic = bg
                pic = pic.convert("RGB")
                if max(pic.size) > WIDTH * 1.6:
                    pic.thumbnail((int(WIDTH * 1.6), int(WIDTH * 1.6)), Image.LANCZOS)
            return c, pic
        except Exception as e:
            print("download failed", title, e)
            return None

    added = 0
    with ThreadPoolExecutor(4) as pool:
        for res in pool.map(fetch, candidates):
            if not res or added >= MAX_NEW:
                continue
            (ident, typ, title, info, lic, author, lic_url), pic = res
            if per_type.get(typ, 0) >= PER_TYPE:
                continue
            k, folder, es, tags, _ = next(t for t in TYPO if t[0] == typ)
            base = ROOT / folder / "unverified"
            base.mkdir(parents=True, exist_ok=True)
            jpg = base / (ident + ".jpg"); thumb = base / (ident + "-thumb.webp")
            buf = io.BytesIO(); pic.save(buf, "JPEG", quality=86, optimize=True, progressive=True)
            jpg.write_bytes(buf.getvalue())
            th = pic.copy(); th.thumbnail((480, 480), Image.LANCZOS); th.save(thumb, "WEBP", quality=80, method=6)
            name = re.sub(r"\.(?:jpe?g|png|svg|tiff?)$", "", title.removeprefix("File:"), flags=re.I).replace("_", " ")
            lic = "CC0" if lic.upper().startswith("CC0") else lic
            rows.append({
                "id": ident, "title": es + " · " + name[:110], "category": folder, "typology": typ, "tags": tags,
                "area": None, "source": info.get("descriptionurl"), "license": lic, "licenseUrl": lic_url,
                "author": author[:160], "original": str(jpg.relative_to(ROOT)), "thumb": str(thumb.relative_to(ROOT)),
                "sha256": hashlib.sha256(buf.getvalue()).hexdigest(),
                "drawingType": "section" if SECTION.search(title) else "floor-plan", "floorPlanVerified": True,
                "previewChanges": "Resized copy; original unchanged on Wikimedia Commons",
            })
            per_type[typ] = per_type.get(typ, 0) + 1
            added += 1
    OUT.write_text(json.dumps(rows, ensure_ascii=False, indent=1) + "\n")
    print("added:", added, "total:", len(rows))
    print("per typology:", json.dumps(per_type, ensure_ascii=False, sort_keys=True))

if __name__ == "__main__":
    main()
