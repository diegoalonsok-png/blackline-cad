# CAD2D optional DWG converter

The static frontend runs on GitHub Pages. **DWG conversion cannot run on GitHub Pages**.
This directory contains an optional standalone service that takes a DWG upload,
runs **ODA File Converter** locally on the service host and returns an ASCII DXF
for client-side import. Neither this service nor ODA are currently deployed.

## Setup

1. Review ODA's software terms and the licence suitability for a commercial hosted service.
2. Install ODA File Converter on a controlled Linux/Windows host. On Linux also install `xvfb-run` if headless execution requires a display.
3. Install Python dependencies with `pip install -r requirements.txt`.
4. Set `CAD2D_ALLOWED_ORIGIN=https://diegoalonsok-png.github.io`; optionally set `CAD2D_ODA_EXECUTABLE` to the absolute executable path.
5. Run `uvicorn dwg_service:app --host 127.0.0.1 --port 8080` behind HTTPS, authentication, request/body caps, per-user rate limiting and monitoring.
6. After the service passes end-to-end tests, set the CAD2D frontend's `DWG_CONVERTER_ENDPOINT` constant to your HTTPS route ending in `/api/convert/dwg`.

## Limitations / risks

- This is **not** an AutoCAD engine. The current browser DXF importer supports only a subset of entities, so blocks, hatches, attributes and layouts can be incomplete even after a successful conversion.
- Input and output are deleted from the service working directory at the end of the request. Transport to the server is NOT local/private: the DWG leaves the user's device.
- Use an isolated container, unprivileged OS identity, process limits and malware/abuse controls before serving uploads.
- Do not claim 1:1 correctness for DWGs until `$INSUNITS`, `$MEASUREMENT`, geometry extents and known reference distances have been checked.
- The source file is never rewritten by this service.
