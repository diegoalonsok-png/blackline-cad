# CAD2D3D by Blackline — Online 2D & 3D CAD for Architecture

**CAD2D3D by Blackline** (formerly CAD2D / Blackline CAD) is a browser-based application for 2D technical drafting and architectural 3D modeling. Remote DWG conversion is currently disabled; DXF remains the primary interchange workflow.

- **CAD 2D y 3D online (ES):** https://blackline-cad.org/cad-2d-3d-online
- **Online 2D & 3D CAD (EN):** https://blackline-cad.org/online-2d-3d-cad
- **Português:** https://blackline-cad.org/cad-2d-3d-online-br
- **Français:** https://blackline-cad.org/cao-2d-3d-en-ligne
- **Deutsch:** https://blackline-cad.org/cad-2d-3d-online-de
- **Italiano:** https://blackline-cad.org/cad-2d-3d-online-it
- **ArqAssist / editable CAD block search:** https://blackline-cad.org/online-cad-blocks#arqassist
- **Teaching worksheet:** https://blackline-cad.org/cad-2d-education#ficha-docente
- **Editor DXF online (ES):** https://blackline-cad.org/editor-dxf-online
- **Online DXF editor (EN):** https://blackline-cad.org/online-dxf-editor
- **Render arquitectónico (ES):** https://blackline-cad.org/render-arquitectonico-online
- **Architectural rendering (EN):** https://blackline-cad.org/online-architectural-rendering
- **Guías CAD (ES):** https://blackline-cad.org/guias-cad
- **CAD guides (EN):** https://blackline-cad.org/cad-guides

- **Official website / aplicación CAD 2D online:** https://blackline-cad.org/
- **Command reference / manual de comandos:** https://blackline-cad.org/manual-comandos
- **CAD 2D online guide / guía de dibujo técnico:** https://blackline-cad.org/guia-cad-2d-online
- **House-plan drawing exercise / plano de casa CAD 2D:** https://blackline-cad.org/plano-casa-cad-2d-online
- **Features:** 2D drafting, layers, object snaps, associative dimensions and named dimension styles, blocks with attributes, dynamic architectural block library, XREF, layouts and plotting to PDF with CTB, DXF import/export, PDF import (vector, with layers), cloud projects
- **License:** Proprietary, all rights reserved. Public source visibility does not grant reuse rights; see [LICENSE](LICENSE).

**Español:** Blackline CAD es un editor CAD 2D en el navegador para dibujo técnico, arquitectura y planos. Incluye dibujo 2D, capas, referencias a objetos, cotas asociativas con estilos, bloques con atributos y biblioteca de bloques dinámicos, XREF, presentaciones y ploteo a PDF con CTB, importación y exportación DXF, importación de PDF vectorial con capas y proyectos en la nube.

A browser-based CAD workspace with English and Spanish interface options, a command line, 2D drafting and architectural 3D modeling. Core drafting remains free; Pro features are subject to the current plan.

## Run

Open `index.html` in a modern Chromium, Firefox, or Safari browser. Or serve with `python3 -m http.server 8000` and visit `http://localhost:8000`.

## Included features

- Zoomable and pannable coordinate workspace (not constrained to a preset document size)
- Configurable grid, grid snap, orthographic mode and basic object snaps
- Units: millimeters, centimeters, meters, inches, feet; changing units converts existing geometry
- 2D LINE, POLYLINE, RECTANGLE, CIRCLE, ARC, ELLIPSE, TEXT and DIMENSION
- Selection, duplicate, delete, move, copy, rotate, scale, mirror, basic offset, basic trim, undo and redo
- Editable drawing layers with color, visibility and locking
- DXF R2000 import and export (blocks, attributes, MTEXT, hatches, dimensions), optional remote DWG conversion (currently disabled)
- Vector PDF export with ISO A0–A4, US Letter, Legal, ARCH D/E, custom page size, model-to-paper scale and title block
- SVG and PNG exports; JSON project save/open
- Bottom command bar, coordinate entry, selection properties and keyboard shortcuts

## Compatibilidad / Compatibility

- **DWG:** la conversión remota está desactivada (`DWG_ACTIVO=false` en `cad2d-config.js`) para evitar costes. Usar DXF como intercambio principal; cualquier alternativa local debe verificarse con archivos reales.
- **DXF:** importación y exportación R2000 con capas, tipos de línea, bloques e INSERT, atributos, MTEXT, sombreados y cotas (lineales y alineadas como cotas nativas).
- **PDF:** exportación vectorial con capas (OCG) y estilos de ploteo CTB; importación de PDF vectorial con capas y escala de ploteo.
- **Recomendación:** como con cualquier intercambio entre programas CAD, revisá el archivo resultante antes de entregarlo.

## Deployment

Upload `index.html` to a GitHub Pages repository or Cloudflare Pages. The hosted GitHub Pages frontend currently runs CAD drawing and ASCII DXF/SVG import locally, without a live conversion backend. The production-domain configuration currently disables remote DWG-to-DXF conversion to avoid hosting costs. GitHub Pages without that configuration works with DXF/SVG directly. See `backend/README.md`. Stripe and login can be integrated subsequently with a trusted server / verified webhook; never add Stripe secret keys to the frontend.

## Intellectual property

Blackline CAD uses original HTML/CSS/JavaScript. It does not redistribute third-party UI artwork, program code or trademarks.

## CAD2D movable palettes

Drag any palette title to undock and move it across the drawing. Resize floating palettes from the lower-right corner. Each palette title provides Float, Dock left, Dock right, and Collapse buttons. The header includes **Reset layout**. Dock positions are stored locally in the browser. The public GitHub Pages URL stays `/blackline-cad/` for continuity.

## Geometry scale 1:1 verification

