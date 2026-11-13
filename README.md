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

This is a functional **prototype**, not a replacement for a production CAD kernel. Test export geometry in LibreCAD, QCAD or AutoCAD before professional use. DXF import is restricted to several common 2D ASCII entity types; polyline bulges, blocks, xrefs, splines, external images, advanced hatches, annotations and layouts require a more complete CAD library. TRIM now shortens straight LINE entities to an actual crossing with another finite LINE; it does not yet support arcs, splines, polylines, extended boundaries, or full AutoCAD-style cutting edges. Rotated ellipse rendering needs refinement. No object drag-grips, advanced measurement calibration, orthogonal dimension styles, model/paper viewports, cloud storage, accounts or payments yet. PDF output uses basic vector shapes and standard Helvetica, with a simplified encoding for non-ASCII labels. Fixed-scale output can clip drawings if they exceed the paper.

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

## Typography and import status

The floating **Text / Typography** palette offers browser-installed fonts (Arial, Helvetica, Georgia, Times New Roman, Courier New, monospace), text height in model units, rotation in degrees, bold and italic display. Click **Place text**, then the insertion point; or select existing text, adjust settings and **Apply to selected**. Double-click a text entity in Select mode to load its attributes in the typography editor. The project JSON retains these settings. SVG export carries font-family, weight, style and rotation. DXF export writes TEXT rotation and a simplified STYLE table for sans, serif and monospaced fonts; **not every CAD application will map fonts identically**. The custom vector PDF writer currently substitutes standard Helvetica/Times/Courier fonts; italic, Unicode and exact matching to installed desktop fonts are **not guaranteed**.

The **File formats** palette indicates operational formats. DWG automatic upload/conversion is deliberately OFF until a licensed and secure converter endpoint is deployed and validated. Selecting a DWG reports this limitation; it does not imply the file was successfully loaded.

## Scaling to hundreds or thousands of simultaneous users

The hosted app is currently a **static, client-side CAD prototype**. Hosting the HTML/JS/CSS assets through a CDN can distribute the same application to many visitors without running an individual CAD backend for each drawing. It does **not** guarantee that hundreds or thousands of users can work smoothly, nor that every browser can handle tens of thousands of entities. Validate hosting quotas and realistic concurrent load before release.

The November 2026 rendering pass adds viewport culling, geometric bounding-box prechecks in object selection and OSNAP, and loop-based bounds for long polylines. These improvements lower unnecessary drawing work, but do not replace a proper spatial index. Still required before launch:

- Profile and stress-test 1k, 10k, 50k and 100k entities on representative Windows, macOS and mobile devices; instrument p50/p95 interaction latency and memory.
- Move expensive DWG/DXF parsing, block resolution and file conversion off the main UI thread using Web Workers and, where possible, free/open-source WebAssembly. Ship the decoder as versioned CDN assets with no per-user CAD conversion server if legally and technically practical.
- Confirm LibreDWG/WebAssembly version support, licence obligations, security and the entire file round-trip on original DWG samples before enabling. The current DWG service is NOT deployed and the frontend STILL cannot open DWG directly.
- Lazy load heavyweight format decoders; cap file sizes and entity counts; allow users to cancel long imports. The browser-only design must not freeze on malformed or huge drawings.
- Use an object spatial index (R-tree/quadtree), cached tessellation and layer-based dirty regions for large projects; avoid redrawing all geometry for each pointer movement.
- Add browser-based regression tests for import/export of original DWG/DXF, text, blocks, dimensions, xrefs, lineweights and **1:1 model units**. Show explicit warnings when fidelity is incomplete; do not silently discard unsupported entities.
- Use CDN cache/versioning, a public availability monitor, error telemetry with privacy protections, accessibility checks and measurable concurrent load tests before declaring commercial readiness.
- Save projects locally by default and explain whether any future conversion or synchronization involves uploading files. If accounts/sync/payment are added later, use a separate authenticated backend with suitable privacy, data retention, backups and cost monitoring.

A static site is cheap to distribute, but bandwidth, server-side file conversion, optional storage and support can still incur costs as usage increases. No concurrency/performance guarantee is currently claimed.

