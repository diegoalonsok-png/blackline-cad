"""CAD2D · servicio mínimo DWG -> DXF (solo biblioteca estándar de Python).

POST /convert          cuerpo = bytes del .dwg  ->  DXF ASCII (detrás del Worker de Cloudflare)
POST /api/convert/dwg  formulario con campo "file" (lo que envía CAD2D)  ->  DXF ASCII,
                       con CORS limitado a ALLOWED_ORIGINS (para otros proveedores, p. ej. Cloud Run)
GET  /health
- Límite de tamaño, verificación de firma AC10xx, tiempo máximo y borrado inmediato
  del archivo temporal (no se guarda ninguna copia ni se registra el contenido).
- dwg2dxf (GNU LibreDWG) corre como proceso separado.
"""
import os
import shutil
import subprocess
import tempfile
from email.parser import BytesParser
from email.policy import default as email_policy
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

MAX_BYTES = int(os.getenv("MAX_DWG_BYTES", str(25 * 1024 * 1024)))
TIMEOUT = int(os.getenv("CONVERT_TIMEOUT", "60"))
TOOL = shutil.which("dwg2dxf")
ALLOWED = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "https://blackline-cad.org,https://www.blackline-cad.org").split(",") if o.strip()]


class Handler(BaseHTTPRequestHandler):
    server_version = "cad2d-dwg/1"

    def log_message(self, fmt, *args):  # sin registros con datos del usuario
        return

    def _send(self, code, body=b"", ctype="text/plain; charset=utf-8", headers=None):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        origin = self.headers.get("Origin")
        if origin and origin in ALLOWED:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
            self.send_header("Access-Control-Expose-Headers", "X-CAD2D-Warnings")
        for k, v in (headers or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            return self._send(200, b"ready" if TOOL else b"dwg2dxf-missing")
        return self._send(404, b"not found")

    def do_OPTIONS(self):
        return self._send(204, b"", headers={"Access-Control-Allow-Methods": "POST, OPTIONS",
                                             "Access-Control-Allow-Headers": "content-type"})

    def do_POST(self):
        if self.path not in ("/convert", "/api/convert/dwg"):
            return self._send(404, b"not found")
        multipart = self.path == "/api/convert/dwg"
        if multipart and self.headers.get("Origin") not in ALLOWED:
            return self._send(403, b"origin not allowed")
        if not TOOL:
            return self._send(503, b"converter not installed")
        length = int(self.headers.get("Content-Length") or 0)
        if length < 32:
            return self._send(400, b"empty or invalid file")
        if length > MAX_BYTES:
            return self._send(413, b"file too large")
        data = self.rfile.read(length)
        if multipart:
            msg = BytesParser(policy=email_policy).parsebytes(
                b"Content-Type: " + self.headers.get("Content-Type", "").encode() + b"\r\n\r\n" + data)
            part = next((p for p in msg.iter_parts() if p.get_param("name", header="content-disposition") == "file"), None) if msg.is_multipart() else None
            if part is None or not str(part.get_filename() or "").lower().endswith(".dwg"):
                return self._send(415, b"expected a .dwg file")
            data = part.get_payload(decode=True) or b""
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