CAD2D model space retains imported DXF coordinates as-is in declared drawing units; zoom does **not** change model geometry. Use the command **`SCALETEST`** to load `examples/scale-1to1-test.dxf`, a DXF declared in meters containing an exact **10 m LINE**, **4 m LINE** and **1 m radius CIRCLE**. CAD2D selects the 10 m line and confirms its measured length. Use **`1:1 CHECK`** or **`SCALECHECK`** to inspect model extents and exact selected line length. `@10<45` inputs a ten-unit, 45° polar offset and `@3,0` is a relative Cartesian offset.

**Paper 1:1 is different from model 1:1.** When drawing units are meters, a 10 m line would need 10,000 mm of paper at plot ratio 1:1. An A0 plot would therefore clip it. Fit-to-page changes the paper scale, not the model's coordinates.

DXF files with missing/unsupported `$INSUNITS` require explicit user unit selection. Units are *assigned without multiplying the stored coordinates*. Ensure the original DWG/DXF was authored in those units before continuing.

## DWG import and DXF conversion

Remote DWG-to-DXF conversion is currently disabled in `cad2d-config.js`. DXF is the recommended exchange format. Local DWG decoding and binary DWG writing are not certified by this documentation update. Advanced blocks, layouts, xrefs, hatches and proxy objects may not be preserved; test representative files and 1:1 units.

## Desktop-CAD interaction improvements (November 2026)

- `Z` / `ZOOM` followed by Enter enters zoom options: `-` to zoom out, `+` to zoom in, `E` for extents, `W` for a rectangular window, and `P` for the previous viewport.
- Numeric zoom factors such as `2x`, `0.5x`, or `2` work after entering ZOOM. `ZP` / `ZOOMPREVIOUS` restores an earlier viewport. Up to 30 previous viewport states are retained for the current session.
- `SELECTALL` selects visible, unlocked entities; `SELECTINVERT` inverts that selection among visible, unlocked entities; `DESELECT` clears it. Ctrl/Cmd+A selects all while the model canvas itself has keyboard focus.
- The idle cursor shows a crosshair without a central square. The adjustable pickbox is shown only with active drawing/editing commands; selection/editing modes use a square selector.
- These changes concern interaction and viewport state, not model coordinates or saved entity geometry.

## General workflow improvements (November 2026)

- **Right click on an inserted block → Editar bloque (BEDIT)** opens a guarded 2D block-definition editor. The editable JSON is validated before saving, with Cancel, Export backup copy, and Undo support. Existing specialized parametric blocks are edited via the Properties palette rather than overwriting the parametric generator.
- **I + Enter** opens the computer file picker for importing supported `.cadblock` or `.dxf` block libraries; **W + Enter** exports the selected block to a portable `.cadblock` file. **INSERT + Enter** continues to insert a previously chosen library definition.
- Native `.cadblock` export **version 2** preserves `dynamic2d` and supported parametric definition defaults. The importer accepts older version 1 and new version 2, converts length parameters between model units, validates metadata before mutation, and refuses to overwrite definitions that are already used by placed references.
- One gallery-thumbnail click selects a symbol and arms its insertion; a second click in the canvas places **one** instance. The older repeat-insert default has been disabled in this gallery workflow.
- This is **not** a native dynamic DWG editing implementation; unsupported file geometry and proprietary dynamic constraints remain outside scope. Verify graphical behavior in a browser prior to production use.

## Parametric architectural walls (first 2D stage)

- Use **MURO** / **WALL** or the *Muros paramétricos 2D* panel to draw a linked pair of wall faces, with a true model-space thickness.
- Presets: **8, 10, 12, 15, 20, 30 cm**, plus custom thickness (4 cm to 3 m); default 20 cm. Thickness may differ from segment to segment.
- Reference-line justification: **left / center / right**, relative to drawing direction. Consecutive clicks create continuous wall runs; Enter ends the operation.
- New unobstructed wall segments automatically join independently created compatible wall segments at **L corners** (mitred faces), and form conservative **T butt joints** at the near face of an existing wall. Different thicknesses are allowed.
- Parametric doors and windows placed near these walls auto-align and cut **both wall faces together**, never just one. An unsupported condition leaves the wall untouched instead of attempting a risky partial cut. Existing opening fragments and locked objects are not silently rewritten by auto-join.
- These operations are a limited Blackline native 2D representation, not yet an AEC wall entity or a guarantee of comprehensive X / complex junction resolution. Validate real drawings and DXF interchange before production reliance.

## Dynamic 2D blocks — opt-in first stage

- Select an inserted block reference and use **Selection / Properties → BLOQUE DINÁMICO 2D → Activar estiramiento** to enable dynamic dimensions for that block definition.
- Supported for blocks built from LINE, RECTANGLE, POLYLINE, and TEXT with nonzero local width and height. Existing parametric door/window/table definitions keep their existing dedicated controls. Unsupported geometries are not silently transformed.
- Selected dynamic blocks expose two **yellow diamond grips** for independent local X (width) and Y (height) stretching, plus the usual insertion-point grip for moving the block. Dimensions can also be entered numerically in Properties and applied without exploding the block.
- Each block reference stores independent width/height values in the CADJSON project; changing one instance does not resize other references. The underlying definition remains intact. Undo works via the existing drawing history.
- Current scope is a Blackline CAD native 2D dynamic-block subset, **not** a complete dynamic-block authoring engine. DWG dynamic constraints, lookup tables, visibility states, stretch actions, and anonymous block records are not imported or round-tripped as native editable dynamic features.

## Current keyboard shortcuts

`F3`: OSNAP; `F7`: grid; `F8`: ortho; `F9`: snap; `Ctrl/Cmd+O`: open; `Ctrl/Cmd+S`: save project; `Ctrl/Cmd+P`: plot; `Ctrl/Cmd+Z`: undo. Double-click on the idle model canvas zooms to drawing extents; right click opens the CAD context menu.

