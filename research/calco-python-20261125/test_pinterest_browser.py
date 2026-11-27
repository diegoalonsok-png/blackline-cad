"""Browser smoke test against public CAD, not a semantic accuracy certification.
Uses a new anonymous browser context for every case; never saves to the cloud.
Pinterest images are temporary test inputs, never committed or republished.
"""
import json, pathlib, urllib.request, struct, zlib
from playwright.sync_api import sync_playwright

CASES=[
 ("control_synthetic",None,8.0),
 ("casa_1170","https://i.pinimg.com/736x/a8/b1/a5/a8b1a59569bc69261d27fa466fd4d051.jpg",14.8),
 ("casa_6264","https://i.pinimg.com/originals/34/03/9e/34039e5961522f57a1aaaf6903b2366c.png",10.2),
 ("casa_918","https://i.pinimg.com/564x/43/f6/0c/43f60cbf7225b8aa4b5d1a0992964f99.jpg",10.6),
]
def synthetic_png():
    # 8 m x 6 m raster at 100 px/m, with known 20 cm walls and an entry gap.
    w,h=800,600
    pixels=bytearray([255])*(w*h)
    for x0,y0,x1,y1 in [(100,100,700,120),(100,100,120,500),(680,100,700,500),(100,480,350,500),(440,480,700,500),(390,110,410,340)]:
        for y in range(y0,y1):pixels[y*w+x0:y*w+x1]=bytes(x1-x0)
    def chunk(tag,data):
        return struct.pack(">I",len(data))+tag+data+struct.pack(">I",zlib.crc32(tag+data)&0xffffffff)
    raw=b"".join(b"\x00"+pixels[y*w:(y+1)*w] for y in range(h))
    return b"\x89PNG\r\n\x1a\n"+chunk(b"IHDR",struct.pack(">IIBBBBB",w,h,8,0,0,0,0))+chunk(b"IDAT",zlib.compress(raw))+chunk(b"IEND",b"")
BASE="https://blackline-cad.org/"
out=pathlib.Path("calcopy-browser-results");out.mkdir(exist_ok=True)
results=[]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    for name,url,approx_width in CASES:
        row={"case":name,"source":url,"status":"BLOCKED","approx_image_width_m":approx_width,"semantic_accuracy":"NOT_MEASURED"}
        page=None;context=None
        try:
            if url is None:
                data,mime=synthetic_png(),"image/png"
            else:
                req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0"})
                with urllib.request.urlopen(req,timeout=25) as r:
                    data=r.read(10_000_001);mime=r.headers.get_content_type()
            if not mime.startswith("image/") or len(data)>10_000_000:raise ValueError("Input is not a supported image")
            context=browser.new_context(viewport={"width":1600,"height":1000},accept_downloads=False)
            page=context.new_page()
            errors=[];page.on("pageerror",lambda error: errors.append(str(error)))
            page.goto(BASE,wait_until="domcontentloaded",timeout=90000)
            page.wait_for_function("typeof window.CAD2D_EXTENSIONS?.commands?.CALCOPY === 'function'",timeout=90000)
            if page.evaluate("window.CAD2D_CORE.state.entities.length")!=0:raise ValueError("Expected a blank anonymous drawing")
            page.locator("#fileInput").set_input_files({"name":name+(".png" if mime=="image/png" else ".jpg"),"mimeType":mime,"buffer":data})
            page.wait_for_function("window.CAD2D_CORE.state.entities.some(e=>e.type==='image')",timeout=45000)
            # Calibrate provisional full-image width in setup using the public CAD core.
            # This is not a precision measurement; actual user workflow still needs scale calibration.
            page.evaluate("""width=>{const C=window.CAD2D_CORE,S=C.state,e=S.entities.find(x=>x.type==='image');const w=width*1000/C.U[S.unit];const ratio=w/Math.abs(e.b.x-e.a.x);e.b={x:e.a.x+(e.b.x-e.a.x)*ratio,y:e.a.y+(e.b.y-e.a.y)*ratio};S.selected=[e.id];C.updateAll();C.zoomExtents();}""",approx_width)
            button=page.locator('[data-image-action="calcopy"]')
            button.wait_for(state="visible",timeout=20000)
            button.click(timeout=15000)
            accept=page.locator("dialog[open] button").filter(has_text="Insertar muros y bloques marcados")
            accept.wait_for(state="visible",timeout=240000)
            row["preview"]=page.locator("dialog[open]").inner_text()[:3000]
            page.screenshot(path=str(out/(name+"_preview.png")))
            before=page.evaluate("window.CAD2D_CORE.state.entities.length")
            accept.click()
            page.wait_for_function("n=>window.CAD2D_CORE.state.entities.length>n",arg=before,timeout=30000)
            row.update(status="INSERTED_REVIEW_REQUIRED",entities=page.evaluate("window.CAD2D_CORE.state.entities.map(e=>({type:e.type,layer:e.layer,wall:!!e.wall2d})).reduce((a,e)=>{let k=e.type+(e.wall?':wall':'');a[k]=(a[k]||0)+1;return a},{})"),page_errors=errors)
            page.screenshot(path=str(out/(name+"_inserted.png")))
        except Exception as e:
            row["error"]=str(e)
            if page:
                try:page.screenshot(path=str(out/(name+"_error.png")))
                except Exception:pass
        finally:
            if context:context.close()
            results.append(row)
            (out/"report.json").write_text(json.dumps(results,indent=2,ensure_ascii=False))
            print(json.dumps(row,ensure_ascii=False),flush=True)
    browser.close()
if any(r["status"]!="INSERTED_REVIEW_REQUIRED" for r in results):raise SystemExit(1)
