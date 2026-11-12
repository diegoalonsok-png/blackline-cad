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

Upload `index.html` to a GitHub Pages repository or Cloudflare Pages. There is no backend and no uploaded user file leaves the browser. Stripe and login can be integrated subsequently with a trusted server / verified webhook; never add Stripe secret keys to the frontend.

## Intellectual property

This prototype uses original HTML/CSS/JavaScript. It does not redistribute Autodesk or IntelliCAD UI artwork, program code or trademarks.

## CAD2D movable palettes

Drag any palette title to undock and move it across the drawing. Resize floating palettes from the lower-right corner. Each palette title provides Float, Dock left, Dock right, and Collapse buttons. The header includes **Reset layout**. Dock positions are stored locally in the browser. The public GitHub Pages URL stays `/blackline-cad/` for continuity.
