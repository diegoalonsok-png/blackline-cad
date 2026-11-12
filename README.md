# CAD2D — 2D drafting web prototype

A self-contained, dependency-free, English-language CAD workspace. Dark ribbon interface inspired by conventional CAD UI patterns and scholarly dark UI design.

## Run

Open `index.html` in a modern Chromium, Firefox, or Safari browser. Or serve with `python3 -m http.server 8000` and visit `http://localhost:8000`.

## Included features

- Zoomable and pannable coordinate workspace (not constrained to a preset document size)
- Configurable grid, grid snap, orthographic mode and basic object snaps
- Units: millimeters, centimeters, meters, inches, feet; changing units converts existing geometry
- 2D LINE, POLYLINE, RECTANGLE, CIRCLE, ARC, ELLIPSE, TEXT and DIMENSION
- Selection, duplicate, delete, move, copy, rotate, scale, mirror, basic offset, basic trim, undo and redo
- Editable drawing layers with color, visibility and locking
- ASCII DXF R2000 export and limited DXF import
- Vector PDF export with ISO A0–A4, US Letter, Legal, ARCH D/E, custom page size, model-to-paper scale and title block
- SVG and PNG exports; JSON project save/open
- Bottom command bar, coordinate entry, selection properties and keyboard shortcuts

## Known limitations / next engineering milestones

This is a functional **prototype**, not a replacement for a production CAD kernel. Test export geometry in LibreCAD, QCAD or AutoCAD before professional use. DXF import is restricted to several common 2D ASCII entity types; polyline bulges, blocks, xrefs, splines, external images, advanced hatches, annotations and layouts require a more complete CAD library. Trim currently shortens a line to its midpoint (placeholder, not exact intersection trim). Rotated ellipse rendering needs refinement. No object drag-grips, advanced measurement calibration, orthogonal dimension styles, model/paper viewports, cloud storage, accounts or payments yet. PDF output uses basic vector shapes and standard Helvetica, with a simplified encoding for non-ASCII labels. Fixed-scale output can clip drawings if they exceed the paper.

## Deployment

Upload `index.html` to a GitHub Pages repository or Cloudflare Pages. The hosted GitHub Pages frontend currently runs CAD drawing and ASCII DXF/SVG import locally, without a live conversion backend. The optional DWG service is **not deployed**; if later enabled, DWG uploads will leave the browser only after an explicit user confirmation. See `backend/README.md`. Stripe and login can be integrated subsequently with a trusted server / verified webhook; never add Stripe secret keys to the frontend.

## Intellectual property

This prototype uses original HTML/CSS/JavaScript. It does not redistribute Autodesk or IntelliCAD UI artwork, program code or trademarks.

## CAD2D movable palettes

Drag any palette title to undock and move it across the drawing. Resize floating palettes from the lower-right corner. Each palette title provides Float, Dock left, Dock right, and Collapse buttons. The header includes **Reset layout**. Dock positions are stored locally in the browser. The public GitHub Pages URL stays `/blackline-cad/` for continuity.

## Geometry scale 1:1 verification

CAD2D model space retains imported DXF coordinates as-is in declared drawing units; zoom does **not** change model geometry. Use the command **`SCALETEST`** to load `examples/scale-1to1-test.dxf`, a DXF declared in meters containing an exact **10 m LINE**, **4 m LINE** and **1 m radius CIRCLE**. CAD2D selects the 10 m line and confirms its measured length. Use **`1:1 CHECK`** or **`SCALECHECK`** to inspect model extents and exact selected line length. `@10<45` inputs a ten-unit, 45° polar offset and `@3,0` is a relative Cartesian offset.

**Paper 1:1 is different from model 1:1.** When drawing units are meters, a 10 m line would need 10,000 mm of paper at plot ratio 1:1. An A0 plot would therefore clip it. Fit-to-page changes the paper scale, not the model's coordinates.

DXF files with missing/unsupported `$INSUNITS` require explicit user unit selection. Units are *assigned without multiplying the stored coordinates*. Ensure the original DWG/DXF was authored in those units before continuing.

## DWG import plan

The user's AC1032 (AutoCAD 2018-compatible) test drawing is recognized as DWG, but binary geometry cannot be decoded by the static frontend. `backend/dwg_service.py` provides an **optional, not-yet-deployed** FastAPI adapter to a separately installed ODA File Converter. The website's `DWG_CONVERTER_ENDPOINT` variable stays blank until the converter has been licensed, secured, deployed and tested. Even when operational, the current DXF import path cannot guarantee the preservation of advanced blocks, layouts, xrefs, hatches or proxy objects. Direct DWG open is therefore **not working yet**. Test on representative files before launching commercially.

## Current keyboard shortcuts

`F3`: OSNAP; `F7`: grid; `F8`: ortho; `F9`: snap; `Ctrl/Cmd+O`: open; `Ctrl/Cmd+S`: save project; `Ctrl/Cmd+P`: plot; `Ctrl/Cmd+Z`: undo. Double-click on the idle model canvas zooms to drawing extents; right click opens the CAD context menu.
