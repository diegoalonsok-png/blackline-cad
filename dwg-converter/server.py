"""CAD2D · servicio mínimo DWG -> DXF (solo biblioteca estándar de Python).

POST /convert  cuerpo = bytes del .dwg  ->  DXF ASCII
GET  /health
- Límite de tamaño, verificación de firma AC10xx, tiempo máximo y borrado inmediato
  del archivo temporal (no se guarda ninguna copia ni se registra el contenido).
- dwg2dxf (GNU LibreDWG) corre como proceso separado.
"""
import os
import shutil
import subprocess
import tempfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

MAX_BYTES = int(os.getenv("MAX_DWG_BYTES", str(25 * 1024 * 1024)))
TIMEOUT = int(os.getenv("CONVERT_TIMEOUT", "60"))
TOOL = shutil.which("dwg2dxf")


class Handler(BaseHTTPRequestHandler):
    server_version = "cad2d-dwg/1"

    def log_message(self, fmt, *args):  # sin registros con datos del usuario
        return

    def _send(self, code, body=b"", ctype="text/plain; charset=utf-8", headers=None):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        for k, v in (headers or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            return self._send(200, b"ready" if TOOL else b"dwg2dxf-missing")
        return self._send(404, b"not found")

    def do_POST(self):
        if self.path != "/convert":
            return self._send(404, b"not found")
        if not TOOL:
            return self._send(503, b"converter not installed")
        length = int(self.headers.get("Content-Length") or 0)
        if length < 32:
            return self._send(400, b"empty or invalid file")
        if length > MAX_BYTES:
            return self._send(413, b"file too large")
        data = self.rfile.read(length)
        if not data[:4] == b"AC10":
            return self._send(415, b"not a DWG file")
        with tempfile.TemporaryDirectory(prefix="cad2d_") as tmp:
            src = os.path.join(tmp, "plano.dwg")
            out = os.path.join(tmp, "plano.dxf")
            with open(src, "wb") as fh:
                fh.write(data)
            del data
            try:
                result = subprocess.run([TOOL, "-y", "-o", out, src], capture_output=True,
                                        timeout=TIMEOUT, check=False, cwd=tmp)
            except subprocess.TimeoutExpired:
                return self._send(504, b"conversion timed out")
            if not os.path.isfile(out):
                return self._send(422, b"conversion failed")
            with open(out, "rb") as fh:
                dxf = fh.read()
            if b"SECTION" not in dxf[:8192]:
                return self._send(422, b"unsupported DXF output")
            warnings = len([l for l in result.stderr.decode("utf-8", "ignore").splitlines() if "ERROR" in l or "Warning" in l])
            return self._send(200, dxf, "application/dxf", {"X-CAD2D-Warnings": str(warnings)})


if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", int(os.getenv("PORT", "8080"))), Handler).serve_forever()
