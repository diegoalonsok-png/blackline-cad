"""Import the user-supplied staged CAD archive without publishing it to GitHub."""
import io, json, os, re, hashlib, zipfile, tempfile, time, unicodedata, urllib.request
from pathlib import PurePosixPath
import boto3, ezdxf
from ezdxf.addons.drawing import Frontend, RenderContext
from ezdxf.addons.drawing.matplotlib import MatplotlibBackend
from ezdxf.addons.drawing.config import Configuration, BackgroundPolicy, ColorPolicy
import matplotlib.pyplot as plt
from PIL import Image

bucket=os.environ["R2_BUCKET"]
assert bucket=="blackline-cad-library"
s3=boto3.client("s3",endpoint_url="https://"+os.environ["R2_ACCOUNT"]+".r2.cloudflarestorage.com")
prefix="assets/user-cad/v1/"
def put(key,data,mime):
    s3.put_object(Bucket=bucket,Key=prefix+key,Body=data,ContentType=mime)
for i in range(30):
    try:
        if urllib.request.urlopen("http://127.0.0.1:8080/health",timeout=3).read()==b"ready": break
    except OSError: pass
    time.sleep(2)
else: raise RuntimeError("Converter unavailable")
def import_package(data,label):
    global z,names
    z=zipfile.ZipFile(io.BytesIO(data))
    assert sum(i.file_size for i in z.infolist())<100_000_000
    root="blackline_ready/"
    # Zip names with accents (BAÑERA1.dwg) may be stored without the UTF-8 flag (decoded as cp437)
    # or in NFD form: index every entry by its NFC, case-insensitive UTF-8 name.
    def _utf8(info):
        name=info.filename
        if not info.flag_bits & 0x800:
            try: name=name.encode("cp437").decode("utf-8")
            except (UnicodeEncodeError,UnicodeDecodeError): pass
        return unicodedata.normalize("NFC",name).casefold()
    names={_utf8(i):i for i in z.infolist()}
    def zread(name):
        info=names.get(unicodedata.normalize("NFC",name).casefold())
        if info is None: raise KeyError(name)
        return z.read(info)
    rows=json.loads(zread(root+"manifests/block_catalog.json"))["items"]
    items=[]; failed=[]
    for row in rows:
        ident=row["id"]
        assert re.fullmatch(r"[a-z0-9_-]+",ident)
        path=PurePosixPath(row["dwg"])
        assert path.parts[0]=="dwg" and ".." not in path.parts
        try: raw=zread(root+str(path))
        except KeyError:
            failed.append({"id":ident,"error":"missing in archive: "+str(path)}); print(ident,"missing"); continue
        is_dxf=str(path).lower().endswith(".dxf")
        if not is_dxf and not raw.startswith(b"AC10"):
            failed.append({"id":ident,"error":"not a DWG"}); print(ident,"not_dwg"); continue
        key=ident+"-"+hashlib.sha256(raw).hexdigest()[:12]
        dwg=key+(".dxf" if is_dxf else ".dwg"); put(dwg,raw,"application/octet-stream")
        item={k:row[k] for k in ("id","name","category","category_title","tags")}
        item["dwg"]=prefix+dwg
        try:
            if is_dxf: dxf=raw
            else:
                req=urllib.request.Request("http://127.0.0.1:8080/convert",data=raw,method="POST")
                with urllib.request.urlopen(req,timeout=75) as res: dxf=res.read()
            with tempfile.NamedTemporaryFile(suffix=".dxf") as f:
                f.write(dxf); f.flush(); doc=ezdxf.readfile(f.name)
            fig=plt.figure(figsize=(4,3),dpi=100)
            try:
                ax=fig.add_axes([.04,.04,.92,.92])
                Frontend(RenderContext(doc),MatplotlibBackend(ax),config=Configuration(background_policy=BackgroundPolicy.WHITE,color_policy=ColorPolicy.BLACK)).draw_layout(doc.modelspace(),finalize=True)
                ax.set_axis_off()
                if not ax.has_data(): raise ValueError("Empty drawing")
                stream=io.BytesIO(); fig.savefig(stream,format="png",dpi=100,facecolor="white")
                stream.seek(0); im=Image.open(stream).convert("RGB")
                preview=io.BytesIO(); im.save(preview,format="WEBP",quality=85)
            finally: plt.close(fig)
            put(key+".dxf",dxf,"application/octet-stream")
            put(key+".webp",preview.getvalue(),"image/webp")
            item.update(dxf=prefix+key+".dxf",preview=prefix+key+".webp",status="ready")
        except Exception as exc:
            failed.append({"id":ident,"error":str(exc)[:300]})
            item["status"]="conversion_failed"
        items.append(item)
        print(ident,item["status"],flush=True)
    # Merge with the catalogue already published: a new package adds or replaces items by id, never wipes earlier uploads.
    try:
        previous=json.loads(s3.get_object(Bucket=bucket,Key=prefix+"catalog.json")["Body"].read()).get("items",[])
    except Exception:
        previous=[]
    new_ids={i["id"] for i in items}
    merged=[i for i in previous if i.get("id") not in new_ids]+items
    put("catalog.json",json.dumps({"version":1,"items":merged},ensure_ascii=False).encode(),"application/json")
    print("Catalogue items:",len(merged))
    ready=sum(1 for i in items if i.get("status")=="ready")
    put("import-report-"+label+".json",json.dumps({"total":len(rows),"imported":len(items),"ready":ready,"failed":failed},ensure_ascii=False).encode(),"application/json")
    print("Imported originals:",len(items),"of",len(rows),"· rendered:",ready)
    # Partial failures are reported, not fatal: the ready blocks stay published.
    for f in failed: print("::warning::"+f["id"]+": "+f["error"][:200])
    return ready,len(rows)


import glob
package_dir=os.environ.get("PACKAGE_DIR","").strip()
package=os.environ.get("PACKAGE_FILE","").strip()
if package_dir:
    paths=sorted(glob.glob(os.path.join(package_dir,"*.zip")))
elif package:
    paths=[package]
else:
    paths=[]
total_ready=0
if paths:
    for path in paths:
        data=open(path,"rb").read(); assert len(data)<50_000_000
        label=re.sub(r"[^a-z0-9-]+","-",os.path.basename(path).lower())[:60]
        print("== package",label,flush=True)
        ready,_=import_package(data,label); total_ready+=ready
else:
    obj=s3.get_object(Bucket=bucket,Key="incoming/blackline_ready_package.zip"); data=obj["Body"].read()
    assert len(data)<50_000_000
    ready,_=import_package(data,"incoming"); total_ready+=ready
if not total_ready: raise SystemExit("No CAD file could be imported")