## Typography and import status

The floating **Text / Typography** palette offers browser-installed fonts (Arial, Helvetica, Georgia, Times New Roman, Courier New, monospace), text height in model units, rotation in degrees, bold and italic display. Click **Place text**, then the insertion point; or select existing text, adjust settings and **Apply to selected**. Double-click a text entity in Select mode to load its attributes in the typography editor. The project JSON retains these settings. SVG export carries font-family, weight, style and rotation. DXF export writes TEXT rotation and a simplified STYLE table for sans, serif and monospaced fonts; **not every CAD application will map fonts identically**. The custom vector PDF writer currently substitutes standard Helvetica/Times/Courier fonts; italic, Unicode and exact matching to installed desktop fonts are **not guaranteed**.

The **File formats** palette indicates operational formats. Remote DWG upload/conversion is currently disabled by production-domain configuration. A recognized DWG header alone does not establish a successful import; verify the converted DXF geometry in the editor.

## Scaling to hundreds or thousands of simultaneous users

The hosted app runs client-side (static assets on a CDN) with a separate billing/cloud API and an optional remote DWG conversion service (currently disabled). Hosting the HTML/JS/CSS assets through a CDN can distribute the same application to many visitors without running an individual CAD backend for each drawing. It does **not** guarantee that hundreds or thousands of users can work smoothly, nor that every browser can handle tens of thousands of entities. Validate hosting quotas and realistic concurrent load before release.

The November 2026 rendering pass adds viewport culling, geometric bounding-box prechecks in object selection and OSNAP, and loop-based bounds for long polylines. These improvements lower unnecessary drawing work, but do not replace a proper spatial index. Still required before launch:

- Profile and stress-test 1k, 10k, 50k and 100k entities on representative Windows, macOS and mobile devices; instrument p50/p95 interaction latency and memory.
- Move expensive DWG/DXF parsing, block resolution and file conversion off the main UI thread using Web Workers and, where possible, free/open-source WebAssembly. Ship the decoder as versioned CDN assets with no per-user CAD conversion server if legally and technically practical.
- Confirm converter service uptime, LibreDWG licensing, security, supported DWG versions, and the full DWG-to-DXF import round-trip on actual samples. The frontend does not parse binary DWG directly; it imports DXF returned by the configured service.
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

## LINE / PLINE / reusable blocks (2026-11-12)

**LINE (L):** choose sequential points; each click or typed coordinate creates a separate LINE segment. A rubber-band preview shows only the next segment. Enter or double-click finishes. Use **U** during the command to remove the last segment, and **C** (Close) after three points to draw the final closing segment. **PLINE (PL):** points are staged into one editable polyline. Enter finishes as an open polyline; **C** closes after three vertices; **U** removes the last pending vertex. Esc cancels the pending command. Absolute `X,Y`, relative `@DX,DY`, and angular `@DIST<ANGLE` in degrees work in model-space coordinates, not scaled screen pixels.

**BLOCK (B):** select objects, then create a named reusable definition in the **Blocks / Symbols** palette. By default, its insertion base point is the lower-left corner of the selected geometry's bounding box. **INSERT (I):** choose a block, set insertion scale and rotation, click a point in model space or enter an exact coordinate in the command line. Inserted geometry is editable independent entities annotated with the block name, not a linked native CAD INSERT. Undo/redo preserves block definitions and inserted geometry. Changing drawing units also converts block definitions.

**WBLOCK / EXPORTBLOCK:** download `.cadblock` JSON containing the reusable definition, native drawing units and referenced layer metadata; **IMPORTBLOCK** reads this file locally and converts units to the active model's units. **BLOCKDXF:** download ASCII DXF with the block's expanded geometry at its local origin, readable by compatible CAD applications. **IMPORTANT:** exported standalone DXF is **not** a native DXF `BLOCK` + `INSERT` reference. Native BLOCK/INSERT interoperability, dynamic blocks, nested references, attributes, xrefs and DWG opening remain to be implemented and tested.

These changes passed JavaScript syntax checking and isolated LINE, closed-PLINE and transformed-block math tests. Full interactive/browser end-to-end testing and external CAD roundtrip checks are still required.

## CAD Modify tools — OFFSET, TRIM, CHAMFER, FILLET, PRINT/PLOT

**New Modify geometry palette:** configure positive Offset distance, Chamfer distance and Fillet radius in the current model's units (1:1), then choose the command. The Modify ribbon and Quick tools also show CHAMFER/FILLET. CAD command aliases: OFFSET/O, TRIM/TR, CHAMFER/CHA and FILLET/F.

- **OFFSET:** click a straight LINE (or a CIRCLE), then click the desired side. For a line, the new parallel segment is moved to the chosen side by the specified real-world distance. For a circle, click outside to increase radius or inside to reduce it; invalid negative/zero results are rejected. The original entity is kept. Other entity types, joined polylines and corner mitres are not yet supported.
- **TRIM:** click a LINE near the end to remove it to its next real finite-line crossing; other types are not yet supported. This is not a full boundary/quick-trim algorithm.
- **CHAMFER:** click two different straight LINE entities. The program calculates their geometric corner, shortens each near endpoint by the requested equal distance, and creates a chamfer LINE. It refuses parallel, interior-crossing, degenerate or too-short cases. Separate distance-1 and distance-2, dynamic blocks and polyline corner editing remain future work.
- **FILLET:** click two different straight LINE entities. The program calculates tangent points and a constant-radius arc at the geometric intersection, shortens the lines, and adds an ARC. It refuses impossible radii and degenerate cases. It currently only handles straight line pairs, not circle/arc/polyline curve blending.
- **PRINT / PLOT:** button in the Modify geometry palette opens the existing vector plot panel; A0–A4, page orientation, fixed 1:N paper scale, previews and PDF/SVG/PNG outputs remain available. Review warnings when a drawing exceeds the selected printable area. Use **Actual Size / 100%** when physically printing.