## Nov 12, 2026 — Local recovery and DWG header diagnostics

- CAD2D keeps one **browser-local IndexedDB** recovery snapshot, scheduled 1.8 s after completed model changes. The new Recovery palette can restore the latest snapshot (explicit confirmation) or delete it. This is best-effort only: browser storage may be disabled, cleared or unavailable. It is **not** cloud synchronization or a replacement for downloading .cadjson project files.
- JSON projects preserve the active `layerId` and restore it when reopening. Blocks also trigger a new recovery snapshot when definitions are added/removed.
- Picking a DWG reads only its first 32 bytes locally and displays a known `AC10xx` format header and file size. **No DWG geometry, layers, blocks, xrefs or dimensions are imported** by this diagnostic. The `DWG_CONVERTER_ENDPOINT` remains empty. Automatic DWG opening still requires a real, tested decoder.
- No drawings are sent to a server by local recovery or DWG header inspection. Browser storage is origin-scoped, may have quotas, and may be wiped by private browsing or cleanup.
- Before production use, add robust import tests, file-identity checks, worker-based decoding, stress benchmarks and licensing verification for any free DWG library.

## CAD drawing improvements — November 12, 2026

- **TRIM (basic line intersection):** click a straight LINE near the end you want removed. CAD2D finds the nearest actual crossing between the selected LINE and other visible LINE segments, and moves that endpoint to the crossing. If no finite-segment intersection exists, it refuses to change the drawing. TRIM does not yet cover arcs, polylines, circles or virtual extensions. It does not cut an interior segment into two separate lines.
- **CAD selection rectangles:** drag left-to-right to select objects whose bounding boxes lie fully inside the window; drag right-to-left for crossing selection (overlapping bounding boxes). Hold Shift to add to the selection. This is a bounding-box approximation, not yet precise segment/polygon clipping.
- Syntax and isolated geometric smoke tests verified an intersection at x=4 on a 10-unit line, no unintended changes when no crossing was found, and parallel-line rejection. Full browser interaction/regression tests still required.

## CAD-style LINE / PLINE / reusable blocks (2026-11-12)

**LINE (L):** choose sequential points; each click or typed coordinate creates a separate LINE segment. A rubber-band preview shows only the next segment. Enter or double-click finishes. Use **U** during the command to remove the last segment, and **C** (Close) after three points to draw the final closing segment. **PLINE (PL):** points are staged into one editable polyline. Enter finishes as an open polyline; **C** closes after three vertices; **U** removes the last pending vertex. Esc cancels the pending command. Absolute `X,Y`, relative `@DX,DY`, and angular `@DIST<ANGLE` in degrees work in model-space coordinates, not scaled screen pixels.

**BLOCK (B):** select objects, then create a named reusable definition in the **Blocks / Symbols** palette. By default, its insertion base point is the lower-left corner of the selected geometry's bounding box. **INSERT (I):** choose a block, set insertion scale and rotation, click a point in model space or enter an exact coordinate in the command line. Inserted geometry is editable independent entities annotated with the block name, not a linked native CAD INSERT. Undo/redo preserves block definitions and inserted geometry. Changing drawing units also converts block definitions.

**WBLOCK / EXPORTBLOCK:** download `.cadblock` JSON containing the reusable definition, native drawing units and referenced layer metadata; **IMPORTBLOCK** reads this file locally and converts units to the active model's units. **BLOCKDXF:** download ASCII DXF with the block's expanded geometry at its local origin, readable by compatible CAD applications. **IMPORTANT:** exported standalone DXF is **not** a native DXF `BLOCK` + `INSERT` reference. Native AutoCAD BLOCK/INSERT interoperability, dynamic blocks, nested references, attributes, xrefs and DWG opening remain to be implemented and tested.

These changes passed JavaScript syntax checking and isolated LINE, closed-PLINE and transformed-block math tests. Full interactive/browser end-to-end testing and external CAD roundtrip checks are still required.

## CAD Modify tools — OFFSET, TRIM, CHAMFER, FILLET, PRINT/PLOT

