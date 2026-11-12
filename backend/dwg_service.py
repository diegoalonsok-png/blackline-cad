"""CAD2D optional DWG -> DXF conversion service.

This is a deployable integration skeleton, NOT running on GitHub Pages.
Requires ODA File Converter installed separately and appropriate terms/licensing.
Do not expose publicly without HTTPS, authentication, abuse prevention and limits.
"""
import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

MAX_SIZE = int(os.getenv("CAD2D_MAX_DWG_BYTES", str(20 * 1024 * 1024)))
ALLOWED_ORIGIN = os.getenv("CAD2D_ALLOWED_ORIGIN", "https://diegoalonsok-png.github.io")
CONVERTER = os.getenv("CAD2D_ODA_EXECUTABLE", "ODAFileConverter")
TIMEOUT = int(os.getenv("CAD2D_CONVERT_TIMEOUT", "90"))

app = FastAPI(title="CAD2D DWG bridge", docs_url=None, redoc_url=None)
app.add_middleware(CORSMiddleware, allow_origins=[ALLOWED_ORIGIN], allow_credentials=False,
                   allow_methods=["POST"], allow_headers=["Content-Type"])

@app.get("/health")
def health():
    return {"status": "ready" if shutil.which(CONVERTER) else "converter-not-installed"}

@app.post("/api/convert/dwg")
async def convert_dwg(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".dwg"):
        raise HTTPException(415, "Expected a .dwg file")
    if shutil.which(CONVERTER) is None:
        raise HTTPException(503, "ODA DWG converter is not installed on the service")
    with tempfile.TemporaryDirectory(prefix="cad2d_") as td:
        root = Path(td)
        source = root / "source"
        target = root / "out"
        source.mkdir(); target.mkdir()
        input_path = source / "drawing.dwg"
        total = 0
        with input_path.open("wb") as f:
            while piece := await file.read(1024 * 1024):
                total += len(piece)
                if total > MAX_SIZE:
                    raise HTTPException(413, "DWG exceeds upload limit")
                f.write(piece)
        if total < 32 or not input_path.read_bytes()[:6].startswith(b"AC10"):
            raise HTTPException(415, "Invalid or unrecognized DWG signature")
        command = [CONVERTER, str(source), str(target), "ACAD2018", "DXF", "0", "1", "*.dwg"]
        if os.name != "nt" and shutil.which("xvfb-run"):
            command = ["xvfb-run", "-a"] + command
        try:
            result = subprocess.run(command, capture_output=True, timeout=TIMEOUT,
                                    check=False, cwd=str(root))
        except subprocess.TimeoutExpired:
            raise HTTPException(504, "DWG conversion timed out")
        output = target / "drawing.dxf"
        if result.returncode != 0 or not output.is_file():
            raise HTTPException(422, "DWG conversion failed")
        dxf = output.read_bytes()
        if len(dxf) > MAX_SIZE * 15:
            raise HTTPException(413, "Converted DXF exceeds output limit")
        # The browser's importer expects ASCII DXF; binary DXF will be refused.
        if b"SECTION" not in dxf[:4096]:
            raise HTTPException(422, "Converter returned an unsupported DXF encoding")
        return Response(content=dxf, media_type="application/dxf",
                        headers={"Cache-Control": "no-store", "X-CAD2D-Model-Scale": "1:1"})