The November 2026 checks verified UI JavaScript syntax and isolated geometry calculations: LINE offset +2 and -2; CIRCLE radius 5 offset to 7 and 3; 90° equal-distance chamfer at 2 units; and 90° radius-1 fillet with tangency at both endpoints. Browser interaction, real printouts and external-CAD DXF round trips still need separate acceptance testing.

## Technical dimensioning (November 12, 2026)

The **Dimensions / Annotation** palette now offers nine experimental methods: **aligned, horizontal, vertical, angular (3 points), radius, diameter, ordinate X, ordinate Y, and leader text**. Controls include decimal precision (0–4), dimension text height and arrow size measured in current model units, a display-unit selector (drawing / mm / cm / m / in / ft), optional suffix and symmetric tolerance. This keeps the underlying model coordinates 1:1 and performs display conversions only for labels. The CAD command box accepts DIM/DIMLINEAR, DIMALIGNED/DAL, DIMHORIZONTAL, DIMVERTICAL, DIMANGULAR, DIMRADIUS, DIMDIAMETER, DIMORDINATE(X/Y), and LEADER/MLEADER.

For linear dimensions, enter two points and then the dimension-line location. For angular dimensions, enter the vertex, first ray, and second ray. For radius and diameter, click an existing CIRCLE followed by an annotation-placement point. For ordinates and leaders, enter two points. Select dimension entities and click **Apply to selected** to update their annotation styles.

These are custom editable CAD2D `dimension` entities, currently **not associative** with source geometry. DXF and SVG/PDF export expand the dimensions into vector lines, arcs/polyline samples and text rather than real native DIMENSION entities. A third-party CAD application may display the resulting geometry but cannot necessarily edit it as a true dimension. The PDF writer uses standard fonts, substituting text such as diameter/degree/tolerance symbols when exact glyph support is missing. No production claim of standards-compliant dimension styles (ISO 129 / ASME Y14.5), annotative scaling, chained/baseline series, geometrical tolerances, per-layout dimension styles, or DWG interoperability is made yet.

Standalone math smoke tests checked nine geometry/label cases (including 3–4–5 model-unit aligned linear dimensions, 90° angular dimension, 5-unit circle radius and 10-unit diameter, ordinate coordinates, mm conversion from meters and ± tolerance). JavaScript source syntax was validated. Browser-interaction/plot/DXF external roundtrips remain open test tasks.

## CAD command toolbar, themes and advanced Modify (November 2026)

The CAD2D interface now includes a compact Home/Draw/Modify/Annotate ribbon and a separate draggable **QUICK CAD** toolbar on the drawing canvas. Grab the dotted title bar to reposition the toolbar; use the **− / +** control to collapse or expand it. Its position is stored locally per browser. Side palettes and the main ribbon remain draggable/dockable using their existing controls. The compact ribbon now defaults to ~68 px height, retaining vertical resizing.

The **Display / Cursor colors** palette offers presets: Classic Dark, Black, Light Drafting and Blueprint Blue. Individual cursor/background/grid/axes/selection colors remain configurable and are saved to localStorage. The **Object color / CAD properties** palette edits the explicitly selected unlocked entities' color and lineweight; ByLayer removes explicit overrides. Layer colors remain independently configurable in the Layer Manager. Exporters retain explicit object colors where supported.

The Modify ribbon / Advanced Modify palette contains new commands:
- **EXTEND / EX**: click near a straight LINE endpoint to extend to the nearest crossing finite LINE boundary ahead of that endpoint. No change if a boundary is not found.
- **JOIN / J**: select two or more connected LINE segments in one nonbranching chain, converting them to an editable PLINE. This does not handle branching topology, arcs or splines.
- **EXPLODE / X**: split selected PLINE and RECT entities into separate LINE segments. Block references remain unlinked/expanded as previously documented.
- **REVERSE**: reverse the orientation of selected LINE and PLINE entities.
- **ARRAY / AR**: rectangular duplicate array of selected entities, with configurable rows, columns and X/Y spacing in model units. Capped at 20,000 new entities.
- **COLOR**: scroll to the object color editor for selected entities.

This is a growing experimental 2D CAD, **not a clone of any desktop CAD**. Native DWG editing, associative dimensions, parametric constraints, dynamic blocks, 3D modeling, advanced splines and full external CAD compatibility remain pending. Syntax checking and isolated math/function tests passed; full browser and external CAD roundtrip verification remain necessary.

## CAD 2D command-reference cross-check (November 2026)

The material discusses LINE, PLINE, POLYGON, HATCH, drawing/modification commands, object snaps, layers and view controls. CAD2D implements its tools independently.

New additions:
- **POL / POLYGON:** choose a regular polygon's center and first vertex. The configurable 3–128-sided polygon is stored as one editable closed polyline, keeping coordinates 1:1 and exporting through existing DXF/SVG/PDF geometry.
- **H / HATCH:** select a closed polygon/polyline, rectangle, or circle first, then choose hatch spacing, angle and parallel or crosshatched direction in the *Polygon / Hatch / Table* palette. The program clips lines to each boundary and generates independent editable LINE entities. It does not yet create associative or native CAD HATCH entities, nor does it recognize holes/islands; hatching is capped at 12,000 segments for browser safety.
- **TABLE:** set grid dimensions (up to 40 × 15) and cell sizes in model units, then click an insertion point. The resulting table is a grid of editable lines with individually editable text objects, not a native CAD TABLE object.
- **OSNAP:** finite straight LINE/LINE intersection snapping and circle quadrants supplement endpoint, midpoint, center and existing vertex candidates. Intersection markers are prioritized when coincident with midpoints. Pair checking is limited to 70 eligible nearby lines to control pointer latency. Other advanced snap modes (tangent/perpendicular/nearest/parallel) are not implemented yet.

