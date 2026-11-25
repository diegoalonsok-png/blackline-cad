"""Import a user-prepared plan ZIP already uploaded to private R2 staging.
Never commit image bytes to GitHub. Preserve existing objects and catalogue."""
import hashlib, io, json, os, pathlib, re, tempfile, zipfile
import boto3
from botocore.exceptions import ClientError
from PIL import Image

PREFIX="assets/architecture-references/"
STAGING="incoming/ARQASSIST_plantas_clasificadas_R2.zip"
CATALOG=PREFIX+"r2-house-plans.json"
CATEGORIES={"house","bathroom","kitchen","bedroom","detail"}
PAT=re.compile(r"^(house|bathroom|kitchen|bedroom|detail)/(unverified|[0-9]+)/(user-drive-[0-9a-f]{20})(?:-thumb)?\.(jpg|png|webp)$")
MIME={"jpg":"image/jpeg","png":"image/png","webp":"image/webp"}
MAX_FILE=25*1024*1024
bucket=os.environ["R2_BUCKET"]
client=boto3.client("s3",endpoint_url="https://"+os.environ["R2_ACCOUNT"]+".r2.cloudflarestorage.com",region_name="auto")
def get_json(key):
    try:
        return json.loads(client.get_object(Bucket=bucket,Key=key)["Body"].read())
    except ClientError as e:
        if e.response["Error"]["Code"] in ("404","NoSuchKey","NotFound"): return []
        raise
def put(key,data,content_type):
    client.put_object(Bucket=bucket,Key=key,Body=data,ContentType=content_type)
    if client.head_object(Bucket=bucket,Key=key)["ContentLength"]!=len(data):
        raise RuntimeError("Upload verification failed: "+key)
def existing_hashes():
    out={}
    for page in client.get_paginator("list_objects_v2").paginate(Bucket=bucket,Prefix=PREFIX):
        for obj in page.get("Contents",[]):
            key=obj["Key"]
            if not re.search(r"\.(jpg|jpeg|png|webp)$",key,re.I) or re.search(r"-thumb\.",key,re.I): continue
            if obj["Size"]>MAX_FILE: continue
            body=client.get_object(Bucket=bucket,Key=key)["Body"]
            digest=hashlib.sha256()
            try:
                for chunk in body.iter_chunks(chunk_size=1024*1024): digest.update(chunk)
            finally: body.close()
            out.setdefault(digest.hexdigest(),key[len(PREFIX):])
    return out
def validated(z,row):
    if row.get("category") not in CATEGORIES or row.get("license")!="User supplied": raise ValueError("Invalid category or license")
    original=row["original"]; thumb=row["thumb"]
    a=PAT.fullmatch(original); b=PAT.fullmatch(thumb)
    if not a or not b or a.groups()[:3]!=b.groups()[:3] or "-thumb." in original or not thumb.endswith("-thumb.webp"): raise ValueError("Invalid path")
    if a[1]!=row["category"]: raise ValueError("Category mismatch")
    data=[]
    for name in (original,thumb):
        entry=z.getinfo(PREFIX+name)
        if entry.file_size>MAX_FILE: raise ValueError("Image too large")
        raw=z.read(entry)
        with Image.open(io.BytesIO(raw)) as im:
            if im.format not in ("JPEG","PNG","WEBP") or im.width*im.height>30_000_000: raise ValueError("Invalid image")
            if name==thumb and max(im.size)>480: raise ValueError("Oversize thumbnail")
            im.verify()
        data.append(raw)
    digest=hashlib.sha256(data[0]).hexdigest()
    if digest!=row["sha256"] or row["id"]!="user-drive-"+digest[:20]: raise ValueError("Hash mismatch")
    return data,digest
def main():
    if client.head_object(Bucket=bucket,Key=STAGING)["ContentLength"]>200*1024*1024: raise ValueError("Staging ZIP too large")
    with tempfile.TemporaryDirectory() as tmp:
        archive=pathlib.Path(tmp)/"plans.zip"
        client.download_file(bucket,STAGING,str(archive))
        with zipfile.ZipFile(archive) as z:
            manifest_info=z.getinfo("manifest.json")
            if manifest_info.file_size>2_000_000: raise ValueError("Manifest too large")
            incoming=json.loads(z.read(manifest_info))
            if not isinstance(incoming,list) or not 1<=len(incoming)<=1000: raise ValueError("Invalid manifest")
            # Validate all input before any write.
            for row in incoming: validated(z,row)
            current={}
            for name in ("index.json","drive-house-references.json","user-house-plans.json","r2-house-plans.json"):
                for row in get_json(PREFIX+name):
                    if row.get("original"): current[row["original"]]=row
            hashes=existing_hashes()
            uploaded=duplicates=0
            for row in incoming:
                data,digest=validated(z,row)
                original=row["original"]; thumb=row["thumb"]
                if digest in hashes:
                    old=hashes[digest];duplicates+=1
                    # Existing catalogue entry remains intact, including its verified area.
                    if old in current: continue
                    row=dict(row,original=old)
                    original=old
                else:
                    put(PREFIX+original,data[0],MIME[original.rsplit(".",1)[1]])
                    hashes[digest]=original;uploaded+=1
                put(PREFIX+thumb,data[1],"image/webp")
                current[original]=row
            payload=json.dumps(list(current.values()),ensure_ascii=False).encode()
            put(CATALOG,payload,"application/json")
            print(f"Unique originals uploaded: {uploaded}; already present: {duplicates}; catalogue entries: {len(current)}")
if __name__=="__main__": main()
