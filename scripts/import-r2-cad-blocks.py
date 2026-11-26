"""Import the user-supplied staged CAD archive without publishing it to GitHub."""
import io, json, os, re, hashlib, zipfile, tempfile, time, urllib.request
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
obj=s3.get_object(Bucket=bucket,Key="incoming/blackline_ready_package.zip")
assert obj["ContentLength"]<50_000_000
z=zipfile.ZipFile(io.BytesIO(obj["Body"].read()))
assert sum(i.file_size for i in z.infolist())<100_000_000
root="blackline_ready/"
rows=json.loads(z.read(root+"manifests/block_catalog.json"))["items"]
assert len(rows)==207
items=[]; failed=[]
for row in rows:
    ident=row["id"]
    assert re.fullmatch(r"[a-z0-9_-]+",ident)
    path=PurePosixPath(row["dwg"])
    assert path.parts[0]=="dwg" and ".." not in path.parts
    raw=z.read(root+str(path))
    assert raw.startswith(b"AC10")
    key=ident+"-"+hashlib.sha256(raw).hexdigest()[:12]
    dwg=key+".dwg"; put(dwg,raw,"application/octet-stream")
    item={k:row[k] for k in ("id","name","category","category_title","tags")}
    item["dwg"]=prefix+dwg
    try:
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
put("catalog.json",json.dumps({"version":1,"items":items},ensure_ascii=False).encode(),"application/json")
put("import-report.json",json.dumps({"total":len(items),"ready":len(items)-len(failed),"failed":failed},ensure_ascii=False).encode(),"application/json")
print("Imported originals:",len(items),"rendered:",len(items)-len(failed))
if failed: raise SystemExit("Some CAD files need review; originals preserved in R2")