Checks completed: JavaScript syntax; regular hexagon geometry with radius 5; square clipped horizontal and 45-degree hatch geometry; 12k safety rejection for dense patterns; line intersection and circle quadrant OSNAP. Full browser tests, export roundtrips and compatibility with complex CAD files are still pending.

## Layout 1 / Paper Space and PDF sheet setup (November 2026)

CAD2D now has **MODEL**, **LAYOUT 1**, and **PLOT / PDF** tabs at the base of model space. MODEL preserves 1:1 world-unit geometry and normal CAD tools. LAYOUT 1 is a separate printable paper-space view with A0/A1/A2/A3/A4, Letter and ARCH D pages; portrait/landscape; Fit or fixed 1:1–1:1000 scale; configurable millimeter margins; monochrome/color; optional basic title block; live SVG sheet preview and direct **vector PDF** export. A warning identifies drawings whose extents could be clipped at the chosen scale. **PLOT / PDF** opens the pre-existing advanced dialog, which also handles custom sheet dimensions, SVG and PNG output.

LAYOUT controls share the existing `plotOptions`, `makeSVG` and `makePDF` machinery so model entities are not copied or scaled in the source model. The physical PDF page size is in millimeters; fixed print scale is computed from model units. Layout settings are saved in `.cadjson` project files and IndexedDB recovery snapshots, and in browser-local preferences. Command aliases: `LAYOUT`, `PSPACE`, `PAPERSPACE`, `MSPACE`. This is the first **single-sheet paper-space workspace**, not yet multiple named layouts with movable viewport boundaries, multiple model viewports or full paper-space annotation entities. Preview and PDF are not yet externally verified in an interactive browser or CAD desktop application.

## Professional UI and CAD commands (November 2026)

The desktop CAD2D UI has refreshed ribbon, tab, palettes, sidebar, input and status styling with subdued drafting-blue accents, consistent borders, clearer active controls and a searchable command launcher in the top brand bar. The command finder searches by CAD command name, alias and description; clicking a result submits that command. It only advertises a subset with implemented behavior.

Additional command aliases and working command actions:

| CAD2D command | CAD workflow |
| --- | --- |
| `AREA`, `AA` | Calculate area of selected rectangles, circles, ellipses or closed polylines; otherwise point-by-point polygon area, Enter to finish |
| `ID` | Click the model to report precise X/Y coordinates |
| `LIST`, `LI` | Show selected object details, length and applicable area |
| `MATCHPROP`, `MA` | Pick source then target(s) to copy layer, color, linetype and lineweight; Enter stops |
| `SELECTALL` | Select visible, unlocked entities |
| `PURGE`, `PU` | Confirm removal of unused, unlocked layers only; selected layer and layer 0 are preserved |
| `LAYER`, `LA`; `LTYPE`, `LT` | Open layer property controls |
| `PROPERTIES`, `PR`, `CHPROP` | Show selection properties |
| `STYLE`, `ST` | Show font/typography controls (not a full text-style manager) |
| `DIMSTYLE`, `D` | Show dimension styling controls (not native DIMSTYLE objects) |
| `ED`, `TEDIT` | Load selected text into typography palette and allow edits |
| `REGEN`, `RE`, `REDRAW` | Redraw model viewport |
| `QSAVE`, `SAVEAS`, `OPEN`, `NEW` | Save or open project, new drawing with confirmation |
| `EPDF`, `PLOT` | Open vector plotting and PDF layout |
| `COPYCLIP`, `PASTECLIP`, `CUTCLIP` | In-browser geometry clipboard, pasted at model cursor |
| `Ctrl/Cmd+C`, `Ctrl/Cmd+V`, `Ctrl/Cmd+X` | CAD clipboard shortcuts when not editing text/form inputs |

Typography palette adds explicit **Copy text** and **Paste text** buttons using the browser Clipboard API on supported HTTPS browsers. Native text-input Ctrl/Cmd+C and Ctrl/Cmd+V are preserved. If system clipboard permissions are denied, users can focus the field and use ordinary keyboard clipboard operations.

Supported geometry commands remain intentionally **limited** compared with desktop CAD applications. Area measurements use idealized model geometry and do not account for holes/islands. MATCHPROP applies basic visual properties, not complete CAD object styles. The in-app CAD clipboard is not a DWG-aware system clipboard and does not exchange objects across third-party CAD desktop applications. No 3D/parametric CAD tools or full DWG import are claimed.

Implementation was checked with JavaScript syntax parsing and isolated tests for rectangular/polygon/circle AREA, the clipboard copying a 2-unit red line from (1,2) to (10,20) preserving color and length. Full interactive browser, accessibility, PDF and third-party CAD round-trip tests remain outstanding.


## CAD2D dimension styles and BREAK editing (November 2026)

**Named dimension styles:** The Dimensions / Annotation palette now has a style selector and Save style / Delete style controls. A style stores text height, arrow size, precision, drawing/display units, suffix and optional ± tolerance. Save styles under distinct names, choose one as the active preset, draw new dimensions using its values, or use "Apply to selected" to restyle existing dimensions. New annotations record the active style name as metadata, but remain **non-associative** custom CAD2D dimension entities; changing a style definition does not automatically update existing dimensions. Styles and the active style are included in downloadable `.cadjson` files and browser IndexedDB recovery snapshots and participate in undo/redo. Changing drawing units scales stored text height and arrow size in model units. These are **not native DIMSTYLE tables** in DXF or DWG.