**New Modify geometry palette:** configure positive Offset distance, Chamfer distance and Fillet radius in the current model's units (1:1), then choose the command. The Modify ribbon and Quick tools also show CHAMFER/FILLET. CAD command aliases: OFFSET/O, TRIM/TR, CHAMFER/CHA and FILLET/F.

- **OFFSET:** click a straight LINE (or a CIRCLE), then click the desired side. For a line, the new parallel segment is moved to the chosen side by the specified real-world distance. For a circle, click outside to increase radius or inside to reduce it; invalid negative/zero results are rejected. The original entity is kept. Other entity types, joined polylines and corner mitres are not yet supported.
- **TRIM:** click a LINE near the end to remove it to its next real finite-line crossing; other types are not yet supported. This is not the full AutoCAD boundary/quick-trim algorithm.
- **CHAMFER:** click two different straight LINE entities. The program calculates their geometric corner, shortens each near endpoint by the requested equal distance, and creates a chamfer LINE. It refuses parallel, interior-crossing, degenerate or too-short cases. Separate distance-1 and distance-2, dynamic blocks and polyline corner editing remain future work.
- **FILLET:** click two different straight LINE entities. The program calculates tangent points and a constant-radius arc at the geometric intersection, shortens the lines, and adds an ARC. It refuses impossible radii and degenerate cases. It currently only handles straight line pairs, not circle/arc/polyline curve blending.
- **PRINT / PLOT:** button in the Modify geometry palette opens the existing vector plot panel; A0–A4, page orientation, fixed 1:N paper scale, previews and PDF/SVG/PNG outputs remain available. Review warnings when a drawing exceeds the selected printable area. Use **Actual Size / 100%** when physically printing.

The November 2026 checks verified UI JavaScript syntax and isolated geometry calculations: LINE offset +2 and -2; CIRCLE radius 5 offset to 7 and 3; 90° equal-distance chamfer at 2 units; and 90° radius-1 fillet with tangency at both endpoints. Browser interaction, real printouts and external-CAD DXF round trips still need separate acceptance testing.

## Technical dimensioning (November 12, 2026)

The **Dimensions / Annotation** palette now offers nine experimental methods: **aligned, horizontal, vertical, angular (3 points), radius, diameter, ordinate X, ordinate Y, and leader text**. Controls include decimal precision (0–4), dimension text height and arrow size measured in current model units, a display-unit selector (drawing / mm / cm / m / in / ft), optional suffix and symmetric tolerance. This keeps the underlying model coordinates 1:1 and performs display conversions only for labels. The CAD command box accepts DIM/DIMLINEAR, DIMALIGNED/DAL, DIMHORIZONTAL, DIMVERTICAL, DIMANGULAR, DIMRADIUS, DIMDIAMETER, DIMORDINATE(X/Y), and LEADER/MLEADER.

For linear dimensions, enter two points and then the dimension-line location. For angular dimensions, enter the vertex, first ray, and second ray. For radius and diameter, click an existing CIRCLE followed by an annotation-placement point. For ordinates and leaders, enter two points. Select dimension entities and click **Apply to selected** to update their annotation styles.

These are custom editable CAD2D `dimension` entities, currently **not associative** with source geometry. DXF and SVG/PDF export expand the dimensions into vector lines, arcs/polyline samples and text rather than real native AutoCAD DIMENSION entities. A third-party CAD application may display the resulting geometry but cannot necessarily edit it as a true dimension. The PDF writer uses standard fonts, substituting text such as diameter/degree/tolerance symbols when exact glyph support is missing. No production claim of standards-compliant dimension styles (ISO 129 / ASME Y14.5), annotative scaling, chained/baseline series, geometrical tolerances, per-layout dimension styles, or DWG interoperability is made yet.

Standalone math smoke tests checked nine geometry/label cases (including 3–4–5 model-unit aligned linear dimensions, 90° angular dimension, 5-unit circle radius and 10-unit diameter, ordinate coordinates, mm conversion from meters and ± tolerance). JavaScript source syntax was validated. Browser-interaction/plot/DXF external roundtrips remain open test tasks.