**BREAK / BR:** Choose this command from the Modify ribbon, Advanced Modify palette, Quick CAD floating toolbar or command prompt. Click an unlocked straight LINE near the intended first cut point; click a second point on the same LINE. The portion between those projected points is removed and the remaining portions retain the original line's color, layer and lineweight. Segment boundaries and degenerate cuts are checked; coincident points do not change the drawing. Supports straight LINE entities only—not PLINE, ARC, SPLINE or multiple-object break, and not a full BREAKATPOINT implementation.

**Verification:** Complete JavaScript syntax checked. Isolated geometry tests: 10-unit LINE broken at 3 and 7 produced segments 0–3 and 7–10; endpoint break produced the expected remaining segment; coincident break points produced no geometry changes. Full browser mouse-interaction and external DXF/PDF roundtrip tests are still required.

## November 13, 2026 — Larger, configurable drawing workspace

The drafting application now loads `workspace-upgrade.css` and `workspace-upgrade.js` alongside the existing CAD engine. The initial desktop workspace allocates more horizontal space to model space, collapses the right-hand dock by default, and offers **Focus** (F11 while the CAD page has focus), **Workspace** configuration, and **Guest** status in the header.

- Reversible controls show/hide left/right sidebars, top ribbon, floating quick tools, and each individual palette.
- Palettes can be floated, moved, resized and docked on either side; floating geometry and collapsed state are saved in browser-local storage. Ribbon groups may be reordered with their small grip; group order is saved independently per ribbon tab.
- Focus mode leaves the drawing canvas, compact command bar and status indicators visible. It does not alter model scale, coordinates or exported geometries.
- The existing **Reset layout** button restores CAD dock locations; the newer **Workspace → Reset workspace** also clears palette visibility and returns to a compact default with a hidden right dock.

### Guest access and future accounts

The page records a local first-use timestamp and displays a **90-day guest countdown**. This is a usability indicator, **not a secure trial or proof of user identity**: browser storage can be cleared and cannot be shared across devices. There is currently **no actual account registration, authentication, remote project synchronization, payment processing, or hard account lock**. To avoid blocking drawing without a usable identity system, the site continues to operate as a public beta after day 90.

The script accepts an optional deployment-time `window.CAD2D_AUTH_CONFIG` object (set *before* loading the workspace script) with HTTPS `loginUrl`, HTTPS `statusUrl`, and `enforce: true`. Only when all are present and a reachable server verifies a user is unauthenticated does the client show a post-trial registration gate. The backend must enforce sessions and subscriptions **on the server**; do not trust a browser-side timestamp, JavaScript visibility gate or editable local storage for billing. The exact three-month/90-day entitlement should be assigned to a server-verified account/device strategy at launch, in compliance with applicable privacy regulations.

### Migration and monetization phase — after validation

Keep GitHub Pages as the free development/QA environment. After confirming CAD editing, project recovery, DXF/JSON/PDF import/export, responsive workspace behavior and usage on several browsers, migrate the static frontend to **Cloudflare Pages**. Use Cloudflare Workers plus a secure identity/entitlement datastore if account registration and subscriptions are deployed; integrate Stripe Checkout, Customer Portal and verified webhooks in the backend only. Do not put Stripe secret keys in static JavaScript. Preserve the existing URL with a redirect only after the new deployment passes smoke tests. Cloudflare migration, paid subscriptions and mandatory post-trial registration are **planned, not yet active**.

## Cursor pickbox, wheel double-click zoom, LENGTHEN and PEDIT (November 2026)

- The drawing cursor now includes a small **yellow square pickbox**. It is **filled when a drawing/editing command is active** (or has pending input) and **hollow when CAD2D is idle** in SELECT/PAN. Existing yellow crosshair and OSNAP markers remain in place; this status mark does not indicate that an entity has been selected.
- **Double-click the middle mouse button / wheel** within 380 ms and within 14 screen pixels to call **Zoom Extents**, fitting all visible drawing geometry into the model workspace. Middle-button drag continues to pan. Ordinary wheel rolling still zooms toward the cursor, and left-button double click retains its previous behavior. Browser and mouse drivers can intercept wheel-button clicks, so hardware verification remains necessary.
- **LENGTHEN / LEN**: choose positive/negative Delta or Total length in model units in Advanced Modify. Click near the LINE endpoint to change; impossible and zero-length results are refused. Does not yet edit arcs/polylines.
- **PEDIT / PE**: select one unlocked polyline, choose vertex index (1-based), then move, insert a vertex after the chosen vertex, or delete a vertex. Moving/inserting accepts a click or exact X,Y typed in the command bar. Minimum vertex counts prevent invalid polylines. This is a subset of classic PEDIT, not full width/spline/curve fit editing.

JavaScript syntax verified. Logic tests passed for fast vs slow and near vs distant middle-button clicks, active vs idle command cursor state, LENGTHEN positive/negative/total length (with invalid values rejected), and PEDIT moving/inserting/deleting vertices (with invalid index rejected). Full in-browser UI and physical mouse double-click behavior have not yet been verified.

## Galería arquitectónica, bloques dinámicos y comandos nuevos (18 nov 2026)

**Galería grande (`GALERIA`, `BANO`, `COCINA`, `ESCALERA` o el botón ⤢ de la paleta *GALERÍA ARQ*).** 147 bloques paramétricos de geometría propia, en 15 categorías, en planta y a escala 1:1:

| Categoría | Bloques |
| --- | --- |
| Baños completos (13) | toilette, toilette esquinero, baño mínimo, con ducha y bidet, con bañera, completo bañera + bidet, en suite doble bacha, principal (bañera + ducha + doble bacha), accesible con giro Ø1,50, compartimentado, con bañera esquinera, de servicio, sanitario público con cabinas y mingitorios |
| Cocinas completas (12) | kitchenette, lineal, paralela, en L, en L con desayunador, en U, con isla, con península, cocina-comedor, integrada con isla y banquetas, lavadero, cocina + lavadero |
| Sueltos (122) | sanitarios, equipos de cocina (anafes de 2/4/5 hornallas, bachas, heladeras, lavavajillas, mesadas, alacenas, campana, lavarropas…), escaleras (recta, L, U, caracol, rampa 8 %), mobiliario (sofá en L, piano, ping-pong…), dormitorio (mesa de luz, cómoda, vestidor), exterior y vegetación, vehículos (motos, scooter, colectivo, pickup), equipos, alzados, personas, oficina, símbolos |
| Obra y maquinaria (6) | retroexcavadora, camión hormigonero, grúa torre con radio de giro, volquete, andamio modulado, obrador |

Un clic en la miniatura y otro en el plano. El bloque va a una capa propia (`A-SANITARIOS`, `A-EQUIPAMIENTO`, `A-MOBILIARIO`, `A-ESCALERAS`, `A-VEGETACION`, `A-VEHICULOS`, `A-INSTALACIONES`, `A-OBRA`…) y después se restaura la capa activa.

**Bloques dinámicos con pinzamientos.** Al seleccionar un bloque de la galería aparecen:

- **▶ ancho** y **▲ profundidad**, en pasos de 5 cm (Shift: 1 cm) y dentro del rango válido de cada bloque.
- **▼ variantes** de la misma familia, por ejemplo cambiar un baño con ducha por uno con bañera conservando la medida.

La geometría **se regenera**: los artefactos se reubican contra los muros y no se deforman (un inodoro sigue midiendo 40 × 70 cm). Cada tamaño queda como una definición `ARQ · nombre · ancho×prof`. Todo es deshacible con Ctrl+Z. También funciona con `ARQPARAM`, con la fila *Ancho/Prof.* de la paleta o con el clic derecho.

**Clic derecho.** Sin comando ni selección, abre el menú por defecto: Repetir, Entrada reciente y Galería. Sobre un objeto agrega Aislar, Ocultar, orden de dibujo, Agrupar/Desagrupar, Contar bloques, Dividir/Graduar, Local + m² y Nube; en bloques ARQ suma Dimensiones, Variante y Restablecer. Con un comando activo sigue funcionando como Enter. Para volver al comportamiento anterior en vacío (siempre Enter), ejecutá `localStorage.setItem('cad2d-rightclick-enter','1')` en la consola del navegador.

**Comandos nuevos** (alias en español e inglés; los objetos ocultos con AISLAR u OCULTAR se siguen incluyendo al exportar DXF o PDF): `AISLAR`/`ISOLATEOBJECTS`, `OCULTAR`/`HIDEOBJECTS`, `MOSTRARTODO`/`UNISOLATEOBJECTS`, `ALFRENTE`/`ALFONDO`/`DRAWORDER`, `GRUPO`/`GROUP`, `DESAGRUPAR`/`UNGROUP`, `CONTARBLOQUES`/`BCOUNT` (exporta CSV), `DIVIDIR`/`DIVIDE`, `GRADUAR`/`MEASURE`, `NUBEREV`/`REVCLOUD`, `LINEACONST`/`XLINE`, `SEMIRRECTA`/`RAY`, `LOCAL`/`ROOMTAG` (nombre + m²) y `PLAN`.

**Arquitectura.** El núcleo (`index.html`) expone un puente acotado, `window.CAD2D_CORE` y `window.CAD2D_EXTENSIONS`, para registrar comandos, ítems del menú contextual y dibujos superpuestos sin reescribir funciones del núcleo. Los módulos nuevos son `assets/cad2d-arq-generators.js` (generadores en metros, que también se pueden probar en Node), `cad-arq-pro.js` (paleta, galería, pinzamientos y comandos) y `cad-plan.js` (planes).

**Corrección.** Al insertar una puerta o ventana entre dos líneas paralelas, ya no puede tomar como cara del muro una línea de otra capa (por ejemplo, eléctrica): las dos caras deben compartir capa.

**Modelo de pago futuro.** `cad-plan.js` muestra el estado (**BETA ABIERTA** mientras no haya servidor) y `billing/` contiene un Worker de Cloudflare + D1 + Stripe, no desplegado, con acceso por enlace al correo, prueba de 90 días, webhooks firmados y portal de facturación. El dibujo, abrir y exportar DXF nunca se bloquean. Ver `billing/README.md`.

**Más órdenes 2D (segunda tanda).** Capas: `CAPAISO`/`LAYISO`, `CAPAUNISO`, `CAPADES`/`LAYOFF`, `CAPAACT`/`LAYON`, `CAPABLOQ`/`LAYLCK`, `CAPADESBLOQ`, `CAPAACTUAL`/`LAYMCUR`, `CAPACAMBIAR`/`LAYMCH`, `CAPAFUSION`/`LAYMRG`, `CAPABORRAR`/`LAYDEL` y `PORCAPA`/`SETBYLAYER`. Cotas en serie: `ACOCONT`/`DIMCONTINUE` y `ACOLINEABASE`/`DIMBASELINE`. Dibujo: `SPLINE` (curva por puntos de ajuste, guardada como polilínea), `ARANDELA`/`DONUT`, `MARCACENTRO`/`CENTERMARK`, `LINEACENTRO`/`CENTERLINE` y `MATRIZCAMINO`/`ARRAYPATH`. Vista y consulta: `ZO`, `CAL` (calculadora con lista blanca de funciones), `BUSCAR`/`FIND` con reemplazo, `ESTADO`/`STATUS` y `AUDITAR`/`AUDIT`. Alias: `MLINE` abre el muro paramétrico. **Shift + clic derecho** abre el menú de referencias a objetos. Todo está en `cad-comandos-plus.js`.

**Muros: uniones en T limpias.** Cuando un tabique llega a un muro existente, sus caras topan siempre contra la cara del lado del local, aunque el punto se haya marcado en el eje o en la cara exterior. Antes podía atravesar el muro. La cara del muro anfitrión se interrumpe entre las dos caras del tabique, al dibujar y al exportar (DXF, SVG, PDF). El hueco se recalcula cada vez a partir de la geometría, así que sigue siendo correcto si se mueven los muros.

**Clic derecho con un comando activo.** Abre el menú del comando: Enter, Cancelar, Deshacer vértice, opciones, Entrada reciente y Referencias a objetos. Para volver al comportamiento anterior (clic derecho = Enter) ejecutá `localStorage.setItem('cad2d-rightclick-enter','1')`.

**Propiedad intelectual.** Los textos públicos y los comentarios del código no mencionan marcas de otros fabricantes de software. La compatibilidad se describe por formato de archivo y en menciones técnicas de compatibilidad. No se usan iconos, código, bloques ni manuales de terceros.

**Muros con cotas virtuales.** Al seleccionar un muro paramétrico aparecen su **largo** y su **espesor** como cotas temporales: se ven solo en pantalla y no se imprimen ni se exportan.
- Clic en la cota de largo para escribir un nuevo largo (se mantiene el extremo inicial), o en la de espesor para escribir uno nuevo.
- Los pinzamientos ▶ de las puntas estiran el muro en pasos de 5 cm (Shift: 1 cm).
- Los muros conectados en esa esquina acompañan el movimiento; las uniones en L y en T se rehacen solas.
- Todo se deshace con Ctrl+Z.
- Por ahora no se pueden editar así los muros que ya tienen una puerta o ventana colocada.

**Ventanas gráficas en Layout (`VENTANA` / `MVIEW`).** Se pueden poner varias ventanas en la misma hoja, cada una con su escala (Ajustar, 1:20 … 1:1000) y su encuadre:
- Encuadre: centrada en la vista actual del modelo o en la selección, con marco opcional.
- Se crean arrastrando un rectángulo sobre la hoja, se mueven arrastrándolas y cambian de tamaño desde su esquina inferior derecha.
- Salen iguales en la vista previa, en el SVG y en el PDF vectorial, y se guardan con el proyecto.
- Sin ventanas, la hoja funciona como antes.

**Cinta completa.**
- Pestaña nueva **Arquitectura**: muro, puertas y ventanas, galería, baños, cocinas, escaleras, mobiliario, local + m² y contar bloques.
- Grupos nuevos en las demás pestañas:
  - Dibujo: spline, arandela, línea de construcción, semirrecta, nube de revisión, dividir, graduar, marca de centro, eje.
  - Modificar: matriz sobre camino, agrupar, desagrupar, al frente, al fondo, por capa.
  - Anotar: cota continua, cota de línea base y **tipo de línea** (continua, discontinua, punteada, eje).
  - Vista: capas y objetos.
  - Salida: ventanas.
- Los 26 botones que mostraban la flecha de selección ahora tienen icono propio. Ningún botón de la cinta queda sin dibujo.

**Cloudflare y archivos .dwg.** Ver `CLOUDFLARE.md`.
- `cad2d-config.js` concentra la configuración del despliegue: dominio, conversor y cuentas. En GitHub Pages queda vacío.
- `dwg-converter/` convierte DWG a DXF en un contenedor de Cloudflare con GNU LibreDWG, como programa aparte en el servidor. Así LibreDWG no se distribuye a los usuarios y el código de CAD2D puede seguir siendo propietario.
- Este flujo remoto está desactivado actualmente; no debe presentarse como disponible.

**Cobro con Stripe (España / EUR).** Precios en euros con IVA incluido, Checkout en castellano, métodos de pago dinámicos (tarjeta, PayPal, SEPA, Apple Pay y Google Pay se activan desde el Dashboard) e IVA automático opcional (`STRIPE_TAX=1`). El diagnóstico de la cuenta actual y los pasos para una cuenta propia de CAD2D están en `billing/README.md`.

**Verificación.** Las 189 pruebas de `node --test tests/*.test.cjs` pasan, incluidas las 24 que fallaban por cambios previos del núcleo. Además se hicieron pruebas en Chrome sin interfaz: inserción, estiramiento de ancho y profundidad, Ctrl+Z, los 80 alias nuevos, menú contextual, AISLAR, GRUPO, DIV, LOCAL y NUBEREV. Pendiente: probar a mano en tabletas o pantallas táctiles, y el intercambio DXF de los bloques ARQ con programas CAD de escritorio.

## Independencia, propiedad intelectual y compatibilidad

Blackline CAD es una aplicación independiente; no está afiliada, patrocinada ni respaldada por otros fabricantes de software. Las marcas de terceros pertenecen a sus titulares; los formatos de archivo se mencionan sólo para describir la compatibilidad.

**Regla de procedencia:** no incorporar código, iconos, recursos visuales ni componentes extraídos de instalaciones o software propietario de terceros. Cada dependencia externa deberá registrar origen, versión, licencia y compatibilidad con el modo de distribución elegido; antes de comercializar se requiere una auditoría de licencias y propiedad intelectual. La afirmación de autoría propia no equivale a certificación legal completa.

**Formatos:** favorecer el formato nativo JSON/CADJSON y el intercambio DXF con alcance declarado. El parser actual admite solamente un subconjunto de entidades DXF. La lectura de cabeceras DWG por sí sola es diagnóstica y no importa geometría. La configuración del dominio principal desactiva actualmente el conversor HTTPS DWG a DXF para evitar costes. Comprobar licencias, condiciones de distribución, entidades admitidas y fidelidad técnica antes de garantizar compatibilidad.
